import {
  ACHIEVEMENTS,
  BASE_RUNE_KINDS,
  BIOMES,
  FRONTIER_STAGE_INDEX,
  RUNE_ORDER,
  ELEMENT_META,
  MOVES,
  QUEST_POOL,
  STARTER_TRIOS,
  STARTER_TRIO_IDS,
  STARTER_JOINER,
  UNLOCKS,
  UNLOCK_FEATURES,
  type StarterTrioId,
  type UnlockFeature,
  STAGE_CHALLENGES,
  SPECIES,
  STAGES,
  STATUS_META,
} from './catalog';
import { CUBE_KIT, STAR_TIERS, SUMMON, XP_KIT, type CubeMaterial } from './balance';
import { addSealedCubes, bondMultiplier, lineageOf } from './summon';
export { openSealedCube, addSealedCubes, lineageOf, displayedOdds, bondMultiplier } from './summon';
import type {
  AchievementDef,
  ActiveQuest,
  BiomeId,
  ComputedCreatureStats,
  ElementType,
  ExpeditionOutcome,
  KitchenConversion,
  MoveDef,
  RuneKind,
  OwnedCreature,
  PlayerStats,
  PowerStone,
  PowerStoneSubstat,
  QuestMetric,
  QuestReward,
  QuestTemplate,
  SaveState,
  StageDef,
  StatusKind,
  StoneRarity,
  StoneSlot,
  StoneSlotType,
  StageChallenge,
  StageStars,
  DefeatAdvice,
} from './types';
import { FR } from '../i18n/fr';
import { LEGACY_ACHIEVEMENT_IDS, LEGACY_QUEST_IDS, LEGACY_RUNE_IDS, LEGACY_STAT_FIELDS, readLegacyKitchen } from './legacyIds';

/** Gestes expliqués une fois par une bulle (S04.3) ; la liste est rangée dans la sauvegarde. */
export const FIRST_TIME_KINDS = ['cube', 'weak', 'burst', 'trio'] as const;
export type FirstTimeKindId = (typeof FIRST_TIME_KINDS)[number];

/** Consignes d'attaque connues (boss.ts) : les autres clés sont ignorées au chargement. */
export const HAZARD_HINT_KEYS = ['ring', 'aftershock', 'strike', 'eye'] as const;

function normalizeHintCounts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of HAZARD_HINT_KEYS) {
    const n = Math.floor(Number((raw as Record<string, unknown>)[key]));
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  return out;
}

/** Compte une consigne d'attaque montrée. */
export function markHazardHintSeen(save: SaveState, key: string): SaveState {
  return { ...save, hazardHintsSeen: { ...save.hazardHintsSeen, [key]: (save.hazardHintsSeen[key] ?? 0) + 1 } };
}

/** Ajoute un geste à ceux déjà expliqués (sans doublon). */
export function markFirstTimeSeen(save: SaveState, kind: FirstTimeKindId): SaveState {
  if (save.firstTimesSeen.includes(kind)) return save;
  return { ...save, firstTimesSeen: [...save.firstTimesSeen, kind] };
}
import { withSaveSlot } from './saveSlot';

export const SAVE_STORAGE_KEY = withSaveSlot('cubiquest_save_v2');
/** Copie brute d'une sauvegarde stockée mais illisible (JSON cassé, version inconnue) : jamais écrasée en silence. */
export const SAVE_BACKUP_STORAGE_KEY = withSaveSlot('cubiquest_save_unreadable_backup');
/** Taille maximale du sac de Pierres de Pouvoir (les pierres équipées ne comptent jamais parmi celles qu'on retire). */
export const POWER_STONE_BAG_LIMIT = 48;
export const LEGACY_SAVE_STORAGE_KEY = withSaveSlot('cubiquest_save_v1');
// v3 (Giga Update) : sac de runes étendu (rune_precision, rune_vigueur) + stat frontierWins.
// v4 (S03) : identifiants renommés (runes) ; `moveStoneBag` devient `runeBag`, `moveStones` devient `runes`.
// v5 (S04) : statistique des anciennes réactions -> `burstsTriggered` ; `triosTriggered` (cumul, repart de 0) ;
//            quêtes et succès renommés (legacyIds.ts) ; `firstTimesSeen` (bulles « première fois »).
// v6 (S05) : `hazardHintsSeen` (consignes d'attaque déjà montrées).
// v7 (S06) : `stageStars` (trois étoiles par niveau) ; les niveaux déjà terminés reçoivent l'étoile de victoire.
// v8 (S07) : `lessonsDone` (leçons du début) ; une sauvegarde qui a déjà gagné la Prairie-2 a tout appris.
// v9 (spec Atelier, A2) : Cube Scellé (`sealedCubes`, `cubeCounter`, `baits`, `awakenGauge`), Lien (`bonds`,
//            `duplicates`), variantes (`variantsUnlocked`, `variantsOn`). A2.2 : l'ancienne cuisine disparaît, convertie en
//            Appâts, cubes et Lien (`readLegacyKitchen`, legacyIds.ts) ; `kitchenConversion` garde le bilan.
// La clé de stockage reste la même : migrateSaveState accepte les versions 1 à 9.
export const SAVE_VERSION = 9;

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
/** Cube posé sur un ennemi : élément, âge (pour la maturation) et temps restant. */
export interface CubeState {
  element: ElementType;
  age: number;
  remaining: number;
}
/** Fêlure laissée par un Éclat : les deux éléments en jeu et le temps restant. */
export interface CrackState {
  elements: [ElementType, ElementType];
  remaining: number;
}
export interface CubeTargetState {
  cube: CubeState | null;
  crack: CrackState | null;
  /** Verrou après un Trio : aucun cube tant qu'il dure. */
  trioLock: number;
}
export type CubeOutcome = 'cube' | 'refresh' | 'weak' | 'burst' | 'trio' | 'locked';

export function isCubeRipe(cube: CubeState | null, kit: { ripenTime: number } = CUBE_KIT): boolean {
  return Boolean(cube && cube.remaining > 0 && cube.age >= kit.ripenTime);
}

/**
 * Ce que fait un coup de sort d'élément `incoming` sur une cible (plan, section 5.1) :
 * 'locked' pendant le verrou du Trio ; 'trio' sur une cible fêlée par deux AUTRES éléments (si allowTrio) ;
 * sinon 'cube' (pose), 'refresh' (même élément : la durée repart, l'âge reste), 'weak' (cube pas mûr)
 * ou 'burst' (cube mûr d'un autre élément).
 */
export function resolveCubeHit(
  state: CubeTargetState,
  incoming: ElementType,
  opts: { allowTrio: boolean; ripenTime?: number },
): CubeOutcome {
  if (state.trioLock > 0) return 'locked';
  if (opts.allowTrio && state.crack && state.crack.remaining > 0 && !state.crack.elements.includes(incoming)) {
    return 'trio';
  }
  const cube = state.cube;
  if (!cube || cube.remaining <= 0) return 'cube';
  if (cube.element === incoming) return 'refresh';
  return cube.age >= (opts.ripenTime ?? CUBE_KIT.ripenTime) ? 'burst' : 'weak';
}

/** Un ennemi candidat pour le ciblage intelligent. */
export interface SkillTargetCandidate {
  id: string;
  dist: number;
  isBoss: boolean;
  state: CubeTargetState;
}

/**
 * Ciblage intelligent d'un sort à cible (plan 5.1, règle 8), parmi les ennemis à portée :
 * 1. un Trio possible ; 2. un Éclat plein possible ; 3. une cible sans cube, à cube du même élément ou
 * verrouillée (le boss d'abord, puis la plus proche) ; 4. en dernier recours, un cube pas encore mûr.
 * À égalité dans les rangs 1, 2 et 4 : la plus proche. null si personne n'est à portée.
 */
export function pickSkillTarget(
  candidates: SkillTargetCandidate[],
  element: ElementType,
  range: number,
  allowTrio: boolean,
): string | null {
  const rank: Record<CubeOutcome, number> = { trio: 0, burst: 1, cube: 2, refresh: 2, locked: 2, weak: 3 };
  let best: SkillTargetCandidate | null = null;
  let bestKey: [number, number, number] = [9, 9, Infinity];
  for (const c of candidates) {
    if (c.dist > range) continue;
    const r = rank[resolveCubeHit(c.state, element, { allowTrio })];
    const key: [number, number, number] = [r, r === 2 && c.isBoss ? 0 : 1, c.dist];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = c;
      bestKey = key;
    }
  }
  return best ? best.id : null;
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
    runes: [null, null],
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

  // Lien (A2) : +4 % PV et attaque par étoile pleine ; sans Lien (outils, golden) le calcul est inchangé
  const bondMult = creature.bond ? bondMultiplier(creature.bond) : 1;
  const maxHp = Math.round((levelHp + bonusHp) * bondMult);
  const atk = Math.round((levelAtk + bonusAtk) * bondMult);
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

/**
 * Ajoute ou retire une créature de l'escouade (1 à 3 membres). A2 : une lignée n'y figure qu'une fois
 * (une ancienne sauvegarde peut posséder deux créatures de la même lignée ; une seule part au combat).
 */
export function toggleSquadMember(save: SaveState, uid: string): SaveState {
  if (save.squadIds.includes(uid)) {
    if (save.squadIds.length <= 1) return save;
    return { ...save, squadIds: save.squadIds.filter((id) => id !== uid) };
  }
  const creature = save.roster.find((c) => c.uid === uid);
  if (!creature || save.squadIds.length >= 3) return save;
  const line = lineageOf(creature.speciesId);
  const taken = save.squadIds.some((id) => {
    const c = save.roster.find((x) => x.uid === id);
    return c && lineageOf(c.speciesId) === line;
  });
  if (taken) return save;
  return { ...save, squadIds: [...save.squadIds, uid] };
}

export function computeSquadPower(save: SaveState): number {
  let total = 0;
  for (const uid of save.squadIds) {
    const c = save.roster.find((r) => r.uid === uid);
    if (c) total += computeCreatureStats(c, save.powerStones).power;
  }
  return total;
}

export function getMoveModifiers(runes: (RuneKind | null)[]): {
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

  for (const ms of runes) {
    if (ms === 'rune_ampleur') radiusMult += 0.35;
    if (ms === 'rune_cadence') cooldownMult *= 0.82;
    if (ms === 'rune_force') {
      damageMult += 0.4;
      cooldownMult *= 1.15;
    }
    if (ms === 'rune_partage') shareRatio += 0.5;
    if (ms === 'rune_precision') critBonus += 15;
    if (ms === 'rune_vigueur') leechRatio += 0.1;
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
  runes: (RuneKind | null)[] = [],
  defenderDefenseMult = 1,
  rng: RngFn = Math.random,
): { damage: number; isCrit: boolean; effectiveness: number } {
  const mods = getMoveModifiers(runes);
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

export function equipRune(
  save: SaveState,
  creatureUid: string,
  slotIndex: number,
  kind: RuneKind | null,
): SaveState {
  if (slotIndex < 0 || slotIndex > 1) return save;
  const target = save.roster.find((c) => c.uid === creatureUid);
  if (!target) return save;

  const currentKind = target.runes[slotIndex];
  if (currentKind === kind) return save;

  const nextBag = { ...save.runeBag };
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
    const nextRunes = [...c.runes];
    nextRunes[slotIndex] = kind;
    return { ...c, runes: nextRunes };
  });

  return {
    ...save,
    roster: nextRoster,
    runeBag: nextBag,
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
 * Ajoute une Pierre de Pouvoir au sac. Au-delà de la limite, on retire les plus ANCIENNES pierres
 * NON équipées. (Avant : un simple `.slice(0, 48)` pouvait jeter une pierre encore équipée, dont
 * le bonus disparaissait alors sans prévenir.)
 */
export function addPowerStoneToBag(
  stones: PowerStone[],
  roster: OwnedCreature[],
  stone: PowerStone,
): PowerStone[] {
  const next = [stone, ...stones];
  let excess = next.length - POWER_STONE_BAG_LIMIT;
  if (excess <= 0) return next;
  const equipped = new Set<string>();
  for (const c of roster) for (const slot of c.stoneBoard) if (slot.stoneId) equipped.add(slot.stoneId);
  const kept: PowerStone[] = [];
  for (let i = next.length - 1; i >= 0; i--) {
    const candidate = next[i];
    if (excess > 0 && i !== 0 && !equipped.has(candidate.id)) {
      excess -= 1;
      continue;
    }
    kept.unshift(candidate);
  }
  return kept;
}

/**
 * Mode aperçu : sauvegarde fictive dont l'escouade est celle de l'aperçu. Elle sert uniquement à
 * calculer l'écran de fin (XP, montées de niveau) pour les bonnes créatures ; elle n'est jamais persistée.
 */
export function buildPreviewSave(save: SaveState, creatures: OwnedCreature[]): SaveState {
  return { ...save, roster: creatures, squadIds: creatures.map((c) => c.uid) };
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
 * Apply expedition outcome rewards, XP, level-ups, quest tracking, and unlocks
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
    burstsTriggered?: number;
    ultimatesUsed?: number;
    perfectDodges?: number;
    triosTriggered?: number;
    koCount?: number;
    hazardHits?: number;
    weakBursts?: number;
  },
  rng: RngFn = Math.random,
): { nextSave: SaveState; outcome: ExpeditionOutcome } {
  const biome = BIOMES[stage.biomeId];
  // Première victoire sur ce niveau : bonus d'XP (S06.3)
  const firstClear = victory && !save.completedStageIds.includes(stage.id);
  const xpPerUnit = victory
    ? Math.round(stageBaseXp(stage) * (firstClear ? XP_KIT.firstClearXpMult : 1))
    : Math.max(15, Math.round(stage.xpReward * XP_KIT.xpScale * 0.25 * (stats.wavesCleared / stage.waves.length)));
  // Les créatures restées au camp gagnent une part de l'XP de l'escouade
  const benchXp = Math.round(xpPerUnit * XP_KIT.benchXpShare);

  const leveledUpNames: string[] = [];
  const levelUps: ExpeditionOutcome['levelUps'] = [];
  const nextRoster = save.roster.map((c) => {
    const inSquad = save.squadIds.includes(c.uid);
    let level = c.level;
    let xp = c.xp + (inSquad ? xpPerUnit : benchXp);
    const startLevel = level;
    while (xp >= xpForNextLevel(level) && level < 50) {
      xp -= xpForNextLevel(level);
      level += 1;
    }
    if (level > startLevel && inSquad) {
      leveledUpNames.push(FR.rules.niv(SPECIES[c.speciesId]?.name ?? FR.rules.creature, level));
      levelUps.push({ speciesId: c.speciesId, from: startLevel, to: level });
    }
    return { ...c, level, xp };
  });

  // S07.3 : première victoire sur le premier boss -> un compagnon rejoint le camp (niveau moyen de l'escouade − 2)
  // A2.4 : le premier compagnon n'arrive plus tout seul : le premier boss donne un cube qui le contient
  // forcément (Bourgéon pour le trio Braise, Voltik pour le trio Marée), à ouvrir à l'Atelier.
  const joinedSpeciesId: string | null = null;
  let guaranteedCube: string | undefined;
  const unlockRow = UNLOCKS.find((u) => u.afterStageId === stage.id);
  if (firstClear && unlockRow?.companion && !save.allUnlocked && save.starterTrio) {
    const joiner = STARTER_JOINER[save.starterTrio];
    if (!nextRoster.some((c) => lineageOf(c.speciesId) === joiner)) guaranteedCube = joiner;
  }
  const newFeatures = firstClear && !save.allUnlocked ? [...(unlockRow?.features ?? [])] : [];

  // Cubes Scellés (A2.1) : Bois à la première victoire d'un niveau (puis 30 %), Pierre au premier boss de
  // biome (biomes 1 à 3) et aux 3 étoiles d'un niveau, Cristal aux paliers 12 à 48 et aux boss des biomes 4 à 7,
  // Prisme à 63 étoiles. Un Appât de l'élément du biome à chaque première victoire de niveau.
  const cubesWon: CubeMaterial[] = [];
  const baitsWon: ElementType[] = [];
  if (victory) {
    if (firstClear) cubesWon.push('wood');
    else if (rng() < SUMMON.woodRepeatChance) cubesWon.push('wood');
    const isBiomeBoss = stage.stageNumber === 3;
    if (firstClear && isBiomeBoss) cubesWon.push(stage.index >= FRONTIER_STAGE_INDEX ? 'crystal' : 'stone');
    if (firstClear) baitsWon.push(biome.dominantElement);
  }

  const droppedStone = victory ? generatePowerStone(stage.stonePowerRange, rng) : null;
  const nextPowerStones = droppedStone
    ? addPowerStoneToBag(save.powerStones, save.roster, droppedStone)
    : save.powerStones;

  let droppedRune: RuneKind | null = null;
  const nextRuneBag = { ...save.runeBag };
  if (victory && rng() < 0.55) {
    // Les Pierres Précision / Sangsue ne tombent que dans les nouveaux biomes
    const kinds: RuneKind[] =
      stage.index >= FRONTIER_STAGE_INDEX ? RUNE_ORDER : BASE_RUNE_KINDS;
    droppedRune = kinds[Math.floor(rng() * kinds.length)];
    nextRuneBag[droppedRune] = (nextRuneBag[droppedRune] ?? 0) + 1;
  }

  // Niveaux débloqués
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

  // Discover boss species on sight
  const nextDiscovered = [stage.bossSpeciesId, joinedSpeciesId]
    .filter((id): id is string => Boolean(id))
    .reduce((list, id) => (list.includes(id) ? list : [...list, id]), save.discoveredSpeciesIds);

  const burstsTriggered = Math.max(0, Math.round(stats.burstsTriggered ?? 0));
  const ultimatesUsed = Math.max(0, Math.round(stats.ultimatesUsed ?? 0));
  const perfectDodges = Math.max(0, Math.round(stats.perfectDodges ?? 0));
  const triosTriggered = Math.max(0, Math.round(stats.triosTriggered ?? 0));
  const koCount = Math.max(0, Math.round(stats.koCount ?? 0));
  const hazardHits = Math.max(0, Math.round(stats.hazardHits ?? 0));

  // Étoiles : celles du combat s'ajoutent à celles déjà acquises
  const previousStars = save.stageStars?.[stage.id] ?? NO_STARS;
  const stars = computeStageStars({ victory, clearTimeSec: stats.clearTimeSec, perfectDodges, hazardHits, ultimatesUsed, koCount }, stage);
  const stageStars = { ...(save.stageStars ?? {}), [stage.id]: mergeStars(previousStars, stars) };
  // Paliers d'étoiles : une Rune chacun, donnée une fois (S06.4)
  const claimedBefore = save.starTiersClaimed ?? [];
  const starTiers = victory ? pendingStarTiers(totalStars({ stageStars }), claimedBefore) : [];
  const starTiersClaimed = [...claimedBefore, ...starTiers.map((t) => t.at)];
  for (const t of starTiers) if (t.rune) nextRuneBag[t.rune] = (nextRuneBag[t.rune] ?? 0) + 1;
  for (const t of starTiers) cubesWon.push(t.at >= 63 ? 'prism' : 'crystal');
  if (victory && starCount(previousStars) < 3 && starCount(mergeStars(previousStars, stars)) === 3) cubesWon.push('stone');
  // Lien : +0,1 par victoire pour chaque lignée de l'escouade
  const bondsAfter = { ...(save.bonds ?? {}) };
  if (victory) for (const c of nextRoster.filter((x) => save.squadIds.includes(x.uid))) {
    const l = lineageOf(c.speciesId);
    bondsAfter[l] = Math.min(SUMMON.bondMax, Math.round(((bondsAfter[l] ?? 0) + SUMMON.bondPerWin) * 10) / 10);
  }
  const nextBaits = { ...(save.baits ?? {}) };
  for (const el of baitsWon) nextBaits[el] = (nextBaits[el] ?? 0) + 1;

  // Conseil de défaite : niveau de l'escouade face aux ennemis, élément faible contre le boss
  const squad = save.roster.filter((c) => save.squadIds.includes(c.uid));
  const squadLevel = squad.length ? squad.reduce((n, c) => n + c.level, 0) / squad.length : 1;
  const enemyLevel = Math.max(...stage.waves.flatMap((w) => w.enemies.map((e) => e.level)));
  const bossElement = SPECIES[stage.bossSpeciesId]?.element;
  const weakAgainstBoss =
    Boolean(bossElement) &&
    squad.filter((c) => SPECIES[c.speciesId] && getTypeEffectiveness(bossElement!, SPECIES[c.speciesId].element) > 1).length >= 2;
  const advice = victory
    ? null
    : defeatAdvice(
        { koCount, hazardHits, perfectDodges, burstsTriggered, weakBursts: Math.max(0, Math.round(stats.weakBursts ?? 0)), ultimatesUsed, clearTimeSec: stats.clearTimeSec, wavesCleared: stats.wavesCleared },
        squadLevel,
        enemyLevel,
        weakAgainstBoss,
      );
  const squadXp = nextRoster
    .filter((c) => save.squadIds.includes(c.uid))
    .map((c) => ({ speciesId: c.speciesId, level: c.level, xp: c.xp, xpMax: xpForNextLevel(c.level), gained: xpPerUnit }));

  const baseNextSave: SaveState = {
    ...save,
    roster: nextRoster,
    powerStones: nextPowerStones,
    runeBag: nextRuneBag,
    highestStageIndex,
    completedStageIds,
    discoveredSpeciesIds: nextDiscovered,
    expeditionsCompleted: save.expeditionsCompleted + (victory ? 1 : 0),
    stageStars,
    starTiersClaimed,
    bonds: bondsAfter,
    baits: nextBaits,
  };

  // le cube garanti passe en premier, pour être ouvert avant les autres
  if (guaranteedCube) cubesWon.unshift('wood');
  const withCubes = addSealedCubes(baseNextSave, cubesWon, guaranteedCube).nextSave;
  const nextSave = recordPlayerProgress(withCubes, {
    expeditionsWon: victory ? 1 : 0,
    bossesDefeated: victory ? 1 : 0,
    frontierWins: victory && stage.index >= FRONTIER_STAGE_INDEX ? 1 : 0,
    burstsTriggered,
    ultimatesUsed,
    perfectDodges,
    triosTriggered,
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
    burstsTriggered,
    ultimatesUsed,
    perfectDodges,
    triosTriggered,
    xpPerUnit,
    droppedStone,
    droppedRune,
    leveledUpNames,
    levelUps,
    unlockedNextStageName,
    unlockedBiomeName,
    stars,
    previousStars,
    koCount,
    hazardHits,
    advice,
    squadXp,
    firstClear,
    newFeatures,
    joinedSpeciesId,
    cubesWon,
    baitsWon,
    starTiers: starTiers.map((t) => ({ at: t.at, rune: t.rune })),
    benchXp: save.roster.some((c) => !save.squadIds.includes(c.uid)) ? benchXp : 0,
  };

  return { nextSave, outcome };
}

/** Ce qu'un combat dit des étoiles : issue, durée, esquives parfaites, attaques annoncées subies, Déchaînements, K.O. */
export interface StarStats {
  victory: boolean;
  clearTimeSec: number;
  perfectDodges: number;
  hazardHits: number;
  ultimatesUsed: number;
  koCount: number;
}

export const NO_STARS: StageStars = { win: false, noKo: false, challenge: false };

/** Le défi est-il rempli à la fin d'un combat gagné ? */
export function challengeMet(ch: StageChallenge | undefined, s: StarStats): boolean {
  if (!ch || !s.victory) return false;
  switch (ch.kind) {
    case 'perfectDodges':
      return s.perfectDodges >= ch.n;
    case 'duration':
      return s.clearTimeSec <= ch.maxSec;
    case 'noTelegraphHit':
      return s.hazardHits === 0;
    case 'noUltimate':
      return s.ultimatesUsed === 0;
    case 'all':
      return ch.of.every((c) => challengeMet(c, s));
  }
}

/** État du défi pendant le combat (ligne discrète du HUD) : acquis, perdu ou en cours. */
export function challengeLiveState(
  ch: StageChallenge | undefined,
  live: { elapsed: number; perfectDodges: number; hazardHits: number; ultimatesUsed: number },
): 'pending' | 'done' | 'lost' {
  if (!ch) return 'pending';
  switch (ch.kind) {
    case 'perfectDodges':
      return live.perfectDodges >= ch.n ? 'done' : 'pending';
    case 'duration':
      return live.elapsed > ch.maxSec ? 'lost' : 'pending';
    case 'noTelegraphHit':
      return live.hazardHits > 0 ? 'lost' : 'pending';
    case 'noUltimate':
      return live.ultimatesUsed > 0 ? 'lost' : 'pending';
    case 'all': {
      const parts = ch.of.map((c) => challengeLiveState(c, live));
      if (parts.includes('lost')) return 'lost';
      return parts.every((p) => p === 'done') ? 'done' : 'pending';
    }
  }
}

/** Texte d'un défi (carte, HUD, écran de fin). */
export function challengeText(ch: StageChallenge | undefined): string {
  if (!ch) return '';
  switch (ch.kind) {
    case 'perfectDodges':
      return FR.rules.defi.esquives(ch.n);
    case 'duration':
      return FR.rules.defi.chrono(String(ch.maxSec).replace('.', ','));
    case 'noTelegraphHit':
      return FR.rules.defi.aucuneAttaque;
    case 'noUltimate':
      return FR.rules.defi.sansDechainement;
    case 'all':
      return ch.of.map(challengeText).join(FR.rules.defi.et);
  }
}

/**
 * Conseil de défaite (S06.2) : le premier qui s'applique, dans l'ordre de la table.
 * Les conseils sur les Éclats ne sont que des conseils : aucune récompense n'en dépend.
 */
export function defeatAdvice(
  r: { koCount: number; hazardHits: number; perfectDodges: number; burstsTriggered: number; weakBursts: number; ultimatesUsed: number; clearTimeSec: number; wavesCleared: number },
  squadLevel: number,
  enemyLevel: number,
  weakAgainstBoss: boolean,
): DefeatAdvice {
  if (r.hazardHits >= 2 && r.perfectDodges === 0) return 'noDodge';
  if (squadLevel < enemyLevel - 2) return 'underLevel';
  if (weakAgainstBoss) return 'weakElement';
  if (r.koCount > 0 && r.wavesCleared <= 1) return 'earlyKo';
  if (r.burstsTriggered === 0) return 'noBurst';
  if (r.weakBursts >= 3 && r.weakBursts > r.burstsTriggered) return 'manyWeak';
  if (r.ultimatesUsed === 0) return 'noUltimate';
  return 'longFight';
}

/** Étoiles gagnées par un combat (S06.1) : victoire, sans K.O., défi du niveau. */
export function computeStageStars(s: StarStats, stage: Pick<StageDef, 'id'>): StageStars {
  return {
    win: s.victory,
    noKo: s.victory && s.koCount === 0,
    challenge: challengeMet(STAGE_CHALLENGES[stage.id], s),
  };
}

/** Les étoiles s'additionnent d'une partie à l'autre : une étoile acquise le reste. */
export function mergeStars(a: StageStars | undefined, b: StageStars): StageStars {
  return { win: Boolean(a?.win) || b.win, noKo: Boolean(a?.noKo) || b.noKo, challenge: Boolean(a?.challenge) || b.challenge };
}

export const starCount = (s: StageStars | undefined): number => (s ? Number(s.win) + Number(s.noKo) + Number(s.challenge) : 0);

/** XP de base d'une victoire sur ce niveau (hors première victoire), telle qu'affichée sur la carte. */
export function stageBaseXp(stage: Pick<StageDef, 'xpReward'>): number {
  return Math.round(stage.xpReward * XP_KIT.xpScale);
}

/** Paliers atteints mais pas encore récompensés (une sauvegarde migrée les reçoit à la victoire suivante). */
export function pendingStarTiers(total: number, claimed: number[]): typeof STAR_TIERS {
  return STAR_TIERS.filter((t) => t.at <= total && !claimed.includes(t.at));
}

/** Prochain palier à atteindre (null quand tout est acquis). */
export function nextStarTier(total: number): (typeof STAR_TIERS)[number] | null {
  return STAR_TIERS.find((t) => t.at > total) ?? null;
}

/** Total d'étoiles d'une sauvegarde, éventuellement limité à un biome. */
export function totalStars(save: Pick<SaveState, 'stageStars'>, biomeId?: BiomeId): number {
  return STAGES.filter((st) => !biomeId || st.biomeId === biomeId).reduce((n, st) => n + starCount(save.stageStars[st.id]), 0);
}

const CUBE_MATERIALS: CubeMaterial[] = ['wood', 'stone', 'crystal', 'prism'];
const num = (v: unknown, min: number, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min);

/** Normalise l'état du Cube Scellé (A2) : tout ce qui est inconnu ou abîmé est ignoré sans erreur. */
function normalizeSummonState(obj: Record<string, unknown>) {
  const cubesRaw = Array.isArray(obj.sealedCubes) ? obj.sealedCubes : [];
  const seen = new Set<string>();
  const sealedCubes = cubesRaw
    .filter((c): c is SaveState['sealedCubes'][number] => Boolean(c) && typeof (c as { id?: unknown }).id === 'string' && CUBE_MATERIALS.includes((c as { material: CubeMaterial }).material))
    .filter((c) => !seen.has(c.id) && seen.add(c.id))
    .map((c) => ({ id: c.id, material: c.material, ...(c.guaranteedSpeciesId && SPECIES[c.guaranteedSpeciesId] ? { guaranteedSpeciesId: c.guaranteedSpeciesId } : {}) }))
    .slice(0, SUMMON.inventoryMax);
  const record = (raw: unknown, max: number): Record<string, number> => {
    const out: Record<string, number> = {};
    if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (SPECIES[k] && typeof v === 'number') out[k] = num(v, 0, max);
    return out;
  };
  const baits: Partial<Record<ElementType, number>> = {};
  if (obj.baits && typeof obj.baits === 'object') for (const [k, v] of Object.entries(obj.baits)) if (ELEMENT_META[k as ElementType] && typeof v === 'number') baits[k as ElementType] = Math.floor(num(v, 0, 999));
  const lineages = (raw: unknown) => (Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && Boolean(SPECIES[id])) : []);
  return {
    sealedCubes,
    cubeCounter: Math.max(num(obj.cubeCounter, 0, 1e9), sealedCubes.length),
    baits,
    awakenGauge: num(obj.awakenGauge, 0, 1),
    bonds: record(obj.bonds, SUMMON.bondMax),
    duplicates: record(obj.duplicates, 1e6),
    variantsUnlocked: lineages(obj.variantsUnlocked),
    variantsOn: lineages(obj.variantsOn),
  };
}

/** Identifiants des leçons (engine/lessons.ts), recopiés ici : rules.ts ne dépend pas du moteur. */
export const LESSON_IDS_SAVE = ['cast', 'burst', 'dodge', 'trio', 'ultimate'] as const;

function normalizeLessons(raw: unknown, completedStageIds: string[]): string[] {
  // un joueur qui a déjà gagné la Prairie-2 n'a plus besoin des leçons
  if (completedStageIds.includes('meadow-2')) return [...LESSON_IDS_SAVE];
  return Array.isArray(raw) ? LESSON_IDS_SAVE.filter((id) => (raw as unknown[]).includes(id)) : [];
}

/** Ce qui est ouvert (S07.3) : selon les niveaux gagnés ; une sauvegarde d'avant S07 a tout ouvert. */
export function unlockedFeatures(save: Pick<SaveState, 'completedStageIds'> & { allUnlocked?: boolean }): Set<UnlockFeature> {
  if (save.allUnlocked) return new Set(UNLOCK_FEATURES);
  return new Set(UNLOCKS.filter((u) => save.completedStageIds.includes(u.afterStageId)).flatMap((u) => u.features));
}

/** Le mode Auto est-il ouvert ? Après la victoire sur le premier boss (S07.2). */
export function isAutoUnlocked(save: Pick<SaveState, 'completedStageIds'> & { allUnlocked?: boolean }): boolean {
  return unlockedFeatures(save).has('auto');
}

/** Marque la pastille « Nouveau » d'une ouverture comme vue. */
export function markUnlockSeen(save: SaveState, feature: string): SaveState {
  return save.unlocksSeen.includes(feature) ? save : { ...save, unlocksSeen: [...save.unlocksSeen, feature] };
}

/** Marque une leçon faite (idempotent). */
export function markLessonDone(save: SaveState, id: string): SaveState {
  if (save.lessonsDone.includes(id) || !(LESSON_IDS_SAVE as readonly string[]).includes(id)) return save;
  return { ...save, lessonsDone: [...save.lessonsDone, id] };
}

function normalizeStageStars(raw: unknown, completedStageIds: string[]): Record<string, StageStars> {
  const out: Record<string, StageStars> = {};
  const src = raw && typeof raw === 'object' ? (raw as Record<string, Partial<StageStars>>) : {};
  for (const st of STAGES) {
    const r = src[st.id];
    const s: StageStars = {
      // un niveau déjà terminé (sauvegardes v1 à v6) garde au moins l'étoile de victoire
      win: Boolean(r?.win) || completedStageIds.includes(st.id),
      noKo: Boolean(r?.noKo),
      challenge: Boolean(r?.challenge),
    };
    if (s.win || s.noKo || s.challenge) out[st.id] = s;
  }
  return out;
}

/**
 * Build deterministic starting SaveState for instant playability
 */
export function createInitialSaveState(
  starterId: string = 'braise',
  starterChosen = false,
): SaveState {
  // S07.1 : un trio de départ (id de trio, ou une espèce de ce trio), trois compagnons au niveau 4, aucun en réserve
  const trioId: StarterTrioId =
    (STARTER_TRIO_IDS as string[]).includes(starterId)
      ? (starterId as StarterTrioId)
      : STARTER_TRIO_IDS.find((t) => (STARTER_TRIOS[t] as readonly string[]).includes(starterId)) ?? 'braise';
  const [starter, companionA, companionB] = STARTER_TRIOS[trioId].map((id, i) => createOwnedCreature(id, 4, 0, `starter_${i + 1}`));

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
    roster: [starter, companionA, companionB],
    powerStones: startingStones,
    runeBag: {
      rune_ampleur: 1,
      rune_cadence: 1,
      rune_force: 1,
      rune_partage: 1,
      rune_precision: 0,
      rune_vigueur: 0,
    },
    highestStageIndex: 0,
    completedStageIds: [],
    discoveredSpeciesIds: Array.from(
      new Set([starter.speciesId, companionA.speciesId, companionB.speciesId]),
    ),
    expeditionsCompleted: 0,
    stats: createEmptyStats(),
    activeQuests: createInitialQuests(),
    claimedAchievementIds: [],
    firstTimesSeen: [],
    hazardHintsSeen: {},
    stageStars: {},
    starTiersClaimed: [],
    lessonsDone: [],
    starterTrio: trioId,
    allUnlocked: false,
    unlocksSeen: [],
    sealedCubes: [],
    cubeCounter: 0,
    baits: {},
    awakenGauge: 0,
    bonds: {},
    duplicates: {},
    variantsUnlocked: [],
    variantsOn: [],
    kitchenConversion: null,
  };
}

export function createEmptyStats(): PlayerStats {
  return {
    expeditionsWon: 0,
    burstsTriggered: 0,
    ultimatesUsed: 0,
    evolutionsDone: 0,
    perfectDodges: 0,
    bossesDefeated: 0,
    triosTriggered: 0,
    frontierWins: 0,
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
    burstsTriggered: prevStats.burstsTriggered + (deltas.burstsTriggered ?? 0),
    ultimatesUsed: prevStats.ultimatesUsed + (deltas.ultimatesUsed ?? 0),
    evolutionsDone: prevStats.evolutionsDone + (deltas.evolutionsDone ?? 0),
    perfectDodges: prevStats.perfectDodges + (deltas.perfectDodges ?? 0),
    bossesDefeated: prevStats.bossesDefeated + (deltas.bossesDefeated ?? 0),
    triosTriggered: (prevStats.triosTriggered ?? 0) + (deltas.triosTriggered ?? 0),
    frontierWins: (prevStats.frontierWins ?? 0) + (deltas.frontierWins ?? 0),
  };

  const nextQuests = (save.activeQuests ?? createInitialQuests()).map((q) => {
    const inc =
      q.metric === 'expeditionsWon'
        ? deltas.expeditionsWon ?? 0
        : q.metric === 'burstsTriggered'
          ? deltas.burstsTriggered ?? 0
          : q.metric === 'ultimatesUsed'
            ? deltas.ultimatesUsed ?? 0
            : q.metric === 'perfectDodges'
              ? deltas.perfectDodges ?? 0
              : q.metric === 'bossesDefeated'
                ? deltas.bossesDefeated ?? 0
                : q.metric === 'evolutionsDone'
                  ? deltas.evolutionsDone ?? 0
                  : q.metric === 'frontierWins'
                    ? deltas.frontierWins ?? 0
                    : q.metric === 'triosTriggered'
                      ? deltas.triosTriggered ?? 0
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
  const nextBaits = { ...save.baits };
  if (reward.baits) {
    for (const [el, qty] of Object.entries(reward.baits) as [ElementType, number][]) {
      nextBaits[el] = (nextBaits[el] ?? 0) + qty;
    }
  }

  const nextRuneBag = { ...save.runeBag };
  if (reward.rune) {
    nextRuneBag[reward.rune] = (nextRuneBag[reward.rune] ?? 0) + 1;
  }

  let nextPowerStones = save.powerStones;
  if (reward.powerStoneRange) {
    const stone = generatePowerStone(reward.powerStoneRange, rng, reward.guaranteedRarity);
    nextPowerStones = addPowerStoneToBag(save.powerStones, save.roster, stone);
  }

  const rewarded: SaveState = {
    ...save,
    baits: nextBaits,
    runeBag: nextRuneBag,
    powerStones: nextPowerStones,
  };
  return reward.cube ? addSealedCubes(rewarded, [reward.cube]).nextSave : rewarded;
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
    case 'burstsTriggered':
      return stats.burstsTriggered;
    case 'ultimatesUsed':
      return stats.ultimatesUsed;
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
    case 'triosTriggered':
      return stats.triosTriggered;
    case 'frontierWins':
      return stats.frontierWins ?? 0;
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

const ALL_STONE_RARITIES: StoneRarity[] = ['common', 'bronze', 'silver', 'gold'];
const ALL_SUBSTAT_TYPES: PowerStoneSubstat['type'][] = ['critRate', 'hitHeal', 'moveSpeed', 'statusRes'];
const ALL_QUEST_METRICS: QuestMetric[] = [
  'expeditionsWon',
  'burstsTriggered',
  'ultimatesUsed',
  'perfectDodges',
  'bossesDefeated',
  'evolutionsDone',
  'stagesCompleted',
  'speciesDiscovered',
  'triosTriggered',
  'frontierWins',
  'tundraStages',
  'stormStages',
];

/** Entier positif ou nul ; tout le reste (NaN, négatif, texte, null) devient 0. */
function toCount(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function uniqueKnown(list: unknown, isKnown: (id: string) => boolean): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const id of list) {
    if (typeof id === 'string' && isKnown(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Identifiant de rune actuel pour une valeur lue dans une sauvegarde (ancien nom converti) ; null si inconnu. */
function resolveRuneKind(raw: unknown): RuneKind | null {
  if (typeof raw !== 'string') return null;
  if (RUNE_ORDER.includes(raw as RuneKind)) return raw as RuneKind;
  return Object.hasOwn(LEGACY_RUNE_IDS, raw) ? LEGACY_RUNE_IDS[raw] : null;
}

/**
 * Sac de runes : additionne le sac actuel (`runeBag`) et l'ancien (`moveStoneBag`, v1 à v3),
 * anciens noms convertis. Une clé inconnue est ignorée.
 */
function normalizeRuneBag(...bags: unknown[]): Record<RuneKind, number> {
  const out = Object.fromEntries(RUNE_ORDER.map((kind) => [kind, 0])) as Record<RuneKind, number>;
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue;
    for (const [key, qty] of Object.entries(bag as Record<string, unknown>)) {
      const kind = resolveRuneKind(key);
      if (kind) out[kind] += toCount(qty);
    }
  }
  return out;
}

/** Valide une Pierre de Pouvoir lue depuis une sauvegarde ; null si elle est inutilisable. */
export function normalizePowerStone(raw: unknown): PowerStone | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<PowerStone>;
  if (typeof s.id !== 'string' || !s.id) return null;
  if (s.kind !== 'atk' && s.kind !== 'hp') return null;
  const power = Math.round(Number(s.power));
  if (!Number.isFinite(power) || power <= 0) return null;
  const substats: PowerStoneSubstat[] = [];
  if (Array.isArray(s.substats)) {
    for (const sub of s.substats) {
      if (!sub || typeof sub !== 'object') continue;
      const value = Number(sub.value);
      if (ALL_SUBSTAT_TYPES.includes(sub.type) && Number.isFinite(value)) {
        substats.push({ type: sub.type, value });
      }
    }
  }
  return {
    id: s.id,
    kind: s.kind,
    power,
    rarity: ALL_STONE_RARITIES.includes(s.rarity as StoneRarity) ? (s.rarity as StoneRarity) : 'common',
    substats: substats.slice(0, 3),
  };
}

/**
 * Valide une créature lue depuis une sauvegarde et répare ce qui peut l'être (sorts, emplacements,
 * compteurs). null si elle est inutilisable (pas d'identifiant ou espèce inconnue).
 * `freeStoneIds` : pierres existantes pas encore équipées ailleurs ; les ids utilisés en sont retirés.
 */
export function normalizeCreature(raw: unknown, freeStoneIds: Set<string>): OwnedCreature | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Partial<OwnedCreature>;
  if (typeof c.uid !== 'string' || !c.uid) return null;
  const species = typeof c.speciesId === 'string' ? SPECIES[c.speciesId] : undefined;
  if (!species) return null;

  const template = createStoneBoardForRole(species.role);
  const rawBoard = Array.isArray(c.stoneBoard) && c.stoneBoard.length === 9 ? c.stoneBoard : null;
  const stoneBoard: StoneSlot[] = template.map((slotTemplate, idx) => {
    const slot = rawBoard?.[idx] as Partial<StoneSlot> | undefined;
    const type =
      slot?.type === 'atk' || slot?.type === 'hp' || slot?.type === 'flex' ? slot.type : slotTemplate.type;
    const unlockLevel = Number.isFinite(Number(slot?.unlockLevel))
      ? Math.max(1, Math.floor(Number(slot?.unlockLevel)))
      : slotTemplate.unlockLevel;
    let stoneId: string | null = null;
    if (typeof slot?.stoneId === 'string' && freeStoneIds.has(slot.stoneId)) {
      stoneId = slot.stoneId;
      freeStoneIds.delete(stoneId); // une pierre ne peut occuper qu'un seul emplacement
    }
    return { type, unlockLevel, stoneId };
  });

  // v1 à v3 : les runes équipées s'appelaient `moveStones`
  const legacyRunes = (raw as { moveStones?: unknown }).moveStones;
  const rawRunes: unknown[] = Array.isArray(c.runes) ? c.runes : Array.isArray(legacyRunes) ? legacyRunes : [];
  const runes = [0, 1].map((i) => resolveRuneKind(rawRunes[i]));

  return {
    uid: c.uid,
    speciesId: species.id,
    level: Math.max(1, Math.min(50, Math.floor(Number(c.level)) || 1)),
    xp: Math.max(0, Number(c.xp) || 0),
    potBonus: Math.max(0, Number(c.potBonus) || 0),
    moveId: typeof c.moveId === 'string' && MOVES[c.moveId] ? c.moveId : species.moveId,
    runes,
    stoneBoard,
  };
}

function normalizeQuests(raw: unknown): ActiveQuest[] {
  if (!Array.isArray(raw) || raw.length !== 3) return createInitialQuests();
  const quests: ActiveQuest[] = [];
  for (const item of raw) {
    const q = item as Partial<ActiveQuest> | null;
    const target = Number(q?.target);
    if (
      !q ||
      typeof q.uid !== 'string' ||
      typeof q.templateId !== 'string' ||
      typeof q.title !== 'string' ||
      typeof q.description !== 'string' ||
      // la métrique est reprise du modèle (elle a pu être renommée, ex. reactionsTriggered en v5)
      !Number.isFinite(target) ||
      target <= 0 ||
      !q.reward ||
      typeof q.reward !== 'object' ||
      typeof q.reward.label !== 'string'
    ) {
      return createInitialQuests();
    }
    // Les textes et la récompense d'une quête sont copiés dans la sauvegarde : on les reprend du modèle,
    // pour qu'une ancienne sauvegarde n'affiche pas d'ancien nom et ne garde pas d'ancien identifiant.
    const templateId = Object.hasOwn(LEGACY_QUEST_IDS, q.templateId) ? LEGACY_QUEST_IDS[q.templateId] : q.templateId;
    const known = QUEST_POOL.find((t) => t.templateId === templateId);
    // A2.2 : une quête retirée du jeu (cuisine) est remplacée par une autre, sans toucher aux deux autres
    const taken = new Set([...quests.map((x) => x.templateId), ...raw.map((x) => (x as Partial<ActiveQuest> | null)?.templateId)]);
    const tpl = known ?? QUEST_POOL.find((t) => !t.requiresStageIndex && !taken.has(t.templateId));
    if (!tpl) return createInitialQuests();
    quests.push({
      uid: q.uid,
      templateId: tpl.templateId,
      title: tpl.title,
      description: tpl.description,
      metric: tpl.metric,
      progress: known ? Math.min(tpl.target, Math.max(0, Number(q.progress) || 0)) : 0,
      target: tpl.target,
      reward: tpl.reward,
    });
  }
  return new Set(quests.map((q) => q.uid)).size === 3 ? quests : createInitialQuests();
}

/**
 * Migre une sauvegarde v1 à v8, ou normalise une v9, sans perdre la progression du joueur.
 * v1 à v8 -> v9 (A2.2) : l'ancienne cuisine est convertie (`readLegacyKitchen`, legacyIds.ts) : Appâts, cubes
 * Cristal et Pierre ; chaque doublon d'une lignée déjà possédée donne +1 Lien (★5 au plus) et compte comme doublon.
 * v3 -> v4 : identifiants renommés (runes) convertis par les tables de `legacyIds.ts` ;
 * les quêtes en cours reprennent les textes et la récompense de leur modèle.
 * v2 -> v3 : ajoute les Runes de Précision et de Vigueur (0) au sac, la stat frontierWins (0)
 * et ouvre la Toundra aux sauvegardes qui avaient déjà vaincu l'ancien dernier niveau.
 *
 * Toute sauvegarde (y compris un JSON importé à la main) est aussi NORMALISÉE : chaque champ est
 * validé et réparé ou ignoré, pour qu'aucune donnée abîmée ne fasse planter le jeu plus tard.
 * Renvoie null seulement si rien n'est récupérable (pas d'escouade, version inconnue).
 */
export function migrateSaveState(raw: unknown): SaveState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Partial<SaveState>;
  if (!Array.isArray(obj.roster) || obj.roster.length === 0) return null;
  if (!Array.isArray(obj.squadIds)) return null;
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3 && obj.version !== 4 && obj.version !== 5 && obj.version !== 6 && obj.version !== 7 && obj.version !== 8 && obj.version !== SAVE_VERSION) return null;

  // Pierres de Pouvoir : valides, identifiants uniques
  const powerStones: PowerStone[] = [];
  const stoneIds = new Set<string>();
  for (const rawStone of Array.isArray(obj.powerStones) ? obj.powerStones : []) {
    const stone = normalizePowerStone(rawStone);
    if (stone && !stoneIds.has(stone.id)) {
      stoneIds.add(stone.id);
      powerStones.push(stone);
    }
  }

  // Créatures : valides, identifiants uniques, emplacements réparés
  const freeStoneIds = new Set(stoneIds);
  const validRoster: OwnedCreature[] = [];
  const rosterIds = new Set<string>();
  for (const rawCreature of obj.roster) {
    const creature = normalizeCreature(rawCreature, freeStoneIds);
    if (creature && !rosterIds.has(creature.uid)) {
      rosterIds.add(creature.uid);
      validRoster.push(creature);
    }
  }
  if (validRoster.length === 0) return null;

  const validSquad: string[] = [];
  for (const id of obj.squadIds) {
    if (typeof id === 'string' && rosterIds.has(id) && !validSquad.includes(id) && validSquad.length < 3) {
      validSquad.push(id);
    }
  }
  if (validSquad.length === 0) validSquad.push(validRoster[0].uid);

  const incomingStats = (obj.stats ?? {}) as Partial<PlayerStats>;
  const expeditionsCompleted = toCount(obj.expeditionsCompleted);

  const stats: PlayerStats = {
    expeditionsWon: Math.max(expeditionsCompleted, toCount(incomingStats.expeditionsWon)),
    // v1 à v4 : ancien nom de la statistique (legacyIds.ts) ; l'ancien « meilleur enchaînement » ne devient pas des Trios
    burstsTriggered: toCount(incomingStats.burstsTriggered ?? (incomingStats as Record<string, unknown>)[LEGACY_STAT_FIELDS.bursts]),
    ultimatesUsed: toCount(incomingStats.ultimatesUsed),
    evolutionsDone: toCount(incomingStats.evolutionsDone),
    perfectDodges: toCount(incomingStats.perfectDodges),
    bossesDefeated: Math.max(expeditionsCompleted, toCount(incomingStats.bossesDefeated)),
    triosTriggered: toCount(incomingStats.triosTriggered),
    frontierWins: toCount(incomingStats.frontierWins),
  };

  const completedStageIds = uniqueKnown(obj.completedStageIds, (id) => STAGES.some((s) => s.id === id));
  const discoveredSpeciesIds = uniqueKnown(
    Array.isArray(obj.discoveredSpeciesIds)
      ? [...obj.discoveredSpeciesIds, ...validRoster.map((c) => c.speciesId)]
      : validRoster.map((c) => c.speciesId),
    (id) => Boolean(SPECIES[id]),
  );

  const migrated: SaveState = {
    version: SAVE_VERSION,
    starterChosen: Boolean(obj.starterChosen),
    squadIds: validSquad,
    roster: validRoster,
    powerStones,
    runeBag: normalizeRuneBag(obj.runeBag, (raw as { moveStoneBag?: unknown }).moveStoneBag),
    highestStageIndex: computeHighestUnlockedStageIndex(
      completedStageIds,
      Math.max(0, Math.min(STAGES.length - 1, Number(obj.highestStageIndex ?? 0) || 0)),
    ),
    completedStageIds,
    discoveredSpeciesIds,
    expeditionsCompleted,
    stats,
    activeQuests: normalizeQuests(obj.activeQuests),
    claimedAchievementIds: uniqueKnown(
      Array.isArray(obj.claimedAchievementIds)
        ? obj.claimedAchievementIds.map((id) => (typeof id === 'string' && Object.hasOwn(LEGACY_ACHIEVEMENT_IDS, id) ? LEGACY_ACHIEVEMENT_IDS[id] : id))
        : [],
      (id) => ACHIEVEMENTS.some((a) => a.id === id),
    ),
    firstTimesSeen: uniqueKnown(obj.firstTimesSeen, (id) => (FIRST_TIME_KINDS as readonly string[]).includes(id)),
    hazardHintsSeen: normalizeHintCounts(obj.hazardHintsSeen),
    stageStars: normalizeStageStars(obj.stageStars, completedStageIds),
    lessonsDone: normalizeLessons(obj.lessonsDone, completedStageIds),
    starterTrio: obj.starterTrio === 'braise' || obj.starterTrio === 'maree' ? obj.starterTrio : null,
    // une sauvegarde d'avant S07 (v1 à v7) a déjà tout ouvert
    allUnlocked: typeof obj.allUnlocked === 'boolean' ? obj.allUnlocked : (obj.version as number) < 8,
    ...normalizeSummonState(obj),
    unlocksSeen: Array.isArray(obj.unlocksSeen) ? UNLOCK_FEATURES.filter((f) => (obj.unlocksSeen as unknown[]).includes(f)) : [],
    starTiersClaimed: Array.isArray(obj.starTiersClaimed)
      ? STAR_TIERS.map((t) => t.at).filter((at) => (obj.starTiersClaimed as unknown[]).includes(at))
      : [],
    kitchenConversion: normalizeKitchenConversion((obj as Record<string, unknown>).kitchenConversion),
  };
  return (obj.version as number) < 9 ? convertLegacyKitchen(migrated, obj) : migrated;
}

/** Bilan de la conversion de la cuisine lu dans une sauvegarde v9 (null s'il est absent ou abîmé). */
function normalizeKitchenConversion(raw: unknown): KitchenConversion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const bonds = Number(r.bonds);
  return { baits: toCount(r.baits), crystal: toCount(r.crystal), stone: toCount(r.stone), bonds: Number.isFinite(bonds) && bonds > 0 ? Math.round(bonds * 10) / 10 : 0 };
}

/**
 * v1 à v8 -> v9 (A2.2) : l'ancienne cuisine devient des Appâts et des cubes, les doublons déjà possédés du Lien.
 * Les créatures restent toutes ; rien n'est tiré au hasard.
 */
function convertLegacyKitchen(save: SaveState, raw: object): SaveState {
  const kitchen = readLegacyKitchen(raw);
  const baits = { ...save.baits };
  let baitCount = 0;
  for (const [el, n] of Object.entries(kitchen.baits) as [ElementType, number][]) {
    if (n > 0) {
      baits[el] = (baits[el] ?? 0) + n;
      baitCount += n;
    }
  }
  // Doublons existants : deux créatures (ou plus) de la même lignée
  const perLineage: Record<string, number> = {};
  for (const c of save.roster) {
    const l = lineageOf(c.speciesId);
    perLineage[l] = (perLineage[l] ?? 0) + 1;
  }
  const bonds = { ...save.bonds };
  const duplicates = { ...save.duplicates };
  let bondsGained = 0;
  for (const [l, count] of Object.entries(perLineage)) {
    const extra = count - 1;
    if (extra <= 0) continue;
    duplicates[l] = (duplicates[l] ?? 0) + extra;
    const before = bonds[l] ?? 0;
    bonds[l] = Math.min(SUMMON.bondMax, before + extra);
    bondsGained += bonds[l] - before;
  }
  const materials: CubeMaterial[] = [
    ...Array<CubeMaterial>(kitchen.crystalCubes).fill('crystal'),
    ...Array<CubeMaterial>(kitchen.stoneCubes).fill('stone'),
  ];
  const { nextSave, added } = addSealedCubes({ ...save, baits, bonds, duplicates }, materials);
  return {
    ...nextSave,
    kitchenConversion: {
      baits: baitCount,
      crystal: added.filter((m) => m === 'crystal').length,
      stone: added.filter((m) => m === 'stone').length,
      bonds: Math.round(bondsGained * 10) / 10,
    },
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
    return { ok: false, error: FR.rules.leContenuJsonEstVide };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: FR.rules.formatJsonInvalideVerifiezQueLe };
  }
  const migrated = migrateSaveState(parsed);
  if (!migrated) {
    return {
      ok: false,
      error: FR.rules.sauvegardeNonReconnueOuIncomplete,
    };
  }
  return { ok: true, save: migrated };
}

/** Lit et migre une sauvegarde stockée ; null si elle est absente ou illisible. */
function readStoredSave(key: string): { raw: string | null; save: SaveState | null } {
  const raw = window.localStorage.getItem(key);
  if (!raw) return { raw: null, save: null };
  try {
    return { raw, save: migrateSaveState(JSON.parse(raw)) };
  } catch {
    return { raw, save: null };
  }
}

export function loadSaveState(): SaveState {
  try {
    const current = readStoredSave(SAVE_STORAGE_KEY);
    if (current.save) return current.save;
    if (current.raw) {
      // Sauvegarde présente mais illisible (JSON cassé ou version plus récente) : le jeu va repartir
      // d'une partie neuve et l'écraser au premier enregistrement, donc on en garde une copie brute.
      try {
        window.localStorage.setItem(SAVE_BACKUP_STORAGE_KEY, current.raw);
      } catch {
        // stockage plein : on ne peut rien faire de plus
      }
    }
    const legacy = readStoredSave(LEGACY_SAVE_STORAGE_KEY);
    if (legacy.save) {
      persistSaveState(legacy.save);
      return legacy.save;
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
