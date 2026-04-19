/**
 * Renderer - Three.js 渲染器封装
 */

import * as THREE from 'three';

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  pixelRatio?: number;
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  memory: {
    geometries: number;
    textures: number;
  };
}

class Renderer {
  private renderer: THREE.WebGLRenderer;
  private pixelRatio: number;
  private size: { width: number; height: number };

  constructor(config: RendererConfig) {
    this.pixelRatio = config.pixelRatio ?? Math.min(window.devicePixelRatio, 2);

    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? true,
      powerPreference: config.powerPreference ?? 'high-performance',
    });

    this.renderer.setPixelRatio(this.pixelRatio);
    this.size = { width: 0, height: 0 };

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const container = this.renderer.domElement.parentElement;
    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.setSize(width, height);
    }
  };

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  setSize(width: number, height: number): void {
    this.size = { width, height };
    this.renderer.setSize(width, height, false);
  }

  getSize(): { width: number; height: number } {
    return { ...this.size };
  }

  setPixelRatio(ratio: number): void {
    this.pixelRatio = Math.min(ratio, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  setClearColor(color: THREE.Color | string | number): void {
    this.renderer.setClearColor(color as THREE.ColorRepresentation);
  }

  getStats(): RenderStats {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
    };
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}

export default Renderer;
