import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  SpiralGalaxySprite,
  NebulaSprite,
  StarClusterSprite,
  PulsarSprite
} from '../sprites/tier3';

export class Tier3Scene extends SpaceScene {
  constructor() {
    super({
      tier: 3,
      backgroundColor: new THREE.Color(0x030308),
      ambientLightIntensity: 0.2
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载星系文明场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 10, 25);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 螺旋星系
    const spiralGalaxy = new SpiralGalaxySprite({ position: new THREE.Vector3(0, 0, 0) });
    this.loadBody('spiralGalaxy', spiralGalaxy);

    // 星云
    const nebula = new NebulaSprite({
      color: '#9933FF',
      color2: '#00CCFF',
      position: new THREE.Vector3(-15, 5, -10)
    });
    this.loadBody('nebula', nebula);

    // 星团
    const starCluster = new StarClusterSprite({
      radius: 5,
      starCount: 800,
      globular: true,
      position: new THREE.Vector3(15, -5, 5)
    });
    this.loadBody('starCluster', starCluster);

    // 脉冲星
    const pulsar = new PulsarSprite({
      period: 1.0,
      coreRadius: 0.3,
      beamLength: 8,
      position: new THREE.Vector3(0, 0, 15)
    });
    this.loadBody('pulsar', pulsar);

    // 添加深空背景
    this.addDeepSpaceBackground();
  }

  private addDeepSpaceBackground(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 3000;
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

export default Tier3Scene;