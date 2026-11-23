/**
 * Crabloc (eau, stade 1) : crabe de roche, joints lumineux. Cibles : hauteur 14–18, lueur 2–4 %, yeux visibles depuis la caméra.
 * Plan de corps et signature : voir _pince.ts.
 */
import { EAU } from './_commun';
import { pince } from './_pince';

export const ID = 'crabloc';
export const PALETTE = EAU;
export const build = () => pince(1);
