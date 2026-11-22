export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'rock' | 'psychic';

export type CreatureRole = 'melee' | 'ranged' | 'tank';

export type CreatureArchetype =
  | 'quadruped'
  | 'fungal'
  | 'biped'
  | 'shelled'
  | 'crab'
  | 'winged'
  | 'horned'
  | 'lizard'
  | 'floating'
  | 'ram'
  // Giga Update : nouvelles silhouettes
  | 'antlered'
  | 'golem'
  | 'serpentine'
  | 'jelly';

export type MoveStyle = 'melee' | 'projectile' | 'aoe' | 'dash' | 'buff';

export type MoveStoneKind =
  | 'broadburst'
  | 'wait_less'
  | 'whack_whack'
  | 'share'
  // Giga Update : pierres des nouveaux biomes
  | 'crit_focus'
  | 'leech';

export type StoneKind = 'atk' | 'hp';
export type StoneSlotType = 'atk' | 'hp' | 'flex';
export type StoneRarity = 'common' | 'bronze' | 'silver' | 'gold';

export type PotTier = 'iron' | 'bronze' | 'silver' | 'gold';

export type IngredientColor = 'red' | 'blue' | 'yellow' | 'gray';
export type IngredientRarity = 'common' | 'rare' | 'mystic';

export type BiomeId = 'meadow' | 'shore' | 'volcano' | 'sanctuary' | 'tundra' | 'stormpeak' | 'canyon';

/** Jeu de mécaniques télégraphiées d'un boss (voir VoxelEngine, IA 'boss'). */
export type BossKit = 'classic' | 'frost' | 'storm' | 'amber';

export type ControlMode = 'semi' | 'auto' | 'manual';

export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';
export type PlayMode = 'camp' | 'expedition';

export interface SpeciesDef {
  id: string;
  name: string;
  element: ElementType;
  role: CreatureRole;
  archetype: CreatureArchetype;
  baseHp: number;
  baseAtk: number;
  moveSpeed: number;
  attackRange: number;
  moveId: string;
  evolvesTo?: string;
  evolveLevel?: number;
  scale: number;
  palette: {
    primary: string;
    secondary: string;
    belly: string;
    accent: string;
    eye: string;
  };
  dexNote: string;
  isRare?: boolean;
  /** Stade d'évolution (1..3) : enrichit le modèle voxel des nouvelles silhouettes. */
  stage?: 1 | 2 | 3;
}

export interface MoveDef {
  id: string;
  name: string;
  element: ElementType;
  style: MoveStyle;
  powerMultiplier: number;
  cooldown: number;
  range: number;
  aoeRadius: number;
  color: string;
  description: string;
}

export interface MoveStoneDef {
  kind: MoveStoneKind;
  name: string;
  shortLabel: string;
  color: string;
  description: string;
}

export interface PowerStoneSubstat {
  type: 'critRate' | 'hitHeal' | 'moveSpeed' | 'statusRes';
  value: number; // percentage points, e.g., 5 means +5%
}

export interface PowerStone {
  id: string;
  kind: StoneKind;
  power: number;
  rarity: StoneRarity;
  substats: PowerStoneSubstat[];
}

export interface StoneSlot {
  type: StoneSlotType;
  unlockLevel: number;
  stoneId: string | null;
}

export interface OwnedCreature {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  potBonus: number;
  moveId: string;
  moveStones: (MoveStoneKind | null)[]; // 2 slots
  stoneBoard: StoneSlot[]; // 9 slots (3x3)
}

export interface ComputedCreatureStats {
  maxHp: number;
  atk: number;
  power: number;
  critRate: number; // 0..100
  hitHeal: number; // 0..100
  moveSpeedMult: number; // 1.0+
  statusRes: number; // 0..100
}

export interface IngredientDef {
  id: string;
  name: string;
  color: IngredientColor;
  rarity: IngredientRarity;
  hex: string;
  accentHex: string;
  description: string;
}

export interface RecipeDef {
  id: string;
  name: string;
  soupHex: string;
  cookExpeditions: number;
  description: string;
  hint: string;
  targetElement?: ElementType;
  poolSpeciesIds: string[];
  /** Recette des nouveaux biomes (compte pour la statistique frontierDishes). */
  frontier?: boolean;
}

export interface PotState {
  tier: PotTier;
  slots: (string | null)[]; // 5 ingredient IDs
  status: 'idle' | 'cooking' | 'ready';
  recipeId: string | null;
  expeditionsRemaining: number;
  expeditionsTotal: number;
}

export interface StageWaveDef {
  enemies: {
    speciesId: string;
    level: number;
    ai: 'chaser' | 'kiter' | 'charger' | 'boss';
    isBoss?: boolean;
  }[];
}

export interface StageDef {
  id: string;
  index: number;
  biomeId: BiomeId;
  stageNumber: number; // 1..3
  name: string;
  recommendedPower: number;
  bossSpeciesId: string;
  waves: StageWaveDef[];
  dropIngredients: string[];
  stonePowerRange: [number, number];
  xpReward: number;
  /**
   * Multiplicateurs de PV / d'attaque des ennemis du niveau (1 par défaut).
   * Les biomes de la Giga Update allongent les combats (plus de PV, coups moins lourds)
   * pour que les mécaniques télégraphiées et les phases aient le temps de s'exprimer.
   */
  enemyHpMult?: number;
  enemyAtkMult?: number;
  /** Multiplicateur de PV supplémentaire réservé au boss (se cumule avec enemyHpMult). */
  bossHpMult?: number;
  /** Mécaniques de boss propres au biome ('classic' par défaut). */
  bossKit?: BossKit;
}

export interface BiomeDef {
  id: BiomeId;
  name: string;
  subtitle: string;
  dominantElement: ElementType;
  skyHex: string;
  fogHex: string;
  groundHex: string;
  groundAltHex: string;
  accentHex: string;
  waterHex: string;
}

export type StatusKind = 'burn' | 'soaked' | 'rooted' | 'shocked' | 'sunder' | 'confused';

export type ReactionId =
  | 'evaporation'
  | 'ignition'
  | 'electrocution'
  | 'overload'
  | 'crystallize'
  | 'psy_resonance';

export interface StatusMeta {
  kind: StatusKind;
  element: ElementType;
  label: string;
  shortTag: string;
  color: string;
  durationSec: number;
  description: string;
}

export interface ElementalReactionDef {
  id: ReactionId;
  name: string;
  color: string;
  damageMult: number;
  ultimateBonus: number;
  effect: 'burst' | 'aoe_burn' | 'chain_stun' | 'knockback' | 'team_shield' | 'cd_spread';
  description: string;
}

export type QuestMetric =
  | 'expeditionsWon'
  | 'reactionsTriggered'
  | 'ultimatesUsed'
  | 'dishesCooked'
  | 'perfectDodges'
  | 'bossesDefeated'
  | 'evolutionsDone'
  | 'stagesCompleted'
  | 'speciesDiscovered'
  | 'maxCombo'
  // Giga Update
  | 'frontierWins'
  | 'frontierDishes'
  | 'tundraStages'
  | 'stormStages';

export interface QuestReward {
  label: string;
  ingredients?: Record<string, number>;
  moveStone?: MoveStoneKind;
  powerStoneRange?: [number, number];
  guaranteedRarity?: StoneRarity;
}

export interface QuestTemplate {
  templateId: string;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
  /** La quête n'entre dans la rotation qu'une fois ce niveau débloqué. */
  requiresStageIndex?: number;
}

export interface ActiveQuest {
  uid: string;
  templateId: string;
  title: string;
  description: string;
  metric: QuestMetric;
  progress: number;
  target: number;
  reward: QuestReward;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
}

export interface PlayerStats {
  expeditionsWon: number;
  reactionsTriggered: number;
  ultimatesUsed: number;
  dishesCooked: number;
  evolutionsDone: number;
  perfectDodges: number;
  bossesDefeated: number;
  maxCombo: number;
  /** v3 — victoires dans la Toundra Boréale / la Cime des Orages. */
  frontierWins: number;
  /** v3 — cuissons lancées avec une recette des nouveaux biomes. */
  frontierDishes: number;
}

export interface SaveState {
  version: number;
  starterChosen: boolean;
  squadIds: string[]; // up to 3 OwnedCreature uids
  roster: OwnedCreature[];
  ingredients: Record<string, number>;
  powerStones: PowerStone[];
  moveStoneBag: Record<MoveStoneKind, number>;
  pot: PotState;
  unlockedPotTiers: PotTier[];
  highestStageIndex: number; // 0..STAGES.length-1 unlocked
  completedStageIds: string[];
  discoveredSpeciesIds: string[];
  discoveredRecipeIds: string[];
  expeditionsCompleted: number;
  stats: PlayerStats;
  activeQuests: ActiveQuest[];
  claimedAchievementIds: string[];
}

export interface ExpeditionUnitHud {
  uid: string;
  speciesId: string;
  name: string;
  element: ElementType;
  level: number;
  hp: number;
  maxHp: number;
  shieldHp: number;
  fainted: boolean;
  reviveTimer: number;
  moveName: string;
  moveElement: ElementType;
  moveCooldown: number;
  moveMaxCooldown: number;
  buffActive: boolean;
  statuses: StatusKind[];
}

export interface ExpeditionHudSnapshot {
  stageId: string;
  stageName: string;
  biomeName: string;
  waveIndex: number; // 0-based
  totalWaves: number;
  elapsedSec: number;
  dodgeCooldown: number;
  dodgeMaxCooldown: number;
  ultimateCharge: number; // 0..100
  comboCount: number;
  comboTimer: number;
  lastReactionLabel: string | null;
  lastReactionColor: string | null;
  controlMode: ControlMode;
  units: ExpeditionUnitHud[];
  enemiesRemaining: number;
  boss: {
    name: string;
    element: ElementType;
    hp: number;
    maxHp: number;
    telegraphing: boolean;
    phase: 1 | 2 | 3;
    maxPhases: 2 | 3;
    statuses: StatusKind[];
  } | null;
  damageDealt: number;
  bannerText: string | null;
  /** Renseigné pendant la courte cinématique d'entrée du boss. */
  bossIntro: { name: string; title: string; element: ElementType } | null;
}

export interface ExpeditionOutcome {
  victory: boolean;
  stageId: string;
  stageName: string;
  biomeName: string;
  clearTimeSec: number;
  wavesCleared: number;
  totalWaves: number;
  damageDealt: number;
  bossHpPercentRemaining: number;
  reactionsTriggered: number;
  ultimatesUsed: number;
  perfectDodges: number;
  maxCombo: number;
  xpPerUnit: number;
  droppedIngredients: { id: string; count: number }[];
  droppedStone: PowerStone | null;
  droppedMoveStone: MoveStoneKind | null;
  leveledUpNames: string[];
  potReadyNow: boolean;
  unlockedNextStageName: string | null;
  /** Nom du biome qui vient de s'ouvrir (quand le niveau débloqué est le premier d'un nouveau biome). */
  unlockedBiomeName: string | null;
  unlockedPotTier: PotTier | null;
}

export interface CodexSource {
  title: string;
  uri: string;
}

export interface CodexAnswer {
  query: string;
  answer: string;
  sources: CodexSource[];
  timestamp: number;
}
