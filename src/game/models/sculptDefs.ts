/**
 * Créatures refaites avec le constructeur « volumes → blocs » (sprint Art, section 1) : les trois lignées du
 * trio Braise. Unités : 1 = la hauteur d'un petit compagnon environ ; y vers le haut, z vers l'avant.
 * Chaque lignée garde ses couleurs (catalog.ts) et ses traits signature ; l'évolution grandit et s'enrichit.
 */
import type { SculptDef, SculptShape, Vec3 } from './voxelSculpt';

const E = (at: Vec3, size: Vec3, color: SculptShape['color'], group?: string, mirror = false): SculptShape => ({ kind: 'ellipsoid', at, size, color, group, mirror });
const B = (at: Vec3, size: Vec3, color: SculptShape['color'], group?: string, mirror = false): SculptShape => ({ kind: 'box', at, size, color, group, mirror });
const C = (at: Vec3, to: Vec3, r: number, color: SculptShape['color'], group?: string, mirror = false): SculptShape => ({ kind: 'capsule', at, to, size: [r, 0, 0], color, group, mirror });
const K = (at: Vec3, size: Vec3, color: SculptShape['color'], group?: string, mirror = false): SculptShape => ({ kind: 'cone', at, size, color, group, mirror });

/** Deux yeux d'au moins 3 × 3 blocs, avec un reflet blanc. */
const eyes = (x: number, y: number, z: number, w = 0.08, h = 0.1): SculptShape[] => [
  B([x, y, z + 0.01], [w, h, 0.075], 'eye', 'eye*', true),
  B([x - w * 0.3, y + h * 0.4, z + 0.07], [0.05, 0.05, 0.035], 'white', 'eye*', true),
];

const LEGS = { legs: ['legL', 'legR'], eyes: ['eyeL', 'eyeR'] };

// ---------------------------------------------------------------- lignée Pyrocube (Feu)

const pyrocube: SculptDef = {
  ...LEGS,
  extras: [{ group: 'tail', pivot: [0, 0.38, -0.3] }],
  shapes: [
    B([0, 0.52, 0], [0.34, 0.32, 0.31], 'primary'),
    B([0, 0.46, 0.2], [0.24, 0.22, 0.14], 'belly'),
    C([0.34, 0.66, 0.06], [0.46, 0.46, 0.14], 0.09, 'primary', 'body', true),
    B([0, 1.1, 0.04], [0.36, 0.25, 0.32], 'primary', 'head'),
    B([0, 1.0, 0.33], [0.18, 0.1, 0.06], 'belly', 'head'),
    K([0.22, 1.3, -0.02], [0.11, 0.26, 0.03], 'secondary', 'crest', true),
    K([0.23, 1.46, -0.02], [0.07, 0.14, 0.02], 'accent', 'crest', true),
    ...eyes(0.16, 1.14, 0.33),
    C([0.17, 0.3, 0], [0.18, 0.1, 0.03], 0.11, 'secondary', 'leg*', true),
    B([0.18, 0.05, 0.07], [0.11, 0.05, 0.13], 'secondary', 'leg*', true),
    C([0, 0.38, -0.3], [0, 0.5, -0.5], 0.08, 'primary', 'tail'),
    B([0, 0.58, -0.56], [0.1, 0.1, 0.1], 'accent', 'tail'),
  ],
};

const flambrix: SculptDef = {
  ...LEGS,
  extras: [{ group: 'tail', pivot: [0, 0.42, -0.34] }],
  shapes: [
    B([0, 0.58, 0], [0.38, 0.38, 0.35], 'primary'),
    B([0, 0.52, 0.24], [0.26, 0.26, 0.14], 'belly'),
    C([0.38, 0.74, 0.06], [0.52, 0.48, 0.16], 0.11, 'primary', 'body', true),
    E([0.52, 0.44, 0.17], [0.1, 0.09, 0.1], 'secondary', 'body', true),
    // crête dorsale : trois pointes de braise
    K([0, 0.92, -0.28], [0.1, 0.22, 0.02], 'secondary'),
    K([0, 0.74, -0.38], [0.09, 0.2, 0.02], 'secondary'),
    K([0, 0.56, -0.42], [0.08, 0.16, 0.02], 'accent'),
    B([0, 1.22, 0.06], [0.38, 0.27, 0.34], 'primary', 'head'),
    B([0, 1.12, 0.38], [0.2, 0.11, 0.06], 'belly', 'head'),
    // cornes de flamme
    K([0.24, 1.42, -0.04], [0.11, 0.26, 0.03], 'secondary', 'crest', true),
    K([0.27, 1.6, -0.06], [0.07, 0.16, 0.02], 'accent', 'crest', true),
    ...eyes(0.17, 1.26, 0.36),
    C([0.19, 0.34, 0], [0.2, 0.1, 0.04], 0.13, 'secondary', 'leg*', true),
    B([0.2, 0.06, 0.08], [0.13, 0.06, 0.15], 'secondary', 'leg*', true),
    C([0, 0.42, -0.34], [0, 0.56, -0.58], 0.1, 'primary', 'tail'),
    B([0, 0.66, -0.66], [0.13, 0.13, 0.13], 'accent', 'tail'),
  ],
};

const ignisaur: SculptDef = {
  ...LEGS,
  // plaques d'abord : l'animation « winged » soulève les deux premières pièces
  extras: [
    { group: 'wingL', pivot: [-0.2, 0.82, -0.32] },
    { group: 'wingR', pivot: [0.2, 0.82, -0.32] },
    { group: 'tail', pivot: [0, 0.4, -0.36] },
  ],
  shapes: [
    B([0, 0.6, 0], [0.4, 0.4, 0.37], 'primary'),
    B([0, 0.54, 0.26], [0.27, 0.28, 0.14], 'belly'),
    C([0.4, 0.72, 0.1], [0.54, 0.5, 0.2], 0.11, 'primary', 'body', true),
    B([0, 1.24, 0.1], [0.36, 0.27, 0.34], 'primary', 'head'),
    B([0, 1.14, 0.46], [0.22, 0.12, 0.1], 'secondary', 'head'),
    K([0.2, 1.42, -0.06], [0.08, 0.28, 0.02], 'accent', 'crest', true),
    ...eyes(0.17, 1.3, 0.42),
    // plaques de lave sur le dos, qui se soulèvent comme des volets (pièces animées)
    B([-0.2, 1.0, -0.36], [0.16, 0.2, 0.08], 'secondary', 'wingL'),
    B([-0.2, 1.1, -0.42], [0.1, 0.1, 0.06], 'accent', 'wingL'),
    B([0.2, 1.0, -0.36], [0.16, 0.2, 0.08], 'secondary', 'wingR'),
    B([0.2, 1.1, -0.42], [0.1, 0.1, 0.06], 'accent', 'wingR'),
    C([0.2, 0.34, 0], [0.22, 0.1, 0.04], 0.14, 'primary', 'leg*', true),
    B([0.22, 0.06, 0.08], [0.14, 0.06, 0.16], 'secondary', 'leg*', true),
    C([0, 0.4, -0.36], [0, 0.5, -0.72], 0.11, 'primary', 'tail'),
    B([0, 0.58, -0.8], [0.15, 0.15, 0.15], 'accent', 'tail'),
  ],
};

// ---------------------------------------------------------------- lignée Ampoulin (Foudre)

const ampoulin: SculptDef = {
  ...LEGS,
  extras: [{ group: 'tail', pivot: [0, 0.36, -0.34] }],
  shapes: [
    B([0, 0.5, 0], [0.33, 0.32, 0.33], 'primary'),
    B([0, 0.46, 0], [0.35, 0.07, 0.35], 'secondary'),
    B([0, 0.62, 0.34], [0.18, 0.04, 0.03], 'accent'),
    B([0, 0.9, 0], [0.335, 0.22, 0.335], 'primary', 'head'),
    B([0, 1.09, 0], [0.15, 0.06, 0.15], 'secondary', 'crest'),
    B([0, 1.2, 0], [0.08, 0.06, 0.08], 'accent', 'crest'),
    ...eyes(0.14, 0.94, 0.33, 0.1, 0.075),
    B([0.35, 0.62, 0], [0.06, 0.16, 0.22], 'secondary', 'body', true),
    C([0.4, 0.52, 0.1], [0.46, 0.36, 0.14], 0.08, 'primary', 'body', true),
    B([0.16, 0.08, 0.03], [0.11, 0.08, 0.13], 'secondary', 'leg*', true),
    C([0, 0.36, -0.34], [0, 0.3, -0.6], 0.07, 'secondary', 'tail'),
    B([0, 0.3, -0.68], [0.1, 0.09, 0.08], 'accent', 'tail'),
  ],
};

const bobinard: SculptDef = {
  ...LEGS,
  extras: [{ group: 'tail', pivot: [0, 0.4, -0.38] }],
  shapes: [
    B([0, 0.56, 0], [0.36, 0.38, 0.36], 'primary'),
    // bobines de cuivre (ART3 : elles luisent)
    { ...B([0, 0.36, 0], [0.38, 0.06, 0.38], 'secondary'), glow: true },
    { ...B([0, 0.56, 0], [0.38, 0.06, 0.38], 'secondary'), glow: true },
    B([0, 0.7, 0.37], [0.2, 0.04, 0.03], 'accent'),
    B([0, 1.0, 0], [0.365, 0.26, 0.365], 'primary', 'head'),
    B([0, 1.22, 0], [0.17, 0.06, 0.17], 'secondary', 'crest'),
    C([0, 1.28, 0], [0, 1.42, 0], 0.07, 'accent', 'crest'),
    ...eyes(0.15, 1.06, 0.36, 0.11, 0.08),
    B([0.39, 0.7, 0], [0.07, 0.2, 0.24], 'secondary', 'body', true),
    C([0.44, 0.6, 0.1], [0.52, 0.4, 0.16], 0.09, 'primary', 'body', true),
    B([0.18, 0.09, 0.03], [0.12, 0.09, 0.14], 'secondary', 'leg*', true),
    C([0, 0.4, -0.38], [0, 0.34, -0.66], 0.08, 'secondary', 'tail'),
    B([0, 0.34, -0.76], [0.12, 0.1, 0.09], 'accent', 'tail'),
  ],
};

const voltacier: SculptDef = {
  ...LEGS,
  // ailettes de bobine d'abord (elles tournent), puis la fiche
  extras: [
    { group: 'wingL', pivot: [-0.44, 0.92, -0.08] },
    { group: 'wingR', pivot: [0.44, 0.92, -0.08] },
    { group: 'tail', pivot: [0, 0.44, -0.4] },
  ],
  shapes: [
    B([0, 0.6, 0], [0.38, 0.42, 0.38], 'primary'),
    // bobines (ART3 : elles luisent)
    { ...B([0, 0.4, 0], [0.4, 0.06, 0.4], 'secondary'), glow: true },
    { ...B([0, 0.62, 0], [0.4, 0.06, 0.4], 'secondary'), glow: true },
    B([0, 0.78, 0.39], [0.22, 0.05, 0.03], 'accent'),
    B([0, 1.1, 0], [0.385, 0.26, 0.385], 'primary', 'head'),
    B([0, 1.32, 0], [0.18, 0.06, 0.18], 'secondary', 'crest'),
    C([0, 1.38, 0], [0, 1.62, 0], 0.06, 'accent', 'crest'),
    ...eyes(0.16, 1.16, 0.38, 0.11, 0.08),
    B([-0.5, 0.94, -0.08], [0.07, 0.24, 0.26], 'secondary', 'wingL'),
    B([-0.58, 0.94, -0.08], [0.05, 0.14, 0.16], 'accent', 'wingL'),
    B([0.5, 0.94, -0.08], [0.07, 0.24, 0.26], 'secondary', 'wingR'),
    B([0.58, 0.94, -0.08], [0.05, 0.14, 0.16], 'accent', 'wingR'),
    B([0.2, 0.1, 0.04], [0.13, 0.1, 0.15], 'secondary', 'leg*', true),
    C([0, 0.44, -0.4], [0, 0.4, -0.72], 0.08, 'secondary', 'tail'),
    B([0, 0.4, -0.82], [0.13, 0.11, 0.1], 'accent', 'tail'),
  ],
};

// ---------------------------------------------------------------- lignée Cailloc (Roche)

const cailloc: SculptDef = {
  ...LEGS,
  shapes: [
    E([0, 0.5, 0], [0.46, 0.38, 0.42], 'primary'),
    E([0, 0.44, 0.24], [0.28, 0.24, 0.18], 'belly'),
    // bosses de pierre sur le dos
    E([0.18, 0.78, -0.18], [0.16, 0.14, 0.14], 'secondary', 'body', true),
    E([0, 0.68, -0.34], [0.18, 0.16, 0.12], 'secondary'),
    E([0, 1.02, 0.08], [0.38, 0.25, 0.34], 'primary', 'head'),
    E([0.2, 1.22, -0.04], [0.12, 0.1, 0.1], 'secondary', 'crest', true),
    K([0, 1.24, 0.06], [0.08, 0.2, 0.02], 'accent', 'crest'),
    ...eyes(0.15, 1.04, 0.34),
    C([0.38, 0.56, 0.08], [0.5, 0.36, 0.14], 0.11, 'primary', 'body', true),
    B([0.2, 0.1, 0.04], [0.14, 0.1, 0.15], 'secondary', 'leg*', true),
  ],
};

const granitox: SculptDef = {
  ...LEGS,
  shapes: [
    E([0, 0.62, 0], [0.5, 0.46, 0.44], 'primary'),
    E([0, 0.56, 0.26], [0.3, 0.28, 0.18], 'belly'),
    // épaules de roc et fissures d'ambre
    E([0.42, 0.88, -0.02], [0.2, 0.18, 0.2], 'secondary', 'body', true),
    B([0.16, 0.66, 0.42], [0.04, 0.16, 0.03], 'accent', 'body', true),
    E([0, 0.86, -0.36], [0.24, 0.2, 0.12], 'secondary'),
    E([0, 1.22, 0.1], [0.36, 0.26, 0.32], 'primary', 'head'),
    K([0.2, 1.38, -0.02], [0.1, 0.26, 0.02], 'accent', 'crest', true),
    ...eyes(0.15, 1.24, 0.38),
    C([0.5, 0.7, 0.1], [0.64, 0.38, 0.18], 0.14, 'primary', 'body', true),
    E([0.66, 0.32, 0.2], [0.14, 0.12, 0.14], 'secondary', 'body', true),
    B([0.24, 0.12, 0.04], [0.17, 0.12, 0.17], 'secondary', 'leg*', true),
  ],
};

const magmadrake: SculptDef = {
  ...LEGS,
  extras: [{ group: 'tail', pivot: [0, 0.46, -0.4] }],
  shapes: [
    E([0, 0.66, 0], [0.52, 0.46, 0.48], 'primary'),
    E([0, 0.6, 0.28], [0.3, 0.28, 0.2], 'belly'),
    // veines de lave lumineuses
    B([0.2, 0.7, 0.4], [0.04, 0.2, 0.06], 'accent', 'body', true),
    B([0, 0.94, -0.36], [0.24, 0.05, 0.1], 'accent'),
    E([0.42, 0.94, -0.06], [0.2, 0.16, 0.2], 'secondary', 'body', true),
    E([0, 1.32, 0.16], [0.38, 0.32, 0.38], 'primary', 'head'),
    E([0, 1.22, 0.46], [0.22, 0.12, 0.14], 'secondary', 'head'),
    K([0.22, 1.5, -0.04], [0.1, 0.3, 0.02], 'secondary', 'crest', true),
    K([0.25, 1.72, -0.06], [0.06, 0.12, 0.01], 'accent', 'crest', true),
    ...eyes(0.17, 1.36, 0.46),
    C([0.5, 0.76, 0.1], [0.66, 0.42, 0.2], 0.14, 'primary', 'body', true),
    B([0.26, 0.12, 0.06], [0.17, 0.12, 0.18], 'secondary', 'leg*', true),
    C([0, 0.46, -0.4], [0, 0.56, -0.94], 0.13, 'primary', 'tail'),
    E([0, 0.62, -1.02], [0.16, 0.16, 0.16], 'accent', 'tail'),
  ],
};

/** Espèces refaites (les autres gardent leur ancien modèle jusqu'au second sprint). */
export const SCULPT_DEFS: Record<string, SculptDef> = {
  pyrocube,
  flambrix,
  ignisaur,
  voltik: ampoulin,
  sparkube: bobinard,
  raicube: voltacier,
  cailloc,
  granitox,
  magmadrake,
};
