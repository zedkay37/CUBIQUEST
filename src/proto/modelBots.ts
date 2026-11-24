/**
 * PROTO-MODELES : robots propres à chaque modèle (sinon ceux du donjon, qui savent déjà jouer A, B et C).
 * Chaque entrée renvoie le robot « presse-tout » ou « adaptatif » du modèle.
 */
import { type Game, type Input, enemies } from './sim';
import type { Modele } from './donjon/settings';
import { makeDonjonBot } from './donjon/dbots';

const ready = (g: Game, k: string) => (g.cds[k] ?? 0) <= 0;
const near = (g: Game, r: number) => enemies(g).filter((e) => e.aggro && Math.hypot(e.x - g.leader.x, e.y - g.leader.y) < r + e.r);

/** D : le héros. Presse-tout : les 4 compétences dès que prêtes. Adaptatif : esquive parfaite (même base), Trait sur la cible, Onde au contact ou pour interrompre le boss. */
function heroBot(bot: string) {
  const base = makeDonjonBot(bot === 'presse-tout' ? 'presse-tout' : 'esquive-seule');
  return (g: Game): Input => {
    const inp = base(g);
    inp.focus = inp.recall = false;
    if (bot === 'presse-tout') {
      inp.comp1 = inp.comp2 = near(g, 13).length > 0;
      return inp;
    }
    const boss = near(g, 4).find((e) => e.role === 'boss');
    inp.comp1 = ready(g, 'spell3') && near(g, 12).length > 0;
    inp.comp2 = ready(g, 'spell4') && (near(g, 3.6).length >= 2 || Boolean(boss?.channel));
    return inp;
  };
}

/** E : le relais. Presse-tout : échange et sort dès que prêts. Adaptatif : esquive parfaite, échange pour un effet utile. */
function relayBot(bot: string) {
  const base = makeDonjonBot(bot === 'presse-tout' ? 'presse-tout' : 'esquive-seule');
  return (g: Game): Input => {
    const inp = base(g);
    const r = g.relay!;
    inp.focus = inp.recall = inp.comp1 = inp.comp2 = inp.spell1 = inp.spell2 = false;
    const foes = near(g, 12);
    inp.enter = false;
    if (!foes.length) return inp;
    const idx = (sp: string) => r.team.findIndex((m) => m.def.species === sp && m.alive);
    if (bot === 'presse-tout') {
      inp.enter = true;
      if (ready(g, 'swap')) inp.swapTo = (r.active + 1) % 4;
      return inp;
    }
    const sp = g.leader.species;
    const close = near(g, 3.2);
    const boss = foes.find((e) => e.role === 'boss');
    inp.enter = ready(g, 'spell1') && (sp === 'raicube' || sp === 'calcinarque-legendaire' || close.length > 0 || g.leader.hp < g.leader.maxHp * 0.5);
    if (!ready(g, 'swap')) return inp;
    const wet = foes.filter((e) => e.wetT > 0).length;
    if (boss?.channel && close.includes(boss) && sp !== 'crabastion') inp.swapTo = idx('crabastion') >= 0 ? idx('crabastion') : idx('amanitox');
    else if (g.leader.hp < g.leader.maxHp * 0.3) inp.swapTo = r.team.map((m, k) => (k !== r.active && m.alive ? k : -1)).filter((k) => k >= 0).sort((a, b) => r.team[b].hp / r.team[b].def.hp - r.team[a].hp / r.team[a].def.hp)[0] ?? -1;
    else if (sp === 'crabastion' && close.length >= 2) inp.swapTo = idx('raicube');
    else if (wet >= 2 && sp !== 'raicube') inp.swapTo = idx('raicube');
    else if (close.length >= 2 && sp !== 'crabastion') inp.swapTo = idx('crabastion');
    return inp;
  };
}

export const MODEL_BOTS: Partial<Record<Modele, (bot: string) => (g: Game) => Input>> = {
  D: heroBot,
  E: relayBot,
};
