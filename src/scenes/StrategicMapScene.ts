/**
 * StrategicMapScene - 战略大地图场景（商用级品质）
 *
 * 特性：
 *   - 真实卫星云图风格世界地图
 *   - 专业级光照和氛围
 *   - 动态视觉效果
 *   - 流畅的控制系统
 */

import * as THREE from 'three';
import type { GameScene } from './GameScene';

import { EnergyOrbSprite } from '../sprites/tier0/EnergyOrbSprite';
import { TreeSprite, TreeVariant } from '../sprites/tier0/TreeSprite';
import { MountainSprite } from '../sprites/tier0/MountainSprite';

export interface RegionBlock {
  id: number;
  name: string;
  hubName: string;
  color: string;
  worldPos: THREE.Vector3;
  unlocked: boolean;
  isCurrent: boolean;
  mesh?: THREE.Mesh;
  baseMesh?: THREE.Mesh;
  pulseRing?: THREE.Mesh;
  markerGroup?: THREE.Group;
}

const REGION_DATA = [
  { id: 1, name: '好望角', hub: '望海部', color: '#2E8B57', px: 180, py: 160 },
  { id: 2, name: '刚果', hub: '逐鹿部', color: '#32CD32', px: 320, py: 130 },
  { id: 3, name: '尼罗河', hub: '河部落', color: '#EDC9AF', px: 460, py: 110 },
  { id: 4, name: '地中海', hub: '渔部落', color: '#0077BE', px: 180, py: 280 },
  { id: 5, name: '西欧', hub: '木灵部', color: '#228B22', px: 320, py: 260 },
  { id: 6, name: '阿拉伯', hub: '水泽部', color: '#C2B280', px: 460, py: 240 },
  { id: 7, name: '印度', hub: '恒河部', color: '#8B4513', px: 600, py: 210 },
  { id: 8, name: '西伯利亚', hub: '冰原部', color: '#A0C0C0', px: 200, py: 390 },
  { id: 9, name: '白令海峡', hub: '渡海部', color: '#B8D4E8', px: 340, py: 370 },
  { id: 10, name: '阿拉斯加', hub: '野牛部', color: '#A0522D', px: 480, py: 350 },
  { id: 11, name: '亚马逊', hub: '雨林部', color: '#006400', px: 620, py: 330 },
  { id: 12, name: '南极', hub: '冰寒部', color: '#E8F4F8', px: 280, py: 500 },
  { id: 13, name: '澳大利亚', hub: '袋鼠部', color: '#DEB887', px: 420, py: 480 },
  { id: 14, name: '中原', hub: '黄河部', color: '#FFD700', px: 560, py: 460 },
  { id: 15, name: '昆仑山', hub: '昆仑部', color: '#FF4500', px: 700, py: 280 },
];

const MAP_WIDTH = 1138;
const MAP_HEIGHT = 640;
const SCALE = 0.05;

function pxToWorld(px: number, py: number): THREE.Vector3 {
  const x = (px - MAP_WIDTH / 2) * SCALE;
  const z = (py - MAP_HEIGHT / 2) * SCALE;
  return new THREE.Vector3(x, 0, z);
}



export class StrategicMapScene implements GameScene {
  private _camera!: THREE.Camera;
  private _canvas!: HTMLCanvasElement;
  private _blocks: RegionBlock[] = [];
  private _player!: THREE.Group;
  private _playerPos = new THREE.Vector3();
  private _targetPos = new THREE.Vector3();
  private _moveProgress = 1;
  private _moveSpeed = 3.5;
  private _moveKeys = { forward: false, backward: false, left: false, right: false };
  private _moveVelocity = new THREE.Vector3();
  private _playerRotation = 0;
  private _isMovingToRegion = false;
  private _selectedRegionIndex = -1;
  private _lastClickTime = 0;
  private _clickCooldown = 400;
  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();
  private _time = 0;
  private _sprites: any[] = [];

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    this._camera = camera;
    this._canvas = canvas;

    this._buildWorldMap(scene);
    this._buildPathLine(scene);
    this._buildBlocks(scene);
    this._buildPlayer(scene);
    this._buildAtmosphere(scene);
    this._buildEnvironmentSprites(scene);

    // 初始化相机位置
    if (camera instanceof THREE.PerspectiveCamera) {
      const startPos = this._player?.position || new THREE.Vector3(0, 0, 0);
      camera.position.set(startPos.x, 20, startPos.z + 14);
      camera.lookAt(startPos);
    }

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('click', this._onClick);
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': case 'KeyU': this._moveKeys.forward = true; break;
      case 'KeyS': case 'ArrowDown': case 'KeyJ': this._moveKeys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': case 'KeyH': this._moveKeys.left = true; break;
      case 'KeyD': case 'ArrowRight': case 'KeyK': this._moveKeys.right = true; break;
    }
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': case 'KeyU': this._moveKeys.forward = false; break;
      case 'KeyS': case 'ArrowDown': case 'KeyJ': this._moveKeys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': case 'KeyH': this._moveKeys.left = false; break;
      case 'KeyD': case 'ArrowRight': case 'KeyK': this._moveKeys.right = false; break;
    }
  };

  private _onClick = (e: MouseEvent): void => {
    const now = Date.now();
    if (now - this._lastClickTime < this._clickCooldown) return;
    this._lastClickTime = now;

    const rect = this._canvas.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera as THREE.Camera);
    const meshes = this._blocks.filter(b => b.baseMesh).map(b => b.baseMesh as THREE.Mesh);
    const intersects = this._raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const idx = intersects[0].object.userData.regionIndex;
      if (idx !== undefined) this._moveToRegion(idx);
    }
  };

  private _buildWorldMap(scene: THREE.Scene): void {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/bg1.png');

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.15,
      envMapIntensity: 0.3,
    });

    const geometry = new THREE.PlaneGeometry(56, 36, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.05;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 环境光 - 暖色调
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

    // 主光源 - 模拟太阳
    const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
    sunLight.position.set(20, 30, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    scene.add(sunLight);

    // 补光 - 冷色调
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-15, 10, -10);
    scene.add(fillLight);

    // 边缘光
    const rimLight = new THREE.DirectionalLight(0x00ccff, 0.3);
    rimLight.position.set(0, 5, -20);
    scene.add(rimLight);
  }

  private _buildPathLine(scene: THREE.Scene): void {
    const positions = REGION_DATA.map(r => pxToWorld(r.px, r.py));

    // 主路径
    const geo = new THREE.BufferGeometry().setFromPoints(positions.map(p => p.clone()));
    const mat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.7,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    line.position.y = 0.08;
    scene.add(line);

    // 路径发光效果
    const glowGeo = new THREE.BufferGeometry().setFromPoints(positions.map(p => p.clone()));
    const glowMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.2,
      linewidth: 6,
    });
    const glowLine = new THREE.Line(glowGeo, glowMat);
    glowLine.position.y = 0.06;
    scene.add(glowLine);

    // 节点
    positions.forEach((pos, i) => {
      const nodeGeo = new THREE.CircleGeometry(0.2, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x00ff88 : 0x00d4ff,
        transparent: true,
        opacity: 0.9,
      });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.rotation.x = -Math.PI / 2;
      node.position.set(pos.x, 0.1, pos.z);
      scene.add(node);
    });
  }

  private _buildBlocks(scene: THREE.Scene): void {
    const positions = REGION_DATA.map(r => pxToWorld(r.px, r.py));

    for (let i = 0; i < REGION_DATA.length; i++) {
      const data = REGION_DATA[i];
      const pos = positions[i];
      if (!pos) continue;

      const isCurrent = i === 0;

      // 基座 - 六边形
      const baseGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.15, 6);
      const baseColor = new THREE.Color(data.color);
      const baseMat = new THREE.MeshStandardMaterial({
        color: baseColor.clone().multiplyScalar(0.4),
        roughness: 0.4,
        metalness: 0.4,
        emissive: baseColor.clone().multiplyScalar(0.2),
        emissiveIntensity: isCurrent ? 0.6 : 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(pos.x, 0.075, pos.z);
      baseMesh.userData.regionIndex = i;
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      scene.add(baseMesh);

      // 脉冲光环
      const ringGeo = new THREE.RingGeometry(1.1, 1.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: data.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.16, pos.z);
      scene.add(ring);

      // 标记组
      const markerGroup = new THREE.Group();
      markerGroup.position.set(pos.x, 0.3, pos.z);

      // 编号球
      const numGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const numMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor.clone().multiplyScalar(0.3),
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.5,
      });
      const numMesh = new THREE.Mesh(numGeo, numMat);
      markerGroup.add(numMesh);

      // 光晕
      const glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      markerGroup.add(glow);

      scene.add(markerGroup);

      this._blocks.push({
        id: data.id,
        name: data.name,
        hubName: data.hub,
        color: data.color,
        worldPos: pos.clone(),
        unlocked: true,
        isCurrent,
        baseMesh,
        pulseRing: ring,
        markerGroup,
      });
    }
  }

  private _buildPlayer(scene: THREE.Scene): void {
    const group = new THREE.Group();

    // 核心球体
    const bodyGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      emissive: 0xff4400,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // 底座
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      emissive: 0xff6600,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.04;
    group.add(base);

    // 光柱
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.15, 3, 8);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff8800,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.5,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.8;
    group.add(beam);

    // 顶部闪烁
    const topGeo = new THREE.OctahedronGeometry(0.15);
    const topMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.9,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 3.4;
    group.add(top);

    this._player = group;
    const startPos = this._blocks[0]?.worldPos || new THREE.Vector3();
    this._player.position.copy(startPos);
    this._playerPos.copy(startPos);
    this._targetPos.copy(startPos);
    scene.add(this._player);
  }

  private _buildAtmosphere(scene: THREE.Scene): void {
    // 远景粒子
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 20 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
  }

  private _buildEnvironmentSprites(scene: THREE.Scene): void {
    // 森林 - 分布在各据点周围
    const forestAreas = [
      { pos: new THREE.Vector3(-5, 0, 5), count: 8, variant: 'broad' as TreeVariant },
      { pos: new THREE.Vector3(8, 0, -5), count: 6, variant: 'pine' as TreeVariant },
      { pos: new THREE.Vector3(15, 0, 8), count: 10, variant: 'palm' as TreeVariant },
      { pos: new THREE.Vector3(-15, 0, -8), count: 5, variant: 'pine' as TreeVariant },
    ];

    forestAreas.forEach(area => {
      for (let i = 0; i < area.count; i++) {
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetZ = (Math.random() - 0.5) * 8;
        const treePos = area.pos.clone().add(new THREE.Vector3(offsetX, 0, offsetZ));

        const tree = new TreeSprite({
          position: treePos,
          variant: area.variant,
          height: 1.5 + Math.random() * 1.5,
        });
        tree.mount(scene);
        this._sprites.push(tree);
      }
    });

    // 山脉 - 地图边缘和战略位置
    const mountainPositions = [
      { pos: new THREE.Vector3(-18, 0, 10), scale: 3, color: 0x8b7355 },
      { pos: new THREE.Vector3(18, 0, -12), scale: 4, color: 0x6b5344 },
      { pos: new THREE.Vector3(0, 0, -15), scale: 5, color: 0x7a6352 },
      { pos: new THREE.Vector3(-12, 0, 15), scale: 2.5, color: 0x8b7355 },
    ];

    mountainPositions.forEach(m => {
      const mountain = new MountainSprite({
        position: m.pos,
        height: m.scale * 8,
        color: m.color,
        snow: true,
      });
      mountain.mount(scene);
      this._sprites.push(mountain);
    });

    // 能量球 - 分布在地图上
    const energyOrbPositions = [
      new THREE.Vector3(-3, 1.5, 3),
      new THREE.Vector3(5, 1.5, -2),
      new THREE.Vector3(-8, 1.5, -5),
      new THREE.Vector3(12, 1.5, 5),
      new THREE.Vector3(-15, 1.5, 0),
      new THREE.Vector3(0, 1.5, 10),
      new THREE.Vector3(8, 1.5, 12),
    ];

    energyOrbPositions.forEach((pos, i) => {
      const colors = [0x00ff88, 0x00aaff, 0xffaa00, 0xff44aa];
      const energyOrb = new EnergyOrbSprite({
        position: pos,
        color: colors[i % colors.length],
        glowColor: colors[(i + 1) % colors.length],
        radius: 0.3 + Math.random() * 0.2,
      });
      energyOrb.mount(scene);
      this._sprites.push(energyOrb);
    });

    console.log(`[场景] 已加载 ${this._sprites.length} 个精灵组件`);
  }

  private _moveToRegion(index: number): void {
    if (index < 0 || index >= this._blocks.length) return;
    if (this._isMovingToRegion) return;

    const target = this._blocks[index];
    if (!target) return;

    this._selectedRegionIndex = index;
    this._targetPos.copy(target.worldPos);
    this._playerPos.copy(this._player.position);
    this._moveProgress = 0;
    this._isMovingToRegion = true;

    console.log(`[地图] 前往: ${target.name} (${target.hubName})`);
  }

  update(_dt: number): void {
    this._time += _dt;
    const t = this._time;

    if (!this._player) return;

    // 更新精灵组件
    this._sprites.forEach(sprite => {
      if (sprite && typeof sprite.update === 'function') {
        sprite.update(_dt);
      }
    });

    // ==================== 移动处理 ====================
    let inputX = 0, inputZ = 0;
    if (this._moveKeys.forward) inputZ -= 1;
    if (this._moveKeys.backward) inputZ += 1;
    if (this._moveKeys.left) inputX -= 1;
    if (this._moveKeys.right) inputX += 1;

    const speed = 10;
    const accel = 18;
    const friction = 0.94;

    if (inputX !== 0 || inputZ !== 0) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      inputX /= len;
      inputZ /= len;
      this._moveVelocity.x += inputX * accel * _dt;
      this._moveVelocity.z += inputZ * accel * _dt;
      this._playerRotation = Math.atan2(inputX, inputZ);
    }

    const currentSpeed = this._moveVelocity.length();
    if (currentSpeed > speed) this._moveVelocity.multiplyScalar(speed / currentSpeed);
    this._moveVelocity.multiplyScalar(friction);

    // 自动移动逻辑
    if (this._isMovingToRegion && this._moveProgress < 1) {
      this._moveProgress = Math.min(1, this._moveProgress + _dt * this._moveSpeed * 0.12);
      const eased = this._easeInOutCubic(this._moveProgress);
      this._player.position.lerpVectors(this._playerPos, this._targetPos, eased);

      if (this._moveProgress >= 1) {
        this._isMovingToRegion = false;
        const region = this._blocks[this._selectedRegionIndex];
        if (region) {
          console.log(`[地图] 抵达: ${region.name}`);
        }
      }
    } else if (this._moveVelocity.length() > 0.01) {
      this._player.position.x += this._moveVelocity.x * _dt;
      this._player.position.z += this._moveVelocity.z * _dt;
    }

    // 边界限制
    const bounds = 28;
    this._player.position.x = THREE.MathUtils.clamp(this._player.position.x, -bounds, bounds);
    this._player.position.z = THREE.MathUtils.clamp(this._player.position.z, -bounds, bounds);

    // ==================== 动画 ====================
    // 弹跳
    const bounce = Math.sin(t * 3.5) * 0.12 + 0.45;
    this._player.position.y = bounce;

    // 旋转
    if (this._moveVelocity.length() > 0.05) {
      this._player.rotation.y = THREE.MathUtils.lerp(this._player.rotation.y, this._playerRotation, _dt * 10);
    }

    // 相机跟随 - 平滑跟随玩家
    const perspCam = this._camera as THREE.PerspectiveCamera;
    if (perspCam && perspCam.isPerspectiveCamera) {
      const targetPos = this._player.position.clone();

      const desiredX = targetPos.x;
      const desiredY = 20;
      const desiredZ = targetPos.z + 14;

      perspCam.position.x = THREE.MathUtils.lerp(perspCam.position.x, desiredX, 0.08);
      perspCam.position.y = THREE.MathUtils.lerp(perspCam.position.y, desiredY, 0.08);
      perspCam.position.z = THREE.MathUtils.lerp(perspCam.position.z, desiredZ, 0.08);

      perspCam.lookAt(targetPos.x, targetPos.y + 1, targetPos.z);
    }

    // ==================== 据点动画 ====================
    this._blocks.forEach((block, i) => {
      // 脉冲环动画
      if (block.pulseRing) {
        const scale = 1 + Math.sin(t * 2 + i * 0.3) * 0.08;
        block.pulseRing.scale.setScalar(scale);
        const mat = block.pulseRing.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t * 2.5 + i * 0.3) * 0.15;
      }

      // 标记组动画
      if (block.markerGroup) {
        block.markerGroup.rotation.y = t * 0.5;
        block.markerGroup.position.y = 0.3 + Math.sin(t * 2 + i * 0.5) * 0.05;
      }
    });
  }

  private _easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  handleClick(_clientX: number, _clientY: number): number { return -1; }

  dispose(): void {
    // 清理精灵组件
    this._sprites.forEach(sprite => {
      if (sprite && typeof sprite.dispose === 'function') {
        sprite.dispose();
      }
    });
    this._sprites = [];

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('click', this._onClick);
  }
}

export default StrategicMapScene;