/**
 * Flambrix (feu, stade 2) : cœur plus grand, fissures aux épaules, cornes d'os aux pointes de braise. Cibles : hauteur 18–24, tête 25–30 %, lueur 4–6 %.
 * Plan de corps et signature : voir _forgeron.ts.
 */
import { FEU } from './_commun';
import { forgeron } from './_forgeron';

export const ID = 'flambrix';
export const PALETTE = FEU;
export const build = () => forgeron(2);
