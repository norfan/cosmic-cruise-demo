/**
 * Unicorn Studio 场景集成层
 *
 * 文档: https://unicorn.studio/
 * npm: unicornstudio-react
 *
 * Unicorn Studio 是一个 WebGL 交互式 3D 场景创作工具。
 * 本模块提供两种接入方式：
 * 1. projectId 模式：使用 Unicorn Studio 创作的项目 ID
 * 2. jsonFilePath 模式：自托管 Unicorn Studio 导出的 JSON 场景
 *
 * 对于程序化生成的宇宙场景，我们使用 jsonFilePath 模式，
 * 在 public/unicorn/ 下放置场景 JSON 文件。
 */

import { useRef, useEffect, useState, Suspense } from 'react';
import type { UnicornSceneProps } from 'unicornstudio-react';

/* ─────────────────────────────────────────────
   UnicornBackground - Unicorn Studio 背景层
   适用于游戏全屏背景、场景过渡等
───────────────────────────────────────────── */
export const UnicornBackground = ({
  projectId,
  jsonFilePath,
  scale = 0.6,
  dpi = 1.5,
  fps = 60,
  paused = false,
  lazyLoad = true,
  className,
  onLoad,
  onError,
  sceneRef,
}: UnicornSceneProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [UnicornScene, setUnicornScene] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 没有提供 projectId 或 jsonFilePath 时，直接走降级路径
  const hasSource = !!(projectId || jsonFilePath);

  useEffect(() => {
    if (!hasSource) {
      setLoading(false);
      return;
    }
    import('unicornstudio-react').then((mod) => {
      setUnicornScene(() => mod.default);
      setLoading(false);
    }).catch((err) => {
      setError(err as Error);
      setLoading(false);
      onError?.(err as Error);
    });
  }, [onError, hasSource]);

  if (loading) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A0E27, #1A1F4E)',
          color: '#00D4FF',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.875rem',
        }}
      >
        Loading Unicorn Studio...
      </div>
    );
  }

  if (error || !UnicornScene) {
    return (
      <div
        className={className}
        style={{
          background: 'linear-gradient(135deg, #0A0E27, #1A1F4E)',
        }}
      >
        <FallbackStarfield />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className={className}
          style={{
            background: 'linear-gradient(135deg, #0A0E27, #1A1F4E)',
          }}
        >
          <FallbackStarfield />
        </div>
      }
    >
      <UnicornScene
        projectId={projectId}
        jsonFilePath={jsonFilePath}
        scale={scale}
        dpi={dpi}
        fps={fps}
        paused={paused}
        lazyLoad={lazyLoad}
        className={className}
        onLoad={onLoad}
        onError={onError}
        sceneRef={sceneRef}
      />
    </Suspense>
  );
};

/* ─────────────────────────────────────────────
   FallbackStarfield - Unicorn 不可用时的降级方案
   使用纯 Canvas 2D 绘制动态星空
───────────────────────────────────────────── */
const FallbackStarfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 39, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${star.opacity})`;
        ctx.fill();

        star.x -= star.speed;
        if (star.x < 0) star.x = canvas.width;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

/* ─────────────────────────────────────────────
   Tier-specific Unicorn 场景配置
   这些是 public/unicorn/ 下 JSON 文件的路径
───────────────────────────────────────────── */
export const UNICORN_SCENES = {
  tier0_ocean: '/unicorn/tier0-ocean.json',
  tier1_orbit: '/unicorn/tier1-orbit.json',
  tier2_solar: '/unicorn/tier2-solar.json',
  tier3_galaxy: '/unicorn/tier3-galaxy.json',
  tier4_cosmicweb: '/unicorn/tier4-cosmicweb.json',
  tier5_blackhole: '/unicorn/tier5-blackhole.json',
  tier6_edge: '/unicorn/tier6-edge.json',
  tier7_creation: '/unicorn/tier7-creation.json',
} as const;
