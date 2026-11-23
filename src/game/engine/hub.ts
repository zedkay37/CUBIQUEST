/**
 * Le hub cliquable (spec Atelier, A3.1) : quatre lieux du camp sont les menus.
 *   panneau de l'île -> carte des expéditions · Atelier -> invocation · tente -> équipe · bibliothèque -> Carnet.
 * Au survol, le lieu s'illumine et la caméra s'en approche un peu ; l'interface affiche son nom et ouvre l'écran
 * au clic. Les compagnons du camp vont et viennent entre les lieux.
 *
 * Seulement au camp (jamais pendant un combat) : la simulation et le golden ne sont pas concernés.
 */
import * as THREE from 'three';
import type { VoxelEngine } from '../VoxelEngine';
import { makeBox } from '../models/shared';

export type HubPlaceId = 'map' | 'atelier' | 'team' | 'carnet';

export interface HubPlace {
  id: HubPlaceId;
  group: THREE.Object3D;
  /** Point au-dessus du lieu (nom, pastille). */
  anchor: THREE.Vector3;
  meshes: THREE.Mesh[];
  /** Émission d'origine de chaque matériau, pour éteindre la surbrillance. */
  base: Map<THREE.MeshStandardMaterial, { color: THREE.Color; intensity: number }>;
}

const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _proj = new THREE.Vector3();
const HOVER_TINT = new THREE.Color('#F4B942');

/** Panneau de l'île : un poteau et une carte de bois. */
export function buildSignpost(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 0.85 });
  const board = new THREE.MeshStandardMaterial({ color: '#E9D8A6', roughness: 0.8 });
  const ink = new THREE.MeshStandardMaterial({ color: '#2F6F8F', roughness: 0.7 });
  g.add(makeBox(0.22, 2.2, 0.22, wood, 0, 1.1, 0));
  g.add(makeBox(1.7, 1.1, 0.12, wood, 0, 2.0, 0.1));
  g.add(makeBox(1.5, 0.9, 0.06, board, 0, 2.0, 0.18));
  // petite île dessinée sur la carte
  g.add(makeBox(0.6, 0.34, 0.04, ink, -0.15, 2.02, 0.22));
  g.add(makeBox(0.24, 0.2, 0.04, ink, 0.42, 1.86, 0.22));
  return g;
}

/** Bibliothèque : une étagère de livres-cubes. */
export function buildLibrary(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#7C4D2B', roughness: 0.85 });
  g.add(makeBox(2.0, 0.16, 0.7, wood, 0, 0.08, 0));
  g.add(makeBox(2.0, 0.12, 0.7, wood, 0, 0.95, 0));
  g.add(makeBox(2.0, 0.12, 0.7, wood, 0, 1.8, 0));
  g.add(makeBox(0.14, 1.9, 0.7, wood, -1.0, 0.95, 0));
  g.add(makeBox(0.14, 1.9, 0.7, wood, 1.0, 0.95, 0));
  const colors = ['#E85D3F', '#38BDF8', '#2FB97A', '#F4B942', '#C084FC', '#9AA3B2'];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[(i + row * 2) % colors.length], roughness: 0.6 });
      const h = 0.5 + ((i * 3 + row) % 3) * 0.1;
      g.add(makeBox(0.3, h, 0.42, mat, -0.7 + i * 0.35, 0.16 + row * 0.86 + h / 2, 0.05));
    }
  return g;
}

/** Enregistre un lieu (appelé par loadCampScene). */
export function registerHubPlace(self: VoxelEngine, id: HubPlaceId, group: THREE.Object3D, anchorY: number): void {
  group.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  const base: HubPlace['base'] = new Map();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m);
    const mat = m.material as THREE.MeshStandardMaterial;
    if (mat.isMeshStandardMaterial && !base.has(mat)) base.set(mat, { color: mat.emissive.clone(), intensity: mat.emissiveIntensity });
  });
  const box = new THREE.Box3().setFromObject(group);
  const anchor = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + anchorY, (box.min.z + box.max.z) / 2);
  self.hubPlaces.push({ id, group, anchor, meshes, base });
}

/** Lieu sous le pointeur (coordonnées normalisées -1..1), ou null. */
export function pickHubPlace(self: VoxelEngine, ndcX: number, ndcY: number): HubPlaceId | null {
  if (self.playMode !== 'camp' || !self.hubPlaces.length) return null;
  _ndc.set(ndcX, ndcY);
  _ray.setFromCamera(_ndc, self.camera);
  let best: { id: HubPlaceId; d: number } | null = null;
  for (const p of self.hubPlaces) {
    const hit = _ray.intersectObjects(p.meshes, false)[0];
    if (hit && (!best || hit.distance < best.d)) best = { id: p.id, d: hit.distance };
  }
  return best?.id ?? null;
}

/** Surbrillance du lieu survolé (null : aucune). */
export function setHubHover(self: VoxelEngine, id: HubPlaceId | null): void {
  if (self.hubHover === id) return;
  self.hubHover = id;
  for (const p of self.hubPlaces) {
    for (const [mat, b] of p.base) {
      if (p.id === id) {
        mat.emissive.copy(HOVER_TINT);
        mat.emissiveIntensity = Math.max(b.intensity, 0.28);
      } else {
        mat.emissive.copy(b.color);
        mat.emissiveIntensity = b.intensity;
      }
    }
  }
}

/** Position écran (pixels CSS) de chaque lieu, pour les noms et les pastilles. */
export function getHubAnchors(self: VoxelEngine): { id: HubPlaceId; x: number; y: number }[] {
  const el = self.renderer?.domElement;
  if (!el || self.playMode !== 'camp') return [];
  const w = el.clientWidth;
  const h = el.clientHeight;
  return self.hubPlaces.map((p) => {
    _proj.copy(p.anchor).project(self.camera);
    return { id: p.id, x: ((_proj.x + 1) / 2) * w, y: ((1 - _proj.y) / 2) * h };
  });
}

/** Caméra : légère approche du lieu survolé (appelé par updateCamera, au camp). */
export function hubCameraNudge(self: VoxelEngine, eye: THREE.Vector3, target: THREE.Vector3): void {
  const p = self.hubPlaces.find((x) => x.id === self.hubHover);
  if (!p) return;
  target.lerp(p.anchor, 0.12);
  eye.lerp(p.anchor, 0.08);
}

/** Un promeneur choisit parfois un lieu du camp comme destination. */
export function pickWanderTarget(self: VoxelEngine): { x: number; z: number } | null {
  if (!self.hubPlaces.length || Math.random() < 0.5) return null;
  const p = self.hubPlaces[Math.floor(Math.random() * self.hubPlaces.length)];
  return { x: p.anchor.x + (Math.random() - 0.5) * 1.6, z: p.anchor.z + 1.6 + Math.random() * 0.8 };
}
