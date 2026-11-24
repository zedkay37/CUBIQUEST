/**
 * PROTO-MODELES : robots propres à chaque modèle (sinon ceux du donjon, qui savent déjà jouer A, B et C).
 * Chaque entrée renvoie le robot « presse-tout » ou « adaptatif » du modèle.
 */
import type { Game, Input } from './sim';
import type { Modele } from './donjon/settings';

export const MODEL_BOTS: Partial<Record<Modele, (bot: string) => (g: Game) => Input>> = {};
