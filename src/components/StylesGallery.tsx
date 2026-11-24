import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BIOMES } from '../game/catalog';
import { buildBiomeEnvironment } from '../game/models/biomes';
import { setDecorNight } from '../game/models/meadowDecor';
import { setCreatureNight, setCreatureRim } from '../game/models/voxelSculpt';
import { withSaveSlot } from '../game/saveSlot';
import { ALL_STYLES, SUBJECTS, buildAnyStyle, registerSubjects, type AnyStyleId } from './styles/allStyles';
import type { LightContext, PostPass, StyledModel } from './styles/magmaStyles';
import { getHaloTexture } from './styles/magmaStyles2';
import type { SubjectId } from './styles/subject';
import { VOX_SUBJECTS_SPEC, loadVoxSubjects } from './styles/voxSubjects';

/**
 * `?gallery=styles` (sprints STYLES, STYLES2 et STYLES3, outil de développement) : Magmadrake et Calcinarque
 * en vingt styles. Un seul rendu WebGL découpé en cases ; à chaque case, seule sa variante est visible. Avec
 * beaucoup de cases, on en redessine 5 par image, à tour de rôle (le reste de l'image est gardé).
 * Les interrupteurs n'agissent que sur cette page : le jeu garde ses réglages. Textes en place : outil.
 *
 * Paramètres pour les captures : `&creature=calcinarque`, `&view=jeu`, `&tone=aucun|neutre`, `&sat=1`, `&aa=2`,
 * `&cam=proche`, `&nuit=1`, `&angle=face|profil`, `&silhouette=1`,
 * `&compare=magmadrake:C,calcinarque:O` (ou des lettres : créature choisie), `&focus=O` (ou `calcinarque:O`).
 *
 * STYLES4 : les créatures par défaut sont nos vrais `.vox` (Calcinarque légendaire, Amanitox, Crabastion, Braizard ;
 * voxSubjects.ts), les anciens modèles restent en fin de liste. `&tous=1` : les vingt styles (sinon la présélection
 * A, D, E, F, H, I). `&volcan=1` : éclairage « nuit volcanique » (l'ancien style O), applicable à tous les styles.
 * `&planche=1` : planche 4 créatures × 6 styles. `&banc=D` : mesure des images par seconde du style D avec six
 * créatures à l'écran (résultat dans `window.__banc`, lu par tools/styles-banc.mjs).
 */
type View = 'vitrine' | 'jeu';
type Tone = 'actuel' | 'aucun' | 'neutre';
type Angle = 'tourne' | 'face' | 'profil';
interface Cell {
  s: SubjectId;
  id: AnyStyleId;
}
interface Settings {
  creature: SubjectId;
  view: View;
  tone: Tone;
  sat: boolean;
  aa: boolean;
  closeCam: boolean;
  night: boolean;
  angle: Angle;
  silhouette: boolean;
  compare: [Cell, Cell] | null;
  focus: Cell | null;
  /** STYLES4 : les vingt styles (sinon la présélection) */
  all: boolean;
  /** STYLES4 : éclairage « nuit volcanique » */
  volcan: boolean;
  /** STYLES4 : planche 4 créatures × 6 styles */
  planche: boolean;
}

const IDS = ALL_STYLES.map((s) => s.id);
/** STYLES4 : nos `.vox` d'abord, les anciens modèles construits par le code ensuite. */
const VOX_IDS: SubjectId[] = VOX_SUBJECTS_SPEC.map((s) => s.id);
const SUBJECT_IDS: SubjectId[] = [...VOX_IDS, 'magmadrake', 'calcinarque'];
/** Présélection (filtre par défaut) : A référence, D biseauté, E sculpté lisse, F toon, H haute définition, I hybride. */
const SHORTLIST: AnyStyleId[] = ['A', 'D', 'E', 'F', 'H', 'I'];
const BANC = params0().get('banc');
function params0() {
  return new URLSearchParams(window.location.search);
}
const isId = (x: unknown): x is AnyStyleId => typeof x === 'string' && IDS.includes(x as AnyStyleId);
const isSubject = (x: unknown): x is SubjectId => typeof x === 'string' && SUBJECT_IDS.includes(x as SubjectId);
const params = new URLSearchParams(window.location.search);
const creatureParam: SubjectId = isSubject(params.get('creature')) ? (params.get('creature') as SubjectId) : VOX_IDS[0];
/** « O » (créature choisie) ou « calcinarque:O ». */
function parseCell(raw: string, fallback: SubjectId): Cell | null {
  const [a, b] = raw.split(':');
  if (b !== undefined) return isSubject(a) && isId(b) ? { s: a, id: b } : null;
  return isId(a) ? { s: fallback, id: a } : null;
}
const compareParam = (params.get('compare') ?? '')
  .split(',')
  .map((x) => parseCell(x, creatureParam))
  .filter((x): x is Cell => Boolean(x));
const INITIAL: Settings = {
  creature: creatureParam,
  view: params.get('view') === 'jeu' ? 'jeu' : 'vitrine',
  tone: params.get('tone') === 'aucun' ? 'aucun' : params.get('tone') === 'neutre' ? 'neutre' : 'actuel',
  sat: params.get('sat') === '1',
  aa: params.get('aa') === '2',
  closeCam: params.get('cam') === 'proche',
  night: params.get('nuit') === '1',
  angle: params.get('angle') === 'face' ? 'face' : params.get('angle') === 'profil' ? 'profil' : 'tourne',
  silhouette: params.get('silhouette') === '1',
  compare: compareParam.length >= 2 ? [compareParam[0], compareParam[1]] : compareParam.length === 1 ? [{ s: creatureParam, id: 'A' }, compareParam[0]] : null,
  focus: parseCell(params.get('focus') ?? '', creatureParam),
  all: params.get('tous') === '1',
  volcan: params.get('volcan') === '1',
  planche: params.get('planche') === '1',
};

/** Caméra de combat du jeu (engine/camera.ts) : 42°, en haut et en arrière, visée un peu au-dessus du sol. */
const GAME_CAM = { pos: new THREE.Vector3(0, 15.8, 16.5), target: new THREE.Vector3(0, 0.7, 0), fov: 42 };
const CLOSE_CAM = { pos: new THREE.Vector3(0, 7.5, 10), target: new THREE.Vector3(0, 1.0, 0), fov: 42 };
// visée au-dessus de la créature : elle se pose dans le bas de la case, sous les étiquettes ; agrandie selon la créature
const SHOWCASE_POS = new THREE.Vector3(0, 2.9, 9.4);
const SHOWCASE_TARGET = new THREE.Vector3(0, 2.15, 0);

const favKey = (s: SubjectId) => withSaveSlot(s === 'magmadrake' ? 'cubiquest-styles-favoris' : `cubiquest-styles-favoris-${s}`);
function loadFavorites(): Record<SubjectId, AnyStyleId[]> {
  const out = {} as Record<SubjectId, AnyStyleId[]>;
  for (const s of SUBJECT_IDS) {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(favKey(s)) ?? '[]');
      out[s] = Array.isArray(raw) ? raw.filter(isId) : [];
    } catch {
      out[s] = [];
    }
  }
  return out;
}
function saveFavorites(fav: Record<SubjectId, AnyStyleId[]>): void {
  for (const s of SUBJECT_IDS) {
    try {
      localStorage.setItem(favKey(s), JSON.stringify(fav[s]));
    } catch {
      // navigation privée : les favoris ne sont pas gardés
    }
  }
}

interface Measure {
  calls: number;
  triangles: number;
}

/** Une case fait au moins 230 px de large : moins de colonnes quand la fenêtre est étroite ou zoomée. */
const MIN_CELL = 230;
function layoutFor(s: Settings, width: number, height: number): { list: Cell[]; cols: number; cellW: number; cellH: number } {
  if (s.focus) return { list: [s.focus], cols: 1, cellW: width, cellH: height };
  if (s.planche) {
    // une ligne par créature, une colonne par style de la présélection
    const cellW = Math.floor(width / SHORTLIST.length);
    return { list: VOX_IDS.flatMap((sub) => SHORTLIST.map((id) => ({ s: sub, id }))), cols: SHORTLIST.length, cellW, cellH: Math.floor(cellW * 0.92) };
  }
  const shown = s.all ? IDS : SHORTLIST;
  const list: Cell[] = s.compare ? [...s.compare] : shown.map((id) => ({ s: s.creature, id }));
  const cols = s.compare ? (width >= 2 * MIN_CELL ? 2 : 1) : Math.max(1, Math.min(5, Math.floor(width / MIN_CELL)));
  const cellW = Math.floor(width / cols);
  return { list, cols, cellW, cellH: Math.floor(cellW * 0.75) };
}

const POST_VERTEX = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function postMaterial(post: PostPass): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uResolution: { value: new THREE.Vector2(1, 1) } },
    vertexShader: POST_VERTEX,
    fragmentShader: `uniform sampler2D tDiffuse;
uniform vec2 uResolution;
varying vec2 vUv;
${post.fragment}
void main() {
  gl_FragColor = vec4(post(vUv), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
}

const cellKey = (c: Cell) => `${c.s}:${c.id}`;
/** Nom d'une créature, même avant le chargement des `.vox`. */
const labelOf = (sub: SubjectId) => SUBJECTS[sub]?.label ?? VOX_SUBJECTS_SPEC.find((x) => x.id === sub)?.label ?? sub;
const styleInfo = (id: AnyStyleId) => ALL_STYLES.find((s) => s.id === id)!;

export function StylesGallery() {
  const [settings, setSettings] = useState<Settings>(INITIAL);
  const [measures, setMeasures] = useState<Record<string, Measure>>({});
  const [favorites, setFavorites] = useState<Record<SubjectId, AnyStyleId[]>>(loadFavorites);
  const [showRanking, setShowRanking] = useState(false);
  const [copied, setCopied] = useState('');
  const [pickSide, setPickSide] = useState<0 | 1>(1);
  const [width, setWidth] = useState(0);
  const host = useRef<HTMLDivElement | null>(null);
  const live = useRef(settings);
  live.current = settings;
  const yaw = useRef(0);
  const drag = useRef<{ x: number; yaw: number } | null>(null);

  useEffect(() => saveFavorites(favorites), [favorites]);
  // STYLES4 : les `.vox` sont chargés avant le premier rendu
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [banc, setBanc] = useState('');
  useEffect(() => {
    loadVoxSubjects()
      .then((list) => {
        registerSubjects(list);
        setReady(true);
      })
      .catch((e: unknown) => setLoadError(String(e)));
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setScissorTest(true);
    renderer.autoClear = false;
    renderer.info.autoReset = false;
    el.appendChild(renderer.domElement);
    // la toile suit toujours la largeur de son cadre (correctif : elle débordait quand la fenêtre rétrécissait)
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight('#B4DFFF', '#7D6044', 0.52);
    const key = new THREE.DirectionalLight('#FFEED1', 1.28);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    key.shadow.camera.far = 80;
    key.shadow.bias = -0.0005;
    // lumière du jeu (VoxelEngine) : environnement de studio, contre-jour bleuté
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const rim = new THREE.DirectionalLight('#93C5FD', 0.32);
    scene.add(hemi, key, rim);
    const ctx: LightContext = { scene, hemi, key, rim };
    // morceau de Prairie (ART 3), le même décor que le combat
    setCreatureRim(true);
    const env = buildBiomeEnvironment(BIOMES.meadow, false);
    scene.add(env.group);
    // modèles construits à la demande (40 au plus) : la page s'ouvre vite
    const models = new Map<string, StyledModel>();
    const modelFor = (c: Cell): StyledModel => {
      let m = models.get(cellKey(c));
      if (!m) {
        m = buildAnyStyle(c.id, c.s);
        m.root.visible = false;
        const content = m.root.children[0];
        content.userData.baseScale = content.scale.clone();
        m.root.userData.volcan = volcanRig(c.s);
        m.root.add(m.root.userData.volcan as THREE.Group);
        models.set(cellKey(c), m);
        scene.add(m.root);
      }
      return m;
    };
    /**
     * STYLES4 : éclairage « nuit volcanique » (l'ancien style O, applicable à tous les styles) : la scène s'assombrit
     * et la lueur de la créature devient une vraie source de lumière (lumière ponctuelle, halo, reflet au sol), de la
     * couleur de sa lueur, posée au centre de ses parties lumineuses.
     */
    function volcanRig(sub: SubjectId): THREE.Group {
      const subject = SUBJECTS[sub];
      const lit = subject.voxelsAt(14).filter((v) => v.color === 'accent');
      const g = new THREE.Group();
      g.visible = false;
      if (!lit.length) return g;
      const avg = (k: 'x' | 'y' | 'z') => (lit.reduce((a, v) => a + v[k], 0) / lit.length / 14) * subject.scale;
      const color = subject.palette.accent;
      const light = new THREE.PointLight(color, 9, 7 * subject.frame, 1.4);
      light.position.set(avg('x'), avg('y'), avg('z'));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: getHaloTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.position.set(avg('x'), avg('y') * 0.6, avg('z'));
      halo.scale.setScalar(2.6 * subject.frame);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.6 * subject.frame, 32),
        new THREE.MeshBasicMaterial({ map: getHaloTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.03;
      g.add(light, halo, floor);
      return g;
    }
    const camera = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 300);

    // STYLES4 : banc de mesure (`&banc=D`) : six créatures dans la vue du combat, pendant 12 s, plein cadre
    if (BANC) {
      const id = BANC as AnyStyleId;
      const subs = [...VOX_IDS, VOX_IDS[0], VOX_IDS[1]];
      const ms = subs.map((sub, i) => {
        const m = buildAnyStyle(id, sub);
        m.root.position.set(((i % 3) - 1) * 4.6, 0, (Math.floor(i / 3) - 0.5) * 5.0);
        m.root.rotation.y = 0.6;
        scene.add(m.root);
        return m;
      });
      const w0 = el.clientWidth || 1280;
      const h0 = Math.round(w0 * 0.5625);
      renderer.setSize(w0, h0, false);
      renderer.domElement.style.height = `${h0}px`;
      renderer.setPixelRatio(1);
      renderer.setScissorTest(false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.94;
      key.position.set(16, 26, 14);
      rim.position.set(-14, 12, -16);
      scene.environmentIntensity = 0.42;
      scene.fog = new THREE.Fog(BIOMES.meadow.fogHex, 34, 110);
      scene.background = new THREE.Color(BIOMES.meadow.skyHex);
      camera.aspect = w0 / h0;
      camera.position.copy(GAME_CAM.pos);
      camera.lookAt(GAME_CAM.target);
      camera.updateProjectionMatrix();
      const times: number[] = [];
      const t0 = performance.now();
      let last = t0;
      let rafB = 0;
      const tick = () => {
        rafB = requestAnimationFrame(tick);
        const now = performance.now();
        const t = (now - t0) / 1000;
        for (const m of ms) m.animate?.(t);
        renderer.info.reset();
        renderer.clear();
        for (const m of ms) m.before?.(ctx);
        renderer.render(scene, camera);
        for (const m of ms) m.after?.(ctx);
        if (t > 2) times.push(now - last);
        last = now;
        if (t > 14 && !(window as unknown as { __banc?: unknown }).__banc) {
          const sorted = [...times].sort((a, b) => a - b);
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          const result = { style: id, fps: Math.round(1000 / avg), fps5: Math.round(1000 / p95), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frames: times.length };
          (window as unknown as { __banc?: unknown }).__banc = result;
          setBanc(JSON.stringify(result));
        }
      };
      tick();
      return () => {
        cancelAnimationFrame(rafB);
        renderer.dispose();
        renderer.domElement.remove();
      };
    }
    const fog = new THREE.Fog(BIOMES.meadow.fogHex, 34, 110);
    const black = new THREE.MeshBasicMaterial({ color: '#000000' });

    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    postScene.add(quad);
    const postMats = new Map<string, THREE.ShaderMaterial>();
    const targets = new Map<string, THREE.WebGLRenderTarget>();

    let frame = 0;
    let cursor = 0;
    let raf = 0;
    let lastKey = '';
    const latest: Record<string, Measure> = {};
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = live.current;
      const t = (performance.now() - start) / 1000;
      const w = el.clientWidth;
      const h = s.focus ? Math.max(200, window.innerHeight - 70) : 0;
      const { list, cols, cellW, cellH } = layoutFor(s, w, h);
      const rows = Math.ceil(list.length / cols);
      const ratio = Math.min(Math.min(window.devicePixelRatio || 1, 2) * (s.aa ? 2 : 1), 4);
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== rows * cellH) {
        renderer.setSize(w, rows * cellH, false);
        renderer.domElement.style.height = `${rows * cellH}px`;
      }

      renderer.toneMapping = s.tone === 'aucun' ? THREE.NoToneMapping : s.tone === 'neutre' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = s.tone === 'actuel' ? 0.94 : 1;
      renderer.domElement.style.filter = s.sat ? 'saturate(1.2)' : 'none';

      const inGame = s.view === 'jeu' && !s.silhouette;
      if (inGame) {
        hemi.color.set('#B4DFFF');
        hemi.groundColor.set('#7D6044');
        hemi.intensity = s.night ? 0.15 : 0.52;
        key.intensity = s.night ? 0.2 : 1.28;
        key.color.set(s.night ? '#8FA8FF' : '#FFEED1');
        key.position.set(16, 26, 14);
        rim.color.set('#93C5FD');
        rim.intensity = s.night ? 0.12 : 0.32;
        rim.position.set(-14, 12, -16);
        scene.environmentIntensity = s.night ? 0.05 : 0.42;
      } else {
        hemi.color.set('#DDEBFF');
        hemi.groundColor.set('#5B4A3A');
        hemi.intensity = s.night ? 0.2 : 0.55;
        key.intensity = s.night ? 0.35 : 1.5;
        key.color.set(s.night ? '#8FA8FF' : '#FFF1DA');
        key.position.set(4, 6, 6).multiplyScalar(2);
        rim.color.set('#9CC8FF');
        rim.intensity = s.night ? 0.3 : 0.7;
        rim.position.set(-5, 4, -6).multiplyScalar(2);
        scene.environmentIntensity = s.night ? 0.08 : 0.5;
      }
      // nuit volcanique : la scène s'assombrit (comme l'ancien style O) ; la lueur des créatures éclaire
      if (s.volcan && !s.silhouette) {
        hemi.intensity *= 0.3;
        key.intensity *= 0.25;
        rim.intensity *= 0.4;
        scene.environmentIntensity *= 0.3;
      }
      const night = s.night || s.volcan ? 1 : 0;
      setDecorNight(night);
      env.group.visible = inGame;
      scene.fog = inGame ? fog : null;
      fog.color.set(s.night ? '#121936' : BIOMES.meadow.fogHex);
      scene.background = new THREE.Color(s.silhouette ? '#FFFFFF' : s.volcan ? (inGame ? '#120A0A' : '#180E0C') : inGame ? (s.night ? '#0A0F24' : BIOMES.meadow.skyHex) : s.night ? '#14172A' : '#3A3F4B');
      scene.overrideMaterial = s.silhouette ? black : null;
      env.animate?.(t);
      // Vitrine : cadrage de la plus grande créature affichée, pour que les tailles restent comparables
      const frameScale = Math.max(...list.map((c) => SUBJECTS[c.s].frame));
      // la visée remonte moins vite que la taille : une grande créature reste entière dans la case
      const showcase = { pos: SHOWCASE_POS.clone().multiplyScalar(frameScale), target: new THREE.Vector3(0, SHOWCASE_TARGET.y * frameScale - (frameScale - 1) * 1.4, 0), fov: 30 };
      const cam = inGame ? (s.closeCam ? CLOSE_CAM : GAME_CAM) : showcase;
      camera.fov = cam.fov;
      camera.aspect = cellW / cellH;
      camera.position.copy(cam.pos);
      camera.lookAt(cam.target);
      camera.updateProjectionMatrix();

      // tout redessiner quand la disposition ou un réglage change ; sinon 5 cases par image, à tour de rôle
      const layoutKey = JSON.stringify([s, w, h, ratio]);
      const all = layoutKey !== lastKey || list.length <= 4;
      lastKey = layoutKey;
      const perFrame = all ? list.length : 5;
      const spin =
        s.angle === 'face' ? 0 : s.angle === 'profil' ? Math.PI / 2 : s.focus ? yaw.current + (drag.current ? 0 : t * 0.25) : t * 0.45;
      for (let k = 0; k < perFrame; k++) {
        const i = all ? k : (cursor + k) % list.length;
        const c = list[i];
        const model = modelFor(c);
        // planche, vue Vitrine : chaque ligne est cadrée sur sa créature (elles n'ont pas la même taille)
        if (s.planche && !inGame) {
          // frame ≈ hauteur de la créature / 2,6 : on vise le milieu de la créature, de un peu au-dessus
          const f = SUBJECTS[c.s].frame;
          camera.position.set(0, 1.1 + 1.6 * f, 9.6 * f);
          camera.lookAt(0, 1.2 * f, 0);
          camera.updateProjectionMatrix();
        }
        models.forEach((m) => (m.root.visible = false));
        model.root.visible = true;
        (model.root.userData.volcan as THREE.Group).visible = s.volcan && !s.silhouette;
        model.root.rotation.y = spin + (s.focus && s.angle !== 'tourne' ? yaw.current : 0);
        // ombres au sol cachées pour les silhouettes
        model.root.children.forEach((ch) => {
          if ((ch as THREE.Mesh).geometry instanceof THREE.CircleGeometry) ch.visible = !s.silhouette;
        });
        // repos de Calcinarque : respiration lente et lave qui pulse doucement (toutes les variantes)
        let glow = night;
        if (c.s === 'calcinarque') {
          const content = model.root.children[0];
          const base = content.userData.baseScale as THREE.Vector3;
          content.scale.set(base.x, base.y * (1 + 0.014 * Math.sin(t * 1.3)), base.z * (1 + 0.006 * Math.sin(t * 1.3)));
          glow = night + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.8));
        }
        setCreatureNight(glow);
        model.setNight(glow);
        model.animate?.(t);
        const x = (i % cols) * cellW;
        const y = (rows - 1 - Math.floor(i / cols)) * cellH; // WebGL : origine en bas
        renderer.info.reset();
        if (!s.silhouette) model.before?.(ctx);
        const post = s.silhouette ? undefined : model.post;
        if (post) {
          const scale = post.scale ?? 1;
          const tw = Math.max(8, Math.round(cellW * ratio * scale));
          const th = Math.max(8, Math.round(cellH * ratio * scale));
          const kk = cellKey(c);
          let rt = targets.get(kk);
          if (!rt || rt.width !== tw || rt.height !== th) {
            rt?.dispose();
            const filter = post.nearest ? THREE.NearestFilter : THREE.LinearFilter;
            rt = new THREE.WebGLRenderTarget(tw, th, { type: THREE.HalfFloatType, minFilter: filter, magFilter: filter, samples: post.nearest ? 0 : 4 });
            targets.set(kk, rt);
          }
          renderer.setRenderTarget(rt);
          renderer.clear();
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          let pm = postMats.get(c.id);
          if (!pm) {
            pm = postMaterial(post);
            postMats.set(c.id, pm);
          }
          pm.uniforms.tDiffuse.value = rt.texture;
          (pm.uniforms.uResolution.value as THREE.Vector2).set(tw, th);
          quad.material = pm;
          renderer.setViewport(x, y, cellW, cellH);
          renderer.setScissor(x, y, cellW, cellH);
          renderer.render(postScene, postCam);
        } else {
          renderer.setViewport(x, y, cellW, cellH);
          renderer.setScissor(x, y, cellW, cellH);
          renderer.clear();
          renderer.render(scene, camera);
        }
        if (!s.silhouette) model.after?.(ctx);
        latest[cellKey(c)] = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      }
      cursor = (cursor + perFrame) % Math.max(1, list.length);
      frame += 1;
      if (frame % 30 === 1) {
        setMeasures({ ...latest });
        (window as unknown as { __mesures?: unknown }).__mesures = { ...latest };
      }
    };
    loop();
    // largeur suivie par un observateur : la grille se recompose quand la fenêtre change ou que la page est zoomée
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      setCreatureNight(0);
      setDecorNight(0);
      targets.forEach((rt) => rt.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [ready]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const btn = (on: boolean) => `voxel-btn min-h-[44px] rounded-lg border-2 px-3 text-sm font-semibold ${on ? 'block-btn-primary' : 'block-btn-secondary'}`;
  const toggleFav = (c: Cell) =>
    setFavorites((f) => {
      const cur = f[c.s] ?? [];
      return { ...f, [c.s]: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id] };
    });
  const move = (sub: SubjectId, i: number, d: -1 | 1) =>
    setFavorites((f) => {
      const j = i + d;
      if (j < 0 || j >= f[sub].length) return f;
      const n = [...f[sub]];
      [n[i], n[j]] = [n[j], n[i]];
      return { ...f, [sub]: n };
    });
  const choiceText = () => {
    const opts: string[] = [];
    if (settings.tone !== 'actuel') opts.push(`tons ${settings.tone}`);
    if (settings.closeCam) opts.push('caméra proche');
    if (settings.sat) opts.push('saturation +20 %');
    if (settings.aa) opts.push('anticrénelage renforcé');
    if (settings.night) opts.push('nuit');
    if (settings.volcan) opts.push('nuit volcanique');
    opts.push(settings.view === 'jeu' ? 'vue en jeu' : 'vue vitrine');
    const favs = SUBJECT_IDS.map((sub) => `${labelOf(sub)} : ${favorites[sub].length ? favorites[sub].join(', ') : 'aucun'}`).join(' ; ');
    return `Favoris — ${favs} — ${opts.join(', ')}`;
  };
  const copyChoice = async () => {
    const text = choiceText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // repli : sélection d'un champ caché (navigateurs sans presse-papiers asynchrone)
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(text);
  };
  const cmp = settings.compare ?? [
    { s: settings.creature, id: 'A' },
    { s: settings.creature, id: 'C' },
  ];
  const setSide = (side: 0 | 1, cell: Cell) => set('compare', side === 0 ? [cell, cmp[1]] : [cmp[0], cell]);

  const w = width || (typeof window !== 'undefined' ? window.innerWidth - 32 : 1000);
  const layout = layoutFor(settings, w, Math.max(200, (typeof window !== 'undefined' ? window.innerHeight : 800) - 70));
  const rows = Math.ceil(layout.list.length / layout.cols);
  const compact = !settings.compare && !settings.focus;
  const creatureLabel = labelOf(settings.creature);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0F1420] px-4 py-6 text-[#FAF7F0] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#F4B942]">Outil de développement · exploration</p>
        <h1 className="font-display text-3xl font-bold">{settings.planche ? 'Planche : 4 créatures × 6 styles' : `${creatureLabel} : ${settings.all ? 'les vingt styles' : 'présélection'}`}</h1>
        {!ready && <p className="mt-2 text-sm text-[#F4B942]">{loadError ? `Chargement impossible : ${loadError}` : 'Chargement des modèles .vox…'}</p>}
        {BANC && <p className="mt-2 font-mono text-sm text-[#86EFAC]">{banc ? `Mesure : ${banc}` : `Mesure du style ${BANC} avec six créatures (14 s)…`}</p>}
        <p className="mt-1 text-sm text-[#CBD5E1]">
          Même créature, même posture, mêmes proportions : seul le style change. Les réglages n'agissent que sur cette page.{' '}
          <a className="underline" href="?gallery=art">
            Retour aux créatures refaites
          </a>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#CBD5E1]">Créature</span>
          {SUBJECT_IDS.map((sub) => (
            <button key={sub} type="button" className={btn(settings.creature === sub)} onClick={() => setSettings((st) => ({ ...st, creature: sub, focus: st.focus ? { s: sub, id: st.focus.id } : null }))}>
              {labelOf(sub)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn(settings.view === 'vitrine')} onClick={() => set('view', 'vitrine')}>
            Vitrine
          </button>
          <button type="button" className={btn(settings.view === 'jeu')} onClick={() => set('view', 'jeu')}>
            En jeu
          </button>
          <span className="mx-1 self-center text-[#64748B]">|</span>
          {(['actuel', 'aucun', 'neutre'] as const).map((t) => (
            <button key={t} type="button" className={btn(settings.tone === t)} onClick={() => set('tone', t)}>
              Tons : {t}
            </button>
          ))}
          <button type="button" className={btn(settings.sat)} onClick={() => set('sat', !settings.sat)}>
            Saturation {settings.sat ? '+20 %' : 'normale'}
          </button>
          <button type="button" className={btn(settings.aa)} onClick={() => set('aa', !settings.aa)}>
            Anticrénelage {settings.aa ? 'renforcé' : 'actuel'}
          </button>
          <button type="button" className={btn(settings.closeCam)} onClick={() => set('closeCam', !settings.closeCam)} disabled={settings.view !== 'jeu'}>
            Caméra {settings.closeCam ? 'proche et basse' : 'actuelle'}
          </button>
          <button type="button" className={btn(settings.night)} onClick={() => set('night', !settings.night)}>
            {settings.night ? 'Nuit' : 'Jour'}
          </button>
          <button type="button" className={btn(settings.volcan)} onClick={() => set('volcan', !settings.volcan)}>
            {settings.volcan ? 'Nuit volcanique' : 'Éclairage : jour'}
          </button>
          <span className="mx-1 self-center text-[#64748B]">|</span>
          <button type="button" className={btn(settings.angle === 'face')} onClick={() => set('angle', settings.angle === 'face' ? 'tourne' : 'face')}>
            {settings.angle === 'face' ? 'Reprendre la rotation' : 'Vue de face'}
          </button>
          <button type="button" className={btn(settings.angle === 'profil')} onClick={() => set('angle', settings.angle === 'profil' ? 'tourne' : 'profil')}>
            {settings.angle === 'profil' ? 'Reprendre la rotation' : 'Profil'}
          </button>
          <button type="button" className={btn(settings.silhouette)} onClick={() => set('silhouette', !settings.silhouette)}>
            Silhouettes
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btn(!settings.all)} onClick={() => set('all', false)}>
            Présélection (A D E F H I)
          </button>
          <button type="button" className={btn(settings.all)} onClick={() => set('all', true)}>
            Tous
          </button>
          <button type="button" className={btn(settings.planche)} onClick={() => setSettings((st) => ({ ...st, planche: !st.planche, compare: null, focus: null }))}>
            Planche 4 × 6
          </button>
          <button type="button" className={btn(Boolean(settings.compare))} onClick={() => set('compare', settings.compare ? null : cmp)}>
            {settings.compare ? 'Retour à la grille' : 'Comparer deux styles'}
          </button>
          <button type="button" className={btn(showRanking)} onClick={() => setShowRanking((v) => !v)}>
            ★ Mon classement ({SUBJECT_IDS.reduce((n, sub) => n + (favorites[sub]?.length ?? 0), 0)})
          </button>
          <button type="button" className={btn(false)} onClick={() => void copyChoice()}>
            Copier mon choix
          </button>
          {copied && <span className="text-xs text-[#86EFAC]">Copié : « {copied} »</span>}
        </div>

        {settings.compare && (
          <div className="mt-3 rounded-lg border-2 border-[#39445A] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#CBD5E1]">Choisir pour</span>
              {([0, 1] as const).map((side) => (
                <button key={side} type="button" className={btn(pickSide === side)} onClick={() => setPickSide(side)}>
                  {side === 0 ? 'Gauche' : 'Droite'} : {labelOf(cmp[side].s)} {cmp[side].id}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {SUBJECT_IDS.map((sub) => (
                <button key={sub} type="button" className={btn(cmp[pickSide].s === sub)} onClick={() => setSide(pickSide, { s: sub, id: cmp[pickSide].id })}>
                  {labelOf(sub)}
                </button>
              ))}
              <span className="mx-1 self-center text-[#64748B]">|</span>
              {IDS.map((id) => (
                <button key={id} type="button" className={`${btn(cmp[pickSide].id === id)} min-w-[44px] px-2`} onClick={() => setSide(pickSide, { s: cmp[pickSide].s, id })}>
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {showRanking && (
          <div className="mt-3 grid gap-3 rounded-lg border-2 border-[#F4B942]/60 p-3 md:grid-cols-2">
            {SUBJECT_IDS.map((sub) => (
              <div key={sub}>
                <p className="text-sm font-bold">Mon classement : {labelOf(sub)}</p>
                {favorites[sub].length === 0 && <p className="mt-1 text-sm text-[#CBD5E1]">Aucune étoile : touche ☆ sur une case pour l'ajouter.</p>}
                <ol className="mt-2 space-y-1">
                  {favorites[sub].map((id, i) => (
                    <li key={id} className="flex items-center gap-2">
                      <span className="w-8 text-right font-mono text-sm text-[#F4B942]">{i + 1}.</span>
                      <span className="flex-1 text-sm">
                        {id} · {styleInfo(id).name}
                      </span>
                      <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => move(sub, i, -1)} aria-label="Monter">
                        ↑
                      </button>
                      <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => move(sub, i, 1)} aria-label="Descendre">
                        ↓
                      </button>
                      <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => toggleFav({ s: sub, id })} aria-label="Retirer">
                        ✕
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <p className="font-mono text-xs text-[#CBD5E1] md:col-span-2">{choiceText()}</p>
          </div>
        )}

        <div className={settings.focus ? 'fixed inset-0 z-50 overflow-auto bg-[#0F1420] p-2' : 'relative mt-4'}>
          {settings.focus && (
            <div className="mb-2 flex items-center gap-2">
              <button type="button" className={btn(false)} onClick={() => set('focus', null)}>
                ✕ Fermer
              </button>
              <span className="text-sm">
                {labelOf(settings.focus.s)} · {settings.focus.id} · {styleInfo(settings.focus.id).name} — glisser pour faire pivoter
              </span>
            </div>
          )}
          <div className="relative w-full overflow-hidden rounded-xl border-2 border-[#39445A]">
            <div
              ref={host}
              className="w-full"
              onPointerDown={(e) => {
                if (!settings.focus) return;
                drag.current = { x: e.clientX, yaw: yaw.current };
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current) yaw.current = drag.current.yaw + (e.clientX - drag.current.x) * 0.012;
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            />
            <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
              {layout.list.map((c, i) => {
                const info = styleInfo(c.id);
                const m = measures[cellKey(c)];
                const fav = (favorites[c.s] ?? []).includes(c.id);
                const mixed = Boolean(settings.compare) || Boolean(settings.focus) || settings.planche;
                return (
                  <div key={`${cellKey(c)}-${i}`} className="relative min-w-0 border border-[#0F1420]/60 p-1.5">
                    <p className={`inline-block max-w-full truncate rounded bg-[#0F1420]/80 px-2 py-0.5 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
                      {mixed ? `${labelOf(c.s)} · ` : ''}
                      {info.id} · {info.name}
                    </p>
                    {!compact && <p className="mt-1 max-w-[20rem] rounded bg-[#0F1420]/70 px-2 py-0.5 text-xs text-[#CBD5E1]">{info.note}</p>}
                    <p className="mt-0.5 hidden max-w-full truncate rounded bg-[#0F1420]/70 px-1.5 py-0.5 font-mono text-[10px] text-[#CBD5E1] sm:block sm:w-fit">
                      {info.risk}
                      {m ? ` · ${m.calls} appels · ${m.triangles.toLocaleString('fr-FR')} tri.` : ''}
                    </p>
                    {!settings.focus && !settings.planche && (
                      <div className="pointer-events-auto absolute bottom-1 right-1 flex gap-1">
                        <button type="button" className={`${btn(fav)} min-w-[44px] px-2`} onClick={() => toggleFav(c)} aria-pressed={fav} aria-label={`Favori ${c.id}`}>
                          {fav ? '★' : '☆'}
                        </button>
                        <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => set('focus', c)} aria-label={`Plein écran ${c.id}`}>
                          ⤢
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {compact && (
          <p className="mt-2 text-xs text-[#94A3B8]">
            Descriptions complètes : « Comparer deux styles » ou ⤢ (plein écran). Avec vingt cases, chaque case est redessinée une image sur quatre.
          </p>
        )}
        <p className="mt-2 text-xs text-[#94A3B8]">
          Vue « En jeu » : angle et champ de la caméra de combat, chaque créature à sa vraie taille. Lumière du combat en « En jeu », des portraits en
          « Vitrine » (cadrée sur la plus grande créature affichée). Rendu sans le pipeline d'effets du jeu (contour, occlusion, ciel en dégradé) : à
          comparer entre variantes, pas avec le jeu.
        </p>
      </div>
    </div>
  );
}
