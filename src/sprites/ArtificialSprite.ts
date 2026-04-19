/**
 * ArtificialSprite - 人造物体精灵基类
 *
 * 适用于 Tier 1 的人造航天器：
 *   卫星、空间站、飞船、太空碎片...
 *
 * 特性：
 *   - 支持交互（探索、收集）
 *   - 轨道运动（继承自 CelestialSprite 的轨道逻辑）
 *   - 可损坏/可修复状态
 *   - 灯光闪烁（导航灯）
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig, SpriteCategory, SpriteInteractionResult } from './Sprite';

export interface ArtificialSpriteConfig extends SpriteConfig {
  /** 是否可交互 */
  interactive?: boolean;
  /** 交互奖励能量 */
  energyReward?: number;
  /** 初始状态（active/damaged/destroyed） */
  status?: 'active' | 'damaged' | 'destroyed';
  /** 导航灯是否开启 */
  navLights?: boolean;
}

export type ArtificialStatus = 'active' | 'damaged' | 'destroyed';

export abstract class ArtificialSprite extends Sprite {
  readonly category: SpriteCategory = 'artificial';

  /** 是否可交互 */
  protected _interactive: boolean;
  /** 交互奖励能量 */
  protected _energyReward: number;
  /** 当前状态 */
  protected _status: ArtificialStatus;
  /** 导航灯是否开启 */
  protected _navLights: boolean;
  /** 动画累计时间 */
  protected _time: number = 0;
  /** 导航灯列表 */
  protected _navLightList: THREE.PointLight[] = [];

  constructor(config: ArtificialSpriteConfig = {}) {
    super(config);
    this._interactive = config.interactive ?? true;
    this._energyReward = config.energyReward ?? 50;
    this._status = config.status ?? 'active';
    this._navLights = config.navLights ?? true;
  }

  abstract mount(scene: THREE.Scene, config?: ArtificialSpriteConfig): void;

  update(deltaTime: number): void {
    this._time += deltaTime;

    // 导航灯闪烁（0.5Hz）
    if (this._navLights && this._navLightList.length > 0) {
      const on = Math.sin(this._time * Math.PI) > 0;
      this._navLightList.forEach((light) => {
        light.intensity = on ? 0.5 : 0;
      });
    }
  }

  /** 玩家交互（收集能量） */
  onInteract(): SpriteInteractionResult {
    if (!this._interactive || this._status === 'destroyed') {
      return {};
    }
    this._interactive = false; // 防止重复收集
    this.emit('artifactCollected', {
      id: this.id,
      energyDelta: this._energyReward,
    });
    return {
      energyDelta: this._energyReward,
      message: `发现 ${this.name}！获得 ${this._energyReward} 能量`,
    };
  }

  /** 获取当前状态 */
  get status(): ArtificialStatus {
    return this._status;
  }

  /** 添加导航灯到追踪列表 */
  protected addNavLight(light: THREE.PointLight): void {
    this._navLightList.push(light);
  }
}

export default ArtificialSprite;
