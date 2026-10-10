import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export function PerformanceHUDInsideCanvas({
  onMetricsUpdate
}: {
  onMetricsUpdate: (metrics: {
    fps: number;
    frameTimeMs: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
  }) => void;
}) {
  const { gl } = useThree();
  const frames = useRef(0);
  const lastTime = useRef(performance.now());
  const lastMetricsEmit = useRef(performance.now());

  useFrame(() => {
    frames.current++;
    const now = performance.now();

    if (now - lastMetricsEmit.current >= 1000) {
      const deltaMs = now - lastTime.current;
      const currentFps = Math.round((frames.current * 1000) / deltaMs);
      const frameTime = Number((deltaMs / frames.current).toFixed(1));

      onMetricsUpdate({
        fps: currentFps,
        frameTimeMs: frameTime,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures
      });

      frames.current = 0;
      lastTime.current = now;
      lastMetricsEmit.current = now;
    }
  });

  return null;
}

export function PerformanceOverlay({
  visible,
  metrics,
  wsLatencyMs
}: {
  visible: boolean;
  metrics: {
    fps: number;
    frameTimeMs: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
  };
  wsLatencyMs: number;
}) {
  const [heapMb, setHeapMb] = useState<number>(0);

  useEffect(() => {
    const updateHeap = () => {
      const perf = window.performance as any;
      if (perf && perf.memory) {
        setHeapMb(Math.round(perf.memory.usedJSHeapSize / (1024 * 1024)));
      }
    };
    updateHeap();
    const interval = setInterval(updateHeap, 1500);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="glass-panel mono-text"
      style={{
        position: 'absolute',
        top: 85,
        right: 16,
        padding: '14px 18px',
        fontSize: '0.78rem',
        zIndex: 20,
        minWidth: 260,
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.6)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong style={{ color: '#c084fc', letterSpacing: '0.05em' }}>PERFORMANCE PROFILER</strong>
        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>[F3 to Toggle]</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Framerate:</span>
          <strong style={{ color: metrics.fps >= 55 ? '#10b981' : '#f59e0b' }}>
            {metrics.fps} FPS ({metrics.frameTimeMs} ms)
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Draw Calls:</span>
          <strong style={{ color: metrics.drawCalls <= 80 ? '#10b981' : '#f59e0b' }}>
            {metrics.drawCalls} calls
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Triangles:</span>
          <strong style={{ color: metrics.triangles < 150000 ? '#10b981' : '#f59e0b' }}>
            {metrics.triangles.toLocaleString()}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>Geometries / Textures:</span>
          <strong style={{ color: '#e2e8f0' }}>
            {metrics.geometries} / {metrics.textures}
          </strong>
        </div>

        {heapMb > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>JS Heap:</span>
            <strong style={{ color: heapMb < 200 ? '#10b981' : '#f59e0b' }}>
              {heapMb} MB
            </strong>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>WS RTT Latency:</span>
          <strong style={{ color: wsLatencyMs < 40 ? '#10b981' : '#f59e0b' }}>
            {wsLatencyMs} ms
          </strong>
        </div>
      </div>
    </div>
  );
}
