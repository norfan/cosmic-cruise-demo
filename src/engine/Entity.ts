/**
 * Entity - 实体基类
 * 所有游戏对象的基类，提供生命周期管理和状态机
 */

export enum EntityState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  DESTROYED = 'destroyed',
}

export interface EntityConfig {
  id?: string;
  name?: string;
  tags?: string[];
}

let entityIdCounter = 0;

export abstract class Entity {
  readonly id: string;
  name: string;
  tags: Set<string> = new Set();
  state: EntityState = EntityState.INACTIVE;

  constructor(config: EntityConfig = {}) {
    this.id = config.id || `entity_${++entityIdCounter}`;
    this.name = config.name || this.constructor.name;
    if (config.tags) {
      config.tags.forEach((tag) => this.tags.add(tag));
    }
  }

  /**
   * 初始化实体
   */
  init?(): void;

  /**
   * 每帧更新
   * @param deltaTime 帧时间间隔（秒）
   */
  update?(deltaTime: number): void;

  /**
   * 销毁实体
   */
  dispose?(): void;

  /**
   * 激活实体
   */
  activate(): void {
    if (this.state === EntityState.DESTROYED) {
      console.warn(`[Entity] Cannot activate destroyed entity: ${this.id}`);
      return;
    }
    const wasInactive = this.state === EntityState.INACTIVE;
    this.state = EntityState.ACTIVE;
    if (wasInactive && this.init) {
      this.init();
    }
    if (this.onActivate) {
      this.onActivate();
    }
  }

  /**
   * 停用实体（可重新激活）
   */
  deactivate(): void {
    if (this.state === EntityState.DESTROYED) return;
    this.state = EntityState.INACTIVE;
    if (this.onDeactivate) {
      this.onDeactivate();
    }
  }

  /**
   * 销毁实体（不可逆）
   */
  destroy(): void {
    if (this.state === EntityState.DESTROYED) return;
    this.state = EntityState.DESTROYED;
    if (this.onDestroy) {
      this.onDestroy();
    }
    if (this.dispose) {
      this.dispose();
    }
  }

  /**
   * 检查实体是否处于活跃状态
   */
  isActive(): boolean {
    return this.state === EntityState.ACTIVE;
  }

  /**
   * 检查实体是否已销毁
   */
  isDestroyed(): boolean {
    return this.state === EntityState.DESTROYED;
  }

  /**
   * 检查实体是否包含指定标签
   */
  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    this.tags.add(tag);
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  /**
   * 激活时的回调
   */
  protected onActivate?(): void;

  /**
   * 停用时的回调
   */
  protected onDeactivate?(): void;

  /**
   * 销毁时的回调
   */
  protected onDestroy?(): void;
}

export default Entity;
