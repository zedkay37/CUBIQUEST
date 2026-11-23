import test from 'node:test';
import { FR } from '../i18n/fr';
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
  challengeLiveState,
  isAutoUnlocked,
  openSealedCube,
  markUnlockSeen,
  unlockedFeatures,
  markLessonDone,
  defeatAdvice,
  nextStarTier,
  pendingStarTiers,
  challengeMet,
  computeStageStars,
  mergeStars,
  totalStars,
  countClaimableRewards,
  createInitialSaveState,
  createOwnedCreature,
  equipRune,
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
  resolveRecipe,
  SAVE_VERSION,
  startCookingPot,
  unequipPowerStone,
} from './rules';
import {
  ACHIEVEMENTS,
  BIOME_ORDER,
  FRONTIER_RUNE_KINDS,
  FRONTIER_STAGE_INDEX,
  RUNE_ORDER,
  QUEST_POOL,
  BIOMES,
  INGREDIENTS,
  MOVES,
  RECIPES,
  SPECIES,
  STAGES,
  STAGE_CHALLENGES,
  STARTER_TRIOS,
  STARTER_TRIO_IDS,
} from './catalog';
import { buildPreviewQuery, evolvedFormAtLevel, getReferenceConfig, listReferenceConfigs } from './previewConfigs';
import { normalizeSettings } from './settings';
import { BOSS_KITS, STAGE_TUNING, XP_KIT } from './balance';
import { LEGACY_RUNE_IDS } from './legacyIds';

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
    'summit_feast',
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
    'camp_stew',
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
  const mods = getMoveModifiers(['rune_force', 'rune_ampleur']);
  assert.ok(mods.damageMult > 1.39);
  assert.ok(mods.radiusMult > 1.34);

  const deterministicRng = () => 0.5; // no crit if critRate <= 50, variance = 1.0
  const baseHit = calculateDamage(100, MOVES.ember_burst, 'grass', 0, [], 1, deterministicRng);
  const boostedHit = calculateDamage(
    100,
    MOVES.ember_burst,
    'grass',
    0,
    ['rune_force'],
    1,
    deterministicRng,
  );
  assert.equal(baseHit.effectiveness, 1.5);
  assert.ok(boostedHit.damage > baseHit.damage);

  const save = createInitialSaveState('pyrocube', true);
  const withStone = equipRune(save, save.roster[0].uid, 0, 'rune_cadence');
  assert.equal(withStone.roster[0].runes[0], 'rune_cadence');
  assert.equal(withStone.runeBag.rune_cadence, 0);
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
  assert.equal(cooking.pot.recipeId, 'camp_stew');
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

test('Statuts : élément -> statut, et résistance aux statuts', () => {
  assert.equal(getStatusForElement('fire'), 'burn');
  assert.equal(getStatusForElement('water'), 'soaked');

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
    burstsTriggered: 4,
    ultimatesUsed: 1,
    perfectDodges: 2,
    triosTriggered: 18,
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
    runeBag: freshV2.runeBag,
    pot: freshV2.pot,
    unlockedPotTiers: ['iron', 'bronze'],
    highestStageIndex: 4,
    completedStageIds: ['meadow-1', 'meadow-2', 'meadow-3', 'shore-1'],
    discoveredSpeciesIds: freshV2.discoveredSpeciesIds,
    discoveredRecipeIds: ['camp_stew'],
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
  assert.ok(end.nextSave.discoveredSpeciesIds.includes(last.bossSpeciesId));

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
  // 2 Fragments + 2 Pétales : le Banquet (plus spécifique) passe avant le Festin
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
  assert.equal(RECIPES.filter((x) => x.frontier).length, 7);
  assert.equal(RECIPES[RECIPES.length - 1].id, 'camp_stew');

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

test('Giga: Runes de Précision et de Vigueur — modificateurs, équipement et butin', () => {
  const none = getMoveModifiers([]);
  assert.equal(none.critBonus, 0);
  assert.equal(none.leechRatio, 0);
  assert.equal(getMoveModifiers(['rune_precision']).critBonus, 15);
  assert.equal(getMoveModifiers(['rune_precision', 'rune_precision']).critBonus, 30);
  assert.equal(getMoveModifiers(['rune_vigueur']).leechRatio, 0.1);
  assert.equal(getMoveModifiers(['rune_vigueur', 'rune_vigueur']).leechRatio, 0.2);
  // Les anciennes pierres gardent exactement leurs effets
  assert.equal(getMoveModifiers(['rune_force']).damageMult, 1.4);

  // rng = 0.1 -> jet de 10 : raté avec 0 % de critique, réussi avec la Rune de Précision (+15)
  const rng = () => 0.1;
  assert.equal(calculateDamage(100, MOVES.chain_spark, 'water', 0, [], 1, rng).isCrit, false);
  const focused = calculateDamage(100, MOVES.chain_spark, 'water', 0, ['rune_precision'], 1, rng);
  assert.equal(focused.isCrit, true);
  assert.equal(focused.effectiveness, 1.5);

  // Équipement : il faut en posséder une
  let save = createInitialSaveState('pyrocube', true);
  assert.equal(save.runeBag.rune_precision, 0);
  assert.equal(equipRune(save, save.roster[0].uid, 0, 'rune_precision'), save);
  save = { ...save, runeBag: { ...save.runeBag, rune_precision: 1 } };
  const equipped = equipRune(save, save.roster[0].uid, 0, 'rune_precision');
  assert.equal(equipped.roster[0].runes[0], 'rune_precision');
  assert.equal(equipped.runeBag.rune_precision, 0);

  // Butin : jamais de pierre des confins dans les anciens biomes, possible dans les nouveaux
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 10, bossHpPercentRemaining: 0 };
  const fresh = createInitialSaveState('pyrocube', true);
  for (const roll of [0.01, 0.3, 0.52, 0.7, 0.99]) {
    const old = applyExpeditionRewards(fresh, STAGES[0], true, stats, () => roll).outcome.droppedRune;
    assert.ok(old === null || !FRONTIER_RUNE_KINDS.includes(old));
  }
  // rng constant < 0.55 : une pierre tombe, tirée dans la liste étendue des confins
  const tundra1 = STAGES[FRONTIER_STAGE_INDEX];
  const always = applyExpeditionRewards({ ...fresh, highestStageIndex: tundra1.index }, tundra1, true, stats, () => 0.5399);
  assert.ok(always.outcome.droppedRune !== null && RUNE_ORDER.includes(always.outcome.droppedRune));
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
  assert.ok(ACHIEVEMENTS.find((a) => a.id === 'ach_stages_18')!.target <= STAGES.length);

  // Rotation : aucune quête des confins tant que la Toundra est fermée
  const frontierTpl = QUEST_POOL.find((q) => q.templateId === 'q_frontier_win_2')!;
  const early = createInitialSaveState('pyrocube', true);
  assert.equal(isQuestTemplateAvailable(frontierTpl, early), false);
  assert.equal(isQuestTemplateAvailable(frontierTpl, { highestStageIndex: FRONTIER_STAGE_INDEX }), true);
  let rotating = recordPlayerProgress(early, { expeditionsWon: 50, burstsTriggered: 50, ultimatesUsed: 50, dishesCooked: 50, perfectDodges: 50, bossesDefeated: 50 });
  for (let i = 0; i < 40; i++) {
    const done = rotating.activeQuests.find((q) => q.progress >= q.target);
    if (!done) {
      rotating = recordPlayerProgress(rotating, { expeditionsWon: 50, burstsTriggered: 50, ultimatesUsed: 50, dishesCooked: 50, perfectDodges: 50, bossesDefeated: 50 });
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
  const beforeBag = save.runeBag.rune_precision;
  const claimed = claimQuestReward(save, 'q_test', () => 0.3);
  assert.equal(claimed.runeBag.rune_precision, beforeBag + 1);
  assert.equal(claimed.ingredients.snow_lichen, (save.ingredients.snow_lichen ?? 0) + 3);

  // Succès de biome : progression dérivée des niveaux terminés, réclamation unique
  const tundraAch = ACHIEVEMENTS.find((a) => a.id === 'ach_tundra_clear')!;
  assert.equal(getAchievementProgress(save, tundraAch), 2);
  assert.equal(claimAchievementReward(save, tundraAch.id), save);
  save = applyExpeditionRewards(save, STAGES[FRONTIER_STAGE_INDEX + 2], true, stats, () => 0.9).nextSave;
  assert.equal(getAchievementProgress(save, tundraAch), 3);
  const withAch = claimAchievementReward(save, tundraAch.id, () => 0.2);
  assert.ok(withAch.claimedAchievementIds.includes(tundraAch.id));
  assert.equal(withAch.runeBag.rune_precision, save.runeBag.rune_precision + 1);
  assert.equal(claimAchievementReward(withAch, tundraAch.id), withAch);
  const stormAch = ACHIEVEMENTS.find((a) => a.id === 'ach_storm_clear')!;
  assert.equal(getAchievementProgress(save, stormAch), 0);
});

/** Ancien nom d'une rune (sauvegardes v1 à v3), relu dans la table de conversion. */
function oldRuneId(kind: string): string {
  const entry = Object.entries(LEGACY_RUNE_IDS).find(([, now]) => now === kind);
  assert.ok(entry, `pas d'ancien nom pour ${kind}`);
  return entry[0];
}

test('Giga: migration v2 -> v4 (sac de runes renommé, stats, progression intacte)', () => {
  assert.equal(SAVE_VERSION, 9);
  const fresh = createInitialSaveState('aquabloc', true);
  // Sauvegarde v2 réaliste : pas de pierres/stats des confins, quête en cours, créature équipée
  const { frontierWins: _fw, frontierDishes: _fd, ...v2Stats } = fresh.stats;
  const v2: Record<string, unknown> = {
    ...fresh,
    version: 2,
    // en v2 le sac s'appelait `moveStoneBag` et portait les anciens noms (table de legacyIds.ts)
    runeBag: undefined,
    moveStoneBag: { [oldRuneId('rune_ampleur')]: 2, [oldRuneId('rune_cadence')]: 0, [oldRuneId('rune_force')]: 3, [oldRuneId('rune_partage')]: 1 },
    stats: { ...v2Stats, expeditionsWon: 9, triosTriggered: 14 },
    highestStageIndex: 7,
    completedStageIds: STAGES.slice(0, 7).map((s) => s.id),
    expeditionsCompleted: 9,
    claimedAchievementIds: ['ach_first_win'],
    activeQuests: fresh.activeQuests.map((q, i) => (i === 0 ? { ...q, progress: 1 } : q)),
  };
  const migrated = migrateSaveState(JSON.parse(JSON.stringify(v2)));
  assert.ok(migrated !== null);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.deepEqual(migrated.runeBag, { rune_ampleur: 2, rune_cadence: 0, rune_force: 3, rune_partage: 1, rune_precision: 0, rune_vigueur: 0 });
  assert.equal(migrated.stats.frontierWins, 0);
  assert.equal(migrated.stats.frontierDishes, 0);
  assert.equal(migrated.stats.expeditionsWon, 9);
  assert.equal(migrated.stats.triosTriggered, 14);
  assert.equal(migrated.highestStageIndex, 7);
  assert.equal(migrated.activeQuests[0].progress, 1);
  assert.deepEqual(migrated.claimedAchievementIds, ['ach_first_win']);
  assert.equal(migrated.roster[0].stoneBoard[0].stoneId, fresh.roster[0].stoneBoard[0].stoneId);
  assert.equal(isBiomeUnlocked(migrated, 'tundra'), false);

  // La sauvegarde migrée est jouable : progression et récompenses fonctionnent
  const played = recordPlayerProgress(migrated, { frontierWins: 1, expeditionsWon: 1 });
  assert.equal(played.stats.frontierWins, 1);
  assert.equal(countClaimableRewards(migrated) >= 0, true);

  // Aller-retour export/import + idempotence de la migration
  const round = importSaveFromJson(exportSaveToJson(migrated));
  assert.equal(round.ok, true);
  if (round.ok) assert.deepEqual(round.save, migrated);
  assert.deepEqual(migrateSaveState(migrated), migrated);

  // Une version inconnue (future) est refusée plutôt que corrompue
  assert.equal(migrateSaveState({ ...v2, version: SAVE_VERSION + 1 }), null);
});

test('Giga: écran de victoire — étoiles et annonce du biome débloqué', () => {
  // S06 : les trois étoiles (victoire, aucun K.O., défi) — voir aussi le test « Étoiles »
  const s = { victory: true, clearTimeSec: 20, perfectDodges: 0, hazardHits: 0, ultimatesUsed: 0, koCount: 0 };
  assert.deepEqual(computeStageStars({ ...s, victory: false }, { id: 'meadow-1' }), { win: false, noKo: false, challenge: false });

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
  assert.equal(run(STAGES[STAGES.length - 1].id).unlockedBiomeName, null);
  assert.equal(run('sanctuary-3', false).unlockedBiomeName, null);
  // Rejouer un niveau déjà dépassé n'annonce rien
  const meadow3 = STAGES.find((s) => s.id === 'meadow-3')!;
  const replay = applyExpeditionRewards({ ...fresh, highestStageIndex: 8 }, meadow3, true, stats, () => 0.4).outcome;
  assert.equal(replay.unlockedBiomeName, null);
  assert.equal(replay.unlockedNextStageName, null);
});

test('Équilibrage: chaque niveau a une entrée STAGE_TUNING, aux multiplicateurs bornés', () => {
  assert.deepEqual(Object.keys(STAGE_TUNING).sort(), STAGES.map((s) => s.id).sort());
  for (const stage of STAGES) {
    const t = STAGE_TUNING[stage.id];
    // les valeurs de balance.ts sont bien celles que le moteur reçoit
    assert.deepEqual({ enemyHpMult: stage.enemyHpMult, enemyAtkMult: stage.enemyAtkMult, bossHpMult: stage.bossHpMult }, t, stage.id);
    assert.ok(t.enemyHpMult >= 0.5 && t.enemyHpMult <= 12, `${stage.id} : PV ennemis ${t.enemyHpMult}`);
    // attaque : plancher abaissé de 0,2 à 0,05 en S04 (les cubes ont retiré à l'Auto le soin du Déchaînement)
    assert.ok(t.enemyAtkMult >= 0.05 && t.enemyAtkMult <= 1.5, `${stage.id} : attaque ${t.enemyAtkMult}`);
    // PV du boss : multiplicateur supplémentaire, plafond plus large (les boss des premiers niveaux partent de très bas)
    assert.ok(t.bossHpMult >= 0.5 && t.bossHpMult <= 25, `${stage.id} : PV du boss ${t.bossHpMult}`);
    assert.equal(stage.waves.length, 3, stage.id);
    // S05.3 : chaque niveau a le kit de boss de son biome
    assert.ok(stage.bossKit && stage.bossKit !== 'classic' && BOSS_KITS[stage.bossKit], stage.id);
  }
  // Contenu des 12 premiers niveaux : puissance conseillée, XP, Galets, boss, niveaux et IA des vagues.
  // S03 ne règle que les multiplicateurs de STAGE_TUNING ; ce contenu bouge en S05 (mettre à jour ici).
  // S06.3 : l'XP sort de la signature (table de la fiche, test « Expérience »).
  const signature = STAGES.slice(0, FRONTIER_STAGE_INDEX)
    .map(
      (s) =>
        `${s.id}:${s.recommendedPower}:${s.stonePowerRange.join('-')}:${s.bossSpeciesId}:` +
        s.waves.map((w) => w.enemies.map((e) => `${e.level}${e.ai.slice(0, 4)}${e.isBoss ? '!' : ''}`).join('+')).join('/'),
    )
    .join('|');
  assert.equal(
    signature,
    'meadow-1:700:25-55:feuilloc:2chas+2char/3chas+3kite+3chas/3chas+5boss!|meadow-2:1050:45-85:sparkube:5char+5chas+5kite/6kite+6chas+6char/6char+8boss!|meadow-3:1450:70-115:bourgeoliath:8chas+8kite+8char/9chas+9kite+9chas/9chas+11boss!|shore-1:1850:95-145:corallix:10char+10chas+10kite/11chas+11char+11kite/11chas+13boss!|shore-2:2250:120-180:raicube:13kite+13chas+13char/14char+14kite+14chas/14kite+16boss!|shore-3:2700:150-220:abyssocube:15chas+15kite+15char/16chas+16kite+16chas/16chas+18boss!|volcano-1:3200:185-260:granitox:17kite+17chas+17char/18kite+18chas+18char/18chas+20boss!|volcano-2:3750:220-310:ignisaur:20kite+20char+20chas/21kite+21chas+21kite/21kite+23boss!|volcano-3:4400:260-360:magmadrake:22chas+22kite+22char/23chas+23kite+23kite/23chas+25boss!|sanctuary-1:5100:310-420:lunabloc:25kite+25chas+25char/26kite+26chas+26kite/26kite+28boss!|sanctuary-2:5900:360-490:ignisaur:28chas+28kite+28char/29chas+29kite+29kite/29char+31boss!|sanctuary-3:6800:440-620:aetherion:31chas+31kite+31char/32chas+32chas+32kite/32kite+35boss!',
  );

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
    squad: ['ramurgel', 'cryolithe', 'ignisaur'],
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

test('Socle: chaque escouade de référence aligne trois éléments et trois lignées différents', () => {
  const root = (id: string): string => {
    let cur = id;
    for (let guard = 0; guard < 5; guard++) {
      const parent = Object.values(SPECIES).find((s) => s.evolvesTo === cur);
      if (!parent) break;
      cur = parent.id;
    }
    return cur;
  };
  for (const { stage, config } of listReferenceConfigs()) {
    assert.equal(new Set(config.squad.map((id) => SPECIES[id].element)).size, 3, `${stage.id} : éléments`);
    assert.equal(new Set(config.squad.map(root)).size, 3, `${stage.id} : lignées`);
  }
});

test('Étoiles: victoire, aucun K.O., défi ; elles restent acquises ; défis sans Éclat ni Trio', () => {
  const s = { victory: true, clearTimeSec: 30, perfectDodges: 2, hazardHits: 1, ultimatesUsed: 1, koCount: 0 };
  assert.equal(challengeMet({ kind: 'perfectDodges', n: 2 }, s), true);
  assert.equal(challengeMet({ kind: 'perfectDodges', n: 3 }, s), false);
  assert.equal(challengeMet({ kind: 'duration', maxSec: 30 }, s), true);
  assert.equal(challengeMet({ kind: 'duration', maxSec: 29 }, s), false);
  assert.equal(challengeMet({ kind: 'noTelegraphHit' }, s), false);
  assert.equal(challengeMet({ kind: 'noUltimate' }, { ...s, ultimatesUsed: 0 }), true);
  assert.equal(challengeMet({ kind: 'all', of: [{ kind: 'noUltimate' }, { kind: 'perfectDodges', n: 1 }] }, { ...s, ultimatesUsed: 0 }), true);
  assert.equal(challengeMet({ kind: 'noUltimate' }, { ...s, ultimatesUsed: 0, victory: false }), false);
  // en combat : acquis, perdu, en cours
  const live = { elapsed: 10, perfectDodges: 2, hazardHits: 0, ultimatesUsed: 0 };
  assert.equal(challengeLiveState({ kind: 'perfectDodges', n: 2 }, live), 'done');
  assert.equal(challengeLiveState({ kind: 'duration', maxSec: 9 }, live), 'lost');
  assert.equal(challengeLiveState({ kind: 'noTelegraphHit' }, live), 'pending');
  // étoiles : K.O. et défaite
  assert.deepEqual(computeStageStars({ ...s, koCount: 1, perfectDodges: 9 }, { id: 'meadow-2' }), { win: true, noKo: false, challenge: true });
  // une étoile acquise le reste
  assert.deepEqual(mergeStars({ win: true, noKo: true, challenge: false }, { win: true, noKo: false, challenge: true }), { win: true, noKo: true, challenge: true });
  // aucun défi ne dépend des Éclats ou des Trios (retour du propriétaire)
  const kinds = (c: { kind: string; of?: { kind: string }[] }): string[] => (c.of ? c.of.flatMap(kinds) : [c.kind]);
  assert.equal(Object.keys(STAGE_CHALLENGES).length, STAGES.length);
  for (const c of Object.values(STAGE_CHALLENGES)) for (const k of kinds(c)) assert.ok(['perfectDodges', 'duration', 'noTelegraphHit', 'noUltimate'].includes(k), k);
  // la victoire enregistre les étoiles dans la sauvegarde ; une défaite n'en retire aucune
  let save = createInitialSaveState('pyrocube', true);
  const stage = STAGES[0];
  const win = applyExpeditionRewards(save, stage, true, { clearTimeSec: 18, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0, koCount: 0, hazardHits: 0, perfectDodges: 0, ultimatesUsed: 0 }, () => 0.5);
  save = win.nextSave;
  assert.deepEqual(save.stageStars[stage.id], { win: true, noKo: true, challenge: true });
  const lost = applyExpeditionRewards(save, stage, false, { clearTimeSec: 40, wavesCleared: 2, damageDealt: 1, bossHpPercentRemaining: 30, koCount: 3 }, () => 0.5);
  assert.deepEqual(lost.nextSave.stageStars[stage.id], { win: true, noKo: true, challenge: true });
  assert.equal(totalStars(lost.nextSave), 3);
  assert.equal(totalStars(lost.nextSave, 'shore'), 0);
});

test('Expérience (S06.3): table des niveaux, première victoire x 2,5, 60 % au camp', () => {
  assert.deepEqual(
    STAGES.map((s) => s.xpReward),
    [270, 430, 560, 760, 940, 1180, 1550, 1950, 2550, 3400, 4800, 5800, 6200, 6500, 6700, 6900, 7100, 7300, 7500, 7700, 7900],
  );
  const base = createInitialSaveState('pyrocube', true);
  // une créature en réserve (le trio de départ n'en a plus depuis S07.1)
  const save = { ...base, roster: [...base.roster, createOwnedCreature('psycube', 3, 0, 'reserve_1')] };
  const stage = STAGES[0];
  const bench = save.roster.find((c) => !save.squadIds.includes(c.uid))!;
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 };
  const first = applyExpeditionRewards(save, stage, true, stats, () => 0.5);
  assert.equal(first.outcome.firstClear, true);
  assert.equal(first.outcome.xpPerUnit, Math.round(stage.xpReward * XP_KIT.xpScale * 2.5));
  assert.equal(first.outcome.benchXp, Math.round(first.outcome.xpPerUnit * 0.6));
  const benchAfter = first.nextSave.roster.find((c) => c.uid === bench.uid)!;
  assert.ok(benchAfter.level > bench.level || benchAfter.xp > bench.xp, 'la créature au camp gagne de l’XP');
  const again = applyExpeditionRewards(first.nextSave, stage, true, stats, () => 0.5);
  assert.equal(again.outcome.firstClear, false);
  assert.equal(again.outcome.xpPerUnit, Math.round(stage.xpReward * XP_KIT.xpScale));
  // une défaite ne compte jamais comme première victoire
  assert.equal(applyExpeditionRewards(save, stage, false, { ...stats, wavesCleared: 1 }, () => 0.5).outcome.firstClear, false);
});

test('Paliers d’étoiles (S06.4): une Rune par palier, donnée une fois, rattrapée après migration', () => {
  assert.deepEqual(pendingStarTiers(13, []).map((t) => t.at), [12]);
  assert.deepEqual(pendingStarTiers(40, [12]).map((t) => t.at), [24, 36]);
  assert.equal(nextStarTier(12)?.at, 24);
  assert.equal(nextStarTier(63), null);
  // sauvegarde avec 12 étoiles déjà réunies, palier jamais donné (cas d'une sauvegarde migrée)
  let save = createInitialSaveState('pyrocube', true);
  const four = STAGES.slice(0, 4);
  save = { ...save, stageStars: Object.fromEntries(four.map((s) => [s.id, { win: true, noKo: true, challenge: true }])), completedStageIds: four.map((s) => s.id) };
  const before = save.runeBag.rune_precision ?? 0;
  const stats = { clearTimeSec: 99, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0, koCount: 1 };
  const r = applyExpeditionRewards(save, STAGES[0], true, stats, () => 0.99);
  assert.deepEqual(r.outcome.starTiers, [{ at: 12, rune: 'rune_precision' }]);
  assert.equal(r.nextSave.runeBag.rune_precision, before + 1);
  assert.deepEqual(r.nextSave.starTiersClaimed, [12]);
  // jamais deux fois
  const r2 = applyExpeditionRewards(r.nextSave, STAGES[0], true, stats, () => 0.99);
  assert.deepEqual(r2.outcome.starTiers, []);
  // la migration garde les paliers connus et ignore les autres
  const m = migrateSaveState({ ...r.nextSave, starTiersClaimed: [12, 999] })!;
  assert.deepEqual(m.starTiersClaimed, [12]);
});

test('Défaite (S06.2): un conseil parmi huit, le plus utile d’abord', () => {
  const r = { koCount: 0, hazardHits: 0, perfectDodges: 1, burstsTriggered: 2, weakBursts: 0, ultimatesUsed: 1, clearTimeSec: 90, wavesCleared: 3 };
  assert.equal(defeatAdvice({ ...r, hazardHits: 3, perfectDodges: 0 }, 10, 10, false), 'noDodge');
  assert.equal(defeatAdvice(r, 5, 10, false), 'underLevel');
  assert.equal(defeatAdvice(r, 10, 10, true), 'weakElement');
  assert.equal(defeatAdvice({ ...r, koCount: 1, wavesCleared: 1 }, 10, 10, false), 'earlyKo');
  assert.equal(defeatAdvice({ ...r, burstsTriggered: 0 }, 10, 10, false), 'noBurst');
  assert.equal(defeatAdvice({ ...r, weakBursts: 4 }, 10, 10, false), 'manyWeak');
  assert.equal(defeatAdvice({ ...r, ultimatesUsed: 0 }, 10, 10, false), 'noUltimate');
  assert.equal(defeatAdvice(r, 10, 10, false), 'longFight');
  // chaque conseil a son texte ; une victoire n'en donne aucun
  for (const k of ['noDodge', 'underLevel', 'weakElement', 'earlyKo', 'noBurst', 'manyWeak', 'noUltimate', 'longFight'] as const) assert.ok(FR.rules.conseils[k]);
  const save = createInitialSaveState('pyrocube', true);
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 };
  assert.equal(applyExpeditionRewards(save, STAGES[0], true, stats, () => 0.5).outcome.advice, null);
  assert.ok(applyExpeditionRewards(save, STAGES[0], false, stats, () => 0.5).outcome.advice);
});

test('Trio de départ (S07.1): deux trios, trois compagnons niveau 4, aucun en réserve', () => {
  assert.deepEqual(STARTER_TRIO_IDS, ['braise', 'maree']);
  for (const trio of STARTER_TRIO_IDS) {
    const save = createInitialSaveState(trio, true);
    assert.deepEqual(save.roster.map((c) => c.speciesId), [...STARTER_TRIOS[trio]]);
    assert.ok(save.roster.every((c) => c.level === 4));
    assert.equal(save.squadIds.length, 3);
    // trois éléments différents : trois Éclats différents dès le premier combat
    assert.equal(new Set(save.roster.map((c) => SPECIES[c.speciesId].element)).size, 3);
  }
  assert.deepEqual(STARTER_TRIOS.braise, ['pyrocube', 'voltik', 'cailloc']);
  assert.deepEqual(STARTER_TRIOS.maree, ['aquabloc', 'bourgeon', 'psycube']);
  // une espèce d'un trio choisit ce trio (anciens appels)
  assert.equal(createInitialSaveState('bourgeon', true).roster[0].speciesId, 'aquabloc');
});

test('Leçons (S07.2): sauvegarde v8, Auto ouvert après le premier boss', () => {
  const save = createInitialSaveState('braise', true);
  assert.deepEqual(save.lessonsDone, []);
  assert.equal(isAutoUnlocked(save), false);
  assert.equal(isAutoUnlocked({ completedStageIds: ['meadow-1', 'meadow-2', 'meadow-3'] }), true);
  const once = markLessonDone(save, 'cast');
  assert.deepEqual(markLessonDone(once, 'cast').lessonsDone, ['cast']);
  assert.equal(markLessonDone(save, 'inconnue'), save);
  // migration : une sauvegarde qui a gagné la Prairie-2 a tout appris ; sinon on garde les leçons connues
  const older = migrateSaveState({ ...save, version: 7, lessonsDone: undefined, completedStageIds: ['meadow-1', 'meadow-2'] })!;
  assert.deepEqual(older.lessonsDone, ['cast', 'burst', 'dodge', 'trio', 'ultimate']);
  const young = migrateSaveState({ ...save, lessonsDone: ['dodge', 'xx'] })!;
  assert.deepEqual(young.lessonsDone, ['dodge']);
});

test('Ouvertures (S07.3): table UNLOCKS, compagnon après le premier boss, ancienne sauvegarde déjà ouverte', () => {
  let save = createInitialSaveState('braise', true);
  assert.deepEqual([...unlockedFeatures(save)], []);
  const stats = { clearTimeSec: 30, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 };
  const r1 = applyExpeditionRewards(save, STAGES[0], true, stats, () => 0.5);
  assert.deepEqual(r1.outcome.newFeatures, ['camp', 'quests']);
  save = r1.nextSave;
  assert.ok(unlockedFeatures(save).has('camp'));
  save = applyExpeditionRewards(save, STAGES[1], true, stats, () => 0.5).nextSave;
  const r3 = applyExpeditionRewards(save, STAGES[2], true, stats, () => 0.5);
  // A2.4 : le premier boss donne un cube qui contient forcément Bourgéon (trio Braise) ; à l'ouverture,
  // il rejoint la réserve au niveau moyen de l'escouade − 2
  const guaranteed = r3.nextSave.sealedCubes.find((c) => c.guaranteedSpeciesId);
  assert.equal(guaranteed?.guaranteedSpeciesId, 'bourgeon');
  const opened = openSealedCube(r3.nextSave, guaranteed!.id, null, () => 0.99)!;
  assert.equal(opened.result.speciesId, 'bourgeon');
  assert.equal(opened.result.isNew, true);
  const joined = opened.nextSave.roster.find((c) => c.speciesId === 'bourgeon')!;
  const squad = opened.nextSave.roster.filter((c) => opened.nextSave.squadIds.includes(c.uid));
  assert.equal(joined.level, Math.max(1, Math.round(squad.reduce((n, c) => n + c.level, 0) / 3) - 2));
  assert.ok(!opened.nextSave.squadIds.includes(joined.uid));
  assert.ok(isAutoUnlocked(r3.nextSave) && unlockedFeatures(r3.nextSave).has('team'));
  // rejouer le boss ne redonne pas de cube garanti
  assert.ok(!applyExpeditionRewards(opened.nextSave, STAGES[2], true, stats, () => 0.5).nextSave.sealedCubes.some((c) => c.guaranteedSpeciesId));
  // trio Marée : Voltik
  let m = createInitialSaveState('maree', true);
  m = { ...m, completedStageIds: ['meadow-1', 'meadow-2'] };
  assert.equal(applyExpeditionRewards(m, STAGES[2], true, stats, () => 0.5).nextSave.sealedCubes.find((c) => c.guaranteedSpeciesId)?.guaranteedSpeciesId, 'voltik');
  // une sauvegarde d'avant S07 a tout ouvert, et ne reçoit pas de compagnon
  const old = migrateSaveState({ ...createInitialSaveState('braise', true), version: 7, allUnlocked: undefined, starterTrio: undefined })!;
  assert.equal(old.allUnlocked, true);
  assert.equal(unlockedFeatures(old).size, 7);
  assert.equal(markUnlockSeen(markUnlockSeen(save, 'team'), 'team').unlocksSeen.filter((f) => f === 'team').length, 1);
});
