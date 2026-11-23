/**
 * Corallix (eau, stade 2) : branches de corail sur les épaules, joints lumineux. Cibles : hauteur 18–24, tête 25–30 %, lueur 4–6 %.
 * Plan de corps et signature : voir _recif.ts.
 */
import { EAU } from './_commun';
import { reef } from './_recif';

export const ID = 'corallix';
export const PALETTE = EAU;
export const build = () => reef(2);
