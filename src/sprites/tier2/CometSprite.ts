/**
 * CometSprite - 彗星精灵（Tier 2）
 *
 * 视觉效果：
 *   - 核心：小型冰质球体（蓝白色）
 *   - 慧发：半透明发光球壳
 *   - 慧尾：粒子系统（沿运动方向拉长）
 *   - 可选椭圆轨道运动
 *
 * 动效：
 *   - 慧发脉动
 *   - 慧尾随风飘动（方向随时间变化）
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface CometSpriteConfig extends CelestialSpriteConfig {
  /** 彗核半径（默认 0.4） */
  radius?: number;
  /** 慧发颜色（默认淡蓝 #AADDFF） */
  comaColor?: number;
  /** 慧尾颜色（默认蓝白 #CCEEFF） */
  tailColor?: number;
  /** 慧发强度 */
  comaIntensity?: number;
}

const comaVertShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const comaFragShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);
    float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
    gl_FragColor = vec4(uColor, fresnel * uIntensity * pulse);
  }
`;

export class CometSprite extends CelestialSprite {
  private _comaColor: number;
  private _comaIntensity: number;
  private _tailColor: number;

  private _comaMat!: THREE.ShaderMaterial;
  private _tailParticles!: THREE.Points;
  private _tailPositions!: Float32Array;
  private _tailVelocities!: Float32Array;
  private _tailLife!: Float32Array;
  private _tailActive!: boolean[];
  private _tailAngle: number = 0;
  private readonly TAIL_COUNT = 80;

  constructor(config: CometSpriteConfig = {}) {
    super({ tier: 2, name: 'CometSprite', ...config });
    this._radius = config.radius ?? 0.4;
    this._comaColor = config.comaColor ?? 0xAADDFF;
    this._comaIntensity = config.comaIntensity ?? 1.5;
    this._tailColor = config.tailColor ?? 0xCCEEFF;
    this._rotationSpeed = 0.05;
  }

  mount(scene: THREE.Scene, config: CelestialSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(20, 0, 0));

    // ── 彗核 ──────────────────────────────────
    const nucleusMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    );
    const nucleus = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r * 0.6, 16, 16)),
      nucleusMat
    );
    group.add(nucleus);

    // ── 慧发（光晕）───────────────────────────
    this._comaMat = this.trackMaterial(
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(this._comaColor) },
          uIntensity: { value: this._comaIntensity },
          uTime: { value: 0 },
        },
        vertexShader: comaVertShader,
        fragmentShader: comaFragShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    ) as THREE.ShaderMaterial;

    const comaMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r * 1.5, 24, 24)),
      this._comaMat
    );
    group.add(comaMesh);

    // ── 慧尾 ─────────────────────────────────
    this._initTail(r);
    group.add(this._tailParticles);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (!this._object3D) return;

    this._time += deltaTime;
    this._tailAngle += deltaTime * 0.3; // 慧尾方向缓慢摆动

    // 慧发脉动
    if (this._comaMat?.uniforms) {
      this._comaMat.uniforms.uTime.value = this._time;
    }

    // 慧尾粒子
    this._updateTail(deltaTime);

    // 持续发射新粒子
    if (Math.random() < 0.6) {
      this._emitTailParticle();
    }
  }

  private _initTail(r: number): void {
    this._tailPositions = new Float32Array(this.TAIL_COUNT * 3);
    this._tailVelocities = new Float32Array(this.TAIL_COUNT * 3);
    this._tailLife = new Float32Array(this.TAIL_COUNT);
    this._tailActive = new Array(this.TAIL_COUNT).fill(false);

    for (let i = 0; i < this.TAIL_COUNT; i++) {
      this._tailPositions[i * 3] = 0;
      this._tailPositions[i * 3 + 1] = -9999;
      this._tailPositions[i * 3 + 2] = 0;
    }

    const geo = this.trackGeometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(this._tailPositions, 3));

    const mat = this.trackMaterial(
      new THREE.PointsMaterial({
        color: this._tailColor,
        size: r * 0.4,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this._tailParticles = new THREE.Points(geo, mat);
  }

  private _emitTailParticle(): void {
    for (let i = 0; i < this.TAIL_COUNT; i++) {
      if (!this._tailActive[i]) {
        const spread = 0.3;
        this._tailPositions[i * 3] = (Math.random() - 0.5) * spread;
        this._tailPositions[i * 3 + 1] = (Math.random() - 0.5) * spread;
        this._tailPositions[i * 3 + 2] = (Math.random() - 0.5) * spread;

        // 沿运动反方向发射
        const speed = 0.3 + Math.random() * 0.5;
        const angle = Math.PI + (Math.random() - 0.5) * 0.5 + this._tailAngle;
        this._tailVelocities[i * 3] = Math.cos(angle) * speed;
        this._tailVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
        this._tailVelocities[i * 3 + 2] = Math.sin(angle) * speed;

        this._tailLife[i] = 0;
        this._tailActive[i] = true;
        break;
      }
    }
  }

  private _updateTail(dt: number): void {
    for (let i = 0; i < this.TAIL_COUNT; i++) {
      if (!this._tailActive[i]) continue;

      this._tailLife[i] += dt;
      if (this._tailLife[i] > 2.0) {
        this._tailActive[i] = false;
        this._tailPositions[i * 3 + 1] = -9999;
        continue;
      }

      this._tailPositions[i * 3] += this._tailVelocities[i * 3] * dt;
      this._tailPositions[i * 3 + 1] += this._tailVelocities[i * 3 + 1] * dt;
      this._tailPositions[i * 3 + 2] += this._tailVelocities[i * 3 + 2] * dt;
    }

    const posAttr = this._tailParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }
}

export default CometSprite;
