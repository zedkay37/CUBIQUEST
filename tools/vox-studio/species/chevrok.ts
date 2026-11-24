/**
 * Chevrok (roche, stade 1) : bondisseur des mesas, casse-cou. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _bondisseur.ts.
 */
import { ROCHE } from './_commun';
import { bondisseur } from './_bondisseur';

export const ID = 'chevrok';
export const PALETTE = ROCHE;
export const build = () => bondisseur(1);
