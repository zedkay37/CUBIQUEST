/**
 * Braizard (feu, lignée Braizard → Cendrox, stade 1). Plan de corps : quadrupède bas, compact.
 * Base : le Coureur de Cendres (planche Calcinarque n° 10), adouci pour un stade 1 : attachant mais pas bébé.
 * Signature de lignée, en petit : fente de lave dans la gueule, ligne dorsale courte, cornes d'os naissantes.
 * Cibles (fiche §4.2) : hauteur 14–18, tête 30–35 %, lueur en surface 2–4 %.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, FEU, finish, shade } from './_commun';

export const ID = 'braizard';
export const PALETTE = FEU;

export function build(): Model {
  const m = new Model(16, 28, 18);
  const cx = m.cx;
  const c = Math.trunc(cx);

  // --- tronc rond et compact, épaules à peine plus hautes que les hanches
  m.ellipsoid([cx, 10, 8.6], [4.6, 3.9, 3.5], BODY); // poitrail
  m.ellipsoid([cx, 14.5, 8.2], [4.0, 4.2, 3.2], BODY); // ventre
  m.ellipsoid([cx, 18.5, 8.6], [4.3, 3.4, 3.3], BODY); // hanches
  m.ellipsoid([2.6, 18.8, 7.8], [1.9, 2.6, 2.6], BODY, true); // cuisses

  // --- cou court, tête un peu en avant (séparée du corps par le cou)
  // tête portée à hauteur d'épaule (moins basse que le Coureur : stade 1 plus attachant)
  m.capsule([cx, 9, 10.6], [cx, 6, 12.0], 2.7, 2.4, BODY);
  m.ellipsoid([cx, 5.0, 13], [3.9, 2.8, 2.4], BODY); // crâne arrondi
  m.box(c - 4, c + 4, 2, 7, 11, 15, BODY); // crâne
  m.box(c - 3, c + 3, 0, 4, 11, 12, BODY); // museau court, sous les yeux
  m.box(c - 3, c + 3, 1, 5, 10, 11, BODY); // mâchoire
  m.box(c - 2, c + 2, 0, 2, 11, 12, 240); // fente de lave (gueule entrouverte)
  m.box(0, 4, 1, 3, 14, 16, BODY, true); // arcade, qui surplombe l'œil d'un bloc
  m.box(1, 3, 1, 2, 12, 14, EYE, true); // yeux 2 × 2, sans reflet, sous l'arcade
  m.box(1, 2, 0, 1, 11, 12, BONE, true); // petits crocs
  // cornes d'os naissantes, couchées vers l'arrière
  m.capsule([2.4, 3.5, 15.4], [3.0, 6.2, 16.4], 1.0, 0.8, BONE, true);

  // --- pattes épaisses, coudes un peu sortis
  m.capsule([3.4, 10, 6.6], [4.4, 9.6, 1.6], 1.9, 1.7, BODY, true);
  m.box(3, 7, 7, 12, 0, 2, BODY, true);
  m.box(3, 7, 6, 7, 0, 1, BONE, true); // griffes
  m.capsule([3.2, 18.5, 6.4], [3.8, 19.2, 1.6], 1.9, 1.7, BODY, true);
  m.box(2, 6, 17, 22, 0, 2, BODY, true);
  m.box(2, 6, 16, 17, 0, 1, BONE, true);

  // --- queue moyenne, qui se relève (pas de bout lumineux)
  m.capsule([cx, 21, 8.8], [cx, 24.6, 10.2], 2.1, 1.5, BODY);
  m.capsule([cx, 24.6, 10.2], [cx, 26.8, 12], 1.5, 1.0, BODY);

  shade(m);
  // ligne dorsale courte (la signature, en petit)
  m.crack([[0.5, 8.5, 12.4], [0.5, 13, 11.9], [0.5, 17, 11.8], [0.5, 21.5, 10.6]], 241, 0.8, [1, 2, 3]);
  m.crack([[0.5, 12, 12.1], [0.5, 14, 12.0]], 242, 0.85, [241]); // cœur chaud

  const legs = m.mask((x, y, z) => z < 5.0 && Math.abs(x - cx) > 1.6 && y > 5);
  return finish(m, legs);
}
