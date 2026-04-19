/**
 * Sprite - 精灵基类
 *
 * 所有游戏精灵的根基类，定义统一的生命周期接口：
 *   init(scene) → update(dt) → dispose()
 *
 * 继承体系：
 *   Sprite
 *   ├── EnvironmentSprite  (自然环境：海洋、沙滩、树木...)
 *   ├── CelestialSprite    (天体：行星、恒星、星云...)
 *   ├── ArtificialSprite   (人造物体：卫星、空间站...)
 *   ├── CosmicObjectSprite (宇宙特殊对象：黑洞、虫洞...)
 *   └── CreationSprite     (创世元素：创世核心、法则几何...)
 */

import * as THREE from 'three';
import { Entity, EntityConfig } from '../engine/Entity';
import { eventBus } from '../engine/EventBus';

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

export type SpriteCategory =
  | 'environment'
  | 'celestial'
  | 'artificial'
  | 'cosmicObject'
  | 'creation';

export interface SpriteMaterial {
  /** 可选外部纹理路径（存在且可加载时优先使用） */
  texturePath?: string;
  /** 备用纯色（无纹理时使用） */
  color: THREE.Color;
  /** 可选法线贴图 */
  normalMap?: string;
  /** 可选粗糙度贴图 */
  roughnessMap?: string;
}

export interface SpriteConfig extends EntityConfig {
  /** 所属文明等级 0~7 */
  tier?: number;
  /** 世界空间位置 */
  position?: THREE.Vector3;
  /** 初始旋转（欧拉角） */
  rotation?: THREE.Euler;
  /** 缩放系数 */
  scale?: number;
  /** 材质配置 */
  material?: SpriteMaterial;
  /** 是否立即激活 */
  autoActivate?: boolean;
  /** 附加数据（子类自定义） */
  [key: string]: unknown;
}

export interface SpriteInteractionResult {
  energyDelta?: number;
  itemId?: string;
  message?: string;
}

// ─────────────────────────────────────────────
// Sprite 抽象基类
// ─────────────────────────────────────────────

export abstract class Sprite extends Entity {
  /** 精灵类别 */
  abstract readonly category: SpriteCategory;
  /** 所属文明等级 */
  tier: number;

  /** Three.js 根对象（可以是 Mesh / Group / Points...） */
  protected _object3D: THREE.Object3D | null = null;
  /** 当前所在场景（init 后赋值） */
  protected _scene: THREE.Scene | null = null;

  /** 内部追踪（用于 dispose 清理） */
  protected _geometries: THREE.BufferGeometry[] = [];
  protected _materials: THREE.Material[] = [];
  protected _textures: THREE.Texture[] = [];

  constructor(config: SpriteConfig = {}) {
    super(config);
    this.tier = config.tier ?? 0;
  }

  // ─── 生命周期（由子类实现） ───────────────────

  /**
   * 将精灵挂载到 Three.js 场景
   * 子类在此处创建几何体、材质、网格，并调用 scene.add(this._object3D)
   */
  abstract mount(scene: THREE.Scene, config?: SpriteConfig): void;

  /**
   * 每帧更新
   * @param deltaTime 帧时间间隔（秒）
   */
  abstract update(deltaTime: number): void;

  /**
   * 释放所有 GPU 资源并从场景移除
   */
  dispose(): void {
    this._geometries.forEach((g) => g.dispose());
    this._materials.forEach((m) => m.dispose());
    this._textures.forEach((t) => t.dispose());
    this._geometries = [];
    this._materials = [];
    this._textures = [];

    if (this._object3D && this._scene) {
      this._scene.remove(this._object3D);
    }
    this._object3D = null;
    this._scene = null;
  }

  // ─── 对外接口 ────────────────────────────────

  /** 获取 Three.js 根对象（供场景/测试使用） */
  get object3D(): THREE.Object3D | null {
    return this._object3D;
  }

  /** 是否已挂载到场景 */
  get isMounted(): boolean {
    return this._object3D !== null && this._scene !== null;
  }

  /** 获取世界空间位置 */
  getPosition(): THREE.Vector3 {
    return this._object3D
      ? this._object3D.position.clone()
      : new THREE.Vector3();
  }

  /** 设置世界空间位置 */
  setPosition(pos: THREE.Vector3): void {
    if (this._object3D) this._object3D.position.copy(pos);
  }

  /** 设置统一缩放 */
  setScale(s: number): void {
    if (this._object3D) this._object3D.scale.setScalar(s);
  }

  /** 设置可见性 */
  setVisible(visible: boolean): void {
    if (this._object3D) this._object3D.visible = visible;
  }

  // ─── 交互（可选覆写） ────────────────────────

  /** 玩家与精灵交互时调用（如收集能量球） */
  onInteract?(): SpriteInteractionResult;

  /** Hover 进入（UI 层调用） */
  onHoverEnter?(): void;

  /** Hover 离开（UI 层调用） */
  onHoverLeave?(): void;

  // ─── 工具方法 ────────────────────────────────

  /**
   * 追踪几何体（dispose 时自动清理）
   */
  protected trackGeometry<T extends THREE.BufferGeometry>(geo: T): T {
    this._geometries.push(geo);
    return geo;
  }

  /**
   * 追踪材质（dispose 时自动清理）
   */
  protected trackMaterial<T extends THREE.Material>(mat: T): T {
    this._materials.push(mat);
    return mat;
  }

  /**
   * 追踪纹理（dispose 时自动清理）
   */
  protected trackTexture<T extends THREE.Texture>(tex: T): T {
    this._textures.push(tex);
    return tex;
  }

  /**
   * 创建程序化 Canvas 纹理的辅助方法
   * 子类用此方法生成纹理，无需担心外部依赖
   */
  protected createCanvasTexture(
    size: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    draw(ctx, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return this.trackTexture(tex);
  }

  /**
   * 向事件总线发送事件（快捷方法）
   */
  protected emit<T = unknown>(event: string, data?: T): void {
    eventBus.emit(event, data);
  }
}

export default Sprite;
