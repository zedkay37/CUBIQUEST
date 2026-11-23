/**
 * Ignisaur (feu, forme finale, boss volcano-2 et sanctuary-2) : carapace dorsale en petites plaques à joints de lave, cornes incandescentes, avant-bras de forge. Cibles : hauteur 24–30, tête 20–25 %, lueur 5–9 % (10 % au plus, boss).
 * Plan de corps et signature : voir _forgeron.ts.
 */
import { FEU } from './_commun';
import { forgeron } from './_forgeron';

export const ID = 'ignisaur';
export const PALETTE = FEU;
export const build = () => forgeron(3);
