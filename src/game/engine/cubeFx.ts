/**
 * Affichage des cubes d'élément et des Fêlures (S04.3).
 *
 * Tous les cubes sont dessinés par UN `InstancedMesh`, les mini-cubes de Fêlure par un second : aucun objet
 * n'est créé par ennemi ni par image. Chaque face d'un cube porte le symbole de son élément (atlas dessiné
 * par code) : la lecture ne dépend jamais de la couleur seule.
 */
import * as THREE from 'three';
import { CUBE_KIT } from '../balance';
import { ELEMENT_META } from '../catalog';
import type { ElementType } from '../types';
import { getRigTopY } from '../voxelModels';
import { _color, _dummy } from './constants';
import type { VoxelEngine } from '../VoxelEngine';

export const CUBE_POOL_SIZE = 16;
export const CRACK_POOL_SIZE = 32;
const SYMBOL_ORDER: ElementType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'psychic'];
const CELL = 64;
const _white = new THREE.Color('#FFFFFF');

/** Atlas de 6 symboles (flamme, goutte, feuille, éclair, roc, œil), en sombre sur fond blanc. */
function buildSymbolAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * SYMBOL_ORDER.length;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  SYMBOL_ORDER.forEach((element, i) => {
    const ox = i * CELL;
    const c = CELL / 2;
    ctx.save();
    ctx.translate(ox, 0);
    // liseré du cube
    ctx.strokeStyle = 'rgba(20, 25, 37, 0.55)';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, CELL - 6, CELL - 6);
    ctx.fillStyle = '#141925';
    ctx.strokeStyle = '#141925';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (element === 'fire') {
      ctx.moveTo(c, 12);
      ctx.bezierCurveTo(c + 18, 28, c + 14, 50, c, 52);
      ctx.bezierCurveTo(c - 14, 50, c - 18, 32, c - 4, 22);
      ctx.bezierCurveTo(c - 2, 30, c + 2, 30, c, 12);
      ctx.fill();
    } else if (element === 'water') {
      ctx.moveTo(c, 10);
      ctx.bezierCurveTo(c + 6, 22, c + 16, 32, c + 16, 40);
      ctx.arc(c, 40, 16, 0, Math.PI);
      ctx.bezierCurveTo(c - 16, 32, c - 6, 22, c, 10);
      ctx.fill();
    } else if (element === 'grass') {
      ctx.moveTo(14, 50);
      ctx.quadraticCurveTo(14, 14, 50, 14);
      ctx.quadraticCurveTo(50, 50, 14, 50);
      ctx.fill();
    } else if (element === 'electric') {
      ctx.moveTo(c + 6, 8);
      ctx.lineTo(c - 12, 36);
      ctx.lineTo(c, 36);
      ctx.lineTo(c - 6, 56);
      ctx.lineTo(c + 12, 26);
      ctx.lineTo(c, 26);
      ctx.closePath();
      ctx.fill();
    } else if (element === 'rock') {
      ctx.moveTo(14, 46);
      ctx.lineTo(22, 20);
      ctx.lineTo(40, 14);
      ctx.lineTo(52, 30);
      ctx.lineTo(46, 50);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(10, c);
      ctx.quadraticCurveTo(c, 10, CELL - 10, c);
      ctx.quadraticCurveTo(c, CELL - 10, 10, c);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c, c, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Crée les deux maillages instanciés (une fois, à la construction du moteur). */
export function createCubeMeshes(self: VoxelEngine): void {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const symbol = new THREE.InstancedBufferAttribute(new Float32Array(CUBE_POOL_SIZE), 1);
  symbol.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aSymbol', symbol);
  const mat = new THREE.MeshBasicMaterial({ map: buildSymbolAtlas(), color: 0xffffff });
  // Chaque instance lit sa case de l'atlas : uv.x ramené dans la case de son élément
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSymbol;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv.x = (vMapUv.x + aSymbol) / ${SYMBOL_ORDER.length}.0;\n#endif`);
  };
  self.cubeMesh = new THREE.InstancedMesh(geo, mat, CUBE_POOL_SIZE);
  self.cubeMesh.frustumCulled = false;
  self.cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  self.cubeMesh.count = 0;
  for (let i = 0; i < CUBE_POOL_SIZE; i++) self.cubeMesh.setColorAt(i, _white);
  self.fxGroup.add(self.cubeMesh);

  const crackGeo = new THREE.BoxGeometry(1, 1, 1);
  const crackMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  self.crackMesh = new THREE.InstancedMesh(crackGeo, crackMat, CRACK_POOL_SIZE);
  self.crackMesh.frustumCulled = false;
  self.crackMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  self.crackMesh.count = 0;
  for (let i = 0; i < CRACK_POOL_SIZE; i++) self.crackMesh.setColorAt(i, _white);
  self.fxGroup.add(self.crackMesh);
}

/** Place les cubes et les mini-cubes de Fêlure au-dessus des ennemis. Aucune allocation. */
export function updateCubeVisuals(self: VoxelEngine): void {
  const cubes = self.cubeMesh;
  const cracks = self.crackMesh;
  if (!cubes || !cracks) return;
  let n = 0;
  let m = 0;
  if (self.playMode === 'expedition') {
    const t = self.elapsedTotal;
    const symbols = cubes.geometry.getAttribute('aSymbol') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < self.enemies.length; i++) {
      const e = self.enemies[i];
      if (e.fainted || e.removed) continue;
      const topY = e.rig.root.position.y + getRigTopY(e.rig.species) * (e.isBoss ? 1.3 : 1);
      if (e.cube && n < CUBE_POOL_SIZE) {
        const ripeness = Math.min(1, e.cube.age / CUBE_KIT.ripenTime);
        // dernière seconde : le cube clignote
        const blinkOff = e.cube.remaining < 1 && Math.sin(t * 22) < 0;
        const size = blinkOff ? 0.001 : 0.25 + 0.25 * ripeness + (e.cubeRipeFlash > 0 ? 0.08 : 0);
        _dummy.position.set(e.x, topY + 0.75, e.z);
        _dummy.rotation.set(0.35, t * 1.3 + i, 0.2);
        _dummy.scale.setScalar(size);
        _dummy.updateMatrix();
        cubes.setMatrixAt(n, _dummy.matrix);
        _color.set(ELEMENT_META[e.cube.element].color);
        // pas mûr : un peu terne ; à maturité, éclair blanc bref
        if (ripeness < 1) _color.multiplyScalar(0.7);
        if (e.cubeRipeFlash > 0) _color.lerp(_white, Math.min(1, e.cubeRipeFlash / 0.18));
        cubes.setColorAt(n, _color);
        symbols.setX(n, SYMBOL_ORDER.indexOf(e.cube.element));
        n++;
      }
      if (e.crack && m + 1 < CRACK_POOL_SIZE) {
        for (let k = 0; k < 2; k++) {
          const ang = t * 3.2 + k * Math.PI + i;
          _dummy.position.set(e.x + Math.cos(ang) * 0.95, topY * 0.6 + 0.3, e.z + Math.sin(ang) * 0.95);
          _dummy.rotation.set(t * 2, t * 2.4, 0);
          _dummy.scale.setScalar(0.22);
          _dummy.updateMatrix();
          cracks.setMatrixAt(m, _dummy.matrix);
          cracks.setColorAt(m, _color.set(ELEMENT_META[e.crack.elements[k]].color));
          m++;
        }
      }
    }
    if (n > 0) symbols.needsUpdate = true;
  }
  cubes.count = n;
  cracks.count = m;
  cubes.instanceMatrix.needsUpdate = true;
  cracks.instanceMatrix.needsUpdate = true;
  if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
  if (cracks.instanceColor) cracks.instanceColor.needsUpdate = true;
}
