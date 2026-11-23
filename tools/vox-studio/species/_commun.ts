/**
 * Outils communs aux scripts de créatures (les fichiers qui commencent par « _ » ne sont pas des créatures).
 * Langues de matière validées par le joueur le 23/11/2026 (docs/plan/BESTIAIRE.md).
 */
import { hexrgb, isGlow, type Mask, type Model, type Palette } from '../voxlib';

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

export const FEU = elementPalette(['#1F1B1E', '#41372F', '#6E5B4C', '#D2BFA6'], ['#FF3D00', '#FF6A00', '#FFB300'], '#FFD02A');
export const EAU = elementPalette(['#1C2A36', '#2F4C5E', '#5E8597', '#E3DCCB'], ['#00C2A8', '#3DF2D0', '#B8FFF0'], '#9DFFEA');

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
