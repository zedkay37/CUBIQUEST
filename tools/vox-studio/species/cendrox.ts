/**
 * Cendrox (feu, lignée Braizard → Cendrox, forme finale) = le Calcinarque légendaire validé par le joueur le
 * 23/11/2026 (references/calcinarque_legendaire.ts, portage octet pour octet du script Python), avec SA FORME INCHANGÉE.
 * Correction du 23/11 après le lot 2 : corps en basalte charbon (palette FEU) au lieu de brun, et plus de lave visible
 * d'en haut (dos, épaules, dessus de la tête), pour ressortir sur le sol brun du volcan comme sur un sol clair.
 */
import { build as reference } from '../references/calcinarque_legendaire';
import { FEU, topLava } from './_commun';

export const ID = 'cendrox';
export const PALETTE = FEU;
export function build() {
  const m = reference();
  topLava(m, 0.085, 12);
  return m;
}
