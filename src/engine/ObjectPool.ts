/**
 * ObjectPool - 对象池
 * 复用对象实例，减少 GC 压力
 */

export interface ObjectPool<T> {
  acquire(): T;
  release(obj: T): void;
  preload(count: number): void;
  dispose(): void;
  getActiveCount(): number;
  getPooledCount(): number;
}

export interface Poolable {
  reset?(): void;
}

type Factory<T> = () => T;
type ResetFn<T> = (obj: T) => void;

export class GenericObjectPool<T> implements ObjectPool<T> {
  private factory: Factory<T>;
  private resetFn?: ResetFn<T>;
  private pool: T[] = [];
  private activeObjects: Set<T> = new Set();
  private maxPoolSize: number;

  constructor(factory: Factory<T>, resetFn?: ResetFn<T>, maxPoolSize = 100) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxPoolSize = maxPoolSize;
  }

  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }

    this.activeObjects.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      console.warn('[ObjectPool] Attempting to release an object that is not active');
      return;
    }

    this.activeObjects.delete(obj);

    // 调用重置函数
    if (this.resetFn) {
      this.resetFn(obj);
    } else {
      const poolable = obj as Poolable;
      if (typeof poolable.reset === 'function') {
        poolable.reset();
      }
    }

    // 放回池中
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(obj);
    }
  }

  preload(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  dispose(): void {
    this.pool = [];
    this.activeObjects.clear();
  }

  getActiveCount(): number {
    return this.activeObjects.size;
  }

  getPooledCount(): number {
    return this.pool.length;
  }
}

// 预创建的常用池
export class Vector3Pool extends GenericObjectPool<{ x: number; y: number; z: number }> {
  constructor(maxPoolSize = 200) {
    super(
      () => ({ x: 0, y: 0, z: 0 }),
      (v) => {
        v.x = 0;
        v.y = 0;
        v.z = 0;
      },
      maxPoolSize
    );
  }
}

export class PoolManager {
  private pools: Map<string, ObjectPool<unknown>> = new Map();

  register<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  get<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name) as ObjectPool<T> | undefined;
  }

  disposeAll(): void {
    this.pools.forEach((pool) => pool.dispose());
    this.pools.clear();
  }

  getPoolCount(): number {
    return this.pools.size;
  }
}

export const poolManager = new PoolManager();
