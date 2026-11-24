/**
 * Crépitil (électrique, stade 1) : serpent d'orage nerveux. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _serpent.ts.
 */
import { ELEC } from './_commun';
import { serpent } from './_serpent';

export const ID = 'crepitil';
export const PALETTE = ELEC;
export const build = () => serpent(1);
