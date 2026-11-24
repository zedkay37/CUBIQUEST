/**
 * Mycélin (plante, stade 1) : porteur de vesse, placide et douillet. Cibles : hauteur 14–18, tête 30–35 %, lueur 2–4 %.
 * Plan de corps, personnalité et signature : voir _vesse.ts.
 */
import { hexrgb } from '../voxlib';
import { CHAMPI } from './_commun';
import { vesse } from './_vesse';

export const ID = 'mycelin';
const MOUSSE = hexrgb('#4A6B2A'); // dessus des pieds (croûte de patte)
export const PALETTE = { ...CHAMPI, 251: MOUSSE, 254: MOUSSE };
export const build = () => vesse(1);
