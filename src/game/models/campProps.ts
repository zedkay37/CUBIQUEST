/**
 * Objets du camp : atelier central (en attendant son établi : bac, feu, trépied) et totem.
 */
import * as THREE from 'three';
import { getToyBumpTexture, makeBox } from './shared';

/**
 * Atelier du camp : feu de bûches, bac et trépied (modèle provisoire, remplacé par un établi en A2.3)
 */
export function buildWorkbenchProp(): {
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  fireMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const bump = getToyBumpTexture();

  // A2.3 : l'Atelier, un établi de pierre avec un moule lumineux au centre, des outils et des cubes empilés.
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#8D867E', roughness: 0.88, metalness: 0.04, bumpMap: bump, bumpScale: 0.015 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#A39C93', roughness: 0.8, metalness: 0.04 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#7C4D2B', roughness: 0.85, metalness: 0.02 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#4A5263', roughness: 0.4, metalness: 0.7 });
  const moldMat = new THREE.MeshStandardMaterial({ color: '#2A3449', roughness: 0.5, metalness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: '#BDE8FF',
    emissive: new THREE.Color('#7CC8FF'),
    emissiveIntensity: 0.5,
    roughness: 0.2,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: '#F4B942',
    emissive: new THREE.Color('#F4B942'),
    emissiveIntensity: 0.7,
    roughness: 0.3,
  });
  // piétement et plateau de l'établi
  group.add(makeBox(0.5, 0.9, 0.5, stoneMat, -1.05, 0.45, -0.45));
  group.add(makeBox(0.5, 0.9, 0.5, stoneMat, 1.05, 0.45, -0.45));
  group.add(makeBox(0.5, 0.9, 0.5, stoneMat, -1.05, 0.45, 0.45));
  group.add(makeBox(0.5, 0.9, 0.5, stoneMat, 1.05, 0.45, 0.45));
  group.add(makeBox(2.9, 0.3, 1.6, topMat, 0, 1.05, 0));
  // le moule : un cadre sombre et une surface qui luit (« liquidMesh », animée par le camp)
  group.add(makeBox(1.0, 0.18, 1.0, moldMat, 0, 1.28, 0));
  const liquidMesh = makeBox(0.78, 0.06, 0.78, glowMat, 0, 1.38, 0, false);
  group.add(liquidMesh);
  // un petit cube qui flotte au-dessus du moule (« fireMesh », il palpite)
  const fireMesh = makeBox(0.34, 0.34, 0.34, coreMat, 0, 1.72, 0, false);
  group.add(fireMesh);
  // outils : maillet et ciseau
  group.add(makeBox(0.12, 0.08, 0.7, woodMat, 0.95, 1.25, 0.3));
  group.add(makeBox(0.3, 0.18, 0.2, ironMat, 0.95, 1.27, 0.68));
  group.add(makeBox(0.08, 0.06, 0.5, ironMat, -0.9, 1.23, 0.45));
  // cubes empilés autour (bois, pierre, cristal)
  const crateWood = new THREE.MeshStandardMaterial({ color: '#A86F3A', roughness: 0.85 });
  const crateStone = new THREE.MeshStandardMaterial({ color: '#9AA3B2', roughness: 0.9 });
  const crateCrystal = new THREE.MeshStandardMaterial({ color: '#7FD3FF', roughness: 0.2, transparent: true, opacity: 0.85, emissive: new THREE.Color('#2E9BFF'), emissiveIntensity: 0.4 });
  group.add(makeBox(0.5, 0.5, 0.5, crateWood, -1.9, 0.25, 0.3));
  group.add(makeBox(0.5, 0.5, 0.5, crateStone, -1.85, 0.25, -0.35));
  group.add(makeBox(0.42, 0.42, 0.42, crateWood, -1.88, 0.71, 0.0));
  group.add(makeBox(0.44, 0.44, 0.44, crateCrystal, 1.9, 0.22, 0.2));

  return { group, liquidMesh, fireMesh };
}

/**
 * Builds the tall Camp Waystone Landmark visible in initial framing
 */
export function buildCampLandmark(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#D6CFC2', roughness: 0.82, metalness: 0.05 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: '#7D766D', roughness: 0.75, metalness: 0.12 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: new THREE.Color('#0EA5E9'),
    emissiveIntensity: 0.55,
    roughness: 0.16,
    metalness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#9A633A', roughness: 0.8 });
  const awningMat = new THREE.MeshStandardMaterial({ color: '#E85D3F', roughness: 0.72 });
  const awningAltMat = new THREE.MeshStandardMaterial({ color: '#FAF3E6', roughness: 0.76 });

  // Stone plinth + monument obelisk
  group.add(makeBox(2.4, 0.45, 2.4, darkStoneMat, 0, 0.225, 0));
  group.add(makeBox(1.5, 3.2, 1.5, stoneMat, 0, 2.05, 0));
  group.add(makeBox(1.75, 0.35, 1.75, darkStoneMat, 0, 3.65, 0));
  const topCrystal = makeBox(0.85, 0.85, 0.85, crystalMat, 0, 4.45, 0);
  topCrystal.rotation.set(0.4, Math.PI / 4, 0.4);
  group.add(topCrystal);

  // Explorer tent beside the waystone
  const tent = new THREE.Group();
  tent.name = 'tent'; // A3.1 : lieu cliquable « équipe »
  tent.position.set(-4.2, 0, 1.4);
  tent.rotation.y = 0.35;
  tent.add(makeBox(0.22, 1.8, 0.22, woodMat, -1.2, 0.9, 1.1));
  tent.add(makeBox(0.22, 1.8, 0.22, woodMat, 1.2, 0.9, 1.1));
  tent.add(makeBox(0.22, 1.6, 0.22, woodMat, -1.2, 0.8, -1.1));
  tent.add(makeBox(0.22, 1.6, 0.22, woodMat, 1.2, 0.8, -1.1));
  // Striped voxel canopy
  tent.add(makeBox(0.9, 0.26, 2.6, awningMat, -0.9, 1.85, 0));
  tent.add(makeBox(0.9, 0.26, 2.6, awningAltMat, 0, 1.98, 0));
  tent.add(makeBox(0.9, 0.26, 2.6, awningMat, 0.9, 1.85, 0));
  // Crate props anchored cleanly on the floor
  tent.add(makeBox(0.62, 0.62, 0.62, woodMat, 0.65, 0.31, -0.4));
  tent.add(makeBox(0.48, 0.48, 0.48, woodMat, 0.1, 0.24, -0.55));
  group.add(tent);

  return group;
}
