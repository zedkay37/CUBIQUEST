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

test('Lignée Crabloc -> Crabastion : données, style, évolution, Marmite, rencontres, modèle', () => {
  const base = SPECIES.crabloc;
  const final = SPECIES.crabastion;
  assert.ok(base && final);
  assert.equal(base.element, 'water');
  assert.equal(final.element, 'water');
  assert.equal(base.evolvesTo, 'crabastion');
  assert.equal(final.evolvesTo, undefined);
  assert.deepEqual([...checkSpeciesStyle(base), ...checkSpeciesStyle(final)], []);
  assert.deepEqual([...checkMoveStyle('claw_snap'), ...checkMoveStyle('tide_crush')], []);
  assert.equal(MOVES[base.moveId].style, 'melee');
  assert.equal(MOVES[final.moveId].style, 'aoe');

  // évolution au niveau prévu, pas avant
  let save = createInitialSaveState('pyrocube', true);
  const cub = createOwnedCreature('crabloc', base.evolveLevel! - 1, 0, 'test_crabloc');
  save = { ...save, roster: [...save.roster, cub] };
  assert.equal(canEvolve(cub), false);
  save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level: base.evolveLevel! } : c)) };
  save = evolveCreature(save, cub.uid);
  const evolved = save.roster.find((c) => c.uid === cub.uid)!;
  assert.equal(evolved.speciesId, 'crabastion');
  assert.equal(evolved.moveId, 'tide_crush');
  assert.ok(save.discoveredSpeciesIds.includes('crabastion'));

  // Marmite : recrutable par la recette de son élément et par la crêpe des débutants
  assert.ok(RECIPE_BY_ID.ocean_nectar.poolSpeciesIds.includes('crabloc'));
  assert.ok(RECIPE_BY_ID.ocean_nectar.poolSpeciesIds.includes('crabastion'));
  assert.ok(RECIPE_BY_ID.sweet_crepe.poolSpeciesIds.includes('crabloc'));
  const pool = RECIPE_BY_ID.ocean_nectar.poolSpeciesIds;
  const roll = (pool.indexOf('crabloc') + 0.5) / pool.length;
  assert.equal(rollCreatureFromPot('iron', RECIPE_BY_ID.ocean_nectar, () => roll).speciesId, 'crabloc');
  // le stade de base vient avant le stade final (les marmites d'argent et d'or favorisent la fin)
  assert.ok(pool.indexOf('crabloc') < pool.indexOf('crabastion'));

  // rencontres : présent sur la Rive, et le stade final plus loin dans le jeu
  const seenIn = (id: string) =>
    STAGES.filter((s) => s.waves.some((w) => w.enemies.some((e) => e.speciesId === id))).map((s) => s.biomeId);
  assert.ok(seenIn('crabloc').includes('shore'));
  assert.ok(seenIn('crabastion').length >= 1);

  // modèle : silhouette propre, enrichie au stade final
  assert.equal(base.archetype, 'crab');
  assert.ok(countBlocks('crabastion') > countBlocks('crabloc'));
  assert.ok(countBlocks('crabastion') <= 30);
});
