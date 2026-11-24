/**
 * PROPOSITION B pour Mycélin → Amanitox (porte du lot 4, à choisir par le joueur) : « porteur de vesse ».
 * Plan de corps : trapu sur deux jambes courtes, voûté, grosse tête basse ; il porte sur le dos une grosse VESSE-DE-LOUP
 * (champignon rond, crème, craquelé) qui s'ouvre au sommet par un pore lumineux d'où partent les spores.
 * Trait (bible §4.7) : Mycélin casanier et douillet (paupières lourdes, sourire, gros ventre) → Amanitox sage et
 * bienveillant (sourcils longs qui tombent, barbe de mycélium, vesses plus petites qui lui poussent sur les épaules).
 * Interdits évités : pas de chapeau sur la tête, pas de chapeau rouge à pois, pas d'objet fabriqué (la vesse est vivante).
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, SHELF_EDGE, SHELF_MID, drawnSince, finish, placeEyes, shade } from '../species/_commun';

/** Vesse-de-loup : boule crème, craquelée d'ocre, pore lumineux au sommet. */
function puffball(m: Model, x: number, y: number, z: number, r: number): void {
  m.ellipsoid([x, y, z], [r, r, r * 0.92], SHELF_EDGE);
  m.each((i, vx, vy, vz) => {
    if (m.v[i] !== SHELF_EDGE) return;
    const dx = vx - x;
    const dy = vy - y;
    const dz = vz - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > r + 0.5) return;
    // craquelures : un réseau de lignes ocre (ni pois ni taches rondes)
    if (Math.abs(Math.sin(vx * 1.9 + vz * 0.7) * Math.cos(vy * 1.7 - vz * 0.5)) < 0.16 && dz < r * 0.6) m.v[i] = SHELF_MID;
    if (dz > r * 0.62 && Math.hypot(dx, dy) < r * 0.34) m.v[i] = Math.hypot(dx, dy) < r * 0.18 ? 242 : 241; // pore du sommet
  });
}

export function vesse(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.9 : 1.22;
  const m = new Model(28, Math.ceil(16 * k) + 6, Math.ceil(19 * k) + 4);
  const cx = m.cx;
  const cy = m.l * 0.5;
  const legH = 2.6 * k;

  // --- gros ventre, voûté vers l'avant
  m.ellipsoid([cx, cy, legH + 3.0 * k], [3.9 * k, 3.2 * k, 3.4 * k], BODY);
  m.ellipsoid([cx, cy - 0.6 * k, legH + 5.4 * k], [3.4 * k, 2.6 * k, 2.2 * k], BODY); // épaules
  // --- grosse tête basse, portée en avant (cou court)
  const hyC = cy - 3.0 * k;
  const hzC = legH + 6.4 * k;
  m.capsule([cx, cy - 1.2 * k, legH + 5.4 * k], [cx, hyC + 0.8 * k, hzC - 0.4 * k], 2.2 * k, 2.0 * k, BODY); // cou
  m.ellipsoid([cx, hyC, hzC], [2.9 * k, 2.5 * k, 2.4 * k], BODY); // crâne
  m.ellipsoid([cx, hyC - 1.8 * k, hzC - 0.9 * k], [2.2 * k, 1.2 * k, 1.3 * k], BODY); // museau large
  const c = Math.trunc(cx);
  const mz = Math.round(hzC - 1.4 * k);
  // bouche large : sourire (stade 1) ou moue tranquille (forme finale)
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, mz) !== 0) {
      m.box(c - 2, c + 2, yi, yi + 1, mz, mz + 1, DARK);
      m.box(2, 3, yi + 1, yi + 2, fin ? mz - 1 : mz + 1, fin ? mz : mz + 2, DARK, true);
      break;
    }
  const eo = Math.max(1, Math.round(1.1 * k));
  const ez = Math.round(hzC + 0.3 * k);
  placeEyes(m, eo, ez, Math.ceil(hyC), EYE);
  const front = Math.floor(hyC - 2.6 * k);
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === EYE) ey = Math.min(ey, yi);
  });
  m.box(eo, eo + 2, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true); // sourcils juste au-dessus des yeux, en avancée d'un bloc
  if (fin) {
    m.capsule([eo + 2.4, front + 0.5, ez + 2.4], [eo + 3.4, front + 1.6, ez + 0.4], 0.8, 0.6, BONE, true); // longs sourcils qui tombent
    for (const lx of [0.6, 1.9]) m.capsule([lx, hyC - 2.0 * k, hzC - 2.0 * k], [lx + 0.3, hyC - 1.6 * k, hzC - 4.6 * k], 0.85, 0.6, BONE, true); // barbe de mycélium
  }
  // --- bras courts aux griffes de bois
  m.capsule([3.4 * k, cy - 0.6 * k, legH + 5.0 * k], [4.2 * k, cy - 1.6 * k, legH + 2.4 * k], 1.2 * k, 1.0 * k, BODY, true);
  m.ellipsoid([4.2 * k, cy - 1.9 * k, legH + 2.0 * k], [1.1 * k, 1.1 * k, 1.0 * k], BODY, true);
  m.box(Math.floor(3.6 * k), Math.ceil(4.8 * k), Math.floor(cy - 3.2 * k), Math.floor(cy - 2.6 * k), Math.floor(legH + 1.2 * k), Math.ceil(legH + 2.2 * k), BONE, true);

  // --- la vesse sur le dos (et, à la forme finale, de petites vesses sur les épaules : groupe asymétrique)
  puffball(m, cx, cy + 2.6 * k, legH + 6.2 * k, 3.2 * k);
  if (fin) {
    puffball(m, cx + 3.6 * k, cy + 0.2 * k, legH + 7.0 * k, 1.5 * k);
    puffball(m, cx + 3.4 * k, cy + 1.8 * k, legH + 7.4 * k, 1.1 * k);
    puffball(m, cx - 3.2 * k, cy + 0.8 * k, legH + 7.0 * k, 1.2 * k);
  }

  // --- jambes courtes et épaisses, grands pieds griffus
  const before = m.v.slice();
  const lat = 2.2 * k;
  const lr = 1.45 * k;
  m.capsule([lat, cy + 0.4 * k, legH + 1.2 * k], [lat + 0.3, cy - 0.2 * k, 1.4], lr * 1.15, lr, BODY, true);
  m.box(Math.floor(lat + 0.3 - lr), Math.ceil(lat + 0.3 + lr), Math.floor(cy - 1.6 * k), Math.ceil(cy + 1.2 * k), 0, 2, BODY, true);
  m.box(Math.floor(lat + 0.3 - lr), Math.ceil(lat + 0.3 + lr), Math.floor(cy - 1.6 * k) - 1, Math.floor(cy - 1.6 * k), 0, 1, BONE, true); // griffes
  const legDrawn = drawnSince(m, before);

  shade(m);
  // fils de mycélium lumineux le long des bras et du ventre
  m.crack([[3.6 * k, cy - 0.8 * k, legH + 4.6 * k], [4.2 * k, cy - 1.6 * k, legH + 2.6 * k]], 241, 0.65, [DARK, BODY, CRUST]);
  if (fin) m.crack([[1.0 * k, cy - 3.0 * k, legH + 3.6 * k], [2.6 * k, cy - 2.4 * k, legH + 1.6 * k]], 241, 0.65, [DARK, BODY, CRUST]);
  const legs = m.mask((_x, _y, z) => z < legH - 0.4);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  return finish(m, legs);
}
