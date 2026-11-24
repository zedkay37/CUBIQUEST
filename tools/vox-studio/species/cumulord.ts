/**
 * Cumulord (psychique, forme finale, boss stormpeak-2) : gelée de nuage majestueuse et malicieuse. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _nuage.ts.
 */
import { NUAGE } from './_commun';
import { nuage } from './_nuage';

export const ID = 'cumulord';
export const PALETTE = NUAGE;
export const build = () => nuage(3);
