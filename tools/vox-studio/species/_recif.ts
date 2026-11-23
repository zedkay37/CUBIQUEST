/**
 * Lignée Aquabloc → Corallix → Abyssocube (eau) : « bœuf de récif ». Plan de corps : quadrupède trapu qui porte une
 * carapace de récif en bandes transversales (pas une tortue : pas d'écaille hexagonale, tête non rétractable, épaules
 * en bosse, queue courte à arêtes). La tête est petite, basse, sous un bouclier de nacre qui sert d'arcade aux yeux.
 *
 * Signature qui grandit : stade 1 = dôme de récif et un bourgeon de corail ; stade 2 = branches de corail sur les
 * épaules, joints lumineux entre les bandes ; forme finale = colosse, flèches de corail en deux rangées, veines
 * lumineuses des abysses le long de tous les joints et gorge lumineuse.
 * Lueur turquoise des abysses (langue de matière « eau » validée le 23/11/2026).
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, finish, shade } from './_commun';

type Stage = 1 | 2 | 3;

export function reef(stage: Stage): Model {
  // gabarits : hauteur 14–18 / 18–24 / 24–30 (fiche §4.2)
  const k = stage === 1 ? 1 : stage === 2 ? 1.28 : 1.62;
  const W = stage === 1 ? 16 : stage === 2 ? 18 : 20;
  const L = stage === 1 ? 24 : stage === 2 ? 29 : 34;
  const H = stage === 1 ? 18 : stage === 2 ? 24 : 30;
  const m = new Model(W, L, H);
  const cx = m.cx;
  const c = Math.trunc(cx);
  const legH = stage === 1 ? 4.2 : stage === 2 ? 6.4 : 8.2; // hauteur du ventre
  const bodyY = 11.5 * (stage === 1 ? 1 : stage === 2 ? 1.2 : 1.42);
  const ry = 6.2 * k;
  const rz = 3.9 * (stage === 1 ? 1 : stage === 2 ? 1.15 : 1.3);
  const bodyZ = legH + rz;

  // --- tronc en tonneau, épaules en bosse à l'avant (le dos descend un peu vers l'arrière)
  m.ellipsoid([cx, bodyY, bodyZ], [5.0 + stage * 0.7, ry, rz], BODY);
  m.ellipsoid([cx, bodyY - ry * 0.45, bodyZ + rz * 0.35], [4.2 + stage * 0.7, ry * 0.5, rz * 0.9], BODY); // épaules
  m.ellipsoid([3.2 + stage * 0.7, bodyY - ry * 0.5, bodyZ + rz * 0.6], [2.4 + stage * 0.4, ry * 0.35, rz * 0.7], BODY, true); // bosses d'épaule
  // carapace de récif : dôme posé sur le dos
  const domeZ = bodyZ + rz * 0.55;
  m.ellipsoid([cx, bodyY + 0.4, domeZ], [3.9 + stage * 0.6, ry * 0.9, rz * (1.0 + stage * 0.15)], BODY); // plus étroit que les épaules : un dôme, pas une boîte

  // --- tête petite et basse, sous un bouclier de nacre (séparée du corps par un cou court)
  const headY = bodyY - ry - 1.2 * k;
  const headZ = legH + rz * 0.75;
  m.capsule([cx, bodyY - ry * 0.7, bodyZ], [cx, headY + 1.5, headZ + 0.3], 2.6 + stage * 0.4, 2.3 + stage * 0.3, BODY); // cou
  m.ellipsoid([cx, headY + 1, headZ], [2.9 + stage * 0.35, 2.3 + stage * 0.25, 1.9 + stage * 0.2], BODY);
  const hy = Math.ceil(headY + 1 - (2.3 + stage * 0.25)) - (stage === 1 ? 0 : 1); // face avant de la tête
  const ez = Math.round(headZ); // hauteur des yeux
  m.ellipsoid([cx, hy + 1.6, ez + 2.6], [2.6 + stage * 0.45, 2.3, 0.95 + stage * 0.15], BONE); // bouclier bombé, en surplomb d'un bloc
  m.box(0, 4, hy, hy + 3, ez, ez + 2, BODY, true); // visage, sous le bouclier
  m.box(1, 3, hy, hy + 1, ez, ez + 2, EYE, true); // yeux 2 × 2 sous le bouclier
  m.box(c - 2, c + 2, hy, hy + 3, ez - 2, ez - 1, DARK); // bouche
  if (stage > 1) m.box(2, 3, hy, hy + 1, ez - 3, ez - 1, BONE, true); // défenses de nacre qui descendent
  if (stage === 3) m.box(c - 2, c + 2, hy, hy + 2, ez - 2, ez - 1, 240); // gorge lumineuse des abysses

  // --- pattes : piliers épais ; à la forme finale, coudes sortis et avant-bras massifs
  const fy = bodyY - ry * 0.55;
  const hyL = bodyY + ry * 0.6;
  const lat = 4.0 + stage * 0.7; // pattes écartées : poitrail plus étroit que l'écart des pieds
  const r = 1.9 + stage * 0.25;
  if (stage === 3) m.capsule([lat - 1, fy, legH + 2.5], [lat + 1.6, fy + 0.5, legH - 1], r + 0.4, r + 0.2, BODY, true); // coude sorti
  m.capsule([lat - 0.6, fy, legH + 0.8], [lat + 0.6, fy - 0.3, 1.2], r, r - 0.1, BODY, true);
  m.box(Math.floor(lat - 1), Math.ceil(lat + 2.4), Math.floor(fy - 2), Math.ceil(fy + 2.5), 0, 2, BODY, true);
  m.box(Math.floor(lat - 1), Math.ceil(lat + 2.4), Math.floor(fy - 3), Math.floor(fy - 2), 0, 1, BONE, true); // ongles de nacre
  m.capsule([lat - 0.2, hyL, legH + 0.5], [lat, hyL + 0.4, 1.2], r - 0.1, r - 0.2, BODY, true);
  m.box(Math.floor(lat - 1), Math.ceil(lat + 2), Math.floor(hyL - 2), Math.ceil(hyL + 2.5), 0, 2, BODY, true);
  m.box(Math.floor(lat - 1), Math.ceil(lat + 2), Math.floor(hyL - 3), Math.floor(hyL - 2), 0, 1, BONE, true);

  // --- queue courte, à arêtes
  m.capsule([cx, bodyY + ry * 0.8, bodyZ - 0.5], [cx, Math.min(L - 1.5, bodyY + ry + 3 * k), bodyZ - 1.5 * k], 2.0 + stage * 0.3, 1.2, BODY);

  // --- coraux : bourgeon (1) ; branches sur les épaules (2) ; deux rangées de flèches courtes (3)
  const top = domeZ + rz * (1.0 + stage * 0.15);
  if (stage === 1) {
    m.capsule([1.2, bodyY - 1, top - 0.8], [1.8, bodyY - 1.6, top + 1.6], 1.0, 0.8, BONE, true);
  } else {
    const rows: [number, number, number][] =
      stage === 2
        ? [
            [2.6, bodyY - ry * 0.45, 2.6],
            [3.4, bodyY - ry * 0.1, 2.0],
          ]
        : [
            [2.4, bodyY - ry * 0.55, 4.2],
            [3.2, bodyY - ry * 0.2, 3.6],
            [3.0, bodyY + ry * 0.15, 3.0],
            [2.4, bodyY + ry * 0.5, 2.2],
          ];
    for (const [lx, y, h] of rows) {
      const z0 = top - 1.6;
      m.capsule([lx, y, z0], [lx + 0.8, y - 0.4, z0 + h], 1.15, 0.85, BONE, true);
      // petite branche latérale
      m.capsule([lx + 0.6, y - 0.2, z0 + h * 0.55], [lx + 1.8, y - 0.6, z0 + h * 0.85], 0.8, 0.7, BONE, true);
    }
  }

  shade(m);
  // bandes de carapace : un joint sombre tous les 3 blocs, en travers du dos
  const bandStep = 3;
  m.each((i, _x, y, z) => {
    if (m.v[i] === CRUST && z > domeZ + 0.5 && Math.floor(y) % bandStep === 0) m.v[i] = DARK;
  });
  const body = [DARK, BODY, CRUST];
  // joints lumineux : un au stade 1 (petit), tous les joints du dos ensuite (veines en plus aux stades 2 et 3)
  const seamYs = [...Array(L).keys()].filter((y) => y % bandStep === 0 && y > bodyY - ry * 0.9 && y < bodyY + ry * 0.9);
  const mid = Math.floor(seamYs.length / 2);
  const lit = stage === 1 ? seamYs.slice(Math.max(0, mid - 1), mid + 1) : seamYs;
  for (const y of lit) {
    const half = stage === 1 ? 2.4 : stage === 2 ? 4.0 : 5.4;
    m.crack([[0.5, y + 0.5, top + 0.2], [half * 0.6, y + 0.5, top - 0.6], [half, y + 0.5, top - (stage === 1 ? 1.6 : 2.8)]], 241, stage === 2 ? 0.72 : 0.95, body);
  }
  if (stage >= 2) {
    // veine le long du bord de la carapace (de chaque côté), et une plus basse sur le flanc à la forme finale
    const side = 3.9 + stage * 0.6 - 0.2;
    m.crack([[side, bodyY - ry * 0.7, domeZ], [side + 0.3, bodyY, domeZ - 0.4], [side, bodyY + ry * 0.7, domeZ]], 241, 0.85, body);
    if (stage === 3) {
      m.crack([[side - 0.2, bodyY - ry * 0.5, bodyZ - 0.5], [side, bodyY + ry * 0.5, bodyZ - 1]], 241, 0.9, body);
      m.crack([[side - 1.2, bodyY - ry * 0.6, domeZ + rz * 0.6], [side - 1.0, bodyY + ry * 0.6, domeZ + rz * 0.5]], 241, 0.9, body);
    }
  }
  if (stage === 3) m.crack([[0.5, bodyY - ry * 0.4, top + 0.4], [0.5, bodyY + ry * 0.6, top - 0.2]], 242, 0.85, [241, ...body]);
  // bouts de corail lumineux (pas de boule : seulement la dernière tranche de chaque branche)
  if (stage > 1) {
    const tipZ = top + (stage === 2 ? 0.2 : 1.6);
    m.each((i, _x, _y, z) => {
      if (m.v[i] === BONE && z > tipZ) m.v[i] = stage === 2 ? 241 : 242;
    });
  } else {
    m.each((i, _x, _y, z) => {
      if (m.v[i] === BONE && z > top + 0.2) m.v[i] = 241;
    });
  }

  const legs = m.mask((x, _y, z) => z < legH - 0.4 && Math.abs(x - cx) > 1.8);
  return finish(m, legs);
}
