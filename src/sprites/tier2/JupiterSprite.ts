/**
 * JupiterSprite - 木星精灵（Tier 2）
 *
 * 视觉效果：
 *   - 条纹纹理（橙/米白/棕色交替）
 *   - 大红斑风暴
 *   - 轻微极光效果
 */

import * as THREE from 'three';
import GasGiantSprite, { GasGiantSpriteConfig } from './GasGiantSprite';

export interface JupiterSpriteConfig extends GasGiantSpriteConfig {}

export class JupiterSprite extends GasGiantSprite {
  private _greatRedSpotMesh?: THREE.Mesh;

  constructor(config: JupiterSpriteConfig = {}) {
    super({
      tier: 2, name: 'JupiterSprite',
      radius: 2.8,
      bandColors: ['#C88B3A', '#E8D5A0', '#A06030', '#F0E0B0', '#B07040', '#D0A060'],
      rotationSpeed: 0.13, // 木星自转很快
      ...config,
    });
  }

  mount(scene: THREE.Scene, config: GasGiantSpriteConfig = {}): void {
    this._scene = scene;

    const r = config.radius ?? this._radius;
    const group = new THREE.Group();
    group.position.copy(config.position ?? new THREE.Vector3(0, 0, 0));

    // 条纹纹理
    const tex = this.createBandTexture(512);
    const mat = this.trackMaterial(
      new THREE.MeshPhongMaterial({ map: tex, shininess: 5 })
    );
    const mesh = new THREE.Mesh(this.trackGeometry(new THREE.SphereGeometry(r, 64, 64)), mat);
    group.add(mesh);

    // 大红斑（Billboard 球体）
    const spotGeo = this.trackGeometry(new THREE.SphereGeometry(r * 0.35, 16, 16));
    const spotMat = this.trackMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xCC4422,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this._greatRedSpotMesh = new THREE.Mesh(spotGeo, spotMat);
    this._greatRedSpotMesh.position.set(r * 0.6, r * 0.15, r * 0.3);
    group.add(this._greatRedSpotMesh);

    if (config.scale) group.scale.setScalar(config.scale);
    this._object3D = group;
    scene.add(group);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (!this._object3D) return;
    // 大红斑相对行星表面一起旋转
  }

  protected createBandTexture(size: number): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      const colors = ['#D4956A', '#F5E6C8', '#A86830', '#E8D0A0', '#C07A40', '#DDB888'];

      for (let i = 0; i < 14; i++) {
        const yTop = (i / 14) * h;
        const yBottom = ((i + 1) / 14) * h;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(0, yTop, w, yBottom - yTop + 2);

        // 条纹扰动
        for (let x = 0; x < w; x += 4) {
          const ny = yTop + Math.random() * 6 - 3;
          if (ny > yTop && ny < yBottom) {
            ctx.fillRect(x, ny, 4, 3);
          }
        }
      }

      // 大红斑
      const spotX = w * 0.55, spotY = h * 0.57, spotR = w * 0.08;
      const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
      spotGrad.addColorStop(0, '#CC3322');
      spotGrad.addColorStop(0.5, '#BB2211');
      spotGrad.addColorStop(1, 'rgba(180,40,20,0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, spotR, spotR * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

export default JupiterSprite;
