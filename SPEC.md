# Cosmic Cruise - 宇宙文明进化之旅

## 1. 概念与愿景

**Cosmic Cruise** 是一款以宇宙文明进化为主题的探索收集游戏。玩家驾驶飞船穿越浩瀚宇宙，收集「能量」——这是一种代表文明等级的宇宙资源。当能量积累到一定程度，玩家可以选择进入下一个文明阶段：从地球文明开始，逐步进化到行星文明、恒星文明，最终探索宇宙的尽头与创世文明的奥秘。

游戏的核心体验是**探索的愉悦与视觉的震撼**。每个文明都是一个独特的宇宙场景，充满随机事件、能量节点和隐藏的秘密。玩家既是观测者，也是收集者，在无尽的星空中寻找能量的踪迹。

**核心感受：** 宁静而深邃，宏大而微妙。穿越星海，触摸文明进化的脉搏。

---

## 2. 设计语言

### 2.1 美学方向

**参考风格：** 赛博朋克 + 宇宙深空 + 极简几何

灵感来源：
- **Unicorn Studio** (unicorn.studio) - WebGL 场景级特效，用于背景星空流动、能量云雾、黑洞吸积盘等大型场景特效
- **React Bits** (reactbits.dev) - React UI 动效，用于 HUD 元素动画、能量收集特效、UI 转场
- **Design Spells** (designspells.com) - 微交互动效，用于飞船 hover、能量球悬停、按钮点击反馈等

### 2.2 配色方案

```
主色调 (Primary):     #0A0E27 (深空蓝黑)
次要色 (Secondary):   #1A1F4E (星云紫)
强调色 (Accent):      #00D4FF (能量青) / #FFD700 (能量金) / #FF00FF (能量紫)
能量色 (Energy):      #00FF88 (收集绿) / #FF6B35 (能量橙)
背景渐变:             linear-gradient(135deg, #0A0E27, #1A1F4E, #0D1B2A)
文字色:               #E8E8F0 (主文字) / #8888AA (次要文字)
```

### 2.3 字体系统

```
主字体: "Orbitron", "Rajdhani", sans-serif (科技感)
辅助字体: "Inter", "Noto Sans SC", sans-serif (中文)
等宽字体: "JetBrains Mono", monospace (数据显示)
```

### 2.4 空间系统

```
基础单位: 8px
间距梯度: 8 / 16 / 24 / 32 / 48 / 64 / 96px
圆角: 4px (按钮) / 8px (卡片) / 16px (面板)
```

### 2.5 动效哲学

| 场景 | 动效风格 |
|------|---------|
| 背景 | Unicorn Studio 3D粒子星空，持续流动 |
| 能量收集 | React Bits Falling Rays / Light Droplets 脉冲效果 |
| UI 交互 | Design Spells hover glow + scale 0.98 |
| 飞船移动 | 平滑惯性运动，引擎尾迹粒子 |
| 事件触发 | 弹性动画 + 光晕闪烁 |
| 场景切换 | 渐变褪色 + 粒子聚合 |

---

## 3. 游戏架构

### 3.1 文明等级系统

| 等级 | 文明名称 | 核心景观 | 难度 |
|------|----------|----------|------|
| 0 级 | 原始文明（地球海边） | 海平面、几何沙滩、远山 | ★☆☆☆☆ |
| Ⅰ 型 | 行星文明（近地轨道） | 完整自转地球、月球、星空 | ★★☆☆☆ |
| Ⅱ 型 | 恒星文明（太阳系） | 发光太阳、八大行星、小行星带 | ★★★☆☆ |
| Ⅲ 型 | 星系文明（银河系） | 螺旋银河系旋臂、银河中心、星云 | ★★★★☆ |
| Ⅳ 型 | 宇宙文明（星系团 & 宇宙网） | 多星系阵列、宇宙网纤维结构 | ★★★★★ |
| Ⅴ 型 | 多维文明（极端天体） | 黑洞、虫洞、超新星遗迹 | ★★★★★ |
| Ⅵ 型 | 边缘文明（宇宙边缘） | 宇宙边缘光雾、能量壁垒 | ★★★★★ |
| Ⅶ 型 | 创世文明（终极宇宙） | 创世核心、宇宙法则几何网格 | ★★★★★ |

### 3.2 核心资源

```typescript
interface GameResources {
  energy: number;           // 当前能量值
  totalEnergy: number;      // 累计收集能量
  items: Item[];            // 背包道具
  unlockedTiers: number[];  // 已解锁文明等级
  currentTier: number;      // 当前所在文明
}
```

### 3.3 随机事件系统

每个文明场景包含 5-8 种随机事件：

| 事件类型 | 描述 | 奖励 |
|----------|------|------|
| 能量云 | 发现漂浮的能量云 | +10~50 能量 |
| 陨石带 | 穿越陨石带 | 能量 + 道具 |
| 空间站 | 废弃空间站探索 | 大量能量 + 道具 |
| 引力异常 | 黑洞/引力透镜 | 高风险高回报 |
| 能量风暴 | 收集加速区域 | 限时双倍收集 |
| 外星信号 | 解码信号 | 解锁剧情碎片 |
| 创世碎片 | 稀有事件 | 大额能量 + 剧情 |

---

## 4. 技术架构 (微信小游戏适配版)

### 4.1 三层渲染架构

```
┌─────────────────────────────────────────┐
│      React DOM UI Layer                │  ← HUD、菜单、道具栏
├─────────────────────────────────────────┤
│    Three.js WebGL Canvas Layer         │  ← 游戏场景（天体、星空、飞船）
├─────────────────────────────────────────┤
│   Canvas 2D Overlay / Effect Layer       │  ← 能量收集特效、光晕效果
└─────────────────────────────────────────┘
```

### 4.2 项目结构

```
cosmic-cruise/
├── src/
│   ├── engine/              # 核心游戏引擎
│   │   ├── GameLoop.ts      # RAF游戏循环
│   │   ├── Entity.ts        # 实体基类
│   │   ├── Physics.ts       # 2D物理引擎
│   │   ├── EventBus.ts      # 事件总线
│   │   ├── ObjectPool.ts    # 对象池
│   │   └── EventSystem.ts   # 事件系统
│   ├── renderer/            # Three.js 渲染层
│   │   ├── Renderer.ts      # Three.js 渲染器封装
│   │   ├── Camera.ts       # 相机控制
│   │   └── PostProcessing.ts # 后处理效果
│   ├── sprites/             # 精灵组件系统
│   │   ├── Sprite.ts        # 精灵基类
│   │   ├── EnvironmentSprite.ts
│   │   ├── CelestialSprite.ts
│   │   ├── tier0/           # 原始文明精灵
│   │   ├── tier1/           # 行星文明精灵
│   │   ├── tier2/           # 恒星文明精灵
│   │   └── ...               # 其他等级精灵
│   ├── scenes/              # 游戏场景
│   │   ├── GameScene.ts     # 游戏场景接口
│   │   ├── SpaceScene.ts    # Three.js 场景管理
│   │   ├── Scene0Map.ts     # 原始文明沙盘场景
│   │   ├── Tier0Scene.ts    # 原始文明场景
│   │   ├── Tier1Scene.ts    # 行星文明场景
│   │   ├── Tier2Scene.ts    # 恒星文明场景
│   │   ├── Tier3Scene.ts    # 星系文明场景
│   │   ├── Tier4Scene.ts    # 宇宙文明场景
│   │   ├── Tier5Scene.ts    # 多维文明场景
│   │   ├── Tier6Scene.ts    # 边缘文明场景
│   │   ├── Tier7Scene.ts    # 创世文明场景
│   │   └── index.ts         # 场景注册表
│   ├── effects/             # 动效组件
│   │   ├── unicorn/         # Unicorn Studio 集成
│   │   ├── reactbits/       # React Bits 动效
│   │   └── canvas/          # Canvas 2D 特效
│   ├── components/          # React UI组件
│   │   ├── MainMenu.tsx     # 主菜单
│   ├── stores/              # Zustand状态
│   ├── hooks/               # 自定义Hook
│   ├── utils/               # 工具函数
│   └── wechat/              # 微信小游戏适配层
├── test/                    # 精灵测试
│   ├── TestRunner.ts        # 通用测试运行器
│   ├── sprites/             # 精灵单元测试
│   │   └── test_OceanSprite.ts
│   └── scenes/              # 测试场景
│       ├── SpriteTestScene.ts
│       └── AllSpritesDemoScene.ts
├── design/                  # 架构设计文档
│   ├── CELESTIAL_BODY_ARCHITECTURE.md
│   └── SPRITE_COMPONENT_DESIGN.md
├── public/
│   └── assets/              # 静态资源
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 4.3 微信小游戏适配策略

| 优化项 | 方案 |
|--------|------|
| **包体大小** | Three.js (~150KB minified) + 代码分割 + 按需加载 |
| **内存管理** | 对象池复用，离屏Canvas缓存，粒子池化 |
| **渲染性能** | 分层渲染，视野裁剪，60FPS目标，WebGL |
| **适配方案** | 设计720p，通过viewport缩放 |
| **本地存储** | 使用 wx.setStorageSync (而非localStorage) |
| **分包加载** | 主包 < 4MB，游戏资源CDN化 |

### 4.4 技术栈

```
核心框架:     React 18 + Vite 5 + TypeScript
3D渲染:       Three.js (WebGL)
2D渲染:       HTML5 Canvas 2D (特效层)
UI渲染:       React DOM
状态管理:     Zustand (轻量级)
3D特效:       Three.js 内置粒子系统 + 自定义 Shader
2D特效:       React Spring / Canvas 2D
动效库:       Unicorn Studio (场景) + React Bits (UI) + Design Spells (微交互)
音频:         Howler.js (支持微信AudioContext)
微信SDK:      wechat-mini-game (适配层)
构建目标:     Web + 微信小游戏双目标
```

### 4.6 素材系统设计

游戏资产分为两类：**程序化生成（默认）**和**外部素材（可选）**。代码层面预留素材接口，支持逐步替换。

#### 素材类型

| 类型 | 默认方案 | 可替换方案 |
|------|----------|------------|
| 天体纹理 | 程序化颜色/渐变 | NASA 公开纹理 / 自定义图片 |
| 背景特效 | Three.js 内置粒子/Shader | Unicorn Studio 场景 JSON |
| UI 图标 | Lucide Icons 开源库 | 自定义 SVG / PNG |
| 音频 | 静音 / 系统提示音 | 商业授权音乐 |
| 粒子特效 | Three.js Points / Canvas 2D | 自定义精灵图序列帧 |

#### 素材加载接口

```typescript
// sprites/Sprite.ts 基类预留材质接口
interface SpriteMaterial {
  texturePath?: string;       // 可选的外部纹理路径
  color: THREE.Color;         // 备用纯色
  normalMap?: string;         // 可选的法线贴图
  roughnessMap?: string;     // 可选的粗糙度贴图
}

// 加载优先级
// 1. 如果有 texturePath 且文件存在 → 加载外部纹理
// 2. 否则使用 color 作为纯色材质
// 3. 保留接口，支持运行时切换
```

#### CDN 托管策略

大型纹理文件（>100KB）建议 CDN 托管：

```json
// config/assets.json
{
  "textures": {
    "earth": "https://cdn.example.com/textures/earth-diffuse.jpg",
    "mars": "https://cdn.example.com/textures/mars-diffuse.jpg"
  },
  "audio": {
    "bgm": "https://cdn.example.com/audio/cosmic-bgm.mp3"
  },
  "unicorn": {
    "tier5_blackhole": "https://cdn.example.com/unicorn/blackhole.json"
  }
}
```

#### 开发阶段素材策略

| 阶段 | 策略 |
|------|------|
| **原型期 (P0-P2)** | 纯程序化，无外部依赖 |
| **内容期 (P3-P5)** | 逐步替换关键资产（行星纹理、Unicorn 场景） |
| **发布期 (P6-P7)** | 完整资产整合，CDN 优化 |

---

## 9. 项目约束

### 9.1 技术约束

| 约束项 | 说明 |
|--------|------|
| **微信包体** | 主包 < 4MB，纹理资源 CDN 化 |
| **性能目标** | 60FPS (Web)，30FPS (微信小游戏) |
| **浏览器支持** | Chrome 90+, Safari 15+, WebGL 2.0 |
| **微信版本** | 支持 WebGL 的微信版本（大部分现代设备） |

### 9.2 内容约束

| 约束项 | 说明 |
|--------|------|
| **文明等级** | 8个等级 (0-Ⅶ)，顺序解锁 |
| **每等级最小场景** | 3种可收集能量类型 + 5种随机事件 |
| **升级条件** | 累计能量达到阈值 |

### 9.3 开发约束

| 约束项 | 说明 |
|--------|------|
| **代码组织** | 每等级独立目录，便于按需加载 |
| **素材可替换** | 所有纹理/音频有接口，支持运行时切换 |
| **微信适配** | 所有 API 调用通过适配层，无硬编码 |
| **测试覆盖** | 精灵组件有独立测试场景 |

| 库 | 定位 | 在游戏中的用途 |
|----|------|---------------|
| **Unicorn Studio** | WebGL 场景级特效 | 背景星空流动、能量云雾、黑洞吸积盘、创世核心等大型场景特效 |
| **React Bits** | React UI 动效 | HUD 元素动画、按钮交互、能量收集特效、菜单转场 |
| **Design Spells** | 微交互动效 | 飞船 hover、能量球悬停、按钮点击反馈、事件触发微交互 |

```
┌─────────────────────────────────────────┐
│      React DOM UI Layer                 │
│  ├── React Bits 动效 (FallingRays 等)    │
│  └── Design Spells 微交互 (hover/click)  │
├─────────────────────────────────────────┤
│    Three.js WebGL Layer                 │
│  ├── 天体网格 (CelestialBody)           │
│  ├── Unicorn Studio 背景 (粒子/星云)     │
│  └── 粒子特效系统                       │
├─────────────────────────────────────────┤
│   Canvas 2D Overlay Layer              │
│  └── 能量收集 Canvas 特效                │
└─────────────────────────────────────────┘
```

---

## 5. 场景设计

### 5.1 原始文明场景 (Tier 0 - 地球海边)

**视觉风格：** 宁静的海边地平线，几何化的沙滩线条，远处简约山峦。

**环境元素：**
- 背景：渐变天空 + 几何海平面
- 前景：沙滩纹理、浪潮线
- 特效：波光粼粼、光晕扩散

**随机事件：**
- 🌊 海浪能量收集 (+能量)
- 🐚 沙滩宝物 (+能量 + 道具)
- 🌅 潮汐变化 (+持续能量流)
- 🦀 海洋生物发现 (+小额能量)

### 5.2 行星文明场景 (Tier Ⅰ - 近地轨道)

**视觉风格：** 完整的蓝色地球自转，地月系统，星空背景。

**环境元素：**
- 背景：Unicorn Studio 3D 蓝色渐变星空 + 漂浮卫星
- 前景：地球曲线，陨石带碎片
- 特效：极光效果，大气层光晕

**随机事件：**
- 🚀 废弃卫星对接 (+能量)
- ☄️ 陨石采集 (+能量 + 合金道具)
- 🛰️ 空间站探索 (+大量能量 + 技术碎片)
- 🌟 能量云发现 (+持续能量流)

### 5.3 恒星文明场景 (Tier Ⅱ - 太阳系)

**视觉风格：** 发光太阳为中心，八大行星轨道运行，小行星带穿梭。

**环境元素：**
- 背景：Unicorn Studio 3D 恒星耀斑 + 日冕
- 前景：太阳风粒子流，八大行星
- 特效：React Bits Star Burst 爆发效果

**随机事件：**
- 🔥 太阳耀斑 (+巨额能量 - 飞船损耗)
- 💫 能量吸收装置 (稳定收集)
- 🌀 引力弹弓 (+高速移动 + 能量)
- ☄️ 小行星带穿越 (+能量 + 稀有碎片)

### 5.4 星系文明场景 (Tier Ⅲ - 银河系)

**视觉风格：** 螺旋银河系旋臂，银河中心光斑，周边星云。

**环境元素：**
- 背景：银河系鸟瞰图，旋臂结构
- 前景：星云粒子场，恒星簇
- 特效：星光闪烁，旋臂流动

**随机事件：**
- 🌟 星云能量 (+大量能量)
- 🌀 旋臂穿越 (+高速移动 + 能量)
- 💫 脉冲星发现 (+持续能量流)
- 🌌 星系中心探索 (+巨额能量 + 剧情)

### 5.5 宇宙文明场景 (Tier Ⅳ - 星系团 & 宇宙网)

**视觉风格：** 多星系阵列分布，宇宙网纤维结构连接各星系团。

**环境元素：**
- 背景：宇宙网拓扑结构，暗物质丝
- 前景：多个星系群，光纤状连接
- 特效：引力透镜扭曲

**随机事件：**
- 🌉 宇宙网节点 (+巨额能量)
- 🕳️ 引力异常区 (+高风险高回报)
- 💫 星系间能量流 (+持续能量)
- ✨ 暗物质发现 (+稀有事件)

### 5.6 多维文明场景 (Tier Ⅴ - 极端天体)

**视觉风格：** 黑洞吸积盘，虫洞入口，超新星遗迹云。

**环境元素：**
- 背景：黑洞事件视界，吸积盘高能粒子
- 前景：虫洞光环，超新星残骸
- 特效：时空扭曲效果，引力透镜

**随机事件：**
- 🕳️ 黑洞能量抽取 (+巨额能量 - 高风险)
- 🚀 虫洞穿越 (+随机传送 + 能量)
- 💥 超新星遗迹 (+大量能量 + 稀有道具)
- ⏳ 时间膨胀区 (+独特事件)

### 5.7 边缘文明场景 (Tier Ⅵ - 宇宙边缘)

**视觉风格：** 宇宙边界光雾，能量壁垒形态，维度裂缝。

**环境元素：**
- 背景：宇宙微波背景辐射边缘
- 前景：能量壁垒光膜，维度碎片
- 特效：边界脉冲，纬度波动

**随机事件：**
- 🔮 维度裂缝 (+独特道具)
- ⚡ 能量壁垒穿透 (+巨额能量)
- 🌌 宇宙边缘探索 (+剧情碎片)
- 💫 边界能量收集 (+持续能量流)

### 5.8 创世文明场景 (Tier Ⅶ - 终极宇宙)

**视觉风格：** 创世核心光芒，宇宙法则几何网格，超越物质的存在。

**环境元素：**
- 背景：创世核心几何体，法则网格
- 前景：能量本源，宇宙符文
- 特效：创世之光，法则脉冲

**随机事件：**
- ✨ 创世能量收集 (+终极能量)
- 🔣 宇宙法则解锁 (+最高级道具)
- 🌟 创世核心激活 (+剧情完成)
- ⎈ 法则碎片共鸣 (+全能力量)

后续版本扩展内容。

---

## 6. UI/UX 设计

### 6.1 主界面布局

```
┌─────────────────────────────────────────┐
│  [能量条]  ★★★★★  [菜单]    [设置]     │  <- HUD顶部
│                                         │
│                                         │
│            [游戏画布区域]                │
│                                         │
│                                         │
│  [文明等级]  [当前能量/升级所需]         │  <- HUD底部
└─────────────────────────────────────────┘
```

### 6.2 能量收集特效 (React Bits)

**Falling Rays 效果：**
- 颜色：#00D4FF → #FFD700 渐变
- 脉冲频率：与收集时机同步
- 轨迹长度：0.3s 渐隐

### 6.3 交互规范

| 交互 | 反馈 |
|------|------|
| 能量球 Hover | Scale 1.2 + Glow光晕 |
| 收集触发 | Falling Rays + Scale bounce |
| 飞船加速 | 引擎尾迹拉长 + 视野拉伸 |
| 事件完成 | Modal弹窗 + Confetti特效 |

---

## 7. 微信小游戏特殊考量

### 7.1 包体限制应对

```typescript
// vite.config.ts 优化
export default defineConfig({
  build: {
    target: 'es6',
    rollupOptions: {
      output: {
        manualChunks: {
          'engine': ['./src/engine'],
          'effects': ['./src/effects'],
          'scenes': ['./src/scenes'],
        }
      }
    },
    // 微信小游戏分包
    chunkSizeLimit: '4mb',
  }
})
```

### 7.2 性能监控

```typescript
// 微信性能监控
wx.onMemoryWarning((res) => {
  if (res.level > 1) {
    // 降低画质，卸载次要资源
  }
})
```

### 7.3 用户行为上报

```typescript
// 微信事件埋点
wx.reportEvent('energy_collect', { tier: 1, amount: 50 })
wx.reportEvent('civilization_upgrade', { from: 1, to: 2 })
```

---

## 8. 开发阶段

| 阶段 | 内容 | 产出 |
|------|------|------|
| **P0** | 项目基础架构：Vite + React + Three.js + 精灵基类 + TestRunner | 可运行Demo |
| **P1** | 精灵组件 Phase 1：Tier0 精灵(Ocean, Sand, Tree, Mountain, EnergyOrb) + Tier1 精灵(Earth, Moon) | 基础精灵可测试 |
| **P2** | 精灵组件 Phase 2：Tier2 行星系统(Sun, Planets, AsteroidBelt) + Unicorn/ReactBits 集成 | 太阳系场景 |
| **P3** | 精灵组件 Phase 3：Tier3 星系(SpiralGalaxy, Nebula) + Tier4 宇宙(GalaxyCluster, CosmicWeb) | 银河系场景 |
| **P4** | 精灵组件 Phase 4：Tier5 极端天体(BlackHole, WormHole) + Tier6 边界(EnergyBarrier, DimensionalRift) | 高级场景 |
| **P5** | 精灵组件 Phase 5：Tier7 创世文明(CreationCore, LawGeometry) + 完整特效整合 | 完整内容 |
| **P6** | 游戏机制完善：能量收集、随机事件、文明升级、存档系统 | 可玩游戏 |
| **P7** | 微信小游戏适配 + 性能优化 + 最终调试 | 发布版本 |

### 8.1 精灵组件开发优先级

**Phase 1 (P0-P1):**
- Sprite 基类、EnvironmentSprite、CelestialSprite、ArtificialSprite
- Tier0: OceanSprite, SandSprite, TreeSprite, RockSprite, MountainSprite, CloudSprite, EnergyOrbSprite
- Tier1: EarthSprite, MoonSprite, SatelliteSprite, SpaceStationSprite, AsteroidSprite

**Phase 2 (P1-P2):**
- Tier2: YellowStarSprite, MercurySprite, VenusSprite, EarthTier2Sprite, MarsSprite, JupiterSprite, SaturnSprite, UranusSprite, NeptuneSprite, AsteroidBeltSprite, CometSprite

**Phase 3 (P3):**
- Tier3: SpiralGalaxySprite, NebulaSprite, StarClusterSprite, PulsarSprite
- Tier4: GalaxyClusterSprite, CosmicWebFiberSprite, DarkMatterNodeSprite

**Phase 4 (P4):**
- Tier5: BlackHoleSprite, WormHoleSprite, SupernovaRemnantSprite, NeutronStarSprite, AccretionDiskSprite
- Tier6: CosmicMicrowaveBackgroundSprite, EnergyBarrierSprite, DimensionalRiftSprite, BoundaryFogSprite

**Phase 5 (P5):**
- Tier7: CreationCoreSprite, LawGeometryGridSprite, CosmicRuneSprite, PrimordialEnergySprite

---

## 9. 成功标准

- [ ] Web版流畅运行，60FPS
- [ ] 微信小游戏包体 < 4MB
- [ ] 能量收集动效流畅自然
- [ ] 8个文明场景完整可玩
- [ ] 支持存档/读档
- [ ] 文明升级机制正常工作
- [ ] 创世文明场景完成