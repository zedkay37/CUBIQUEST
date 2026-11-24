/**
 * Bourgéoliath (plante, forme finale, boss meadow-3) : colosse aux racines. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps et signature : voir _souche.ts.
 */
import { PLANTE } from './_commun';
import { souche } from './_souche';

export const ID = 'bourgeoliath';
export const PALETTE = PLANTE;
export const build = () => souche(3);
