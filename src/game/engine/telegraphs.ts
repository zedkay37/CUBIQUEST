/**
 * Une seule grammaire pour les attaques annoncées (S05.2, plan 5.3) : la FORME dit quoi faire, la couleur
 * est toujours la même (`DANGER`, styleGuide.ts) et des hachures la doublent : la lecture ne dépend jamais
 * de la couleur seule. Les couleurs des kits de boss ne servent plus qu'aux particules.
 *
 *  - disque plein : sors de là ;  - couronne : viens au centre ;  - bande : sors du couloir ;
 *  - plusieurs petits disques : ne reste pas en place ;  - spirale : tu es aspiré, esquive.
 *
 * Chaque zone : un fond hachuré à 35 %, un remplissage plus opaque qui progresse du centre vers le bord
 * (de l'origine vers le bout pour une bande) et atteint le bord à l'impact, un contour clair doublé d'un
 * trait sombre qui clignote pendant les 0,35 dernières secondes, et le même « tic » sonore pour toutes.
 */
import * as THREE from 'three';
import { TELEGRAPH_KIT } from '../balance';
import { DANGER } from '../styleGuide';

export type TelegraphShape = 'disc' | 'ring' | 'band' | 'spiral';

let hatchTex: THREE.CanvasTexture | null = null;
let spiralTex: THREE.CanvasTexture | null = null;

/** Hachures diagonales claires sur fond transparent (partagées par toutes les zones, jamais libérées). */
function getHatchTexture(spiral: boolean): THREE.CanvasTexture {
  const cached = spiral ? spiralTex : hatchTex;
  if (cached) return cached;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 6;
  if (spiral) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) {
      const r = (a / (Math.PI * 6)) * (size / 2 - 2);
      const x = size / 2 + Math.cos(a) * r;
      const y = size / 2 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    for (let k = -size; k < size * 2; k += 16) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + size, size);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  if (spiral) spiralTex = tex;
  else hatchTex = tex;
  return tex;
}

function shapeGeometry(shape: TelegraphShape, radius: number, innerRadius: number): THREE.BufferGeometry {
  if (shape === 'band') {
    const g = new THREE.PlaneGeometry(1.4, radius);
    g.translate(0, radius / 2, 0);
    return g;
  }
  if (shape === 'ring') return new THREE.RingGeometry(innerRadius, radius, 40);
  return new THREE.CircleGeometry(radius, 32);
}

/** Construit la zone : le fond (racine), le remplissage et le double contour en enfants. */
export function buildTelegraphVisual(shape: TelegraphShape, radius: number, innerRadius: number): THREE.Mesh {
  const base = new THREE.Mesh(
    shapeGeometry(shape, radius, innerRadius),
    new THREE.MeshBasicMaterial({
      color: DANGER,
      map: getHatchTexture(shape === 'spiral'),
      transparent: true,
      opacity: TELEGRAPH_KIT.backgroundOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const fill = new THREE.Mesh(
    shapeGeometry(shape, radius, innerRadius),
    new THREE.MeshBasicMaterial({ color: DANGER, transparent: true, opacity: TELEGRAPH_KIT.fillOpacity, side: THREE.DoubleSide, depthWrite: false }),
  );
  fill.position.z = 0.01;
  fill.name = 'fill';
  fill.scale.setScalar(0.001);
  base.add(fill);
  // contour : trait clair doublé d'un trait sombre
  const outlineGeo =
    shape === 'band'
      ? new THREE.EdgesGeometry(shapeGeometry('band', radius, 0))
      : new THREE.EdgesGeometry(new THREE.CircleGeometry(radius, 40));
  const dark = new THREE.LineSegments(outlineGeo, new THREE.LineBasicMaterial({ color: '#141925', transparent: true, opacity: 0.9 }));
  dark.position.z = 0.02;
  dark.scale.setScalar(1.03);
  dark.name = 'outlineDark';
  const light = new THREE.LineSegments(outlineGeo.clone(), new THREE.LineBasicMaterial({ color: '#FFF1F2', transparent: true, opacity: 0.95 }));
  light.position.z = 0.03;
  light.name = 'outlineLight';
  base.add(dark, light);
  return base;
}

/** Avance l'animation : remplissage jusqu'au bord à l'impact, contour qui clignote à la fin. */
export function updateTelegraphVisual(mesh: THREE.Mesh, shape: TelegraphShape, ratio: number, timeLeft: number, t: number): void {
  const fill = mesh.getObjectByName('fill');
  if (fill) {
    const r = Math.max(0.001, ratio);
    if (shape === 'band') fill.scale.set(1, r, 1);
    else fill.scale.setScalar(r);
  }
  if (shape === 'spiral') mesh.rotation.z += 0.08;
  const blinking = timeLeft <= TELEGRAPH_KIT.warnBefore;
  const on = !blinking || Math.sin(t * 40) > 0;
  const light = mesh.getObjectByName('outlineLight');
  const dark = mesh.getObjectByName('outlineDark');
  if (light) light.visible = on;
  if (dark) dark.visible = on;
}
