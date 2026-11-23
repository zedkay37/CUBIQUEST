/**
 * Crabastion (eau, forme finale) : pinces massives, aiguilles de roche veinées de lumière. Cibles : hauteur 24–30, lueur 5–9 %.
 * Plan de corps et signature : voir _pince.ts.
 */
import { EAU } from './_commun';
import { pince } from './_pince';

export const ID = 'crabastion';
export const PALETTE = EAU;
export const build = () => pince(3);
