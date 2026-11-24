import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVox, voxToSculptDef, writeVox, registerVoxModel, getVoxDef, shiftVoxBody, VOX_SNAKE } from './models/voxFile';
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

test('Vox (BESTIAIRE) : un quadrupède a 4 pattes séparées, rangées pour un trot en diagonale ; un bipède en garde 2', () => {
  const file = readFileSync('tools/vox-studio/references/calcinarque-legendaire.vox');
  const def = voxToSculptDef(parseVox(toArrayBuffer(new Uint8Array(file))));
  assert.deepEqual(def.legs, ['legLF', 'legRF', 'legRH', 'legLH']);
  const z = (g: string) => def.voxels!.filter((v) => v.group === g).map((v) => v.z);
  // les pattes avant sont devant (+Z) les pattes arrière, de chaque côté
  assert.ok(Math.min(...z('legLF')) > Math.max(...z('legLH')));
  assert.ok(Math.min(...z('legRF')) > Math.max(...z('legRH')));
  // rangs pairs (même pas) : avant gauche + arrière droite = diagonale
  assert.deepEqual([def.legs![0], def.legs![2]], ['legLF', 'legRH']);
  assert.deepEqual(voxToSculptDef(buildExampleVox()).legs, ['legL', 'legR']);
});

test('Vox (BESTIAIRE) : les créatures du code gardent leurs 2 pattes (aucun changement hors .vox)', async () => {
  const { SCULPT_DEFS } = await import('./models/sculptDefs');
  for (const [id, d] of Object.entries(SCULPT_DEFS)) assert.deepEqual(d.legs, ['legL', 'legR'], id);
});

test('Vox (BESTIAIRE) : fusion des faces : moins de triangles, même surface, même boîte ; rien pour les modèles du code', async () => {
  const file = readFileSync('tools/vox-studio/references/calcinarque-legendaire.vox');
  const def = voxToSculptDef(parseVox(toArrayBuffer(new Uint8Array(file))));
  const pal = { primary: '#888888', secondary: '#666666', belly: '#AAAAAA', accent: '#FFCC00', eye: '#111111', white: '#FFFFFF', dark: '#111111' };
  const stats = (merge: 0 | 1 | 2) => {
    const rig = buildSculptRig(def, pal, 14, 0.4, 0.16, false, true, merge);
    let tris = 0;
    let area = 0;
    rig.bodyPivot.traverse((o) => {
      const g = (o as { geometry?: { index: { count: number; array: ArrayLike<number> }; attributes: Record<string, { array: ArrayLike<number> }> } }).geometry;
      if (!g) return;
      tris += g.index.count / 3;
      const p = g.attributes.position.array;
      const ix = g.index.array;
      for (let t = 0; t < ix.length; t += 3) {
        const [a, b, c] = [ix[t] * 3, ix[t + 1] * 3, ix[t + 2] * 3];
        const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
        const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
        area += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
      }
    });
    return { tris, area };
  };
  const none = stats(0);
  const exact = stats(1);
  const strong = stats(2);
  assert.ok(exact.tris < none.tris && strong.tris < exact.tris, `${none.tris} → ${exact.tris} → ${strong.tris}`);
  assert.ok(Math.abs(exact.area - none.area) < 1e-6 && Math.abs(strong.area - none.area) < 1e-6, 'même surface');
});

test('Vox (BESTIAIRE) : variante de couleur : le corps et les pattes changent de teinte, pas la lueur ni les yeux', () => {
  const file = readFileSync('tools/vox-studio/references/calcinarque-legendaire.vox');
  const def = voxToSculptDef(parseVox(toArrayBuffer(new Uint8Array(file))));
  const shifted = shiftVoxBody(def, () => '#00ff00');
  def.voxels!.forEach((v, i) => {
    const w = shifted.voxels![i];
    const body = v.pi! <= 239 || v.pi! >= 250;
    assert.equal(w.rgb, body ? '#00ff00' : v.rgb, `indice ${v.pi}`);
  });
  assert.ok(def.voxels!.some((v) => v.pi! >= 240 && v.pi! <= 247) && def.voxels!.some((v) => v.pi === 248));
});

// BESTIAIRE lot 5b : une créature sans pattes ondule (tranches animées), les autres ne changent pas
test('Vox (BESTIAIRE) : un serpent sans pattes est coupé en tranches qui ondulent ; une créature à pattes ne change pas', () => {
  const load = (id: string) => {
    const b = readFileSync(`src/assets/vox/${id}.vox`);
    return parseVox(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  };
  for (const id of ['crepitil', 'serpeclair', 'tempestrix']) {
    const def = voxToSculptDef(load(id));
    assert.equal(def.legs?.length, 0, id);
    assert.equal(def.extras?.length, VOX_SNAKE.slices, id);
    assert.ok(def.voxels!.some((v) => v.group === 'body'), `${id} : la tête et le cou restent fixes`);
    assert.equal(def.eyes?.length, 2, id);
  }
  for (const id of ['cendrox', 'aquabloc', 'pyrocube', 'crabloc', 'givrelin', 'voltik']) {
    const def = voxToSculptDef(load(id));
    assert.equal(def.extras, undefined, id);
    assert.ok(def.voxels!.every((v) => !v.group.startsWith('seg')), id);
  }
});
