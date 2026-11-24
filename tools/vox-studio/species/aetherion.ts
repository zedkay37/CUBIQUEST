/**
 * Aetherion (psychique, forme finale, boss sanctuary-3) : veilleur sage, éclats en orbite. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _flotteur.ts.
 */
import { PSY } from './_commun';
import { flotteur } from './_flotteur';

export const ID = 'aetherion';
export const PALETTE = PSY;
export const build = () => flotteur(3);
