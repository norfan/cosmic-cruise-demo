/**
 * CollectibleSprite - 可收集精灵基类
 *
 * 所有可收集物品的基类：
 *   - EnergyOrbSprite (能量球)
 *   - ArtifactSprite (人工制品)
 *   - CreationFragmentSprite (创造碎片)
 *
 * 特性：
 *   - 统一的收集接口
 *   - 可拾取动画
 *   - 发光标记
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig, SpriteCategory, SpriteInteractionResult } from './Sprite';

export type CollectibleType = 'energy' | 'artifact' | 'creation' | 'upgrade';

export interface CollectibleConfig extends SpriteConfig {
  collectibleType?: CollectibleType;
  energyValue?: number;
  itemId?: string;
  collectRadius?: number;
  respawnTime?: number;
}

export interface CollectibleData {
  id: string;
  type: CollectibleType;
  energyValue: number;
  itemId?: string;
  position: THREE.Vector3;
}

export abstract class CollectibleSprite extends Sprite {
  abstract readonly category: SpriteCategory;
  abstract readonly collectibleType: CollectibleType;

  protected _energyValue: number;
  protected _itemId: string | undefined;
  public _collectRadius: number;
  protected _collected: boolean = false;
  protected _respawnTime: number;
  protected _respawning: boolean = false;
  protected _respawnTimer: number = 0;

  protected _glowMesh: THREE.Mesh | null = null;
  protected _highlightMesh: THREE.Mesh | null = null;

  constructor(config: CollectibleConfig = {}) {
    super({ tier: config.tier ?? 0, ...config });
    this._energyValue = config.energyValue ?? 10;
    this._itemId = config.itemId;
    this._collectRadius = config.collectRadius ?? 2;
    this._respawnTime = config.respawnTime ?? 0;
  }

  get energyValue(): number {
    return this._energyValue;
  }

  get itemId(): string | undefined {
    return this._itemId;
  }

  get collectibleData(): CollectibleData {
    return {
      id: this.id,
      type: this.collectibleType,
      energyValue: this._energyValue,
      itemId: this._itemId,
      position: this.getPosition(),
    };
  }

  isCollected(): boolean {
    return this._collected;
  }

  canCollect(distance: number): boolean {
    return !this._collected && distance <= this._collectRadius;
  }

  collect(): SpriteInteractionResult {
    if (this._collected) return {};

    this._collected = true;
    this._playCollectAnimation();

    const result: SpriteInteractionResult = {
      energyDelta: this._energyValue,
      message: `+${this._energyValue} 能量`,
    };

    if (this._itemId) {
      result.itemId = this._itemId;
    }

    this.emit('collectibleCollected', this.collectibleData);

    if (this._respawnTime > 0) {
      this._startRespawn();
    } else {
      setTimeout(() => this.dispose(), 600);
    }

    return result;
  }

  protected _playCollectAnimation(): void {
    if (!this._object3D) return;

    if (this._glowMesh) {
      this._glowMesh.visible = false;
    }
    if (this._highlightMesh) {
      this._highlightMesh.visible = true;
    }

    const startScale = this._object3D.scale.x;
    const animate = () => {
      if (!this._object3D || this._collected === false) return;

      const current = this._object3D.scale.x;
      const expansion = current + 0.02;

      this._object3D.scale.setScalar(expansion);

      const material = (this._object3D.children[0] as THREE.Mesh)?.material as THREE.MeshStandardMaterial;
      if (material) {
        material.opacity = Math.max(0, material.opacity - 0.05);
        material.transparent = true;
      }

      if (current < startScale * 2) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  protected _startRespawn(): void {
    this._respawning = true;
    this._respawnTimer = 0;

    if (this._object3D) {
      this._object3D.visible = false;
    }
  }

  protected _updateRespawn(deltaTime: number): void {
    if (!this._respawning) return;

    this._respawnTimer += deltaTime;

    if (this._respawnTimer >= this._respawnTime) {
      this._respawning = false;
      this._collected = false;

      if (this._object3D) {
        this._object3D.visible = true;
        this._object3D.scale.setScalar(1);
      }

      if (this._glowMesh) {
        this._glowMesh.visible = true;
      }
      if (this._highlightMesh) {
        this._highlightMesh.visible = false;
      }

      this.emit('collectibleRespawned', { id: this.id });
    }
  }

  protected _createGlowMarker(radius: number, color: number): void {
    const glowGeo = new THREE.SphereGeometry(radius * 1.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    this._glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this._object3D?.add(this._glowMesh);

    const highlightGeo = new THREE.RingGeometry(radius * 0.9, radius * 1.1, 32);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this._highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    this._highlightMesh.rotation.x = -Math.PI / 2;
    this._highlightMesh.position.y = -radius;
    this._object3D?.add(this._highlightMesh);
  }

  highlight(visible: boolean): void {
    if (this._highlightMesh) {
      const mat = this._highlightMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = visible ? 0.8 : 0;
    }
  }

  onHoverEnter?(): void;
  onHoverLeave?(): void;
}

export default CollectibleSprite;