/**
 * Mouflambre (roche, stade 2, boss canyon-1) : bondisseur chaleureux, cornes d'ambre. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _bondisseur.ts.
 */
import { ROCHE } from './_commun';
import { bondisseur } from './_bondisseur';

export const ID = 'mouflambre';
export const PALETTE = ROCHE;
export const build = () => bondisseur(2);
