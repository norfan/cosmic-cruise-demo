/**
 * Design Spells 微交互系统
 *
 * 文档: https://www.designspells.com/
 * 风格: 微交互、hover效果、easter eggs，让界面"活"起来
 *
 * 本模块实现 Design Spells 风格的核心微交互：
 * - Glow on hover
 * - Scale bounce (0.98)
 * - Magnetic attraction
 * - Ripple effect
 * - Shimmer
 * - Cursor trail
 */

import React, {
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/* ─────────────────────────────────────────────
   能量色常量 (SPEC.md 配色方案)
───────────────────────────────────────────── */
const ENERGY_CYAN = '#00D4FF';
const ENERGY_GOLD = '#FFD700';
const ENERGY_PURPLE = '#FF00FF';
const ENERGY_GREEN = '#00FF88';

/* ─────────────────────────────────────────────
   GlowHover - 发光悬停 (Design Spells 风格)
   用法: <GlowHover><button>收集能量</button></GlowHover>
───────────────────────────────────────────── */
export const GlowHover = ({
  children,
  color = ENERGY_CYAN,
  intensity = 20,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  intensity?: number;
  className?: string;
  style?: CSSProperties;
}) => (
  <motion.div
    className={className}
    style={style}
    whileHover={{
      boxShadow: `0 0 ${intensity}px ${color}, 0 0 ${intensity * 2}px ${color}40`,
    }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────────────────────────
   ScaleBounce - 点击缩放反馈 (Design Spells)
   点击时 scale 0.95 → 1.02 → 1.0 的弹性动画
   注意：使用 span 而非 button，避免嵌套 <button> 错误
───────────────────────────────────────────── */
export const ScaleBounce = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => (
  <motion.span
    className={className}
    style={{ display: 'inline-block', ...style }}
    whileTap={{ scale: 0.95 }}
    whileHover={{ scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
  >
    {children}
  </motion.span>
);

/* ─────────────────────────────────────────────
   MagneticEffect - 磁性吸附效果
   鼠标靠近时元素向鼠标方向偏移
───────────────────────────────────────────── */
export const MagneticEffect = ({
  children,
  strength = 0.4,
  range = 100,
  className,
}: {
  children: ReactNode;
  strength?: number;
  range?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range) {
        x.set(dx * strength);
        y.set(dy * strength);
      } else {
        x.set(0);
        y.set(0);
      }
    },
    [x, y, strength, range]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   Shimmer - 扫光动画
   常用于能量条、加载状态
───────────────────────────────────────────── */
export const Shimmer = ({
  children,
  duration = 2,
  className,
  style,
}: {
  children: ReactNode;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) => (
  <div className={className} style={{ overflow: 'hidden', ...style }}>
    {children}
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

/* ─────────────────────────────────────────────
   RippleEffect - 水波纹点击效果
   点击时从点击位置扩散的圆形波纹
───────────────────────────────────────────── */
export const RippleEffect = ({
  children,
  color = ENERGY_CYAN,
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) => {
  const [ripples, setRipples] = React.useState<
    { x: number; y: number; key: number }[]
  >([]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const key = Date.now();
    setRipples((prev) => [...prev, { x, y, key }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== key));
    }, 600);
  }, []);

  return (
    <div className={className} onClick={handleClick} style={{ position: 'relative', overflow: 'hidden' }}>
      {children}
      {ripples.map(({ x, y, key }) => (
        <motion.span
          key={key}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            background: `${color}40`,
            border: `2px solid ${color}`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 200, height: 200, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   PulseGlow - 脉冲光晕 (Design Spells 风格)
   持续脉冲发光，常用于能量节点、飞船引擎
───────────────────────────────────────────── */
export const PulseGlow = ({
  children,
  color = ENERGY_CYAN,
  minIntensity = 8,
  maxIntensity = 25,
  duration = 1.5,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  minIntensity?: number;
  maxIntensity?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) => (
  <motion.div
    className={className}
    style={style}
    animate={{
      boxShadow: [
        `0 0 ${minIntensity}px ${color}, 0 0 ${minIntensity * 2}px ${color}30`,
        `0 0 ${maxIntensity}px ${color}, 0 0 ${maxIntensity * 2}px ${color}60`,
        `0 0 ${minIntensity}px ${color}, 0 0 ${minIntensity * 2}px ${color}30`,
      ],
    }}
    transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

/* ─────────────────────────────────────────────
   CursorTrail - 鼠标尾迹
   鼠标移动时留下渐隐的光点
───────────────────────────────────────────── */
export const CursorTrail = () => {
  const [trails, setTrails] = React.useState<
    { x: number; y: number; id: number; color: string }[]
  >([]);
  const COLORS = [ENERGY_CYAN, ENERGY_GOLD, ENERGY_PURPLE, ENERGY_GREEN];

  React.useEffect(() => {
    let id = 0;
    const handleMove = (e: MouseEvent) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      setTrails((prev) => [...prev.slice(-12), { x: e.clientX, y: e.clientY, id: id++, color }]);
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <>
      {trails.map((t) => (
        <motion.span
          key={t.id}
          style={{
            position: 'fixed',
            left: t.x,
            top: t.y,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: t.color,
            pointerEvents: 'none',
            zIndex: 9998,
            marginLeft: -3,
            marginTop: -3,
            boxShadow: `0 0 8px ${t.color}`,
          }}
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </>
  );
};

/* ─────────────────────────────────────────────
   EnergyBar - 能量条 (Shimmer + PulseGlow)
───────────────────────────────────────────── */
export const EnergyBar = ({
  value, // 0-100
  maxValue = 100,
  color = ENERGY_GOLD,
  height = 8,
  className,
}: {
  value: number;
  maxValue?: number;
  color?: string;
  height?: number;
  className?: string;
}) => {
  const pct = Math.min((value / maxValue) * 100, 100);
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height,
        background: '#1A1F4E',
        borderRadius: height / 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${ENERGY_CYAN}, ${color})`,
          borderRadius: height / 2,
          width: `${pct}%`,
        }}
        animate={{
          boxShadow: [`0 0 8px ${color}`, `0 0 16px ${color}80`],
        }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite',
        }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────
   InteractableSprite - 可交互精灵完整封装
   整合所有 Design Spells 微交互于一身
───────────────────────────────────────────── */
export const InteractableSprite = ({
  children,
  color = ENERGY_CYAN,
  magnetic = true,
  pulseGlow = true,
  scaleBounce = true,
  className,
}: {
  children: ReactNode;
  color?: string;
  magnetic?: boolean;
  pulseGlow?: boolean;
  scaleBounce?: boolean;
  className?: string;
}) => {
  const content = (
    <motion.div
      className={className}
      whileHover={{
        scale: scaleBounce ? 1.08 : undefined,
        filter: `drop-shadow(0 0 12px ${color})`,
      }}
      whileTap={{ scale: scaleBounce ? 0.95 : undefined }}
      transition={{ type: 'spring', stiffness: 300, damping: 17 }}
    >
      {children}
    </motion.div>
  );

  return (
    <>
      {magnetic ? (
        <MagneticEffect strength={0.2} range={80}>
          {pulseGlow ? (
            <PulseGlow color={color} minIntensity={6} maxIntensity={15}>
              {content}
            </PulseGlow>
          ) : (
            content
          )}
        </MagneticEffect>
      ) : pulseGlow ? (
        <PulseGlow color={color}>{content}</PulseGlow>
      ) : (
        content
      )}
    </>
  );
};
