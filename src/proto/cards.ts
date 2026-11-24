/**
 * PROTO-MODELES, modèle C « le chef d'orchestre » : toutes les actions qui comptent sont des cartes.
 * Une main de 4 cartes tirées d'un deck de 10 construit à partir de l'équipe (sorts de chaque créature et ordres),
 * une jauge de mana qui se recharge avec le temps ; une carte jouée repart sous le deck et la suivante la remplace.
 * Pur (aucun DOM) : les robots jouent les mêmes cartes.
 */
import { type Game, type Unit, type Vec, allyTargets, clampLen, damage, emit, enemies, heal, nearest, shoot, startBond, stunEnemy, telegraph } from './sim';

export type CardTarget = 'zone' | 'ennemi' | 'aucune' | 'sol';
export interface CardDef {
  id: string;
  name: string;
  cost: number;
  /** Espèce de la créature qui agit, ou « ordre ». */
  who: string;
  target: CardTarget;
  text: string;
}
export const CARDS: CardDef[] = [
  { id: 'salve', name: 'Salve', cost: 2, who: 'calcinarque-legendaire', target: 'zone', text: 'Le Meneur lance cinq flammes en éventail.' },
  { id: 'brasier', name: 'Brasier', cost: 3, who: 'calcinarque-legendaire', target: 'zone', text: 'Une zone de feu éclate au point visé.' },
  { id: 'flammeche', name: 'Flammèche', cost: 1, who: 'calcinarque-legendaire', target: 'ennemi', text: 'Un gros trait de feu sur un ennemi.' },
  { id: 'carapace', name: 'Carapace', cost: 2, who: 'crabastion', target: 'aucune', text: 'Crabastion se protège, attire les coups et étourdit au contact.' },
  { id: 'bond-crab', name: 'Bond de Crabastion', cost: 2, who: 'crabastion', target: 'zone', text: 'Crabastion bondit au point visé et étourdit à l’arrivée.' },
  { id: 'pince', name: 'Pince', cost: 1, who: 'crabastion', target: 'ennemi', text: 'Crabastion bondit sur un ennemi et le frappe fort (brise le blindage).' },
  { id: 'spores', name: 'Spores', cost: 2, who: 'amanitox', target: 'aucune', text: 'Amanitox soigne tous les alliés proches.' },
  { id: 'bond-amani', name: 'Bond d’Amanitox', cost: 1, who: 'amanitox', target: 'zone', text: 'Amanitox bondit au point visé et soigne autour de lui.' },
  { id: 'nuage', name: 'Nuage toxique', cost: 2, who: 'amanitox', target: 'zone', text: 'Trois bouffées toxiques au point visé.' },
  { id: 'focus', name: 'Focus', cost: 1, who: 'ordre', target: 'ennemi', text: 'Toute l’équipe attaque cet ennemi.' },
  { id: 'repli', name: 'Repli', cost: 1, who: 'ordre', target: 'aucune', text: 'Les compagnons reviennent, protégés un instant.' },
  { id: 'regroupement', name: 'Regroupement', cost: 1, who: 'ordre', target: 'sol', text: 'Les compagnons vont tenir ce point.' },
  { id: 'proteger', name: 'Protéger le Meneur', cost: 2, who: 'ordre', target: 'aucune', text: 'Les compagnons attirent les ennemis proches du Meneur ; il encaisse moitié moins.' },
];
export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<string, CardDef>;
export const DEFAULT_DECK = ['salve', 'brasier', 'carapace', 'bond-crab', 'spores', 'bond-amani', 'focus', 'repli', 'regroupement', 'proteger'];
export const MANA = { max: 10, start: 5, perSec: 0.9 };

export class CardState {
  deck: string[];
  hand: (string | null)[] = [null, null, null, null];
  mana = MANA.start;
  played: Record<string, number> = {};
  constructor(deckList: string[], rng: () => number) {
    // le deck est mélangé une fois (graine de la partie) ; ensuite il tourne : la carte jouée repart dessous
    this.deck = [...deckList];
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    for (let i = 0; i < 4; i++) this.hand[i] = this.deck.shift() ?? null;
  }
  /** Toutes les cartes de l'équipe (pile + main). */
  all(): string[] {
    return [...this.hand.filter((c): c is string => c !== null), ...this.deck];
  }
  /** Échange entre deux étages : une carte du deck contre une carte de la réserve de l'équipe. */
  swap(out: string, inn: string) {
    const h = this.hand.indexOf(out);
    if (h >= 0) this.hand[h] = inn;
    else {
      const d = this.deck.indexOf(out);
      if (d >= 0) this.deck[d] = inn;
    }
  }
  update(g: Game, dt: number) {
    this.mana = Math.min(MANA.max, this.mana + MANA.perSec * dt);
    g.focusT -= dt;
    if (g.focusT <= 0) g.focusId = -1;
  }
  canPlay(i: number) {
    const id = this.hand[i];
    return id !== null && this.mana >= CARD[id].cost;
  }
  play(g: Game, i: number, at: Vec, targetId: number): boolean {
    const id = this.hand[i];
    if (id === null || !this.canPlay(i)) return false;
    const def = CARD[id];
    const target = enemies(g).find((e) => e.id === targetId) ?? (def.target === 'ennemi' ? nearest(at, enemies(g).filter((e) => Math.hypot(e.x - at.x, e.y - at.y) < 3)) : null);
    if (def.target === 'ennemi' && !target) return false;
    const actor = def.who === 'ordre' || def.who === g.leader.species ? g.leader : g.comps.find((c) => c.species === def.who && c.alive) ?? null;
    if (!actor) return false;
    if (!effect(g, id, actor, at, target)) return false;
    this.mana -= def.cost;
    this.deck.push(id);
    this.hand[i] = this.deck.shift() ?? null;
    this.played[id] = (this.played[id] ?? 0) + 1;
    g.actions++;
    g.actionsByKind[`carte ${def.name}`] = (g.actionsByKind[`carte ${def.name}`] ?? 0) + 1;
    return true;
  }
}

function effect(g: Game, id: string, actor: Unit, at: Vec, target: Unit | null): boolean {
  const L = g.leader;
  const comps = g.comps.filter((c) => c.alive);
  switch (id) {
    case 'salve':
      for (let k = -2; k <= 2; k++) shoot(g, L, at, 18, 11, 'Calcinarque — Salve', 20, k * 0.16);
      emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
      return true;
    case 'brasier': {
      const p = clampLen(L, at, 10);
      telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 2.8, r2: 0, angle: 0, len: 0, w: 0, dur: 0.5, dmg: 60, team: 'ally', source: 'Calcinarque — Brasier', owner: L.id, from: { x: L.x, y: L.y } });
      emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#FF8A30' });
      return true;
    }
    case 'flammeche':
      shoot(g, L, target!, 38, 14, 'Calcinarque — Flammèche', 22);
      return true;
    case 'carapace':
      actor.guard = 4;
      for (const e of enemies(g)) {
        if (Math.hypot(e.x - actor.x, e.y - actor.y) < 7) {
          e.taunt = 4;
          e.tauntBy = actor.id;
        }
        if (Math.hypot(e.x - actor.x, e.y - actor.y) < 3 + e.r) stunEnemy(g, e, 1);
      }
      emit(g, { type: 'glow', x: actor.x, y: actor.y, id: actor.id, color: '#7FD7FF' });
      return true;
    case 'bond-crab':
    case 'bond-amani':
      startBond(g, actor, clampLen(L, at, 10));
      return true;
    case 'pince':
      startBond(g, actor, { x: target!.x, y: target!.y });
      // le coup part à l'arrivée : la carte le prépare (dégâts appliqués par le bond + un coup franc)
      damage(g, target!, 30, 'Crabastion — Pince', undefined, actor.species);
      return true;
    case 'spores':
      for (const a of allyTargets(g)) if (Math.hypot(a.x - actor.x, a.y - actor.y) < 6) heal(g, a, 70);
      emit(g, { type: 'glow', x: actor.x, y: actor.y, id: actor.id, color: '#9CFF7A' });
      return true;
    case 'nuage': {
      const p = clampLen(actor, at, 10);
      for (let k = 0; k < 3; k++)
        telegraph(g, { kind: 'disc', x: p.x, y: p.y, r: 2.4, r2: 0, angle: 0, len: 0, w: 0, dur: 0.4 + k * 0.6, dmg: 20, team: 'ally', source: 'Amanitox — Nuage', owner: actor.id });
      return true;
    }
    case 'focus':
      g.focusId = target!.id;
      g.focusT = 8;
      for (const c of comps) {
        c.returnT = 0;
        c.holdT = 0;
      }
      g.leaderTarget = target!.id;
      return true;
    case 'repli':
      for (const c of comps) {
        c.returnT = 2.5;
        c.holdT = 0;
        c.guard = Math.max(c.guard, 2);
      }
      g.focusId = -1;
      return true;
    case 'regroupement':
      comps.forEach((c, k) => {
        c.holdAt = { x: at.x + (k - 0.5) * 1.4, y: at.y };
        c.holdT = 5;
        c.returnT = 0;
      });
      return true;
    case 'proteger':
      L.guard = 4;
      for (const e of enemies(g))
        if (Math.hypot(e.x - L.x, e.y - L.y) < 6 && comps.length) {
          const c = nearest(e, comps)!;
          e.taunt = 4;
          e.tauntBy = c.id;
        }
      for (const c of comps) c.returnT = 1.2;
      emit(g, { type: 'glow', x: L.x, y: L.y, id: L.id, color: '#7FD7FF' });
      return true;
  }
  return false;
}
