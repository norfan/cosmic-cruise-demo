/**
 * CosmicBoundarySprite — 宇宙边界
 * 表现：可观测宇宙的终极边缘
 *       CMB 球壳 + 量子泡沫粒子 + 无尽星流 + 时空涨落
 *
 * 适用文明等级：Tier 6 (创世)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface CosmicBoundarySpriteConfig extends CelestialSpriteConfig {
  shellRadius?: number;
  shellOpacity?: number;
  foamCount?: number;
}

const shellVertGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const shellFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 i=floor(p);vec2 f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  vec3 cmbColor(float t){
    t=clamp(t,0.0,1.0);
    if(t<0.5) return mix(vec3(0.1,0.1,0.7),vec3(0.1,0.8,0.5),t*2.0);
    else return mix(vec3(0.1,0.8,0.5),vec3(0.9,0.2,0.1),(t-0.5)*2.0);
  }

  void main(){
    float n=noise(vUv*6.0+uTime*0.02)*0.5
           +noise(vUv*18.0+vec2(uTime*0.01))*0.3
           +noise(vUv*40.0)*0.2;
    float fresnel=pow(1.0-abs(dot(normalize(vNormal),normalize(vWorldPos))),3.0);
    float dist=length(vUv-0.5)*2.0;
    float ripple=(sin(dist*25.0-uTime*1.5)*0.5+0.5)*exp(-dist*2.5)*0.3;
    float b=(n*0.7+fresnel*1.5)*uOpacity+ripple;
    vec3 col=mix(cmbColor(n),vec3(0.9,0.95,1.0),fresnel*0.5);
    gl_FragColor=vec4(col*b, b*0.7);
  }
`;

export default class CosmicBoundarySprite extends CelestialSprite {
  private _shellRadius: number;
  private _shellOpacity: number;
  private _foamCount: number;

  private _outerShell?: THREE.Mesh;
  private _innerShell?: THREE.Mesh;
  private _shellUniforms?: Record<string, THREE.IUniform>;
  private _innerUniforms?: Record<string, THREE.IUniform>;
  private _foamGeo?: THREE.BufferGeometry;
  private _foamVels?: Float32Array;
  private _starStreamGeo?: THREE.BufferGeometry;
  private _boundaryRings: THREE.Mesh[] = [];

  constructor(config: CosmicBoundarySpriteConfig = {}) {
    super(config);
    this._shellRadius = config.shellRadius ?? 22;
    this._shellOpacity = config.shellOpacity ?? 0.7;
    this._foamCount = config.foamCount ?? 800;
  }

  mount(scene: THREE.Scene, config: CelestialSpriteConfig = {}): void {
    this._scene = scene;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));
    if (config.scale) group.scale.setScalar(config.scale);
    this._build(group);
    this._object3D = group;
    scene.add(group);
  }

  protected _build(parent: THREE.Group): void {
    this._buildShells(parent);
    this._buildBoundaryRings(parent);
    this._buildFoam(parent);
    this._buildStarStreams(parent);
  }

  private _buildShells(parent: THREE.Group): void {
    const makeShell = (r: number, side: THREE.Side, opacityMul: number) => {
      const geo = new THREE.SphereGeometry(r, 80, 60);
      const uniforms: Record<string, THREE.IUniform> = {
        uTime: { value: 0 },
        uOpacity: { value: this._shellOpacity * opacityMul },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: shellVertGLSL,
        fragmentShader: shellFragGLSL,
        uniforms,
        transparent: true,
        side,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      parent.add(mesh);
      return { mesh, uniforms };
    };

    const outer = makeShell(this._shellRadius, THREE.BackSide, 1.0);
    this._outerShell = outer.mesh;
    this._shellUniforms = outer.uniforms;

    const inner = makeShell(this._shellRadius * 0.92, THREE.FrontSide, 0.4);
    this._innerShell = inner.mesh;
    this._innerUniforms = inner.uniforms;
  }

  private _buildBoundaryRings(parent: THREE.Group): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI;
      const r = this._shellRadius * 0.95;
      const geo = new THREE.TorusGeometry(r, 0.06, 4, 120);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i / 6, 1.0, 0.7),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = angle;
      ring.rotation.z = angle * 0.5;
      parent.add(ring);
      this._boundaryRings.push(ring);
    }
  }

  private _buildFoam(parent: THREE.Group): void {
    const count = this._foamCount;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const vels = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      // 集中分布在球壳附近
      const r = this._shellRadius * (0.85 + Math.random() * 0.2);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const hue = Math.random();
      const c = new THREE.Color().setHSL(hue, 1.0, 0.8);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;

      vels[i * 3] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this._foamVels = vels;

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    parent.add(new THREE.Points(geo, mat));
    this._foamGeo = geo;
  }

  private _buildStarStreams(parent: THREE.Group): void {
    const count = 1500;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * this._shellRadius * 0.8;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = new THREE.Color().setHSL(Math.random(), 0.6, 0.85);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this._starStreamGeo = geo;

    const mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    parent.add(new THREE.Points(geo, mat));
  }

  update(dt: number): void {
    super.update(dt);

    if (this._shellUniforms) this._shellUniforms.uTime.value = this._time;
    if (this._innerUniforms) this._innerUniforms.uTime.value = this._time;

    // 外壳缓慢旋转
    if (this._outerShell) this._outerShell.rotation.y += dt * 0.01;
    if (this._innerShell) this._innerShell.rotation.y -= dt * 0.008;

    // 边界环旋转
    this._boundaryRings.forEach((ring, i) => {
      ring.rotation.y += dt * (0.05 + i * 0.02) * (i % 2 === 0 ? 1 : -1);
      const pulse = Math.sin(this._time * 1.5 + i * 0.8) * 0.5 + 0.5;
      ((ring as any).material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.3;
    });

    // 量子泡沫粒子
    if (this._foamGeo && this._foamVels) {
      const pos = this._foamGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i) + this._foamVels[i * 3];
        const ny = pos.getY(i) + this._foamVels[i * 3 + 1];
        const nz = pos.getZ(i) + this._foamVels[i * 3 + 2];
        const dist = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (dist < this._shellRadius * 0.6 || dist > this._shellRadius * 1.05) {
          // 反弹
          this._foamVels[i * 3] *= -1;
          this._foamVels[i * 3 + 1] *= -1;
          this._foamVels[i * 3 + 2] *= -1;
        }
        pos.setXYZ(i, nx, ny, nz);
      }
      pos.needsUpdate = true;
    }

    // 整体缓慢旋转（包含星流）
    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.02;
    }
  }

  dispose(): void {
    this._outerShell?.geometry.dispose();
    ((this._outerShell as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._innerShell?.geometry.dispose();
    ((this._innerShell as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._foamGeo?.dispose();
    this._starStreamGeo?.dispose();
    this._boundaryRings.forEach((r) => {
      r.geometry.dispose();
      ((r as any).material as THREE.MeshBasicMaterial)?.dispose();
    });
    super.dispose();
  }
}
