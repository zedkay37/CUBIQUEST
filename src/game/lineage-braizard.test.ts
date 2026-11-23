import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom } from '../../tools/headlessDom';
import { MOVES, SPECIES, STAGES, SUMMON_RARITY } from './catalog';
import { canEvolve, createInitialSaveState, createOwnedCreature, evolveCreature } from './rules';
import { checkMoveStyle, checkSpeciesStyle } from './styleGuide';
import { buildVoxelCreature } from './voxelModels';

installHeadlessDom();

const countBlocks = (id: string): number => {
  let n = -1; // ombre de contact
  buildVoxelCreature(id).root.traverse((node) => {
    if ((node as { isMesh?: boolean }).isMesh) n += 1;
  });
  return n;
};

test('Lignée Braizard -> Cendrox : données, style, évolution, Cube Scellé, rencontres, modèle', () => {
  const base = SPECIES.braizard;
  const final = SPECIES.cendrox;
  assert.ok(base && final);
  assert.equal(base.element, 'fire');
  assert.equal(final.element, 'fire');
  assert.equal(base.evolvesTo, 'cendrox');
  assert.equal(final.evolvesTo, undefined);
  assert.deepEqual([...checkSpeciesStyle(base), ...checkSpeciesStyle(final)], []);
  assert.deepEqual([...checkMoveStyle('ember_claw'), ...checkMoveStyle('cinder_wave')], []);
  assert.equal(MOVES[base.moveId].style, 'melee');
  assert.equal(MOVES[final.moveId].style, 'aoe');

  // évolution au niveau prévu, pas avant
  let save = createInitialSaveState('pyrocube', true);
  const cub = createOwnedCreature('braizard', base.evolveLevel! - 1, 0, 'test_braizard');
  save = { ...save, roster: [...save.roster, cub] };
  assert.equal(canEvolve(cub), false);
  save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level: base.evolveLevel! } : c)) };
  save = evolveCreature(save, cub.uid);
  const evolved = save.roster.find((c) => c.uid === cub.uid)!;
  assert.equal(evolved.speciesId, 'cendrox');
  assert.equal(evolved.moveId, 'cinder_wave');
  assert.ok(save.discoveredSpeciesIds.includes('cendrox'));

  // Cube Scellé (A2.2) : la forme de base a une rareté d'invocation
  assert.ok(SUMMON_RARITY.braizard);

  // rencontres : présent sur la Crête, et le stade final plus loin dans le jeu
  const seenIn = (id: string) =>
    STAGES.filter((s) => s.waves.some((w) => w.enemies.some((e) => e.speciesId === id))).map((s) => s.biomeId);
  assert.ok(seenIn('braizard').includes('volcano'));
  assert.ok(seenIn('cendrox').length >= 1);

  // modèle : silhouette propre, enrichie au stade final
  assert.equal(base.archetype, 'lizard');
  assert.ok(countBlocks('cendrox') > countBlocks('braizard'));
  assert.ok(countBlocks('cendrox') <= 30);
});
