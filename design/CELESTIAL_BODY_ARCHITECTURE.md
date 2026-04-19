# Cosmic Cruise - 天体组件系统架构设计

> 本文档定义宇宙天体组件的层次结构、继承关系、通用接口和动态加载机制。

---

## 1. 设计目标

### 1.1 核心目标

- **组件化**: 每种天体类型独立封装，可单独存在
- **继承层次**: 基础模型 + 变体实现，便于扩展
- **动态组合**: 天体通过配置动态加载到场景空间
- **可复用性**: 同一基础模型可生成多种变体

### 1.2 设计原则

- 基础类只定义通用接口和默认行为
- 变体类通过覆写或组合扩展特定行为
- 场景空间，天体组件，渲染器三者分离
- 使用对象池避免 GC 压力

---

## 2. 天体类型层次结构

```
CelestialBody (天体基类)
├── StaticBody (静态天体 - 无物理模拟)
│   ├── Star (恒星)
│   │   ├── YellowStar (黄矮星)
│   │   ├── RedGiant (红巨星)
│   │   ├── BlueGiant (蓝巨星)
│   │   ├── WhiteDwarf (白矮星)
│   │   └── NeutronStar (中子星)
│   ├── Planet (行星)
│   │   ├── TerrestrialPlanet (类地行星)
│   │   ├── GasGiant (气态巨行星)
│   │   ├── IceGiant (冰巨行星)
│   │   ├── LavaPlanet (熔岩行星)
│   │   └── OceanPlanet (海洋行星)
│   ├── Moon (卫星)
│   │   ├── RockyMoon (岩卫星)
│   │   ├── IceMoon (冰卫星)
│   │   ├── VolcanicMoon (火山卫星)
│   │   └── RingedMoon (环状卫星)
│   └── Nebula (星云)
│       ├── EmissionNebula (发射星云)
│       ├── DarkNebula (暗星云)
│       └── PlanetaryNebula (行星状星云)
├── DynamicBody (动态天体 - 有物理模拟)
│   ├── Asteroid (小行星)
│   │   ├── RockyAsteroid (岩质小行星)
│   │   └── MetallicAsteroid (金属小行星)
│   ├── Comet (彗星)
│   └── SpaceDebris (空间碎片)
├── CosmicObject (宇宙特殊对象)
│   ├── BlackHole (黑洞)
│   ├── WormHole (虫洞)
│   ├── Pulsar (脉冲星)
│   └── SupernovaRemnant (超新星遗迹)
└── Galaxy (星系)
    ├── SpiralGalaxy (螺旋星系)
    ├── EllipticalGalaxy (椭圆星系)
    └── IrregularGalaxy (不规则星系)
```

---

## 3. 基础类定义

### 3.1 CelestialBody (天体基类)

```typescript
import * as THREE from 'three';

interface CelestialBodyConfig {
  id: string;                    // 唯一标识
  name: string;                  // 名称
  type: CelestialBodyType;       // 类型枚举
  tier: number;                  // 所属文明等级 (0-7)
  position: Vector3D;            // 3D 位置
  rotation: Euler;              // 旋转角度
  scale: number;                 // 缩放比例
  modelPath?: string;            // GLTF 模型路径
  texturePath?: string;          // 纹理路径
  orbitRadius?: number;          // 轨道半径 (若在轨道上)
  orbitSpeed?: number;           // 轨道速度
  orbitCenter?: Vector3D;        // 轨道中心
}

abstract class CelestialBody {
  // 核心属性
  id: string;
  name: string;
  type: CelestialBodyType;
  tier: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;

  // Three.js 渲染相关
  mesh: THREE.Object3D;           // Three.js 对象
  material: THREE.Material;       // 材质
  boundingSphere: THREE.Sphere;  // 包围球 (用于碰撞检测)

  // 生命周期
  abstract init(config: CelestialBodyConfig): void;
  abstract update(deltaTime: number): void;
  abstract dispose(): void;

  // 工具方法
  getBoundingSphere(): THREE.Sphere;
  containsPoint(point: THREE.Vector3): boolean;
  distanceTo(other: CelestialBody): number;
}
```

### 3.2 StaticBody (静态天体基类)

继承自 `CelestialBody`，用于恒星、行星、星云等位置相对固定的天体。
Three.js 中使用 `THREE.Mesh` + `THREE.PointLight` / `THREE.SpotLight` 实现发光效果。

```typescript
import * as THREE from 'three';

abstract class StaticBody extends CelestialBody {
  // 静态天体特有属性
  isInteractive: boolean;          // 是否可交互
  glowIntensity: number;           // 光晕强度
  pulsePhase: number;               // 脉冲相位 (用于发光天体)
  light: THREE.Light | null;        // 光源 (恒星)

  // Three.js 覆写
  mesh: THREE.Mesh;

  // 覆写更新逻辑
  update(deltaTime: number): void {
    this.pulsePhase += deltaTime * this.pulseSpeed;
    this.updateGlow();
  }

  // 子类可覆写
  updateGlow(): void {
    if (this.light) {
      (this.light as THREE.PointLight).intensity =
        this.baseLightIntensity * (0.8 + Math.sin(this.pulsePhase) * 0.2);
    }
  }

  onInteract?(player: Player): InteractionResult;
}
```

### 3.3 DynamicBody (动态天体基类)

继承自 `CelestialBody`，用于小行星、彗星等需要物理模拟的天体。
Three.js 中使用 `THREE.InstancedMesh` 优化批量渲染。

```typescript
abstract class DynamicBody extends CelestialBody {
  // 物理属性
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  restitution: number;              // 弹性系数

  // 运动轨迹
  trajectory: TrajectoryType;        // 直线/抛物线/椭圆
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitCenter?: THREE.Vector3;

  // 碰撞
  hitRadius: number;
  isCollidable: boolean;

  abstract update(deltaTime: number): void;
  abstract onCollision(other: CelestialBody): void;

  applyForce(force: THREE.Vector3): void;
  updatePhysics(deltaTime: number): void;
}
```

---

## 4. 场景空间系统 (SpaceScene - Three.js)

### 4.1 核心概念

场景空间基于 Three.js `Scene` 构建，管理所有天体组件的加载、卸载和更新。
支持后处理效果（Bloom 发光、黑洞引力透镜等）。

```typescript
import * as THREE from 'three';

interface SpaceSceneConfig {
  tier: number;                      // 文明等级
  backgroundColor: THREE.Color;      // 背景色
  ambientLightIntensity: number;      // 环境光强度
  gravityCenter?: THREE.Vector3;      // 引力中心
  gravityStrength?: number;           // 引力强度
  fogDensity?: number;               // 雾密度
}

class SpaceScene {
  private config: SpaceSceneConfig;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bodies: Map<string, CelestialBody>;
  private renderLayers: RenderLayer[];
  private eventBus: EventBus;
  private composer: THREE.EffectComposer;  // 后处理

  // Three.js 特有
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  // 动态加载/卸载
  loadBody<T extends CelestialBody>(
    bodyClass: new () => T,
    config: CelestialBodyConfig
  ): T;

  unloadBody(id: string): void;
  loadBodiesFromConfig(configList: CelestialBodyConfig[]): void;
  clearScene(): void;

  // 渲染层管理
  addRenderLayer(layer: RenderLayer): void;
  getBodiesInRadius(position: THREE.Vector3, radius: number): CelestialBody[];

  // 主循环
  update(deltaTime: number): void;
  render(): void {
    this.composer.render();
  }
}
```

### 4.2 渲染层级 (RenderLayer - Three.js)

Three.js 通过 `THREE.Layers` 实现渲染层级分离。

```typescript
import * as THREE from 'three';

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
```

### 4.3 后处理效果

Three.js 的 `EffectComposer` 支持多种后处理效果：

| 效果 | 用途 | 性能成本 |
|------|------|----------|
| UnrealBloomPass | 恒星/能量发光 | 中 |
| BokehPass | 黑洞景深 | 高 |
| FilmPass | 胶片颗粒 | 低 |
| ShaderPass | 自定义引力透镜 | 高 |

```typescript
// 后处理配置示例
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));

const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(width, height),
  1.5,   // strength
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);
```

---

## 5. 天体组件继承示例 (Three.js)

### 5.1 Star (恒星) 基础类

```typescript
import * as THREE from 'three';

abstract class Star extends StaticBody {
  // 恒星特有属性
  starType: StarType;
  temperature: number;               // 表面温度 (K)
  luminosity: number;               // 光度
  radius: number;                   // 半径
  color: THREE.Color;               // 基础颜色
  coronaColor: THREE.Color;         // 日冕颜色
  pulseSpeed: number;               // 脉冲速度
  flareChance: number;              // 耀斑概率

  // Three.js 光源
  pointLight: THREE.PointLight;

  // 恒星特有方法
  createCorona(): THREE.Mesh;        // 创建日冕球
  generateFlare(): void;             // 生成耀斑
  updateCorona(deltaTime: number): void;

  // 默认渲染：带 PointLight 的球体 + 日冕
  init(config: CelestialBodyConfig): void {
    super.init(config);

    // 创建恒星球体
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 1.0,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    // 创建 PointLight
    this.pointLight = new THREE.PointLight(
      this.color,
      this.luminosity * 2,
      this.radius * 10
    );
    this.mesh.add(this.pointLight);

    // 创建日冕
    this.createCorona();
  }
}
```

### 5.2 YellowStar (黄矮星) 实现

```typescript
import * as THREE from 'three';

class YellowStar extends Star {
  init(config: CelestialBodyConfig): void {
    this.starType = 'yellow';
    this.temperature = 5800;        // 黄矮星约 5800K
    this.luminosity = 1.0;
    this.radius = 50;
    this.color = new THREE.Color(0xFFF4E0);
    this.coronaColor = new THREE.Color(0xFFD700);
    this.pulseSpeed = 0.5;
    this.flareChance = 0.02;

    super.init(config);
  }

  createCorona(): THREE.Mesh {
    // 创建日冕球 (半透明发光球)
    const geometry = new THREE.SphereGeometry(this.radius * 1.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.coronaColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const corona = new THREE.Mesh(geometry, material);
    this.mesh.add(corona);
    return corona;
  }
}
```

### 5.3 BlackHole (黑洞) 实现

Three.js 实现黑洞需要带 `UnrealBloomPass` 后处理的引力透镜效果。

```typescript
class BlackHole extends CosmicObject {
  accretionDisk: THREE.Mesh;        // 吸积盘
  eventHorizon: THREE.Mesh;         // 事件视界
  gravitationalLens: boolean;       // 是否启用引力透镜

  init(config: CelestialBodyConfig): void {
    this.type = 'blackHole';
    this.radius = config.radius || 30;
    this.gravitationalLens = true;

    // 事件视界 (黑色球体)
    const horizonGeometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const horizonMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
    });
    this.eventHorizon = new THREE.Mesh(horizonGeometry, horizonMaterial);

    // 吸积盘 (环形粒子)
    const diskGeometry = new THREE.RingGeometry(
      this.radius * 2,
      this.radius * 4,
      64
    );
    const diskMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF6B35,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    this.accretionDisk.rotation.x = Math.PI / 2;

    // 组合
    this.mesh = new THREE.Group();
    this.mesh.add(this.eventHorizon);
    this.mesh.add(this.accretionDisk);
  }

  update(deltaTime: number): void {
    // 吸积盘旋转
    this.accretionDisk.rotation.z += deltaTime * 0.5;
  }
}
```

---

## 6. 动态加载机制

### 6.1 天体工厂 (CelestialBodyFactory)

```typescript
// 注册表
const bodyRegistry: Map<string, new () => CelestialBody> = new Map();

// 注册天体类型
function registerBody(type: string, bodyClass: new () => CelestialBody): void {
  bodyRegistry.set(type, bodyClass);
}

// 工厂方法
function createBody(type: string, config: CelestialBodyConfig): CelestialBody {
  const BodyClass = bodyRegistry.get(type);
  if (!BodyClass) {
    throw new Error(`Unknown celestial body type: ${type}`);
  }
  const body = new BodyClass();
  body.init(config);
  return body;
}

// 使用示例
registerBody('yellowStar', YellowStar);
registerBody('redGiant', RedGiant);
registerBody('blueGiant', BlueGiant);
```

### 6.2 场景配置文件

每个场景通过 JSON 配置加载天体：

```json
{
  "tier": 2,
  "name": "恒星文明 - 太阳系",
  "background": {
    "color": "#050510",
    "starDensity": 500
  },
  "celestialBodies": [
    {
      "id": "sun",
      "type": "yellowStar",
      "position": { "x": 400, "y": 300 },
      "scale": 1.0
    },
    {
      "id": "mercury",
      "type": "rockyPlanet",
      "orbitRadius": 80,
      "orbitSpeed": 0.04,
      "orbitCenter": { "x": 400, "y": 300 },
      "scale": 0.3
    },
    {
      "id": "venus",
      "type": "lavaPlanet",
      "orbitRadius": 120,
      "orbitSpeed": 0.03,
      "orbitCenter": { "x": 400, "y": 300 },
      "scale": 0.4
    },
    {
      "id": "asteroidBelt",
      "type": "asteroidField",
      "orbitRadius": 200,
      "orbitSpeed": 0.01,
      "count": 50
    }
  ]
}
```

---

## 7. 对象池管理

### 7.1 对象池接口

```typescript
interface ObjectPool<T> {
  acquire(): T;
  release(obj: T): void;
  preload(count: number): void;
  dispose(): void;
}
```

### 7.2 天体对象池实现

```typescript
class CelestialBodyPool implements ObjectPool<CelestialBody> {
  private pools: Map<string, CelestialBody[]> = new Map();
  private activeBodies: Set<CelestialBody> = new Set();

  acquire(type: string, config: CelestialBodyConfig): CelestialBody {
    const pool = this.pools.get(type) || [];
    let body: CelestialBody;

    if (pool.length > 0) {
      body = pool.pop()!;
      body.init(config);
    } else {
      body = createBody(type, config);
    }

    this.activeBodies.add(body);
    return body;
  }

  release(body: CelestialBody): void {
    if (!this.activeBodies.has(body)) return;
    this.activeBodies.delete(body);

    const pool = this.pools.get(body.type) || [];
    pool.push(body);
    this.pools.set(body.type, pool);
  }

  dispose(): void {
    // 清理所有对象
  }
}
```

---

## 8. 继承关系速查表

| 基类 | 子类 | 核心差异 | 示例配置 |
|------|------|----------|----------|
| **Star** | YellowStar | 温度5800K，中等光度 | 太阳 |
| | RedGiant | 温度3500K，高光度，大半径 | 心宿二 |
| | BlueGiant | 温度20000K，极高光度 | 参宿七 |
| | WhiteDwarf | 温度10000K，小体积，高密度 | 天狼星B |
| | NeutronStar | 极端密度，强磁场 | 脉冲星 |
| **Planet** | TerrestrialPlanet | 岩石表面，可有大气 | 地球、火星 |
| | GasGiant | 无固体表面，环带 | 木星、土星 |
| | IceGiant | 冰质，大气含甲烷 | 天王星、海王星 |
| | LavaPlanet | 熔岩表面 | 开普勒-78b |
| | OceanPlanet | 液态表面 | 格利苏581c |
| **Moon** | RockyMoon | 陨石坑，表面荒凉 | 月球 |
| | IceMoon | 冰表面，冰火山 | 欧罗巴 |
| | VolcanicMoon | 活跃火山 | 木卫一 |
| | RingedMoon | 有行星环 | 土卫六 |
| **DynamicBody** | Asteroid | 轨道随机，碰撞风险 | 谷神星 |
| | Comet | 椭圆轨道，彗尾 | 哈雷彗星 |
| **CosmicObject** | BlackHole | 引力透镜，事件视界 | 人马座A* |
| | WormHole | 传送门效果 | 理论模型 |
| **Galaxy** | SpiralGalaxy | 旋臂结构 | 银河系 |
| | EllipticalGalaxy | 椭圆形状 | M87 |
| | IrregularGalaxy | 无规则形状 | 大麦哲伦云 |

---

## 9. 文件结构

```
src/
├── engine/
│   ├── GameLoop.ts              # RAF游戏循环
│   ├── Entity.ts                # 实体基类
│   ├── Physics.ts               # 2D物理引擎
│   ├── EventBus.ts              # 事件总线
│   └── ObjectPool.ts           # 对象池
├── renderer/
│   ├── Renderer.ts              # Three.js 渲染器封装
│   ├── Camera.ts                # 相机控制
│   └── PostProcessing.ts        # 后处理效果
├── celestial/
│   ├── CelestialBody.ts         # 天体基类
│   ├── StaticBody.ts            # 静态天体基类
│   ├── DynamicBody.ts           # 动态天体基类
│   ├── CosmicObject.ts          # 宇宙特殊对象基类
│   ├── Galaxy.ts
│   │
│   ├── stars/
│   │   ├── Star.ts              # 恒星基类
│   │   ├── YellowStar.ts        # 黄矮星
│   │   ├── RedGiant.ts          # 红巨星
│   │   ├── BlueGiant.ts         # 蓝巨星
│   │   ├── WhiteDwarf.ts        # 白矮星
│   │   └── NeutronStar.ts       # 中子星
│   │
│   ├── planets/
│   │   ├── Planet.ts            # 行星基类
│   │   ├── TerrestrialPlanet.ts # 类地行星
│   │   ├── GasGiant.ts          # 气态巨行星
│   │   ├── IceGiant.ts          # 冰巨行星
│   │   ├── LavaPlanet.ts        # 熔岩行星
│   │   └── OceanPlanet.ts       # 海洋行星
│   │
│   ├── moons/
│   │   ├── Moon.ts              # 卫星基类
│   │   ├── RockyMoon.ts         # 岩卫星
│   │   ├── IceMoon.ts           # 冰卫星
│   │   ├── VolcanicMoon.ts      # 火山卫星
│   │   └── RingedMoon.ts        # 环状卫星
│   │
│   ├── asteroids/
│   │   ├── Asteroid.ts          # 小行星基类
│   │   ├── RockyAsteroid.ts     # 岩质小行星
│   │   └── MetallicAsteroid.ts  # 金属小行星
│   │
│   ├── comets/
│   │   └── Comet.ts             # 彗星
│   │
│   └── cosmic/
│       ├── BlackHole.ts          # 黑洞
│       ├── WormHole.ts          # 虫洞
│       ├── Pulsar.ts            # 脉冲星
│       └── SupernovaRemnant.ts  # 超新星遗迹
│
├── scenes/
│   ├── SpaceScene.ts            # Three.js 场景管理
│   ├── RenderLayer.ts           # 渲染层级
│   │
│   ├── Tier0Scene.ts            # 原始文明
│   ├── Tier1Scene.ts            # 行星文明
│   ├── Tier2Scene.ts            # 恒星文明
│   ├── Tier3Scene.ts            # 星系文明
│   ├── Tier4Scene.ts            # 宇宙文明
│   ├── Tier5Scene.ts            # 多维文明
│   ├── Tier6Scene.ts            # 边缘文明
│   └── Tier7Scene.ts            # 创世文明
│
├── factory/
│   ├── CelestialBodyFactory.ts  # 天体工厂
│   └── SceneConfigLoader.ts     # 场景配置加载器
│
├── config/
│   ├── celestial-bodies.json    # 天体类型注册
│   └── scenes/                  # 各场景 JSON 配置
│       ├── tier0.json
│       ├── tier1.json
│       └── ...
│
└── effects/
    ├── three/                   # Three.js 粒子特效
    │   ├── StarGlow.ts
    │   ├── BlackHoleLens.ts     # 引力透镜 Shader
    │   └── CometTail.ts
    └── canvas/                  # Canvas 2D 覆盖层特效
        └── EnergyCollectFX.ts
```

---

## 10. 关键设计决策

### 10.1 继承 vs 组合

**决策**: 以继承为主，组合为辅

- 天体类型继承层次清晰，易于理解和扩展
- 每个变体都是独立类，可单独使用
- 对于需要灵活组合的情况（如行星环），使用组合

### 10.2 配置 vs 代码

**决策**: 天体基础属性在代码中定义，场景配置由 JSON 提供

- 天体的基础模型（颜色、半径、物理特性）在 TypeScript 类中定义
- 天体在场景中的位置、数量、轨道参数由 JSON 配置决定
- 这样既保证类型安全，又提供灵活性

### 10.3 渲染策略

**决策**: Three.js WebGL 渲染为主，Canvas 2D 覆盖层用于 UI 特效

- 天体使用 Three.js `Mesh` + `Material` + `PointLight`
- 后处理使用 `EffectComposer` (Bloom、引力透镜等)
- UI 特效（如能量收集的 Falling Rays）使用 Canvas 2D 覆盖层
- 背景星空使用 Three.js `Points` (点云粒子)

### 10.4 性能优化策略

| 优化项 | Three.js 方案 |
|--------|---------------|
| 天体渲染 | 使用 `InstancedMesh` 批量渲染小行星 |
| 光照计算 | 重要光源实时，次要光源烘焙到纹理 |
| 后处理 | 按需启用（如只在黑洞场景启用引力透镜） |
| 粒子系统 | Three.js 内置粒子系统 + 对象池 |
| 内存管理 | GLTF 模型压缩（Draco），纹理 mipmap |
| 视野裁剪 | `FrustumCulling` 自动裁剪 |
| 对象池 | `CelestialBodyPool` 复用天体实例 |
