/**
 * Bobinard (électrique, stade 2, boss meadow-2) : scarabée-pile bougon. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _scarabee.ts.
 */
import { ELEC } from './_commun';
import { scarabee } from './_scarabee';

export const ID = 'sparkube';
export const PALETTE = ELEC;
export const build = () => scarabee(2);
