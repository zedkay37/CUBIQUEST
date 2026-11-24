/**
 * Serpéclair (électrique, stade 2, boss stormpeak-1) : serpent d'orage espiègle. Cibles : hauteur 18–24, lueur 4–6 % (plafond 10 %).
 * Plan de corps, personnalité et signature : voir _serpent.ts.
 */
import { ELEC } from './_commun';
import { serpent } from './_serpent';

export const ID = 'serpeclair';
export const PALETTE = ELEC;
export const build = () => serpent(2);
