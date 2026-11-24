/**
 * Cailloc (roche, stade 1, trio de départ « Braise ») : gargouille, brave petit gardien. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _gargouille.ts.
 */
import { ROCHE } from './_commun';
import { gargouille } from './_gargouille';

export const ID = 'cailloc';
export const PALETTE = ROCHE;
export const build = () => gargouille(1);
