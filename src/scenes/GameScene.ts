/**
 * GameScene - 游戏场景基类
 *
 * 与 Sprite 的区别：
 *   Sprite  → 宇宙对象（天体、行星、恒星等），挂载到现有场景中
 *   GameScene → 独立游戏场景，拥有自己的场景内容（如地图、关卡、玩家）
 *
 * 生命周期：
 *   mount(scene, camera, canvas) → update(dt) → dispose()
 */

import * as THREE from 'three';

export interface GameScene {
  /** 挂载到 Three.js 渲染上下文 */
  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void;

  /** 每帧更新 */
  update(deltaTime: number): void;

  /** 释放所有资源 */
  dispose(): void;
}

export default GameScene;
