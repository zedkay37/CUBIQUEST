/**
 * Givrock (roche, stade 1) : golem de banquise, frileux et grognon. Cibles : hauteur 14–18, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _golem.ts.
 */
import { ROCHE } from './_commun';
import { golem } from './_golem';

export const ID = 'givrock';
export const PALETTE = ROCHE;
export const build = () => golem(1);
