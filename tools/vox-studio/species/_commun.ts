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
/** Algue (indice propre, porte du lot 5) : le brin que mâchonne Aquabloc. */
export const ALGUE = 5;
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
  cropSymmetric(m);
  return m;
}

/**
 * Recadrage dont la boîte reste centrée sur le plan de symétrie en X (porte du lot 4 : un corps peut être
 * asymétrique, mais les yeux et les pattes doivent rester en miroir dans la boîte du fichier, que le jeu centre).
 * Sur un modèle symétrique, donne exactement le même résultat que crop().
 */
export function cropSymmetric(m: Model): void {
  const { lo, hi } = m.bbox();
  const x0 = Math.min(lo[0], m.w - 1 - hi[0]);
  const x1 = Math.max(hi[0], m.w - 1 - lo[0]);
  const w = x1 - x0 + 1;
  const l = hi[1] - lo[1] + 1;
  const h = hi[2] - lo[2] + 1;
  const v = new Uint8Array(w * l * h);
  for (let x = 0; x < w; x++) for (let y = 0; y < l; y++) for (let z = 0; z < h; z++) v[(x * l + y) * h + z] = m.v[m.idx(x + x0, y + lo[1], z + lo[2])];
  m.w = w;
  m.l = l;
  m.h = h;
  m.v = v;
  m.cx = w / 2;
}

/**
 * Plante (lot 4) : écorce brun sombre (corps), mousse et feuilles en indices propres, bois clair, lueur des spores
 * validée le 23/11. Écart à la langue validée (corps vert mousse) : le vert se fondait dans l'herbe de la Prairie vue
 * d'en haut (même leçon que le feu au lot 2, §4.5) ; la mousse et les feuilles gardent le vert, en touches.
 */
export const MOSS = 5;
export const LEAF = 6;
/** Porte du lot 4 : deux autres verts pour les boucliers de feuilles superposées. */
export const LEAF_CLAIR = 7;
export const LEAF_SOMBRE = 8;
export const PLANTE = {
  ...elementPalette(['#1A1712', '#3A2F23', '#5C4B36', '#C9B48A'], ['#5BE33B', '#A8F05A', '#EFFFB0'], '#FFB02E'),
  [MOSS]: hexrgb('#4A6B2A'),
  [LEAF]: hexrgb('#2E8040'),
  [LEAF_CLAIR]: hexrgb('#5AA83C'),
  [LEAF_SOMBRE]: hexrgb('#1E5A2E'),
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

/**
 * Électrique (lot 5) : ardoise, cuivre, quartz, arc bleu-blanc (validés le 23/11). Le cuivre est réservé aux élytres,
 * aux spires et aux écailles (indice COPPER) : le dessus du corps reste une ardoise plus claire, pour que le cuivre
 * se lise comme une matière, pas comme une couche partout. Yeux jaune d'orage.
 */
export const COPPER = 5;
export const COPPER_DARK = 6;
export const ELEC = {
  ...elementPalette(['#1E2230', '#3A4157', '#5A6584', '#E8E4D8'], ['#2D7BFF', '#6FC3FF', '#E6F7FF'], '#FFE14A'),
  [COPPER]: hexrgb('#B87333'),
  [COPPER_DARK]: hexrgb('#7A4A22'),
};

/**
 * Roche (lot 6) : granit gris, os clair, lueur de cristal froid (validés le 23/11). Indices propres : lichen (détail de
 * matière), glace et cristal pleins (non lumineux), ambre (cornes de Mouflambre). Yeux ambre : ils ressortent sur le gris.
 */
export const LICHEN = 5;
export const GLACE_PLEINE = 6;
export const AMBRE = 7;
/** Plaques et crêtes de pierre claire (porte du lot 6 : de grandes masses de couleur, pas des points). */
export const PLAQUE = 8;
/**
 * Porte du lot 6 : granit d'une teinte principale (dessous, corps et dessus rapprochés : plus de « gravats »), plaques
 * claires en grandes masses (PLAQUE), lueur de cristal en lignes.
 */
export const ROCHE = {
  ...elementPalette(['#404147', '#55565D', '#65666C', '#CFC6B4'], ['#6E9CD8', '#A9C8EE', '#DCEBFF'], '#FFC24A'),
  [PLAQUE]: hexrgb('#A6A194'),
  [LICHEN]: hexrgb('#8A9A4E'),
  [GLACE_PLEINE]: hexrgb('#A9C9EA'),
  [AMBRE]: hexrgb('#D08A36'),
};

/** Bouche : une ligne sombre sur le devant (premier voxel plein en partant de l'avant, au centre), coins réglables. */
export function mouth(m: Model, z: number, half: number, corners: 'haut' | 'bas' | 'plat', color = DARK): number {
  const c = Math.trunc(m.cx);
  let y = 0;
  for (let yi = 0; yi < m.l; yi++)
    if (m.get(c, yi, z) !== 0) {
      y = yi;
      break;
    }
  for (let x = c - half; x < c + half; x++) m.v[m.idx(x, y, z)] = color;
  if (corners !== 'plat') {
    const dz = corners === 'haut' ? 1 : -1;
    for (const x of [c - half - 1, c + half]) if (x >= 0 && x < m.w && m.get(x, y + 1, z + dz) !== 0) m.v[m.idx(x, y + 1, z + dz)] = color;
  }
  return y;
}

/** Première rangée (y) des yeux posés par placeEyes. */
export function eyeRow(m: Model): number {
  let ey = m.l;
  m.each((i, _x, _y, _z, _xi, yi) => {
    if (m.v[i] === 248) ey = Math.min(ey, yi);
  });
  return ey;
}

/**
 * Voile plane triangulaire (membrane d'aile repliée) entre trois points, d'épaisseur `thick` ; avec `mirror`, x est un
 * décalage latéral (les deux côtés). Rien que des triangles pleins : une silhouette nette, de profil comme d'en haut.
 */
export function membrane(m: Model, a: [number, number, number], b: [number, number, number], c: [number, number, number], thick: number, color: number, mirror = true): void {
  const sides = mirror ? [1, -1] : [0];
  for (const s of sides) {
    const P = (p: [number, number, number]): [number, number, number] => [s === 0 ? p[0] : m.cx + s * p[0], p[1], p[2]];
    const A = P(a);
    const B = P(b);
    const C = P(c);
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(n[0], n[1], n[2]) || 1;
    const uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
    const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const uv = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const den = uv * uv - uu * vv;
    m.each((i, x, y, z) => {
      const w = [x - A[0], y - A[1], z - A[2]];
      if (Math.abs((w[0] * n[0] + w[1] * n[1] + w[2] * n[2]) / nl) > thick / 2) return;
      const wu = w[0] * u[0] + w[1] * u[1] + w[2] * u[2];
      const wv = w[0] * v[0] + w[1] * v[1] + w[2] * v[2];
      const sP = (uv * wv - vv * wu) / den;
      const tP = (uv * wu - uu * wv) / den;
      if (sP >= -0.02 && tP >= -0.02 && sP + tP <= 1.02) m.v[i] = color;
    });
  }
}

/**
 * Ligne lumineuse vue d'en haut (porte du lot 6 : la lueur en lignes, jamais en points) : peint les voxels du DESSUS
 * (voisin du haut vide) proches d'une polyligne (décalage latéral, y), des deux côtés, au-dessus de minZ.
 */
export function topLine(m: Model, pts: [number, number][], width: number, color: number, from: number[], minZ = 0, legs?: Mask): void {
  m.each((i, x, y, _z, xi, yi, zi) => {
    if (zi < minZ || (legs && legs[i]) || !from.includes(m.v[i]) || m.get(xi, yi, zi + 1) !== 0) return;
    const lat = Math.abs(x - m.cx);
    for (let j = 0; j + 1 < pts.length; j++) {
      const [ax, ay] = pts[j];
      const [bx, by] = pts[j + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const L2 = dx * dx + dy * dy || 1e-9;
      let t = ((lat - ax) * dx + (y - ay) * dy) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (Math.hypot(lat - ax - t * dx, y - ay - t * dy) <= width) {
        m.v[i] = color;
        return;
      }
    }
  });
}
