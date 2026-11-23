/**
 * Calcinarque légendaire : portage ligne à ligne de `../calcinarque_legendaire.py` (modèle de référence validé
 * par le joueur le 23/11/2026). Sert à prouver que le portage de voxlib donne le même fichier, octet pour octet.
 * Silhouette du 10 (Coureur de Cendres), fissures du 14 (Colosse Obsidien), cornes du 13 (Alpha Volcanique).
 */
import { EYE, Model, hexrgb, isGlow, type Palette } from '../voxlib';

export const PALETTE: Palette = {
  1: hexrgb('#1F1B1E'), // charbon (dessous)
  2: hexrgb('#41372F'), // basalte (corps)
  3: hexrgb('#6E5B4C'), // croûte de cendre (dessus)
  4: hexrgb('#D2BFA6'), // corne / griffes / crocs
  240: hexrgb('#FF3D00'),
  241: hexrgb('#FF6A00'),
  242: hexrgb('#FFB300'),
  248: hexrgb('#FFD02A'),
  250: hexrgb('#41372F'),
  251: hexrgb('#6E5B4C'),
  252: hexrgb('#D2BFA6'),
  253: hexrgb('#41372F'),
  254: hexrgb('#6E5B4C'),
  255: hexrgb('#D2BFA6'),
};
const B = 2;
const H = 4;

function head(m: Model, top = 17): void {
  const c = Math.trunc(m.cx);
  // mâchoire inférieure, plus longue que le museau : elle avance
  m.box(-3 + c, 3 + c, 1, 9, 9, 11, B);
  m.box(-2 + c, 2 + c, 0, 1, 9, 11, B);
  // fente de lave (gueule entrouverte)
  m.box(-3 + c, 3 + c, 0, 8, 11, 12, 240);
  // museau supérieur, en marche d'escalier vers l'avant
  m.box(-3 + c, 3 + c, 0, 9, 12, 14, B);
  m.box(-2 + c, 2 + c, 1, 5, 14, 15, B);
  // crâne
  m.box(-4 + c, 4 + c, 4, 10, 12, top, B);
  // arcade sourcilière en surplomb, coupée au milieu
  m.box(1, 5, 3, 7, top - 1, top + 1, B, true);
  // yeux enfoncés sous l'arcade, sur la face avant du crâne
  m.box(2, 4, 4, 5, top - 3, top - 1, EYE, true);
  // crocs de corne qui descendent sur la fente
  m.box(2, 3, 0, 1, 10, 12, H, true);
  // muscles de mâchoire
  m.ellipsoid([3.8, 8, 11.5], [1.6, 2.6, 2.4], B, true);
}

export function build(): Model {
  const m = new Model(20, 34, 30);
  const cx = m.cx;

  // --- tronc : masse à l'avant, épaules = point le plus haut ---
  m.ellipsoid([cx, 12.5, 17], [7.0, 5.5, 5.5], B); // épaules
  m.ellipsoid([3.6, 12, 19], [3.6, 4.4, 4.0], B, true); // bosses d'épaule
  m.ellipsoid([cx, 9.5, 13.5], [4.8, 3.6, 4.6], B); // poitrail étroit (V)
  m.ellipsoid([cx, 18, 14], [4.4, 5.0, 4.0], B); // taille
  m.ellipsoid([cx, 23, 15], [5.2, 4.2, 4.4], B); // arrière-train, plus bas
  m.ellipsoid([3.8, 23.5, 13], [2.8, 4.0, 4.4], B, true); // cuisses
  // plaques de basalte (14)
  m.box(3, 8, 9, 15, 19, 22, B, true);
  m.box(3, 7, 20, 25, 16, 19, B, true);

  // --- cou puissant, descend vers la tête ---
  m.capsule([cx, 12, 18.5], [cx, 7, 15], 4.4, 3.8, B);
  head(m);

  // --- cornes (13) : longues, balayées vers l'arrière puis vers le haut ---
  m.capsule([2.8, 8.0, 17], [4.6, 9.8, 21.0], 1.5, 1.25, H, true);
  m.capsule([4.6, 9.8, 21.0], [5.8, 12.6, 24.0], 1.25, 1.05, H, true);
  m.capsule([5.8, 12.6, 24.0], [6.2, 16.0, 25.6], 1.05, 0.85, H, true);

  // --- piques : deux rangées latérales courtes et irrégulières ---
  for (const [lat, y, z, hgt] of [
    [2.2, 9.5, 20.5, 2.6],
    [3.2, 12, 22.5, 3.4],
    [2.6, 14.5, 22.3, 2.6],
    [3.4, 17, 19.6, 2.0],
    [2.4, 21, 19.3, 2.2],
    [3.0, 23.5, 19, 1.6],
  ])
    m.capsule([lat, y, z], [lat + 0.5, y + 1.5, z + hgt], 1.2, 0.9, 3, true);

  // --- pattes avant : coudes vers l'extérieur ---
  m.capsule([5.0, 12, 14], [7.6, 13, 8.5], 2.9, 2.5, B, true); // bras
  m.capsule([7.6, 13, 8.5], [7.6, 10, 2.2], 2.5, 2.1, B, true); // avant-bras
  m.box(5, 10, 7, 12, 0, 2, B, true); // patte
  m.box(5, 10, 6, 7, 0, 1, H, true); // griffes
  // --- pattes arrière : genou avant, jarret arrière ---
  m.capsule([5.0, 22, 11], [6.2, 26, 5], 2.5, 2.0, B, true);
  m.capsule([6.2, 26, 5], [6.4, 24, 1.8], 2.0, 1.8, B, true);
  m.box(4, 9, 21, 26, 0, 2, B, true);
  m.box(4, 9, 20, 21, 0, 1, H, true);

  // --- queue : épaisse à la base, s'affine et se relève ---
  m.capsule([cx, 26, 15.5], [cx, 30, 16.5], 3.0, 2.2, B);
  m.capsule([cx, 30, 16.5], [cx, 33.3, 19], 2.2, 1.3, B);
  for (const [y, z] of [
    [27.5, 18.2],
    [30.5, 18.4],
  ])
    m.capsule([1.5, y, z], [1.8, y + 1.2, z + 1.5], 1.0, 0.8, 3, true);

  // --- passes de couleur ---
  const up = m.neighborsEmpty(0, 0, 1);
  const down = m.neighborsEmpty(0, 0, -1);
  m.recolor(up, [B], 3);
  m.recolor(down, [B], 1);

  const body = [1, 2, 3];
  // fissures de lave (14)
  m.crack([[0.5, 6.0, 9.5], [2.0, 6.6, 12.5], [3.6, 7.6, 16]], 241, 0.75, body); // poitrail en V
  m.crack([[7.0, 10, 19.5], [7.4, 13, 16.5], [6.8, 16, 13]], 241, 0.75, body); // épaule
  m.crack([[4.6, 17, 16.5], [5.2, 19.5, 14.5], [5.6, 22.5, 15.5], [6.2, 25, 13.5]], 241, 0.75, body); // flanc
  m.crack([[0.5, 8, 21], [0.5, 12.5, 23.2], [0.5, 17, 19.5], [0.5, 22, 20], [0.5, 27, 18.8], [0.5, 33, 20.5]], 241, 0.85, body); // ligne dorsale
  m.crack([[0.5, 11, 23.3], [0.5, 14, 23.3]], 242, 0.9, [241]); // cœur chaud
  m.crack([[0.5, 6.0, 9.5], [1.5, 6.3, 11.5]], 242, 0.9, [241]);
  // cornes : base d'os, moitié extérieure incandescente (masque calculé une fois, comme numpy)
  const horn = m.mask((_x, _y, _z, value) => value === H);
  m.each((i, _x, y, z) => {
    if (horn[i] && y > 11.5 && z > 22) m.v[i] = 241;
  });
  m.each((i, _x, y, z) => {
    if (horn[i] && y > 14.6 && z > 24) m.v[i] = 242;
  });

  // pattes → indices animés
  const legs = m.mask((x, y, z) => z < 9.0 && Math.abs(x - cx) > 3.1 && y > 5.5);
  m.legsSplit(legs, [
    [2, [250, 253]],
    [1, [250, 253]],
    [3, [251, 254]],
    [4, [252, 255]],
  ]);
  for (let i = 0; i < legs.length; i++) if (legs[i] && isGlow(m.v[i])) throw new Error('lave sur une patte');
  m.crop();
  return m;
}
