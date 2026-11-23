/**
 * Ramurgel (eau, stade 2, boss tundra-1) : bois à une branche, givre sur les épaules. Cibles : hauteur 18–24, lueur 4–6 %.
 * Plan de corps et signature : voir _cerf.ts.
 */
import { GLACE } from './_commun';
import { cerf } from './_cerf';

export const ID = 'ramurgel';
export const PALETTE = GLACE;
export const build = () => cerf(2);
