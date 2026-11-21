import {
  ACHIEVEMENTS,
  BASE_MOVE_STONE_KINDS,
  BIOMES,
  ELEMENTAL_REACTIONS,
  FRONTIER_STAGE_INDEX,
  MOVE_STONE_ORDER,
  ELEMENT_META,
  INGREDIENTS,
  MOVES,
  POT_TIER_META,
  QUEST_POOL,
  RECIPE_BY_ID,
  RECIPES,
  SPECIES,
  STAGES,
  STATUS_META,
} from './catalog';
import type {
  AchievementDef,
  ActiveQuest,
  BiomeId,
  ComputedCreatureStats,
  ElementalReactionDef,
  ElementType,
  ExpeditionOutcome,
  MoveDef,
  MoveStoneKind,
  OwnedCreature,
  PlayerStats,
  PotTier,
  PowerStone,
  PowerStoneSubstat,
  QuestMetric,
  QuestReward,
  QuestTemplate,
  RecipeDef,
  SaveState,
  StageDef,
  StatusKind,
  StoneRarity,
  StoneSlot,
  StoneSlotType,
} from './types';

export const SAVE_STORAGE_KEY = 'cubiquest_save_v2';
export const LEGACY_SAVE_STORAGE_KEY = 'cubiquest_save_v1';
// v3 (Giga Update) : sac de Pierres de Capacité étendu (crit_focus, leech) + stats frontierWins/frontierDishes.
// La clé de stockage reste la même : migrateSaveState accepte les versions 1, 2 et 3.
export const SAVE_VERSION = 3;

export type RngFn = () => number;

let idCounter = 1;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/**
 * Type effectiveness multiplier: 1.5 (super effective), 0.7 (not very effective), 1.0 (neutral)
 */
export function getTypeEffectiveness(moveType: ElementType, defenderType: ElementType): number {
  const meta = ELEMENT_META[moveType];
  if (meta.strongAgainst.includes(defenderType)) return 1.5;
  if (meta.weakAgainst.includes(defenderType)) return 0.7;
  return 1.0;
}

/**
 * Map an element to the status effect it inflicts on skill hits
 */
export function getStatusForElement(element: ElementType): StatusKind {
  switch (element) {
    case 'fire':
      return 'burn';
    case 'water':
      return 'soaked';
    case 'grass':
      return 'rooted';
    case 'electric':
      return 'shocked';
    case 'rock':
      return 'sunder';
    case 'psychic':
      return 'confused';
  }
}

/**
 * Status duration scaled by defender statusRes (0..80%)
 */
export function computeStatusDuration(statusKind: StatusKind, statusRes: number): number {
  const base = STATUS_META[statusKind].durationSec;
  const reduction = Math.max(0, Math.min(0.75, statusRes / 100));
  return Math.max(1.0, Number((base * (1 - reduction)).toFixed(2)));
}

/**
 * Resolve one of the 6 V0.2 Elemental Reactions when an incoming skill element
 * hits a target carrying an existing elemental status aura.
 */
export function resolveElementalReaction(
  existingStatus: StatusKind | null,
  incomingElement: ElementType,
): ElementalReactionDef | null {
  if (!existingStatus) return null;
  const existingElement = STATUS_META[existingStatus].element;
  if (existingElement === incomingElement) return null;

  const pair = new Set<ElementType>([existingElement, incomingElement]);

  if (pair.has('fire') && pair.has('water')) return ELEMENTAL_REACTIONS.evaporation;
  if (pair.has('fire') && pair.has('grass')) return ELEMENTAL_REACTIONS.ignition;
  if (pair.has('water') && pair.has('electric')) return ELEMENTAL_REACTIONS.electrocution;
  if (pair.has('fire') && pair.has('electric')) return ELEMENTAL_REACTIONS.overload;
  if (pair.has('rock')) return ELEMENTAL_REACTIONS.crystallize;
  if (pair.has('psychic')) return ELEMENTAL_REACTIONS.psy_resonance;
  if (pair.has('grass') && pair.has('electric')) return ELEMENTAL_REACTIONS.overload;
  if (pair.has('water') && pair.has('grass')) return ELEMENTAL_REACTIONS.ignition;
  return null;
}

/**
 * Boss phase evaluation (Phase 1 > 50%, Phase 2 <= 50%, Phase 3 <= 25% for final biome bosses)
 */
export function computeBossPhase(
  hp: number,
  maxHp: number,
  isFinalBiomeBoss: boolean,
): 1 | 2 | 3 {
  const ratio = hp / Math.max(1, maxHp);
  if (isFinalBiomeBoss && ratio <= 0.25) return 3;
  if (ratio <= 0.5) return 2;
  return 1;
}

/**
 * Clamped squad Ultimate charge gain (0..100)
 */
export function computeUltimateCharge(current: number, gain: number): number {
  return Math.max(0, Math.min(100, current + gain));
}

/**
 * Giga Update — déblocage des niveaux/biomes.
 * Le plus haut niveau jouable est AU MOINS « dernier niveau vaincu + 1 » : ainsi une
 * sauvegarde qui avait déjà fini l'ancien dernier niveau accède aux nouveaux biomes.
 */
export function computeHighestUnlockedStageIndex(
  completedStageIds: string[],
  currentHighest: number,
): number {
  let highest = Math.max(0, Math.floor(Number(currentHighest) || 0));
  for (const stage of STAGES) {
    if (completedStageIds.includes(stage.id)) highest = Math.max(highest, stage.index + 1);
  }
  return Math.min(STAGES.length - 1, highest);
}

/** Un biome est ouvert dès que son premier niveau est jouable. */
export function isBiomeUnlocked(save: Pick<SaveState, 'highestStageIndex'>, biomeId: BiomeId): boolean {
  const first = STAGES.find((s) => s.biomeId === biomeId);
  return Boolean(first && save.highestStageIndex >= first.index);
}

export function getBiomeProgress(
  save: Pick<SaveState, 'completedStageIds'>,
  biomeId: BiomeId,
): { completed: number; total: number } {
  const stages = STAGES.filter((s) => s.biomeId === biomeId);
  return {
    completed: stages.filter((s) => save.completedStageIds.includes(s.id)).length,
    total: stages.length,
  };
}

/**
 * XP required to go from `level` to `level + 1`
 */
export function xpForNextLevel(level: number): number {
  return Math.round(55 + level * 32 + level * level * 3.5);
}

/**
 * Build a balanced 9-slot (3x3) Power Stone board tailored to creature role
 */
export function createStoneBoardForRole(role: 'melee' | 'ranged' | 'tank'): StoneSlot[] {
  const unlockLevels = [1, 1, 1, 4, 7, 10, 14, 18, 22];
  const pattern: StoneSlotType[] =
    role === 'tank'
      ? ['hp', 'atk', 'hp', 'hp', 'flex', 'hp', 'atk', 'hp', 'flex']
      : role === 'ranged'
        ? ['atk', 'hp', 'atk', 'atk', 'flex', 'atk', 'hp', 'atk', 'flex']
        : ['atk', 'hp', 'atk', 'hp', 'flex', 'atk', 'hp', 'atk', 'flex'];

  return pattern.map((type, idx) => ({
    type,
    unlockLevel: unlockLevels[idx],
    stoneId: null,
  }));
}

export function createOwnedCreature(
  speciesId: string,
  level = 1,
  potBonus = 0,
  uid?: string,
): OwnedCreature {
  const species = SPECIES[speciesId] ?? SPECIES.pyrocube;
  return {
    uid: uid ?? nextId('cubi'),
    speciesId: species.id,
    level: Math.max(1, Math.floor(level)),
    xp: 0,
    potBonus,
    moveId: species.moveId,
    moveStones: [null, null],
    stoneBoard: createStoneBoardForRole(species.role),
  };
}

/**
 * Compute full stats for a creature including level scaling, pot bonus, and equipped Power Stones
 */
export function computeCreatureStats(
  creature: OwnedCreature,
  allStones: PowerStone[],
): ComputedCreatureStats {
  const species = SPECIES[creature.speciesId] ?? SPECIES.pyrocube;
  const stoneMap = new Map(allStones.map((s) => [s.id, s]));

  let bonusHp = 0;
  let bonusAtk = 0;
  let critRate = 8; // 8% base crit
  let hitHeal = 0;
  let moveSpeedPct = 0;
  let statusRes = 0;

  for (const slot of creature.stoneBoard) {
    if (!slot.stoneId || creature.level < slot.unlockLevel) continue;
    const stone = stoneMap.get(slot.stoneId);
    if (!stone) continue;
    if (stone.kind === 'hp') bonusHp += stone.power;
    if (stone.kind === 'atk') bonusAtk += stone.power;
    for (const sub of stone.substats) {
      if (sub.type === 'critRate') critRate += sub.value;
      if (sub.type === 'hitHeal') hitHeal += sub.value;
      if (sub.type === 'moveSpeed') moveSpeedPct += sub.value;
      if (sub.type === 'statusRes') statusRes += sub.value;
    }
  }

  const levelHp = Math.round(species.baseHp + (creature.level - 1) * 18 + creature.potBonus);
  const levelAtk = Math.round(species.baseAtk + (creature.level - 1) * 15 + creature.potBonus);

  const maxHp = levelHp + bonusHp;
  const atk = levelAtk + bonusAtk;
  const power = maxHp + atk;

  return {
    maxHp,
    atk,
    power,
    critRate: Math.min(60, critRate),
    hitHeal: Math.min(25, hitHeal),
    moveSpeedMult: 1 + Math.min(0.6, moveSpeedPct / 100),
    statusRes: Math.min(80, statusRes),
  };
}

export function computeSquadPower(save: SaveState): number {
  let total = 0;
  for (const uid of save.squadIds) {
    const c = save.roster.find((r) => r.uid === uid);
    if (c) total += computeCreatureStats(c, save.powerStones).power;
  }
  return total;
}

export function getMoveModifiers(moveStones: (MoveStoneKind | null)[]): {
  damageMult: number;
  cooldownMult: number;
  radiusMult: number;
  shareRatio: number;
  critBonus: number; // points de % ajoutés au taux critique de la compétence
  leechRatio: number; // part des dégâts de compétence rendue en PV au lanceur
} {
  let damageMult = 1;
  let cooldownMult = 1;
  let radiusMult = 1;
  let shareRatio = 0;
  let critBonus = 0;
  let leechRatio = 0;

  for (const ms of moveStones) {
    if (ms === 'broadburst') radiusMult += 0.35;
    if (ms === 'wait_less') cooldownMult *= 0.82;
    if (ms === 'whack_whack') {
      damageMult += 0.4;
      cooldownMult *= 1.15;
    }
    if (ms === 'share') shareRatio += 0.5;
    if (ms === 'crit_focus') critBonus += 15;
    if (ms === 'leech') leechRatio += 0.1;
  }

  return {
    damageMult,
    cooldownMult: Math.max(0.45, cooldownMult),
    radiusMult,
    shareRatio: Math.min(1, shareRatio),
    critBonus,
    leechRatio: Math.min(0.2, leechRatio),
  };
}

export function calculateDamage(
  attackerAtk: number,
  move: Pick<MoveDef, 'element' | 'powerMultiplier'>,
  defenderElement: ElementType,
  critRate: number,
  moveStones: (MoveStoneKind | null)[] = [],
  defenderDefenseMult = 1,
  rng: RngFn = Math.random,
): { damage: number; isCrit: boolean; effectiveness: number } {
  const mods = getMoveModifiers(moveStones);
  const effectiveness = getTypeEffectiveness(move.element, defenderElement);
  const isCrit = rng() * 100 < critRate + mods.critBonus;
  const critMult = isCrit ? 1.55 : 1.0;
  const variance = 0.94 + rng() * 0.12;
  const raw =
    attackerAtk *
    move.powerMultiplier *
    mods.damageMult *
    effectiveness *
    critMult *
    variance *
    defenderDefenseMult;
  return {
    damage: Math.max(1, Math.round(raw)),
    isCrit,
    effectiveness,
  };
}

/**
 * Power Stone board validation & equipping
 */
export function canEquipStone(
  creature: OwnedCreature,
  slotIndex: number,
  stone: PowerStone,
): boolean {
  const slot = creature.stoneBoard[slotIndex];
  if (!slot) return false;
  if (creature.level < slot.unlockLevel) return false;
  if (slot.type === 'flex') return true;
  return slot.type === stone.kind;
}

export function isStoneEquippedAnywhere(save: SaveState, stoneId: string): string | null {
  for (const c of save.roster) {
    if (c.stoneBoard.some((s) => s.stoneId === stoneId)) {
      return c.uid;
    }
  }
  return null;
}

export function equipPowerStone(
  save: SaveState,
  creatureUid: string,
  slotIndex: number,
  stoneId: string,
): SaveState {
  const stone = save.powerStones.find((s) => s.id === stoneId);
  const target = save.roster.find((c) => c.uid === creatureUid);
  if (!stone || !target || !canEquipStone(target, slotIndex, stone)) {
    return save;
  }

  // Unequip this stone from any other slot first
  const nextRoster = save.roster.map((c) => {
    const cleanedBoard = c.stoneBoard.map((slot) =>
      slot.stoneId === stoneId ? { ...slot, stoneId: null } : slot,
    );
    if (c.uid !== creatureUid) {
      return { ...c, stoneBoard: cleanedBoard };
    }
    const updatedBoard = cleanedBoard.map((slot, idx) =>
      idx === slotIndex ? { ...slot, stoneId } : slot,
    );
    return { ...c, stoneBoard: updatedBoard };
  });

  return { ...save, roster: nextRoster };
}

export function unequipPowerStone(
  save: SaveState,
  creatureUid: string,
  slotIndex: number,
): SaveState {
  return {
    ...save,
    roster: save.roster.map((c) => {
      if (c.uid !== creatureUid) return c;
      return {
        ...c,
        stoneBoard: c.stoneBoard.map((slot, idx) =>
          idx === slotIndex ? { ...slot, stoneId: null } : slot,
        ),
      };
    }),
  };
}

export function equipMoveStone(
  save: SaveState,
  creatureUid: string,
  slotIndex: number,
  kind: MoveStoneKind | null,
): SaveState {
  if (slotIndex < 0 || slotIndex > 1) return save;
  const target = save.roster.find((c) => c.uid === creatureUid);
  if (!target) return save;

  const currentKind = target.moveStones[slotIndex];
  if (currentKind === kind) return save;

  const nextBag = { ...save.moveStoneBag };
  if (kind !== null && (nextBag[kind] ?? 0) <= 0) {
    return save;
  }

  if (currentKind !== null) {
    nextBag[currentKind] = (nextBag[currentKind] ?? 0) + 1;
  }
  if (kind !== null) {
    nextBag[kind] = Math.max(0, (nextBag[kind] ?? 0) - 1);
  }

  const nextRoster = save.roster.map((c) => {
    if (c.uid !== creatureUid) return c;
    const nextMoveStones = [...c.moveStones];
    nextMoveStones[slotIndex] = kind;
    return { ...c, moveStones: nextMoveStones };
  });

  return {
    ...save,
    roster: nextRoster,
    moveStoneBag: nextBag,
  };
}

/**
 * Evolution logic
 */
export function canEvolve(creature: OwnedCreature): boolean {
  const species = SPECIES[creature.speciesId];
  if (!species || !species.evolvesTo || !species.evolveLevel) return false;
  return creature.level >= species.evolveLevel;
}

export function evolveCreature(save: SaveState, creatureUid: string): SaveState {
  const target = save.roster.find((c) => c.uid === creatureUid);
  if (!target || !canEvolve(target)) return save;

  const oldSpecies = SPECIES[target.speciesId];
  const nextSpeciesId = oldSpecies.evolvesTo!;
  const nextSpecies = SPECIES[nextSpeciesId];
  if (!nextSpecies) return save;

  const discovered = save.discoveredSpeciesIds.includes(nextSpeciesId)
    ? save.discoveredSpeciesIds
    : [...save.discoveredSpeciesIds, nextSpeciesId];

  const updated: SaveState = {
    ...save,
    discoveredSpeciesIds: discovered,
    roster: save.roster.map((c) =>
      c.uid === creatureUid
        ? {
            ...c,
            speciesId: nextSpeciesId,
            moveId: nextSpecies.moveId,
          }
        : c,
    ),
  };
  return recordPlayerProgress(updated, { evolutionsDone: 1 });
}

/**
 * Cooking Pot Recipe Resolution (5 ingredient slots)
 */
export function resolveRecipe(ingredientIds: (string | null)[]): RecipeDef | null {
  const valid = ingredientIds.filter((id): id is string => Boolean(id && INGREDIENTS[id]));
  if (valid.length < 5) return null;

  const colorCounts = { red: 0, blue: 0, yellow: 0, gray: 0 };
  let rareCount = 0;
  let mysticCount = 0;
  let sunPollenCount = 0;
  let azureDropCount = 0;
  const idCounts: Record<string, number> = {};

  for (const id of valid) {
    const ing = INGREDIENTS[id];
    idCounts[id] = (idCounts[id] ?? 0) + 1;
    colorCounts[ing.color] += 1;
    if (ing.rarity === 'rare') rareCount += 1;
    if (ing.rarity === 'mystic') mysticCount += 1;
    if (id === 'sun_pollen') sunPollenCount += 1;
    if (id === 'azure_drop') azureDropCount += 1;
  }

  // Giga Update : les recettes des nouveaux biomes dépendent d'ingrédients précis, donc
  // elles passent avant les règles génériques par couleur/rareté.
  const lichen = idCounts.snow_lichen ?? 0;
  const aurora = idCounts.aurora_petal ?? 0;
  const pepper = idCounts.storm_pepper ?? 0;
  const fluff = idCounts.cloud_fluff ?? 0;
  if (aurora >= 2 && mysticCount >= 1) return RECIPE_BY_ID.aurora_banquet;
  if (lichen >= 3) return RECIPE_BY_ID.glacier_sorbet;
  if (lichen >= 2 && (idCounts.pebble_gray ?? 0) >= 2) return RECIPE_BY_ID.permafrost_fondue;
  if (pepper >= 2) return RECIPE_BY_ID.thunder_tajine;
  if (fluff >= 3) return RECIPE_BY_ID.cloud_meringue;
  if (lichen >= 1 && fluff >= 1) return RECIPE_BY_ID.frontier_hotpot;

  // Priority order from rarest/most specific to general
  if (mysticCount >= 2) return RECIPE_BY_ID.ambrosia_legends;
  if (rareCount + mysticCount === 5) return RECIPE_BY_ID.royal_feast;
  if (mysticCount >= 1 || rareCount >= 3) return RECIPE_BY_ID.astral_veloute;
  if (sunPollenCount >= 2 && azureDropCount >= 2) return RECIPE_BY_ID.sweet_crepe;
  if (colorCounts.red >= 3) return RECIPE_BY_ID.fiery_soup;
  if (colorCounts.blue >= 3) return RECIPE_BY_ID.ocean_nectar;
  if (colorCounts.yellow >= 3) return RECIPE_BY_ID.spark_curry;
  if (colorCounts.gray >= 3) return RECIPE_BY_ID.mineral_stew;
  if (colorCounts.yellow >= 2 && (colorCounts.red >= 2 || colorCounts.blue >= 2)) {
    return RECIPE_BY_ID.botanical_broth;
  }
  return RECIPE_BY_ID.mulligan_stew;
}

export function getPotIngredientCost(tier: PotTier): number {
  return POT_TIER_META[tier].costMultiplier;
}

export function startCookingPot(save: SaveState): SaveState {
  if (save.pot.status !== 'idle') return save;
  const recipe = resolveRecipe(save.pot.slots);
  if (!recipe) return save;

  const costPerSlot = getPotIngredientCost(save.pot.tier);
  const needed: Record<string, number> = {};
  for (const id of save.pot.slots) {
    if (!id) return save;
    needed[id] = (needed[id] ?? 0) + costPerSlot;
  }

  for (const [id, qty] of Object.entries(needed)) {
    if ((save.ingredients[id] ?? 0) < qty) {
      return save;
    }
  }

  const nextIngredients = { ...save.ingredients };
  for (const [id, qty] of Object.entries(needed)) {
    nextIngredients[id] = Math.max(0, (nextIngredients[id] ?? 0) - qty);
  }

  const nextDiscoveredRecipes = save.discoveredRecipeIds.includes(recipe.id)
    ? save.discoveredRecipeIds
    : [...save.discoveredRecipeIds, recipe.id];

  const updated: SaveState = {
    ...save,
    ingredients: nextIngredients,
    discoveredRecipeIds: nextDiscoveredRecipes,
    pot: {
      ...save.pot,
      status: 'cooking',
      recipeId: recipe.id,
      expeditionsRemaining: recipe.cookExpeditions,
      expeditionsTotal: recipe.cookExpeditions,
    },
  };
  return recordPlayerProgress(updated, {
    dishesCooked: 1,
    frontierDishes: recipe.frontier ? 1 : 0,
  });
}

export function rollCreatureFromPot(
  tier: PotTier,
  recipe: RecipeDef,
  rng: RngFn = Math.random,
): OwnedCreature {
  const tierMeta = POT_TIER_META[tier];
  const pool = recipe.poolSpeciesIds;
  // Higher pot tiers favor later/rarer entries in the pool
  let idx = Math.floor(rng() * pool.length);
  if (tier === 'silver' || tier === 'gold') {
    const secondRoll = Math.floor(rng() * pool.length);
    idx = Math.max(idx, secondRoll);
  }
  const speciesId = pool[idx] ?? 'pyrocube';
  const levelSpan = tierMeta.maxLevel - tierMeta.minLevel + 1;
  const level = tierMeta.minLevel + Math.floor(rng() * levelSpan);
  return createOwnedCreature(speciesId, level, tierMeta.statBonus);
}

export function collectCookedCreature(
  save: SaveState,
  rng: RngFn = Math.random,
): { nextSave: SaveState; creature: OwnedCreature | null } {
  if (save.pot.status !== 'ready' || !save.pot.recipeId) {
    return { nextSave: save, creature: null };
  }
  const recipe = RECIPE_BY_ID[save.pot.recipeId] ?? RECIPES[RECIPES.length - 1];
  const creature = rollCreatureFromPot(save.pot.tier, recipe, rng);

  const nextDiscovered = save.discoveredSpeciesIds.includes(creature.speciesId)
    ? save.discoveredSpeciesIds
    : [...save.discoveredSpeciesIds, creature.speciesId];

  const nextSave: SaveState = {
    ...save,
    roster: [...save.roster, creature],
    discoveredSpeciesIds: nextDiscovered,
    pot: {
      ...save.pot,
      slots: [null, null, null, null, null],
      status: 'idle',
      recipeId: null,
      expeditionsRemaining: 0,
      expeditionsTotal: 0,
    },
  };
  return { nextSave, creature };
}

/**
 * Generate a Power Stone drop for a stage
 */
export function generatePowerStone(
  powerRange: [number, number],
  rng: RngFn = Math.random,
  forcedRarity?: StoneRarity,
): PowerStone {
  const [minP, maxP] = powerRange;
  const kind = rng() < 0.5 ? 'atk' : 'hp';
  const rarityRoll = rng();
  let rarity: StoneRarity = forcedRarity ?? 'common';
  if (!forcedRarity) {
    if (rarityRoll > 0.88) rarity = 'gold';
    else if (rarityRoll > 0.65) rarity = 'silver';
    else if (rarityRoll > 0.35) rarity = 'bronze';
  }

  let substatCount = 0;
  let bonusMult = 1;
  if (rarity === 'gold') {
    substatCount = 3;
    bonusMult = 1.15;
  } else if (rarity === 'silver') {
    substatCount = 2;
    bonusMult = 1.08;
  } else if (rarity === 'bronze') {
    substatCount = 1;
    bonusMult = 1.03;
  }

  const power = Math.round((minP + rng() * (maxP - minP)) * bonusMult);
  const pool: PowerStoneSubstat['type'][] = ['critRate', 'hitHeal', 'moveSpeed', 'statusRes'];
  const substats: PowerStoneSubstat[] = [];

  for (let i = 0; i < substatCount; i++) {
    const type = pool[Math.floor(rng() * pool.length)];
    const value =
      type === 'hitHeal'
        ? Math.round(2 + rng() * 3)
        : type === 'critRate'
          ? Math.round(4 + rng() * 7)
          : Math.round(6 + rng() * 10);
    substats.push({ type, value });
  }

  return {
    id: nextId('stone'),
    kind,
    power,
    rarity,
    substats,
  };
}

/**
 * Apply expedition outcome rewards, XP, level-ups, pot cooking tick, quest tracking, and unlocks
 */
export function applyExpeditionRewards(
  save: SaveState,
  stage: StageDef,
  victory: boolean,
  stats: {
    clearTimeSec: number;
    wavesCleared: number;
    damageDealt: number;
    bossHpPercentRemaining: number;
    reactionsTriggered?: number;
    ultimatesUsed?: number;
    perfectDodges?: number;
    maxCombo?: number;
  },
  rng: RngFn = Math.random,
): { nextSave: SaveState; outcome: ExpeditionOutcome } {
  const biome = BIOMES[stage.biomeId];
  const xpPerUnit = victory
    ? stage.xpReward
    : Math.max(15, Math.round(stage.xpReward * 0.25 * (stats.wavesCleared / stage.waves.length)));

  const leveledUpNames: string[] = [];
  const nextRoster = save.roster.map((c) => {
    if (!save.squadIds.includes(c.uid)) return c;
    let level = c.level;
    let xp = c.xp + xpPerUnit;
    const startLevel = level;
    while (xp >= xpForNextLevel(level) && level < 50) {
      xp -= xpForNextLevel(level);
      level += 1;
    }
    if (level > startLevel) {
      leveledUpNames.push(`${SPECIES[c.speciesId]?.name ?? 'Cubimon'} Niv.${level}`);
    }
    return { ...c, level, xp };
  });

  // Drops
  const droppedIngredientsMap: Record<string, number> = {};
  const dropCount = victory ? 5 : Math.max(1, stats.wavesCleared);
  for (let i = 0; i < dropCount; i++) {
    const id = stage.dropIngredients[Math.floor(rng() * stage.dropIngredients.length)];
    droppedIngredientsMap[id] = (droppedIngredientsMap[id] ?? 0) + 1;
  }

  const nextIngredients = { ...save.ingredients };
  for (const [id, count] of Object.entries(droppedIngredientsMap)) {
    nextIngredients[id] = (nextIngredients[id] ?? 0) + count;
  }

  const droppedStone = victory ? generatePowerStone(stage.stonePowerRange, rng) : null;
  const nextPowerStones = droppedStone
    ? [droppedStone, ...save.powerStones].slice(0, 48)
    : save.powerStones;

  let droppedMoveStone: MoveStoneKind | null = null;
  const nextMoveStoneBag = { ...save.moveStoneBag };
  if (victory && rng() < 0.55) {
    // Les Pierres Précision / Sangsue ne tombent que dans les nouveaux biomes
    const kinds: MoveStoneKind[] =
      stage.index >= FRONTIER_STAGE_INDEX ? MOVE_STONE_ORDER : BASE_MOVE_STONE_KINDS;
    droppedMoveStone = kinds[Math.floor(rng() * kinds.length)];
    nextMoveStoneBag[droppedMoveStone] = (nextMoveStoneBag[droppedMoveStone] ?? 0) + 1;
  }

  // Advance Cooking Pot if cooking
  let nextPot = { ...save.pot };
  let potReadyNow = false;
  if (nextPot.status === 'cooking') {
    const remaining = Math.max(0, nextPot.expeditionsRemaining - 1);
    nextPot = {
      ...nextPot,
      expeditionsRemaining: remaining,
      status: remaining === 0 ? 'ready' : 'cooking',
    };
    if (remaining === 0) potReadyNow = true;
  }

  // Stage & Pot unlocks
  let highestStageIndex = save.highestStageIndex;
  let unlockedNextStageName: string | null = null;
  const completedStageIds = save.completedStageIds.includes(stage.id)
    ? save.completedStageIds
    : victory
      ? [...save.completedStageIds, stage.id]
      : save.completedStageIds;

  if (victory && stage.index >= highestStageIndex && stage.index + 1 < STAGES.length) {
    highestStageIndex = stage.index + 1;
    unlockedNextStageName = STAGES[highestStageIndex].name;
  }

  // Le niveau débloqué ouvre-t-il un nouveau biome ? (mis en avant sur l'écran de victoire)
  let unlockedBiomeName: string | null = null;
  if (unlockedNextStageName && STAGES[highestStageIndex].biomeId !== stage.biomeId) {
    unlockedBiomeName = BIOMES[STAGES[highestStageIndex].biomeId].name;
  }

  const unlockedPotTiers = [...save.unlockedPotTiers];
  let unlockedPotTier: PotTier | null = null;
  if (victory) {
    if (stage.id === 'meadow-3' && !unlockedPotTiers.includes('bronze')) {
      unlockedPotTiers.push('bronze');
      unlockedPotTier = 'bronze';
    } else if (stage.id === 'shore-3' && !unlockedPotTiers.includes('silver')) {
      unlockedPotTiers.push('silver');
      unlockedPotTier = 'silver';
    } else if (stage.id === 'volcano-3' && !unlockedPotTiers.includes('gold')) {
      unlockedPotTiers.push('gold');
      unlockedPotTier = 'gold';
    }
  }

  // Discover boss species on sight
  const nextDiscovered = save.discoveredSpeciesIds.includes(stage.bossSpeciesId)
    ? save.discoveredSpeciesIds
    : [...save.discoveredSpeciesIds, stage.bossSpeciesId];

  const reactionsTriggered = Math.max(0, Math.round(stats.reactionsTriggered ?? 0));
  const ultimatesUsed = Math.max(0, Math.round(stats.ultimatesUsed ?? 0));
  const perfectDodges = Math.max(0, Math.round(stats.perfectDodges ?? 0));
  const maxCombo = Math.max(0, Math.round(stats.maxCombo ?? 0));

  const baseNextSave: SaveState = {
    ...save,
    roster: nextRoster,
    ingredients: nextIngredients,
    powerStones: nextPowerStones,
    moveStoneBag: nextMoveStoneBag,
    pot: nextPot,
    unlockedPotTiers,
    highestStageIndex,
    completedStageIds,
    discoveredSpeciesIds: nextDiscovered,
    expeditionsCompleted: save.expeditionsCompleted + (victory ? 1 : 0),
  };

  const nextSave = recordPlayerProgress(baseNextSave, {
    expeditionsWon: victory ? 1 : 0,
    bossesDefeated: victory ? 1 : 0,
    frontierWins: victory && stage.index >= FRONTIER_STAGE_INDEX ? 1 : 0,
    reactionsTriggered,
    ultimatesUsed,
    perfectDodges,
    maxCombo,
  });

  const outcome: ExpeditionOutcome = {
    victory,
    stageId: stage.id,
    stageName: stage.name,
    biomeName: biome.name,
    clearTimeSec: stats.clearTimeSec,
    wavesCleared: stats.wavesCleared,
    totalWaves: stage.waves.length,
    damageDealt: Math.round(stats.damageDealt),
    bossHpPercentRemaining: Math.max(0, Math.min(100, Math.round(stats.bossHpPercentRemaining))),
    reactionsTriggered,
    ultimatesUsed,
    perfectDodges,
    maxCombo,
    xpPerUnit,
    droppedIngredients: Object.entries(droppedIngredientsMap).map(([id, count]) => ({
      id,
      count,
    })),
    droppedStone,
    droppedMoveStone,
    leveledUpNames,
    potReadyNow,
    unlockedNextStageName,
    unlockedBiomeName,
    unlockedPotTier,
  };

  return { nextSave, outcome };
}

/**
 * Étoiles de l'écran de victoire (0 en cas de défaite) :
 * 1 = victoire, +1 pour au moins 2 réactions élémentaires, +1 pour un Ultime ou une esquive parfaite.
 * Purement cosmétique : rien n'est stocké dans la sauvegarde.
 */
export function computeVictoryStars(
  outcome: Pick<ExpeditionOutcome, 'victory' | 'reactionsTriggered' | 'ultimatesUsed' | 'perfectDodges'>,
): 0 | 1 | 2 | 3 {
  if (!outcome.victory) return 0;
  const tactical = outcome.reactionsTriggered >= 2 ? 1 : 0;
  const clutch = outcome.ultimatesUsed >= 1 || outcome.perfectDodges >= 1 ? 1 : 0;
  return (1 + tactical + clutch) as 1 | 2 | 3;
}

/**
 * Build deterministic starting SaveState for instant playability
 */
export function createInitialSaveState(
  starterSpeciesId: string = 'pyrocube',
  starterChosen = false,
): SaveState {
  const starter = createOwnedCreature(starterSpeciesId, 4, 15, 'starter_1');
  const companionA = createOwnedCreature(
    starterSpeciesId === 'bourgeon' ? 'aquabloc' : 'bourgeon',
    3,
    0,
    'starter_2',
  );
  const companionB = createOwnedCreature(
    starterSpeciesId === 'pyrocube' ? 'voltik' : 'pyrocube',
    3,
    0,
    'starter_3',
  );
  // Also give a 4th bench creature so roster swapping works right away
  const benchTank = createOwnedCreature('cailloc', 3, 0, 'starter_4');

  const startingStones: PowerStone[] = [
    {
      id: 'init_stone_atk_1',
      kind: 'atk',
      power: 48,
      rarity: 'bronze',
      substats: [{ type: 'critRate', value: 6 }],
    },
    {
      id: 'init_stone_hp_1',
      kind: 'hp',
      power: 52,
      rarity: 'bronze',
      substats: [{ type: 'hitHeal', value: 3 }],
    },
    {
      id: 'init_stone_atk_2',
      kind: 'atk',
      power: 36,
      rarity: 'common',
      substats: [],
    },
    {
      id: 'init_stone_hp_2',
      kind: 'hp',
      power: 40,
      rarity: 'common',
      substats: [],
    },
  ];

  // Equip one starter stone so player sees the board in action, leave others in bag to equip
  starter.stoneBoard[0].stoneId = 'init_stone_atk_1';
  companionA.stoneBoard[0].stoneId = 'init_stone_hp_1';

  return {
    version: SAVE_VERSION,
    starterChosen,
    squadIds: [starter.uid, companionA.uid, companionB.uid],
    roster: [starter, companionA, companionB, benchTank],
    ingredients: {
      ruby_berry: 6,
      crimson_root: 2,
      azure_drop: 6,
      frost_crystal: 2,
      sun_pollen: 6,
      amber_honey: 2,
      pebble_gray: 5,
      mystic_shard: 1,
    },
    powerStones: startingStones,
    moveStoneBag: {
      broadburst: 1,
      wait_less: 1,
      whack_whack: 1,
      share: 1,
      crit_focus: 0,
      leech: 0,
    },
    pot: {
      tier: 'iron',
      slots: [null, null, null, null, null],
      status: 'idle',
      recipeId: null,
      expeditionsRemaining: 0,
      expeditionsTotal: 0,
    },
    unlockedPotTiers: ['iron'],
    highestStageIndex: 0,
    completedStageIds: [],
    discoveredSpeciesIds: Array.from(
      new Set([starter.speciesId, companionA.speciesId, companionB.speciesId, benchTank.speciesId]),
    ),
    discoveredRecipeIds: [],
    expeditionsCompleted: 0,
    stats: createEmptyStats(),
    activeQuests: createInitialQuests(),
    claimedAchievementIds: [],
  };
}

export function createEmptyStats(): PlayerStats {
  return {
    expeditionsWon: 0,
    reactionsTriggered: 0,
    ultimatesUsed: 0,
    dishesCooked: 0,
    evolutionsDone: 0,
    perfectDodges: 0,
    bossesDefeated: 0,
    maxCombo: 0,
    frontierWins: 0,
    frontierDishes: 0,
  };
}

/** Une quête n'est proposée que si le niveau qu'elle exige est débloqué. */
export function isQuestTemplateAvailable(
  template: QuestTemplate,
  save: Pick<SaveState, 'highestStageIndex'>,
): boolean {
  return (template.requiresStageIndex ?? 0) <= save.highestStageIndex;
}

export function createInitialQuests(): ActiveQuest[] {
  return QUEST_POOL.slice(0, 3).map((tpl, idx) => ({
    uid: `quest_init_${idx + 1}`,
    templateId: tpl.templateId,
    title: tpl.title,
    description: tpl.description,
    metric: tpl.metric,
    progress: 0,
    target: tpl.target,
    reward: tpl.reward,
  }));
}

export function recordPlayerProgress(
  save: SaveState,
  deltas: Partial<PlayerStats>,
): SaveState {
  const prevStats = save.stats ?? createEmptyStats();
  const nextStats: PlayerStats = {
    expeditionsWon: prevStats.expeditionsWon + (deltas.expeditionsWon ?? 0),
    reactionsTriggered: prevStats.reactionsTriggered + (deltas.reactionsTriggered ?? 0),
    ultimatesUsed: prevStats.ultimatesUsed + (deltas.ultimatesUsed ?? 0),
    dishesCooked: prevStats.dishesCooked + (deltas.dishesCooked ?? 0),
    evolutionsDone: prevStats.evolutionsDone + (deltas.evolutionsDone ?? 0),
    perfectDodges: prevStats.perfectDodges + (deltas.perfectDodges ?? 0),
    bossesDefeated: prevStats.bossesDefeated + (deltas.bossesDefeated ?? 0),
    maxCombo: Math.max(prevStats.maxCombo, deltas.maxCombo ?? 0),
    frontierWins: (prevStats.frontierWins ?? 0) + (deltas.frontierWins ?? 0),
    frontierDishes: (prevStats.frontierDishes ?? 0) + (deltas.frontierDishes ?? 0),
  };

  const nextQuests = (save.activeQuests ?? createInitialQuests()).map((q) => {
    const inc =
      q.metric === 'expeditionsWon'
        ? deltas.expeditionsWon ?? 0
        : q.metric === 'reactionsTriggered'
          ? deltas.reactionsTriggered ?? 0
          : q.metric === 'ultimatesUsed'
            ? deltas.ultimatesUsed ?? 0
            : q.metric === 'dishesCooked'
              ? deltas.dishesCooked ?? 0
              : q.metric === 'perfectDodges'
                ? deltas.perfectDodges ?? 0
                : q.metric === 'bossesDefeated'
                  ? deltas.bossesDefeated ?? 0
                  : q.metric === 'evolutionsDone'
                    ? deltas.evolutionsDone ?? 0
                    : q.metric === 'frontierWins'
                      ? deltas.frontierWins ?? 0
                      : q.metric === 'frontierDishes'
                        ? deltas.frontierDishes ?? 0
                        : 0;
    if (inc <= 0) return q;
    return {
      ...q,
      progress: Math.min(q.target, q.progress + inc),
    };
  });

  return {
    ...save,
    stats: nextStats,
    activeQuests: nextQuests,
  };
}

function applyRewardToSave(
  save: SaveState,
  reward: QuestReward,
  rng: RngFn = Math.random,
): SaveState {
  const nextIngredients = { ...save.ingredients };
  if (reward.ingredients) {
    for (const [id, qty] of Object.entries(reward.ingredients)) {
      nextIngredients[id] = (nextIngredients[id] ?? 0) + qty;
    }
  }

  const nextMoveStoneBag = { ...save.moveStoneBag };
  if (reward.moveStone) {
    nextMoveStoneBag[reward.moveStone] = (nextMoveStoneBag[reward.moveStone] ?? 0) + 1;
  }

  let nextPowerStones = save.powerStones;
  if (reward.powerStoneRange) {
    const stone = generatePowerStone(reward.powerStoneRange, rng, reward.guaranteedRarity);
    nextPowerStones = [stone, ...save.powerStones].slice(0, 48);
  }

  return {
    ...save,
    ingredients: nextIngredients,
    moveStoneBag: nextMoveStoneBag,
    powerStones: nextPowerStones,
  };
}

export function claimQuestReward(
  save: SaveState,
  questUid: string,
  rng: RngFn = Math.random,
): SaveState {
  const quest = save.activeQuests.find((q) => q.uid === questUid);
  if (!quest || quest.progress < quest.target) return save;

  const rewarded = applyRewardToSave(save, quest.reward, rng);
  const currentTemplates = new Set(save.activeQuests.map((q) => q.templateId));
  // Rotation limitée aux quêtes dont le contenu est déjà accessible au joueur
  const eligible = QUEST_POOL.filter((t) => isQuestTemplateAvailable(t, save));
  const candidates = eligible.filter((t) => !currentTemplates.has(t.templateId));
  const nextTpl =
    candidates[Math.floor(rng() * candidates.length)] ??
    eligible[(eligible.findIndex((t) => t.templateId === quest.templateId) + 1) % eligible.length];

  const replacement: ActiveQuest = {
    uid: nextId('quest'),
    templateId: nextTpl.templateId,
    title: nextTpl.title,
    description: nextTpl.description,
    metric: nextTpl.metric,
    progress: 0,
    target: nextTpl.target,
    reward: nextTpl.reward,
  };

  return {
    ...rewarded,
    activeQuests: rewarded.activeQuests.map((q) => (q.uid === questUid ? replacement : q)),
  };
}

export function getAchievementProgress(save: SaveState, ach: AchievementDef): number {
  const stats = save.stats ?? createEmptyStats();
  switch (ach.metric) {
    case 'expeditionsWon':
      return Math.max(stats.expeditionsWon, save.expeditionsCompleted);
    case 'reactionsTriggered':
      return stats.reactionsTriggered;
    case 'ultimatesUsed':
      return stats.ultimatesUsed;
    case 'dishesCooked':
      return stats.dishesCooked;
    case 'perfectDodges':
      return stats.perfectDodges;
    case 'bossesDefeated':
      return stats.bossesDefeated;
    case 'evolutionsDone':
      return stats.evolutionsDone;
    case 'stagesCompleted':
      return save.completedStageIds.length;
    case 'speciesDiscovered':
      return save.discoveredSpeciesIds.length;
    case 'maxCombo':
      return stats.maxCombo;
    case 'frontierWins':
      return stats.frontierWins ?? 0;
    case 'frontierDishes':
      return stats.frontierDishes ?? 0;
    case 'tundraStages':
      return getBiomeProgress(save, 'tundra').completed;
    case 'stormStages':
      return getBiomeProgress(save, 'stormpeak').completed;
  }
}

export function claimAchievementReward(
  save: SaveState,
  achId: string,
  rng: RngFn = Math.random,
): SaveState {
  if (save.claimedAchievementIds.includes(achId)) return save;
  const ach = ACHIEVEMENTS.find((a) => a.id === achId);
  if (!ach) return save;
  if (getAchievementProgress(save, ach) < ach.target) return save;

  const rewarded = applyRewardToSave(save, ach.reward, rng);
  return {
    ...rewarded,
    claimedAchievementIds: [...rewarded.claimedAchievementIds, achId],
  };
}

export function countClaimableRewards(save: SaveState): number {
  const questsReady = (save.activeQuests ?? []).filter((q) => q.progress >= q.target).length;
  const achReady = ACHIEVEMENTS.filter(
    (a) =>
      !(save.claimedAchievementIds ?? []).includes(a.id) &&
      getAchievementProgress(save, a) >= a.target,
  ).length;
  return questsReady + achReady;
}

/**
 * Migrate v1 / v2 SaveState or normalize v3 SaveState cleanly without losing user progress.
 * v2 -> v3 : ajoute les Pierres Précision/Sangsue (0) au sac, les stats frontierWins/frontierDishes (0)
 * et ouvre la Toundra aux sauvegardes qui avaient déjà vaincu l'ancien dernier niveau.
 */
export function migrateSaveState(raw: unknown): SaveState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<SaveState>;
  if (!Array.isArray(obj.roster) || obj.roster.length === 0) return null;
  if (!Array.isArray(obj.squadIds) || !obj.pot || typeof obj.ingredients !== 'object') return null;
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== SAVE_VERSION) return null;

  // Validate roster creatures minimally
  const validRoster = obj.roster.filter(
    (c): c is OwnedCreature =>
      Boolean(
        c &&
          typeof c.uid === 'string' &&
          typeof c.speciesId === 'string' &&
          SPECIES[c.speciesId] &&
          typeof c.level === 'number' &&
          Array.isArray(c.stoneBoard),
      ),
  );
  if (validRoster.length === 0) return null;

  const rosterIds = new Set(validRoster.map((c) => c.uid));
  const validSquad = obj.squadIds.filter((id) => typeof id === 'string' && rosterIds.has(id)).slice(0, 3);
  if (validSquad.length === 0) validSquad.push(validRoster[0].uid);

  const baseStats = createEmptyStats();
  const incomingStats = (obj.stats ?? {}) as Partial<PlayerStats>;
  const expeditionsCompleted = Number.isFinite(obj.expeditionsCompleted)
    ? Math.max(0, Number(obj.expeditionsCompleted))
    : 0;

  const stats: PlayerStats = {
    expeditionsWon: Math.max(expeditionsCompleted, Number(incomingStats.expeditionsWon ?? 0) || 0),
    reactionsTriggered: Number(incomingStats.reactionsTriggered ?? 0) || 0,
    ultimatesUsed: Number(incomingStats.ultimatesUsed ?? 0) || 0,
    dishesCooked: Number(incomingStats.dishesCooked ?? 0) || 0,
    evolutionsDone: Number(incomingStats.evolutionsDone ?? 0) || 0,
    perfectDodges: Number(incomingStats.perfectDodges ?? 0) || 0,
    bossesDefeated: Math.max(expeditionsCompleted, Number(incomingStats.bossesDefeated ?? 0) || 0),
    maxCombo: Number(incomingStats.maxCombo ?? 0) || 0,
    frontierWins: Number(incomingStats.frontierWins ?? 0) || 0,
    frontierDishes: Number(incomingStats.frontierDishes ?? 0) || 0,
  };

  const activeQuests =
    Array.isArray(obj.activeQuests) && obj.activeQuests.length === 3
      ? obj.activeQuests
      : createInitialQuests();

  const claimedAchievementIds = Array.isArray(obj.claimedAchievementIds)
    ? obj.claimedAchievementIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    version: SAVE_VERSION,
    starterChosen: Boolean(obj.starterChosen),
    squadIds: validSquad,
    roster: validRoster,
    ingredients: { ...obj.ingredients },
    powerStones: Array.isArray(obj.powerStones) ? obj.powerStones : [],
    moveStoneBag: {
      broadburst: obj.moveStoneBag?.broadburst ?? 0,
      wait_less: obj.moveStoneBag?.wait_less ?? 0,
      whack_whack: obj.moveStoneBag?.whack_whack ?? 0,
      share: obj.moveStoneBag?.share ?? 0,
      crit_focus: obj.moveStoneBag?.crit_focus ?? 0,
      leech: obj.moveStoneBag?.leech ?? 0,
    },
    pot: {
      tier: obj.pot.tier ?? 'iron',
      slots: Array.isArray(obj.pot.slots) && obj.pot.slots.length === 5 ? obj.pot.slots : [null, null, null, null, null],
      status: obj.pot.status ?? 'idle',
      recipeId: obj.pot.recipeId ?? null,
      expeditionsRemaining: Number(obj.pot.expeditionsRemaining ?? 0) || 0,
      expeditionsTotal: Number(obj.pot.expeditionsTotal ?? 0) || 0,
    },
    unlockedPotTiers: Array.isArray(obj.unlockedPotTiers) && obj.unlockedPotTiers.length > 0 ? obj.unlockedPotTiers : ['iron'],
    highestStageIndex: computeHighestUnlockedStageIndex(
      Array.isArray(obj.completedStageIds) ? obj.completedStageIds : [],
      Math.max(0, Math.min(STAGES.length - 1, Number(obj.highestStageIndex ?? 0) || 0)),
    ),
    completedStageIds: Array.isArray(obj.completedStageIds) ? obj.completedStageIds : [],
    discoveredSpeciesIds: Array.isArray(obj.discoveredSpeciesIds) ? obj.discoveredSpeciesIds : validRoster.map((c) => c.speciesId),
    discoveredRecipeIds: Array.isArray(obj.discoveredRecipeIds) ? obj.discoveredRecipeIds : [],
    expeditionsCompleted,
    stats,
    activeQuests,
    claimedAchievementIds,
  };
}

export function exportSaveToJson(save: SaveState): string {
  return JSON.stringify(save, null, 2);
}

export function importSaveFromJson(
  rawJson: string,
): { ok: true; save: SaveState } | { ok: false; error: string } {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return { ok: false, error: 'Le contenu JSON est vide.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Format JSON invalide. Vérifiez que le fichier n’est pas tronqué.' };
  }
  const migrated = migrateSaveState(parsed);
  if (!migrated) {
    return {
      ok: false,
      error: 'Sauvegarde CubiQuest non reconnue ou incomplète (version ou escouade manquante).',
    };
  }
  return { ok: true, save: migrated };
}

export function loadSaveState(): SaveState {
  try {
    const rawV2 = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (rawV2) {
      const migrated = migrateSaveState(JSON.parse(rawV2));
      if (migrated) return migrated;
    }
    const rawV1 = window.localStorage.getItem(LEGACY_SAVE_STORAGE_KEY);
    if (rawV1) {
      const migrated = migrateSaveState(JSON.parse(rawV1));
      if (migrated) {
        persistSaveState(migrated);
        return migrated;
      }
    }
    return createInitialSaveState('pyrocube', false);
  } catch {
    return createInitialSaveState('pyrocube', false);
  }
}

export function persistSaveState(save: SaveState): void {
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore quota errors in restricted sandboxes
  }
}

export function getMoveDef(moveId: string): MoveDef {
  return MOVES[moveId] ?? MOVES.ember_burst;
}
