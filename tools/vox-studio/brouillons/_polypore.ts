/**
 * Lignée Mycélin → Amanitox (plante, champignon) : « porteur de polypores ». Plan de corps : bipède trapu et voûté,
 * tronc en souche, jambes courtes et épaisses, bras ; des CHAMPIGNONS EN ÉTAGÈRES (polypores) lui poussent sur la tête
 * et le dos. Distinct de l'autre lignée de plante (sanglier-souche, quadrupède).
 *
 * Interdits évités (fiche §4.6) : pas de chapeau rond rouge à pois blancs (cliché), pas de chapeau-tête unique : un
 * auvent plat en demi-lune au-dessus des yeux, et des étagères sur le dos ; pas de couronne (l'auvent est plat,
 * sans pointes) ; pas de rangée continue (étagères en groupes, spores en points).
 * Étagères en bandes concentriques (brun au cœur, ocre, bord crème) : se lisent du dessus, sur l'herbe comme sur le sable.
 *
 * Signature qui grandit : stade 1 = un auvent sur la tête et une paire d'étagères dans le dos, points de spores ;
 * forme finale = colosse voûté aux longs bras, auvent à deux étages, étagères en trois groupes sur le dos et sur les
 * épaules, fentes de spores lumineuses entre les étagères.
 */
import { EYE, Model, type V3 } from '../voxlib';
import { BODY, BONE, CRUST, DARK, SHELF_DARK, SHELF_EDGE, SHELF_MID, drawnSince, finish, placeEyes, shade } from '../species/_commun';

const SHELVES = [SHELF_DARK, SHELF_MID, SHELF_EDGE];

/** Étagère de polypore : disque aplati, en bandes (brun au cœur, ocre, bord crème) ; avec `mirror`, c[0] est latéral. */
function shelf(m: Model, c: V3, r: V3, mirror = false): void {
  const centers: V3[] = mirror ? [[m.cx + c[0], c[1], c[2]], [m.cx - c[0], c[1], c[2]]] : [c];
  // les deux copies d'une paire peuvent se chevaucher au milieu : on garde la bande du disque le plus proche (symétrique)
  m.each((i, x, y, z) => {
    let best = Infinity;
    for (const cc of centers) {
      const a = (x - cc[0]) / r[0];
      const b = (y - cc[1]) / r[1];
      const d = (z - cc[2]) / r[2];
      if (a * a + b * b + d * d <= 1) best = Math.min(best, Math.sqrt(a * a + b * b));
    }
    if (best === Infinity) return;
    m.v[i] = best > 0.74 ? SHELF_EDGE : best > 0.42 ? SHELF_MID : SHELF_DARK;
  });
}

export function polypore(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.62 : 1.12;
  const m = new Model(28, Math.ceil(18 * k) + 6, Math.ceil(18 * k) + 4);
  const cx = m.cx;
  const cy = m.l * 0.55;
  const legH = (fin ? 4.0 : 2.6) * k; // hauteur des hanches (stade 1 : trapu, jambes courtes)
  const wb = fin ? 1 : 1.2; // stade 1 : tronc plus rond

  // --- tronc en souche, voûté vers l'avant
  m.ellipsoid([cx, cy + 0.4 * k, legH + 2.6 * k], [3.5 * k * wb, 3.0 * k * wb, 3.2 * k], BODY); // ventre
  m.ellipsoid([cx, cy - 0.5 * k, legH + 5.0 * k], [3.2 * k, 2.6 * k, 2.2 * k], BODY); // poitrail, épaules
  m.ellipsoid([2.3 * k, cy - 0.4 * k, legH + 5.6 * k], [1.4 * k, 1.6 * k, 1.3 * k], BODY, true); // épaules
  m.ellipsoid([cx, cy + 1.6 * k, legH + 4.6 * k], [2.6 * k, 1.8 * k, 2.4 * k], BODY); // dos voûté
  // --- cou court, tête ronde portée en avant
  const hs = fin ? 1 : 1.3; // stade 1 : grosse tête (30–35 %)
  const hyC = cy - (fin ? 2.3 : 2.6) * k;
  const hzC = legH + (fin ? 8.0 : 7.6) * k;
  m.capsule([cx, cy - 0.8 * k, legH + 6.0 * k], [cx, hyC + 0.6 * k, hzC - 1.2 * k], 1.7 * k, 1.4 * k, BODY); // cou
  m.ellipsoid([cx, hyC, hzC], [2.5 * k * hs, 2.3 * k * hs, 2.1 * k * hs], BODY); // crâne
  m.ellipsoid([cx, hyC - 1.9 * k * hs, hzC - 0.8 * k], [1.5 * k, 1.1 * k, 1.1 * k], BODY); // museau court
  const mz = Math.round(hzC - 1.4 * k);
  m.box(Math.trunc(cx) - 1, Math.trunc(cx) + 1, Math.floor(hyC - 3.0 * k * hs), Math.floor(hyC - 1.4 * k), mz, mz + 1, fin ? 240 : 0); // bouche (creusée ; lueur de spores à la forme finale)
  const eo = Math.max(1, Math.round(1.0 * k));
  const ez = Math.round(hzC + 0.1 * k);
  placeEyes(m, eo, ez, Math.ceil(hyC), EYE);
  if (fin) m.box(eo - 1, eo + 2, Math.floor(hyC - 2.4 * k), Math.floor(hyC - 1.2 * k), ez + 2, ez + 3, BODY, true); // arcade

  // --- bras : courts au stade 1, longs et pendants à la forme finale (mains près du sol)
  if (fin) {
    m.capsule([3.0 * k, cy - 0.4 * k, legH + 5.4 * k], [4.2 * k, cy - 0.8 * k, legH + 2.4 * k], 1.3 * k, 1.05 * k, BODY, true); // bras
    m.capsule([4.2 * k, cy - 0.8 * k, legH + 2.4 * k], [4.0 * k, cy - 2.0 * k, 2.6], 1.05 * k, 0.9 * k, BODY, true); // avant-bras
    m.ellipsoid([4.0 * k, cy - 2.3 * k, 2.2], [1.3 * k, 1.3 * k, 1.0 * k], BODY, true); // main
    m.box(Math.floor(3.4 * k), Math.ceil(4.6 * k), Math.floor(cy - 3.9 * k), Math.floor(cy - 3.1 * k), 1, 3, BONE, true); // griffes
  } else {
    m.capsule([3.0 * k, cy - 0.4 * k, legH + 4.6 * k], [4.1 * k, cy - 1.3 * k, legH + 2.2 * k], 1.15, 0.95, BODY, true);
    m.ellipsoid([4.1 * k, cy - 1.5 * k, legH + 1.8 * k], [1.1, 1.1, 1.0], BODY, true); // main
  }

  // --- étagères de polypore qui poussent sur les CÔTÉS de la tête (pas de chapeau : les yeux restent dégagés),
  // un 2e étage plus petit au-dessus à la forme finale ; puis les étagères du dos
  shelf(m, [2.0 * k * hs, hyC + 0.7 * k, hzC + 1.0 * k * hs], [2.1 * k, 1.7 * k, 0.75 * k], true);
  if (fin) shelf(m, [1.3 * k, hyC + 1.3 * k, hzC + 2.5 * k], [1.6 * k, 1.4 * k, 0.65 * k], true); // 2e étage, en retrait
  const back: [number, number, number, number, number][] = fin
    ? [
        // [latéral, y, z, rayon x, rayon y] : trois groupes séparés (épaules, haut du dos, bas du dos)
        [3.4 * k, cy - 0.2 * k, legH + 6.4 * k, 2.4 * k, 1.7 * k],
        [2.0 * k, cy + 2.2 * k, legH + 6.0 * k, 2.6 * k, 1.8 * k],
        [2.6 * k, cy + 2.6 * k, legH + 3.4 * k, 2.4 * k, 1.6 * k],
      ]
    : [[2.2 * k, cy + 1.8 * k, legH + 5.0 * k, 2.0 * k, 1.5 * k]];
  for (const [lx, yy, zz, rx, ry] of back) shelf(m, [lx, yy, zz], [rx, ry, 0.75 * k], true);

  // --- jambes courtes et épaisses, pieds larges aux orteils de bois
  const before = m.v.slice();
  const lat = 2.0 * k;
  const lr = 1.35 * k;
  m.capsule([lat, cy + 0.6 * k, legH + 1.4 * k], [lat + 0.3, cy - 0.2 * k, legH * 0.5], lr * 1.15, lr, BODY, true); // cuisse
  m.capsule([lat + 0.3, cy - 0.2 * k, legH * 0.5], [lat + 0.3, cy + 0.3 * k, 1.4], lr, lr * 0.85, BODY, true); // jambe
  const fx0 = Math.floor(lat + 0.3 - lr);
  const fx1 = Math.ceil(lat + 0.3 + lr);
  m.box(fx0, fx1, Math.floor(cy - 1.4 * k), Math.ceil(cy + 1.4 * k), 0, 2, BODY, true); // pied
  m.box(fx0, fx1, Math.floor(cy - 1.4 * k) - 1, Math.floor(cy - 1.4 * k), 0, 1, BONE, true); // orteils
  const legDrawn = drawnSince(m, before);

  shade(m);
  // dessous des étagères : lamelles sombres (pores)
  m.recolor(m.neighborsEmpty(0, 0, -1), SHELVES, DARK);
  // cœur de spores sur le DESSUS de chaque étagère (visible d'en haut) : la bande brune centrale s'allume, en lignes
  // (pas de pois sur le corps : la lueur reste sur les étagères et dans les fentes du dos)
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (m.v[i] !== SHELF_DARK || m.get(xi, yi, zi + 1) !== 0) return;
    const lat2 = Math.floor(Math.abs(x - cx));
    m.v[i] = (lat2 + Math.floor(y)) % 3 === 0 ? 242 : 241;
  });
  // forme finale : fentes de spores lumineuses sur le dos, entre les étagères
  if (fin) {
    m.crack([[1.2 * k, cy + 0.6 * k, legH + 7.2 * k], [2.6 * k, cy + 1.2 * k, legH + 5.4 * k]], 241, 0.75, [DARK, BODY, CRUST]);
    m.crack([[0.6 * k, cy + 2.4 * k, legH + 5.6 * k], [1.4 * k, cy + 3.0 * k, legH + 3.0 * k]], 241, 0.75, [DARK, BODY, CRUST]);
    m.crack([[0.5, cy - 2.4 * k, legH + 4.6 * k], [1.6 * k, cy - 2.0 * k, legH + 3.2 * k]], 241, 0.7, [DARK, BODY, CRUST]); // poitrail
  }

  const legs = m.mask((_x, _y, z) => z < legH - 0.4);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  const out = finish(m, legs);
  return out;
}
