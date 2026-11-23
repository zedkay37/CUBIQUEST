/**
 * `npm run vox:check [fichiers…]` : relit chaque .vox avec un lecteur indépendant (ni celui du jeu, ni l'écrivain)
 * et vérifie les règles du sprint BESTIAIRE (§3.2, §4.2, §4.4). Sans argument : tous les fichiers de
 * `src/assets/vox/`. Code de sortie non nul au premier fichier en échec.
 *
 * Vérifié : en-tête « VOX » et version 150 ; voxels dans les bornes de SIZE ; z min = 0 ; indices 1 à 255 ;
 * symétrie gauche/droite parfaite (pattes 250–252 et 253–255 échangées) ; présence des yeux (248) ; aucune lueur
 * (240–247) collée à une patte (elle ne suivrait pas l'animation) ; dimensions dans les limites : largeur X de
 * 12 à 20, longueur Y ≤ 34, hauteur Z de 14 à 30.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Parsed {
  version: number;
  size: [number, number, number] | null;
  voxels: [number, number, number, number][];
  hasRgba: boolean;
}

function read(buf: Buffer): Parsed {
  if (buf.length < 8 || buf.toString('latin1', 0, 4) !== 'VOX ') throw new Error('en-tête invalide');
  const out: Parsed = { version: buf.readInt32LE(4), size: null, voxels: [], hasRgba: false };
  let seenXyzi = false;
  const walk = (start: number, end: number) => {
    let p = start;
    while (p + 12 <= end) {
      const id = buf.toString('latin1', p, p + 4);
      const n = buf.readInt32LE(p + 4);
      const m = buf.readInt32LE(p + 8);
      const body = p + 12;
      if (id === 'SIZE' && !out.size) out.size = [buf.readInt32LE(body), buf.readInt32LE(body + 4), buf.readInt32LE(body + 8)];
      else if (id === 'XYZI' && !seenXyzi) {
        seenXyzi = true;
        const count = buf.readInt32LE(body);
        for (let k = 0; k < count; k++) {
          const q = body + 4 + k * 4;
          out.voxels.push([buf[q], buf[q + 1], buf[q + 2], buf[q + 3]]);
        }
      } else if (id === 'RGBA') out.hasRgba = true;
      if (m) walk(body + n, body + n + m);
      p = body + n + m;
    }
  };
  walk(8, buf.length);
  return out;
}

const LIMITS = { x: [12, 20], y: [1, 34], z: [14, 30] } as const;
const swapLeg = (i: number) => (i >= 250 && i <= 252 ? i + 3 : i >= 253 && i <= 255 ? i - 3 : i);
const isLeg = (i: number) => i >= 250 && i <= 255;
const isGlow = (i: number) => i >= 240 && i <= 247;

export function checkVox(buf: Buffer): string[] {
  const errors: string[] = [];
  const v = read(buf);
  if (v.version !== 150) errors.push(`version ${v.version} (150 attendue)`);
  if (!v.size) return [...errors, 'pas de bloc SIZE'];
  if (!v.hasRgba) errors.push('pas de palette (bloc RGBA)');
  const [W, L, H] = v.size;
  const at = new Map<string, number>();
  let zmin = Infinity;
  for (const [x, y, z, i] of v.voxels) {
    if (x >= W || y >= L || z >= H) errors.push(`voxel hors des bornes (${x}, ${y}, ${z})`);
    if (i < 1 || i > 255) errors.push(`indice ${i} hors de 1 à 255`);
    zmin = Math.min(zmin, z);
    at.set(`${x},${y},${z}`, i);
  }
  if (!v.voxels.length) errors.push('aucun voxel');
  if (zmin !== 0) errors.push(`le voxel le plus bas est à z = ${zmin} (0 attendu)`);
  // dimensions réelles occupées
  const xs = v.voxels.map((p) => p[0]);
  const ys = v.voxels.map((p) => p[1]);
  const zs = v.voxels.map((p) => p[2]);
  const dims = { x: Math.max(...xs) - Math.min(...xs) + 1, y: Math.max(...ys) - Math.min(...ys) + 1, z: Math.max(...zs) - Math.min(...zs) + 1 };
  for (const k of ['x', 'y', 'z'] as const) {
    const [lo, hi] = LIMITS[k];
    if (dims[k] < lo || dims[k] > hi) errors.push(`dimension ${k.toUpperCase()} = ${dims[k]} (limites ${lo} à ${hi})`);
  }
  // symétrie : le voxel miroir (selon X, dans la boîte SIZE) existe, avec la patte opposée
  let asym = 0;
  for (const [x, y, z, i] of v.voxels) if (at.get(`${W - 1 - x},${y},${z}`) !== swapLeg(i)) asym++;
  if (asym) errors.push(`symétrie gauche/droite : ${asym} voxel(s) sans miroir`);
  if (!v.voxels.some((p) => p[3] === 248)) errors.push('pas d’yeux (indice 248)');
  let glowOnLeg = 0;
  for (const [x, y, z, i] of v.voxels) {
    if (!isGlow(i)) continue;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]])
      if (isLeg(at.get(`${x + dx},${y + dy},${z + dz}`) ?? 0)) {
        glowOnLeg++;
        break;
      }
  }
  if (glowOnLeg) errors.push(`${glowOnLeg} voxel(s) de lueur collés à une patte`);
  return errors;
}

if (process.argv[1]?.endsWith('vox-check.ts')) {
  const args = process.argv.slice(2);
  const files = args.length ? args : existsSync('src/assets/vox') ? readdirSync('src/assets/vox').filter((f) => f.endsWith('.vox')).map((f) => join('src/assets/vox', f)) : [];
  if (!files.length) console.log('vox:check : aucun fichier .vox dans src/assets/vox/ (rien à vérifier).');
  let bad = 0;
  for (const f of files) {
    let errors: string[];
    try {
      errors = checkVox(readFileSync(f));
    } catch (e) {
      errors = [(e as Error).message];
    }
    console.log(`${errors.length ? 'ÉCHEC' : 'ok   '} ${f}${errors.length ? '\n  - ' + errors.join('\n  - ') : ''}`);
    if (errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
