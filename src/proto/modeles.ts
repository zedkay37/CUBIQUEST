/**
 * PROTO-MODELES : les modèles de jeu du banc d'essai (fiche docs/plan/SPRINT_PROTO_MODELES.md).
 * Chaque modèle = une façon de mettre en place la même simulation (même moteur, mêmes créatures, même donjon).
 * A et B restent ceux de PROTO-DONJON, inchangés.
 */
import { CardState, DEFAULT_DECK } from './cards';
import { type Game, newGame } from './sim';
import type { DonjonSettings, Modele } from './donjon/settings';

export interface ModelInfo {
  id: Modele | 'H';
  name: string;
  phrase: string;
  keys: string;
  /** Adresse de la page (relative à /proto/). */
  href: string;
}
export const MODEL_INFO: ModelInfo[] = [
  { id: 'A', name: 'A · Le trio', phrase: 'Tu diriges le Meneur ; deux compagnons le suivent et obéissent à tes ordres.', keys: 'ZQSD, clic gauche (cible), 1 · 2, Espace, F, R, 3 · 4', href: '?proto=donjon&modele=A' },
  { id: 'B', name: 'B · La meute', phrase: 'Tu diriges le Meneur et fais bondir les créatures de ta réserve là où il faut.', keys: 'ZQSD, clic gauche, 1 · 2, Espace, molette, clic droit, R', href: '?proto=donjon&modele=B' },
  { id: 'D', name: 'D · Le héros et ses suiveurs', phrase: 'Tu diriges une seule créature avec 4 compétences ; deux petits suiveurs t’aident seuls, sans ordre.', keys: 'ZQSD, clic gauche (cible), 1 à 4, Espace', href: '?proto=donjon&modele=D' },
  { id: 'C', name: 'C · Le chef d’orchestre', phrase: 'Tu explores ; l’équipe se bat seule, faiblement ; tout ce qui compte se joue avec une main de cartes.', keys: 'ZQSD, 1 à 4 (carte), clic gauche (viser), clic droit (annuler)', href: '?proto=donjon&modele=C' },
];

/** Crée la partie d'un modèle (le terrain est posé ensuite par l'appelant). */
export function setupGame(s: DonjonSettings, maxTime = 3600): Game {
  const base = { scheme: s.scheme, leader: s.leader, recruitChance: s.recruit, maxTime };
  if (s.modele === 'C') {
    const g = newGame('A', s.seed, { ...base, scheme: 1, leader: 'calcinarque', mode: 'C' });
    // le chef d'orchestre : attaques de base faibles, tout le reste passe par les cartes
    g.baseMult = { leader: 0.5, comps: 0.75 };
    g.cards = new CardState(DEFAULT_DECK, g.rng);
    return g;
  }
  if (s.modele === 'D') {
    // le héros et ses suiveurs : un héros plus solide, deux petits suiveurs autonomes
    const g = newGame('A', s.seed, { ...base, mode: 'D' });
    g.leader.maxHp = g.leader.hp = g.leader.maxHp * 1.3;
    g.baseMult = { leader: 1.3, comps: 0.7 };
    for (const c of g.comps) {
      c.size = 0.7;
      c.maxHp = c.hp = c.maxHp * 0.7;
    }
    return g;
  }
  return newGame(s.version, s.seed, base);
}

/** Le schéma de contrôle effectif (certains modèles l'imposent). */
export function schemeFor(s: DonjonSettings): 1 | 2 | 3 {
  return s.modele === 'C' ? 1 : s.scheme;
}
