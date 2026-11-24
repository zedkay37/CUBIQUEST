/**
 * Lignée Crabloc → Crabastion (eau) : « crabe de roche ». Plan de corps : large et bas, carapace ovale de roche de récif,
 * deux pinces ÉGALES (pas une pince géante), trois pattes de chaque côté, yeux sur de courts pédoncules (visibles d'en
 * haut et depuis la caméra de combat). Distinct de la lignée Aquabloc (quadrupède trapu à carapace en bandes).
 *
 * Interdits évités (fiche §4.6) : pas de rouge-orangé, pas d'objet manufacturé (les « tourelles » de la forme finale
 * sont des aiguilles de roche naturelles, en groupe, jamais une rangée), pas de couronne.
 * Signature qui grandit : stade 1 = joints lumineux de la carapace et des pinces ; forme finale = pinces massives,
 * aiguilles de roche veinées de lumière sur la carapace (éboulis), bord de carapace lumineux.
 * Lecture du dessus : ovale large, pinces qui dépassent devant, yeux en avant, lueur sur le dessus de la carapace.
 */
import { EYE, Model } from '../voxlib';
import { BODY, BONE, CRUST, DARK, finish, shade, topLava } from './_commun';

export function pince(stage: 1 | 3): Model {
  const fin = stage === 3;
  const k = fin ? 1.45 : 1;
  const W = 20;
  const L = fin ? 30 : 22;
  const H = fin ? 26 : 15;
  const m = new Model(W, L, H);
  const cx = m.cx;
  const cy = L * 0.55;
  const legH = (fin ? 3.4 : 4.4) * k; // hauteur du dessous de la carapace
  const rx = fin ? 7.0 : 6.2;
  const ry = 5.6 * k;
  const rz = (fin ? 2.9 : 3.3) * k;
  const sz = legH + rz; // centre de la carapace

  // --- carapace ovale, un peu plus large à l'avant ; bord épais
  m.ellipsoid([cx, cy, sz], [rx, ry, rz], BODY);
  m.ellipsoid([cx, cy - ry * 0.25, sz + rz * 0.35], [rx * 0.8, ry * 0.75, rz * 0.8], BODY); // bosse avant
  m.ellipsoid([cx, cy, sz - rz * 0.4], [rx + 0.4, ry + 0.3, rz * 0.45], BODY); // bord
  // --- pattes : trois de chaque côté, coude relevé puis pointe au sol
  for (let j = 0; j < 3; j++) {
    const py = cy - ry * 0.35 + j * ry * 0.45;
    const r = fin ? 1.25 : 1.0;
    // pattes écartées vers l'extérieur : coude relevé au bord, pointe loin du corps (pas des piliers)
    m.capsule([rx - 1.5, py, sz - 0.5], [rx + 0.8, py + 0.4, sz + 0.8 * k], r, r * 0.95, BODY, true); // coude relevé
    m.capsule([rx + 0.8, py + 0.4, sz + 0.8 * k], [rx + 2.8, py + 1.0, 0.7], r * 0.95, r * 0.8, BODY, true); // jambe en biais
  }
  // --- pinces égales : bras, avant-bras, pince (doigt fixe et doigt mobile, bouts de nacre)
  const pw = fin ? 3.2 : 1.8; // épaisseur de la pince (elle grossit beaucoup : signature)
  const px = rx * 0.55;
  const pFront = cy - ry - (fin ? 4.6 : 3.4);
  // une pince par côté ; Crabloc (farceur, porte du lot 5) lève la pince gauche pour saluer (asymétrie)
  const claw = (s: 1 | -1, lift: number) => {
    const X = (o: number) => cx + s * o;
    m.capsule([X(rx * 0.6), cy - ry * 0.6, sz], [X(px + 1.6), cy - ry - 0.8, sz - 0.6 + lift * 0.6], pw * 0.6, pw * 0.55, BODY); // bras
    m.ellipsoid([X(px + 1.4), pFront + pw * 1.2, sz - 0.4 + lift], [pw, pw * 1.3, pw * 0.9], BODY); // paume
    m.capsule([X(px + 1.8), pFront + pw * 0.8, sz + pw * 0.2 + lift], [X(px + 1.0), pFront - pw * 0.2, sz + pw * 0.1 + lift * 1.3], pw * 0.55, pw * 0.35, BODY); // doigt fixe
    m.capsule([X(px + 1.0), pFront + pw * 0.8, sz - pw * 0.55 + lift], [X(px + 0.6), pFront - pw * 0.1, sz - pw * 0.4 + lift * 0.6], pw * 0.45, pw * 0.3, BONE); // doigt mobile (pince entrouverte)
  };
  claw(1, fin ? 0 : 2.6);
  claw(-1, 0);
  // --- yeux sur pédoncules, au-dessus de l'avant de la carapace
  const ey = Math.floor(cy - ry * 0.75);
  const et = Math.round(sz + rz + (fin ? 1.5 : 2.6));
  m.capsule([2.0, ey + 1.5, sz + rz * 0.6], [2.0, ey + 0.8, et - 0.5], 1.0, 0.95, BODY, true); // pédoncules
  m.box(1, 3, ey - 1, ey + 2, et - 1, et + 1, BODY, true); // tête de l'œil
  m.box(1, 3, ey - 1, ey, et - 1, et + 1, EYE, true); // œil 2 × 2, face à l'avant
  if (fin) m.box(1, 3, ey - 2, ey + 1, et + 1, et + 2, BODY, true); // arcade qui surplombe (forme finale)
  if (!fin) {
    // bouche lisible (porte du lot 5) : grand sourire de farceur sur l'avant de la carapace, coins relevés
    const c = Math.trunc(cx);
    const mz = Math.round(sz - 0.6);
    let my = 0;
    for (let yi = 0; yi < m.l; yi++)
      if (m.get(c, yi, mz) !== 0) {
        my = yi;
        break;
      }
    m.box(c - 2, c + 2, my, my + 1, mz, mz + 1, DARK);
    m.box(2, 3, my, my + 2, mz + 1, mz + 2, DARK, true); // coins relevés
  }

  // --- forme finale : aiguilles de roche en GROUPES sur la carapace (éboulis), jamais une rangée
  if (fin)
    for (const [lat, yy, h] of [
      [2.6, -1.8, 12],
      [4.4, -0.4, 8.5],
      [1.4, 1.6, 10],
      [5.2, 2.4, 6.5],
    ] as const)
      m.capsule([lat, cy + yy * k, sz + rz * 0.6], [lat + 0.5, cy + yy * k + 0.8, sz + rz * 0.6 + h], 1.6, 0.7, CRUST, true);

  shade(m);
  const body = [DARK, BODY, CRUST];
  // joints lumineux : bord avant de la carapace, poignets des pinces
  m.crack([[1.0, cy - ry + 0.4, sz + 0.6], [rx * 0.7, cy - ry * 0.75, sz + 0.3], [rx - 0.4, cy - ry * 0.2, sz]], 241, 0.8, body);
  if (fin) m.crack([[px + 1.4, pFront + pw * 2.0, sz + pw * 0.6], [px + 2.2, pFront + pw * 2.4, sz - 0.4]], 241, 0.8, body);
  if (fin) {
    // veines qui montent dans les aiguilles, et cœur chaud au pied des plus grandes
    for (const [lat, yy, h] of [
      [2.6, -1.8, 12],
      [1.4, 1.6, 10],
    ] as const)
      m.crack([[lat, cy + yy * k, sz + rz * 0.6 + 1], [lat + 0.4, cy + yy * k + 0.7, sz + rz * 0.6 + h - 1]], 241, 0.6, body);
    m.crack([[2.6, cy - 1.8 * k, sz + rz + 0.2], [1.4, cy + 1.6 * k, sz + rz + 0.2]], 242, 0.8, [241]); // cœur chaud, seulement sur la lueur existante
  }
  const legs = m.mask((x, _y, z) => z < legH + 0.3 && Math.abs(x - cx) > rx - 0.6);
  const out = finish(m, legs);
  topLava(out, fin ? 0.075 : 0.035, Math.round(sz + rz * 0.3));
  return out;
}
