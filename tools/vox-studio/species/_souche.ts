/**
 * Lignée Bourgéon → Feuilloc → Bourgéoliath (plante) : « sanglier-souche ». Plan de corps : quadrupède trapu en coin,
 * garrot haut et bossu, croupe basse, pattes courtes et épaisses, grosse tête basse au groin long, défenses de bois.
 *
 * Interdits évités (fiche §4.6) : ni bulbe, ni fleur, ni arbre sur le dos (la plante est dans les OREILLES-FEUILLES,
 * les boucliers de feuilles des épaules et les racines des pattes) ; pas de carapace (ce n'est pas une tortue) ;
 * pas de couronne ; pas de rangée continue (spores en pointillé, racines en groupes séparés).
 * Distinct des autres quadrupèdes : Aquabloc (dôme de récif, tête sous un bouclier), Braizard / Cendrox (prédateurs
 * bas et longs), coureur des glaces (haut sur pattes). Ici : un coin, garrot haut, tête basse et lourde.
 *
 * Signature qui grandit : stade 1 = oreilles-feuilles et selle de mousse, petites défenses ; stade 2 = boucliers de
 * feuilles sur les épaules (« feuilles carrées qui se replient en bouclier »), nervures lumineuses ; forme finale =
 * colosse, boucliers aux épaules et aux hanches, racines qui enserrent les pattes et s'ancrent au sol, arceaux de
 * racines et pousses en groupes sur le garrot, grandes défenses relevées.
 * Langue « plante » : écorce brun sombre, mousse et feuilles vertes en touches, bois clair, spores vert-jaune.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, LEAF, MOSS, drawnSince, finish, placeEyes, shade, topLava, topPatches } from './_commun';

export function souche(stage: 1 | 2 | 3): Model {
  const k = stage === 1 ? 1 : stage === 2 ? 1.28 : 1.6;
  // gabarit : plus haut et plus court qu'un vrai sanglier (hauteurs de la fiche §4.2, longueur ≤ 34)
  const kz = k * 1.75; // vertical
  const ky = k * 0.84; // longueur
  const m = new Model(28, Math.ceil(27 * ky) + 4, Math.ceil(20 * kz) + 3);
  const cx = m.cx;
  const legH = 2.3 * kz; // ventre bas : pattes courtes
  const rxS = 3.4 + 1.1 * stage; // demi-largeur des épaules
  const yS = 10.5 * ky; // épaules
  const yB = 15 * ky; // ventre
  const yH = 19 * ky; // croupe
  const zS = legH + 3.0 * kz;

  // --- tronc en coin : garrot haut et bossu, croupe plus basse
  m.ellipsoid([cx, yS, zS], [rxS, 3.6 * ky, 3.1 * kz], BODY); // épaules
  m.ellipsoid([cx, yS + 0.5 * ky, zS + 1.6 * kz], [rxS * 0.66, 2.8 * ky, 1.5 * kz], BODY); // bosse du garrot
  m.ellipsoid([cx, yS - 2.2 * ky, zS - 1.0 * kz], [rxS * 0.62, 1.8 * ky, 2.2 * kz], BODY); // poitrail
  m.ellipsoid([cx, yB, legH + 2.5 * kz], [rxS * 0.84, 4.0 * ky, 2.6 * kz], BODY); // ventre
  m.ellipsoid([cx, yH, legH + 2.2 * kz], [rxS * 0.76, 2.8 * ky, 2.4 * kz], BODY); // croupe
  m.ellipsoid([rxS * 0.5, yH + 0.2 * ky, legH + 1.9 * kz], [1.5 + 0.35 * stage, 2.2 * ky, 2.0 * kz], BODY, true); // jambons

  // --- cou court et épais ; tête lourde et basse, groin long
  const hs = stage === 1 ? 1.4 : stage === 2 ? 1.12 : 1; // stade 1 : tête plus grosse (30–35 %)
  const hr = 2.3 * k * hs;
  const hyC = yS - 5.4 * ky;
  const hzC = zS + (stage === 1 ? 0.9 : stage === 2 ? 0.3 : 0) * kz; // tête portée au niveau du garrot : elle se lit au-dessus du corps
  m.capsule([cx, yS - 2.4 * ky, zS + 0.6 * kz], [cx, hyC + 1.2 * ky, hzC + 0.3 * kz], 2.6 * k, 2.1 * k, BODY); // cou
  m.ellipsoid([cx, hyC, hzC], [hr * 0.95, hr, hr * 1.05], BODY); // crâne
  m.ellipsoid([hr * 0.5, hyC + 0.4 * ky, hzC - 0.8 * kz], [hr * 0.45, hr * 0.6, hr * 0.55], BODY, true); // mâchoires
  const snoutTip = hyC - hr - (stage === 1 ? 0.8 : 1.5) * ky;
  m.capsule([cx, hyC - hr * 0.5, hzC - 0.6 * kz], [cx, snoutTip, hzC - 0.9 * kz], 1.55 * k, 1.3 * k, BODY); // groin
  const nz = Math.round(hzC - 0.9 * kz);
  const ny = Math.floor(snoutTip - 1.3 * k + 0.5);
  const nw = Math.max(1, Math.round(1.0 * k));
  m.box(0, nw, ny, ny + 1, nz - nw, nz + nw, DARK, true); // disque du groin (sombre)
  m.box(0, 1, ny, ny + 1, nz - nw, nz + nw, BODY, true); // cloison entre les narines
  // défenses de bois, de plus en plus grandes et relevées
  const tl = 0.6 + 0.8 * stage;
  const tz = hzC - 1.0 * kz - 1.0 * k;
  m.capsule([1.2 * k, snoutTip + 1.2 * k, tz], [1.2 * k + 0.45 * tl, snoutTip + 1.2 * k - 0.5 * tl, tz + tl], stage === 1 ? 0.8 : 0.95, 0.7, BONE, true);
  // oreilles-feuilles, couchées vers l'arrière et l'extérieur
  const el = 1.6 + 0.6 * stage;
  m.capsule([hr * 0.55, hyC + 0.6 * ky, hzC + hr * 0.7], [hr * 0.55 + el * 0.8, hyC + 0.6 * ky + el, hzC + hr * 0.7 + el * 0.75], 1.25, 0.9, LEAF, true);
  // yeux 2 × 2 sur le devant du crâne, au-dessus du groin ; arcade d'écorce dès le stade 2
  const eo = Math.max(1, Math.round(hr * 0.42));
  const ez = Math.round(hzC + 0.3 * kz);
  placeEyes(m, eo, ez, Math.ceil(hyC), EYE);
  if (stage > 1) m.box(eo - 1, eo + 2, Math.floor(hyC - hr * 0.98), Math.floor(hyC - hr * 0.5), ez + 2, ez + 3, BODY, true); // arcade

  // --- queue courte, touffe de feuilles (rien de lumineux au bout)
  m.capsule([cx, yH + 2.4 * ky, legH + 3.2 * kz], [cx, yH + 3.6 * ky, legH + 3.6 * kz], 0.9 * k, 0.7 * k, BODY);
  m.ellipsoid([cx, yH + 4.0 * ky, legH + 3.8 * kz], [1.0, 1.0, 1.0], LEAF);

  // --- boucliers de feuilles (stade 2 et plus) : posés sur l'épaule ; nervure lumineuse plus bas
  if (stage > 1) m.ellipsoid([rxS - 0.2, yS - 0.2 * ky, zS + 0.6 * kz], [1.0, 2.4 * ky, 1.9 * kz], LEAF, true);
  if (stage === 3) m.ellipsoid([rxS * 0.8, yH - 0.4 * ky, legH + 2.8 * kz], [1.0, 1.9 * ky, 1.5 * kz], LEAF, true); // hanches
  // --- forme finale : arceaux de racines et pousses en GROUPES sur le garrot et la croupe (pas d'arbre)
  const zTop = zS + 3.9 * kz; // dessus de la bosse
  if (stage === 3) {
    for (const [y0, y1, z0] of [
      [yS - 0.9 * ky, yS + 1.1 * ky, zTop - 0.6],
      [yH - 1.2 * ky, yH + 0.6 * ky, legH + 4.4 * kz],
    ] as const)
      m.capsule([rxS * 0.2, y0, z0], [rxS * 0.62, y1, z0 - 1.8 * k], 0.95, 0.85, DARK, true);
    for (const [lx, yy, zz, h] of [
      [1.2, yS - 0.2 * ky, zTop - 0.4, 1.8],
      [2.2, yS + 0.8 * ky, zTop - 0.9, 1.3],
      [1.4, yH, legH + 4.6 * kz, 1.4],
    ] as const)
      m.capsule([lx, yy, zz], [lx + 0.3, yy + 0.4, zz + h], 0.9, 0.7, LEAF, true);
  }

  // --- pattes courtes et épaisses, sabots de bois fendus ; à la forme finale, racines qui s'ancrent au sol
  const before = m.v.slice();
  const lat = rxS - 0.8;
  const lr = 1.25 + 0.35 * stage;
  for (const ly of [yS, yH]) {
    m.capsule([lat - 0.4, ly, zS - 1.6 * kz], [lat, ly - 0.3 * ky, legH * 0.5], lr * 1.25, lr, BODY, true);
    m.ellipsoid([lat, ly - 0.3 * ky, legH * 0.5], [lr * 1.05, lr * 1.05, lr], BODY, true); // genou
    m.capsule([lat, ly - 0.3 * ky, legH * 0.5], [lat, ly, 1.4], lr, lr * 0.9, BODY, true);
    m.box(Math.floor(lat - lr * 0.85), Math.ceil(lat + lr * 0.85), Math.floor(ly - lr * 0.95 - 0.4), Math.ceil(ly + lr * 0.75 - 0.4), 0, 2, BONE, true); // sabot
    const fx = Math.trunc(lat);
    m.box(fx, fx + 1, Math.floor(ly - lr - 0.4), Math.floor(ly - lr + 0.6), 0, 2, 0, true); // fente
    if (stage === 3) {
      m.capsule([lat + 0.6, ly - 0.4, 3.2], [lat + 1.9, ly - 1.6, 0.6], 0.9, 0.8, DARK, true); // racine vers l'avant
      m.capsule([lat + 0.6, ly + 0.6, 3.0], [lat + 1.8, ly + 1.9, 0.6], 0.9, 0.8, DARK, true); // racine vers l'arrière
      m.capsule([lat - 1.0, ly - 0.2, 4.0], [lat + 1.0, ly + 0.2, 5.0], 0.8, 0.8, DARK, true); // racine qui enserre la patte
    }
  }
  const legDrawn = drawnSince(m, before);

  shade(m);
  const body = [DARK, BODY, CRUST];
  // nervures lumineuses des feuilles (boucliers), pointes des pousses
  if (stage > 1) m.crack([[rxS + 0.7, yS - 2.0 * ky, zS + 1.2 * kz], [rxS + 0.7, yS + 1.6 * ky, zS + 0.4 * kz]], 241, 0.7, [LEAF]);
  if (stage === 3) m.crack([[rxS * 0.8 + 0.9, yH - 1.8 * ky, legH + 3.2 * kz], [rxS * 0.8 + 0.9, yH + 1.0 * ky, legH + 2.6 * kz]], 241, 0.7, [LEAF]);
  if (stage === 3)
    m.each((i, _x, _y, z) => {
      if (m.v[i] === LEAF && !legDrawn[i] && z > zTop + 0.6) m.v[i] = 242;
    });
  // gueule entrouverte : une fente de spores sous le groin (signature, en petit)
  m.crack([[0.5, snoutTip + 0.6 * k, tz - 0.4], [1.2 * k, snoutTip + 1.6 * k, tz - 0.4]], 240, 0.6, body);

  const legs = m.mask((_x, _y, z) => z < legH - 0.4);
  for (let i = 0; i < legs.length; i++) legs[i] = legs[i] && legDrawn[i] ? 1 : 0;
  // selle de mousse sur le garrot et la croupe (vue du dessus), en plaques séparées
  topPatches(
    m,
    [
      [rxS * 0.3, yS + 0.4 * ky, 1.2 + 0.5 * stage],
      [rxS * 0.35, yH - 0.2 * ky, 0.9 + 0.4 * stage],
    ],
    Math.round(zS),
    legs,
    MOSS,
  );
  const out = finish(m, legs);
  topLava(out, stage === 1 ? 0.03 : stage === 2 ? 0.045 : 0.055, Math.round(zS), 'pointillé');
  return out;
}
