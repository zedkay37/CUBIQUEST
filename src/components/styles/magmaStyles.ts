/**
 * SPRINT STYLES (exploration, outil de développement) : six versions de Magmadrake qui ne diffèrent que par le
 * STYLE. Même identité (roche sombre, lave orange), même posture, mêmes proportions : toutes partent de la forme
 * d'ART 3 (`sculptDefs.ts`) ou la reprennent en gros volumes. Rien ici n'est utilisé par le jeu : seule la page
 * `?gallery=styles` importe ce fichier (chargé à la demande).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SPECIES } from '../../game/catalog';
import { buildVoxelCreature } from '../../game/models/creatures';
import { getCrispShadowTexture } from '../../game/models/shared';
import { buildSculptRig, type ColorKey, type SculptPalette, type Voxel } from '../../game/models/voxelSculpt';
import { res, subj } from './subject';

export type StyleId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export const STYLE_LIST: { id: StyleId; name: string; note: string }[] = [
  { id: 'A', name: 'Étalon ART 3', note: 'Le modèle actuel, sans aucun changement.' },
  { id: 'B', name: 'Gros blocs', note: '15 volumes francs, aplats, visage net : esprit jouet.' },
  { id: 'C', name: 'Voxel moyen cohérent', note: 'Une seule taille de bloc (22 de haut), sans micro-détail.' },
  { id: 'D', name: 'Voxel biseauté', note: 'Comme C, arêtes arrondies et ombrage doux.' },
  { id: 'E', name: 'Sculpté lisse', note: 'Finesse d’ART 3, surface fusionnée et lissée.' },
  { id: 'F', name: 'Toon', note: 'Comme C, trois niveaux d’ombre francs et contour noir épais.' },
];

export const SPECIES_ID = 'magmadrake';
const species = SPECIES[SPECIES_ID];
/** Même échelle que le jeu (`buildSculptCreature` : échelle de l'espèce × 1,18). */
export const GAME_SCALE = species.scale * 1.18;

export const PALETTE: SculptPalette = {
  primary: species.palette.primary,
  secondary: species.palette.secondary,
  belly: species.palette.belly,
  accent: species.palette.accent,
  eye: species.palette.eye,
  white: '#FFFFFF',
  dark: '#1B1D24',
};
export const GLOW = 0.25 * 1.35; // lueur de la Roche dans ART 3

/** Une variante construite : l'objet à poser, et la façon de régler sa lueur de nuit. */
export interface StyledModel {
  root: THREE.Group;
  setNight: (night: number) => void;
  /** STYLES2 : réglage de la lumière de la scène le temps de dessiner cette case (puis remis par `after`). */
  before?: (ctx: LightContext) => void;
  after?: (ctx: LightContext) => void;
  /** STYLES2 : passe d'image propre à la variante (pixels, crayon, aquarelle…) appliquée à toute la case. */
  post?: PostPass;
  /** STYLES3 : petite animation de repos propre au modèle (queue qui balance…). */
  animate?: (t: number) => void;
}

export interface LightContext {
  scene: THREE.Scene;
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
}

/** Une passe d'image : la case est d'abord dessinée dans une texture (à `scale` de sa taille), puis ce shader. */
export interface PostPass {
  fragment: string;
  scale?: number;
  /** Filtre « au plus proche » (pixels nets) au lieu du lissage. */
  nearest?: boolean;
}

export function shadowDisc(): THREE.Mesh {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 20),
    new THREE.MeshBasicMaterial({ map: getCrispShadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  return disc;
}

/** Les matériaux lumineux suivent la nuit (même loi qu'ART 3 : jusqu'à 2,4 fois la nuit). */
export function glowController(mats: THREE.MeshStandardMaterial[]): (night: number) => void {
  const base = mats.map((m) => m.emissiveIntensity);
  return (night) => mats.forEach((m, i) => (m.emissiveIntensity = base[i] * (1 + 1.4 * night)));
}

export function wrap(content: THREE.Object3D, glowMats: THREE.MeshStandardMaterial[]): StyledModel {
  const root = new THREE.Group();
  content.scale.setScalar(subj().scale);
  root.add(content);
  const disc = shadowDisc();
  disc.scale.setScalar(subj().scale * subj().discScale);
  root.add(disc);
  return { root, setNight: glowController(glowMats) };
}

// ---------------------------------------------------------------- A : étalon ART 3

function styleA(): StyledModel {
  // STYLES3 : une créature hors du jeu fournit sa propre construction de base (comme ART 3)
  const own = subj().buildA;
  if (own) return own();
  // le modèle du jeu, tel quel (même constructeur, même lumière, mêmes lueurs, même ombre)
  const rig = buildVoxelCreature(SPECIES_ID);
  return { root: rig.root, setNight: () => {} }; // la nuit passe par l'uniforme partagé (setCreatureNight)
}

// ---------------------------------------------------------------- B : gros blocs

function styleB(): StyledModel {
  if (subj().bigBlocks) return bigBlocksModel();
  const mat = (hex: string, glow = 0) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, metalness: 0.02, emissive: glow ? hex : '#000000', emissiveIntensity: glow });
  const m = {
    primary: mat(subj().palette.primary),
    secondary: mat(subj().palette.secondary),
    belly: mat(subj().palette.belly),
    lava: mat(subj().palette.accent, 0.9),
    eye: mat(subj().palette.eye, 0.35),
  };
  const g = new THREE.Group();
  const box = (at: [number, number, number], size: [number, number, number], material: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    b.position.set(...at);
    b.castShadow = true;
    b.receiveShadow = true;
    g.add(b);
  };
  // 15 volumes : mêmes repères que la forme d'ART 3 (corps 1,3 de large, tête haute, queue à lave)
  box([0, 0.66, 0], [1.0, 0.88, 0.9], m.primary); // corps
  box([0, 0.6, 0.47], [0.56, 0.52, 0.06], m.belly); // ventre
  box([0, 1.32, 0.16], [0.74, 0.62, 0.72], m.primary); // tête
  box([0, 1.2, 0.56], [0.44, 0.24, 0.2], m.secondary); // museau
  box([0.18, 1.38, 0.53], [0.16, 0.18, 0.04], m.eye); // œil
  box([-0.18, 1.38, 0.53], [0.16, 0.18, 0.04], m.eye);
  box([0.6, 0.62, 0.12], [0.26, 0.5, 0.28], m.primary); // bras
  box([-0.6, 0.62, 0.12], [0.26, 0.5, 0.28], m.primary);
  box([0.26, 0.12, 0.06], [0.34, 0.24, 0.36], m.secondary); // jambes
  box([-0.26, 0.12, 0.06], [0.34, 0.24, 0.36], m.secondary);
  box([0, 0.94, -0.42], [0.5, 0.1, 0.16], m.lava); // veine de lave du dos
  box([0.22, 1.72, -0.04], [0.14, 0.32, 0.14], m.secondary); // cornes
  box([-0.22, 1.72, -0.04], [0.14, 0.32, 0.14], m.secondary);
  box([0, 0.5, -0.72], [0.26, 0.26, 0.6], m.primary); // queue
  box([0, 0.6, -1.06], [0.3, 0.3, 0.3], m.lava); // braise de la queue
  return wrap(g, [m.lava, m.eye]);
}

/** STYLES3 : B pour une créature qui donne ses 15 volumes (mêmes matières que le B de Magmadrake). */
function bigBlocksModel(): StyledModel {
  const p = subj().palette;
  const mats = new Map<ColorKey, THREE.MeshStandardMaterial>();
  const glowMats: THREE.MeshStandardMaterial[] = [];
  const matFor = (k: ColorKey) => {
    let mm = mats.get(k);
    if (!mm) {
      const glow = k === 'accent' ? 0.9 : k === 'eye' ? 0.6 : 0;
      mm = new THREE.MeshStandardMaterial({ color: p[k], roughness: 0.7, metalness: 0.02, emissive: glow ? p[k] : '#000000', emissiveIntensity: glow });
      if (glow) glowMats.push(mm);
      mats.set(k, mm);
    }
    return mm;
  };
  const g = new THREE.Group();
  for (const b of subj().bigBlocks!) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), matFor(b.color));
    mesh.position.set(...b.at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return wrap(g, glowMats);
}

// ---------------------------------------------------------------- C : voxel moyen cohérent

/** 22 blocs de haut environ : une seule taille de bloc, et les blocs isolés (micro-détails) retirés. */
export const MID_RES = 12;
/** Finesse de C pour la créature courante (12 par unité pour Magmadrake). */
export const midRes = (): number => res(MID_RES);
export function midVoxels(): Voxel[] {
  let vox = subj().voxelsAt(midRes());
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let pass = 0; pass < 2; pass++) {
    const set = new Set(vox.map((v) => key(v.x, v.y, v.z)));
    vox = vox.filter((v) => {
      if (v.group.startsWith('eye')) return true; // les yeux restent entiers
      let n = 0;
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (set.has(key(v.x + dx, v.y + dy, v.z + dz))) n++;
      return n >= 2;
    });
  }
  return vox;
}

function styleC(): StyledModel {
  const def = subj().rigDef;
  // ombre douce réduite de moitié : moins de bruit de surface, les blocs se lisent comme une figurine
  // mêmes ajouts de rendu qu'ART 3 (lueurs, contour, dégradé) : seule la taille des blocs change
  const parts = buildSculptRig({ ...def, voxels: midVoxels() }, subj().palette, midRes(), subj().glowBase, 0.08, false, true);
  const model = wrap(parts.bodyPivot, []);
  return { root: model.root, setNight: () => {} }; // la nuit passe par l'uniforme partagé, comme A
}

// ---------------------------------------------------------------- D : voxel biseauté

export function colorOf(v: Voxel): string {
  // STYLES4 : un bloc venu d'un `.vox` garde sa couleur exacte
  if (v.rgb) return v.rgb;
  return subj().palette[v.color as ColorKey] ?? subj().palette.primary;
}

export function exposed(vox: Voxel[]): Voxel[] {
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const set = new Set(vox.map((v) => key(v.x, v.y, v.z)));
  return vox.filter((v) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => !set.has(key(v.x + dx, v.y + dy, v.z + dz))));
}

function styleD(): StyledModel {
  const vox = exposed(midVoxels());
  const s = 1 / midRes();
  const geo = new RoundedBoxGeometry(s, s, s, 2, s * 0.2);
  const g = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];
  for (const lit of [false, true]) {
    const list = vox.filter((v) => (v.color === 'accent') === lit);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, emissive: lit ? subj().palette.accent : '#000000', emissiveIntensity: lit ? GLOW * 1.6 : 0 });
    if (lit) glowMats.push(mat);
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    list.forEach((v, i) => {
      dummy.position.set((v.x + 0.5) * s, (v.y + 0.5) * s, (v.z + 0.5) * s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, c.set(colorOf(v)));
    });
    inst.castShadow = true;
    inst.receiveShadow = true;
    g.add(inst);
  }
  return wrap(g, glowMats);
}

// ---------------------------------------------------------------- E et F : peau d'un seul tenant

export interface Skin {
  /** Positions et couleurs par face (4 coins), normales calculées plus tard. */
  corners: number[][];
  colors: THREE.Color[];
  glow: boolean[];
}

/** Toutes les faces visibles du modèle, d'un seul tenant (aucune face interne entre les pièces). */
export function buildSkin(vox: Voxel[], res: number): Skin {
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const set = new Set(vox.map((v) => key(v.x, v.y, v.z)));
  const skin: Skin = { corners: [], colors: [], glow: [] };
  const s = 1 / res;
  const dirs: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const v of vox) {
    for (const [dx, dy, dz] of dirs) {
      if (set.has(key(v.x + dx, v.y + dy, v.z + dz))) continue;
      const axis = dx !== 0 ? 0 : dy !== 0 ? 1 : 2;
      const sign = dx + dy + dz;
      const u = (axis + 1) % 3;
      const w = (axis + 2) % 3;
      const quad: number[][] = [];
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const c = [v.x, v.y, v.z];
        c[axis] += sign > 0 ? 1 : 0;
        c[u] += a;
        c[w] += b;
        quad.push(c.map((x) => x * s));
      }
      if (sign < 0) quad.reverse();
      skin.corners.push(...quad);
      const col = new THREE.Color(colorOf(v));
      skin.colors.push(col, col, col, col);
      const lit = v.color === 'accent';
      skin.glow.push(lit, lit, lit, lit);
    }
  }
  return skin;
}

/** Sommets partagés (même position) → numéro unique ; sert au lissage et aux normales moyennes. */
export function sharedIndex(corners: number[][]): { index: number[]; unique: number[][] } {
  const map = new Map<string, number>();
  const unique: number[][] = [];
  const index = corners.map((p) => {
    const k = p.map((x) => x.toFixed(4)).join(',');
    let i = map.get(k);
    if (i === undefined) {
      i = unique.length;
      map.set(k, i);
      unique.push([...p]);
    }
    return i;
  });
  return { index, unique };
}

/** Lissage de Taubin (rétrécit peu) : arrondit les marches sans fondre les volumes. */
export function smooth(unique: number[][], index: number[], passes: number): void {
  const nb: Set<number>[] = unique.map(() => new Set());
  for (let f = 0; f < index.length; f += 4)
    for (let k = 0; k < 4; k++) {
      const a = index[f + k];
      const b = index[f + ((k + 1) % 4)];
      nb[a].add(b);
      nb[b].add(a);
    }
  const step = (lambda: number) => {
    const next = unique.map((p, i) => {
      const n = [...nb[i]];
      const avg = [0, 1, 2].map((d) => n.reduce((acc, j) => acc + unique[j][d], 0) / n.length);
      return p.map((x, d) => x + lambda * (avg[d] - x));
    });
    next.forEach((p, i) => (unique[i] = p));
  };
  for (let i = 0; i < passes; i++) {
    step(0.5);
    step(-0.53);
  }
}

export function vertexNormals(unique: number[][], index: number[]): THREE.Vector3[] {
  const normals = unique.map(() => new THREE.Vector3());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let f = 0; f < index.length; f += 4) {
    for (const [i0, i1, i2] of [[0, 1, 2], [0, 2, 3]]) {
      a.fromArray(unique[index[f + i0]]);
      b.fromArray(unique[index[f + i1]]);
      c.fromArray(unique[index[f + i2]]);
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      for (const k of [i0, i1, i2]) normals[index[f + k]].add(n);
    }
  }
  return normals.map((n) => n.normalize());
}

export function skinGeometry(skin: Skin, positions: number[][], normals: THREE.Vector3[] | null, index: number[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const glw: number[] = [];
  const idx: number[] = [];
  for (let f = 0; f < skin.corners.length; f += 4) {
    const start = pos.length / 3;
    for (let k = 0; k < 4; k++) {
      pos.push(...positions[index[f + k]]);
      if (normals) nor.push(normals[index[f + k]].x, normals[index[f + k]].y, normals[index[f + k]].z);
      const c = skin.colors[f + k];
      col.push(c.r, c.g, c.b);
      glw.push(skin.glow[f + k] ? 1 : 0);
    }
    idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(glw, 1));
  geo.setIndex(idx);
  if (normals) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  else geo.computeVertexNormals();
  return geo;
}

/** La lave luit dans sa propre couleur (attribut par sommet), comme les bobines d'ART 3. */
export function addSkinGlow(mat: THREE.MeshStandardMaterial | THREE.MeshToonMaterial, strength: { value: number }): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSkinGlow = strength;
    shader.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = aGlow;');
    shader.fragmentShader =
      'uniform float uSkinGlow;\nvarying float vGlow;\n' +
      shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * vGlow * uSkinGlow;');
  };
}

export function nightUniform(base: number): { uniform: { value: number }; set: (night: number) => void } {
  const uniform = { value: base };
  return { uniform, set: (night) => (uniform.value = base * (1 + 1.4 * night)) };
}

function styleE(): StyledModel {
  // finesse d'ART 3 (14 blocs par unité), sans pièces séparées : une seule peau, lissée
  const vox = subj().voxelsAt(res(14));
  const skin = buildSkin(vox, res(14));
  const { index, unique } = sharedIndex(skin.corners);
  smooth(unique, index, 6);
  const geo = skinGeometry(skin, unique, vertexNormals(unique, index), index);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.02 });
  const night = nightUniform(0.9);
  addSkinGlow(mat, night.uniform);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const root = wrap(mesh, []);
  return { root: root.root, setNight: night.set };
}

let toonGradient: THREE.DataTexture | null = null;
/** Trois niveaux d'ombre francs (ombre, demi-teinte, lumière). */
export function getToonGradient(): THREE.DataTexture {
  if (toonGradient) return toonGradient;
  const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  toonGradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  toonGradient.minFilter = THREE.NearestFilter;
  toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

function styleF(): StyledModel {
  const vox = midVoxels();
  const skin = buildSkin(vox, midRes());
  const { index, unique } = sharedIndex(skin.corners);
  // faces plates pour le corps (blocs nets), normales moyennes pour gonfler le contour sans fissure
  const flat = skinGeometry(skin, unique, null, index).toNonIndexed();
  flat.computeVertexNormals();
  const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient() });
  const night = nightUniform(0.9);
  addSkinGlow(mat, night.uniform);
  const body = new THREE.Mesh(flat, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  const hullGeo = skinGeometry(skin, unique, vertexNormals(unique, index), index);
  const hullMat = new THREE.MeshBasicMaterial({ color: '#0B0B10', side: THREE.BackSide });
  hullMat.onBeforeCompile = (shader) => {
    // contour noir épais : la coque est gonflée le long des normales moyennes (≈ 0,03 unité de jeu)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * 0.022;');
  };
  const hull = new THREE.Mesh(hullGeo, hullMat);
  const g = new THREE.Group();
  g.add(body, hull);
  const root = wrap(g, []);
  return { root: root.root, setNight: night.set };
}

export function buildStyle(id: StyleId): StyledModel {
  switch (id) {
    case 'A':
      return styleA();
    case 'B':
      return styleB();
    case 'C':
      return styleC();
    case 'D':
      return styleD();
    case 'E':
      return styleE();
    case 'F':
      return styleF();
  }
}
