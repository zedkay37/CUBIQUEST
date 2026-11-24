/**
 * Tempestrix (électrique, forme finale, boss stormpeak-3) : serpent d'orage dressé. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _serpent.ts.
 */
import { ELEC } from './_commun';
import { serpent } from './_serpent';

export const ID = 'tempestrix';
export const PALETTE = ELEC;
export const build = () => serpent(3);
