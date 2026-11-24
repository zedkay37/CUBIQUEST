/**
 * PROTO-DONJON : où poser le décor (pur, déterministe, sans three.js : la simulation en connaît les obstacles).
 * Règle de densité : riche au bord des salles, dégagé au centre (là où l'on combat). Rien devant les portes ni sur
 * les repères (départ, escalier, objets, groupes). Les grands éléments du bord deviennent des obstacles fixes.
 */
import { mulberry32, type Vec } from '../sim';
import { T_DOOR, T_FLOOR, T_WATER, T_WALL, T_DECOR, type Floor } from './gen';

export type DecorKind =
  | 'chene' | 'sapin' | 'arbre-mort' | 'souche' | 'buisson' | 'fougere' | 'herbes' | 'fleurs-rouges' | 'fleurs-jaunes'
  | 'champignon' | 'champignons' | 'rocher' | 'cailloux' | 'muret' | 'ruine-arche' | 'pilier-casse' | 'colonne'
  | 'torche-pied' | 'lanterne' | 'cristal-bleu' | 'cristal-violet' | 'caisse' | 'tonneau' | 'coffre-ferme'
  | 'racines' | 'roseaux' | 'nenuphar' | 'pont' | 'stalagmite' | 'os';
export interface DecorItem {
  kind: DecorKind;
  x: number;
  y: number;
  rot: number;
  scale: number;
  solid: boolean;
}
/** Éléments qui bloquent le passage quand ils sont posés au bord. */
export const BIG: DecorKind[] = ['chene', 'sapin', 'arbre-mort', 'rocher', 'muret', 'ruine-arche', 'pilier-casse', 'colonne', 'caisse', 'tonneau', 'coffre-ferme', 'stalagmite', 'souche'];
/** Éléments lumineux (une vraie lumière peut leur être donnée). */
export const LIGHTS: DecorKind[] = ['torche-pied', 'lanterne', 'cristal-bleu', 'cristal-violet'];

const FOREST_EDGE: DecorKind[] = ['chene', 'sapin', 'buisson', 'buisson', 'fougere', 'rocher', 'souche', 'muret', 'ruine-arche', 'pilier-casse', 'colonne', 'caisse', 'tonneau', 'torche-pied', 'arbre-mort', 'champignons', 'racines', 'lanterne', 'coffre-ferme'];
const FOREST_MID: DecorKind[] = ['herbes', 'herbes', 'fleurs-rouges', 'fleurs-jaunes', 'champignon', 'cailloux', 'fougere', 'racines', 'os'];
const CAVE_EDGE: DecorKind[] = ['cristal-bleu', 'cristal-violet', 'stalagmite', 'stalagmite', 'rocher', 'pilier-casse', 'colonne', 'caisse', 'tonneau', 'champignons', 'torche-pied', 'muret', 'os'];
const CAVE_MID: DecorKind[] = ['cailloux', 'champignon', 'cristal-bleu', 'os', 'champignons'];

export function planDecor(f: Floor, seed: number): { items: DecorItem[]; lights: Vec[] } {
  const rng = mulberry32(seed * 31 + f.floorIndex * 977 + 5);
  const W = f.w;
  const t = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= f.h ? T_WALL : f.tiles[y * W + x]);
  // distance au mur (1 = touche un mur), limitée à 4
  const wallDist = (x: number, y: number) => {
    for (let r = 1; r <= 4; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && t(x + dx, y + dy) === T_WALL) return r;
    return 5;
  };
  const near = (x: number, y: number, kind: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (t(x + dx, y + dy) === kind) return true;
    return false;
  };
  const reserved: Vec[] = [f.start];
  if (f.stairs) reserved.push(f.stairs);
  if (f.boss) reserved.push(f.boss);
  for (const r of f.rooms) reserved.push(...r.enemySpots, ...r.nestSpots, ...r.itemSpots, ...(r.treasure ? [r.treasure] : []));
  const cave = f.biome === 'grotte';
  const items: DecorItem[] = [];
  const pick = <T>(l: T[]) => l[Math.floor(rng() * l.length)];
  for (const room of f.rooms) {
    const [x0, y0, x1, y1] = room.rect;
    const big = x1 - x0 >= 11 && y1 - y0 >= 9;
    for (let y = y0 + 1; y < y1 - 1; y++)
      for (let x = x0 + 1; x < x1 - 1; x++) {
        const tile = t(x, y);
        const p = { x: x + 0.5, y: y + 0.5 };
        if (tile === T_WATER) {
          if (rng() < 0.12) items.push({ kind: 'nenuphar', x: p.x, y: p.y, rot: rng() * 6.28, scale: 0.8 + rng() * 0.4, solid: false });
          continue;
        }
        if (tile !== T_FLOOR) continue;
        if (near(x, y, T_DOOR, 2) || reserved.some((s) => Math.hypot(s.x - p.x, s.y - p.y) < 1.8)) continue;
        const d = wallDist(x, y);
        if (near(x, y, T_WATER, 1) && rng() < 0.3) {
          items.push({ kind: 'roseaux', x: p.x, y: p.y, rot: rng() * 6.28, scale: 0.9 + rng() * 0.3, solid: false });
          continue;
        }
        const r = rng();
        let kind: DecorKind | null = null;
        if (d === 1 && r < 0.58) kind = pick(cave ? CAVE_EDGE : FOREST_EDGE);
        else if (d === 2 && r < 0.26) kind = pick(cave ? CAVE_MID : FOREST_MID);
        else if (d >= 3 && r < 0.035) kind = pick(cave ? ['cailloux', 'champignon'] : ['herbes', 'fleurs-jaunes', 'fleurs-rouges', 'cailloux']) as DecorKind;
        if (!kind) continue;
        // pas de grands arbres dans les petites salles
        if ((kind === 'chene' || kind === 'sapin') && !big) kind = 'buisson';
        // jamais d'obstacle dans un passage resserré (mur à moins de 2 cases des deux côtés)
        const w = (dx: number, dy: number) => t(x + dx, y + dy) === T_WALL || t(x + 2 * dx, y + 2 * dy) === T_WALL;
        const narrow = (w(-1, 0) && w(1, 0)) || (w(0, -1) && w(0, 1));
        const solid = d === 1 && BIG.includes(kind) && !narrow;
        items.push({ kind, x: p.x + (solid ? 0 : (rng() - 0.5) * 0.5), y: p.y + (solid ? 0 : (rng() - 0.5) * 0.5), rot: Math.floor(rng() * 4) * (Math.PI / 2) + (solid ? 0 : rng() * 0.6), scale: 0.85 + rng() * 0.35, solid });
      }
    // pont de bois au-dessus de l'eau
    if (room.kind === 'eau') {
      const cy = Math.floor((y0 + y1) / 2);
      for (let x = x0 + 1; x < x1 - 1; x++) if (t(x, cy) === T_WATER) items.push({ kind: 'pont', x: x + 0.5, y: cy + 0.5, rot: 0, scale: 1, solid: false });
    }
  }
  // couloirs : quelques racines et herbes contre les murs, jamais d'obstacle
  for (let y = 1; y < f.h - 1; y++)
    for (let x = 1; x < W - 1; x++)
      if (f.roomOf[y * W + x] < 0 && t(x, y) === T_FLOOR && rng() < 0.07)
        items.push({ kind: cave ? 'cailloux' : rng() < 0.5 ? 'racines' : 'herbes', x: x + 0.5, y: y + 0.5, rot: rng() * 6.28, scale: 0.7 + rng() * 0.3, solid: false });
  // les obstacles ne doivent couper aucun chemin : sinon ils restent seulement visuels
  const reach = () => {
    const seen = new Uint8Array(W * f.h);
    const q = [Math.floor(f.start.y) * W + Math.floor(f.start.x)];
    seen[q[0]] = 1;
    let n = 0;
    while (q.length) {
      const i = q.pop()!;
      n++;
      for (const o of [1, -1, W, -W]) {
        const j = i + o;
        const tj = f.tiles[j];
        if (!seen[j] && (tj === T_FLOOR || tj === T_DOOR || tj === T_WATER)) {
          seen[j] = 1;
          q.push(j);
        }
      }
    }
    return n;
  };
  const before = reach();
  const solids = items.filter((i) => i.solid);
  for (const it of solids) f.tiles[Math.floor(it.y) * W + Math.floor(it.x)] = T_DECOR;
  if (reach() !== before - solids.length)
    for (const it of solids) {
      f.tiles[Math.floor(it.y) * W + Math.floor(it.x)] = T_FLOOR;
      it.solid = false;
    }
  const lights = items.filter((i) => LIGHTS.includes(i.kind)).map((i) => ({ x: i.x, y: i.y }));
  return { items, lights };
}
