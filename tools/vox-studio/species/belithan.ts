/**
 * Bélithan (roche, forme finale, boss canyon-3) : bondisseur fier-à-bras. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _bondisseur.ts.
 */
import { ROCHE } from './_commun';
import { bondisseur } from './_bondisseur';

export const ID = 'belithan';
export const PALETTE = ROCHE;
export const build = () => bondisseur(3);
