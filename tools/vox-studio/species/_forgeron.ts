/**
 * Lignée Pyrocube → Flambrix → Ignisaur (feu) : « marcheur de forge ». Plan de corps : bipède dressé, penché en avant,
 * jambes digitigrades (genou en avant, talon relevé), queue lourde qui touche presque le sol (contrepoids, sans rien
 * au bout), bras courts puis avant-bras massifs. Distinct de la lignée Braizard → Cendrox (quadrupède bas).
 *
 * Interdits évités (fiche §4.6) : corps de basalte sombre (pas orange), aucun ventre crème, aucune flamme ni boule au
 * bout de la queue, pas d'ailes déployées, pas de rangée unique de grandes plaques dorsales.
 *
 * Signature qui grandit : stade 1 = cœur de braise sur le poitrail (une croix de lave) ; stade 2 = cœur plus grand,
 * fissures qui montent aux épaules, cornes d'os aux pointes de braise ; forme finale = carapace dorsale en petites
 * plaques décalées sur deux rangs avec joints de lave, cornes incandescentes, avant-bras de forge.
 * Lecture du dessus (bible §4.1) : tête nettement devant le poitrail, lueur sur le dessus du dos aux stades 2 et 3.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, finish, shade } from './_commun';

type Stage = 1 | 2 | 3;

export function forgeron(stage: Stage): Model {
  const k = stage === 1 ? 1 : stage === 2 ? 1.3 : 1.62;
  const W = stage === 1 ? 16 : stage === 2 ? 18 : 20;
  const L = stage === 1 ? 24 : stage === 2 ? 29 : 34;
  const H = stage === 1 ? 19 : stage === 2 ? 25 : 31;
  const m = new Model(W, L, H);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = L * 0.48; // centre du tronc (avant = Y faibles)
  const z = (v: number) => v * k;
  const y = (v: number) => cy + v * k;

  // --- tronc penché en avant : hanches basses, poitrail plus haut et plus en avant
  m.ellipsoid([cx, y(1.2), z(6.6)], [3.6 + stage * 0.3, 3.0 * k, 2.8 * k], BODY); // hanches
  m.ellipsoid([cx, y(-0.6), z(8.8)], [4.0 + stage * (stage === 3 ? 0.9 : 0.5), 3.4 * k, 3.6 * k], BODY); // ventre
  m.ellipsoid([cx, y(-2.0), z(10.4)], [3.8 + stage * (stage === 3 ? 1.2 : 0.7), 2.8 * k, 2.9 * k], BODY); // poitrail
  if (stage > 1) m.ellipsoid([2.8 + stage * 0.5, y(-1.6), z(11.4)], [2.0 + stage * 0.3, 2.2 * k, 1.9 * k], BODY, true); // épaules

  // --- cou court, tête devant le poitrail (elle dépasse nettement vue du dessus)
  const hy = y(-5.2); // centre de la tête
  const hz = z(12.6);
  const hr = stage === 1 ? 3.1 : stage === 2 ? 3.0 * 1.15 : 3.0 * 1.3; // la tête grandit moins vite que le corps
  m.capsule([cx, y(-2.6), z(11.4)], [cx, hy + 1, hz - 0.4], 2.2 * k, 2.0 * k, BODY);
  m.ellipsoid([cx, hy, hz], [hr * 1.05, hr * 0.95, hr * (stage === 1 ? 1.0 : 0.85)], BODY); // crâne
  const front = Math.floor(hy - hr * 0.95); // face avant de la tête
  const ez = Math.round(hz + (stage === 1 ? 0.4 : 0)); // hauteur des yeux
  // museau en marche d'escalier, mâchoire, gueule de braise
  m.box(c - 2, c + 2, front - (stage === 1 ? 1 : 2), front + 2, ez - 3, ez - 1, BODY);
  m.box(c - 2, c + 2, front - (stage === 1 ? 1 : 2), front + 1, ez - 3, ez - 2, 240); // fente de braise
  m.box(c - 2, c + 2, front - (stage === 1 ? 0 : 1), front + 2, ez - 4, ez - 3, BODY); // mâchoire
  if (stage > 1) m.box(1, 2, front - 1, front, ez - 4, ez - 2, BONE, true); // crocs
  // yeux 2 × 2 ; au stade 1 l'arcade ne déborde pas (yeux visibles depuis la caméra de combat), ensuite elle surplombe
  m.box(0, 4, front, front + 2, ez - 1, ez + 2, BODY, true); // visage
  m.box(1, 3, front, front + 1, ez, ez + 2, EYE, true);
  m.box(1, 4, stage === 1 ? front + 1 : front - 1, front + 3, ez + 2, ez + 3, BODY, true); // arcade

  // --- cornes : bourgeons d'os (1), cornes d'os aux pointes de braise (2), cornes incandescentes (3)
  if (stage === 1) m.capsule([2.0, hy + 0.8, hz + hr * 0.75], [2.4, hy + 2.0, hz + hr * 0.75 + 1.3], 0.95, 0.8, BONE, true);
  else {
    const len = stage === 2 ? 3.2 : 4.6;
    m.capsule([2.2, hy + 0.5, hz + hr * 0.6], [3.2, hy + 2.2, hz + hr * 0.6 + len * 0.55], 1.15, 0.95, BONE, true);
    m.capsule([3.2, hy + 2.2, hz + hr * 0.6 + len * 0.55], [3.8, hy + 4.0, hz + hr * 0.6 + len], 0.95, 0.75, BONE, true);
  }

  // --- bras : courts au stade 1, avant-bras de forge à la forme finale (coudes vers l'extérieur)
  const ar = stage === 1 ? 1.3 : stage === 2 ? 1.6 : 2.6;
  const sx = 3.2 + stage * (stage === 3 ? 1.2 : 0.7);
  m.capsule([sx, y(-2.2), z(10.2)], [sx + 1.0, y(-1.4), z(8.0)], ar, ar * 0.95, BODY, true); // bras
  m.capsule([sx + 1.0, y(-1.4), z(8.0)], [sx + 0.6, y(-3.6), z(7.0)], ar * 0.95, ar * (stage === 3 ? 1.15 : 0.9), BODY, true); // avant-bras
  m.box(Math.floor(sx - 0.4), Math.ceil(sx + 1.4), Math.floor(y(-4.6)), Math.floor(y(-3.8)), Math.floor(z(6.4)), Math.ceil(z(7.0)), BONE, true); // griffes

  // --- jambes digitigrades : cuisse, genou en avant, jarret qui recule, pied à griffes
  const lx = 2.6 + stage * 0.5;
  m.capsule([lx, y(1.0), z(6.2)], [lx + 0.4, y(-0.6), z(3.4)], 2.1 * k * 0.9, 1.8 * k * 0.9, BODY, true); // cuisse
  m.capsule([lx + 0.4, y(-0.6), z(3.4)], [lx + 0.4, y(1.2), 1.4], 1.7 * k * 0.85, 1.4 * k * 0.85, BODY, true); // jarret
  m.box(Math.floor(lx - 1), Math.ceil(lx + 2.0), Math.floor(y(-1.8)), Math.ceil(y(2.0)), 0, 2, BODY, true); // pied
  m.box(Math.floor(lx - 1), Math.ceil(lx + 2.0), Math.floor(y(-1.8)) - 1, Math.floor(y(-1.8)), 0, 1, BONE, true); // griffes

  // --- queue lourde, qui descend vers le sol (rien au bout)
  m.capsule([cx, y(2.6), z(6.6)], [cx, y(5.6), z(4.4)], 2.3 * k * 0.85, 1.7 * k * 0.85, BODY);
  m.capsule([cx, y(5.6), z(4.4)], [cx, Math.min(L - 1.4, y(8.6)), z(2.2)], 1.7 * k * 0.85, 1.0, BODY);

  // --- forme finale : carapace dorsale en petites plaques décalées sur deux rangs (pas une rangée unique)
  if (stage === 3) {
    for (const [lat, yy, zz] of [
      [1.6, -2.6, 13.6],
      [2.4, -0.8, 13.0],
      [1.6, 1.0, 12.2],
      [2.4, 2.8, 11.0],
    ])
      m.box(Math.round(lat - 1.0), Math.round(lat + 2.2), Math.floor(y(yy) - 1.4), Math.ceil(y(yy) + 1.4), Math.floor(z(zz) - 1.8), Math.ceil(z(zz) + 1.2), CRUST, true);
  }

  shade(m);
  const body = [DARK, BODY, CRUST];
  // --- cœur de braise sur le poitrail : une croix, qui grandit
  const chestY = y(-4.4);
  const chestZ = z(9.6);
  const arm = stage === 1 ? 1.2 : stage === 2 ? 2.4 : 2.8;
  m.crack([[0.5, chestY, chestZ - arm], [0.5, chestY - 0.3, chestZ + arm]], 241, 0.8, body);
  m.crack([[0.5, chestY, chestZ], [arm, chestY + 0.6, chestZ]], 241, 0.75, body);
  m.crack([[0.5, chestY, chestZ - 0.6], [0.5, chestY, chestZ + 0.6]], 242, 0.8, [241]); // cœur chaud
  if (stage === 1) m.crack([[0.5, hy - 0.6, hz + hr * 0.95], [0.5, hy + 1.4, hz + hr * 0.9]], 241, 0.8, body); // braise sur le crâne
  if (stage >= 2) {
    // fissures qui montent aux épaules, et une ligne sur le dessus du dos (visible du dessus)
    m.crack([[arm, chestY + 0.6, chestZ], [3.0 + stage * 0.6, y(-1.6), z(12.4)]], 241, 0.75, body);
    m.crack([[0.5, y(-1.8), z(13.2)], [0.5, y(1.2), z(10.6)]], 241, 0.75, body);
    // pointes des cornes en braise
    const tip = hz + hr * 0.6 + (stage === 2 ? 3.2 : 4.6) * (stage === 2 ? 0.75 : 0.55);
    m.each((i, _x, _y, zz) => {
      if (m.v[i] === BONE && zz > tip) m.v[i] = stage === 2 ? 241 : 242;
    });
  }
  if (stage === 3) {
    // joints de lave entre les plaques du dos, et cornes incandescentes dès la mi-longueur
    for (const yy of [-1.7, 0.1, 1.9]) m.crack([[0.5, y(yy), z(14.2) - (yy + 1.7) * 0.9], [3.8, y(yy), z(13.4) - (yy + 1.7) * 0.9]], 241, 0.95, body);
    // veines de forge sur les avant-bras (vues du dessus et de 3/4)
    m.crack([[sx + 1.0, y(-1.4), z(8.4)], [sx + 0.6, y(-3.6), z(7.6)]], 241, 0.8, body);
    m.each((i, _x, _y, zz) => {
      if (m.v[i] === BONE && zz > hz + hr * 0.6 + 1.8 && zz <= hz + hr * 0.6 + 2.6) m.v[i] = 241;
    });
  }

  const legs = m.mask((x, _y, zz) => zz < z(4.6) && Math.abs(x - cx) > 1.6);
  return finish(m, legs);
}
