/**
 * GasGiantSprite - 气态巨行星精灵基类
 *
 * 支持子类：木星、土星
 * 提供程序化条纹纹理 + 可选行星环
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface GasGiantSpriteConfig extends CelestialSpriteConfig {
  radius?: number;
  /** 条纹颜色数组（最多5色） */
  bandColors?: string[];
  /** 是否显示行星环 */
  showRings?: boolean;
  ringColor?: string;
  ringOpacity?: number;
}

export class GasGiantSprite extends CelestialSprite {
  private _bandColors: string[];
  private _showRings: boolean;
  private _ringColor: string;
  private _ringOpacity: number;
  private _ringsMesh?: THREE.Mesh;

  constructor(config: GasGiantSpriteConfig = {}) {
    super({ tier: 2, name: 'GasGiantSprite', ...config });
    this._bandColors = config.bandColors ?? ['#C88B3A', '#E8D5A0', '#A06030', '#F0E0B0', '#806030'];
    this._showRings = config.showRings ?? false;
    this._ringColor = config.ringColor ?? '#D4A860';
    this._ringOpacity = config.ringOpacity ?? 0.7;
  }

  mount(scene: THREE.Scene, config: GasGiantSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const showRings = config.showRings ?? this._showRings;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 条纹纹理
    const tex = this.createBandTexture(512);
    const mat = this.trackMaterial(
      new THREE.MeshPhongMaterial({ map: tex, shininess: 10 })
    );
    const mesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r, 48, 48)), mat);
    group.add(mesh);

    // 行星环
    if (showRings) {
      const ringGeo = this.trackGeometry(new THREE.RingGeometry(r * 1.4, r * 2.4, 64));
      const ringMat = this.trackMaterial(
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(this._ringColor),
          transparent: true,
          opacity: this._ringOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      this._ringsMesh = new THREE.Mesh(ringGeo, ringMat);
      this._ringsMesh.rotation.x = Math.PI / 2.2;
      group.add(this._ringsMesh);
    }

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  protected createBandTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      const bands = 12;
      const colors = this._bandColors;

      for (let i = 0; i < bands; i++) {
        const yTop = (i / bands) * h;
        const yBottom = ((i + 1) / bands) * h;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(0, yTop, w, yBottom - yTop + 2);

        // Stripe edge perturbation
        const perturbation = 4 + Math.random() * 8;
        for (let x = 0; x < w; x += 2) {
          const ny = yTop + Math.random() * perturbation - perturbation / 2;
          if (ny > yTop && ny < yBottom) {
            ctx.fillStyle = colors[(i + 1) % colors.length];
            ctx.fillRect(x, ny, 2, 3);
          }
        }
      }

      // 大红斑（木星特化子类可覆盖此方法）
      // 这里留空，由子类渲染
    });
  }
}

export default GasGiantSprite;
