/**
 * Givrelin (eau, stade 1) : coureur des glaces, deux pointes de glace. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps et signature : voir _cerf.ts.
 */
import { GLACE } from './_commun';
import { cerf } from './_cerf';

export const ID = 'givrelin';
export const PALETTE = GLACE;
export const build = () => cerf(1);
