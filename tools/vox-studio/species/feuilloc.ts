/**
 * Feuilloc (plante, stade 2, boss meadow-1) : boucliers de feuilles aux épaules. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps et signature : voir _souche.ts.
 */
import { PLANTE } from './_commun';
import { souche } from './_souche';

export const ID = 'feuilloc';
export const PALETTE = PLANTE;
export const build = () => souche(2);
