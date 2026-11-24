/**
 * Lignée Givrock → Cryolithe → Glaciatitan (roche, glace) : « golem de banquise ». Plan de corps : TRAPU DRESSÉ
 * (bible §4.8) : dos DROIT (jamais voûté, jamais sur les poings : pas le colosse d'Abyssocube), jambes courtes en
 * piliers, bras énormes le long du corps, petite tête enfoncée entre deux épaules de roche. La glace (pleine, bleutée)
 * pousse dans les fissures et sur les épaules ; la lueur de cristal court dans la glace.
 *
 * Personnalité (§4.7), qui évolue :
 * - Givrock, FRILEUX ET GROGNON (« frappe ses poings l'un contre l'autre pour se réchauffer ») : épaules remontées,
 *   poings joints devant lui, bouche tombante, sourcils froncés, givre sur le crâne.
 * - Cryolithe, MÉFIANT (« ses stalactites tintent quand un intrus approche ») : stalactites en groupes sur le dos, un
 *   poing levé à hauteur de poitrine (asymétrie), regard en coin sous une arcade lourde.
 * - Glaciatitan, SOLENNEL ET LENT (« chacun de ses pas redessine la carte des crevasses ») : glacier sur les épaules,
 *   barbe de glaçons, yeux calmes mi-clos, mains ouvertes.
 * Détails de matière : strates de granit, glace pleine dans les fissures, glaçons, lichen gelé, doigts d'os.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, GLACE_PLEINE, PLAQUE, drawnSince, eyeRow, finish, mouth, placeEyes, shade, topLine } from './_commun';

export function golem(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1.3 : stage === 2 ? 1.6 : 1.9;
  const m = new Model(30, Math.ceil(13 * k) + 8, Math.ceil(17 * k) + 8);
  const cx = m.cx;
  const cy = m.l * 0.5;
  const legH = 3.0 * k;
  const shrug = stage === 1 ? 0.8 : 0; // épaules remontées (frileux)

  // --- tronc droit, large, en blocs empilés
  const tz = legH + 4.4 * k;
  m.ellipsoid([cx, cy, legH + 2.2 * k], [3.2 * k, 2.4 * k, 2.4 * k], BODY); // bassin
  m.ellipsoid([cx, cy, tz], [3.6 * k, 2.6 * k, 2.8 * k], BODY); // torse
  m.ellipsoid([3.4 * k, cy, tz + (1.4 + shrug) * k], [2.0 * k, 2.2 * k, 1.8 * k], BODY, true); // épaules de roche
  m.ellipsoid([3.5 * k, cy - 0.2 * k, tz + (2.4 + shrug) * k], [1.7 * k, 1.9 * k, 0.9 * k], PLAQUE, true); // dalles claires des épaules
  m.ellipsoid([cx, cy - 2.0 * k, legH + 2.4 * k], [2.4 * k, 0.9 * k, 1.4 * k], PLAQUE); // dalle du ventre
  // --- petite tête enfoncée entre les épaules
  const hr = (stage === 1 ? 2.6 : 2.0) * k; // visage lisible
  const hy = cy - 1.2 * k;
  const hz = tz + 2.6 * k;
  m.ellipsoid([cx, hy, hz], [hr, hr * 0.9, hr * 0.85], BODY);
  m.ellipsoid([cx, hy - hr * 0.7, hz - hr * 0.45], [hr * 0.7, hr * 0.4, hr * 0.42], BODY); // mâchoire carrée
  const eo = Math.max(1, Math.round(hr * 0.42));
  const ez = Math.round(hz + hr * 0.05);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  const ey = eyeRow(m);
  if (stage === 1) {
    m.box(eo, eo + 1, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true); // sourcils froncés : bas à l'intérieur…
    m.box(eo + 1, eo + 2, ey - 1, ey + 2, ez + 3, ez + 4, BODY, true); // …haut à l'extérieur
  } else if (stage === 2) {
    // méfiant : un sourcil levé (asymétrie), l'autre bas et froncé
    const c = Math.trunc(cx);
    m.box(c + eo, c + eo + 2, ey - 1, ey + 2, ez + 3, ez + 4, PLAQUE);
    m.box(c - eo - 2, c - eo, ey - 1, ey + 2, ez + 2, ez + 3, PLAQUE);
  } else m.box(eo - 1, eo + 2, ey - 1, ey + 2, ez + 2, ez + 3, PLAQUE, true); // arcade lourde
  if (stage === 3) m.box(eo, eo + 2, ey, ey + 1, ez + 1, ez + 2, BODY, true); // paupières mi-closes (calme)
  const mz = Math.round(hz - hr * 0.55);
  const my = mouth(m, mz, stage === 3 ? 2 : 1, stage === 1 ? 'bas' : 'plat');

  // --- bras énormes : épaule, avant-bras épais, poings / mains
  const ax = (stage === 1 ? 4.4 : 3.5) * k;
  if (stage === 1) {
    // frileux : il se serre dans ses bras (bras croisés sur le torse, mains sous les aisselles), épaules remontées
    m.capsule([ax, cy, tz + 0.8 * k], [ax - 0.2, cy - 1.8 * k, tz - 1.4 * k], 1.5 * k, 1.35 * k, BODY, true); // bras
    m.capsule([cx + (ax - 0.2), cy - 1.8 * k, tz - 1.4 * k], [cx - 2.6 * k, cy - 2.6 * k, tz - 0.2 * k], 1.3 * k, 1.2 * k, BODY); // avant-bras droit, par-dessus
    m.capsule([cx - (ax - 0.2), cy - 1.8 * k, tz - 1.8 * k], [cx + 2.6 * k, cy - 2.4 * k, tz - 0.9 * k], 1.25 * k, 1.15 * k, BODY); // avant-bras gauche, dessous
    m.ellipsoid([cx - 2.8 * k, cy - 2.4 * k, tz + 0.1 * k], [1.0 * k, 1.0 * k, 1.0 * k], BODY); // main sous l'aisselle
    m.ellipsoid([cx + 2.8 * k, cy - 2.2 * k, tz - 0.7 * k], [1.0 * k, 1.0 * k, 1.0 * k], BODY);
    m.ellipsoid([cx, cy - 3.0 * k, tz - 0.9 * k], [2.6 * k, 0.9 * k, 0.9 * k], PLAQUE); // dalle des avant-bras croisés
  } else {
    for (const s of [1, -1]) {
      const raised = stage === 2 && s === 1; // Cryolithe lève un poing (méfiant)
      const X = (o: number) => cx + s * o;
      m.capsule([X(ax), cy, tz + 0.6 * k], [X(ax + 0.2 * k), cy - (raised ? 1.6 : 0.4) * k, raised ? tz - 0.6 * k : tz - 2.6 * k], 1.6 * k, 1.5 * k, BODY);
      m.capsule([X(ax + 0.2 * k), cy - (raised ? 1.6 : 0.4) * k, raised ? tz - 0.6 * k : tz - 2.6 * k], [X(ax + 0.1 * k), cy - (raised ? 3.0 : 0.8) * k, raised ? tz - 0.2 * k : legH + 1.0 * k], 1.5 * k, 1.35 * k, BODY);
      m.ellipsoid([X(ax + 0.1 * k), cy - (raised ? 3.2 : 1.0) * k, raised ? tz + 0.2 * k : legH + 0.6 * k], [1.6 * k, 1.5 * k, 1.4 * k], BODY); // poing / main
      if (stage === 3) m.box(Math.floor(X(ax + 0.1 * k) - 1.2 * k), Math.ceil(X(ax + 0.1 * k) + 1.2 * k), Math.floor(cy - 2.6 * k), Math.floor(cy - 2.0 * k), Math.floor(legH - 0.2 * k), Math.ceil(legH + 1.0 * k), BONE); // doigts d'os (main ouverte)
    }
  }

  // --- glace : givre sur le crâne (1), stalactites en groupes sur le dos (2), glacier sur les épaules (3)
  if (stage === 1) m.ellipsoid([cx, hy + 0.4 * k, hz + hr * 0.75], [hr * 0.7, hr * 0.6, 0.9], GLACE_PLEINE);
  if (stage >= 2)
    for (const [lx, dz, len] of stage === 2
      ? ([
          [1.4, 1.2, 2.6],
          [2.4, 0.6, 1.8],
          [0.6, -1.0, 2.2],
          [2.0, -1.6, 1.6],
        ] as const)
      : ([
          [1.4, 1.0, 3.0],
          [2.6, 0.2, 2.2],
        ] as const))
      m.capsule([lx * k, cy + 2.4 * k, tz + dz * k], [lx * k + 0.2, cy + 2.9 * k, tz + dz * k - len * k], 0.95, 0.6, GLACE_PLEINE, true); // stalactites
  if (stage === 3) {
    m.ellipsoid([3.0 * k, cy + 0.3 * k, tz + 3.0 * k], [2.0 * k, 2.4 * k, 1.4 * k], GLACE_PLEINE, true); // glacier des épaules
    for (const [lx, dy, h] of [
      [3.0, -0.6, 2.4],
      [3.8, 0.8, 1.8],
      [2.4, 1.4, 1.4],
    ] as const)
      m.capsule([lx * k, cy + dy * k, tz + 3.6 * k], [lx * k + 0.3, cy + dy * k + 0.4, tz + 3.6 * k + h * k], 1.0, 0.7, GLACE_PLEINE, true); // pics
    for (const lx of [0, 1.0, 2.0]) m.capsule([lx, my + 0.6, mz - 0.6], [lx + 0.2, my + 0.9, mz - 3.4], 0.8, 0.6, GLACE_PLEINE, true); // barbe de glaçons
  }

  // --- jambes courtes en piliers, pieds larges
  const before = m.v.slice();
  const lat = 2.5 * k;
  const lr = 1.6 * k;
  m.capsule([lat, cy, legH + 1.4 * k], [lat + 0.2, cy, 1.4], lr * 1.1, lr, BODY, true);
  const fx0 = Math.floor(lat + 0.2 - lr * 0.8);
  const fx1 = Math.ceil(lat + 0.2 + lr * 0.8);
  const fy0 = Math.floor(cy - 1.8 * k);
  m.box(fx0, fx1, fy0, Math.ceil(cy + 1.4 * k), 0, 2, BODY, true);
  m.box(fx0, fx1, fy0 - 1, fy0, 0, 1, BONE, true); // orteils d'os
  const legDrawn = drawnSince(m, before);

  shade(m);
  const body = [DARK, BODY, CRUST, PLAQUE];
  // glace dans les fissures du torse (veine pleine, cœur de cristal lumineux), visible de face et d'en haut
  m.crack([[0.5, cy - 2.4 * k, tz + 1.6 * k], [1.4 * k, cy - 2.2 * k, tz], [0.8 * k, cy - 2.0 * k, legH + 2.2 * k]], GLACE_PLEINE, 0.9, body);
  m.crack([[0.5, cy - 2.4 * k, tz + 1.2 * k], [1.2 * k, cy - 2.2 * k, tz + 0.2 * k]], 241, 0.7, [GLACE_PLEINE]);
  // la lueur court dans la glace : bords supérieurs des glaçons et du glacier (lignes, pas de points au hasard)
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (m.v[i] === GLACE_PLEINE && m.get(xi, yi, zi + 1) === 0 && m.get(xi, yi + 1, zi) === 0) m.v[i] = 241;
  });
  const legs = m.mask((_x, _y, z) => z < legH - 0.2);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // le bras pendant d'un côté peut couvrir le haut d'une jambe : on ne garde que les voxels de jambe des deux côtés
  const sym = legs.slice();
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (sym[i] && !sym[m.idx(m.w - 1 - xi, yi, zi)]) legs[i] = 0;
  });
  // veines de glace vues d'en haut : des épaules vers la nuque (en deux tronçons)
  topLine(m, [[3.2 * k, cy - 0.6 * k], [1.4 * k, cy + 0.4 * k]], 0.45 + 0.2 * stage, 241, body, Math.round(tz), legs);
  if (stage > 1) topLine(m, [[0.5, cy + 0.6 * k], [0.5, cy + 1.8 * k]], 0.45 + 0.2 * stage, 241, body, Math.round(tz), legs);
  return finish(m, legs);
}
