/**
 * Glaciatitan (roche, forme finale, boss tundra-3) : golem solennel, glacier sur les épaules. Cibles : hauteur 24–30, lueur 5–9 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _golem.ts.
 */
import { ROCHE } from './_commun';
import { golem } from './_golem';

export const ID = 'glaciatitan';
export const PALETTE = ROCHE;
export const build = () => golem(3);
