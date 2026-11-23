/**
 * Lignée Givrelin → Ramurgel → Auroramure (eau, glace) : « coureur des glaces ». Plan de corps : quadrupède haut sur
 * pattes fines, long cou qui porte la tête haut et en avant, queue courte. Distinct des deux autres plans de l'eau
 * (bœuf de récif trapu, crabe large et bas).
 *
 * Interdits évités (fiche §4.6) : pas de couronne (les bois sont BALAYÉS VERS L'ARRIÈRE, comme des lames, jamais
 * dressés en couronne), pas de bois multicolores, pas de rangée de plaques. Corps d'ardoise bleu sombre : il ressort
 * sur la neige de la toundra comme sur le sable clair.
 * Signature qui grandit : stade 1 = deux pointes de glace ; stade 2 = bois à une branche, givre sur les épaules ;
 * forme finale = bois à deux branches avec un cœur d'aurore (lueur), crinière d'éclats de glace en groupes.
 * Lecture du dessus : tête nettement devant le corps (long cou), bois qui partent vers l'arrière, lueur sur le dos.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, finish, shade, topLava } from './_commun';

export function cerf(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1 : stage === 2 ? 1.25 : 1.5;
  const W = stage === 1 ? 14 : stage === 2 ? 16 : 18;
  const L = stage === 1 ? 22 : stage === 2 ? 27 : 32;
  const H = stage === 1 ? 19 : stage === 2 ? 25 : 31;
  const m = new Model(W, L, H);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = L * 0.56;
  const legH = 6.2 * k;
  const rz = 2.3 * k;
  const bz = legH + rz; // centre du corps
  const ry = 5.0 * k;
  const rx = 4.0 + stage * 0.5; // assez large pour se lire de face (12 blocs au moins)

  // --- corps allongé, poitrail plus haut que la croupe
  m.ellipsoid([cx, cy, bz], [rx, ry, rz], BODY);
  m.ellipsoid([cx, cy - ry * 0.55, bz + rz * 0.35], [rx + 0.4, ry * 0.45, rz * 1.05], BODY); // poitrail, épaules
  m.ellipsoid([cx, cy + ry * 0.55, bz - rz * 0.1], [rx - 0.2, ry * 0.42, rz * 0.9], BODY); // croupe
  // --- long cou qui monte en avant ; tête haute, museau allongé
  const hy = cy - ry - 2.6 * k;
  const hz = bz + 4.2 * k;
  m.capsule([cx, cy - ry * 0.7, bz + rz * 0.6], [cx, hy + 1.2, hz - 0.8], 1.9 * k * 0.85, 1.4 * k * 0.85, BODY);
  const hr = 2.0 + stage * 0.25;
  m.ellipsoid([cx, hy, hz], [hr, hr * 1.15, hr * 0.95], BODY); // crâne
  const front = Math.floor(hy - hr * 1.1);
  const ez = Math.round(hz + 0.3);
  m.box(c - 1, c + 1, front - 2, front + 1, ez - 2, ez, BODY); // museau
  m.box(c - 1, c + 1, front - 2, front - 1, ez - 2, ez - 1, DARK); // naseaux
  // yeux 2 × 2 sur l'avant des côtés de la tête ; au stade 1, pas d'arcade qui déborde (visibles depuis la caméra)
  m.box(1, 3, front + 1, front + 2, ez, ez + 2, EYE, true);
  if (stage > 1) m.box(1, 3, front, front + 3, ez + 2, ez + 3, BODY, true); // arcade

  // --- bois de glace balayés vers l'arrière (lames), qui grandissent
  const by = hy + 0.6;
  const bzz = hz + hr * 0.7;
  if (stage === 1) {
    m.capsule([1.4, by, bzz], [2.6, by + 2.0, bzz + 1.6], 0.95, 0.75, BONE, true);
  } else {
    const len = stage === 2 ? 4.5 : 6.5;
    m.capsule([1.4, by, bzz], [3.4, by + len * 0.55, bzz + len * 0.5], 1.15, 0.95, BONE, true); // lame principale
    m.capsule([3.4, by + len * 0.55, bzz + len * 0.5], [4.6, by + len, bzz + len * 0.62], 0.95, 0.75, BONE, true);
    m.capsule([2.6, by + len * 0.35, bzz + len * 0.32], [4.8, by + len * 0.45, bzz + len * 0.7], 0.85, 0.7, BONE, true); // branche
    if (stage === 3) m.capsule([3.8, by + len * 0.7, bzz + len * 0.55], [5.8, by + len * 0.85, bzz + len * 0.95], 0.85, 0.7, BONE, true); // 2e branche
  }

  // --- pattes fines et hautes (≥ 2 blocs d'épaisseur), sabots de glace
  const lat = rx - 0.2; // pattes écartées
  const fy = cy - ry * 0.55;
  const hyl = cy + ry * 0.6;
  const lr = 1.05 + stage * 0.12;
  m.capsule([lat, fy, bz - 0.5], [lat + 0.2, fy - 0.4, legH * 0.45], lr * 1.15, lr, BODY, true); // avant-bras
  m.capsule([lat + 0.2, fy - 0.4, legH * 0.45], [lat + 0.2, fy, 1.0], lr, lr * 0.9, BODY, true); // canon
  m.capsule([lat, hyl, bz - 0.5], [lat + 0.2, hyl + 0.8, legH * 0.5], lr * 1.25, lr, BODY, true); // cuisse
  m.capsule([lat + 0.2, hyl + 0.8, legH * 0.5], [lat + 0.2, hyl + 0.2, 1.0], lr, lr * 0.9, BODY, true); // jarret
  for (const yy of [fy, hyl]) m.box(Math.floor(lat - 0.8), Math.ceil(lat + 1.2), Math.floor(yy - 1.2), Math.ceil(yy + 1.0), 0, 1, BONE, true); // sabots
  // --- queue courte
  m.capsule([cx, cy + ry * 0.95, bz + 0.4], [cx, cy + ry + 1.6, bz - 0.8], 1.1, 0.9, BODY);
  // --- crinière d'éclats de glace en GROUPES (épaules, garrot) aux stades 2 et 3
  if (stage > 1)
    for (const [lx, yy, h] of stage === 2
      ? ([
          [1.4, -0.75, 1.6],
          [1.8, -0.45, 1.2],
        ] as const)
      : ([
          [1.4, -0.8, 2.4],
          [2.2, -0.55, 1.8],
          [1.2, -0.25, 1.4],
        ] as const))
      m.capsule([lx, cy + yy * ry, bz + rz * 1.1], [lx + 0.4, cy + yy * ry + 1.0, bz + rz * 1.1 + h * k], 1.0, 0.75, BONE, true);

  shade(m);
  const body = [DARK, BODY, CRUST];
  // lueur : bouts des bois (stade 1), cœur d'aurore dans les bois et givre du dos ensuite
  const tipZ = stage === 1 ? bzz + 0.8 : bzz + (stage === 2 ? 3.2 : 4.4);
  m.each((i, _x, _y, z) => {
    if (m.v[i] === BONE && z > tipZ) m.v[i] = stage === 3 ? 242 : 241;
  });
  if (stage === 3)
    m.each((i, _x, _y, z) => {
      if (m.v[i] === BONE && z > bzz + 1.4 && z <= tipZ) m.v[i] = 241;
    });
  if (stage > 1) m.crack([[0.5, cy - ry * 0.7, bz + rz * 1.3], [1.6, cy - ry * 0.3, bz + rz * 1.0]], 241, 0.75, body);
  const legs = m.mask((x, _y, z) => z < legH - 0.6 && Math.abs(x - cx) > 0.9);
  const out = finish(m, legs);
  topLava(out, stage === 1 ? 0.03 : stage === 2 ? 0.05 : 0.07, Math.round(bz), 'pointillé');
  return out;
}
