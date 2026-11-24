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
  // un voxel de CORPS décalé d'un cran en X : accepté (petits détails asymétriques permis, porte du lot 4)
  const bodyAsym = Buffer.from(ref);
  const at = (q: number, k: number) => bodyAsym[xyzi + 16 + q * 4 + k];
  const taken = new Set<string>();
  for (let q = 0; q < count; q++) taken.add(`${at(q, 0)},${at(q, 1)},${at(q, 2)}`);
  let moved = false;
  for (let q = 0; q < count && !moved; q++) {
    if (at(q, 3) >= 240 || at(q, 0) === 0) continue;
    if (taken.has(`${at(q, 0) - 1},${at(q, 1)},${at(q, 2)}`)) continue;
    bodyAsym[xyzi + 16 + q * 4] = at(q, 0) - 1; // déplacé vers une case vide : le corps n'est plus symétrique
    moved = true;
  }
  assert.ok(moved);
  assert.ok(!checkVox(bodyAsym).some((e) => e.includes('symétrie')));
  // un ŒIL décalé d'un cran en X : refusé
  const asym = Buffer.from(ref);
  let e0 = 0;
  while (asym[xyzi + 16 + e0 * 4 + 3] !== 248) e0++;
  asym[xyzi + 16 + e0 * 4] = Math.min(255, asym[xyzi + 16 + e0 * 4] + 1);
  assert.ok(checkVox(asym).some((e) => e.includes('symétrie')));
  // mauvaise version
  const v149 = Buffer.from(ref);
  v149.writeInt32LE(149, 4);
  assert.ok(checkVox(v149).some((e) => e.includes('version')));
});

test('vox:build (BESTIAIRE) : les .vox du dépôt sont ceux que donnent les scripts (déterministes) et passent vox:check', async () => {
  const { readdirSync } = await import('node:fs');
  const ids = readdirSync('tools/vox-studio/species').filter((f) => f.endsWith('.ts') && !f.startsWith('_'));
  assert.ok(ids.length >= 5);
  for (const f of ids) {
    const s = (await import(`../../tools/vox-studio/species/${f}`)) as { ID: string; PALETTE: Parameters<typeof writeVoxBytes>[1]; build: typeof build };
    const bytes = writeVoxBytes(s.build(), s.PALETTE);
    const disk = new Uint8Array(readFileSync(`src/assets/vox/${s.ID}.vox`));
    assert.ok(bytes.length === disk.length && bytes.every((b, i) => b === disk[i]), `${s.ID} : src/assets/vox à régénérer (npm run vox:build)`);
    // plafond de lueur de 10 % pour une créature qui sert de boss, comme `npm run vox:check`
    const { STAGES } = await import('./catalog');
    assert.deepEqual(checkVox(Buffer.from(disk), { boss: STAGES.some((st) => st.bossSpeciesId === s.ID) }), [], s.ID);
  }
});

test('vox:check (BESTIAIRE) : plafond de lueur en surface, 9 % (10 % pour un boss)', () => {
  const ref = readFileSync(REF); // 5,6 % de lueur : passe
  assert.deepEqual(checkVox(ref), []);
  // on passe un voxel de corps sur dix en lueur (241) : bien au-dessus du plafond
  const hot = Buffer.from(ref);
  const xyzi = hot.indexOf('XYZI');
  const count = hot.readInt32LE(xyzi + 12);
  for (let k = 0; k < count; k += 7) {
    const p = xyzi + 16 + k * 4 + 3;
    if (hot[p] >= 1 && hot[p] <= 3) hot[p] = 241;
  }
  assert.ok(checkVox(hot).some((e) => e.includes('lueur en surface')));
  assert.ok(checkVox(hot, { boss: true }).some((e) => e.includes('boss')));
});

test('Cendrox (BESTIAIRE) : la forme du Calcinarque légendaire validé est inchangée (seules les couleurs bougent)', async () => {
  const { build: cendrox } = await import('../../tools/vox-studio/species/cendrox');
  const a = build();
  const b = cendrox();
  assert.deepEqual([b.w, b.l, b.h], [a.w, a.l, a.h]);
  for (let i = 0; i < a.v.length; i++) assert.equal(b.v[i] > 0, a.v[i] > 0, `voxel ${i}`);
});
