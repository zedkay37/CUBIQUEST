/**
 * PROTO-DONJON : les robots, mis à jour pour l'auto-attaque (schéma 1). Ils connaissent la carte : hors combat,
 * ils marchent vers l'escalier (ou le boss) ; en combat, chacun décide à sa façon.
 * - presse-tout : appuie sur tout dès que c'est prêt ;
 * - rotation : une touche toutes les 1,5 s, dans un ordre fixe ;
 * - adaptatif : sort des zones, esquive au dernier moment, vise le Soigneur (en le contournant), envoie le bon
 *   compagnon sur le Blindé, interrompt la Fournaise du boss ;
 * - esquive-seule : esquive parfaitement, mais n'utilise jamais les compagnons (ni F, R, 3, 4, ni entrée en B).
 */
import { ARMOR_BREAKER, ELAN, type Game, type Input, type Unit, type Vec, emptyInput, enemies, insideTelegraph, nearest } from '../sim';
import type { DonjonLevel } from './level';

export type DonjonBotId = 'presse-tout' | 'rotation' | 'adaptatif' | 'esquive-seule';
export const DONJON_BOTS: DonjonBotId[] = ['presse-tout', 'rotation', 'adaptatif', 'esquive-seule'];
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const ready = (g: Game, k: string) => (g.cds[k] ?? 0) <= 0;

function goal(g: Game): Vec {
  const f = (g.level as DonjonLevel).floor;
  return f.stairs ?? f.boss ?? g.leader;
}
function walkTo(g: Game, to: Vec): Vec {
  const p = g.level.nav(g, g.leader, to);
  return { x: p.x - g.leader.x, y: p.y - g.leader.y };
}
/** Garder la bonne distance de la cible (à distance : 5,5 m ; corps à corps : au contact). */
function keepRange(g: Game, t: Unit): Vec {
  const L = g.leader;
  const want = g.leaderDef.ranged ? 5.5 : 1.0 + t.r;
  const d = dist(L, t);
  if (d > want + 0.6) return walkTo(g, t);
  if (g.leaderDef.ranged && d < want - 2) return { x: L.x - t.x, y: L.y - t.y };
  return { x: 0, y: 0 };
}
/** Sortir de la zone annoncée la plus urgente ; esquive si l'impact est imminent. */
function avoid(g: Game, inp: Input): boolean {
  const L = g.leader;
  const danger = g.telegraphs.filter((t) => t.team === 'enemy' && insideTelegraph(t, L, 0.8));
  if (!danger.length) return false;
  const t = danger.sort((a, b) => a.dur - a.t - (b.dur - b.t))[0];
  let away: Vec;
  if (t.kind === 'band') {
    const side = -(L.x - t.x) * Math.sin(t.angle) + (L.y - t.y) * Math.cos(t.angle) >= 0 ? 1 : -1;
    away = { x: -Math.sin(t.angle) * side, y: Math.cos(t.angle) * side };
  } else if (t.kind === 'ring') away = { x: t.x - L.x, y: t.y - L.y };
  else away = { x: L.x - t.x || 0.01, y: L.y - t.y };
  inp.move = away;
  if (t.dur - t.t < 0.3 && ready(g, 'dodge')) inp.dodge = true;
  return true;
}

export function makeDonjonBot(id: string): (g: Game) => Input {
  let rot = 0;
  let rotT = 0;
  let lastFocus = -1;
  return (g: Game): Input => {
    const L = g.leader;
    const inp = emptyInput();
    const foes = enemies(g).filter((e) => e.aggro && dist(e, L) < 13);
    const close = nearest(L, foes);
    if (!close) {
      inp.move = walkTo(g, goal(g));
      inp.aim = goal(g);
      return inp;
    }
    inp.aim = { x: close.x, y: close.y };

    if (id === 'presse-tout') {
      inp.move = keepRange(g, close);
      inp.designate = close.id;
      inp.spell1 = inp.spell2 = inp.dodge = inp.recall = inp.focus = inp.comp1 = inp.comp2 = true;
      if (g.version === 'B') {
        inp.enter = true;
        inp.select = g.comps[g.selected]?.inPlay || !g.comps[g.selected]?.alive ? 1 : 0;
      }
      return inp;
    }

    if (id === 'rotation') {
      inp.move = keepRange(g, close);
      inp.designate = close.id;
      const order = g.version === 'A' ? ['spell1', 'comp1', 'focus', 'spell2', 'comp2', 'dodge'] : ['enter', 'spell1', 'spell2', 'enter', 'dodge', 'recall'];
      rotT -= 1 / 60;
      if (rotT <= 0) {
        const k = order[rot % order.length];
        if (k === 'enter') {
          const free = g.comps.findIndex((c) => c.alive && !c.inPlay);
          const playing = g.comps.filter((c) => c.inPlay && c.alive).length;
          if (free >= 0 && g.selected !== free) {
            inp.select = 1;
            return inp;
          }
          if (free < 0 || playing >= 2 || g.elan < ELAN.cost) {
            rot++;
            rotT = 1.5;
            return inp;
          }
        }
        if (ready(g, k)) {
          (inp as unknown as Record<string, boolean>)[k] = true;
          rot++;
          rotT = 1.5;
        }
      }
      return inp;
    }

    // ------- esquive-seule et adaptatif : même esquive parfaite
    const healer = foes.find((e) => e.role === 'soigneur');
    const armored = foes.find((e) => e.armor);
    const boss = foes.find((e) => e.role === 'boss');
    const solo = id === 'esquive-seule';
    let target: Unit = close;
    if (!solo && healer) target = healer;
    else if (!solo && armored && foes.length === 1) target = armored;
    inp.designate = target.id;
    inp.aim = { x: target.x, y: target.y };
    inp.move = keepRange(g, target);
    // contourner le Soigneur : se placer derrière lui (son bouclier regarde l'ennemi le plus proche)
    if (!solo && target === healer) {
      const behind = { x: healer.x + Math.cos(healer.face) * -4, y: healer.y + Math.sin(healer.face) * -4 };
      if (dist(L, behind) > 1.5) inp.move = walkTo(g, behind);
    }
    const dodging = avoid(g, inp);
    const d = dist(L, target);
    if (d < 9 && ready(g, 'spell1')) inp.spell1 = true;
    if (d < 9 && ready(g, 'spell2')) inp.spell2 = true;
    if (solo) return inp;
    if (g.version === 'A') {
      const crab = g.comps[0];
      const focusOn = boss?.channel ? boss : armored ?? healer ?? null;
      if (focusOn && lastFocus !== focusOn.id && ready(g, 'focus')) {
        inp.focus = true;
        inp.aim = { x: focusOn.x, y: focusOn.y };
        lastFocus = focusOn.id;
      }
      if (ready(g, 'comp1') && crab?.alive) {
        if (boss?.channel && dist(crab, boss) < 3 + boss.r) inp.comp1 = true;
        else if (!boss && foes.filter((e) => dist(e, crab) < 3).length >= 2) inp.comp1 = true;
      }
      const hurt = L.hp < L.maxHp * 0.7 || g.comps.some((c) => c.alive && c.hp < c.maxHp * 0.5);
      if (ready(g, 'comp2') && hurt) inp.comp2 = true;
      return inp;
    }
    // B : qui entre, où, et quand
    const playing = g.comps.filter((c) => c.inPlay && c.alive && !c.flight);
    const weak = playing.find((c) => c.hp < c.maxHp * 0.3);
    if (weak && ready(g, 'recall') && !dodging) {
      const wi = g.comps.indexOf(weak);
      if (g.selected !== wi) inp.select = 1;
      else inp.recall = true;
      return inp;
    }
    const stunners = ['crabastion', 'givrelin', 'cailloc'];
    let want: number | undefined;
    let spot: Vec = { x: close.x, y: close.y };
    const free = (sp: string) => g.comps.findIndex((c) => c.species === sp && c.alive && !c.inPlay && c.hp > c.maxHp * 0.4);
    if (boss?.channel) {
      want = stunners.map(free).find((i) => i >= 0);
      spot = { x: boss.x, y: boss.y };
      // pas de place : rappeler quelqu'un pour faire entrer un étourdisseur
      if (want !== undefined && playing.length >= 2 && ready(g, 'recall')) {
        const out = playing.find((c) => !stunners.includes(c.species));
        if (out) {
          const oi = g.comps.indexOf(out);
          if (g.selected !== oi) inp.select = 1;
          else inp.recall = true;
          return inp;
        }
      }
    } else if (armored && playing.every((c) => c.species !== ARMOR_BREAKER)) {
      want = free(ARMOR_BREAKER);
      spot = { x: armored.x, y: armored.y };
    } else if (healer) {
      want = ['braizard', 'raicube', 'chevrok', 'crabastion'].map(free).find((i) => i >= 0);
      // atterrir derrière le Soigneur : le bond passe son bouclier
      spot = { x: healer.x - Math.cos(healer.face) * 1.5, y: healer.y - Math.sin(healer.face) * 1.5 };
    } else if (L.hp < L.maxHp * 0.6) {
      want = ['amanitox', 'bourgeon'].map(free).find((i) => i >= 0);
      spot = { x: L.x, y: L.y + 1 };
    } else want = ['crabastion', 'braizard', 'givrelin', 'raicube', 'amanitox'].map(free).find((i) => i >= 0);
    if (want !== undefined && want >= 0 && playing.length < 2 && g.elan >= ELAN.cost && Math.hypot(spot.x - L.x, spot.y - L.y) < ELAN.bondRange) {
      if (g.selected !== want) inp.select = 1;
      else {
        inp.aim = spot;
        inp.enter = true;
      }
    }
    return inp;
  };
}
