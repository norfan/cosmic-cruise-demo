/**
 * UranusSprite - 天王星精灵（Tier 2）
 *
 * 视觉效果：淡蓝绿色 + 极轴倾斜约 98°
 * 几乎没有风暴特征
 */

import IceGiantSprite, { IceGiantSpriteConfig } from './IceGiantSprite';

export interface UranusSpriteConfig extends IceGiantSpriteConfig {}

export class UranusSprite extends IceGiantSprite {
  constructor(config: UranusSpriteConfig = {}) {
    super({
      tier: 2, name: 'UranusSprite',
      radius: 1.4,
      baseColor: '#7DD8E8',
      stormColor: '#A0E8F0',
      rotationSpeed: -0.06, // 天王星逆自转
      axialTilt: Math.PI * 0.82, // 98°轴倾角
      ...config,
    });
  }
}

export default UranusSprite;
