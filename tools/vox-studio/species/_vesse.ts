/**
 * Lignée Mycélin → Amanitox (plante, champignon) : « porteur de vesse » (esquisse B choisie à la porte du lot 5).
 * Plan de corps : bipède trapu et lourdaud, dos voûté sous une grosse VESSE-DE-LOUP (champignon rond, crème, craquelé)
 * qui lui pousse sur le dos et s'ouvre au sommet par un pore lumineux. Jambes très courtes et rapprochées (petits pas),
 * petits bras posés sur le ventre, tête basse portée devant le poitrail.
 * Distinct du colosse d'Abyssocube (long, bras puissants) : ici rien n'est puissant, tout pèse vers le bas.
 *
 * Personnalité (bible §4.7), qui évolue :
 * - Mycélin, PLACIDE ET DOUILLET (« s'installe à l'ombre des tentes tièdes ») : grosse tête ronde, yeux mi-clos mais
 *   visibles de la caméra, petite bouche tranquille, vesse encore petite et lisse.
 * - Amanitox, VÉNÉRABLE ET LOURDAUD (« là où son chapeau fait de l'ombre, une clairière repousse ») : vesse énorme
 *   et craquelée qui l'écrase, paupières lourdes en surplomb, babine qui pend, barbe de mycélium, petites vesses en
 *   grappe sur une seule épaule (asymétrie), clairière de mousse et de pousses sur les pieds.
 * Détails de matière : écorce en plaques sur le ventre, craquelures ocre de la vesse, pore lumineux, fils de mycélium
 * lumineux sur les bras, orteils de bois, mousse sur les pieds, petits champignons au pied de la vesse.
 * Interdits évités (§4.6) : pas de chapeau sur la tête, ni rouge à pois ; pas d'objet (la vesse est vivante) ; pas de
 * bête à six pattes.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, MOSS, SHELF_DARK, SHELF_EDGE, SHELF_MID, drawnSince, finish, placeEyes, shade } from './_commun';

/** Vesse-de-loup : boule crème, craquelée d'ocre ; pied sombre où elle sort du dos ; pore lumineux au sommet. */
function puffball(m: Model, x: number, y: number, z: number, r: number, cracks: boolean): void {
  m.ellipsoid([x, y, z], [r, r * 0.95, r * 0.88], SHELF_EDGE);
  m.each((i, vx, vy, vz) => {
    if (m.v[i] !== SHELF_EDGE) return;
    const dx = vx - x;
    const dy = vy - y;
    const dz = vz - z;
    if (dx * dx + dy * dy + dz * dz > (r + 0.6) * (r + 0.6)) return;
    // réseau de craquelures (lignes, ni pois ni taches) ; symétrique en x pour le gros de la vesse
    const ax = Math.abs(dx);
    if (cracks && Math.abs(Math.sin(ax * 1.7 + dz * 0.9) * Math.cos(dy * 1.5 - dz * 0.6)) < 0.14) m.v[i] = SHELF_MID;
    if (dz < -r * 0.55) m.v[i] = SHELF_DARK; // pied de la vesse
    const rho = Math.hypot(dx, dy);
    if (dz > r * 0.6 && rho < r * 0.36) m.v[i] = rho < r * 0.17 ? 242 : 241; // pore du sommet
  });
}

export function vesse(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.9 : 1.35;
  const m = new Model(30, Math.ceil(17 * k) + 6, Math.ceil(19 * k) + 4);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const cy = m.l * 0.52;
  const legH = (fin ? 2.0 : 1.9) * k; // jambes très courtes : petits pas

  // --- ventre lourd qui pend devant, dos voûté
  m.ellipsoid([cx, cy - 0.3 * k, legH + 2.9 * k], [3.9 * k, 3.4 * k, 3.2 * k], BODY); // ventre
  m.ellipsoid([cx, cy + 1.0 * k, legH + 4.6 * k], [3.5 * k, 2.8 * k, 2.6 * k], BODY); // dos rond
  m.ellipsoid([2.8 * k, cy - 0.2 * k, legH + 4.9 * k], [1.4 * k, 1.6 * k, 1.3 * k], BODY, true); // épaules tombantes
  // --- tête basse, portée devant le poitrail (sous le niveau du haut du dos)
  const hs = fin ? 1 : 1.12;
  const hr = 2.6 * k * hs;
  const hyC = cy - 3.3 * k;
  const hzC = legH + (fin ? 4.9 : 5.4) * k;
  m.capsule([cx, cy - 1.2 * k, legH + 4.6 * k], [cx, hyC + 0.9 * k, hzC], 2.2 * k, 2.0 * k, BODY); // cou court et épais
  m.ellipsoid([cx, hyC, hzC], [hr * 0.86, hr * 0.84, hr * (fin ? 0.84 : 0.95)], BODY); // crâne rond (plus haut au stade 1)
  m.ellipsoid([hr * 0.55, hyC - hr * 0.35, hzC - hr * 0.45], [hr * 0.4, hr * 0.4, hr * 0.38], BODY, true); // pommettes tombantes
  m.ellipsoid([cx, hyC - hr * 0.72, hzC - hr * 0.38], fin ? [hr * 0.55, hr * 0.35, hr * 0.4] : [hr * 0.42, hr * 0.26, hr * 0.32], BODY); // museau large et court (petit nez rond au stade 1)
  // bouche tranquille (coins à peine tombants) ; babine qui pend à la forme finale
  const mz = Math.round(hzC - hr * 0.55);
  let my = 0;
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, mz) !== 0) {
      my = yi;
      break;
    }
  m.box(c - 2, c + 2, my, my + 1, mz, mz + 1, DARK);
  m.box(2, 3, my + 1, my + 2, mz - 1, mz, DARK, true); // coins un peu tombants : placide, pas fâché
  if (fin) m.box(c - 1, c + 1, my - 1, my, mz - 1, mz, BODY); // babine
  // yeux mi-clos : paupière lourde au-dessus (en surplomb à la forme finale seulement, pour que le stade 1 se lise)
  const eo = Math.max(1, Math.round(hr * 0.36));
  const ez = Math.round(hzC + hr * 0.1);
  placeEyes(m, eo, ez, Math.ceil(hyC), EYE);
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === EYE) ey = Math.min(ey, yi);
  });
  m.box(eo, eo + 2, ey + (fin ? -1 : 0), ey + 2, ez + 2, ez + 3, BODY, true); // paupière
  if (fin) {
    m.capsule([eo + 2.2, ey - 0.2, ez + 2.4], [eo + 3.4, ey + 1.2, ez + 0.6], 0.8, 0.6, BONE, true); // longs sourcils qui tombent
    for (const [lx, len] of [
      [0.6, 3.6],
      [1.8, 2.8],
      [2.8, 2.0],
    ] as const)
      m.capsule([lx, my + 0.6, mz - 0.8], [lx + 0.2, my + 1.2, mz - 0.8 - len], 0.8, 0.6, BONE, true); // barbe de mycélium
  }
  // --- petits bras posés sur le ventre (placide), mains rondes, griffes de bois
  m.capsule([3.4 * k, cy - 0.4 * k, legH + 4.6 * k], [3.4 * k, cy - 2.0 * k, legH + 3.0 * k], 1.15 * k, 1.0 * k, BODY, true);
  m.capsule([3.4 * k, cy - 2.0 * k, legH + 3.0 * k], [1.8 * k, cy - 3.0 * k, legH + 2.4 * k], 1.0 * k, 0.95 * k, BODY, true);
  m.ellipsoid([1.4 * k, cy - 3.2 * k, legH + 2.4 * k], [1.0 * k, 0.9 * k, 0.9 * k], BODY, true); // mains jointes devant le ventre
  m.box(Math.floor(0.4 * k), Math.ceil(1.6 * k), Math.floor(cy - 4.2 * k), Math.floor(cy - 3.6 * k), Math.floor(legH + 2.0 * k), Math.ceil(legH + 2.6 * k), BONE, true);

  // --- la vesse : elle sort du haut du dos et pèse vers l'avant
  const pr = (fin ? 4.2 : 3.0) * k;
  puffball(m, cx, cy + 1.8 * k, legH + 5.2 * k + pr * 0.55, pr, true);
  // petits champignons au pied de la vesse (détail de matière)
  for (const [dx, dy, h] of fin
    ? ([
        [-2.6, 3.4, 1.6],
        [-1.6, 3.9, 1.0],
        [3.0, 3.0, 1.2],
      ] as const)
    : ([[-2.2, 3.0, 1.2]] as const)) {
    const x = cx + dx * k;
    const y = cy + dy * k;
    const z = legH + 5.0 * k;
    m.capsule([x, y, z], [x, y, z + h * k], 0.75, 0.7, BONE);
    m.ellipsoid([x, y, z + h * k + 0.4], [1.2, 1.2, 0.8], SHELF_MID);
  }
  // forme finale : petites vesses en grappe sur UNE épaule (asymétrie permise)
  if (fin) {
    puffball(m, cx + 3.3 * k, cy - 0.4 * k, legH + 6.2 * k, 1.35 * k, false);
    puffball(m, cx + 3.8 * k, cy + 0.9 * k, legH + 5.5 * k, 1.0 * k, false);
    puffball(m, cx + 2.6 * k, cy + 0.6 * k, legH + 7.0 * k, 0.85 * k, false);
  }

  // --- jambes très courtes et rapprochées, pieds larges aux orteils de bois, mousse sur les pieds
  const before = m.v.slice();
  const lat = 2.3 * k;
  const lr = 1.3 * k;
  m.capsule([lat, cy + 0.2 * k, legH + 1.4 * k], [lat + 0.2, cy - 0.2 * k, 1.2], lr * 1.1, lr, BODY, true);
  const fx0 = Math.floor(lat + 0.2 - lr * 0.9);
  const fx1 = Math.ceil(lat + 0.2 + lr * 0.9);
  const fy0 = Math.floor(cy - 1.8 * k);
  m.box(fx0, fx1, fy0, Math.ceil(cy + 1.2 * k), 0, 2, BODY, true); // pied large
  for (const tx of [fx0, Math.floor((fx0 + fx1) / 2), fx1 - 1]) m.box(tx, tx + 1, fy0 - 1, fy0, 0, 1, BONE, true); // trois orteils
  const legDrawn = drawnSince(m, before);

  shade(m);
  // écorce en plaques sur le ventre : sillons sombres (lignes horizontales espacées, devant)
  m.each((i, _x, y, z) => {
    if (m.v[i] === BODY && y < cy - 2.2 * k && Math.round(z) % 3 === 0 && z > legH + 1.5 * k && z < legH + 4.8 * k) m.v[i] = DARK;
  });
  // mousse sur le dessus des pieds (et pousses à la forme finale : « une clairière repousse »)
  m.each((i, _x, _y, _z, xi, yi, zi) => {
    if (legDrawn[i] && m.v[i] === CRUST && m.get(xi, yi, zi + 1) === 0 && zi <= 2) m.v[i] = MOSS;
  });
  // fils de mycélium lumineux le long des bras ; forme finale : aussi sur le dos, entre la vesse et les épaules
  m.crack([[3.5 * k, cy - 0.6 * k, legH + 4.9 * k], [3.6 * k, cy - 2.0 * k, legH + 3.4 * k], [2.0 * k, cy - 3.1 * k, legH + 2.9 * k]], 241, 0.65, [DARK, BODY, CRUST]);
  if (fin) {
    m.crack([[1.0 * k, cy + 3.6 * k, legH + 4.2 * k], [2.8 * k, cy + 2.6 * k, legH + 5.0 * k], [3.6 * k, cy + 0.8 * k, legH + 5.6 * k]], 241, 0.7, [DARK, BODY, CRUST]);
  }
  // craquelures lumineuses près du sommet de la vesse (visibles d'en haut)
  m.each((i, _x, _y, z) => {
    if (m.v[i] === SHELF_MID && z > legH + 5.2 * k + pr * (fin ? 1.05 : 0.85)) m.v[i] = 241;
  });
  const legs = m.mask((_x, _y, z) => z < legH - 0.2);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // sur les pattes, la mousse passe en « croûte » de patte (251 / 254), que la palette du champignon peint en mousse
  for (let i = 0; i < legs.length; i++) if (legs[i] && m.v[i] === MOSS) m.v[i] = CRUST;
  return finish(m, legs);
}
