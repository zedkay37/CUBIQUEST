/**
 * Maquettes PROTO-MENEUR et PROTO-DONJON : simulation pure (aucun DOM, aucun three.js, aucun localStorage).
 * La même boucle sert au navigateur et aux robots, à graine fixe. Elle ne partage rien avec le moteur du jeu :
 * le jeu actuel et son golden ne la voient pas.
 *
 * Le terrain est un « niveau » (`Level`) : la salle faite à la main de PROTO-MENEUR (`SALLE`, ci-dessous) ou un
 * étage de donjon généré (`donjon/level.ts`). Le combat, l'équipe et les ennemis sont communs.
 * Version A : deux compagnons fixes (F : cible, R : retour, 3 et 4 : leurs sorts).
 * Version B : une réserve ; jauge d'Élan ; la créature BONDIT d'elle-même depuis le Meneur jusqu'au point visé
 * (aucun objet lancé), R la rappelle.
 * Schémas de contrôle : 1 auto-attaque + ordres, 2 clic souris (aller / attaquer), 3 tir à la souris (ancien).
 */
import { instinct, useToken } from './instincts';
import { conquestAI } from './conquest';

export type Version = 'A' | 'B';
export type Scheme = 1 | 2 | 3;
export type LeaderId = 'calcinarque' | 'braizard';
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
  /** Schémas 1 et 2 : ennemi désigné au clic (−1 : aucun changement, −2 : oublier la cible). */
  designate: number;
  /** Schéma 2 : point du sol où aller (null : aucun nouvel ordre). */
  moveTo: Vec | null;
  /** PROTO-MODELES (C) : carte jouée (index dans la main), avec son point visé et sa cible. */
  card: { index: number; at: Vec; target: number } | null;
  /** E : place de l'équipe à faire entrer (0 à 3 ; −1 : aucune). */
  swapTo: number;
  /** G : jeton « ultime ». */
  ultimate: boolean;
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
  designate: -1,
  moveTo: null,
  card: null,
  swapTo: -1,
  ultimate: false,
});

// ---------------------------------------------------------------- le terrain
export interface Level {
  /** Repousse une unité hors des obstacles. */
  collide(u: Unit): void;
  /** Prochain point à viser pour aller de `u` vers `to` (couloirs, rampes, chemins). */
  nav(g: Game, u: Unit, to: Vec): Vec;
  height(p: Vec): number;
  /** Vagues, réveil des groupes, objets, escalier… */
  update(g: Game, dt: number): void;
}

// --- la salle de PROTO-MENEUR (faite à la main)
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

export const inRect = (x: number, y: number, r: Rect, m = 0) => x >= r[0] - m && x <= r[2] + m && y >= r[1] - m && y <= r[3] + m;
export const onPlatform = (p: Vec) => inRect(p.x, p.y, PLATFORM);
export function heightAt(p: Vec): number {
  if (onPlatform(p)) return PLATFORM_H;
  if (inRect(p.x, p.y, RAMP)) return (PLATFORM_H * (p.y - RAMP[1])) / (RAMP[3] - RAMP[1]);
  return 0;
}

/** Repousse un cercle hors d'un rectangle (commun aux deux terrains). */
export function pushOut(u: { x: number; y: number; r: number }, r: Rect) {
  const cx = Math.max(r[0], Math.min(u.x, r[2]));
  const cy = Math.max(r[1], Math.min(u.y, r[3]));
  const dx = u.x - cx;
  const dy = u.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= u.r) return;
  if (d > 1e-6) {
    u.x = cx + (dx / d) * u.r;
    u.y = cy + (dy / d) * u.r;
  } else {
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

/** Navigation grossière de la salle : passe par le couloir, et par la rampe pour la plateforme. */
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

export const SALLE: Level = {
  collide: (u) => {
    for (const r of SOLIDS) pushOut(u, r);
  },
  nav: (_g, u, to) => navPoint(u, to),
  height: heightAt,
  update: (g, dt) => {
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
  },
};

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
/** Remplaçant de Braizard dans la réserve quand Braizard est le Meneur (PROTO-DONJON). */
export const RAICUBE: CompDef = { species: 'raicube', name: 'Raicube', hp: 150, speed: 5, range: 6, dmg: 16, rate: 0.8, ranged: true, spell: '', arrival: { radius: 2.6, dmg: 30, stun: 0.5, heal: 0 } };
/** Recrues possibles (PROTO-DONJON) : les ennemis vaincus qui demandent à rejoindre l'équipe. */
export const RECRUITS: Record<string, CompDef> = {
  chevrok: { species: 'chevrok', name: 'Chevrok', hp: 180, speed: 5, range: 1.6, dmg: 22, rate: 0.8, ranged: false, spell: '', arrival: { radius: 2.4, dmg: 30, stun: 0.4, heal: 0 } },
  bourgeon: { species: 'bourgeon', name: 'Bourgeon', hp: 130, speed: 4.4, range: 7, dmg: 12, rate: 1.0, ranged: true, spell: '', arrival: { radius: 3, dmg: 6, stun: 0, heal: 45 } },
  cailloc: { species: 'cailloc', name: 'Cailloc', hp: 260, speed: 3.8, range: 1.6, dmg: 16, rate: 1.1, ranged: false, spell: '', arrival: { radius: 2.4, dmg: 16, stun: 1.0, heal: 0 } },
};

export interface LeaderDef {
  species: string;
  name: string;
  hp: number;
  speed: number;
  ranged: boolean;
  /** Portée et dégâts de l'attaque automatique (schémas 1 et 2). */
  range: number;
  dmg: number;
  rate: number;
  spell1: string;
}
export const LEADERS: Record<LeaderId, LeaderDef> = {
  calcinarque: { species: 'calcinarque-legendaire', name: 'Calcinarque', hp: 320, speed: 5.2, ranged: true, range: 7, dmg: 11, rate: 0.4, spell1: 'Salve' },
  braizard: { species: 'braizard', name: 'Braizard', hp: 380, speed: 5.6, ranged: false, range: 1.8, dmg: 20, rate: 0.45, spell1: 'Flammèche' },
};
export const LEADER = { species: LEADERS.calcinarque.species, name: 'Calcinarque', hp: 320, speed: 5.2 };
export type EnemyRole = 'chargeur' | 'soigneur' | 'blinde' | 'boss';
export const ENEMY_SPECIES: Record<EnemyRole, string> = { chargeur: 'chevrok', soigneur: 'bourgeon', blinde: 'cailloc', boss: 'magmadrake' };
/** Le compagnon qui brise le blindage (PROTO-DONJON). */
export const ARMOR_BREAKER = 'crabastion';

export const CD = { fire: 0.33, spell1: 6, spell2: 10, dodge: 1.5, focus: 0.5, recallA: 4, recallB: 2, comp1: 12, comp2: 14, enter: 0.6 };
export const ELAN = { max: 4, cost: 2, refund: 1, regenPerSec: 1 / 7, perKill: 0.5, bondRange: 9 };

export type Role = 'meneur' | 'compagnon' | EnemyRole;
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
  /** Distance à laquelle un ennemi remarque l'équipe (il dort : court ; il erre : moyen). */
  notice: number;
  sleeping: boolean;
  group: number;
  home: Vec;
  wander: Vec | null;
  armor: boolean;
  channel: boolean;
  moving: boolean;
  dash: { vx: number; vy: number; t: number } | null;
  flight: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number; back: boolean } | null;
  comp?: CompDef;
  pattern: number;
  enteredAt: number;
  /** Ordre « tenir ce point » (regroupement, pause tactique) : la créature y va et s'y bat. */
  holdAt: Vec | null;
  holdT: number;
  /** Taille d'affichage (D : petits suiveurs). */
  size: number;
  /** E : mouillé (l'éclair frappe plus fort). */
  wetT: number;
  /** F : ennemi désigné par un ordre donné en pause (−1 : aucun). */
  orderTarget: number;
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
  by: string;
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
  /** D'où vient le coup (le bouclier du Soigneur le regarde). */
  from?: Vec;
}
export interface GameEvent {
  type: 'shot' | 'melee' | 'heal' | 'glow' | 'arrival' | 'phase' | 'ko' | 'impact' | 'dodge' | 'recall' | 'block' | 'break' | 'interrupt' | 'notice' | 'pickup';
  x: number;
  y: number;
  id?: number;
  to?: number;
  color?: string;
}

export interface SimOptions {
  level?: Level;
  scheme?: Scheme;
  leader?: LeaderId;
  /** Chance qu'un ennemi vaincu demande à rejoindre l'équipe (0 à 1). */
  recruitChance?: number;
  recordEvents?: boolean;
  /** Durée maximale d'une partie (s) : au-delà, défaite « temps écoulé » (garde-fou des robots). */
  maxTime?: number;
  /** PROTO-MODELES : modèle de jeu (A, B : inchangés ; C, D, E, F, G : nouveaux). */
  mode?: string;
  /** Équipe imposée (sinon celle de la composition). */
  team?: CompDef[];
}

export interface Game {
  version: Version;
  scheme: Scheme;
  leaderDef: LeaderDef;
  level: Level;
  t: number;
  rng: () => number;
  nextId: number;
  units: Unit[];
  leader: Unit;
  /** A : les deux compagnons ; B : la réserve (sur le terrain ou non). */
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
  /** Schémas 1 et 2 : cible désignée du Meneur ; schéma 2 : point où aller. */
  leaderTarget: number;
  moveGoal: Vec | null;
  /** Traînée du Meneur : l'équipe le suit en file. */
  trail: Vec[];
  actions: number;
  actionsByKind: Record<string, number>;
  dmg: Record<string, number>;
  dmgTaken: number;
  wasFiring: boolean;
  events: GameEvent[];
  recordEvents: boolean;
  recruitChance: number;
  recruitQueue: string[];
  /** Un ennemi vaincu demande à rejoindre l'équipe : la simulation attend la réponse. */
  pendingRecruit: string | null;
  recruits: string[];
  interrupts: number;
  maxTime: number;
  mode: string;
  /** Puissance des attaques de base (le chef d'orchestre a des attaques faibles). */
  baseMult: { leader: number; comps: number };
  /** C : la main, le deck, le mana (voir cards.ts). */
  cards: import('./cards').CardState | null;
  /** E : le relais (voir relay.ts). */
  relay: import('./relay').RelayState | null;
  /** F : le Meneur poursuit la cible donnée par un ordre. */
  leaderChase: boolean;
  /** G : règles des compagnons (par espèce) et jetons d'ordre restants à cet étage. */
  instincts: Record<string, import('./instincts').Rule[]> | null;
  tokens: number;
  /** H : la conquête (voir conquest.ts). */
  conquest: import('./conquest').ConquestState | null;
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
    notice: 15,
    sleeping: false,
    group: 0,
    home: { x, y },
    wander: null,
    armor: false,
    channel: false,
    moving: false,
    dash: null,
    flight: null,
    pattern: 0,
    enteredAt: 0,
    holdAt: null,
    holdT: 0,
    size: 1,
    wetT: 0,
    orderTarget: -1,
  };
  g.units.push(u);
  return u;
}

export function makeComp(g: Game, d: CompDef, x: number, y: number): Unit {
  const u = makeUnit(g, 'compagnon', d.species, d.name, 'ally', x, y, d.hp, d.speed);
  u.comp = d;
  if (g.version === 'B') u.inPlay = false;
  return u;
}

/** Équipe de départ : A, les deux premiers ; B, la réserve de quatre (Raicube remplace Braizard s'il mène). */
export function startingTeam(version: Version, leader: LeaderId): CompDef[] {
  if (version === 'A') return COMPS.slice(0, 2);
  return COMPS.map((c) => (leader === 'braizard' && c.species === 'braizard' ? RAICUBE : c));
}

export function newGame(version: Version, seed = 1, recordEventsOrOpts: boolean | SimOptions = true): Game {
  const opts: SimOptions = typeof recordEventsOrOpts === 'boolean' ? { recordEvents: recordEventsOrOpts } : recordEventsOrOpts;
  const leaderId = opts.leader ?? 'calcinarque';
  const g = {
    version,
    scheme: opts.scheme ?? 3,
    leaderDef: LEADERS[leaderId],
    level: opts.level ?? SALLE,
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
    leaderTarget: -1,
    moveGoal: null,
    trail: [],
    actions: 0,
    actionsByKind: {},
    dmg: {},
    dmgTaken: 0,
    wasFiring: false,
    events: [],
    recordEvents: opts.recordEvents ?? true,
    recruitChance: opts.recruitChance ?? 0,
    recruitQueue: [],
    pendingRecruit: null,
    recruits: [],
    interrupts: 0,
    maxTime: opts.maxTime ?? 360,
    mode: opts.mode ?? version,
    baseMult: { leader: 1, comps: 1 },
    cards: null,
    relay: null,
    leaderChase: false,
    instincts: null,
    tokens: 0,
    conquest: null,
  } as unknown as Game;
  const L = g.leaderDef;
  g.leader = makeUnit(g, 'meneur', L.species, L.name, 'ally', 0, 3, L.hp, L.speed, 0.55);
  (opts.team ?? startingTeam(version, leaderId)).forEach((d, i) => g.comps.push(makeComp(g, d, i === 0 ? -1.6 : 1.6, 2)));
  return g;
}

// ---------------------------------------------------------------- outils
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const clampLen = (from: Vec, to: Vec, max: number): Vec => {
  const d = dist(from, to);
  if (d <= max || d === 0) return { x: to.x, y: to.y };
  return { x: from.x + ((to.x - from.x) * max) / d, y: from.y + ((to.y - from.y) * max) / d };
};
export function emit(g: Game, e: GameEvent) {
  if (g.recordEvents) g.events.push(e);
}
function act(g: Game, kind: string) {
  g.actions++;
  g.actionsByKind[kind] = (g.actionsByKind[kind] ?? 0) + 1;
}
const ready = (g: Game, k: string) => (g.cds[k] ?? 0) <= 0;
/** Bonus de portée des tirs depuis une hauteur (plateforme de la salle). */
const rangeMult = (g: Game, p: Vec) => (g.level.height(p) >= 1 ? 1.4 : 1);

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
function moveToward(g: Game, u: Unit, target: Vec, dt: number, stopAt = 0) {
  if (dist(u, target) <= stopAt) {
    u.moving = false;
    return;
  }
  const p = g.level.nav(g, u, target);
  moveUnit(u, { x: p.x - u.x, y: p.y - u.y }, u.speed * (u.stun > 0 ? 0 : 1), dt);
}
function faceTo(u: Unit, p: Vec) {
  u.face = Math.atan2(p.y - u.y, p.x - u.x);
}

// ---------------------------------------------------------------- dégâts
/**
 * `from` : d'où vient le coup (bouclier frontal du Soigneur) ; `by` : espèce de l'attaquant (blindage).
 * Un coup sans `from` (arrivée d'une créature qui bondit) passe toujours le bouclier.
 */
export function damage(g: Game, target: Unit, amount: number, source: string, from?: Vec, by?: string) {
  if (!target.alive || amount <= 0) return;
  if (target.team === 'ally' && (target.invuln > 0 || target.flight)) return;
  let dmg = amount;
  // bouclier frontal du Soigneur : seulement dans le donjon (la salle de PROTO-MENEUR reste telle quelle), et tant
  // qu'il a un allié à protéger (seul, il ne bloque plus : pas de combat sans fin contre un Soigneur acculé)
  if (from && shieldActive(g, target)) {
    let diff = Math.atan2(from.y - target.y, from.x - target.x) - target.face;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 1.15) {
      emit(g, { type: 'block', x: target.x, y: target.y, id: target.id });
      return;
    }
  }
  if (target.armor) {
    if (by === ARMOR_BREAKER) {
      target.armor = false;
      emit(g, { type: 'break', x: target.x, y: target.y, id: target.id });
    } else {
      dmg *= 0.1;
      emit(g, { type: 'block', x: target.x, y: target.y, id: target.id });
    }
  }
  if (target.guard > 0) dmg *= 0.5;
  dmg = Math.min(dmg, target.hp);
  target.hp -= dmg;
  if (target.team === 'enemy') {
    g.dmg[source] = (g.dmg[source] ?? 0) + dmg;
    if (!target.aggro) wakeGroup(g, target);
  } else g.dmgTaken += dmg;
  if (target.hp <= 0.0001) kill(g, target);
}
/** Le bouclier du Soigneur est levé (donjon seulement, tant qu'il a un allié à protéger). */
export function shieldActive(g: Game, u: Unit): boolean {
  return u.role === 'soigneur' && u.alive && g.level !== SALLE && enemies(g).some((o) => o.role !== 'soigneur' && o.aggro && dist(o, u) < 11);
}
export function heal(g: Game, target: Unit, amount: number) {
  if (!target.alive) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  emit(g, { type: 'heal', x: target.x, y: target.y, id: target.id });
}
/** Étourdit un ennemi ; s'il canalisait une attaque (boss), elle est interrompue. */
export function stunEnemy(g: Game, e: Unit, t: number) {
  e.stun = Math.max(e.stun, t);
  if (e.channel) {
    e.channel = false;
    e.windup = 0;
    g.telegraphs = g.telegraphs.filter((x) => !(x.owner === e.id && x.source === 'Boss — Fournaise'));
    e.stun = Math.max(e.stun, 1.5);
    g.interrupts++;
    emit(g, { type: 'interrupt', x: e.x, y: e.y, id: e.id, color: '#7FD7FF' });
  }
}
export function wakeGroup(g: Game, u: Unit) {
  for (const e of enemies(g))
    if (!e.aggro && (e.id === u.id || (u.group && e.group === u.group))) {
      e.aggro = true;
      e.sleeping = false;
      emit(g, { type: 'notice', x: e.x, y: e.y, id: e.id });
    }
}
function kill(g: Game, u: Unit) {
  u.alive = false;
  u.hp = 0;
  u.windup = 0;
  u.channel = false;
  emit(g, { type: 'ko', x: u.x, y: u.y, id: u.id });
  if (u.team === 'enemy') {
    g.telegraphs = g.telegraphs.filter((t) => t.owner !== u.id || t.team === 'ally');
    if (g.version === 'B' && u.role !== 'boss') g.elan = Math.min(ELAN.max, g.elan + ELAN.perKill);
    if (u.role === 'boss') {
      g.result = 'victoire';
      g.endReason = 'Le boss est vaincu.';
    } else if (g.recruitChance > 0 && RECRUITS[u.species] && g.rng() < g.recruitChance) g.recruitQueue.push(u.species);
    if (g.focusId === u.id) g.focusId = -1;
    if (g.leaderTarget === u.id) g.leaderTarget = -1;
    return;
  }
  if (u.role === 'meneur') {
    if (g.relay && g.relay.onLeaderDown(g)) return;
    g.result = 'défaite';
    g.endReason = 'Le Meneur est tombé.';
    return;
  }
  // H : une créature posée qui tombe ne revient pas (il faut en reposer)
  u.reviveT = g.conquest ? Infinity : 12;
  if (g.version === 'B') u.inPlay = false;
}

export function shoot(g: Game, from: Unit, to: Vec, dmg: number, range: number, source: string, speed = 20, spread = 0) {
  const a = Math.atan2(to.y - from.y, to.x - from.x) + spread;
  g.projectiles.push({ x: from.x, y: from.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, left: range, dmg, team: from.team, source, by: from.species });
  emit(g, { type: 'shot', x: from.x, y: from.y, id: from.id });
}

export function telegraph(g: Game, t: Omit<Telegraph, 'id' | 't'>) {
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

// ---------------------------------------------------------------- ennemis
export function spawnEnemy(g: Game, role: EnemyRole, x: number, y: number, aggro: boolean, scale = 1): Unit {
  const stats =
    role === 'chargeur' ? { hp: 190, speed: 3.3, r: 0.6 } : role === 'soigneur' ? { hp: 130, speed: 3.0, r: 0.5 } : role === 'blinde' ? { hp: 220, speed: 2.6, r: 0.65 } : { hp: 3200, speed: 2.4, r: 1.3 };
  const name = role === 'chargeur' ? 'Chargeur' : role === 'soigneur' ? 'Soigneur' : role === 'blinde' ? 'Blindé' : 'Boss';
  const u = makeUnit(g, role, ENEMY_SPECIES[role], name, 'enemy', x, y, stats.hp * scale, stats.speed, stats.r);
  u.aggro = aggro;
  u.armor = role === 'blinde';
  u.skillCd = role === 'chargeur' ? 1.5 + g.rng() * 2 : role === 'boss' ? 2.5 : 0;
  u.healCd = 2 + g.rng();
  u.atkCd = g.rng();
  emit(g, { type: 'arrival', x, y, id: u.id, color: '#9B5CFF' });
  return u;
}

// ---------------------------------------------------------------- un pas de jeu
export function step(g: Game, input: Input, dt = 1 / 60): void {
  if (g.result || g.pendingRecruit) return;
  g.t += dt;
  for (const k of Object.keys(g.cds)) g.cds[k] -= dt;
  if (!g.recordEvents) g.events.length = 0;
  playerActions(g, input, dt);
  for (const u of g.units) {
    if (!u.alive) continue;
    u.invuln = Math.max(0, u.invuln - dt);
    u.guard = Math.max(0, u.guard - dt);
    u.stun = Math.max(0, u.stun - dt);
    u.taunt = Math.max(0, u.taunt - dt);
    u.wetT = Math.max(0, u.wetT - dt);
    u.atkCd -= dt;
  }
  g.comps.forEach((c, i) => updateComp(g, c, i, dt));
  for (const e of enemies(g)) updateEnemy(g, e, dt);
  updateProjectiles(g, dt);
  updateTelegraphs(g, dt);
  separate(g);
  for (const u of g.units) if (u.alive && !u.flight) g.level.collide(u);
  g.level.update(g, dt);
  if (g.version === 'B') g.elan = Math.min(ELAN.max, g.elan + ELAN.regenPerSec * dt);
  if (!g.result && g.t >= g.maxTime) {
    g.result = 'défaite';
    g.endReason = 'Temps écoulé.';
  }
  // recrutement : après le combat (plus aucun ennemi réveillé près du Meneur)
  if (g.recruitQueue.length && !enemies(g).some((e) => e.aggro && dist(e, g.leader) < 16)) {
    g.pendingRecruit = g.recruitQueue[0];
    g.recruitQueue = [];
  }
  g.units = g.units.filter((u) => u.alive || u.team === 'ally');
}

/** Réponse du joueur : `replace` = index du compagnon remplacé (A, ou B quand la réserve est pleine), −1 = refus. */
export function resolveRecruit(g: Game, replace: number) {
  const sp = g.pendingRecruit;
  g.pendingRecruit = null;
  if (!sp || replace < 0) return;
  const d = RECRUITS[sp];
  const L = g.leader;
  const nu = makeComp(g, d, L.x - 1, L.y - 1);
  nu.hp = d.hp * 0.6;
  if (replace >= g.comps.length) g.comps.push(nu);
  else {
    const old = g.comps[replace];
    old.alive = false;
    old.inPlay = false;
    old.reviveT = Infinity;
    g.units = g.units.filter((u) => u !== old);
    g.comps[replace] = nu;
  }
  g.recruits.push(d.name);
  emit(g, { type: 'arrival', x: nu.x, y: nu.y, id: nu.id, color: '#FFE27A' });
}
export const RESERVE_MAX = 4;

function leaderAttack(g: Game, L: Unit, target: Unit) {
  const d = g.leaderDef;
  faceTo(L, target);
  if (L.atkCd > 0) return;
  L.atkCd = d.rate;
  const dmg = d.dmg * g.baseMult.leader;
  if (d.ranged) shoot(g, L, target, dmg, d.range * rangeMult(g, L) + 2, `${d.name} — attaque`, 18);
  else {
    damage(g, target, dmg, `${d.name} — attaque`, L, d.species);
    emit(g, { type: 'melee', x: target.x, y: target.y, id: L.id, to: target.id });
  }
}

function playerActions(g: Game, input: Input, dt: number) {
  const L = g.leader;
  const D = g.leaderDef;
  const aim = input.aim;
  // ordres des schémas 1 et 2
  if (input.designate === -2) {
    g.leaderTarget = -1;
  } else if (input.designate >= 0 && enemies(g).some((e) => e.id === input.designate)) {
    if (g.leaderTarget !== input.designate) act(g, 'désigner');
    g.leaderTarget = input.designate;
  }
  if (input.moveTo) {
    if (!g.moveGoal || dist(g.moveGoal, input.moveTo) > 1.5) act(g, 'aller');
    g.moveGoal = { ...input.moveTo };
    if (input.designate < 0) g.leaderTarget = -1;
  }
  const target = enemies(g).find((e) => e.id === g.leaderTarget) ?? null;
  const range = D.range * (D.ranged ? rangeMult(g, L) : 1);
  // déplacement (ou esquive en cours)
  if (L.dash) {
    const sub = 3;
    for (let i = 0; i < sub; i++) {
      L.x += (L.dash.vx * dt) / sub;
      L.y += (L.dash.vy * dt) / sub;
      g.level.collide(L);
    }
    L.dash.t -= dt;
    if (L.dash.t <= 0) L.dash = null;
  } else if (g.mode === 'F' && Math.hypot(input.move.x, input.move.y) < 0.1 && (g.moveGoal || (target && g.leaderChase))) {
    // F : ordre donné en pause au Meneur (aller ici, attaquer celui-là) ; ZQSD reprend la main
    if (target && g.leaderChase && dist(L, target) > range + target.r) moveToward(g, L, target, dt);
    else if (!target && g.moveGoal && dist(L, g.moveGoal) > 0.3) moveToward(g, L, g.moveGoal, dt);
    else {
      L.moving = false;
      if (!target) g.moveGoal = null;
    }
  } else if (g.scheme === 2) {
    if (target && dist(L, target) > range + target.r) moveToward(g, L, target, dt);
    else if (!target && g.moveGoal && dist(L, g.moveGoal) > 0.3) moveToward(g, L, g.moveGoal, dt);
    else {
      L.moving = false;
      if (!target) g.moveGoal = null;
    }
  } else {
    moveUnit(L, input.move, L.speed, dt);
    if (g.scheme === 3 && (!L.moving || input.fire)) faceTo(L, aim);
  }
  if (L.moving) {
    const last = g.trail[g.trail.length - 1];
    if (!last || dist(last, L) > 0.35) {
      g.trail.push({ x: L.x, y: L.y });
      if (g.trail.length > 60) g.trail.shift();
    }
  }
  // attaque de base
  if (g.scheme === 3) {
    if (input.fire && !g.wasFiring) act(g, 'tir');
    g.wasFiring = input.fire;
    if (input.fire && L.atkCd <= 0) {
      shoot(g, L, aim, 10, 10 * rangeMult(g, L), `${D.name} — tir`);
      L.atkCd = CD.fire;
    }
  } else if (!L.dash) {
    let t = target && dist(L, target) <= range + target.r + 0.2 ? target : null;
    if (!t && g.scheme === 1) t = nearest(L, enemies(g).filter((e) => e.aggro && dist(L, e) <= range + e.r + 0.2));
    if (t) leaderAttack(g, L, t);
  }
  // H, la conquête : la base ne fait que tirer ; le joueur pose des créatures (cartes)
  if (g.conquest) {
    if (input.card) g.conquest.play(g, input.card.index, input.card.at);
    return;
  }
  // E, le relais : 1 à 4 font entrer une créature ; clic droit : le sort de celle qui est sur le terrain
  if (g.relay) {
    g.relay.update(g, dt);
    if (input.swapTo >= 0) g.relay.swap(g, input.swapTo);
    if (input.enter) g.relay.spell(g, aim);
  }
  // C, le chef d'orchestre : tout passe par les cartes (aucun sort ni esquive au clavier)
  if (g.cards) {
    g.cards.update(g, dt);
    if (input.card) g.cards.play(g, input.card.index, input.card.at, input.card.target);
    return;
  }
  // sorts du Meneur (vers le curseur)
  if (input.spell1 && ready(g, 'spell1')) {
    act(g, 'sort 1');
    if (D.ranged) for (let i = -2; i <= 2; i++) shoot(g, L, aim, 14, 10 * rangeMult(g, L), `${D.name} — ${D.spell1}`, 20, i * 0.16);
    else {
      // cône de flammes devant le Meneur
      const a0 = Math.atan2(aim.y - L.y, aim.x - L.x);
      L.face = a0;
      for (const e of enemies(g)) {
        const d = dist(e, L);
        let diff = Math.atan2(e.y - L.y, e.x - L.x) - a0;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        if (d <= 3.8 + e.r && Math.abs(diff) < 0.9) damage(g, e, 40, `${D.name} — ${D.spell1}`, L, D.species);
      }
    }
    g.cds.spell1 = CD.spell1;
    emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
  }
  if (input.spell2 && ready(g, 'spell2')) {
    act(g, 'sort 2');
    const p = clampLen(L, aim, 9);
    telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 2.6, r2: 0, angle: 0, len: 0, w: 0, dur: 0.5, dmg: 50, team: 'ally', source: `${D.name} — Brasier`, owner: L.id, from: { x: L.x, y: L.y } });
    g.cds.spell2 = CD.spell2;
    emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
  }
  if (input.dodge && ready(g, 'dodge') && !L.dash) {
    act(g, 'esquive');
    let d = g.scheme === 2 ? { x: aim.x - L.x, y: aim.y - L.y } : input.move;
    if (Math.hypot(d.x, d.y) < 0.1) d = { x: aim.x - L.x, y: aim.y - L.y };
    const l = Math.hypot(d.x, d.y) || 1;
    L.dash = { vx: (d.x / l) * 22, vy: (d.y / l) * 22, t: 0.2 };
    L.invuln = 0.35;
    g.cds.dodge = CD.dodge;
    if (g.scheme === 2) g.moveGoal = null;
    emit(g, { type: 'dodge', x: L.x, y: L.y, id: L.id });
  }
  if (g.relay) return;
  // G, les instincts : les compagnons suivent leurs règles ; le joueur n'a que 3 jetons d'ordre par étage
  if (g.mode === 'G') {
    if (input.focus) useToken(g, 'focus', aim);
    if (input.recall) useToken(g, 'repli', aim);
    if (input.ultimate) useToken(g, 'ultime', aim);
    g.focusT -= dt;
    if (g.focusT <= 0) g.focusId = -1;
    return;
  }
  // D, le héros et ses suiveurs : 3 et 4 sont deux compétences de plus du Meneur ; aucun ordre aux suiveurs
  if (g.mode === 'D') {
    if (input.comp1 && ready(g, 'spell3')) {
      act(g, 'sort 3');
      shoot(g, L, aim, 45, 14, `${D.name} — Trait`, 24);
      g.cds.spell3 = 4;
      emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
    }
    if (input.comp2 && ready(g, 'spell4')) {
      act(g, 'sort 4');
      telegraph(g, { kind: 'disc', x: L.x, y: L.y, r: 3.6, r2: 0, angle: 0, len: 0, w: 0, dur: 0.25, dmg: 40, team: 'ally', source: `${D.name} — Onde de feu`, owner: L.id });
      for (const e of enemies(g)) if (dist(e, L) < 3.6 + e.r) stunEnemy(g, e, 0.6);
      g.cds.spell4 = 12;
      emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF5A1F' });
    }
    return;
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
    const c0 = g.comps[0];
    if (input.comp1 && ready(g, 'comp1') && c0?.alive) {
      act(g, 'sort 3');
      if (c0.species === 'crabastion') {
        // Carapace : moitié des dégâts, provocation, et un choc qui étourdit au contact (interrompt le boss)
        c0.guard = 4;
        for (const e of enemies(g)) {
          if (dist(e, c0) < 7) {
            e.taunt = 4;
            e.tauntBy = c0.id;
          }
          if (dist(e, c0) < 3 + e.r) stunEnemy(g, e, 1.0);
        }
      } else for (const e of enemies(g)) if (dist(e, c0) < 3 + e.r) damage(g, e, 30, `${c0.name} — sort`, undefined, c0.species);
      g.cds.comp1 = CD.comp1;
      emit(g, { type: 'glow', x: c0.x, y: c0.y, id: c0.id, color: '#7FD7FF' });
    }
    const c1 = g.comps[1];
    if (input.comp2 && ready(g, 'comp2') && c1?.alive) {
      act(g, 'sort 4');
      for (const a of allyTargets(g)) if (dist(a, c1) < 6) heal(g, a, c1.species === 'amanitox' ? 70 : 40);
      g.cds.comp2 = CD.comp2;
      emit(g, { type: 'glow', x: c1.x, y: c1.y, id: c1.id, color: '#9CFF7A' });
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
    if (input.enter && ready(g, 'enter') && sel && sel.alive && !sel.inPlay && !sel.flight && inPlay.length < 2 && g.elan >= ELAN.cost) {
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
      const target2 = sel && sel.inPlay && sel.alive && !sel.flight ? sel : inPlay.filter((c) => !c.flight).sort((a, b) => b.enteredAt - a.enteredAt)[0];
      if (target2) {
        act(g, 'R rappel');
        target2.flight = { fx: target2.x, fy: target2.y, tx: L.x, ty: L.y, t: 0, dur: 0.4, back: true };
        g.elan = Math.min(ELAN.max, g.elan + ELAN.refund);
        g.cds.recall = CD.recallB;
        emit(g, { type: 'recall', x: target2.x, y: target2.y, id: target2.id });
      }
    }
  }
}

/** Une créature bondit d'elle-même jusqu'au point visé (aucun objet lancé) ; effet de zone à l'arrivée. */
export function startBond(g: Game, c: Unit, p: Vec, dur = 0.55) {
  c.holdT = 0;
  c.returnT = 0;
  c.flight = { fx: c.x, fy: c.y, tx: p.x, ty: p.y, t: 0, dur, back: false };
}

export function landArrival(g: Game, c: Unit) {
  const a = c.comp!.arrival;
  emit(g, { type: 'arrival', x: c.x, y: c.y, id: c.id, color: '#FFE27A' });
  for (const e of enemies(g))
    if (dist(e, c) <= a.radius + e.r) {
      // le bond arrive de partout à la fois : il passe le bouclier du Soigneur
      damage(g, e, a.dmg, `${c.name} — arrivée`, undefined, c.species);
      if (a.stun) stunEnemy(g, e, a.stun);
      if (!e.aggro) wakeGroup(g, e);
    }
  if (a.heal) for (const al of allyTargets(g)) if (dist(al, c) <= a.radius + 0.5) heal(g, al, a.heal);
}

/** Point de la traînée du Meneur à suivre (l'équipe marche en file dans les couloirs). */
function trailPoint(g: Game, rank: number): Vec {
  const back = (rank + 1) * 4;
  const i = g.trail.length - 1 - back;
  return i >= 0 ? g.trail[i] : (g.trail[0] ?? g.leader);
}

function updateComp(g: Game, c: Unit, rank: number, dt: number) {
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
        g.level.collide(c);
        landArrival(g, c);
      }
    }
    return;
  }
  if (c.stun > 0) return;
  if (g.conquest) {
    conquestAI(
      g,
      c,
      dt,
      (u, to, d, stop = 0) => moveToward(g, u, to, d, stop),
      (u, t) => {
        u.moving = false;
        faceTo(u, t);
        if (u.atkCd > 0) return;
        u.atkCd = u.comp!.rate;
        if (u.comp!.ranged) shoot(g, u, t, u.comp!.dmg, u.comp!.range + 2, u.name, 16);
        else damage(g, t, u.comp!.dmg, u.name, u, u.species);
      },
    );
    return;
  }
  const follow = () => {
    const p = trailPoint(g, rank);
    if (dist(c, L) > 2.4 && dist(c, p) > 0.4) moveToward(g, c, p, dt);
    else c.moving = false;
  };
  if (c.returnT > 0) {
    c.returnT -= dt;
    follow();
    return;
  }
  // tenir un point (regroupement, ordre donné en pause) : y aller, puis ne frapper que ce qui est à portée
  if (c.holdT > 0 && c.holdAt) {
    c.holdT -= dt;
    if (dist(c, c.holdAt) > 0.6) {
      moveToward(g, c, c.holdAt, dt);
      return;
    }
    c.moving = false;
    const near = nearest(c, enemies(g).filter((e) => e.aggro && dist(e, c) <= c.comp!.range + e.r + 0.2));
    if (near && c.atkCd <= 0) {
      c.atkCd = c.comp!.rate;
      faceTo(c, near);
      if (c.comp!.ranged) shoot(g, c, near, c.comp!.dmg * g.baseMult.comps, c.comp!.range + 2, c.name, 16);
      else damage(g, near, c.comp!.dmg * g.baseMult.comps, c.name, c, c.species);
    }
    return;
  }
  const d = c.comp!;
  // D : les suiveurs s'aident seuls (soin d'Amanitox, Carapace de Crabastion), sans ordre du joueur
  if (g.mode === 'D') {
    c.skillCd -= dt;
    if (c.skillCd <= 0) {
      const hurt = allyTargets(g).filter((a) => a.hp < a.maxHp * 0.5 && dist(a, c) < 7);
      const crowd = enemies(g).filter((e) => e.aggro && dist(e, L) < 5).length;
      if (c.species === 'amanitox' && hurt.length) {
        for (const a of allyTargets(g)) if (dist(a, c) < 7) heal(g, a, 50);
        c.skillCd = 12;
        emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#9CFF7A' });
      } else if (c.species === 'crabastion' && crowd >= 2) {
        c.guard = 3;
        for (const e of enemies(g)) {
          if (dist(e, c) < 6) {
            e.taunt = 3;
            e.tauntBy = c.id;
          }
          if (dist(e, c) < 3 + e.r) stunEnemy(g, e, 0.8);
        }
        c.skillCd = 14;
        emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#7FD7FF' });
      } else c.skillCd = 0.5;
    }
  }
  // G : la première règle vraie décide (une cible, ou un point où aller) ; un jeton focus passe devant
  let instinctT: Unit | null = null;
  if (g.mode === 'G' && g.focusId < 0) {
    const r = instinct(g, c, dt);
    if (r?.goTo) {
      if (dist(c, r.goTo) > 1.6) moveToward(g, c, r.goTo, dt);
      else c.moving = false;
      return;
    }
    instinctT = r?.target ?? null;
  }
  const leash = dist(c, L) > 14 && c.orderTarget < 0;
  let target: Unit | null = null;
  if (c.orderTarget >= 0) {
    target = enemies(g).find((e) => e.id === c.orderTarget) ?? null;
    if (!target) c.orderTarget = -1;
  }
  if (!target && g.version === 'A' && g.focusId >= 0) target = enemies(g).find((e) => e.id === g.focusId) ?? null;
  if (!target && instinctT) target = instinctT;
  if (!target && !leash) target = nearest(c, enemies(g).filter((e) => e.aggro && dist(e, c) < 9 && dist(e, L) < 12));
  if (!target) {
    follow();
    return;
  }
  const range = d.range * (d.ranged ? rangeMult(g, c) : 1) + target.r;
  if (dist(c, target) > range) moveToward(g, c, target, dt);
  else {
    c.moving = false;
    faceTo(c, target);
    if (c.atkCd <= 0) {
      c.atkCd = d.rate;
      const cd2 = d.dmg * g.baseMult.comps;
      if (d.ranged) shoot(g, c, target, cd2, range + 1.5, d.name, 16);
      else {
        damage(g, target, cd2, d.name, c, c.species);
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
    if (dist(e, target) < e.notice) wakeGroup(g, e);
    else {
      // errer autour de chez soi (ou dormir)
      if (!e.sleeping) {
        if (!e.wander || dist(e, e.wander) < 0.5) e.wander = { x: e.home.x + (g.rng() - 0.5) * 5, y: e.home.y + (g.rng() - 0.5) * 5 };
        moveUnit(e, { x: e.wander.x - e.x, y: e.wander.y - e.y }, e.speed * 0.35, dt);
      } else e.moving = false;
      return;
    }
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
    meleeChase(g, e, target, d, dt, 14, 1, 'Chargeur');
    return;
  }
  if (e.role === 'blinde') {
    meleeChase(g, e, target, d, dt, 20, 1.3, 'Blindé');
    return;
  }
  if (e.role === 'soigneur') {
    e.healCd -= dt;
    if (e.healCd <= 0) {
      const hurt = enemies(g)
        .filter((o) => o.hp < o.maxHp - 1 && dist(o, e) < 11)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        heal(g, hurt, g.level === SALLE ? 45 : 30);
        emit(g, { type: 'heal', x: e.x, y: e.y, id: e.id, to: hurt.id, color: '#9CFF7A' });
        e.healCd = 3.5;
      } else e.healCd = 0.5;
    }
    // reste en retrait, bouclier tourné vers l'ennemi le plus proche
    if (d < 8) {
      moveUnit(e, { x: e.x - target.x, y: e.y - target.y }, e.speed, dt);
    } else if (d > 11) moveToward(g, e, target, dt);
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
    if (e.windup <= 0) e.channel = false;
    return;
  }
  // H : le boss garde sa base (il ne descend pas les routes)
  if (g.conquest && dist(e, e.home) > 8 && dist(target, e.home) > 10) {
    moveToward(g, e, e.home, dt);
    return;
  }
  e.skillCd -= dt;
  if (e.skillCd <= 0) {
    const p2 = g.bossPhase === 2;
    const fournaise = g.level !== SALLE && e.pattern % 3 === 2;
    if (fournaise) {
      // Fournaise : canalisée 2,4 s puis trois vagues de feu sur toute la salle ; un étourdissement l'interrompt
      for (let k = 0; k < 3; k++)
        telegraph(g, { kind: 'disc', x: e.x, y: e.y, r: 14, r2: 0, angle: 0, len: 0, w: 0, dur: 2.4 + k * 0.5, dmg: 35, team: 'enemy', source: 'Boss — Fournaise', owner: e.id });
      e.windup = 3.4;
      e.channel = true;
      emit(g, { type: 'glow', x: e.x, y: e.y, id: e.id, color: '#FF5A1F' });
    } else if (e.pattern % 2 === 0) {
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
  meleeChase(g, e, target, d, dt, 22, 1.4, 'Boss', 2.2);
}

function meleeChase(g: Game, e: Unit, target: Unit, d: number, dt: number, dmg: number, rate: number, source: string, reach = 1.3) {
  if (d > reach + target.r) moveToward(g, e, target, dt);
  else {
    e.moving = false;
    faceTo(e, target);
    if (e.atkCd <= 0) {
      e.atkCd = rate;
      damage(g, target, dmg, source, e, e.species);
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
      damage(g, hit, p.dmg, p.source, { x: p.x - p.vx, y: p.y - p.vy }, p.by);
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
    for (const v of victims) if (insideTelegraph(t, v, v.r * 0.5)) damage(g, v, t.dmg, t.source, t.from, t.team === 'ally' ? g.leaderDef.species : undefined);
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
  recrues: string[];
  interruptions: number;
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
    phase_boss: g.units.some((u) => u.role === 'boss') || g.result === 'victoire' ? g.bossPhase : 0,
    recrues: [...g.recruits],
    interruptions: g.interrupts,
  };
}
