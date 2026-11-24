/**
 * Granitox (roche, stade 2, boss volcano-1) : gargouille impassible. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _gargouille.ts.
 */
import { ROCHE } from './_commun';
import { gargouille } from './_gargouille';

export const ID = 'granitox';
export const PALETTE = ROCHE;
export const build = () => gargouille(2);
