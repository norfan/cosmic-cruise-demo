/**
 * SpriteTestPage.tsx — 精灵系统自动化测试页
 *
 * 功能：
 *   1. 遍历所有 37 个精灵，逐个挂载到 Three.js 场景
 *   2. 每个精灵运行 2 秒，检测：
 *      - 构建是否抛出异常
 *      - mount() 后 scene 子节点数量 > 0
 *      - update() 调用不报错
 *      - dispose() 正常执行
 *   3. 实时展示测试进度与结果面板
 *   4. 支持手动切换到单个精灵「观察模式」
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ── 精灵导入 ─────────────────────────────────────────────
import { OceanSprite }        from './sprites/tier0/OceanSprite';
import { SandSprite }         from './sprites/tier0/SandSprite';
import { TreeSprite }         from './sprites/tier0/TreeSprite';
import { MountainSprite }     from './sprites/tier0/MountainSprite';
import { EnergyOrbSprite }    from './sprites/tier0/EnergyOrbSprite';
import { EarthSprite }        from './sprites/tier1/EarthSprite';
import { MoonSprite }         from './sprites/tier1/MoonSprite';
import {
  YellowStarSprite, MercurySprite, VenusSprite, MarsSprite,
  JupiterSprite, SaturnSprite, UranusSprite, NeptuneSprite,
  AsteroidBeltSprite, CometSprite,
} from './sprites/tier2';
import {
  SpiralGalaxySprite, NebulaSprite, StarClusterSprite, PulsarSprite,
} from './sprites/tier3';
import {
  GalaxyClusterSprite, CosmicWebFiberSprite, DarkMatterNodeSprite, QuasarSprite,
} from './sprites/tier4';
import {
  BlackHoleSprite, WormHoleSprite, WhiteHoleSprite,
} from './sprites/tier5';
import {
  GenesisCoreSprite, LawGeometrySprite, CosmicBoundarySprite,
} from './sprites/tier6';
import {
  MultiverseNodeSprite, CosmicConsciousnessSprite, OmegaPointSprite,
} from './sprites/tier7';

import type { Sprite, SpriteConfig } from './sprites/Sprite';
import type { CelestialSpriteConfig } from './sprites/CelestialSprite';

// ── 测试项目表 ────────────────────────────────────────────
interface TestEntry {
  id: string;
  label: string;
  tier: number;
  create: () => Sprite;
  camPos: THREE.Vector3;
}

const TEST_LIST: TestEntry[] = [
  // Tier 0
  { id: 'ocean',      tier: 0, label: '🌊 OceanSprite',         create: () => new OceanSprite(),                                       camPos: new THREE.Vector3(0, 8, 20) },
  { id: 'sand',       tier: 0, label: '🏖 SandSprite',          create: () => new SandSprite({} as SpriteConfig),                      camPos: new THREE.Vector3(0, 5, 15) },
  { id: 'tree_pine',  tier: 0, label: '🌲 TreeSprite(松)',       create: () => new TreeSprite({ variant: 'pine' } as SpriteConfig),    camPos: new THREE.Vector3(0, 4, 12) },
  { id: 'tree_palm',  tier: 0, label: '🌴 TreeSprite(棕榈)',     create: () => new TreeSprite({ variant: 'palm' } as SpriteConfig),    camPos: new THREE.Vector3(0, 4, 12) },
  { id: 'tree_broad', tier: 0, label: '🌳 TreeSprite(阔叶)',     create: () => new TreeSprite({ variant: 'broadleaf' } as SpriteConfig),camPos: new THREE.Vector3(0, 4, 12) },
  { id: 'mountain',   tier: 0, label: '⛰ MountainSprite',       create: () => new MountainSprite(),                                    camPos: new THREE.Vector3(0, 6, 22) },
  { id: 'energyOrb',  tier: 0, label: '✨ EnergyOrbSprite',      create: () => new EnergyOrbSprite(),                                   camPos: new THREE.Vector3(0, 0, 6) },
  // Tier 1
  { id: 'earth',      tier: 1, label: '🌍 EarthSprite',          create: () => new EarthSprite(),                                       camPos: new THREE.Vector3(0, 2, 18) },
  { id: 'moon',       tier: 1, label: '🌕 MoonSprite',           create: () => new MoonSprite(),                                        camPos: new THREE.Vector3(0, 0, 14) },
  // Tier 2
  { id: 'sun',        tier: 2, label: '☀️ YellowStarSprite',     create: () => new YellowStarSprite(),                                  camPos: new THREE.Vector3(0, 0, 22) },
  { id: 'mercury',    tier: 2, label: '☿️ MercurySprite',        create: () => new MercurySprite(),                                     camPos: new THREE.Vector3(0, 0, 10) },
  { id: 'venus',      tier: 2, label: '♀️ VenusSprite',          create: () => new VenusSprite(),                                       camPos: new THREE.Vector3(0, 0, 12) },
  { id: 'mars',       tier: 2, label: '♂️ MarsSprite',           create: () => new MarsSprite(),                                        camPos: new THREE.Vector3(0, 0, 12) },
  { id: 'jupiter',    tier: 2, label: '♃ JupiterSprite',         create: () => new JupiterSprite(),                                     camPos: new THREE.Vector3(0, 0, 18) },
  { id: 'saturn',     tier: 2, label: '♄ SaturnSprite',          create: () => new SaturnSprite(),                                      camPos: new THREE.Vector3(0, 3, 20) },
  { id: 'uranus',     tier: 2, label: '⛢ UranusSprite',          create: () => new UranusSprite(),                                      camPos: new THREE.Vector3(0, 2, 16) },
  { id: 'neptune',    tier: 2, label: '♆ NeptuneSprite',         create: () => new NeptuneSprite(),                                     camPos: new THREE.Vector3(0, 0, 16) },
  { id: 'asteroids',  tier: 2, label: '☄️ AsteroidBeltSprite',   create: () => new AsteroidBeltSprite(),                                camPos: new THREE.Vector3(0, 5, 28) },
  { id: 'comet',      tier: 2, label: '☄️ CometSprite',          create: () => new CometSprite(),                                       camPos: new THREE.Vector3(0, 2, 20) },
  // Tier 3
  { id: 'spiral',     tier: 3, label: '🌌 SpiralGalaxySprite',   create: () => new SpiralGalaxySprite(),                                camPos: new THREE.Vector3(0, 10, 40) },
  { id: 'nebula',     tier: 3, label: '🌈 NebulaSprite',         create: () => new NebulaSprite(),                                      camPos: new THREE.Vector3(0, 0, 30) },
  { id: 'cluster',    tier: 3, label: '⭐ StarClusterSprite',     create: () => new StarClusterSprite(),                                 camPos: new THREE.Vector3(0, 5, 30) },
  { id: 'pulsar',     tier: 3, label: '🔵 PulsarSprite',         create: () => new PulsarSprite(),                                      camPos: new THREE.Vector3(0, 0, 16) },
  // Tier 4
  { id: 'galaxyCluster',    tier: 4, label: '🌐 GalaxyClusterSprite',    create: () => new GalaxyClusterSprite(),          camPos: new THREE.Vector3(0, 10, 50) },
  { id: 'cosmicWebFiber',   tier: 4, label: '🕸️ CosmicWebFiberSprite',   create: () => new CosmicWebFiberSprite(),         camPos: new THREE.Vector3(0, 5, 40) },
  { id: 'darkMatterNode',   tier: 4, label: '🕳️ DarkMatterNodeSprite',   create: () => new DarkMatterNodeSprite(),         camPos: new THREE.Vector3(0, 0, 22) },
  { id: 'quasar',           tier: 4, label: '💫 QuasarSprite',            create: () => new QuasarSprite({ glowColor: '#ff6600' } as CelestialSpriteConfig), camPos: new THREE.Vector3(0, 3, 22) },
  // Tier 5
  { id: 'blackHole',  tier: 5, label: '🔳 BlackHoleSprite',      create: () => new BlackHoleSprite({} as CelestialSpriteConfig),        camPos: new THREE.Vector3(0, 4, 18) },
  { id: 'wormHole',   tier: 5, label: '🌀 WormHoleSprite',       create: () => new WormHoleSprite({} as CelestialSpriteConfig),         camPos: new THREE.Vector3(0, 0, 16) },
  { id: 'whiteHole',  tier: 5, label: '🌟 WhiteHoleSprite',      create: () => new WhiteHoleSprite({} as CelestialSpriteConfig),        camPos: new THREE.Vector3(0, 3, 14) },
  // Tier 6
  { id: 'genesisCore',      tier: 6, label: '✨ GenesisCoreSprite',       create: () => new GenesisCoreSprite({} as CelestialSpriteConfig),       camPos: new THREE.Vector3(0, 5, 20) },
  { id: 'lawGeometry',      tier: 6, label: '🔯 LawGeometrySprite',       create: () => new LawGeometrySprite({} as CelestialSpriteConfig),       camPos: new THREE.Vector3(0, 8, 35) },
  { id: 'cosmicBoundary',   tier: 6, label: '🌌 CosmicBoundarySprite',    create: () => new CosmicBoundarySprite({} as CelestialSpriteConfig),    camPos: new THREE.Vector3(0, 0, 28) },
  // Tier 7
  { id: 'multiverseNode',      tier: 7, label: '🫧 MultiverseNodeSprite',         create: () => new MultiverseNodeSprite({} as CelestialSpriteConfig),          camPos: new THREE.Vector3(0, 5, 28) },
  { id: 'cosmicConsciousness', tier: 7, label: '🧠 CosmicConsciousnessSprite',    create: () => new CosmicConsciousnessSprite({} as CelestialSpriteConfig),     camPos: new THREE.Vector3(0, 4, 32) },
  { id: 'omegaPoint',          tier: 7, label: '♾️ OmegaPointSprite',             create: () => new OmegaPointSprite({} as CelestialSpriteConfig),              camPos: new THREE.Vector3(0, 8, 40) },
];

// ── 测试结果类型 ──────────────────────────────────────────
type TestStatus = 'pending' | 'running' | 'pass' | 'fail';

interface TestResult {
  id: string;
  label: string;
  tier: number;
  status: TestStatus;
  error?: string;
  sceneChildCount?: number;
  durationMs?: number;
}

// ── 颜色工具 ─────────────────────────────────────────────
const TIER_COLORS = ['#6bcf7f','#4ecdc4','#45b7d1','#a78bfa','#f59e0b','#f87171','#c084fc','#f472b6'];
const STATUS_COLOR: Record<TestStatus, string> = {
  pending: '#555',
  running: '#facc15',
  pass: '#4ade80',
  fail: '#f87171',
};

// ── 主组件 ───────────────────────────────────────────────
export default function SpriteTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const cameraRef   = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef      = useRef<number>(0);
  const currentSpriteRef = useRef<Sprite | null>(null);

  const [results, setResults] = useState<TestResult[]>(
    TEST_LIST.map(e => ({ id: e.id, label: e.label, tier: e.tier, status: 'pending' }))
  );
  const [isRunning, setIsRunning]   = useState(false);
  const [watchId, setWatchId]       = useState<string | null>(null);
  const [summary, setSummary]       = useState({ pass: 0, fail: 0, total: TEST_LIST.length });

  // ── 初始化渲染器 ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor('#080818');
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 2.0);
    dir.position.set(5, 10, 8);
    scene.add(dir);

    // 渲染循环
    let t = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      t += 0.016;
      currentSpriteRef.current?.update?.(0.016);
      renderer.render(scene, camera);
    };
    loop();

    const handleResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // ── 卸载当前精灵 ─────────────────────────────────────
  const clearSprite = useCallback(() => {
    if (currentSpriteRef.current) {
      try { currentSpriteRef.current.dispose?.(); } catch (_) {}
      currentSpriteRef.current = null;
    }
    const scene = sceneRef.current!;
    // 清除非灯光对象
    const toRemove = scene.children.filter(c => !(c instanceof THREE.Light));
    toRemove.forEach(c => scene.remove(c));
  }, []);

  // ── 挂载单个精灵到观察模式 ──────────────────────────
  const watchSprite = useCallback((entry: TestEntry) => {
    clearSprite();
    setWatchId(entry.id);
    const scene = sceneRef.current!;
    const camera = cameraRef.current!;
    try {
      const sprite = entry.create();
      sprite.mount(scene, {});
      currentSpriteRef.current = sprite;
      camera.position.copy(entry.camPos);
      camera.lookAt(0, 0, 0);
    } catch (e) {
      console.error('Watch mount error:', e);
    }
  }, [clearSprite]);

  // ── 自动化测试流程 ────────────────────────────────────
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setWatchId(null);
    let pass = 0, fail = 0;

    // 重置结果
    setResults(TEST_LIST.map(e => ({ id: e.id, label: e.label, tier: e.tier, status: 'pending' })));

    for (const entry of TEST_LIST) {
      // 标记运行中
      setResults(prev => prev.map(r => r.id === entry.id ? { ...r, status: 'running' } : r));

      const t0 = performance.now();
      let error: string | undefined;
      let childCount = 0;
      let status: TestStatus = 'fail';

      try {
        clearSprite();
        const scene = sceneRef.current!;
        const camera = cameraRef.current!;

        // 1. 构建
        const sprite = entry.create();

        // 2. 挂载
        sprite.mount(scene, {});
        currentSpriteRef.current = sprite;

        // 非灯光子节点数
        childCount = scene.children.filter(c => !(c instanceof THREE.Light)).length;
        if (childCount === 0) throw new Error('mount() 后 scene 无子节点');

        // 3. 移动摄像机
        camera.position.copy(entry.camPos);
        camera.lookAt(0, 0, 0);

        // 4. 运行 60 帧（约 1 秒）
        await new Promise<void>(resolve => {
          let frames = 0;
          const tick = () => {
            sprite.update?.(0.016);
            frames++;
            if (frames < 60) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });

        // 5. dispose
        sprite.dispose?.();
        currentSpriteRef.current = null;

        status = 'pass';
        pass++;
      } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
        fail++;
        // 尝试强制清理
        try { clearSprite(); } catch (_) {}
      }

      const durationMs = Math.round(performance.now() - t0);
      setResults(prev => prev.map(r =>
        r.id === entry.id
          ? { ...r, status, error, sceneChildCount: childCount, durationMs }
          : r
      ));

      // 短暂间隔防止 UI 阻塞
      await new Promise(r => setTimeout(r, 30));
    }

    // 清空场景
    clearSprite();
    setSummary({ pass, fail, total: TEST_LIST.length });
    setIsRunning(false);
  }, [clearSprite]);

  // ── 渲染 UI ───────────────────────────────────────────
  const passCount  = results.filter(r => r.status === 'pass').length;
  const failCount  = results.filter(r => r.status === 'fail').length;
  const doneCount  = results.filter(r => r.status !== 'pending' && r.status !== 'running').length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#070714', color: '#e0e0f0', fontFamily: 'monospace', overflow: 'hidden' }}>

      {/* ── 左侧：Three.js 视口 ── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'auto' }}
        />
        {/* 当前观察标签 */}
        {watchId && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(0,0,0,0.7)', padding: '6px 14px',
            borderRadius: 8, fontSize: 13, color: '#facc15',
            border: '1px solid #facc1566',
          }}>
            👁 {TEST_LIST.find(e => e.id === watchId)?.label}
          </div>
        )}
        {/* 进度条 */}
        {isRunning && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: '#1a1a2e' }}>
            <div style={{
              height: 4,
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              width: `${(doneCount / TEST_LIST.length) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        )}
      </div>

{/* ── 右侧：控制面板 ── */}
        <div style={{
          width: 360, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid #1e1e3a', background: '#0a0a1a',
          position: 'relative', zIndex: 100,
        }}>

        {/* 顶部标题 + 控制 */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e3a' }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#a78bfa', marginBottom: 8 }}>
            🚀 Sprite Test Suite
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            {TEST_LIST.length} 个精灵 · Tier 0 ~ 7
          </div>

          {/* 汇总 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 13 }}>
            <span style={{ color: '#4ade80' }}>✅ {passCount}</span>
            <span style={{ color: '#f87171' }}>❌ {failCount}</span>
            <span style={{ color: '#888' }}>⏳ {TEST_LIST.length - doneCount}</span>
          </div>

          <button
            onClick={runAllTests}
            disabled={isRunning}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: isRunning ? '#2a2a4a' : 'linear-gradient(135deg, #6366f1, #a78bfa)',
              color: isRunning ? '#666' : '#fff', fontWeight: 'bold', fontSize: 14,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? `运行中… (${doneCount}/${TEST_LIST.length})` : '▶ 运行全部测试'}
          </button>
        </div>

        {/* 精灵列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {/* 按 Tier 分组 */}
          {[0,1,2,3,4,5,6,7].map(tier => {
            const tierItems = results.filter(r => r.tier === tier);
            if (tierItems.length === 0) return null;
            return (
              <div key={tier}>
                {/* Tier 标题 */}
                <div style={{
                  padding: '4px 16px', fontSize: 11, fontWeight: 'bold',
                  color: TIER_COLORS[tier], background: '#0f0f20',
                  borderTop: '1px solid #1e1e3a', borderBottom: '1px solid #1e1e3a',
                  letterSpacing: 1,
                }}>
                  TIER {tier}
                </div>
                {/* 精灵条目 */}
                {tierItems.map(r => {
                  const entry = TEST_LIST.find(e => e.id === r.id)!;
                  const isWatch = watchId === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => !isRunning && watchSprite(entry)}
                      style={{
                        padding: '7px 16px', fontSize: 12,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: isRunning ? 'default' : 'pointer',
                        background: isWatch ? '#14142a' : 'transparent',
                        borderLeft: isWatch ? `3px solid ${TIER_COLORS[tier]}` : '3px solid transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* 名称 */}
                      <span style={{ color: isWatch ? '#e0e0ff' : '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.label}
                      </span>
                      {/* 状态徽章 */}
                      <span style={{
                        marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 4,
                        background: STATUS_COLOR[r.status] + '22',
                        color: STATUS_COLOR[r.status],
                        fontWeight: 'bold', whiteSpace: 'nowrap',
                      }}>
                        {r.status === 'pending' ? '–'
                         : r.status === 'running' ? '⏳'
                         : r.status === 'pass' ? `✅ ${r.durationMs}ms`
                         : `❌ ERR`}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 底部：错误详情 */}
        {failCount > 0 && (
          <div style={{
            borderTop: '1px solid #1e1e3a', padding: '10px 16px',
            maxHeight: 160, overflowY: 'auto',
          }}>
            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 6, fontWeight: 'bold' }}>
              ❌ 失败详情
            </div>
            {results.filter(r => r.status === 'fail').map(r => (
              <div key={r.id} style={{ fontSize: 11, color: '#f87171', marginBottom: 4, lineHeight: 1.5 }}>
                <span style={{ color: '#ddd' }}>{r.label}：</span>
                {r.error ?? '未知错误'}
              </div>
            ))}
          </div>
        )}

        {/* 完成汇总 */}
        {!isRunning && doneCount === TEST_LIST.length && doneCount > 0 && (
          <div style={{
            borderTop: '1px solid #1e1e3a', padding: '12px 16px',
            background: failCount === 0 ? '#0d1f0d' : '#1f0d0d',
            textAlign: 'center',
          }}>
            {failCount === 0 ? (
              <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 'bold' }}>
                🎉 全部 {summary.total} 个精灵测试通过！
              </span>
            ) : (
              <span style={{ color: '#f87171', fontSize: 13 }}>
                通过 {summary.pass} / {summary.total}，失败 {summary.fail} 个
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
