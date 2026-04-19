/**
 * GameLoop - 游戏循环
 * 基于 RAF 的固定时间步长游戏循环
 */

export interface GameLoopCallbacks {
  update?: (deltaTime: number, totalTime: number) => void;
  render?: () => void;
  lateUpdate?: (deltaTime: number) => void;
}

export interface GameLoopStats {
  fps: number;
  deltaTime: number;
  totalTime: number;
  frameCount: number;
}

class GameLoop {
  private static instance: GameLoop;

  private isRunning = false;
  private isPaused = false;
  private animationFrameId: number | null = null;

  private lastTimestamp = 0;
  private deltaTime = 0;
  private totalTime = 0;
  private frameCount = 0;

  // 固定时间步长
  private readonly FIXED_DELTA_TIME = 1 / 60; // 60 FPS
  private accumulatedTime = 0;

  // FPS 计算
  private fpsFrameCount = 0;
  private fpsTimeAccumulator = 0;
  private currentFps = 0;

  // 回调
  private callbacks: GameLoopCallbacks = {};

  // 调试模式
  private debugMode = false;

  private constructor() {
    // 单例模式
  }

  static getInstance(): GameLoop {
    if (!GameLoop.instance) {
      GameLoop.instance = new GameLoop();
    }
    return GameLoop.instance;
  }

  static get Instance(): GameLoop {
    return GameLoop.getInstance();
  }

  /**
   * 启动游戏循环
   */
  start(callbacks: GameLoopCallbacks = {}): void {
    if (this.isRunning) {
      console.warn('[GameLoop] Already running');
      return;
    }

    this.callbacks = callbacks;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.frameCount = 0;
    this.totalTime = 0;
    this.accumulatedTime = 0;

    this.loop(this.lastTimestamp);
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    if (!this.isRunning) return;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * 暂停游戏循环
   */
  pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
  }

  /**
   * 恢复游戏循环
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.accumulatedTime = 0;
  }

  /**
   * 切换暂停状态
   */
  togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * 检查是否暂停
   */
  isGamePaused(): boolean {
    return this.isPaused;
  }

  /**
   * 检查是否运行中
   */
  isGameRunning(): boolean {
    return this.isRunning && !this.isPaused;
  }

  /**
   * 获取当前统计信息
   */
  getStats(): GameLoopStats {
    return {
      fps: this.currentFps,
      deltaTime: this.deltaTime,
      totalTime: this.totalTime,
      frameCount: this.frameCount,
    };
  }

  /**
   * 启用/禁用调试模式
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * 设置更新回调
   */
  setUpdateCallback(callback: (deltaTime: number, totalTime: number) => void): void {
    this.callbacks.update = callback;
  }

  /**
   * 设置渲染回调
   */
  setRenderCallback(callback: () => void): void {
    this.callbacks.render = callback;
  }

  /**
   * 设置后更新回调
   */
  setLateUpdateCallback(callback: (deltaTime: number) => void): void {
    this.callbacks.lateUpdate = callback;
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;

    // 计算 deltaTime
    let deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // 限制最大 deltaTime（防止跳帧）
    if (deltaTime > 0.25) {
      deltaTime = 0.25;
    }

    // 如果暂停，不更新时间
    if (!this.isPaused) {
      this.deltaTime = deltaTime;
      this.totalTime += deltaTime;
      this.frameCount++;
      this.accumulatedTime += deltaTime;

      // FPS 计算
      this.fpsFrameCount++;
      this.fpsTimeAccumulator += deltaTime;
      if (this.fpsTimeAccumulator >= 1.0) {
        this.currentFps = this.fpsFrameCount;
        this.fpsFrameCount = 0;
        this.fpsTimeAccumulator = 0;

        if (this.debugMode) {
          console.log(`[GameLoop] FPS: ${this.currentFps}, Frame: ${this.frameCount}, Time: ${this.totalTime.toFixed(2)}s`);
        }
      }

      // 固定时间步长更新循环
      while (this.accumulatedTime >= this.FIXED_DELTA_TIME) {
        if (this.callbacks.update) {
          this.callbacks.update(this.FIXED_DELTA_TIME, this.totalTime);
        }
        this.accumulatedTime -= this.FIXED_DELTA_TIME;
      }

      // 后更新（物理同步等）
      if (this.callbacks.lateUpdate) {
        this.callbacks.lateUpdate(this.deltaTime);
      }

      // 渲染
      if (this.callbacks.render) {
        this.callbacks.render();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}

export const gameLoop = GameLoop.getInstance();
export { GameLoop };
export default GameLoop;
