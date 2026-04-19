import * as THREE from 'three';
import SpaceScene from './SpaceScene';
import { OceanSprite } from '../sprites/tier0/OceanSprite';
import { SandSprite } from '../sprites/tier0/SandSprite';
import { TreeSprite } from '../sprites/tier0/TreeSprite';
import { MountainSprite } from '../sprites/tier0/MountainSprite';
import { EnergyOrbSprite } from '../sprites/tier0/EnergyOrbSprite';

export class Tier0Scene extends SpaceScene {
  constructor() {
    super({
      tier: 0,
      backgroundColor: new THREE.Color(0x0A0E27),
      ambientLightIntensity: 0.7
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    super.mount(scene, camera, canvas);

    // 加载原始文明场景的精灵
    this.loadDefaultSprites();

    // 设置相机位置
    this.getCamera().position.set(0, 8, 20);
    this.getCamera().lookAt(0, 0, 0);
  }

  private loadDefaultSprites(): void {
    // 海洋
    const ocean = new OceanSprite();
    this.loadBody('ocean', ocean);

    // 沙滩
    const sand = new SandSprite({ position: new THREE.Vector3(0, 0, 0) });
    this.loadBody('sand', sand);

    // 树木
    const pineTree = new TreeSprite({ variant: 'pine', position: new THREE.Vector3(-3, 0, -5) });
    this.loadBody('pineTree', pineTree);

    const palmTree = new TreeSprite({ variant: 'palm', position: new THREE.Vector3(3, 0, -5) });
    this.loadBody('palmTree', palmTree);

    // 远山
    const mountain = new MountainSprite({ position: new THREE.Vector3(0, 0, -15) });
    this.loadBody('mountain', mountain);

    // 能量球
    for (let i = 0; i < 5; i++) {
      const energyOrb = new EnergyOrbSprite({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 5
        )
      });
      this.loadBody(`energyOrb_${i}`, energyOrb);
    }
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    // 可以添加场景特定的更新逻辑
  }
}

export default Tier0Scene;