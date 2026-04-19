import { GameScene } from './GameScene';
import { StrategicMapScene } from './StrategicMapScene';

// 场景注册表 - 统一导出
export const SCENE_REGISTRY: Record<string, {
  label: string;
  create: () => GameScene;
}> = {
  strategicMap: {
    label: '🗺️ 战略大地图 - 自由移动',
    create: () => new StrategicMapScene(),
  },
};

export type { GameScene };
export { StrategicMapScene };