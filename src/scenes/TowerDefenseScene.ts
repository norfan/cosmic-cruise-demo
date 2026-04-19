/**
 * TowerDefenseScene - 塔防战斗场景
 *
 * 基于 docs/sense0_design.md 设计：
 * - 防御塔：StoneTower、SpikeTrap、CrossbowTower
 * - 敌人AI路径
 * - 胜负判定
 */

import * as THREE from 'three';
import type { GameScene } from './GameScene';

export interface Tower {
  id: string;
  type: 'stone' | 'spike' | 'crossbow';
  position: THREE.Vector3;
  level: number;
  damage: number;
  range: number;
  cooldown: number;
  lastFire: number;
  mesh?: THREE.Mesh;
}

export interface Enemy {
  id: string;
  type: string;
  hp: number;
  maxHp: number;
  speed: number;
  position: THREE.Vector3;
  pathProgress: number;
  alive: boolean;
  mesh?: THREE.Mesh;
}

export interface Wave {
  waveNumber: number;
  enemyCount: number;
  enemyTypes: string[];
  spawnInterval: number;
  spawned: number;
}

const TOWER_CONFIG = {
  stone: { cost: 50, damage: 10, range: 3, cooldown: 1000 },
  spike: { cost: 30, damage: 5, range: 1.5, cooldown: 500 },
  crossbow: { cost: 80, damage: 15, range: 5, cooldown: 800 },
};

const ENEMY_CONFIG = {
  basic: { hp: 30, speed: 2, reward: 10 },
  fast: { hp: 20, speed: 4, reward: 15 },
  tank: { hp: 80, speed: 1, reward: 25 },
};

const BATTLE_MAP_CONFIG = {
  pathPoints: [
    new THREE.Vector3(-12, 0, -8),
    new THREE.Vector3(-6, 0, -8),
    new THREE.Vector3(-6, 0, 0),
    new THREE.Vector3(6, 0, 0),
    new THREE.Vector3(6, 0, 8),
    new THREE.Vector3(0, 0, 8),
    new THREE.Vector3(0, 0, 12),
  ],
  towerSlots: [
    new THREE.Vector3(-8, 0, -6),
    new THREE.Vector3(-4, 0, -6),
    new THREE.Vector3(-8, 0, 2),
    new THREE.Vector3(-4, 0, 2),
    new THREE.Vector3(8, 0, 2),
    new THREE.Vector3(4, 0, 2),
    new THREE.Vector3(8, 0, 10),
    new THREE.Vector3(4, 0, 10),
  ],
  basePosition: new THREE.Vector3(0, 0, 14),
};

export class TowerDefenseScene implements GameScene {
  private _scene!: THREE.Scene;
  private _camera!: THREE.Camera;
  private _canvas!: HTMLCanvasElement;

  private _towers: Tower[] = [];
  private _enemies: Enemy[] = [];
  private _projectiles: THREE.Mesh[] = [];

  private _currentWave: Wave | null = null;
  private _waveNumber = 0;
  private _waveTimer = 0;
  private _spawnTimer = 0;

  private _baseHp = 100;
  private _maxBaseHp = 100;
  private _resources = { stone: 100, wood: 80, food: 60 };
  private _score = 0;

  private _gameState: 'playing' | 'victory' | 'defeat' = 'playing';
  private _gameTime = 0;

  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();

  private _onBattleEnd?: (result: 'victory' | 'defeat', score: number) => void;

  setOnBattleEnd(callback: (result: 'victory' | 'defeat', score: number) => void): void {
    this._onBattleEnd = callback;
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this._scene = scene;
    this._camera = camera;
    this._canvas = canvas;

    this._buildTerrain();
    this._buildPath();
    this._buildBase();
    this._buildTowerSlots();
    this._setupLighting();
    this._setupInput();

    this._startNextWave();

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(0, 20, 16);
      camera.lookAt(0, 0, 0);
    }
  }

  private _buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(24, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a3a2a, roughness: 0.9, metalness: 0.1,
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this._scene.add(terrain);
  }

  private _buildPath(): void {
    const points = BATTLE_MAP_CONFIG.pathPoints;
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(50);

    const pathGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const pathMat = new THREE.LineBasicMaterial({ color: 0x4a3a2a, linewidth: 3 });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    this._scene.add(pathLine);

    points.forEach((p, i) => {
      if (i < points.length - 1) {
        const mid = new THREE.Vector3().lerpVectors(p, points[i + 1], 0.5);
        const markerGeo = new THREE.CircleGeometry(0.3, 8);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0x6a5a4a });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(mid.x, 0.02, mid.z);
        this._scene.add(marker);
      }
    });
  }

  private _buildBase(): void {
    const pos = BATTLE_MAP_CONFIG.basePosition;

    const baseGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a8a, roughness: 0.5, metalness: 0.3, emissive: 0x1a2a4a, emissiveIntensity: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(pos.x, 0.25, pos.z);
    this._scene.add(base);

    const flagGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(pos.x, 1.5, pos.z);
    this._scene.add(flag);
  }

  private _buildTowerSlots(): void {
    BATTLE_MAP_CONFIG.towerSlots.forEach((pos, i) => {
      const slotGeo = new THREE.CircleGeometry(0.8, 6);
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x2a4a2a, roughness: 0.8, metalness: 0.1,
      });
      const slot = new THREE.Mesh(slotGeo, slotMat);
      slot.rotation.x = -Math.PI / 2;
      slot.position.set(pos.x, 0.02, pos.z);
      slot.userData.slotIndex = i;
      slot.userData.canBuild = true;
      this._scene.add(slot);
    });
  }

  private _setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.8);
    this._scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 15, 5);
    directional.castShadow = true;
    this._scene.add(directional);
  }

  private _setupInput(): void {
    this._canvas.addEventListener('click', this._onCanvasClick);
  }

  private _onCanvasClick = (e: MouseEvent): void => {
    if (this._gameState !== 'playing') return;

    const rect = this._canvas.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera as THREE.Camera);

    const slots = this._scene.children.filter(
      c => (c as THREE.Mesh).userData?.canBuild
    );
    const intersects = this._raycaster.intersectObjects(slots);

    if (intersects.length > 0) {
      const slot = intersects[0].object;
      this._buildTower('stone', slot.position.clone());
    }
  };

  private _buildTower(type: 'stone' | 'spike' | 'crossbow', pos: THREE.Vector3): void {
    const config = TOWER_CONFIG[type];
    if (this._resources.stone < config.cost) return;

    this._resources.stone -= config.cost;

    let geo: THREE.BufferGeometry;
    const mat = new THREE.MeshStandardMaterial({
      color: type === 'stone' ? 0x666666 : type === 'spike' ? 0x884422 : 0x442222,
      roughness: 0.7, metalness: 0.2,
    });

    if (type === 'stone') {
      geo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 6);
    } else if (type === 'spike') {
      geo = new THREE.ConeGeometry(0.4, 0.8, 4);
    } else {
      geo = new THREE.BoxGeometry(0.6, 1.0, 0.6);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.6, pos.z);
    mesh.castShadow = true;
    this._scene.add(mesh);

    const tower: Tower = {
      id: `tower_${Date.now()}`,
      type,
      position: pos.clone(),
      level: 1,
      damage: config.damage,
      range: config.range,
      cooldown: config.cooldown,
      lastFire: 0,
      mesh,
    };

    this._towers.push(tower);

    const slot = this._scene.children.find(
      c => (c as THREE.Mesh).position?.distanceTo(pos) < 0.1
    );
    if (slot) (slot as THREE.Mesh).userData.canBuild = false;
  }

  private _startNextWave(): void {
    this._waveNumber++;
    this._currentWave = {
      waveNumber: this._waveNumber,
      enemyCount: 5 + this._waveNumber * 2,
      enemyTypes: this._waveNumber < 3 ? ['basic'] : this._waveNumber < 6 ? ['basic', 'fast'] : ['basic', 'fast', 'tank'],
      spawnInterval: Math.max(500, 1500 - this._waveNumber * 100),
      spawned: 0,
    };
  }

  private _spawnEnemy(): void {
    if (!this._currentWave || this._currentWave.spawned >= this._currentWave.enemyCount) return;

    const type = this._currentWave.enemyTypes[
      Math.floor(Math.random() * this._currentWave.enemyTypes.length)
    ];
    const config = ENEMY_CONFIG[type as keyof typeof ENEMY_CONFIG];

    const geo = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: type === 'tank' ? 0x8b0000 : type === 'fast' ? 0xff8800 : 0x4a4a4a,
      roughness: 0.6, metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(BATTLE_MAP_CONFIG.pathPoints[0]);
    this._scene.add(mesh);

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      position: BATTLE_MAP_CONFIG.pathPoints[0].clone(),
      pathProgress: 0,
      alive: true,
      mesh,
    };

    this._enemies.push(enemy);
    this._currentWave.spawned++;
  }

  update(_dt: number): void {
    if (this._gameState !== 'playing') return;

    this._gameTime += _dt * 1000;
    this._spawnTimer += _dt * 1000;

    if (this._currentWave && this._spawnTimer >= this._currentWave.spawnInterval) {
      if (this._currentWave.spawned < this._currentWave.enemyCount) {
        this._spawnEnemy();
        this._spawnTimer = 0;
      } else if (this._enemies.length === 0) {
        if (this._waveNumber >= 10) {
          this._endGame('victory');
        } else {
          this._startNextWave();
        }
      }
    }

    this._updateEnemies(_dt);
    this._updateTowers(_dt);
    this._updateProjectiles(_dt);
    this._checkCollisions();
  }

  private _updateEnemies(_dt: number): void {
    const pathPoints = BATTLE_MAP_CONFIG.pathPoints;
    const curve = new THREE.CatmullRomCurve3(pathPoints);

    this._enemies.forEach(enemy => {
      if (!enemy.alive) return;

      enemy.pathProgress += enemy.speed * _dt * 0.02;
      const pos = curve.getPoint(Math.min(enemy.pathProgress, 1));
      enemy.position.copy(pos);
      if (enemy.mesh) {
        enemy.mesh.position.copy(pos);
        enemy.mesh.position.y = 0.4;
      }

      if (enemy.pathProgress >= 1) {
        enemy.alive = false;
        this._baseHp -= 20;

        if (enemy.mesh) {
          this._scene.remove(enemy.mesh);
        }

        if (this._baseHp <= 0) {
          this._endGame('defeat');
        }
      }
    });

    this._enemies = this._enemies.filter(e => e.alive);
  }

  private _updateTowers(_dt: number): void {
    const now = this._gameTime;

    this._towers.forEach(tower => {
      if (now - tower.lastFire < tower.cooldown) return;

      const target = this._findTarget(tower);
      if (!target) return;

      tower.lastFire = now;

      const projGeo = new THREE.SphereGeometry(0.1, 4, 4);
      const projMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
      const projectile = new THREE.Mesh(projGeo, projMat);
      projectile.position.copy(tower.position);
      projectile.position.y = 0.8;
      projectile.userData.velocity = new THREE.Vector3()
        .subVectors(target.position, tower.position)
        .normalize()
        .multiplyScalar(15);
      this._scene.add(projectile);
      this._projectiles.push(projectile);
    });
  }

  private _findTarget(enemy: Enemy): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = enemy.range;

    this._enemies.forEach(e => {
      if (!e.alive) return;
      const dist = e.position.distanceTo(enemy.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = e;
      }
    });

    return closest;
  }

  private _updateProjectiles(_dt: number): void {
    this._projectiles.forEach(proj => {
      const vel = proj.userData.velocity as THREE.Vector3;
      if (vel) {
        proj.position.x += vel.x * _dt;
        proj.position.y += vel.y * _dt;
        proj.position.z += vel.z * _dt;

        if (proj.position.y < 0) {
          this._scene.remove(proj);
        }
      }
    });

    this._projectiles = this._projectiles.filter(p =>
      p.position.y >= 0 && this._scene.children.includes(p)
    );
  }

  private _checkCollisions(): void {
    this._projectiles.forEach(proj => {
      this._enemies.forEach(enemy => {
        if (!enemy.alive) return;

        const dist = proj.position.distanceTo(enemy.position);
        if (dist < 0.5) {
          const tower = this._towers.find(t =>
            t.mesh && proj.position.distanceTo(t.mesh.position) < 1
          );
          const damage = tower?.damage || 10;

          enemy.hp -= damage;
          this._scene.remove(proj);

          if (enemy.hp <= 0) {
            enemy.alive = false;
            this._resources.stone += ENEMY_CONFIG[enemy.type as keyof typeof ENEMY_CONFIG].reward;
            this._score += ENEMY_CONFIG[enemy.type as keyof typeof ENEMY_CONFIG].reward;

            if (enemy.mesh) {
              this._scene.remove(enemy.mesh);
            }
          }
        }
      });
    });

    this._projectiles = this._projectiles.filter(p => {
      const stillExists = this._scene.children.includes(p);
      return stillExists && p.position.y >= 0;
    });
  }

  private _endGame(result: 'victory' | 'defeat'): void {
    this._gameState = result;
    if (this._onBattleEnd) {
      this._onBattleEnd(result, this._score);
    }
  }

  handleClick(clientX: number, clientY: number): number {
    return -1;
  }

  getState() {
    return {
      baseHp: this._baseHp,
      maxBaseHp: this._maxBaseHp,
      waveNumber: this._waveNumber,
      resources: this._resources,
      score: this._score,
      gameState: this._gameState,
    };
  }

  dispose(): void {
    this._canvas.removeEventListener('click', this._onCanvasClick);
  }
}

export default TowerDefenseScene;