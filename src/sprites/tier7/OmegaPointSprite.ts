/**
 * OmegaPointSprite — Ω终点 (Tier 7)
 * 宇宙所有能量的最终汇聚点：无限奇点 + 万物回归旋涡 + 时间终结光柱
 * 所有宇宙历史浓缩在此一点
 */
import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface OmegaPointSpriteConfig extends CelestialSpriteConfig {
  singularityRadius?: number;
  vortexArms?: number;
  collapseParticles?: number;
}

const singularityVert = /* glsl */`
varying vec3 vN; varying vec2 vUv;
void main(){ vN=normalize(normalMatrix*normal); vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const singularityFrag = /* glsl */`
uniform float uTime; varying vec3 vN; varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
vec3 rainbow(float t){t=fract(t);return clamp(vec3(abs(t*6.0-3.0)-1.0,2.0-abs(t*6.0-2.0),2.0-abs(t*6.0-4.0)),0.0,1.0);}
void main(){
  float fr=pow(1.0-max(dot(vN,vec3(0,0,1)),0.0),1.5);
  float nm=n(vUv*10.0-uTime*0.5);
  float nm2=n(vUv*20.0+uTime*0.3+5.7);
  // 白热核心 + 七色外缘
  float core=exp(-pow(length(vUv-0.5)*5.0,2.0));
  vec3 rCol=rainbow(uTime*0.2+nm*0.3);
  vec3 col=mix(rCol*( 1.0+nm2),vec3(1.0,0.97,0.9),core*2.0);
  float p=sin(uTime*4.0)*0.5+0.5;
  float a=(fr*(0.8+nm*0.2)+core)*( 1.0+p*0.5);
  gl_FragColor=vec4(col*min(a*1.5,3.0),min(a,1.0));
}`;

const collapseVert = /* glsl */`
attribute float aPhase; attribute float aRadius; attribute float aTheta;
uniform float uTime;
varying float vA; varying vec3 vCol;
vec3 rainbow(float t){t=fract(t);return clamp(vec3(abs(t*6.0-3.0)-1.0,2.0-abs(t*6.0-2.0),2.0-abs(t*6.0-4.0)),0.0,1.0);}
void main(){
  // 螺旋向中心旋转坠落
  float speed=0.3+aRadius*0.05;
  float t=mod(uTime*speed+aPhase,1.0);
  float r=aRadius*(1.0-t*t);
  float angle=aTheta+uTime*(1.0+aRadius*0.02)+t*6.28;
  float y=position.y*(1.0-t*0.8);
  vec3 pos=vec3(cos(angle)*r, y, sin(angle)*r);
  vA=sin(t*3.14159)*(0.5+aRadius*0.05);
  vCol=rainbow(aPhase*0.7+uTime*0.15);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.0);
  gl_PointSize=3.0*vA+1.0;
}`;

const collapseFrag = /* glsl */`
varying float vA; varying vec3 vCol;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  if(d>1.0)discard;
  gl_FragColor=vec4(vCol,(1.0-d)*vA*0.9);
}`;

const timePillarVert = /* glsl */`
attribute float aT; uniform float uTime;
varying float vA;
void main(){
  float wave=sin(aT*15.0-uTime*6.0)*0.5+0.5;
  vA=wave*(1.0-aT*0.7);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  gl_PointSize=4.0*vA+0.5;
}`;

const timePillarFrag = /* glsl */`
varying float vA;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0; if(d>1.0)discard;
  vec3 col=mix(vec3(1.0,0.9,0.5),vec3(1.0,1.0,1.0),vA);
  gl_FragColor=vec4(col,(1.0-d)*vA*0.95);
}`;

export default class OmegaPointSprite extends CelestialSprite {
  private _singularityRadius: number;
  private _singUniforms?: Record<string, THREE.IUniform>;
  private _collapseUniforms?: Record<string, THREE.IUniform>;
  private _pillarUniforms: Array<Record<string, THREE.IUniform>> = [];
  private _singularityMesh?: THREE.Mesh;
  private _omegaRings: THREE.Mesh[] = [];

  constructor(config: OmegaPointSpriteConfig = {}) {
    super(config);
    this._singularityRadius = config.singularityRadius ?? 2.5;
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

  private _build(group: THREE.Group): void {

    // ── 核心奇点球 ────────────────────────────────────────
    const sUni = { uTime: { value: 0 } };
    this._singUniforms = sUni;
    this._singularityMesh = new THREE.Mesh(
      new THREE.SphereGeometry(this._singularityRadius, 64, 64),
      new THREE.ShaderMaterial({ vertexShader: singularityVert, fragmentShader: singularityFrag,
        uniforms: sUni, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending }),
    );
    group.add(this._singularityMesh);

    // ── 万物坠落螺旋粒子 ──────────────────────────────────
    const CP = 600;
    const positions = new Float32Array(CP * 3);
    const phases = new Float32Array(CP);
    const radii = new Float32Array(CP);
    const thetas = new Float32Array(CP);
    for (let i = 0; i < CP; i++) {
      const r = 4 + Math.random() * 18;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 8;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      phases[i] = Math.random();
      radii[i] = r;
      thetas[i] = theta;
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    cGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    cGeo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    cGeo.setAttribute('aTheta', new THREE.BufferAttribute(thetas, 1));
    const cUni = { uTime: { value: 0 } };
    this._collapseUniforms = cUni;
    group.add(new THREE.Points(cGeo,
      new THREE.ShaderMaterial({ vertexShader: collapseVert, fragmentShader: collapseFrag,
        uniforms: cUni, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending })));

    // ── 时间终结光柱（上下各一条）────────────────────────
    for (let dir = 0; dir < 2; dir++) {
      const PSTEPS = 120;
      const pPos = new Float32Array(PSTEPS * 3);
      const pT = new Float32Array(PSTEPS);
      for (let k = 0; k < PSTEPS; k++) {
        const t = k / PSTEPS;
        const spread = Math.sin(t * Math.PI) * 0.4;
        pPos[k * 3] = (Math.random() - 0.5) * spread;
        pPos[k * 3 + 1] = (dir === 0 ? 1 : -1) * t * 25;
        pPos[k * 3 + 2] = (Math.random() - 0.5) * spread;
        pT[k] = t;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      pGeo.setAttribute('aT', new THREE.BufferAttribute(pT, 1));
      const pUni = { uTime: { value: 0 } };
      this._pillarUniforms.push(pUni);
      group.add(new THREE.Points(pGeo,
        new THREE.ShaderMaterial({ vertexShader: timePillarVert, fragmentShader: timePillarFrag,
          uniforms: pUni, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending })));
    }

    // ── Ω符号状大旋转环 ──────────────────────────────────
    const ringColors = ['#ff4444','#ff8844','#ffff44','#44ff88','#4488ff','#aa44ff','#ff44aa'];
    for (let r = 0; r < 7; r++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this._singularityRadius + 1.5 + r * 2.8, 0.12, 8, 128),
        new THREE.MeshBasicMaterial({ color: ringColors[r],
          transparent: true, opacity: 0.25 - r * 0.02,
          blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      ring.rotation.x = (r / 7) * Math.PI;
      ring.rotation.y = (r / 7) * Math.PI * 0.5;
      group.add(ring);
      this._omegaRings.push(ring);
    }

    // ── 外层事件视界黑暗球 ───────────────────────────────
    const shadowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this._singularityRadius * 0.8, 32, 32),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.95,
        depthWrite: true }),
    );
    group.add(shadowSphere);
  }

  update(dt: number): void {
    super.update(dt);
    const t = this._time;

    if (this._singUniforms) this._singUniforms.uTime.value = t;
    if (this._collapseUniforms) this._collapseUniforms.uTime.value = t;
    for (const u of this._pillarUniforms) u.uTime.value = t;

    // 环逐层反向旋转，制造扭曲感
    this._omegaRings.forEach((ring, i) => {
      ring.rotation.z += dt * (i % 2 === 0 ? 0.15 : -0.12) * (1 + i * 0.05);
      ring.rotation.x += dt * 0.03;
    });

    // 核心脉动缩放
    if (this._singularityMesh) {
      const pulse = Math.sin(t * 3.5) * 0.05 + 1.0;
      this._singularityMesh.scale.setScalar(pulse);
    }
  }

  dispose(): void {
    super.dispose();
  }
}
