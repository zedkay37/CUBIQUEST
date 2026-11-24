/** PROTO-DONJON : mini-carte en coin d'écran (cases déjà vues, équipe, ennemis visibles, escalier, objets). */
import { useEffect, useRef } from 'react';
import type { Game } from '../sim';
import { T_DOOR, T_FLOOR, T_WATER, T_WALL } from './gen';
import type { DonjonLevel } from './level';

export function Minimap({ level, game, tick }: { level: DonjonLevel; game: Game; tick: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext('2d')!;
    const f = level.floor;
    let x0 = f.w;
    let y0 = f.h;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < f.h; y++)
      for (let i = 0; i < f.w; i++)
        if (f.tiles[y * f.w + i]) {
          x0 = Math.min(x0, i);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, i);
          y1 = Math.max(y1, y);
        }
    const s = Math.min(c.width / (x1 - x0 + 1), c.height / (y1 - y0 + 1));
    const px = (v: number) => (v - x0) * s;
    const py = (v: number) => c.height - (v - y0 + 1) * s;
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(8,10,14,0.65)';
    x.fillRect(0, 0, c.width, c.height);
    for (let y = y0; y <= y1; y++)
      for (let i = x0; i <= x1; i++) {
        const k = y * f.w + i;
        if (!level.seen[k]) continue;
        const t = f.tiles[k];
        x.fillStyle = t === T_FLOOR || t === T_DOOR ? '#C9C2AE' : t === T_WATER ? '#5FA8D0' : t === T_WALL ? '#4A4740' : '#6E6A60';
        x.fillRect(px(i), py(y), Math.ceil(s), Math.ceil(s));
      }
    const dot = (p: { x: number; y: number }, color: string, r: number) => {
      x.fillStyle = color;
      x.beginPath();
      x.arc(px(p.x), py(p.y) + s, r, 0, Math.PI * 2);
      x.fill();
    };
    if (f.stairs && level.isSeen(f.stairs)) {
      x.fillStyle = '#FFE27A';
      x.fillRect(px(f.stairs.x) - 3, py(f.stairs.y) + s - 3, 6, 6);
    }
    for (const it of level.items) if (!it.taken && level.isSeen(it)) dot(it, it.kind === 'soin' ? '#7BE06A' : '#FFD84A', 1.6);
    for (const u of game.units) {
      if (!u.alive) continue;
      if (u.team === 'enemy' && level.isSeen(u)) dot(u, '#B07CFF', 2);
      if (u.role === 'compagnon' && u.inPlay) dot(u, '#3BD16F', 2);
    }
    dot(game.leader, '#FFD02A', 3);
  }, [level, game, tick]);
  return <canvas ref={ref} width={200} height={200} className="pointer-events-none absolute right-3 top-3 rounded-lg border border-white/20" />;
}
