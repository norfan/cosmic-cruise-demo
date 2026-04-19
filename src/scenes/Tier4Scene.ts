import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  GalaxyClusterSprite,
  CosmicWebFiberSprite,
  DarkMatterNodeSprite,
  QuasarSprite
} from '../sprites/tier4';

export class Tier4Scene extends SpaceScene {
  constructor() {
    super({
      tier: 4,
      backgroundColor: new THREE.Color(0x020205),
      ambientLightIntensity: 0.1
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载宇宙网场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 10, 35);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 星系团
    const galaxyCluster = new GalaxyClusterSprite({
      galaxyCount: 10,
      clusterRadius: 18,
      coreBrightness: 0.6,
      haloScale: 2.2,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.loadBody('galaxyCluster', galaxyCluster);

    // 宇宙网纤维
    const cosmicWebFiber1 = new CosmicWebFiberSprite({
      length: 30,
      curvature: 1.2,
      nodeCount: 350,
      color1: '#4488ff',
      color2: '#aa44ff',
      position: new THREE.Vector3(-20, 0, 0)
    });
    this.loadBody('cosmicWebFiber1', cosmicWebFiber1);

    const cosmicWebFiber2 = new CosmicWebFiberSprite({
      length: 25,
      curvature: -1.0,
      nodeCount: 300,
      color1: '#8844ff',
      color2: '#44ffff',
      position: new THREE.Vector3(20, 0, 0)
    });
    this.loadBody('cosmicWebFiber2', cosmicWebFiber2);

    // 暗物质节点
    const darkMatterNode = new DarkMatterNodeSprite({
      radius: 4,
      lensRingScale: 1.5,
      distortionStrength: 0.5,
      glowColor: '#ff6600',
      position: new THREE.Vector3(0, -10, 10)
    });
    this.loadBody('darkMatterNode', darkMatterNode);

    // 类星体
    const quasar = new QuasarSprite({
      diskRadius: 6,
      jetLength: 25,
      brightness: 0.8,
      jetColor: '#00ccff',
      position: new THREE.Vector3(0, 10, -10)
    });
    this.loadBody('quasar', quasar);

    // 添加宇宙背景
    this.addCosmicBackground();
  }

  private addCosmicBackground(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 4000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 300;
      positions[i + 1] = (Math.random() - 0.5) * 300;
      positions[i + 2] = (Math.random() - 0.5) * 300;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.7
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.getScene().add(stars);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以添加场景特定的更新逻辑
  }
}

export default Tier4Scene;