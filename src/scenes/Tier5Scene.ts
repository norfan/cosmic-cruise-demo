import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  BlackHoleSprite,
  WormHoleSprite,
  WhiteHoleSprite
} from '../sprites/tier5';

export class Tier5Scene extends SpaceScene {
  constructor() {
    super({
      tier: 5,
      backgroundColor: new THREE.Color(0x010103),
      ambientLightIntensity: 0.1
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载极端天体场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 4, 18);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 黑洞
    const blackHole = new BlackHoleSprite({
      diskRadius: 7,
      diskBrightness: 0.9,
      jetLength: 22,
      eventHorizonR: 1.8,
      distortionStrength: 0.6,
      position: new THREE.Vector3(0, 0, 0)
    });
    this.loadBody('blackHole', blackHole);

    // 虫洞
    const wormHole = new WormHoleSprite({
      tunnelRadius: 2.5,
      tunnelLength: 12,
      energyColor: '#aa44ff',
      portalSize: 4,
      position: new THREE.Vector3(-15, 0, 0)
    });
    this.loadBody('wormHole', wormHole);

    // 白洞
    const whiteHole = new WhiteHoleSprite({
      coreRadius: 3,
      burstInterval: 3.5,
      explosionColor: '#ffffff',
      position: new THREE.Vector3(15, 0, 0)
    });
    this.loadBody('whiteHole', whiteHole);

    // 添加深空背景
    this.addDeepSpaceBackground();
  }

  private addDeepSpaceBackground(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = (Math.random() - 0.5) * 200;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.getScene().add(stars);
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以添加场景特定的更新逻辑
  }
}

export default Tier5Scene;