import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import { EarthSprite } from '../sprites/tier1/EarthSprite';
import { MoonSprite } from '../sprites/tier1/MoonSprite';

export class Tier1Scene extends SpaceScene {
  constructor() {
    super({
      tier: 1,
      backgroundColor: new THREE.Color(0x050510),
      ambientLightIntensity: 0.5
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载行星文明场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 2, 10);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 地球
    const earth = new EarthSprite({ position: new THREE.Vector3(0, 0, 0) });
    this.loadBody('earth', earth);

    // 月球（绕地球轨道）
    const moon = new MoonSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 4,
        speed: 0.3,
        center: new THREE.Vector3(0, 0, 0)
      }
    });
    this.loadBody('moon', moon);

    // 添加星空背景
    this.addStarField();
  }

  private addStarField(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
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

export default Tier1Scene;