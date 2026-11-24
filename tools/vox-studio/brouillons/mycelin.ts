/**
 * Mycélin (plante, stade 1) : porteur de polypores, auvent sur la tête. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps et signature : voir _polypore.ts.
 */
import { CHAMPI } from '../species/_commun';
import { polypore } from './_polypore';

export const ID = 'mycelin';
export const PALETTE = CHAMPI;
export const build = () => polypore(1);
