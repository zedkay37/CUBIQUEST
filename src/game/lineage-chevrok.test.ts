import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom } from '../../tools/headlessDom';
import { MOVES, SPECIES, SUMMON_RARITY } from './catalog';
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

test('Lignée Chevrok -> Mouflambre -> Bélithan : données, style, évolutions, Cube Scellé, modèle', () => {
  const chain = ['chevrok', 'mouflambre', 'belithan'].map((id) => SPECIES[id]);
  for (const s of chain) {
    assert.ok(s);
    assert.equal(s.element, 'rock');
    assert.equal(s.archetype, 'ram');
    assert.deepEqual(checkSpeciesStyle(s), []);
  }
  assert.deepEqual([...checkMoveStyle('horn_charge'), ...checkMoveStyle('amber_quake')], []);
  assert.equal(MOVES[chain[0].moveId].style, 'dash');
  assert.equal(chain[1].moveId, chain[0].moveId); // les deux premiers stades partagent le sort simple
  assert.equal(MOVES[chain[2].moveId].style, 'aoe');

  // deux évolutions successives aux niveaux prévus
  let save = createInitialSaveState('pyrocube', true);
  const cub = createOwnedCreature('chevrok', chain[0].evolveLevel! - 1, 0, 'test_chevrok');
  save = { ...save, roster: [...save.roster, cub] };
  assert.equal(canEvolve(cub), false);
  for (const [level, expected] of [
    [chain[0].evolveLevel!, 'mouflambre'],
    [chain[1].evolveLevel!, 'belithan'],
  ] as const) {
    save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level } : c)) };
    save = evolveCreature(save, cub.uid);
    assert.equal(save.roster.find((c) => c.uid === cub.uid)!.speciesId, expected);
  }
  assert.equal(canEvolve(save.roster.find((c) => c.uid === cub.uid)!), false);
  assert.equal(save.roster.find((c) => c.uid === cub.uid)!.moveId, 'amber_quake');

  // Cube Scellé (A2.2) : la forme de base a une rareté d'invocation
  assert.ok(SUMMON_RARITY.chevrok);

  // modèle : un peu plus riche à chaque stade
  const blocks = chain.map((s) => countBlocks(s.id));
  assert.ok(blocks[0] < blocks[1] && blocks[1] < blocks[2], blocks.join(' / '));
  assert.ok(blocks[2] <= 30);
});
