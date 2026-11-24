/**
 * Lignée Psycube → Lunabloc → Aetherion (psychique) : « veilleur de pierre de lune ». Plan de corps : FLOTTEUR (bible
 * §4.8 ; le moteur le fait planer) : pas de pattes ; un corps en goutte renversée (large en haut, pointe en bas), une
 * tête ronde au visage lisible, deux nageoires-mains, une traîne de cristal qui pend sous lui. Autour de lui flottent
 * des objets immobiles (signature) : petits cailloux → satellites cubiques → éclats géométriques, toujours en groupes.
 * Interdits évités (§4.6) : le croissant est DANS LE DOS (une crête courbe), pas une couronne ; aucun objet fabriqué.
 *
 * Couleurs : pierre de lune claire en grandes masses, plaques d'obsidienne (front, épaules, croissant), lueur violette
 * en lignes. Personnalité (§4.7), qui évolue :
 * - Psycube, MÉTICULEUX ET CURIEUX (« réorganise de petits cailloux ») : tête penchée vers ses cailloux rangés en
 *   rang (asymétrie : ils sont tous d'un côté), grands yeux, petite bouche concentrée.
 * - Lunabloc, VANITEUX : menton levé, sourire satisfait, croissant d'obsidienne dans le dos, satellites cubiques.
 * - Aetherion, SAGE ET DISTANT : grands yeux mi-clos, front haut aux nervures, couronne d'éclats en orbite très au
 *   large (pas sur la tête), longue traîne.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, OBSIDIENNE, eyeRow, finish, mouth, placeEyes, shade, topLine } from './_commun';

export function flotteur(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1.35 : stage === 2 ? 1.6 : 1.9;
  const m = new Model(30, Math.ceil(14 * k) + 10, Math.ceil(16 * k) + 6);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = m.l * 0.5;
  const base = stage === 3 ? 3.0 : 2.0; // la pointe touche presque le sol (le moteur le fait planer)

  // --- corps en goutte renversée : traîne pointue en bas, ventre, épaules larges
  const bz = base + (stage === 3 ? 5.8 : 5.0) * k;
  m.capsule([cx, cy + 0.4 * k, base], [cx, cy, bz - 1.0 * k], 0.9, 2.4 * k, BODY); // traîne
  m.ellipsoid([cx, cy, bz], [3.0 * k, 2.6 * k, 2.8 * k], BODY); // ventre
  m.ellipsoid([2.4 * k, cy, bz + 1.6 * k], [1.5 * k, 1.6 * k, 1.3 * k], OBSIDIENNE, true); // épaulières d'obsidienne
  // --- tête ronde, portée devant ; Lunabloc lève le menton, Psycube la penche (le cou part de travers)
  const hr = (stage === 1 ? 2.8 : 2.5) * k;
  const hy = cy - 1.4 * k;
  const hz = bz + 3.6 * k + (stage === 2 ? 0.4 * k : 0);
  m.ellipsoid([cx, hy, hz], [hr, hr * 0.92, hr * 0.9], BODY);
  m.ellipsoid([cx, hy + 0.2 * k, hz + hr * 0.55], [hr * 0.75, hr * 0.7, hr * 0.45], OBSIDIENNE); // plaque d'obsidienne du front
  // yeux 2 × 2 sur la face avant, sous la plaque du front
  const eo = Math.max(1, Math.round(hr * 0.36));
  const ez = Math.round(hz + hr * 0.05);
  placeEyes(m, eo, stage === 3 ? ez - 1 : ez, m.l, EYE, stage === 3 ? 3 : 2); // harmonisation : grands yeux pour Aetherion
  const ey = eyeRow(m);
  if (stage === 3) m.box(eo, eo + 2, ey - 1, ey, ez + 1, ez + 2, BODY, true); // paupières mi-closes (sage)
  const mz = Math.round(hz - hr * 0.45);
  mouth(m, mz, 1, stage === 2 ? 'haut' : 'plat');
  if (stage === 2) m.box(c + 1, c + 2, ey, ey + 1, mz + 1, mz + 2, DARK); // sourire satisfait, de travers
  // --- nageoires-mains (de part et d'autre du ventre)
  m.capsule([3.0 * k, cy - 0.4 * k, bz + 0.6 * k], [4.2 * k, cy - 1.4 * k, bz - 1.0 * k], 1.0 * k, 0.7 * k, BODY, true);
  m.ellipsoid([4.3 * k, cy - 1.6 * k, bz - 1.2 * k], [0.9 * k, 0.9 * k, 0.8 * k], BONE, true); // main de nacre

  // --- signature en orbite (immobile), toujours en groupes
  if (stage === 1) {
    // cailloux rangés en ligne, d'un seul côté (méticuleux) : il les regarde
    for (const [x, y, z] of [
      [cx - 5.2 * k, cy - 2.6 * k, bz + 1.0 * k],
      [cx - 5.0 * k, cy - 1.0 * k, bz + 1.0 * k],
      [cx - 4.8 * k, cy + 0.6 * k, bz + 1.0 * k],
    ])
      m.ellipsoid([x, y, z], [0.95, 0.95, 0.85], OBSIDIENNE);
  } else if (stage === 2) {
    // croissant d'obsidienne dans le dos (crête courbe, pas une couronne) et satellites cubiques
    for (let j = 0; j <= 8; j++) {
      const a = Math.PI * (0.15 + 0.7 * (j / 8));
      m.ellipsoid([cx, cy + 1.6 * k + Math.sin(a) * 2.2 * k, bz + 0.6 * k + Math.cos(a) * -3.6 * k + 3.6 * k], [0.9, 0.9 + (1 - Math.abs(j - 4) / 4) * 0.6, 0.9], OBSIDIENNE);
    }
    for (const [x, y, z] of [
      [cx + 5.0 * k, cy - 1.0 * k, hz + 0.4 * k],
      [cx - 5.0 * k, cy + 0.8 * k, bz + 0.6 * k],
    ])
      m.box(Math.round(x) - 1, Math.round(x) + 1, Math.round(y) - 1, Math.round(y) + 1, Math.round(z) - 1, Math.round(z) + 1, BONE);
  } else {
    // éclats géométriques en trois groupes, très au large (pas au-dessus de la tête), et longue traîne en voile
    for (const [ang, h] of [
      [0.6, 1.0],
      [2.7, 0.4],
      [4.6, 0.7],
    ])
      for (const [da, dz] of [
        [0, 0],
        [0.28, 1.4],
      ]) {
        const x = cx + Math.cos(ang + da) * 4.4 * k;
        const y = cy + Math.sin(ang + da) * 4.4 * k;
        const z = bz + h * 2.4 * k + dz;
        m.capsule([x, y, z - 1.2], [x, y, z + 1.4], 1.0, 0.6, BONE);
      }
    m.capsule([cx, cy + 1.4 * k, bz - 0.6 * k], [cx, cy + 2.4 * k, bz - 3.0 * k], 1.6 * k, 0.9, BODY); // voile de traîne, court (ne pas lire une jambe)
  }

  shade(m);
  m.recolor(m.neighborsEmpty(0, 0, -1), [OBSIDIENNE], OBSIDIENNE);
  const body = [DARK, BODY, CRUST, OBSIDIENNE];
  // lueur en lignes : nervures du front (vues d'en haut), ligne du dos, cœur dans le ventre
  topLine(m, [[0.5, hy - hr * 0.6], [hr * 0.45, hy + hr * 0.1], [0.5, hy + hr * 0.6]], 0.3 + 0.1 * stage, 241, body, Math.round(hz + hr * 0.5));
  topLine(m, [[0.5, cy - 0.4 * k], [0.5, cy + 1.6 * k]], 0.3 + 0.1 * stage, stage === 3 ? 242 : 241, body, Math.round(bz));
  if (stage > 1) m.crack([[0.5, cy - 2.6 * k, bz - 0.4 * k], [0.5, cy - 2.6 * k, bz + 0.6 * k]], 242, 0.7, [DARK, BODY, CRUST]); // cœur du ventre, de face
  if (stage > 1)
    m.each((i, _x, _y, _z, xi, yi, zi) => {
      if (m.v[i] === BONE && m.get(xi, yi, zi + 1) === 0 && zi > bz && (stage === 3 || zi > hz)) m.v[i] = 241; // dessus des éclats (et du satellite haut)
    });
  return finish(m, new Uint8Array(m.v.length)); // aucune patte : il flotte
}
