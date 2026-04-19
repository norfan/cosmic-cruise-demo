/**
 * TreeSprite - 树木精灵（Tier 0）
 *
 * 支持三种变体：
 *   pine  - 圆锥松树（深绿）
 *   palm  - 棕榈树（弯曲树干 + 扇叶）
 *   broad - 阔叶树（球形树冠）
 *
 * 动效：
 *   - 树冠轻微摇摆（sin 摆动）
 */

import * as THREE from 'three';
import EnvironmentSprite, { EnvironmentSpriteConfig } from '../EnvironmentSprite';

export type TreeVariant = 'pine' | 'palm' | 'broad';

export interface TreeSpriteConfig extends EnvironmentSpriteConfig {
  variant?: TreeVariant;
  trunkColor?: number;
  leafColor?: number;
  height?: number;
}

export class TreeSprite extends EnvironmentSprite {
  private _variant: TreeVariant;
  private _crown: THREE.Object3D | null = null;

  constructor(config: TreeSpriteConfig = {}) {
    super({ tier: 0, name: 'TreeSprite', ...config });
    this._variant = config.variant ?? 'pine';
  }

  mount(scene: THREE.Scene, config: TreeSpriteConfig = {}): void {
    this._scene = scene;

    const variant = config.variant ?? this._variant;
    const h = config.height ?? 3;
    const trunkColor = config.trunkColor ?? 0x7a4f2d;
    const leafColor = config.leafColor ?? (variant === 'palm' ? 0x2d8a3e : 0x1a6b28);

    const group = new THREE.Group();

    switch (variant) {
      case 'pine':
        this._buildPine(group, h, trunkColor, leafColor);
        break;
      case 'palm':
        this._buildPalm(group, h, trunkColor, leafColor);
        break;
      case 'broad':
        this._buildBroad(group, h, trunkColor, leafColor);
        break;
    }

    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));
    if (config.scale) group.scale.setScalar(config.scale);

    this.applyShadow(group);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 树冠轻微摇摆
    if (this._crown) {
      this._crown.rotation.z = Math.sin(this._time * 1.2) * 0.04;
      this._crown.rotation.x = Math.cos(this._time * 0.9) * 0.025;
    }
  }

  // ─── 变体构建 ────────────────────────────────

  private _buildPine(
    group: THREE.Group,
    h: number,
    trunkColor: number,
    leafColor: number
  ): void {
    // 树干
    const trunk = new THREE.Mesh(
      this.trackGeometry(new THREE.CylinderGeometry(0.08, 0.14, h * 0.45, 6)),
      this.trackMaterial(new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 }))
    );
    trunk.position.y = h * 0.225;
    group.add(trunk);

    // 三层圆锥树冠
    const mat = this.trackMaterial(
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.8, flatShading: true })
    );
    const crown = new THREE.Group();
    const layers = [
      { r: 0.9, yBase: h * 0.35 },
      { r: 0.65, yBase: h * 0.55 },
      { r: 0.4, yBase: h * 0.72 },
    ];
    layers.forEach(({ r, yBase }) => {
      const cone = new THREE.Mesh(
        this.trackGeometry(new THREE.ConeGeometry(r, h * 0.35, 7)),
        mat
      );
      cone.position.y = yBase + h * 0.175;
      crown.add(cone);
    });
    group.add(crown);
    this._crown = crown;
  }

  private _buildPalm(
    group: THREE.Group,
    h: number,
    trunkColor: number,
    leafColor: number
  ): void {
    // 弯曲树干（多段 cylinder 模拟）
    const trunkMat = this.trackMaterial(
      new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95 })
    );
    const segments = 5;
    let prevPos = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < segments; i++) {
      const seg = new THREE.Mesh(
        this.trackGeometry(new THREE.CylinderGeometry(0.08 - i * 0.01, 0.12 - i * 0.01, h / segments, 6)),
        trunkMat
      );
      const bend = (i / segments) * 0.3;
      seg.position.set(prevPos.x + bend * 0.5, prevPos.y + h / segments / 2, prevPos.z);
      seg.rotation.z = -bend * 0.3;
      group.add(seg);
      prevPos = seg.position.clone();
      prevPos.y += h / segments / 2;
    }

    // 扇形叶片
    const leafMat = this.trackMaterial(
      new THREE.MeshStandardMaterial({ color: leafColor, side: THREE.DoubleSide, roughness: 0.7 })
    );
    const crown = new THREE.Group();
    const leafCount = 7;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        this.trackGeometry(new THREE.PlaneGeometry(0.3, 1.2)),
        leafMat
      );
      leaf.position.set(
        Math.cos(angle) * 0.4,
        prevPos.y,
        Math.sin(angle) * 0.4
      );
      leaf.rotation.y = angle;
      leaf.rotation.x = -0.5;
      crown.add(leaf);
    }
    group.add(crown);
    this._crown = crown;
  }

  private _buildBroad(
    group: THREE.Group,
    h: number,
    trunkColor: number,
    leafColor: number
  ): void {
    // 树干
    const trunk = new THREE.Mesh(
      this.trackGeometry(new THREE.CylinderGeometry(0.1, 0.18, h * 0.5, 7)),
      this.trackMaterial(new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 }))
    );
    trunk.position.y = h * 0.25;
    group.add(trunk);

    // 球形树冠（三个随机大小球体叠加）
    const crown = new THREE.Group();
    const leafMat = this.trackMaterial(
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85, flatShading: true })
    );
    const blobs = [
      { x: 0, z: 0, r: 0.85 },
      { x: 0.4, z: 0.2, r: 0.6 },
      { x: -0.3, z: 0.3, r: 0.55 },
    ];
    blobs.forEach(({ x, z, r }) => {
      const blob = new THREE.Mesh(
        this.trackGeometry(new THREE.SphereGeometry(r, 8, 6)),
        leafMat
      );
      blob.position.set(x, h * 0.55, z);
      crown.add(blob);
    });
    group.add(crown);
    this._crown = crown;
  }
}

export default TreeSprite;
