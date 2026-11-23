/**
 * SPRINT STYLES3 : Calcinarque (nom de travail), légendaire Feu, prédateur volcanique. Outil de développement :
 * il n'existe que dans la page `?gallery=styles` ; le jeu (catalogue, Atelier, combats, Carnet) ne le connaît pas.
 *
 * Bête de basalte quadrupède en posture de charge : épaules hautes, arrière-train bas, tête petite et basse projetée
 * en avant, mâchoire lourde à gueule de lave, cornes d'obsidienne pointées comme des lances (la droite ébréchée),
 * yeux fendus lumineux, crête de cristaux de magma décroissante, longue queue terminée par une masse de lave
 * refroidie et fissurée, griffes noires, pattes avant plus puissantes. Pas d'ailes, rien de rond.
 * Unités : celles des créatures sculptées (y vers le haut, z vers l'avant) ; environ 1,6 fois Magmadrake en hauteur.
 *
 * Les volumes du constructeur du jeu sont alignés sur les axes ; pour les angles (cornes, crocs, griffes, pointes,
 * dos en pente), ce fichier a ses propres formes : boîte, « coin » (boîte dont le haut et la largeur varient le
 * long du corps) et pointe orientée. Elles produisent des blocs ordinaires, lus par tous les styles.
 */
import * as THREE from 'three';
import { buildSculptRig, type ColorKey, type SculptDef, type Voxel } from '../../game/models/voxelSculpt';
import { MAGMADRAKE, type StyleSubject, type SubjectModel } from './subject';
import { shadowDisc } from './magmaStyles';

type V3 = [number, number, number];
type Shape =
  | { kind: 'box'; at: V3; half: V3; color: ColorKey; group?: string; mirror?: boolean; glow?: boolean }
  | {
      kind: 'wedge';
      /** De z0 à z1 : bas, haut et demi-largeur varient linéairement. */
      z: [number, number];
      bottom: [number, number];
      top: [number, number];
      half: [number, number];
      x?: number;
      color: ColorKey;
      group?: string;
      mirror?: boolean;
      glow?: boolean;
    }
  | { kind: 'spike'; from: V3; to: V3; r: number; color: ColorKey; group?: string; mirror?: boolean; glow?: boolean };

const box = (at: V3, half: V3, color: ColorKey, o: Partial<{ group: string; mirror: boolean; glow: boolean }> = {}): Shape => ({ kind: 'box', at, half, color, ...o });
const spike = (from: V3, to: V3, r: number, color: ColorKey, o: Partial<{ group: string; mirror: boolean; glow: boolean }> = {}): Shape => ({ kind: 'spike', from, to, r, color, ...o });
const wedge = (
  z: [number, number],
  bottom: [number, number],
  top: [number, number],
  half: [number, number],
  color: ColorKey,
  o: Partial<{ x: number; group: string; mirror: boolean; glow: boolean }> = {},
): Shape => ({ kind: 'wedge', z, bottom, top, half, color, ...o });

const SHAPES: Shape[] = [
  // ---- torse : épaules hautes (2,05) à l'avant, dos qui descend vers l'arrière-train (1,3)
  wedge([-1.15, 1.0], [0.62, 0.78], [1.38, 2.2], [0.5, 0.64], 'primary'),
  wedge([0.95, 1.3], [0.82, 0.9], [2.15, 1.95], [0.64, 0.5], 'primary'), // avant des épaules
  box([0, 1.08, 0.95], [0.54, 0.4, 0.34], 'primary'), // poitrail
  // plaques de basalte irrégulières (gris-brun), un peu en saillie, pas symétriques
  box([0.6, 1.62, 0.55], [0.08, 0.26, 0.32], 'secondary'),
  box([-0.58, 1.5, 0.35], [0.08, 0.22, 0.38], 'secondary'),
  box([0.55, 1.18, -0.45], [0.07, 0.18, 0.3], 'secondary'),
  box([-0.5, 1.12, -0.7], [0.07, 0.2, 0.26], 'secondary'),
  box([0.3, 2.17, 0.55], [0.22, 0.07, 0.26], 'secondary'),
  box([-0.32, 2.08, 0.25], [0.2, 0.07, 0.24], 'secondary'),
  // fissures de lave qui suivent le corps (flancs) ; une cicatrice claire sur l'épaule gauche (asymétrie)
  box([0.6, 1.36, 0.25], [0.06, 0.05, 0.42], 'accent', { mirror: true, glow: true }),
  box([0.6, 1.52, -0.12], [0.06, 0.14, 0.05], 'accent', { mirror: true, glow: true }),
  box([0.56, 1.05, -0.55], [0.06, 0.05, 0.3], 'accent', { mirror: true, glow: true }),
  box([0.6, 1.25, 0.85], [0.06, 0.2, 0.05], 'accent', { glow: true }),
  box([-0.66, 1.72, 0.62], [0.05, 0.04, 0.22], 'secondary'),
  box([-0.66, 1.62, 0.7], [0.05, 0.04, 0.16], 'secondary'),

  // ---- cou, projeté vers l'avant et vers le bas
  wedge([1.2, 1.65], [0.95, 0.98], [1.88, 1.6], [0.4, 0.32], 'primary'),
  // ---- tête : petite, basse ; crâne, museau en coin, mâchoire lourde un peu ouverte sur une gueule de lave
  box([0, 1.42, 1.86], [0.3, 0.2, 0.26], 'primary'),
  wedge([1.95, 2.5], [1.22, 1.24], [1.52, 1.36], [0.27, 0.17], 'primary'),
  box([0, 1.56, 2.0], [0.26, 0.05, 0.1], 'secondary'), // arcade sourcilière, qui écrase le regard
  box([0, 1.0, 2.1], [0.28, 0.11, 0.36], 'secondary'), // mâchoire inférieure
  box([0, 1.15, 2.12], [0.21, 0.05, 0.3], 'accent', { glow: true }), // gueule de lave
  // crocs d'obsidienne : vers le bas depuis le museau, vers le haut depuis la mâchoire
  spike([0.16, 1.24, 2.38], [0.17, 1.02, 2.42], 0.07, 'belly', { mirror: true }),
  spike([0.08, 1.24, 2.2], [0.08, 1.06, 2.22], 0.055, 'belly', { mirror: true }),
  spike([0.21, 1.08, 2.36], [0.22, 1.27, 2.4], 0.06, 'belly', { mirror: true }),
  // yeux fendus, lumineux, sans reflet blanc
  box([0.2, 1.44, 2.13], [0.1, 0.055, 0.04], 'eye', { group: 'eye*', mirror: true, glow: true }),
  // cornes d'obsidienne pointées vers l'avant comme des lances ; la droite est ébréchée (plus courte, émoussée)
  spike([0.23, 1.58, 1.78], [0.36, 1.8, 2.78], 0.12, 'belly'),
  spike([-0.23, 1.58, 1.78], [-0.33, 1.74, 2.42], 0.12, 'belly'),
  box([-0.33, 1.74, 2.4], [0.06, 0.05, 0.05], 'belly'),

  // ---- crête de cristaux de magma, décroissante vers la queue (légèrement penchée vers l'arrière)
  spike([0, 2.12, 0.82], [0, 3.25, 0.58], 0.21, 'accent', { glow: true }),
  spike([0, 1.98, 0.38], [0, 2.9, 0.14], 0.19, 'accent', { glow: true }),
  spike([0, 1.82, -0.04], [0, 2.56, -0.26], 0.17, 'accent', { glow: true }),
  spike([0, 1.66, -0.46], [0, 2.24, -0.66], 0.15, 'accent', { glow: true }),
  spike([0, 1.48, -0.86], [0, 1.94, -1.04], 0.13, 'accent', { glow: true }),
  spike([0, 1.22, -1.36], [0, 1.52, -1.52], 0.1, 'accent', { glow: true, group: 'tail' }),
  spike([0, 1.02, -1.86], [0, 1.26, -2.0], 0.09, 'accent', { glow: true, group: 'tail' }),

  // ---- pattes avant puissantes : épaule, avant-bras, pied, trois griffes noires
  box([0.62, 1.02, 0.82], [0.25, 0.42, 0.3], 'primary', { mirror: true }),
  box([0.64, 0.38, 0.92], [0.23, 0.32, 0.26], 'primary', { mirror: true }),
  box([0.66, 0.1, 1.02], [0.28, 0.1, 0.32], 'secondary', { mirror: true }),
  spike([0.48, 0.14, 1.28], [0.47, 0.0, 1.56], 0.07, 'belly', { mirror: true }),
  spike([0.66, 0.14, 1.3], [0.66, 0.0, 1.6], 0.07, 'belly', { mirror: true }),
  spike([0.84, 0.14, 1.28], [0.86, 0.0, 1.54], 0.07, 'belly', { mirror: true }),
  // ---- pattes arrière, plus fines et plus basses
  box([0.48, 0.66, -0.9], [0.22, 0.32, 0.3], 'primary', { mirror: true }),
  box([0.5, 0.25, -0.8], [0.17, 0.25, 0.2], 'primary', { mirror: true }),
  box([0.5, 0.07, -0.7], [0.21, 0.07, 0.26], 'secondary', { mirror: true }),
  spike([0.4, 0.1, -0.5], [0.4, 0.0, -0.3], 0.06, 'belly', { mirror: true }),
  spike([0.6, 0.1, -0.5], [0.61, 0.0, -0.3], 0.06, 'belly', { mirror: true }),

  // ---- queue longue, anguleuse, qui descend ; masse de lave refroidie, fissurée et lumineuse au bout
  box([0, 1.08, -1.38], [0.27, 0.22, 0.3], 'primary', { group: 'tail' }),
  box([0, 0.88, -1.88], [0.21, 0.17, 0.3], 'primary', { group: 'tail' }),
  box([0, 0.7, -2.34], [0.16, 0.13, 0.26], 'primary', { group: 'tail' }),
  box([0, 0.6, -2.8], [0.3, 0.27, 0.27], 'secondary', { group: 'tail' }),
  box([0, 0.6, -2.8], [0.31, 0.04, 0.28], 'accent', { group: 'tail', glow: true }),
  box([0.08, 0.6, -2.8], [0.04, 0.28, 0.28], 'accent', { group: 'tail', glow: true }),
  box([0, 0.72, -2.8], [0.31, 0.12, 0.035], 'accent', { group: 'tail', glow: true }),
  spike([0.2, 0.8, -2.75], [0.34, 1.02, -2.82], 0.08, 'belly', { group: 'tail' }),
  spike([-0.18, 0.84, -2.9], [-0.3, 1.04, -3.0], 0.08, 'belly', { group: 'tail' }),
];

function inside(s: Shape, x: number, y: number, z: number): boolean {
  if (s.kind === 'box') return Math.abs(x - s.at[0]) <= s.half[0] && Math.abs(y - s.at[1]) <= s.half[1] && Math.abs(z - s.at[2]) <= s.half[2];
  if (s.kind === 'wedge') {
    const [z0, z1] = s.z;
    if (z < Math.min(z0, z1) || z > Math.max(z0, z1)) return false;
    const t = (z - z0) / (z1 - z0);
    const lerp = (a: [number, number]) => a[0] + (a[1] - a[0]) * t;
    return Math.abs(x - (s.x ?? 0)) <= lerp(s.half) && y >= lerp(s.bottom) && y <= lerp(s.top);
  }
  // pointe : rayon qui diminue linéairement de la base à la pointe
  const [ax, ay, az] = s.from;
  const dx = s.to[0] - ax;
  const dy = s.to[1] - ay;
  const dz = s.to[2] - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  const t = ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / len2;
  if (t < 0 || t > 1) return false;
  const px = ax + dx * t - x;
  const py = ay + dy * t - y;
  const pz = az + dz * t - z;
  return px * px + py * py + pz * pz <= (s.r * (1 - t)) ** 2;
}

const groupName = (s: Shape, side: 1 | -1): string => {
  const g = s.group ?? 'body';
  return g.endsWith('*') ? g.slice(0, -1) + (side === 1 ? 'L' : 'R') : g;
};

const cache = new Map<number, Voxel[]>();
/** Blocs de Calcinarque à `res` blocs par unité (la dernière forme qui couvre un bloc décide de sa couleur). */
export function calcinarqueVoxels(res: number): Voxel[] {
  const hit = cache.get(res);
  if (hit) return hit;
  const out: Voxel[] = [];
  const lo = [-1.1, 0, -3.2];
  const hi = [1.1, 3.4, 2.9];
  for (let xi = Math.floor(lo[0] * res); xi <= Math.ceil(hi[0] * res); xi++)
    for (let yi = 0; yi <= Math.ceil(hi[1] * res); yi++)
      for (let zi = Math.floor(lo[2] * res); zi <= Math.ceil(hi[2] * res); zi++) {
        const x = (xi + 0.5) / res;
        const y = (yi + 0.5) / res;
        const z = (zi + 0.5) / res;
        let cell: Voxel | null = null;
        for (const s of SHAPES)
          for (const side of s.mirror ? ([1, -1] as const) : ([1] as const)) {
            if (!inside(s, x * side, y, z)) continue;
            cell = { x: xi, y: yi, z: zi, color: s.color, group: groupName(s, side), ...(s.glow ? { glow: true } : {}) };
          }
        if (cell) out.push(cell);
      }
  cache.set(res, out);
  return out;
}

/** Hauteur et longueur (unités de forme), pour le rapport et les tests à l'œil. */
export const CALCINARQUE_SIZE = { height: 3.25, length: 6.0 };

const RIG_DEF: SculptDef = { shapes: [], eyes: ['eyeL', 'eyeR'], extras: [{ group: 'tail', pivot: [0, 1.1, -1.12] }] };

/** A : la construction de base, comme ART 3 (même constructeur, ajouts de rendu, ombre au sol nette). */
function buildA(): SubjectModel {
  const resA = Math.round(14 / 1.6);
  const parts = buildSculptRig({ ...RIG_DEF, voxels: calcinarqueVoxels(resA) }, CALCINARQUE.palette, resA, CALCINARQUE.glowBase, 0.16, false, true);
  const root = new THREE.Group();
  const content = new THREE.Group();
  content.add(parts.bodyPivot);
  content.scale.setScalar(CALCINARQUE.scale);
  root.add(content);
  const disc = shadowDisc();
  disc.scale.setScalar(CALCINARQUE.scale * CALCINARQUE.discScale);
  root.add(disc);
  const tail = parts.extras[0];
  return {
    root,
    setNight: () => {}, // uniforme partagé des créatures sculptées (setCreatureNight)
    // repos : la queue balance un peu (la respiration et la pulsation de la lave sont communes à tous les styles)
    animate: (t) => {
      if (tail) tail.rotation.y = Math.sin(t * 0.9) * 0.12;
    },
  };
}

export const CALCINARQUE: StyleSubject = {
  id: 'calcinarque',
  label: 'Calcinarque',
  // basalte presque noir, gris-brun, obsidienne, lave orange (et jaune pour les yeux)
  palette: { primary: '#2A2321', secondary: '#5A4B42', belly: '#0D0B10', accent: '#FF6410', eye: '#FFC21F', white: '#FFFFFF', dark: '#0D0B10' },
  scale: MAGMADRAKE.scale, // mêmes unités : sa forme est déjà 1,6 fois plus haute
  rel: 1 / 1.6,
  discScale: 2.6,
  glowBase: 0.45, // Feu
  frame: 1.75,
  voxelsAt: calcinarqueVoxels,
  rigDef: RIG_DEF,
  buildA,
  // B : 15 volumes francs
  bigBlocks: [
    { at: [0, 1.4, -0.05], size: [1.15, 1.25, 2.3], color: 'primary' }, // torse
    { at: [0, 2.15, 0.1], size: [0.22, 0.4, 1.9], color: 'accent' }, // crête de lave
    { at: [0, 1.36, 1.95], size: [0.58, 0.48, 0.75], color: 'primary' }, // tête
    { at: [0, 1.0, 2.12], size: [0.56, 0.22, 0.72], color: 'secondary' }, // mâchoire
    { at: [0, 1.15, 2.14], size: [0.42, 0.1, 0.6], color: 'accent' }, // gueule
    { at: [0.3, 1.7, 2.3], size: [0.16, 0.16, 0.95], color: 'belly' }, // corne gauche
    { at: [-0.3, 1.66, 2.12], size: [0.16, 0.16, 0.6], color: 'belly' }, // corne droite, ébréchée
    { at: [0.2, 1.44, 2.33], size: [0.2, 0.1, 0.04], color: 'eye' },
    { at: [-0.2, 1.44, 2.33], size: [0.2, 0.1, 0.04], color: 'eye' },
    { at: [0.64, 0.7, 0.9], size: [0.5, 1.4, 0.6], color: 'secondary' }, // patte avant
    { at: [-0.64, 0.7, 0.9], size: [0.5, 1.4, 0.6], color: 'secondary' },
    { at: [0.5, 0.48, -0.8], size: [0.4, 0.96, 0.5], color: 'secondary' }, // patte arrière
    { at: [-0.5, 0.48, -0.8], size: [0.4, 0.96, 0.5], color: 'secondary' },
    { at: [0, 0.85, -1.95], size: [0.38, 0.34, 1.3], color: 'primary' }, // queue
    { at: [0, 0.6, -2.8], size: [0.6, 0.54, 0.54], color: 'accent' }, // masse de lave
  ],
};
