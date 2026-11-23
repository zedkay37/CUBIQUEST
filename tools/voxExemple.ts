/**
 * ART3 : génère un petit modèle `.vox` d'essai (« créature d'essai ») qui utilise toutes les conventions du jeu :
 * corps, tête, yeux avec reflet, deux jambes, une crête lumineuse. Il ne remplace aucune créature du jeu :
 * on le charge à la main dans `?gallery=art` (bouton « Essayer un .vox ») et vox.test.ts le lit.
 *
 *   npm run vox:exemple            → tools/fixtures/exemple-essai.vox
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { VOX_ROLES, writeVox, type VoxModel } from '../src/game/models/voxFile';

export function buildExampleVox(): VoxModel {
  const palette = Array.from({ length: 257 }, () => '#000000');
  const BODY = 1;
  const BELLY = 2;
  const HEAD = 3;
  palette[BODY] = '#3F7FBF';
  palette[BELLY] = '#E8D9B0';
  palette[HEAD] = '#4C8ED0';
  palette[VOX_ROLES.glow[0]] = '#FFD24A';
  palette[VOX_ROLES.eye] = '#1B1D24';
  palette[VOX_ROLES.eyeShine] = '#FFFFFF';
  palette[VOX_ROLES.legL[0]] = '#2C5A86';
  palette[VOX_ROLES.legR[0]] = '#2C5A86';
  const voxels: VoxModel['voxels'] = [];
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, i: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) voxels.push({ x, y, z, i });
  };
  // MagicaVoxel : Z vers le haut, le devant regarde vers −Y (y = 0)
  box(3, 5, 4, 7, 0, 3, VOX_ROLES.legL[0]); // jambe gauche
  box(10, 12, 4, 7, 0, 3, VOX_ROLES.legR[0]);
  box(2, 13, 2, 11, 4, 11, BODY); // corps
  box(5, 10, 1, 1, 5, 9, BELLY); // ventre
  box(2, 13, 2, 11, 12, 19, HEAD); // tête
  box(4, 6, 1, 1, 14, 17, VOX_ROLES.eye); // yeux
  box(9, 11, 1, 1, 14, 17, VOX_ROLES.eye);
  box(4, 4, 0, 0, 17, 17, VOX_ROLES.eyeShine); // reflets
  box(9, 9, 0, 0, 17, 17, VOX_ROLES.eyeShine);
  box(6, 9, 5, 8, 20, 22, VOX_ROLES.glow[0]); // crête lumineuse
  // dernier gagnant : un bloc posé deux fois garde sa dernière couleur
  const seen = new Map<string, VoxModel['voxels'][number]>();
  for (const v of voxels) seen.set(`${v.x},${v.y},${v.z}`, v);
  return { size: [16, 13, 24], voxels: [...seen.values()], palette };
}

if (process.argv[1]?.endsWith('voxExemple.ts')) {
  mkdirSync('tools/fixtures', { recursive: true });
  writeFileSync('tools/fixtures/exemple-essai.vox', writeVox(buildExampleVox()));
  console.log('tools/fixtures/exemple-essai.vox écrit');
}
