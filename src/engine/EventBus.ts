/**
 * EventBus - 事件总线
 * 提供事件发布/订阅机制，解耦游戏模块
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
  callback: EventCallback;
  namespace?: string;
}

class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventSubscription[]> = new Map();
  private onceListeners: Map<string, EventSubscription[]> = new Map();

  private constructor() {
    // 单例模式
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  static get Instance(): EventBus {
    return EventBus.getInstance();
  }

  /**
   * 订阅事件
   * @param event 事件名
   * @param callback 回调函数
   * @param namespace 命名空间（用于批量取消订阅）
   */
  on<T = unknown>(event: string, callback: EventCallback<T>, namespace?: string): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback: callback as EventCallback, namespace });
  }

  /**
   * 订阅一次性事件
   * @param event 事件名
   * @param callback 回调函数
   */
  once<T = unknown>(event: string, callback: EventCallback<T>): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event)!.push({ callback: callback as EventCallback });
  }

  /**
   * 发布事件
   * @param event 事件名
   * @param data 事件数据
   */
  emit<T = unknown>(event: string, data?: T): void {
    // 执行普通监听器
    const normalListeners = this.listeners.get(event);
    if (normalListeners) {
      normalListeners.forEach(({ callback }) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in listener for event "${event}":`, error);
        }
      });
    }

    // 执行一次性监听器
    const onceListeners = this.onceListeners.get(event);
    if (onceListeners) {
      onceListeners.forEach(({ callback }) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in once listener for event "${event}":`, error);
        }
      });
      this.onceListeners.delete(event);
    }
  }

  /**
   * 取消订阅
   * @param event 事件名
   * @param callback 要取消的回调函数（不传则取消该事件所有监听器）
   */
  off<T = unknown>(event: string, callback?: EventCallback<T>): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const listeners = this.listeners.get(event);
    if (listeners) {
      const filtered = listeners.filter((l) => l.callback !== callback);
      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    }
  }

  /**
   * 取消指定命名空间的所有订阅
   * @param namespace 命名空间
   */
  offNamespace(namespace: string): void {
    this.listeners.forEach((listeners, event) => {
      const filtered = listeners.filter((l) => l.namespace !== namespace);
      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    });
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(event: string): number {
    return (this.listeners.get(event)?.length || 0) + (this.onceListeners.get(event)?.length || 0);
  }

  /**
   * 检查是否有监听器
   */
  hasListeners(event: string): boolean {
    return this.getListenerCount(event) > 0;
  }
}

export const eventBus = EventBus.getInstance();
export { EventBus };
export default EventBus;
