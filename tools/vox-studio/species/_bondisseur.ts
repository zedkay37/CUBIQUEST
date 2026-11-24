/**
 * Lignée Chevrok → Mouflambre → Bélithan (roche) : « bondisseur des mesas ». Plan de corps : BIPÈDE SAUTEUR (bible
 * §4.8) : énormes cuisses, longs pieds posés à plat, petits bras, buste droit, queue épaisse posée au sol en trépied ;
 * tête de bélier aux cornes enroulées. Distinct de la gargouille (accroupie, ailée) et du golem (dressé, bras énormes),
 * et des quadrupèdes (il ne pose jamais les mains).
 *
 * Personnalité (§4.7), qui évolue :
 * - Chevrok, CASSE-COU (« grimpe pour le plaisir de redescendre en glissant ») : penché en avant, prêt à sauter,
 *   grand sourire, oreilles dressées, petites cornes en virgule.
 * - Mouflambre, CHALEUREUX (« la harde se serre contre lui ») : toison épaisse sur le poitrail et les épaules, yeux
 *   doux mi-clos, bras croisés devant la toison, cornes d'ambre (non lumineuses) striées.
 * - Bélithan, FIER-À-BRAS (« se saluent du front ») : buste bombé, tête baissée en avant pour le coup de front,
 *   cornes massives en spirale, une corne ébréchée (asymétrie), sourire en coin.
 * Signature qui grandit : virgules de cornes → cornes d'ambre striées → spirales massives aux sillons de cristal
 * lumineux. Détails de matière : sabots d'os fendus, toison, lichen des mesas, strates du granit.
 */
import { EYE, Model } from '../voxlib';
import { AMBRE, BODY, BONE, CRUST, DARK, PLAQUE, drawnSince, eyeRow, finish, mouth, placeEyes, shade, topLine } from './_commun';

export function bondisseur(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1.35 : stage === 2 ? 1.55 : 1.95;
  const m = new Model(30, Math.ceil(18 * k) + 8, Math.ceil(17 * k) + 8);
  const cx = m.cx;
  const cy = m.l * 0.5;
  const legH = 3.4 * k; // hanches
  const lean = 0; // porte du lot 6 : buste DROIT (ne plus ressembler aux gargouilles) // penché en avant (prêt à bondir / coup de front)

  // --- bassin, buste droit (ou penché), poitrail
  m.ellipsoid([cx, cy + 0.8 * k, legH + 1.6 * k], [2.8 * k, 2.6 * k, 2.2 * k], BODY); // bassin
  const tz = legH + 4.6 * k;
  m.capsule([cx, cy + 0.6 * k, legH + 2.0 * k], [cx, cy - lean * k, tz], 2.6 * k, 2.4 * k, BODY); // buste
  m.ellipsoid([cx, cy - (0.9 + lean) * k, tz - 1.2 * k], [2.2 * k, 1.5 * k, 2.0 * k * (stage === 3 ? 1.15 : 1)], BODY); // poitrail
  m.ellipsoid([2.2 * k, cy - lean * k, tz + 0.2 * k], [1.3 * k, 1.4 * k, 1.2 * k], BODY, true); // épaules
  // toison (Mouflambre, puis Bélithan) : bourrelets clairs sur le poitrail et les épaules
  // toison COMPACTE (porte du lot 6) : une seule masse claire sur le poitrail et le haut des épaules
  if (stage > 1) {
    m.ellipsoid([cx, cy - 1.3 * k, tz - 0.3 * k], [2.3 * k, 1.3 * k, 1.9 * k], PLAQUE);
    m.ellipsoid([1.8 * k, cy - 0.6 * k, tz + 0.8 * k], [1.2 * k, 1.2 * k, 0.9 * k], PLAQUE, true);
  }

  // --- tête de bélier
  const hr = (stage === 1 ? 2.3 : 2.1) * k;
  const hy = cy - (2.8 + lean * 1.4) * k;
  const hz = tz + (stage === 3 ? 1.2 : 2.2) * k;
  m.capsule([cx, cy - (0.6 + lean) * k, tz + 0.4 * k], [cx, hy + 0.8 * k, hz - 0.4 * k], 1.6 * k, 1.4 * k, BODY); // cou
  m.ellipsoid([cx, hy, hz], [hr * 0.85, hr, hr * 0.85], BODY); // crâne
  m.ellipsoid([cx, hy - hr * 0.95, hz - hr * 0.45], [hr * 0.5, hr * 0.6, hr * 0.5], BODY); // chanfrein et museau
  const eo = Math.max(1, Math.round(hr * 0.42));
  const ez = Math.round(hz + hr * 0.1);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  const ey = eyeRow(m);
  if (stage === 2) m.box(eo, eo + 2, ey, ey + 1, ez + 1, ez + 2, BODY, true); // yeux doux, mi-clos
  if (stage === 3) m.box(eo - 1, eo + 2, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true); // arcade de bélier
  const mz = Math.round(hz - hr * 0.75);
  const my = mouth(m, mz, 1, stage === 2 ? 'plat' : 'haut');
  if (stage === 3) m.box(Math.trunc(cx) + 1, Math.trunc(cx) + 2, my + 1, my + 2, mz + 1, mz + 2, DARK); // sourire en coin (un seul côté)
  if (stage === 1) m.capsule([hr * 0.75, hy + hr * 0.4, hz + hr * 0.55], [hr * 0.75 + 1.6, hy + hr * 0.9, hz + hr * 1.3], 0.8, 0.6, BODY, true); // oreilles dressées
  else m.capsule([hr * 0.8, hy + hr * 0.4, hz + hr * 0.1], [hr * 0.8 + 1.6, hy + hr * 0.7, hz - hr * 0.3], 0.8, 0.6, BODY, true); // oreilles couchées
  // barbiche
  m.capsule([cx, hy - hr * 0.9, hz - hr * 0.95], [cx, hy - hr * 0.7, hz - hr * 1.5], 0.8, 0.6, BONE);

  // --- cornes enroulées : un arc qui part en arrière puis s'enroule vers l'avant, sur le côté de la tête
  const hornC = stage === 2 ? AMBRE : BONE;
  const R = (stage === 1 ? 1.5 : stage === 2 ? 2.0 : 2.5) * k; // rayon de l'enroulement
  const th = (stage === 1 ? 0.6 : stage === 2 ? 0.65 : 0.75) * k; // tube fin : le creux de l'enroulement se voit // épaisseur
  const turns = stage === 1 ? 0.55 : stage === 2 ? 0.85 : 1.05;
  const preHorns = m.v.slice();
  for (const s of [1, -1]) {
    const ox = cx + s * (hr * 0.75 + th * 0.6);
    const oy = hy + hr * 0.3 + R * 0.5;
    const oz = hz + hr * 0.3;
    const pts: [number, number, number][] = [];
    const n = 10;
    for (let j = 0; j <= n; j++) {
      const a = Math.PI * 0.55 - j * ((2 * Math.PI * turns) / n); // part vers le haut, tourne vers l'arrière puis le bas et l'avant
      const rr = R * (1 - j * 0.035);
      pts.push([ox + s * j * 0.12 * k, oy + Math.cos(a) * rr - R * 0.5, oz + Math.sin(a) * rr]);
    }
    const chipped = stage === 3 && s === -1;
    const last = chipped ? n - 2 : n;
    for (let j = 0; j < last; j++) m.capsule(pts[j], pts[j + 1], th * (1 - j * 0.045), th * (1 - (j + 1) * 0.045), hornC);
  }

  const hornMask = drawnSince(m, preHorns);

  // --- petits bras : posés en avant (Chevrok), croisés devant la toison (Mouflambre), poings sur les hanches (Bélithan)
  const ax = (stage === 1 ? 3.0 : 2.6) * k;
  if (stage === 2) {
    m.capsule([ax, cy - 0.6 * k, tz - 0.2 * k], [ax, cy - 2.0 * k, tz - 1.8 * k], 0.95 * k, 0.85 * k, BODY, true);
    m.capsule([ax, cy - 2.0 * k, tz - 1.8 * k], [0.6, cy - 2.6 * k, tz - 1.6 * k], 0.85 * k, 0.8 * k, BODY, true); // bras croisés
  } else if (stage === 3) {
    m.capsule([ax, cy - 0.6 * k, tz - 0.2 * k], [ax + 1.2 * k, cy + 0.2 * k, tz - 1.8 * k], 1.0 * k, 0.9 * k, BODY, true);
    m.capsule([ax + 1.2 * k, cy + 0.2 * k, tz - 1.8 * k], [ax, cy + 0.6 * k, legH + 2.0 * k], 0.9 * k, 0.9 * k, BODY, true); // poings sur les hanches
  } else {
    m.capsule([ax, cy - (0.6 + lean) * k, tz - 0.4 * k], [ax + 0.4, cy - (2.2 + lean) * k, tz - 1.6 * k], 0.85 * k, 0.75 * k, BODY, true);
    m.box(Math.floor(ax), Math.ceil(ax + 1.2), Math.floor(cy - (2.9 + lean) * k), Math.floor(cy - (2.3 + lean) * k), Math.floor(tz - 2.2 * k), Math.ceil(tz - 1.4 * k), BONE, true); // sabots des mains
  }
  // --- queue épaisse posée au sol (trépied)
  m.capsule([cx, cy + 2.4 * k, legH + 1.6 * k], [cx, cy + 4.6 * k, 1.0 * k], 1.2 * k, 0.9 * k, BODY); // queue courte

  // --- jambes de sauteur : grosse cuisse, jarret haut, long pied à plat, sabot d'os fendu
  const before = m.v.slice();
  const lat = 2.4 * k;
  const lr = 1.5 * k;
  m.ellipsoid([lat, cy + 1.0 * k, legH + 0.6 * k], [lr * 1.3, lr * 1.75, lr * 1.5], BODY, true); // cuisse puissante
  m.capsule([lat, cy + 1.6 * k, legH * 0.6], [lat + 0.2, cy + 2.4 * k, 1.4], lr * 0.85, lr * 0.7, BODY, true); // jarret, vers l'arrière
  const fx0 = Math.floor(lat + 0.2 - lr * 0.8);
  const fx1 = Math.ceil(lat + 0.2 + lr * 0.8);
  const fy0 = Math.floor(cy - 1.0 * k);
  m.box(fx0, fx1, fy0, Math.ceil(cy + 2.0 * k), 0, 2, BODY, true); // pied court (plus de « skis »)
  m.box(fx0, fx1, fy0 - 1, fy0 + 1, 0, 2, BONE, true); // sabot d'os
  const fc = Math.trunc(lat + 0.2);
  m.box(fc, fc + 1, fy0 - 1, fy0, 0, 2, 0, true); // fente du sabot
  const legDrawn = drawnSince(m, before);

  shade(m);
  const body = [DARK, BODY, CRUST];
  // stries des cornes (cornes d'ambre striées, sillons de cristal lumineux à la forme finale)
  m.each((i, _x, y, z) => {
    if (!hornMask[i] || m.v[i] !== hornC) return;
    const ring = Math.floor(Math.hypot(y - hy, z - hz) * 1.3);
    if (stage === 3 && ring % 6 === 0) m.v[i] = 241; // sillons de cristal
    else if (stage === 2 && ring % 6 === 0) m.v[i] = 241;
    else if (stage === 2 && ring % 3 === 0) m.v[i] = CRUST; // stries de l'ambre
  });
  // fissure de cristal au front (petite), puis sur l'encolure
  m.crack([[0.5, hy - hr * 0.7, hz + hr * 0.45], [0.5, hy, hz + hr * 0.85]], 241, 0.7, body);
  if (stage > 1) m.crack([[1.0 * k, cy - (0.8 + lean) * k, tz + 1.4 * k], [2.2 * k, cy - lean * k, tz + 1.0 * k]], 241, 0.7, body);
  const legs = m.mask((_x, _y, z) => z < legH * 0.9);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // lueur en lignes vues d'en haut : crête du crâne et ligne du dos (deux tronçons)
  topLine(m, [[0.5, hy - hr * 0.5], [0.5, hy + hr * 0.7]], 0.45 + 0.2 * stage, 241, body, Math.round(hz));
  topLine(m, [[0.5, cy - 0.2 * k], [0.5, cy + 1.2 * k]], 0.45 + 0.2 * stage, 241, body, Math.round(legH + 2 * k), legs);
  if (stage > 1) topLine(m, [[0.5, cy + 1.8 * k], [0.5, cy + 3.4 * k]], 0.45 + 0.2 * stage, stage === 3 ? 242 : 241, body, 2, legs);
  return finish(m, legs);
}
