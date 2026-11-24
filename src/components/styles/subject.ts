/**
 * SPRINT STYLES3 : la créature à laquelle on applique les styles (Magmadrake ou Calcinarque).
 * Les vingt styles lisent « la créature courante » ; `withSubject` la fixe le temps de construire une variante.
 * Outil de développement seulement : le jeu n'importe rien d'ici.
 */
import type * as THREE from 'three';
import { SPECIES } from '../../game/catalog';
import { SCULPT_DEFS } from '../../game/models/sculptDefs';
import { voxelize, type ColorKey, type SculptDef, type SculptPalette, type Voxel } from '../../game/models/voxelSculpt';

/** STYLES4 : aussi les créatures lues dans les `.vox` (voxSubjects.ts), d'où une chaîne libre. */
export type SubjectId = string;

/** Ce qu'il faut pour construire une variante (le type complet est dans magmaStyles.ts, évite un cercle d'import). */
export interface SubjectModel {
  root: THREE.Group;
  setNight: (night: number) => void;
  animate?: (t: number) => void;
}

export interface StyleSubject {
  id: SubjectId;
  label: string;
  palette: SculptPalette;
  /** Échelle de la racine, comme dans le jeu (échelle de l'espèce × 1,18). */
  scale: number;
  /** Finesse relative : nombre de blocs par unité × rel (1 pour Magmadrake, 1/1,6 pour Calcinarque, plus grand). */
  rel: number;
  /** Taille de l'ombre au sol, par rapport à celle de Magmadrake. */
  discScale: number;
  /** Lueur des parties d'accent dans le constructeur des créatures (Roche 0,25, Feu 0,45). */
  glowBase: number;
  /** Cadrage de la vue Vitrine (1 = Magmadrake). */
  frame: number;
  voxelsAt(res: number): Voxel[];
  /** Groupes animés (jambes, yeux, pièces annexes) ; les volumes sont remplacés par `voxels`. */
  rigDef: SculptDef;
  /** Style A propre à la créature (sinon : le modèle du jeu). */
  buildA?: () => SubjectModel;
  /** Style B propre à la créature : 15 volumes francs [centre, taille, couleur]. */
  bigBlocks?: { at: [number, number, number]; size: [number, number, number]; color: ColorKey }[];
}

const mag = SPECIES.magmadrake;
export const MAGMADRAKE: StyleSubject = {
  id: 'magmadrake',
  label: 'Magmadrake',
  palette: {
    primary: mag.palette.primary,
    secondary: mag.palette.secondary,
    belly: mag.palette.belly,
    accent: mag.palette.accent,
    eye: mag.palette.eye,
    white: '#FFFFFF',
    dark: '#1B1D24',
  },
  scale: mag.scale * 1.18,
  rel: 1,
  discScale: 1,
  glowBase: 0.25,
  frame: 1,
  voxelsAt: (res) => voxelize(SCULPT_DEFS.magmadrake, res),
  rigDef: SCULPT_DEFS.magmadrake,
};

let current: StyleSubject = MAGMADRAKE;
export const subj = (): StyleSubject => current;
export function withSubject<T>(s: StyleSubject, fn: () => T): T {
  const prev = current;
  current = s;
  try {
    return fn();
  } finally {
    current = prev;
  }
}
/** Nombre de blocs par unité pour la créature courante (même finesse relative). */
export const res = (x: number): number => Math.max(3, Math.round(x * current.rel));
