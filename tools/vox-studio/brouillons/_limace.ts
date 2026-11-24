/**
 * PROPOSITION A pour Mycélin → Amanitox (porte du lot 4, à choisir par le joueur) : « limace-colonie ».
 * Plan de corps : rampant SANS pattes, corps de limace dodu, l'avant relevé ; une colonie de petits champignons pousse
 * sur son dos, en groupes ; des fils de mycélium lumineux courent sur ses flancs.
 * Trait (bible §4.7) : Mycélin casanier et douillet (paupières lourdes, petit sourire, corps rond) → Amanitox sage et
 * bienveillant (front haut, sourcils tombants, barbe de mycélium, colonie qui fait de l'ombre).
 * Interdits évités : pas de pattes (pas de bête à six pattes), chapeaux ocre et crème (jamais rouges à pois blancs).
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, SHELF_DARK, SHELF_EDGE, SHELF_MID, finish, placeEyes, shade } from '../species/_commun';

/** Un champignon : pied (os clair) et chapeau bombé en bandes (brun au cœur, ocre, bord crème). */
function mushroom(m: Model, x: number, y: number, z: number, h: number, r: number): void {
  m.capsule([x, y, z], [x, y + 0.3, z + h], Math.max(0.8, r * 0.35), Math.max(0.7, r * 0.3), BONE);
  m.each((i, vx, vy, vz) => {
    const a = (vx - x) / r;
    const b = (vy - y - 0.3) / r;
    const d = (vz - z - h) / (r * 0.6);
    if (a * a + b * b + d * d > 1 || vz < z + h - 0.3) return;
    const rho = Math.sqrt(a * a + b * b);
    m.v[i] = rho > 0.78 ? SHELF_EDGE : rho > 0.4 ? SHELF_MID : SHELF_DARK;
  });
}

export function limace(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.6 : 1.1;
  const ky = k * 0.8; // plus court
  const kx = fin ? 1 : 1.2; // stade 1 : plus dodu
  const m = new Model(26, Math.ceil(24 * k) + 4, Math.ceil(17 * k) + 4);
  const cx = m.cx;
  const y0 = 4 * k; // avant

  // --- corps de limace : dodu au milieu, s'affine vers l'arrière, avant relevé (la « tête » se dresse)
  m.ellipsoid([cx, y0 + 9 * ky, 3.0 * k], [4.2 * k * kx, 6.0 * ky, 3.4 * k], BODY); // ventre
  m.ellipsoid([cx, y0 + 15 * ky, 1.9 * k], [3.2 * k * kx, 4.2 * ky, 2.4 * k], BODY); // arrière
  m.capsule([cx, y0 + 18 * ky, 1.4 * k], [cx, y0 + 21 * ky, 0.9 * k], 1.8 * k, 0.9 * k, BODY); // bout de queue
  m.capsule([cx, y0 + 6 * ky, 3.2 * k], [cx, y0 + 3.2 * ky, 8.4 * k], 3.4 * k, 2.7 * k, BODY); // avant relevé
  m.ellipsoid([cx, y0 + 10.5 * ky, 0.6], [4.0 * k * kx, 8.0 * ky, 0.9], DARK); // sole (pied de limace), à peine plus large que le corps
  // --- tête : front, pommettes rondes, petit museau
  const hy = y0 + 2.4 * ky;
  const hz = 9.4 * k;
  m.ellipsoid([cx, hy, hz], [2.8 * k, 2.4 * k, 2.4 * k], BODY);
  m.ellipsoid([cx, hy - 1.6 * k, hz - 1.0 * k], [1.8 * k, 1.2 * k, 1.2 * k], BODY); // museau
  // bouche : petit sourire (coins relevés)
  const mz = Math.round(hz - 1.6 * k);
  const front = Math.floor(hy - 2.8 * k);
  const c = Math.trunc(cx);
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, mz) !== 0) {
      m.box(c - 1, c + 1, yi, yi + 1, mz, mz + 1, DARK);
      m.box(1, 2, yi + 1, yi + 2, mz + 1, mz + 2, DARK, true); // coins relevés
      break;
    }
  const eo = Math.max(1, Math.round(0.9 * k));
  const ez = Math.round(hz + 0.2 * k);
  placeEyes(m, eo, ez, Math.ceil(hy), EYE);
  // paupières lourdes (casanier) / sourcils tombants (sage) : une rangée de corps au-dessus de l'œil, en avancée
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === EYE) ey = Math.min(ey, yi);
  });
  m.box(eo, eo + 2, ey - 1, ey + 2, ez + 2, ez + 3, BODY, true); // sourcils juste au-dessus des yeux, en avancée d'un bloc
  if (fin) m.box(eo + 2, eo + 3, front, front + 2, ez, ez + 2, BODY, true); // sourcils qui tombent sur les côtés
  // barbe de mycélium (forme finale) : fils pendants sous le menton
  if (fin) for (const lx of [0.6, 1.8]) m.capsule([lx, hy - 1.4 * k, hz - 2.0 * k], [lx + 0.2, hy - 1.0 * k, hz - 4.0 * k], 0.8, 0.6, BONE, true);

  // --- colonie de champignons sur le dos, en GROUPES (pas une rangée)
  const top = (y: number) => {
    let z = 0;
    for (let zi = m.h - 1; zi >= 0; zi--)
      if (m.get(c, Math.floor(y), zi) !== 0) {
        z = zi;
        break;
      }
    return z + 0.5;
  };
  const colony: [number, number, number, number][] = fin
    ? [
        [0, y0 + 8.5 * ky, 7.0, 3.4],
        [3.0, y0 + 6.5 * ky, 4.2, 2.2],
        [-3.0, y0 + 10 * ky, 4.8, 2.4],
        [2.2, y0 + 13.5 * ky, 3.4, 1.9],
        [-1.6, y0 + 15 * ky, 2.6, 1.5],
        [0.8, y0 + 17.5 * ky, 1.8, 1.1],
      ]
    : [
        [0, y0 + 9 * ky, 2.6, 1.9],
        [2.0, y0 + 8 * ky, 1.6, 1.2],
        [-1.6, y0 + 12 * ky, 1.4, 1.1],
      ];
  for (const [dx, y, h, r] of colony) mushroom(m, cx + dx, y, top(y) - 0.6, h, r);

  shade(m);
  // fils de mycélium lumineux sur les flancs (lignes), et lamelles lumineuses sous les chapeaux
  m.crack(
    [
      [3.2 * k, y0 + 5 * ky, 3.4 * k],
      [3.8 * k, y0 + 9 * ky, 2.4 * k],
      [3.0 * k, y0 + 13 * ky, 2.0 * k],
    ],
    241,
    0.7,
    [DARK, BODY, CRUST],
  );
  if (fin) {
    m.crack([[2.0 * k, y0 + 14 * ky, 3.4 * k], [2.2 * k, y0 + 18 * ky, 1.6 * k]], 241, 0.7, [DARK, BODY, CRUST]);
    m.crack([[1.0 * k, y0 + 4 * ky, 9.0 * k], [2.4 * k, y0 + 6 * ky, 6.0 * k], [3.6 * k, y0 + 8 * ky, 4.6 * k]], 241, 0.7, [DARK, BODY, CRUST]); // cou
    m.crack([[0.5, y0 + 11 * ky, 5.6 * k], [0.5, y0 + 15 * ky, 4.2 * k]], 242, 0.75, [DARK, BODY, CRUST]); // entre les groupes
  }
  m.recolor(m.neighborsEmpty(0, 0, -1), [SHELF_DARK, SHELF_MID, SHELF_EDGE], DARK); // lamelles sous les chapeaux
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (m.v[i] === SHELF_DARK && m.get(xi, yi, zi + 1) === 0) m.v[i] = 242; // cœur des chapeaux, vu d'en haut
  });
  return finish(m, new Uint8Array(m.v.length)); // aucune patte
}
