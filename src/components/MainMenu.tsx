/**
 * MainMenu.tsx - 宇宙巡航 主菜单
 *
 * 展示 8 个文明等级场景入口：
 *   - Tier 0（原始文明）默认解锁
 *   - Tier 1~7 按能量条件逐步解锁
 *   - 锁定状态显示锁图标 + 所需能量
 */

import { useEffect, useRef, useState } from 'react';
import './MainMenu.css';

// ── 文明等级数据 ───────────────────────────────────────
export interface TierInfo {
  id: number;           // 0~7
  key: string;          // 对应 SPRITE_REGISTRY 的键
  name: string;         // 文明名称
  subtitle: string;     // 副标题
  description: string;   // 场景描述
  icon: string;         // emoji 图标
  color: string;        // 主色调（hex）
  glowColor: string;    // 发光色
  unlockEnergy: number; // 解锁所需能量（0 = 默认解锁）
}

export const CIVILIZATION_TIERS: TierInfo[] = [
  {
    id: 0,
    key: 'scene0Map',
    name: '原始文明',
    subtitle: 'Primitive Era',
    description: '地球海边，生命的起点 — 15 区块沙盘地图',
    icon: '🗺️',
    color: '#00d4ff',
    glowColor: 'rgba(0, 212, 255, 0.3)',
    unlockEnergy: 0,
  },
  {
    id: 1,
    key: 'earth',
    name: '行星文明',
    subtitle: 'Planetary Era',
    description: '地球与月球，文明的火种',
    icon: '🌍',
    color: '#4488ff',
    glowColor: 'rgba(68, 136, 255, 0.3)',
    unlockEnergy: 100,
  },
  {
    id: 2,
    key: 'yellowStar',
    name: '恒星文明',
    subtitle: 'Stellar Era',
    description: '太阳系，探索能源的边界',
    icon: '☀️',
    color: '#ffaa00',
    glowColor: 'rgba(255, 170, 0, 0.3)',
    unlockEnergy: 300,
  },
  {
    id: 3,
    key: 'spiralGalaxy',
    name: '星系文明',
    subtitle: 'Galactic Era',
    description: '银河系，恒星的海洋',
    icon: '🌌',
    color: '#cc66ff',
    glowColor: 'rgba(204, 102, 255, 0.3)',
    unlockEnergy: 600,
  },
  {
    id: 4,
    key: 'cosmicWebFiber',
    name: '宇宙网文明',
    subtitle: 'Cosmic Web Era',
    description: '宇宙大尺度结构，星系团的纽带',
    icon: '🕸️',
    color: '#44ffcc',
    glowColor: 'rgba(68, 255, 204, 0.3)',
    unlockEnergy: 1200,
  },
  {
    id: 5,
    key: 'blackHole',
    name: '极端天体文明',
    subtitle: 'Extreme Era',
    description: '黑洞、虫洞、白洞，物理的极限',
    icon: '🔳',
    color: '#ff6644',
    glowColor: 'rgba(255, 102, 68, 0.3)',
    unlockEnergy: 2400,
  },
  {
    id: 6,
    key: 'genesisCore',
    name: '创世文明',
    subtitle: 'Genesis Era',
    description: '法则几何，宇宙的规则本身',
    icon: '✨',
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.3)',
    unlockEnergy: 4800,
  },
  {
    id: 7,
    key: 'omegaPoint',
    name: '终局',
    subtitle: 'Omega Point',
    description: 'Ω终点，宇宙的终极归宿',
    icon: '♾️',
    color: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.3)',
    unlockEnergy: 9600,
  },
];

// ── Props ───────────────────────────────────────────────
export interface MainMenuProps {
  totalEnergy: number;           // 当前总能量
  onSelectTier: (tier: TierInfo) => void; // 选择某个文明场景
}

// ── 星空粒子背景 ───────────────────────────────────────
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.3,
          speed: Math.random() * 0.3 + 0.05,
          opacity: Math.random() * 0.6 + 0.2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${s.opacity})`;
        ctx.fill();
        // 缓慢漂移
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    initStars();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="starfield-canvas" />;
}

// ── 能量条 ─────────────────────────────────────────────
interface EnergyBarProps {
  current: number;
  required: number;
  color: string;
}

function EnergyBar({ current, required, color }: EnergyBarProps) {
  const pct = Math.min(current / required, 1) * 100;
  return (
    <div className="menu-energy-bar-wrap">
      <div className="menu-energy-bar-track">
        <div
          className="menu-energy-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="menu-energy-label">
        {current} / {required}
      </span>
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────────────
export default function MainMenu({ totalEnergy, onSelectTier }: MainMenuProps) {
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  const isUnlocked = (tier: TierInfo) =>
    totalEnergy >= tier.unlockEnergy;

  return (
    <div className="main-menu">
      <Starfield />

      {/* 背景渐变 */}
      <div className="menu-bg-gradient" />

      {/* 标题区 */}
      <div className="menu-header">
        <div className="menu-logo">
          <span className="menu-logo-icon">🚀</span>
          <div className="menu-logo-text">
            <h1 className="menu-title">COSMIC CRUISE</h1>
            <p className="menu-tagline">宇宙文明进化之旅</p>
          </div>
        </div>

        {/* 当前能量 */}
        <div className="menu-energy-display">
          <span className="menu-energy-icon">⚡</span>
          <div className="menu-energy-info">
            <span className="menu-energy-num">{totalEnergy.toLocaleString()}</span>
            <span className="menu-energy-unit">能量</span>
          </div>
        </div>
      </div>

      {/* 副标题 */}
      <div className="menu-section-title">
        <span className="menu-section-line" />
        <span className="menu-section-text">选择文明场景</span>
        <span className="menu-section-line" />
      </div>

      {/* 文明卡片网格 */}
      <div className="tier-grid">
        {CIVILIZATION_TIERS.map((tier) => {
          const unlocked = isUnlocked(tier);
          const hovered = hoveredTier === tier.id;

          return (
            <button
              key={tier.id}
              className={`tier-card ${unlocked ? 'unlocked' : 'locked'} ${hovered && unlocked ? 'hovered' : ''}`}
              style={{
                '--tier-color': tier.color,
                '--tier-glow': tier.glowColor,
              } as React.CSSProperties}
              onClick={() => unlocked && onSelectTier(tier)}
              onMouseEnter={() => setHoveredTier(tier.id)}
              onMouseLeave={() => setHoveredTier(null)}
              disabled={!unlocked}
            >
              {/* Tier 编号 */}
              <div className="tier-badge">T{tier.id}</div>

              {/* 图标 */}
              <div className="tier-icon-wrap">
                <span className="tier-icon">{tier.icon}</span>
                {!unlocked && <div className="tier-lock-overlay">🔒</div>}
              </div>

              {/* 文字 */}
              <div className="tier-info">
                <div className="tier-name">{tier.name}</div>
                <div className="tier-subtitle">{tier.subtitle}</div>
                <div className="tier-desc">{tier.description}</div>
              </div>

              {/* 解锁条件 */}
              {!unlocked && (
                <div className="tier-unlock-req">
                  <span className="tier-req-label">解锁条件</span>
                  <EnergyBar
                    current={totalEnergy}
                    required={tier.unlockEnergy}
                    color={tier.color}
                  />
                </div>
              )}

              {/* 已解锁指示 */}
              {unlocked && (
                <div className="tier-unlocked-badge">
                  <span>进入</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              {/* 彩色边框光效 */}
              <div className="tier-card-border" />
            </button>
          );
        })}
      </div>

      {/* 底部说明 */}
      <div className="menu-footer">
        <span>收集能量，解锁更高文明等级</span>
      </div>
    </div>
  );
}
