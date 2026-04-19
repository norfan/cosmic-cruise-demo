/**
 * Camera - 相机控制封装
 */

import * as THREE from 'three';

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position?: { x: number; y: number; z: number };
  lookAt?: { x: number; y: number; z: number };
}

const DEFAULT_CONFIG: Required<CameraConfig> = {
  fov: 60,
  near: 0.1,
  far: 1000,
  position: { x: 0, y: 5, z: 10 },
  lookAt: { x: 0, y: 0, z: 0 },
};

class Camera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private smoothTarget: THREE.Vector3;
  private lerpFactor = 0.1;
  private bounds: { minX?: number; maxX?: number; minY?: number; maxY?: number; minZ?: number; maxZ?: number } = {};
  // @ts-ignore - written by setPitchBounds, read by caller
  private _pitchBounds: { min: number; max: number } = { min: 0.1, max: Math.PI / 2 - 0.1 };
  private distance: number = 10;
  private minDistance = 5;
  private maxDistance = 50;

  constructor(config: CameraConfig = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    this.camera = new THREE.PerspectiveCamera(
      cfg.fov,
      window.innerWidth / window.innerHeight,
      cfg.near,
      cfg.far
    );

    this.target = new THREE.Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
    this.smoothTarget = this.target.clone();

    this.camera.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    this.camera.lookAt(this.target);

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * 平滑跟随目标
   */
  followTarget(target: { x: number; y: number; z: number }, smooth = true): void {
    if (smooth) {
      this.smoothTarget.set(target.x, target.y, target.z);
      this.target.lerp(this.smoothTarget, this.lerpFactor);
    } else {
      this.target.set(target.x, target.y, target.z);
    }
    this.camera.lookAt(this.target);
  }

  /**
   * 设置插值因子
   */
  setLerpFactor(factor: number): void {
    this.lerpFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * 设置相机距离
   */
  setDistance(distance: number): void {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }

  getDistance(): number {
    return this.distance;
  }

  /**
   * 设置距离限制
   */
  setDistanceLimits(min: number, max: number): void {
    this.minDistance = min;
    this.maxDistance = max;
  }

  /**
   * 设置相机边界限制
   */
  setBounds(bounds: { minX?: number; maxX?: number; minY?: number; maxY?: number; minZ?: number; maxZ?: number }): void {
    this.bounds = bounds;
  }

  /**
   * 设置俯仰角限制
   */
  setPitchBounds(min: number, max: number): void {
    this._pitchBounds = { min, max };
  }

  /**
   * 应用边界限制
   */
  applyBounds(): void {
    if (this.bounds.minX !== undefined && this.target.x < this.bounds.minX) {
      this.target.x = this.bounds.minX;
    }
    if (this.bounds.maxX !== undefined && this.target.x > this.bounds.maxX) {
      this.target.x = this.bounds.maxX;
    }
    if (this.bounds.minY !== undefined && this.target.y < this.bounds.minY) {
      this.target.y = this.bounds.minY;
    }
    if (this.bounds.maxY !== undefined && this.target.y > this.bounds.maxY) {
      this.target.y = this.bounds.maxY;
    }
    if (this.bounds.minZ !== undefined && this.target.z < this.bounds.minZ) {
      this.target.z = this.bounds.minZ;
    }
    if (this.bounds.maxZ !== undefined && this.target.z > this.bounds.maxZ) {
      this.target.z = this.bounds.maxZ;
    }
  }

  /**
   * 获取相机视线的世界坐标点
   */
  screenToWorld(screenX: number, screenY: number, depth = 0): THREE.Vector3 {
    const vec = new THREE.Vector3(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1,
      0.5
    );
    vec.unproject(this.camera);
    vec.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / vec.z + depth;
    return this.camera.position.clone().add(vec.multiplyScalar(distance));
  }

  /**
   * 获取射线
   */
  getRay(screenX: number, screenY: number): THREE.Raycaster {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, this.camera);
    return raycaster;
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
  }
}

export default Camera;
