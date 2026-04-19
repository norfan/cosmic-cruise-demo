/**
 * MoonSprite - 月球精灵（Tier 1）
 *
 * 视觉效果：
 *   - 程序化月面纹理（灰色基底 + 随机陨石坑）
 *   - 法线扰动模拟凹凸感
 *   - 可选绕地球轨道运行
 *
 * 动效：
 *   - 潮汐锁定（自转速度 = 公转速度）
 *   - 轨道运行（依赖 CelestialSprite 基类 orbit 逻辑）
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface MoonSpriteConfig extends CelestialSpriteConfig {
  /** 月球半径（默认 0.68） */
  radius?: number;
  /** 陨石坑数量（默认 60） */
  craterCount?: number;
}

export class MoonSprite extends CelestialSprite {
  private _craterCount: number;

  constructor(config: MoonSpriteConfig = {}) {
    super({ tier: 1, name: 'MoonSprite', ...config });
    this._radius = config.radius ?? 0.68;
    this._craterCount = config.craterCount ?? 60;
    // 潮汐锁定：自转速度和公转速度相同
    if (config.orbit) {
      this._rotationSpeed = config.orbit.speed;
    }
  }

  mount(scene: THREE.Scene, config: MoonSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const craterCount = config.craterCount ?? this._craterCount;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(5, 0, 0));

    // ── 月面纹理（程序化） ──────────────────────
    const moonTex = this._createMoonTexture(512, craterCount);

    const moonMat = this.trackMaterial(
      new THREE.MeshStandardMaterial({
        map: moonTex,
        roughness: 1.0,
        metalness: 0.0,
      })
    );

    const moonMesh = new THREE.Mesh(
      this.trackGeometry(new THREE.SphereGeometry(r, 32, 32)),
      moonMat
    );
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    group.add(moonMesh);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
  }

  // ─── 纹理生成 ────────────────────────────────

  private _createMoonTexture(size: number, craterCount: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      // 月面基底（浅灰渐变）
      const baseGrad = ctx.createRadialGradient(w * 0.4, h * 0.35, 0, w / 2, h / 2, w * 0.6);
      baseGrad.addColorStop(0, '#d0d0d0');
      baseGrad.addColorStop(0.5, '#a8a8a8');
      baseGrad.addColorStop(1, '#888888');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, w, h);

      // 随机陨石坑
      for (let i = 0; i < craterCount; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const cr = 2 + Math.random() * (w * 0.06);

        // 外圈高亮（撞击溅射）
        const rimGrad = ctx.createRadialGradient(cx, cy, cr * 0.7, cx, cy, cr * 1.3);
        rimGrad.addColorStop(0, 'rgba(200,200,200,0)');
        rimGrad.addColorStop(0.5, 'rgba(220,220,220,0.4)');
        rimGrad.addColorStop(1, 'rgba(200,200,200,0)');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // 坑底暗色
        const craterGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        craterGrad.addColorStop(0, 'rgba(80,80,80,0.7)');
        craterGrad.addColorStop(0.6, 'rgba(100,100,100,0.4)');
        craterGrad.addColorStop(1, 'rgba(120,120,120,0)');
        ctx.fillStyle = craterGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // 月海（大片暗色区域）
      const marea = [
        { x: 0.35, y: 0.38, r: 0.12 },
        { x: 0.6, y: 0.25, r: 0.09 },
        { x: 0.55, y: 0.6, r: 0.1 },
      ];
      marea.forEach(({ x, y, r }) => {
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
        g.addColorStop(0, 'rgba(60,60,70,0.5)');
        g.addColorStop(1, 'rgba(60,60,70,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x * w, y * h, r * w, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }
}

export default MoonSprite;
