/**
 * PROTO-DONJON : génération d'un étage, salle par salle, à partir de salles dessinées à la main (même méthode que
 * les donjons à salles assemblées : des modèles fixes, posés au hasard selon la graine, reliés par des couloirs).
 *
 * Légende des modèles : `#` mur, `.` sol, `D` porte possible (mur si elle ne sert pas), ` ` dehors,
 * `P` pilier, `w` eau peu profonde, `R` rocher, `E` groupe qui erre, `N` nid (groupe endormi), `I` objet,
 * `T` trésor, `S` escalier, `B` boss, `@` départ.
 * Pur et déterministe (aucun DOM) : la même graine redonne le même étage.
 */
import { mulberry32, type Vec } from '../sim';

export const T_VOID = 0;
export const T_FLOOR = 1;
export const T_WALL = 2;
export const T_PILLAR = 3;
export const T_WATER = 4;
export const T_ROCK = 5;
export const T_DOOR = 6; // sol, marqué « seuil » (pour le décor)
export const T_DECOR = 7; // sol occupé par un grand élément de décor (obstacle fixe)
export const isSolid = (t: number) => t === T_VOID || t === T_WALL || t === T_PILLAR || t === T_ROCK || t === T_DECOR;

export type RoomKind = 'depart' | 'petite' | 'grande' | 'en-L' | 'piliers' | 'eau' | 'etroite' | 'tresor' | 'nid' | 'escalier' | 'boss';
interface Template {
  kind: RoomKind;
  rows: string[];
  weight: number;
}

const TEMPLATES: Template[] = [
  {
    kind: 'depart',
    weight: 0,
    rows: ['####D####', '#.......#', '#.......#', '#.......#', 'D...@...D', '#.......#', '#.......#', '#.......#', '####D####'],
  },
  {
    kind: 'petite',
    weight: 3,
    rows: ['####D####', '#.......#', '#.......#', '#...E...#', 'D.......D', '#.......#', '#...I...#', '#.......#', '####D####'],
  },
  {
    kind: 'grande',
    weight: 3,
    rows: [
      '#######D#######',
      '#.............#',
      '#..E.......R..#',
      '#.............#',
      '#.............#',
      '#.............#',
      'D......I......D',
      '#.............#',
      '#.............#',
      '#..R.......E..#',
      '#.............#',
      '#.............#',
      '#######D#######',
    ],
  },
  {
    kind: 'en-L',
    weight: 2,
    rows: [
      '#####D#        ',
      '#.....#        ',
      '#.....#        ',
      '#..E..#        ',
      '#.....#        ',
      'D.....#########',
      '#.............#',
      '#.........I...D',
      '#.....E.......#',
      '#.............#',
      '#######D#######',
    ],
  },
  {
    kind: 'piliers',
    weight: 2,
    rows: [
      '######D######',
      '#...........#',
      '#.PP.....PP.#',
      '#.PP..E..PP.#',
      '#...........#',
      'D.....I.....D',
      '#...........#',
      '#.PP..E..PP.#',
      '#.PP.....PP.#',
      '#...........#',
      '######D######',
    ],
  },
  {
    kind: 'eau',
    weight: 2,
    rows: [
      '######D######',
      '#...........#',
      '#..E........#',
      '#...wwwww...#',
      'D..wwwwwww..D',
      '#...wwwww...#',
      '#........I..#',
      '#...........#',
      '######D######',
    ],
  },
  {
    kind: 'etroite',
    weight: 2,
    rows: [
      '#######D#######',
      '#......#......#',
      '#..E...#......#',
      '#......#...E..#',
      'D.............D',
      '#.............#',
      '#..I...#......#',
      '#######D#######',
    ],
  },
  {
    kind: 'tresor',
    weight: 1,
    rows: ['###D###', '#.....#', '#.R.R.#', '#.....#', '#..T..#', '#.....#', '#######'],
  },
  {
    kind: 'nid',
    weight: 2,
    rows: [
      '######D######',
      '#...........#',
      '#.R.......R.#',
      '#....N.N....#',
      'D...........D',
      '#.....N.....#',
      '#....I......#',
      '#.R.......R.#',
      '######D######',
    ],
  },
  {
    kind: 'escalier',
    weight: 0,
    rows: ['#####D#####', '#.........#', '#.R.....R.#', '#.........#', 'D....S....D', '#.........#', '#...E.....#', '#.........#', '#####D#####'],
  },
  {
    kind: 'boss',
    weight: 0,
    rows: [
      '#####################',
      '#...................#',
      '#.PP.............PP.#',
      '#.PP.............PP.#',
      '#...................#',
      '#...................#',
      '#.........B.........#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#.R...............R.#',
      '#...................#',
      '#...................#',
      '#.PP.............PP.#',
      '#.PP.............PP.#',
      '#...................#',
      '##########D##########',
    ],
  },
];
for (const t of TEMPLATES) if (t.rows.some((r) => r.length !== t.rows[0].length)) throw new Error(`modèle ${t.kind} : lignes de longueurs différentes`);

export interface Room {
  id: number;
  kind: RoomKind;
  /** Rectangle en cases, murs compris : x0, y0, x1, y1 (exclusif). */
  rect: [number, number, number, number];
  center: Vec;
  depth: number;
  enemySpots: Vec[];
  nestSpots: Vec[];
  itemSpots: Vec[];
  treasure: Vec | null;
  stairs: Vec | null;
  boss: Vec | null;
  start: Vec | null;
}
export interface Floor {
  w: number;
  h: number;
  tiles: Uint8Array;
  /** Salle de chaque case (−1 : couloir ou dehors). */
  roomOf: Int16Array;
  rooms: Room[];
  start: Vec;
  stairs: Vec | null;
  boss: Vec | null;
  floorIndex: number;
  biome: 'foret' | 'grotte' | 'glace';
}

const DIRS: Record<string, [number, number]> = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
const OPP: Record<string, string> = { N: 'S', S: 'N', E: 'W', W: 'E' };

/** Portes d'un modèle avec leur sens (la ligne 0 est en bas, y vers le haut). */
function doorsOf(t: Template): { x: number; y: number; dir: string }[] {
  const h = t.rows.length;
  const w = t.rows[0].length;
  const out: { x: number; y: number; dir: string }[] = [];
  t.rows.forEach((row, ry) => {
    const y = h - 1 - ry;
    [...row].forEach((c, x) => {
      if (c !== 'D') return;
      const dir = y === h - 1 ? 'N' : y === 0 ? 'S' : x === 0 ? 'W' : x === w - 1 ? 'E' : '';
      if (dir) out.push({ x, y, dir });
    });
  });
  return out;
}

export function generateFloor(seed: number, floorIndex: number, opts: { boss?: boolean } = {}): Floor {
  const rng = mulberry32(seed * 7919 + floorIndex * 104729);
  const W = 110;
  const H = 110;
  const tiles = new Uint8Array(W * H);
  const roomOf = new Int16Array(W * H).fill(-1);
  const rooms: Room[] = [];
  const openDoors: { x: number; y: number; dir: string; room: number }[] = [];
  const doorTiles = new Set<number>();
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x);

  const fits = (t: Template, ox: number, oy: number) => {
    const h = t.rows.length;
    const w = t.rows[0].length;
    if (ox < 2 || oy < 2 || ox + w > W - 2 || oy + h > H - 2) return false;
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++) {
        const i = at(ox + x, oy + y);
        if (i < 0 || tiles[i] !== T_VOID) return false;
      }
    return true;
  };
  const place = (t: Template, ox: number, oy: number, depth: number): Room => {
    const h = t.rows.length;
    const w = t.rows[0].length;
    const room: Room = {
      id: rooms.length,
      kind: t.kind,
      rect: [ox, oy, ox + w, oy + h],
      center: { x: ox + w / 2, y: oy + h / 2 },
      depth,
      enemySpots: [],
      nestSpots: [],
      itemSpots: [],
      treasure: null,
      stairs: null,
      boss: null,
      start: null,
    };
    t.rows.forEach((row, ry) => {
      const y = oy + h - 1 - ry;
      [...row].forEach((c, x0) => {
        const x = ox + x0;
        const i = at(x, y);
        const p = { x: x + 0.5, y: y + 0.5 };
        if (c === ' ') return;
        tiles[i] = c === '#' || c === 'D' ? T_WALL : c === 'P' ? T_PILLAR : c === 'w' ? T_WATER : c === 'R' ? T_ROCK : T_FLOOR;
        if (c !== '#' && c !== 'D') roomOf[i] = room.id;
        if (c === 'E') room.enemySpots.push(p);
        if (c === 'N') room.nestSpots.push(p);
        if (c === 'I') room.itemSpots.push(p);
        if (c === 'T') room.treasure = p;
        if (c === 'S') room.stairs = p;
        if (c === 'B') room.boss = p;
        if (c === '@') room.start = p;
      });
    });
    for (const d of doorsOf(t)) openDoors.push({ x: ox + d.x, y: oy + d.y, dir: d.dir, room: room.id });
    rooms.push(room);
    return room;
  };
  /** Pose un modèle accroché à une porte libre, au bout d'un couloir. */
  const attach = (t: Template, candidates: typeof openDoors): boolean => {
    const mine = doorsOf(t);
    for (let tries = 0; tries < 40; tries++) {
      if (!candidates.length) return false;
      const door = candidates[Math.floor(rng() * candidates.length)];
      const match = mine.filter((d) => d.dir === OPP[door.dir]);
      if (!match.length) continue;
      const md = match[Math.floor(rng() * match.length)];
      const len = 3 + Math.floor(rng() * 5);
      const [dx, dy] = DIRS[door.dir];
      const tx = door.x + dx * (len + 1);
      const ty = door.y + dy * (len + 1);
      const ox = tx - md.x;
      const oy = ty - md.y;
      if (!fits(t, ox, oy)) continue;
      // le couloir (2 cases de large) doit passer dans le vide
      const side: [number, number] = dx === 0 ? [1, 0] : [0, 1];
      let clear = true;
      for (let k = 1; k <= len && clear; k++)
        for (const s of [-1, 0, 1, 2]) {
          const i = at(door.x + dx * k + side[0] * s, door.y + dy * k + side[1] * s);
          if (i < 0 || tiles[i] !== T_VOID) clear = false;
        }
      if (!clear) continue;
      const parent = rooms[door.room];
      const room = place(t, ox, oy, parent.depth + 1);
      for (let k = 0; k <= len + 1; k++)
        for (const s of [0, 1]) {
          const i = at(door.x + dx * k + side[0] * s, door.y + dy * k + side[1] * s);
          tiles[i] = T_FLOOR;
          if (k === 0 || k === len + 1) doorTiles.add(i);
        }
      openDoors.splice(openDoors.indexOf(door), 1);
      const mineAbs = openDoors.find((d) => d.room === room.id && d.x === ox + md.x && d.y === oy + md.y);
      if (mineAbs) openDoors.splice(openDoors.indexOf(mineAbs), 1);
      // la case voisine du seuil, de l'autre côté du couloir, doit aussi être ouverte (largeur 2)
      for (const p of [door, { x: ox + md.x, y: oy + md.y }]) {
        const i = at(p.x + side[0], p.y + side[1]);
        if (tiles[i] === T_WALL) tiles[i] = T_FLOOR;
        doorTiles.add(i);
      }
      return true;
    }
    return false;
  };

  const byKind = (k: RoomKind) => TEMPLATES.find((t) => t.kind === k)!;
  const start = byKind('depart');
  place(start, Math.floor(W / 2 - 4), 6, 0);
  const pool = TEMPLATES.filter((t) => t.weight > 0);
  const pickTemplate = () => {
    const total = pool.reduce((s, t) => s + t.weight, 0);
    let r = rng() * total;
    for (const t of pool) if ((r -= t.weight) <= 0) return t;
    return pool[0];
  };
  const target = opts.boss ? 4 : 7 + Math.floor(rng() * 3);
  let guard = 0;
  let hasTreasure = false;
  while (rooms.length < target && guard++ < 200) {
    let t = pickTemplate();
    if (t.kind === 'tresor' && (hasTreasure || opts.boss)) continue;
    if (attach(t, openDoors)) hasTreasure ||= t.kind === 'tresor';
  }
  // la salle d'arrivée (escalier ou boss), accrochée le plus loin possible du départ
  const last = byKind(opts.boss ? 'boss' : 'escalier');
  const deep = [...openDoors].sort((a, b) => rooms[b.room].depth - rooms[a.room].depth);
  let ok = false;
  for (let k = 0; k < deep.length && !ok; k += 3) ok = attach(last, deep.slice(k, k + 3));
  if (!ok) ok = attach(last, openDoors);
  if (!ok) return generateFloor(seed + 1000, floorIndex, opts); // très rare : on recommence avec une autre graine

  for (const i of doorTiles) if (tiles[i] === T_WALL) tiles[i] = T_FLOOR;
  for (const i of doorTiles) if (tiles[i] === T_FLOOR) tiles[i] = T_DOOR;
  // murs autour des couloirs
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = at(x, y);
      if (tiles[i] !== T_VOID) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) near = tiles[at(x + dx, y + dy)] === T_FLOOR || tiles[at(x + dx, y + dy)] === T_DOOR;
      if (near) tiles[i] = T_WALL;
    }
  const startRoom = rooms[0];
  const finalRoom = rooms[rooms.length - 1];
  return {
    w: W,
    h: H,
    tiles,
    roomOf,
    rooms,
    start: startRoom.start!,
    stairs: finalRoom.stairs,
    boss: finalRoom.boss,
    floorIndex,
    biome: floorIndex >= 3 ? 'grotte' : 'foret',
  };
}
