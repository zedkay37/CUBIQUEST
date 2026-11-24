/**
 * PROTO-DONJON : le kit de décor, 30 éléments originaux en voxels (8 blocs par mètre), style F : ombrage toon à
 * trois tons, contour noir (coque gonflée), lueur sur les blocs lumineux (torches, lanternes, cristaux).
 * Chaque élément est construit une fois puis instancié (un appel de dessin par élément et par couche).
 */
import * as THREE from 'three';
import { getToonGradient } from '../../components/styles/magmaStyles';
import type { Vec } from '../sim';
import { T_WALL, type Floor } from './gen';
import type { EnvShared } from './env';
import type { DecorItem, DecorKind } from './decorPlan';

const U = 1 / 8; // taille d'un bloc (m)
type Vox = Map<string, { c: string; glow: boolean }>;
type Paint = string | (() => string);

/** Petit atelier de sculpture en blocs. */
class Sculpt {
  v: Vox = new Map();
  private seed = 1;
  rnd() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
  set(x: number, y: number, z: number, c: string, glow = false) {
    this.v.set(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`, { c, glow });
  }
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: Paint, glow = false) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, typeof c === 'string' ? c : c(), glow);
  }
  ball(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: Paint) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let z = Math.floor(cz - rz); z <= cz + rz; z++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) this.set(x, y, z, typeof c === 'string' ? c : c());
  }
  cyl(cx: number, cz: number, r: number, y0: number, y1: number, c: string | ((y: number) => string)) {
    for (let y = y0; y <= y1; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) for (let z = Math.floor(cz - r); z <= cz + r; z++) if ((x - cx) ** 2 + (z - cz) ** 2 <= r * r) this.set(x, y, z, typeof c === 'string' ? c : c(y));
  }
  mix(...cs: string[]) {
    return () => cs[Math.floor(this.rnd() * cs.length)];
  }
}

const LEAF = ['#4E8A34', '#5B9A3C', '#447A2E', '#6AAB45'];
const PINE = ['#2F6A3A', '#357643', '#2A5E34'];
const WOOD = '#6B4528';
const WOOD2 = '#8A5E36';
const STONE = ['#8C887C', '#9A958A', '#7E7A6F'];
const MOSS = '#5C8A3E';

function sculpt(kind: DecorKind): Sculpt {
  const s = new Sculpt();
  switch (kind) {
    case 'chene':
      s.box(-1, 1, 0, 11, -1, 1, s.mix(WOOD, '#5E3D22'));
      s.box(-2, 2, 0, 1, -2, 2, WOOD);
      s.ball(0, 15, 0, 7, 5, 7, s.mix(...LEAF));
      s.ball(-4, 13, 2, 4, 3.5, 4, s.mix(...LEAF));
      s.ball(4, 14, -2, 4, 3.5, 4, s.mix(...LEAF));
      break;
    case 'sapin':
      s.box(-1, 0, 0, 4, -1, 0, WOOD);
      for (let k = 0; k < 4; k++) s.cyl(-0.5, -0.5, 6 - k * 1.4, 4 + k * 4, 7 + k * 4, () => PINE[Math.floor(s.rnd() * 3)]);
      s.box(-1, 0, 20, 21, -1, 0, PINE[0]);
      break;
    case 'arbre-mort':
      s.box(-1, 0, 0, 13, -1, 0, s.mix('#6E6152', '#5D5246'));
      for (let k = 0; k < 5; k++) s.set(1 + k, 8 + k, 0, '#6E6152');
      for (let k = 0; k < 4; k++) s.set(-2 - k, 10 + k, -1, '#6E6152');
      break;
    case 'souche':
      s.cyl(0, 0, 3, 0, 3, (y) => (y === 3 ? '#C9A26B' : WOOD));
      s.set(4, 0, 0, WOOD);
      s.set(-4, 0, 1, WOOD);
      break;
    case 'buisson':
      s.ball(0, 3, 0, 4.5, 3.5, 4, s.mix(...LEAF));
      for (let k = 0; k < 4; k++) s.set(Math.round(s.rnd() * 6 - 3), 4 + Math.round(s.rnd() * 2), 4, '#D9433A');
      break;
    case 'fougere':
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        for (let r = 0; r < 5; r++) s.set(Math.cos(a) * r, 1 + r * 0.6, Math.sin(a) * r, LEAF[k % 4]);
      }
      break;
    case 'herbes':
      for (let k = 0; k < 9; k++) {
        const x = Math.round(s.rnd() * 6 - 3);
        const z = Math.round(s.rnd() * 6 - 3);
        s.box(x, x, 0, 2 + Math.round(s.rnd() * 3), z, z, k % 2 ? '#7DBA4C' : '#6AA63F');
      }
      break;
    case 'fleurs-rouges':
    case 'fleurs-jaunes':
      for (let k = 0; k < 6; k++) {
        const x = Math.round(s.rnd() * 6 - 3);
        const z = Math.round(s.rnd() * 6 - 3);
        s.box(x, x, 0, 2, z, z, '#5E9A3A');
        s.set(x, 3, z, kind === 'fleurs-rouges' ? '#E0483E' : '#F2C94C');
      }
      break;
    case 'champignon':
      s.box(0, 1, 0, 3, 0, 1, '#EFE6D2');
      s.ball(0.5, 4.5, 0.5, 3, 1.6, 3, '#D9433A');
      s.set(-1, 6, 0, '#FFFFFF');
      s.set(2, 5, 2, '#FFFFFF');
      break;
    case 'champignons':
      for (const [x, z, h] of [[0, 0, 3], [3, 2, 2], [-2, 3, 2]]) {
        s.box(x, x, 0, h, z, z, '#E8DCC0');
        s.ball(x, h + 1, z, 2, 1, 2, '#9A6B45');
      }
      break;
    case 'rocher':
      s.ball(0, 2.5, 0, 5, 3.5, 4, s.mix(...STONE));
      s.ball(1, 5, 0, 3, 1.2, 2.5, MOSS);
      break;
    case 'cailloux':
      for (let k = 0; k < 5; k++) {
        const x = Math.round(s.rnd() * 8 - 4);
        const z = Math.round(s.rnd() * 8 - 4);
        s.box(x, x + 1, 0, Math.round(s.rnd()), z, z + 1, STONE[k % 3]);
      }
      break;
    case 'muret':
      for (let x = -4; x <= 3; x++) s.box(x, x, 0, 4 + ((x * 7) % 3 === 0 ? -2 : 0) + (x === 3 ? -1 : 0), -1, 0, (x + 1) % 2 ? STONE[0] : STONE[1]);
      s.box(-4, -1, 5, 5, -1, 0, MOSS);
      break;
    case 'ruine-arche':
      s.box(-4, -3, 0, 14, -1, 0, s.mix(...STONE));
      s.box(3, 4, 0, 9, -1, 0, s.mix(...STONE));
      s.box(-4, 0, 14, 15, -1, 0, s.mix(...STONE));
      s.box(-4, -3, 16, 16, -1, 0, MOSS);
      break;
    case 'pilier-casse':
      s.box(-1, 1, 0, 6, -1, 1, s.mix(...STONE));
      s.set(-1, 7, -1, STONE[0]);
      s.set(1, 7, 0, STONE[1]);
      s.box(2, 3, 0, 0, 1, 2, STONE[2]);
      s.box(-3, -2, 0, 0, -2, -2, STONE[0]);
      break;
    case 'colonne':
      s.box(-2, 2, 0, 1, -2, 2, STONE[1]);
      s.box(-1, 1, 2, 15, -1, 1, s.mix(STONE[0], STONE[2]));
      s.box(-2, 2, 16, 17, -2, 2, STONE[1]);
      s.box(-1, 1, 5, 7, 2, 2, MOSS);
      break;
    case 'torche-pied':
      s.box(0, 0, 0, 9, 0, 0, WOOD);
      s.box(-1, 1, 10, 10, -1, 1, '#4A4A4A');
      s.box(-1, 1, 11, 12, -1, 1, '#FFB23A', true);
      s.set(0, 13, 0, '#FFE27A', true);
      break;
    case 'lanterne':
      s.box(-1, 1, 0, 3, -1, 1, STONE[0]);
      s.box(-2, 2, 4, 4, -2, 2, STONE[1]);
      s.box(-1, 1, 5, 7, -1, 1, '#FFD27A', true);
      s.box(-2, 2, 8, 8, -2, 2, STONE[1]);
      break;
    case 'cristal-bleu':
    case 'cristal-violet': {
      const c = kind === 'cristal-bleu' ? ['#7FD7FF', '#4FB2F0'] : ['#C39BFF', '#9B6BF0'];
      s.box(-2, 3, 0, 0, -2, 2, '#4A4558');
      for (const [x, z, h] of [[0, 0, 9], [2, 1, 5], [-2, -1, 6]]) for (let y = 1; y <= h; y++) s.box(x, x + (y < h - 2 ? 1 : 0), y, y, z, z + (y < h - 2 ? 1 : 0), c[y % 2], true);
      break;
    }
    case 'caisse':
      s.box(-3, 3, 0, 6, -3, 3, WOOD2);
      for (const y of [0, 6]) s.box(-3, 3, y, y, -3, 3, WOOD);
      for (const x of [-3, 3]) for (const z of [-3, 3]) s.box(x, x, 0, 6, z, z, WOOD);
      break;
    case 'tonneau':
      s.cyl(0, 0, 3, 0, 7, (y) => (y === 1 || y === 6 ? '#555049' : y % 2 ? WOOD2 : WOOD));
      break;
    case 'coffre-ferme':
      s.box(-3, 3, 0, 4, -2, 2, WOOD);
      s.box(-3, 3, 3, 3, -2, 2, '#D9A93E');
      s.set(0, 2, -3, '#F2C94C');
      break;
    case 'racines':
      for (let k = 0; k < 10; k++) s.set(k - 5, k % 3 === 0 ? 1 : 0, Math.round(Math.sin(k * 0.8) * 2), WOOD);
      for (let k = 0; k < 6; k++) s.set(-2 + Math.round(Math.cos(k) * 2), 0, k - 3, '#5E3D22');
      break;
    case 'roseaux':
      for (let k = 0; k < 6; k++) {
        const x = Math.round(s.rnd() * 4 - 2);
        const z = Math.round(s.rnd() * 4 - 2);
        const h = 6 + Math.round(s.rnd() * 4);
        s.box(x, x, 0, h, z, z, '#6E9A44');
        s.box(x, x, h + 1, h + 2, z, z, '#6B4A2B');
      }
      break;
    case 'nenuphar':
      s.cyl(0, 0, 2.5, 0, 0, '#3E8A3A');
      s.set(0, 1, 0, '#F29AC0');
      break;
    case 'pont':
      for (let z = -3; z <= 4; z++) if (z % 2 === 0) s.box(-4, 3, 0, 0, z, z, z % 4 === 0 ? WOOD2 : WOOD);
      s.box(-4, -4, 1, 2, -3, 4, WOOD);
      s.box(3, 3, 1, 2, -3, 4, WOOD);
      break;
    case 'stalagmite':
      for (let y = 0; y < 13; y++) s.cyl(0, 0, Math.max(0.6, 3.5 - y * 0.27), y, y, y % 3 ? '#5D566E' : '#6B6380');
      break;
    case 'os':
      s.box(-3, 2, 0, 0, 0, 0, '#E9E2CF');
      s.set(-4, 0, -1, '#E9E2CF');
      s.set(-4, 0, 1, '#E9E2CF');
      s.box(1, 2, 0, 1, 2, 3, '#D9D0B8');
      break;
  }
  return s;
}

const FACES: [number[], number[][]][] = [
  [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]],
  [[-1, 0, 0], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]]],
  [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]]],
  [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
  [[0, 0, 1], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]]],
  [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]],
];

/** Faces visibles d'un modèle en blocs (couleur par sommet), séparées : blocs normaux, blocs lumineux, coque. */
function mesh(s: Sculpt): { body: THREE.BufferGeometry; glow: THREE.BufferGeometry | null; hull: THREE.BufferGeometry } {
  const parts = { body: { p: [] as number[], c: [] as number[], n: [] as number[] }, glow: { p: [] as number[], c: [] as number[], n: [] as number[] } };
  const col = new THREE.Color();
  const sum = new Map<string, THREE.Vector3>();
  const hullP: number[] = [];
  const hullK: string[] = [];
  for (const [k, vx] of s.v) {
    const [x, y, z] = k.split(',').map(Number);
    const dst = vx.glow ? parts.glow : parts.body;
    col.set(vx.c);
    for (const [n, quad] of FACES) {
      if (s.v.has(`${x + n[0]},${y + n[1]},${z + n[2]}`)) continue;
      const vs = quad.map(([a, b, c]) => [(x + a - 0.5) * U, (y + b) * U, (z + c - 0.5) * U]);
      for (const i of [0, 1, 2, 0, 2, 3]) {
        dst.p.push(...vs[i]);
        dst.c.push(col.r, col.g, col.b);
        dst.n.push(...n);
        const key = vs[i].map((v) => v.toFixed(4)).join(',');
        if (!sum.has(key)) sum.set(key, new THREE.Vector3());
        sum.get(key)!.add(new THREE.Vector3(n[0], n[1], n[2]));
        hullP.push(...vs[i]);
        hullK.push(key);
      }
    }
  }
  const geo = (d: { p: number[]; c: number[]; n: number[] }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3));
    return g;
  };
  // coque : mêmes faces, normales moyennées par sommet (le contour se gonfle sans fissure)
  const hn: number[] = [];
  for (const key of hullK) {
    const v = sum.get(key)!.clone().normalize();
    hn.push(v.x, v.y, v.z);
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(hullP, 3));
  hull.setAttribute('normal', new THREE.Float32BufferAttribute(hn, 3));
  return { body: geo(parts.body), glow: parts.glow.p.length ? geo(parts.glow) : null, hull };
}

const cache = new Map<DecorKind, ReturnType<typeof mesh>>();
const TALL: DecorKind[] = ['chene', 'sapin', 'arbre-mort', 'ruine-arche', 'colonne', 'pilier-casse', 'stalagmite', 'torche-pied', 'roseaux', 'muret'];

/** Coque du contour : gonflée le long des normales moyennes ; brouillard et estompage comme le reste du décor. */
function hullMaterial(shared: EnvShared, fade: boolean): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: '#0B0B10', side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader =
      'varying vec3 vWPos;\n' +
      shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * 0.028;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n  vec4 wpE = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n  wpE = instanceMatrix * wpE;\n  #endif\n  vWPos = (modelMatrix * wpE).xyz;');
    shader.fragmentShader =
      'varying vec3 vWPos;\nuniform sampler2D uSeen;\nuniform vec2 uSize;\nuniform vec3 uFade[6];\nuniform vec3 uCam;\n' +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\n  if (texture2D(uSeen, vec2(vWPos.x, -vWPos.z) / uSize).a < 0.5) discard;\n' +
          (fade
            ? `  for (int i = 0; i < 6; i++) {
    vec3 a = uFade[i] + vec3(0.0, 0.7, 0.0);
    if (a.y < -50.0) continue;
    vec3 ab = uCam - a;
    float t = clamp(dot(vWPos - a, ab) / dot(ab, ab), 0.0, 1.0);
    if (t > 0.03 && length(vWPos - (a + ab * t)) < 1.5 && vWPos.y > 0.3) discard;
  }`
            : ''),
      );
  };
  m.customProgramCacheKey = () => (fade ? 'hull-fade' : 'hull');
  return m;
}

export function buildDecor(f: Floor, shared: EnvShared, patch: (m: THREE.Material, fade: boolean) => void, items: DecorItem[] = []): { group: THREE.Group; count: number; lights: Vec[]; kinds: number } {
  const group = new THREE.Group();
  const lights: Vec[] = [];
  const byKind = new Map<DecorKind, DecorItem[]>();
  for (const it of items) byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), it]);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [kind, list] of byKind) {
    if (!cache.has(kind)) cache.set(kind, mesh(sculpt(kind)));
    const geo = cache.get(kind)!;
    const fade = TALL.includes(kind);
    const bodyMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient() });
    patch(bodyMat, fade);
    const body = new THREE.InstancedMesh(geo.body, bodyMat, list.length);
    const hull = new THREE.InstancedMesh(geo.hull, hullMaterial(shared, fade), list.length);
    let glow: THREE.InstancedMesh | null = null;
    if (geo.glow) {
      const gm = new THREE.MeshBasicMaterial({ vertexColors: true });
      patch(gm, false);
      glow = new THREE.InstancedMesh(geo.glow, gm, list.length);
    }
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.rot);
      m4.compose(new THREE.Vector3(it.x, kind === 'nenuphar' || kind === 'pont' ? 0.07 : 0, -it.y), q, new THREE.Vector3(it.scale, it.scale, it.scale));
      body.setMatrixAt(i, m4);
      hull.setMatrixAt(i, m4);
      glow?.setMatrixAt(i, m4);
    });
    body.castShadow = fade || ['rocher', 'caisse', 'tonneau', 'buisson', 'souche'].includes(kind);
    body.receiveShadow = true;
    group.add(body, hull);
    if (glow) group.add(glow);
  }
  // torches murales (sur le mur du fond de chaque salle)
  const stick = new THREE.MeshToonMaterial({ color: '#5A3A22', gradientMap: getToonGradient() });
  const flame = new THREE.MeshBasicMaterial({ color: f.biome === 'grotte' ? '#B9A2FF' : '#FFC24A' });
  patch(stick, true);
  patch(flame, false);
  const stickGeo = new THREE.BoxGeometry(0.14, 0.6, 0.14);
  const flameGeo = new THREE.BoxGeometry(0.22, 0.26, 0.22);
  for (const room of f.rooms) {
    const [x0, , x1, y1] = room.rect;
    for (let x = x0 + 2; x < x1 - 2; x += 5) {
      const y = y1 - 1;
      if (f.tiles[y * f.w + x] !== T_WALL) continue;
      const t = new THREE.Group();
      const st = new THREE.Mesh(stickGeo, stick);
      st.position.y = 1.4;
      const fl = new THREE.Mesh(flameGeo, flame);
      fl.position.y = 1.82;
      t.add(st, fl);
      t.position.set(x + 0.5, 0, -(y - 0.1));
      group.add(t);
      lights.push({ x: x + 0.5, y: y - 0.6 });
    }
  }
  for (const it of items) if (it.kind === 'torche-pied' || it.kind === 'lanterne' || it.kind.startsWith('cristal')) lights.push({ x: it.x, y: it.y });
  return { group, count: items.length, lights, kinds: byKind.size };
}
