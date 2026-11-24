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

export const MODEL_BOTS: Partial<Record<Modele, (bot: string) => (g: Game) => Input>> = {
  D: heroBot,
};
