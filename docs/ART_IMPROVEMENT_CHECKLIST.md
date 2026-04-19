# Cosmic Cruise 美术设计改进清单

本文档详细分析项目中游戏美术设计可以改进的地方，按六大类别列出问题和改进建议。

---

## 一、着色器/材质设计

### 1.1 着色器性能问题

| 问题描述 | 改进建议 |
|---------|---------|
| **NebulaSprite.ts** 使用复杂的 Simplex Noise + 5层 FBM 运算，每帧在 fragment shader 中计算大量噪声，对移动端 GPU 压力极大 | 移动端改用预计算的 3D 噪声纹理采样，降低 FBM 层数至 2-3 层，或提供简化版 shader（PC/console 专用 flag） |
| **EnergyOrbSprite.ts** 的核心 shader 包含 4层 FBM 迭代，每帧计算量大 | 降低 FBM 迭代次数至 2 层，使用半分辨率渲染 |
| **BlackHoleSprite.ts** 吸积盘 shader 包含双层噪声 + 湍流计算 + 多普勒效应，GPU 负载高 | 拆分 shader 为基础层 + 细节层，移动端只渲染基础层 |

### 1.2 缺少移动端着色器变体

| 问题描述 | 改进建议 |
|---------|---------|
| 项目所有自定义 shader 都没有移动端变体或平台限制标记 | 为每个复杂 shader 添加 `#ifdef MOBILE` 条件编译或独立变体，明确标注 `// Mobile: 限制使用` |
| **PulsarSprite.ts** 包含 4 个脉冲环 + 2 个光柱 + 核心光晕，移动端渲染 pass 过多 | 移动端合并部分效果，减少 transparent pass 数量 |

### 1.3 材质质量不足

| 问题描述 | 改进建议 |
|---------|---------|
| **OceanSprite.ts** 使用 Canvas 程序化生成法线贴图，只是随机噪声，无法表现真实水波纹理 | 使用 Perlin/Simplex 噪声预生成高质量法线贴图，或导入专业水纹理 |
| **EarthSprite.ts** 的地球纹理和云层纹理均为 Canvas 绘制的大色块，细节粗糙 | 导入真实地球纹理贴图（NASA 公开资源），或使用更高质量的程序化生成 |
| **TreeSprite.ts** 使用 `flatShading: true` 的 MeshStandardMaterial，低模风格明显 | 添加法线贴图增加细节，或考虑低多边形艺术风格的统一化 |

### 1.4 Shader 最佳实践

| 问题描述 | 改进建议 |
|---------|---------|
| 多个 shader 中的 `uTime` 统一更新逻辑分散，每个精灵各自管理 | 建立统一的 Shader Uniform 管理器，集中更新时间，避免重复上传 |
| Shader 参数字没有文档注释，艺术家无法理解有效范围 | 为每个 uniform 添加 tooltip 风格注释，例如 `// uPulseSpeed: 脉冲速度 (0.5-3.0)` |

---

## 二、光照和氛围

### 2.1 光照设置过于简单

| 问题描述 | 改进建议 |
|---------|---------|
| **App.tsx** 只有 AmbientLight (0x404060, 0.7) + DirectionalLight (0xffffff, 1.4)，场景氛围单薄 | 添加 HemisphereLight 模拟天地环境光，为不同文明等级设计不同光照方案 |
| 没有针对不同场景（Tier 0-7）的差异化光照配置 | 按文明等级设计光照方案：Tier 0 暖黄、Tier 5 暗黑红、Tier 7 纯净白光 |

### 2.2 缺少后处理效果

| 问题描述 | 改进建议 |
|---------|---------|
| 项目未使用任何 Three.js 后处理效果（Bloom、God Rays、Bokeh） | 添加轻量级 Bloom 用于恒星/能量球发光，移动端使用下采样版本 |
| **YellowStarSprite** 有日冕效果但没有与场景 Bloom 集成 | 集成 UnrealBloomPass，让恒星真正向场景散发光晕 |
| **BlackHoleSprite** 的吸积盘应该有更强的视觉冲击力 | 添加色差（Chromatic Aberration）和暗角效果增强黑洞场景 |

### 2.3 环境氛围不足

| 问题描述 | 改进建议 |
|---------|---------|
| 各 Tier 场景没有差异化的背景色和雾气效果 | 添加场景级 fog（THREE.FogExp2），Tier 0 用淡蓝雾，Tiers 5-7 用深空黑雾 |
| 星空背景使用固定颜色 0x0a0a1a，层次单一 | 引入程序化星空背景shader，添加远处星云/星系作为背景层 |

### 2.4 光照性能优化

| 问题描述 | 改进建议 |
|---------|---------|
| 多个 PointLight（如能量球的 PointLight）在场景中可能导致 Draw Call 增加 | 合并小光源为单一光源或使用 deferred rendering |
| 阴影设置使用 1024x1024 mapSize，对移动端过高 | 添加平台检测，移动端使用 512x512 或禁用阴影 |

---

## 三、粒子和特效

### 3.1 粒子系统性能问题

| 问题描述 | 改进建议 |
|---------|---------|
| **YellowStarSprite** 的耀斑粒子系统（40个粒子）在 CPU 端每帧更新位置 | 改用 GPU 粒子系统（ShaderMaterial + vertex shader 位置计算） |
| **EnergyOrbSprite** 的 80 个尾迹粒子在 CPU 端计算轨道 | 使用 GPU InstancedPoints 或 TransformFeedback |
| **BlackHoleSprite** 的 180 个 Hawking 辐射粒子 CPU 更新 | 同上，GPU 化 |
| **NebulaSprite** 的 300 个尘埃粒子使用 CPU 更新飘动 | GPU 化，使用 vertex shader 中的时间偏移 |

### 3.2 粒子数量和 Overdraw

| 问题描述 | 改进建议 |
|---------|---------|
| 多个效果叠加使用 AdditiveBlending（能量球、黑洞吸积盘、星云、脉冲星），可能导致严重 overdraw | 建立粒子数量预算：移动端 ≤500，PC ≤2000；使用 alpha blending 代替 additive |
| **PulsarSprite** 同时存在核心光晕 + 脉冲环 + 光柱 + 脉冲环，overdraw 层数过多 | 移动端减少脉冲环数量，简化光柱效果 |

### 3.3 粒子纹理和 atlas

| 问题描述 | 改进建议 |
|---------|---------|
| 粒子使用 PointsMaterial 默认圆形，没有使用纹理 | 创建粒子纹理 atlas（光晕、光斑、闪光），所有粒子系统共享 |
| 能量球尾迹粒子大小为 r*0.22，没有根据距离衰减 | 添加 sizeAttenuation: true，并根据距离调整大小 |

### 3.4 特效系统架构

| 问题描述 | 改进建议 |
|---------|---------|
| 能量收集特效使用 Canvas 2D 实现，性能有限 | 考虑使用 Three.js Points 或 sprite-based 粒子系统替代 Canvas |
| 没有统一的特效管理器和预算系统 | 建立 VFX Manager，统一管理激活的特效粒子数量 |

---

## 四、色彩和视觉风格

### 4.1 色彩体系不统一

| 问题描述 | 改进建议 |
|---------|---------|
| 各精灵使用硬编码颜色（0x00ff88, 0xFFD700 等），没有统一的调色板 | 建立项目级调色板，为 8 个文明等级定义主色/辅色/强调色 |
| 能量球用青绿色，黑洞用橙黄色，星云用紫蓝色，风格跳跃 | 设计从 Tier 0 到 Tier 7 的渐变色彩叙事：自然色 → 冷蓝 → 金黄 → 深紫 → 纯白 |

### 4.2 视觉风格不一致

| 问题描述 | 改进建议 |
|---------|---------|
| Tier 0 使用低多边形风格（flatShading），Tier 3+ 使用程序化写实风格，风格割裂 | 确定统一风格路线：要么全项目低多边形，要么写实风格为主 |
| 树木用 MeshStandardMaterial 写实渲染，行星用 Canvas 纹理，水平不一 | 统一材质质量标准，或明确标注哪些是"简化版"哪些是"高质量版" |

### 4.3 色彩校正缺失

| 问题描述 | 改进建议 |
|---------|---------|
| 没有整体色彩校正（Color Grading）和 LUT | 引入 Post-processing ColorCorrection，使用 LUT 统一色调 |
| 移动端和 PC 端色彩表现可能差异大 | 添加平台色彩校正配置 |

### 4.4 发光效果过度使用

| 问题描述 | 改进建议 |
|---------|---------|
| 大量使用 AdditiveBlending 实现发光，但缺少 bloom 后处理，导致"假发光" | 配合 Bloom 后处理使用，或使用 emissive 材质属性 |
| 能量球/恒星/星云都使用强烈的 additive 白色/金色高光 | 按重要性分级：核心用高亮 additive，背景用微弱发光 |

---

## 五、动效和反馈

### 5.1 动画单一

| 问题描述 | 改进建议 |
|---------|---------|
| 所有精灵动画使用简单的 `Math.sin(time)` 线性正弦波，缺少缓动 | 引入 easing 函数库（如 GSAP 或自定义），添加 ease-in-out、elastic 等效果 |
| **TreeSprite** 树冠摇摆使用固定频率，缺少随机性 | 添加 Perlin 噪声驱动的自然摇摆，多个频率叠加 |
| 脉冲效果（能量球、黑洞、日冕）都使用相同公式 | 为不同类型设计不同脉冲曲线：能量球用弹性脉冲，黑洞用沉重脉冲 |

### 5.2 交互反馈不足

| 问题描述 | 改进建议 |
|---------|---------|
| 能量球收集只有 Canvas 2D 特效，没有 3D 场景反馈 | 添加 3D 粒子爆发、光线扩散、相机震动等反馈 |
| 没有 hover 反馈（设计文档中有提到 Design Spells） | 集成已有的 GlowHover 等设计，实现精灵 hover 时的发光/scale 反馈 |
| 交互没有声音反馈 | 添加 Web Audio 反馈，收集能量、升级、解锁等事件音效 |

### 5.3 动画过渡缺失

| 问题描述 | 改进建议 |
|---------|---------|
| 切换精灵/场景时是硬切换，没有过渡动画 | 添加淡入淡出、缩放过渡或滑动效果 |
| 文明等级切换没有视觉叙事 | 设计 Tier 升级时的过场动画（缩放穿越、颜色渐变） |

### 5.4 UI 动画改进

| 问题描述 | 改进建议 |
|---------|---------|
| 能量条变化是即时跳变，没有平滑动画 | 添加能量条动画（React Bits EnergyBar 已有，但需要配置） |
| 按钮/交互元素缺少 Design Spells 集成 | 全面集成 GlowHover、ScaleBounce、ClickSpark 等动效 |

---

## 六、性能优化（针对移动端）

### 6.1 Geometry 更新优化

| 问题描述 | 改进建议 |
|---------|---------|
| **OceanSprite.ts** 每帧更新所有顶点位置并重新计算法线，O(n) 复杂度，80x80 网格 = 6400 顶点 | 使用 GPU vertex shader 动画，移动端改用更小网格（32x32）或不更新顶点 |
| 顶点更新使用 `positions.setY(i, y)` 逐个设置，没有使用 typed array 批量操作 | 使用 BufferAttribute 直接操作 Float32Array |

### 6.2 Draw Call 优化

| 问题描述 | 改进建议 |
|---------|---------|
| **SaturnSprite** 土星环使用单一 RingGeometry，每帧单独 draw call | 使用 InstancedMesh 或合并几何体 |
| 每个能量球、恒星都有独立 PointLight，增加 draw call | 使用单一全局光源或光照贴图 |
| 粒子系统各自独立，没有共享 geometry/material | 建立粒子系统池，共享 geometry 和 material |

### 6.3 LOD 系统缺失

| 问题描述 | 改进建议 |
|---------|---------|
| 没有实现任何 LOD（Level of Detail）系统 | 为主要精灵实现 LOD：LOD0 高质量，LOD1 中等，LOD2 简化 |
| 相机距离恒星/黑洞很远时仍使用相同精度几何体 | 根据相机距离动态切换几何体精度 |

### 6.4 纹理和内存

| 问题描述 | 改进建议 |
|---------|---------|
| 多个精灵各自创建 CanvasTexture，没有共享 | 建立纹理 atlas，所有同类精灵共享纹理 |
| Canvas 生成纹理分辨率固定（512x512），没有针对移动端优化 | 移动端使用 256x256 或更低分辨率纹理 |
| 没有纹理压缩，所有纹理使用默认格式 | 使用压缩纹理：移动端 ASTC/ETC2，PC DXT/BC7 |

### 6.5 渲染设置优化

| 问题描述 | 改进建议 |
|---------|---------|
| `antialias: true` 对移动端开销大 | 移动端禁用或使用 MSAA 替代方案 |
| `pixelRatio` 固定为 `Math.min(window.devicePixelRatio, 2)`，高分屏仍可能超预算 | 移动端限制为 1.5 或 1.0 |
| 没有使用 frame budget 机制监控性能 | 添加 frame time 监控，超预算时自动降级质量 |

### 6.6 移动端特定优化

| 问题描述 | 改进建议 |
|---------|---------|
| 没有平台检测和自适应质量 | 添加 `detectPlatform()` 函数，移动端自动启用低质量模式 |
| 透明对象过多（多个 additive 效果叠加） | 移动端减少透明层数，优先渲染不透明对象 |
| 没有处理 `wx.onMemoryWarning`（微信小游戏） | 接入内存警告，触发时立即降低纹理质量和粒子数量 |

---

## 七、优先级建议

### 高优先级（P0）- 影响核心体验

1. 添加 LOD 系统（所有重要精灵）
2. 移动端 shader 降级方案
3. 粒子系统 GPU 化
4. OceanSprite 顶点动画优化

### 中优先级（P1）- 提升视觉质量

1. 统一调色板和色彩叙事
2. Bloom 后处理集成
3. 差异化光照方案
4. 交互反馈增强

### 低优先级（P2）- 完善细节

1. 统一材质质量标准
2. 动画 easing 改进
3. 音效集成
4. 色彩校正/LUT

---

## 八、技术债务记录

| 项目 | 问题 | 建议修复方式 |
|------|------|-------------|
| `src/sprites/Sprite.ts` | 没有 LOD 接口 | 添加 `getLODLevel(cameraDistance)` 方法 |
| `src/sprites/CelestialSprite.ts` | 缺少统一的 shader uniform 管理 | 创建 `ShaderUniformManager` 类 |
| `src/effects/canvas/index.tsx` | Canvas 2D 性能有限 | 考虑迁移到 Three.js 粒子系统 |
| `App.tsx` | 光照配置硬编码 | 提取为 `LightingConfig` 按 Tier 加载 |
| 无 | 缺少性能预算文档 | 创建 `PERFORMANCE_BUDGET.md` |
| 无 | 缺少美术风格指南 | 创建 `ART_STYLE_GUIDE.md` |

---

*文档生成时间：2026-04-18*
*项目：Cosmic Cruise - 宇宙文明进化主题探索收集游戏*