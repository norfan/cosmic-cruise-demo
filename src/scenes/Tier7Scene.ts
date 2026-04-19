import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  MultiverseNodeSprite,
  CosmicConsciousnessSprite,
  OmegaPointSprite
} from '../sprites/tier7';

export class Tier7Scene extends SpaceScene {
  constructor() {
    super({
      tier: 7,
      backgroundColor: new THREE.Color(0x100520),
      ambientLightIntensity: 0.4
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载终局场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 8, 40);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 多宇宙节点
    const multiverseNode = new MultiverseNodeSprite({
      bubbleCount: 7,
      bubbleRadius: 2.5,
      orbitRadius: 10,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.loadBody('multiverseNode', multiverseNode);

    // 宇宙意识体
    const cosmicConsciousness = new CosmicConsciousnessSprite({
      nodeCount: 120,
      networkRadius: 14,
      synapseCount: 60,
      position: new THREE.Vector3(-15, 0, 0)
    });
    this.loadBody('cosmicConsciousness', cosmicConsciousness);

    // Ω终点
    const omegaPoint = new OmegaPointSprite({
      singularityRadius: 2.5,
      vortexArms: 8,
      collapseParticles: 600,
      position: new THREE.Vector3(15, 0, 0)
    });
    this.loadBody('omegaPoint', omegaPoint);

    // 添加终局背景
    this.addFinalBackground();
  }

  private addFinalBackground(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 4000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 150;
      positions[i + 1] = (Math.random() - 0.5) * 150;
      positions[i + 2] = (Math.random() - 0.5) * 150;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 1.0
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.getScene().add(stars);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以添加场景特定的更新逻辑
  }
}

export default Tier7Scene;