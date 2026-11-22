import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_KITS, STAGE_TUNING } from './balance';
import { BIOME_ORDER, BIOMES, INGREDIENTS, RECIPE_BY_ID, SPECIES, STAGES, STATUS_META } from './catalog';
import { getReferenceConfig } from './previewConfigs';
import {
  applyExpeditionRewards,
  createInitialSaveState,
  getBiomeProgress,
  isBiomeUnlocked,
  resolveRecipe,
  startCookingPot,
} from './rules';

const canyon = STAGES.filter((s) => s.biomeId === 'canyon');
const stats = { clearTimeSec: 40, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 };

test('Canyon d\'Ambre : 3 niveaux placés après la Cime des Orages, débloqués par l\'Œil du Cyclone', () => {
  assert.equal(BIOME_ORDER[BIOME_ORDER.length - 1], 'canyon');
  assert.equal(BIOMES.canyon.dominantElement, 'rock');
  assert.deepEqual(canyon.map((s) => s.id), ['canyon-1', 'canyon-2', 'canyon-3']);
  const storm3 = STAGES.find((s) => s.id === 'stormpeak-3')!;
  assert.equal(canyon[0].index, storm3.index + 1);

  const fresh = createInitialSaveState('pyrocube', true);
  const atStormEnd = { ...fresh, highestStageIndex: storm3.index };
  assert.equal(isBiomeUnlocked(atStormEnd, 'canyon'), false);
  const { nextSave, outcome } = applyExpeditionRewards(atStormEnd, storm3, true, stats, () => 0.4);
  assert.equal(isBiomeUnlocked(nextSave, 'canyon'), true);
  assert.equal(outcome.unlockedBiomeName, 'Canyon d’Ambre');
  assert.equal(outcome.unlockedNextStageName, canyon[0].name);
  // une victoire dans le canyon compte comme victoire « des confins » (quêtes existantes)
  const won = applyExpeditionRewards({ ...fresh, highestStageIndex: canyon[0].index }, canyon[0], true, stats, () => 0.4);
  assert.equal(won.nextSave.stats.frontierWins, 1);
  assert.deepEqual(getBiomeProgress(won.nextSave, 'canyon'), { completed: 1, total: 3 });
});

test('Canyon d\'Ambre : niveaux croissants, lignée du bélier présente, équilibrage et escouades de référence', () => {
  const previous = STAGES[canyon[0].index - 1];
  let power = previous.recommendedPower;
  let xp = previous.xpReward;
  for (const stage of canyon) {
    assert.ok(stage.recommendedPower > power && stage.xpReward > xp, stage.id);
    power = stage.recommendedPower;
    xp = stage.xpReward;
    assert.ok(STAGE_TUNING[stage.id], stage.id);
    assert.equal(stage.bossKit, 'amber');
    const species = stage.waves.flatMap((w) => w.enemies.map((e) => e.speciesId));
    assert.ok(species.some((id) => SPECIES[id].archetype === 'ram'), `${stage.id} : la lignée du canyon doit apparaître`);
    assert.ok(new Set(species.map((id) => SPECIES[id].element)).size >= 2, `${stage.id} : vagues mélangées`);
    for (const id of stage.dropIngredients) assert.ok(INGREDIENTS[id], id);
    const cfg = getReferenceConfig(stage);
    assert.equal(cfg.level, 50);
    assert.equal(cfg.squad.length, 3);
  }
  assert.equal(canyon[2].bossSpeciesId, 'belithan');
  assert.ok(canyon.some((s) => s.dropIngredients.includes('mesa_fig')));
  assert.ok(canyon.some((s) => s.dropIngredients.includes('amber_resin')));
  // un ingrédient commun et un rare, comme les autres biomes récents
  assert.equal(INGREDIENTS.mesa_fig.rarity, 'common');
  assert.equal(INGREDIENTS.amber_resin.rarity, 'rare');
});

test('Canyon d\'Ambre : le kit de boss ne fait que recombiner des attaques et statuts existants', () => {
  const kit = BOSS_KITS.amber;
  const known = new Set([0, 1, 2, 3, 4, 5]);
  for (const cycle of kit.cycle) {
    assert.ok(cycle.length >= 2);
    for (const pattern of cycle) assert.ok(known.has(pattern), `attaque inconnue ${pattern}`);
  }
  // il mêle bien des attaques venues des deux kits existants
  const used = new Set(kit.cycle.flat());
  const frostOnly = BOSS_KITS.frost.cycle.flat().filter((p) => p >= 3);
  const stormOnly = BOSS_KITS.storm.cycle.flat().filter((p) => p >= 3);
  assert.ok(frostOnly.some((p) => used.has(p)), 'reprend une attaque du kit Givre');
  assert.ok(stormOnly.some((p) => used.has(p)), 'reprend une attaque du kit Orage');
  // statuts : uniquement ceux du jeu
  const statuses = [...(kit.ring?.statuses.flat() ?? []), kit.eye?.status, kit.strike?.status].filter(Boolean);
  for (const status of statuses) assert.ok(STATUS_META[status as keyof typeof STATUS_META], String(status));
  assert.ok(kit.ring && kit.eye);
});

test('Canyon d\'Ambre : recette Rôti des Mesas', () => {
  const r = (ids: string[]) => resolveRecipe(ids)?.id;
  assert.equal(r(['mesa_fig', 'mesa_fig', 'mesa_fig', 'ruby_berry', 'pebble_gray']), 'mesa_roast');
  // 2 figues seulement : la recette rouge historique garde la main (non-régression)
  assert.equal(r(['mesa_fig', 'mesa_fig', 'ruby_berry', 'pebble_gray', 'azure_drop']), 'fiery_soup');
  assert.equal(r(['amber_resin', 'sun_pollen', 'sun_pollen', 'ruby_berry', 'pebble_gray']), 'spark_curry');
  assert.deepEqual(RECIPE_BY_ID.mesa_roast.poolSpeciesIds, ['chevrok', 'mouflambre', 'belithan']);
  assert.ok(RECIPE_BY_ID.frontier_hotpot.poolSpeciesIds.includes('chevrok'));

  let save = createInitialSaveState('pyrocube', true);
  save = {
    ...save,
    ingredients: { ...save.ingredients, mesa_fig: 3 },
    pot: { ...save.pot, slots: ['mesa_fig', 'mesa_fig', 'mesa_fig', 'ruby_berry', 'pebble_gray'] },
  };
  const cooking = startCookingPot(save);
  assert.equal(cooking.pot.recipeId, 'mesa_roast');
  assert.equal(cooking.ingredients.mesa_fig, 0);
  assert.equal(cooking.stats.frontierDishes, 1);
});
