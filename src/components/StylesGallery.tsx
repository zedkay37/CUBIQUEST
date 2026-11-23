import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BIOMES } from '../game/catalog';
import { buildBiomeEnvironment } from '../game/models/biomes';
import { setDecorNight } from '../game/models/meadowDecor';
import { setCreatureNight, setCreatureRim } from '../game/models/voxelSculpt';
import { STYLE_LIST, buildStyle, type StyleId, type StyledModel } from './styles/magmaStyles';

/**
 * `?gallery=styles` (sprint STYLES, outil de développement) : Magmadrake en six styles, côte à côte.
 * Un seul rendu WebGL découpé en cases ; à chaque case, seule sa variante est visible. Les interrupteurs n'agissent
 * que sur cette page : le jeu garde ses réglages. Textes en place : outil de développement.
 *
 * Paramètres pour les captures : `&view=jeu`, `&tone=aucun|neutre`, `&sat=1`, `&aa=2`, `&cam=proche`, `&nuit=1`,
 * `&compare=<lettre>`.
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
  compare: StyleId | null;
}

const params = new URLSearchParams(window.location.search);
const INITIAL: Settings = {
  view: params.get('view') === 'jeu' ? 'jeu' : 'vitrine',
  tone: params.get('tone') === 'aucun' ? 'aucun' : params.get('tone') === 'neutre' ? 'neutre' : 'actuel',
  sat: params.get('sat') === '1',
  aa: params.get('aa') === '2',
  closeCam: params.get('cam') === 'proche',
  night: params.get('nuit') === '1',
  compare: (STYLE_LIST.find((s) => s.id === params.get('compare'))?.id ?? null) as StyleId | null,
};

/** Caméra de combat du jeu (engine/camera.ts) : 42°, en haut et en arrière, visée un peu au-dessus du sol. */
const GAME_CAM = { pos: new THREE.Vector3(0, 15.8, 16.5), target: new THREE.Vector3(0, 0.7, 0), fov: 42 };
const CLOSE_CAM = { pos: new THREE.Vector3(0, 7.5, 10), target: new THREE.Vector3(0, 1.0, 0), fov: 42 };
// visée au-dessus de la créature : elle se pose dans le bas de la case, sous les étiquettes
const SHOWCASE_CAM = { pos: new THREE.Vector3(0, 2.9, 9.4), target: new THREE.Vector3(0, 2.15, 0), fov: 30 };

interface Measure {
  calls: number;
  triangles: number;
}

export function StylesGallery() {
  const [settings, setSettings] = useState<Settings>(INITIAL);
  const [measures, setMeasures] = useState<Record<string, Measure>>({});
  const host = useRef<HTMLDivElement | null>(null);
  const live = useRef(settings);
  live.current = settings;

  const cells: StyleId[] = settings.compare ? ['A', settings.compare] : STYLE_LIST.map((s) => s.id);
  const columns = settings.compare ? 2 : typeof window !== 'undefined' && window.innerWidth < 700 ? 2 : 3;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setScissorTest(true);
    renderer.info.autoReset = false;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';

    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight('#B4DFFF', '#7D6044', 0.52);
    const key = new THREE.DirectionalLight('#FFEED1', 1.28);
    key.position.set(16, 26, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
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
    rim.position.set(-14, 12, -16);
    scene.add(hemi, key, rim);
    // morceau de Prairie (ART 3), le même décor que le combat
    setCreatureRim(true);
    const env = buildBiomeEnvironment(BIOMES.meadow, false);
    scene.add(env.group);
    const models = new Map<StyleId, StyledModel>();
    for (const s of STYLE_LIST) {
      const m = buildStyle(s.id);
      models.set(s.id, m);
      scene.add(m.root);
    }
    const camera = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 200);
    const fog = new THREE.Fog(BIOMES.meadow.fogHex, 34, 88);

    let frame = 0;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = live.current;
      const t = (performance.now() - start) / 1000;
      const list: StyleId[] = s.compare ? ['A', s.compare] : STYLE_LIST.map((x) => x.id);
      const cols = s.compare ? 2 : el.clientWidth < 700 ? 2 : 3;
      const rows = Math.ceil(list.length / cols);
      const width = el.clientWidth;
      const cellW = Math.floor(width / cols);
      const cellH = Math.floor(cellW * 0.75);
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * (s.aa ? 2 : 1);
      if (renderer.getPixelRatio() !== Math.min(ratio, 4)) renderer.setPixelRatio(Math.min(ratio, 4));
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== rows * cellH) renderer.setSize(width, rows * cellH, true);

      // rendu : mappage des tons du jeu (ACES, exposition 0,94), aucun, ou neutre
      renderer.toneMapping = s.tone === 'aucun' ? THREE.NoToneMapping : s.tone === 'neutre' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = s.tone === 'actuel' ? 0.94 : 1;
      renderer.domElement.style.filter = s.sat ? 'saturate(1.2)' : 'none';

      // jour / nuit (mêmes valeurs que le cycle du camp)
      const night = s.night ? 1 : 0;
      const inGame = s.view === 'jeu';
      if (inGame) {
        // lumière du combat (VoxelEngine), ou celle de la nuit du camp
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
        // lumière des portraits du jeu (CreatureTurntable) : clé chaude, contre-jour bleu, fond neutre
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

      const measured: Record<string, Measure> = {};
      list.forEach((id, i) => {
        models.forEach((m, mid) => {
          m.root.visible = mid === id;
          m.root.rotation.y = t * 0.45;
        });
        const x = (i % cols) * cellW;
        const y = (rows - 1 - Math.floor(i / cols)) * cellH; // WebGL : origine en bas
        renderer.setViewport(x, y, cellW, cellH);
        renderer.setScissor(x, y, cellW, cellH);
        renderer.info.reset();
        renderer.render(scene, camera);
        measured[id] = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      });
      frame += 1;
      if (frame % 30 === 1) setMeasures(measured);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      setCreatureNight(0);
      setDecorNight(0);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const btn = (on: boolean) => `voxel-btn min-h-[44px] rounded-lg border-2 px-3 text-sm font-semibold ${on ? 'block-btn-primary' : 'block-btn-secondary'}`;
  const rows = Math.ceil(cells.length / columns);

  return (
    <div className="min-h-screen bg-[#0F1420] px-4 py-6 text-[#FAF7F0] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#F4B942]">Outil de développement · exploration</p>
        <h1 className="font-display text-3xl font-bold">Magmadrake en six styles</h1>
        <p className="mt-1 text-sm text-[#CBD5E1]">
          Même créature, même posture, mêmes proportions : seul le style change. Les réglages ci-dessous n'agissent que sur cette page.{' '}
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
          <span className="text-sm text-[#CBD5E1]">Comparer A et</span>
          {STYLE_LIST.filter((s) => s.id !== 'A').map((s) => (
            <button key={s.id} type="button" className={btn(settings.compare === s.id)} onClick={() => set('compare', settings.compare === s.id ? null : s.id)}>
              {s.id}
            </button>
          ))}
          {settings.compare && (
            <button type="button" className={btn(false)} onClick={() => set('compare', null)}>
              Les six
            </button>
          )}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-xl border-2 border-[#39445A]">
          <div ref={host} />
          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
            {cells.map((id) => {
              const info = STYLE_LIST.find((s) => s.id === id)!;
              const m = measures[id];
              return (
                <div key={id} className="border border-[#0F1420]/60 p-2">
                  <p className="inline-block rounded bg-[#0F1420]/80 px-2 py-1 text-xs font-bold sm:text-sm">
                    {info.id} · {info.name}
                  </p>
                  <p className="mt-1 hidden max-w-[16rem] rounded bg-[#0F1420]/70 px-2 py-0.5 text-xs text-[#CBD5E1] sm:block">{info.note}</p>
                  {m && (
                    <p className="mt-1 hidden rounded bg-[#0F1420]/70 px-2 py-0.5 font-mono text-[11px] text-[#CBD5E1] sm:inline-block">
                      {m.calls} appels · {m.triangles.toLocaleString('fr-FR')} triangles
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-[#94A3B8]">
          Vue « En jeu » : angle et champ de la caméra de combat ; la créature occupe la même part de la hauteur de la case que de l'écran en jeu.
          Lumière du combat en vue « En jeu », lumière des portraits en « Vitrine ». Rendu sans le pipeline d'effets du jeu (contour, occlusion, ciel en dégradé) : à comparer entre variantes, pas avec le jeu.
        </p>
      </div>
    </div>
  );
}
