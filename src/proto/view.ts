/**
 * Sprint PROTO-MENEUR : rendu three.js de la maquette, en style F (toon, contour noir) sur nos vrais `.vox`.
 * Ne lit que l'état de la simulation (sim.ts) ; ne touche ni au moteur du jeu, ni à la sauvegarde.
 *
 * Lisibilité : anneau au sol doré (Meneur), vert (compagnons), violet (ennemis) ; les attaques annoncées gardent la
 * couleur DANGER du jeu, hachurées, sans contour toon (matériaux de base). Lueurs seulement aux moments forts :
 * sorts, arrivée d'une créature (B), phase 2 du boss (lumière ponctuelle qui s'éteint).
 * Coordonnées : simulation (x, y) → scène (x, hauteur, −y).
 */
import * as THREE from 'three';
import { DANGER } from '../game/styleGuide';
import { registerSubjects, buildAnyStyle } from '../components/styles/allStyles';
import { getToonGradient, type StyledModel } from '../components/styles/magmaStyles';
import { loadVoxSubject } from '../components/styles/voxSubjects';
import { type Game, type Telegraph, type Unit, type Vec, ELAN, PLATFORM, PLATFORM_H, RAMP, ROOM, heightAt } from './sim';

const SPECIES_FILES: { id: string; ref: boolean; scaleOf: string; glow: number }[] = [
  { id: 'calcinarque-legendaire', ref: true, scaleOf: 'cendrox', glow: 0.45 },
  { id: 'crabastion', ref: false, scaleOf: 'crabastion', glow: 0.35 },
  { id: 'amanitox', ref: false, scaleOf: 'amanitox', glow: 0.35 },
  { id: 'braizard', ref: false, scaleOf: 'braizard', glow: 0.45 },
  { id: 'givrelin', ref: false, scaleOf: 'givrelin', glow: 0.35 },
  { id: 'chevrok', ref: false, scaleOf: 'chevrok', glow: 0.3 },
  { id: 'bourgeon', ref: false, scaleOf: 'bourgeon', glow: 0.3 },
  { id: 'magmadrake', ref: false, scaleOf: 'magmadrake', glow: 0.35 },
  // PROTO-DONJON : le Blindé, le remplaçant de Braizard dans la réserve
  { id: 'cailloc', ref: false, scaleOf: 'cailloc', glow: 0.3 },
  { id: 'raicube', ref: false, scaleOf: 'raicube', glow: 0.4 },
];
/** Taille d'affichage dans la maquette (la salle est plus serrée que les combats du jeu). */
const SIZE: Record<string, number> = { 'calcinarque-legendaire': 0.55, magmadrake: 0.85 };

export async function loadProtoModels(): Promise<void> {
  const subjects = await Promise.all(SPECIES_FILES.map((s) => loadVoxSubject({ id: s.id, label: s.id, file: s.id, ref: s.ref, scaleOf: s.scaleOf, glow: s.glow })));
  registerSubjects(subjects);
}

const toW = (p: Vec, h = 0) => new THREE.Vector3(p.x, h, -p.y);
const RING_COLORS = { meneur: '#FFD02A', ally: '#3BD16F', enemy: '#9B5CFF' };

export function toon(color: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: getToonGradient() });
}
export function outlined(geo: THREE.BufferGeometry, color: string): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, toon(color));
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m, new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#0B0B10' })));
  return g;
}
export function boxAt(r: [number, number, number, number], h: number, color: string, y0 = 0): THREE.Group {
  const g = outlined(new THREE.BoxGeometry(r[2] - r[0], h, r[3] - r[1]), color);
  g.position.set((r[0] + r[2]) / 2, y0 + h / 2, -(r[1] + r[3]) / 2);
  return g;
}

let hatch: THREE.CanvasTexture | null = null;
export function hatchTexture(): THREE.CanvasTexture {
  if (hatch) return hatch;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(255,255,255,0.45)';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = 'rgba(255,255,255,1)';
  x.lineWidth = 10;
  for (let i = -64; i < 128; i += 24) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 64, 64);
    x.stroke();
  }
  hatch = new THREE.CanvasTexture(c);
  hatch.wrapS = hatch.wrapT = THREE.RepeatWrapping;
  return hatch;
}
export function iconSprite(draw: (x: CanvasRenderingContext2D) => void): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  draw(c.getContext('2d')!);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.renderOrder = 10;
  return s;
}

interface UnitView {
  root: THREE.Group;
  body: THREE.Group;
  model: StyledModel;
  ring: THREE.Mesh;
  barBg: THREE.Sprite;
  bar: THREE.Sprite;
  glow: number;
  hitT: number;
  lastHp: number;
}
interface TeleView {
  group: THREE.Group;
  fill: THREE.Mesh;
  edge: THREE.Line;
}
interface Flash {
  light: THREE.PointLight;
  t: number;
}

export class ProtoView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  private units = new Map<number, UnitView>();
  private teles = new Map<number, TeleView>();
  private shots: THREE.Mesh[] = [];
  private flashes: Flash[] = [];
  private waves: { mesh: THREE.Mesh; t: number }[] = [];
  private beams: { line: THREE.Line; t: number }[] = [];
  private reticle: THREE.Mesh;
  private bondCircle: THREE.Line;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private time = 0;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** Position de la caméra par rapport au Meneur (réglable : proche, moyenne, éloignée ; plongée). */
  camOffset = new THREE.Vector3(0, 17, 11);
  /** Brouillard du donjon : une unité hors des zones vues n'est pas dessinée. */
  visibleFn: ((u: Unit) => boolean) | null = null;
  /** Le soleil suit le Meneur (grands étages : l'ombre reste nette autour de lui). */
  followSun = false;

  constructor(
    private host: HTMLElement,
    opts: { salle?: boolean } = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color('#BFD9E8');
    this.hemi = new THREE.HemisphereLight('#EAF4FF', '#6A6458', 1.5);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#FFF3E0', 2.0);
    this.sun = sun;
    sun.position.set(-8, 20, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 80 });
    sun.target.position.set(0, 0, -20);
    this.scene.add(sun, sun.target);
    sun.shadow.camera.updateProjectionMatrix();
    if (opts.salle !== false) this.buildRoom();
    // flashes : 4 lumières ponctuelles réutilisées (lueurs des moments forts)
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight('#FF8A30', 0, 9, 1.6);
      this.scene.add(light);
      this.flashes.push({ light, t: 0 });
    }
    this.reticle = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 24), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85, depthTest: false }));
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.renderOrder = 9;
    this.scene.add(this.reticle);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) pts.push(new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * ELAN.bondRange, 0.05, Math.sin((i / 64) * Math.PI * 2) * ELAN.bondRange));
    this.bondCircle = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#FFE27A', dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0.7 }));
    this.bondCircle.computeLineDistances();
    this.scene.add(this.bondCircle);
    this.resize();
  }

  private buildRoom() {
    for (const f of ROOM.floors) {
      const g = boxAt(f, 0.2, '#C9BBA0', -0.2);
      g.children[0].castShadow = false;
      this.scene.add(g);
    }
    // dalles du couloir plus sombres : on lit l'étroitesse
    this.scene.add(boxAt([-1.8, 10, 1.8, 19], 0.02, '#A8977A', 0));
    // murs bas devant la caméra (couloir, entrée) pour ne rien cacher ; murs du fond plus hauts
    ROOM.walls.forEach((w, i) => this.scene.add(boxAt(w, i < 5 ? 0.8 : i === 7 ? 2.4 : 1.4, '#8C8478')));
    this.scene.add(boxAt([PLATFORM[0], PLATFORM[1], PLATFORM[2] + 0.3, PLATFORM[3] + 0.3], PLATFORM_H, '#B7A27E'));
    for (const l of ROOM.ledges) this.scene.add(boxAt(l, 0.35, '#7B6A52', PLATFORM_H));
    // rampe : un plan incliné
    const len = Math.hypot(RAMP[3] - RAMP[1], PLATFORM_H);
    const ramp = outlined(new THREE.BoxGeometry(RAMP[2] - RAMP[0], 0.15, len), '#B7A27E');
    ramp.position.set((RAMP[0] + RAMP[2]) / 2, PLATFORM_H / 2, -(RAMP[1] + RAMP[3]) / 2);
    ramp.rotation.x = Math.atan2(PLATFORM_H, RAMP[3] - RAMP[1]);
    this.scene.add(ramp);
    for (const r of ROOM.rocks) this.scene.add(boxAt(r, 1.5, '#6F7F8A'));
  }

  resize() {
    const w = this.host.clientWidth || 800;
    const h = this.host.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Point de la souris sur le sol, en coordonnées de simulation. */
  pick(ndcX: number, ndcY: number, height = 0): Vec | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    this.ground.constant = -height;
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, p)) return null;
    return { x: p.x, y: -p.z };
  }

  private unitView(u: Unit): UnitView {
    let v = this.units.get(u.id);
    if (v) return v;
    const model = buildAnyStyle('F', u.species);
    const body = new THREE.Group();
    body.add(model.root);
    model.root.scale.multiplyScalar(SIZE[u.species] ?? 0.62);
    const root = new THREE.Group();
    root.add(body);
    const color = u.role === 'meneur' ? RING_COLORS.meneur : u.team === 'ally' ? RING_COLORS.ally : RING_COLORS.enemy;
    const ring = new THREE.Mesh(new THREE.RingGeometry(u.r + 0.1, u.r + 0.32, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    root.add(ring);
    const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#111111', depthTest: false }));
    const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
    barBg.renderOrder = bar.renderOrder = 11;
    const top = u.role === 'boss' ? 3.6 : u.role === 'meneur' ? 2.2 : 1.7;
    barBg.scale.set(1.1, 0.14, 1);
    barBg.position.y = top;
    bar.center.set(0, 0.5);
    bar.position.set(-0.55, top, 0);
    root.add(barBg, bar);
    if (u.role === 'soigneur') {
      // repère du Soigneur : une croix au-dessus de la tête
      const icon = iconSprite((x) => {
        x.fillStyle = '#0B0B10';
        x.fillRect(20, 4, 24, 56);
        x.fillRect(4, 20, 56, 24);
        x.fillStyle = '#9CFF7A';
        x.fillRect(25, 9, 14, 46);
        x.fillRect(9, 25, 46, 14);
      });
      icon.scale.set(0.6, 0.6, 1);
      icon.position.y = top + 0.5;
      root.add(icon);
    }
    this.scene.add(root);
    v = { root, body, model, ring, barBg, bar, glow: 0, hitT: 0, lastHp: u.hp };
    this.units.set(u.id, v);
    return v;
  }

  private flash(p: Vec, color: string, power = 30, h = 1) {
    const f = this.flashes.sort((a, b) => a.t - b.t)[0];
    f.light.color.set(color);
    f.light.position.copy(toW(p, h + 1));
    f.t = 0.6;
    f.light.userData.power = power;
  }
  private wave(p: Vec, color: string, size: number) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(toW(p, heightAt(p) + 0.08));
    m.userData.size = size;
    this.scene.add(m);
    this.waves.push({ mesh: m, t: 0 });
  }

  private teleView(t: Telegraph): TeleView {
    let v = this.teles.get(t.id);
    if (v) return v;
    const color = t.team === 'enemy' ? DANGER : '#FF9A3C';
    let geo: THREE.BufferGeometry;
    let edgePts: THREE.Vector3[] = [];
    const circle = (r: number) => Array.from({ length: 49 }, (_, i) => new THREE.Vector3(Math.cos((i / 48) * Math.PI * 2) * r, 0, Math.sin((i / 48) * Math.PI * 2) * r));
    if (t.kind === 'disc') {
      geo = new THREE.CircleGeometry(t.r, 40);
      edgePts = circle(t.r);
    } else if (t.kind === 'ring') {
      geo = new THREE.RingGeometry(t.r, t.r2, 48);
      edgePts = [...circle(t.r2), ...circle(t.r)];
    } else {
      geo = new THREE.PlaneGeometry(t.len, t.w);
      geo.translate(t.len / 2, 0, 0);
      edgePts = [
        [0, -t.w / 2],
        [t.len, -t.w / 2],
        [t.len, t.w / 2],
        [0, t.w / 2],
        [0, -t.w / 2],
      ].map(([a, b]) => new THREE.Vector3(a, 0, b));
    }
    if (t.kind !== 'band') geo.rotateX(-Math.PI / 2);
    else geo.rotateX(-Math.PI / 2);
    const tex = hatchTexture().clone();
    tex.repeat.set(t.kind === 'band' ? t.len / 1.5 : (t.r2 || t.r) / 0.8, t.kind === 'band' ? t.w / 1.5 : (t.r2 || t.r) / 0.8);
    tex.needsUpdate = true;
    const base = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0.35, depthWrite: false }));
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }));
    fill.position.y = 0.01;
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgePts), new THREE.LineBasicMaterial({ color, transparent: true }));
    edge.position.y = 0.02;
    const group = new THREE.Group();
    group.add(base, fill, edge);
    group.position.copy(toW(t, heightAt(t) + 0.06));
    if (t.kind === 'band') group.rotation.y = t.angle; // repère local : x = longueur ; scène : z = −y
    group.renderOrder = 5;
    this.scene.add(group);
    v = { group, fill, edge };
    this.teles.set(t.id, v);
    return v;
  }

  render(g: Game, aim: Vec, dt: number) {
    this.time += dt;
    // événements : lueurs ponctuelles, ondes, rayons de soin
    for (const e of g.events.splice(0)) {
      const u = g.units.find((x) => x.id === e.id);
      if (e.type === 'glow') {
        if (u) this.unitView(u).glow = 1;
        this.flash(e, e.color ?? '#FF8A30', 25);
      } else if (e.type === 'arrival') {
        this.wave(e, e.color ?? '#FFE27A', u?.team === 'ally' ? 3 : 1.6);
        if (u?.team === 'ally') {
          this.unitView(u).glow = 1;
          this.flash(e, '#FFE27A', 45);
        }
      } else if (e.type === 'phase') {
        this.flash(e, '#FF5A1F', 80, 2);
        this.wave(e, '#FF5A1F', 9);
      } else if (e.type === 'impact' && e.color) {
        this.wave(e, e.color, 2.2);
        if (e.color !== DANGER) this.flash(e, e.color, 30);
      } else if (e.type === 'heal' && e.to !== undefined) {
        const to = g.units.find((x) => x.id === e.to);
        if (u && to) {
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([toW(u, heightAt(u) + 1), toW(to, heightAt(to) + 1)]), new THREE.LineBasicMaterial({ color: '#9CFF7A', linewidth: 3 }));
          this.scene.add(line);
          this.beams.push({ line, t: 0.4 });
        }
      } else if (e.type === 'dodge') this.wave(e, '#FFFFFF', 1.2);
    }
    // unités
    const seen = new Set<number>();
    for (const u of g.units) {
      const visible = u.alive && (u.inPlay || u.flight !== null) && (!this.visibleFn || this.visibleFn(u));
      if (!visible) {
        const v = this.units.get(u.id);
        if (v) v.root.visible = false;
        continue;
      }
      seen.add(u.id);
      const v = this.unitView(u);
      v.root.visible = true;
      let h = heightAt(u);
      if (u.flight) {
        const k = Math.min(1, u.flight.t / u.flight.dur);
        h += Math.sin(Math.PI * k) * 2.6; // le bond : la créature saute d'elle-même
      }
      v.root.position.copy(toW(u, h));
      v.body.rotation.y = Math.atan2(Math.cos(u.face), -Math.sin(u.face));
      const bob = u.moving ? Math.abs(Math.sin(this.time * 9 + u.id)) * 0.12 : Math.sin(this.time * 2 + u.id) * 0.02;
      v.body.position.y = bob;
      if (u.hp < v.lastHp - 0.5) v.hitT = 0.15;
      v.lastHp = u.hp;
      v.hitT = Math.max(0, v.hitT - dt);
      const sq = 1 + v.hitT * 1.2;
      v.body.scale.set(sq, 1 / sq, sq);
      if (u.windup > 0) v.body.rotation.z = Math.sin(this.time * 40) * 0.05; // il se prépare : tremble
      else v.body.rotation.z = 0;
      v.glow = Math.max(0, v.glow - dt * 1.6);
      const phaseGlow = u.role === 'boss' && g.bossPhase === 2 ? 0.8 + Math.sin(this.time * 4) * 0.2 : 0;
      v.model.setNight(Math.max(v.glow, phaseGlow));
      (v.ring.material as THREE.MeshBasicMaterial).opacity = u.invuln > 0 ? 0.3 : 0.95;
      v.bar.scale.set(1.1 * Math.max(0, u.hp / u.maxHp), 0.1, 1);
      const showBar = u.role !== 'boss';
      v.bar.visible = v.barBg.visible = showBar;
    }
    for (const [id, v] of this.units)
      if (!seen.has(id) && !g.units.some((u) => u.id === id)) {
        this.scene.remove(v.root);
        this.units.delete(id);
      }
    // attaques annoncées
    const live = new Set<number>();
    for (const t of g.telegraphs) {
      live.add(t.id);
      const v = this.teleView(t);
      const k = Math.min(1, t.t / t.dur);
      if (t.kind === 'band') v.fill.scale.set(k, 1, 1);
      else if (t.kind === 'disc') v.fill.scale.set(k, 1, k);
      else (v.fill.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.45 * k;
      (v.edge.material as THREE.LineBasicMaterial).opacity = k > 0.7 ? (Math.sin(this.time * 30) > 0 ? 1 : 0.2) : 1;
    }
    for (const [id, v] of this.teles)
      if (!live.has(id)) {
        this.scene.remove(v.group);
        this.teles.delete(id);
      }
    // projectiles (pool)
    while (this.shots.length < g.projectiles.length) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: '#FFB347' }));
      this.scene.add(m);
      this.shots.push(m);
    }
    this.shots.forEach((m, i) => {
      const p = g.projectiles[i];
      m.visible = Boolean(p);
      if (!p) return;
      m.position.copy(toW(p, heightAt(p) + 0.9));
      m.rotation.y = Math.atan2(p.vx, -p.vy);
      (m.material as THREE.MeshBasicMaterial).color.set(p.team === 'ally' ? '#FFB347' : '#C07BFF');
    });
    // effets passagers
    for (const f of this.flashes) {
      f.t = Math.max(0, f.t - dt);
      f.light.intensity = (f.light.userData.power ?? 0) * (f.t / 0.6);
    }
    this.waves = this.waves.filter((w) => {
      w.t += dt;
      const k = w.t / 0.45;
      w.mesh.scale.setScalar(0.3 + k * w.mesh.userData.size);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) this.scene.remove(w.mesh);
      return k < 1;
    });
    this.beams = this.beams.filter((b) => {
      b.t -= dt;
      if (b.t <= 0) this.scene.remove(b.line);
      return b.t > 0;
    });
    // viseur et portée du bond (B)
    const L = g.leader;
    this.reticle.position.copy(toW(aim, heightAt(aim) + 0.06));
    const sel = g.comps[g.selected];
    this.bondCircle.visible = g.version === 'B' && Boolean(sel && sel.alive && !sel.inPlay);
    this.bondCircle.position.copy(toW(L, heightAt(L)));
    // caméra : suit le Meneur, vue plongeante
    const target = toW(L, heightAt(L));
    const want = target.clone().add(this.camOffset);
    this.camera.position.lerp(want, Math.min(1, dt * 6));
    this.camera.lookAt(target.x, target.y, target.z - 2);
    if (this.followSun) {
      this.sun.position.set(target.x - 8, 20, target.z + 6);
      this.sun.target.position.copy(target);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
