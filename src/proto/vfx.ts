/**
 * PROTO-MODELES, phase 8 : animations des sorts et des attaques, pour tous les modèles (rendu seulement ; la
 * simulation n'est pas touchée). Trois temps pour chaque action :
 * - préparation : la créature se ramasse, des éclats se concentrent sur elle (sorts) ;
 * - lancer : un élan vers l'avant, puis un projectile ou une zone à la forme de son élément
 *   (feu : flammes en éventail ; eau : vague ; plante : racines qui sortent du sol ; roche : pics ;
 *   électrique : éclair en zigzag ; glace : éclats) ;
 * - impact : un flash, des éclats, un petit recul de la cible et une trace au sol qui s'efface.
 * Style toon : formes simples à contour, couleurs de l'élément ; la forme suffit à reconnaître l'élément.
 * Tout est pris dans des réserves de taille fixe (budget : 160 éclats, 24 traces, 40 formes de zone).
 */
import * as THREE from 'three';
import { getToonGradient } from '../components/styles/magmaStyles';

export type Elem = 'feu' | 'eau' | 'plante' | 'roche' | 'elec' | 'glace' | 'neutre';
const SPECIES_ELEM: Record<string, Elem> = {
  'calcinarque-legendaire': 'feu',
  braizard: 'feu',
  magmadrake: 'feu',
  crabastion: 'eau',
  amanitox: 'plante',
  bourgeon: 'plante',
  givrelin: 'glace',
  raicube: 'elec',
  chevrok: 'roche',
  cailloc: 'roche',
};
/** Élément d'une espèce, ou d'une source de dégâts (« Calcinarque — Brasier », « Boss — Pluie »…). */
export function elemOf(by?: string): Elem {
  if (!by) return 'neutre';
  if (SPECIES_ELEM[by]) return SPECIES_ELEM[by];
  if (/Brasier|Onde|Fournaise|Salve|Flamm|Trait|entrée|sortie/.test(by) && /Calcinarque|Braizard|Boss — Onde|Fournaise/.test(by)) return 'feu';
  if (/Nuage|Spores|Amanitox/.test(by)) return 'plante';
  if (/Pluie|Chargeur|Blindé|Cailloc/.test(by)) return 'roche';
  if (/Raicube|Foudre/.test(by)) return 'elec';
  if (/Crabastion|Vague/.test(by)) return 'eau';
  if (/Givrelin/.test(by)) return 'glace';
  return 'neutre';
}
export const ELEM_COLOR: Record<Elem, [string, string]> = {
  feu: ['#FF8A30', '#FFE27A'],
  eau: ['#3FA9F5', '#BFE8FF'],
  plante: ['#5FB548', '#C8F59A'],
  roche: ['#8C7A62', '#D9C9A8'],
  elec: ['#FFD83A', '#FFFFFF'],
  glace: ['#8FD8FF', '#FFFFFF'],
  neutre: ['#C9C2AE', '#FFFFFF'],
};

// géométries partagées (les effets sont nombreux : rien n'est recréé à chaque coup)
const FLASH_GEO = new THREE.IcosahedronGeometry(0.35, 0);
const DECAL_GEO = new THREE.CircleGeometry(1, 18);
const RING_GEO = new THREE.TorusGeometry(1, 0.12, 6, 32);
const FLAME_GEO = new THREE.ConeGeometry(0.28, 1.2, 5);
const ROOT_GEO = new THREE.BoxGeometry(0.16, 1.3, 0.16);
const SPIKE_GEO = new THREE.ConeGeometry(0.32, 1.1, 4);
const toonCache = new Map<string, THREE.MeshToonMaterial>();
const toon = (c: string) => {
  if (!toonCache.has(c)) toonCache.set(c, new THREE.MeshToonMaterial({ color: c, gradientMap: getToonGradient() }));
  return toonCache.get(c)!;
};
// (une matière toon par couleur suffit : elles ne changent pas)
const outlineMat = new THREE.MeshBasicMaterial({ color: '#0B0B10', side: THREE.BackSide });
/** Une forme toon avec son contour (coque légèrement agrandie). */
function outlined(geo: THREE.BufferGeometry, color: string): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, toon(color));
  const h = new THREE.Mesh(geo, outlineMat);
  h.scale.setScalar(1.18);
  g.add(m, h);
  return g;
}

/** Géométrie du projectile selon l'élément (la forme, pas seulement la couleur). */
const PROJ_GEO: Record<Elem, THREE.BufferGeometry> = {
  feu: new THREE.ConeGeometry(0.16, 0.5, 6).rotateX(Math.PI / 2),
  eau: new THREE.SphereGeometry(0.17, 8, 6),
  plante: new THREE.OctahedronGeometry(0.18),
  roche: new THREE.DodecahedronGeometry(0.17),
  elec: new THREE.TetrahedronGeometry(0.2),
  glace: new THREE.ConeGeometry(0.08, 0.55, 4).rotateX(Math.PI / 2),
  neutre: new THREE.BoxGeometry(0.2, 0.2, 0.4),
};
export function projectileMesh(e: Elem): THREE.Object3D {
  return outlined(PROJ_GEO[e], ELEM_COLOR[e][0]);
}

interface Shard {
  m: THREE.Mesh;
  v: THREE.Vector3;
  t: number;
  life: number;
  to?: THREE.Vector3;
}
interface Piece {
  o: THREE.Object3D;
  t: number;
  life: number;
  kind: 'flash' | 'decal' | 'rise' | 'ring' | 'bolt';
  base: number;
}

export class Vfx {
  group = new THREE.Group();
  private shards: Shard[] = [];
  private pieces: Piece[] = [];
  private shardGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private shardMats = new Map<string, THREE.MeshToonMaterial>();
  count = 0;
  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }
  private mat(c: string) {
    if (!this.shardMats.has(c)) this.shardMats.set(c, toon(c));
    return this.shardMats.get(c)!;
  }
  // réserves fixes (aucun objet créé pendant le combat : pas d'à-coups du ramasse-miettes)
  private shardPool: THREE.Mesh[] = [];
  private shardIdx = 0;
  private flashPool: THREE.Mesh[] = [];
  private decalPool: THREE.Mesh[] = [];
  private flashIdx = 0;
  private decalIdx = 0;
  private take(pool: THREE.Mesh[], idx: number, size: number, make: () => THREE.Mesh): THREE.Mesh {
    const k = idx % size;
    if (!pool[k]) {
      pool[k] = make();
      this.group.add(pool[k]);
    }
    const m = pool[k];
    // l'objet repris est retiré de ce qu'il animait encore
    this.shards = this.shards.filter((s) => s.m !== m);
    this.pieces = this.pieces.filter((p) => p.o !== m);
    m.visible = true;
    return m;
  }
  private shard(p: THREE.Vector3, v: THREE.Vector3, color: string, life: number, to?: THREE.Vector3) {
    const m = this.take(this.shardPool, this.shardIdx++, 160, () => new THREE.Mesh(this.shardGeo, this.mat(color)));
    m.material = this.mat(color);
    m.position.copy(p);
    this.shards.push({ m, v, t: 0, life, to });
  }
  private piece(o: THREE.Object3D, kind: Piece['kind'], life: number, cap = 40) {
    const same = this.pieces.filter((p) => p.kind === kind);
    if (same.length >= cap) {
      const old = same[0];
      this.group.remove(old.o);
      this.pieces.splice(this.pieces.indexOf(old), 1);
    }
    this.group.add(o);
    this.pieces.push({ o, t: 0, life, kind, base: o.scale.x });
  }

  /** Préparation : des éclats convergent vers la créature (sorts). */
  prepare(at: THREE.Vector3, e: Elem) {
    const [c1, c2] = ELEM_COLOR[e];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = at.clone().add(new THREE.Vector3(Math.cos(a) * 1.3, 0.6 + (i % 2) * 0.5, Math.sin(a) * 1.3));
      this.shard(p, new THREE.Vector3(), i % 2 ? c1 : c2, 0.28, at.clone().add(new THREE.Vector3(0, 0.8, 0)));
    }
  }
  /** Lancer : une petite gerbe à la bouche, dans la direction du tir. */
  launch(at: THREE.Vector3, angle: number, e: Elem) {
    const [c1, c2] = ELEM_COLOR[e];
    const dir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    for (let i = 0; i < 3; i++) {
      const v = dir.clone().multiplyScalar(4 + i).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5));
      this.shard(at.clone().add(new THREE.Vector3(0, 0.8, 0)).addScaledVector(dir, 0.5), v, i % 2 ? c1 : c2, 0.25);
    }
  }
  /** Impact : flash, éclats, trace au sol. `big` : un sort de zone (formes propres à l'élément). */
  impact(at: THREE.Vector3, e: Elem, big = 0) {
    const [c1, c2] = ELEM_COLOR[e];
    const flash = this.take(this.flashPool, this.flashIdx++, 16, () => new THREE.Mesh(FLASH_GEO, new THREE.MeshBasicMaterial({ transparent: true })));
    (flash.material as THREE.MeshBasicMaterial).color.set(c2);
    flash.position.copy(at).add(new THREE.Vector3(0, 0.7, 0));
    flash.scale.setScalar(1);
    this.pieces.push({ o: flash, t: 0, life: 0.18, kind: 'flash', base: 1 });
    const n = big ? 10 : 5;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.shard(at.clone().add(new THREE.Vector3(0, 0.6, 0)), new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 2), 2.5 + Math.random() * 2, Math.sin(a) * (2 + Math.random() * 2)), i % 3 ? c1 : c2, 0.5);
    }
    const decal = this.take(this.decalPool, this.decalIdx++, 24, () => {
      const d = new THREE.Mesh(DECAL_GEO, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }));
      d.rotation.x = -Math.PI / 2;
      return d;
    });
    (decal.material as THREE.MeshBasicMaterial).color.set(e === 'feu' ? '#3A2416' : e === 'eau' ? '#2C5F80' : e === 'plante' ? '#2E5A22' : '#4A4238');
    decal.scale.setScalar(big ? big * 0.8 : 0.45);
    decal.position.copy(at).setY(0.03);
    this.pieces.push({ o: decal, t: 0, life: 1.4, kind: 'decal', base: 1 });
    if (big) this.zone(at, e, big);
  }
  /** Formes de zone : flammes qui jaillissent, racines, pics de roche, anneau de vague, éclairs. */
  private zone(at: THREE.Vector3, e: Elem, r: number) {
    const [c1, c2] = ELEM_COLOR[e];
    const k = Math.min(9, Math.max(4, Math.round(r * 2)));
    if (e === 'eau' || e === 'neutre' || e === 'glace') {
      const ring = new THREE.Mesh(RING_GEO, toon(c2));
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(at).setY(0.2);
      ring.scale.setScalar(0.3);
      this.piece(ring, 'ring', 0.45);
      ring.userData.r = r;
      return;
    }
    if (e === 'elec') {
      for (let i = 0; i < 3; i++) {
        const pts: THREE.Vector3[] = [];
        const x = at.x + (Math.random() - 0.5) * r;
        const z = at.z + (Math.random() - 0.5) * r;
        for (let j = 0; j <= 6; j++) pts.push(new THREE.Vector3(x + (j % 2 ? 0.35 : -0.35), 4 - j * 0.66, z));
        const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c1 }));
        this.piece(bolt, 'bolt', 0.22);
      }
      return;
    }
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + Math.random() * 0.4;
      const d = r * (0.3 + Math.random() * 0.6);
      const geo = e === 'feu' ? FLAME_GEO : e === 'plante' ? ROOT_GEO : SPIKE_GEO;
      const o = outlined(geo, i % 2 ? c1 : e === 'plante' ? '#6B4528' : c2);
      o.position.set(at.x + Math.cos(a) * d, -0.6, at.z + Math.sin(a) * d);
      if (e === 'plante') o.rotation.z = (Math.random() - 0.5) * 0.6;
      this.piece(o, 'rise', 0.9);
    }
  }

  update(dt: number) {
    const g = 9;
    this.shards = this.shards.filter((s) => {
      s.t += dt;
      if (s.to) s.m.position.lerp(s.to, Math.min(1, dt * 10));
      else {
        s.v.y -= g * dt;
        s.m.position.addScaledVector(s.v, dt);
        if (s.m.position.y < 0.05) {
          s.m.position.y = 0.05;
          s.v.multiplyScalar(0.4);
        }
      }
      s.m.scale.setScalar(Math.max(0.05, 1 - s.t / s.life));
      if (s.t >= s.life) s.m.visible = false;
      return s.t < s.life;
    });
    this.pieces = this.pieces.filter((p) => {
      p.t += dt;
      const k = p.t / p.life;
      const o = p.o;
      if (p.kind === 'flash') o.scale.setScalar(1 + k * 2.2);
      else if (p.kind === 'ring') o.scale.setScalar(0.3 + k * (o.userData.r ?? 2));
      else if (p.kind === 'rise') o.position.y = k < 0.3 ? -0.6 + (k / 0.3) * 1.1 : k > 0.75 ? 0.5 - ((k - 0.75) / 0.25) * 1.1 : 0.5;
      const mat = (o as THREE.Mesh).material as THREE.Material & { opacity?: number };
      if (mat && 'opacity' in mat && mat.transparent) mat.opacity = (p.kind === 'decal' ? 0.55 : 1) * (1 - k);
      if (p.t >= p.life) {
        // flash et traces : objets de réserve, seulement cachés ; les autres formes sont retirées
        if (p.kind === 'flash' || p.kind === 'decal') o.visible = false;
        else this.group.remove(o);
        if (p.kind === 'bolt') {
          (o as THREE.Line).geometry.dispose();
          ((o as THREE.Line).material as THREE.Material).dispose();
        }
      }
      return p.t < p.life;
    });
    this.count = this.shards.length + this.pieces.length;
  }
}
