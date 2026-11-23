/**
 * Coureur de Cendres : portage ligne à ligne de `../coureur_cendres.py` (forme intermédiaire validée comme lisible).
 * Sert de preuve du portage (octet pour octet) et de point de départ pour Braizard.
 */
import { EYE, Model, isGlow } from '../voxlib';
import { PALETTE as REF_PALETTE } from './calcinarque_legendaire';

export const PALETTE = REF_PALETTE;
const B = 2;
const H = 4;

export function build(): Model {
  const m = new Model(14, 32, 20);
  const cx = m.cx;
  const c = Math.trunc(cx);
  // tronc allongé, épaules un peu plus hautes que les hanches
  m.ellipsoid([cx, 11, 12], [4.8, 5.0, 4.0], B);
  m.ellipsoid([cx, 8, 10], [3.4, 3.0, 3.4], B);
  m.ellipsoid([cx, 16.5, 11], [3.3, 5.0, 3.0], B);
  m.ellipsoid([cx, 21, 11.5], [3.9, 3.8, 3.6], B);
  m.ellipsoid([2.7, 21.5, 10], [2.0, 3.2, 3.3], B, true);
  // cou et tête basse, tendue vers l'avant
  m.capsule([cx, 10, 13], [cx, 5.5, 11], 3.0, 2.6, B);
  m.box(c - 2, c + 2, 0, 7, 6, 8, B); // mâchoire
  m.box(c - 2, c + 2, 0, 6, 8, 9, 240); // fente de lave
  m.box(c - 2, c + 2, 0, 7, 9, 11, B); // museau
  m.box(c - 3, c + 3, 3, 8, 9, 14, B); // crâne
  m.box(1, 4, 2, 5, 13, 15, B, true); // arcade
  m.box(1, 3, 3, 4, 11, 13, EYE, true);
  m.box(1, 2, 0, 1, 7, 9, H, true); // crocs
  // petites cornes couchées vers l'arrière
  m.capsule([2.0, 6.5, 14], [3.0, 9.5, 15.5], 1.05, 0.85, H, true);
  m.capsule([3.0, 9.5, 15.5], [3.4, 12, 16.2], 0.85, 0.75, H, true);
  // pattes fines, coudes sortis
  m.capsule([3.4, 11, 10], [5.0, 12, 6], 2.0, 1.8, B, true);
  m.capsule([5.0, 12, 6], [5.0, 9, 1.6], 1.8, 1.6, B, true);
  m.box(3, 7, 7, 11, 0, 2, B, true);
  m.box(3, 7, 6, 7, 0, 1, H, true);
  m.capsule([3.4, 21, 8.5], [4.2, 24.5, 4], 1.9, 1.6, B, true);
  m.capsule([4.2, 24.5, 4], [4.4, 22.5, 1.5], 1.6, 1.5, B, true);
  m.box(3, 6, 20, 24, 0, 2, B, true);
  m.box(3, 6, 19, 20, 0, 1, H, true);
  // longue queue relevée
  m.capsule([cx, 24, 12], [cx, 28, 13], 2.3, 1.7, B);
  m.capsule([cx, 28, 13], [cx, 31.4, 16], 1.7, 1.15, B);
  // piques basses en deux rangées
  for (const [lat, y, z, hgt] of [
    [1.6, 8.5, 15.2, 1.6],
    [2.0, 11.5, 15.6, 2.0],
    [1.8, 14.5, 14.0, 1.6],
    [1.8, 19.5, 14.4, 1.6],
    [1.4, 23.5, 14.0, 1.4],
  ])
    m.capsule([lat, y, z], [lat + 0.3, y + 1.2, z + hgt], 0.95, 0.8, 3, true);

  const up = m.neighborsEmpty(0, 0, 1);
  const down = m.neighborsEmpty(0, 0, -1);
  m.recolor(up, [B], 3);
  m.recolor(down, [B], 1);
  const body = [1, 2, 3];
  // ligne dorsale continue jusqu'au bout de la queue + rayures de flanc
  m.crack([[0.5, 7, 15], [0.5, 11, 16], [0.5, 16, 14], [0.5, 21, 15], [0.5, 26, 14.6], [0.5, 31.5, 17]], 241, 0.8, body);
  for (const y0 of [10.0, 14.5, 19.0]) m.crack([[3.0, y0, 14.5], [4.4, y0 + 1.6, 11.0]], 241, 0.7, body);
  // pas de bout de queue incandescent : trop proche d'un starter feu connu
  const horn = m.mask((_x, _y, _z, value) => value === H);
  m.each((i, _x, y, z) => {
    if (horn[i] && y > 10.5 && z > 14) m.v[i] = 241;
  });

  const legs = m.mask((x, y, z) => z < 7.0 && Math.abs(x - cx) > 2.1 && y > 5.5);
  m.legsSplit(legs, [
    [2, [250, 253]],
    [1, [250, 253]],
    [3, [251, 254]],
    [4, [252, 255]],
  ]);
  for (let i = 0; i < legs.length; i++) if (legs[i] && isGlow(m.v[i])) throw new Error('lave sur une patte');
  m.crop();
  return m;
}
