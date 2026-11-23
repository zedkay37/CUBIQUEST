/**
 * Constructeur « volumes → blocs » (sprint Art, section 1).
 *
 * Une créature se décrit par des formes simples (ellipsoïdes, boîtes, capsules, cônes), avec symétrie et
 * formes soustractives. `voxelize` (pur, testé sans rendu) les convertit en blocs à une résolution donnée ;
 * `buildSculptRig` ne dessine que les faces visibles, avec une ombre douce par sommet (occlusion par blocs
 * voisins) calculée une fois.
 *
 * Les groupes (« legL », « tail »…) deviennent des pièces mobiles pour l'animation existante : `legs`,
 * `extras`, et `eyes` pour le clignement.
 */
import * as THREE from 'three';

export type ColorKey = 'primary' | 'secondary' | 'belly' | 'accent' | 'eye' | 'white' | 'dark';
export type Vec3 = [number, number, number];

export interface SculptShape {
  kind: 'ellipsoid' | 'box' | 'capsule' | 'cone';
  /** Centre (ellipsoïde, boîte), base (cône) ou premier point (capsule). */
  at: Vec3;
  /** Demi-tailles (ellipsoïde, boîte) ; [rayon, hauteur, rayon du sommet] (cône) ; rayon en [0] (capsule). */
  size: Vec3;
  /** Second point (capsule). */
  to?: Vec3;
  color: ColorKey;
  /** Pièce de la créature : « body » par défaut. */
  group?: string;
  /** Recopiée de l'autre côté (x → -x), avec le groupe suffixé L/R si le nom finit par « * ». */
  mirror?: boolean;
  /** Retire les blocs au lieu d'en ajouter. */
  subtract?: boolean;
  /** ART3 : partie liée à l'élément qui luit doucement dans sa propre couleur (bobines…). La forme ne change pas. */
  glow?: boolean;
}

export interface SculptDef {
  shapes: SculptShape[];
  /** Groupes animés : jambes (démarche), pièces annexes (ailes, queue…) avec leur point de pivot. */
  legs?: string[];
  extras?: { group: string; pivot: Vec3 }[];
  /** Groupes des yeux (clignement, regard). */
  eyes?: string[];
  /** ART3 : blocs déjà posés (modèle `.vox`, voir voxFile.ts) ; remplacent les volumes. */
  voxels?: Voxel[];
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: ColorKey;
  group: string;
  glow?: boolean;
  /** ART3 (`.vox`) : couleur propre du bloc, à la place de celle de la palette. */
  rgb?: string;
}

const inside = (s: SculptShape, p: Vec3, mirrorSide: 1 | -1): boolean => {
  const x = p[0] * mirrorSide;
  const [cx, cy, cz] = s.at;
  switch (s.kind) {
    case 'ellipsoid': {
      const dx = (x - cx) / s.size[0];
      const dy = (p[1] - cy) / s.size[1];
      const dz = (p[2] - cz) / s.size[2];
      return dx * dx + dy * dy + dz * dz <= 1;
    }
    case 'box':
      return Math.abs(x - cx) <= s.size[0] && Math.abs(p[1] - cy) <= s.size[1] && Math.abs(p[2] - cz) <= s.size[2];
    case 'cone': {
      const h = (p[1] - cy) / s.size[1];
      if (h < 0 || h > 1) return false;
      const r = s.size[0] + (s.size[2] - s.size[0]) * h;
      return Math.hypot(x - cx, p[2] - cz) <= r;
    }
    case 'capsule': {
      const [bx, by, bz] = s.to ?? s.at;
      const ax = bx - cx;
      const ay = by - cy;
      const az = bz - cz;
      const len2 = ax * ax + ay * ay + az * az || 1;
      const t = Math.max(0, Math.min(1, ((x - cx) * ax + (p[1] - cy) * ay + (p[2] - cz) * az) / len2));
      return Math.hypot(x - (cx + ax * t), p[1] - (cy + ay * t), p[2] - (cz + az * t)) <= s.size[0];
    }
  }
};

function extent(s: SculptShape): { min: Vec3; max: Vec3 } {
  const pts: Vec3[] = [];
  const r = Math.max(...s.size);
  for (const c of [s.at, s.to ?? s.at]) pts.push([c[0] - r, c[1] - r, c[2] - r], [c[0] + r, c[1] + r + (s.kind === 'cone' ? s.size[1] : 0), c[2] + r]);
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) {
    min[i] = Math.min(min[i], p[i]);
    max[i] = Math.max(max[i], p[i]);
  }
  if (s.mirror) {
    min[0] = Math.min(min[0], -max[0]);
    max[0] = Math.max(max[0], -min[0]);
  }
  return { min, max };
}

const groupName = (s: SculptShape, side: 1 | -1): string => {
  const g = s.group ?? 'body';
  return g.endsWith('*') ? g.slice(0, -1) + (side === 1 ? 'R' : 'L') : g;
};

/** Volumes → blocs, à `res` blocs par unité. Pur et déterministe. Les formes suivantes recouvrent les précédentes. */
export function voxelize(def: SculptDef, res: number): Voxel[] {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const s of def.shapes) {
    if (s.subtract) continue;
    const e = extent(s);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], e.min[i]);
      max[i] = Math.max(max[i], e.max[i]);
    }
  }
  const lo = min.map((v) => Math.floor(v * res));
  const hi = max.map((v) => Math.ceil(v * res));
  const out: Voxel[] = [];
  for (let x = lo[0]; x <= hi[0]; x++)
    for (let y = Math.max(0, lo[1]); y <= hi[1]; y++)
      for (let z = lo[2]; z <= hi[2]; z++) {
        const p: Vec3 = [(x + 0.5) / res, (y + 0.5) / res, (z + 0.5) / res];
        let cell: Voxel | null = null;
        for (const s of def.shapes) {
          for (const side of s.mirror ? ([1, -1] as const) : ([1] as const)) {
            if (!inside(s, p, side)) continue;
            cell = s.subtract ? null : { x, y, z, color: s.color, group: groupName(s, side), ...(s.glow ? { glow: true } : {}) };
          }
        }
        if (cell) out.push(cell);
      }
  return out;
}

const DIRS: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** Blocs dont au moins une face est visible (même règle que le maillage). */
export function exposedVoxels(voxels: Voxel[], moving: Set<string>): Voxel[] {
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const map = new Map(voxels.map((v) => [key(v.x, v.y, v.z), v]));
  const hides = (v: Voxel, n: Voxel | undefined) => Boolean(n) && (n!.group === v.group || (!moving.has(v.group) && !moving.has(n!.group)));
  return voxels.filter((v) => DIRS.some(([dx, dy, dz]) => !hides(v, map.get(key(v.x + dx, v.y + dy, v.z + dz)))));
}

/** Palette d'une espèce, plus le blanc des reflets et un brun sombre. */
export type SculptPalette = Record<ColorKey, string> & {
  /** ART2 : ton de la tête (le corps « primary » de la tête prend ce ton, plus clair que le corps). */
  head?: string;
};

export interface SculptRigParts {
  bodyPivot: THREE.Group;
  legs: THREE.Object3D[];
  extras: THREE.Object3D[];
  eyes: THREE.Object3D[];
  materials: THREE.MeshStandardMaterial[];
}

/** Maillage : une géométrie par pièce (faces visibles seulement, ombre par sommet), deux matériaux (mat et lumineux). */
/**
 * ART3 : lumière commune des créatures sculptées (lueurs d'élément plus fortes la nuit, contour lumineux discret).
 * Uniformes partagés : changer la valeur agit sur toutes les créatures sans recompiler.
 */
export const CREATURE_LIGHT = { night: { value: 0 }, rim: { value: 0.2 } };
export function setCreatureNight(night: number): void {
  CREATURE_LIGHT.night.value = night;
}
/** Qualité Basse : le contour lumineux est coupé (les lueurs d'élément restent, elles ne coûtent rien de plus). */
export function setCreatureRim(on: boolean): void {
  CREATURE_LIGHT.rim.value = on ? 0.2 : 0;
}

/** ART3 : lueurs d'élément et contour lumineux, ajoutés au matériau standard (aucun objet, aucun appel de dessin). */
function patchArt3Material(mat: THREE.MeshStandardMaterial, accent: boolean): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = CREATURE_LIGHT.night;
    shader.uniforms.uRim = CREATURE_LIGHT.rim;
    shader.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = aGlow;');
    shader.fragmentShader =
      'uniform float uNight;\nuniform float uRim;\nvarying float vGlow;\n' +
      shader.fragmentShader
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n' +
            (accent
              ? // parties d'accent (braise, lave, filament…) : la lueur existante, plus forte la nuit
                '  totalEmissiveRadiance *= 1.0 + 1.4 * uNight;'
              : // parties marquées « glow » (bobines…) : luisent dans leur propre couleur
                '  totalEmissiveRadiance += vColor.rgb * vGlow * (0.2 + 0.6 * uNight);'),
        )
        .replace(
          '#include <opaque_fragment>',
          // contour lumineux : les faces vues en biais s'éclairent un peu, la créature se détache du fond
          '  float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);\n  outgoingLight += vec3(1.0, 0.95, 0.86) * rimF * uRim;\n#include <opaque_fragment>',
        );
  };
  mat.customProgramCacheKey = () => 'art3-creature-' + accent;
}

export function buildSculptRig(def: SculptDef, palette: SculptPalette, res: number, glowIntensity: number, aoStrength = 0.16, smoothNormals = false, art3 = false): SculptRigParts {
  const voxels = def.voxels ?? voxelize(def, res);
  const legs = new Set(def.legs ?? []);
  const extrasDef = new Map((def.extras ?? []).map((e) => [e.group, e.pivot]));
  const eyes = new Set(def.eyes ?? []);
  const moving = new Set([...legs, ...extrasDef.keys(), ...eyes]);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const map = new Map(voxels.map((v) => [key(v.x, v.y, v.z), v]));
  const occ = (v: Voxel, x: number, y: number, z: number) => {
    const n = map.get(key(x, y, z));
    return n && (n.group === v.group || (!moving.has(v.group) && !moving.has(n.group))) ? 1 : 0;
  };
  const colors: Partial<Record<ColorKey, THREE.Color>> = {};
  const col = (k: ColorKey) => (colors[k] ??= new THREE.Color().setStyle(palette[k]));
  let headColor: THREE.Color | undefined;
  const rgbCache: Record<string, THREE.Color> = {};

  const base = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.04 });
  const glow = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.3,
    metalness: 0.1,
    emissive: new THREE.Color().setStyle(palette.accent),
    emissiveIntensity: glowIntensity,
  });
  if (art3) {
    // un peu plus de lueur que la version ART 1 (même couleur, même forme)
    glow.emissiveIntensity = glowIntensity * 1.35;
    patchArt3Material(base, false);
    patchArt3Material(glow, true);
  }
  const bodyPivot = new THREE.Group();
  const s = 1 / res;
  const groups = new Map<string, Voxel[]>();
  for (const v of voxels) {
    if (!groups.has(v.group)) groups.set(v.group, []);
    groups.get(v.group)!.push(v);
  }
  const out: SculptRigParts = { bodyPivot, legs: [], extras: [], eyes: [], materials: [base, glow] };

  for (const [g, list] of groups) {
    // pivot : haut de la jambe, point donné pour une pièce annexe, centre pour un œil, origine sinon
    let pivot: Vec3 = [0, 0, 0];
    if (legs.has(g) || eyes.has(g)) {
      const xs = list.map((v) => v.x);
      const ys = list.map((v) => v.y);
      const zs = list.map((v) => v.z);
      const top = legs.has(g) ? Math.max(...ys) + 1 : (Math.min(...ys) + Math.max(...ys) + 1) / 2;
      pivot = [((Math.min(...xs) + Math.max(...xs) + 1) / 2) * s, top * s, ((Math.min(...zs) + Math.max(...zs) + 1) / 2) * s];
    } else if (extrasDef.has(g)) pivot = extrasDef.get(g)!;

    const holder = new THREE.Group();
    holder.position.set(...pivot);
    bodyPivot.add(holder);
    // ART3 : dégradé de volume, le bas de chaque pièce 10 % plus sombre que le haut (aucune couleur nouvelle)
    const yLo = Math.min(...list.map((p) => p.y));
    const yHi = Math.max(...list.map((p) => p.y)) + 1;
    for (const glowing of [false, true]) {
      const glw: number[] = [];
      const pos: number[] = [];
      const nor: number[] = [];
      const clr: number[] = [];
      const idx: number[] = [];
      for (const v of list) {
        if ((v.color === 'accent') !== glowing) continue;
        // ART2 : la tête a son propre ton, plus clair que le corps
        const c = v.rgb
          ? (rgbCache[v.rgb] ??= new THREE.Color().setStyle(v.rgb))
          : v.group === 'head' && v.color === 'primary' && palette.head
            ? (headColor ??= new THREE.Color().setStyle(palette.head))
            : col(v.color);
        for (const [dx, dy, dz] of DIRS) {
          if (occ(v, v.x + dx, v.y + dy, v.z + dz)) continue;
          // les quatre coins de la face, avec l'ombre douce de chaque coin
          const axis = dx !== 0 ? 0 : dy !== 0 ? 1 : 2;
          const sign = dx + dy + dz;
          const u = (axis + 1) % 3;
          const w = (axis + 2) % 3;
          const start = pos.length / 3;
          for (const [a, b] of [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ]) {
            const corner = [v.x, v.y, v.z];
            corner[axis] += sign > 0 ? 1 : 0;
            corner[u] += a;
            corner[w] += b;
            const o = [v.x, v.y, v.z];
            o[axis] += sign;
            const su = a ? 1 : -1;
            const sw = b ? 1 : -1;
            const n1 = [...o];
            n1[u] += su;
            const n2 = [...o];
            n2[w] += sw;
            const n3 = [...o];
            n3[u] += su;
            n3[w] += sw;
            const s1 = occ(v, n1[0], n1[1], n1[2]);
            const s2 = occ(v, n2[0], n2[1], n2[2]);
            const ao = s1 && s2 ? 3 : s1 + s2 + occ(v, n3[0], n3[1], n3[2]);
            const shade = 1 - ao * aoStrength;
            pos.push(corner[0] * s - pivot[0], corner[1] * s - pivot[1], corner[2] * s - pivot[2]);
            if (smoothNormals) {
              // ART2 : normale lissée (direction des cases vides autour du coin), à moitié mêlée à celle de la face :
              // les marches d'une forme arrondie ne font plus des rayures de lumière, les grandes faces restent nettes
              let nx = 0;
              let ny = 0;
              let nz = 0;
              for (const ox of [-1, 0]) for (const oy of [-1, 0]) for (const oz of [-1, 0]) {
                if (occ(v, corner[0] + ox, corner[1] + oy, corner[2] + oz)) continue;
                nx += ox + 0.5;
                ny += oy + 0.5;
                nz += oz + 0.5;
              }
              const len = Math.hypot(nx, ny, nz) || 1;
              const mx = dx + nx / len;
              const my = dy + ny / len;
              const mz = dz + nz / len;
              const l2 = Math.hypot(mx, my, mz) || 1;
              nor.push(mx / l2, my / l2, mz / l2);
            } else nor.push(dx, dy, dz);
            const grad = art3 ? 0.9 + 0.1 * ((corner[1] - yLo) / Math.max(1, yHi - yLo)) : 1;
            clr.push(c.r * shade * grad, c.g * shade * grad, c.b * shade * grad);
            glw.push(v.glow ? 1 : 0);
          }
          // ordre des triangles selon l'orientation de la face
          const flip = sign > 0; // (u, w) direct : u × w = +axe
          if (flip) idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
          else idx.push(start, start + 2, start + 1, start, start + 3, start + 2);
        }
      }
      if (!idx.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
      if (art3) geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(glw, 1));
      geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, glowing ? glow : base);
      // ART2 : les parties lumineuses et les yeux ne projettent pas d'ombre (invisible à l'écran, une passe d'ombre de moins)
      mesh.castShadow = !glowing && !eyes.has(g);
      mesh.receiveShadow = true;
      holder.add(mesh);
    }
    if (legs.has(g)) out.legs.push(holder);
    else if (extrasDef.has(g)) out.extras.push(holder);
    else if (eyes.has(g)) out.eyes.push(holder);
  }
  // ordre stable des pièces annexes (l'animation existante compte sur l'ordre : ailes d'abord)
  const order = [...extrasDef.keys()];
  out.extras.sort((a, b) => order.indexOf(groupOf(a, groups, extrasDef)) - order.indexOf(groupOf(b, groups, extrasDef)));
  return out;
}

function groupOf(obj: THREE.Object3D, groups: Map<string, Voxel[]>, extras: Map<string, Vec3>): string {
  for (const [g, p] of extras) if (obj.position.x === p[0] && obj.position.y === p[1] && obj.position.z === p[2]) return g;
  return [...groups.keys()][0];
}

/** Exécute `fn` avec un Math.random à part (les identifiants three.js ne puisent pas dans l'aléatoire du jeu). */
export function withIsolatedRandom<T>(fn: () => T): T {
  const real = Math.random;
  let a = 0x9e3779b9;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}
