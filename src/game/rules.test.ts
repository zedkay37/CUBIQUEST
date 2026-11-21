import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExpeditionRewards,
  calculateDamage,
  canEquipStone,
  canEvolve,
  claimAchievementReward,
  claimQuestReward,
  collectCookedCreature,
  computeBossPhase,
  computeCreatureStats,
  computeSquadPower,
  computeStatusDuration,
  computeUltimateCharge,
  countClaimableRewards,
  createInitialSaveState,
  createOwnedCreature,
  equipMoveStone,
  equipPowerStone,
  evolveCreature,
  exportSaveToJson,
  getAchievementProgress,
  getMoveModifiers,
  getStatusForElement,
  getTypeEffectiveness,
  importSaveFromJson,
  migrateSaveState,
  recordPlayerProgress,
  resolveElementalReaction,
  resolveRecipe,
  SAVE_VERSION,
  startCookingPot,
  unequipPowerStone,
} from './rules';
import { ACHIEVEMENTS, MOVES, STAGES } from './catalog';

test('elemental type effectiveness returns accurate multipliers', () => {
  assert.equal(getTypeEffectiveness('water', 'fire'), 1.5);
  assert.equal(getTypeEffectiveness('fire', 'water'), 0.7);
  assert.equal(getTypeEffectiveness('electric', 'water'), 1.5);
  assert.equal(getTypeEffectiveness('grass', 'water'), 1.5);
  assert.equal(getTypeEffectiveness('fire', 'electric'), 1.0);
});

test('recipe resolution identifies specialty and fallback recipes accurately', () => {
  assert.equal(
    resolveRecipe(['mystic_shard', 'mystic_shard', 'ruby_berry', 'azure_drop', 'sun_pollen'])?.id,
    'ambrosia_legends',
  );
  assert.equal(
    resolveRecipe(['ruby_berry', 'ruby_berry', 'ruby_berry', 'pebble_gray', 'sun_pollen'])?.id,
    'fiery_soup',
  );
  assert.equal(
    resolveRecipe(['azure_drop', 'azure_drop', 'azure_drop', 'pebble_gray', 'ruby_berry'])?.id,
    'ocean_nectar',
  );
  assert.equal(
    resolveRecipe(['sun_pollen', 'sun_pollen', 'sun_pollen', 'ruby_berry', 'pebble_gray'])?.id,
    'spark_curry',
  );
  assert.equal(
    resolveRecipe(['pebble_gray', 'pebble_gray', 'pebble_gray', 'ruby_berry', 'azure_drop'])?.id,
    'mineral_stew',
  );
  assert.equal(
    resolveRecipe(['sun_pollen', 'sun_pollen', 'azure_drop', 'azure_drop', 'pebble_gray'])?.id,
    'sweet_crepe',
  );
  assert.equal(
    resolveRecipe(['ruby_berry', 'azure_drop', 'sun_pollen', 'pebble_gray', 'ruby_berry'])?.id,
    'mulligan_stew',
  );
  assert.equal(resolveRecipe(['ruby_berry', 'azure_drop', null, null, null]), null);
});

test('Power Stone board enforces slot type and level lock, and updates squad power', () => {
  const save = createInitialSaveState('pyrocube', true);
  const starter = save.roster[0];
  const initialPower = computeSquadPower(save);

  const atkStone = save.powerStones.find((s) => s.id === 'init_stone_atk_2')!;
  const hpStone = save.powerStones.find((s) => s.id === 'init_stone_hp_2')!;

  // Slot 1 on ranged starter is 'hp' at level 1
  assert.equal(canEquipStone(starter, 1, hpStone), true);
  assert.equal(canEquipStone(starter, 1, atkStone), false);
  // Slot 8 is locked at level 22
  assert.equal(canEquipStone(starter, 8, atkStone), false);

  const equipped = equipPowerStone(save, starter.uid, 1, hpStone.id);
  const nextPower = computeSquadPower(equipped);
  assert.equal(nextPower, initialPower + hpStone.power);

  const unequipped = unequipPowerStone(equipped, starter.uid, 1);
  assert.equal(computeSquadPower(unequipped), initialPower);
});

test('Move Stone modifiers and damage calculation scale properly', () => {
  const mods = getMoveModifiers(['whack_whack', 'broadburst']);
  assert.ok(mods.damageMult > 1.39);
  assert.ok(mods.radiusMult > 1.34);

  const deterministicRng = () => 0.5; // no crit if critRate <= 50, variance = 1.0
  const baseHit = calculateDamage(100, MOVES.ember_burst, 'grass', 0, [], 1, deterministicRng);
  const boostedHit = calculateDamage(
    100,
    MOVES.ember_burst,
    'grass',
    0,
    ['whack_whack'],
    1,
    deterministicRng,
  );
  assert.equal(baseHit.effectiveness, 1.5);
  assert.ok(boostedHit.damage > baseHit.damage);

  const save = createInitialSaveState('pyrocube', true);
  const withStone = equipMoveStone(save, save.roster[0].uid, 0, 'wait_less');
  assert.equal(withStone.roster[0].moveStones[0], 'wait_less');
  assert.equal(withStone.moveStoneBag.wait_less, 0);
});

test('Evolution transforms species when required level is reached', () => {
  const save = createInitialSaveState('pyrocube', true);
  assert.equal(canEvolve(save.roster[0]), false);

  const leveled = {
    ...save,
    roster: save.roster.map((c, idx) => (idx === 0 ? { ...c, level: 8 } : c)),
  };
  assert.equal(canEvolve(leveled.roster[0]), true);

  const evolved = evolveCreature(leveled, leveled.roster[0].uid);
  assert.equal(evolved.roster[0].speciesId, 'flambrix');
  assert.ok(evolved.discoveredSpeciesIds.includes('flambrix'));

  const preStats = computeCreatureStats(leveled.roster[0], leveled.powerStones);
  const postStats = computeCreatureStats(evolved.roster[0], evolved.powerStones);
  assert.ok(postStats.power > preStats.power);
});

test('Cooking Pot consumes ingredients, ticks on expedition, and recruits a creature', () => {
  let save = createInitialSaveState('pyrocube', true);
  save = {
    ...save,
    pot: {
      ...save.pot,
      slots: ['ruby_berry', 'azure_drop', 'sun_pollen', 'pebble_gray', 'ruby_berry'],
    },
  };

  const cooking = startCookingPot(save);
  assert.equal(cooking.pot.status, 'cooking');
  assert.equal(cooking.pot.recipeId, 'mulligan_stew');
  assert.equal(cooking.ingredients.ruby_berry, 4); // 6 - 2

  const { nextSave: afterExp, outcome } = applyExpeditionRewards(
    cooking,
    STAGES[0],
    true,
    { clearTimeSec: 42, wavesCleared: 3, damageDealt: 1200, bossHpPercentRemaining: 0 },
    () => 0.4,
  );

  assert.equal(outcome.victory, true);
  assert.equal(outcome.potReadyNow, true);
  assert.equal(afterExp.pot.status, 'ready');
  assert.equal(afterExp.highestStageIndex, 1);

  const { nextSave: afterCollect, creature } = collectCookedCreature(afterExp, () => 0.25);
  assert.ok(creature !== null);
  assert.equal(afterCollect.roster.length, save.roster.length + 1);
  assert.equal(afterCollect.pot.status, 'idle');
});

test('createOwnedCreature initializes valid 9-slot board', () => {
  const c = createOwnedCreature('bourgeon', 10, 35);
  assert.equal(c.stoneBoard.length, 9);
  assert.equal(c.level, 10);
  assert.equal(c.potBonus, 35);
});

test('V0.2 elemental reactions and status resistance compute deterministically', () => {
  assert.equal(getStatusForElement('fire'), 'burn');
  assert.equal(getStatusForElement('water'), 'soaked');
  assert.equal(resolveElementalReaction('burn', 'water')?.id, 'evaporation');
  assert.equal(resolveElementalReaction('soaked', 'fire')?.id, 'evaporation');
  assert.equal(resolveElementalReaction('rooted', 'fire')?.id, 'ignition');
  assert.equal(resolveElementalReaction('soaked', 'electric')?.id, 'electrocution');
  assert.equal(resolveElementalReaction('burn', 'electric')?.id, 'overload');
  assert.equal(resolveElementalReaction('sunder', 'fire')?.id, 'crystallize');
  // Règle voulue : Psy + AUTRE élément (même élément => pas de réaction)
  assert.equal(resolveElementalReaction('confused', 'fire')?.id, 'psy_resonance');
  assert.equal(resolveElementalReaction('confused', 'psychic'), null);
  assert.equal(resolveElementalReaction('burn', 'fire'), null);

  const baseDur = computeStatusDuration('burn', 0);
  const resistedDur = computeStatusDuration('burn', 50);
  assert.ok(resistedDur < baseDur);
  // Plancher de la règle : jamais moins de 1 s, même avec une résistance extrême
  assert.ok(computeStatusDuration('burn', 200) >= 1.0);
});

test('V0.2 boss phases and ultimate gauge clamp properly', () => {
  // 2-phase boss
  assert.equal(computeBossPhase(900, 1000, false), 1);
  assert.equal(computeBossPhase(500, 1000, false), 2);
  assert.equal(computeBossPhase(100, 1000, false), 2);
  // 3-phase final biome boss
  assert.equal(computeBossPhase(750, 1000, true), 1);
  assert.equal(computeBossPhase(450, 1000, true), 2);
  assert.equal(computeBossPhase(240, 1000, true), 3);

  assert.equal(computeUltimateCharge(92, 15), 100);
  assert.equal(computeUltimateCharge(10, -25), 0);
});

test('V0.2 quests and achievements track progress, grant rewards, and rotate cleanly', () => {
  let save = createInitialSaveState('pyrocube', true);
  assert.equal(save.activeQuests.length, 3);
  assert.equal(countClaimableRewards(save), 0);

  // Advance progress to complete first expedition quest & achievement
  save = recordPlayerProgress(save, {
    expeditionsWon: 2,
    bossesDefeated: 2,
    reactionsTriggered: 4,
    ultimatesUsed: 1,
    perfectDodges: 2,
    maxCombo: 18,
  });

  const firstQuest = save.activeQuests[0];
  assert.equal(firstQuest.progress, firstQuest.target);
  assert.ok(countClaimableRewards(save) >= 2);

  const prevStones = save.powerStones.length;
  const afterQuestClaim = claimQuestReward(save, firstQuest.uid, () => 0.1);
  assert.equal(afterQuestClaim.activeQuests.length, 3);
  assert.notEqual(afterQuestClaim.activeQuests[0].uid, firstQuest.uid);
  assert.ok(afterQuestClaim.powerStones.length >= prevStones);

  // Claim an unlocked achievement once, verify idempotency
  const winAch = ACHIEVEMENTS.find((a) => a.id === 'ach_first_win')!;
  assert.ok(getAchievementProgress(afterQuestClaim, winAch) >= winAch.target);
  const afterAch = claimAchievementReward(afterQuestClaim, winAch.id, () => 0.2);
  assert.ok(afterAch.claimedAchievementIds.includes(winAch.id));
  const afterDupAch = claimAchievementReward(afterAch, winAch.id, () => 0.2);
  assert.equal(afterDupAch.claimedAchievementIds.length, afterAch.claimedAchievementIds.length);
});

test('V0.2 SaveState v1 -> v2 migration and JSON export/import validation', () => {
  const freshV2 = createInitialSaveState('aquabloc', true);
  const legacyV1: Record<string, unknown> = {
    version: 1,
    starterChosen: true,
    squadIds: freshV2.squadIds,
    roster: freshV2.roster,
    ingredients: { ...freshV2.ingredients, ruby_berry: 19 },
    powerStones: freshV2.powerStones,
    moveStoneBag: freshV2.moveStoneBag,
    pot: freshV2.pot,
    unlockedPotTiers: ['iron', 'bronze'],
    highestStageIndex: 4,
    completedStageIds: ['meadow-1', 'meadow-2', 'meadow-3', 'shore-1'],
    discoveredSpeciesIds: freshV2.discoveredSpeciesIds,
    discoveredRecipeIds: ['mulligan_stew'],
    expeditionsCompleted: 7,
  };

  const migrated = migrateSaveState(legacyV1);
  assert.ok(migrated !== null);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.ingredients.ruby_berry, 19);
  assert.equal(migrated.highestStageIndex, 4);
  assert.equal(migrated.stats.expeditionsWon, 7);
  assert.equal(migrated.activeQuests.length, 3);

  const exported = exportSaveToJson(migrated);
  const imported = importSaveFromJson(exported);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.save.ingredients.ruby_berry, 19);
    assert.equal(imported.save.stats.expeditionsWon, 7);
  }

  // Corrupt & invalid imports must return clear errors
  const badSyntax = importSaveFromJson('{ invalid json');
  assert.equal(badSyntax.ok, false);
  const badStructure = importSaveFromJson(JSON.stringify({ version: 99, foo: 'bar' }));
  assert.equal(badStructure.ok, false);
});
