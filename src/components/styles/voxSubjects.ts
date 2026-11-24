/**
 * SPRINT STYLES4 : les créatures de la page `?gallery=styles` lues dans nos VRAIS modèles `.vox` (sprint BESTIAIRE),
 * à la place des anciens modèles construits par le code. Outil de développement : le jeu n'importe rien d'ici, et
 * les `.vox` ne sont que lus (jamais modifiés).
 *
 * Un `.vox` a une finesse fixe (14 blocs par unité, VOX_UNIT). Les styles demandent d'autres finesses (12, 26, 8…) :
 * `voxelsAt` rééchantillonne au plus proche (chaque bloc demandé prend la couleur du bloc d'origine sous son
 * centre). Couleurs : chaque bloc garde sa couleur exacte (`rgb`) ; la lueur devient « accent », les yeux « eye »,
 * pour les styles qui raisonnent par rôle.
 */
import * as THREE from 'three';
import { SPECIES } from '../../game/catalog';
import { VOX_UNIT, parseVox, voxToSculptDef } from '../../game/models/voxFile';
import { buildSculptRig, type SculptDef, type Voxel } from '../../game/models/voxelSculpt';
import { shadowDisc } from './magmaStyles';
import type { StyleSubject, SubjectModel } from './subject';

const GAME_VOX = import.meta.glob('../../assets/vox/*.vox', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const REF_VOX = import.meta.glob('../../../tools/vox-studio/references/*.vox', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** Les quatre créatures de STYLES4 : le Calcinarque légendaire de référence et trois `.vox` détaillés du jeu. */
export const VOX_SUBJECTS_SPEC: { id: string; label: string; file: string; ref: boolean; scaleOf: string; glow: number }[] = [
  { id: 'calcinarque-legendaire', label: 'Calcinarque légendaire', file: 'calcinarque-legendaire', ref: true, scaleOf: 'cendrox', glow: 0.45 },
  { id: 'amanitox', label: 'Amanitox', file: 'amanitox', ref: false, scaleOf: 'amanitox', glow: 0.35 },
  { id: 'crabastion', label: 'Crabastion', file: 'crabastion', ref: false, scaleOf: 'crabastion', glow: 0.35 },
  { id: 'braizard', label: 'Braizard', file: 'braizard', ref: false, scaleOf: 'braizard', glow: 0.45 },
];

/** Rééchantillonnage au plus proche d'une liste de blocs à 14 par unité vers `res` blocs par unité. */
export function resampleVoxels(native: Voxel[], res: number): Voxel[] {
  if (res === VOX_UNIT) return native.map((v) => ({ ...v }));
  const f = res / VOX_UNIT;
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const map = new Map(native.map((v) => [key(v.x, v.y, v.z), v]));
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const v of native)
    [v.x, v.y, v.z].forEach((c, i) => {
      lo[i] = Math.min(lo[i], c);
      hi[i] = Math.max(hi[i], c);
    });
  const out: Voxel[] = [];
  const from = lo.map((c) => Math.floor(c * f));
  const to = hi.map((c) => Math.ceil((c + 1) * f));
  for (let x = from[0]; x < to[0]; x++)
    for (let y = from[1]; y < to[1]; y++)
      for (let z = from[2]; z < to[2]; z++) {
        const src = map.get(key(Math.floor((x + 0.5) / f), Math.floor((y + 0.5) / f), Math.floor((z + 0.5) / f)));
        if (src) out.push({ ...src, x, y, z });
      }
  return out;
}

/** Couleur la plus fréquente d'un rôle (pour les rares styles qui peignent par rôle et non bloc par bloc). */
function dominant(vox: Voxel[], pred: (v: Voxel) => boolean, fallback: string): string {
  const count = new Map<string, number>();
  for (const v of vox) if (pred(v) && v.rgb) count.set(v.rgb, (count.get(v.rgb) ?? 0) + 1);
  let best = fallback;
  let n = 0;
  count.forEach((c, k) => {
    if (c > n) {
      n = c;
      best = k;
    }
  });
  return best;
}

function subjectFrom(spec: (typeof VOX_SUBJECTS_SPEC)[number], buf: ArrayBuffer): StyleSubject {
  const model = parseVox(buf);
  const def: SculptDef = voxToSculptDef(model);
  // rôles lisibles par tous les styles ; chaque bloc garde sa couleur exacte (rgb)
  const native: Voxel[] = (def.voxels ?? []).map((v) => ({
    ...v,
    color: v.glow ? 'accent' : v.group.startsWith('eye') ? 'eye' : 'primary',
  }));
  const rigDef: SculptDef = { ...def, voxels: native };
  const heightUnits = (model.size[2] || 1) / VOX_UNIT;
  const scale = (SPECIES[spec.scaleOf]?.scale ?? 1.2) * 1.18;
  const body = (v: Voxel) => !v.glow && !v.group.startsWith('eye');
  const palette = {
    primary: dominant(native, body, '#555555'),
    secondary: dominant(native, (v) => body(v) && v.y < 3, '#333333'),
    belly: dominant(native, (v) => body(v) && v.y < 2, '#222222'),
    accent: dominant(native, (v) => Boolean(v.glow), '#FF8A30'),
    eye: dominant(native, (v) => v.group.startsWith('eye'), '#FFD02A'),
    white: '#FFFFFF',
    dark: '#151518',
  };
  const subject: StyleSubject = {
    id: spec.id,
    label: spec.label,
    palette,
    scale,
    rel: 1,
    discScale: Math.max(1, (model.size[1] / VOX_UNIT) * 0.55),
    glowBase: spec.glow,
    // Vitrine : cadrage proportionnel à la hauteur réelle (Magmadrake d'origine ≈ 2,6 unités à l'échelle)
    frame: Math.min(1.9, Math.max(0.85, (heightUnits * scale) / 2.6)),
    voxelsAt: (res) => resampleVoxels(native, res),
    rigDef,
    // A : le modèle tel que le jeu le construit (même constructeur, finesse native, ajouts de rendu ART 3)
    buildA: (): SubjectModel => {
      const parts = buildSculptRig(rigDef, palette, VOX_UNIT, spec.glow, 0.16, false, true);
      const root = new THREE.Group();
      const content = new THREE.Group();
      content.add(parts.bodyPivot);
      content.scale.setScalar(scale);
      root.add(content);
      const disc = shadowDisc();
      disc.scale.setScalar(scale * subject.discScale);
      root.add(disc);
      return { root, setNight: () => {} };
    },
  };
  return subject;
}

/** Charge les quatre `.vox` (une fois). */
let cache: Promise<StyleSubject[]> | null = null;
export function loadVoxSubjects(): Promise<StyleSubject[]> {
  cache ??= Promise.all(
    VOX_SUBJECTS_SPEC.map(async (spec) => {
      const pool = spec.ref ? REF_VOX : GAME_VOX;
      const url = Object.entries(pool).find(([p]) => p.endsWith(`/${spec.file}.vox`))?.[1];
      if (!url) throw new Error(`fichier introuvable : ${spec.file}.vox`);
      const buf = await (await fetch(url)).arrayBuffer();
      return subjectFrom(spec, buf);
    }),
  );
  return cache;
}

/** PROTO-MENEUR : charge n'importe quel `.vox` du jeu (ou une référence) comme sujet de style, à la demande. */
export async function loadVoxSubject(spec: (typeof VOX_SUBJECTS_SPEC)[number]): Promise<StyleSubject> {
  const pool = spec.ref ? REF_VOX : GAME_VOX;
  const url = Object.entries(pool).find(([p]) => p.endsWith(`/${spec.file}.vox`))?.[1];
  if (!url) throw new Error(`fichier introuvable : ${spec.file}.vox`);
  return subjectFrom(spec, await (await fetch(url)).arrayBuffer());
}
