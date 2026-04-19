# 游戏开发指令：宇宙探索（场景0 - 行星文明）

## 1. 核心视觉与风格 (Style & Visual)
* **视觉风格**：**低多边形卡通风格 (Low-poly Cartoon)** 的战略沙盘。
* **参考对象**：模仿《三国无双起源》大地图，采用“上帝视角 + 战略地块”布局。
* **UI 规范**：原始石器 UI（石纹、兽皮、木头）。
    * **顶部**：极简状态栏（生命值、文明碎片、基础资源）。
    * **底部**：功能快捷键（地图缩放、技能、菜单）。

## 2. Three.js 技术实现架构 (Technical Architecture)

### 2.1 战略沙盘地图生成
* **线性区块化地图**：由 15 个地理区块（非洲、欧洲、亚洲等）组成的线性链表结构。
* **实现逻辑**：
    * 使用 `THREE.Group` 容器管理每个大区。
    * 地形简化为基础轮廓块（平原-绿、沙漠-黄、冰川-白）。
    * **迷雾系统**：未解锁区域覆盖半透明灰色材质；当前区域为实色；已通过区域显示路径连线。

### 2.2 交互逻辑 (Interaction)
* **漫游模式**：点击地图上的“可通行区块”，主角（简化智人剪影模型）通过 `SimplePathfinding` 或直线插值移动。
* **触发点系统**：
    * **NPC/部落枢纽**：固定位置的茅草屋模型，带有 `Sprite` 浮动标签。
    * **故事触发点**：石器/野兽图标，碰撞检测（主角靠近）即弹出交互 UI。
* **无缝切换**：
    * 大地图 ↔ 剧情：`Fade In/Out` 遮罩切换。
    * 大地图 ↔ 塔防战斗：清除场景中的地图组，加载当前关卡的 `BattleField` 容器。

## 3. 核心数据结构 (Data Schema)

```javascript
// 15个区域的顺序与核心设定
const RegionConfig = [
  { id: 1, name: "非洲最南部", land: "好望角", hub: "望海部", color: "#2E8B57" }, // 起点
  { id: 2, name: "非洲中部", land: "草原雨林", hub: "逐鹿部", color: "#32CD32" },
  { id: 3, name: "埃及", land: "尼罗河沿岸", hub: "河部落", color: "#EDC9AF" },
  { id: 4, name: "地中海", land: "沿岸地区", hub: "渔部落", color: "#0077BE" },
  { id: 5, name: "欧洲", land: "森林平原", hub: "木灵部", color: "#228B22" },
  { id: 6, name: "阿拉伯", land: "沙漠绿洲", hub: "水泽部", color: "#C2B280" },
  { id: 7, name: "印度", land: "恒河丛林", hub: "恒河部", color: "#8B4513" },
  { id: 8, name: "俄罗斯", land: "冻土森林", hub: "冰原部", color: "#FFFFFF" },
  { id: 9, name: "白令海峡", land: "冰滩通道", hub: "渡海部", color: "#F0F8FF" },
  { id: 10, name: "北美", land: "山地草原", hub: "野牛部", color: "#A0522D" },
  { id: 11, name: "南美", land: "雨林高原", hub: "雨林部", color: "#006400" },
  { id: 12, name: "南极", land: "极地冰川", hub: "冰寒部", color: "#B0E0E6" },
  { id: 13, name: "澳大利亚", land: "澳洲草原", hub: "袋鼠部", color: "#DEB887" },
  { id: 14, name: "中国", land: "黄河长江", hub: "黄河部", color: "#FFD700" },
  { id: 15, name: "中国昆仑山", land: "圣石之地", hub: "昆仑部", color: "#FF4500" } // 终点
];

const GameState = {
  currentRegionIndex: 0,
  resources: { stone: 0, wood: 0, food: 0, shards: 0 },
  player: { hp: 100, unlockedSkills: [] },
  // 地区配置列表
  regions: [
    {
      id: "africa_south",
      name: "好望角",
      color: 0x228b22, // 森林绿
      hubs: [{ id: "h1", type: "village", position: {x: 10, z: 5} }],
      events: [
        { id: "e1", type: "defense", title: "海边防御战", isCleared: false },
        { id: "e2", type: "side_quest", title: "驱逐野兽", isCleared: false }
      ],
      isUnlocked: true
    }
    // ... 依次类推至昆仑山
  ]
};
```


## 4. 核心战斗：轻量化塔防 (Battle Logic)

### 4.1 防御系统
* **建造模式**：在战斗容器的指定 Slot（槽位）点击放置。
* **塔类数据**：
    * `StoneTower`：基础单体攻击。
    * `SpikeTrap`：地面持续伤害陷阱。
    * `CrossbowTower`：长距离高速攻击（需木头+石头）。

### 4.2 敌人与胜负
* **AI 路径**：敌人沿着预设的 `SplineCurve` 向目标（部落或粮食储备区）移动。
* **状态管理**：
    * **胜利**：守住 N 波敌人。
    * **失败**：核心目标生命值为 0 或主角死亡。

## 5. 关卡路线图 (Roadmap)
1.  **非洲南部** (引导) -> 2. **非洲中部** (调解) -> 3. **埃及** (加固) -> ... -> 11. **中国** (黄河农耕) -> 12. **昆仑山** (终局圣石战)。
