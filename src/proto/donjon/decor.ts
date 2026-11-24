/**
 * PROTO-DONJON : décor des salles. Phase 1 : les torches seulement (repères et lumière).
 */
import * as THREE from 'three';
import { getToonGradient } from '../../components/styles/magmaStyles';
import type { Vec } from '../sim';
import { T_WALL, type Floor } from './gen';
import type { EnvShared } from './env';

export function buildDecor(f: Floor, _shared: EnvShared, patch: (m: THREE.Material, fade: boolean) => void): { group: THREE.Group; count: number; lights: Vec[] } {
  const group = new THREE.Group();
  const lights: Vec[] = [];
  const stick = new THREE.MeshToonMaterial({ color: '#5A3A22', gradientMap: getToonGradient() });
  const flame = new THREE.MeshBasicMaterial({ color: f.biome === 'grotte' ? '#B9A2FF' : '#FFC24A' });
  patch(stick, true);
  patch(flame, false);
  for (const room of f.rooms) {
    const [x0, , x1, y1] = room.rect;
    // torches sur le mur du fond (nord), une case sur cinq
    for (let x = x0 + 2; x < x1 - 2; x += 5) {
      const y = y1 - 1;
      if (f.tiles[y * f.w + x] !== T_WALL) continue;
      const t = new THREE.Group();
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), stick);
      s.position.y = 1.4;
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), flame);
      fl.position.y = 1.82;
      t.add(s, fl);
      t.position.set(x + 0.5, 0, -(y - 0.1));
      group.add(t);
      lights.push({ x: x + 0.5, y: y - 0.6 });
    }
  }
  return { group, count: lights.length, lights };
}
