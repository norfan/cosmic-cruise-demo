/**
 * sprites/index.ts - 精灵系统统一导出
 */

// 基类
export { Sprite } from './Sprite';
export type { SpriteConfig, SpriteMaterial, SpriteCategory, SpriteInteractionResult } from './Sprite';

export { EnvironmentSprite } from './EnvironmentSprite';
export type { EnvironmentSpriteConfig } from './EnvironmentSprite';

export { CelestialSprite } from './CelestialSprite';
export type { CelestialSpriteConfig, OrbitConfig } from './CelestialSprite';

export { ArtificialSprite } from './ArtificialSprite';
export type { ArtificialSpriteConfig, ArtificialStatus } from './ArtificialSprite';

// Tier 0 精灵
export { OceanSprite } from './tier0/OceanSprite';
export type { OceanSpriteConfig } from './tier0/OceanSprite';

export { SandSprite } from './tier0/SandSprite';
export type { SandSpriteConfig } from './tier0/SandSprite';

export { TreeSprite } from './tier0/TreeSprite';
export type { TreeSpriteConfig, TreeVariant } from './tier0/TreeSprite';

export { MountainSprite } from './tier0/MountainSprite';
export type { MountainSpriteConfig } from './tier0/MountainSprite';

export { EnergyOrbSprite } from './tier0/EnergyOrbSprite';
export type { EnergyOrbSpriteConfig } from './tier0/EnergyOrbSprite';

// Tier 1 精灵
export { EarthSprite } from './tier1/EarthSprite';
export type { EarthSpriteConfig } from './tier1/EarthSprite';

export { MoonSprite } from './tier1/MoonSprite';
export type { MoonSpriteConfig } from './tier1/MoonSprite';
