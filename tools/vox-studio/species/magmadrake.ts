/**
 * Magmadrake (roche, forme finale, boss volcano-3 et canyon-2) : gargouille hautaine, ailes repliées. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _gargouille.ts.
 */
import { ROCHE } from './_commun';
import { gargouille } from './_gargouille';

export const ID = 'magmadrake';
export const PALETTE = ROCHE;
export const build = () => gargouille(3);
