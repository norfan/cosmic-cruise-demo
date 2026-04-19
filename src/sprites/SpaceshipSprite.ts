/**
 * SpaceshipSprite - 玩家飞船精灵
 *
 * 控制方式：
 *   - 键盘: WASD / 方向键
 *   - 鼠标: 飞船跟随鼠标位置
 *   - 触屏: 触控移动
 *
 * 特性：
 *   - 惯性移动系统
 *   - 收集范围检测
 *   - 碰撞护盾系统
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig, SpriteCategory, SpriteInteractionResult } from './Sprite';

export interface SpaceshipConfig extends SpriteConfig {
  speed?: number;
  acceleration?: number;
  maxVelocity?: number;
  friction?: number;
  collectionRadius?: number;
  shields?: number;
  maxShields?: number;
}

export class SpaceshipSprite extends Sprite {
  readonly category: SpriteCategory = 'artificial';

  private _speed: number;
  private _acceleration: number;
  private _maxVelocity: number;
  private _friction: number;
  private _collectionRadius: number;
  private _shields: number;
  private _maxShields: number;

  private _velocity: THREE.Vector3 = new THREE.Vector3();
  private _inputDirection: THREE.Vector3 = new THREE.Vector3();
  private _targetPosition: THREE.Vector3 | null = null;

  private _group!: THREE.Group;
  private _body!: THREE.Mesh;
  private _engineGlow!: THREE.PointLight;

  private _inputMode: 'keyboard' | 'mouse' | 'touch' = 'keyboard';

  constructor(config: SpaceshipConfig = {}) {
    super({ tier: 0, name: 'SpaceshipSprite', ...config });
    this._speed = config.speed ?? 5;
    this._acceleration = config.acceleration ?? 10;
    this._maxVelocity = config.maxVelocity ?? 15;
    this._friction = config.friction ?? 0.95;
    this._collectionRadius = config.collectionRadius ?? 2;
    this._shields = config.shields ?? 100;
    this._maxShields = config.maxShields ?? 100;
    void this._speed; // reserved for future use
  }

  get velocity(): THREE.Vector3 {
    return this._velocity.clone();
  }

  get collectionRadius(): number {
    return this._collectionRadius;
  }

  get shields(): number {
    return this._shields;
  }

  get maxShields(): number {
    return this._maxShields;
  }

  get inputMode(): 'keyboard' | 'mouse' | 'touch' {
    return this._inputMode;
  }

  setInputMode(mode: 'keyboard' | 'mouse' | 'touch'): void {
    this._inputMode = mode;
  }

  setInputDirection(x: number, y: number, z: number): void {
    this._inputDirection.set(x, y, z).normalize();
  }

  setTargetPosition(pos: THREE.Vector3 | null): void {
    this._targetPosition = pos;
  }

  mount(scene: THREE.Scene, config: SpriteConfig = {}): void {
    this._scene = scene;
    const pos = config.position ?? new THREE.Vector3(0, 1, 0);

    this._group = new THREE.Group();
    this._group.position.copy(pos);

    const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x112244,
      emissiveIntensity: 0.3,
    });
    this._body = new THREE.Mesh(bodyGeo, this.trackMaterial(bodyMat));
    this._body.castShadow = true;
    this._group.add(this._body);

    const wingGeo = new THREE.BoxGeometry(1.5, 0.05, 0.4);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x2266dd,
      metalness: 0.7,
      roughness: 0.3,
    });
    const wing = new THREE.Mesh(wingGeo, this.trackMaterial(wingMat));
    wing.position.z = 0.2;
    wing.castShadow = true;
    this._group.add(wing);

    this._engineGlow = new THREE.PointLight(0x00ffff, 0.5, 3);
    this._engineGlow.position.z = 0.5;
    this._group.add(this._engineGlow);

    this._object3D = this._group;
    scene.add(this._group);
  }

  update(deltaTime: number): void {
    if (!this._object3D) return;

    this._updateInput(deltaTime);
    this._updatePhysics(deltaTime);
    this._updateVisuals(deltaTime);
  }

  private _updateInput(deltaTime: number): void {
    if (this._inputMode === 'mouse' && this._targetPosition && this._object3D) {
      const direction = new THREE.Vector3()
        .subVectors(this._targetPosition, this._object3D.position)
        .normalize();
      const dist = this._object3D.position.distanceTo(this._targetPosition);
      if (dist > 0.5) {
        this._inputDirection.copy(direction);
      } else {
        this._inputDirection.set(0, 0, 0);
      }
    }
    void deltaTime; // reserved
  }

  private _updatePhysics(deltaTime: number): void {
    if (!this._object3D) return;

    this._velocity.add(
      this._inputDirection.clone().multiplyScalar(this._acceleration * deltaTime)
    );

    const speed = this._velocity.length();
    if (speed > this._maxVelocity) {
      this._velocity.multiplyScalar(this._maxVelocity / speed);
    }

    if (this._inputDirection.length() < 0.1) {
      this._velocity.multiplyScalar(this._friction);
    }

    this._object3D.position.add(this._velocity.clone().multiplyScalar(deltaTime));

    const bounds = 50;
    this._object3D.position.x = THREE.MathUtils.clamp(this._object3D.position.x, -bounds, bounds);
    this._object3D.position.y = THREE.MathUtils.clamp(this._object3D.position.y, -bounds, bounds);
    this._object3D.position.z = THREE.MathUtils.clamp(this._object3D.position.z, -bounds, bounds);

    if (this._velocity.length() > 0.1) {
      const targetRotation = Math.atan2(this._velocity.x, this._velocity.z);
      this._object3D.rotation.y = THREE.MathUtils.lerp(
        this._object3D.rotation.y,
        targetRotation,
        deltaTime * 5
      );
    }
  }

  private _updateVisuals(deltaTime: number): void {
    if (!this._object3D) return;

    const speed = this._velocity.length() / this._maxVelocity;
    this._engineGlow.intensity = 0.3 + speed * 1.5;

    const tilt = this._velocity.x * 0.1;
    this._object3D.rotation.z = THREE.MathUtils.lerp(
      this._object3D.rotation.z,
      -tilt,
      deltaTime * 5
    );
  }

  checkCollection(spritePos: THREE.Vector3, spriteRadius: number): boolean {
    const pos = this.getPosition();
    const dist = pos.distanceTo(spritePos);
    return dist < this._collectionRadius + spriteRadius;
  }

  takeDamage(amount: number): void {
    this._shields = Math.max(0, this._shields - amount);
    this.emit('spaceshipDamaged', { shields: this._shields, maxShields: this._maxShields });

    if (this._shields <= 0) {
      this.emit('spaceshipDestroyed', {});
    }
  }

  rechargeShields(amount: number): void {
    this._shields = Math.min(this._maxShields, this._shields + amount);
    this.emit('shieldsRecharged', { shields: this._shields });
  }

  onInteract(): SpriteInteractionResult {
    return { message: '玩家飞船' };
  }

  dispose(): void {
    this._group.clear();
    super.dispose();
  }
}

export default SpaceshipSprite;