/**
 * PortraitStudio (spec Atelier, G1.3) : un second rendu, hors écran, qui photographie chaque créature en
 * trois-quarts face, sur fond transparent, avec un éclairage de studio, en 256 × 256.
 *
 * Les portraits sont produits à la demande, un par image d'animation (pas d'à-coup), puis gardés en mémoire.
 * Un seul contexte WebGL pour tous les portraits. Sans WebGL (tests, navigateur très ancien), aucun portrait :
 * l'interface garde l'icône dessinée.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SPECIES } from './catalog';
import { buildVoxelCreature } from './voxelModels';
import { buildBaitModel, buildSealedCubeModel } from './models/sealedCube';
import type { CubeMaterial } from './balance';
import type { ElementType } from './types';

export const PORTRAIT_SIZE = 256;

interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

let studio: Studio | null | undefined;
const cache = new Map<string, string>();
const queue: string[] = [];
const listeners = new Map<string, Set<() => void>>();
let scheduled = false;

function createStudio(): Studio | null {
  if (typeof document === 'undefined') return null;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setPixelRatio(1);
    renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;
    pmrem.dispose();
    // éclairage de studio : clé chaude, contre-jour froid, débouchage doux
    const key = new THREE.DirectionalLight('#FFF1DA', 1.5);
    key.position.set(4, 6, 6);
    const rim = new THREE.DirectionalLight('#9CC8FF', 0.7);
    rim.position.set(-5, 4, -6);
    const fill = new THREE.HemisphereLight('#DDEBFF', '#5B4A3A', 0.55);
    scene.add(key, rim, fill);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    return { renderer, scene, camera };
  } catch {
    return null;
  }
}

function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) m.dispose();
  });
}

/** Photographie une espèce (trois-quarts face, cadrage sur sa boîte englobante, sans ombre au sol). */
function shoot(s: Studio, speciesId: string): string | null {
  // objets (A2.3) : « cube:wood », « bait:fire »…
  let root: THREE.Object3D;
  let framed: THREE.Object3D;
  if (speciesId.startsWith('cube:')) {
    root = buildSealedCubeModel(speciesId.slice(5) as CubeMaterial).root;
    framed = root;
  } else if (speciesId.startsWith('bait:')) {
    root = buildBaitModel(speciesId.slice(5) as ElementType);
    framed = root;
  } else {
    if (!SPECIES[speciesId]) return null;
    const rig = buildVoxelCreature(speciesId, 1);
    rig.root.children.forEach((c) => {
      // le disque d'ombre de contact n'a rien à faire dans un portrait
      if ((c as THREE.Mesh).geometry instanceof THREE.CircleGeometry) c.visible = false;
    });
    root = rig.root;
    framed = rig.bodyPivot;
  }
  s.scene.add(root);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(framed);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  // ART2 : la créature remplit au moins 70 % de la hauteur du portrait (largeur bornée à 90 %)
  const dist = Math.max(size.y / 0.8, Math.max(size.x, size.z) / 0.9) / 2 / Math.tan((14 * Math.PI) / 180);
  const dir = new THREE.Vector3(0.62, 0.3, 0.78).normalize();
  s.camera.position.copy(center).addScaledVector(dir, dist);
  s.camera.lookAt(center);
  s.renderer.render(s.scene, s.camera);
  const url = s.renderer.domElement.toDataURL('image/png');
  s.scene.remove(root);
  disposeTree(root);
  return url;
}

function pump(): void {
  scheduled = false;
  const id = queue.shift();
  if (!id) return;
  if (studio === undefined) studio = createStudio();
  if (studio && !cache.has(id)) {
    const url = shoot(studio, id);
    if (url) cache.set(id, url);
  }
  listeners.get(id)?.forEach((fn) => fn());
  if (queue.length) schedule();
}

function schedule(): void {
  if (scheduled || typeof window === 'undefined') return;
  scheduled = true;
  window.requestAnimationFrame(pump);
}

/** Portrait déjà prêt (ou null) ; sinon le demande et prévient `onReady` quand il l'est. */
export function requestPortrait(speciesId: string, onReady: () => void): { url: string | null; cancel: () => void } {
  const hit = cache.get(speciesId);
  if (hit) return { url: hit, cancel: () => {} };
  if (studio === null) return { url: null, cancel: () => {} };
  if (!listeners.has(speciesId)) listeners.set(speciesId, new Set());
  listeners.get(speciesId)!.add(onReady);
  if (!queue.includes(speciesId)) queue.push(speciesId);
  schedule();
  return { url: null, cancel: () => listeners.get(speciesId)?.delete(onReady) };
}

export function cachedPortrait(speciesId: string): string | null {
  return cache.get(speciesId) ?? null;
}
