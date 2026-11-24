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
 *
 * Lot 3b (retour du joueur : « trop simple à côté de Cendrox, pattes en bâtons, corps en boîte ») : même plan de corps
 * et même signature, mais du volume et du détail. Poitrail profond qui descend en V entre les pattes avant, bosses
 * d'épaule, taille fine (il reste élancé), croupe et cuisses ; cou musclé (masse à la base, crête) ; pommettes, oreilles,
 * arcade ; pattes à avant-bras et cuisse musclés, genou et boulet marqués, sabots sombres fendus sous un fanon clair ;
 * crinière d'éclats en groupes séparés dès le stade 1 ; plaques de givre sur le dos, visibles d'en haut.
 */
import { EYE, Model, type Mask } from '../voxlib';
import { BODY, BONE, CRUST, DARK, finish, shade, topLava } from './_commun';

/** Givre (indice propre à la lignée, voir GLACE dans _commun.ts) : plus clair que la croûte, moins que la glace des bois. */
export const GIVRE = 5;

/** Plaques de givre : voxels du DESSUS (voisin du haut vide) proches des centres donnés (décalage latéral, y), en glace. */
function frost(m: Model, spots: [number, number, number][], minZ: number, legs: Mask): void {
  m.each((i, x, y, z, xi, yi, zi) => {
    if (legs[i] || zi < minZ || ![BODY, CRUST, DARK].includes(m.v[i]) || m.get(xi, yi, zi + 1) !== 0) return;
    const lat = Math.abs(x - m.cx);
    for (const [sl, sy, r] of spots) {
      const dx = lat - sl;
      const dy = y - sy;
      if (dx * dx + dy * dy <= r * r) {
        m.v[i] = GIVRE;
        return;
      }
    }
  });
}

export function cerf(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1 : stage === 2 ? 1.25 : 1.5;
  const W = 24; // grille large et paire (symétrie exacte) ; recadrée à la fin
  const L = stage === 1 ? 24 : stage === 2 ? 29 : 34;
  const H = stage === 1 ? 19 : stage === 2 ? 25 : 31;
  const m = new Model(W, L, H);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = L * 0.56;
  const legH = 6.2 * k;
  const rz = 2.3 * k;
  const bz = legH + rz; // centre du corps
  const ry = 5.0 * k;
  const rx = 4.0 + stage * 0.5;

  // --- tronc : poitrail profond et épaules hautes, taille fine (élancé), croupe et cuisses
  m.ellipsoid([cx, cy + ry * 0.05, bz + 0.2], [rx - 0.9, ry * 0.85, rz * 0.85], BODY); // taille
  m.ellipsoid([cx, cy - ry * 0.5, bz + rz * 0.35], [rx + 0.5, ry * 0.5, rz * 1.2], BODY); // poitrail, épaules
  m.ellipsoid([cx, cy - ry * 0.7, bz - rz * 0.15], [rx - 1.4, ry * 0.32, rz * 0.95], BODY); // bréchet (V entre les pattes avant)
  m.ellipsoid([rx * 0.5, cy - ry * 0.42, bz + rz * 0.95], [1.5 + 0.35 * stage, ry * 0.36, rz * 0.7], BODY, true); // bosses d'épaule
  m.ellipsoid([cx, cy + ry * 0.58, bz + 0.1], [rx - 0.3, ry * 0.42, rz * 0.95], BODY); // croupe
  m.ellipsoid([rx * 0.55, cy + ry * 0.62, bz - 0.2], [1.4 + 0.3 * stage, ry * 0.34, rz * 0.95], BODY, true); // cuisses

  // --- cou musclé : masse à la base, s'affine vers la tête ; crête sur le dessus
  const hy = cy - ry - 2.6 * k;
  const hz = bz + 4.2 * k;
  m.capsule([cx, cy - ry * 0.6, bz + rz * 0.5], [cx, hy + 1.2, hz - 0.8], 2.3 * k, 1.35 * k, BODY);
  m.ellipsoid([1.0 + 0.2 * stage, cy - ry * 0.78, bz + rz * 0.95], [1.3 + 0.2 * stage, 1.5 * k, 1.9 * k], BODY, true); // muscles de l'encolure
  m.capsule([cx, cy - ry * 0.55, bz + rz * 1.3], [cx, hy + 1.8, hz + 0.4], 1.2 * k, 0.9 * k, BODY); // crête du cou
  // --- tête : crâne, pommettes, museau en marche, naseaux, oreilles couchées
  const hr = stage === 1 ? 2.4 : 2.0 + stage * 0.25; // stade 1 : tête plus grosse (30–35 %)
  m.ellipsoid([cx, hy, hz], [hr, hr * 1.15, hr * 0.95], BODY); // crâne
  if (stage > 1) m.ellipsoid([hr * 0.55, hy + 1.0, hz - 0.6], [1.0 + 0.15 * stage, 1.3, 1.1], BODY, true); // pommettes (derrière les yeux)
  const front = Math.floor(hy - hr * 1.1);
  const ez = Math.round(hz + 0.3);
  m.box(c - 1, c + 1, front - 2, front + 1, ez - 2, ez, BODY); // museau
  m.box(c - 1, c + 1, front - 1, front + 2, ez, ez + 1, BODY); // chanfrein (marche vers le front)
  m.box(c - 1, c + 1, front - 2, front - 1, ez - 2, ez - 1, DARK); // naseaux
  m.box(c - 1, c + 1, front - 1, front + 1, ez - 3, ez - 2, BODY); // menton
  // yeux 2 × 2 sur l'avant des côtés de la tête ; au stade 1, pas d'arcade qui déborde (visibles depuis la caméra)
  m.box(1, 3, front + 1, front + 2, ez, ez + 2, EYE, true);
  m.box(1, 3, front + 2, front + 4, ez - 1, ez + 2, BODY, true, true); // tempes : les yeux sont posés sur la tête, pas en saillie
  if (stage > 1) m.box(1, 3, front, front + 3, ez + 2, ez + 3, BODY, true); // arcade
  m.capsule([hr * 0.7, hy + 0.8, hz + hr * 0.55], [hr * 0.7 + 1.4, hy + 2.4, hz + hr * 0.4], 0.9, 0.7, BODY, true); // oreilles

  // --- bois de glace balayés vers l'arrière (lames), qui grandissent ; meule (base) marquée
  const by = hy + 1.1; // en arrière des yeux, pour qu'on ne les confonde pas avec la glace
  const bzz = hz + hr * 0.7;
  m.ellipsoid([1.4, by, bzz], [0.9, 0.9, 0.8], BONE, true); // meules
  if (stage === 1) {
    m.capsule([1.4, by, bzz], [2.6, by + 2.0, bzz + 1.6], 0.95, 0.75, BONE, true);
  } else {
    const len = stage === 2 ? 4.5 : 6.5;
    m.capsule([1.4, by, bzz], [3.4, by + len * 0.55, bzz + len * 0.5], 1.2, 0.95, BONE, true); // lame principale
    m.capsule([3.4, by + len * 0.55, bzz + len * 0.5], [4.6, by + len, bzz + len * 0.62], 0.95, 0.75, BONE, true);
    m.capsule([2.6, by + len * 0.35, bzz + len * 0.32], [4.8, by + len * 0.45, bzz + len * 0.7], 0.85, 0.7, BONE, true); // branche
    if (stage === 3) m.capsule([3.8, by + len * 0.7, bzz + len * 0.55], [5.8, by + len * 0.85, bzz + len * 0.95], 0.85, 0.7, BONE, true); // 2e branche
  }

  // --- crinière d'éclats de glace en GROUPES séparés (nuque, garrot, épaules), qui grandit
  const groups: [number, number, number, number][] =
    stage === 1
      ? [[0.9, cy - ry * 0.85, bz + rz * 1.55, 1.1]]
      : stage === 2
        ? [
            [0.9, cy - ry * 1.12, bz + rz * 2.0, 1.3],
            [1.8, cy - ry * 0.5, bz + rz * 1.4, 1.5],
          ]
        : [
            [0.9, cy - ry * 1.3, bz + rz * 2.55, 1.4],
            [1.2, cy - ry * 0.92, bz + rz * 1.8, 1.7],
            [2.2, cy - ry * 0.42, bz + rz * 1.35, 2.0],
          ];
  // chaque entrée = une paire d'éclats (gauche / droite) : des groupes séparés par du vide, jamais une rangée continue
  for (const [lx, yy, zz, h] of groups) {
    m.capsule([lx, yy, zz], [lx + 0.4, yy + 1.1, zz + h * k], 0.95, 0.7, BONE, true);
    if (stage > 1) m.capsule([lx + 0.9, yy + 0.8, zz - 0.4], [lx + 1.4, yy + 1.6, zz + h * k * 0.6], 0.8, 0.6, BONE, true); // éclat cadet
  }

  // --- queue courte, relevée
  m.capsule([cx, cy + ry * 0.95, bz + 0.6], [cx, cy + ry + 1.8, bz + 0.9], 1.3, 1.0, BODY);
  m.capsule([cx, cy + ry + 1.8, bz + 0.9], [cx, cy + ry + 2.6, bz + 2.0], 1.0, 0.8, BODY);

  // --- pattes (mémorisées pour l'animation) : avant-bras et cuisse musclés, genou et boulet marqués, sabots fendus
  const before = m.v.slice();
  const lat = rx - 0.4;
  const fy = cy - ry * 0.55;
  const hyl = cy + ry * 0.6;
  const lr = 1.1 + stage * 0.14;
  const knee = legH * 0.5;
  // avant : avant-bras épais, genou, canon fin, boulet
  m.capsule([lat - 0.3, fy + 0.2, bz - 0.4], [lat, fy - 0.3, knee], lr * 1.55, lr * 1.05, BODY, true);
  m.ellipsoid([lat, fy - 0.3, knee], [lr * 1.1, lr * 1.15, lr * 1.0], BODY, true); // genou
  m.capsule([lat, fy - 0.3, knee], [lat, fy, 2.4], lr * 0.95, lr * 0.85, BODY, true); // canon
  // arrière : cuisse, jarret qui recule, canon
  m.capsule([lat - 0.3, hyl - 0.2, bz - 0.4], [lat, hyl + 1.0, knee + 0.3], lr * 1.6, lr * 1.1, BODY, true);
  m.ellipsoid([lat, hyl + 1.0, knee + 0.3], [lr * 1.05, lr * 1.15, lr * 1.0], BODY, true); // jarret
  m.capsule([lat, hyl + 1.0, knee + 0.3], [lat, hyl + 0.2, 2.4], lr * 0.95, lr * 0.85, BODY, true);
  for (const yy of [fy, hyl]) {
    m.ellipsoid([lat, yy, 2.6], [lr * 1.05, lr * 1.05, 0.8], CRUST, true); // fanon de givre au-dessus du sabot
    const x0 = Math.floor(lat - 1.2);
    const x1 = Math.ceil(lat + 1.2);
    const fx = Math.trunc(lat);
    m.box(x0, x1, Math.floor(yy - 1.4), Math.ceil(yy + 1.0), 0, 2, BONE, true); // sabot (sombre : 252 / 255)
    m.box(fx, fx + 1, Math.floor(yy - 1.4), Math.floor(yy - 0.4), 0, 2, 0, true); // fente du sabot, à l'avant
  }
  const legDrawn = new Uint8Array(m.v.length);
  for (let i = 0; i < m.v.length; i++) legDrawn[i] = before[i] === 0 && m.v[i] !== 0 ? 1 : 0;

  shade(m);
  const body = [DARK, BODY, CRUST];
  // lueur : bouts des bois et des éclats (stade 1), cœur d'aurore dans les bois et givre du dos ensuite
  const tipZ = stage === 1 ? bzz + 0.8 : bzz + (stage === 2 ? 3.2 : 4.4);
  const tips = groups.map(([lx, yy, zz, h]) => [lx + 0.4, yy + 1.1, zz + h * k] as const);
  m.each((i, x, y, z) => {
    if (m.v[i] !== BONE || legDrawn[i]) return;
    if (z > tipZ) m.v[i] = stage === 3 ? 242 : 241; // pointes des bois
    else if (tips.some(([tl, ty, tz]) => (Math.abs(x - cx) - tl) ** 2 + (y - ty) ** 2 + (z - tz) ** 2 <= 1.1)) m.v[i] = 241; // pointes des éclats
  });
  if (stage === 3)
    m.each((i, _x, _y, z) => {
      if (m.v[i] === BONE && !legDrawn[i] && z > bzz + 2.6 && z <= tipZ) m.v[i] = 241;
    });
  if (stage > 1) m.crack([[rx * 0.5 + 1.2, cy - ry * 0.7, bz + rz * 1.1], [rx * 0.5 + 1.8, cy - ry * 0.3, bz + rz * 0.8]], 241, 0.75, body);

  // pattes : ce qui a été dessiné pour elles, sous le ventre
  const legs = m.mask((_x, _y, z) => z < legH - 0.6);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // givre du dos, en plaques séparées (visibles d'en haut) : garrot, milieu du dos, croupe
  const spots: [number, number, number][] = [
    [rx * 0.45, cy - ry * 0.2, 0.7 + 0.25 * stage],
    [1.4, cy + ry * 0.2, 0.6 + 0.2 * stage],
    [rx * 0.55, cy + ry * 0.62, 0.7 + 0.25 * stage],
  ];
  frost(m, spots, Math.round(bz), legs);
  const out = finish(m, legs);
  topLava(out, stage === 1 ? 0.03 : stage === 2 ? 0.05 : 0.07, Math.round(bz), 'pointillé');
  return out;
}
