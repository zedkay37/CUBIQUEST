import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVox } from '../../tools/vox-studio/vox-check';
import { build, PALETTE } from '../../tools/vox-studio/references/calcinarque_legendaire';
import { writeVoxBytes } from '../../tools/vox-studio/voxlib';

const REF = 'tools/vox-studio/references/calcinarque-legendaire.vox';

test('vox-studio (BESTIAIRE) : le portage TypeScript redonne le Calcinarque légendaire de référence, octet pour octet', () => {
  const mine = writeVoxBytes(build(), PALETTE);
  const ref = new Uint8Array(readFileSync(REF));
  assert.equal(mine.length, ref.length);
  assert.ok(mine.every((b, i) => b === ref[i]));
  // déterministe : deux constructions, même fichier
  assert.deepEqual(writeVoxBytes(build(), PALETTE), mine);
});

test('vox:check (BESTIAIRE) : la référence passe ; un fichier abîmé est refusé', () => {
  const ref = readFileSync(REF);
  assert.deepEqual(checkVox(ref), []);
  // sans yeux : on remplace l'indice 248 par 2 dans le bloc XYZI
  const noEyes = Buffer.from(ref);
  const xyzi = noEyes.indexOf('XYZI');
  const count = noEyes.readInt32LE(xyzi + 12);
  for (let k = 0; k < count; k++) if (noEyes[xyzi + 16 + k * 4 + 3] === 248) noEyes[xyzi + 16 + k * 4 + 3] = 2;
  assert.ok(checkVox(noEyes).some((e) => e.includes('yeux')));
  // asymétrique : un voxel de corps décalé d'un cran en X
  const asym = Buffer.from(ref);
  asym[xyzi + 16] = Math.min(255, asym[xyzi + 16] + 1);
  assert.ok(checkVox(asym).length > 0);
  // mauvaise version
  const v149 = Buffer.from(ref);
  v149.writeInt32LE(149, 4);
  assert.ok(checkVox(v149).some((e) => e.includes('version')));
});
