/**
 * PROTO-MODELES, modèle H « la conquête » (déploiement pur) : le joueur ne dirige aucune créature.
 * Une carte à part : 3 routes entre ta base (sud) et celle du boss (nord), un avant-poste au milieu de chaque route.
 * Une main de 4 cartes-créatures tirées d'un deck de 6, une jauge d'Élan qui monte avec le temps ; clic dans une
 * zone autorisée : la créature bondit d'elle-même depuis la base jusqu'au point, puis avance et combat seule.
 * Prendre un avant-poste agrandit la zone de pose et accélère l'Élan. On gagne en abattant le boss.
 * Pur (aucun DOM) ; la carte réutilise le terrain du donjon (collisions, chemins, décor).
 */
import { COMPS, RECRUITS, type CompDef, type Game, type Unit, type Vec, allyTargets, emit, enemies, heal, makeComp, nearest, spawnEnemy, startBond } from './sim';
import { T_FLOOR, T_WALL, type Floor, type Room } from './donjon/gen';
import { DonjonLevel, type DonjonOptions } from './donjon/level';

const W = 44;
const H = 74;
export const BASE: Vec = { x: 22, y: 5 };
export const BOSS_AT: Vec = { x: 22, y: 67 };
export const OUTPOSTS: Vec[] = [
  { x: 7.5, y: 36 },
  { x: 22, y: 36 },
  { x: 36.5, y: 36 },
];
/** Couloirs des trois routes (x de début et de fin), séparés par des murs entre y = 14 et y = 58. */
const LANES: [number, number][] = [
  [1, 13],
  [17, 27],
  [31, 42],
];

function buildFloor(): Floor {
  const tiles = new Uint8Array(W * H);
  const roomOf = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      const separator = y >= 14 && y <= 58 && ((x >= 14 && x <= 16) || (x >= 28 && x <= 30));
      tiles[y * W + x] = border || separator ? T_WALL : T_FLOOR;
    }
  const room = (id: number, rect: [number, number, number, number], kind: Room['kind']): Room => ({
    id,
    kind,
    rect,
    center: { x: (rect[0] + rect[2]) / 2, y: (rect[1] + rect[3]) / 2 },
    depth: 0,
    enemySpots: [],
    nestSpots: [],
    itemSpots: [],
    treasure: null,
    stairs: null,
    boss: null,
    start: null,
  });
  const rooms = [room(0, [0, 0, W, 14], 'depart'), ...LANES.map(([a, b], k) => room(k + 1, [a - 1, 14, b + 2, 59], 'grande')), room(4, [0, 59, W, H], 'boss')];
  rooms[0].start = { ...BASE };
  rooms[4].boss = { ...BOSS_AT };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tiles[y * W + x] !== T_FLOOR) continue;
      roomOf[y * W + x] = y < 14 ? 0 : y > 58 ? 4 : x < 14 ? 1 : x < 28 ? 2 : 3;
    }
  return { w: W, h: H, tiles, roomOf, rooms, start: { ...BASE }, stairs: null, boss: { ...BOSS_AT }, floorIndex: 1, biome: 'foret' };
}

export interface CreatureCard {
  def: CompDef;
  cost: number;
  role: 'tank' | 'soin' | 'frappe' | 'tir';
}
/** Le deck de 6 (fonction : sim.ts et ce fichier s'importent l'un l'autre, rien ne doit être lu au chargement). */
export function conquestDeck(): CreatureCard[] {
  return [
    { def: COMPS[0], cost: 4, role: 'tank' },
    { def: COMPS[1], cost: 3, role: 'soin' },
    { def: COMPS[2], cost: 3, role: 'frappe' },
    { def: COMPS[3], cost: 3, role: 'tir' },
    { def: RECRUITS.chevrok, cost: 2, role: 'frappe' },
    { def: RECRUITS.cailloc, cost: 3, role: 'tank' },
  ];
}
export const ELAN_H = { max: 10, start: 6, base: 0.38, perOutpost: 0.12 };
export const WAVE_EVERY = 22;

export class ConquestState {
  deck: CreatureCard[];
  hand: (CreatureCard | null)[] = [null, null, null, null];
  elan = ELAN_H.start;
  owner: ('ally' | 'enemy' | null)[] = [null, null, null];
  capture: number[] = [0, 0, 0];
  waveT = 6;
  waves = 0;
  deployed = 0;
  constructor(rng: () => number) {
    this.deck = conquestDeck();
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    for (let i = 0; i < 4; i++) this.hand[i] = this.deck.shift() ?? null;
  }
  outposts() {
    return this.owner.filter((o) => o === 'ally').length;
  }
  /** Zone où l'on peut poser : la base, et un cercle autour de chaque avant-poste pris. */
  allowed(p: Vec): boolean {
    if (p.y <= 14 && p.y >= 1 && p.x > 1 && p.x < W - 1) return true;
    return OUTPOSTS.some((o, k) => this.owner[k] === 'ally' && Math.hypot(p.x - o.x, p.y - o.y) <= 7);
  }
  play(g: Game, i: number, at: Vec): boolean {
    const c = this.hand[i];
    // au plus 12 créatures sur le terrain (lisibilité, et coût des chemins)
    if (g.comps.filter((u) => u.alive && u.inPlay).length >= 12) return false;
    if (!c || this.elan < c.cost || !this.allowed(at) || (g.level as DonjonLevel).solidAt(at.x, at.y)) return false;
    this.elan -= c.cost;
    const u = makeComp(g, c.def, BASE.x, BASE.y + 1);
    u.inPlay = true;
    g.comps.push(u);
    startBond(g, u, at, 0.5 + Math.hypot(at.x - BASE.x, at.y - BASE.y) * 0.03);
    this.deck.push(c);
    this.hand[i] = this.deck.shift() ?? null;
    this.deployed++;
    g.actions++;
    g.actionsByKind[`pose ${c.def.name}`] = (g.actionsByKind[`pose ${c.def.name}`] ?? 0) + 1;
    return true;
  }
  update(g: Game, dt: number) {
    this.elan = Math.min(ELAN_H.max, this.elan + (ELAN_H.base + ELAN_H.perOutpost * this.outposts()) * dt);
    // avant-postes : 3 s sans adversaire à moins de 5 m, avec au moins un des siens à moins de 3 m
    OUTPOSTS.forEach((o, k) => {
      const allies = allyTargets(g).filter((u) => u.role === 'compagnon' && Math.hypot(u.x - o.x, u.y - o.y) < 3).length;
      const foes = enemies(g).filter((e) => Math.hypot(e.x - o.x, e.y - o.y) < 5).length;
      const side = allies && !foes ? 'ally' : foes && !allies ? 'enemy' : null;
      if (side && this.owner[k] !== side) {
        this.capture[k] += dt;
        if (this.capture[k] >= 3) {
          this.owner[k] = side;
          this.capture[k] = 0;
          emit(g, { type: 'phase', x: o.x, y: o.y, color: side === 'ally' ? '#3BD16F' : '#9B5CFF' });
        }
      } else this.capture[k] = 0;
    });
    // vagues ennemies : une par route, toutes les 18 s, de plus en plus fournies
    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.waveT = WAVE_EVERY;
      this.waves++;
      const n = 2 + Math.min(2, Math.floor(this.waves / 3));
      OUTPOSTS.forEach((o, k) => {
        for (let j = 0; j < n; j++) {
          const e = spawnEnemy(g, j === 2 && this.waves % 2 === 0 ? 'soigneur' : j === 3 ? 'blinde' : 'chargeur', o.x + (j - 1) * 1.2, 60 + (j % 2), true, 0.45 + this.waves * 0.03);
          e.notice = 99;
          e.group = 7000 + this.waves * 10 + k;
        }
      });
    }
  }
}

/** IA d'une créature posée : elle avance vers le boss par sa route et se bat selon son rôle. */
export function conquestAI(g: Game, c: Unit, dt: number, moveToward: (u: Unit, to: Vec, dt: number, stopAt?: number) => void, attack: (u: Unit, t: Unit) => void) {
  const role = conquestDeck().find((d) => d.def.species === c.species)?.role ?? 'frappe';
  c.skillCd -= dt;
  if (role === 'soin' && c.skillCd <= 0) {
    const hurt = allyTargets(g).filter((a) => a.role === 'compagnon' && a.hp < a.maxHp * 0.7 && Math.hypot(a.x - c.x, a.y - c.y) < 6);
    if (hurt.length) {
      for (const a of hurt) heal(g, a, 40);
      c.skillCd = 7;
      emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#9CFF7A' });
    }
  }
  const foe = nearest(c, enemies(g).filter((e) => Math.hypot(e.x - c.x, e.y - c.y) < (role === 'soin' ? 6 : 8)));
  if (foe) {
    const range = c.comp!.range + foe.r;
    if (Math.hypot(foe.x - c.x, foe.y - c.y) > range) moveToward(c, foe, dt);
    else attack(c, foe);
    return;
  }
  // pas d'ennemi : avancer vers le boss (le soigneur reste un peu derrière le plus proche des siens)
  if (role === 'soin') {
    const front = nearest(c, g.comps.filter((u) => u !== c && u.alive && u.inPlay && !u.flight));
    if (front && Math.hypot(front.x - c.x, front.y - c.y) > 3) {
      moveToward(c, front, dt, 2.5);
      return;
    }
  }
  // d'abord tenir l'avant-poste de sa route ; on ne pousse vers le boss qu'à trois
  const k = OUTPOSTS.map((o, i) => [Math.abs(o.x - c.x), i]).sort((a, b) => a[0] - b[0])[0][1];
  const o = OUTPOSTS[k];
  const st = g.conquest!;
  const group = g.comps.filter((u) => u.alive && u.inPlay && !u.flight && Math.hypot(u.x - o.x, u.y - o.y) < 6).length;
  if (c.y < 58 && (st.owner[k] !== 'ally' || group < 3)) moveToward(c, o, dt, 1.5);
  else moveToward(c, BOSS_AT, dt, 2);
}

export class ConquestLevel extends DonjonLevel {
  constructor(opts: DonjonOptions) {
    super(opts, 1, buildFloor());
    this.seen.fill(1); // pas de brouillard : toute la carte est connue
    this.seenVersion++;
  }
  override populate(g: Game) {
    const L = g.leader;
    // le « Meneur » est la base : immobile, solide, elle tire sur ce qui l'approche
    Object.assign(L, { x: BASE.x, y: BASE.y, speed: 0, maxHp: 2000, hp: 2000, r: 1.2, species: 'base', name: 'Base' });
    g.baseMult.leader = 1.6;
    g.trail = [{ ...BASE }];
    const b = spawnEnemy(g, 'boss', BOSS_AT.x, BOSS_AT.y, true, 0.8);
    b.notice = 10;
    b.home = { ...BOSS_AT };
    g.events.length = 0;
  }
  override update(g: Game, dt: number) {
    g.conquest!.update(g, dt);
  }
}

export function enterConquest(g: Game, opts: DonjonOptions): ConquestLevel {
  const lvl = new ConquestLevel(opts);
  g.level = lvl;
  g.wave = 1;
  lvl.populate(g);
  return lvl;
}
