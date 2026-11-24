/**
 * Lignée Nimbulle → Cumulord (psychique) : « gelée de nuage ». Plan de corps : GELÉE POSÉE au sol (bible §4.8) :
 * un amas de boules de nuage, large et bas, qui s'étale sur le sol ; pas de pattes (le corps est trapu, le chargeur ne
 * le découpe pas). Distinct du flotteur (en l'air, pointu en bas).
 * Couleurs : nuage pâle en grandes masses, dessous d'orage sombre (contraste sur les sols clairs), lueur violette en
 * lignes (bulle intérieure, éclairs de l'orage).
 *
 * Personnalité (§4.7), qui évolue :
 * - Nimbulle, DISTRAIT ET RÊVEUR : une paupière tombante (asymétrie), bouche en « o », il regarde en l'air (tête
 *   rejetée en arrière), gouttes de bruine qui tombent d'un côté.
 * - Cumulord, MAJESTUEUX ET MALICIEUX (« façonne des mirages ») : grand front d'orage, sourcils épais, sourire en
 *   coin, deux bras de nuage, éclairs violets dans le ventre sombre, petits nuages satellites (ses mirages).
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, OBSIDIENNE, eyeRow, finish, mouth, placeEyes, shade, topLine } from './_commun';

export function nuage(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.9 : 1.35;
  const m = new Model(30, Math.ceil(16 * k) + 6, Math.ceil(16 * k) + 6);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = m.l * 0.5;

  // --- amas de boules : base large et basse, dôme, bourrelets
  m.ellipsoid([cx, cy, 2.8 * k], [4.6 * k, 4.0 * k, 2.8 * k], BODY); // base étalée
  m.ellipsoid([cx, cy + 0.4 * k, 6.2 * k], [3.6 * k, 3.2 * k, 4.0 * k], BODY); // dôme haut
  for (const [lx, dy, dz, r] of [
    [3.6, -1.0, 3.8, 1.8],
    [3.0, 2.2, 4.8, 1.7],
    [1.4, 3.0, 8.2, 1.6],
  ] as const)
    m.ellipsoid([lx * k, cy + dy * k, dz * k], [r * k, r * k, r * 0.9 * k], BODY, true); // bourrelets
  // --- visage sur l'avant du dôme ; Nimbulle regarde en l'air (yeux hauts), Cumulord a un grand front d'orage
  const fz = (fin ? 6.6 : 7.0) * k;
  const eo = Math.max(1, Math.round(1.1 * k));
  const ez = Math.round(fz);
  // harmonisation : grands yeux (3 × 3) pour Cumulord ; le haut de l'œil reste à la même hauteur
  placeEyes(m, eo, fin ? ez - 1 : ez, m.l, EYE, fin ? 3 : 2);
  const ey = eyeRow(m);
  const mz = Math.round(fz - 1.6 * k);
  if (fin) {
    m.box(c - eo - 3, c + eo + 3, ey - 1, ey + 2, ez + 2, ez + 3, OBSIDIENNE); // sourcils épais d'orage
    mouth(m, mz, 2, 'plat', OBSIDIENNE);
    m.box(c + 2, c + 3, ey, ey + 2, mz + 1, mz + 2, DARK); // sourire en coin (malicieux)
  } else {
    m.box(c - eo - 2, c - eo, ey - 1, ey, ez + 1, ez + 3, BODY); // une paupière tombante (distrait), posée devant l'œil
    mouth(m, mz, 1, "plat");
    mouth(m, mz - 1, 1, "plat"); // bouche en « o » (2 × 2)
  }
  // --- Cumulord : deux bras de nuage, petits nuages satellites (ses mirages)
  if (fin) {
    m.capsule([3.4 * k, cy - 0.6 * k, 4.4 * k], [3.8 * k, cy - 2.8 * k, 2.8 * k], 1.3 * k, 1.0 * k, BODY, true);
    m.ellipsoid([3.9 * k, cy - 3.1 * k, 2.6 * k], [1.3 * k, 1.2 * k, 1.1 * k], BODY, true); // mains de nuage
    for (const [x, y, z, r] of [
      [cx + 3.2 * k, cy + 2.4 * k, 11.6 * k, 1.3],
      [cx - 3.0 * k, cy + 1.2 * k, 12.2 * k, 1.1],
    ])
      m.ellipsoid([x, y, z], [r * k * 1.3, r * k, r * k * 0.8], BODY);
  }
  // --- bruine : gouttes qui tombent d'un côté (Nimbulle)
  if (!fin)
    for (const [x, y, z] of [
      [cx + 4.4 * k, cy + 1.6 * k, 1.4 * k],
      [cx + 5.2 * k, cy + 0.4 * k, 2.6 * k],
    ])
      m.capsule([x, y, z], [x, y, z + 1.4], 0.8, 0.6, BONE);

  shade(m);
  // dessous d'orage sombre (grandes masses, contraste sur sol clair)
  m.each((i, _x, _y, z) => {
    if ((m.v[i] === DARK || m.v[i] === BODY) && z < 1.6 * k) m.v[i] = OBSIDIENNE;
  });
  const body = [DARK, BODY, CRUST];
  // bulle intérieure (Nimbulle) / éclairs violets dans le ventre (Cumulord), visibles de face et d'en haut
  if (fin) {
    m.crack([[0.5, cy - 4.0 * k, 3.4 * k], [1.6 * k, cy - 3.8 * k, 2.4 * k], [0.8 * k, cy - 3.9 * k, 1.6 * k], [2.4 * k, cy - 3.4 * k, 0.8 * k]], 241, 0.75, [...body, OBSIDIENNE]);
    topLine(m, [[0.5, cy - 1.0 * k], [1.6 * k, cy + 0.4 * k], [0.6 * k, cy + 1.4 * k], [2.0 * k, cy + 2.6 * k]], 0.8, 241, body, Math.round(7 * k));
    topLine(m, [[0.5, cy + 0.2 * k], [0.5, cy + 0.8 * k]], 0.9, 242, [241, ...body], Math.round(7 * k));
  } else {
    topLine(m, [[0.5, cy], [1.2 * k, cy + 0.8 * k], [0.5, cy + 1.6 * k]], 0.8, 241, body, Math.round(7 * k));
    m.each((i, _x, _y, _z, xi, yi, zi) => {
      if (m.v[i] === BONE && m.get(xi, yi, zi - 1) === 0) m.v[i] = 241; // gouttes : la pointe luit
    });
  }
  return finish(m, new Uint8Array(m.v.length)); // gelée posée : pas de pattes
}
