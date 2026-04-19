/**
 * SpriteLOD - Level of Detail System
 *
 * 根据距离和平台自动切换精细度：
 *   - LOD 0: 高质量（近距离）
 *   - LOD 1: 中等质量
 *   - LOD 2: 低质量（远距离/移动端）
 *   - LOD 3: 最低质量
 */

import * as THREE from 'three';

export interface LODConfig {
  distanceNear?: number;
  distanceMid?: number;
  distanceFar?: number;
  quality?: 'high' | 'medium' | 'low';
}

export type LODLevel = 0 | 1 | 2 | 3;

const DISTANCE_MID = 30;
const DISTANCE_FAR = 60;

export class SpriteLOD {
  private _camera: THREE.Camera;
  private _currentLevel: LODLevel = 0;
  private _targetObject: THREE.Object3D | null = null;
  private _quality: 'high' | 'medium' | 'low';

  constructor(camera: THREE.Camera, config: LODConfig = {}) {
    this._camera = camera;
    this._quality = config.quality ?? 'high';
  }

  get currentLevel(): LODLevel {
    return this._currentLevel;
  }

  get quality(): string {
    return this._quality;
  }

  setQuality(quality: 'high' | 'medium' | 'low'): void {
    this._quality = quality;
  }

  setTarget(object: THREE.Object3D | null): void {
    this._targetObject = object;
  }

  update(): void {
    if (!this._targetObject) return;

    const distance = this._camera.position.distanceTo(this._targetObject.position);
    this._currentLevel = this.calculateLevel(distance);
  }

  calculateLevel(distance: number): LODLevel {
    if (this._quality === 'low') {
      return 3;
    }

    if (distance < DISTANCE_MID) {
      return 0;
    } else if (distance < DISTANCE_FAR) {
      return this._quality === 'medium' ? 2 : 1;
    } else {
      return 3;
    }
  }

  get detailMultiplier(): number {
    const multipliers: Record<LODLevel, number> = {
      0: 1.0,
      1: 0.6,
      2: 0.3,
      3: 0.1,
    };
    return multipliers[this._currentLevel];
  }

  get particleCount(): number {
    const counts: Record<LODLevel, number> = {
      0: 1.0,
      1: 0.7,
      2: 0.4,
      3: 0.2,
    };
    return counts[this._currentLevel];
  }

  get shouldAnimate(): boolean {
    return this._currentLevel < 3;
  }

  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  static createForPlatform(camera: THREE.Camera): SpriteLOD {
    const isMobile = SpriteLOD.isMobile();
    return new SpriteLOD(camera, {
      quality: isMobile ? 'low' : 'high',
    });
  }
}

export default SpriteLOD;