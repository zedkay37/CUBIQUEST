/**
 * Amanitox (plante, forme finale) : colosse voûté aux étagères. Cibles : hauteur 24–30, lueur 5–9 %.
 * Plan de corps et signature : voir _polypore.ts.
 */
import { CHAMPI } from '../species/_commun';
import { polypore } from './_polypore';

export const ID = 'amanitox';
export const PALETTE = CHAMPI;
export const build = () => polypore(3);
