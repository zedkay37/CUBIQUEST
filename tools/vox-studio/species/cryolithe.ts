/**
 * Cryolithe (roche, stade 2, boss tundra-2) : golem méfiant aux stalactites. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _golem.ts.
 */
import { ROCHE } from './_commun';
import { golem } from './_golem';

export const ID = 'cryolithe';
export const PALETTE = ROCHE;
export const build = () => golem(2);
