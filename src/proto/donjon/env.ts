/**
 * PROTO-DONJON : le décor d'un étage (sols, murs, eau, escalier, objets, brouillard), en style F (toon).
 * - Brouillard : les matériaux du décor lisent une texture « déjà vu » (une case = un texel) et noircissent le reste.
 * - Lisibilité : murs et grands décors s'estompent (tramage) entre la caméra et un personnage.
 * Coordonnées : simulation (x, y) → scène (x, hauteur, −y).
 */
import * as THREE from 'three';
import { getToonGradient } from '../../components/styles/magmaStyles';
import type { Game, Vec } from '../sim';
import { T_DOOR, T_FLOOR, T_PILLAR, T_ROCK, T_WALL, T_WATER, type Floor } from './gen';
import type { DonjonLevel, Item } from './level';
import { buildDecor } from './decor';

export interface EnvShared {
  uSeen: { value: THREE.DataTexture };
  uSize: { value: THREE.Vector2 };
  uFade: { value: THREE.Vector3[] };
  uCam: { value: THREE.Vector3 };
  uTime: { value: number };
}

/** Brouillard et estompage, ajoutés à un matériau du décor (instancié ou non). */
export function patchEnv(mat: THREE.Material, shared: EnvShared, fade = true) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared);
    shader.vertexShader =
      'varying vec3 vWPos;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n  vec4 wpE = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n  wpE = instanceMatrix * wpE;\n  #endif\n  vWPos = (modelMatrix * wpE).xyz;',
      );
    shader.fragmentShader =
      'varying vec3 vWPos;\nuniform sampler2D uSeen;\nuniform vec2 uSize;\nuniform vec3 uFade[6];\nuniform vec3 uCam;\n' +
      shader.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n' +
            (fade
              ? `  for (int i = 0; i < 6; i++) {
    vec3 a = uFade[i] + vec3(0.0, 0.7, 0.0);
    if (a.y < -50.0) continue;
    vec3 ab = uCam - a;
    float t = clamp(dot(vWPos - a, ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(vWPos - (a + ab * t));
    if (t > 0.03 && d < 1.5 && vWPos.y > 0.3 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
  }`
              : ''),
        )
        .replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\n  float seenE = texture2D(uSeen, vec2(vWPos.x, -vWPos.z) / uSize).a;\n  gl_FragColor.rgb *= mix(0.0, 1.0, seenE);',
        );
  };
  mat.customProgramCacheKey = () => (fade ? 'env-fade' : 'env');
}

const PAL = {
  foret: { grass: ['#6FA34A', '#78AE50', '#5F9441'], dirt: '#9C7A4E', slab: '#A8A496', moss: '#4E7F3A', wall: ['#8B8677', '#7C7869', '#958F7E'], cap: '#5C8A3E', water: '#4FA3C8', rock: '#7D8790', bg: '#0C0F0B' },
  grotte: { grass: ['#4A4560', '#524B6A', '#433E57'], dirt: '#5A4E4A', slab: '#6A6478', moss: '#3D5A55', wall: ['#3E3A4E', '#45405A', '#373346'], cap: '#5E4E8A', water: '#3C6FA8', rock: '#55506A', bg: '#07060B' },
};

/** Bruit déterministe par case (variation des couleurs et des hauteurs). */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class DonjonEnv {
  group = new THREE.Group();
  shared: EnvShared;
  private seenData: Uint8Array;
  private seenVersion = -1;
  private items = new Map<number, THREE.Object3D>();
  private stairs: THREE.Object3D | null = null;
  private time = 0;
  private torches: THREE.PointLight[] = [];
  private torchSpots: Vec[] = [];
  decorCount = 0;

  constructor(
    private scene: THREE.Scene,
    private level: DonjonLevel,
  ) {
    const f = level.floor;
    this.seenData = new Uint8Array(f.w * f.h * 4).fill(255);
    for (let i = 0; i < f.w * f.h; i++) this.seenData[i * 4 + 3] = 0;
    const tex = new THREE.DataTexture(this.seenData, f.w, f.h, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.shared = {
      uSeen: { value: tex },
      uSize: { value: new THREE.Vector2(f.w, f.h) },
      uFade: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0, -100, 0)) },
      uCam: { value: new THREE.Vector3() },
      uTime: { value: 0 },
    };
    this.build(f);
    scene.add(this.group);
  }

  private mat(color: string | null, fade = true): THREE.MeshToonMaterial {
    const m = new THREE.MeshToonMaterial({ color: color ?? '#FFFFFF', gradientMap: getToonGradient(), vertexColors: color === null });
    patchEnv(m, this.shared, fade);
    return m;
  }

  private build(f: Floor) {
    const pal = PAL[f.biome];
    const W = f.w;
    const tileColor = (x: number, y: number): THREE.Color | null => {
      const t = f.tiles[y * W + x];
      if (t !== T_FLOOR && t !== T_DOOR && t !== T_WATER && t !== T_PILLAR && t !== T_ROCK) return null;
      const room = f.roomOf[y * W + x];
      const kind = room >= 0 ? f.rooms[room].kind : 'couloir';
      const n = hash(x, y);
      let c: string;
      if (t === T_DOOR || kind === 'couloir') c = n < 0.25 ? pal.moss : pal.dirt;
      else if (kind === 'piliers' || kind === 'boss' || kind === 'escalier' || kind === 'depart') c = (x + y) % 2 ? pal.slab : n < 0.3 ? pal.moss : '#9A9688';
      else c = n < 0.08 ? pal.dirt : n < 0.2 ? pal.moss : pal.grass[Math.floor(n * 7) % 3];
      return new THREE.Color(c).offsetHSL(0, 0, (hash(y, x) - 0.5) * 0.05);
    };
    // sols : une case = un carré ; chaque coin prend la moyenne des cases voisines (transitions douces)
    const colors = new Map<number, THREE.Color | null>();
    const col = (x: number, y: number) => {
      const k = y * W + x;
      if (!colors.has(k)) colors.set(k, x < 0 || y < 0 || x >= W || y >= f.h ? null : tileColor(x, y));
      return colors.get(k)!;
    };
    const corner = (x: number, y: number) => {
      const acc = new THREE.Color(0, 0, 0);
      let n = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const c = col(x + dx, y + dy);
        if (c) {
          acc.add(c);
          n++;
        }
      }
      return n ? acc.multiplyScalar(1 / n) : new THREE.Color(pal.dirt);
    };
    const pos: number[] = [];
    const cols: number[] = [];
    const idx: number[] = [];
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < W; x++) {
        if (!col(x, y)) continue;
        const b = pos.length / 3;
        for (const [cx, cy] of [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]) {
          pos.push(cx, 0, -cy);
          const c = corner(cx, cy);
          cols.push(c.r, c.g, c.b);
        }
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    fg.setIndex(idx);
    fg.computeVertexNormals();
    const floor = new THREE.Mesh(fg, this.mat(null, false));
    floor.receiveShadow = true;
    this.group.add(floor);

    // murs : hauteurs variées et créneaux ; plus bas côté caméra (sud) pour ne rien cacher
    const walls: { x: number; y: number; h: number; c: string }[] = [];
    const isOpen = (x: number, y: number) => {
      const t = f.tiles[y * W + x];
      return t === T_FLOOR || t === T_DOOR || t === T_WATER;
    };
    for (let y = 1; y < f.h - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        if (f.tiles[y * W + x] !== T_WALL) continue;
        const southOpen = isOpen(x, y + 1) && !isOpen(x, y - 1); // mur au sud d'une salle (devant la caméra)
        const n = hash(x, y);
        const h = southOpen ? 0.9 : 1.6 + Math.floor(n * 3) * 0.35 + ((x + y) % 7 === 0 ? 0.6 : 0);
        walls.push({ x, y, h, c: pal.wall[Math.floor(hash(y, x) * 3)] });
      }
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const wallMesh = new THREE.InstancedMesh(box, this.mat('#FFFFFF'), walls.length);
    const capMesh = new THREE.InstancedMesh(box, this.mat(pal.cap), walls.length);
    const crenels: { x: number; y: number; h: number }[] = [];
    const m4 = new THREE.Matrix4();
    walls.forEach((w, i) => {
      m4.compose(new THREE.Vector3(w.x + 0.5, 0, -(w.y + 0.5)), new THREE.Quaternion(), new THREE.Vector3(1, w.h, 1));
      wallMesh.setMatrixAt(i, m4);
      wallMesh.setColorAt(i, new THREE.Color(w.c));
      m4.compose(new THREE.Vector3(w.x + 0.5, w.h, -(w.y + 0.5)), new THREE.Quaternion(), new THREE.Vector3(1.02, 0.12, 1.02));
      capMesh.setMatrixAt(i, m4);
      if (w.h > 1.5 && (w.x + w.y) % 2 === 0) crenels.push({ x: w.x, y: w.y, h: w.h + 0.12 });
    });
    wallMesh.castShadow = wallMesh.receiveShadow = true;
    this.group.add(wallMesh, capMesh);
    const crenMesh = new THREE.InstancedMesh(box, this.mat(pal.wall[0]), crenels.length);
    crenels.forEach((c, i) => {
      m4.compose(new THREE.Vector3(c.x + 0.5, c.h, -(c.y + 0.5)), new THREE.Quaternion(), new THREE.Vector3(0.6, 0.35, 0.6));
      crenMesh.setMatrixAt(i, m4);
    });
    crenMesh.castShadow = true;
    this.group.add(crenMesh);

    // piliers et rochers (obstacles fixes)
    const solids: { x: number; y: number; t: number }[] = [];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < W; x++) if (f.tiles[y * W + x] === T_PILLAR || f.tiles[y * W + x] === T_ROCK) solids.push({ x, y, t: f.tiles[y * W + x] });
    const pil = solids.filter((s) => s.t === T_PILLAR);
    const pilMesh = new THREE.InstancedMesh(box, this.mat(pal.slab), Math.max(1, pil.length));
    pil.forEach((s, i) => {
      m4.compose(new THREE.Vector3(s.x + 0.5, 0, -(s.y + 0.5)), new THREE.Quaternion(), new THREE.Vector3(0.9, 2.6, 0.9));
      pilMesh.setMatrixAt(i, m4);
    });
    pilMesh.count = pil.length;
    pilMesh.castShadow = true;
    this.group.add(pilMesh);
    const rocks = solids.filter((s) => s.t === T_ROCK);
    const rockGeo = new THREE.DodecahedronGeometry(0.62, 0);
    rockGeo.translate(0, 0.35, 0);
    const rockMesh = new THREE.InstancedMesh(rockGeo, this.mat(pal.rock), Math.max(1, rocks.length));
    rocks.forEach((s, i) => {
      m4.compose(new THREE.Vector3(s.x + 0.5, 0, -(s.y + 0.5)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(s.x, s.y) * 6, 0)), new THREE.Vector3(1, 0.8 + hash(s.y, s.x) * 0.5, 1));
      rockMesh.setMatrixAt(i, m4);
    });
    rockMesh.count = rocks.length;
    rockMesh.castShadow = true;
    this.group.add(rockMesh);

    // eau peu profonde : un plan clair légèrement au-dessus du sol
    const water = new THREE.Group();
    const wm = new THREE.MeshBasicMaterial({ color: pal.water, transparent: true, opacity: 0.7 });
    patchEnv(wm, this.shared, false);
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < W; x++)
        if (f.tiles[y * W + x] === T_WATER) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wm);
          p.rotation.x = -Math.PI / 2;
          p.position.set(x + 0.5, 0.06, -(y + 0.5));
          water.add(p);
        }
    this.group.add(water);

    // escalier (vers l'étage suivant) : marches qui descendent dans un trou, bord lumineux
    if (f.stairs) {
      const s = new THREE.Group();
      const hole = new THREE.Mesh(new THREE.BoxGeometry(2, 0.02, 2), new THREE.MeshBasicMaterial({ color: '#06080A' }));
      hole.position.y = 0.02;
      s.add(hole);
      for (let k = 0; k < 4; k++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.42), this.mat(pal.slab, false));
        st.position.set(0, 0.04 - k * 0.001, -0.7 + k * 0.45);
        st.scale.y = 1 - k * 0.2;
        s.add(st);
      }
      const rim = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.5, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: '#FFE27A', transparent: true, opacity: 0.9 }));
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.05;
      s.add(rim);
      s.position.set(f.stairs.x, 0, -f.stairs.y);
      this.stairs = s;
      this.group.add(s);
    }

    // décor (phase 2) : kit en voxels, riche au bord, dégagé au centre
    const decor = buildDecor(f, this.shared, (m, fade) => patchEnv(m, this.shared, fade));
    this.group.add(decor.group);
    this.decorCount = decor.count;
    this.torchSpots = decor.lights;
    // quelques vraies lumières, données aux torches les plus proches du Meneur
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(f.biome === 'grotte' ? '#9C7BFF' : '#FFB25A', 0, 7, 1.5);
      this.torches.push(l);
      this.group.add(l);
    }
    this.scene.background = new THREE.Color(pal.bg);
    this.scene.fog = new THREE.Fog(pal.bg, 26, 48);
  }

  private itemMesh(it: Item): THREE.Object3D {
    const g = new THREE.Group();
    if (it.kind === 'soin') {
      // touffe de feuilles de soin (trois cubes verts)
      for (const [x, y, z, s] of [[0, 0.25, 0, 0.32], [0.18, 0.12, 0.1, 0.22], [-0.16, 0.14, -0.08, 0.24]]) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshToonMaterial({ color: '#7BE06A', gradientMap: getToonGradient(), emissive: '#2E6B22' }));
        c.position.set(x, y, z);
        g.add(c);
      }
    } else if (it.kind === 'elan') {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshToonMaterial({ color: '#FFD84A', gradientMap: getToonGradient(), emissive: '#8A6A00' }));
      c.position.y = 0.55;
      c.userData.spin = true;
      g.add(c);
    } else {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), new THREE.MeshToonMaterial({ color: '#8A5A2B', gradientMap: getToonGradient() }));
      chest.position.y = 0.28;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.65), new THREE.MeshToonMaterial({ color: '#F2C14E', gradientMap: getToonGradient(), emissive: '#5A4200' }));
      band.position.y = 0.45;
      g.add(chest, band);
    }
    g.position.set(it.x, 0, -it.y);
    this.group.add(g);
    return g;
  }

  update(g: Game, dt: number, camPos: THREE.Vector3) {
    this.time += dt;
    const lvl = this.level;
    if (lvl.seenVersion !== this.seenVersion) {
      this.seenVersion = lvl.seenVersion;
      for (let i = 0; i < lvl.seen.length; i++) this.seenData[i * 4 + 3] = lvl.seen[i] ? 255 : 0;
      this.shared.uSeen.value.needsUpdate = true;
    }
    for (const it of lvl.items) {
      let m = this.items.get(it.id);
      if (!m) {
        m = this.itemMesh(it);
        this.items.set(it.id, m);
      }
      m.visible = !it.taken && lvl.isSeen(it);
      m.children.forEach((c) => {
        if (c.userData.spin) {
          c.rotation.y = this.time * 2;
          c.position.y = 0.55 + Math.sin(this.time * 3) * 0.08;
        }
      });
    }
    // estompage : le Meneur et les créatures présentes
    const fade = this.shared.uFade.value;
    const who = g.units.filter((u) => u.team === 'ally' && u.alive && u.inPlay).slice(0, 6);
    for (let i = 0; i < 6; i++) {
      const u = who[i];
      if (u) fade[i].set(u.x, 0, -u.y);
      else fade[i].set(0, -100, 0);
    }
    this.shared.uCam.value.copy(camPos);
    // torches : les 6 plus proches du Meneur ont une vraie lumière qui vacille
    const L = g.leader;
    const near = this.torchSpots
      .filter((p) => lvl.isSeen(p))
      .sort((a, b) => Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y))
      .slice(0, 6);
    this.torches.forEach((l, i) => {
      const p = near[i];
      l.intensity = p ? 9 + Math.sin(this.time * 9 + i * 1.7) * 1.5 : 0;
      if (p) l.position.set(p.x, 1.7, -p.y);
    });
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
