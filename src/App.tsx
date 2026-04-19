/**
 * App.tsx - Cosmic Cruise 主入口
 *
 * 阶段（P2）:
 *   - 精灵测试场景（Three.js WebGL）
 *   + Unicorn Studio / React Bits / Design Spells 动效展示
 *   - 右上角下拉菜单切换不同精灵
 *   - 动效标签页：展示三大动效库的效果
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './App.css';

// ── 主菜单 ─────────────────────────────────────────────
import MainMenu, { CIVILIZATION_TIERS, TierInfo } from './components/MainMenu';

// ── 场景系统 ─────────────────────────────────────
import { SCENE_REGISTRY, GameScene } from './scenes';

// ── 动效库导入 ──────────────────────────────────
// 注意：Aurora/Particles/ClickSpark/StarBorder 依赖 WebGL 渲染器，已移除
// 如需使用，请确保 Three.js WebGL 上下文已初始化
import { ClickSpark, StarBorder } from '@appletosolutions/reactbits';
import {
  GlowHover,
  ScaleBounce,
  MagneticEffect,
  PulseGlow,
  CursorTrail,
  EnergyBar,
  Shimmer,
  RippleEffect,
  InteractableSprite,
} from '@/effects/designspells';
import { CanvasOverlay, useEnergyEffect } from '@/effects/canvas';
import { UnicornBackground } from '@/effects/unicorn';

// ── 精灵导入 ──────────────────────────────────────
import { OceanSprite } from './sprites/tier0/OceanSprite';
import { SandSprite } from './sprites/tier0/SandSprite';
import { TreeSprite } from './sprites/tier0/TreeSprite';
import { MountainSprite } from './sprites/tier0/MountainSprite';
import { EnergyOrbSprite } from './sprites/tier0/EnergyOrbSprite';
import { EarthSprite } from './sprites/tier1/EarthSprite';
import { MoonSprite } from './sprites/tier1/MoonSprite';

// ── Tier2 太阳系精灵 ───────────────────────────
import {
  YellowStarSprite,
  MercurySprite,
  VenusSprite,
  MarsSprite,
  JupiterSprite,
  SaturnSprite,
  UranusSprite,
  NeptuneSprite,
  AsteroidBeltSprite,
  CometSprite,
} from './sprites/tier2';

// ── Tier4 宇宙网精灵 ─────────────────────────
import {
  GalaxyClusterSprite,
  CosmicWebFiberSprite,
  DarkMatterNodeSprite,
  QuasarSprite,
} from './sprites/tier4';

// ── Tier5 极端天体 ──────────────────────────
import {
  BlackHoleSprite,
  WormHoleSprite,
  WhiteHoleSprite,
} from './sprites/tier5';

// ── Tier6 创世精灵 ──────────────────────────
import {
  GenesisCoreSprite,
  LawGeometrySprite,
  CosmicBoundarySprite,
} from './sprites/tier6';

// ── Tier7 终局精灵 ──────────────────────────
import {
  MultiverseNodeSprite,
  CosmicConsciousnessSprite,
  OmegaPointSprite,
} from './sprites/tier7';

// ── Tier3 星系精灵 ───────────────────────────
import {
  SpiralGalaxySprite,
  NebulaSprite,
  StarClusterSprite,
  PulsarSprite,
} from './sprites/tier3';

import type { Sprite, SpriteConfig } from './sprites/Sprite';
import type { CelestialSpriteConfig } from './sprites/CelestialSprite';
import type { RegionBlock } from './scenes/Scene0Map';

// ── 精灵注册表 ───────────────────────────────────
const SPRITE_REGISTRY: Record<string, {
  label: string;
  create: () => Sprite;
  camPos: THREE.Vector3;
}> = {
  ocean: {
    label: '🌊 海洋 (OceanSprite)',
    create: () => new OceanSprite(),
    camPos: new THREE.Vector3(0, 8, 20),
  },
  sand: {
    label: '🏖 沙滩 (SandSprite)',
    create: () => new SandSprite({ position: new THREE.Vector3(0, 0, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 15),
  },
  tree_pine: {
    label: '🌲 松树 (TreeSprite)',
    create: () => new TreeSprite({ variant: 'pine' } as SpriteConfig),
    camPos: new THREE.Vector3(0, 3, 10),
  },
  tree_palm: {
    label: '🌴 棕榈 (TreeSprite)',
    create: () => new TreeSprite({ variant: 'palm' } as SpriteConfig),
    camPos: new THREE.Vector3(0, 3, 10),
  },
  tree_broad: {
    label: '🌳 阔叶树 (TreeSprite)',
    create: () => new TreeSprite({ variant: 'broad' } as SpriteConfig),
    camPos: new THREE.Vector3(0, 3, 10),
  },
  mountain: {
    label: '⛰ 远山 (MountainSprite)',
    create: () => new MountainSprite({ position: new THREE.Vector3(0, 0, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 30),
  },
  energyOrb: {
    label: '✨ 能量球 (EnergyOrbSprite)',
    create: () => new EnergyOrbSprite({ position: new THREE.Vector3(0, 1.5, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 6),
  },
  earth: {
    label: '🌍 地球 (EarthSprite)',
    create: () => new EarthSprite({ position: new THREE.Vector3(0, 0, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 10),
  },
  moon: {
    label: '🌕 月球 (MoonSprite)',
    create: () =>
      new MoonSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 4, speed: 0.3, center: new THREE.Vector3(0, 0, 0) },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 10),
  },

  // ── Tier 2 恒星文明 ─────────────────────────
  yellowStar: {
    label: '☀️ 太阳 (YellowStar)',
    create: () => new YellowStarSprite({ position: new THREE.Vector3(0, 0, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 0, 15),
  },
  mercury: {
    label: '☿️ 水星 (Mercury)',
    create: () =>
      new MercurySprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 8, speed: 0.8, center: new THREE.Vector3(0, 0, 0), initialAngle: 0.5 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 15),
  },
  venus: {
    label: '♀️ 金星 (Venus)',
    create: () =>
      new VenusSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 12, speed: 0.6, center: new THREE.Vector3(0, 0, 0), initialAngle: 2.1 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 3, 20),
  },
  mars: {
    label: '♂️ 火星 (Mars)',
    create: () =>
      new MarsSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 17, speed: 0.45, center: new THREE.Vector3(0, 0, 0), initialAngle: 4.2 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 25),
  },
  asteroidBelt: {
    label: '☄️ 小行星带 (AsteroidBelt)',
    create: () =>
      new AsteroidBeltSprite({
        position: new THREE.Vector3(0, 0, 0),
        innerRadius: 22, outerRadius: 30, count: 250,
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 40),
  },
  jupiter: {
    label: '♃ 木星 (Jupiter)',
    create: () =>
      new JupiterSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 38, speed: 0.18, center: new THREE.Vector3(0, 0, 0), initialAngle: 1.0 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 60),
  },
  saturn: {
    label: '♄ 土星 (Saturn)',
    create: () =>
      new SaturnSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 50, speed: 0.12, center: new THREE.Vector3(0, 0, 0), initialAngle: 3.5 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 75),
  },
  uranus: {
    label: '⛢ 天王星 (Uranus)',
    create: () =>
      new UranusSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 62, speed: 0.07, center: new THREE.Vector3(0, 0, 0), initialAngle: 5.2 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 90),
  },
  neptune: {
    label: '♆ 海王星 (Neptune)',
    create: () =>
      new NeptuneSprite({
        position: new THREE.Vector3(0, 0, 0),
        orbit: { radius: 75, speed: 0.05, center: new THREE.Vector3(0, 0, 0), initialAngle: 0.8 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 105),
  },
  comet: {
    label: '☄️ 彗星 (Comet)',
    create: () =>
      new CometSprite({
        position: new THREE.Vector3(25, 0, 0),
        orbit: { radius: 30, speed: 0.3, center: new THREE.Vector3(0, 0, 0), initialAngle: 0 },
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 2, 35),
  },

  // ── Tier 3 星系文明 ─────────────────────────
  spiralGalaxy: {
    label: '🌌 螺旋星系 (SpiralGalaxy)',
    create: () => new SpiralGalaxySprite({ position: new THREE.Vector3(0, 0, 0) } as SpriteConfig),
    camPos: new THREE.Vector3(0, 10, 25),
  },
  nebula: {
    label: '🌈 星云 (Nebula)',
    create: () =>
      new NebulaSprite({
        color: '#9933FF',
        color2: '#00CCFF',
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 20),
  },
  starCluster: {
    label: '⭐ 星团 (StarCluster)',
    create: () =>
      new StarClusterSprite({
        radius: 5,
        starCount: 800,
        globular: true,
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 12),
  },
  pulsar: {
    label: '🔵 脉冲星 (Pulsar)',
    create: () =>
      new PulsarSprite({
        period: 1.0,
        coreRadius: 0.3,
        beamLength: 8,
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 3, 12),
  },

  // ── Tier 4 宇宙网 ─────────────────────────────
  galaxyCluster: {
    label: '🌐 星系团 (GalaxyCluster)',
    create: () =>
      new GalaxyClusterSprite({
        galaxyCount: 10,
        clusterRadius: 18,
        coreBrightness: 0.6,
        haloScale: 2.2,
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 10, 35),
  },
  cosmicWebFiber: {
    label: '🕸️ 宇宙网纤维 (CosmicWebFiber)',
    create: () =>
      new CosmicWebFiberSprite({
        length: 30,
        curvature: 1.2,
        nodeCount: 350,
        color1: '#4488ff',
        color2: '#aa44ff',
      } as SpriteConfig),
    camPos: new THREE.Vector3(0, 5, 25),
  },
  darkMatterNode: {
    label: '🕳️ 暗物质节点 (DarkMatterNode)',
    create: () =>
      new DarkMatterNodeSprite({
        radius: 4,
        lensRingScale: 1.5,
        distortionStrength: 0.5,
        glowColor: '#ff6600',
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 3, 14),
  },
  quasar: {
    label: '💫 类星体 (Quasar)',
    create: () =>
      new QuasarSprite({
        diskRadius: 6,
        jetLength: 25,
        brightness: 0.8,
        jetColor: '#00ccff',
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 3, 20),
  },

  // ── Tier 5 极端天体 ─────────────────────────
  blackHole: {
    label: '🔳 黑洞 (BlackHole)',
    create: () =>
      new BlackHoleSprite({
        diskRadius: 7,
        diskBrightness: 0.9,
        jetLength: 22,
        eventHorizonR: 1.8,
        distortionStrength: 0.6,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 4, 18),
  },
  wormHole: {
    label: '🌀 虫洞 (WormHole)',
    create: () =>
      new WormHoleSprite({
        tunnelRadius: 2.5,
        tunnelLength: 12,
        energyColor: '#aa44ff',
        portalSize: 4,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 0, 16),
  },
  whiteHole: {
    label: '☀️ 白洞 (WhiteHole)',
    create: () =>
      new WhiteHoleSprite({
        coreRadius: 3,
        burstInterval: 3.5,
        explosionColor: '#ffffff',
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 3, 14),
  },

  // ── Tier 6 创世 ─────────────────────────────
  genesisCore: {
    label: '✨ 创世核心 (GenesisCore)',
    create: () =>
      new GenesisCoreSprite({
        coreRadius: 4,
        energyCount: 500,
        explosionIntensity: 1.0,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 5, 20),
  },
  lawGeometry: {
    label: '🔯 法则几何 (LawGeometry)',
    create: () =>
      new LawGeometrySprite({
        nestingLevels: 5,
        edgeGlow: 0.8,
        spinSpeed: 1.0,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 8, 35),
  },
  cosmicBoundary: {
    label: '🌌 宇宙边界 (CosmicBoundary)',
    create: () =>
      new CosmicBoundarySprite({
        shellRadius: 22,
        shellOpacity: 0.7,
        foamCount: 800,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 0, 28),
  },

  // ── Tier 7 终局 ─────────────────────────────────────
  multiverseNode: {
    label: '🫧 多宇宙节点 (MultiverseNode)',
    create: () =>
      new MultiverseNodeSprite({
        bubbleCount: 7,
        bubbleRadius: 2.5,
        orbitRadius: 10,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 5, 28),
  },
  cosmicConsciousness: {
    label: '🧠 宇宙意识体 (CosmicConsciousness)',
    create: () =>
      new CosmicConsciousnessSprite({
        nodeCount: 120,
        networkRadius: 14,
        synapseCount: 60,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 4, 32),
  },
  omegaPoint: {
    label: '♾️ Ω终点 (OmegaPoint)',
    create: () =>
      new OmegaPointSprite({
        singularityRadius: 2.5,
        vortexArms: 8,
        collapseParticles: 600,
      } as CelestialSpriteConfig),
    camPos: new THREE.Vector3(0, 8, 40),
  },
};



function setupLights(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0x404060, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(8, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(1024);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8899bb, 0.4);
  fill.position.set(-5, 2, -5);
  scene.add(fill);
}

// ─────────────────────────────────────────────────
// 动效展示页面
// ─────────────────────────────────────────────────
function EffectsShowcase() {
  const [activeTab, setActiveTab] = useState<'reactbits' | 'designspells' | 'unicorn'>('reactbits');
  const [energy, setEnergy] = useState(65);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectHook = useEnergyEffect() as any;
  const effects = effectHook.effects;
  const emit = effectHook.emit as typeof effectHook.emit;
  const clear = effectHook.clear;

  const handleCollect = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    emit(e.clientX - rect.left, e.clientY - rect.top, 'rays');
    setEnergy((prev) => Math.min(prev + 10, 100));
  }, [emit]);

  const tabs = [
    { id: 'reactbits' as const, label: '⚡ React Bits' },
    { id: 'designspells' as const, label: '✨ Design Spells' },
    { id: 'unicorn' as const, label: '🦄 Unicorn Studio' },
  ];

  return (
    <div className="effects-showcase">
      {activeTab !== 'unicorn' && <CursorTrail />}

      {/* 标签切换 */}
      <div className="effects-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`effects-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Unicorn Studio */}
      {activeTab === 'unicorn' && (
        <div className="tab-content unicorn-content">
          <div className="unicorn-scene-wrapper">
            <UnicornBackground
              scale={0.5}
              dpi={1}
              fps={60}
              onError={(err) => console.warn('Unicorn load failed:', err.message)}
            />
            <div className="unicorn-overlay">
              <h2>🦄 Unicorn Studio 场景特效</h2>
              <p>WebGL 交互式 3D 场景（projectId 或 jsonFilePath 模式）</p>
              <div className="info-card">
                降级方案：当 Unicorn Studio 不可用时，自动回退为 Canvas 2D 星空背景
              </div>
            </div>
          </div>
        </div>
      )}

      {/* React Bits */}
      {activeTab === 'reactbits' && (
        <div className="tab-content reactbits-content">
          <div className="effects-section">
            <h3>背景动效（Three.js WebGL 模式）</h3>
            <div className="effect-row">
              <div className="effect-item">
                <div style={{ padding: '60px 40px', background: 'linear-gradient(135deg, #0A0E27, #1A1F4E)', borderRadius: 8, textAlign: 'center', color: '#8888aa', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🌌</div>
                  Aurora 极光效果
                  <br />
                  <span style={{ fontSize: 11, color: '#555577' }}>需在精灵场景中体验</span>
                </div>
                <span>Aurora 宇宙极光</span>
              </div>
              <div className="effect-item">
                <div style={{ padding: '60px 40px', background: 'linear-gradient(135deg, #0A0E27, #1A1F4E)', borderRadius: 8, textAlign: 'center', color: '#8888aa', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                  粒子系统
                  <br />
                  <span style={{ fontSize: 11, color: '#555577' }}>需在精灵场景中体验</span>
                </div>
                <span>Particles 粒子系统</span>
              </div>
            </div>
          </div>

          <div className="effects-section">
            <h3>交互按钮</h3>
            <div className="effect-row">
              <ClickSpark sparkColor="#FFD700" sparkCount={20}>
                <ScaleBounce>
                  <button className="cosmic-btn" onClick={() => setEnergy((e) => Math.min(e + 5, 100))}>
                    ⚡ 收集能量 +5
                  </button>
                </ScaleBounce>
              </ClickSpark>

              <StarBorder color="#00D4FF" speed="2s">
                <div className="energy-panel">
                  <div className="energy-label">
                    <span>ENERGY</span>
                    <span className="energy-val">{energy}%</span>
                  </div>
                  <EnergyBar value={energy} color="#FFD700" height={8} />
                </div>
              </StarBorder>
            </div>
          </div>

          <div className="effects-section">
            <h3>HUD 能量收集（Canvas 2D 特效层）</h3>
            <div className="canvas-demo" onClick={handleCollect}>
              <CanvasOverlay effects={effects} onEffectComplete={clear} />
              <p className="canvas-hint">👆 点击任意位置触发能量收集特效</p>
            </div>
          </div>
        </div>
      )}

      {/* Design Spells */}
      {activeTab === 'designspells' && (
        <div className="tab-content designspells-content">
          <div className="effects-section">
            <h3>发光悬停 (GlowHover)</h3>
            <div className="effect-row">
              <GlowHover color="#00D4FF" intensity={20}>
                <button className="cosmic-btn">悬停发光</button>
              </GlowHover>
              <GlowHover color="#FFD700" intensity={15}>
                <button className="cosmic-btn">金色发光</button>
              </GlowHover>
              <GlowHover color="#FF00FF" intensity={18}>
                <button className="cosmic-btn">紫色发光</button>
              </GlowHover>
            </div>
          </div>

          <div className="effects-section">
            <h3>脉冲光晕 (PulseGlow)</h3>
            <div className="effect-row">
              <PulseGlow color="#00D4FF" minIntensity={8} maxIntensity={25} duration={1.5}>
                <div className="energy-node cyan" />
              </PulseGlow>
              <PulseGlow color="#FFD700" minIntensity={8} maxIntensity={25} duration={2}>
                <div className="energy-node gold" />
              </PulseGlow>
              <PulseGlow color="#FF00FF" minIntensity={8} maxIntensity={25} duration={1.2}>
                <div className="energy-node purple" />
              </PulseGlow>
              <PulseGlow color="#00FF88" minIntensity={8} maxIntensity={25} duration={1.8}>
                <div className="energy-node green" />
              </PulseGlow>
            </div>
          </div>

          <div className="effects-section">
            <h3>磁性吸附 (MagneticEffect)</h3>
            <div className="effect-row">
              <MagneticEffect strength={0.35} range={100}>
                <div className="magnetic-card">
                  移动鼠标靠近我 👆
                </div>
              </MagneticEffect>
            </div>
          </div>

          <div className="effects-section">
            <h3>可交互精灵封装 (InteractableSprite)</h3>
            <div className="effect-row">
              <InteractableSprite color="#00D4FF">
                <div className="sprite-card">🌊 海洋精灵</div>
              </InteractableSprite>
              <InteractableSprite color="#FFD700">
                <div className="sprite-card">✨ 能量球</div>
              </InteractableSprite>
              <InteractableSprite color="#FF00FF">
                <div className="sprite-card">🌍 地球</div>
              </InteractableSprite>
            </div>
          </div>

          <div className="effects-section">
            <h3>扫光 (Shimmer) + 水波纹 (RippleEffect)</h3>
            <div className="effect-row">
              <RippleEffect color="#00D4FF">
                <Shimmer>
                  <div className="shimmer-bar"><span>能量条</span></div>
                </Shimmer>
              </RippleEffect>
              <RippleEffect color="#FFD700">
                <button className="cosmic-btn" style={{ minWidth: 140 }}>
                  点击触发水波纹
                </button>
              </RippleEffect>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// 主应用
// ─────────────────────────────────────────────────
// 页面路由
type Route = 'menu' | 'map' | 'sprites' | 'effects';

function getInitialRoute(): Route {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'map') return 'map';
  if (hash === 'sprites') return 'sprites';
  if (hash === 'effects') return 'effects';
  return 'menu';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeView, setActiveView] = useState<Route>(getInitialRoute);
  const [selectedSprite, setSelectedSprite] = useState('ocean');
  const [totalEnergy, setTotalEnergy] = useState(0);
  void setTotalEnergy; // TODO: 能量收集逻辑接入后实际使用
  const [activeTier, setActiveTier] = useState<TierInfo>(CIVILIZATION_TIERS[0]);
  const [selectedBlock, setSelectedBlock] = useState<RegionBlock | null>(null);

  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    clock: THREE.Clock | null;
    sprite: Sprite | null;
    activeScene: GameScene | null;
    rafId: number;
    canvasEl: HTMLCanvasElement | null;
  }>({
    renderer: null,
    scene: null,
    camera: null,
    clock: null,
    sprite: null,
    activeScene: null,
    rafId: 0,
    canvasEl: null,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    s.canvasEl = canvas;

    s.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    s.renderer.shadowMap.enabled = true;
    // 根据路由设置背景颜色
    const isMapView = activeView === 'map';
    s.renderer.setClearColor(isMapView ? 0x1a1a2e : 0x0a0e27);

    s.scene = new THREE.Scene();
    s.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    s.clock = new THREE.Clock();
    setupLights(s.scene);

    const loadSprite = (key: string) => {
      if (!s.scene) return;
      // 清除之前的精灵和场景
      if (s.sprite) { s.sprite.dispose(); s.sprite = null; }
      if (s.activeScene) { s.activeScene.dispose(); s.activeScene = null; }
      // 清空场景中的所有对象（除灯光外）
      while (s.scene.children.length > 0) {
        s.scene.remove(s.scene.children[0]);
      }
      setupLights(s.scene);

      // 先检查是否为独立游戏场景（map 路由总是加载地图）
      const sceneEntry = activeView === 'map' ? SCENE_REGISTRY.strategicMap : SCENE_REGISTRY[key];
      if (sceneEntry) {
        console.log(`[loadSprite] 加载 GameScene: ${key || 'strategicMap'}`);
        s.activeScene = sceneEntry.create();
        s.activeScene.mount(s.scene, s.camera!, s.canvasEl!);
        return;
      }

      // 否则加载 Sprite
      const entry = SPRITE_REGISTRY[key];
      if (!entry) {
        console.warn(`[loadSprite] 未找到 key: ${key}`);
        return;
      }
      console.log(`[loadSprite] 加载 Sprite: ${key}`);
      s.sprite = entry.create();
      s.sprite.mount(s.scene);
      s.camera!.position.copy(entry.camPos);
      s.camera!.lookAt(0, 0, 0);
    };
    // 根据路由加载内容
    if (activeView === 'map') {
      loadSprite('strategicMap');
    } else if (selectedSprite) {
      loadSprite(selectedSprite);
    }
    (canvas as HTMLCanvasElement & { _loadSprite?: (k: string) => void })._loadSprite = loadSprite;

    const animate = () => {
      s.rafId = requestAnimationFrame(animate);
      const dt = Math.min(s.clock!.getDelta(), 0.05);
      s.sprite?.update(dt);
      s.activeScene?.update(dt);
      s.renderer!.render(s.scene!, s.camera!);
    };
    animate();

    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return; // 跳过隐藏状态
      s.renderer!.setSize(w, h, false);
      s.camera!.aspect = w / h;
      s.camera!.updateProjectionMatrix();
      console.log(`[resize] ${w}x${h} aspect=${(w / h).toFixed(2)}`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 暴露到模块级别，供 activeView effect 调用
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__appHandleResize = handleResize;

    // ── 画布点击处理器（仅场景模式生效）──────────────
    const handleCanvasClick = (e: MouseEvent) => {
      if (!s.activeScene || !('handleClick' in s.activeScene)) return;
      const idx = (s.activeScene as unknown as { handleClick: (x: number, y: number) => number }).handleClick(e.clientX, e.clientY);
      if (idx >= 0) {
        const blocks = (s.activeScene as unknown as { getBlocks: () => RegionBlock[] }).getBlocks();
        const block = blocks[idx];
        setSelectedBlock(block);
        if (!block.unlocked) {
          console.log(`🔒 [${block.name}] 尚未解锁！`);
        } else {
          (s.activeScene as unknown as { moveTo: (i: number) => boolean }).moveTo(idx);
        }
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(s.rafId);
      s.sprite?.dispose();
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      s.renderer?.dispose();
    };
  }, []);

  // 画布从 display:none 切换到显示时，手动触发 resize
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeView === 'sprites' || activeView === 'map') {
      requestAnimationFrame(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (window as any).__appHandleResize as (() => void) | undefined;
        if (fn) {
          console.log('[activeView] 触发 resize after view change');
          fn();
        }
      });
    }
  }, [activeView]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSprite(e.target.value);
    const canvas = canvasRef.current as HTMLCanvasElement & { _loadSprite?: (k: string) => void };
    canvas?._loadSprite?.(e.target.value);
  };

  // 从主菜单选择一个文明场景
  const handleSelectTier = useCallback((tier: TierInfo) => {
    setActiveTier(tier);
    const sceneKey = `tier${tier.id}`;
    setSelectedSprite(sceneKey);
    setActiveView('sprites');
    window.location.hash = 'sprites';
    setTimeout(() => {
      const canvas = canvasRef.current as HTMLCanvasElement & { _loadSprite?: (k: string) => void };
      canvas?._loadSprite?.(sceneKey);
    }, 50);
  }, []);

  // 返回主菜单
  const handleBackToMenu = useCallback(() => {
    setActiveView('menu');
    window.location.hash = '';
    if (stateRef.current.sprite) {
      stateRef.current.sprite.dispose();
      stateRef.current.sprite = null;
    }
    if (stateRef.current.activeScene) {
      stateRef.current.activeScene.dispose();
      stateRef.current.activeScene = null;
    }
  }, []);

  return (
    <div className="app">
      {/* 主菜单 */}
      {activeView === 'menu' && (
        <MainMenu totalEnergy={totalEnergy} onSelectTier={handleSelectTier} />
      )}

      {/* Three.js WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="canvas"
        style={{ display: (activeView === 'sprites' || activeView === 'map') ? 'block' : 'none' }}
      />

      {/* 动效展示层 */}
      {activeView === 'effects' && <EffectsShowcase />}

      {/* HUD */}
      <div className="hud-top">
        {(activeView === 'sprites' || activeView === 'map') && (
          <button className="back-btn" onClick={handleBackToMenu}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回
          </button>
        )}

        <div className="hud-title-group">
{(activeView === 'sprites' || activeView === 'map') && (
            <span className="hud-tier-badge" style={{ color: activeTier.color }}>
              {activeTier.icon} {activeTier.name}
            </span>
          )}
          <span className="title">COSMIC CRUISE</span>
          <span className="subtitle">
            {activeView === 'menu' ? '宇宙文明进化之旅'
              : activeView === 'sprites' ? activeTier.subtitle
              : activeView === 'map' ? '🗺️ 战略地图'
              : '动效展示'}
          </span>
        </div>

        <div className="view-switch">
          {activeView !== 'menu' && (
            <button
              className={`view-btn ${activeView === 'map' ? 'active' : ''}`}
              onClick={() => { setActiveView('map'); window.location.hash = 'map'; }}
            >
              🗺️ 地图
            </button>
          )}
          {activeView !== 'menu' && (
            <button
              className={`view-btn ${activeView === 'sprites' ? 'active' : ''}`}
              onClick={() => { setActiveView('sprites'); window.location.hash = 'sprites'; }}
            >
              🎨 精灵
            </button>
          )}
          <button
            className={`view-btn ${activeView === 'effects' ? 'active' : ''}`}
            onClick={() => { setActiveView('effects'); window.location.hash = 'effects'; }}
          >
            ⚡ 动效
          </button>
          <button className="view-btn" onClick={handleBackToMenu}>
            🏠 主页
          </button>
        </div>
      </div>

      {/* 精灵选择器 */}
      {activeView === 'sprites' && (
        <div className="sprite-selector">
          <select onChange={handleSelect} value={selectedSprite}>
            {/* 文明等级场景 */}
            <optgroup label="── 🎮 文明等级场景 ──">
              {Object.entries(SCENE_REGISTRY).map(([key, entry]) => (
                <option key={key} value={key}>{entry.label}</option>
              ))}
            </optgroup>
            
            {/* 独立精灵 */}
            <optgroup label={`── ${activeTier.icon} ${activeTier.name} 独立精灵 ──`}>
              {['ocean', 'sand', 'tree_pine', 'tree_palm', 'tree_broad', 'mountain', 'energyOrb'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 1 · 行星文明精灵 ──">
              {['earth', 'moon'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 2 · 恒星文明精灵 ──">
              {['yellowStar', 'mercury', 'venus', 'mars', 'asteroidBelt', 'jupiter', 'saturn', 'uranus', 'neptune', 'comet'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 3 · 星系文明精灵 ──">
              {['spiralGalaxy', 'nebula', 'starCluster', 'pulsar'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 4 · 宇宙网精灵 ──">
              {['galaxyCluster', 'cosmicWebFiber', 'darkMatterNode', 'quasar'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 5 · 极端天体精灵 ──">
              {['blackHole', 'wormHole', 'whiteHole'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 6 · 创世精灵 ──">
              {['genesisCore', 'lawGeometry', 'cosmicBoundary'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
            <optgroup label="── Tier 7 · 终局精灵 ──">
              {['multiverseNode', 'cosmicConsciousness', 'omegaPoint'].map((k) => (
                <option key={k} value={k}>{SPRITE_REGISTRY[k].label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* 场景 0 地图信息面板（点击任意区块后显示） */}
      {activeView === 'sprites' && selectedBlock && (
        <div className="scene0-block-panel">
          <div className="block-panel-badge" style={{ background: selectedBlock.color }}>
            {selectedBlock.id}
          </div>
          <div className="block-panel-info">
            <div className="block-panel-name">{selectedBlock.name}</div>
            <div className="block-panel-land">{selectedBlock.land} · {selectedBlock.hub}</div>
          </div>
          {!selectedBlock.unlocked && (
            <div className="block-panel-locked">🔒 未解锁</div>
          )}
          {selectedBlock.unlocked && (
            <button
              className="block-panel-move-btn"
              onClick={() => {
                const sc = stateRef.current.activeScene;
                if (sc && 'moveTo' in sc) {
                  (sc as unknown as { moveTo: (i: number) => boolean }).moveTo(selectedBlock.id - 1);
                }
              }}
            >
              前往
            </button>
          )}
        </div>
      )}

      {/* 动效库说明条 */}
      {activeView === 'effects' && (
        <div className="effects-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#FF6B35' }} />
            Unicorn Studio — WebGL 场景级特效
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#00D4FF' }} />
            React Bits — React UI 动效组件
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#FFD700' }} />
            Design Spells — 微交互动效
          </span>
        </div>
      )}
    </div>
  );
}
