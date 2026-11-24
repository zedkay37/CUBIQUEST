/**
 * Lignée Cailloc → Granitox → Magmadrake (roche) : « gargouille ». Plan de corps : VOLANT REPLIÉ (bible §4.8) :
 * bipède accroupi et penché en avant sur des pattes courtes et griffues, ailes de pierre repliées très haut sur le dos
 * (leurs pointes dépassent au-dessus des épaules), bras ballants aux poings de pierre, queue courte et épaisse.
 * Distinct du marcheur de forge (feu : dressé, grosse queue au sol) et du golem de glace (dressé, sans ailes).
 * Ailes repliées et plaquées (jamais déployées : leçon d'Ailebraise, §4.4).
 *
 * Personnalité (§4.7), qui évolue :
 * - Cailloc, BRAVE PETIT GARDIEN (« adore protéger son escouade ») : poitrail bombé, menton en avant, deux crocs
 *   qui dépassent de la mâchoire du bas, sourcils droits et décidés, petits moignons d'ailes.
 * - Granitox, IMPASSIBLE (« forteresse vivante ») : mâchoire carrée fermée, paupières lourdes, épaules en remparts.
 * - Magmadrake, HAUTAIN (« seigneur ») : tête haute, cornes balayées en arrière, regard mi-clos, une corne ébréchée
 *   (asymétrie), ailes repliées immenses aux bords de cristal lumineux.
 * Signature qui grandit : fissure de cristal au front → veines de cristal sur les épaules → veines sur le poitrail et
 * bords des ailes (lueur de cristal froid, langue « roche » validée le 23/11). Détails de matière : lichen sur le dos,
 * strates claires du granit, griffes d'os.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, LICHEN, drawnSince, eyeRow, finish, mouth, placeEyes, shade, topLava, topPatches } from './_commun';

export function gargouille(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1.4 : stage === 2 ? 1.7 : 2.0;
  const m = new Model(30, Math.ceil(17 * k) + 8, Math.ceil(17 * k) + 8);
  const cx = m.cx;
  const cy = m.l * 0.55;
  const legH = 2.8 * k;

  // --- tronc penché en avant : épaules hautes devant, bassin bas derrière
  const tz = legH + 4.6 * k;
  m.ellipsoid([cx, cy + 1.4 * k, legH + 2.4 * k], [3.0 * k, 2.6 * k, 2.4 * k], BODY); // bassin
  m.capsule([cx, cy + 1.0 * k, legH + 3.0 * k], [cx, cy - 1.2 * k, tz], 2.9 * k, 3.3 * k, BODY); // tronc penché
  m.ellipsoid([cx, cy - 1.8 * k, tz - 0.6 * k], [2.6 * k, 1.6 * k, 2.2 * k], BODY); // poitrail bombé
  m.ellipsoid([2.8 * k, cy - 0.8 * k, tz + 0.5 * k], [1.7 * k, 1.8 * k, 1.5 * k], BODY, true); // épaules
  if (stage === 2) m.ellipsoid([3.3 * k, cy - 0.6 * k, tz + 0.9 * k], [1.6 * k, 1.6 * k, 1.2 * k], BODY, true); // épaules en remparts

  // --- tête portée devant, basse (Magmadrake la relève : hautain)
  const hr = (stage === 1 ? 2.4 : stage === 2 ? 2.1 : 2.0) * k;
  const hy = cy - 3.6 * k;
  const hz = tz + (stage === 3 ? 1.6 : 0.4) * k;
  m.capsule([cx, cy - 1.6 * k, tz + 0.2 * k], [cx, hy + 0.8 * k, hz - 0.2 * k], 1.8 * k, 1.6 * k, BODY); // cou court
  m.ellipsoid([cx, hy, hz], [hr * 0.95, hr, hr * 0.85], BODY); // crâne
  m.ellipsoid([cx, hy - hr * 0.85, hz - hr * 0.35], [hr * 0.62, hr * 0.5, hr * 0.45], BODY); // museau
  m.ellipsoid([cx, hy - hr * 0.55, hz - hr * 0.75], [hr * 0.7, hr * 0.55, hr * 0.35], BODY); // mâchoire du bas (en avant)
  const eo = Math.max(1, Math.round(hr * 0.42));
  const ez = Math.round(hz + hr * 0.15);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  const ey = eyeRow(m);
  // sourcils / arcade : droits et décidés (brave) ; lourds (impassible) ; mi-clos (hautain)
  m.box(eo - (stage === 1 ? 0 : 1), eo + 2, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true);
  if (stage > 1) m.box(eo, eo + 2, ey - 1, ey, ez + 1, ez + 2, BODY, true); // paupière qui couvre le haut de l'œil
  const mz = Math.round(hz - hr * 0.55);
  const my = mouth(m, mz, stage === 2 ? 2 : 1, stage === 1 ? 'haut' : 'plat');
  if (stage === 1) m.box(1, 2, my, my + 1, mz + 1, mz + 3, BONE, true); // deux crocs du bas, qui dépassent
  if (stage === 3) m.box(1, 2, my, my + 1, mz - 1, mz + 1, BONE, true);
  // cornes : bosses (1) → cornes courtes (2) → grandes cornes balayées (3), l'une ébréchée
  if (stage === 1) m.ellipsoid([hr * 0.55, hy + hr * 0.3, hz + hr * 0.75], [0.9, 0.9, 0.9], BONE, true);
  else {
    const L = stage === 2 ? 2.2 : 4.6;
    for (const s of [1, -1]) {
      const chipped = stage === 3 && s === -1;
      m.capsule([cx + s * hr * 0.55, hy + hr * 0.2, hz + hr * 0.6], [cx + s * (hr * 0.75 + 0.6), hy + hr * 0.2 + L * 0.7, hz + hr * 0.6 + L * 0.45], 1.1, 0.9, BONE);
      m.capsule(
        [cx + s * (hr * 0.75 + 0.6), hy + hr * 0.2 + L * 0.7, hz + hr * 0.6 + L * 0.45],
        [cx + s * (hr * 0.75 + 1.0), hy + hr * 0.2 + L * (chipped ? 0.95 : 1.3), hz + hr * 0.6 + L * (chipped ? 0.6 : 0.85)],
        0.9,
        chipped ? 0.85 : 0.6,
        BONE,
      );
    }
  }

  // --- ailes repliées très haut sur le dos : un « coude » de pierre au-dessus de l'épaule, la pointe vers l'arrière
  const wl = stage === 1 ? 1.6 : stage === 2 ? 3.6 : 5.6;
  const wx = 2.2 * k;
  m.capsule([wx, cy + 0.2 * k, tz + 0.8 * k], [wx + 0.6, cy - 0.6 * k, tz + 0.8 * k + wl], 1.2 * k, 0.95 * k, BODY, true); // bras de l'aile, qui monte
  if (stage > 1) {
    m.capsule([wx + 0.6, cy - 0.6 * k, tz + 0.8 * k + wl], [wx + 0.2, cy + 3.4 * k, tz - 0.6 * k], 0.95 * k, 0.8 * k, BODY, true); // bord qui redescend vers l'arrière
    m.ellipsoid([wx - 0.2, cy + 1.6 * k, tz + 0.6 * k + wl * 0.4], [0.9, 2.2 * k, wl * 0.45 + 0.6], DARK, true); // membrane repliée, plaquée
  }
  // --- bras ballants, poings de pierre près du sol (mais il tient sur ses jambes)
  m.capsule([3.4 * k, cy - 1.2 * k, tz], [4.0 * k, cy - 2.2 * k, legH + 2.0 * k], 1.3 * k, 1.1 * k, BODY, true);
  m.capsule([4.0 * k, cy - 2.2 * k, legH + 2.0 * k], [3.8 * k, cy - 3.0 * k, legH + 0.4 * k], 1.1 * k, 1.0 * k, BODY, true);
  m.ellipsoid([3.8 * k, cy - 3.2 * k, legH + 0.2 * k], [1.3 * k, 1.3 * k, 1.1 * k], BODY, true); // poing
  m.box(Math.floor(3.2 * k), Math.ceil(4.4 * k), Math.floor(cy - 4.6 * k), Math.floor(cy - 4.0 * k), Math.max(0, Math.floor(legH - 0.6 * k)), Math.ceil(legH + 0.4 * k), BONE, true); // griffes
  // --- queue courte et épaisse
  m.capsule([cx, cy + 3.6 * k, legH + 2.2 * k], [cx, cy + 6.0 * k, legH + 0.8 * k], 1.6 * k, 0.9 * k, BODY);

  // --- pattes courtes, cuisses épaisses, pieds griffus
  const before = m.v.slice();
  const lat = 2.2 * k;
  const lr = 1.4 * k;
  m.capsule([lat, cy + 1.2 * k, legH + 1.6 * k], [lat + 0.3, cy + 0.2 * k, legH * 0.45], lr * 1.2, lr, BODY, true);
  m.capsule([lat + 0.3, cy + 0.2 * k, legH * 0.45], [lat + 0.3, cy + 0.6 * k, 1.2], lr, lr * 0.85, BODY, true);
  const fx0 = Math.floor(lat + 0.3 - lr);
  const fx1 = Math.ceil(lat + 0.3 + lr);
  const fy0 = Math.floor(cy - 1.0 * k);
  m.box(fx0, fx1, fy0, Math.ceil(cy + 1.6 * k), 0, 2, BODY, true);
  for (const tx of [fx0, fx1 - 1]) m.box(tx, tx + 1, fy0 - 1, fy0, 0, 1, BONE, true); // griffes
  const legDrawn = drawnSince(m, before);

  shade(m);
  // strates claires du granit : une bande plus claire tous les trois rangs, sur les flancs (pas sur le dessus)
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (m.v[i] === BODY && !legDrawn[i] && zi % 3 === 0 && m.get(xi, yi, zi + 1) !== 0) m.v[i] = CRUST;
  });
  const body = [DARK, BODY, CRUST];
  // fissure de cristal au front (1) → épaules (2) → poitrail et bords d'ailes (3) ; lueur visible d'en haut
  m.crack([[0.5, hy - hr * 0.6, hz + hr * 0.7], [0.5, hy + hr * 0.2, hz + hr * 0.95]], 241, 0.7, body);
  m.crack([[0.5, hy - hr * 0.2, hz + hr * 0.9], [0.5, hy, hz + hr * 0.95]], 242, 0.75, [241]);
  if (stage > 1) {
    m.crack([[1.6 * k, cy - 1.8 * k, tz + 1.6 * k], [3.0 * k, cy - 0.6 * k, tz + 2.0 * k], [3.6 * k, cy + 0.6 * k, tz + 1.2 * k]], 241, 0.75, body);
  }
  if (stage === 3) {
    m.crack([[0.5, cy - 3.2 * k, tz - 2.2 * k], [1.4 * k, cy - 3.0 * k, tz - 0.6 * k], [2.4 * k, cy - 2.4 * k, tz + 0.6 * k]], 241, 0.75, body); // poitrail en V
    m.crack([[wx + 0.6, cy - 0.6 * k, tz + 0.8 * k + wl], [wx + 0.3, cy + 2.4 * k, tz + 0.4 * k]], 241, 0.8, body); // bord des ailes
    m.crack([[wx + 0.6, cy - 0.6 * k, tz + 0.8 * k + wl - 0.6], [wx + 0.6, cy - 0.2 * k, tz + 0.8 * k + wl - 2.0]], 242, 0.8, [241]);
  }
  const legs = m.mask((_x, _y, z) => z < legH - 0.2);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // lichen sur le dos (détail de matière, vu d'en haut), en plaques
  topPatches(
    m,
    [
      [1.2, cy + 1.6 * k, 1.0 + 0.4 * stage],
      [2.6 * k, cy + 3.0 * k, 0.8 + 0.3 * stage],
    ],
    Math.round(legH + 2 * k),
    legs,
    LICHEN,
  );
  const out = finish(m, legs);
  topLava(out, stage === 1 ? 0.03 : stage === 2 ? 0.05 : 0.065, Math.round(tz), 'pointillé'); // veines de cristal vues d'en haut
  return out;
}
