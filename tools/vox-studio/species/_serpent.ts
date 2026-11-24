/**
 * Lignée Crépitil → Serpéclair → Tempestrix (électrique) : « serpent d'orage ». Plan de corps : SERPENTIN sans pattes
 * (bible §4.8), le corps posé en S sur le sol, l'avant dressé ; ventre de quartz en écailles larges, dos d'ardoise
 * barré de bandes de cuivre. Rien ne bouge (pas de pattes) : il glisse.
 *
 * Personnalité (§4.7), qui évolue :
 * - Crépitil, NERVEUX : tête haute sur un cou tendu, yeux grands ouverts, petite crête hérissée en groupe, bouche
 *   pincée.
 * - Serpéclair, ESPIÈGLE : sourire de travers (un coin relevé), une nageoire dorsale pliée (asymétrie), tête penchée.
 * - Tempestrix, ORAGEUX : dressé comme un cobra, collerette de nageoires autour du cou, arcade lourde, gueule
 *   entrouverte aux crocs de quartz.
 * Signature qui grandit : points lumineux du dos en groupes → nageoires d'éclair qui s'allument par groupes (« comme
 * un compte à rebours ») → collerette à nervures lumineuses.
 * Interdits évités (§4.6) : pas de rangée continue du cou à la queue (groupes séparés), pas de couronne (la
 * collerette est sur les côtés du cou, pas au-dessus de la tête), pas de moustaches ni de gueule géante.
 */
import { EYE, Model, type V3 } from '../voxlib';
import { BODY, BONE, COPPER, CRUST, DARK, finish, placeEyes, shade } from './_commun';

export function serpent(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1 : stage === 2 ? 1.22 : 1.38;
  const m = new Model(26, 36, Math.ceil(26 * k) + 2);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const r0 = (stage === 3 ? 2.7 : 2.5) * k; // rayon du corps au cou
  const neckH = (stage === 1 ? 11.5 : stage === 2 ? 13.5 : 17.0) * k; // hauteur de la tête

  // --- le S posé au sol, de la base du cou au bout de la queue (x : décalage, y : longueur), en rayons décroissants
  const s = stage === 1 ? 0.85 : stage === 2 ? 0.95 : 1;
  const sx = 1; // amplitude du S (largeur)
  const path: V3[] = [
    [0, 6.0, r0],
    [4.4 * sx, 9.5 * s + 1, r0 * 0.95],
    [4.2 * sx, 14 * s + 1, r0 * 0.9],
    [-3.8 * sx, 18 * s + 1, r0 * 0.85],
    [-4.2 * sx, 23 * s + 1, r0 * 0.75],
    [1.6 * sx, 27 * s + 1, r0 * 0.6],
    [3.6 * sx, 31 * s + 1, r0 * 0.4],
  ];
  const rad = (j: number) => r0 * (1 - j * 0.12);
  for (let j = 0; j + 1 < path.length; j++) {
    const [ax, ay, az] = path[j];
    const [bx, by, bz] = path[j + 1];
    m.capsule([cx + ax, ay, Math.max(az, rad(j))], [cx + bx, by, Math.max(bz, rad(j + 1))], rad(j), Math.max(0.8, rad(j + 1)), BODY);
  }
  // --- cou dressé : de la base du S à la tête ; Serpéclair penche un peu la tête (asymétrie du cou, pas des yeux)
  const tilt = stage === 2 ? 0.8 : 0;
  const hy = stage === 3 ? 4.6 : 3.6;
  // cou en col de cygne : il monte en reculant, puis se penche en avant vers la tête
  m.capsule([cx, 6.0, r0], [cx + tilt * 0.4, 9.0, neckH * 0.45], r0, r0 * 0.92, BODY);
  m.capsule([cx + tilt * 0.4, 9.0, neckH * 0.45], [cx + tilt, 8.4, neckH * 0.78], r0 * 0.92, r0 * 0.85, BODY);
  m.capsule([cx + tilt, 8.4, neckH * 0.78], [cx, hy + 1.0, neckH - 0.6], r0 * 0.85, r0 * 0.8, BODY);
  // --- tête : crâne en coin, museau
  const hr = (stage === 1 ? 2.9 : 2.7) * k;
  const hz = neckH;
  m.ellipsoid([cx, hy, hz], [hr * 0.9, hr, hr * 0.8], BODY);
  m.ellipsoid([cx, hy - hr * 0.9, hz - hr * 0.25], [hr * 0.6, hr * 0.6, hr * 0.5], BODY); // museau
  const eo = Math.max(1, Math.round(hr * 0.4));
  const ez = Math.round(hz + hr * 0.15);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === EYE) ey = Math.min(ey, yi);
  });
  // paupières / arcade : grands ouverts (rien au-dessus, nerveux) ; arcade lourde (orageux)
  if (stage === 3) m.box(eo, eo + 2, ey - 1, ey + 1, ez + 2, ez + 3, BODY, true); // arcade lourde, juste au-dessus des yeux
  // bouche
  const mz = Math.round(hz - hr * 0.45);
  let my = 0;
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, mz) !== 0) {
      my = yi;
      break;
    }
  if (stage === 1) m.box(c - 1, c + 1, my, my + 1, mz, mz + 1, DARK); // bouche pincée
  else if (stage === 2) {
    m.box(c - 2, c + 2, my, my + 1, mz, mz + 1, DARK);
    m.box(c + 2, c + 3, my + 1, my + 2, mz + 1, mz + 2, DARK); // un seul coin relevé : sourire de travers
  } else {
    m.box(c - 2, c + 2, my, my + 2, mz - 1, mz + 1, DARK); // gueule entrouverte
    m.box(1, 2, my, my + 1, mz - 1, mz, BONE, true); // crocs de quartz
  }
  // --- crête : petit groupe d'épines hérissées (nerveux) → nageoires dorsales en groupes → collerette
  if (stage === 1)
    for (const [lx, dy, h] of [
      [0.6, 0.8, 1.8],
      [1.4, 1.6, 1.3],
    ] as const)
      m.capsule([lx, hy + dy, hz + hr * 0.6], [lx + 0.3, hy + dy + 1.2, hz + hr * 0.6 + h], 0.75, 0.6, BODY, true);
  const fins: [number, number][] = stage === 1 ? [] : stage === 2 ? [[1, 1.1], [3, 1.0], [5, 0.8]] : [[1, 1.3], [2, 1.2], [4, 1.1], [5, 0.9]];
  for (const [j, h] of fins) {
    const [ax, ay] = path[j];
    const zz = rad(j) * 2 - 0.4;
    const fold = stage === 2 && j === 3; // une nageoire pliée (asymétrie)
    m.capsule([cx + ax, ay - 0.8, zz], [cx + ax + (fold ? 1.6 : 0), ay + 1.4, zz + (fold ? 1.0 : 2.4 * h * k)], 0.9, 0.7, COPPER);
    m.capsule([cx + ax, ay + 0.4, zz], [cx + ax + (fold ? 1.8 : 0), ay + 2.2, zz + (fold ? 0.8 : 1.6 * h * k)], 0.85, 0.65, COPPER);
  }
  if (stage === 3)
    // collerette : nageoires en éventail sur les côtés du cou (pas au-dessus de la tête)
    for (const [dz, out] of [
      [-2.6, 4.2],
      [-0.6, 5.0],
      [1.4, 4.0],
    ] as const)
      m.capsule([1.2, hy + 2.0, hz + dz], [1.2 + out, hy + 3.2, hz + dz - 0.6], 0.95, 0.7, COPPER, true);

  shade(m);
  // ventre de quartz : écailles larges sur l'avant du cou dressé
  m.each((i, x, y, z, xi, yi) => {
    if (![BODY, DARK, CRUST].includes(m.v[i]) || Math.abs(x - cx) > r0 * 0.45) return;
    if (z > r0 * 1.2 && z < hz - hr * 0.6 && m.get(xi, yi - 1, Math.floor(z)) === 0 && y < 11) m.v[i] = Math.floor(z) % 3 === 0 ? CRUST : BONE;
  });
  // bandes de cuivre sur le dos du S (une bande sur trois tronçons) : détail de matière vu d'en haut
  m.each((i, _x, y, _z, xi, yi, zi) => {
    if (m.v[i] === CRUST && m.get(xi, yi, zi + 1) === 0 && Math.floor(y) % 5 < 2 && y > 8) m.v[i] = COPPER; // bandes larges (porte du lot 5)
  });
  // lueur : points du dos en groupes (pointillé) ; nageoires et collerette : bords lumineux
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (m.v[i] !== CRUST || m.get(xi, yi, zi + 1) !== 0 || y < 8) return;
    const grp = Math.floor(y / 5);
    const inGroup = Math.floor(y) % 5 < 2;
    if (inGroup && grp % (stage === 1 ? 3 : 2) === (stage === 1 ? 0 : 1) && Math.abs(x - cx) < 6) m.v[i] = 241;
  });
  // éclairs visibles d'en haut (porte du lot 5) : traits obliques cyan sur le dos, entre les bandes de cuivre
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (m.v[i] !== CRUST || m.get(xi, yi, zi + 1) !== 0 || y < 8) return;
    if ((Math.floor(y) + Math.floor(Math.abs(x - cx))) % (stage === 1 ? 7 : 5) === 0) m.v[i] = 241;
  });
  // zigzag sur le crâne
  m.crack([[0.5, hy - hr * 0.6, hz + hr * 0.75], [hr * 0.45, hy - hr * 0.1, hz + hr * 0.8], [0.5, hy + hr * 0.4, hz + hr * 0.75]], 242, 0.75, [BODY, CRUST]);
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (m.v[i] === COPPER && m.get(xi, yi, zi + 1) === 0 && zi > r0 * 2.2) m.v[i] = stage === 3 ? 242 : 241; // crêtes des nageoires
  });
  if (stage === 1)
    m.each((i, _x, _y, z) => {
      if ([BODY, CRUST].includes(m.v[i]) && z > hz + hr * 0.6 + 2.0) m.v[i] = 241; // pointes des épines de la crête
    });
  if (stage === 3) m.crack([[1.8, hy + 2.6, hz - 0.6], [4.6, hy + 3.4, hz - 1.0]], 241, 0.7, [COPPER]); // nervure de collerette
  return finish(m, new Uint8Array(m.v.length)); // aucune patte
}
