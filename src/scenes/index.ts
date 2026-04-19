import { GameScene } from './GameScene';
import { SpaceScene } from './SpaceScene';
import { Scene0Map } from './Scene0Map';
import { StrategicMapScene } from './StrategicMapScene';
import { TowerDefenseScene } from './TowerDefenseScene';
import { Tier0Scene } from './Tier0Scene';
import { Tier1Scene } from './Tier1Scene';
import { Tier2Scene } from './Tier2Scene';
import { Tier3Scene } from './Tier3Scene';
import { Tier4Scene } from './Tier4Scene';
import { Tier5Scene } from './Tier5Scene';
import { Tier6Scene } from './Tier6Scene';
import { Tier7Scene } from './Tier7Scene';

// 场景注册表 - 统一导出
export const SCENE_REGISTRY: Record<string, {
  label: string;
  create: () => GameScene;
}> = {
  strategicMap: {
    label: '🗺️ 战略大地图 - 自由移动',
    create: () => new StrategicMapScene(),
  },
  towerDefense: {
    label: '⚔️ 塔防战斗',
    create: () => new TowerDefenseScene(),
  },
  scene0Map: {
    label: '🗺️ 场景 0 · 原始文明沙盘',
    create: () => new Scene0Map(),
  },
  tier0: { label: '🌍 Tier 0', create: () => new Tier0Scene() },
  tier1: { label: '🪐 Tier 1', create: () => new Tier1Scene() },
  tier2: { label: '☀️ Tier 2', create: () => new Tier2Scene() },
  tier3: { label: '🌌 Tier 3', create: () => new Tier3Scene() },
  tier4: { label: '🔭 Tier 4', create: () => new Tier4Scene() },
  tier5: { label: '🌀 Tier 5', create: () => new Tier5Scene() },
  tier6: { label: '✨ Tier 6', create: () => new Tier6Scene() },
  tier7: { label: '♾️ Tier 7', create: () => new Tier7Scene() },
};

export type { GameScene };
export { SpaceScene, Scene0Map, StrategicMapScene, TowerDefenseScene, Tier0Scene, Tier1Scene, Tier2Scene, Tier3Scene, Tier4Scene, Tier5Scene, Tier6Scene, Tier7Scene };