/**
 * Sprint PROTO-MENEUR : simulation pure de la maquette `?proto=salle` (aucun DOM, aucun three.js, aucun
 * localStorage). La même boucle sert au navigateur et aux robots (`tools/proto-robots.ts`), à graine fixe.
 * Elle ne partage rien avec le moteur du jeu : le jeu actuel et son golden ne la voient pas.
 *
 * Plan de la salle (x vers la droite, y vers l'avant ; mètres) :
 * - entrée large (y 0–10), couloir étroit (y 10–19, x ±1,8), arène (y 19–42, x ±12) ;
 * - plateforme en hauteur contre le mur ouest (bonus de portée aux tirs), une rampe au sud ;
 * - quelques rochers fixes.
 * Version A : deux compagnons fixes (F : cible sous le curseur, R : retour, 3 et 4 : leurs sorts).
 * Version B : une réserve de quatre ; jauge d'Élan ; la créature BONDIT d'elle-même depuis le Meneur jusqu'au
 * point visé (aucun objet lancé), R la rappelle.
 */
export type Version = 'A' | 'B';
export interface Vec {
  x: number;
  y: number;
}
export type Rect = [number, number, number, number]; // x0, y0, x1, y1

export interface Input {
  move: Vec;
  aim: Vec;
  fire: boolean;
  spell1: boolean;
  spell2: boolean;
  dodge: boolean;
  focus: boolean;
  recall: boolean;
  comp1: boolean;
  comp2: boolean;
  /** Molette : −1, 0 ou +1. */
  select: number;
  enter: boolean;
}
export const emptyInput = (): Input => ({
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 20 },
  fire: false,
  spell1: false,
  spell2: false,
  dodge: false,
  focus: false,
  recall: false,
  comp1: false,
  comp2: false,
  select: 0,
  enter: false,
});

// ---------------------------------------------------------------- la salle (faite à la main)
export const PLATFORM: Rect = [-12, 24, -6.3, 32];
export const RAMP: Rect = [-9.5, 21.5, -7, 24];
export const PLATFORM_H = 1.2;
export const ROOM = {
  floors: [
    [-6, 0, 6, 10],
    [-1.8, 10, 1.8, 19],
    [-12, 19, 12, 42],
  ] as Rect[],
  walls: [
    [-7, -1, 7, 0],
    [-7, 0, -6, 10],
    [6, 0, 7, 10],
    [-13, 10, -1.8, 19],
    [1.8, 10, 13, 19],
    [-13, 19, -12, 43],
    [12, 19, 13, 43],
    [-13, 42, 13, 43],
  ] as Rect[],
  /** Bords de la plateforme (murets) : seule la rampe permet d'y monter. */
  ledges: [
    [-12, 23.7, -9.5, 24],
    [-7, 23.7, -6, 24],
    [-6.3, 24, -6, 32.3],
    [-12, 32, -6, 32.3],
  ] as Rect[],
  rocks: [
    [2.5, 4, 4, 5.5],
    [-3, 26, -1, 28],
    [3, 30, 5.5, 32],
    [-2, 36, 0, 37.5],
    [7, 24, 9, 26],
  ] as Rect[],
};
const SOLIDS: Rect[] = [...ROOM.walls, ...ROOM.ledges, ...ROOM.rocks];

const inRect = (x: number, y: number, r: Rect, m = 0) => x >= r[0] - m && x <= r[2] + m && y >= r[1] - m && y <= r[3] + m;
export const onPlatform = (p: Vec) => inRect(p.x, p.y, PLATFORM);
export function heightAt(p: Vec): number {
  if (onPlatform(p)) return PLATFORM_H;
  if (inRect(p.x, p.y, RAMP)) return (PLATFORM_H * (p.y - RAMP[1])) / (RAMP[3] - RAMP[1]);
  return 0;
}
/** Bonus de portée des tirs depuis la plateforme. */
const rangeMult = (p: Vec) => (heightAt(p) >= 1 ? 1.4 : 1);

// ---------------------------------------------------------------- créatures (aucune nouvelle : les .vox du bestiaire)
export interface CompDef {
  species: string;
  name: string;
  hp: number;
  speed: number;
  range: number;
  dmg: number;
  rate: number;
  ranged: boolean;
  spell: string;
  arrival: { radius: number; dmg: number; stun: number; heal: number };
}
export const COMPS: CompDef[] = [
  { species: 'crabastion', name: 'Crabastion', hp: 260, speed: 4.4, range: 1.7, dmg: 22, rate: 1.0, ranged: false, spell: 'Carapace', arrival: { radius: 2.6, dmg: 20, stun: 1.2, heal: 0 } },
  { species: 'amanitox', name: 'Amanitox', hp: 150, speed: 4.4, range: 7, dmg: 14, rate: 1.1, ranged: true, spell: 'Spores', arrival: { radius: 3.2, dmg: 8, stun: 0, heal: 55 } },
  { species: 'braizard', name: 'Braizard', hp: 170, speed: 5.4, range: 1.6, dmg: 26, rate: 0.7, ranged: false, spell: '', arrival: { radius: 2.3, dmg: 42, stun: 0, heal: 0 } },
  { species: 'givrelin', name: 'Givrelin', hp: 140, speed: 4.6, range: 8, dmg: 17, rate: 1.0, ranged: true, spell: '', arrival: { radius: 2.8, dmg: 18, stun: 0.8, heal: 0 } },
];
export const LEADER = { species: 'calcinarque-legendaire', name: 'Calcinarque', hp: 320, speed: 5.2 };
export const ENEMY_SPECIES = { chargeur: 'chevrok', soigneur: 'bourgeon', boss: 'magmadrake' } as const;

export const CD = { fire: 0.33, spell1: 6, spell2: 10, dodge: 1.5, focus: 0.5, recallA: 4, recallB: 2, comp1: 12, comp2: 14, enter: 0.6 };
export const ELAN = { max: 4, cost: 2, refund: 1, regenPerSec: 1 / 7, perKill: 0.5, bondRange: 9 };
const MAX_TIME = 360;

export type Role = 'meneur' | 'compagnon' | 'chargeur' | 'soigneur' | 'boss';
export interface Unit {
  id: number;
  role: Role;
  species: string;
  name: string;
  team: 'ally' | 'enemy';
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  face: number;
  alive: boolean;
  /** Version B : sur le terrain (sinon dans la réserve). Toujours vrai pour les autres. */
  inPlay: boolean;
  atkCd: number;
  skillCd: number;
  healCd: number;
  windup: number;
  stun: number;
  invuln: number;
  guard: number;
  taunt: number;
  tauntBy: number;
  returnT: number;
  reviveT: number;
  aggro: boolean;
  moving: boolean;
  dash: { vx: number; vy: number; t: number } | null;
  flight: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number; back: boolean } | null;
  comp?: CompDef;
  pattern: number;
  enteredAt: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  left: number;
  dmg: number;
  team: 'ally' | 'enemy';
  source: string;
}
export type TeleKind = 'disc' | 'ring' | 'band';
export interface Telegraph {
  id: number;
  kind: TeleKind;
  x: number;
  y: number;
  r: number;
  r2: number;
  angle: number;
  len: number;
  w: number;
  t: number;
  dur: number;
  dmg: number;
  /** 'enemy' : attaque annoncée contre le joueur ; 'ally' : sort du Meneur. */
  team: 'ally' | 'enemy';
  source: string;
  owner: number;
}
export interface GameEvent {
  type: 'shot' | 'melee' | 'heal' | 'glow' | 'arrival' | 'phase' | 'ko' | 'impact' | 'dodge' | 'recall';
  x: number;
  y: number;
  id?: number;
  to?: number;
  color?: string;
}

export interface Game {
  version: Version;
  t: number;
  rng: () => number;
  nextId: number;
  units: Unit[];
  leader: Unit;
  /** A : les deux compagnons ; B : la réserve de quatre (sur le terrain ou non). */
  comps: Unit[];
  projectiles: Projectile[];
  telegraphs: Telegraph[];
  wave: number;
  waveTimer: number;
  bossPhase: 1 | 2;
  result: null | 'victoire' | 'défaite';
  endReason: string;
  elan: number;
  selected: number;
  cds: Record<string, number>;
  focusId: number;
  focusT: number;
  actions: number;
  actionsByKind: Record<string, number>;
  dmg: Record<string, number>;
  dmgTaken: number;
  wasFiring: boolean;
  events: GameEvent[];
  recordEvents: boolean;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeUnit(g: Game, role: Role, species: string, name: string, team: 'ally' | 'enemy', x: number, y: number, hp: number, speed: number, r = 0.5): Unit {
  const u: Unit = {
    id: g.nextId++,
    role,
    species,
    name,
    team,
    x,
    y,
    r,
    hp,
    maxHp: hp,
    speed,
    face: team === 'ally' ? Math.PI / 2 : -Math.PI / 2,
    alive: true,
    inPlay: true,
    atkCd: 0,
    skillCd: 0,
    healCd: 0,
    windup: 0,
    stun: 0,
    invuln: 0,
    guard: 0,
    taunt: 0,
    tauntBy: -1,
    returnT: 0,
    reviveT: 0,
    aggro: true,
    moving: false,
    dash: null,
    flight: null,
    pattern: 0,
    enteredAt: 0,
  };
  g.units.push(u);
  return u;
}

export function newGame(version: Version, seed = 1, recordEvents = true): Game {
  const g = {
    version,
    t: 0,
    rng: mulberry32(seed),
    nextId: 1,
    units: [],
    comps: [],
    projectiles: [],
    telegraphs: [],
    wave: 0,
    waveTimer: 0,
    bossPhase: 1,
    result: null,
    endReason: '',
    elan: ELAN.max,
    selected: 0,
    cds: {},
    focusId: -1,
    focusT: 0,
    actions: 0,
    actionsByKind: {},
    dmg: {},
    dmgTaken: 0,
    wasFiring: false,
    events: [],
    recordEvents,
  } as unknown as Game;
  g.leader = makeUnit(g, 'meneur', LEADER.species, LEADER.name, 'ally', 0, 3, LEADER.hp, LEADER.speed, 0.55);
  const defs = version === 'A' ? COMPS.slice(0, 2) : COMPS;
  defs.forEach((d, i) => {
    const u = makeUnit(g, 'compagnon', d.species, d.name, 'ally', i === 0 ? -1.6 : 1.6, 2, d.hp, d.speed);
    u.comp = d;
    if (version === 'B') u.inPlay = false;
    g.comps.push(u);
  });
  return g;
}

// ---------------------------------------------------------------- outils
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clampLen = (from: Vec, to: Vec, max: number): Vec => {
  const d = dist(from, to);
  if (d <= max || d === 0) return { x: to.x, y: to.y };
  return { x: from.x + ((to.x - from.x) * max) / d, y: from.y + ((to.y - from.y) * max) / d };
};
function emit(g: Game, e: GameEvent) {
  if (g.recordEvents) g.events.push(e);
}
function act(g: Game, kind: string) {
  g.actions++;
  g.actionsByKind[kind] = (g.actionsByKind[kind] ?? 0) + 1;
}
const ready = (g: Game, k: string) => (g.cds[k] ?? 0) <= 0;

/** Unités qu'un ennemi peut viser (le Meneur, les compagnons présents et posés). */
export function allyTargets(g: Game): Unit[] {
  return g.units.filter((u) => u.team === 'ally' && u.alive && u.inPlay && !u.flight);
}
export function enemies(g: Game): Unit[] {
  return g.units.filter((u) => u.team === 'enemy' && u.alive);
}
export function nearest<T extends Vec>(from: Vec, list: T[]): T | null {
  let best: T | null = null;
  let bd = Infinity;
  for (const u of list) {
    const d = dist(from, u);
    if (d < bd) {
      bd = d;
      best = u;
    }
  }
  return best;
}

/** Navigation grossière : passe par le couloir, et par la rampe pour la plateforme. */
export function navPoint(from: Vec, to: Vec): Vec {
  const zone = (p: Vec) => (p.y < 10 ? 0 : p.y < 19 ? 1 : 2);
  const zf = zone(from);
  const zt = zone(to);
  if (zf < zt) {
    if (zf === 0) return Math.abs(from.x) > 1.1 ? { x: 0, y: 9.4 } : { x: 0, y: 11 };
    return { x: 0, y: 19.8 };
  }
  if (zf > zt) {
    if (zf === 2) return Math.abs(from.x) > 1.1 ? { x: 0, y: 19.8 } : { x: 0, y: 18 };
    return { x: 0, y: 9.6 };
  }
  if (zf === 2) {
    const fOn = onPlatform(from);
    const tOn = onPlatform(to);
    if (fOn && !tOn) return Math.abs(from.x + 8.25) > 1 && from.y > 24.3 ? { x: -8.25, y: 25 } : { x: -8.25, y: 21.2 };
    if (!fOn && tOn) {
      if (inRect(from.x, from.y, RAMP)) return { x: -8.25, y: 25.5 };
      if (from.y > 22 && from.x > -6.3) return { x: -5.4, y: 21.2 };
      if (Math.abs(from.x + 8.25) > 1) return { x: -8.25, y: 21.2 };
      return { x: -8.25, y: 25.5 };
    }
  }
  return to;
}

function moveUnit(u: Unit, dir: Vec, speed: number, dt: number) {
  const l = Math.hypot(dir.x, dir.y);
  if (l < 1e-6) {
    u.moving = false;
    return;
  }
  u.x += (dir.x / l) * speed * dt;
  u.y += (dir.y / l) * speed * dt;
  u.face = Math.atan2(dir.y, dir.x);
  u.moving = true;
}
function moveToward(u: Unit, target: Vec, dt: number, stopAt = 0) {
  if (dist(u, target) <= stopAt) {
    u.moving = false;
    return;
  }
  const p = navPoint(u, target);
  moveUnit(u, { x: p.x - u.x, y: p.y - u.y }, u.speed * (u.stun > 0 ? 0 : 1), dt);
}
function faceTo(u: Unit, p: Vec) {
  u.face = Math.atan2(p.y - u.y, p.x - u.x);
}

function collide(u: Unit) {
  for (const r of SOLIDS) {
    const cx = Math.max(r[0], Math.min(u.x, r[2]));
    const cy = Math.max(r[1], Math.min(u.y, r[3]));
    const dx = u.x - cx;
    const dy = u.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < u.r) {
      if (d > 1e-6) {
        u.x = cx + (dx / d) * u.r;
        u.y = cy + (dy / d) * u.r;
      } else {
        // centre dans le bloc : sortie par le bord le plus proche
        const opts = [
          [u.x - r[0], -1, 0],
          [r[2] - u.x, 1, 0],
          [u.y - r[1], 0, -1],
          [r[3] - u.y, 0, 1],
        ].sort((a, b) => a[0] - b[0])[0];
        u.x += opts[1] * (opts[0] + u.r);
        u.y += opts[2] * (opts[0] + u.r);
      }
    }
  }
}

// ---------------------------------------------------------------- dégâts
function damage(g: Game, target: Unit, amount: number, source: string) {
  if (!target.alive || amount <= 0) return;
  if (target.team === 'ally' && (target.invuln > 0 || target.flight)) return;
  let dmg = amount;
  if (target.guard > 0) dmg *= 0.5;
  dmg = Math.min(dmg, target.hp);
  target.hp -= dmg;
  if (target.team === 'enemy') g.dmg[source] = (g.dmg[source] ?? 0) + dmg;
  else g.dmgTaken += dmg;
  if (target.hp <= 0.0001) kill(g, target);
}
function heal(g: Game, target: Unit, amount: number) {
  if (!target.alive) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  emit(g, { type: 'heal', x: target.x, y: target.y, id: target.id });
}
function kill(g: Game, u: Unit) {
  u.alive = false;
  u.hp = 0;
  u.windup = 0;
  emit(g, { type: 'ko', x: u.x, y: u.y, id: u.id });
  if (u.team === 'enemy') {
    g.telegraphs = g.telegraphs.filter((t) => t.owner !== u.id || t.team === 'ally');
    if (g.version === 'B' && u.role !== 'boss') g.elan = Math.min(ELAN.max, g.elan + ELAN.perKill);
    if (u.role === 'boss') {
      g.result = 'victoire';
      g.endReason = 'Le boss est vaincu.';
    }
    if (g.focusId === u.id) g.focusId = -1;
    return;
  }
  if (u.role === 'meneur') {
    g.result = 'défaite';
    g.endReason = 'Le Meneur est tombé.';
    return;
  }
  u.reviveT = 12;
  if (g.version === 'B') u.inPlay = false;
}

function shoot(g: Game, from: Unit, to: Vec, dmg: number, range: number, source: string, speed = 20, spread = 0) {
  const a = Math.atan2(to.y - from.y, to.x - from.x) + spread;
  g.projectiles.push({ x: from.x, y: from.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, left: range, dmg, team: from.team, source });
  emit(g, { type: 'shot', x: from.x, y: from.y, id: from.id });
}

function telegraph(g: Game, t: Omit<Telegraph, 'id' | 't'>) {
  const tg = { ...t, id: g.nextId++, t: 0 };
  g.telegraphs.push(tg);
  return tg;
}
export function insideTelegraph(t: Telegraph, p: Vec, pad = 0): boolean {
  const d = Math.hypot(p.x - t.x, p.y - t.y);
  if (t.kind === 'disc') return d <= t.r + pad;
  if (t.kind === 'ring') return d >= t.r - pad && d <= t.r2 + pad;
  const c = Math.cos(t.angle);
  const s = Math.sin(t.angle);
  const along = (p.x - t.x) * c + (p.y - t.y) * s;
  const across = -(p.x - t.x) * s + (p.y - t.y) * c;
  return along >= -0.5 - pad && along <= t.len + pad && Math.abs(across) <= t.w / 2 + pad;
}

// ---------------------------------------------------------------- vagues
function spawnEnemy(g: Game, role: 'chargeur' | 'soigneur' | 'boss', x: number, y: number, aggro: boolean) {
  const stats = role === 'chargeur' ? { hp: 190, speed: 3.3, r: 0.6 } : role === 'soigneur' ? { hp: 130, speed: 3.0, r: 0.5 } : { hp: 3200, speed: 2.4, r: 1.3 };
  const name = role === 'chargeur' ? 'Chargeur' : role === 'soigneur' ? 'Soigneur' : 'Boss';
  const u = makeUnit(g, role, ENEMY_SPECIES[role], name, 'enemy', x, y, stats.hp, stats.speed, stats.r);
  u.aggro = aggro;
  u.skillCd = role === 'chargeur' ? 1.5 + g.rng() * 2 : role === 'boss' ? 2.5 : 0;
  u.healCd = 2 + g.rng();
  u.atkCd = g.rng();
  emit(g, { type: 'arrival', x, y, id: u.id, color: '#9B5CFF' });
  return u;
}
function updateWaves(g: Game, dt: number) {
  const alive = enemies(g).length;
  if (g.wave === 0 && g.leader.y > 7) {
    g.wave = 1;
    spawnEnemy(g, 'chargeur', -1, 22, true);
    spawnEnemy(g, 'chargeur', 1, 23.5, true);
    spawnEnemy(g, 'soigneur', 0, 28, true);
  } else if ((g.wave === 1 || g.wave === 2) && alive === 0) {
    if (g.waveTimer <= 0) g.waveTimer = g.wave === 1 ? 2 : 3;
    g.waveTimer -= dt;
    if (g.waveTimer <= 0) {
      g.wave++;
      g.waveTimer = 0;
      if (g.wave === 2) {
        spawnEnemy(g, 'chargeur', -5, 35, false);
        spawnEnemy(g, 'chargeur', 5, 35, false);
        spawnEnemy(g, 'chargeur', 0, 37, false);
        spawnEnemy(g, 'soigneur', -4, 40, false);
        spawnEnemy(g, 'soigneur', 6, 40, false);
      } else spawnEnemy(g, 'boss', 0, 35, true);
    }
  }
}

// ---------------------------------------------------------------- un pas de jeu
export function step(g: Game, input: Input, dt = 1 / 60): void {
  if (g.result) return;
  g.t += dt;
  for (const k of Object.keys(g.cds)) g.cds[k] -= dt;
  g.events.length = g.recordEvents ? g.events.length : 0;
  playerActions(g, input, dt);
  for (const u of g.units) {
    if (!u.alive) continue;
    u.invuln = Math.max(0, u.invuln - dt);
    u.guard = Math.max(0, u.guard - dt);
    u.stun = Math.max(0, u.stun - dt);
    u.taunt = Math.max(0, u.taunt - dt);
    u.atkCd -= dt;
  }
  for (const c of g.comps) updateComp(g, c, dt);
  for (const e of enemies(g)) updateEnemy(g, e, dt);
  updateProjectiles(g, dt);
  updateTelegraphs(g, dt);
  separate(g);
  for (const u of g.units) if (u.alive && !u.flight) collide(u);
  updateWaves(g, dt);
  if (g.version === 'B') g.elan = Math.min(ELAN.max, g.elan + ELAN.regenPerSec * dt);
  if (!g.result && g.t >= MAX_TIME) {
    g.result = 'défaite';
    g.endReason = 'Temps écoulé.';
  }
  g.units = g.units.filter((u) => u.alive || u.team === 'ally');
}

function playerActions(g: Game, input: Input, dt: number) {
  const L = g.leader;
  // déplacement (ou esquive en cours)
  if (L.dash) {
    const sub = 3;
    for (let i = 0; i < sub; i++) {
      L.x += (L.dash.vx * dt) / sub;
      L.y += (L.dash.vy * dt) / sub;
      collide(L);
    }
    L.dash.t -= dt;
    if (L.dash.t <= 0) L.dash = null;
  } else {
    moveUnit(L, input.move, L.speed, dt);
    if (!L.moving || input.fire) faceTo(L, input.aim);
  }
  const aim = input.aim;
  const range = 10 * rangeMult(L);
  if (input.fire && !g.wasFiring) act(g, 'tir');
  g.wasFiring = input.fire;
  if (input.fire && L.atkCd <= 0) {
    shoot(g, L, aim, 10, range, 'Calcinarque — tir');
    L.atkCd = CD.fire;
  }
  if (input.spell1 && ready(g, 'spell1')) {
    act(g, 'sort 1');
    for (let i = -2; i <= 2; i++) shoot(g, L, aim, 14, range, 'Calcinarque — Salve', 20, i * 0.16);
    g.cds.spell1 = CD.spell1;
    emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
  }
  if (input.spell2 && ready(g, 'spell2')) {
    act(g, 'sort 2');
    const p = clampLen(L, aim, 9);
    telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 2.6, r2: 0, angle: 0, len: 0, w: 0, dur: 0.5, dmg: 50, team: 'ally', source: 'Calcinarque — Brasier', owner: L.id });
    g.cds.spell2 = CD.spell2;
    emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
  }
  if (input.dodge && ready(g, 'dodge') && !L.dash) {
    act(g, 'esquive');
    let d = input.move;
    if (Math.hypot(d.x, d.y) < 0.1) d = { x: aim.x - L.x, y: aim.y - L.y };
    const l = Math.hypot(d.x, d.y) || 1;
    L.dash = { vx: (d.x / l) * 22, vy: (d.y / l) * 22, t: 0.2 };
    L.invuln = 0.35;
    g.cds.dodge = CD.dodge;
    emit(g, { type: 'dodge', x: L.x, y: L.y, id: L.id });
  }
  if (g.version === 'A') {
    if (input.focus && ready(g, 'focus')) {
      const t = nearest(aim, enemies(g).filter((e) => dist(e, aim) < 3));
      if (t) {
        act(g, 'F cible');
        g.focusId = t.id;
        g.focusT = 8;
        for (const c of g.comps) c.returnT = 0;
        g.cds.focus = CD.focus;
      }
    }
    if (input.recall && ready(g, 'recall')) {
      act(g, 'R retour');
      for (const c of g.comps) if (c.alive) c.returnT = 2.5;
      g.focusId = -1;
      g.cds.recall = CD.recallA;
    }
    if (input.comp1 && ready(g, 'comp1') && g.comps[0].alive) {
      act(g, 'sort 3');
      const c = g.comps[0];
      c.guard = 4;
      for (const e of enemies(g)) if (dist(e, c) < 7) {
        e.taunt = 4;
        e.tauntBy = c.id;
      }
      g.cds.comp1 = CD.comp1;
      emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#7FD7FF' });
    }
    if (input.comp2 && ready(g, 'comp2') && g.comps[1].alive) {
      act(g, 'sort 4');
      const c = g.comps[1];
      for (const a of allyTargets(g)) if (dist(a, c) < 6) heal(g, a, 70);
      g.cds.comp2 = CD.comp2;
      emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#9CFF7A' });
    }
    g.focusT -= dt;
    if (g.focusT <= 0) g.focusId = -1;
  } else {
    if (input.select) {
      act(g, 'molette');
      g.selected = (g.selected + (input.select > 0 ? 1 : -1) + g.comps.length) % g.comps.length;
    }
    const sel = g.comps[g.selected];
    const inPlay = g.comps.filter((c) => c.inPlay && c.alive);
    if (input.enter && ready(g, 'enter') && sel.alive && !sel.inPlay && !sel.flight && inPlay.length < 2 && g.elan >= ELAN.cost) {
      act(g, 'entrée');
      const p = clampLen(L, aim, ELAN.bondRange);
      sel.x = L.x;
      sel.y = L.y;
      sel.inPlay = true;
      sel.flight = { fx: L.x, fy: L.y, tx: p.x, ty: p.y, t: 0, dur: 0.55, back: false };
      sel.enteredAt = g.t;
      g.elan -= ELAN.cost;
      g.cds.enter = CD.enter;
    }
    if (input.recall && ready(g, 'recall')) {
      const target = sel.inPlay && sel.alive && !sel.flight ? sel : inPlay.filter((c) => !c.flight).sort((a, b) => b.enteredAt - a.enteredAt)[0];
      if (target) {
        act(g, 'R rappel');
        target.flight = { fx: target.x, fy: target.y, tx: L.x, ty: L.y, t: 0, dur: 0.4, back: true };
        g.elan = Math.min(ELAN.max, g.elan + ELAN.refund);
        g.cds.recall = CD.recallB;
        emit(g, { type: 'recall', x: target.x, y: target.y, id: target.id });
      }
    }
  }
}

function landArrival(g: Game, c: Unit) {
  const a = c.comp!.arrival;
  emit(g, { type: 'arrival', x: c.x, y: c.y, id: c.id, color: '#FFE27A' });
  for (const e of enemies(g))
    if (dist(e, c) <= a.radius + e.r) {
      damage(g, e, a.dmg, `${c.name} — arrivée`);
      if (a.stun) e.stun = Math.max(e.stun, a.stun);
      e.aggro = true;
    }
  if (a.heal) for (const al of allyTargets(g)) if (dist(al, c) <= a.radius + 0.5) heal(g, al, a.heal);
}

function updateComp(g: Game, c: Unit, dt: number) {
  const L = g.leader;
  if (!c.alive) {
    c.reviveT -= dt;
    if (c.reviveT <= 0) {
      c.alive = true;
      c.hp = c.maxHp * 0.5;
      c.x = L.x - 1;
      c.y = L.y - 1;
      if (g.version === 'B') c.inPlay = false;
    }
    return;
  }
  if (g.version === 'B' && !c.inPlay) {
    c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.04 * dt);
    c.x = L.x;
    c.y = L.y;
    return;
  }
  if (c.flight) {
    const f = c.flight;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    const tx = f.back ? L.x : f.tx;
    const ty = f.back ? L.y : f.ty;
    c.x = f.fx + (tx - f.fx) * k;
    c.y = f.fy + (ty - f.fy) * k;
    c.face = Math.atan2(ty - f.fy, tx - f.fx);
    if (k >= 1) {
      c.flight = null;
      if (f.back) c.inPlay = false;
      else {
        collide(c);
        landArrival(g, c);
      }
    }
    return;
  }
  if (c.stun > 0) return;
  if (c.returnT > 0) {
    c.returnT -= dt;
    moveToward(c, L, dt, 1.8);
    return;
  }
  const d = c.comp!;
  const leash = dist(c, L) > 14;
  let target: Unit | null = null;
  if (g.version === 'A' && g.focusId >= 0) target = enemies(g).find((e) => e.id === g.focusId) ?? null;
  if (!target && !leash) target = nearest(c, enemies(g).filter((e) => e.aggro && dist(e, c) < 9 && dist(e, L) < 12));
  if (!target) {
    moveToward(c, L, dt, 2.6);
    return;
  }
  const range = d.range * (d.ranged ? rangeMult(c) : 1) + target.r;
  if (dist(c, target) > range) moveToward(c, target, dt);
  else {
    c.moving = false;
    faceTo(c, target);
    if (c.atkCd <= 0) {
      c.atkCd = d.rate;
      if (d.ranged) shoot(g, c, target, d.dmg, range + 1.5, d.name, 16);
      else {
        damage(g, target, d.dmg, d.name);
        emit(g, { type: 'melee', x: target.x, y: target.y, id: c.id, to: target.id });
      }
    }
  }
}

function enemyTarget(g: Game, e: Unit): Unit | null {
  const list = allyTargets(g);
  if (e.taunt > 0) {
    const t = list.find((u) => u.id === e.tauntBy);
    if (t) return t;
  }
  return nearest(e, list);
}

function updateEnemy(g: Game, e: Unit, dt: number) {
  const target = enemyTarget(g, e);
  if (!target) return;
  if (!e.aggro) {
    if (dist(e, target) < 15) e.aggro = true;
    else return;
  }
  if (e.dash) {
    e.x += e.dash.vx * dt;
    e.y += e.dash.vy * dt;
    e.dash.t -= dt;
    if (e.dash.t <= 0) e.dash = null;
    return;
  }
  if (e.stun > 0) {
    e.moving = false;
    return;
  }
  const d = dist(e, target);
  if (e.role === 'chargeur') {
    if (e.windup > 0) {
      e.windup -= dt;
      e.moving = false;
      if (e.windup <= 0) {
        // la charge part au moment de l'impact annoncé (les dégâts sont dans le télégraphe)
        const sp = 8.5 / 0.25;
        e.dash = { vx: Math.cos(e.face) * sp, vy: Math.sin(e.face) * sp, t: 0.25 };
      }
      return;
    }
    e.skillCd -= dt;
    if (e.skillCd <= 0 && d < 8) {
      faceTo(e, target);
      telegraph(g, { kind: 'band', x: e.x, y: e.y, r: 0, r2: 0, angle: e.face, len: 8.5, w: 1.8, dur: 1.0, dmg: 55, team: 'enemy', source: 'Chargeur', owner: e.id });
      e.windup = 1.0;
      e.skillCd = 5 + g.rng() * 1.5;
      return;
    }
    if (d > 1.3 + target.r) moveToward(e, target, dt);
    else {
      e.moving = false;
      faceTo(e, target);
      if (e.atkCd <= 0) {
        e.atkCd = 1;
        damage(g, target, 14, 'Chargeur');
        emit(g, { type: 'melee', x: target.x, y: target.y, id: e.id, to: target.id });
      }
    }
    return;
  }
  if (e.role === 'soigneur') {
    e.healCd -= dt;
    if (e.healCd <= 0) {
      const hurt = enemies(g)
        .filter((o) => o.hp < o.maxHp - 1 && dist(o, e) < 11)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        heal(g, hurt, 45);
        emit(g, { type: 'heal', x: e.x, y: e.y, id: e.id, to: hurt.id, color: '#9CFF7A' });
        e.healCd = 3.5;
      } else e.healCd = 0.5;
    }
    // reste en retrait
    if (d < 8) moveUnit(e, { x: e.x - target.x, y: e.y - target.y }, e.speed, dt);
    else if (d > 11) moveToward(e, target, dt);
    else e.moving = false;
    faceTo(e, target);
    if (e.atkCd <= 0 && d < 11) {
      e.atkCd = 2.2;
      shoot(g, e, target, 6, 12, 'Soigneur', 12);
    }
    return;
  }
  // boss
  if (g.bossPhase === 1 && e.hp <= e.maxHp * 0.5) {
    g.bossPhase = 2;
    emit(g, { type: 'phase', x: e.x, y: e.y, id: e.id, color: '#FF5A1F' });
    spawnEnemy(g, 'chargeur', e.x - 4, e.y + 2, true);
    spawnEnemy(g, 'chargeur', e.x + 4, e.y + 2, true);
    e.skillCd = 2;
  }
  if (e.windup > 0) {
    e.windup -= dt;
    e.moving = false;
    return;
  }
  e.skillCd -= dt;
  if (e.skillCd <= 0) {
    const p2 = g.bossPhase === 2;
    if (e.pattern % 2 === 0) {
      if (p2) telegraph(g, { kind: 'ring', x: e.x, y: e.y, r: 2.6, r2: 8.5, angle: 0, len: 0, w: 0, dur: 1.4, dmg: 65, team: 'enemy', source: 'Boss — Onde', owner: e.id });
      else telegraph(g, { kind: 'disc', x: e.x, y: e.y, r: 4.8, r2: 0, angle: 0, len: 0, w: 0, dur: 1.5, dmg: 65, team: 'enemy', source: 'Boss — Onde', owner: e.id });
      e.windup = p2 ? 1.4 : 1.5;
    } else {
      const spots: Vec[] = allyTargets(g).slice(0, 3).map((u) => ({ x: u.x, y: u.y }));
      if (p2) for (let i = 0; i < 2; i++) spots.push({ x: target.x + (g.rng() - 0.5) * 8, y: target.y + (g.rng() - 0.5) * 8 });
      for (const s of spots) telegraph(g, { kind: 'disc', x: s.x, y: s.y, r: 2.0, r2: 0, angle: 0, len: 0, w: 0, dur: p2 ? 1.1 : 1.3, dmg: 55, team: 'enemy', source: 'Boss — Pluie', owner: e.id });
      e.windup = 0.6;
    }
    e.pattern++;
    e.skillCd = p2 ? 3.6 : 5;
    return;
  }
  if (d > 2.2 + target.r) moveToward(e, target, dt);
  else {
    e.moving = false;
    faceTo(e, target);
    if (e.atkCd <= 0) {
      e.atkCd = 1.4;
      damage(g, target, 22, 'Boss');
      emit(g, { type: 'melee', x: target.x, y: target.y, id: e.id, to: target.id });
    }
  }
}

function updateProjectiles(g: Game, dt: number) {
  const keep: Projectile[] = [];
  for (const p of g.projectiles) {
    const sp = Math.hypot(p.vx, p.vy);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.left -= sp * dt;
    const foes = p.team === 'ally' ? enemies(g) : allyTargets(g);
    const hit = foes.find((u) => Math.hypot(u.x - p.x, u.y - p.y) <= u.r + 0.25);
    if (hit) {
      damage(g, hit, p.dmg, p.source);
      if (hit.team === 'enemy') hit.aggro = true;
      emit(g, { type: 'impact', x: p.x, y: p.y, id: hit.id });
      continue;
    }
    if (p.left > 0) keep.push(p);
  }
  g.projectiles = keep;
}

function updateTelegraphs(g: Game, dt: number) {
  const keep: Telegraph[] = [];
  for (const t of g.telegraphs) {
    t.t += dt;
    if (t.t < t.dur) {
      keep.push(t);
      continue;
    }
    const victims = t.team === 'enemy' ? allyTargets(g) : enemies(g);
    for (const v of victims) if (insideTelegraph(t, v, v.r * 0.5)) damage(g, v, t.dmg, t.source);
    emit(g, { type: 'impact', x: t.x, y: t.y, id: t.id, color: t.team === 'ally' ? '#FF8A30' : '#E5383B' });
  }
  g.telegraphs = keep;
}

function separate(g: Game) {
  const list = g.units.filter((u) => u.alive && u.inPlay && !u.flight && !u.dash);
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (d >= min || d < 1e-6) continue;
      const push = (min - d) / 2;
      const wa = a.role === 'boss' ? 0.1 : b.role === 'boss' ? 1.9 : 1;
      const wb = 2 - wa;
      a.x -= (dx / d) * push * wa;
      a.y -= (dy / d) * push * wa;
      b.x += (dx / d) * push * wb;
      b.y += (dy / d) * push * wb;
    }
}

// ---------------------------------------------------------------- résultats (écran de fin, « Copier les résultats »)
export interface Results {
  version: Version;
  issue: 'victoire' | 'défaite' | 'en cours';
  raison: string;
  duree_s: number;
  pv_meneur: number;
  pv_meneur_max: number;
  pv_compagnons: { nom: string; pv: number; max: number }[];
  actions: number;
  actions_detail: Record<string, number>;
  degats_par_source: Record<string, number>;
  degats_subis: number;
  vague_atteinte: number;
  phase_boss: number;
}
export function results(g: Game): Results {
  const round = (n: number) => Math.round(n);
  const dmg: Record<string, number> = {};
  for (const [k, v] of Object.entries(g.dmg).sort((a, b) => b[1] - a[1])) dmg[k] = round(v);
  return {
    version: g.version,
    issue: g.result ?? 'en cours',
    raison: g.endReason,
    duree_s: Math.round(g.t * 10) / 10,
    pv_meneur: round(g.leader.hp),
    pv_meneur_max: g.leader.maxHp,
    pv_compagnons: g.comps.map((c) => ({ nom: c.name, pv: round(c.alive ? c.hp : 0), max: c.maxHp })),
    actions: g.actions,
    actions_detail: { ...g.actionsByKind },
    degats_par_source: dmg,
    degats_subis: round(g.dmgTaken),
    vague_atteinte: g.wave,
    phase_boss: g.wave === 3 ? g.bossPhase : 0,
  };
}
