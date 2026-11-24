/**
 * Amanitox (plante, forme finale) : porteur de vesse, vénérable et lourdaud. Cibles : hauteur 24–30, lueur 5–9 %.
 * Plan de corps, personnalité et signature : voir _vesse.ts.
 */
import { hexrgb } from '../voxlib';
import { CHAMPI } from './_commun';
import { vesse } from './_vesse';

export const ID = 'amanitox';
const MOUSSE = hexrgb('#4A6B2A'); // dessus des pieds (croûte de patte)
export const PALETTE = { ...CHAMPI, 251: MOUSSE, 254: MOUSSE };
export const build = () => vesse(3);
