import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom } from '../../tools/headlessDom';
import { MOVES, RECIPE_BY_ID, SPECIES, STAGES } from './catalog';
import { canEvolve, createInitialSaveState, createOwnedCreature, evolveCreature, rollCreatureFromPot } from './rules';
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

test('Lignée Mycélin -> Amanitox : données, style, évolution, Marmite, rencontres, modèle', () => {
  const base = SPECIES.mycelin;
  const final = SPECIES.amanitox;
  assert.ok(base && final);
  assert.equal(base.element, 'grass');
  assert.equal(final.element, 'grass');
  assert.equal(base.evolvesTo, 'amanitox');
  assert.equal(final.evolvesTo, undefined);
  assert.deepEqual([...checkSpeciesStyle(base), ...checkSpeciesStyle(final)], []);
  assert.deepEqual([...checkMoveStyle('spore_shot'), ...checkMoveStyle('fungal_bloom')], []);
  assert.equal(MOVES[base.moveId].style, 'projectile');
  assert.equal(MOVES[final.moveId].style, 'aoe');

  // évolution au niveau prévu, pas avant
  let save = createInitialSaveState('pyrocube', true);
  const cub = createOwnedCreature('mycelin', base.evolveLevel! - 1, 0, 'test_mycelin');
  save = { ...save, roster: [...save.roster, cub] };
  assert.equal(canEvolve(cub), false);
  save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level: base.evolveLevel! } : c)) };
  save = evolveCreature(save, cub.uid);
  const evolved = save.roster.find((c) => c.uid === cub.uid)!;
  assert.equal(evolved.speciesId, 'amanitox');
  assert.equal(evolved.moveId, 'fungal_bloom');
  assert.ok(save.discoveredSpeciesIds.includes('amanitox'));

  // Marmite : recrutable par la recette de son élément et par la recette de départ
  assert.ok(RECIPE_BY_ID.botanical_broth.poolSpeciesIds.includes('mycelin'));
  assert.ok(RECIPE_BY_ID.botanical_broth.poolSpeciesIds.includes('amanitox'));
  assert.ok(RECIPE_BY_ID.mulligan_stew.poolSpeciesIds.includes('mycelin'));
  const pool = RECIPE_BY_ID.botanical_broth.poolSpeciesIds;
  const roll = (pool.indexOf('mycelin') + 0.5) / pool.length;
  assert.equal(rollCreatureFromPot('iron', RECIPE_BY_ID.botanical_broth, () => roll).speciesId, 'mycelin');
  // le stade de base vient avant le stade final (les marmites d'argent et d'or favorisent la fin)
  assert.ok(pool.indexOf('mycelin') < pool.indexOf('amanitox'));

  // rencontres : présent dans la Prairie, et le stade final plus loin dans le jeu
  const seenIn = (id: string) =>
    STAGES.filter((s) => s.waves.some((w) => w.enemies.some((e) => e.speciesId === id))).map((s) => s.biomeId);
  assert.ok(seenIn('mycelin').includes('meadow'));
  assert.ok(seenIn('amanitox').length >= 1);

  // modèle : silhouette propre, enrichie au stade final
  assert.equal(base.archetype, 'fungal');
  assert.ok(countBlocks('amanitox') > countBlocks('mycelin'));
  assert.ok(countBlocks('amanitox') <= 30);
});
