/**
 * Crabloc (eau, stade 1) : crabe de roche, joints lumineux. Cibles : hauteur 14–18, lueur 2–4 %, yeux visibles depuis la caméra.
 * Plan de corps et signature : voir _pince.ts.
 * Lot 3b (retour du joueur) : croûte du dessus un peu plus sombre que la palette de l'eau (#5E8597 → #476B7D), pour que
 * la carapace ressorte sur le sable clair de la Rive Azur. Forme inchangée.
 */
import { hexrgb } from '../voxlib';
import { EAU } from './_commun';
import { pince } from './_pince';

export const ID = 'crabloc';
const CROUTE = hexrgb('#476B7D');
export const PALETTE = { ...EAU, 3: CROUTE, 251: CROUTE, 254: CROUTE };
export const build = () => pince(1);
