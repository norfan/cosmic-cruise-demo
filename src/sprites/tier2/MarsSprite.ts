/**
 * MarsSprite - 火星精灵（Tier 2）
 *
 * 视觉效果：铁锈红色表面 + 极地冰盖 + Fresnel 大气
 */

import * as THREE from 'three';
import RockyPlanetSprite, { RockyPlanetSpriteConfig } from './RockyPlanetSprite';

export interface MarsSpriteConfig extends RockyPlanetSpriteConfig {}

export class MarsSprite extends RockyPlanetSprite {
  constructor(config: MarsSpriteConfig = {}) {
    super({
      tier: 2, name: 'MarsSprite',
      radius: 0.53,
      baseColor: '#C1440E',
      highlandColor: '#8B3A0E',
      showAtmosphere: true,
      rotationSpeed: 0.053, // 火星自转接近地球
      ...config,
    });
  }

  protected createPlanetTexture(size: number, colors: { base: string; highland: string }): THREE.CanvasTexture {
    return this.createCanvasTexture(size, (ctx, w, h) => {
      ctx.fillStyle = colors.base;
      ctx.fillRect(0, 0, w, h);

      // 沙漠/峡谷纹理
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const rw = 30 + Math.random() * 100;
        const rh = 5 + Math.random() * 20;
        ctx.fillStyle = `rgba(80,30,10,${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // 极地冰盖
      ctx.fillStyle = '#E8E0D0';
      ctx.beginPath();
      ctx.ellipse(w / 2, 0, w * 0.2, h * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w / 2, h, w * 0.15, h * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();

      // 大峡谷特征
      ctx.fillStyle = 'rgba(100,40,10,0.5)';
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.3);
      ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.2, h * 0.7);
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(100,40,10,0.4)';
      ctx.stroke();
    });
  }
}

export default MarsSprite;
