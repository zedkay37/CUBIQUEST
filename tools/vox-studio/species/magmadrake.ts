/**
 * Magmadrake (roche, forme finale, boss volcano-3 et canyon-2) : gargouille hautaine, ailes repliées. Cibles : hauteur
 * 24–30, lueur 5–9 % (plafond 10 %). Plan de corps, personnalité et signature : voir _gargouille.ts.
 * Harmonisation (créature-étalon) : son cristal est d'un bleu plus saturé que le reste de la roche, pour une couleur
 * forte qui se voit d'en haut (la lueur pâle de la roche se lisait comme de la neige sur lui).
 */
import { hexrgb } from '../voxlib';
import { ROCHE } from './_commun';
import { gargouille } from './_gargouille';

export const ID = 'magmadrake';
export const PALETTE = { ...ROCHE, 240: hexrgb('#2F6BFF'), 241: hexrgb('#3D8BFF'), 242: hexrgb('#A8D8FF') };
export const build = () => gargouille(3);
