/**
 * Rendu des vignettes de la galerie de revue (`?gallery=1`).
 * Outil de développement : un seul renderer WebGL temporaire produit des images fixes (data URL),
 * puis tout est libéré. Aucune boucle d'animation, aucun lien avec le moteur de jeu.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SPECIES } from './catalog';
import type { BiomeDef } from './types';
import { buildBiomeEnvironment, buildVoxelCreature, getRigTopY } from './voxelModels';

export interface GalleryShots {
  /** Pour chaque espèce : [vue trois-quarts face, vue de profil]. */
  creatures: Record<string, [string, string]>;
  biomes: Record<string, string>;
}

const CREATURE_SHOT = 320;
const BIOME_SHOT: [number, number] = [640, 360];

function disposeTree(obj: THREE.Object3D): void {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if ((node as THREE.InstancedMesh).isInstancedMesh) (node as THREE.InstancedMesh).dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map && map.userData.ownedByScene) map.dispose();
      m.dispose();
    }
  });
}

export function renderGalleryShots(speciesIds: string[], biomes: BiomeDef[]): GalleryShots {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  // mêmes réglages d'image que le jeu, pour juger les couleurs réelles
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight('#B4DFFF', '#7D6044', 0.52);
  const key = new THREE.DirectionalLight('#FFEED1', 1.28);
  key.position.set(16, 26, 14);
  const rim = new THREE.DirectionalLight('#93C5FD', 0.32);
  rim.position.set(-14, 12, -16);
  scene.add(hemi, key, rim);

  const shots: GalleryShots = { creatures: {}, biomes: {} };

  // --- Créatures : fond transparent, cadrage ajusté à la taille de chacune ---
  renderer.setSize(CREATURE_SHOT, CREATURE_SHOT, false);
  renderer.setClearColor(0x000000, 0);
  const creatureCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.08, 32),
    new THREE.MeshStandardMaterial({ color: '#2A3449', roughness: 0.9 }),
  );
  pedestal.position.y = -0.04;
  scene.add(pedestal);

  for (const id of speciesIds) {
    const species = SPECIES[id];
    if (!species) continue;
    const rig = buildVoxelCreature(id);
    scene.add(rig.root);
    const top = getRigTopY(species) * species.scale;
    const centerY = top * 0.46;
    const dist = Math.max(3.5, top * 2.25);
    pedestal.scale.set(species.scale, 1, species.scale);
    const views: [number, number][] = [
      [0.62, 0.78], // trois-quarts face
      [1, 0.02], // profil
    ];
    const urls = views.map(([dx, dz]) => {
      const len = Math.hypot(dx, dz);
      creatureCam.position.set((dx / len) * dist, centerY + dist * 0.26, (dz / len) * dist);
      creatureCam.lookAt(0, centerY, 0);
      renderer.render(scene, creatureCam);
      return renderer.domElement.toDataURL('image/png');
    }) as [string, string];
    shots.creatures[id] = urls;
    scene.remove(rig.root);
    disposeTree(rig.root);
  }
  scene.remove(pedestal);
  pedestal.geometry.dispose();
  (pedestal.material as THREE.Material).dispose();

  // --- Biomes : vue d'ensemble de l'arène, avec ciel et brume du biome ---
  renderer.setSize(BIOME_SHOT[0], BIOME_SHOT[1], false);
  const biomeCam = new THREE.PerspectiveCamera(42, BIOME_SHOT[0] / BIOME_SHOT[1], 0.5, 200);
  biomeCam.position.set(-6, 15, 27);
  biomeCam.lookAt(0, 1.5, 0);
  for (const biome of biomes) {
    const env = buildBiomeEnvironment(biome, false);
    env.animate?.(0);
    scene.add(env.group);
    scene.background = new THREE.Color(biome.skyHex);
    scene.fog = new THREE.Fog(biome.fogHex, 30, 84);
    renderer.render(scene, biomeCam);
    shots.biomes[biome.id] = renderer.domElement.toDataURL('image/jpeg', 0.9);
    scene.remove(env.group);
    disposeTree(env.group);
  }

  envTexture.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return shots;
}
