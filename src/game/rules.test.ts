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
  computeHighestUnlockedStageIndex,
  getBiomeProgress,
  isBiomeUnlocked,
  isQuestTemplateAvailable,
  computeSquadPower,
  computeStatusDuration,
  computeUltimateCharge,
  computeVictoryStars,
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
import {
  ACHIEVEMENTS,
  BIOME_ORDER,
  FRONTIER_MOVE_STONE_KINDS,
  FRONTIER_STAGE_INDEX,
  MOVE_STONE_ORDER,
  QUEST_POOL,
  BIOMES,
  INGREDIENTS,
  MOVES,
  RECIPES,
  SPECIES,
  STAGES,
} from './catalog';
import { buildPreviewQuery, evolvedFormAtLevel, getReferenceConfig, listReferenceConfigs } from './previewConfigs';
import { normalizeSettings } from './settings';
import { STAGE_TUNING } from './balance';

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

test('Giga: options de confort normalisées (tremblement de caméra désactivable)', () => {
  assert.equal(normalizeSettings(null).screenShake, true);
  assert.equal(normalizeSettings({ screenShake: false }).screenShake, false);
  assert.equal(normalizeSettings({ screenShake: 'oui' }).screenShake, true);
});

test('Giga: intégrité du catalogue (niveaux, espèces, sorts, ingrédients, lignées)', () => {
  STAGES.forEach((stage, idx) => {
    assert.equal(stage.index, idx, `index de ${stage.id}`);
    assert.ok(BIOMES[stage.biomeId], `biome de ${stage.id}`);
    assert.ok(SPECIES[stage.bossSpeciesId], `boss de ${stage.id}`);
    assert.equal(stage.waves[stage.waves.length - 1].enemies.filter((e) => e.isBoss).length, 1);
    for (const wave of stage.waves) {
      for (const enemy of wave.enemies) assert.ok(SPECIES[enemy.speciesId], enemy.speciesId);
    }
    for (const ing of stage.dropIngredients) assert.ok(INGREDIENTS[ing], ing);
    if (idx > 0) assert.ok(stage.recommendedPower > STAGES[idx - 1].recommendedPower);
  });
  for (const biomeId of BIOME_ORDER) {
    assert.equal(STAGES.filter((s) => s.biomeId === biomeId).length, 3, biomeId);
  }
  for (const species of Object.values(SPECIES)) {
    assert.ok(MOVES[species.moveId], `sort de ${species.id}`);
    if (species.evolvesTo) {
      assert.ok(SPECIES[species.evolvesTo], `évolution de ${species.id}`);
      assert.ok((species.evolveLevel ?? 0) > 1);
      assert.equal(SPECIES[species.evolvesTo].element, species.element);
    }
  }
  for (const recipe of RECIPES) {
    for (const id of recipe.poolSpeciesIds) assert.ok(SPECIES[id], `${recipe.id} -> ${id}`);
  }
});

test('Giga: les nouveaux biomes se débloquent après les biomes actuels', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  assert.equal(isBiomeUnlocked(fresh, 'meadow'), true);
  assert.equal(isBiomeUnlocked(fresh, 'tundra'), false);

  // Vaincre le Cœur d'Aetherion (ancien dernier niveau) ouvre la Toundra
  const sanctuary3 = STAGES.find((s) => s.id === 'sanctuary-3')!;
  const atEnd = { ...fresh, highestStageIndex: sanctuary3.index };
  const { nextSave, outcome } = applyExpeditionRewards(
    atEnd,
    sanctuary3,
    true,
    { clearTimeSec: 60, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 },
    () => 0.4,
  );
  assert.equal(isBiomeUnlocked(nextSave, 'tundra'), true);
  assert.equal(outcome.unlockedNextStageName, 'Lisière Givrée');

  // Une défaite ne débloque rien
  const lost = applyExpeditionRewards(
    atEnd,
    sanctuary3,
    false,
    { clearTimeSec: 60, wavesCleared: 1, damageDealt: 1, bossHpPercentRemaining: 50 },
    () => 0.4,
  );
  assert.equal(isBiomeUnlocked(lost.nextSave, 'tundra'), false);

  assert.equal(computeHighestUnlockedStageIndex([], 0), 0);
  assert.equal(computeHighestUnlockedStageIndex(['meadow-1'], 0), 1);
  assert.equal(computeHighestUnlockedStageIndex(['meadow-1'], 5), 5);
  assert.equal(
    computeHighestUnlockedStageIndex([STAGES[STAGES.length - 1].id], 0),
    STAGES.length - 1,
  );
  assert.deepEqual(getBiomeProgress({ completedStageIds: ['tundra-1', 'meadow-1'] }, 'tundra'), {
    completed: 1,
    total: 3,
  });
});

test('Giga: une ancienne sauvegarde terminée accède à la Toundra après migration', () => {
  const fresh = createInitialSaveState('bourgeon', true);
  const finishedOld = {
    ...fresh,
    version: 2,
    highestStageIndex: 11,
    completedStageIds: STAGES.slice(0, 12).map((s) => s.id),
  };
  const migrated = migrateSaveState(JSON.parse(JSON.stringify(finishedOld)));
  assert.ok(migrated !== null);
  assert.equal(migrated.highestStageIndex, 12);
  assert.equal(isBiomeUnlocked(migrated, 'tundra'), true);
  assert.equal(migrated.roster.length, fresh.roster.length);
});

test('Giga: la Cime des Orages se débloque après la Toundra, lignée à 2 stades', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  const tundra3 = STAGES.find((s) => s.id === 'tundra-3')!;
  const atTundraEnd = { ...fresh, highestStageIndex: tundra3.index };
  assert.equal(isBiomeUnlocked(atTundraEnd, 'stormpeak'), false);
  const { nextSave, outcome } = applyExpeditionRewards(
    atTundraEnd,
    tundra3,
    true,
    { clearTimeSec: 60, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 },
    () => 0.4,
  );
  assert.equal(isBiomeUnlocked(nextSave, 'stormpeak'), true);
  assert.equal(outcome.unlockedNextStageName, 'Sentier des Paratonnerres');

  // Le tout dernier niveau ne débloque plus rien mais compte bien comme terminé
  const last = STAGES[STAGES.length - 1];
  const end = applyExpeditionRewards(
    { ...fresh, highestStageIndex: last.index },
    last,
    true,
    { clearTimeSec: 60, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 },
    () => 0.4,
  );
  assert.equal(end.outcome.unlockedNextStageName, null);
  assert.equal(end.nextSave.highestStageIndex, last.index);
  assert.ok(end.nextSave.completedStageIds.includes(last.id));
  assert.ok(end.nextSave.discoveredSpeciesIds.includes('tempestrix'));

  // Nimbulle -> Cumulord (lignée courte)
  let save = createInitialSaveState('pyrocube', true);
  const cloud = createOwnedCreature('nimbulle', 19, 0, 'test_nimbulle');
  save = { ...save, roster: [...save.roster, cloud] };
  assert.equal(canEvolve(cloud), false);
  save = { ...save, roster: save.roster.map((c) => (c.uid === cloud.uid ? { ...c, level: 20 } : c)) };
  save = evolveCreature(save, cloud.uid);
  const evolved = save.roster.find((c) => c.uid === cloud.uid)!;
  assert.equal(evolved.speciesId, 'cumulord');
  assert.equal(evolved.moveId, 'mirage_storm');
  assert.equal(canEvolve(evolved), false);
});

test('Giga: lignées à 3 stades — évolutions en chaîne et gain de puissance', () => {
  for (const [baseId, midId, finalId] of [
    ['givrelin', 'ramurgel', 'auroramure'],
    ['givrock', 'cryolithe', 'glaciatitan'],
    ['crepitil', 'serpeclair', 'tempestrix'],
  ]) {
    let save = createInitialSaveState('pyrocube', true);
    const cub = createOwnedCreature(baseId, 1, 0, `test_${baseId}`);
    save = { ...save, roster: [...save.roster, cub] };
    assert.equal(canEvolve(cub), false);
    assert.equal(evolveCreature(save, cub.uid), save);

    const lvl1 = SPECIES[baseId].evolveLevel!;
    save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level: lvl1 } : c)) };
    const before = computeCreatureStats(save.roster.find((c) => c.uid === cub.uid)!, []).power;
    save = evolveCreature(save, cub.uid);
    const mid = save.roster.find((c) => c.uid === cub.uid)!;
    assert.equal(mid.speciesId, midId);
    assert.equal(mid.moveId, SPECIES[midId].moveId);
    assert.ok(computeCreatureStats(mid, []).power > before);
    assert.equal(canEvolve(mid), false);

    const lvl2 = SPECIES[midId].evolveLevel!;
    save = { ...save, roster: save.roster.map((c) => (c.uid === cub.uid ? { ...c, level: lvl2 } : c)) };
    save = evolveCreature(save, cub.uid);
    const fin = save.roster.find((c) => c.uid === cub.uid)!;
    assert.equal(fin.speciesId, finalId);
    assert.equal(canEvolve(fin), false);
    assert.ok(save.discoveredSpeciesIds.includes(midId) && save.discoveredSpeciesIds.includes(finalId));
    assert.equal(save.stats.evolutionsDone, 2);
  }
});

test('Giga: recettes des nouveaux biomes — résolution, priorités et non-régression', () => {
  const r = (ids: (string | null)[]) => resolveRecipe(ids)?.id;
  assert.equal(r(['aurora_petal', 'aurora_petal', 'mystic_shard', 'ruby_berry', 'azure_drop']), 'aurora_banquet');
  // 2 Éclats + 2 Pétales : le Banquet (plus spécifique) passe avant l'Ambroisie
  assert.equal(r(['aurora_petal', 'aurora_petal', 'mystic_shard', 'mystic_shard', 'azure_drop']), 'aurora_banquet');
  assert.equal(r(['snow_lichen', 'snow_lichen', 'snow_lichen', 'ruby_berry', 'sun_pollen']), 'glacier_sorbet');
  assert.equal(r(['snow_lichen', 'snow_lichen', 'pebble_gray', 'pebble_gray', 'ruby_berry']), 'permafrost_fondue');
  assert.equal(r(['storm_pepper', 'storm_pepper', 'ruby_berry', 'azure_drop', 'pebble_gray']), 'thunder_tajine');
  assert.equal(r(['cloud_fluff', 'cloud_fluff', 'cloud_fluff', 'ruby_berry', 'azure_drop']), 'cloud_meringue');
  assert.equal(r(['snow_lichen', 'cloud_fluff', 'ruby_berry', 'sun_pollen', 'pebble_gray']), 'frontier_hotpot');
  // 3 Lichens + 2 Galets : le Sorbet l'emporte (règle la plus haute)
  assert.equal(r(['snow_lichen', 'snow_lichen', 'snow_lichen', 'pebble_gray', 'pebble_gray']), 'glacier_sorbet');
  // Un seul ingrédient nouveau ne détourne pas les recettes historiques
  assert.equal(r(['snow_lichen', 'azure_drop', 'azure_drop', 'ruby_berry', 'pebble_gray']), 'ocean_nectar');
  assert.equal(r(['cloud_fluff', 'pebble_gray', 'pebble_gray', 'ruby_berry', 'azure_drop']), 'mineral_stew');
  assert.equal(r(['storm_pepper', 'sun_pollen', 'sun_pollen', 'ruby_berry', 'pebble_gray']), 'spark_curry');
  assert.equal(r(['snow_lichen', 'snow_lichen', 'snow_lichen', 'snow_lichen', null]), undefined);

  for (const recipe of RECIPES.filter((x) => x.frontier)) {
    assert.ok(recipe.cookExpeditions >= 1 && recipe.poolSpeciesIds.length >= 3, recipe.id);
  }
  assert.equal(RECIPES.filter((x) => x.frontier).length, 6);
  assert.equal(RECIPES[RECIPES.length - 1].id, 'mulligan_stew');

  // Cuisson complète d'une recette des confins : stock, stat dédiée, recrue du bon vivier
  let save = createInitialSaveState('pyrocube', true);
  save = {
    ...save,
    ingredients: { ...save.ingredients, storm_pepper: 2 },
    pot: { ...save.pot, slots: ['storm_pepper', 'storm_pepper', 'ruby_berry', 'azure_drop', 'pebble_gray'] },
  };
  const cooking = startCookingPot(save);
  assert.equal(cooking.pot.recipeId, 'thunder_tajine');
  assert.equal(cooking.ingredients.storm_pepper, 0);
  assert.equal(cooking.stats.frontierDishes, 1);
  assert.equal(cooking.stats.dishesCooked, 1);
  assert.ok(cooking.discoveredRecipeIds.includes('thunder_tajine'));
  const ready = { ...cooking, pot: { ...cooking.pot, status: 'ready' as const, expeditionsRemaining: 0 } };
  const { nextSave, creature } = collectCookedCreature(ready, () => 0);
  assert.equal(creature?.speciesId, 'crepitil');
  assert.ok(nextSave.discoveredSpeciesIds.includes('crepitil'));

  // Sans stock suffisant, la cuisson ne démarre pas
  const noStock = startCookingPot({ ...save, ingredients: { ...save.ingredients, storm_pepper: 1 } });
  assert.equal(noStock.pot.status, 'idle');
  // Une recette historique n'incrémente pas la stat des confins
  const classic = startCookingPot({
    ...save,
    pot: { ...save.pot, slots: ['ruby_berry', 'azure_drop', 'sun_pollen', 'pebble_gray', 'ruby_berry'] },
  });
  assert.equal(classic.stats.frontierDishes, 0);
});

test('Giga: Pierres Précision et Sangsue — modificateurs, équipement et butin', () => {
  const none = getMoveModifiers([]);
  assert.equal(none.critBonus, 0);
  assert.equal(none.leechRatio, 0);
  assert.equal(getMoveModifiers(['crit_focus']).critBonus, 15);
  assert.equal(getMoveModifiers(['crit_focus', 'crit_focus']).critBonus, 30);
  assert.equal(getMoveModifiers(['leech']).leechRatio, 0.1);
  assert.equal(getMoveModifiers(['leech', 'leech']).leechRatio, 0.2);
  // Les anciennes pierres gardent exactement leurs effets
  assert.equal(getMoveModifiers(['whack_whack']).damageMult, 1.4);

  // rng = 0.1 -> jet de 10 : raté avec 0 % de critique, réussi avec la Pierre Précision (+15)
  const rng = () => 0.1;
  assert.equal(calculateDamage(100, MOVES.chain_spark, 'water', 0, [], 1, rng).isCrit, false);
  const focused = calculateDamage(100, MOVES.chain_spark, 'water', 0, ['crit_focus'], 1, rng);
  assert.equal(focused.isCrit, true);
  assert.equal(focused.effectiveness, 1.5);

  // Équipement : il faut en posséder une
  let save = createInitialSaveState('pyrocube', true);
  assert.equal(save.moveStoneBag.crit_focus, 0);
  assert.equal(equipMoveStone(save, save.roster[0].uid, 0, 'crit_focus'), save);
  save = { ...save, moveStoneBag: { ...save.moveStoneBag, crit_focus: 1 } };
  const equipped = equipMoveStone(save, save.roster[0].uid, 0, 'crit_focus');
  assert.equal(equipped.roster[0].moveStones[0], 'crit_focus');
  assert.equal(equipped.moveStoneBag.crit_focus, 0);

  // Butin : jamais de pierre des confins dans les anciens biomes, possible dans les nouveaux
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 10, bossHpPercentRemaining: 0 };
  const fresh = createInitialSaveState('pyrocube', true);
  for (const roll of [0.01, 0.3, 0.52, 0.7, 0.99]) {
    const old = applyExpeditionRewards(fresh, STAGES[0], true, stats, () => roll).outcome.droppedMoveStone;
    assert.ok(old === null || !FRONTIER_MOVE_STONE_KINDS.includes(old));
  }
  // rng constant < 0.55 : une pierre tombe, tirée dans la liste étendue des confins
  const tundra1 = STAGES[FRONTIER_STAGE_INDEX];
  const always = applyExpeditionRewards({ ...fresh, highestStageIndex: tundra1.index }, tundra1, true, stats, () => 0.5399);
  assert.ok(always.outcome.droppedMoveStone !== null && MOVE_STONE_ORDER.includes(always.outcome.droppedMoveStone));
  assert.equal(always.nextSave.stats.frontierWins, 1);
  assert.equal(applyExpeditionRewards(fresh, STAGES[0], true, stats, () => 0.4).nextSave.stats.frontierWins, 0);
});

test('Giga: quêtes et succès des nouveaux biomes', () => {
  const ids = new Set(QUEST_POOL.map((q) => q.templateId));
  assert.equal(ids.size, QUEST_POOL.length);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const def of [...QUEST_POOL, ...ACHIEVEMENTS]) {
    for (const id of Object.keys(def.reward.ingredients ?? {})) assert.ok(INGREDIENTS[id], id);
  }
  const dexAll = ACHIEVEMENTS.find((a) => a.id === 'ach_dex_all')!;
  assert.equal(dexAll.target, Object.keys(SPECIES).length);
  assert.equal(ACHIEVEMENTS.find((a) => a.id === 'ach_stages_18')!.target, STAGES.length);

  // Rotation : aucune quête des confins tant que la Toundra est fermée
  const frontierTpl = QUEST_POOL.find((q) => q.templateId === 'q_frontier_win_2')!;
  const early = createInitialSaveState('pyrocube', true);
  assert.equal(isQuestTemplateAvailable(frontierTpl, early), false);
  assert.equal(isQuestTemplateAvailable(frontierTpl, { highestStageIndex: FRONTIER_STAGE_INDEX }), true);
  let rotating = recordPlayerProgress(early, { expeditionsWon: 50, reactionsTriggered: 50, ultimatesUsed: 50, dishesCooked: 50, perfectDodges: 50, bossesDefeated: 50 });
  for (let i = 0; i < 40; i++) {
    const done = rotating.activeQuests.find((q) => q.progress >= q.target);
    if (!done) {
      rotating = recordPlayerProgress(rotating, { expeditionsWon: 50, reactionsTriggered: 50, ultimatesUsed: 50, dishesCooked: 50, perfectDodges: 50, bossesDefeated: 50 });
      continue;
    }
    rotating = claimQuestReward(rotating, done.uid, () => (i % 10) / 10);
    assert.equal(rotating.activeQuests.length, 3);
    for (const q of rotating.activeQuests) {
      const tpl = QUEST_POOL.find((t) => t.templateId === q.templateId)!;
      assert.ok(isQuestTemplateAvailable(tpl, rotating), q.templateId);
    }
  }

  // Une fois la Toundra ouverte, la quête progresse avec les victoires des confins uniquement
  const tundra1 = STAGES[FRONTIER_STAGE_INDEX];
  let save: ReturnType<typeof createInitialSaveState> = {
    ...early,
    highestStageIndex: tundra1.index,
    activeQuests: [
      { uid: 'q_test', templateId: frontierTpl.templateId, title: frontierTpl.title, description: frontierTpl.description, metric: frontierTpl.metric, progress: 0, target: frontierTpl.target, reward: frontierTpl.reward },
      ...early.activeQuests.slice(1),
    ],
  };
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 10, bossHpPercentRemaining: 0 };
  save = applyExpeditionRewards(save, STAGES[0], true, stats, () => 0.9).nextSave;
  assert.equal(save.activeQuests[0].progress, 0);
  save = applyExpeditionRewards(save, tundra1, true, stats, () => 0.9).nextSave;
  save = applyExpeditionRewards(save, STAGES[FRONTIER_STAGE_INDEX + 1], true, stats, () => 0.9).nextSave;
  assert.equal(save.activeQuests[0].progress, 2);
  const beforeBag = save.moveStoneBag.crit_focus;
  const claimed = claimQuestReward(save, 'q_test', () => 0.3);
  assert.equal(claimed.moveStoneBag.crit_focus, beforeBag + 1);
  assert.equal(claimed.ingredients.snow_lichen, (save.ingredients.snow_lichen ?? 0) + 3);

  // Succès de biome : progression dérivée des niveaux terminés, réclamation unique
  const tundraAch = ACHIEVEMENTS.find((a) => a.id === 'ach_tundra_clear')!;
  assert.equal(getAchievementProgress(save, tundraAch), 2);
  assert.equal(claimAchievementReward(save, tundraAch.id), save);
  save = applyExpeditionRewards(save, STAGES[FRONTIER_STAGE_INDEX + 2], true, stats, () => 0.9).nextSave;
  assert.equal(getAchievementProgress(save, tundraAch), 3);
  const withAch = claimAchievementReward(save, tundraAch.id, () => 0.2);
  assert.ok(withAch.claimedAchievementIds.includes(tundraAch.id));
  assert.equal(withAch.moveStoneBag.crit_focus, save.moveStoneBag.crit_focus + 1);
  assert.equal(claimAchievementReward(withAch, tundraAch.id), withAch);
  const stormAch = ACHIEVEMENTS.find((a) => a.id === 'ach_storm_clear')!;
  assert.equal(getAchievementProgress(save, stormAch), 0);
});

test('Giga: migration v2 -> v3 (sac de pierres, stats, progression intacte)', () => {
  assert.equal(SAVE_VERSION, 3);
  const fresh = createInitialSaveState('aquabloc', true);
  // Sauvegarde v2 réaliste : pas de pierres/stats des confins, quête en cours, créature équipée
  const { frontierWins: _fw, frontierDishes: _fd, ...v2Stats } = fresh.stats;
  const v2: Record<string, unknown> = {
    ...fresh,
    version: 2,
    moveStoneBag: { broadburst: 2, wait_less: 0, whack_whack: 3, share: 1 },
    stats: { ...v2Stats, expeditionsWon: 9, maxCombo: 14 },
    highestStageIndex: 7,
    completedStageIds: STAGES.slice(0, 7).map((s) => s.id),
    expeditionsCompleted: 9,
    claimedAchievementIds: ['ach_first_win'],
    activeQuests: fresh.activeQuests.map((q, i) => (i === 0 ? { ...q, progress: 1 } : q)),
  };
  const migrated = migrateSaveState(JSON.parse(JSON.stringify(v2)));
  assert.ok(migrated !== null);
  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.moveStoneBag, { broadburst: 2, wait_less: 0, whack_whack: 3, share: 1, crit_focus: 0, leech: 0 });
  assert.equal(migrated.stats.frontierWins, 0);
  assert.equal(migrated.stats.frontierDishes, 0);
  assert.equal(migrated.stats.expeditionsWon, 9);
  assert.equal(migrated.stats.maxCombo, 14);
  assert.equal(migrated.highestStageIndex, 7);
  assert.equal(migrated.activeQuests[0].progress, 1);
  assert.deepEqual(migrated.claimedAchievementIds, ['ach_first_win']);
  assert.equal(migrated.roster[0].stoneBoard[0].stoneId, fresh.roster[0].stoneBoard[0].stoneId);
  assert.equal(isBiomeUnlocked(migrated, 'tundra'), false);

  // La sauvegarde migrée est jouable : progression et récompenses fonctionnent
  const played = recordPlayerProgress(migrated, { frontierWins: 1, expeditionsWon: 1 });
  assert.equal(played.stats.frontierWins, 1);
  assert.equal(countClaimableRewards(migrated) >= 0, true);

  // Aller-retour export/import en v3 + idempotence de la migration
  const round = importSaveFromJson(exportSaveToJson(migrated));
  assert.equal(round.ok, true);
  if (round.ok) assert.deepEqual(round.save, migrated);
  assert.deepEqual(migrateSaveState(migrated), migrated);

  // Une version inconnue (future) est refusée plutôt que corrompue
  assert.equal(migrateSaveState({ ...v2, version: 4 }), null);
});

test('Giga: écran de victoire — étoiles et annonce du biome débloqué', () => {
  const base = { victory: true, reactionsTriggered: 0, ultimatesUsed: 0, perfectDodges: 0 };
  assert.equal(computeVictoryStars({ ...base, victory: false, reactionsTriggered: 9, ultimatesUsed: 3 }), 0);
  assert.equal(computeVictoryStars(base), 1);
  assert.equal(computeVictoryStars({ ...base, reactionsTriggered: 1 }), 1);
  assert.equal(computeVictoryStars({ ...base, reactionsTriggered: 2 }), 2);
  assert.equal(computeVictoryStars({ ...base, perfectDodges: 1 }), 2);
  assert.equal(computeVictoryStars({ ...base, reactionsTriggered: 2, ultimatesUsed: 1 }), 3);

  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 10, bossHpPercentRemaining: 0 };
  const fresh = createInitialSaveState('pyrocube', true);
  const run = (stageId: string, victory = true) => {
    const stage = STAGES.find((s) => s.id === stageId)!;
    return applyExpeditionRewards({ ...fresh, highestStageIndex: stage.index }, stage, victory, stats, () => 0.4).outcome;
  };
  // Niveau suivant dans le même biome : pas d'annonce de biome
  assert.equal(run('meadow-1').unlockedBiomeName, null);
  // Dernier niveau d'un biome : le biome suivant est annoncé
  assert.equal(run('meadow-3').unlockedBiomeName, 'Rive Azur');
  assert.equal(run('sanctuary-3').unlockedBiomeName, 'Toundra Boréale');
  assert.equal(run('tundra-3').unlockedBiomeName, 'Cime des Orages');
  assert.equal(run('stormpeak-3').unlockedBiomeName, null);
  assert.equal(run('sanctuary-3', false).unlockedBiomeName, null);
  // Rejouer un niveau déjà dépassé n'annonce rien
  const meadow3 = STAGES.find((s) => s.id === 'meadow-3')!;
  const replay = applyExpeditionRewards({ ...fresh, highestStageIndex: 8 }, meadow3, true, stats, () => 0.4).outcome;
  assert.equal(replay.unlockedBiomeName, null);
  assert.equal(replay.unlockedNextStageName, null);
});

test('Giga: équilibrage des nouveaux biomes — réglé par niveau, anciens niveaux intacts', () => {
  // Les 12 niveaux historiques n'ont aucune entrée d'équilibrage ; tous les nouveaux en ont une
  const historic = STAGES.slice(0, FRONTIER_STAGE_INDEX).map((s) => s.id);
  assert.equal(historic.length, 12);
  for (const id of historic) assert.equal(STAGE_TUNING[id], undefined, id);
  for (const id of Object.keys(STAGE_TUNING)) assert.ok(STAGES.some((s) => s.id === id), id);
  for (const stage of STAGES.slice(FRONTIER_STAGE_INDEX)) {
    assert.deepEqual(
      { enemyHpMult: stage.enemyHpMult, enemyAtkMult: stage.enemyAtkMult, bossHpMult: stage.bossHpMult },
      STAGE_TUNING[stage.id],
      stage.id,
    );
  }
  // Signature d'équilibrage des 12 niveaux historiques : puissance conseillée, XP, Pierres, boss,
  // niveaux et IA de chaque vague. Toute retouche de ces chiffres casse ce test (les ESPÈCES des
  // vagues n'y figurent pas : varier les rencontres ne change pas la formule).
  const signature = STAGES.slice(0, FRONTIER_STAGE_INDEX)
    .map(
      (s) =>
        `${s.id}:${s.recommendedPower}:${s.xpReward}:${s.stonePowerRange.join('-')}:${s.bossSpeciesId}:` +
        s.waves.map((w) => w.enemies.map((e) => `${e.level}${e.ai[0]}${e.isBoss ? '!' : ''}`).join('+')).join('/'),
    )
    .join('|');
  assert.equal(
    signature,
    'meadow-1:700:95:25-55:feuilloc:2c+2c/3c+3k+3c/3c+5b!|meadow-2:1050:140:45-85:sparkube:5c+5c+5k/6k+6c+6c/6c+8b!|meadow-3:1450:210:70-115:bourgeoliath:8c+8k+8c/9c+9k+9c/9c+11b!|shore-1:1850:270:95-145:corallix:10c+10c+10k/11c+11c+11k/11c+13b!|shore-2:2250:340:120-180:raicube:13k+13c+13c/14c+14k+14c/14k+16b!|shore-3:2700:420:150-220:abyssocube:15c+15k+15c/16c+16k+16c/16c+18b!|volcano-1:3200:510:185-260:granitox:17k+17c+17c/18k+18c+18c/18c+20b!|volcano-2:3750:620:220-310:ignisaur:20k+20c+20c/21k+21c+21k/21k+23b!|volcano-3:4400:760:260-360:magmadrake:22c+22k+22c/23c+23k+23k/23c+25b!|sanctuary-1:5100:920:310-420:lunabloc:25k+25c+25c/26k+26c+26k/26k+28b!|sanctuary-2:5900:1120:360-490:ignisaur:28c+28k+28c/29c+29k+29k/29c+31b!|sanctuary-3:6800:1500:440-620:aetherion:31c+31k+31c/32c+32c+32k/32k+35b!',
  );

  for (const stage of STAGES) {
    if (stage.index < FRONTIER_STAGE_INDEX) {
      // L'équilibrage historique ne bouge pas
      assert.equal(stage.enemyHpMult, undefined, stage.id);
      assert.equal(stage.enemyAtkMult, undefined, stage.id);
      assert.equal(stage.bossHpMult, undefined, stage.id);
      assert.equal(stage.bossKit, undefined, stage.id);
    } else {
      // Combats plus longs (PV) mais coups moins lourds : place aux mécaniques télégraphiées
      assert.ok((stage.enemyHpMult ?? 1) > 1, stage.id);
      assert.ok((stage.enemyAtkMult ?? 1) > 0 && (stage.enemyAtkMult ?? 1) < 1, stage.id);
      assert.equal(stage.bossKit, stage.biomeId === 'tundra' ? 'frost' : 'storm', stage.id);
      assert.ok((stage.bossHpMult ?? 1) >= 1, stage.id);
      assert.equal(stage.waves.length, 3, stage.id);
    }
  }
});

test('Socle: chaque niveau a une escouade de référence valide (aperçu et simulation)', () => {
  const all = listReferenceConfigs();
  assert.equal(all.length, STAGES.length);
  for (const { stage, config } of all) {
    assert.equal(config.squad.length, 3, stage.id);
    for (const id of config.squad) assert.ok(SPECIES[id], `${stage.id} -> ${id}`);
    assert.ok(config.level >= 1 && config.level <= 50, stage.id);
    assert.ok(config.bonus > 0, stage.id);
    assert.ok(buildPreviewQuery(stage).startsWith(`?stage=${stage.id}&squad=`));
  }
  // Les configurations fixées à la main sont celles des URL d'aperçu documentées
  assert.deepEqual(getReferenceConfig(STAGES.find((s) => s.id === 'tundra-3')!), {
    squad: ['ramurgel', 'cryolithe', 'auroramure'],
    level: 44,
    bonus: 1100,
  });
  // Dérivation des anciens niveaux : les lignées de départ évoluent avec le niveau
  assert.equal(evolvedFormAtLevel('pyrocube', 7), 'pyrocube');
  assert.equal(evolvedFormAtLevel('pyrocube', 8), 'flambrix');
  assert.equal(evolvedFormAtLevel('pyrocube', 16), 'ignisaur');
  assert.equal(evolvedFormAtLevel('nimbulle', 50), 'cumulord');
  assert.deepEqual(getReferenceConfig(STAGES[0]).squad, ['pyrocube', 'aquabloc', 'bourgeon']);
  // Renvoie une copie : modifier le résultat ne pollue pas la table
  getReferenceConfig(STAGES[12]).squad.push('x');
  assert.equal(getReferenceConfig(STAGES[12]).squad.length, 3);
});
