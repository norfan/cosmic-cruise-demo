/**
 * WormHoleSprite — 虫洞
 * 表现：两端端口（能量漩涡）+ 中央隧道（时空扭曲场）
 *       端口呼吸脉冲 + 整体轻微摆动
 *
 * 适用文明等级：Tier 5 (极端天体)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface WormHoleSpriteConfig extends CelestialSpriteConfig {
  tunnelRadius?: number;
  tunnelLength?: number;
  energyColor?: string;
  portalSize?: number;
}

// ── Shader ──────────────────────────────────────────────
const tunnelFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor1;
  uniform vec3  uColor2;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    float d = abs(vUv.y - 0.5) * 2.0;
    float tunnelDepth = vUv.x;
    float r = 1.0 - d;
    if (r < 0.0) discard;

    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float swirl = sin(angle * 8.0 + uTime * 3.0 + tunnelDepth * 10.0) * 0.5 + 0.5;
    float n1 = noise(vec2(vUv.x * 6.0 + uTime * 0.5, vUv.y * 8.0));
    float n2 = noise(vec2(vUv.x * 12.0 - uTime * 0.8, vUv.y * 4.0 + uTime * 0.3));
    float energyFlow = n1 * n2;
    float intensity = pow(r, 0.8) * (0.5 + swirl * 0.5) * (0.3 + energyFlow * 0.7) * 1.5;
    vec3 col = mix(uColor1, uColor2, tunnelDepth * 0.8 + swirl * 0.2);
    gl_FragColor = vec4(col * intensity, intensity * 0.85);
  }
`;

const portalFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float d = length(vUv - center) * 2.0;
    if (d > 1.0) discard;

    float pulse = sin(uTime * 2.5) * 0.5 + 0.5;
    float rim = pow(1.0 - max(dot(normalize(vNormal), vViewDir), 0.0), 2.0);
    float n = noise(vUv * 8.0 + uTime * 0.6);
    float swirl = sin(atan(vUv.y - 0.5, vUv.x - 0.5) * 6.0 + uTime * 2.0) * 0.5 + 0.5;
    float brightness = (1.0 - d) * (0.6 + n * 0.4) * (0.5 + swirl * 0.5);
    brightness += rim * 2.0 * pulse;
    brightness *= 1.8;

    gl_FragColor = vec4(uColor * brightness, brightness * 0.9);
  }
`;

const portalVertGLSL = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

// ── Class ───────────────────────────────────────────────
export default class WormHoleSprite extends CelestialSprite {
  private _tunnelRadius: number;
  private _tunnelLength: number;
  private _energyColor: string;
  private _portalSize: number;

  private _tunnelMesh?: THREE.Mesh;
  private _portalA?: THREE.Mesh;
  private _portalB?: THREE.Mesh;
  private _energyRingA?: THREE.Mesh;
  private _energyRingB?: THREE.Mesh;
  private _tunnelUniforms?: Record<string, THREE.IUniform>;
  private _portalUniformsA?: Record<string, THREE.IUniform>;
  private _portalUniformsB?: Record<string, THREE.IUniform>;

  constructor(config: WormHoleSpriteConfig = {}) {
    super(config);
    this._tunnelRadius = config.tunnelRadius ?? 2.5;
    this._tunnelLength = config.tunnelLength ?? 12;
    this._energyColor = config.energyColor ?? '#aa44ff';
    this._portalSize = config.portalSize ?? 4;
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
    this._buildTunnel(parent);
    this._buildPortals(parent);
  }

  private _buildTunnel(parent: THREE.Group): void {
    const geo = new THREE.CylinderGeometry(
      this._tunnelRadius, this._tunnelRadius,
      this._tunnelLength, 48, 32, true,
    );
    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(this._energyColor) },
      uColor2: { value: new THREE.Color('#ffffff') },
    };
    this._tunnelUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        precision highp float;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: tunnelFragGLSL,
      uniforms,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tunnel = new THREE.Mesh(geo, mat);
    tunnel.rotation.x = Math.PI / 2;
    parent.add(tunnel);
    this._tunnelMesh = tunnel;
  }

  private _buildPortals(parent: THREE.Group): void {
    const color = new THREE.Color(this._energyColor);

    const makePortal = (flip: number) => {
      const geo = new THREE.CircleGeometry(this._portalSize, 64);
      const uniforms: Record<string, THREE.IUniform> = {
        uTime: { value: 0 },
        uColor: { value: color },
      };
      const mat = new THREE.ShaderMaterial({
        vertexShader: portalVertGLSL,
        fragmentShader: portalFragGLSL,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = flip * (this._tunnelLength / 2);
      parent.add(mesh);

      const ringGeo = new THREE.TorusGeometry(this._portalSize * 0.9, 0.12, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      mesh.add(ring);

      if (flip > 0) {
        this._portalA = mesh;
        this._portalUniformsA = uniforms;
        this._energyRingA = ring;
      } else {
        this._portalB = mesh;
        this._portalUniformsB = uniforms;
        this._energyRingB = ring;
      }
    };

    makePortal(1);
    makePortal(-1);

    // 连接能量线
    const lineCount = 12;
    const linePos: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const r = this._tunnelRadius * 0.85;
      linePos.push(
        Math.cos(angle) * r, -this._tunnelLength / 2, Math.sin(angle) * r,
        Math.cos(angle) * r, this._tunnelLength / 2, Math.sin(angle) * r,
      );
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePos), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this._energyColor),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    parent.add(new THREE.LineSegments(lineGeo, lineMat));
  }

  update(dt: number): void {
    super.update(dt);

    if (this._tunnelUniforms) this._tunnelUniforms.uTime.value = this._time;
    if (this._portalUniformsA) this._portalUniformsA.uTime.value = this._time;
    if (this._portalUniformsB) this._portalUniformsB!.uTime.value = this._time;

    if (this._portalA) this._portalA.rotation.z += dt * 0.5;
    if (this._portalB) this._portalB.rotation.z -= dt * 0.5;

    if (this._energyRingA) {
      const p = Math.sin(this._time * 3.0) * 0.5 + 0.5;
      ((this._energyRingA as any).material as THREE.MeshBasicMaterial).opacity = 0.3 + p * 0.5;
    }
    if (this._energyRingB) {
      const p = Math.sin(this._time * 3.0 + 1.5) * 0.5 + 0.5;
      ((this._energyRingB as any).material as THREE.MeshBasicMaterial).opacity = 0.3 + p * 0.5;
    }

    if (this._object3D) {
      this._object3D.rotation.y = Math.sin(this._time * 0.4) * 0.1;
      this._object3D.rotation.x = Math.cos(this._time * 0.3) * 0.05;
    }
  }

  dispose(): void {
    this._tunnelMesh?.geometry.dispose();
    ((this._tunnelMesh as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._portalA?.geometry.dispose();
    ((this._portalA as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._portalB?.geometry.dispose();
    ((this._portalB as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._energyRingA?.geometry.dispose();
    ((this._energyRingA as any)?.material as THREE.MeshBasicMaterial)?.dispose();
    this._energyRingB?.geometry.dispose();
    ((this._energyRingB as any)?.material as THREE.MeshBasicMaterial)?.dispose();
    super.dispose();
  }
}
