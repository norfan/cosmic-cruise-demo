import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass';

// 后处理效果配置
export interface PostProcessingConfig {
    bloom?: {
        strength: number;
        radius: number;
        threshold: number;
    };
    film?: {
        noiseIntensity: number;
        scanlineIntensity: number;
        scanlineCount: number;
        grayscale: boolean;
    };
    bokeh?: {
        focus: number;
        aperture: number;
        maxblur: number;
    };
}

// 后处理效果管理器
export class PostProcessingManager {
    private composer: EffectComposer;
    private renderPass: RenderPass;
    private bloomPass: UnrealBloomPass | null = null;
    private filmPass: FilmPass | null = null;
    private bokehPass: BokehPass | null = null;

    constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.composer = new EffectComposer(renderer);
        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);
    }

    // 配置后处理效果
    configure(config: PostProcessingConfig): void {
        // 移除现有的后处理效果
        this.clearPasses();

        // 添加渲染通道
        this.composer.addPass(this.renderPass);

        // 添加 Bloom 效果
        if (config.bloom) {
            this.bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                config.bloom.strength,
                config.bloom.radius,
                config.bloom.threshold
            );
            this.composer.addPass(this.bloomPass);
        }

        // 添加 Film 效果
        if (config.film) {
            this.filmPass = new FilmPass(
                config.film.noiseIntensity,
                config.film.scanlineIntensity,
                config.film.scanlineCount,
                config.film.grayscale
            );
            this.filmPass.renderToScreen = true;
            this.composer.addPass(this.filmPass);
        }

        // 添加 Bokeh 效果
        if (config.bokeh) {
            this.bokehPass = new BokehPass(
                this.renderPass.scene,
                this.renderPass.camera,
                {
                    focus: config.bokeh.focus,
                    aperture: config.bokeh.aperture,
                    maxblur: config.bokeh.maxblur,
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            );
            this.bokehPass.renderToScreen = true;
            this.composer.addPass(this.bokehPass);
    }

    // 如果没有设置 renderToScreen 的通道，设置最后一个通道为 renderToScreen
    if (!config.film && !config.bokeh) {
      const passes = this.composer.passes;
      if (passes.length > 0) {
        passes[passes.length - 1].renderToScreen = true;
      }
    }
  }

  // 清除所有后处理效果
  clearPasses(): void {
    // 保留 renderPass，移除其他通道
    const passes = this.composer.passes.filter(pass => pass === this.renderPass);
    this.composer.passes = passes;
    this.bloomPass = null;
    this.filmPass = null;
    this.bokehPass = null;
  }

  // 更新后处理效果
  update(deltaTime: number): void {
    // 可以在这里添加动态更新后处理效果的逻辑
  }

  // 调整大小
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  // 获取 composer
  getComposer(): EffectComposer {
    return this.composer;
  }

  // 渲染
  render(): void {
    this.composer.render();
  }

  // 重置
  reset(): void {
    this.clearPasses();
    this.composer.addPass(this.renderPass);
  }
}

export default PostProcessingManager;