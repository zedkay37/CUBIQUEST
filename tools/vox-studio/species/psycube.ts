/**
 * Psycube (psychique, stade 1, trio « Marée ») : veilleur de pierre de lune, méticuleux et curieux. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _flotteur.ts.
 */
import { PSY } from './_commun';
import { flotteur } from './_flotteur';

export const ID = 'psycube';
export const PALETTE = PSY;
export const build = () => flotteur(1);
