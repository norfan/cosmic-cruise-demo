# Cosmic Cruise - 精灵组件系统设计

> 本文档定义游戏中所有精灵组件的详细设计规范，基于 unicorn.studio、reactbits.dev、designspells.com 的动效风格。

---

## 1. 动效库集成规范

### 1.1 三个站点的定位与用途

| 站点 | 定位 | 在游戏中的用途 |
|------|------|---------------|
| **Unicorn Studio** | WebGL 场景级特效 | 背景星空流动、能量云雾、黑洞吸积盘、创世核心等大型场景特效 |
| **React Bits** | React UI 动效 | HUD 元素动画、按钮交互、能量收集特效、菜单转场 |
| **Design Spells** | 微交互动效 | 飞船 hover、能量球悬停、按钮点击反馈、事件触发微交互 |

### 1.2 集成方式

```typescript
// 包依赖
npm install unicornstudio-react @appletosolutions/reactbits

// Unicorn Studio 用于 Three.js 场景的背景层
import UnicornScene from 'unicornstudio-react';

// React Bits 用于 React UI 层
import { FallingRays, LightDroplets, StarBurst } from '@appletosolutions/reactbits';

// Design Spells 微交互通过 CSS/React 实现
// 参看 designspells.com 的交互模式实现
```

### 1.3 渲染层次对应

```
┌─────────────────────────────────────────┐
│      React DOM UI Layer                 │
│  ├── React Bits 动效 (FallingRays 等)    │
│  └── Design Spells 微交互 (hover/click)  │
├─────────────────────────────────────────┤
│    Three.js WebGL Layer                 │
│  ├── 天体网格 (CelestialBody)           │
│  ├── Unicorn Studio 背景 (粒子/星云)    │
│  └── 粒子特效系统                       │
├─────────────────────────────────────────┤
│   Canvas 2D Overlay Layer              │
│  └── 能量收集 Canvas 特效                │
└─────────────────────────────────────────┘
```

---

## 2. 精灵组件分类总览

### 2.1 按文明等级分类

| 场景 | 精灵类别 |
|------|----------|
| **Tier 0 原始文明** | 自然环境类：海洋、沙滩、树木、草地、岩石、远山、河流、云朵、太阳 |
| **Tier 1 行星文明** | 航天器类：地球、月球、人造卫星、空间站、航天器、陨石 |
| **Tier 2 恒星文明** | 天体类：太阳、八大行星、小行星带、彗星 |
| **Tier 3 星系文明** | 宇宙结构类：银河系旋臂、星云、脉冲星、星团 |
| **Tier 4 宇宙文明** | 大尺度结构类：星系团、宇宙网纤维、暗物质节点 |
| **Tier 5 多维文明** | 极端天体类：黑洞、虫洞、超新星遗迹、中子星 |
| **Tier 6 边缘文明** | 边界类：宇宙微波背景辐射、能量壁垒、维度裂缝 |
| **Tier 7 创世文明** | 终极类：创世核心、法则几何网格、宇宙符文 |

### 2.2 精灵组件继承体系

```
Sprite (精灵基类)
├── EnvironmentSprite (环境精灵)
│   ├── OceanSprite
│   ├── SandSprite
│   ├── GrassSprite
│   ├── TreeSprite
│   ├── RockSprite
│   ├── MountainSprite
│   ├── CloudSprite
│   └── SunLightSprite
├── CelestialSprite (天体精灵 - 继承 CelestialBody)
│   ├── PlanetSprite
│   │   ├── EarthSprite
│   │   ├── TerrestrialPlanetSprite
│   │   ├── GasGiantSprite
│   │   └── IceGiantSprite
│   ├── StarSprite
│   │   ├── YellowStarSprite (太阳)
│   │   ├── RedGiantSprite
│   │   └── BlueGiantSprite
│   ├── MoonSprite
│   │   ├── RockyMoonSprite
│   │   └── IceMoonSprite
│   ├── AsteroidSprite
│   ├── CometSprite
│   └── NebulaSprite
├── ArtificialSprite (人造物体)
│   ├── SatelliteSprite
│   ├── SpaceStationSprite
│   └── SpaceshipSprite
├── CosmicObjectSprite (宇宙特殊对象)
│   ├── BlackHoleSprite
│   ├── WormHoleSprite
│   ├── PulsarSprite
│   └── SupernovaRemnantSprite
└── CreationSprite (创世元素)
    ├── CreationCoreSprite
    ├── LawGeometrySprite
    └── CosmicRuneSprite
```

---

## 3. Tier 0 原始文明精灵组件 (地球海边)

### 3.1 组件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| OceanSprite | 1 | 海平面，带波浪动画 |
| SandSprite | 1 | 几何化沙滩 |
| GrassSprite | 3-5 | 草丛变体 |
| TreeSprite | 2-4 | 简约风格树木 |
| RockSprite | 4-6 | 岩石/礁石 |
| MountainSprite | 2-3 | 远山轮廓 |
| CloudSprite | 3-5 | 积云形态 |
| SunSprite | 1 | 温暖光源 |
| WaveParticleSprite | 20+ | 浪花粒子 |
| EnergyOrbSprite | 5-10 | 能量球（可收集） |

### 3.2 组件详细设计

#### OceanSprite (海洋)

```typescript
class OceanSprite extends EnvironmentSprite {
  name: 'ocean';
  tier: 0;
  position: Vector3D;

  // 视觉参数
  color: '#0066AA';           // 海水颜色
  waveAmplitude: 0.5;         // 波浪振幅
  waveFrequency: 0.8;          // 波浪频率
  transparency: 0.7;          // 透明度
  reflectionIntensity: 0.3;   // 反射强度

  // Unicorn Studio 特效
  // - 使用 Aurora 效果表现海面光影
  // - 使用 Noise blur 表现水波纹理

  // Three.js 实现
  mesh: THREE.Mesh;
  waterMaterial: THREE.MeshStandardMaterial;

  init(config: SpriteConfig): void {
    // 创建水面几何体
    const geometry = new THREE.PlaneGeometry(100, 20, 64, 64);
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      transparent: true,
      opacity: this.transparency,
      metalness: 0.1,
      roughness: 0.3,
    });
    this.mesh = new THREE.Mesh(geometry, this.waterMaterial);
    this.mesh.rotation.x = -Math.PI / 2;
  }

  update(deltaTime: number): void {
    // 顶点动画模拟波浪
    const positions = this.mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = Math.sin(x * this.waveFrequency + deltaTime) * this.waveAmplitude;
      positions.setZ(i, y);
    }
    positions.needsUpdate = true;
  }
}
```

#### SandSprite (沙滩)

```typescript
class SandSprite extends EnvironmentSprite {
  name: 'sand';
  tier: 0;

  // 视觉参数
  color: '#F5DEB3';           // 沙滩颜色
  patternType: 'geometric';   // 几何化图案
  grainSize: 0.05;            // 沙粒大小

  // Three.js 实现
  // 使用 ShaderMaterial 实现几何化沙滩纹理

  init(config: SpriteConfig): void {
    const geometry = new THREE.PlaneGeometry(50, 10, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.color) },
        uPatternType: { value: this.patternType },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        uniform string uPatternType;
        varying vec2 vUv;

        float geometricPattern(vec2 uv) {
          vec2 grid = fract(uv * 20.0);
          float pattern = step(0.5, grid.x) * step(0.5, grid.y);
          return pattern * 0.1 + 0.9;
        }

        void main() {
          float pattern = geometricPattern(vUv);
          gl_FragColor = vec4(uColor * pattern, 1.0);
        }
      `,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.01; // 略高于海面
  }
}
```

#### TreeSprite (树木)

```typescript
class TreeSprite extends EnvironmentSprite {
  name: 'tree';
  tier: 0;
  variant: 'pine' | 'palm' | 'broad';  // 树种变体

  // 视觉参数
  trunkColor: '#8B4513';
  leafColor: '#228B22';
  scale: number;

  // Design Spells 微交互
  // - hover 时轻微摇摆 (SwayHover)
  // - 点击时叶片飘落

  init(config: SpriteConfig): void {
    this.variant = config.variant || 'pine';
    this.scale = config.scale || 1.0;

    // 创建树干
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5 * this.scale, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: this.trunkColor });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

    // 根据变体创建树冠
    let crown: THREE.Mesh;
    if (this.variant === 'pine') {
      // 松树：圆锥形
      const crownGeometry = new THREE.ConeGeometry(0.8 * this.scale, 2 * this.scale, 8);
      const crownMaterial = new THREE.MeshStandardMaterial({ color: this.leafColor });
      crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.y = 1.8 * this.scale;
    } else if (this.variant === 'palm') {
      // 棕榈树：扇形
      const crownGeometry = new THREE.SphereGeometry(0.6 * this.scale, 8, 6);
      const crownMaterial = new THREE.MeshStandardMaterial({ color: this.leafColor });
      crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.y = 2.0 * this.scale;
    }

    this.mesh = new THREE.Group();
    this.mesh.add(trunk);
    this.mesh.add(crown);
    this.mesh.position.copy(config.position);
  }

  // Design Spells hover 交互
  onHover(): void {
    // 轻微摇摆动画
    this.animateSway();
  }

  animateSway(): void {
    // 使用 GSAP 实现摇摆
  }
}
```

#### MountainSprite (远山)

```typescript
class MountainSprite extends EnvironmentSprite {
  name: 'mountain';
  tier: 0;

  // 视觉参数
  color: '#4A4A6A';           // 山体颜色
  peakCount: 3;               // 山峰数量
  heightVariation: [1.0, 1.5, 0.8];  // 各峰高度变化
  snowLine: 0.7;              // 雪线位置

  // Unicorn Studio 效果
  // - 使用 Gradient 实现远山渐变
  // - 峰顶积雪效果

  init(config: SpriteConfig): void {
    // 创建多峰山体
    this.mesh = new THREE.Group();

    for (let i = 0; i < this.peakCount; i++) {
      const height = this.heightVariation[i] * (config.scale || 1.0);
      const geometry = new THREE.ConeGeometry(1.5, height, 4);
      const material = new THREE.MeshStandardMaterial({
        color: this.color,
        flatShading: true,
      });
      const peak = new THREE.Mesh(geometry, material);
      peak.position.x = (i - 1) * 2.0;
      peak.position.y = height / 2;

      // 添加雪顶
      const snowGeometry = new THREE.ConeGeometry(0.3, height * 0.2, 4);
      const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
      const snow = new THREE.Mesh(snowGeometry, snowMaterial);
      snow.position.y = height * 0.4;
      peak.add(snow);

      this.mesh.add(peak);
    }

    this.mesh.position.copy(config.position);
    this.mesh.position.z = -15; // 远处背景
  }
}
```

#### EnergyOrbSprite (能量球 - 可收集)

```typescript
class EnergyOrbSprite extends EnvironmentSprite {
  name: 'energyOrb';
  tier: 0;

  // 视觉参数
  color: '#00FF88';           // 能量颜色
  glowColor: '#00D4FF';       // 光晕颜色
  size: 0.3;
  pulseSpeed: 2.0;

  // React Bits 动效
  // - Light Droplets 效果环绕
  // - 收集时 StarBurst 爆发

  init(config: SpriteConfig): void {
    // 能量球核心
    const coreGeometry = new THREE.SphereGeometry(this.size, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: this.color });
    this.mesh = new THREE.Mesh(coreGeometry, coreMaterial);

    // 外层光晕
    const glowGeometry = new THREE.SphereGeometry(this.size * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.glowColor,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glow);

    // 点光源
    const light = new THREE.PointLight(this.glowColor, 1, 5);
    this.mesh.add(light);

    this.mesh.position.copy(config.position);
  }

  update(deltaTime: number): void {
    // 脉冲动画
    const pulse = Math.sin(deltaTime * this.pulseSpeed) * 0.2 + 1.0;
    this.mesh.scale.setScalar(pulse);
  }

  // Design Spells 点击交互
  onCollect(): void {
    // 触发收集动画 + 事件
    EventBus.emit('energyCollected', { amount: 10, position: this.mesh.position });
  }
}
```

---

## 4. Tier 1 行星文明精灵组件 (近地轨道)

### 4.1 组件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| EarthSprite | 1 | 完整自转地球 |
| MoonSprite | 1 | 月球卫星 |
| SatelliteSprite | 3-5 | 人造卫星 |
| SpaceStationSprite | 1 | 废弃空间站 |
| SpaceshipSprite | 1 | 玩家飞船 |
| AsteroidSprite | 10-20 | 漂浮陨石 |
| AuroraSprite | 1 | 极光效果 |
| SatelliteDebrisSprite | 5-10 | 碎片 |

### 4.2 核心组件设计

#### EarthSprite (地球)

```typescript
class EarthSprite extends PlanetSprite {
  name: 'earth';
  tier: 1;

  // 地球特有
  rotationSpeed: 0.001;       // 自转速度
  atmosphereColor: '#88CCFF'; // 大气层颜色
  cloudLayer: THREE.Mesh;     // 云层

  // Unicorn Studio 效果
  // - 大气层光晕 (Bloom)
  // - 云层流动动画

  init(config: SpriteConfig): void {
    // 地核
    const coreGeometry = new THREE.SphereGeometry(2, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x2266AA,
      roughness: 0.8,
    });
    this.mesh = new THREE.Mesh(coreGeometry, coreMaterial);

    // 大气层
    const atmosphereGeometry = new THREE.SphereGeometry(2.1, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: this.atmosphereColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.mesh.add(atmosphere);

    // 云层
    const cloudGeometry = new THREE.SphereGeometry(2.05, 32, 32);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4,
    });
    this.cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
    this.mesh.add(this.cloudLayer);
  }

  update(deltaTime: number): void {
    // 地球自转
    this.mesh.rotation.y += this.rotationSpeed;
    // 云层稍快
    this.cloudLayer.rotation.y += this.rotationSpeed * 1.1;
  }
}
```

#### MoonSprite (月球)

```typescript
class MoonSprite extends RockyMoonSprite {
  name: 'moon';
  tier: 1;

  // 月球参数
  craterCount: 50;            // 撞击坑数量
  earthOrbitRadius: 5;       // 相对地球的轨道半径
  orbitSpeed: 0.002;          // 轨道速度

  init(config: SpriteConfig): void {
    // 月球本体
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xAAAAAA,
      roughness: 1.0,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    // 添加撞击坑纹理
    this.addCraters();

    // 设置为绕地球轨道
    this.orbitCenter = new THREE.Vector3(0, 0, 0);
    this.orbitRadius = this.earthOrbitRadius;
    this.orbitSpeed = config.orbitSpeed || 0.002;
    this.orbitAngle = config.orbitAngle || 0;
  }

  update(deltaTime: number): void {
    // 绕轨运动
    this.orbitAngle += this.orbitSpeed;
    this.mesh.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.mesh.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
    // 同时自转
    this.mesh.rotation.y += 0.001;
  }

  addCraters(): void {
    // 使用 InstancedMesh 优化多个撞击坑
  }
}
```

#### SpaceStationSprite (空间站)

```typescript
class SpaceStationSprite extends ArtificialSprite {
  name: 'spaceStation';
  tier: 1;

  // 空间站结构
  moduleCount: 4;             // 舱段数量
  solarPanelCount: 2;         // 太阳翼数量

  // Design Spells 交互
  // - hover 时高亮发光
  // - 探索时门打开动画

  // React Bits 动效
  // - 能量收集 LightDroplets

  init(config: SpriteConfig): void {
    this.mesh = new THREE.Group();

    // 核心舱
    const coreGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.rotation.x = Math.PI / 2;
    this.mesh.add(core);

    // 生活舱
    const moduleGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const moduleMaterial = new THREE.MeshStandardMaterial({ color: 0xAAAAAA });
    for (let i = 0; i < this.moduleCount; i++) {
      const module = new THREE.Mesh(moduleGeometry, moduleMaterial);
      module.position.set(
        Math.cos(i * Math.PI * 2 / this.moduleCount) * 0.5,
        0,
        Math.sin(i * Math.PI * 2 / this.moduleCount) * 0.5
      );
      this.mesh.add(module);
    }

    // 太阳翼
    const panelGeometry = new THREE.BoxGeometry(1, 0.02, 0.3);
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111133,
      metalness: 0.9,
    });
    const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    leftPanel.position.set(-0.8, 0, 0);
    const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    rightPanel.position.set(0.8, 0, 0);
    this.mesh.add(leftPanel);
    this.mesh.add(rightPanel);

    // 灯光效果
    const light = new THREE.PointLight(0x00D4FF, 0.5, 3);
    this.mesh.add(light);

    this.mesh.position.copy(config.position);
  }
}
```

---

## 5. Tier 2 恒星文明精灵组件 (太阳系)

### 5.1 组件清单

| 组件 | 数量 | 说明 |
|------|------|------|
| YellowStarSprite | 1 | 太阳(黄矮星) |
| MercurySprite | 1 | 水星 |
| VenusSprite | 1 | 金星 |
| EarthTier2Sprite | 1 | 地球(简化) |
| MarsSprite | 1 | 火星 |
| JupiterSprite | 1 | 木星 |
| SaturnSprite | 1 | 土星(带环) |
| UranusSprite | 1 | 天王星 |
| NeptuneSprite | 1 | 海王星 |
| AsteroidBeltSprite | 50+ | 小行星带 |
| CometSprite | 1-2 | 彗星 |

### 5.2 核心组件设计

#### YellowStarSprite (太阳/黄矮星)

```typescript
class YellowStarSprite extends StarSprite {
  name: 'sun';
  tier: 2;
  starType: 'yellow';

  // 恒星参数
  temperature: 5800;          // 表面温度(K)
  radius: 5;                 // 半径
  color: new THREE.Color(0xFFF4E0);
  coronaColor: new THREE.Color(0xFFD700);

  // Unicorn Studio 效果
  // - Bloom 后处理 (恒星发光)
  // - Corona 日冕效果
  // - Flare 耀斑粒子

  // React Bits 动效
  // - StarBurst 爆发效果

  init(config: SpriteConfig): void {
    // 太阳本体
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
    });
    this.mesh = new THREE.Mesh(geometry, material);

    // 日冕 (外层发光)
    const coronaGeometry = new THREE.SphereGeometry(this.radius * 1.3, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: this.coronaColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    this.mesh.add(corona);

    // PointLight
    const light = new THREE.PointLight(this.color, 2, 50);
    this.mesh.add(light);

    // 脉冲动画参数
    this.pulseSpeed = 0.5;
    this.pulseIntensity = 0.1;
  }

  update(deltaTime: number): void {
    // 脉冲效果
    const pulse = Math.sin(deltaTime * this.pulseSpeed) * this.pulseIntensity + 1;
    (this.mesh.material as THREE.MeshBasicMaterial).color.setRGB(
      this.color.r * pulse,
      this.color.g * pulse,
      this.color.b * pulse
    );
  }
}
```

#### SaturnSprite (土星 - 带环)

```typescript
class SaturnSprite extends GasGiantSprite {
  name: 'saturn';
  tier: 2;

  // 土星参数
  ringInnerRadius: 6;
  ringOuterRadius: 10;

  init(config: SpriteConfig): void {
    // 星球本体
    const planetGeometry = new THREE.SphereGeometry(3, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: 0xE8D5A3,
      roughness: 0.9,
    });
    this.mesh = new THREE.Mesh(planetGeometry, planetMaterial);

    // 土星环
    const ringGeometry = new THREE.RingGeometry(
      this.ringInnerRadius,
      this.ringOuterRadius,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xC4A57B,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.5; // 环倾斜角度
    this.mesh.add(ring);

    // 设置轨道
    this.orbitRadius = config.orbitRadius || 25;
    this.orbitSpeed = config.orbitSpeed || 0.001;
  }

  update(deltaTime: number): void {
    // 绕轨运动
    this.orbitAngle += this.orbitSpeed;
    this.mesh.position.x = Math.cos(this.orbitAngle) * this.orbitRadius;
    this.mesh.position.z = Math.sin(this.orbitAngle) * this.orbitRadius;
    // 自转
    this.mesh.rotation.y += 0.002;
  }
}
```

#### AsteroidBeltSprite (小行星带)

```typescript
class AsteroidBeltSprite extends EnvironmentSprite {
  name: 'asteroidBelt';
  tier: 2;

  // 小行星带参数
  asteroidCount: 100;
  innerRadius: 15;
  outerRadius: 20;

  // 使用 InstancedMesh 优化

  init(config: SpriteConfig): void {
    // 创建小行星实例
    const asteroidGeometry = new THREE.DodecahedronGeometry(0.1, 0);
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 1.0,
    });

    // InstancedMesh 优化大量渲染
    this.mesh = new THREE.InstancedMesh(
      asteroidGeometry,
      asteroidMaterial,
      this.asteroidCount
    );

    // 随机分布位置
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.innerRadius + Math.random() * (this.outerRadius - this.innerRadius);
      dummy.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 0.5, // 稍微上下偏移
        Math.sin(angle) * radius
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(0.5 + Math.random() * 1.5);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
```

---

## 6. Tier 3-7 文明精灵组件概览

### 6.1 Tier 3 星系文明

| 组件 | 说明 |
|------|------|
| SpiralGalaxySprite | 螺旋银河系(俯视) |
| NebulaSprite | 星云(发射/暗) |
| StarClusterSprite | 星团 |
| PulsarSprite | 脉冲星 |
| SupermassiveBlackHoleSprite | 银河中心超大黑洞 |

### 6.2 Tier 4 宇宙文明

| 组件 | 说明 |
|------|------|
| GalaxyClusterSprite | 星系团 |
| CosmicWebFiberSprite | 宇宙网纤维 |
| DarkMatterNodeSprite | 暗物质节点 |
| IntergalacticEnergyStreamSprite | 星系间能量流 |

### 6.3 Tier 5 多维文明

| 组件 | 说明 |
|------|------|
| BlackHoleSprite | 黑洞(事件视界) |
| WormHoleSprite | 虫洞入口 |
| SupernovaRemnantSprite | 超新星遗迹 |
| NeutronStarSprite | 中子星 |
| AccretionDiskSprite | 吸积盘 |

### 6.4 Tier 6 边缘文明

| 组件 | 说明 |
|------|------|
| CosmicMicrowaveBackgroundSprite | 宇宙微波背景 |
| EnergyBarrierSprite | 能量壁垒 |
| DimensionalRiftSprite | 维度裂缝 |
| BoundaryFogSprite | 边界光雾 |

### 6.5 Tier 7 创世文明

| 组件 | 说明 |
|------|------|
| CreationCoreSprite | 创世核心 |
| LawGeometryGridSprite | 宇宙法则几何网格 |
| CosmicRuneSprite | 宇宙符文 |
| PrimordialEnergySprite | 原始能量 |

---

## 7. 测试场景设计

### 7.1 测试场景架构

```
src/
├── test/
│   ├── TestRunner.ts              # 通用测试运行器
│   ├── sprites/
│   │   ├── test_OceanSprite.ts
│   │   ├── test_EarthSprite.ts
│   │   ├── test_YellowStarSprite.ts
│   │   ├── test_BlackHoleSprite.ts
│   │   └── test_CreationCoreSprite.ts
│   └── scenes/
│       ├── SpriteTestScene.ts    # 单精灵测试场景
│       └── AllSpritesDemoScene.ts # 全精灵展示场景
```

### 7.2 通用测试运行器

```typescript
// test/TestRunner.ts
interface TestConfig {
  spriteClass: new () => Sprite;
  spriteConfig: SpriteConfig;
  cameraPosition: THREE.Vector3;
  lights: LightConfig[];
  unicornProjectId?: string;  // 可选的 Unicorn Studio 背景
  reactBitsEffects?: string[]; // React Bits 动效
}

class TestRunner {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initRenderer();
  }

  // 加载单个精灵组件
  async loadSprite(config: TestConfig): Promise<void> {
    const sprite = new config.spriteClass();
    sprite.init(config.spriteConfig);
    this.scene.add(sprite.mesh);

    // 添加灯光
    this.setupLights(config.lights);
  }

  // 添加 React Bits 动效覆盖层
  mountReactBitsEffect(effectName: string, position: THREE.Vector3): void {
    // 创建 React 根节点
    const reactRoot = document.createElement('div');
    reactRoot.style.position = 'absolute';
    reactRoot.style.left = `${position.x}px`;
    reactRoot.style.top = `${position.y}px`;
    this.container.appendChild(reactRoot);

    // 渲染对应动效
    switch (effectName) {
      case 'FallingRays':
        ReactDOM.render(<FallingRays />, reactRoot);
        break;
      case 'LightDroplets':
        ReactDOM.render(<LightDroplets />, reactRoot);
        break;
    }
  }

  // 运行测试循环
  run(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      // 更新所有精灵
      this.scene.children.forEach(child => {
        if (child instanceof Sprite) {
          child.update(delta);
        }
      });

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
```

### 7.3 单精灵测试场景

```typescript
// test/scenes/SpriteTestScene.ts
class SpriteTestScene {
  private testRunner: TestRunner;
  private sprite: Sprite;

  // 测试单个精灵的加载和动画
  async testSprite(spriteClass: new () => Sprite, config: SpriteConfig): Promise<void> {
    this.testRunner = new TestRunner(document.getElementById('canvas'));

    await this.testRunner.loadSprite({
      spriteClass,
      spriteConfig: config,
      cameraPosition: new THREE.Vector3(0, 5, 10),
      lights: [
        { type: 'ambient', color: 0x404040 },
        { type: 'directional', color: 0xFFFFFF, position: new THREE.Vector3(5, 5, 5) },
      ],
    });

    this.testRunner.run();
  }

  // 验证精灵的 update 循环
  verifyUpdateLoop(): void {
    const initialPosition = this.sprite.mesh.position.clone();
    // 运行 60 帧
    for (let i = 0; i < 60; i++) {
      this.sprite.update(1 / 60);
    }
    // 验证位置或状态有变化（对于动态精灵）
  }

  // 验证渲染输出
  verifyRender(): void {
    // 截图对比或像素分析
  }
}
```

### 7.4 全精灵展示场景

```typescript
// test/scenes/AllSpritesDemoScene.ts
class AllSpritesDemoScene {
  // 展示所有精灵组件，按分类组织
  async loadAllSprites(): Promise<void> {
    const testRunner = new TestRunner(document.getElementById('canvas'));

    // 按文明等级分组展示
    const spritesByTier = {
      0: [OceanSprite, SandSprite, TreeSprite, MountainSprite, EnergyOrbSprite],
      1: [EarthSprite, MoonSprite, SatelliteSprite, SpaceStationSprite],
      2: [YellowStarSprite, SaturnSprite, AsteroidBeltSprite],
      // ...
    };

    for (const [tier, spriteClasses] of Object.entries(spritesByTier)) {
      for (let i = 0; i < spriteClasses.length; i++) {
        const SpriteClass = spriteClasses[i];
        const sprite = new SpriteClass();
        sprite.init({
          position: new THREE.Vector3(i * 3, 0, 0),
          scale: 1,
        });
        testRunner.scene.add(sprite.mesh);
      }
    }

    testRunner.run();
  }
}
```

---

## 8. 实现优先级

### 8.1 Phase 1: 基础架构 (P0)

| 组件 | 说明 |
|------|------|
| Sprite 基类 | 统一接口定义 |
| TestRunner | 测试运行器 |
| Tier0 精灵 | Ocean, Sand, Tree, Mountain, EnergyOrb |
| Tier1 精灵 | Earth, Moon |

### 8.2 Phase 2: 核心场景 (P1-P2)

| 组件 | 说明 |
|------|------|
| Tier2 行星系统 | Sun, Planets, AsteroidBelt |
| Unicorn Studio 集成 | 背景特效 |
| React Bits 集成 | UI 动效 |

### 8.3 Phase 3: 高级场景 (P3-P7)

| 组件 | 说明 |
|------|------|
| Tier3 星系 | SpiralGalaxy, Nebula |
| Tier4 宇宙 | GalaxyCluster, CosmicWeb |
| Tier5 极端 | BlackHole, WormHole |
| Tier6 边界 | EnergyBarrier, DimensionalRift |
| Tier7 创世 | CreationCore, LawGeometry |

---

## 9. 动效对应表

### 9.1 Unicorn Studio 效果映射

| 场景 | Unicorn Studio 效果 | 配置建议 |
|------|-------------------|----------|
| Tier 0 海洋 | Aurora + Noise blur | 轻量级，水面波纹 |
| Tier 1 极光 | Aurora | 高度可调 |
| Tier 2 太阳 | Bloom + Godrays | 重量级，按需开启 |
| Tier 3 星云 | Nebula + FBM | 中等性能消耗 |
| Tier 5 黑洞 | Bokeh blur + Bloom | 高性能消耗，慎用 |
| Tier 7 创世 | 全特效组合 | 最终场景 |

### 9.2 React Bits 组件映射

| 用途 | React Bits 组件 |
|------|---------------|
| 能量收集 | FallingRays, LightDroplets |
| 事件完成 | StarBurst, Confetti |
| UI 转场 | Silk Waves, Liquid Bars |
| 加载状态 | Shimmer, Pulse |

### 9.3 Design Spells 交互映射

| 交互 | 实现模式 |
|------|----------|
| Hover 高亮 | 发光 + scale 1.05 |
| 点击反馈 | 波纹扩散 + scale bounce |
| 拖拽 | 磁吸效果 |
| 发现 | 渐入 + 光晕 |

---

## 10. 文件结构

```
src/
├── engine/
│   ├── GameLoop.ts
│   ├── Entity.ts
│   ├── Physics.ts
│   ├── EventBus.ts
│   └── ObjectPool.ts
├── renderer/
│   ├── Renderer.ts
│   ├── Camera.ts
│   └── PostProcessing.ts
├── sprites/
│   ├── Sprite.ts                    # 精灵基类
│   ├── EnvironmentSprite.ts         # 环境精灵基类
│   ├── CelestialSprite.ts           # 天体精灵基类
│   ├── ArtificialSprite.ts          # 人造物体基类
│   │
│   ├── tier0/                      # 原始文明
│   │   ├── OceanSprite.ts
│   │   ├── SandSprite.ts
│   │   ├── GrassSprite.ts
│   │   ├── TreeSprite.ts
│   │   ├── RockSprite.ts
│   │   ├── MountainSprite.ts
│   │   ├── CloudSprite.ts
│   │   ├── SunSprite.ts
│   │   └── EnergyOrbSprite.ts
│   │
│   ├── tier1/                      # 行星文明
│   │   ├── EarthSprite.ts
│   │   ├── MoonSprite.ts
│   │   ├── SatelliteSprite.ts
│   │   ├── SpaceStationSprite.ts
│   │   └── AsteroidSprite.ts
│   │
│   ├── tier2/                      # 恒星文明
│   │   ├── YellowStarSprite.ts
│   │   ├── PlanetSprites.ts         # 八大行星
│   │   ├── AsteroidBeltSprite.ts
│   │   └── CometSprite.ts
│   │
│   ├── tier3/                      # 星系文明
│   ├── tier4/                      # 宇宙文明
│   ├── tier5/                      # 多维文明
│   ├── tier6/                      # 边缘文明
│   └── tier7/                      # 创世文明
│
├── effects/
│   ├── unicorn/                    # Unicorn Studio 集成
│   │   ├── UnicornBackground.ts
│   │   └── UnicornEffect.ts
│   ├── reactbits/                  # React Bits 集成
│   │   ├── EnergyCollectFX.ts
│   │   └── UIAnimationFX.ts
│   └── canvas/                     # Canvas 2D 特效
│       └── EnergyCollectCanvas.ts
│
├── test/
│   ├── TestRunner.ts
│   ├── sprites/
│   │   ├── test_OceanSprite.ts
│   │   ├── test_EarthSprite.ts
│   │   └── ...
│   └── scenes/
│       ├── SpriteTestScene.ts
│       └── AllSpritesDemoScene.ts
│
├── config/
│   ├── sprites/
│   │   ├── tier0.json
│   │   ├── tier1.json
│   │   └── ...
│   └── unicorn/
│       └── projects.json           # Unicorn Studio 项目 ID
│
└── stores/
    └── gameStore.ts
```
