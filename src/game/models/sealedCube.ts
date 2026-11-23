/**
 * Modèles voxel des Cubes Scellés et des Appâts (spec Atelier, A2.3). Construits en petits blocs (3 × 3 × 3)
 * pour que la révélation puisse les faire éclater bloc par bloc. Aucun fichier externe.
 */
import * as THREE from 'three';
import type { CubeMaterial } from '../balance';
import type { ElementType } from '../types';
import { ELEMENT_META } from '../catalog';

export interface SealedCubeModel {
  root: THREE.Group;
  /** Les 27 blocs du cube (dans l'ordre x, y, z). */
  blocks: THREE.Mesh[];
  /** Éclats en orbite (Prisme) ou lueur (Cristal) : animés par l'appelant. */
  extras: THREE.Object3D[];
}

const STEP = 0.36;

function materialFor(kind: CubeMaterial, x: number, y: number, z: number): THREE.Material {
  switch (kind) {
    case 'wood': {
      // planches : bandes claires et sombres selon la hauteur
      const tone = y === 1 ? '#8B5A2B' : '#A86F3A';
      return new THREE.MeshStandardMaterial({ color: tone, roughness: 0.85 });
    }
    case 'stone': {
      const engraved = (x + y + z) % 2 === 0;
      return new THREE.MeshStandardMaterial({ color: engraved ? '#7A8394' : '#9AA3B2', roughness: 0.9 });
    }
    case 'crystal':
      return new THREE.MeshStandardMaterial({
        color: '#7FD3FF',
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.78,
        emissive: new THREE.Color('#2E9BFF'),
        emissiveIntensity: 0.55,
      });
    case 'prism': {
      const hues = ['#FF7AD9', '#7AF0FF', '#FFE27A', '#9B7AFF', '#7AFFB0'];
      const c = hues[(x * 7 + y * 3 + z * 5) % hues.length];
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0.35, emissive: new THREE.Color(c), emissiveIntensity: 0.35 });
    }
  }
}

export function buildSealedCubeModel(kind: CubeMaterial): SealedCubeModel {
  const root = new THREE.Group();
  const blocks: THREE.Mesh[] = [];
  const extras: THREE.Object3D[] = [];
  const geo = new THREE.BoxGeometry(STEP * 0.98, STEP * 0.98, STEP * 0.98);
  for (let x = 0; x < 3; x++)
    for (let y = 0; y < 3; y++)
      for (let z = 0; z < 3; z++) {
        const m = new THREE.Mesh(geo, materialFor(kind, x, y, z));
        m.position.set((x - 1) * STEP, (y - 1) * STEP + STEP * 1.5, (z - 1) * STEP);
        m.userData.home = m.position.clone();
        root.add(m);
        blocks.push(m);
      }
  if (kind === 'wood') {
    // clous
    const nail = new THREE.MeshStandardMaterial({ color: '#C9CED6', metalness: 0.7, roughness: 0.3 });
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), nail);
      n.position.set(x * STEP, y * STEP + STEP * 1.5, STEP * 1.5 + 0.01);
      root.add(n);
      extras.push(n);
    }
  }
  if (kind === 'prism') {
    // petits éclats en orbite
    const shardMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: new THREE.Color('#FFFFFF'), emissiveIntensity: 0.8 });
    const orbit = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), shardMat);
      const a = (i / 6) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.95, STEP * 1.5 + Math.sin(a * 2) * 0.2, Math.sin(a) * 0.95);
      orbit.add(s);
    }
    root.add(orbit);
    extras.push(orbit);
  }
  return { root, blocks, extras };
}

/** Appât d'un élément : un petit objet voxel à sa couleur (graine, goutte, braise, pile, caillou, prisme). */
export function buildBaitModel(element: ElementType): THREE.Group {
  const g = new THREE.Group();
  const color = ELEMENT_META[element].color;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
  const shapes: Record<ElementType, [number, number, number, number][]> = {
    fire: [[0.3, 0.3, 0.3, 0.15], [0.18, 0.22, 0.18, 0.42]],
    water: [[0.3, 0.26, 0.3, 0.13], [0.16, 0.16, 0.16, 0.35]],
    grass: [[0.22, 0.3, 0.22, 0.15], [0.34, 0.06, 0.14, 0.34]],
    electric: [[0.24, 0.36, 0.24, 0.18], [0.1, 0.08, 0.1, 0.4]],
    rock: [[0.34, 0.24, 0.3, 0.12], [0.2, 0.14, 0.2, 0.3]],
    psychic: [[0.26, 0.26, 0.26, 0.2], [0.12, 0.12, 0.12, 0.42]],
  };
  for (const [w, h, d, y] of shapes[element]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = y;
    g.add(m);
  }
  return g;
}

export function disposeModel(obj: THREE.Object3D): void {
  const seen = new Set<unknown>();
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !seen.has(m.geometry)) {
      seen.add(m.geometry);
      m.geometry.dispose();
    }
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) for (const x of Array.isArray(mat) ? mat : [mat]) if (!seen.has(x)) { seen.add(x); x.dispose(); }
  });
}
