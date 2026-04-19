/**
 * EnvironmentSprite - 环境精灵基类
 *
 * 适用于 Tier 0 的自然环境元素：
 *   海洋、沙滩、草地、树木、岩石、远山、云朵、阳光等
 *
 * 特性：
 *   - 固定在世界空间中（静态或简单动画）
 *   - 不参与物理碰撞
 *   - 支持 hover/click 微交互（Design Spells 风格）
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig, SpriteCategory } from './Sprite';

export interface EnvironmentSpriteConfig extends SpriteConfig {
  /** 是否接受阴影 */
  receiveShadow?: boolean;
  /** 是否投射阴影 */
  castShadow?: boolean;
  /** 动画速度倍率（1.0 = 正常速度） */
  animSpeed?: number;
}

export abstract class EnvironmentSprite extends Sprite {
  readonly category: SpriteCategory = 'environment';

  /** 动画累计时间（供 update 中计算 sin/cos 使用） */
  protected _time: number = 0;
  /** 动画速度倍率 */
  protected _animSpeed: number;
  /** 是否接受阴影 */
  protected _receiveShadow: boolean;
  /** 是否投射阴影 */
  protected _castShadow: boolean;

  constructor(config: EnvironmentSpriteConfig = {}) {
    super(config);
    this._animSpeed = config.animSpeed ?? 1.0;
    this._receiveShadow = config.receiveShadow ?? true;
    this._castShadow = config.castShadow ?? true;
  }

  /**
   * 将精灵挂载到场景
   * 子类需创建 this._object3D 并调用 scene.add(this._object3D)
   */
  abstract mount(scene: THREE.Scene, config?: EnvironmentSpriteConfig): void;

  /**
   * 默认 update：递增时间轴，供子类动画使用
   * 子类可 super.update(dt) 后再做自己的动画逻辑
   */
  update(deltaTime: number): void {
    this._time += deltaTime * this._animSpeed;
  }

  /**
   * 为 Mesh 批量设置阴影属性
   */
  protected applyShadow(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = this._castShadow;
        child.receiveShadow = this._receiveShadow;
      }
    });
  }
}

export default EnvironmentSprite;
