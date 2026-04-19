/**
 * GenesisCoreSprite — 创世核心（优化版）
 * 表现：宇宙起源点，大爆炸能量场
 *       七色能量漩涡 + 分形爆炸粒子 + 宇宙蛋形态
 *       核心脉动 + 能量波纹向外扩散 + 彩虹射线
 *
 * 适用文明等级：Tier 6 (创世)
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface GenesisCoreSpriteConfig extends CelestialSpriteConfig {
  coreRadius?: number;
  energyCount?: number;
  explosionIntensity?: number;
}

// ── Shader ──────────────────────────────────────────────
const coreVertGLSL = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uExplosion;
  varying vec3  vNormal;
  varying vec2  vUv;
  varying vec3  vWorldPos;

  vec3 rainbow(float t) {
    t = fract(t);
    float r = abs(t * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(t * 6.0 - 2.0);
    float b = 2.0 - abs(t * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i),           hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.1 + vec3(1.7, 9.2, 3.5);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    float n  = fbm(vNormal * 6.0 + uTime * 0.6);
    float n2 = fbm(vNormal * 12.0 - uTime * 0.4 + 3.7);
    float n3 = fbm(vNormal * 3.0 + uTime * 1.2);

    // 七色旋转能量流
    float angle = atan(vNormal.z, vNormal.x) / (2.0 * 3.14159);
    float colorT = fract(uTime * 0.12 + angle + n * 0.3 + uExplosion * 0.5);
    vec3 rainbowColor = rainbow(colorT);

    // 核心白热（中心极高亮）
    float dist2d = length(vUv - 0.5) * 2.0;
    float core = exp(-pow(dist2d * 3.0, 2.0));

    // 脉冲 + 爆发
    float pulse1 = sin(uTime * 2.5) * 0.5 + 0.5;
    float pulse2 = sin(uTime * 4.0 + 1.0) * 0.5 + 0.5;
    float burst  = uExplosion * 3.0 + pulse1 * 0.5 + pulse2 * 0.3;

    float brightness = fresnel * (1.0 + n * 2.5) * (1.0 + burst);
    brightness       += core * 5.0 * (1.0 + uExplosion * 2.0);
    brightness       *= (1.0 + n2 * 0.6 + n3 * 0.3);

    vec3 col = mix(rainbowColor, vec3(1.0), core + burst * 0.3);
    gl_FragColor = vec4(col * brightness, min(brightness * 0.95, 1.0));
  }
`;

const rippleFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uRadius;
  uniform vec3  uColor;
  varying vec2  vUv;
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float d = length(vUv - center) * 2.0;
    if (d > 1.0) discard;
    float t = fract(uTime * 0.4);
    float ripple = sin((d - t) * 20.0) * 0.5 + 0.5;
    float fade = pow(1.0 - t, 1.5);
    float brightness = ripple * fade * 0.7;
    gl_FragColor = vec4(uColor * brightness, brightness * 0.6);
  }
`;

// ── GPU 粒子 Shader ────────────────────────────────────
const particleVertGLSL = /* glsl */ `
  precision highp float;

  attribute vec3  aVelocity;
  attribute float aLifetime;
  attribute float aRandom;
  attribute vec3  aColor;

  uniform float uTime;
  uniform float uExplosion;

  varying float vAlpha;
  varying vec3  vColor;

  void main() {
    float speed  = length(aVelocity) * (1.0 + uExplosion * 4.0);
    vec3  vel    = normalize(aVelocity) * speed;
    float age    = mod(uTime * (0.6 + aRandom * 0.4) + aRandom * aLifetime, aLifetime);
    float t      = age / aLifetime;

    vec3 pos = position + vel * age;

    vAlpha = pow(1.0 - t, 1.5) * (0.8 + uExplosion * 0.5);
    vColor = aColor * (1.0 + uExplosion * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (0.12 + uExplosion * 0.1) * (300.0 / -mvPosition.z);
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

// ── 彩虹射线 shader ────────────────────────────────────
const rayVertGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec2  vUv;
  varying float vAngle;
  void main() {
    vUv = uv;
    vAngle = atan(position.x, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rayFragGLSL = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPulse;
  varying vec2  vUv;
  varying float vAngle;

  vec3 rainbow(float t) {
    t = fract(t);
    float r = abs(t * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(t * 6.0 - 2.0);
    float b = 2.0 - abs(t * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  void main() {
    float lenFade  = 1.0 - smoothstep(0.0, 1.0, vUv.y);
    float widthFade = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 4.0);
    float stripe   = sin(vUv.y * 40.0 - uTime * 8.0 + vAngle * 6.0) * 0.5 + 0.5;
    stripe = mix(0.4, 1.0, stripe);
    float alpha = lenFade * widthFade * stripe * (0.4 + uPulse * 0.6);
    if (alpha < 0.01) discard;
    vec3 col = rainbow(vAngle / (2.0 * 3.14159) + uTime * 0.1);
    gl_FragColor = vec4(col * (1.0 + uPulse * 0.5), alpha);
  }
`;

// ── Class ───────────────────────────────────────────────
export default class GenesisCoreSprite extends CelestialSprite {
  private _coreRadius: number;

  private _coreSphere?: THREE.Mesh;
  private _coreUniforms?: Record<string, THREE.IUniform>;

  private _rippleMeshes: THREE.Mesh[] = [];
  private _rippleUniforms: THREE.IUniform[] = [];

  // GPU 粒子
  private _gpuParticles?: THREE.Points;
  private _gpuParticleUniforms?: Record<string, THREE.IUniform>;

  private _rayGroup?: THREE.Group;
  private _currentExplosion: number = 0;
  private _lastExplosion: number = 0;
  private _explosionInterval: number = 4.0;

  // 多层能量漩涡（内外壳）
  private _innerVortex?: THREE.Mesh;
  private _outerVortex?: THREE.Mesh;

  constructor(config: GenesisCoreSpriteConfig = {}) {
    super(config);
    this._coreRadius = config.coreRadius ?? 4;
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
    this._buildVortex(parent);
    this._buildRipples(parent);
    this._buildGpuExplosion(parent);
    this._buildEnergyRays(parent);
  }

  private _buildCore(parent: THREE.Group): void {
    const geo = new THREE.SphereGeometry(this._coreRadius, 64, 64);
    const uniforms: Record<string, THREE.IUniform> = {
      uTime:      { value: 0 },
      uExplosion: { value: 0 },
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
    const glowGeo = new THREE.SphereGeometry(this._coreRadius * 1.4, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    parent.add(new THREE.Mesh(glowGeo, glowMat));
  }

  private _buildVortex(parent: THREE.Group): void {
    // 内层漩涡（扁平椭圆盘）
    const innerGeo = new THREE.SphereGeometry(this._coreRadius * 1.1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const innerMat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms: this._coreUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._innerVortex = new THREE.Mesh(innerGeo, innerMat);
    this._innerVortex.rotation.x = 0.3;
    parent.add(this._innerVortex);

    // 外层能量晕（旋转环）
    const outerGeo = new THREE.TorusGeometry(this._coreRadius * 1.8, 0.12, 8, 64);
    const outerMat = new THREE.ShaderMaterial({
      vertexShader: coreVertGLSL,
      fragmentShader: coreFragGLSL,
      uniforms: this._coreUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this._outerVortex = new THREE.Mesh(outerGeo, outerMat);
    this._outerVortex.rotation.x = Math.PI / 3;
    parent.add(this._outerVortex);
  }

  private _buildRipples(parent: THREE.Group): void {
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.PlaneGeometry(this._coreRadius * 8, this._coreRadius * 8, 1, 1);
      const uniforms = {
        uTime:   { value: i * 0.2 },
        uRadius: { value: 0.8 - i * 0.12 },
        uColor:  { value: new THREE.Color().setHSL(i * 0.14, 1.0, 0.7) },
      };
      this._rippleUniforms.push(uniforms.uTime);

      const mat = new THREE.ShaderMaterial({
        vertexShader: coreVertGLSL,
        fragmentShader: rippleFragGLSL,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = this._coreRadius * 0.05 * i;
      mesh.rotation.z = Math.random() * 0.3;
      parent.add(mesh);
      this._rippleMeshes.push(mesh);
    }
  }

  private _buildGpuExplosion(parent: THREE.Group): void {
    const count = 800; // 增加到 800
    const geo = new THREE.BufferGeometry();
    const positions  = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes  = new Float32Array(count);
    const randoms    = new Float32Array(count);
    const colors     = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const r     = this._coreRadius * (0.5 + Math.random() * 0.5);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const speed = 0.08 + Math.random() * 0.12;
      velocities[i * 3]     = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      lifetimes[i] = 2.0 + Math.random() * 2.0;
      randoms[i]   = Math.random();

      const hue = Math.random();
      const c   = new THREE.Color().setHSL(hue, 1.0, 0.7);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('aRandom',   new THREE.BufferAttribute(randoms, 1));
    geo.setAttribute('aColor',    new THREE.BufferAttribute(colors, 3));

    const uniforms: Record<string, THREE.IUniform> = {
      uTime:      { value: 0 },
      uExplosion: { value: 0 },
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

  private _buildEnergyRays(parent: THREE.Group): void {
    const group = new THREE.Group();
    const rayCount = 16;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const len   = this._coreRadius * (3.0 + Math.random() * 2.5);
      const geo   = new THREE.PlaneGeometry(0.3, len, 1, 8);
      const uniforms = {
        uTime:  { value: 0 },
        uPulse: { value: 0 },
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
        Math.cos(angle) * this._coreRadius * 1.4,
        0,
        Math.sin(angle) * this._coreRadius * 1.4,
      );
      ray.rotation.y = -(angle + Math.PI / 2);
      group.add(ray);
    }

    parent.add(group);
    this._rayGroup = group;
  }

  update(dt: number): void {
    super.update(dt);

    if (this._coreUniforms) {
      this._coreUniforms.uTime.value = this._time;
      this._coreUniforms.uExplosion.value = this._currentExplosion;
    }

    // 爆发周期
    if (this._time - this._lastExplosion >= this._explosionInterval) {
      this._lastExplosion = this._time;
      this._currentExplosion = 1.0;
    }
    this._currentExplosion = Math.max(0, this._currentExplosion - dt * 0.3);

    if (this._gpuParticleUniforms) {
      this._gpuParticleUniforms.uTime.value = this._time;
      this._gpuParticleUniforms.uExplosion.value = this._currentExplosion;
    }

    // 漩涡自转
    if (this._innerVortex) this._innerVortex.rotation.z += dt * 0.4;
    if (this._outerVortex) {
      this._outerVortex.rotation.z -= dt * 0.25;
      this._outerVortex.rotation.y += dt * 0.15;
    }

    // 波纹动画
    this._rippleMeshes.forEach((mesh, i) => {
      const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;
      uniforms.uTime.value = this._time + i * 0.2;
    });

    // 射线旋转 + 脉冲
    if (this._rayGroup) {
      this._rayGroup.rotation.y += dt * 0.35;
      const pulse = Math.sin(this._time * 4.0) * 0.5 + 0.5;
      this._rayGroup.children.forEach((ray) => {
        const mat = (ray as THREE.Mesh).material as THREE.ShaderMaterial;
        mat.uniforms.uTime.value  = this._time;
        mat.uniforms.uPulse.value = 0.2 + pulse * 0.5 + this._currentExplosion * 0.5;
      });
    }

    if (this._object3D) {
      this._object3D.rotation.y += dt * 0.08;
    }
  }

  dispose(): void {
    this._coreSphere?.geometry.dispose();
    ((this._coreSphere as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._innerVortex?.geometry.dispose();
    ((this._innerVortex as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._outerVortex?.geometry.dispose();
    ((this._outerVortex as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._rippleMeshes.forEach((m) => {
      m.geometry.dispose();
      ((m as any)?.material as THREE.ShaderMaterial)?.dispose();
    });
    this._gpuParticles?.geometry.dispose();
    ((this._gpuParticles as any)?.material as THREE.ShaderMaterial)?.dispose();
    this._rayGroup?.children.forEach((r) => {
      (r as THREE.Mesh).geometry.dispose();
      ((r as any).material as THREE.ShaderMaterial)?.dispose();
    });
    super.dispose();
  }
}
