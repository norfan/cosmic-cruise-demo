/**
 * effects/ 统一导出入口
 *
 * 三位一体的动效系统：
 * - unicorn/   → Unicorn Studio (WebGL 场景级特效)
 * - reactbits/ → React Bits (React UI 动效)
 * - designspells/ → Design Spells (微交互动效)
 * - canvas/    → Canvas 2D 覆盖层特效
 */

export { UnicornBackground, UNICORN_SCENES } from './unicorn';

export { CanvasOverlay, useEnergyEffect } from './canvas';
export type { CollectEffect } from './canvas';

export * from './designspells';
