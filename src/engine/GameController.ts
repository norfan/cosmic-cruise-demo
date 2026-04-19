/**
 * GameController - Game Controller
 *
 * Coordinates:
 *   - Player input
 *   - Spaceship control
 *   - Collection detection
 *   - Sprite interaction
 *   - State management
 */

import * as THREE from 'three';
import { useGameStore } from '../stores/GameStore';
import { SpaceshipSprite, SpaceshipConfig } from '../sprites/SpaceshipSprite';
import { Sprite } from '../sprites/Sprite';
import { CollectibleSprite } from '../sprites/CollectibleSprite';

export interface GameControllerConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
}

export type InputMode = 'keyboard' | 'mouse' | 'touch';

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export class GameController {
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _canvas: HTMLCanvasElement;
  private _spaceship: SpaceshipSprite | null = null;
  private _collectibles: CollectibleSprite[] = [];
  private _allSprites: Sprite[] = [];
  private _inputMode: InputMode = 'keyboard';
  private _keyState: KeyState = { forward: false, backward: false, left: false, right: false };
  private _mousePosition: THREE.Vector3 | null = null;
  private _touchPosition: THREE.Vector3 | null = null;
  private _enabled: boolean = false;
  private _raycaster: THREE.Raycaster = new THREE.Raycaster();
  private _mouse: THREE.Vector2 = new THREE.Vector2();

  constructor(config: GameControllerConfig) {
    this._scene = config.scene;
    this._camera = config.camera;
    this._canvas = config.canvas;
  }

  get spaceship(): SpaceshipSprite | null {
    return this._spaceship;
  }

  get inputMode(): InputMode {
    return this._inputMode;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (enabled) {
      this.setupInputListeners();
    } else {
      this.removeInputListeners();
    }
  }

  setInputMode(mode: InputMode): void {
    this._inputMode = mode;
    this._spaceship?.setInputMode(mode);
    useGameStore.getState().setControlMode(mode);
  }

  createSpaceship(config?: SpaceshipConfig): SpaceshipSprite {
    const store = useGameStore.getState();
    const stats = {
      speed: 5 + (store.spaceship.speedLevel - 1) * 1,
      maxVelocity: 15 + (store.spaceship.speedLevel - 1) * 3,
      acceleration: 10 + (store.spaceship.speedLevel - 1) * 2,
      shields: 100 + (store.spaceship.shieldLevel - 1) * 25,
      maxShields: 100 + (store.spaceship.shieldLevel - 1) * 25,
      collectionRadius: 2 + (store.spaceship.collectionLevel - 1) * 0.5,
    };

    this._spaceship = new SpaceshipSprite({
      speed: stats.speed,
      maxVelocity: stats.maxVelocity,
      acceleration: stats.acceleration,
      shields: stats.shields,
      maxShields: stats.maxShields,
      collectionRadius: stats.collectionRadius,
      position: new THREE.Vector3(0, 1, 0),
      ...config,
    });

    this._spaceship.mount(this._scene);
    this._allSprites.push(this._spaceship);
    this.setInputMode(store.settings.controlMode);

    return this._spaceship;
  }

  registerCollectible(sprite: CollectibleSprite): void {
    this._collectibles.push(sprite);
    this._allSprites.push(sprite);
  }

  unregisterCollectible(sprite: CollectibleSprite): void {
    const idx = this._collectibles.indexOf(sprite);
    if (idx >= 0) this._collectibles.splice(idx, 1);
    const idx2 = this._allSprites.indexOf(sprite);
    if (idx2 >= 0) this._allSprites.splice(idx2, 1);
  }

  update(deltaTime: number): void {
    if (!this._enabled || !this._spaceship) return;

    this.updateInput();
    this.checkCollections();
    this.updateSpaceship(deltaTime);
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this._canvas.addEventListener('mousemove', this.onMouseMove);
    this._canvas.addEventListener('click', this.onClick);
    this._canvas.addEventListener('touchstart', this.onTouchStart);
    this._canvas.addEventListener('touchmove', this.onTouchMove);
    this._canvas.addEventListener('touchend', this.onTouchEnd);
  }

  private removeInputListeners(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this._canvas.removeEventListener('mousemove', this.onMouseMove);
    this._canvas.removeEventListener('click', this.onClick);
    this._canvas.removeEventListener('touchstart', this.onTouchStart);
    this._canvas.removeEventListener('touchmove', this.onTouchMove);
    this._canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this._enabled) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._keyState.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this._keyState.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this._keyState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this._keyState.right = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._keyState.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this._keyState.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this._keyState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this._keyState.right = false;
        break;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this._inputMode !== 'mouse' || !this._enabled) return;
    this.updateMousePosition(e.clientX, e.clientY);
  };

  private onClick = (): void => {
    if (!this._enabled) return;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (!this._enabled || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.updateMousePosition(touch.clientX, touch.clientY);
    this._touchPosition = this._mousePosition?.clone() ?? null;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this._enabled || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.updateMousePosition(touch.clientX, touch.clientY);
    this._touchPosition = this._mousePosition?.clone() ?? null;
  };

  private onTouchEnd = (): void => {
    this._touchPosition = null;
  };

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this._canvas.getBoundingClientRect();
    this._mouse.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    this._raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      if (!this._mousePosition) {
        this._mousePosition = intersection;
      } else {
        this._mousePosition.copy(intersection);
      }
    }
  }

  private updateInput(): void {
    if (!this._spaceship) return;

    if (this._inputMode === 'keyboard') {
      let x = 0, z = 0;
      if (this._keyState.forward) z -= 1;
      if (this._keyState.backward) z += 1;
      if (this._keyState.left) x -= 1;
      if (this._keyState.right) x += 1;
      this._spaceship.setInputDirection(x, 0, z);
    } else if (this._inputMode === 'mouse') {
      this._spaceship.setTargetPosition(this._mousePosition);
    } else if (this._inputMode === 'touch') {
      this._spaceship.setTargetPosition(this._touchPosition);
    }
  }

  private checkCollections(): void {
    if (!this._spaceship) return;

    for (const collectible of this._collectibles) {
      if (collectible.isCollected()) continue;

      const dist = this._spaceship.getPosition().distanceTo(collectible.getPosition());
      if (collectible.canCollect(dist)) {
        collectible.collect();
      }
    }

    for (const collectible of this._collectibles) {
      if (collectible.isCollected()) continue;
      const dist = this._spaceship.getPosition().distanceTo(collectible.getPosition());
      collectible.highlight(dist < collectible._collectRadius * 2);
    }
  }

  private updateSpaceship(deltaTime: number): void {
    this._spaceship?.update(deltaTime);
    this._allSprites.forEach(s => s.update(deltaTime));
  }

  dispose(): void {
    this.setEnabled(false);
    this._allSprites.forEach(s => s.dispose());
    this._allSprites = [];
    this._collectibles = [];
    this._spaceship = null;
  }
}

export default GameController;