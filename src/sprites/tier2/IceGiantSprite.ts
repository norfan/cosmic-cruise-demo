/**
 * IceGiantSprite - 冰巨行星精灵基类
 *
 * 支持：天王星、海王星
 * 提供蓝绿色调程序化纹理 + 微弱大气光晕
 */

import * as THREE from 'three';
import CelestialSprite, { CelestialSpriteConfig } from '../CelestialSprite';

export interface IceGiantSpriteConfig extends CelestialSpriteConfig {
  radius?: number;
  rotationSpeed?: number;
  /** 行星主色 */
  baseColor?: string;
  /** 风暴/云层颜色 */
  stormColor?: string;
  /** 轴倾角（弧度，默认天王星 ~97°，海王 ~28°） */
  axialTilt?: number;
}

export class IceGiantSprite extends CelestialSprite {
  private _baseColor: string;
  private _stormColor: string;
  private _axialTilt: number;

  constructor(config: IceGiantSpriteConfig = {}) {
    super({
      tier: 2, name: 'IceGiantSprite',
      radius: config.radius ?? 1.6,
      rotationSpeed: config.rotationSpeed ?? 0.07,
      ...config,
    });
    this._baseColor = config.baseColor ?? '#40A0C8';
    this._stormColor = config.stormColor ?? '#80D0E8';
    this._axialTilt = config.axialTilt ?? 0;
  }

  mount(scene: THREE.Scene, config: IceGiantSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const tilt = config.axialTilt ?? this._axialTilt;

    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));
    group.rotation.z = tilt; // 轴倾角

    // 冰巨星纹理
    const tex = this._createTexture(512);
    const mat = this.trackMaterial(
      new THREE.MeshPhongMaterial({ map: tex, shininess: 20 })
    );
    const mesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r, 48, 48)), mat);
    group.add(mesh);

    // 微弱大气光晕
    const atmMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this._baseColor).lerp(new THREE.Color(0xffffff), 0.3),
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const atmMesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r * 1.08, 32, 32)), atmMat);
    group.add(atmMesh);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  private _createTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      ctx.fillStyle = this._baseColor;
      ctx.fillRect(0, 0, w, h);

      // 条纹结构
      for (let i = 0; i < 10; i++) {
        const y = (i / 10) * h;
        ctx.fillStyle = i % 2 === 0
          ? `rgba(255,255,255,0.12)`
          : `rgba(0,0,0,0.08)`;
        ctx.fillRect(0, y, w, h / 10 + 1);
      }

      // 云层/风暴
      for (let i = 0; i < 15; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const cr = 15 + Math.random() * 50;
        const stormGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        stormGrad.addColorStop(0, this._stormColor + '88');
        stormGrad.addColorStop(1, this._stormColor + '00');
        ctx.fillStyle = stormGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cr, cr * (0.4 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

export default IceGiantSprite;
