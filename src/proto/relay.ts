/**
 * PROTO-MODELES, modèle E « le relais » : une seule créature sur le terrain ; le joueur l'échange instantanément
 * avec une autre de l'équipe (touches 1 à 4 = les quatre places). Chaque créature a un effet d'entrée et un effet
 * de sortie (vague qui mouille, éclair plus fort sur les ennemis mouillés…). Un échange a un court temps de recharge.
 * Pur (aucun DOM).
 */
import { type Game, type LeaderDef, type Unit, type Vec, LEADERS, clampLen, damage, emit, enemies, heal, nearest, shoot, stunEnemy, telegraph } from './sim';

export interface RelayMember {
  def: LeaderDef;
  hp: number;
  alive: boolean;
  spell: string;
  enter: string;
  exit: string;
}
export const RELAY_TEAM: RelayMember[] = [
  { def: LEADERS.calcinarque, hp: 0, alive: true, spell: 'Brasier', enter: 'Flammes autour de lui', exit: 'Laisse des braises' },
  { def: { species: 'crabastion', name: 'Crabastion', hp: 380, speed: 4.8, ranged: false, range: 1.8, dmg: 20, rate: 0.7, spell1: 'Carapace' }, hp: 0, alive: true, spell: 'Carapace', enter: 'Pinces : étourdit', exit: 'Vague : mouille et repousse' },
  { def: { species: 'amanitox', name: 'Amanitox', hp: 260, speed: 5, ranged: true, range: 6.5, dmg: 10, rate: 0.8, spell1: 'Spores' }, hp: 0, alive: true, spell: 'Spores', enter: 'Racines : immobilise', exit: 'Soigne celui qui entre' },
  { def: { species: 'raicube', name: 'Raicube', hp: 240, speed: 5.6, ranged: true, range: 6, dmg: 12, rate: 0.5, spell1: 'Foudre' }, hp: 0, alive: true, spell: 'Foudre', enter: 'Éclair : triple sur les mouillés', exit: 'Décharge en chaîne' },
];
export const SWAP_CD = 2;
export const SPELL_CD: Record<string, number> = { 'calcinarque-legendaire': 8, crabastion: 10, amanitox: 12, raicube: 6 };

export class RelayState {
  team: RelayMember[];
  active = 0;
  swaps = 0;
  constructor() {
    this.team = RELAY_TEAM.map((m) => ({ ...m, hp: m.def.hp }));
  }
  /** Place la créature `i` sur le terrain (stats du Meneur) ; effets de sortie puis d'entrée. */
  swap(g: Game, i: number, forced = false): boolean {
    const L = g.leader;
    const next = this.team[i];
    if (i === this.active || !next?.alive) return false;
    if (!forced && (g.cds.swap ?? 0) > 0) return false;
    const prev = this.team[this.active];
    prev.hp = L.hp;
    if (!forced) exitEffect(g, prev, L);
    this.active = i;
    apply(g, next);
    if (!forced) {
      // Amanitox qui sort soigne celui qui entre
      if (prev.def.species === 'amanitox') heal(g, L, 50);
      g.actions++;
      g.actionsByKind['échange'] = (g.actionsByKind['échange'] ?? 0) + 1;
    }
    enterEffect(g, next, L);
    g.cds.swap = SWAP_CD;
    this.swaps++;
    emit(g, { type: 'arrival', x: L.x, y: L.y, id: L.id, color: '#FFE27A' });
    return true;
  }
  /** Le relais au repos : ceux qui attendent reprennent un peu de forces. */
  update(g: Game, dt: number) {
    this.team.forEach((m, k) => {
      if (k !== this.active && m.alive) m.hp = Math.min(m.def.hp, m.hp + m.def.hp * 0.02 * dt);
    });
  }
  /** La créature sur le terrain tombe : la suivante encore debout entre (défaite s'il n'y en a plus). */
  onLeaderDown(g: Game): boolean {
    this.team[this.active].alive = false;
    this.team[this.active].hp = 0;
    const k = this.team.findIndex((m) => m.alive);
    if (k < 0) return false;
    g.leader.alive = true;
    this.swap(g, k, true);
    g.leader.invuln = 1;
    return true;
  }
  spell(g: Game, at: Vec) {
    const L = g.leader;
    const sp = L.species;
    if ((g.cds.spell1 ?? 0) > 0) return;
    g.cds.spell1 = SPELL_CD[sp] ?? 8;
    g.actions++;
    g.actionsByKind['sort'] = (g.actionsByKind['sort'] ?? 0) + 1;
    if (sp === 'crabastion') {
      L.guard = 3;
      for (const e of enemies(g)) if (Math.hypot(e.x - L.x, e.y - L.y) < 2.8 + e.r) stunEnemy(g, e, 1);
    } else if (sp === 'amanitox') {
      heal(g, L, 70);
      for (const e of enemies(g)) if (Math.hypot(e.x - L.x, e.y - L.y) < 3 + e.r) damage(g, e, 25, 'Amanitox — Spores', undefined, sp);
    } else if (sp === 'raicube') {
      const t = nearest(at, enemies(g).filter((e) => Math.hypot(e.x - at.x, e.y - at.y) < 4)) ?? nearest(L, enemies(g));
      if (t) damage(g, t, t.wetT > 0 ? 80 : 40, 'Raicube — Foudre', undefined, sp);
      if (t) emit(g, { type: 'impact', x: t.x, y: t.y, id: t.id, color: '#FFE84A' });
    } else {
      const p = clampLen(L, at, 9);
      telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 2.6, r2: 0, angle: 0, len: 0, w: 0, dur: 0.5, dmg: 55, team: 'ally', source: 'Calcinarque — Brasier', owner: L.id, from: { x: L.x, y: L.y } });
    }
    emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FFE27A' });
  }
}

function apply(g: Game, m: RelayMember) {
  const L = g.leader;
  g.leaderDef = m.def;
  L.species = m.def.species;
  L.name = m.def.name;
  L.maxHp = m.def.hp;
  L.hp = Math.max(1, m.hp);
  L.speed = m.def.speed;
  L.atkCd = 0.2;
}

function around(g: Game, at: Unit, r: number) {
  return enemies(g).filter((e) => Math.hypot(e.x - at.x, e.y - at.y) < r + e.r);
}

function enterEffect(g: Game, m: RelayMember, L: Unit) {
  const sp = m.def.species;
  if (sp === 'crabastion') for (const e of around(g, L, 2.6)) {
    damage(g, e, 15, 'Crabastion — entrée', undefined, sp);
    stunEnemy(g, e, 1.2);
  }
  else if (sp === 'amanitox') for (const e of around(g, L, 3)) stunEnemy(g, e, 0.8);
  else if (sp === 'raicube') for (const e of around(g, L, 4.5)) {
    damage(g, e, e.wetT > 0 ? 60 : 20, 'Raicube — entrée', undefined, sp);
    emit(g, { type: 'impact', x: e.x, y: e.y, id: e.id, color: '#FFE84A' });
  }
  else for (const e of around(g, L, 2.6)) damage(g, e, 30, 'Calcinarque — entrée', undefined, sp);
}

function exitEffect(g: Game, m: RelayMember, L: Unit) {
  const sp = m.def.species;
  if (sp === 'crabastion') {
    // vague : mouille et repousse
    for (const e of around(g, L, 3.6)) {
      e.wetT = 6;
      const d = Math.hypot(e.x - L.x, e.y - L.y) || 1;
      e.x += ((e.x - L.x) / d) * 2;
      e.y += ((e.y - L.y) / d) * 2;
      damage(g, e, 10, 'Crabastion — sortie', undefined, sp);
    }
    emit(g, { type: 'impact', x: L.x, y: L.y, id: L.id, color: '#4FA3C8' });
  } else if (sp === 'raicube') {
    const list = enemies(g)
      .filter((e) => Math.hypot(e.x - L.x, e.y - L.y) < 7)
      .sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))
      .slice(0, 3);
    for (const e of list) damage(g, e, e.wetT > 0 ? 30 : 15, 'Raicube — sortie', undefined, sp);
  } else if (sp === 'calcinarque-legendaire') {
    telegraph(g, { kind: 'disc', x: L.x, y: L.y, r: 2.5, r2: 0, angle: 0, len: 0, w: 0, dur: 0.8, dmg: 35, team: 'ally', source: 'Calcinarque — sortie', owner: L.id });
  }
  // Amanitox : son effet de sortie (soin de celui qui entre) est appliqué dans swap()
  void shoot;
}
