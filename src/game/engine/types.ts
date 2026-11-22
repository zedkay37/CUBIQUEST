/**
 * Types internes du moteur (acteurs de combat, projectiles, télégraphes, météo) et types de son API.
 */
import * as THREE from 'three';
import type { ElementType, ExpeditionHudSnapshot, RuneKind, StatusKind } from '../types';
import type { VoxelCreatureRig } from '../voxelModels';

export interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  colorHex: string;
  gravity: number;
  drag: number;
  stretchY: number;
  bounce: number;
}

export interface ActiveProjectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  life: number;
  fromAlly: boolean;
  damage: number;
  elementColor: string;
  elementType?: ElementType;
  isSkill?: boolean;
  aoeRadius: number;
  isCrit: boolean;
  casterUnit?: CombatActor;
}

export interface GroundTelegraph {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  radius: number;
  elapsed: number;
  duration: number;
  isLine: boolean;
  dirX: number;
  dirZ: number;
  isEnemyHazard: boolean;
  onComplete: () => void;
}

export interface ActorStatusInstance {
  remaining: number;
  tickTimer: number;
  sourceAtk: number;
}

export interface CombatActor {
  id: string;
  isAlly: boolean;
  isBoss: boolean;
  ai: 'ally' | 'chaser' | 'kiter' | 'charger' | 'boss';
  speciesId: string;
  name: string;
  level: number;
  rig: VoxelCreatureRig;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  hp: number;
  maxHp: number;
  shieldHp: number;
  atk: number;
  critRate: number;
  hitHeal: number;
  statusRes: number;
  moveSpeed: number;
  attackRange: number;
  moveId: string;
  runes: (RuneKind | null)[];
  basicCooldown: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  buffTimer: number;
  flashTimer: number;
  invulnTimer: number;
  stunTimer: number;
  dodgeTimer: number;
  dodgeDirX: number;
  dodgeDirZ: number;
  walkPhase: number;
  squashY: number;
  fainted: boolean;
  reviveTimer: number;
  koDissolveTimer: number; // for enemies
  removed: boolean;
  telegraphing: boolean;
  aiCooldown: number;
  hasAttackToken: boolean;
  statuses: Partial<Record<StatusKind, ActorStatusInstance>>;
  bossPhase: 1 | 2 | 3;
  bossMaxPhases: 2 | 3;
  bossPatternIndex: number;
  pullTimer: number; // Œil du Cyclone : le boss aspire l'escouade tant que > 0
}

export interface CampWanderer {
  uid: string;
  rig: VoxelCreatureRig;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  waitTimer: number;
  walkPhase: number;
  facing: number;
  emoteTimer: number; // délai avant le prochain petit saut de joie
  emoteT: number; // temps restant du saut en cours
}

export interface EvolutionSequence {
  t: number;
  revealed: boolean;
  rig: VoxelCreatureRig;
  baseScale: number;
  toSpeciesId: string;
  spawnAcc: number;
  onReveal?: () => void;
  onDone: () => void;
}

export interface WeatherMote {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  phase: number;
}

export type WeatherKind = 'drift' | 'rain' | 'rise' | 'float' | 'snow';

/** Mesures d'un combat lues par l'outil de simulation (`npm run sim`). Temps en secondes de combat. */
export interface CombatTelemetry {
  /** Instant où le boss entre en scène (-1 s'il n'est jamais apparu). */
  bossAppearedAt: number;
  /** Début de chaque phase du boss : [phase 1, phase 2, phase 3] (-1 si jamais atteinte). */
  phaseStartedAt: [number, number, number];
  /** Instant de la mort du boss (-1 s'il a survécu). */
  bossDefeatedAt: number;
  /** Nombre d'attaques télégraphiées lancées par le boss dans chaque phase. */
  castsByPhase: [number, number, number];
  /** Identifiants des attaques (patterns 0 à 5) vues dans chaque phase. */
  patternsByPhase: [number[], number[], number[]];
  bossMaxPhases: number;
  elapsed: number;
}

export interface EngineOptions {
  /**
   * Sans rendu ni DOM : aucune WebGLRenderer, aucun écouteur, aucune boucle automatique.
   * La simulation avance uniquement via `stepSimulation(dt)` (outil `npm run sim`).
   */
  headless?: boolean;
  /**
   * `false` coupe les réactions élémentaires. Réservé aux outils de mesure (`npm run sim`,
   * `npm run golden`) : le jeu ne passe jamais cette option, les réactions y sont toujours actives.
   */
  reactions?: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: ExpeditionHudSnapshot) => void;
  onExpeditionComplete: (result: {
    victory: boolean;
    clearTimeSec: number;
    wavesCleared: number;
    damageDealt: number;
    bossHpPercentRemaining: number;
    reactionsTriggered: number;
    ultimatesUsed: number;
    perfectDodges: number;
    maxCombo: number;
  }) => void;
}
