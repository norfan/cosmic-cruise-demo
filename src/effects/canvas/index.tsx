/**
 * Canvas 2D 覆盖层特效
 *
 * 用于能量收集时的 Canvas 2D 特效层：
 * - Falling Rays (光线下落)
 * - Particle Burst (粒子爆发)
 * - Glow Expansion (光晕扩散)
 *
 * 渲染在 Three.js Canvas 之上，React DOM UI 之下。
 */

import { useRef, useEffect, useCallback, useState } from 'react';

/* ─────────────────────────────────────────────
   能量收集特效类型
───────────────────────────────────────────── */
export interface CollectEffect {
  id: number;
  x: number;
  y: number;
  type: 'rays' | 'burst' | 'glow';
  color: string;
  startTime: number;
}

/* ─────────────────────────────────────────────
   CanvasOverlay - Canvas 2D 特效层
───────────────────────────────────────────── */
export const CanvasOverlay = ({
  effects,
  onEffectComplete,
}: {
  effects: CollectEffect[];
  onEffectComplete?: (id: number) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const effectsRef = useRef(effects);
  effectsRef.current = effects;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    const activeEffects = effectsRef.current.filter((e) => {
      const elapsed = (now - e.startTime) / 1000;
      return elapsed < 1.5; // 1.5秒内有效
    });

    activeEffects.forEach((effect) => {
      const elapsed = (now - effect.startTime) / 1000;
      const progress = Math.min(elapsed / 1.5, 1);
      const fadeOut = 1 - progress;

      if (effect.type === 'rays') {
        // Falling Rays 效果
        const rayCount = 12;
        for (let i = 0; i < rayCount; i++) {
          const angle = (Math.PI * 2 * i) / rayCount + elapsed * 2;
          const length = 60 * fadeOut * (1 - progress * 0.5);
          const spread = 20 * progress;

          ctx.save();
          ctx.translate(effect.x, effect.y);
          ctx.rotate(angle);

          const gradient = ctx.createLinearGradient(0, 0, 0, length + spread);
          gradient.addColorStop(0, `${effect.color}00`);
          gradient.addColorStop(0.3, `${effect.color}${Math.floor(fadeOut * 255).toString(16).padStart(2, '0')}`);
          gradient.addColorStop(1, `${effect.color}00`);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(2, length + spread);
          ctx.lineTo(-2, length + spread);
          ctx.closePath();
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();
        }
      } else if (effect.type === 'burst') {
        // Particle Burst 效果
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount;
          const speed = 150 * fadeOut * (1 - progress * 0.3);
          const px = effect.x + Math.cos(angle) * speed * progress;
          const py = effect.y + Math.sin(angle) * speed * progress;
          const size = 4 * fadeOut * (1 - progress * 0.5);

          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `${effect.color}${Math.floor(fadeOut * 220).toString(16).padStart(2, '0')}`;
          ctx.fill();
        }
      } else if (effect.type === 'glow') {
        // Glow Expansion 效果
        const radius = 30 + 120 * progress;
        const gradient = ctx.createRadialGradient(
          effect.x, effect.y, 0,
          effect.x, effect.y, radius
        );
        gradient.addColorStop(0, `${effect.color}${Math.floor(fadeOut * 200).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${effect.color}${Math.floor(fadeOut * 80).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${effect.color}00`);

        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });

    // 清理已完成的特效
    const completed = effectsRef.current.filter((e) => {
      const elapsed = (now - e.startTime) / 1000;
      return elapsed >= 1.5;
    });
    completed.forEach((e) => onEffectComplete?.(e.id));

    animRef.current = requestAnimationFrame(draw);
  }, [onEffectComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};

/* ─────────────────────────────────────────────
   能量收集 Hook - 管理 Canvas 特效
───────────────────────────────────────────── */
export const useEnergyEffect = (): {
  effects: CollectEffect[];
  emit: (x: number, y: number, type?: CollectEffect['type']) => void;
  clear: (id: number) => void;
} => {
  const [effects, setEffects] = useState<CollectEffect[]>([]);
  const idRef = useRef(0);

  const emit = useCallback((x: number, y: number, type: CollectEffect['type'] = 'rays') => {
    const colors = ['#00D4FF', '#FFD700', '#00FF88', '#FF6B35', '#FF00FF'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const effect: CollectEffect = {
      id: idRef.current++,
      x,
      y,
      type,
      color,
      startTime: performance.now(),
    };
    setEffects((prev) => [...prev, effect]);
  }, []);

  const clear = useCallback((id: number) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { effects, emit, clear };
};
