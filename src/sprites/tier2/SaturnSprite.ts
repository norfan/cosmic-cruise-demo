/**
 * SaturnSprite - 土星精灵（Tier 2）
 *
 * 视觉效果：
 *   - 气体条纹（米黄/淡金色调）
 *   - 壮观的行星环（多层半透明环）
 *   - 自转
 */

import * as THREE from 'three';
import GasGiantSprite, { GasGiantSpriteConfig } from './GasGiantSprite';

export interface SaturnSpriteConfig extends GasGiantSpriteConfig {}

export class SaturnSprite extends GasGiantSprite {
  constructor(config: SaturnSpriteConfig = {}) {
    super({
      tier: 2, name: 'SaturnSprite',
      radius: 2.4,
      bandColors: ['#E8D5A0', '#F5EED8', '#C8A060', '#EDD890', '#D4B878'],
      showRings: true,
      ringColor: '#D4B870',
      ringOpacity: 0.65,
      rotationSpeed: 0.11,
      ...config,
    });
  }

  mount(scene: THREE.Scene, config: SaturnSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 条纹球体
    const tex = this.createBandTexture(512);
    const mat = this.trackMaterial(
      new THREE.MeshPhongMaterial({ map: tex, shininess: 5 })
    );
    const mesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r, 64, 64)), mat);
    group.add(mesh);

    // 土星环（多层）
    this._createRings(group, r);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  private _createRings(parent: THREE.Group, planetR: number): void {
    // 内环（A环）- 最密
    const ringA_geo = this.trackGeometry(new THREE.RingGeometry(planetR * 1.35, planetR * 1.65, 128));
    const ringA_mat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xD4C090,
        transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    const ringA = new THREE.Mesh(ringA_geo, ringA_mat);
    ringA.rotation.x = Math.PI / 2;
    ringA.rotation.z = 0.05;
    parent.add(ringA);

    // 中环（B环）- 明亮
    const ringB_geo = this.trackGeometry(new THREE.RingGeometry(planetR * 1.65, planetR * 2.1, 128));
    const ringB_mat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xE8D8A0,
        transparent: true, opacity: 0.6,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    const ringB = new THREE.Mesh(ringB_geo, ringB_mat);
    ringB.rotation.x = Math.PI / 2;
    ringB.rotation.z = 0.03;
    parent.add(ringB);

    // 外环（C环）- 微弱
    const ringC_geo = this.trackGeometry(new THREE.RingGeometry(planetR * 2.1, planetR * 2.4, 128));
    const ringC_mat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xC8B880,
        transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    const ringC = new THREE.Mesh(ringC_geo, ringC_mat);
    ringC.rotation.x = Math.PI / 2;
    ringC.rotation.z = 0.02;
    parent.add(ringC);

    // 主环引用已保存至父类 _ringsMesh
  }

  protected createBandTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      const colors = ['#EAD8A0', '#F5F0D8', '#C8A050', '#EDD890', '#D4B070'];

      for (let i = 0; i < 12; i++) {
        const yTop = (i / 12) * h;
        const yBottom = ((i + 1) / 12) * h;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(0, yTop, w, yBottom - yTop + 2);

        for (let x = 0; x < w; x += 4) {
          const ny = yTop + Math.random() * 5 - 2.5;
          if (ny > yTop && ny < yBottom) {
            ctx.fillRect(x, ny, 4, 2);
          }
        }
      }
    });
  }
}

export default SaturnSprite;
