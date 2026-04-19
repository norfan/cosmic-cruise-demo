/**
 * WhiteHoleSprite — 白洞（优化版）
 * 表现：持续排斥性爆发的明亮核心 + 周期性物质喷射
 *       日冕射线旋转 + Fresnel 边缘光晕 + Shader 粒子喷射
 *
 * 适用文明等级：Tier 5 (极端天体)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface WhiteHoleSpriteConfig extends CelestialSpriteConfig {
  coreRadius?: number;
  burstInterval?: number;
  explosionColor?: string;
}

// ── Shader ──────────────────────────────────────────────
const coreVertGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uCoreColor;
  varying vec3  vNormal;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y
    );
  }

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    float n = noise(vUv * 10.0 + uTime * 0.8);
    float corona = fresnel * (0.8 + n * 0.4);
    vec3 col = mix(uCoreColor, vec3(1.0), n * 0.5);
    gl_FragColor = vec4(col * corona * 2.0, corona * 0.9);
  }
`;

// Burst Ring shader
const burstFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uBurst;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float d = length(vUv - center) * 2.0;
    if (d > 1.0) discard;
    float ripple = sin(d * 20.0 - uTime * 8.0) * 0.5 + 0.5;
    float brightness = (1.0 - d) * uBurst * (0.6 + ripple * 0.4);
    gl_FragColor = vec4(uColor * brightness, brightness * 0.8);
  }
`;

// ── GPU 粒子 Shader ────────────────────────────────────
const particleVertGLSL = /* glsl */ `
  precision highp float;

  attribute vec3  aVelocity;
  attribute float aLifetime;   // 粒子生命周期（秒）
  attribute float aRandom;     // 随机种子

  uniform float uTime;
  uniform float uCoreRadius;
  uniform float uBurst;       // 爆发强度 0~1

  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    // 粒子从核心出发，随时间向外扩散
    float speed = length(aVelocity) * (1.0 + uBurst * 2.0);
    vec3 vel = normalize(aVelocity) * speed;

    float age = mod(uTime * (0.8 + aRandom * 0.4) + aRandom * aLifetime, aLifetime);
    float t   = age / aLifetime;  // 0→1 生命周期进度

    // 位置 = 速度 * 时间（带生命周期重置）
    vec3 pos = position + vel * age;

    // 淡出
    vAlpha = (1.0 - t) * (0.7 + uBurst * 0.3);

    // 颜色：爆发时偏白，正常时偏核心色
    vec3 baseColor = uCoreRadius > 0.0 ? vec3(1.0, 0.95, 0.85) : vec3(1.0);
    vColor = mix(baseColor, vec3(1.0), uBurst);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (0.18 + uBurst * 0.15) * (300.0 / -mvPosition.z);
    gl_Position  = projectionMatrix * mvPosition;
  }
`;

const particleFragGLSL = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying vec3  vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// 日冕射线 shader（ billboard 扇形光束）
const rayVertGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uCoreRadius;
  varying vec2  vUv;
  varying float vAngle;   // 射线角度（用于 fragment 动态条纹）
  void main() {
    vUv = uv;
    vAngle = atan(position.x, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rayFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPulse;   // 0~1 脉冲强度
  uniform vec3  uColor;
  varying vec2  vUv;
  varying float vAngle;

  void main() {
    // 纵向衰减（从核心往外）
    float lengthFade = 1.0 - smoothstep(0.0, 1.0, vUv.y);
    // 横向（宽度）光束锐减
    float widthFade  = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0);
    // 动态条纹（旋转感）
    float stripe = sin(vUv.y * 30.0 - uTime * 6.0 + vAngle * 5.0) * 0.5 + 0.5;
    stripe = mix(0.5, 1.0, stripe);

    float alpha = lengthFade * widthFade * stripe * (0.3 + uPulse * 0.7);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor * (1.0 + uPulse * 0.5), alpha);
  }
`;

// ── Class ───────────────────────────────────────────────
export default class WhiteHoleSprite extends CelestialSprite {
  private _coreRadius: number;
  private _burstInterval: number;
  private _explosionColor: string;

  private _coreSphere?: THREE.Mesh;
  private _coreUniforms?: Record<string, THREE.IUniform>;
  private _burstMesh?: THREE.Mesh;
  private _burstUniforms?: Record<string, THREE.IUniform>;
  private _flareGroup?: THREE.Group;
  private _lastBurst: number = 0;
  private _currentBurst: number = 0;

  // GPU 粒子
  private _gpuParticles?: THREE.Points;
  private _gpuParticleUniforms?: Record<string, THREE.IUniform>;

  constructor(config: WhiteHoleSpriteConfig = {}) {
    super(config);
    this._coreRadius    = config.coreRadius    ?? 3;
    this._burstInterval = config.burstInterval ?? 3.5;
    this._explosionColor = config.explosionColor ?? '#ffffff';
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
    this._buildCore(parent);
    this._buildBurstRing(parent);
    this._buildGpuEjecta(parent);
    this._buildCoronaRays(parent);
  }

  private _buildCore(parent: THREE.Group): void {
    const geo = new THREE.SphereGeometry(this._coreRadius, 48, 48);
    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uCoreColor: { value: new THREE.Color(this._explosionColor) },
    };
    this._coreUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sphere = new THREE.Mesh(geo, mat);
    parent.add(sphere);
    this._coreSphere = sphere;

    // 外层 glow 壳
    const glowGeo = new THREE.SphereGeometry(this._coreRadius * 1.35, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    parent.add(glow);
  }

  private _buildBurstRing(parent: THREE.Group): void {
    const geo = new THREE.PlaneGeometry(this._coreRadius * 5, this._coreRadius * 5, 32, 32);
    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uBurst: { value: 0 },
      uColor: { value: new THREE.Color(this._explosionColor) },
    };
    this._burstUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: burstFragGLSL,
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = this._coreRadius * 0.1;
    parent.add(mesh);
    this._burstMesh = mesh;
  }

  private _buildGpuEjecta(parent: THREE.Group): void {
    const count = 600;
    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes  = new Float32Array(count);
    const randoms    = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const r     = this._coreRadius * (0.8 + Math.random() * 0.4);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1]  = r * Math.cos(phi);
      positions[i * 3 + 2]  = r * Math.sin(phi) * Math.sin(theta);

      const speed = 0.05 + Math.random() * 0.15;
      velocities[i * 3]     = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      lifetimes[i] = 1.5 + Math.random() * 2.0;  // 1.5~3.5秒生命
      randoms[i]   = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('aRandom',    new THREE.BufferAttribute(randoms, 1));

    const uniforms: Record<string, THREE.IUniform> = {
      uTime:       { value: 0 },
      uCoreRadius: { value: this._coreRadius },
      uBurst:      { value: 0 },
    };
    this._gpuParticleUniforms = uniforms;

    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVertGLSL,
      fragmentShader: particleFragGLSL,
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pts = new THREE.Points(geo, mat);
    parent.add(pts);
    this._gpuParticles = pts;
  }

  private _buildCoronaRays(parent: THREE.Group): void {
    const group = new THREE.Group();
    const rayCount = 24; // 增加到 24 根

    for (let i = 0; i < rayCount; i++) {
      const angle  = (i / rayCount) * Math.PI * 2;
      const len    = this._coreRadius * (2.0 + Math.random() * 1.5);
      const width  = this._coreRadius * 0.2;

      // 用 Billboard PlaneGeometry，长轴朝外
      const geo = new THREE.PlaneGeometry(width, len, 1, 8);
      const uniforms: Record<string, THREE.IUniform> = {
        uTime:       { value: 0 },
        uPulse:      { value: 0 },
        uColor:      { value: new THREE.Color(this._explosionColor) },
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: rayVertGLSL,
        fragmentShader: rayFragGLSL,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const ray = new THREE.Mesh(geo, mat);
      ray.position.set(
        Math.cos(angle) * this._coreRadius * 1.25,
        0,
        Math.sin(angle) * this._coreRadius * 1.25,
      );
      ray.rotation.y = -(angle + Math.PI / 2);
      group.add(ray);
    }

    parent.add(group);
    this._flareGroup = group;
  }

  update(dt: number): void {
    super.update(dt);

    if (this._coreUniforms) this._coreUniforms.uTime.value = this._time;
    if (this._burstUniforms) this._burstUniforms.uTime.value = this._time;

    // 爆发周期
    if (this._time - this._lastBurst >= this._burstInterval) {
      this._lastBurst = this._time;
      this._currentBurst = 1.0;
    }
    this._currentBurst = Math.max(0, this._currentBurst - dt * 0.4);
    if (this._burstUniforms) this._burstUniforms.uBurst.value = this._currentBurst;
    if (this._gpuParticleUniforms) this._gpuParticleUniforms.uBurst.value = this._currentBurst;

    // GPU 粒子：只更新时间
    if (this._gpuParticleUniforms) this._gpuParticleUniforms.uTime.value = this._time;

    // 射线旋转 + 脉冲
    if (this._flareGroup) {
      this._flareGroup.rotation.y += dt * 0.25;
      const pulse = Math.sin(this._time * 3.0) * 0.5 + 0.5;
      this._flareGroup.children.forEach((ray) => {
        const mat = (ray as THREE.Mesh).material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value  = this._time;
        mat.uniforms.uPulse.value = 0.2 + pulse * 0.5 + this._currentBurst * 0.5;
      });
    }

    if (this._object3D) this._object3D.rotation.y += dt * 0.12;
  }

  dispose(): void {
    this._coreSphere?.geometry.dispose();
    ((this._coreSphere as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._burstMesh?.geometry.dispose();
    ((this._burstMesh as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._gpuParticles?.geometry.dispose();
    ((this._gpuParticles as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._flareGroup?.children.forEach((ray) => {
      (ray as THREE.Mesh).geometry.dispose();
      ((ray as any).material as THREE.ShaderMaterial)?.dispose();
    });
    super.dispose();
  }
}
