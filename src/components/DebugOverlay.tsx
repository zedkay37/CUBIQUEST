import { useEffect, useState } from 'react';

import type { EngineDebugStats } from '../game/engine/debug';

interface DebugOverlayProps {
  getStats: () => EngineDebugStats | null;
}

type DebugView = EngineDebugStats & { fps: number };

const REFRESH_MS = 500;

/**
 * Overlay de diagnostic, affiché uniquement avec `?debug=1` (outil de développement).
 * Chargé à la demande : sans le paramètre d'URL, ce fichier n'est même pas téléchargé.
 */
export default function DebugOverlay({ getStats }: DebugOverlayProps) {
  const [view, setView] = useState<DebugView | null>(null);

  useEffect(() => {
    let lastFrames = -1;
    let lastTime = performance.now();
    const timer = window.setInterval(() => {
      const stats = getStats();
      if (!stats) return;
      const now = performance.now();
      const fps = lastFrames < 0 ? 0 : ((stats.frames - lastFrames) * 1000) / Math.max(1, now - lastTime);
      lastFrames = stats.frames;
      lastTime = now;
      setView({ ...stats, fps });
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [getStats]);

  if (!view) return null;

  const rows: [string, string][] = [
    ['FPS', view.fps.toFixed(0)],
    ['Image', `${view.frameMs.toFixed(1)} ms`],
    ['Draw calls', String(view.drawCalls)],
    ['Triangles', view.triangles.toLocaleString('fr-FR')],
    ['Géométries', String(view.geometries)],
    ['Textures', String(view.textures)],
    ['Particules', String(view.particles)],
    ['Entités', String(view.entities)],
    ['Relance', view.retryDelayMs < 0 ? '—' : `${Math.round(view.retryDelayMs)} ms`],
  ];

  // Styles en ligne : aucune classe ajoutée à la feuille de style du jeu pour un outil de développement.
  return (
    <div
      data-debug-overlay
      style={{
        position: 'fixed',
        left: 8,
        top: 8,
        zIndex: 200,
        pointerEvents: 'none',
        padding: '8px 10px',
        borderRadius: 6,
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#A7F3D0',
        font: '11px/16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      }}
    >
      {rows.map(([label, value]) => (
        <div key={label} data-debug-row={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: '#34D399' }}>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
}
