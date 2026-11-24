/**
 * PROTO-MODELES, modèle G « les instincts » : chaque compagnon suit 2 règles « si… alors… » choisies avant la
 * descente (et modifiables entre deux étages). Le joueur dirige le Meneur et dispose de 3 jetons d'ordre par étage
 * (focus, repli, ultime). Pur (aucun DOM).
 */
import { type Game, type Unit, allyTargets, damage, emit, enemies, heal, nearest, stunEnemy } from './sim';

export const CONDITIONS = [
  { id: 'toujours', label: 'toujours' },
  { id: 'allie-faible', label: 'un allié a moins de 30 % de PV' },
  { id: 'meneur-faible', label: 'le Meneur a moins de 50 % de PV' },
  { id: 'soigneur', label: 'un Soigneur ennemi est en vue' },
  { id: 'contact', label: 'un ennemi touche le Meneur' },
  { id: 'gros', label: 'un Blindé ou le boss est en vue' },
] as const;
export const ACTIONS = [
  { id: 'proche', label: 'attaquer le plus proche' },
  { id: 'soigneur', label: 'viser le Soigneur' },
  { id: 'faible', label: 'viser l’ennemi le plus faible' },
  { id: 'proteger', label: 'protéger le Meneur' },
  { id: 'aider', label: 'aider l’allié le plus faible' },
  { id: 'sort', label: 'lancer son sort' },
] as const;
export type CondId = (typeof CONDITIONS)[number]['id'];
export type ActId = (typeof ACTIONS)[number]['id'];
export interface Rule {
  cond: CondId;
  act: ActId;
}
export const DEFAULT_RULES: Record<string, Rule[]> = {
  crabastion: [
    { cond: 'contact', act: 'proteger' },
    { cond: 'toujours', act: 'proche' },
  ],
  amanitox: [
    { cond: 'allie-faible', act: 'aider' },
    { cond: 'soigneur', act: 'soigneur' },
  ],
};
export const TOKENS_PER_FLOOR = 3;

const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function condition(g: Game, c: Unit, cond: CondId): boolean {
  const L = g.leader;
  const foes = enemies(g).filter((e) => e.aggro && d(e, L) < 13);
  switch (cond) {
    case 'toujours':
      return foes.length > 0;
    case 'allie-faible':
      return allyTargets(g).some((a) => a.hp < a.maxHp * 0.3);
    case 'meneur-faible':
      return L.hp < L.maxHp * 0.5;
    case 'soigneur':
      return foes.some((e) => e.role === 'soigneur');
    case 'contact':
      return foes.some((e) => d(e, L) < 2 + e.r);
    case 'gros':
      return foes.some((e) => e.armor || e.role === 'boss');
  }
  return false;
}

/** Le sort du compagnon (Carapace : étourdit au contact et interrompt le boss ; Spores : soin). Recharge 12 s. */
function spell(g: Game, c: Unit): boolean {
  if (c.skillCd > 0) return false;
  c.skillCd = 12;
  if (c.species === 'crabastion' || !c.comp?.ranged) {
    c.guard = 4;
    for (const e of enemies(g)) {
      if (d(e, c) < 7) {
        e.taunt = 4;
        e.tauntBy = c.id;
      }
      if (d(e, c) < 3 + e.r) stunEnemy(g, e, 1);
    }
    emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#7FD7FF' });
  } else {
    for (const a of allyTargets(g)) if (d(a, c) < 6) heal(g, a, 60);
    emit(g, { type: 'glow', x: c.x, y: c.y, id: c.id, color: '#9CFF7A' });
  }
  return true;
}

/**
 * Décision d'un compagnon selon ses règles : une cible à attaquer, un point où aller, ou rien (comportement normal).
 * La première règle dont la condition est vraie l'emporte.
 */
export function instinct(g: Game, c: Unit, dt: number): { target?: Unit; goTo?: { x: number; y: number } } | null {
  c.skillCd -= dt;
  const rules = g.instincts?.[c.species] ?? [];
  const L = g.leader;
  const foes = enemies(g).filter((e) => e.aggro && d(e, L) < 13);
  for (const r of rules) {
    if (!condition(g, c, r.cond)) continue;
    switch (r.act) {
      case 'proche': {
        const t = nearest(c, foes);
        if (t) return { target: t };
        break;
      }
      case 'soigneur': {
        const t = foes.find((e) => e.role === 'soigneur');
        if (t) return { target: t };
        break;
      }
      case 'faible': {
        const t = [...foes].sort((a, b) => a.hp - b.hp)[0];
        if (t) return { target: t };
        break;
      }
      case 'proteger': {
        const t = nearest(L, foes.filter((e) => d(e, L) < 4 + e.r));
        if (t) {
          t.taunt = Math.max(t.taunt, 0.5);
          t.tauntBy = c.id;
          return { target: t };
        }
        return { goTo: { x: L.x, y: L.y - 1 } };
      }
      case 'aider': {
        const w = allyTargets(g).filter((a) => a !== c).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (w) {
          if (d(w, c) < 5 && spell(g, c)) return null;
          return { goTo: { x: w.x, y: w.y } };
        }
        break;
      }
      case 'sort':
        if (spell(g, c)) return null;
        break;
    }
  }
  return null;
}

/** Les jetons d'ordre (3 par étage, partagés) : focus sous le curseur, repli, ultime. */
export function useToken(g: Game, kind: 'focus' | 'repli' | 'ultime', aim: { x: number; y: number }): boolean {
  if (g.tokens <= 0) return false;
  const L = g.leader;
  if (kind === 'focus') {
    const t = nearest(aim, enemies(g).filter((e) => d(e, aim) < 3));
    if (!t) return false;
    g.focusId = t.id;
    g.focusT = 8;
  } else if (kind === 'repli') {
    for (const c of g.comps) if (c.alive) Object.assign(c, { returnT: 2.5, guard: 2 });
    g.focusId = -1;
  } else {
    // ultime : toute l'équipe frappe ensemble autour du Meneur (étourdit et interrompt le boss)
    for (const e of enemies(g))
      if (d(e, L) < 7 + e.r) {
        damage(g, e, 80, 'Équipe — Ultime', undefined, 'crabastion');
        stunEnemy(g, e, 1.2);
      }
    emit(g, { type: 'phase', x: L.x, y: L.y, id: L.id, color: '#FFD02A' });
  }
  g.tokens--;
  g.actions++;
  g.actionsByKind[`jeton ${kind}`] = (g.actionsByKind[`jeton ${kind}`] ?? 0) + 1;
  return true;
}
