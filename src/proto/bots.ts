/**
 * Sprint PROTO-MENEUR : trois robots qui jouent la maquette avec les mêmes commandes qu'un joueur (Input).
 * - « presse-tout » : appuie sur tout dès que c'est prêt ;
 * - « rotation » : suit une rotation fixe, sans regarder la situation ;
 * - « adaptatif » : garde l'Esquive pour les attaques annoncées, sort des zones, vise le Soigneur en premier.
 * Les trois se déplacent de la même façon par défaut (garder une distance de tir) : seule la décision change.
 */
import { COMPS, ELAN, type Game, type Input, type Unit, type Vec, emptyInput, enemies, insideTelegraph, navPoint, nearest } from './sim';

export type BotId = 'presse-tout' | 'rotation' | 'adaptatif';
export const BOTS: BotId[] = ['presse-tout', 'rotation', 'adaptatif'];

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const ready = (g: Game, k: string) => (g.cds[k] ?? 0) <= 0;

/** Avance dans la salle quand il n'y a personne ; sinon garde une distance de tir de la cible. */
function baseMove(g: Game, target: Unit | null, keep = 6.5): Vec {
  const L = g.leader;
  if (!target) {
    const goal = g.wave === 0 ? { x: 0, y: 12 } : { x: 0, y: 30 };
    const p = navPoint(L, goal);
    return dist(L, goal) < 1.5 ? { x: 0, y: 0 } : { x: p.x - L.x, y: p.y - L.y };
  }
  const d = dist(L, target);
  if (d > keep + 1) {
    const p = navPoint(L, target);
    return { x: p.x - L.x, y: p.y - L.y };
  }
  if (d < keep - 1.5) return { x: L.x - target.x, y: L.y - target.y };
  return { x: 0, y: 0 };
}

function selectToward(g: Game, want: number): number {
  if (g.selected === want) return 0;
  return 1;
}

export function makeBot(id: BotId): (g: Game) => Input {
  let rot = 0;
  let rotT = 0;
  let lastFocus = -1;
  return (g: Game): Input => {
    const L = g.leader;
    const foes = enemies(g).filter((e) => e.aggro || dist(e, L) < 16);
    const close = nearest(L, foes);
    const inp = emptyInput();
    inp.fire = Boolean(close);

    if (id === 'presse-tout') {
      inp.move = baseMove(g, close);
      inp.aim = close ? { x: close.x, y: close.y } : { x: L.x, y: L.y + 5 };
      inp.spell1 = inp.spell2 = inp.dodge = inp.recall = Boolean(close);
      inp.focus = inp.comp1 = inp.comp2 = Boolean(close);
      if (g.version === 'B' && close) {
        inp.enter = true;
        inp.select = g.comps[g.selected].inPlay || !g.comps[g.selected].alive ? 1 : 0;
      }
      return inp;
    }

    if (id === 'rotation') {
      inp.move = baseMove(g, close);
      inp.aim = close ? { x: close.x, y: close.y } : { x: L.x, y: L.y + 5 };
      if (!close) return inp;
      // une touche toutes les 1,5 s, dans un ordre fixe ; on attend qu'elle soit prête
      const order = g.version === 'A' ? ['spell1', 'comp1', 'focus', 'spell2', 'comp2', 'dodge'] : ['enter', 'spell1', 'spell2', 'enter', 'dodge', 'recall'];
      rotT -= 1 / 60;
      if (rotT <= 0) {
        const k = order[rot % order.length];
        const cdKey = k === 'enter' ? 'enter' : k;
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
        if (ready(g, cdKey)) {
          (inp as unknown as Record<string, boolean>)[k] = true;
          rot++;
          rotT = 1.5;
        }
      }
      return inp;
    }

    // ---------------- adaptatif
    const healer = foes.find((e) => e.role === 'soigneur');
    const target = healer ?? close;
    inp.aim = target ? { x: target.x, y: target.y } : { x: L.x, y: L.y + 5 };
    inp.move = baseMove(g, target ?? null, healer ? 8 : 6.5);
    // danger : sortir des zones annoncées, et esquiver au dernier moment si on n'en sort pas
    const danger = g.telegraphs.filter((t) => t.team === 'enemy' && insideTelegraph(t, L, 0.8));
    if (danger.length) {
      const t = danger.sort((a, b) => a.dur - a.t - (b.dur - b.t))[0];
      let away: Vec;
      if (t.kind === 'band') {
        const side = -(L.x - t.x) * Math.sin(t.angle) + (L.y - t.y) * Math.cos(t.angle) >= 0 ? 1 : -1;
        away = { x: -Math.sin(t.angle) * side, y: Math.cos(t.angle) * side };
      } else if (t.kind === 'ring') away = { x: t.x - L.x, y: t.y - L.y };
      else away = { x: L.x - t.x || 0.01, y: L.y - t.y };
      inp.move = away;
      if (t.dur - t.t < 0.3 && ready(g, 'dodge')) inp.dodge = true;
    }
    if (!target) return inp;
    const d = dist(L, target);
    if (d < 10 && ready(g, 'spell1')) inp.spell1 = true;
    if (d < 9 && ready(g, 'spell2')) inp.spell2 = true;
    if (g.version === 'A') {
      if (healer && lastFocus !== healer.id && ready(g, 'focus')) {
        inp.focus = true;
        lastFocus = healer.id;
      } else if (!healer && target.role === 'boss' && lastFocus !== target.id) {
        inp.focus = true;
        lastFocus = target.id;
      }
      const nearL = foes.filter((e) => dist(e, L) < 6).length;
      if (ready(g, 'comp1') && (nearL >= 2 || L.hp < L.maxHp * 0.6 || g.telegraphs.some((t) => t.team === 'enemy'))) inp.comp1 = true;
      const hurt = L.hp < L.maxHp * 0.75 || g.comps.some((c) => c.alive && c.hp < c.maxHp * 0.5);
      if (ready(g, 'comp2') && hurt) inp.comp2 = true;
      return inp;
    }
    // version B : le tank d'abord, le frappeur sur le Soigneur, le soin quand l'équipe saigne ; rappel avant le K.O.
    const playing = g.comps.filter((c) => c.inPlay && c.alive && !c.flight);
    const weak = playing.find((c) => c.hp < c.maxHp * 0.3);
    if (weak && ready(g, 'recall')) {
      if (g.selected !== g.comps.indexOf(weak)) inp.select = selectToward(g, g.comps.indexOf(weak));
      else inp.recall = true;
      return inp;
    }
    if (playing.length < 2 && g.elan >= ELAN.cost) {
      const teamHurt = L.hp < L.maxHp * 0.6;
      const pref = teamHurt ? ['amanitox', 'crabastion', 'braizard', 'givrelin'] : healer ? ['braizard', 'crabastion', 'givrelin', 'amanitox'] : ['crabastion', 'braizard', 'givrelin', 'amanitox'];
      const want = pref.map((s) => g.comps.findIndex((c) => c.species === s)).find((i) => i >= 0 && g.comps[i].alive && !g.comps[i].inPlay && g.comps[i].hp > g.comps[i].maxHp * 0.5);
      if (want !== undefined) {
        if (g.selected !== want) inp.select = selectToward(g, want);
        else {
          const spot = COMPS[want].species === 'amanitox' ? { x: L.x, y: L.y + 1 } : { x: target.x, y: target.y };
          inp.aim = spot;
          inp.enter = true;
        }
      }
    }
    return inp;
  };
}
