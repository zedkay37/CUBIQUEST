export type ElementType = 'fire' | 'water' | 'grass' | 'electric' | 'rock' | 'psychic';

export type CreatureRole = 'melee' | 'ranged' | 'tank';

export type CreatureArchetype =
  /** A1.1 : créature-pile (lignée Foudre de départ). */
  | 'cell'
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

export type RuneKind =
  | 'rune_ampleur'
  | 'rune_cadence'
  | 'rune_force'
  | 'rune_partage'
  // Giga Update : pierres des nouveaux biomes
  | 'rune_precision'
  | 'rune_vigueur';

export type StoneKind = 'atk' | 'hp';
export type StoneSlotType = 'atk' | 'hp' | 'flex';
export type StoneRarity = 'common' | 'bronze' | 'silver' | 'gold';

export type BiomeId = 'meadow' | 'shore' | 'volcano' | 'sanctuary' | 'tundra' | 'stormpeak' | 'canyon';

/** Jeu de mécaniques télégraphiées d'un boss (voir VoxelEngine, IA 'boss'). */
export type BossKit = 'classic' | 'meadow' | 'shore' | 'volcano' | 'sanctuary' | 'frost' | 'storm' | 'amber';

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

export interface RuneDef {
  kind: RuneKind;
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
  runes: (RuneKind | null)[]; // 2 slots
  stoneBoard: StoneSlot[]; // 9 slots (3x3)
  /** Lien de la lignée (A2), recopié de la sauvegarde au départ d'un combat ; jamais enregistré ici. */
  bond?: number;
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

/** Éclats : un par élément, celui QUI FAIT ÉCLATER le cube. */
export type BurstId = 'deflagration' | 'deferlante' | 'seve' | 'arc' | 'rempart' | 'echo';
export type BurstEffect = 'aoe_burn' | 'knockback' | 'team_heal' | 'chain_stun' | 'team_shield' | 'cd_spread';

export interface StatusMeta {
  kind: StatusKind;
  element: ElementType;
  label: string;
  shortTag: string;
  color: string;
  durationSec: number;
  description: string;
}

export interface BurstDef {
  id: BurstId;
  /** Élément qui fait éclater le cube. */
  element: ElementType;
  name: string;
  color: string;
  damageMult: number;
  effect: BurstEffect;
  description: string;
}

export type QuestMetric =
  | 'expeditionsWon'
  | 'burstsTriggered'
  | 'ultimatesUsed'
  | 'perfectDodges'
  | 'bossesDefeated'
  | 'evolutionsDone'
  | 'stagesCompleted'
  | 'speciesDiscovered'
  | 'triosTriggered'
  // Giga Update
  | 'frontierWins'
  | 'tundraStages'
  | 'stormStages';

export interface QuestReward {
  label: string;
  /** Appâts par élément (spec Atelier, A2.2 : remplacent les anciennes récompenses de la cuisine). */
  baits?: Partial<Record<ElementType, number>>;
  cube?: 'wood' | 'stone' | 'crystal' | 'prism';
  rune?: RuneKind;
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
  burstsTriggered: number;
  ultimatesUsed: number;
  evolutionsDone: number;
  perfectDodges: number;
  bossesDefeated: number;
  triosTriggered: number;
  /** v3 — victoires dans la Toundra Boréale / la Cime des Orages. */
  frontierWins: number;
}

export interface SaveState {
  version: number;
  starterChosen: boolean;
  squadIds: string[]; // up to 3 OwnedCreature uids
  roster: OwnedCreature[];
  powerStones: PowerStone[];
  runeBag: Record<RuneKind, number>;
  highestStageIndex: number; // 0..STAGES.length-1 unlocked
  completedStageIds: string[];
  discoveredSpeciesIds: string[];
  expeditionsCompleted: number;
  stats: PlayerStats;
  activeQuests: ActiveQuest[];
  claimedAchievementIds: string[];
  /** Gestes déjà expliqués par une bulle « première fois » (cube, Éclat faible, Éclat, Trio). */
  firstTimesSeen: string[];
  /** Consignes d'attaque déjà montrées, par type d'attaque (S05.2). */
  hazardHintsSeen: Record<string, number>;
  /** Étoiles acquises par niveau (S06). */
  stageStars: Record<string, StageStars>;
  /** Paliers d'étoiles dont la récompense a été donnée (12, 24, 36, 48, 63). */
  starTiersClaimed: number[];
  /** Leçons réussies ou dont le geste a été fait en avance (S07.2). */
  lessonsDone: string[];
  /** Trio choisi au départ (null : sauvegarde d'avant S07). */
  starterTrio: 'braise' | 'maree' | null;
  /** Sauvegarde d'avant S07 : tout est déjà ouvert. */
  allUnlocked: boolean;
  /** Ouvertures dont la pastille « Nouveau » a été vue. */
  unlocksSeen: string[];
  /** Cube Scellé (spec Atelier, A2) : inventaire, compteur d'identifiants, Appâts, jauge d'Éveil. */
  sealedCubes: { id: string; material: 'wood' | 'stone' | 'crystal' | 'prism'; guaranteedSpeciesId?: string }[];
  cubeCounter: number;
  baits: Partial<Record<ElementType, number>>;
  awakenGauge: number;
  /** Lien par lignée (0 à 5, décimal : +0,1 par victoire), doublons, variantes débloquées et choisies. */
  bonds: Record<string, number>;
  duplicates: Record<string, number>;
  variantsUnlocked: string[];
  variantsOn: string[];
  /**
   * Ce que l'ancienne cuisine a rapporté à la migration (A2.2), pour l'écran qui présente l'Atelier.
   * null pour une nouvelle partie, et une fois l'écran vu.
   */
  kitchenConversion: KitchenConversion | null;
}

export interface KitchenConversion {
  baits: number;
  crystal: number;
  stone: number;
  bonds: number;
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
  /** Éclats et Trios de ce combat. */
  burstsTriggered: number;
  triosTriggered: number;
  lastBurstLabel: string | null;
  lastBurstColor: string | null;
  /** Ce que ferait le sort de chaque compagnon maintenant (cartes du HUD). */
  skillPreviews: ('trio' | 'burst' | 'ripening' | 'cube' | 'far')[];
  /** Leçon en cours (S07.2) : sa phrase et la touche qui s'allume. */
  lesson: { id: string; text: string; key: string } | null;
  /** Défi du niveau et son état pendant le combat (S06.1) : acquis, perdu ou en cours. */
  challenge: { text: string; state: 'pending' | 'done' | 'lost' } | null;
  /** Élément du meneur (premier compagnon vivant) : couleur et effet du Déchaînement. */
  leaderElement: ElementType | null;
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
    /** Carapace de magma : bouclier restant et bouclier de la phase (0 si aucun). */
    shield: number;
    shieldMax: number;
  } | null;
  damageDealt: number;
  bannerText: string | null;
  /** Renseigné pendant la courte cinématique d'entrée du boss. */
  bossIntro: { name: string; title: string; element: ElementType } | null;
}

/**
 * Défi d'un niveau (S06.1). Retour du propriétaire : aucun défi ne dépend des Éclats ni des Trios
 * (les cubes pourraient être retirés) ; seulement esquive parfaite, chrono, aucune attaque annoncée subie,
 * sans Déchaînement, et leurs combinaisons.
 */
export type StageChallenge =
  | { kind: 'perfectDodges'; n: number }
  | { kind: 'duration'; maxSec: number }
  | { kind: 'noTelegraphHit' }
  | { kind: 'noUltimate' }
  | { kind: 'all'; of: StageChallenge[] };

/** Les trois étoiles d'un niveau : victoire, sans K.O., défi. Elles restent acquises d'une partie à l'autre. */
export interface StageStars {
  win: boolean;
  noKo: boolean;
  challenge: boolean;
}

/** Les huit conseils de défaite (S06.2), du plus utile au plus général. */
export type DefeatAdvice = 'noDodge' | 'underLevel' | 'weakElement' | 'earlyKo' | 'noBurst' | 'manyWeak' | 'noUltimate' | 'longFight';

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
  burstsTriggered: number;
  ultimatesUsed: number;
  perfectDodges: number;
  triosTriggered: number;
  xpPerUnit: number;
  droppedStone: PowerStone | null;
  droppedRune: RuneKind | null;
  leveledUpNames: string[];
  /** Montées de niveau détaillées (écran de fin). */
  levelUps: { speciesId: string; from: number; to: number }[];
  unlockedNextStageName: string | null;
  /** Nom du biome qui vient de s'ouvrir (quand le niveau débloqué est le premier d'un nouveau biome). */
  unlockedBiomeName: string | null;
  /** Étoiles gagnées dans ce combat, et celles déjà acquises avant lui. */
  stars: StageStars;
  previousStars: StageStars;
  /** Conseil de l'écran de défaite (choisi par règle, voir defeatAdvice), null après une victoire. */
  advice: DefeatAdvice | null;
  /** Première victoire sur ce niveau (XP × 2,5) ; XP reçue par chaque créature restée au camp (0 si aucune). */
  firstClear: boolean;
  benchXp: number;
  /** Cubes Scellés et Appâts gagnés par ce combat (A2). */
  cubesWon: ('wood' | 'stone' | 'crystal' | 'prism')[];
  baitsWon: ElementType[];
  /** Ce que cette victoire ouvre (S07.3) et le compagnon qui rejoint le camp, s'il y en a un. */
  newFeatures: string[];
  joinedSpeciesId: string | null;
  /** Paliers d'étoiles franchis par ce combat, avec leur récompense (S06.4). */
  starTiers: { at: number; rune: RuneKind | null }[];
  /** XP de chaque membre de l'escouade après le combat (barres animées de l'écran de fin). */
  squadXp: { speciesId: string; level: number; xp: number; xpMax: number; gained: number }[];
  /** Compagnons tombés, attaques annoncées subies (pour les étoiles et le conseil de défaite). */
  koCount: number;
  hazardHits: number;
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
