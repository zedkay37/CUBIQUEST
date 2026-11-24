/**
 * Lignée Ampoulin → Bobinard → Voltacier (électrique) : « scarabée-pile ». Plan de corps : BIPÈDE dressé (bible §4.8),
 * gros abdomen rond, thorax, deux élytres de cuivre sur le dos, antennes-filaments, bras courts à trois griffes.
 * Rien de fabriqué (§4.6) : la « pile » est un ventre de quartz vivant, le « câble » une antenne.
 *
 * Personnalité (§4.7), qui évolue :
 * - Ampoulin, CURIEUX : grands yeux, sourcils hauts, bouche en « o », une antenne dressée et l'autre recourbée en avant
 *   (asymétrie), tête un peu en avant.
 * - Bobinard, BOUGON : sourcils froncés en V, une mandibule qui dépasse (asymétrie), épaules rentrées ; avant-bras
 *   enroulés de spires de cuivre ; une antenne traîne derrière lui jusqu'au sol (le « câble » de sa fiche).
 * - Voltacier, FIER : menton levé, poitrail bombé, élytres entrouverts sur des ailettes repliées (volant replié),
 *   mandibules relevées.
 * Signature qui grandit : filaments lumineux des antennes → spires lumineuses → nervures des ailettes.
 * Détails de matière : joint d'élytres lumineux (pointillé), ventre de quartz strié, griffes de quartz, cuivre sombre
 * dans les creux des spires.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, COPPER, COPPER_DARK, CRUST, DARK, drawnSince, finish, placeEyes, shade } from './_commun';

export function scarabee(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1.2 : stage === 2 ? 1.3 : 1.62;
  const m = new Model(28, Math.ceil(17 * k) + 8, Math.ceil(19 * k) + 6);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = m.l * 0.55;
  const legH = (stage === 1 ? 2.6 : 3.6) * k; // hanches (stade 1 : jambes courtes)
  const hunch = stage === 2 ? 0.8 : 0; // Bobinard rentre la tête dans les épaules

  // --- abdomen rond (ventre de quartz devant), thorax au-dessus
  m.ellipsoid([cx, cy + 0.6 * k, legH + 2.8 * k], [3.4 * k, 3.0 * k, 3.1 * k], BODY); // abdomen
  m.ellipsoid([cx, cy - 1.4 * k, legH + 2.6 * k], [2.4 * k, 1.4 * k, 2.4 * k], BONE); // ventre de quartz, devant
  const tz = legH + (5.4 - hunch * 0.5) * k;
  m.ellipsoid([cx, cy - 0.2 * k, tz], [2.9 * k, 2.2 * k, 2.0 * k], BODY); // thorax
  if (stage === 3) m.ellipsoid([cx, cy - 1.6 * k, tz - 0.4 * k], [2.4 * k, 1.3 * k, 1.8 * k], BODY); // poitrail bombé
  m.ellipsoid([2.6 * k, cy - 0.2 * k, tz + 0.4 * k], [1.3 * k, 1.5 * k, 1.2 * k], BODY, true); // épaules

  // --- tête : ronde, portée en avant ; Voltacier la relève (menton levé)
  const hr = (stage === 1 ? 2.6 : 2.3) * k * (stage === 1 ? 1.08 : 1);
  const hy = cy - (stage === 3 ? 2.0 : 2.6) * k;
  const hz = tz + (stage === 3 ? 3.4 : stage === 2 ? 2.0 : 2.2) * k;
  m.capsule([cx, cy - 0.6 * k, tz + 0.6 * k], [cx, hy + 0.6 * k, hz - 1.0 * k], 1.5 * k, 1.3 * k, BODY); // cou
  m.ellipsoid([cx, hy, hz], [hr, hr * 0.95, hr * 0.92], BODY);
  m.ellipsoid([cx, hy - hr * 0.75, hz - hr * (stage === 3 ? 0.25 : 0.45)], [hr * 0.6, hr * 0.45, hr * 0.42], BODY); // museau
  const eo = Math.max(1, Math.round(hr * 0.38));
  const ez = Math.round(hz + hr * 0.12);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === EYE) ey = Math.min(ey, yi);
  });
  // sourcils : hauts et ronds (curieux) / en V (bougon) / droits et appuyés (fier)
  if (stage === 1) m.box(eo, eo + 2, ey, ey + 1, ez + 3, ez + 4, BODY, true); // sourcils hauts (étonnés)
  else if (stage === 2) {
    m.box(eo, eo + 1, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true); // côté intérieur, bas
    m.box(eo + 1, eo + 3, ey - 1, ey + 2, ez + 3, ez + 4, BODY, true); // côté extérieur, plus haut : V froncé
  } else m.box(eo, eo + 2, ey - 1, ey + 1, ez + 2, ez + 3, BODY, true); // arcade droite, juste au-dessus des yeux
  // bouche : « o » (curieux) / mandibules
  const mz = Math.round(hz - hr * (stage === 3 ? 0.3 : 0.55));
  let my = 0;
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, mz) !== 0) {
      my = yi;
      break;
    }
  if (stage === 1) m.box(c - 1, c + 1, my, my + 1, mz - 1, mz + 1, DARK); // bouche ronde, étonnée
  else {
    m.box(c - 1, c + 1, my, my + 1, mz, mz + 1, DARK); // bouche
    const ml = stage === 3 ? 1.6 : 1.2;
    m.capsule([1.2 * k, my + 0.8, mz - 0.2], [0.9 * k, my - ml, mz + (stage === 3 ? 1.2 : -0.6)], 0.85, 0.6, BONE, true); // mandibules
    if (stage === 2) m.capsule([cx - 0.9 * k, my - 1.0, mz - 0.6], [cx - 0.6 * k, my - 2.2, mz - 1.2], 0.7, 0.55, BONE); // l'une dépasse (asymétrie)
  }

  // --- antennes-filaments (signature) : asymétriques selon le caractère
  const ax = 1.1 * k;
  const ay = hy + hr * 0.1;
  const az = hz + hr * 0.75;
  if (stage === 1) {
    m.capsule([cx + ax, ay, az], [cx + ax + 1.0, ay + 0.6, az + 3.0], 0.8, 0.7, BODY); // dressée
    m.capsule([cx - ax, ay, az], [cx - ax - 1.4, ay - 0.8, az + 2.4], 0.8, 0.7, BODY);
    m.capsule([cx - ax - 1.4, ay - 0.8, az + 2.4], [cx - ax - 1.6, ay - 2.4, az + 1.8], 0.75, 0.7, BODY); // recourbée vers l'avant
  } else if (stage === 2) {
    m.capsule([cx + ax, ay, az], [cx + ax + 1.6, ay + 2.4, az + 3.0], 0.85, 0.75, BODY);
    m.capsule([cx - ax, ay, az], [cx - ax - 1.4, ay + 3.0, az + 2.0], 0.85, 0.75, BODY); // le « câble » : part en arrière...
    m.capsule([cx - ax - 1.4, ay + 3.0, az + 2.0], [cx - ax - 2.4, cy + 4.2 * k, legH + 3.0 * k], 0.8, 0.75, BODY);
    m.capsule([cx - ax - 2.4, cy + 4.2 * k, legH + 3.0 * k], [cx - ax - 2.0, cy + 6.2 * k, 0.8], 0.8, 0.75, BODY); // ...et traîne au sol
  } else {
    for (const s of [1, -1]) {
      m.capsule([cx + s * ax, ay, az], [cx + s * (ax + 1.0), ay + 2.0, az + 3.6], 0.9, 0.8, BODY);
      m.capsule([cx + s * (ax + 1.0), ay + 2.0, az + 3.6], [cx + s * (ax + 2.4), ay + 4.6, az + 4.4], 0.8, 0.7, BODY); // balayées en arrière
    }
  }

  // --- élytres de cuivre sur le dos (deux coques, joint au milieu) ; Voltacier les entrouvre sur des ailettes
  const open = stage === 3 ? 0.9 : 0;
  m.ellipsoid([1.6 * k + open, cy + 0.9 * k, legH + 3.9 * k], [1.8 * k, 2.6 * k, 2.6 * k], COPPER, true); // posés sur l'abdomen
  m.each((i, x) => {
    if (m.v[i] === COPPER && Math.abs(x - cx) < 1) m.v[i] = BODY; // joint entre les deux élytres
  });
  if (stage === 3) {
    // ailettes repliées entre les élytres entrouverts : deux membranes de quartz, plaquées
    m.ellipsoid([0.9 * k, cy + 2.6 * k, tz + 1.4 * k], [0.8, 3.2 * k, 1.6 * k], BONE, true);
  }
  // --- bras courts, trois griffes de quartz ; Bobinard : avant-bras épais enroulés de spires
  const fa = stage === 2 ? 1.35 : stage === 3 ? 1.2 : 1.0;
  m.capsule([3.0 * k, cy - 0.6 * k, tz + 0.2 * k], [3.8 * k, cy - 1.4 * k, tz - 2.0 * k], 1.0 * k, 0.9 * k * fa, BODY, true);
  m.capsule([3.8 * k, cy - 1.4 * k, tz - 2.0 * k], [3.6 * k, cy - 2.6 * k, tz - 3.4 * k], 0.95 * k * fa, 0.8 * k * fa, BODY, true);
  for (const dy of [-0.6, 0.6]) m.capsule([3.6 * k, cy - 2.8 * k, tz - 3.6 * k], [3.6 * k + dy * 0.6, cy - 3.6 * k, tz - 4.4 * k], 0.7, 0.55, BONE, true);

  // --- jambes : cuisse, genou, pied à deux griffes de quartz
  const before = m.v.slice();
  const lat = 1.9 * k;
  const lr = 1.25 * k;
  m.capsule([lat, cy + 0.8 * k, legH + 1.0 * k], [lat + 0.3, cy - 0.2 * k, legH * 0.5], lr * 1.2, lr, BODY, true);
  m.capsule([lat + 0.3, cy - 0.2 * k, legH * 0.5], [lat + 0.3, cy + 0.4 * k, 1.2], lr, lr * 0.85, BODY, true);
  const fx0 = Math.floor(lat + 0.3 - lr);
  const fx1 = Math.ceil(lat + 0.3 + lr);
  m.box(fx0, fx1, Math.floor(cy - 1.2 * k), Math.ceil(cy + 1.2 * k), 0, 2, BODY, true);
  m.box(fx0, fx0 + 1, Math.floor(cy - 1.2 * k) - 1, Math.floor(cy - 1.2 * k), 0, 1, BONE, true); // griffes
  m.box(fx1 - 1, fx1, Math.floor(cy - 1.2 * k) - 1, Math.floor(cy - 1.2 * k), 0, 1, BONE, true);
  const legDrawn = drawnSince(m, before);

  shade(m);
  // creux des élytres et des spires : cuivre sombre (dessous)
  m.recolor(m.neighborsEmpty(0, 0, -1), [COPPER], COPPER_DARK);
  // ventre de quartz strié (anneaux sombres)
  m.each((i, _x, _y, z) => {
    if (m.v[i] === BONE && z < legH + 4.8 * k && z > legH + 0.4 * k && Math.floor(z) % 3 === 0 && _y < cy - 1.6 * k) m.v[i] = DARK;
  });
  // spires de cuivre autour des avant-bras (Bobinard, puis Voltacier) : anneaux cuivre / lueur
  if (stage > 1)
    m.each((i, x, y, z, _xi, _yi, zi) => {
      if (legDrawn[i] || ![BODY, CRUST, DARK].includes(m.v[i])) return;
      if (Math.abs(Math.abs(x - cx) - 3.75 * k) > 1.6 * k || y > cy - 0.8 * k || z > tz - 0.6 * k || z < tz - 3.6 * k) return;
      const ring = zi % 5;
      m.v[i] = ring === 0 ? 241 : COPPER;
    });
  // porte du lot 5 (contraste à la Cime) : mante de cuivre sur les épaules (bande large, vue d'en haut)
  m.each((i, _x, y, z, xi, yi, zi) => {
    if (m.v[i] === CRUST && m.get(xi, yi, zi + 1) === 0 && z > tz + 0.6 * k && z < tz + 2.4 * k && y > cy - 2.0 * k && y < cy + 1.0 * k) m.v[i] = COPPER;
  });
  // éclairs visibles d'en haut : un zigzag sur chaque élytre, un sur le crâne
  m.crack(
    [
      [1.2 * k, cy - 1.0 * k, legH + 6.4 * k],
      [2.4 * k, cy + 0.0 * k, legH + 6.2 * k],
      [1.3 * k, cy + 1.0 * k, legH + 6.0 * k],
      [2.5 * k, cy + 2.2 * k, legH + 5.2 * k],
    ],
    241,
    stage === 1 ? 0.55 : 0.7,
    [COPPER, COPPER_DARK],
  );
  m.crack([[0.5, hy - hr * 0.5, hz + hr * 0.85], [hr * 0.45, hy - hr * 0.1, hz + hr * 0.95], [0.5, hy + hr * 0.35, hz + hr * 0.9]], 242, stage === 1 ? 0.55 : 0.7, [BODY, CRUST]);
  // filaments lumineux : bouts d'antennes
  const tipZ = az + (stage === 1 ? 2.2 : stage === 2 ? 2.0 : 3.2);
  m.each((i, _x, _y, z) => {
    if ([BODY, CRUST, DARK].includes(m.v[i]) && z > tipZ && !legDrawn[i]) m.v[i] = z > tipZ + 1.2 ? 242 : 241;
  });
  // joint des élytres : pointillé lumineux, visible d'en haut (jamais une ligne continue)
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (Math.abs(x - cx) > 1.0 || zi < legH + 3 * k || m.get(xi, yi, zi + 1) !== 0 || ![BODY, CRUST, COPPER].includes(m.v[i])) return;
    if (y > cy - 0.8 * k && y < cy + 4.0 * k && Math.floor(y) % 3 !== 2) m.v[i] = Math.floor(y) % 3 === 0 ? 242 : 241;
  });
  // Voltacier : nervures lumineuses des ailettes
  if (stage === 3) {
    m.crack([[1.4 * k, cy + 0.6 * k, tz + 2.2 * k], [1.6 * k, cy + 5.2 * k, tz + 0.6 * k]], 241, 0.7, [BONE]);
    m.crack([[3.3 * k + open, cy - 0.6 * k, tz + 1.2 * k], [3.4 * k + open, cy + 2.0 * k, tz + 0.4 * k], [2.6 * k + open, cy + 4.2 * k, tz - 0.6 * k]], 241, 0.7, [COPPER, COPPER_DARK]); // bord des élytres
    m.crack([[0.5, cy - 2.9 * k, tz - 1.6 * k], [1.4 * k, cy - 2.4 * k, tz + 0.4 * k], [2.4 * k, cy - 1.4 * k, tz + 1.2 * k]], 241, 0.75, [DARK, BODY, CRUST]); // plastron en V
    m.crack([[0.5, cy - 3.0 * k, tz - 0.6 * k], [0.5, cy - 2.8 * k, tz - 1.6 * k]], 242, 0.8, [241]); // cœur
  }

  const legs = m.mask((_x, _y, z) => z < legH - 0.4);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  return finish(m, legs);
}
