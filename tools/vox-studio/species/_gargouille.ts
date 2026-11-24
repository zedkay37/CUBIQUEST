/**
 * Lignée Cailloc → Granitox → Magmadrake (roche) : « gargouille ». Plan de corps : VOLANT REPLIÉ (bible §4.8, validé
 * à la porte du lot 6) : bipède accroupi et penché en avant sur des pattes courtes et griffues, AILES DE PIERRE
 * REPLIÉES DRESSÉES au-dessus des épaules (le « poignet » de l'aile dépasse au-dessus de la tête, la membrane plaquée
 * descend en triangle vers le bassin : on les lit de profil et d'en haut dès Cailloc), bras ballants aux poings de
 * pierre, queue épaisse. Ailes jamais déployées (leçon d'Ailebraise, §4.4).
 *
 * Couleurs (porte du lot 6) : un corps de granit d'une teinte, de grandes plaques claires (arcade, poitrail, épaules,
 * bord d'attaque des ailes), membranes sombres, lueur de cristal EN LIGNES (jamais en points).
 *
 * Personnalité (§4.7), qui évolue :
 * - Cailloc, BRAVE PETIT GARDIEN : poitrail bombé, menton en avant, deux crocs du bas qui dépassent, sourcils droits.
 * - Granitox, IMPASSIBLE : mâchoire carrée fermée, paupières lourdes, épaules en remparts.
 * - Magmadrake, HAUTAIN (pièce maîtresse, rare) : tête haute, double paire de cornes balayées (l'une ébréchée),
 *   collerette de plaques, cœur de cristal dans le poitrail d'où partent des veines, grandes ailes repliées aux
 *   griffes de poignet, queue aux plaques en groupes.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, PLAQUE, drawnSince, eyeRow, finish, membrane, mouth, placeEyes, shade, topLine } from './_commun';

export function gargouille(stage: 1 | 2 | 3): Model {
  const fin = stage === 3;
  const k = stage === 1 ? 1.4 : stage === 2 ? 1.7 : 2.0;
  const m = new Model(32, Math.ceil(17 * k) + 10, Math.ceil(17 * k) + 10);
  const cx = m.cx;
  const cy = m.l * 0.55;
  const legH = 2.8 * k;

  // --- tronc penché en avant
  const tz = legH + 4.6 * k;
  m.ellipsoid([cx, cy + 1.4 * k, legH + 2.4 * k], [3.0 * k, 2.6 * k, 2.4 * k], BODY); // bassin
  m.capsule([cx, cy + 1.0 * k, legH + 3.0 * k], [cx, cy - 1.2 * k, tz], 2.9 * k, 3.3 * k, BODY); // tronc
  m.ellipsoid([2.8 * k, cy - 0.8 * k, tz + 0.5 * k], [1.7 * k, 1.8 * k, 1.5 * k], BODY, true); // épaules
  // plaques claires : poitrail (bouclier) et épaulières
  m.ellipsoid([cx, cy - 2.1 * k, tz - 0.8 * k], [2.3 * k, 1.2 * k, 2.0 * k], PLAQUE); // plaque de poitrail
  m.ellipsoid([3.0 * k, cy - 0.9 * k, tz + (stage === 2 ? 1.4 : 1.0) * k], [1.5 * k, 1.6 * k, 0.9 * k], PLAQUE, true); // épaulières
  if (stage === 2) m.ellipsoid([3.6 * k, cy - 0.6 * k, tz + 1.0 * k], [1.4 * k, 1.5 * k, 1.1 * k], PLAQUE, true); // remparts

  // --- tête
  const hr = (stage === 1 ? 2.5 : stage === 2 ? 2.1 : 2.0) * k;
  const hy = cy - 3.6 * k;
  const hz = tz + (fin ? 1.8 : 0.4) * k;
  m.capsule([cx, cy - 1.6 * k, tz + 0.2 * k], [cx, hy + 0.8 * k, hz - 0.2 * k], 1.8 * k, 1.6 * k, BODY);
  m.ellipsoid([cx, hy, hz], [hr * 0.95, hr, hr * 0.85], BODY); // crâne
  m.ellipsoid([cx, hy - hr * 0.85, hz - hr * 0.35], [hr * 0.62, hr * 0.5, hr * 0.45], BODY); // museau
  m.ellipsoid([cx, hy - hr * 0.55, hz - hr * 0.78], [hr * 0.72, hr * 0.55, hr * 0.35], BODY); // mâchoire du bas
  const eo = Math.max(1, Math.round(hr * 0.42));
  const ez = Math.round(hz + hr * 0.15);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  const ey = eyeRow(m);
  // arcade claire (grande masse) : au ras de l'œil au stade 1 (yeux visibles de la caméra), en surplomb ensuite
  m.box(eo - 1, eo + 2, ey + (stage === 1 ? 0 : -1), ey + 3, ez + 2, ez + 3, PLAQUE, true);
  if (stage > 1) m.box(eo, eo + 2, ey - 1, ey, ez + 1, ez + 2, BODY, true); // paupière lourde
  const mz = Math.round(hz - hr * 0.6);
  const my = mouth(m, mz, stage === 2 ? 2 : 1, stage === 1 ? 'haut' : 'plat');
  if (stage === 1) m.box(1, 2, my, my + 1, mz + 1, mz + 3, BONE, true); // deux crocs du bas
  if (fin) {
    m.box(1, 2, my, my + 1, mz - 1, mz + 1, BONE, true);
    m.box(2, 3, my + 1, my + 2, mz - 1, mz + 1, BONE, true); // rangée de crocs
  }
  // cornes : bosses (1) → courtes (2) → double paire balayée en arrière, l'une ébréchée (3)
  if (stage === 1) m.ellipsoid([hr * 0.55, hy + hr * 0.3, hz + hr * 0.75], [1.0, 1.0, 1.0], BONE, true);
  else
    for (const [pair, L, z0, w] of fin
      ? ([
          [0, 6.2, 0.75, 1.3],
          [1, 3.0, 0.1, 0.95],
        ] as const)
      : ([[0, 2.4, 0.6, 1.1]] as const))
      for (const s of [1, -1]) {
        const chipped = fin && pair === 0 && s === -1;
        const bx = cx + s * (hr * 0.55 + pair * 0.8);
        const by = hy + hr * (0.2 + pair * 0.3);
        const bz = hz + hr * z0;
        m.capsule([bx, by, bz], [bx + s * 0.8, by + L * 0.7, bz + L * 0.4], w, w * 0.8, BONE);
        m.capsule([bx + s * 0.8, by + L * 0.7, bz + L * 0.4], [bx + s * 1.1, by + L * (chipped ? 0.95 : 1.35), bz + L * (chipped ? 0.5 : 0.75)], w * 0.8, chipped ? w * 0.75 : 0.6, BONE);
      }
  // Magmadrake : collerette de plaques derrière le crâne, en trois groupes (pas une rangée)
  if (fin)
    for (const [lx, dy, dz, r] of [
      [0, 1.6, 0.9, 1.3],
      [1.8, 1.2, 0.5, 1.1],
      [3.0, 0.6, -0.1, 0.9],
    ] as const)
      m.ellipsoid([lx > 0 ? lx * k : cx, hy + dy * k, hz + dz * k], [r * k, r * 0.7 * k, r * 1.1 * k], PLAQUE, lx > 0);

  // --- ailes repliées DRESSÉES : épaule → poignet (au-dessus de la tête) → pointe (vers le bassin), membrane sombre
  const wing = stage === 1 ? 0.62 : stage === 2 ? 0.85 : 1.15;
  const sh: [number, number, number] = [2.4 * k, cy + 0.4 * k, tz + 1.2 * k]; // épaule (omoplate)
  const wr: [number, number, number] = [3.0 * k, cy + 2.0 * k, tz + (1.2 + 4.0 * wing) * k]; // poignet en arrière des épaules (de face, ce ne sont pas des oreilles) // poignet, au-dessus de la tête
  const tip: [number, number, number] = [3.0 * k, cy + (2.2 + 3.0 * wing) * k, legH + 2.0 * k]; // pointe, en arrière
  membrane(m, sh, wr, tip, 1.8, DARK);
  m.capsule(sh, wr, 1.1 * k * (0.8 + wing * 0.2), 0.9 * k, BODY, true); // os de l'aile, de la couleur du corps (la lueur le souligne)
  m.capsule(wr, tip, 0.85 * k, 0.6 * k, BODY, true); // bord de fuite
  m.capsule([wr[0], wr[1], wr[2]], [wr[0] + 0.4, wr[1] - 1.2, wr[2] + 0.6], 0.8, 0.6, BONE, true); // griffe du poignet
  if (fin) m.capsule([sh[0] + 0.3, (sh[1] + wr[1]) / 2 + 0.6, (sh[2] + wr[2]) / 2], [tip[0] - 0.2, tip[1] - 1.0, tip[2] + 2.0], 0.75, 0.6, BODY, true); // doigt de l'aile

  // --- bras ballants, poings de pierre, griffes
  m.capsule([3.4 * k, cy - 1.2 * k, tz], [4.0 * k, cy - 2.2 * k, legH + 2.0 * k], 1.3 * k, 1.1 * k, BODY, true);
  m.capsule([4.0 * k, cy - 2.2 * k, legH + 2.0 * k], [3.8 * k, cy - 3.0 * k, legH + 0.4 * k], 1.1 * k, 1.0 * k, BODY, true);
  m.ellipsoid([3.8 * k, cy - 3.0 * k, legH + 1.4 * k], [1.2 * k, 1.0 * k, 0.8 * k], PLAQUE, true); // plaque d'avant-bras
  m.ellipsoid([3.8 * k, cy - 3.2 * k, legH + 0.2 * k], [1.3 * k, 1.3 * k, 1.1 * k], BODY, true); // poing
  m.box(Math.floor(3.2 * k), Math.ceil(4.4 * k), Math.floor(cy - 4.6 * k), Math.floor(cy - 4.0 * k), Math.max(0, Math.floor(legH - 0.6 * k)), Math.ceil(legH + 0.4 * k), BONE, true);
  // --- queue épaisse ; Magmadrake : plaques en groupes sur la queue
  m.capsule([cx, cy + 3.6 * k, legH + 2.2 * k], [cx, cy + 6.4 * k, legH + 0.8 * k], 1.6 * k, 0.9 * k, BODY);
  if (fin)
    for (const t of [0.35, 0.7])
      m.capsule([cx, cy + (3.6 + 2.8 * t) * k, legH + (2.2 - 1.4 * t) * k + 1.4 * k], [cx, cy + (3.6 + 2.8 * t) * k + 1.2, legH + (2.2 - 1.4 * t) * k + 2.6 * k], 1.0, 0.7, PLAQUE);

  // --- pattes : cuisses épaisses, genou, pieds à griffes
  const before = m.v.slice();
  const lat = 2.2 * k;
  const lr = 1.4 * k;
  m.capsule([lat, cy + 1.2 * k, legH + 1.6 * k], [lat + 0.3, cy + 0.2 * k, legH * 0.45], lr * 1.25, lr, BODY, true);
  m.capsule([lat + 0.3, cy + 0.2 * k, legH * 0.45], [lat + 0.3, cy + 0.6 * k, 1.2], lr, lr * 0.85, BODY, true);
  const fx0 = Math.floor(lat + 0.3 - lr);
  const fx1 = Math.ceil(lat + 0.3 + lr);
  const fy0 = Math.floor(cy - 1.0 * k);
  m.box(fx0, fx1, fy0, Math.ceil(cy + 1.6 * k), 0, 2, BODY, true);
  for (const tx of [fx0, Math.floor((fx0 + fx1) / 2), fx1 - 1]) m.box(tx, tx + 1, fy0 - 1, fy0, 0, 1, BONE, true);
  const legDrawn = drawnSince(m, before);

  shade(m);
  const body = [DARK, BODY, CRUST, PLAQUE];
  // lueur de cristal EN LIGNES : fissure du front → bord des ailes → cœur du poitrail et veines
  m.crack([[0.5, hy - hr * 0.7, hz + hr * 0.55], [0.5, hy + hr * 0.3, hz + hr * 0.95]], 241, 0.7, body);
  // veines de cristal dans les membranes des ailes (de profil et de 3/4)
  if (stage > 1) {
    const mid = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (const t of fin ? [0.3, 0.6, 0.85] : [0.45, 0.8]) m.crack([mid(sh, wr, 0.15), mid(wr, tip, t)], 241, 0.75, [DARK]);
  }
  // vues d'en haut : crête du crâne, os des ailes, ligne du dos entre les ailes (en deux tronçons)
  topLine(m, [[0.5, hy - hr * 0.6], [0.5, hy + hr * 0.6]], 0.45 + 0.2 * stage, 241, body, Math.round(hz));
  topLine(m, [[sh[0], sh[1]], [wr[0], wr[1]]], 0.7, 241, [BODY, CRUST, DARK], Math.round(tz + 2 * k)); // os des ailes, lumineux vu d'en haut
  topLine(m, [[0.5, cy - 0.8 * k], [0.5, cy + 0.8 * k]], 0.45 + 0.2 * stage, stage === 1 ? 241 : 242, [DARK, BODY, CRUST], Math.round(tz));
  if (stage > 1) topLine(m, [[0.5, cy + 1.8 * k], [0.5, cy + 3.2 * k]], 0.45 + 0.2 * stage, 241, [DARK, BODY, CRUST], Math.round(legH + 2 * k));
  if (fin) {
    m.crack([[0.5, cy - 3.2 * k, tz - 1.0 * k], [0.5, cy - 3.2 * k, tz - 0.2 * k]], 242, 1.0, body); // cœur de cristal
    m.crack([[0.5, cy - 3.2 * k, tz - 0.6 * k], [1.6 * k, cy - 2.9 * k, tz + 0.6 * k], [2.6 * k, cy - 2.0 * k, tz + 1.4 * k]], 241, 0.7, body); // veines du poitrail
    m.crack([[0.5, cy - 3.2 * k, tz - 0.6 * k], [1.4 * k, cy - 3.0 * k, tz - 2.0 * k], [2.4 * k, cy - 2.6 * k, legH + 2.0 * k]], 241, 0.7, body);
    topLine(m, [[0.5, cy + 4.2 * k], [0.5, cy + 6.0 * k]], 0.45 + 0.2 * stage, 241, [DARK, BODY, CRUST], 1); // queue
  }
  const legs = m.mask((_x, _y, z) => z < legH - 0.2);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  return finish(m, legs);
}
