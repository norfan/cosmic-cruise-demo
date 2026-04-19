/**
 * MercurySprite - 水星精灵（Tier 2）
 *
 * 视觉效果：灰色岩石表面 + 密集陨石坑
 * 无大气层，最接近太阳
 */

import RockyPlanetSprite, { RockyPlanetSpriteConfig } from './RockyPlanetSprite';

export interface MercurySpriteConfig extends RockyPlanetSpriteConfig {}

export class MercurySprite extends RockyPlanetSprite {
  constructor(config: MercurySpriteConfig = {}) {
    super({
      tier: 2, name: 'MercurySprite',
      radius: 0.4,
      baseColor: '#9E9E9E',
      highlandColor: '#BDBDBD',
      showAtmosphere: false,
      rotationSpeed: 0.004, // 水星自转很慢
      ...config,
    });
  }
}

export default MercurySprite;
