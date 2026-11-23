/**
 * ART3 section 4 : fichiers `.vox` (format de MagicaVoxel), lus et écrits sans dépendance.
 *
 * Un fichier `.vox` est une suite de blocs : « VOX » + version, puis MAIN qui contient SIZE (taille du modèle),
 * XYZI (les voxels : x, y, z, numéro de couleur 1 à 255) et RGBA (la palette). Seul le premier modèle est lu.
 *
 * Conventions du jeu (voir docs/guide-vox.md) : MagicaVoxel a Z vers le haut ; le devant de la créature regarde
 * vers −Y. Les dernières cases de la palette ont un rôle :
 *   240 à 247 : lueur d'élément (la partie luit dans sa propre couleur, plus fort la nuit) ;
 *   248 : œil (il cligne) · 249 : reflet de l'œil ;
 *   250 à 252 : jambe gauche · 253 à 255 : jambe droite (elles marchent).
 * Tout le reste forme le corps. Fonctions pures : testées dans vox.test.ts.
 */
import type { SculptDef, Voxel } from './voxelSculpt';

export interface VoxModel {
  size: [number, number, number];
  voxels: { x: number; y: number; z: number; i: number }[];
  /** palette[i] = couleur « #RRGGBB » du numéro i (1 à 255). */
  palette: string[];
}

export const VOX_ROLES = { glow: [240, 247], eye: 248, eyeShine: 249, legL: [250, 252], legR: [253, 255] } as const;

const hex2 = (n: number) => n.toString(16).padStart(2, '0');

/** Palette grise de secours (fichier sans bloc RGBA) : le modèle reste lisible. */
function fallbackPalette(): string[] {
  const p = ['#000000'];
  for (let i = 1; i < 256; i++) {
    const g = 40 + Math.round(((i - 1) / 254) * 200);
    p.push(`#${hex2(g)}${hex2(g)}${hex2(g)}`);
  }
  return p;
}

export function parseVox(buffer: ArrayBuffer): VoxModel {
  const view = new DataView(buffer);
  const tag = (o: number) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
  if (buffer.byteLength < 20 || tag(0) !== 'VOX ') throw new Error('Fichier .vox invalide');
  let size: [number, number, number] | null = null;
  let voxels: VoxModel['voxels'] | null = null;
  let palette: string[] | null = null;
  // bloc MAIN : en-tête de 12 octets, puis ses enfants
  let o = 8 + 12;
  while (o + 12 <= buffer.byteLength) {
    const id = tag(o);
    const content = view.getInt32(o + 4, true);
    const children = view.getInt32(o + 8, true);
    const c = o + 12;
    if (id === 'SIZE' && !size) size = [view.getInt32(c, true), view.getInt32(c + 4, true), view.getInt32(c + 8, true)];
    else if (id === 'XYZI' && !voxels) {
      const n = view.getInt32(c, true);
      voxels = [];
      for (let k = 0; k < n; k++) {
        const b = c + 4 + k * 4;
        voxels.push({ x: view.getUint8(b), y: view.getUint8(b + 1), z: view.getUint8(b + 2), i: view.getUint8(b + 3) });
      }
    } else if (id === 'RGBA') {
      // la couleur n° i est rangée à la place i − 1
      palette = ['#000000'];
      for (let k = 0; k < 255; k++) {
        const b = c + k * 4;
        palette.push(`#${hex2(view.getUint8(b))}${hex2(view.getUint8(b + 1))}${hex2(view.getUint8(b + 2))}`);
      }
    }
    o = c + content + children;
  }
  if (!size || !voxels) throw new Error('Fichier .vox sans modèle');
  return { size, voxels, palette: palette ?? fallbackPalette() };
}

/** Écrit un `.vox` minimal (SIZE, XYZI, RGBA) : sert au fichier d'exemple et aux tests. */
export function writeVox(model: VoxModel): Uint8Array {
  const n = model.voxels.length;
  const sizeLen = 12 + 12;
  const xyziLen = 12 + 4 + n * 4;
  const rgbaLen = 12 + 256 * 4;
  const total = 8 + 12 + sizeLen + xyziLen + rgbaLen;
  const buf = new ArrayBuffer(total);
  const v = new DataView(buf);
  let o = 0;
  const tag = (s: string) => {
    for (let k = 0; k < 4; k++) v.setUint8(o + k, s.charCodeAt(k));
    o += 4;
  };
  const i32 = (x: number) => {
    v.setInt32(o, x, true);
    o += 4;
  };
  tag('VOX ');
  i32(150);
  tag('MAIN');
  i32(0);
  i32(sizeLen + xyziLen + rgbaLen);
  tag('SIZE');
  i32(12);
  i32(0);
  model.size.forEach(i32);
  tag('XYZI');
  i32(4 + n * 4);
  i32(0);
  i32(n);
  for (const p of model.voxels) {
    v.setUint8(o, p.x);
    v.setUint8(o + 1, p.y);
    v.setUint8(o + 2, p.z);
    v.setUint8(o + 3, p.i);
    o += 4;
  }
  tag('RGBA');
  i32(256 * 4);
  i32(0);
  for (let k = 1; k <= 256; k++) {
    const h = model.palette[k] ?? '#000000';
    v.setUint8(o, parseInt(h.slice(1, 3), 16));
    v.setUint8(o + 1, parseInt(h.slice(3, 5), 16));
    v.setUint8(o + 2, parseInt(h.slice(5, 7), 16));
    v.setUint8(o + 3, 255);
    o += 4;
  }
  return new Uint8Array(buf);
}

const inRange = (i: number, r: readonly [number, number]) => i >= r[0] && i <= r[1];

/**
 * Convertit un modèle `.vox` en créature sculptée : mêmes groupes que les créatures du code (corps, yeux, jambes),
 * centrée sur l'axe, posée au sol, le devant vers +Z dans le jeu.
 */
export function voxToSculptDef(model: VoxModel): SculptDef {
  const [sx, sy] = model.size;
  const cx = Math.floor(sx / 2);
  const cy = Math.floor(sy / 2);
  const minZ = Math.min(...model.voxels.map((p) => p.z));
  const voxels: Voxel[] = model.voxels.map((p) => {
    const x = p.x - cx;
    const role = inRange(p.i, VOX_ROLES.legL) ? 'legL' : inRange(p.i, VOX_ROLES.legR) ? 'legR' : p.i === VOX_ROLES.eye || p.i === VOX_ROLES.eyeShine ? (x < 0 ? 'eyeR' : 'eyeL') : 'body';
    return {
      x,
      y: p.z - minZ,
      z: cy - p.y, // devant (−Y dans MagicaVoxel) → +Z dans le jeu
      color: p.i === VOX_ROLES.eyeShine ? 'white' : 'primary',
      group: role,
      rgb: model.palette[p.i],
      ...(inRange(p.i, VOX_ROLES.glow) ? { glow: true } : {}),
    };
  });
  // BESTIAIRE : un quadrupède a ses pattes avant et arrière dans le même groupe (250–252 ou 253–255). Elles sont
  // séparées là où un vide coupe le groupe d'avant en arrière, pour que chaque patte pivote sur sa propre épaule.
  let split = false;
  for (const side of ['legL', 'legR']) {
    const zs = [...new Set(voxels.filter((v) => v.group === side).map((v) => v.z))].sort((a, b) => a - b);
    let cut: number | null = null;
    let widest = 1;
    for (let k = 1; k < zs.length; k++)
      if (zs[k] - zs[k - 1] > widest) {
        widest = zs[k] - zs[k - 1];
        cut = (zs[k] + zs[k - 1]) / 2;
      }
    if (cut === null) continue;
    split = true;
    for (const v of voxels) if (v.group === side) v.group = side + (v.z > cut ? 'F' : 'H');
  }
  const groups = new Set(voxels.map((v) => v.group));
  // ordre des pattes : le moteur fait avancer les pattes de rang pair ensemble, et les impaires à l'opposé
  // (engine/actors.ts) ; avant gauche + arrière droite, puis avant droite + arrière gauche = trot en diagonale
  const legs = split ? ['legLF', 'legRF', 'legRH', 'legLH', 'legL', 'legR'] : ['legL', 'legR'];
  return {
    shapes: [],
    voxels,
    legs: legs.filter((g) => groups.has(g)),
    eyes: ['eyeL', 'eyeR'].filter((g) => groups.has(g)),
  };
}

/** Modèles `.vox` déposés par le joueur ou essayés dans la galerie, par espèce. Vide par défaut. */
const VOX_DEFS: Record<string, SculptDef> = {};
export function registerVoxModel(speciesId: string, model: VoxModel | null): void {
  if (model) VOX_DEFS[speciesId] = voxToSculptDef(model);
  else delete VOX_DEFS[speciesId];
}
export function getVoxDef(speciesId: string): SculptDef | undefined {
  return VOX_DEFS[speciesId];
}
