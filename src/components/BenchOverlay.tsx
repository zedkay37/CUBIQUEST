import { useEffect, useState } from 'react';

import type { EngineDebugStats } from '../game/engine/debug';

/** Durée de la mesure `?bench=1` (spec Atelier, G1.1). */
export const BENCH_SECONDS = 30;

export interface BenchResult {
  seconds: number;
  frames: number;
  avgFps: number;
  /** Images par seconde moyennes sur les 5 % d'images les plus lentes. */
  low5Fps: number;
  avgDrawCalls: number;
  avgTriangles: number;
  quality: string;
}

/** Calcul pur à partir des durées d'image (ms) : testé dans bench.test.ts. */
export function summarizeFrames(frameMs: number[], drawCalls: number[], triangles: number[], quality: string): BenchResult {
  const total = frameMs.reduce((a, b) => a + b, 0);
  const sorted = [...frameMs].sort((a, b) => b - a);
  const slow = sorted.slice(0, Math.max(1, Math.round(sorted.length * 0.05)));
  const slowAvg = slow.reduce((a, b) => a + b, 0) / Math.max(1, slow.length);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    seconds: Math.round(total / 100) / 10,
    frames: frameMs.length,
    avgFps: total > 0 ? Math.round((frameMs.length * 10000) / total) / 10 : 0,
    low5Fps: slowAvg > 0 ? Math.round(10000 / slowAvg) / 10 : 0,
    avgDrawCalls: Math.round(avg(drawCalls)),
    avgTriangles: Math.round(avg(triangles)),
    quality,
  };
}

/**
 * Page de mesure `?bench=1` (outil) : un combat écrit à l'avance (niveau fixe, aléatoire à graine fixe,
 * escouade de référence, mode Auto) pendant 30 s, puis le résultat. Rien n'est enregistré.
 * Textes en place : outil de développement, comme DebugOverlay.
 */
export default function BenchOverlay({ getStats, quality }: { getStats: () => EngineDebugStats | null; quality: () => string }) {
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<BenchResult | null>(null);

  useEffect(() => {
    const frameMs: number[] = [];
    const draws: number[] = [];
    const tris: number[] = [];
    let last = performance.now();
    const start = last;
    let raf = 0;
    const tick = (now: number) => {
      // les 2 premières secondes (chargement, entrée en scène) ne comptent pas
      if (now - start > 2000) {
        frameMs.push(now - last);
        const s = getStats();
        if (s) {
          draws.push(s.drawCalls);
          tris.push(s.triangles);
        }
      }
      last = now;
      const measured = (now - start - 2000) / 1000;
      setElapsed(Math.max(0, measured));
      if (measured >= BENCH_SECONDS) {
        const r = summarizeFrames(frameMs, draws, tris, quality());
        setResult(r);
        (window as unknown as { __bench?: BenchResult }).__bench = r;
        document.title = `bench ${r.avgFps} fps`;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getStats, quality]);

  const box: React.CSSProperties = {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 60,
    background: 'rgba(10,14,22,0.92)',
    color: '#FAF7F0',
    border: '2px solid #F4B942',
    borderRadius: 8,
    padding: '10px 14px',
    font: '13px/1.5 ui-monospace, monospace',
    minWidth: 260,
  };
  if (!result) {
    return <div style={box}>Mesure en cours… {Math.min(BENCH_SECONDS, elapsed).toFixed(0)} / {BENCH_SECONDS} s</div>;
  }
  return (
    <div style={box} data-bench="done">
      <strong>Mesure terminée ({result.seconds} s, qualité {result.quality})</strong>
      <div>Images / s moyennes : {result.avgFps}</div>
      <div>5 % les plus lentes : {result.low5Fps} images / s</div>
      <div>Appels de dessin : {result.avgDrawCalls}</div>
      <div>Triangles : {result.avgTriangles.toLocaleString('fr-FR')}</div>
      <div>Images : {result.frames}</div>
    </div>
  );
}
