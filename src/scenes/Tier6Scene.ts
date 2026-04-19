import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  GenesisCoreSprite,
  LawGeometrySprite,
  CosmicBoundarySprite
} from '../sprites/tier6';

export class Tier6Scene extends SpaceScene {
  constructor() {
    super({
      tier: 6,
      backgroundColor: new THREE.Color(0x080418),
      ambientLightIntensity: 0.3
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载创世场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 5, 20);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 创世核心
    const genesisCore = new GenesisCoreSprite({
      coreRadius: 4,
      energyCount: 500,
      explosionIntensity: 1.0,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.loadBody('genesisCore', genesisCore);

    // 法则几何
    const lawGeometry = new LawGeometrySprite({
      nestingLevels: 5,
      edgeGlow: 0.8,
      spinSpeed: 1.0,
      position: new THREE.Vector3(12, 0, 0)
    });
    this.loadBody('lawGeometry', lawGeometry);

    // 宇宙边界
    const cosmicBoundary = new CosmicBoundarySprite({
      shellRadius: 22,
      shellOpacity: 0.7,
      foamCount: 800,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.loadBody('cosmicBoundary', cosmicBoundary);

    // 添加创世背景
    this.addCreationBackground();
  }

  private addCreationBackground(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 3000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      transparent: true,
      opacity: 0.9
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.getScene().add(stars);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以添加场景特定的更新逻辑
  }
}

export default Tier6Scene;