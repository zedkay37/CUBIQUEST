import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVox, voxToSculptDef, writeVox, registerVoxModel, getVoxDef } from './models/voxFile';
import { buildSculptRig } from './models/voxelSculpt';
import { buildExampleVox } from '../../tools/voxExemple';

const toArrayBuffer = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

test('Vox (ART3) : le fichier d\'exemple généré par le script se relit à l\'identique', () => {
  const file = readFileSync('tools/fixtures/exemple-essai.vox');
  const model = parseVox(toArrayBuffer(new Uint8Array(file)));
  const fresh = buildExampleVox();
  assert.deepEqual(model.size, fresh.size);
  assert.equal(model.voxels.length, fresh.voxels.length);
  assert.equal(model.palette[1], fresh.palette[1].toLowerCase());
  // aller-retour écriture → lecture
  const again = parseVox(toArrayBuffer(writeVox(model)));
  assert.deepEqual(again, model);
});

test('Vox (ART3) : rôles de la palette (jambes, yeux, lueur) et orientation (devant vers +Z)', () => {
  const def = voxToSculptDef(buildExampleVox());
  assert.deepEqual(def.legs, ['legL', 'legR']);
  assert.deepEqual(def.eyes?.slice().sort(), ['eyeL', 'eyeR']);
  const v = def.voxels!;
  assert.ok(v.some((p) => p.glow), 'crête lumineuse');
  assert.equal(Math.min(...v.map((p) => p.y)), 0, 'posé au sol');
  const eyeZ = Math.max(...v.filter((p) => p.group.startsWith('eye')).map((p) => p.z));
  assert.equal(eyeZ, Math.max(...v.map((p) => p.z)), 'les yeux sont devant');
  assert.ok(v.some((p) => p.color === 'white'), 'reflet blanc');
});

test('Vox (ART3) : la créature se construit comme celles du code (jambes, yeux, lueur d\'élément) ; aucune espèce remplacée', () => {
  const def = voxToSculptDef(buildExampleVox());
  const pal = { primary: '#888888', secondary: '#666666', belly: '#AAAAAA', accent: '#FFCC00', eye: '#111111', white: '#FFFFFF', dark: '#111111' };
  const rig = buildSculptRig(def, pal, 14, 0.4, 0.16, false, true);
  assert.equal(rig.legs.length, 2);
  assert.equal(rig.eyes.length, 2);
  let glowing = false;
  rig.bodyPivot.traverse((o) => {
    const g = (o as { geometry?: { attributes: Record<string, { array: ArrayLike<number> }> } }).geometry;
    if (g?.attributes.aGlow && Array.from(g.attributes.aGlow.array).some((x) => x > 0)) glowing = true;
  });
  assert.ok(glowing);
  // rien n'est enregistré par défaut : les 9 créatures gardent leur modèle du code
  for (const id of ['pyrocube', 'flambrix', 'ignisaur', 'voltik', 'sparkube', 'raicube', 'cailloc', 'granitox', 'magmadrake']) assert.equal(getVoxDef(id), undefined);
  registerVoxModel('essai', buildExampleVox());
  assert.ok(getVoxDef('essai'));
  registerVoxModel('essai', null);
  assert.equal(getVoxDef('essai'), undefined);
});

test('Vox (ART3) : un fichier invalide est refusé proprement', () => {
  assert.throws(() => parseVox(new ArrayBuffer(4)));
  assert.throws(() => parseVox(toArrayBuffer(new TextEncoder().encode('PAS UN FICHIER VOX....'))));
});
