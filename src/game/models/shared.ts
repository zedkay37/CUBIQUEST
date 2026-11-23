/**
 * Ressources partagées par tous les modèles : textures générées une seule fois et brique de base `makeBox`.
 */
import * as THREE from 'three';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;

let sharedToyBumpTex: THREE.CanvasTexture | null = null;

let sharedGroundTileTex: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(12, 16, 26, 0.58)');
  grad.addColorStop(0.6, 'rgba(12, 16, 26, 0.25)');
  grad.addColorStop(1, 'rgba(12, 16, 26, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  sharedContactShadowTex = tex;
  return tex;
}

let sharedCrispShadowTex: THREE.CanvasTexture | null = null;
/** ART3 : ombre au sol à bord franc (plein jusqu'aux trois quarts, puis un fondu court). */
export function getCrispShadowTexture(): THREE.CanvasTexture {
  if (sharedCrispShadowTex) return sharedCrispShadowTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 14, 22, 0.62)');
  grad.addColorStop(0.72, 'rgba(10, 14, 22, 0.5)');
  grad.addColorStop(0.9, 'rgba(10, 14, 22, 0.12)');
  grad.addColorStop(1, 'rgba(10, 14, 22, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  sharedCrispShadowTex = new THREE.CanvasTexture(canvas);
  return sharedCrispShadowTex;
}

export function getToyBumpTexture(): THREE.CanvasTexture {
  if (sharedToyBumpTex) return sharedToyBumpTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Subtle matte voxel bevel border + fine ceramic grain
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  for (let i = 0; i < 180; i++) {
    const x = (i * 29) % size;
    const y = (i * 47) % size;
    const shade = 118 + ((i * 17) % 24);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  sharedToyBumpTex = tex;
  return tex;
}

export function getGroundCheckerTexture(primaryHex: string, altHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cells = 4;
  const step = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? primaryHex : altHex;
      ctx.fillRect(x * step, y * step, step, step);
      // Subtle top-left bevel highlight for toybox voxel floor feel
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x * step, y * step, step, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x * step, (y + 1) * step - 3, step, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.userData.ownedByScene = true; // libérée avec le décor (voir VoxelEngine.disposeObject)
  sharedGroundTileTex = tex;
  return sharedGroundTileTex;
}

export function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}
