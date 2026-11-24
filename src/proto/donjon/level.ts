/**
 * PROTO-DONJON : un étage généré vu par la simulation (collisions sur la grille, chemins A*, brouillard,
 * réveil des groupes, objets au sol, escalier, patrouilles du donjon qui se réveille).
 * Pur (aucun DOM) : les robots le font tourner sous Node.
 */
import { type Game, type Level, type Unit, type Vec, type EnemyRole, ELAN, emit, enemies, heal, pushOut, spawnEnemy } from '../sim';
import { type Floor, T_WATER, generateFloor, isSolid } from './gen';
import { type DecorItem, planDecor } from './decorPlan';
import { TOKENS_PER_FLOOR } from '../instincts';

export type ItemKind = 'soin' | 'elan' | 'tresor';
export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  taken: boolean;
}
export interface DonjonOptions {
  seed: number;
  density: number;
  wake: boolean;
  floors: number;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export class DonjonLevel implements Level {
  floor: Floor;
  /** Cases déjà vues (brouillard levé). */
  seen: Uint8Array;
  visitedRooms = new Set<number>();
  items: Item[] = [];
  stairsReached = false;
  timeOnFloor = 0;
  patrolT = 0;
  patrols = 0;
  /** Compteur qui change quand le brouillard bouge (le rendu ne recalcule qu'alors). */
  seenVersion = 0;
  decor: { items: DecorItem[]; lights: Vec[] };
  private paths = new Map<number, { goal: number; path: number[]; t: number }>();

  constructor(
    public opts: DonjonOptions,
    public floorIndex: number,
  ) {
    this.floor = generateFloor(opts.seed, floorIndex, { boss: floorIndex >= opts.floors });
    // décor : posé ici (pur) pour que la simulation connaisse les grands éléments qui bloquent
    this.decor = planDecor(this.floor, opts.seed);
    this.seen = new Uint8Array(this.floor.w * this.floor.h);
  }

  get isBossFloor() {
    return this.floor.boss !== null;
  }

  tileAt(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    if (xi < 0 || yi < 0 || xi >= this.floor.w || yi >= this.floor.h) return 0;
    return this.floor.tiles[yi * this.floor.w + xi];
  }
  solidAt(x: number, y: number) {
    return isSolid(this.tileAt(x, y));
  }

  /** Place l'équipe au départ et peuple l'étage (groupes, objets). Appelé à chaque nouvel étage. */
  populate(g: Game) {
    const f = this.floor;
    const L = g.leader;
    L.x = f.start.x;
    L.y = f.start.y;
    L.dash = null;
    g.trail = [{ x: L.x, y: L.y - 2 }, { x: L.x, y: L.y - 1 }, { x: L.x, y: L.y }];
    g.comps.forEach((c, i) => {
      c.x = L.x + (i % 2 ? 1 : -1);
      c.y = L.y - 1 - (i >> 1);
      c.flight = null;
    });
    const rng = g.rng;
    const scale = 0.65 + 0.15 * (this.floorIndex - 1);
    let group = this.floorIndex * 100;
    const roleFor = (k: number, size: number): EnemyRole => {
      if (k === 1 && size >= 2 && rng() < 0.45) return 'soigneur';
      if (k === 0 && this.floorIndex >= 2 && rng() < 0.35) return 'blinde';
      if (k === 0 && this.floorIndex === 1 && rng() < 0.15) return 'blinde';
      return 'chargeur';
    };
    for (const room of f.rooms) {
      const spawnGroup = (at: Vec, sleeping: boolean, base: number) => {
        const size = Math.max(1, Math.round((base + rng() * 1.6) * this.opts.density));
        group++;
        for (let k = 0; k < size; k++) {
          const a = (k / size) * Math.PI * 2;
          const e = spawnEnemy(g, roleFor(k, size), at.x + Math.cos(a) * 1.3, at.y + Math.sin(a) * 1.3, false, scale);
          e.group = group;
          e.sleeping = sleeping;
          e.notice = sleeping ? 3.5 : 7;
          e.home = { x: at.x, y: at.y };
        }
      };
      for (const s of room.enemySpots) spawnGroup(s, false, 0.8);
      if (room.nestSpots.length) spawnGroup(room.nestSpots[0], true, 2.0);
      for (const s of room.itemSpots) this.items.push({ id: this.items.length, kind: rng() < 0.5 ? 'soin' : 'elan', x: s.x, y: s.y, taken: false });
      if (room.treasure) this.items.push({ id: this.items.length, kind: 'tresor', x: room.treasure.x, y: room.treasure.y, taken: false });
      if (room.boss) {
        const b = spawnEnemy(g, 'boss', room.boss.x, room.boss.y, false, 1);
        b.notice = 8;
        b.sleeping = true;
        b.group = 9999;
      }
    }
    g.events.length = 0;
    this.reveal(g);
  }

  collide(u: Unit) {
    // centre dans un bloc (poussé par une charge ou une esquive) : retour à la case libre la plus proche
    if (this.solidAt(u.x, u.y)) {
      let best: Vec | null = null;
      for (let rr = 1; rr <= 4 && !best; rr++)
        for (let dy = -rr; dy <= rr; dy++)
          for (let dx = -rr; dx <= rr; dx++) {
            const p = { x: Math.floor(u.x) + dx + 0.5, y: Math.floor(u.y) + dy + 0.5 };
            if (!this.solidAt(p.x, p.y) && (!best || dist(p, u) < dist(best, u))) best = p;
          }
      if (best) {
        u.x = best.x;
        u.y = best.y;
      }
    }
    const r = u.r;
    // bornes calculées une fois (la poussée déplace l'unité pendant la boucle)
    const y0 = Math.floor(u.y - r - 1);
    const y1 = Math.floor(u.y + r + 1);
    const x0 = Math.floor(u.x - r - 1);
    const x1 = Math.floor(u.x + r + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.solidAt(x + 0.5, y + 0.5)) pushOut(u, [x, y, x + 1, y + 1]);
  }

  height() {
    return 0;
  }

  /** Ligne de vue « large » : le centre et deux bords d'un couloir de 0,8 m. */
  clearLine(a: Vec, b: Vec): boolean {
    const d = dist(a, b);
    const n = Math.ceil(d / 0.3);
    const px = d > 0 ? -(b.y - a.y) / d : 0;
    const py = d > 0 ? (b.x - a.x) / d : 0;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      for (const o of [0, -0.4, 0.4]) if (this.solidAt(x + px * o, y + py * o)) return false;
    }
    return true;
  }

  nav(g: Game, u: Unit, to: Vec): Vec {
    if (this.clearLine(u, to)) return to;
    const f = this.floor;
    const goal = Math.floor(to.y) * f.w + Math.floor(to.x);
    let c = this.paths.get(u.id);
    // recalcul : nouvelle destination, ou toutes les 1,2 s (jamais à chaque pas : un but inaccessible coûterait cher)
    if (!c || c.goal !== goal || g.t - c.t > 1.2) {
      c = { goal, path: this.astar(u, to), t: g.t };
      this.paths.set(u.id, c);
    }
    // sauter aux points déjà visibles (chemin lissé)
    while (c.path.length > 1) {
      const nx = this.center(c.path[1]);
      if (this.clearLine(u, nx)) c.path.shift();
      else break;
    }
    const next = c.path.length ? this.center(c.path[0]) : to;
    if (c.path.length && dist(u, next) < 0.35) c.path.shift();
    return next;
  }
  private center(i: number): Vec {
    return { x: (i % this.floor.w) + 0.5, y: Math.floor(i / this.floor.w) + 0.5 };
  }
  private astar(from: Vec, to: Vec): number[] {
    const f = this.floor;
    const W = f.w;
    const s = Math.floor(from.y) * W + Math.floor(from.x);
    let e = Math.floor(to.y) * W + Math.floor(to.x);
    if (isSolid(f.tiles[e])) {
      // but dans un mur (poussé par une esquive) : la case libre voisine la plus proche
      const free = [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1].map((o) => e + o).filter((i) => !isSolid(f.tiles[i]));
      if (!free.length) return [];
      e = free[0];
    }
    if (s === e) return [];
    const gScore = new Map<number, number>([[s, 0]]);
    const came = new Map<number, number>();
    const heap: [number, number][] = [[0, s]];
    const push = (p: number, i: number) => {
      heap.push([p, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const pa = (k - 1) >> 1;
        if (heap[pa][0] <= heap[k][0]) break;
        [heap[pa], heap[k]] = [heap[k], heap[pa]];
        k = pa;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const ex = e % W;
    const ey = Math.floor(e / W);
    let found = false;
    let steps = 0;
    while (heap.length && steps++ < 2500) {
      const [, cur] = pop();
      if (cur === e) {
        found = true;
        break;
      }
      const cx = cur % W;
      const cy = Math.floor(cur / W);
      const gc = gScore.get(cur)!;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (isSolid(f.tiles[ny * W + nx])) continue;
          // passages d'une seule case : trop étroits pour une créature
          const sol = (x: number, y: number) => isSolid(f.tiles[y * W + x]);
          if ((sol(nx - 1, ny) && sol(nx + 1, ny)) || (sol(nx, ny - 1) && sol(nx, ny + 1))) continue;
          if (dx && dy && (isSolid(f.tiles[cy * W + nx]) || isSolid(f.tiles[ny * W + cx]))) continue;
          const ni = ny * W + nx;
          const ng = gc + (dx && dy ? 1.414 : 1);
          if (ng < (gScore.get(ni) ?? Infinity)) {
            gScore.set(ni, ng);
            came.set(ni, cur);
            const h = Math.hypot(nx - ex, ny - ey);
            push(ng + h, ni);
          }
        }
    }
    if (!found) return [];
    const path: number[] = [];
    for (let k: number | undefined = e, n = 0; k !== undefined && k !== s && n < 20000; k = came.get(k), n++) path.push(k);
    return path.reverse();
  }

  /** Lève le brouillard : la salle où entre le Meneur, et les couloirs autour de lui. */
  reveal(g: Game) {
    const f = this.floor;
    const L = g.leader;
    const ri = f.roomOf[Math.floor(L.y) * f.w + Math.floor(L.x)];
    let changed = false;
    if (ri >= 0 && !this.visitedRooms.has(ri)) {
      this.visitedRooms.add(ri);
      const [x0, y0, x1, y1] = f.rooms[ri].rect;
      for (let y = y0 - 1; y <= y1; y++) for (let x = x0 - 1; x <= x1; x++) if (x >= 0 && y >= 0 && x < f.w && y < f.h) this.seen[y * f.w + x] = 1;
      changed = true;
    }
    const R = 4;
    for (let y = Math.floor(L.y - R); y <= Math.floor(L.y + R); y++)
      for (let x = Math.floor(L.x - R); x <= Math.floor(L.x + R); x++) {
        if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
        const i = y * f.w + x;
        if (!this.seen[i] && Math.hypot(x + 0.5 - L.x, y + 0.5 - L.y) <= R) {
          this.seen[i] = 1;
          changed = true;
        }
      }
    if (changed) this.seenVersion++;
  }
  isSeen(p: Vec) {
    const f = this.floor;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    return x >= 0 && y >= 0 && x < f.w && y < f.h && this.seen[y * f.w + x] === 1;
  }
  inWater(p: Vec) {
    return this.tileAt(p.x, p.y) === T_WATER;
  }

  update(g: Game, dt: number) {
    this.timeOnFloor += dt;
    this.reveal(g);
    const L = g.leader;
    // objets au sol : on marche dessus
    for (const it of this.items) {
      if (it.taken || dist(it, L) > 0.9) continue;
      it.taken = true;
      emit(g, { type: 'pickup', x: it.x, y: it.y, id: it.id, color: it.kind === 'soin' ? '#9CFF7A' : '#FFE27A' });
      if (it.kind === 'soin') for (const u of [L, ...g.comps]) if (u.alive && dist(u, L) < 8) heal(g, u, 45);
      if (it.kind === 'elan') {
        if (g.version === 'B') g.elan = Math.min(ELAN.max, g.elan + 1);
        else heal(g, L, 20);
      }
      if (it.kind === 'tresor') {
        g.elan = Math.min(ELAN.max, g.elan + 2);
        for (const u of [L, ...g.comps]) if (u.alive) heal(g, u, 80);
      }
    }
    // escalier : seulement quand aucun ennemi réveillé n'est tout près
    const st = this.floor.stairs;
    if (st && dist(L, st) < 1.1 && !enemies(g).some((e) => e.aggro && dist(e, L) < 9)) this.stairsReached = true;
    // le donjon se réveille : après 60 s, une patrouille toutes les 25 s, qui vient de loin
    if (this.opts.wake && !this.isBossFloor && this.timeOnFloor > 60) {
      this.patrolT -= dt;
      if (this.patrolT <= 0) {
        this.patrolT = 25;
        const far = [...this.floor.rooms].sort((a, b) => dist(b.center, L) - dist(a.center, L))[0];
        const n = 2 + Math.min(2, this.patrols);
        for (let k = 0; k < n; k++) {
          const e = spawnEnemy(g, k === 2 ? 'soigneur' : 'chargeur', far.center.x + (k - 1), far.center.y, true, 1 + 0.15 * (this.floorIndex - 1));
          e.group = 5000 + this.patrols;
          e.notice = 99;
        }
        this.patrols++;
      }
    }
  }
}

/** Passe à l'étage suivant : nouveau terrain, équipe au départ, combats en cours effacés. */
export function enterFloor(g: Game, opts: DonjonOptions, floorIndex: number): DonjonLevel {
  const lvl = new DonjonLevel(opts, floorIndex);
  g.units = g.units.filter((u) => u.team === 'ally');
  g.projectiles = [];
  g.telegraphs = [];
  g.leaderTarget = -1;
  g.focusId = -1;
  g.moveGoal = null;
  g.recruitQueue = [];
  g.level = lvl;
  g.wave = floorIndex;
  if (g.instincts) g.tokens = TOKENS_PER_FLOOR;
  lvl.populate(g);
  return lvl;
}
