/**
 * Lunabloc (psychique, stade 2, boss sanctuary-1) : veilleur vaniteux, croissant et satellites. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _flotteur.ts.
 */
import { PSY } from './_commun';
import { flotteur } from './_flotteur';

export const ID = 'lunabloc';
export const PALETTE = PSY;
export const build = () => flotteur(2);
