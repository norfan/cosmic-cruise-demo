import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { GameScene } from './GameScene';
import type { Sprite } from '../sprites/Sprite';
import { EventBus } from '../engine/EventBus';
import { EventManager, EventConfig } from '../engine/EventSystem';
import { PostProcessingManager, PostProcessingConfig } from '../renderer/PostProcessing';

interface SpaceSceneConfig {
  tier: number;                      // 文明等级
  backgroundColor: THREE.Color;      // 背景色
  ambientLightIntensity: number;      // 环境光强度
  gravityCenter?: THREE.Vector3;      // 引力中心
  gravityStrength?: number;           // 引力强度
  fogDensity?: number;               // 雾密度
}

type RenderLayerType =
  | 'background'      // 背景星空、远景
  | 'nebula'          // 星云层
  | 'planet'          // 行星层
  | 'moon'            // 卫星层
  | 'asteroid'        // 小行星层
  | 'effect'          // 特效层
  | 'foreground';     // 前景层

interface RenderLayer {
  type: RenderLayerType;
  layers: THREE.Layers;           // Three.js Layers
  objects: THREE.Object3D[];
  render(composer: THREE.EffectComposer): void;
}

export class SpaceScene implements GameScene {
  private config: SpaceSceneConfig;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bodies: Map<string, Sprite>;
  private renderLayers: RenderLayer[];
  private eventBus: EventBus;
  private postProcessingManager: PostProcessingManager;
  private eventManager: EventManager;

  // Three.js 特有
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  constructor(config: SpaceSceneConfig) {
    this.config = config;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.bodies = new Map();
    this.renderLayers = [];
    this.eventBus = new EventBus();
    this.eventManager = new EventManager(this.scene, this.eventBus);
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor(config.backgroundColor);

    // 初始化后处理管理器
    this.postProcessingManager = new PostProcessingManager(this.renderer, this.scene, this.camera);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404060, config.ambientLightIntensity);
    this.scene.add(ambientLight);

    // 初始化渲染层级
    this.initRenderLayers();
  }

  private initRenderLayers(): void {
    const layerTypes: RenderLayerType[] = [
      'background', 'nebula', 'planet', 'moon', 'asteroid', 'effect', 'foreground'
    ];

    layerTypes.forEach((type, index) => {
      const layer: RenderLayer = {
        type,
        layers: new THREE.Layers(),
        objects: [],
        render: (composer: EffectComposer) => {
          // 渲染该层级的对象
        }
      };
      layer.layers.set(index);
      this.renderLayers.push(layer);
    });
  }

  mount(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement): void {
    // 这里我们使用自己的场景和相机
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    canvas.appendChild(this.renderer.domElement);

    // 配置相机
    if (camera instanceof THREE.PerspectiveCamera) {
      this.camera = camera;
    }

    // 配置后处理
    this.postProcessingManager.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  // 动态加载/卸载
  loadBody<T extends Sprite>(
    id: string,
    sprite: T
  ): T {
    this.bodies.set(id, sprite);
    sprite.mount(this.scene);
    return sprite;
  }

  unloadBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      body.dispose();
      this.bodies.delete(id);
    }
  }

  loadBodiesFromConfig(configList: Array<{ id: string; sprite: Sprite }>): void {
    configList.forEach(({ id, sprite }) => {
      this.loadBody(id, sprite);
    });
  }

  clearScene(): void {
    this.bodies.forEach((body) => body.dispose());
    this.bodies.clear();
  }

  // 渲染层管理
  addRenderLayer(layer: RenderLayer): void {
    this.renderLayers.push(layer);
  }

  getBodiesInRadius(position: THREE.Vector3, radius: number): Sprite[] {
    const result: Sprite[] = [];
    this.bodies.forEach((body) => {
      if (body.mesh && body.mesh.position.distanceTo(position) <= radius) {
        result.push(body);
      }
    });
    return result;
  }

  // 主循环
  update(deltaTime: number): void {
    this.bodies.forEach((body) => body.update(deltaTime));
    this.eventManager.update(deltaTime);
  }

  // 事件管理方法
  addEvent(config: EventConfig): void {
    this.eventManager.addEvent(config);
  }

  getEvents() {
    return this.eventManager.getEvents();
  }

  getActiveEvents() {
    return this.eventManager.getActiveEvents();
  }

  render(): void {
    this.postProcessingManager.render();
  }

  // 配置后处理效果
  configurePostProcessing(config: PostProcessingConfig): void {
    this.postProcessingManager.configure(config);
  }

  // 重置后处理效果
  resetPostProcessing(): void {
    this.postProcessingManager.reset();
  }

  dispose(): void {
    this.clearScene();
    this.renderer.dispose();
  }

  // Getters
  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getBodies(): Map<string, Sprite> {
    return this.bodies;
  }
}

export default SpaceScene;