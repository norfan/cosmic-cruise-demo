import * as THREE from 'three';
import { EventBus } from './EventBus';
import { useGameStore } from '../stores/GameStore';

// 事件类型
export type EventType =
  | 'energyCloud'      // 能量云
  | 'asteroidField'    // 陨石带
  | 'spaceStation'     // 空间站
  | 'gravitationalAnomaly' // 引力异常
  | 'energyStorm'      // 能量风暴
  | 'alienSignal'      // 外星信号
  | 'creationFragment'; // 创世碎片

// 事件接口
export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  position: THREE.Vector3;
  radius: number;
  duration: number; // 事件持续时间（秒）
  cooldown: number; // 冷却时间（秒）
  active: boolean;
  completed: boolean;

  init(): void;
  update(deltaTime: number): void;
  trigger(): void;
  complete(): void;
  dispose(): void;
}

// 事件配置
export interface EventConfig {
  type: EventType;
  position: THREE.Vector3;
  radius?: number;
  duration?: number;
  cooldown?: number;
}

// 事件基类
export abstract class BaseEvent implements GameEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  position: THREE.Vector3;
  radius: number;
  duration: number;
  cooldown: number;
  active: boolean;
  completed: boolean;
  elapsedTime: number;
  cooldownTime: number;

  protected scene: THREE.Scene;
  protected eventBus: EventBus;

  constructor(config: EventConfig, scene: THREE.Scene, eventBus: EventBus) {
    this.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.position = config.position;
    this.radius = config.radius || 5;
    this.duration = config.duration || 10;
    this.cooldown = config.cooldown || 30;
    this.active = false;
    this.completed = false;
    this.elapsedTime = 0;
    this.cooldownTime = 0;
    this.scene = scene;
    this.eventBus = eventBus;
    this.name = this.getName();
    this.description = this.getDescription();
  }

  abstract getName(): string;
  abstract getDescription(): string;
  abstract init(): void;
  abstract trigger(): void;
  abstract complete(): void;

  update(deltaTime: number): void {
    if (this.active) {
      this.elapsedTime += deltaTime;
      if (this.elapsedTime >= this.duration) {
        this.complete();
      }
    } else if (this.completed) {
      this.cooldownTime += deltaTime;
      if (this.cooldownTime >= this.cooldown) {
        this.reset();
      }
    }
  }

  reset(): void {
    this.active = false;
    this.completed = false;
    this.elapsedTime = 0;
    this.cooldownTime = 0;
  }

  dispose(): void {
    // 清理事件资源
  }
}

// 能量云事件
export class EnergyCloudEvent extends BaseEvent {
  private cloudMesh: THREE.Mesh | null = null;

  getName(): string {
    return '能量云';
  }

  getDescription(): string {
    return '发现漂浮的能量云，收集能量';
  }

  init(): void {
    // 创建能量云效果
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.cloudMesh = new THREE.Mesh(geometry, material);
    this.cloudMesh.position.copy(this.position);
    this.scene.add(this.cloudMesh);
  }

  trigger(): void {
    this.active = true;
    console.log(`[Event] Triggered: ${this.name}`);
    const addEnergy = useGameStore.getState().addEnergy;
    addEnergy(25);
    this.eventBus.emit('gameEventTriggered', { type: this.type, name: this.name });
  }

  complete(): void {
    this.completed = true;
    this.active = false;
    console.log(`事件完成: ${this.name}`);
    if (this.cloudMesh) {
      this.scene.remove(this.cloudMesh);
      this.cloudMesh.geometry.dispose();
      (this.cloudMesh.material as THREE.Material).dispose();
      this.cloudMesh = null;
    }
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    if (this.active && this.cloudMesh) {
      // 能量云动画
      this.cloudMesh.scale.setScalar(1 + Math.sin(Date.now() * 0.001) * 0.1);
    }
  }

  dispose(): void {
    if (this.cloudMesh) {
      this.scene.remove(this.cloudMesh);
      this.cloudMesh.geometry.dispose();
      (this.cloudMesh.material as THREE.Material).dispose();
      this.cloudMesh = null;
    }
  }
}

// 事件管理器
export class EventManager {
  private events: Map<string, GameEvent> = new Map();
  private scene: THREE.Scene;
  private eventBus: EventBus;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  addEvent(config: EventConfig): GameEvent {
    let event: GameEvent;
    switch (config.type) {
      case 'energyCloud':
        event = new EnergyCloudEvent(config, this.scene, this.eventBus);
        break;
      default:
        throw new Error(`Unknown event type: ${config.type}`);
    }
    event.init();
    this.events.set(event.id, event);
    return event;
  }

  removeEvent(id: string): void {
    const event = this.events.get(id);
    if (event) {
      event.dispose();
      this.events.delete(id);
    }
  }

  update(deltaTime: number): void {
    this.events.forEach((event) => event.update(deltaTime));
  }

  getEvents(): GameEvent[] {
    return Array.from(this.events.values());
  }

  getActiveEvents(): GameEvent[] {
    return Array.from(this.events.values()).filter((event) => event.active);
  }

  clear(): void {
    this.events.forEach((event) => event.dispose());
    this.events.clear();
  }
}

export default EventManager;