import test from 'node:test';
import assert from 'node:assert/strict';
import { SUMMON } from './balance';
import { SPECIES, SUMMON_RARITY } from './catalog';
import { createInitialSaveState, createOwnedCreature } from './rules';
import { addSealedCubes, bondMultiplier, displayedOdds, lineageOf, openSealedCube, pickLineage, rollTier } from './summon';
import type { SaveState } from './types';

/** Générateur à suite imposée (puis 0,5). */
const seq = (...xs: number[]) => () => (xs.length ? xs.shift()! : 0.5);
const withCube = (save: SaveState, material: 'wood' | 'stone' | 'crystal' | 'prism') => addSealedCubes(save, [material]).nextSave;

test('Cube Scellé: 14 lignées, 6 communes, 4 peu communes, 4 rares ; formes de base seulement', () => {
  const r = Object.values(SUMMON_RARITY);
  assert.equal(r.length, 14);
  assert.equal(r.filter((x) => x === 'common').length, 6);
  assert.equal(r.filter((x) => x === 'uncommon').length, 4);
  assert.equal(r.filter((x) => x === 'rare').length, 4);
  for (const id of Object.keys(SUMMON_RARITY)) assert.equal(lineageOf(id), id, id);
  assert.equal(lineageOf('raicube'), 'voltik');
  for (const odds of Object.values(SUMMON.odds)) assert.ok(Math.abs(odds.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('Cube Scellé: tables de chances par matière', () => {
  assert.equal(rollTier('wood', seq(0.74)), 'common');
  assert.equal(rollTier('wood', seq(0.96)), 'uncommon');
  assert.equal(rollTier('wood', seq(0.99)), 'rare');
  assert.equal(rollTier('prism', seq(0.1)), 'uncommon');
  assert.equal(rollTier('prism', seq(0.9)), 'awakened');
  assert.deepEqual(displayedOdds('wood', 0.5), SUMMON.odds.wood);
  // jauge pleine : seules la rare et l'éveillée restent
  assert.deepEqual(displayedOdds('wood', 1).slice(0, 2), [0, 0]);
});

test('Cube Scellé: jauge d’Éveil (+10 % sans rare, rare garantie à 100 %, puis remise à zéro)', () => {
  let save = createInitialSaveState('braise', true);
  for (let i = 0; i < 3; i++) {
    save = withCube(save, 'wood');
    save = openSealedCube(save, save.sealedCubes[0].id, null, seq(0.1, 0.1))!.nextSave;
  }
  assert.equal(save.awakenGauge, 0.3);
  save = { ...save, awakenGauge: 1 };
  save = withCube(save, 'wood');
  const r = openSealedCube(save, save.sealedCubes[0].id, null, seq(0.1, 0.1))!;
  assert.equal(r.result.pityUsed, true);
  assert.equal(r.result.tier, 'rare');
  assert.equal(SUMMON_RARITY[r.result.speciesId], 'rare');
  assert.equal(r.nextSave.awakenGauge, 0);
});

test('Cube Scellé: Appât (60 % de son élément, consommé) ; sans Appât en stock, il n’agit pas', () => {
  let save: SaveState = { ...createInitialSaveState('braise', true), baits: { water: 1 } };
  save = withCube(save, 'wood');
  // commune, puis 0,1 < 0,6 : la lignée commune d'Eau (Aquabloc)
  const r = openSealedCube(save, save.sealedCubes[0].id, 'water', seq(0.1, 0.1, 0))!;
  assert.equal(r.result.speciesId, 'aquabloc');
  assert.equal(r.result.baitUsed, 'water');
  assert.equal(r.nextSave.baits.water, 0);
  assert.equal(pickLineage('common', 'water', seq(0.7, 0)), 'pyrocube'); // 0,7 > 0,6 : pas d'effet
  const noStock = withCube(createInitialSaveState('braise', true), 'wood');
  assert.equal(openSealedCube(noStock, noStock.sealedCubes[0].id, 'water', seq(0.1, 0.1, 0))!.result.baitUsed, null);
});

test('Cube Scellé: doublons -> Lien, variante au 5ᵉ, puis jauge +25 % ; aucune créature en double', () => {
  let save = createInitialSaveState('braise', true); // Pyrocube déjà recruté
  const rosterSize = save.roster.length;
  for (let i = 1; i <= 6; i++) {
    save = withCube(save, 'wood');
    const r = openSealedCube(save, save.sealedCubes[0].id, null, seq(0.1, 0))!; // commune, première lignée : Pyrocube
    assert.equal(r.result.speciesId, 'pyrocube');
    assert.equal(r.result.duplicate, true);
    save = r.nextSave;
    if (i === 5) assert.equal(r.result.variantUnlocked, true);
  }
  assert.equal(save.roster.length, rosterSize);
  assert.equal(save.bonds.pyrocube, 5);
  assert.deepEqual(save.variantsUnlocked, ['pyrocube']);
  assert.ok(save.awakenGauge >= SUMMON.duplicateAwakenBonus);
  assert.equal(bondMultiplier(5), 1.2);
  assert.equal(bondMultiplier(2.9), 1.08);
});

test('Cube Scellé: forme éveillée seulement dans un Prisme et pour une lignée recrutée', () => {
  let save = withCube(createInitialSaveState('braise', true), 'prism');
  const r = openSealedCube(save, save.sealedCubes[0].id, null, seq(0.95, 0))!;
  assert.equal(r.result.tier, 'awakened');
  assert.equal(lineageOf(r.result.speciesId) !== r.result.speciesId, true);
  assert.ok(['pyrocube', 'voltik', 'cailloc'].includes(lineageOf(r.result.speciesId)));
  assert.ok(r.nextSave.roster.some((c) => c.speciesId === r.result.speciesId));
  // aucune lignée recrutée qui évolue : la forme éveillée devient une rare
  save = withCube({ ...createInitialSaveState('braise', true), roster: [createOwnedCreature('nimbulle', 5, 0, 'x')], squadIds: ['x'] }, 'prism');
  const r2 = openSealedCube(save, save.sealedCubes[0].id, null, seq(0.95, 0))!;
  assert.ok(SPECIES.nimbulle.evolvesTo ? r2.result.tier === 'awakened' : r2.result.tier === 'rare');
  // même graine, même résultat
  const a = openSealedCube(withCube(createInitialSaveState('maree', true), 'crystal'), 'cube_1', null, seq(0.5, 0.3))!;
  const b = openSealedCube(withCube(createInitialSaveState('maree', true), 'crystal'), 'cube_1', null, seq(0.5, 0.3))!;
  assert.deepEqual(a.result, b.result);
});

test('Cube Scellé: inventaire de 50 au plus, identifiants uniques', () => {
  let save = createInitialSaveState('braise', true);
  save = addSealedCubes(save, Array(60).fill('wood')).nextSave;
  assert.equal(save.sealedCubes.length, 50);
  assert.equal(new Set(save.sealedCubes.map((c) => c.id)).size, 50);
});
