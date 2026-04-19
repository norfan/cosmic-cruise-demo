/**
 * SpriteTestScene - 单精灵测试场景
 *
 * 提供一个完整的独立测试页面逻辑：
 *   - 下拉菜单切换精灵
 *   - 参数面板（可选）
 *   - 实时 FPS
 *
 * 用法（在 HTML 页面中）：
 *   import { SpriteTestScene } from './SpriteTestScene';
 *   const scene = new SpriteTestScene('#canvas', '#controls');
 *   scene.register('ocean', OceanSprite, { tier: 0 });
 *   scene.register('earth', EarthSprite, { tier: 1 });
 *   scene.select('ocean');
 */

import * as THREE from 'three';
import { TestRunner, TestRunnerConfig } from '../TestRunner';
import { Sprite, SpriteConfig } from '../../src/sprites/Sprite';

interface RegisteredSprite {
  SpriteClass: new (config?: SpriteConfig) => Sprite;
  config: SpriteConfig;
  label: string;
}

export class SpriteTestScene {
  private runner: TestRunner;
  private registry: Map<string, RegisteredSprite> = new Map();
  private currentKey: string | null = null;

  constructor(canvas: HTMLCanvasElement, runnerConfig: TestRunnerConfig = {}) {
    this.runner = new TestRunner(canvas, {
      showStats: true,
      ...runnerConfig,
    });
  }

  /**
   * 注册一个精灵类型到测试场景
   * @param key    唯一键名（如 'ocean'）
   * @param SpriteClass 精灵类
   * @param config 初始化配置
   * @param label  下拉菜单展示标签
   */
  register<T extends Sprite>(
    key: string,
    SpriteClass: new (config?: SpriteConfig) => T,
    config: SpriteConfig = {},
    label?: string
  ): this {
    this.registry.set(key, {
      SpriteClass: SpriteClass as new (config?: SpriteConfig) => Sprite,
      config,
      label: label ?? key,
    });
    return this;
  }

  /**
   * 切换当前显示的精灵
   */
  select(key: string): void {
    const entry = this.registry.get(key);
    if (!entry) {
      console.warn(`[SpriteTestScene] Unknown sprite key: "${key}"`);
      return;
    }
    this.currentKey = key;
    this.runner.reloadSprite(entry.SpriteClass, entry.config);
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    this.runner.start();
  }

  /**
   * 停止并销毁
   */
  destroy(): void {
    this.runner.destroy();
  }

  /**
   * 构建一个 <select> 下拉菜单，绑定 onChange 切换精灵
   * @param container 挂载容器
   */
  buildSelectUI(container: HTMLElement): HTMLSelectElement {
    const select = document.createElement('select');
    select.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:9999;background:#1a1f4e;color:#e8e8f0;border:1px solid #00d4ff;padding:4px 8px;border-radius:4px;font-size:13px;cursor:pointer;';

    this.registry.forEach((entry, key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = entry.label;
      if (key === this.currentKey) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      this.select(select.value);
    });

    container.appendChild(select);
    return select;
  }

  // ── 访问器 ─────────────────────────────────

  getRunner(): TestRunner {
    return this.runner;
  }

  getCurrentKey(): string | null {
    return this.currentKey;
  }

  getRegisteredKeys(): string[] {
    return Array.from(this.registry.keys());
  }
}

export default SpriteTestScene;
