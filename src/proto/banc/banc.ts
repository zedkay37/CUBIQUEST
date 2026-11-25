/**
 * Banc d'essai n° 1, le geste de combat (docs/plan/BANC_CONTROLE.md). Une seule chose change d'une variante à
 * l'autre : le contrôle. Équipe (Magmadrake, Crabastion, Raicube), statistiques, compétences, IA des créatures
 * non contrôlées, boss, arène et caméra sont identiques.
 * - 0 : aucun contrôle (placement et priorités avant le combat, tout est automatique, compétences comprises) ;
 * - A : l'équipe se déplace en groupe (ZQSD), attaques automatiques, le joueur déclenche les 3 compétences ;
 * - B : le joueur dirige une créature (choisie avant l'essai), et peut déclencher les compétences des autres ;
 * - C : comme B, plus le changement de créature contrôlée à tout moment (Tab ou clic sur le portrait).
 * Pur (aucun DOM) : se branche sur la simulation des maquettes par `g.banc` (aucun import de sim.ts au chargement).
 */
import { type CompDef, type Game, type Input, type Unit, type Vec, emit, enemies, emptyInput, insideTelegraph, makeComp, nearest, shoot, spawnEnemy, telegraph, damage, newGame } from '../sim';
import { T_FLOOR, T_PILLAR, T_WALL, type Floor, type Room } from '../donjon/gen';
import { DonjonLevel } from '../donjon/level';

export type Variante = '0' | 'A' | 'B' | 'C';
export type Priorite = 'proche' | 'invocations' | 'boss' | 'faible';
export type Ligne = 'avant' | 'arriere';
export const SPECIES = ['magmadrake', 'crabastion', 'raicube'] as const;
export type Sp = (typeof SPECIES)[number];
export const NAMES: Record<Sp, string> = { magmadrake: 'Magmadrake', crabastion: 'Crabastion', raicube: 'Raicube' };
export const ROLE: Record<Sp, string> = { magmadrake: 'destructeur', crabastion: 'protecteur', raicube: 'contrôleur' };
export const SKILL: Record<Sp, { name: string; cd: number; key: string; text: string }> = {
  magmadrake: { name: 'Éruption', cd: 9, key: '1', text: 'zone de feu au point visé' },
  crabastion: { name: 'Choc', cd: 10, key: '2', text: 'étourdit autour de lui ; interrompt la grosse attaque du boss' },
  raicube: { name: 'Filet d’éclairs', cd: 8, key: '3', text: 'immobilise les invocations au point visé' },
};

/** Les trois créatures : mêmes statistiques dans toutes les variantes (aucun bonus pour celle qu'on contrôle). */
export function defs(): Record<Sp, CompDef> {
  const z = { radius: 0, dmg: 0, stun: 0, heal: 0 };
  return {
    magmadrake: { species: 'magmadrake', name: 'Magmadrake', hp: 380, speed: 4.4, range: 2.2, dmg: 13, rate: 1.0, ranged: false, spell: 'Éruption', arrival: z },
    crabastion: { species: 'crabastion', name: 'Crabastion', hp: 520, speed: 4.4, range: 1.8, dmg: 13, rate: 1.0, ranged: false, spell: 'Choc', arrival: z },
    raicube: { species: 'raicube', name: 'Raicube', hp: 290, speed: 5, range: 7, dmg: 14, rate: 0.8, ranged: true, spell: 'Filet', arrival: z },
  };
}

export interface BancConfig {
  variante: Variante;
  /** B et C : la créature contrôlée au départ. */
  controlled: Sp;
  ligne: Record<Sp, Ligne>;
  priorite: Record<Sp, Priorite>;
}
export const DEFAULT_CONFIG: BancConfig = {
  variante: 'A',
  controlled: 'magmadrake',
  ligne: { magmadrake: 'avant', crabastion: 'avant', raicube: 'arriere' },
  priorite: { magmadrake: 'proche', crabastion: 'boss', raicube: 'invocations' },
};

export const BOSS = { hp: 2200, summonEvery: 11, bigEvery: 15, bigFirst: 9, bigCast: 2.5, bigDmg: 130, vuln: 6, vulnMult: 1.6, zoneEvery: 6, zoneDmg: 55 };
const W = 30;
const H = 26;
export const BOSS_HOME: Vec = { x: 15, y: 19 };
export const ARENA_CENTER: Vec = { x: 15, y: 12 };

function buildArena(): Floor {
  const tiles = new Uint8Array(W * H);
  const roomOf = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const wall = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      const pillar = [[6, 8], [23, 8], [6, 17], [23, 17]].some(([px, py]) => x >= px && x <= px + 1 && y >= py && y <= py + 1);
      tiles[y * W + x] = wall ? T_WALL : pillar ? T_PILLAR : T_FLOOR;
      if (!wall && !pillar) roomOf[y * W + x] = 0;
    }
  const room: Room = { id: 0, kind: 'boss', rect: [0, 0, W, H], center: { ...ARENA_CENTER }, depth: 0, enemySpots: [], nestSpots: [], itemSpots: [], treasure: null, stairs: null, boss: { ...BOSS_HOME }, start: { x: 15, y: 5 } };
  return { w: W, h: H, tiles, roomOf, rooms: [room], start: { x: 15, y: 5 }, stairs: null, boss: { ...BOSS_HOME }, floorIndex: 3, biome: 'foret' };
}

/** L'arène : une seule salle, sans brouillard. */
export class BancLevel extends DonjonLevel {
  constructor(seed: number) {
    super({ seed, density: 1, wake: false, floors: 1 }, 1, buildArena());
    this.seen.fill(1);
    this.seenVersion++;
  }
  override populate() {}
  override update(g: Game, dt: number) {
    g.banc!.tick(g, dt);
  }
}

export interface BancMetrics {
  dealt: Record<string, number>;
  taken: Record<string, number>;
  interruptsOk: number;
  bigLanded: number;
  bigCast: number;
  zonesTargeted: number;
  zonesHit: number;
  summoned: number;
  summonsAlive: number;
  skills: Record<string, number>;
  switches: number;
}

export class BancState {
  cfg: BancConfig;
  cds: Record<string, number> = {};
  anchor: Vec = { x: 15, y: 8 };
  summonT = 6;
  bigT = BOSS.bigFirst;
  zoneT = 4;
  m: BancMetrics = { dealt: {}, taken: {}, interruptsOk: 0, bigLanded: 0, bigCast: 0, zonesTargeted: 0, zonesHit: 0, summoned: 0, summonsAlive: 0, skills: {}, switches: 0 };
  constructor(cfg: BancConfig) {
    this.cfg = cfg;
  }

  /** Les 3 créatures (le Meneur de la simulation est celle qu'on contrôle, ou le point de départ du groupe). */
  team(g: Game): Unit[] {
    return [g.leader, ...g.comps];
  }
  ready(sp: string) {
    return (this.cds[sp] ?? 0) <= 0;
  }

  // ------------------------------------------------------------ le boss et ses invocations
  tick(g: Game, dt: number) {
    for (const k of Object.keys(this.cds)) this.cds[k] -= dt;
    const boss = enemies(g).find((e) => e.role === 'boss');
    this.m.summonsAlive = enemies(g).filter((e) => e.role !== 'boss').length;
    if (!boss) return;
    if (!boss.aggro) {
      boss.aggro = true;
      boss.notice = 99;
    }
    boss.healCd = Math.max(0, boss.healCd - dt); // sert de minuteur à la fenêtre de vulnérabilité
    // 1. invocations : trois petites créatures de basalte, à intervalle régulier
    this.summonT -= dt;
    if (this.summonT <= 0) {
      this.summonT = BOSS.summonEvery;
      for (let k = 0; k < 3; k++) {
        const e = spawnEnemy(g, 'chargeur', boss.x + (k - 1) * 2.2, boss.y - 1.5, true, 0.35);
        e.species = 'cailloc';
        e.name = 'Invocation';
        e.skillCd = 1e9; // pas de charge : elles débordent, simplement
        e.notice = 99;
        this.m.summoned++;
      }
    }
    // 3. zone au sol annoncée, sous chaque créature
    if (!boss.channel) {
      this.zoneT -= dt;
      if (this.zoneT <= 0) {
        this.zoneT = BOSS.zoneEvery;
        for (const u of this.team(g).filter((x) => x.alive && x.inPlay)) {
          telegraph(g, { kind: 'disc', x: u.x, y: u.y, r: 2.4, r2: 0, angle: 0, len: 0, w: 0, dur: 1.5, dmg: BOSS.zoneDmg, team: 'enemy', source: 'Gardien — Faille', owner: boss.id });
          this.m.zonesTargeted++;
        }
      }
    }
    // 2. grosse attaque interruptible : toute l'arène
    this.bigT -= dt;
    if (this.bigT <= 0 && !boss.channel && boss.stun <= 0) {
      this.bigT = BOSS.bigEvery;
      boss.channel = true;
      boss.windup = BOSS.bigCast;
      this.m.bigCast++;
      telegraph(g, { kind: 'disc', x: boss.x, y: boss.y, r: 16, r2: 0, angle: 0, len: 0, w: 0, dur: BOSS.bigCast, dmg: BOSS.bigDmg, team: 'enemy', source: 'Gardien — Effondrement', owner: boss.id });
      emit(g, { type: 'glow', x: boss.x, y: boss.y, id: boss.id, color: '#FF5A1F' });
    }
  }

  /** Comportement du boss (remplace celui des maquettes) : il canalise, frappe au contact, garde le centre. */
  enemy(g: Game, e: Unit, dt: number): boolean {
    if (e.role !== 'boss') {
      // invocations : elles vont sur la créature la plus fragile (elles débordent l'arrière)
      const t = [...this.team(g)].filter((u) => u.alive && u.inPlay).sort((a, b) => a.hp - b.hp)[0];
      if (t && e.taunt <= 0 && e.stun <= 0) {
        e.taunt = 0.1;
        e.tauntBy = t.id;
      }
      return false;
    }
    if (e.stun > 0) {
      e.moving = false;
      return true;
    }
    if (e.channel) {
      e.windup -= dt;
      e.moving = false;
      if (e.windup <= 0) {
        e.channel = false;
        this.m.bigLanded++;
      }
      return true;
    }
    return false; // poursuite et coups au contact : comportement commun
  }

  /** Crabastion seul peut interrompre : étourdi 2 s, puis 6 s de vulnérabilité. */
  interrupt(g: Game, boss: Unit) {
    if (!boss.channel) return false;
    boss.channel = false;
    boss.windup = 0;
    g.telegraphs = g.telegraphs.filter((t) => !(t.owner === boss.id && t.source === 'Gardien — Effondrement'));
    boss.stun = 2;
    boss.healCd = BOSS.vuln;
    this.m.interruptsOk++;
    g.interrupts++;
    emit(g, { type: 'interrupt', x: boss.x, y: boss.y, id: boss.id, color: '#7FD7FF' });
    return true;
  }

  /** Multiplicateur et comptes de dégâts (appelé par la simulation à chaque coup). */
  onDamage(g: Game, target: Unit, amount: number, source: string): number {
    let dmg = amount;
    if (target.role === 'boss' && target.healCd > 0) dmg *= BOSS.vulnMult;
    if (target.team === 'enemy') {
      const who = source.split(' — ')[0];
      this.m.dealt[who] = (this.m.dealt[who] ?? 0) + dmg;
    } else {
      this.m.taken[target.name] = (this.m.taken[target.name] ?? 0) + dmg;
      if (source === 'Gardien — Faille') this.m.zonesHit++;
    }
    return dmg;
  }

  // ------------------------------------------------------------ l'IA commune (toutes les variantes)
  anchorFor(g: Game): Vec {
    if (this.cfg.variante === 'A') return this.anchor;
    if (this.cfg.variante === '0') return { x: 15, y: 9 };
    return g.leader;
  }
  targetFor(g: Game, u: Unit): Unit | null {
    const foes = enemies(g);
    if (g.focusId >= 0) {
      const f = foes.find((e) => e.id === g.focusId);
      if (f) return f;
    }
    const pr = this.cfg.priorite[u.species as Sp] ?? 'proche';
    const adds = foes.filter((e) => e.role !== 'boss');
    const boss = foes.find((e) => e.role === 'boss') ?? null;
    if (pr === 'invocations' && adds.length) return nearest(u, adds);
    if (pr === 'boss' && boss) return boss;
    if (pr === 'faible' && foes.length) return [...foes].sort((a, b) => a.hp - b.hp)[0];
    return nearest(u, foes);
  }
  /** Où se tenir quand rien n'est à portée : sa ligne (avant : vers le boss ; arrière : en retrait). */
  slot(g: Game, u: Unit, at?: Vec): Vec {
    const a = at ?? this.anchorFor(g);
    const i = SPECIES.indexOf(u.species as Sp);
    const front = this.cfg.ligne[u.species as Sp] === 'avant';
    return { x: a.x + (i - 1) * 2, y: a.y + (front ? 2.2 : -2) };
  }
  /** Décision d'une créature : sortir d'une zone, aller vers sa cible ou sa place, frapper. Renvoie l'entrée voulue. */
  decide(g: Game, u: Unit): { move: Vec; target: Unit | null } {
    const zone = g.telegraphs.find((t) => t.team === 'enemy' && t.source !== 'Gardien — Effondrement' && insideTelegraph(t, u, 0.6));
    if (zone) return { move: { x: u.x - zone.x || 0.1, y: u.y - zone.y }, target: null };
    const t = this.targetFor(g, u);
    const def = u.comp!;
    if (t && Math.hypot(t.x - this.anchorFor(g).x, t.y - this.anchorFor(g).y) < 16) {
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      const reach = def.range + t.r;
      if (d > reach) return { move: { x: t.x - u.x, y: t.y - u.y }, target: t };
      if (def.ranged && d < reach - 2.5) return { move: { x: u.x - t.x, y: u.y - t.y }, target: t };
      return { move: { x: 0, y: 0 }, target: t };
    }
    const s = this.slot(g, u);
    return { move: Math.hypot(s.x - u.x, s.y - u.y) > 0.6 ? { x: s.x - u.x, y: s.y - u.y } : { x: 0, y: 0 }, target: null };
  }
  /** Attaque de base, la même pour toutes (le coup de Magmadrake éclabousse autour de la cible). */
  attack(g: Game, u: Unit, t: Unit) {
    if (u.atkCd > 0) return;
    const def = u.comp!;
    if (Math.hypot(t.x - u.x, t.y - u.y) > def.range + t.r + 0.3) return;
    u.atkCd = def.rate;
    u.face = Math.atan2(t.y - u.y, t.x - u.x);
    if (def.ranged) shoot(g, u, t, def.dmg, def.range + 2, u.name, 18);
    else {
      damage(g, t, def.dmg, u.name, u, u.species);
      emit(g, { type: 'melee', x: t.x, y: t.y, id: u.id, to: t.id });
      if (u.species === 'magmadrake') for (const e of enemies(g)) if (e !== t && Math.hypot(e.x - t.x, e.y - t.y) < 1.8) damage(g, e, def.dmg * 0.5, u.name, u, u.species);
    }
  }
  /** Compétence d'une créature (même effet quelle que soit la variante). `at` : point visé par le joueur. */
  skill(g: Game, u: Unit, at?: Vec): boolean {
    const sp = u.species as Sp;
    if (!u.alive || !this.ready(sp)) return false;
    const t = this.targetFor(g, u);
    const p = at ?? (t ? { x: t.x, y: t.y } : null);
    if (sp === 'magmadrake') {
      if (!p) return false;
      telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 3, r2: 0, angle: 0, len: 0, w: 0, dur: 0.35, dmg: 70, team: 'ally', source: 'Magmadrake — Éruption', owner: u.id });
    } else if (sp === 'crabastion') {
      u.guard = 3;
      for (const e of enemies(g)) {
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < 7) {
          e.taunt = 4;
          e.tauntBy = u.id;
        }
        if (d < 4 + e.r) {
          if (e.role === 'boss') this.interrupt(g, e);
          else e.stun = Math.max(e.stun, 1.5);
        }
      }
    } else {
      if (!p) return false;
      for (const e of enemies(g))
        if (Math.hypot(e.x - p.x, e.y - p.y) < 2.6 + e.r) {
          damage(g, e, 25, 'Raicube — Filet', undefined, sp);
          if (e.role !== 'boss') e.stun = Math.max(e.stun, 2);
        }
      emit(g, { type: 'impact', x: p.x, y: p.y, id: -1, color: '#FFE84A', by: 'Raicube — Foudre', a: 2.6 });
    }
    this.cds[sp] = SKILL[sp].cd;
    this.m.skills[SKILL[sp].name] = (this.m.skills[SKILL[sp].name] ?? 0) + 1;
    emit(g, { type: 'glow', x: u.x, y: u.y, id: u.id, color: '#FFE27A' });
    return true;
  }
  /** Variante 0 : quand l'IA déclenche-t-elle une compétence ? (règles simples, les mêmes pour tous) */
  autoSkill(g: Game, u: Unit) {
    const sp = u.species as Sp;
    if (!this.ready(sp)) return;
    const foes = enemies(g);
    const boss = foes.find((e) => e.role === 'boss');
    if (sp === 'crabastion') {
      if (boss?.channel && Math.hypot(boss.x - u.x, boss.y - u.y) < 4 + boss.r) this.skill(g, u);
      // le Choc est gardé pour l'Effondrement s'il revient avant la fin de la recharge
      else if (this.bigT > SKILL.crabastion.cd + 1 && foes.filter((e) => e.role !== 'boss' && Math.hypot(e.x - u.x, e.y - u.y) < 4).length >= 2) this.skill(g, u);
      return;
    }
    const t = this.targetFor(g, u);
    if (!t) return;
    const cluster = foes.filter((e) => Math.hypot(e.x - t.x, e.y - t.y) < 2.8).length;
    if (sp === 'magmadrake' && (cluster >= 2 || t.role === 'boss')) this.skill(g, u);
    if (sp === 'raicube' && foes.filter((e) => e.role !== 'boss' && Math.hypot(e.x - t.x, e.y - t.y) < 2.8).length >= 2) this.skill(g, u);
  }

  /** Une créature non contrôlée (et, en 0 et A, aussi celle que la simulation appelle « Meneur »). */
  comp(g: Game, c: Unit, dt: number): boolean {
    if (!c.alive) return true;
    if (c.stun > 0) return true;
    // l'Effondrement se prépare : Crabastion, protecteur, file au contact du boss (même IA partout)
    const boss = enemies(g).find((e) => e.role === 'boss');
    let { move, target } = this.decide(g, c);
    if (boss?.channel && c.species === 'crabastion') {
      move = { x: boss.x - c.x, y: boss.y - c.y };
      target = boss;
    }
    const l = Math.hypot(move.x, move.y);
    if (l > 0.05) {
      const p = g.level.nav(g, c, { x: c.x + move.x, y: c.y + move.y });
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const dl = Math.hypot(dx, dy) || 1;
      c.x += (dx / dl) * c.speed * dt;
      c.y += (dy / dl) * c.speed * dt;
      c.face = Math.atan2(dy, dx);
      c.moving = true;
    } else c.moving = false;
    if (target) this.attack(g, c, target);
    if (this.cfg.variante === '0') this.autoSkill(g, c);
    return true;
  }

  /** Entrée de la créature « Meneur » quand c'est l'IA qui la mène (variantes 0 et A). */
  aiLeaderInput(g: Game): Input {
    const inp = emptyInput();
    const L = g.leader;
    const { move, target } = this.decide(g, L);
    const boss = enemies(g).find((e) => e.role === 'boss');
    if (boss?.channel && L.species === 'crabastion') inp.move = { x: boss.x - L.x, y: boss.y - L.y };
    else inp.move = move;
    // la cible choisie par l'IA n'est pas une action du joueur : posée directement, sans passer par l'entrée
    g.leaderTarget = target ? target.id : -1;
    return inp;
  }

  /** Commandes du joueur (après le déplacement de la simulation) : compétences, cible commune, changement. */
  player(g: Game, input: Input, dt: number): boolean {
    const L = g.leader;
    if (this.cfg.variante === 'A') {
      // A : ZQSD déplace le groupe (le point d'ancrage), pas une créature
      this.anchor.x = Math.min(W - 2, Math.max(2, this.anchor.x + input.bancGroup.x * 4.6 * dt));
      this.anchor.y = Math.min(H - 2, Math.max(2, this.anchor.y + input.bancGroup.y * 4.6 * dt));
    }
    // attaque de base de la créature « Meneur » : la même fonction que pour les autres
    const t = enemies(g).find((e) => e.id === g.leaderTarget) ?? this.targetFor(g, L);
    if (t && L.alive) this.attack(g, L, t);
    if (this.cfg.variante === '0') {
      this.autoSkill(g, L);
      return true;
    }
    if (input.bancSkill >= 0) {
      const u = this.team(g).find((x) => x.species === SPECIES[input.bancSkill]);
      if (u && this.skill(g, u, input.aim)) {
        g.actions++;
        g.actionsByKind[`compétence ${SKILL[u.species as Sp].name}`] = (g.actionsByKind[`compétence ${SKILL[u.species as Sp].name}`] ?? 0) + 1;
      }
    }
    if (input.focus) {
      const f = nearest(input.aim, enemies(g).filter((e) => Math.hypot(e.x - input.aim.x, e.y - input.aim.y) < 3));
      if (f) {
        g.focusId = f.id;
        g.focusT = 8;
        g.actions++;
        g.actionsByKind['F cible commune'] = (g.actionsByKind['F cible commune'] ?? 0) + 1;
      }
    }
    g.focusT -= dt;
    if (g.focusT <= 0) g.focusId = -1;
    if (this.cfg.variante === 'C' && input.bancSwitch !== -1) {
      const alive = g.comps.filter((c) => c.alive);
      const k = input.bancSwitch === -2 ? g.comps.indexOf(alive[0]) : g.comps.findIndex((c) => c.species === SPECIES[input.bancSwitch]);
      if (k >= 0 && g.comps[k].alive) {
        swapControl(g, k);
        this.m.switches++;
        g.actions++;
        g.actionsByKind['changement'] = (g.actionsByKind['changement'] ?? 0) + 1;
      }
    }
    return true;
  }

  /** La créature contrôlée tombe : on prend la suivante encore debout (défaite s'il n'y en a plus). */
  onLeaderDown(g: Game): boolean {
    const k = g.comps.findIndex((c) => c.alive);
    if (k < 0) return false;
    swapControl(g, k);
    return true;
  }
}

/** Échange les créatures entre la place « contrôlée » (le Meneur de la simulation) et la place `k`. */
export function swapControl(g: Game, k: number) {
  const a = g.leader;
  const b = g.comps[k];
  const keys = ['species', 'name', 'x', 'y', 'hp', 'maxHp', 'speed', 'face', 'comp', 'atkCd', 'stun', 'guard', 'r', 'size', 'alive', 'moving'] as const;
  for (const key of keys) {
    const tmp = (a as unknown as Record<string, unknown>)[key];
    (a as unknown as Record<string, unknown>)[key] = (b as unknown as Record<string, unknown>)[key];
    (b as unknown as Record<string, unknown>)[key] = tmp;
  }
  // les ennemis qui visaient l'une visent la même créature à sa nouvelle place
  for (const e of enemies(g)) if (e.tauntBy === a.id) e.tauntBy = b.id;
  else if (e.tauntBy === b.id) e.tauntBy = a.id;
  g.leaderTarget = -1;
  g.trail = [{ x: a.x, y: a.y }];
}

/** Crée un essai : l'arène, les 3 créatures (placées sur leurs lignes), le Gardien de basalte. */
export function newBanc(cfg: BancConfig, seed: number, recordEvents = true): Game {
  const D = defs();
  const first: Sp = cfg.variante === 'B' || cfg.variante === 'C' ? cfg.controlled : 'magmadrake';
  const others = SPECIES.filter((s) => s !== first);
  const g = newGame('A', seed, { recordEvents, scheme: 1, team: others.map((s) => D[s]), mode: 'banc', maxTime: 420 });
  const st = new BancState(cfg);
  g.banc = st;
  g.baseMult = { leader: 0, comps: 1 }; // l'attaque de base de chaque créature passe par BancState.attack
  const L = g.leader;
  Object.assign(L, { species: first, name: NAMES[first], comp: D[first], hp: D[first].hp, maxHp: D[first].hp, speed: D[first].speed });
  const lvl = new BancLevel(seed);
  g.level = lvl;
  // départ identique dans toutes les variantes : chacun sur sa ligne, autour du même point
  for (const u of st.team(g)) {
    const s = st.slot(g, u, { x: 15, y: 8 });
    u.x = s.x;
    u.y = s.y - 1;
  }
  g.trail = [{ x: L.x, y: L.y }];
  const boss = spawnEnemy(g, 'boss', BOSS_HOME.x, BOSS_HOME.y, true, 1);
  Object.assign(boss, { species: 'cendrox', name: 'Gardien de basalte', hp: BOSS.hp, maxHp: BOSS.hp, notice: 99, skillCd: 1e9 });
  g.events.length = 0;
  void makeComp;
  return g;
}

export interface Trial {
  variante: Variante;
  issue: 'victoire' | 'défaite';
  raison: string;
  duree_s: number;
  actions: number;
  actions_par_minute: number;
  actions_detail: Record<string, number>;
  degats_infliges: Record<string, number>;
  part_degats: Record<string, number>;
  degats_subis: Record<string, number>;
  interruptions_reussies: number;
  grosses_attaques_passees: number;
  zones_ciblees: number;
  zones_subies: number;
  zones_evitees: number;
  invocations: number;
  invocations_restantes: number;
  changements: number;
  boss_pv_restants: number;
  config: BancConfig;
}
export function trialResults(g: Game): Trial {
  const st = g.banc!;
  const r = (n: number) => Math.round(n);
  const dealt: Record<string, number> = {};
  for (const [k, v] of Object.entries(st.m.dealt)) dealt[k] = r(v);
  const total = Object.values(dealt).reduce((a, b) => a + b, 0) || 1;
  const part: Record<string, number> = {};
  for (const [k, v] of Object.entries(dealt)) part[k] = Math.round((100 * v) / total);
  const taken: Record<string, number> = {};
  for (const [k, v] of Object.entries(st.m.taken)) taken[k] = r(v);
  const boss = g.units.find((u) => u.role === 'boss');
  return {
    variante: st.cfg.variante,
    issue: g.result === 'victoire' ? 'victoire' : 'défaite',
    raison: g.result === 'victoire' ? 'Le Gardien de basalte est tombé.' : g.endReason === 'Temps écoulé.' ? 'Temps écoulé (7 minutes).' : 'Les trois créatures sont tombées.',
    duree_s: Math.round(g.t * 10) / 10,
    actions: g.actions,
    actions_par_minute: Math.round((g.actions / Math.max(1 / 60, g.t / 60)) * 10) / 10,
    actions_detail: { ...g.actionsByKind },
    degats_infliges: dealt,
    part_degats: part,
    degats_subis: taken,
    interruptions_reussies: st.m.interruptsOk,
    grosses_attaques_passees: st.m.bigLanded,
    zones_ciblees: st.m.zonesTargeted,
    zones_subies: st.m.zonesHit,
    zones_evitees: Math.max(0, st.m.zonesTargeted - st.m.zonesHit),
    invocations: st.m.summoned,
    invocations_restantes: st.m.summonsAlive,
    changements: st.m.switches,
    boss_pv_restants: boss && boss.alive ? r(boss.hp) : 0,
    config: st.cfg,
  };
}
