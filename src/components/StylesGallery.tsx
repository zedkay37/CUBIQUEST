import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BIOMES } from '../game/catalog';
import { buildBiomeEnvironment } from '../game/models/biomes';
import { setDecorNight } from '../game/models/meadowDecor';
import { setCreatureNight, setCreatureRim } from '../game/models/voxelSculpt';
import { withSaveSlot } from '../game/saveSlot';
import { ALL_STYLES, buildAnyStyle, type AnyStyleId } from './styles/allStyles';
import type { LightContext, PostPass, StyledModel } from './styles/magmaStyles';

/**
 * `?gallery=styles` (sprints STYLES et STYLES2, outil de développement) : Magmadrake en vingt styles.
 * Un seul rendu WebGL découpé en cases ; à chaque case, seule sa variante est visible. Avec 20 cases, on en
 * redessine 5 par image, à tour de rôle (le reste de l'image est gardé) : la page reste fluide.
 * Les interrupteurs n'agissent que sur cette page : le jeu garde ses réglages. Textes en place : outil.
 *
 * Paramètres pour les captures : `&view=jeu`, `&tone=aucun|neutre`, `&sat=1`, `&aa=2`, `&cam=proche`, `&nuit=1`,
 * `&compare=C,G` (ou une lettre : A et cette lettre), `&focus=O` (plein écran).
 */
type View = 'vitrine' | 'jeu';
type Tone = 'actuel' | 'aucun' | 'neutre';
interface Settings {
  view: View;
  tone: Tone;
  sat: boolean;
  aa: boolean;
  closeCam: boolean;
  night: boolean;
  compare: [AnyStyleId, AnyStyleId] | null;
  focus: AnyStyleId | null;
}

const IDS = ALL_STYLES.map((s) => s.id);
const isId = (x: unknown): x is AnyStyleId => typeof x === 'string' && IDS.includes(x as AnyStyleId);
const params = new URLSearchParams(window.location.search);
const compareParam = (params.get('compare') ?? '').split(',').filter(isId);
const INITIAL: Settings = {
  view: params.get('view') === 'jeu' ? 'jeu' : 'vitrine',
  tone: params.get('tone') === 'aucun' ? 'aucun' : params.get('tone') === 'neutre' ? 'neutre' : 'actuel',
  sat: params.get('sat') === '1',
  aa: params.get('aa') === '2',
  closeCam: params.get('cam') === 'proche',
  night: params.get('nuit') === '1',
  compare: compareParam.length >= 2 ? [compareParam[0], compareParam[1]] : compareParam.length === 1 ? ['A', compareParam[0]] : null,
  focus: isId(params.get('focus')) ? (params.get('focus') as AnyStyleId) : null,
};

/** Caméra de combat du jeu (engine/camera.ts) : 42°, en haut et en arrière, visée un peu au-dessus du sol. */
const GAME_CAM = { pos: new THREE.Vector3(0, 15.8, 16.5), target: new THREE.Vector3(0, 0.7, 0), fov: 42 };
const CLOSE_CAM = { pos: new THREE.Vector3(0, 7.5, 10), target: new THREE.Vector3(0, 1.0, 0), fov: 42 };
// visée au-dessus de la créature : elle se pose dans le bas de la case, sous les étiquettes
const SHOWCASE_CAM = { pos: new THREE.Vector3(0, 2.9, 9.4), target: new THREE.Vector3(0, 2.15, 0), fov: 30 };

const FAV_KEY = withSaveSlot('cubiquest-styles-favoris');
function loadFavorites(): AnyStyleId[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(isId) : [];
  } catch {
    return [];
  }
}
function saveFavorites(list: AnyStyleId[]): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch {
    // navigation privée : les favoris ne sont pas gardés
  }
}

interface Measure {
  calls: number;
  triangles: number;
}

/** Disposition des cases selon le mode (grille, comparaison, plein écran). */
function layoutFor(s: Settings, width: number, height: number): { list: AnyStyleId[]; cols: number; cellW: number; cellH: number } {
  if (s.focus) return { list: [s.focus], cols: 1, cellW: width, cellH: height };
  const list = s.compare ? [...s.compare] : IDS;
  const cols = s.compare ? 2 : width >= 1000 ? 5 : width >= 700 ? 4 : 2;
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

export function StylesGallery() {
  const [settings, setSettings] = useState<Settings>(INITIAL);
  const [measures, setMeasures] = useState<Record<string, Measure>>({});
  const [favorites, setFavorites] = useState<AnyStyleId[]>(loadFavorites);
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

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setScissorTest(true);
    renderer.autoClear = false;
    renderer.info.autoReset = false;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight('#B4DFFF', '#7D6044', 0.52);
    const key = new THREE.DirectionalLight('#FFEED1', 1.28);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.camera.far = 75;
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
    const models = new Map<AnyStyleId, StyledModel>();
    for (const s of ALL_STYLES) {
      const m = buildAnyStyle(s.id);
      m.root.visible = false;
      models.set(s.id, m);
      scene.add(m.root);
    }
    const camera = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 200);
    const fog = new THREE.Fog(BIOMES.meadow.fogHex, 34, 88);

    // passes d'image : une texture par variante, un quadrilatère plein écran
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    postScene.add(quad);
    const postMats = new Map<AnyStyleId, THREE.ShaderMaterial>();
    const targets = new Map<AnyStyleId, THREE.WebGLRenderTarget>();

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
      if (size.x !== w || size.y !== rows * cellH) renderer.setSize(w, rows * cellH, true);

      renderer.toneMapping = s.tone === 'aucun' ? THREE.NoToneMapping : s.tone === 'neutre' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = s.tone === 'actuel' ? 0.94 : 1;
      renderer.domElement.style.filter = s.sat ? 'saturate(1.2)' : 'none';

      const inGame = s.view === 'jeu';
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
        key.position.set(4, 6, 6);
        rim.color.set('#9CC8FF');
        rim.intensity = s.night ? 0.3 : 0.7;
        rim.position.set(-5, 4, -6);
        scene.environmentIntensity = s.night ? 0.08 : 0.5;
      }
      const night = s.night ? 1 : 0;
      setCreatureNight(night);
      setDecorNight(night);
      models.forEach((m) => m.setNight(night));
      env.group.visible = inGame;
      scene.fog = inGame ? fog : null;
      fog.color.set(s.night ? '#121936' : BIOMES.meadow.fogHex);
      scene.background = new THREE.Color(inGame ? (s.night ? '#0A0F24' : BIOMES.meadow.skyHex) : s.night ? '#14172A' : '#3A3F4B');
      env.animate?.(t);
      const cam = inGame ? (s.closeCam ? CLOSE_CAM : GAME_CAM) : SHOWCASE_CAM;
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
      const spin = s.focus ? yaw.current + (drag.current ? 0 : t * 0.25) : t * 0.45;
      for (let k = 0; k < perFrame; k++) {
        const i = all ? k : (cursor + k) % list.length;
        const id = list[i];
        const model = models.get(id)!;
        models.forEach((m) => (m.root.visible = false));
        model.root.visible = true;
        model.root.rotation.y = spin;
        const x = (i % cols) * cellW;
        const y = (rows - 1 - Math.floor(i / cols)) * cellH; // WebGL : origine en bas
        renderer.info.reset();
        model.before?.(ctx);
        if (model.post) {
          const scale = model.post.scale ?? 1;
          const tw = Math.max(8, Math.round(cellW * ratio * scale));
          const th = Math.max(8, Math.round(cellH * ratio * scale));
          let rt = targets.get(id);
          if (!rt || rt.width !== tw || rt.height !== th) {
            rt?.dispose();
            const filter = model.post.nearest ? THREE.NearestFilter : THREE.LinearFilter;
            rt = new THREE.WebGLRenderTarget(tw, th, { type: THREE.HalfFloatType, minFilter: filter, magFilter: filter, samples: model.post.nearest ? 0 : 4 });
            targets.set(id, rt);
          }
          renderer.setRenderTarget(rt);
          renderer.clear();
          renderer.render(scene, camera);
          renderer.setRenderTarget(null);
          let pm = postMats.get(id);
          if (!pm) {
            pm = postMaterial(model.post);
            postMats.set(id, pm);
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
        model.after?.(ctx);
        latest[id] = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      }
      cursor = (cursor + perFrame) % Math.max(1, list.length);
      frame += 1;
      if (frame % 30 === 1) setMeasures({ ...latest });
    };
    loop();
    const onResize = () => setWidth(el.clientWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      setCreatureNight(0);
      setDecorNight(0);
      targets.forEach((rt) => rt.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const btn = (on: boolean) => `voxel-btn min-h-[44px] rounded-lg border-2 px-3 text-sm font-semibold ${on ? 'block-btn-primary' : 'block-btn-secondary'}`;
  const toggleFav = (id: AnyStyleId) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const move = (i: number, d: -1 | 1) =>
    setFavorites((f) => {
      const j = i + d;
      if (j < 0 || j >= f.length) return f;
      const n = [...f];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const choiceText = () => {
    const opts: string[] = [];
    if (settings.tone !== 'actuel') opts.push(`tons ${settings.tone}`);
    if (settings.closeCam) opts.push('caméra proche');
    if (settings.sat) opts.push('saturation +20 %');
    if (settings.aa) opts.push('anticrénelage renforcé');
    if (settings.night) opts.push('nuit');
    opts.push(settings.view === 'jeu' ? 'vue en jeu' : 'vue vitrine');
    return `Favoris : ${favorites.length ? favorites.join(', ') : 'aucun'} — ${opts.join(', ')}`;
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
  const pick = (id: AnyStyleId) => {
    const cur = settings.compare ?? ['A', 'C'];
    set('compare', pickSide === 0 ? [id, cur[1]] : [cur[0], id]);
  };

  const w = width || (typeof window !== 'undefined' ? window.innerWidth - 32 : 1000);
  const layout = layoutFor(settings, w, Math.max(200, (typeof window !== 'undefined' ? window.innerHeight : 800) - 70));
  const rows = Math.ceil(layout.list.length / layout.cols);
  const compact = !settings.compare && !settings.focus;

  return (
    <div className="min-h-screen bg-[#0F1420] px-4 py-6 text-[#FAF7F0] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#F4B942]">Outil de développement · exploration</p>
        <h1 className="font-display text-3xl font-bold">Magmadrake en vingt styles</h1>
        <p className="mt-1 text-sm text-[#CBD5E1]">
          Même créature, même posture, mêmes proportions : seul le style change. Les réglages n'agissent que sur cette page.{' '}
          <a className="underline" href="?gallery=art">
            Retour aux créatures refaites
          </a>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
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
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btn(Boolean(settings.compare))} onClick={() => set('compare', settings.compare ? null : ['A', 'C'])}>
            {settings.compare ? 'Les vingt' : 'Comparer deux styles'}
          </button>
          <button type="button" className={btn(showRanking)} onClick={() => setShowRanking((v) => !v)}>
            ★ Mon classement ({favorites.length})
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
              <button type="button" className={btn(pickSide === 0)} onClick={() => setPickSide(0)}>
                Gauche : {settings.compare[0]}
              </button>
              <button type="button" className={btn(pickSide === 1)} onClick={() => setPickSide(1)}>
                Droite : {settings.compare[1]}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {IDS.map((id) => (
                <button key={id} type="button" className={`${btn(settings.compare![pickSide] === id)} min-w-[44px] px-2`} onClick={() => pick(id)}>
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}

        {showRanking && (
          <div className="mt-3 rounded-lg border-2 border-[#F4B942]/60 p-3">
            <p className="text-sm font-bold">Mon classement</p>
            {favorites.length === 0 && <p className="mt-1 text-sm text-[#CBD5E1]">Aucune étoile : touche ☆ sur une case pour l'ajouter.</p>}
            <ol className="mt-2 space-y-1">
              {favorites.map((id, i) => {
                const info = ALL_STYLES.find((s) => s.id === id)!;
                return (
                  <li key={id} className="flex items-center gap-2">
                    <span className="w-8 text-right font-mono text-sm text-[#F4B942]">{i + 1}.</span>
                    <span className="flex-1 text-sm">
                      {info.id} · {info.name}
                    </span>
                    <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => move(i, -1)} aria-label="Monter">
                      ↑
                    </button>
                    <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => move(i, 1)} aria-label="Descendre">
                      ↓
                    </button>
                    <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => toggleFav(id)} aria-label="Retirer">
                      ✕
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 font-mono text-xs text-[#CBD5E1]">{choiceText()}</p>
          </div>
        )}

        <div className={settings.focus ? 'fixed inset-0 z-50 overflow-auto bg-[#0F1420] p-2' : 'relative mt-4'}>
          {settings.focus && (
            <div className="mb-2 flex items-center gap-2">
              <button type="button" className={btn(false)} onClick={() => set('focus', null)}>
                ✕ Fermer
              </button>
              <span className="text-sm">
                {settings.focus} · {ALL_STYLES.find((s) => s.id === settings.focus)!.name} — glisser pour faire pivoter
              </span>
            </div>
          )}
          <div className="relative overflow-hidden rounded-xl border-2 border-[#39445A]">
            <div
              ref={host}
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
              {layout.list.map((id, i) => {
                const info = ALL_STYLES.find((s) => s.id === id)!;
                const m = measures[id];
                const fav = favorites.includes(id);
                return (
                  <div key={`${id}-${i}`} className="relative border border-[#0F1420]/60 p-1.5">
                    <p className={`inline-block rounded bg-[#0F1420]/80 px-2 py-0.5 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
                      {info.id} · {info.name}
                    </p>
                    {!compact && <p className="mt-1 max-w-[20rem] rounded bg-[#0F1420]/70 px-2 py-0.5 text-xs text-[#CBD5E1]">{info.note}</p>}
                    <p className="mt-0.5 hidden rounded bg-[#0F1420]/70 px-1.5 py-0.5 font-mono text-[10px] text-[#CBD5E1] sm:block sm:w-fit">
                      {info.risk}
                      {m ? ` · ${m.calls} appels · ${m.triangles.toLocaleString('fr-FR')} tri.` : ''}
                    </p>
                    {!settings.focus && (
                      <div className="pointer-events-auto absolute bottom-1 right-1 flex gap-1">
                        <button type="button" className={`${btn(fav)} min-w-[44px] px-2`} onClick={() => toggleFav(id)} aria-pressed={fav} aria-label={`Favori ${id}`}>
                          {fav ? '★' : '☆'}
                        </button>
                        <button type="button" className={`${btn(false)} min-w-[44px] px-2`} onClick={() => set('focus', id)} aria-label={`Plein écran ${id}`}>
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
          Vue « En jeu » : angle et champ de la caméra de combat. Lumière du combat en « En jeu », des portraits en « Vitrine ». Rendu sans le pipeline
          d'effets du jeu (contour, occlusion, ciel en dégradé) : à comparer entre variantes, pas avec le jeu.
        </p>
      </div>
    </div>
  );
}
