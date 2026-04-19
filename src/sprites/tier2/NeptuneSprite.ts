/**
 * NeptuneSprite - 海王星精灵（Tier 2）
 *
 * 视觉效果：深蓝色 + 显著风暴（大暗斑）+ 甲烷红边
 */

import IceGiantSprite, { IceGiantSpriteConfig } from './IceGiantSprite';

export interface NeptuneSpriteConfig extends IceGiantSpriteConfig {}

export class NeptuneSprite extends IceGiantSprite {
  constructor(config: NeptuneSpriteConfig = {}) {
    super({
      tier: 2, name: 'NeptuneSprite',
      radius: 1.35,
      baseColor: '#2255AA',
      stormColor: '#4488CC',
      rotationSpeed: 0.08,
      axialTilt: Math.PI * 0.15, // 28°轴倾角
      ...config,
    });
  }
}

export default NeptuneSprite;
