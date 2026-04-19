/**
 * AsteroidBeltSprite - 小行星带精灵（Tier 2）
 *
 * 视觉效果：
 *   - InstancedMesh 批量渲染 200+ 小行星
 *   - 沿环形轨道分布
 *   - 每颗小行星独立自转
 *
 * 性能优化：
 *   - InstancedMesh 单次 drawcall
 *   - 静态位置，运行时只更新旋转
 */

import * as THREE from 'three';
import Sprite, { SpriteConfig, SpriteCategory } from '../Sprite';

export interface AsteroidBeltSpriteConfig extends SpriteConfig {
  /** 轨道内半径（默认 10） */
  innerRadius?: number;
  /** 轨道外半径（默认 16） */
  outerRadius?: number;
  /** 小行星数量（默认 200） */
  count?: number;
  /** 小行星平均大小（默认 0.15） */
  avgSize?: number;
  /** 轨道倾斜（弧度，默认 0.1） */
  inclination?: number;
}

interface AsteroidData {
  angle: number;       // 轨道角度
  radius: number;      // 轨道半径
  size: number;        // 大小
  rotX: number;        // X轴旋转
  rotY: number;        // Y轴旋转
  rotZ: number;        // Z轴旋转
  rotSpeed: THREE.Vector3; // 各轴旋转速度
  color: THREE.Color;  // 颜色
}

export class AsteroidBeltSprite extends Sprite {
  readonly category: SpriteCategory = 'environment';

  private _innerRadius: number;
  private _outerRadius: number;
  private _count: number;
  private _avgSize: number;
  private _inclination: number;
  private _asteroids: AsteroidData[] = [];
  private _time: number = 0;
  private _instancedMesh!: THREE.InstancedMesh;
  private _dummy = new THREE.Object3D();

  constructor(config: AsteroidBeltSpriteConfig = {}) {
    super({ tier: 2, name: 'AsteroidBeltSprite', ...config });
    this._innerRadius = config.innerRadius ?? 10;
    this._outerRadius = config.outerRadius ?? 16;
    this._count = config.count ?? 200;
    this._avgSize = config.avgSize ?? 0.15;
    this._inclination = config.inclination ?? 0.1;
  }

  mount(scene: THREE.Scene): void {
    this._scene = scene;

    // ── 生成小行星数据 ───────────────────────────
    const asteroidGeo = this.trackGeometry(new THREE.IcosahedronGeometry(1, 1));
    const asteroidMat = this.trackMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.95,
        metalness: 0.1,
      })
    );

    this._instancedMesh = new THREE.InstancedMesh(
      asteroidGeo, asteroidMat, this._count
    );
    this._instancedMesh.castShadow = true;

    const colors = [
      new THREE.Color(0x888888),
      new THREE.Color(0x9A8A7A),
      new THREE.Color(0x7A7A7A),
      new THREE.Color(0xA09080),
      new THREE.Color(0x6A6050),
    ];

    for (let i = 0; i < this._count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const orbitRadius = this._innerRadius + Math.random() * (this._outerRadius - this._innerRadius);

      this._asteroids.push({
        angle,
        radius: orbitRadius,
        size: this._avgSize * (0.5 + Math.random() * 1.5),
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3
        ),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // 设置实例颜色
    for (let i = 0; i < this._count; i++) {
      this._instancedMesh.setColorAt(i, this._asteroids[i].color);
    }
    this._instancedMesh.instanceColor!.needsUpdate = true;

    // 初始化位置
    this._updateInstancePositions(0);
    this._instancedMesh.instanceMatrix.needsUpdate = true;

    this._object3D = this._instancedMesh;
    scene.add(this._instancedMesh);
  }

  update(deltaTime: number): void {
    if (!this._object3D) return;
    this._time += deltaTime;
    this._updateInstancePositions(deltaTime);
  }

  private _updateInstancePositions(dt: number): void {
    for (let i = 0; i < this._count; i++) {
      const a = this._asteroids[i];

      // 轨道运动（很慢）
      a.angle += dt * 0.05 * (1 / a.radius);
      const x = Math.cos(a.angle) * a.radius;
      const z = Math.sin(a.angle) * a.radius;
      const y = Math.sin(a.angle) * a.radius * Math.sin(this._inclination);

      // 自转
      a.rotX += dt * a.rotSpeed.x;
      a.rotY += dt * a.rotSpeed.y;
      a.rotZ += dt * a.rotSpeed.z;

      this._dummy.position.set(x, y, z);
      this._dummy.rotation.set(a.rotX, a.rotY, a.rotZ);
      this._dummy.scale.setScalar(a.size);
      this._dummy.updateMatrix();
      this._instancedMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this._instancedMesh.instanceMatrix.needsUpdate = true;
  }
}

export default AsteroidBeltSprite;
