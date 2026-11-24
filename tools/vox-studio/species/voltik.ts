/**
 * Ampoulin (électrique, stade 1, trio de départ « Braise ») : scarabée-pile curieux. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _scarabee.ts.
 */
import { ELEC } from './_commun';
import { scarabee } from './_scarabee';

export const ID = 'voltik';
export const PALETTE = ELEC;
export const build = () => scarabee(1);
