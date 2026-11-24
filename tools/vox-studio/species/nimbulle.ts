/**
 * Nimbulle (psychique, stade 1) : gelée de nuage, distraite et rêveuse. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _nuage.ts.
 */
import { NUAGE } from './_commun';
import { nuage } from './_nuage';

export const ID = 'nimbulle';
export const PALETTE = NUAGE;
export const build = () => nuage(1);
