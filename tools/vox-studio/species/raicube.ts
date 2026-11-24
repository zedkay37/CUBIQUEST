/**
 * Voltacier (électrique, forme finale, boss shore-2) : scarabée-pile fier. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _scarabee.ts.
 */
import { ELEC } from './_commun';
import { scarabee } from './_scarabee';

export const ID = 'raicube';
export const PALETTE = ELEC;
export const build = () => scarabee(3);
