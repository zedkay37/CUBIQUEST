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

  const ironMat = new THREE.MeshStandardMaterial({
    color: '#343A46',
    roughness: 0.42,
    metalness: 0.65,
    bumpMap: bump,
    bumpScale: 0.015,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#525C6E',
    roughness: 0.3,
    metalness: 0.78,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#7C4D2B',
    roughness: 0.85,
    metalness: 0.02,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#8D867E',
    roughness: 0.88,
    metalness: 0.04,
  });
  const fireMat = new THREE.MeshStandardMaterial({
    color: '#FF7A28',
    emissive: new THREE.Color('#FF5A1F'),
    emissiveIntensity: 1.1,
    roughness: 0.35,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: '#52B788',
    emissive: new THREE.Color('#34D399'),
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.1,
  });

  // Ring of hearth stones grounded at y = 0
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const stone = makeBox(0.46, 0.28, 0.46, stoneMat, Math.cos(ang) * 1.15, 0.14, Math.sin(ang) * 1.15);
    stone.rotation.y = ang;
    group.add(stone);
  }

  // Crossed firewood logs
  const log1 = makeBox(1.5, 0.2, 0.22, woodMat, 0, 0.12, 0);
  log1.rotation.y = 0.5;
  const log2 = makeBox(1.5, 0.2, 0.22, woodMat, 0, 0.14, 0);
  log2.rotation.y = -0.6;
  group.add(log1, log2);

  // Fire core
  const fireMesh = makeBox(0.7, 0.45, 0.7, fireMat, 0, 0.32, 0, false);
  group.add(fireMesh);

  // Bac et rebord biseauté (4 parties)
  group.add(makeBox(1.56, 0.92, 1.56, ironMat, 0, 0.95, 0));
  group.add(makeBox(1.78, 0.22, 1.78, rimMat, 0, 1.44, 0));
  group.add(makeBox(0.24, 0.26, 0.44, rimMat, -0.92, 1.18, 0));
  group.add(makeBox(0.24, 0.26, 0.44, rimMat, 0.92, 1.18, 0));

  // Surface liquide dans le bac
  const liquidMesh = makeBox(1.36, 0.16, 1.36, liquidMat, 0, 1.48, 0, false);
  group.add(liquidMesh);

  // Wooden tripod legs
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.4;
    const leg = makeBox(0.16, 2.7, 0.16, woodMat, Math.cos(ang) * 1.1, 1.25, Math.sin(ang) * 1.1);
    leg.rotation.z = Math.cos(ang) * 0.28;
    leg.rotation.x = -Math.sin(ang) * 0.28;
    group.add(leg);
  }

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
