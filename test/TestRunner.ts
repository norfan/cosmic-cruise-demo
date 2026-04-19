/**
 * TestRunner - 精灵组件测试运行器
 *
 * 创建一个独立的 Three.js 渲染环境，用于：
 *   1. 单个精灵组件的视觉验证
 *   2. 动画循环测试
 *   3. dispose 资源清理测试
 *
 * 用法：
 *   const runner = new TestRunner(canvasElement);
 *   runner.loadSprite(OceanSprite, { tier: 0 });
 *   runner.start();
 *
 *   // 切换精灵
 *   runner.clear();
 *   runner.loadSprite(EarthSprite, { tier: 1 });
 */

import * as THREE from 'three';
import { Sprite, SpriteConfig } from '../src/sprites/Sprite';

export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'hemisphere';
  color?: number;
  groundColor?: number; // hemisphere only
  intensity?: number;
  position?: { x: number; y: number; z: number };
  distance?: number; // point only
}

export interface TestRunnerConfig {
  /** 相机位置 */
  cameraPosition?: THREE.Vector3;
  /** 相机 FOV */
  fov?: number;
  /** 背景色（深空蓝默认） */
  background?: THREE.Color | number;
  /** 灯光配置 */
  lights?: LightConfig[];
  /** 是否显示 FPS */
  showStats?: boolean;
  /** 是否启用轨道控制（鼠标旋转） */
  orbitControls?: boolean;
}

const DEFAULT_LIGHTS: LightConfig[] = [
  { type: 'ambient', color: 0x404060, intensity: 0.6 },
  {
    type: 'directional',
    color: 0xffffff,
    intensity: 1.2,
    position: { x: 5, y: 8, z: 5 },
  },
];

export class TestRunner {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private rafId: number = 0;
  private sprites: Sprite[] = [];
  private lights: THREE.Light[] = [];
  private statsEl: HTMLElement | null = null;
  private frameCount: number = 0;
  private lastFPSTime: number = 0;

  constructor(canvas: HTMLCanvasElement, config: TestRunnerConfig = {}) {
    this.canvas = canvas;

    // ── 渲染器 ──────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── 场景 ────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.background ?? 0x0a0e27);

    // ── 相机 ────────────────────────────────────
    const aspect = canvas.clientWidth / canvas.clientHeight || 16 / 9;
    this.camera = new THREE.PerspectiveCamera(config.fov ?? 60, aspect, 0.1, 2000);
    const camPos = config.cameraPosition ?? new THREE.Vector3(0, 5, 15);
    this.camera.position.copy(camPos);
    this.camera.lookAt(0, 0, 0);

    // ── 灯光 ────────────────────────────────────
    this.setupLights(config.lights ?? DEFAULT_LIGHTS);

    // ── 时钟 ────────────────────────────────────
    this.clock = new THREE.Clock();

    // ── Stats ───────────────────────────────────
    if (config.showStats) {
      this.setupStats();
    }

    // ── Resize ──────────────────────────────────
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  // ─── 精灵管理 ────────────────────────────────

  /**
   * 加载并挂载一个精灵
   * @param SpriteClass 精灵类（未实例化）
   * @param config 精灵配置
   */
  loadSprite<T extends Sprite>(
    SpriteClass: new (config?: SpriteConfig) => T,
    config: SpriteConfig = {}
  ): T {
    const sprite = new SpriteClass(config);
    sprite.mount(this.scene, config);
    this.sprites.push(sprite);
    return sprite;
  }

  /**
   * 卸载并清理所有精灵
   */
  clearSprites(): void {
    this.sprites.forEach((s) => s.dispose());
    this.sprites = [];
  }

  /**
   * 清理并重新加载一个精灵（便于快速切换）
   */
  reloadSprite<T extends Sprite>(
    SpriteClass: new (config?: SpriteConfig) => T,
    config: SpriteConfig = {}
  ): T {
    this.clearSprites();
    return this.loadSprite(SpriteClass, config);
  }

  // ─── 生命周期 ────────────────────────────────

  /** 启动渲染循环 */
  start(): void {
    this.clock.start();
    this.loop();
  }

  /** 暂停渲染循环 */
  pause(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** 恢复渲染循环 */
  resume(): void {
    if (this.rafId === 0) this.loop();
  }

  /** 销毁所有资源 */
  destroy(): void {
    this.pause();
    this.clearSprites();
    this.lights.forEach((l) => {
      this.scene.remove(l);
      l.dispose?.();
    });
    this.lights = [];
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }

  // ─── 相机控制 ────────────────────────────────

  setCameraPosition(pos: THREE.Vector3): void {
    this.camera.position.copy(pos);
    this.camera.lookAt(0, 0, 0);
  }

  setCameraLookAt(target: THREE.Vector3): void {
    this.camera.lookAt(target);
  }

  // ─── 获取器 ──────────────────────────────────

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  // ─── 私有 ────────────────────────────────────

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const delta = Math.min(this.clock.getDelta(), 0.05); // 最大帧时间 50ms

    // 更新精灵
    this.sprites.forEach((s) => {
      if (s.isMounted) s.update(delta);
    });

    this.renderer.render(this.scene, this.camera);

    // FPS 统计
    if (this.statsEl) {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFPSTime >= 1000) {
        this.statsEl.textContent = `FPS: ${this.frameCount}`;
        this.frameCount = 0;
        this.lastFPSTime = now;
      }
    }
  };

  private setupLights(configs: LightConfig[]): void {
    configs.forEach((cfg) => {
      let light: THREE.Light;
      switch (cfg.type) {
        case 'ambient':
          light = new THREE.AmbientLight(cfg.color ?? 0xffffff, cfg.intensity ?? 0.5);
          break;
        case 'directional': {
          const dl = new THREE.DirectionalLight(cfg.color ?? 0xffffff, cfg.intensity ?? 1);
          dl.castShadow = true;
          dl.shadow.mapSize.setScalar(1024);
          if (cfg.position) dl.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          light = dl;
          break;
        }
        case 'point': {
          const pl = new THREE.PointLight(
            cfg.color ?? 0xffffff,
            cfg.intensity ?? 1,
            cfg.distance ?? 50
          );
          if (cfg.position) pl.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
          light = pl;
          break;
        }
        case 'hemisphere':
          light = new THREE.HemisphereLight(
            cfg.color ?? 0x888888,
            cfg.groundColor ?? 0x222222,
            cfg.intensity ?? 0.6
          );
          break;
        default:
          return;
      }
      this.scene.add(light);
      this.lights.push(light);
    });
  }

  private setupStats(): void {
    const el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:8px;left:8px;color:#0f0;font:12px monospace;z-index:9999;background:rgba(0,0,0,.5);padding:4px 8px;border-radius:4px;';
    document.body.appendChild(el);
    this.statsEl = el;
    this.lastFPSTime = performance.now();
  }

  private handleResize = (): void => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
}

export default TestRunner;
