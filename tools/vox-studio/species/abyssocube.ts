/**
 * Abyssocube (eau, forme finale) : colosse de récif, flèches de corail, veines et gorge lumineuses des abysses. Cibles : hauteur 24–30, tête 20–25 %, lueur 5–9 %.
 * Plan de corps et signature : voir _recif.ts.
 */
import { EAU } from './_commun';
import { reef } from './_recif';

export const ID = 'abyssocube';
export const PALETTE = EAU;
export const build = () => reef(3);
