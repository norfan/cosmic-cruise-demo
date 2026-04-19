/**
 * CelestialSprite - 天体精灵基类
 *
 * 适用于 Tier 1~7 的天体组件：
 *   行星、恒星、卫星、小行星、星云、黑洞、星系...
 *
 * 特性：
 *   - 支持轨道运动（可选）
 *   - 支持自转
 *   - 支持 PointLight（恒星发光）
 *   - 脉冲/呼吸动效
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig, SpriteCategory } from './Sprite';

export interface OrbitConfig {
  /** 轨道半径 */
  radius: number;
  /** 轨道角速度（弧度/秒） */
  speed: number;
  /** 轨道中心点 */
  center?: THREE.Vector3;
  /** 初始轨道角度（弧度） */
  initialAngle?: number;
  /** 轨道倾斜角（弧度，绕 X 轴） */
  inclinationX?: number;
  /** 轨道倾斜角（弧度，绕 Z 轴） */
  inclinationZ?: number;
}

export interface CelestialSpriteConfig extends SpriteConfig {
  /** 天体半径（世界空间单位） */
  radius?: number;
  /** 自转速度（弧度/秒） */
  rotationSpeed?: number;
  /** 发光强度（0 = 不发光，>0 = 自发光） */
  emissiveIntensity?: number;
  /** 轨道配置（若有轨道运动） */
  orbit?: OrbitConfig;
}

export abstract class CelestialSprite extends Sprite {
  readonly category: SpriteCategory = 'celestial';

  /** 天体半径 */
  protected _radius: number;
  /** 自转速度 */
  protected _rotationSpeed: number;
  /** 自发光强度 */
  protected _emissiveIntensity: number;
  /** 轨道配置（可选） */
  protected _orbit: OrbitConfig | null = null;
  /** 当前轨道角度（弧度） */
  protected _orbitAngle: number = 0;
  /** 动画累计时间 */
  protected _time: number = 0;

  constructor(config: CelestialSpriteConfig = {}) {
    super(config);
    this._radius = config.radius ?? 1;
    this._rotationSpeed = config.rotationSpeed ?? 0;
    this._emissiveIntensity = config.emissiveIntensity ?? 0;

    if (config.orbit) {
      this._orbit = {
        center: new THREE.Vector3(),
        initialAngle: 0,
        inclinationX: 0,
        inclinationZ: 0,
        ...config.orbit,
      };
      this._orbitAngle = this._orbit.initialAngle ?? 0;
    }
  }

  /**
   * 将天体挂载到场景
   */
  abstract mount(scene: THREE.Scene, config?: CelestialSpriteConfig): void;

  /**
   * 默认 update：处理自转 + 轨道运动
   * 子类可 super.update(dt) 后追加动效
   */
  update(deltaTime: number): void {
    this._time += deltaTime;

    if (!this._object3D) return;

    // 自转
    if (this._rotationSpeed !== 0) {
      this._object3D.rotation.y += this._rotationSpeed * deltaTime;
    }

    // 轨道运动
    if (this._orbit) {
      this._orbitAngle += this._orbit.speed * deltaTime;
      const { radius, center = new THREE.Vector3(), inclinationX = 0, inclinationZ = 0 } = this._orbit;
      const x = center.x + Math.cos(this._orbitAngle) * radius;
      const z = center.z + Math.sin(this._orbitAngle) * radius;
      // 轨道倾斜处理
      const y = center.y
        + Math.sin(this._orbitAngle) * radius * Math.sin(inclinationX)
        + Math.cos(this._orbitAngle) * radius * Math.sin(inclinationZ);
      this._object3D.position.set(x, y, z);
    }
  }

  // ─── 工具方法 ────────────────────────────────

  /**
   * 创建 Fresnel 大气层（半透明发光球壳）
   * 常用于行星大气层和恒星日冕
   */
  protected createAtmosphere(
    radius: number,
    color: THREE.Color,
    opacity: number = 0.3
  ): THREE.Mesh {
    const geo = this.trackGeometry(new THREE.SphereGeometry(radius, 32, 32));
    const mat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    return new THREE.Mesh(geo, mat);
  }

  /**
   * 创建 PointLight（恒星光源）
   */
  protected createPointLight(
    color: THREE.Color | number,
    intensity: number,
    distance: number
  ): THREE.PointLight {
    return new THREE.PointLight(color, intensity, distance);
  }

  /**
   * 脉冲强度值（0~1 的正弦波）
   * @param speed  脉冲速度（周期 = 2π/speed 秒）
   * @param min    最小值（0~1）
   * @param max    最大值（0~1）
   */
  protected pulse(speed: number = 1, min: number = 0.8, max: number = 1.2): number {
    return min + (max - min) * 0.5 * (1 + Math.sin(this._time * speed));
  }
}

export default CelestialSprite;
