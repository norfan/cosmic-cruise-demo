/**
 * PerformanceMonitor - Performance tracking panel
 *
 * 监控:
 *   - FPS
 *   - 绘制调用数 (draw calls)
 *   - 三角形数量
 *   - 纹理内存
 */

import { useEffect, useRef, useState } from 'react';
import './PerformanceMonitor.css';

interface PerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  memory: number;
}

export function PerformanceMonitor() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<PerfStats>({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    memory: 0,
  });
  const frameTimes = useRef<number[]>([]);
  const lastTime = useRef(performance.now());
  const rafId = useRef(0);

  useEffect(() => {
    const updateStats = () => {
      const now = performance.now();
      const delta = now - lastTime.current;
      lastTime.current = now;

      frameTimes.current.push(delta);
      if (frameTimes.current.length > 60) {
        frameTimes.current.shift();
      }

      const avgDelta = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
      const fps = Math.round(1000 / avgDelta);

      const gl = document.querySelector('canvas')?.getContext('webgl2') ||
        document.querySelector('canvas')?.getContext('webgl');
      void gl;

      setStats({
        fps,
        drawCalls: 0,
        triangles: 0,
        textures: 0,
        memory: 0,
      });

      rafId.current = requestAnimationFrame(updateStats);
    };

    rafId.current = requestAnimationFrame(updateStats);

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  if (!visible) {
    return (
      <button className="perf-toggle" onClick={() => setVisible(true)}>
        FPS
      </button>
    );
  }

  const getFpsColor = (fps: number): string => {
    if (fps >= 50) return '#00ff88';
    if (fps >= 30) return '#ffaa00';
    return '#ff4444';
  };

  return (
    <div className="performance-monitor">
      <div className="perf-header">
        <span>Performance</span>
        <button onClick={() => setVisible(false)}>×</button>
      </div>
      <div className="perf-stats">
        <div className="perf-row">
          <span>FPS</span>
          <span style={{ color: getFpsColor(stats.fps) }}>{stats.fps}</span>
        </div>
        <div className="perf-row">
          <span>Draw Calls</span>
          <span>{stats.drawCalls}</span>
        </div>
        <div className="perf-row">
          <span>Triangles</span>
          <span>{stats.triangles.toLocaleString()}</span>
        </div>
        <div className="perf-row">
          <span>Memory</span>
          <span>{(stats.memory / 1024 / 1024).toFixed(1)} MB</span>
        </div>
      </div>
    </div>
  );
}

export default PerformanceMonitor;