import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SPECIES } from '../game/catalog';
import { buildVoxelCreature } from '../game/models/creatures';
import { getVoxDef, parseVox, registerVoxModel } from '../game/models/voxFile';

/**
 * `?gallery=planche` (sprint BESTIAIRE, outil de développement) : planche d'une créature rendue par le VRAI jeu
 * (même constructeur, mêmes matières, même lumière que les portraits) : 3/4 avant, face, profil, 3/4 arrière,
 * taille réelle en combat (caméra de combat, image de 1280 × 720 recadrée, agrandie ×2 sans lissage) et silhouette.
 *
 *   &species=<id>                 la créature (son .vox de src/assets/vox/ s'il existe, sinon le modèle du code)
 *   &fichier=<nom>                essai : un .vox de tools/vox-studio/references/ à la place du modèle de <id>
 *   &lot=<id>,<id>,…              planche d'alignement : le lot côte à côte, à l'échelle du jeu, profil et silhouette
 *
 * Textes en place : outil de développement (liste de tools/texts.ts).
 */
const REFERENCES = import.meta.glob('../../tools/vox-studio/references/*.vox', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const params = new URLSearchParams(window.location.search);
const SPECIES_ID = SPECIES[params.get('species') ?? ''] ? params.get('species')! : 'magmadrake';
const FICHIER = params.get('fichier');
const LOT = (params.get('lot') ?? '')
  .split(',')
  .filter((id) => SPECIES[id]);

const BG = '#18161E';
/** Directions de vue (repère du jeu : la créature regarde vers +Z) : celles de voxlib, converties. */
const VIEWS: { name: string; dir: [number, number, number] }[] = [
  { name: '3/4 avant', dir: [1, 0.55, 0.75] },
  { name: 'face', dir: [0, 0.18, 1] },
  { name: 'profil', dir: [1, 0.12, 0] },
  { name: '3/4 arrière', dir: [-0.8, 0.6, -1] },
];

function makeRenderer(): THREE.WebGLRenderer {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.94;
  r.shadowMap.enabled = true;
  r.setPixelRatio(1);
  r.setScissorTest(true);
  r.autoClear = false;
  return r;
}

/** Lumière des portraits du jeu (CreatureTurntable) : clé chaude, contre-jour bleu, environnement de studio. */
function lightScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();
  const key = new THREE.DirectionalLight('#FFF1DA', 1.5);
  key.position.set(4, 6, 6);
  const rim = new THREE.DirectionalLight('#9CC8FF', 0.7);
  rim.position.set(-5, 4, -6);
  scene.add(key, rim, new THREE.HemisphereLight('#DDEBFF', '#5B4A3A', 0.55));
}

/** Caméra orthographique qui cadre la boîte `box` vue depuis `dir`. */
function orthoFor(box: THREE.Box3, dir: THREE.Vector3, aspect: number): THREE.OrthographicCamera {
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const cam = new THREE.OrthographicCamera(-radius * aspect, radius * aspect, radius, -radius, 0.01, radius * 8);
  cam.position.copy(center).addScaledVector(dir.clone().normalize(), radius * 3);
  cam.lookAt(center);
  // resserrer sur la projection réelle des 8 coins
  cam.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(inv);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
  const pad = 1.08;
  let hw = ((maxX - minX) / 2) * pad;
  let hh = ((maxY - minY) / 2) * pad;
  if (hw / hh > aspect) hh = hw / aspect;
  else hw = hh * aspect;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  cam.left = cx - hw;
  cam.right = cx + hw;
  cam.top = cy + hh;
  cam.bottom = cy - hh;
  cam.updateProjectionMatrix();
  return cam;
}

/** Hauteur de l'aire de jeu prise en compte, en blocs du fichier (1 unité = 14 blocs, comme le chargeur). */
function modelBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    // l'ombre au sol (disque) n'entre pas dans le cadrage
    if (m.isMesh && !(m.geometry instanceof THREE.CircleGeometry)) box.expandByObject(m);
  });
  return box;
}

export function PlancheGallery() {
  const host = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(!FICHIER);
  const [info, setInfo] = useState('');

  // essai d'un .vox de référence à la place du modèle de l'espèce (cette page seulement)
  useEffect(() => {
    if (!FICHIER) return;
    const entry = Object.entries(REFERENCES).find(([p]) => p.endsWith(`/${FICHIER}.vox`));
    if (!entry) {
      setInfo(`fichier introuvable : ${FICHIER}.vox`);
      setReady(true);
      return;
    }
    void fetch(entry[1])
      .then((r) => r.arrayBuffer())
      .then((b) => {
        registerVoxModel(SPECIES_ID, parseVox(b));
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = host.current;
    if (!el) return;
    const renderer = makeRenderer();
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    lightScene(renderer, scene);
    const black = new THREE.MeshBasicMaterial({ color: '#000000' });

    if (LOT.length) {
      // ---- planche d'alignement : chaque créature à l'échelle du jeu, de profil, en couleur puis en silhouette
      const rigs = LOT.map((id) => buildVoxelCreature(id));
      let x = 0;
      const boxes: THREE.Box3[] = [];
      for (const rig of rigs) {
        rig.root.rotation.y = Math.PI / 2; // profil, tête vers la droite
        const b0 = modelBox(rig.root);
        rig.root.position.x = x - b0.min.x;
        scene.add(rig.root);
        const b = modelBox(rig.root);
        boxes.push(b);
        x = b.max.x + 0.6;
      }
      const all = boxes.reduce((acc, b) => acc.union(b), new THREE.Box3());
      const W = 1260;
      const rowH = Math.round((W * (all.max.y - all.min.y)) / (all.max.x - all.min.x) + 40);
      renderer.setSize(W, rowH * 2);
      const cam = orthoFor(all, new THREE.Vector3(0, 0, 1), W / rowH);
      for (const [row, sil] of [
        [1, false],
        [0, true],
      ] as const) {
        renderer.setViewport(0, row * rowH, W, rowH);
        renderer.setScissor(0, row * rowH, W, rowH);
        renderer.setClearColor(sil ? '#F2F0EA' : BG);
        renderer.clear();
        scene.overrideMaterial = sil ? black : null;
        rigs.forEach((r) => r.root.children.forEach((c) => (c.visible = !(c as THREE.Mesh).isMesh || !((c as THREE.Mesh).geometry instanceof THREE.CircleGeometry) || !sil)));
        renderer.render(scene, cam);
      }
      setInfo(`${LOT.length} créatures, à l'échelle du jeu (profil puis silhouette)`);
      return () => renderer.dispose();
    }

    // ---- planche d'une créature
    const rig = buildVoxelCreature(SPECIES_ID);
    scene.add(rig.root);
    const box = modelBox(rig.root);
    const big = 560;
    const small = 300;
    const combatW = 300;
    const combatH = 220;
    const zoom = 2;
    const W = big + small * 2 + 20;
    const H = big + combatH * zoom + 20;
    renderer.setSize(W, H);
    renderer.setClearColor(BG);
    renderer.setViewport(0, 0, W, H);
    renderer.setScissor(0, 0, W, H);
    renderer.clear();
    const draw = (x: number, yTop: number, w: number, h: number, cam: THREE.Camera) => {
      const y = H - yTop - h;
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.clear();
      renderer.render(scene, cam);
    };
    // grande vue 3/4 avant, puis face, profil, 3/4 arrière
    draw(0, 0, big, big, orthoFor(box, new THREE.Vector3(...VIEWS[0].dir), 1));
    draw(big + 10, 0, small, small - 20, orthoFor(box, new THREE.Vector3(...VIEWS[1].dir), small / (small - 20)));
    draw(big + 10 + small, 0, small, small - 20, orthoFor(box, new THREE.Vector3(...VIEWS[2].dir), small / (small - 20)));
    draw(big + 10, small, small, small - 20, orthoFor(box, new THREE.Vector3(...VIEWS[3].dir), small / (small - 20)));

    // taille réelle en combat : caméra du jeu sur une image de 1280 × 720, recadrée autour de la créature
    // texture en virgule flottante : le mappage des tons du jeu s'applique ensuite, au dessin du recadrage
    const rt = new THREE.WebGLRenderTarget(1280, 720, { samples: 4, type: THREE.HalfFloatType });
    const gameCam = new THREE.PerspectiveCamera(42, 1280 / 720, 0.1, 200);
    gameCam.position.set(0, 15.8, 16.5);
    gameCam.lookAt(0, 0.7, 0);
    rig.root.rotation.y = 0.6;
    const quadScene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: true }));
    quadScene.add(quad);
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    rt.texture.magFilter = THREE.NearestFilter;
    rt.texture.minFilter = THREE.NearestFilter;
    for (const [col, sil] of [
      [0, false],
      [1, true],
    ] as const) {
      scene.overrideMaterial = sil ? black : null;
      rig.root.children.forEach((c) => {
        if ((c as THREE.Mesh).geometry instanceof THREE.CircleGeometry) c.visible = !sil;
      });
      renderer.setRenderTarget(rt);
      renderer.setViewport(0, 0, 1280, 720);
      renderer.setScissor(0, 0, 1280, 720);
      renderer.setClearColor(sil ? '#F2F0EA' : '#5DA548');
      renderer.clear();
      renderer.render(scene, gameCam);
      renderer.setRenderTarget(null);
      // recadrage : 300 × 220 pixels (sur 1280 × 720) autour du centre de la créature, agrandis ×2 sans lissage
      const c = new THREE.Vector3(0, (box.max.y + box.min.y) / 2, 0).project(gameCam);
      const px = ((c.x + 1) / 2) * 1280;
      const py = ((c.y + 1) / 2) * 720;
      const u0 = (px - combatW / 2) / 1280;
      const v0 = (py - combatH / 2) / 720;
      const g = quad.geometry as THREE.PlaneGeometry;
      const uv = g.attributes.uv as THREE.BufferAttribute;
      uv.setXY(0, u0, v0 + combatH / 720);
      uv.setXY(1, u0 + combatW / 1280, v0 + combatH / 720);
      uv.setXY(2, u0, v0);
      uv.setXY(3, u0 + combatW / 1280, v0);
      uv.needsUpdate = true;
      const x = 10 + col * (combatW * zoom + 20);
      const y = H - (big + 10) - combatH * zoom;
      renderer.setViewport(x, y, combatW * zoom, combatH * zoom);
      renderer.setScissor(x, y, combatW * zoom, combatH * zoom);
      renderer.render(quadScene, quadCam);
    }
    scene.overrideMaterial = null;
    const size = box.getSize(new THREE.Vector3());
    const unit = SPECIES[SPECIES_ID].scale * 1.18;
    setInfo(
      `${getVoxDef(SPECIES_ID) ? 'modèle .vox' : 'modèle du code'} · hauteur ${(size.y / unit).toFixed(2)} unité(s) de forme (${Math.round((size.y / unit) * 14)} blocs de fichier)`,
    );
    return () => {
      rt.dispose();
      renderer.dispose();
    };
  }, [ready]);

  const name = SPECIES[SPECIES_ID].name;
  return (
    <div className="min-h-screen bg-[#18161E] p-3 text-[#FAF7F0]">
      <p className="font-display text-xl font-bold text-[#FFAA3C]">
        {LOT.length ? `Alignement : ${LOT.map((id) => SPECIES[id].name).join(', ')}` : `${name}${FICHIER ? ` — essai : ${FICHIER}.vox` : ''}`}
      </p>
      <p className="text-xs text-[#C8C4D2]">
        Rendu du vrai jeu (constructeur et matières du jeu, lumière des portraits). {info}
        {!LOT.length && ' — vues : 3/4 avant (grande), face, profil, 3/4 arrière ; en bas : taille réelle en combat (recadrage d’une image 1280 × 720, ×2) et silhouette.'}
      </p>
      <div ref={host} className="mt-2" />
    </div>
  );
}
