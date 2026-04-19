/**
 * YellowStarSprite - 太阳精灵（Tier 2）
 *
 * 多层视觉结构：
 *   1. 核心球体 —— 程序化太阳纹理（黑子、对流胞图案）
 *   2. 内冕层 —— ShaderMaterial Fresnel 边缘发光
 *   3. 外晕层 —— 半透明球壳，日冕光晕
 *   4. PointLight —— 照亮整个场景
 *   5. 太阳风粒子系统 —— InstancedMesh 粒子流
 *
 * 动效：
 *   - 表面脉冲（emissiveIntensity 呼吸）
 *   - 日冕光晕脉动
 *   - 随机耀斑爆发（粒子束）
 *   - 太阳风粒子持续外溢
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface YellowStarSpriteConfig extends CelestialSpriteConfig {
  /** 太阳半径（默认 3.5） */
  radius?: number;
  /** 光照强度（默认 3.0） */
  lightIntensity?: number;
  /** 脉冲速度（默认 0.5） */
  pulseSpeed?: number;
  /** 耀斑概率 0~1（默认 0.02，即每帧2%） */
  flareChance?: number;
  /** 是否显示太阳风粒子（默认 true） */
  showSolarWind?: boolean;
}

// ── 日冕着色器 ─────────────────────────────────

const coronaVertShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const coronaFragShader = /* glsl */ `
  uniform vec3 uCoronaColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
    float noise = hash(vNormal.xy * 10.0 + uTime * 0.3);
    float flare = sin(uTime * 3.0 + vNormal.x * 20.0) * 0.5 + 0.5;
    float intensity = uIntensity * fresnel * (0.8 + noise * 0.4 + flare * 0.3);
    gl_FragColor = vec4(uCoronaColor, intensity);
  }
`;

export class YellowStarSprite extends CelestialSprite {
  private _lightIntensity: number;
  private _pulseSpeed: number;
  private _flareChance: number;
  private _showSolarWind: boolean;

  private _light!: THREE.PointLight;
  private _coronaMesh!: THREE.Mesh;
  private _coronaMat!: THREE.ShaderMaterial;
  private _outerGlow!: THREE.Mesh;
  private _flareParticles!: THREE.Points;
  private _flarePositions!: Float32Array;
  private _flareVelocities!: Float32Array;
  private _flareLife!: Float32Array;
  private _flareActive!: boolean[];
  private readonly FLARE_COUNT = 40;

  constructor(config: YellowStarSpriteConfig = {}) {
    super({ tier: 2, name: 'YellowStarSprite', ...config });
    this._radius = config.radius ?? 3.5;
    this._lightIntensity = config.lightIntensity ?? 3.0;
    this._pulseSpeed = config.pulseSpeed ?? 0.5;
    this._flareChance = config.flareChance ?? 0.02;
    this._showSolarWind = config.showSolarWind ?? true;
    this._rotationSpeed = 0.02; // 太阳自转较慢
  }

  mount(scene: THREE.Scene, config: CelestialSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // ── 1. 太阳表面 ──────────────────────────────
    const sunTex = this._createSunTexture(512);
    const sunMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        map: sunTex,
      })
    );
    const sunMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r, 48, 48)),
      sunMat
    );
    group.add(sunMesh);

    // ── 2. 内冕层（边缘发光）────────────────────
    this._coronaMat = this.trackMaterial(
      new THREE.ShaderMaterial({
        uniforms: {
          uCoronaColor: { value: new THREE.Color(0xFFD700) },
          uIntensity: { value: 1.5 },
          uTime: { value: 0 },
        },
        vertexShader: coronaVertShader,
        fragmentShader: coronaFragShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    ) as THREE.ShaderMaterial;
    this._coronaMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r * 1.08, 48, 48)),
      this._coronaMat
    );
    group.add(this._coronaMesh);

    // ── 3. 外晕层 ────────────────────────────────
    const outerMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xFFAA00,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this._outerGlow = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r * 1.5, 32, 32)),
      outerMat
    );
    group.add(this._outerGlow);

    // ── 4. PointLight ────────────────────────────
    this._light = new THREE.PointLight(0xFFF5E0, this._lightIntensity, r * 30);
    group.add(this._light);

    // ── 5. 太阳风耀斑粒子 ────────────────────────
    if (this._showSolarWind) {
      this._initFlareParticles(r);
      group.add(this._flareParticles);
    }

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (!this._object3D) return;

    const pulse = this.pulse(this._pulseSpeed, 0.85, 1.15);

    // 日冕呼吸
    if (this._coronaMat?.uniforms) {
      this._coronaMat.uniforms.uTime.value = this._time;
      this._coronaMat.uniforms.uIntensity.value = 1.3 * pulse;
    }

    // 光源脉动
    if (this._light) {
      this._light.intensity = this._lightIntensity * pulse;
    }

    // 外晕缩放
    const glowPulse = 1 + Math.sin(this._time * this._pulseSpeed * 2) * 0.05;
    this._outerGlow?.scale.setScalar(glowPulse);

    // 耀斑粒子更新
    if (this._flareActive) {
      this._updateFlares(deltaTime);

      // 随机触发新耀斑
      if (Math.random() < this._flareChance) {
        this._triggerRandomFlare();
      }
    }
  }

  // ─── 纹理生成 ────────────────────────────────

  private _createSunTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      // 太阳基底（金黄色）
      const baseGrad = ctx.createRadialGradient(w * 0.45, h * 0.45, 0, w / 2, h / 2, w * 0.55);
      baseGrad.addColorStop(0, '#FFF5D0');
      baseGrad.addColorStop(0.3, '#FFE566');
      baseGrad.addColorStop(0.7, '#FFCC00');
      baseGrad.addColorStop(1, '#FF9900');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // 对流胞图案（米粒组织）
      const cellCount = 80;
      for (let i = 0; i < cellCount; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const cr = 8 + Math.random() * 20;
        const alpha = 0.1 + Math.random() * 0.15;

        const cellGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        cellGrad.addColorStop(0, `rgba(255,230,100,${alpha})`);
        cellGrad.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = cellGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 太阳黑子
      const sunspots = [
        { x: 0.35, y: 0.4, r: 0.06 },
        { x: 0.6, y: 0.55, r: 0.04 },
        { x: 0.45, y: 0.3, r: 0.03 },
      ];
      sunspots.forEach(({ x, y, r }) => {
        const sx = x * w, sy = y * h, sr = r * w;
        const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        spotGrad.addColorStop(0, 'rgba(40,20,10,0.7)');
        spotGrad.addColorStop(0.7, 'rgba(80,40,10,0.4)');
        spotGrad.addColorStop(1, 'rgba(100,60,20,0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  // ─── 耀斑粒子系统 ────────────────────────────

  private _initFlareParticles(_radius: number): void {
    this._flarePositions = new Float32Array(this.FLARE_COUNT * 3);
    this._flareVelocities = new Float32Array(this.FLARE_COUNT * 3);
    this._flareLife = new Float32Array(this.FLARE_COUNT);
    this._flareActive = new Array(this.FLARE_COUNT).fill(false);

    for (let i = 0; i < this.FLARE_COUNT; i++) {
      this._flarePositions[i * 3] = 0;
      this._flarePositions[i * 3 + 1] = -9999; // 隐藏
      this._flarePositions[i * 3 + 2] = 0;
      this._flareLife[i] = 0;
    }

    const geo = this.trackGeometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(this._flarePositions, 3));

    const mat = this.trackMaterial(
      new THREE.PointsMaterial({
        color: 0xFFDD44,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this._flareParticles = new THREE.Points(geo, mat);
  }

  private _triggerRandomFlare(): void {
    for (let i = 0; i < this.FLARE_COUNT; i++) {
      if (!this._flareActive[i]) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = this._radius * 1.1;

        this._flarePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        this._flarePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        this._flarePositions[i * 3 + 2] = r * Math.cos(phi);

        const speed = 0.8 + Math.random() * 1.5;
        this._flareVelocities[i * 3] = this._flarePositions[i * 3] * speed / r;
        this._flareVelocities[i * 3 + 1] = this._flarePositions[i * 3 + 1] * speed / r;
        this._flareVelocities[i * 3 + 2] = this._flarePositions[i * 3 + 2] * speed / r;

        this._flareLife[i] = 0;
        this._flareActive[i] = true;
        break;
      }
    }
  }

  private _updateFlares(dt: number): void {
    for (let i = 0; i < this.FLARE_COUNT; i++) {
      if (!this._flareActive[i]) continue;

      this._flareLife[i] += dt;
      const life = this._flareLife[i];

      if (life > 1.5) {
        this._flareActive[i] = false;
        this._flarePositions[i * 3 + 1] = -9999;
        continue;
      }

      this._flarePositions[i * 3] += this._flareVelocities[i * 3] * dt;
      this._flarePositions[i * 3 + 1] += this._flareVelocities[i * 3 + 1] * dt;
      this._flarePositions[i * 3 + 2] += this._flareVelocities[i * 3 + 2] * dt;
    }

    const posAttr = this._flareParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }
}

export default YellowStarSprite;
