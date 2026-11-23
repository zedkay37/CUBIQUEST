/**
 * Auroramure (eau, forme finale) : bois à deux branches au cœur d'aurore, crinière d'éclats en groupes. Cibles : hauteur 24–30, lueur 5–9 %.
 * Plan de corps et signature : voir _cerf.ts.
 */
import { GLACE } from './_commun';
import { cerf } from './_cerf';

export const ID = 'auroramure';
export const PALETTE = GLACE;
export const build = () => cerf(3);
