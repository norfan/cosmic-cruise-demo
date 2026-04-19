import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import {
  YellowStarSprite,
  MercurySprite,
  VenusSprite,
  MarsSprite,
  JupiterSprite,
  SaturnSprite,
  UranusSprite,
  NeptuneSprite,
  AsteroidBeltSprite,
  CometSprite
} from '../sprites/tier2';

export class Tier2Scene extends SpaceScene {
  constructor() {
    super({
      tier: 2,
      backgroundColor: new THREE.Color(0x050510),
      ambientLightIntensity: 0.3
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载恒星文明场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 10, 80);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 太阳
    const sun = new YellowStarSprite({ position: new THREE.Vector3(0, 0, 0) });
    this.loadBody('sun', sun);

    // 水星
    const mercury = new MercurySprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 15,
        speed: 0.8,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 0.5
      }
    });
    this.loadBody('mercury', mercury);

    // 金星
    const venus = new VenusSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 22,
        speed: 0.6,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 2.1
      }
    });
    this.loadBody('venus', venus);

    // 火星
    const mars = new MarsSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 30,
        speed: 0.45,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 4.2
      }
    });
    this.loadBody('mars', mars);

    // 小行星带
    const asteroidBelt = new AsteroidBeltSprite({
      position: new THREE.Vector3(0, 0, 0),
      innerRadius: 40,
      outerRadius: 50,
      count: 250
    });
    this.loadBody('asteroidBelt', asteroidBelt);

    // 木星
    const jupiter = new JupiterSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 65,
        speed: 0.18,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 1.0
      }
    });
    this.loadBody('jupiter', jupiter);

    // 土星
    const saturn = new SaturnSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 85,
        speed: 0.12,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 3.5
      }
    });
    this.loadBody('saturn', saturn);

    // 天王星
    const uranus = new UranusSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 100,
        speed: 0.07,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 5.2
      }
    });
    this.loadBody('uranus', uranus);

    // 海王星
    const neptune = new NeptuneSprite({
      position: new THREE.Vector3(0, 0, 0),
      orbit: {
        radius: 115,
        speed: 0.05,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 0.8
      }
    });
    this.loadBody('neptune', neptune);

    // 彗星
    const comet = new CometSprite({
      position: new THREE.Vector3(25, 0, 0),
      orbit: {
        radius: 30,
        speed: 0.3,
        center: new THREE.Vector3(0, 0, 0),
        initialAngle: 0
      }
    });
    this.loadBody('comet', comet);

    // 添加星空背景
    this.addStarField();
  }

  private addStarField(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
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

export default Tier2Scene;