/**
 * Pyrocube (feu, stade 1, trio de départ « Braise ») : petit marcheur de forge, cœur de braise sur le poitrail. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %, yeux visibles depuis la caméra.
 * Plan de corps et signature : voir _forgeron.ts.
 */
import { FEU } from './_commun';
import { forgeron } from './_forgeron';

export const ID = 'pyrocube';
export const PALETTE = FEU;
export const build = () => forgeron(1);
