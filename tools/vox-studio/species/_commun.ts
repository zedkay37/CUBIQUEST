/**
 * Outils communs aux scripts de créatures (les fichiers qui commencent par « _ » ne sont pas des créatures).
 * Langues de matière validées par le joueur le 23/11/2026 (docs/plan/BESTIAIRE.md).
 */
import { hexrgb, isGlow, type Mask, type Model, type Palette } from '../voxlib';

/**
 * Lave vue d'en haut (correction du 23/11) : sur le DESSUS du corps (voxel de corps dont le voisin du dessus est vide),
 * hors pattes et hors bas du corps, des chevrons de lave symétriques le long du dos. On resserre les chevrons jusqu'à
 * atteindre la part de lueur visée (en surface), sans dépasser le plafond. Ne change aucune forme. À appeler après finish().
 */
export function topLava(m: Model, target: number, minZ: number, midline: 'pointillé' | 'aucune' = 'pointillé'): void {
  const isLeg = (k: number) => k >= 250 && k <= 255;
  const surface = m.surface();
  let surf = 0;
  let glow = 0;
  for (let i = 0; i < surface.length; i++)
    if (surface[i]) {
      surf++;
      if (isGlow(m.v[i])) glow++;
    }
  const cands: { i: number; key: number }[] = [];
  m.each((i, x, y, z, xi, yi, zi) => {
    if (![DARK, BODY, CRUST].includes(m.v[i]) || zi < minZ || m.get(xi, yi, zi + 1) !== 0) return;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (isLeg(m.get(xi + dx, yi + dy, zi + dz))) return;
    const lat = Math.abs(x - m.cx);
    // chevron : ligne médiane, puis branches qui partent vers l'arrière ; plus la clé est petite, plus tôt on peint
    const chev = (y + lat * 1.2) % 4;
    // ligne médiane en pointillé (jamais une bande continue du cou à la queue), ou aucune
    if (lat < 0.9 && (midline === 'aucune' || Math.floor(y) % 3 === 2)) return;
    const key = lat < 0.9 ? 0 : Math.min(chev, 4 - chev) + lat * 0.08;
    cands.push({ i, key: key + z * 1e-4 });
  });
  cands.sort((a, b) => a.key - b.key);
  const want = Math.max(0, Math.round(target * surf) - glow);
  // par paires symétriques : on peint toutes les cases de même clé ensemble
  let n = 0;
  for (let k = 0; k < cands.length && n < want; ) {
    let j = k;
    while (j < cands.length && Math.abs(cands[j].key - cands[k].key) < 1e-9) j++;
    for (let q = k; q < j; q++) m.v[cands[q].i] = cands[q].key < 0.05 ? 242 : 241;
    n += j - k;
    k = j;
  }
}

/** Indices de corps communs : 1 dessous sombre, 2 corps, 3 croûte du dessus, 4 corne / os / nacre. */
export const DARK = 1;
export const BODY = 2;
export const CRUST = 3;
export const BONE = 4;

/** Palette d'un élément : 4 couleurs de corps, 3 de lueur (240 → 242, du plus profond au cœur chaud), l'œil. */
export function elementPalette(body: [string, string, string, string], glow: [string, string, string], eye: string): Palette {
  const [dark, mid, crust, bone] = body.map(hexrgb);
  return {
    1: dark,
    2: mid,
    3: crust,
    4: bone,
    240: hexrgb(glow[0]),
    241: hexrgb(glow[1]),
    242: hexrgb(glow[2]),
    248: hexrgb(eye),
    // pattes : mêmes couleurs que le corps (animées à part)
    250: mid,
    251: crust,
    252: bone,
    253: mid,
    254: crust,
    255: bone,
  };
}

/**
 * Feu : basalte charbon (corps presque noir, dessus un peu plus clair pour le relief), lave orange-jaune. Corrigé le
 * 23/11 après le lot 2 : le basalte brun se fondait dans le sol brun du volcan.
 */
export const FEU = elementPalette(['#0D0B0D', '#1B1718', '#3B322D', '#D2BFA6'], ['#FF3D00', '#FF6A00', '#FFB300'], '#FFD02A');
export const EAU = elementPalette(['#1C2A36', '#2F4C5E', '#5E8597', '#E3DCCB'], ['#00C2A8', '#3DF2D0', '#B8FFF0'], '#9DFFEA');
/**
 * Eau, variante glace (lignée Givrelin) : même ardoise bleue et même lueur, os remplacé par une glace bleutée.
 * Lot 3b : sur les pattes, l'indice « os » (252 / 255) sert aux sabots, sombres pour se détacher de la neige.
 */
export const GLACE = {
  ...elementPalette(['#1C2A36', '#2F4C5E', '#5E8597', '#BFE6F5'], ['#00C2A8', '#3DF2D0', '#B8FFF0'], '#9DFFEA'),
  5: hexrgb('#93BDD0'), // givre du dos (GIVRE, _cerf.ts)
  252: hexrgb('#141C24'),
  255: hexrgb('#141C24'),
};

/** Passes de couleur : dessus clair (croûte), dessous sombre. Ce contraste fait la lisibilité. */
export function shade(m: Model, from = [BODY]): void {
  const up = m.neighborsEmpty(0, 0, 1);
  const down = m.neighborsEmpty(0, 0, -1);
  m.recolor(up, from, CRUST);
  m.recolor(down, from, DARK);
}

/** Pattes → indices animés (250–255), puis contrôle « aucune lueur sur une patte », puis recadrage. */
export function finish(m: Model, legs: Mask): Model {
  m.legsSplit(legs, [
    [BODY, [250, 253]],
    [DARK, [250, 253]],
    [CRUST, [251, 254]],
    [BONE, [252, 255]],
  ]);
  for (let i = 0; i < legs.length; i++) if (legs[i] && isGlow(m.v[i])) throw new Error('lueur sur une patte');
  m.crop();
  return m;
}

/**
 * Plante (lot 4) : écorce brun sombre (corps), mousse et feuilles en indices propres, bois clair, lueur des spores
 * validée le 23/11. Écart à la langue validée (corps vert mousse) : le vert se fondait dans l'herbe de la Prairie vue
 * d'en haut (même leçon que le feu au lot 2, §4.5) ; la mousse et les feuilles gardent le vert, en touches.
 */
export const MOSS = 5;
export const LEAF = 6;
export const PLANTE = {
  ...elementPalette(['#1A1712', '#3A2F23', '#5C4B36', '#C9B48A'], ['#5BE33B', '#A8F05A', '#EFFFB0'], '#FFB02E'),
  [MOSS]: hexrgb('#4A6B2A'),
  [LEAF]: hexrgb('#2E8040'),
};
/** Champignon (lot 4) : même écorce, étagères de polypore en bandes (brun, ocre, crème), même lueur des spores. */
export const SHELF_DARK = 5;
export const SHELF_MID = 6;
export const SHELF_EDGE = 7;
export const CHAMPI = {
  ...elementPalette(['#1A1712', '#3A2F23', '#5C4B36', '#C9B48A'], ['#5BE33B', '#A8F05A', '#EFFFB0'], '#FFB02E'),
  [SHELF_DARK]: hexrgb('#5A3B22'),
  [SHELF_MID]: hexrgb('#B07A3A'),
  [SHELF_EDGE]: hexrgb('#E8D3A0'),
};

/** Taches sur le DESSUS (voisin du haut vide) autour de centres (décalage latéral, y, rayon), hors pattes. */
export function topPatches(m: Model, spots: [number, number, number][], minZ: number, legs: Mask, color: number, from = [BODY, CRUST, DARK]): void {
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (legs[i] || zi < minZ || !from.includes(m.v[i]) || m.get(xi, yi, zi + 1) !== 0) return;
    const lat = Math.abs(x - m.cx);
    if (spots.some(([sl, sy, r]) => (lat - sl) ** 2 + (y - sy) ** 2 <= r * r)) m.v[i] = color;
  });
}

/**
 * Yeux 2 × 2 posés sur le DEVANT de la tête : pour chaque colonne (décalage latéral eo et eo + 1, hauteurs ez et
 * ez + 1), le premier voxel plein en partant de l'avant (y < yMax) devient un œil. Ils ne flottent jamais devant la tête.
 */
export function placeEyes(m: Model, eo: number, ez: number, yMax: number, eye = 248): void {
  const c = Math.trunc(m.cx);
  for (const xi of [c + eo, c + eo + 1, c - eo - 1, c - eo - 2])
    for (const zi of [ez, ez + 1])
      for (let yi = 0; yi < Math.min(yMax, m.l); yi++)
        if (m.get(xi, yi, zi) !== 0) {
          m.v[m.idx(xi, yi, zi)] = eye;
          break;
        }
}

/** Mémorise ce qui est vide, pour savoir ensuite ce qu'une suite de primitives a dessiné (pattes). */
export function drawnSince(m: Model, before: Uint8Array): Mask {
  const out = new Uint8Array(m.v.length);
  for (let i = 0; i < m.v.length; i++) out[i] = before[i] === 0 && m.v[i] !== 0 ? 1 : 0;
  return out;
}
