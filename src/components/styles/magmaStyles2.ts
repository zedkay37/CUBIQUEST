/**
 * SPRINT STYLES2 (exploration, outil de développement) : quatorze styles de plus pour Magmadrake (G à T).
 * Même règle que A à F : même forme (celle d'ART 3, lue sans être modifiée), même palette d'identité (roche sombre,
 * lave orange), même posture, même taille à l'écran ; seul le STYLE change. Plusieurs variantes prennent des
 * risques (passe d'image, transparence, lumière de la lave) : c'est voulu. Rien ici n'est utilisé par le jeu.
 */
import * as THREE from 'three';
import { buildSculptRig, type Voxel } from '../../game/models/voxelSculpt';
import { res, subj } from './subject';
import {
  addSkinGlow,
  buildSkin,
  colorOf,
  midVoxels,
  nightUniform,
  sharedIndex,
  skinGeometry,
  smooth,
  vertexNormals,
  wrap,
  midRes,
  type LightContext,
  type Skin,
  type StyledModel,
} from './magmaStyles';

export type Style2Id = 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T';
export const STYLE2_LIST: { id: Style2Id; name: string; note: string; risk: string }[] = [
  { id: 'G', name: 'Occlusion par sommet', note: 'Blocs de C, coins et creux assombris en douceur à chaque sommet.', risk: 'Faible' },
  { id: 'H', name: 'Haute définition propre', note: '≈ 48 blocs de haut, une seule taille, couleurs unies sans bruit.', risk: 'Faible' },
  { id: 'I', name: 'Hybride contrôlé', note: 'Corps en gros blocs nets ; détails fins sur la tête, les yeux et la lave.', risk: 'Moyen' },
  { id: 'J', name: 'Briques jointées', note: 'Chaque bloc est une pierre taillée, séparée par un joint sombre.', risk: 'Moyen' },
  { id: 'K', name: 'Figurine vinyle', note: 'Plastique lisse et brillant, reflets nets.', risk: 'Moyen' },
  { id: 'L', name: 'Pastel diffus', note: 'Couleurs pastel, lumière de partout, ombres bleutées.', risk: 'Moyen' },
  { id: 'M', name: 'Gris + une couleur', note: 'Corps gris clair mat ; seule la lave garde sa couleur, très vive.', risk: 'Moyen' },
  { id: 'N', name: 'Toon clair', note: 'Trois tons francs et clairs, contour de la couleur foncée (jamais noir).', risk: 'Moyen' },
  { id: 'O', name: 'Nuit volcanique', note: 'Roche presque noire ; la lave éclaire le sol avec un halo fort.', risk: 'Élevé' },
  { id: 'P', name: 'Cristal', note: 'Roche de cristal fumé semi-transparente ; la lave se voit dedans.', risk: 'Élevé' },
  { id: 'Q', name: 'Polygones facettés', note: 'Plus de cubes : facettes plates et triangles nets.', risk: 'Élevé' },
  { id: 'R', name: 'Pixel 3D', note: 'Dessiné en basse définition puis agrandi, palette de 16 couleurs.', risk: 'Élevé' },
  { id: 'S', name: 'Carton crayonné', note: 'Faces mates un peu irrégulières, traits de crayon, maquette en carton.', risk: 'Élevé' },
  { id: 'T', name: 'Aquarelle', note: 'Ombrage peint à bords doux, papier, couleurs qui bavent.', risk: 'Très élevé' },
];

const LAVA_GLOW = 0.9;

/** Maillage d'un seul tenant à partir d'une peau, avec une matière et la lave qui luit. */
function skinMesh(skin: Skin, material: THREE.MeshStandardMaterial | THREE.MeshToonMaterial | THREE.MeshPhysicalMaterial, opts: { smoothPasses?: number; smoothNormals?: boolean } = {}) {
  const { index, unique } = sharedIndex(skin.corners);
  if (opts.smoothPasses) smooth(unique, index, opts.smoothPasses);
  const geo = skinGeometry(skin, unique, opts.smoothNormals ? vertexNormals(unique, index) : null, index);
  const flat = opts.smoothNormals ? geo : geo.toNonIndexed();
  if (!opts.smoothNormals) flat.computeVertexNormals();
  const night = nightUniform(LAVA_GLOW);
  addSkinGlow(material, night.uniform);
  const mesh = new THREE.Mesh(flat, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, setNight: night.set, unique, index };
}

/** Recolore une peau (même ordre de faces) : chaque couleur passe par `fn`. */
function recolor(skin: Skin, fn: (c: THREE.Color, lava: boolean) => THREE.Color): Skin {
  return { ...skin, colors: skin.colors.map((c, i) => fn(c.clone(), skin.glow[i])) };
}

function done(content: THREE.Object3D, setNight: (n: number) => void, extra: Partial<StyledModel> = {}): StyledModel {
  const model = wrap(content, []);
  return { root: model.root, setNight, ...extra };
}

// ---------------------------------------------------------------- G : occlusion par sommet

/** Peau avec occlusion « classique » des jeux voxel : 4 niveaux par coin selon les deux côtés et le coin voisins. */
function buildSkinAO(vox: Voxel[], res: number): Skin {
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const set = new Set(vox.map((v) => key(v.x, v.y, v.z)));
  const has = (p: number[]) => (set.has(key(p[0], p[1], p[2])) ? 1 : 0);
  const LEVEL = [1, 0.78, 0.6, 0.42];
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
      const shades: number[] = [];
      for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const c = [v.x, v.y, v.z];
        c[axis] += sign > 0 ? 1 : 0;
        c[u] += a;
        c[w] += b;
        quad.push(c.map((x) => x * s));
        const o = [v.x, v.y, v.z];
        o[axis] += sign;
        const n1 = [...o];
        n1[u] += a ? 1 : -1;
        const n2 = [...o];
        n2[w] += b ? 1 : -1;
        const n3 = [...n1];
        n3[w] += b ? 1 : -1;
        const s1 = has(n1);
        const s2 = has(n2);
        shades.push(LEVEL[s1 && s2 ? 3 : s1 + s2 + has(n3)]);
      }
      if (sign < 0) {
        quad.reverse();
        shades.reverse();
      }
      skin.corners.push(...quad);
      const base = new THREE.Color(colorOf(v));
      const lit = v.color === 'accent';
      for (const sh of shades) {
        skin.colors.push(lit ? base.clone() : base.clone().multiplyScalar(sh));
        skin.glow.push(lit);
      }
    }
  }
  return skin;
}

function styleG(): StyledModel {
  const skin = buildSkinAO(midVoxels(), midRes());
  const { mesh, setNight } = skinMesh(skin, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.02 }));
  return done(mesh, setNight);
}

// ---------------------------------------------------------------- H : haute définition propre

function styleH(): StyledModel {
  const vox = subj().voxelsAt(res(26)); // ≈ 48 blocs de haut
  const { mesh, setNight } = skinMesh(buildSkin(vox, res(26)), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.02 }));
  return done(mesh, setNight);
}

// ---------------------------------------------------------------- I : hybride contrôlé

function styleI(): StyledModel {
  const fineGroups = new Set(['head', 'eyeL', 'eyeR', 'crest']);
  const isFine = (v: Voxel) => fineGroups.has(v.group) || v.color === 'accent';
  const coarse = subj().voxelsAt(res(8)).filter((v) => !isFine(v));
  const fine = subj().voxelsAt(res(18)).filter(isFine);
  const g = new THREE.Group();
  // gros blocs nets pour le corps (ombre de blocs réduite), détails fins là où le regard va
  const body = buildSculptRig({ ...subj().rigDef, voxels: coarse }, subj().palette, res(8), subj().glowBase, 0.05, false, true);
  const details = buildSculptRig({ ...subj().rigDef, voxels: fine }, subj().palette, res(18), subj().glowBase, 0.12, false, true);
  g.add(body.bodyPivot, details.bodyPivot);
  return done(g, () => {});
}

// ---------------------------------------------------------------- J : briques jointées

function styleJ(): StyledModel {
  const skin = buildSkin(midVoxels(), midRes());
  const { index, unique } = sharedIndex(skin.corners);
  const geo = skinGeometry(skin, unique, null, index).toNonIndexed();
  geo.computeVertexNormals();
  // coordonnées locales de chaque face (0 à 1) : le joint est tracé près des bords
  const uv: number[] = [];
  const faceId: number[] = [];
  const corners = [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]];
  for (let f = 0; f < skin.corners.length / 4; f++)
    for (const c of corners) {
      uv.push(c[0], c[1]);
      faceId.push(f);
    }
  geo.setAttribute('aFaceUv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aFaceId', new THREE.Float32BufferAttribute(faceId, 1));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  const night = nightUniform(LAVA_GLOW);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSkinGlow = night.uniform;
    shader.vertexShader =
      'attribute float aGlow;\nattribute vec2 aFaceUv;\nattribute float aFaceId;\nvarying float vGlow;\nvarying vec2 vFaceUv;\nvarying float vFaceId;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = aGlow;\n  vFaceUv = aFaceUv;\n  vFaceId = aFaceId;');
    shader.fragmentShader =
      'uniform float uSkinGlow;\nvarying float vGlow;\nvarying vec2 vFaceUv;\nvarying float vFaceId;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  // pierre taillée : chaque bloc a sa nuance, un bord un peu plus clair, et un joint sombre
  float stone = fract(sin(vFaceId * 12.9898) * 43758.5453);
  diffuseColor.rgb *= 0.88 + 0.2 * stone;
  float d = min(min(vFaceUv.x, 1.0 - vFaceUv.x), min(vFaceUv.y, 1.0 - vFaceUv.y));
  diffuseColor.rgb *= 1.0 + 0.18 * smoothstep(0.16, 0.08, d);
  float joint = smoothstep(0.07, 0.04, d);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.02, 0.02), joint * (1.0 - vGlow));`,
        )
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * vGlow * uSkinGlow;');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return done(mesh, night.set);
}

// ---------------------------------------------------------------- K : figurine vinyle

function styleK(): StyledModel {
  // couleurs un peu plus franches (plastique teinté dans la masse), arêtes adoucies, vernis brillant
  const skin = recolor(buildSkin(midVoxels(), midRes()), (c, lava) => (lava ? c : c.offsetHSL(0, 0.12, 0.06)));
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6 });
  const { mesh, setNight } = skinMesh(skin, mat, { smoothPasses: 2, smoothNormals: true });
  return done(mesh, setNight);
}

// ---------------------------------------------------------------- L : pastel diffus

function styleL(): StyledModel {
  const skin = recolor(buildSkin(midVoxels(), midRes()), (c, lava) => (lava ? c.lerp(new THREE.Color('#FFD2B8'), 0.35) : c.lerp(new THREE.Color('#F4E8FF'), 0.5)));
  // les ombres tirent vers le bleu : une lumière propre bleutée remonte les zones sombres
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: '#3B4C8C', emissiveIntensity: 0.32 });
  const { mesh, setNight } = skinMesh(skin, mat);
  const saved = { hemi: 0, key: 0, sky: new THREE.Color(), ground: new THREE.Color() };
  return done(mesh, setNight, {
    before: (ctx: LightContext) => {
      saved.hemi = ctx.hemi.intensity;
      saved.key = ctx.key.intensity;
      saved.sky.copy(ctx.hemi.color);
      saved.ground.copy(ctx.hemi.groundColor);
      ctx.hemi.intensity *= 2.2;
      ctx.hemi.color.set('#FFE6F2');
      ctx.hemi.groundColor.set('#AFC2FF');
      ctx.key.intensity *= 0.45;
    },
    after: (ctx: LightContext) => {
      ctx.hemi.intensity = saved.hemi;
      ctx.key.intensity = saved.key;
      ctx.hemi.color.copy(saved.sky);
      ctx.hemi.groundColor.copy(saved.ground);
    },
  });
}

// ---------------------------------------------------------------- M : gris + une couleur

function styleM(): StyledModel {
  const grey = new THREE.Color('#C9C7C2');
  const skin = recolor(buildSkin(midVoxels(), midRes()), (c, lava) => (lava ? new THREE.Color('#FF4A10') : grey.clone().multiplyScalar(c.r + c.g + c.b < 0.15 ? 0.72 : 1)));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const night = nightUniform(2.6);
  addSkinGlow(mat, night.uniform);
  const { index, unique } = sharedIndex(skin.corners);
  const geo = skinGeometry(skin, unique, null, index).toNonIndexed();
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return done(mesh, night.set);
}

// ---------------------------------------------------------------- N : toon clair

let lightToon: THREE.DataTexture | null = null;
function getLightToonGradient(): THREE.DataTexture {
  if (lightToon) return lightToon;
  const data = new Uint8Array([175, 175, 175, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
  lightToon = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  lightToon.minFilter = THREE.NearestFilter;
  lightToon.magFilter = THREE.NearestFilter;
  lightToon.needsUpdate = true;
  return lightToon;
}

function styleN(): StyledModel {
  const skin = recolor(buildSkin(midVoxels(), midRes()), (c, lava) => (lava ? c : c.lerp(new THREE.Color('#FFFFFF'), 0.18).multiplyScalar(1.15)));
  const { mesh, setNight, unique, index } = skinMesh(skin, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getLightToonGradient() }));
  // contour coloré : la version foncée de chaque couleur, jamais du noir
  const dark = recolor(skin, (c) => c.multiplyScalar(0.38));
  const hullGeo = skinGeometry(dark, unique, vertexNormals(unique, index), index);
  const hullMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  hullMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * 0.02;');
  };
  const g = new THREE.Group();
  g.add(mesh, new THREE.Mesh(hullGeo, hullMat));
  return done(g, setNight);
}

// ---------------------------------------------------------------- O : nuit volcanique

let haloTex: THREE.CanvasTexture | null = null;
export function getHaloTexture(): THREE.CanvasTexture {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 150, 60, 0.9)');
  g.addColorStop(0.35, 'rgba(255, 90, 30, 0.35)');
  g.addColorStop(1, 'rgba(255, 60, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  haloTex = new THREE.CanvasTexture(c);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

function styleO(): StyledModel {
  const vox = midVoxels();
  const skin = recolor(buildSkin(vox, midRes()), (c, lava) => (lava ? new THREE.Color('#FF7A2A') : c.multiplyScalar(0.28)));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 });
  const night = nightUniform(3.2);
  addSkinGlow(mat, night.uniform);
  const { index, unique } = sharedIndex(skin.corners);
  const geo = skinGeometry(skin, unique, null, index).toNonIndexed();
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // la lave éclaire : une lumière orange au cœur des coulées, et un halo qui déborde sur le sol
  const lava = vox.filter((v) => v.color === 'accent');
  const cx = lava.reduce((a, v) => a + v.x, 0) / lava.length / midRes();
  const cy = lava.reduce((a, v) => a + v.y, 0) / lava.length / midRes();
  const cz = lava.reduce((a, v) => a + v.z, 0) / lava.length / midRes();
  const light = new THREE.PointLight('#FF7A30', 9, 7, 1.4);
  light.position.set(cx, cy, cz);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: getHaloTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.position.set(cx, cy * 0.6, cz);
  halo.scale.setScalar(2.6);
  const floorGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 32),
    new THREE.MeshBasicMaterial({ map: getHaloTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }),
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.03, 0);
  const g = new THREE.Group();
  g.add(mesh, light, halo, floorGlow);
  const saved = { hemi: 0, key: 0, rim: 0, env: 0 };
  return done(g, night.set, {
    before: (ctx: LightContext) => {
      saved.hemi = ctx.hemi.intensity;
      saved.key = ctx.key.intensity;
      saved.rim = ctx.rim.intensity;
      saved.env = ctx.scene.environmentIntensity;
      // la scène s'assombrit : la lave devient la vraie source de lumière
      ctx.hemi.intensity *= 0.3;
      ctx.key.intensity *= 0.25;
      ctx.rim.intensity *= 0.4;
      ctx.scene.environmentIntensity *= 0.25;
    },
    after: (ctx: LightContext) => {
      ctx.hemi.intensity = saved.hemi;
      ctx.key.intensity = saved.key;
      ctx.rim.intensity = saved.rim;
      ctx.scene.environmentIntensity = saved.env;
    },
  });
}

// ---------------------------------------------------------------- P : cristal

function styleP(): StyledModel {
  const vox = midVoxels();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const set = new Set(vox.map((v) => key(v.x, v.y, v.z)));
  // cœur de lave : les blocs à deux pas de la surface au moins, plus les coulées
  const deep = vox.filter((v) => {
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2 && !set.has(key(v.x + dx, v.y + dy, v.z + dz))) return false;
    return true;
  });
  const coreVox = [...deep.map((v) => ({ ...v, color: 'accent' as const })), ...vox.filter((v) => v.color === 'accent')];
  const coreSkin = buildSkin(coreVox, midRes());
  const coreMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 });
  const core = skinMesh(coreSkin, coreMat);
  // coque : cristal fumé, brillant, qui laisse voir le cœur
  const shellSkin = recolor(buildSkin(vox, midRes()), (c, lava) => (lava ? c : c.lerp(new THREE.Color('#5A4E5E'), 0.4)));
  const { index, unique } = sharedIndex(shellSkin.corners);
  smooth(unique, index, 1);
  const shellGeo = skinGeometry(shellSkin, unique, vertexNormals(unique, index), index);
  const shellMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 2,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.renderOrder = 2;
  core.mesh.castShadow = true;
  const g = new THREE.Group();
  g.add(core.mesh, shell);
  return done(g, core.setNight);
}

// ---------------------------------------------------------------- Q : polygones facettés

function styleQ(): StyledModel {
  // forme grossière (7 blocs par unité), fortement lissée, puis dessinée en facettes plates
  const vox = subj().voxelsAt(res(7));
  const skin = buildSkin(vox, res(7));
  const { index, unique } = sharedIndex(skin.corners);
  smooth(unique, index, 12);
  const geo = skinGeometry(skin, unique, null, index).toNonIndexed();
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, flatShading: true });
  const night = nightUniform(LAVA_GLOW);
  addSkinGlow(mat, night.uniform);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return done(mesh, night.set);
}

// ---------------------------------------------------------------- passes d'image communes (R, S, T)

const NOISE = `
float hash12(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/** 16 couleurs (sRGB) : herbe, chemin, pierre, roche, lave, ciel, nuit. Converties en linéaire pour le shader. */
const PIXEL_PALETTE = ['#7BC05A', '#5DA548', '#3E7A35', '#B58B5A', '#8A6640', '#9A968C', '#7A5B4D', '#4B3E3B', '#2C2524', '#FF6B2B', '#FFB347', '#FFCA3A', '#A7D8F7', '#F4F1E8', '#121014', '#3A3F4B'];
const PIXEL_PALETTE_GLSL = PIXEL_PALETTE.map((h) => {
  const c = new THREE.Color(h); // linéaire (gestion des couleurs de three)
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
}).join(',\n  ');

function styleR(): StyledModel {
  const base = styleG(); // les blocs de G, puis l'image entière passe en gros pixels
  return {
    ...base,
    post: {
      scale: 1 / 5,
      nearest: true,
      fragment: `
const vec3 PAL[16] = vec3[16](
  ${PIXEL_PALETTE_GLSL}
);
vec3 post(vec2 uv) {
  vec3 c = texture2D(tDiffuse, uv).rgb;
  // la couleur la plus proche de la palette, mesurée sur la racine (plus proche de l'œil que le linéaire)
  vec3 best = PAL[0];
  float bd = 1e9;
  for (int i = 0; i < 16; i++) {
    vec3 d = sqrt(max(c, 0.0)) - sqrt(PAL[i]);
    float dd = dot(d, d);
    if (dd < bd) { bd = dd; best = PAL[i]; }
  }
  return best;
}`,
    },
  };
}

function styleS(): StyledModel {
  // carton : couleurs tirées vers le kraft, faces légèrement de travers (déformation fixe par sommet)
  const kraft = new THREE.Color('#B89A72');
  const skin = recolor(buildSkin(midVoxels(), midRes()), (c, lava) => (lava ? c : c.lerp(kraft, 0.42)));
  const { index, unique } = sharedIndex(skin.corners);
  const s = 1 / midRes();
  unique.forEach((p, i) => {
    const h = (k: number) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
    unique[i] = [p[0] + h(1) * s * 0.18, p[1] + h(2) * s * 0.18, p[2] + h(3) * s * 0.18];
  });
  const geo = skinGeometry(skin, unique, null, index).toNonIndexed();
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const night = nightUniform(LAVA_GLOW);
  addSkinGlow(mat, night.uniform);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const model = done(mesh, night.set);
  return {
    ...model,
    post: {
      fragment: `${NOISE}
float edgeAt(vec2 uv, vec2 px) {
  float tl = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, 1.0)).rgb);
  float t = luma(texture2D(tDiffuse, uv + px * vec2(0.0, 1.0)).rgb);
  float tr = luma(texture2D(tDiffuse, uv + px * vec2(1.0, 1.0)).rgb);
  float l = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, 0.0)).rgb);
  float r = luma(texture2D(tDiffuse, uv + px * vec2(1.0, 0.0)).rgb);
  float bl = luma(texture2D(tDiffuse, uv + px * vec2(-1.0, -1.0)).rgb);
  float b = luma(texture2D(tDiffuse, uv + px * vec2(0.0, -1.0)).rgb);
  float br = luma(texture2D(tDiffuse, uv + px * vec2(1.0, -1.0)).rgb);
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  // contraste relatif : les traits suivent les formes, sombres ou claires
  return length(vec2(gx, gy)) / (0.08 + luma(texture2D(tDiffuse, uv).rgb));
}
vec3 post(vec2 uv) {
  vec2 px = 1.0 / uResolution;
  // le crayon tremble un peu : on lit l'image à un endroit légèrement décalé
  vec2 wob = (vec2(vnoise(uv * 60.0), vnoise(uv * 60.0 + 9.1)) - 0.5) * px * 2.5;
  vec3 c = texture2D(tDiffuse, uv).rgb;
  float e = smoothstep(0.9, 2.2, edgeAt(uv + wob, px * 1.2));
  // grain du carton et hachures dans les ombres
  float grain = 0.9 + 0.1 * vnoise(uv * uResolution * 0.6);
  float shade = luma(c);
  float hatch = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.22)) * smoothstep(0.08, 0.02, shade);
  vec3 graphite = vec3(0.045, 0.04, 0.038);
  c *= grain;
  c = mix(c, graphite, max(e * 0.85, hatch * 0.35));
  return c;
}`,
    },
  };
}

function styleT(): StyledModel {
  // modèle doux (arêtes un peu fondues) puis peinture : bavures, bords de pigment, papier
  const skin = buildSkin(midVoxels(), midRes());
  const { mesh, setNight } = skinMesh(skin, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { smoothPasses: 3, smoothNormals: true });
  const model = done(mesh, setNight);
  return {
    ...model,
    post: {
      fragment: `${NOISE}
vec3 post(vec2 uv) {
  vec2 px = 1.0 / uResolution;
  // les couleurs bavent : moyenne sur un voisinage déformé par un bruit
  vec2 wob = (vec2(vnoise(uv * 18.0), vnoise(uv * 18.0 + 4.7)) - 0.5) * px * 5.0;
  vec3 acc = vec3(0.0);
  for (int i = -2; i <= 2; i++)
    for (int j = -2; j <= 2; j++) acc += texture2D(tDiffuse, uv + wob + vec2(float(i), float(j)) * px * 0.9).rgb;
  vec3 c = acc / 25.0;
  // bords de lavis : le pigment s'accumule là où la couleur change
  vec3 gx = texture2D(tDiffuse, uv + wob + vec2(px.x * 3.0, 0.0)).rgb - texture2D(tDiffuse, uv + wob - vec2(px.x * 3.0, 0.0)).rgb;
  vec3 gy = texture2D(tDiffuse, uv + wob + vec2(0.0, px.y * 3.0)).rgb - texture2D(tDiffuse, uv + wob - vec2(0.0, px.y * 3.0)).rgb;
  float edge = clamp((length(gx) + length(gy)) * 2.2, 0.0, 1.0);
  c *= 1.0 - 0.32 * edge;
  // lavis clair, granulation du pigment et papier
  float gran = 0.9 + 0.1 * vnoise(uv * uResolution * 0.9);
  float paper = 0.9 + 0.1 * vnoise(uv * uResolution * 0.25 + 3.0);
  c = mix(c, vec3(0.9, 0.88, 0.83), 0.08) * gran * paper;
  return c;
}`,
    },
  };
}

export function buildStyle2(id: Style2Id): StyledModel {
  switch (id) {
    case 'G':
      return styleG();
    case 'H':
      return styleH();
    case 'I':
      return styleI();
    case 'J':
      return styleJ();
    case 'K':
      return styleK();
    case 'L':
      return styleL();
    case 'M':
      return styleM();
    case 'N':
      return styleN();
    case 'O':
      return styleO();
    case 'P':
      return styleP();
    case 'Q':
      return styleQ();
    case 'R':
      return styleR();
    case 'S':
      return styleS();
    case 'T':
      return styleT();
  }
}
