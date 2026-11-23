/**
 * Aquabloc (eau, stade 1) : bœuf de récif, dôme de récif et bourgeon de corail. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps et signature : voir _recif.ts.
 */
import { EAU } from './_commun';
import { reef } from './_recif';

export const ID = 'aquabloc';
export const PALETTE = EAU;
export const build = () => reef(1);
