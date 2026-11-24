/**
 * Bourgéon (plante, stade 1, trio de départ) : sanglier-souche, oreilles-feuilles. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps et signature : voir _souche.ts.
 */
import { PLANTE } from './_commun';
import { souche } from './_souche';

export const ID = 'bourgeon';
export const PALETTE = PLANTE;
export const build = () => souche(1);
