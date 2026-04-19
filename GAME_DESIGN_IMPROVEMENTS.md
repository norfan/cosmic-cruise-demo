# Cosmic Cruise 游戏设计改进文档

## 版本：v1.0
## 日期：2026-04-18

---

## 目录

1. [项目愿景](#1-项目愿景)
2. [核心玩法改进](#2-核心玩法改进)
3. [精灵系统改进](#3-精灵系统改进)
4. [场景与关卡设计](#4-场景与关卡设计)
5. [进度与成长系统](#5-进度与成长系统)
6. [用户界面设计](#6-用户界面设计)
7. [动效与反馈系统](#7-动效与反馈系统)
8. [技术实现路线](#8-技术实现路线)

---

## 1. 项目愿景

### 1.1 游戏概述

**Cosmic Cruise** 是一款宇宙文明进化主题的探索收集游戏。玩家驾驶飞船穿越8个文明等级，收集能量节点，触发随机事件，体验从原始文明到超级文明的进化旅程。

### 1.2 核心循环

```
┌─────────────────────────────────────────────────────────────────┐
│                    核心游戏循环                            │
├─────────────────────────────────────────────────────────────────┤
│                                                         │
│   ┌──────┐    收集     ┌──────┐    解锁    ┌──────┐     │
│   │能量球│ ────────→ │能量值│ ────────→ │文明等级│    │
│   └──────┘           └──────┘           └──────┘     │
│                                            │          │
│                                            ▼          │
│                                        进入新场景        │
│                                            │          │
│                                            ▼          │
│   ┌──────┐    随机     ┌──────┐    完成    ┌──────┐    │
│   │事件  │ ────────→ │挑战  │ ────────→ │奖励&返回│    │
│   └──────┘           └──────┘           └──────┘    │
│                                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 三个循环层级

| 层级 | 描述 | 时长 |
|------|------|------|
| Moment-to-Moment | 飞船移动、能量收集、碰撞检测 | 即时 |
| Session | 完成当前 Tier 目标、解锁下一等级 | 2-5分钟 |
| Long-Term | 穿越8个文明等级、收集图鉴 | 30-60分钟 |

---

## 2. 核心玩法改进

### 2.1 飞船控制系统

#### 2.1.1 控制方式

| 输入设备 | 控制方式 |
|----------|----------|
| 键盘 | WASD / 方向键移动 |
| 鼠标 | 飞船跟随鼠标位置 |
| 触屏 |触控移动 |
| 手柄 | 左摇杆移动 |

#### 2.1.2 飞船属性

```typescript
interface Spaceship {
  // 移动属性
  speed: number;              // 基础速度: 5 units/s
  acceleration: number;        // 加速度: 10 units/s²
  maxVelocity: number;       // 最大速度: 15 units/s
  
  // 状态
  shields: number;           // 护盾值: 100
  maxShields: number;        // 最大护盾: 100
  
  // 收集属性
  collectionRadius: number; // 收集半径: 2 units
  collectionEfficiency: number; // 收集效率: 1.0
}
```

#### 2.1.3 收集机制

- 飞船进入能量球 `collectionRadius` 范围内自动收集
- 收集时播放音效 + 粒子特效
- 能量数值跳动显示

### 2.2 能量系统

#### 2.2.1 能量类型

| 类型 | 基础能量 | 说明 |
|------|----------|------|
| 小型能量球 | 10 | 普通收集物，随机分布 |
| 中型能量球 | 50 | 较少，需要触发事件获得 |
| 大型能量球 | 200 | 稀有，Boss 或特殊事件 |
| 能量脉冲 | +10/s | 特定区域持续获得 |

#### 2.2.2 能量消耗

```typescript
interface EnergyCost {
  tierUnlock: number;      // 解锁下一等级所需能量
  shieldRecharge: number; // 护盾充能: 50能量 = 25护盾
  speedBoost: number;      // 加速: 20能量 = 3秒加速
  scanPlanet: number;     // 扫描行星: 100能量
}
```

**等级解锁能量需求：**
- Tier 0 → Tier 1: 500 能量
- Tier 1 → Tier 2: 1,500 能量
- Tier 2 → Tier 3: 4,500 能量 (×3 递增)
- Tier 3 → Tier 4: 13,500 能量
- Tier 4 → Tier 5: 40,500 能量
- Tier 5 → Tier 6: 121,500 能量
- Tier 6 → Tier 7: 364,500 能量

### 2.3 随机事件系统

#### 2.3.1 事件类型与触发

| 事件 | 触发概率 | 持续时间 | 奖励 |
|------|----------|----------|------|
| 能量云 | 30% | 10s | +50~100 能量 |
| 小行星带 | 20% | 15s | 躲避获得 +100 |
| 空间站 | 10% | 一次性 | 解锁道具/充能 |
| 引力异常 | 15% | 8s | 随机传送 |
| 能量风暴 | 10% | 20s | 高风险高回报 |
| 外星信号 | 10% | 一次性 | 解锁图鉴 |
| 创造碎片 | 5% | 一次性 | Boss 能量 |

#### 2.3.2 事件触发配置

```typescript
interface EventConfig {
  minInterval: number;   // 最小间隔: 15秒
  maxInterval: number; // 最大间隔: 45秒
  probability: number; // 基础概率
  tierModifier: number; // 等级修正 (+5%/Tier)
}
```

### 2.4 失败/挑战系统

#### 2.4.1 护盾系统

- 初始护盾: 100
- 被小行星击中: -20 护盾
- 护盾归零: 损失 50% 当前能量，强制传送回起点

#### 2.4.2 限时挑战

- 每个 Tier 设定收集目标
- 时间限制: 5分钟
- 超时: 损失 25% 已收集能量

#### 2.4.3 难度梯度

| Tier | 小行星密度 | 移动速度限制 | 能量球数量 |
|------|------------|--------------|------------|
| 0-1 | 低 | 无 | 20 |
| 2-3 | 中 | -10% | 15 |
| 4-5 | 高 | -20% | 12 |
| 6-7 | 极高 | -30% | 10 |

---

## 3. 精灵系统改进

### 3.1 精灵分类

```
┌────────────────────────────────────────────────────┐
│                  精灵继承体系                        │
├────────────────────────────────────────────────────┤
│                                                    │
│                    Sprite                         │
│                    │                              │
│         ┌──────────┴──────────┐                  │
│         │                      │                   │
│  EnvironmentSprite      CelestialSprite          │
│  (星空背景)              (天体)                    │
│         │                      │                  │
│  ─────────────────  ────────────┼───────────        │
│                      │         │                 │
│              PlanetSprite  StarSprite              │
│              StarSprite    BlackHoleSprite         │
│              MoonSprite    ...                     │
│              ...                                  │
│                                                    │
│  ─────────────────  ──────────────────────────      │
│                                                    │
│              CollectibleSprite                     │
│              (可收集)                               │
│                   │                                │
│     ┌─────────────┼─────────────┐                  │
│     │             │             │                 │
│  EnergyOrb  Artifact  Creation                    │
│              Fragment                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 3.2 精灵交互接口

```typescript
interface SpriteInteraction {
  // 交互类型
  type: 'collect' | 'unlock' | 'scan' | 'challenge';
  
  // 交互条件
  conditions?: {
    minTier?: number;
    requiredItem?: string;
    energyCost?: number;
  };
  
  // 交互结果
  result: {
    energy?: number;
    item?: string;
    achievement?: string;
    animation?: string;
  };
  
  // 冷却时间
  cooldown?: number;
}
```

### 3.3 各类型精灵交互定义

| 精灵类型 | 交互方式 | 效果 |
|----------|----------|------|
| EnergyOrb | 自动/点击收集 | +10~200 能量 |
| Planet | 点击扫描 | 解锁行星图鉴 |
| Star | 点击采集 | Boss 能量 +500 |
| BlackHole | 风险区域 | 高风险传送 |
| Moon | 轨道交互 | 连续能量 +5/s |
| Asteroid | 躲避 | 击中扣护盾 |
| SpaceStation | 点击访问 | 充能/解锁道具 |
| Artifact | 收集 | 解锁成就 |

### 3.4 精灵位置配置

```typescript
interface SpriteConfig {
  id: string;
  type: string;
  
  // 位置配置
  position: {
    mode: 'random' | 'grid' | 'fixed' | 'orbital';
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    count?: number;
    spacing?: number;
  };
  
  // 运动配置
  motion?: {
    type: 'orbit' | 'oscillate' | 'drift';
    speed?: number;
    radius?: number;
  };
  
  // 交互配置
  interaction?: SpriteInteraction;
}
```

---

## 4. 场景与关卡设计

### 4.1 八个文明等级

| Tier | 名称 | 场景特征 | 核心机制 | 时间限制 |
|------|------|----------|----------|----------|
| 0 | 洪荒 | 原始星空 | 基础移动/收集 | 5 分钟 |
| 1 | 文明曙光 | 星云空间 | 能量脉冲 | 5 分钟 |
| 2 | 金属时代 | 星际尘埃 | 小行星躲避 | 4.5 分钟 |
| 3 | 电力革命 | 行星环带 | 扫描行星 | 4.5 分钟 |
| 4 | 核能纪元 | 恒星表面 | 高温挑战 | 4 分钟 |
| 5 | 量子世代 | 黑洞周边 | 引力异常 | 4 分钟 |
| 6 | 维度跨越 | 多维空间 | 时空扭曲 | 3.5 分钟 |
| 7 | 创造者文明 | 宇宙起源 | 最终挑战 | 3 分钟 |

### 4.2 场景过渡

```
Tier 0 ──500能量──→ Tier 1 ──1500能量──→ Tier 2
   │                                     │
   │  (返回选择)                     (返回选择)
   ▼                                     ▼
重玩当前Tier                        重玩当前Tier
```

### 4.3 新手引导流程

1. **Phase 1** - 移动控制
   - 显示 "使用 WASD 移动飞船"
   - 引导能量球收集

2. **Phase 2** - 收集机制
   - 显示 "靠近能量球自动收集"
   - 完成首次收集

3. **Phase 3** - 进度概念
   - 显示能量条进度
   - 显示解锁需求

4. **Phase 4** - 事件介绍
   - 首次触发随机事件
   - 显示事件说明

5. **Phase 5** - 护盾系统
   - 首次被击中
   - 显示护盾和恢复方式

---

## 5. 进度与成长系统

### 5.1 能量收集循环

```typescript
interface GameProgress {
  // 当前状态
  currentEnergy: number;
  totalEnergyCollected: number;
  currentTier: number;
  
  // 解锁进度
  unlockedTiers: number[];    // 已解锁等级 [0]
  tierProgress: {
    [tier: number]: {
      collected: number;
      goal: number;
      completed: boolean;
    }
  };
  
  // 飞船状态
  spaceship: {
    speedLevel: number;     // 速度等级 1-5
    shieldLevel: number;    // 护盾等级 1-5
    collectionLevel: number; // 收集等级 1-5
  };
  
  // 收藏
  discoveredPlanets: string[];
  discoveredStars: string[];
  discoveredEvents: string[];
}
```

### 5.2 升级系统

| 升级 | 效果 | 成本 |
|------|------|------|
| 速度 I → II | +20% 速度 | 200 能量 |
| 速度 II → III | +20% 速度 | 600 能量 |
| 速度 III → IV | +20% 速度 | 1800 能量 |
| 速度 IV → V | +20% 速度 | 5400 能量 |
| 护盾 I → II | +25 护盾 | 300 能量 |
| 护盾 II → III | +25 护盾 | 900 能量 |
| 收集 I → II | +0.5 收集半径 | 150 能量 |
| 收集 II → III | +0.5 收集半径 | 450 能量 |

### 5.3 图鉴系统

```typescript
interface Codex {
  planets: {
    [id: string]: {
      discovered: boolean;
      discoveredAt: number; // timestamp
      timesVisited: number;
    }
  };
  stars: { ... };
  events: { ... };
  artifacts: { ... };
  civilizations: { ... };
}
```

---

## 6. 用户界面设计

### 6.1 HUD 布局

```
┌─────────────────────────────────────────────────────────────┐
│  [能量条: #######░░░░░] 500/1500    [护盾: ██████████] 100  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│                        [游戏场景]                           │
│                                                             │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Tier 0: 洪荒]           [事件提示]         [菜单: ☰]      │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 主菜单

| 项目 | 功能 |
|------|------|
| 继续 | 继续游戏 |
| 新游戏 | 重置进度开始 |
| 设置 | 音量/画质/控制 |
| 图鉴 | 查看收藏 |
| 关于 | 游戏信息 |

### 6.3 设置选项

- 音量：主音量、音效、音乐
- 画质：低/中/高
- 控制：键盘/鼠标/触屏
- 语言：中文/English

### 6.4 事件提示 UI

```
┌─────────────────────────────────┐
│  ⚡ 能量云来袭！                │
│  剩余 +50~100 能量              │
└─────────────────────────────────┘
```

---

## 7. 动效与反馈系统

### 7.1 收集反馈

| 事件 | 视觉反馈 | 听觉反馈 |
|------|----------|----------|
| 能量收集 | 发光消散 + 粒子 + 数值跳动 | 拾取音效 |
| 大型收集 | 光柱 + 屏幕震动 | Boss 音效 |
| 连续收集 | Combo 连击特效 | 连击音效 |

### 7.2 天体动效

| 天体 | 动效 |
|------|------|
| 行星 | 自转、极光、光芒脉动 |
| 恒星 | 耀斑、日冕、脉动 |
| 月亮 | 轨道运动、阴晴圆缺 |
| 黑洞 | 吸积盘、引力透镜 |

### 7.3 事件动效

| 事件 | 动效 |
|------|------|
| 能量云 | 雾气扩散、闪电 |
| 小行星带 | 岩石滚动、碰撞火花 |
| 能量风暴 | 螺旋闪电、旋转 |
| 空间站 | 停泊动画、光束 |

---

## 8. 技术实现路线

### Phase 1: 核心玩法 (高优先级)

1. **玩家飞船控制系统**
   - 创建 SpaceshipSprite 类
   - 实现键盘/鼠标/触屏控制
   - 实现移动物理

2. **核心游戏循环**
   - 实现 GameStore 状态管理
   - 实现能量收集机制
   - 实现等级解锁机制

3. **失败/挑战系统**
   - 实现护盾系统
   - 实现碰撞检测
   - 实现限时目标

### Phase 2: 精灵系统 (中优先级)

4. **完善精灵交互**
   - 定义统一交互接口
   - 实现各类型交互
   - 实现收集清单 UI

5. **场景进度和引导**
   - 实现各 Tier 目标
   - 实现新手引导
   - 实现场景过渡

### Phase 3: UI系统 (中优先级)

6. **UI 菜单系统**
   - 实现主菜单
   - 实现设置界面
   - 实现图鉴系统

7. **随机事件系统**
   - 完善事件配置
   - 实现事件 UI
   - 集成奖励系统

### Phase 4: 完善体验 (低优先级)

8. **动效与反馈**
   - 实现收集特效
   - 实现天体动效
   - 实现事件特效

9. **收藏/图鉴系统**
   - 实现图鉴 UI
   - 实现解锁逻辑
   - 实现进度保存

---

## 附录：文件结构

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
│   ├── Sprite.ts
│   ├── CollectibleSprite.ts     # NEW
│   ├── SpaceshipSprite.ts       # NEW
│   ├── EnergyOrbSprite.ts
│   ├── PlanetSprite.ts
│   ├── StarSprite.ts
│   ├── MoonSprite.ts
│   ├── BlackHoleSprite.ts
│   ├── AsteroidSprite.ts
│   ├── SpaceStationSprite.ts   # NEW
│   └── tier0-7/
├── scenes/
│   ├── SpaceScene.ts
│   ├── Tier0Scene.ts
│   ├── Tier1Scene.ts
│   └── ...
├── effects/
│   ├── unicorn/
│   ├── reactbits/
│   └── canvas/
├── stores/
│   ├── GameStore.ts            # ENHANCE
│   └── UIStore.ts
├── components/
│   ├── hud/
│   │   ├── HUD.tsx
│   │   ├── EnergyBar.tsx
│   │   ├── ShieldBar.tsx
│   │   ├── TierIndicator.tsx
│   │   └── EventAlert.tsx
│   └── menus/
│       ├── MainMenu.tsx
│       ├── Settings.tsx
│       └── Codex.tsx
└── utils/
    ├── Controls.ts
    └── AudioManager.ts
```

---

*文档版本：v1.0*