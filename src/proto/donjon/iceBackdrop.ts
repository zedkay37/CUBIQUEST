/**
 * Biome de glace et de cristaux (banc n° 1) : ce qui entoure l'arène. Des couches de profondeur en low poly cubique
 * (blocs de glace et de pierre bleutée, enneigés sur les arêtes, cristaux cyan lumineux, quelques lanternes chaudes),
 * de plus en plus hautes et lointaines, effacées par un brouillard violet. Rien au sud près de la caméra ne dépasse
 * un mètre : le décor ne cache jamais le combat. Purement visuel (aucun obstacle).
 */
import * as THREE from 'three';
import { getToonGradient } from '../../components/styles/magmaStyles';
import type { Floor } from './gen';

const rnd = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263 + 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ROCK = ['#4F5B8C', '#5A6698', '#46517F', '#646FA2'];
const ICE = ['#6FAFD6', '#82BEE0', '#5E9FCB'];

export function buildIceBackdrop(f: Floor): THREE.Group {
  const g = new THREE.Group();
  const cx = f.w / 2;
  const cy = f.h / 2;
  // sol enneigé tout autour (aucun vide noir), dans la même couleur que la brume au loin
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshToonMaterial({ color: '#8E99C8', gradientMap: getToonGradient() }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, -0.03, -cy);
  ground.receiveShadow = true;
  g.add(ground);

  type Block = { x: number; y: number; w: number; d: number; h: number; c: string };
  const blocks: Block[] = [];
  const crystals: { x: number; y: number; h: number; s: number; c: string }[] = [];
  const lanterns: { x: number; y: number }[] = [];
  // trois couches : proche (bas, détaillé), moyenne (falaises), lointaine (grands plateaux)
  const layers = [
    { d0: 1.5, d1: 7, hMin: 0.4, hMax: 2.2, size: [1, 2.6], n: 150 },
    { d0: 9, d1: 22, hMin: 2.5, hMax: 7, size: [2.5, 5], n: 140 },
    { d0: 26, d1: 55, hMin: 7, hMax: 16, size: [5, 10], n: 70 },
  ];
  layers.forEach((L, li) => {
    for (let k = 0; k < L.n; k++) {
      const a = rnd(li * 1000 + k, 1) * Math.PI * 2;
      const dist = L.d0 + rnd(li * 1000 + k, 2) * (L.d1 - L.d0);
      // position hors de l'arène : depuis le bord du rectangle, vers l'extérieur
      const ex = Math.cos(a);
      const ey = Math.sin(a);
      const t = Math.min(Math.abs((f.w / 2 + dist) / (ex || 1e-6)), Math.abs((f.h / 2 + dist) / (ey || 1e-6)));
      const x = cx + ex * t;
      const y = cy + ey * t;
      const south = y < 1; // côté caméra
      let h = L.hMin + rnd(li * 1000 + k, 3) * (L.hMax - L.hMin);
      // côté caméra (sud) : bas tant qu'on est proche, pour ne rien cacher
      if (south && dist < 14) h = Math.min(h, 0.9);
      const w = L.size[0] + rnd(li * 1000 + k, 4) * (L.size[1] - L.size[0]);
      const d = L.size[0] + rnd(li * 1000 + k, 5) * (L.size[1] - L.size[0]);
      const ice = rnd(li * 1000 + k, 6) < 0.3;
      blocks.push({ x, y, w, d, h, c: ice ? ICE[k % 3] : ROCK[k % 4] });
      // un petit gradin devant les falaises : le relief en marches, typique du low poly cubique
      if (li > 0 && rnd(li * 1000 + k, 7) < 0.6) blocks.push({ x: x - ex * w * 0.45, y: y - ey * d * 0.45, w: w * 0.6, d: d * 0.6, h: h * 0.45, c: ROCK[(k + 1) % 4] });
      if (rnd(li * 1000 + k, 8) < (li === 2 ? 0.25 : 0.35)) crystals.push({ x: x + (rnd(k, 9) - 0.5) * w, y: y + (rnd(k, 10) - 0.5) * d, h: li === 0 ? 1.2 + rnd(k, 11) * 1.6 : 3 + rnd(k, 11) * 5, s: li === 0 ? 0.35 : 0.9, c: rnd(k, 12) < 0.75 ? '#5FE3FF' : '#B69BFF' });
      if (li === 0 && rnd(k, 13) < 0.08 && !south) lanterns.push({ x, y });
    }
  });

  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const body = new THREE.InstancedMesh(box, new THREE.MeshToonMaterial({ color: '#FFFFFF', gradientMap: getToonGradient() }), blocks.length);
  const snow = new THREE.InstancedMesh(box, new THREE.MeshToonMaterial({ color: '#D3DDF6', gradientMap: getToonGradient() }), blocks.length);
  blocks.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd(i, 20) * 0.5);
    m4.compose(new THREE.Vector3(b.x, 0, -b.y), q, new THREE.Vector3(b.w, b.h, b.d));
    body.setMatrixAt(i, m4);
    body.setColorAt(i, new THREE.Color(b.c));
    // la neige sur les arêtes : une plaque un peu plus large que le bloc, posée dessus
    m4.compose(new THREE.Vector3(b.x, b.h, -b.y), q, new THREE.Vector3(b.w * 1.04, Math.min(0.25, 0.08 + b.h * 0.02), b.d * 1.04));
    snow.setMatrixAt(i, m4);
  });
  body.castShadow = body.receiveShadow = true;
  g.add(body, snow);

  // cristaux cyan (et quelques violets) : ils luisent dans la pénombre
  const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
  crystalGeo.scale(1, 2.2, 1);
  crystalGeo.translate(0, 1, 0);
  const cr = new THREE.InstancedMesh(crystalGeo, new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), crystals.length);
  crystals.forEach((c, i) => {
    q.setFromEuler(new THREE.Euler((rnd(i, 30) - 0.5) * 0.5, rnd(i, 31) * 6, (rnd(i, 32) - 0.5) * 0.5));
    m4.compose(new THREE.Vector3(c.x, 0, -c.y), q, new THREE.Vector3(c.s, (c.h / 2.2) * 0.9, c.s));
    cr.setMatrixAt(i, m4);
    cr.setColorAt(i, new THREE.Color(c.c));
  });
  g.add(cr);

  // lanternes de pierre chaudes, près du bord : le contraste chaud / froid
  for (const l of lanterns) {
    const lg = new THREE.Group();
    const stone = new THREE.MeshToonMaterial({ color: '#8C93B8', gradientMap: getToonGradient() });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), stone);
    base.position.y = 0.4;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshBasicMaterial({ color: '#FFC46A' }));
    lamp.position.y = 0.98;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), new THREE.MeshToonMaterial({ color: '#F4F8FF', gradientMap: getToonGradient() }));
    roof.position.y = 1.22;
    lg.add(base, lamp, roof);
    lg.position.set(l.x, 0, -l.y);
    g.add(lg);
  }
  return g;
}

/** Flocons et poussière de cristal, en suspension au-dessus de l'arène. */
export function iceMotes(f: Floor): THREE.Points {
  const n = 420;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -10 + rnd(i, 40) * (f.w + 20);
    pos[i * 3 + 1] = 0.3 + rnd(i, 41) * 9;
    pos[i * 3 + 2] = -(-10 + rnd(i, 42) * (f.h + 20));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#DDF4FF', size: 0.09, transparent: true, opacity: 0.8, depthWrite: false }));
  pts.userData.bounds = { x0: -10, x1: f.w + 10, z0: -(f.h + 10), z1: 10 };
  return pts;
}

export function driftMotes(p: THREE.Points, dt: number, t: number) {
  const a = p.geometry.getAttribute('position') as THREE.BufferAttribute;
  const b = p.userData.bounds as { x0: number; x1: number; z0: number; z1: number };
  for (let i = 0; i < a.count; i++) {
    let y = a.getY(i) - dt * (0.25 + (i % 5) * 0.06);
    let x = a.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.25;
    if (y < 0.1) y = 9;
    if (x > b.x1) x = b.x0;
    a.setXY(i, x, y);
  }
  a.needsUpdate = true;
}
