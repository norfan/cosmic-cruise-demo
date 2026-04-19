# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 和 OpenCode 在本仓库工作时提供指导。

## OpenCode 兼容

OpenCode 用户请先查看 [references/opencode-tools.md](references/opencode-tools.md) 获取工具映射。

建议使用以下技能以获得最佳体验：
- `brainstorming` - 创建功能/组件前
- `systematic-debugging` - Bug 调试
- `test-driven-development` - 功能实现
- `verification-before-completion` - 提交前验证

## 项目概述

**Cosmic Cruise** 是一款宇宙文明进化主题的探索收集游戏。玩家驾驶飞船穿越8个文明等级，收集能量节点，触发随机事件。采用 Web (Three.js + React) 和微信小游戏双目标构建。

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器（热重载）
npm run build        # 生产构建（web + 微信）
npm run lint         # 运行 ESLint
```

## 架构设计文档

- [CELESTIAL_BODY_ARCHITECTURE.md](design/CELESTIAL_BODY_ARCHITECTURE.md) - 天体组件系统（继承体系、工厂模式）
- [SPRITE_COMPONENT_DESIGN.md](design/SPRITE_COMPONENT_DESIGN.md) - 精灵组件系统详细设计（所有精灵清单、动效映射）

## 架构

### 三层渲染架构

```
┌─────────────────────────────────────────┐
│      React DOM UI Layer                │  ← HUD、菜单、道具栏
├─────────────────────────────────────────┤
│    Three.js WebGL Canvas Layer         │  ← 游戏场景（天体、星空、飞船）
├─────────────────────────────────────────┤
│   Canvas 2D Overlay / Effect Layer       │  ← 能量收集特效、光晕效果
└─────────────────────────────────────────┘
```

### 核心层次

```
src/
├── engine/           # GameLoop (RAF)、Entity基类、Physics、EventBus、ObjectPool
├── renderer/        # Three.js 渲染器封装、Camera、PostProcessing
├── sprites/         # 精灵组件系统 (tier0/~tier7/)
│   ├── Sprite.ts
│   ├── EnvironmentSprite.ts
│   ├── CelestialSprite.ts
│   └── tier0/       # OceanSprite, SandSprite, TreeSprite 等
├── scenes/          # 8个文明等级场景 (Tier0Scene ~ Tier7Scene)
├── effects/
│   ├── unicorn/     # Unicorn Studio 集成
│   ├── reactbits/   # React Bits 动效集成
│   └── canvas/      # Canvas 2D 覆盖层特效
├── stores/          # Zustand 状态管理
├── components/
│   ├── ui/         # 通用UI组件
│   ├── hud/         # 游戏抬头显示
│   └── menus/       # 菜单界面
├── hooks/           # 自定义 Hooks
├── utils/           # 工具函数
└── wechat/          # 微信小游戏适配层
test/
├── TestRunner.ts    # 通用测试运行器
├── sprites/         # 精灵单元测试
└── scenes/         # 测试场景 (SpriteTestScene, AllSpritesDemoScene)
```

### 状态管理

Zustand store 持有 `GameResources`：energy、totalEnergy、items、unlockedTiers、currentTier。场景逻辑通过 EventBus 派发事件，UI组件响应式订阅。

### 事件总线模式

所有游戏到UI、场景到场景的通信都通过 `EventBus.ts`。这解耦了 Three.js 游戏逻辑和 React UI。

## 关键模式

- **动效库三合一**:
  - **Unicorn Studio** (`unicornstudio-react`) - Three.js 场景背景层，粒子/星云特效
  - **React Bits** (`@appletosolutions/reactbits`) - React UI 动效，HUD/能量收集
  - **Design Spells** - 微交互动效，hover/click 反馈
- **精灵组件系统**: Sprite 基类 → EnvironmentSprite / CelestialSprite / ArtificialSprite → 具体实现。Tier0 ~ Tier7 每级独立子目录
- **场景切换**: 8个文明等级 (0-Ⅶ)，每等级独立的 Scene 类和精灵配置
- **SpaceScene 容器**: 基于 `THREE.Scene`，管理精灵动态加载，通过 JSON 配置实例化
- **测试场景**: `test/TestRunner.ts` 支持单个精灵加载验证
- **能量收集**: 能量球发送事件 → EventBus → Canvas 2D / React Bits 特效
- **微信存储**: 使用 `wx.setStorageSync` / `wx.getStorageSync` 而非 localStorage
- **对象池**: 精灵实例复用对象池以避免 GC 压力

## 微信小游戏限制

- 主包 < 4MB（Three.js ~150KB + 代码分割 + CDN 资源）
- 设计目标：720p，通过 viewport 缩放适配
- 使用 `wx.onMemoryWarning` 触发画质降低
- 通过 `wx.reportEvent` 上报事件