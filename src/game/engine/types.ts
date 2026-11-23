/**
 * Types internes du moteur (acteurs de combat, projectiles, télégraphes, météo) et types de son API.
 */
import * as THREE from 'three';
import type { ElementType, ExpeditionHudSnapshot, RuneKind, StatusKind } from '../types';
import type { CrackState, CubeState } from '../rules';
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
  /** Couronne : rayon de la zone sûre au centre (0 sinon). */
  innerRadius: number;
  /** Forme de la zone (grammaire unique, engine/telegraphs.ts) ; null pour une onde décorative. */
  shape: 'disc' | 'ring' | 'band' | 'spiral' | null;
  /** Le « tic » de fin a déjà sonné. */
  warned: boolean;
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
  /** Cube d'élément (ennemis seulement) ; son statut est dans `statuses`. */
  cube: CubeState | null;
  /** Fêlure laissée par un Éclat (ennemis seulement). */
  crack: CrackState | null;
  /** Verrou après un Trio : pas de cube tant qu'il dure. */
  trioLockTimer: number;
  /** Éclair blanc bref quand le cube devient mûr (affichage). */
  cubeRipeFlash: number;
  bossPhase: 1 | 2 | 3;
  bossMaxPhases: 2 | 3;
  bossPatternIndex: number;
  pullTimer: number; // Œil du Cyclone : le boss aspire l'escouade tant que > 0
  /** Gardien (module Satellites) : identifiant de son boss, sinon null. */
  guardianOf: string | null;
  /** Carapace de magma : valeur du bouclier au début de la phase (pour la barre du HUD). */
  shieldMax: number;
  /** Instant où le bouclier de la phase a été posé (mesure de sa durée de vie). */
  shieldSince: number;
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
  /** Plus court délai d'annonce observé par phase de boss (-1 : aucune annonce). */
  minWindupByPhase: [number, number, number];
  /** Carapace de magma : secondes avant que chaque bouclier soit brisé. */
  shieldBreakSecs: number[];
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
   * `false` : aucun cube d'élément (ni pose, ni Éclat, ni Trio). Réservé aux outils de mesure
   * (`npm run sim`, `npm run golden`) : le jeu ne passe jamais cette option.
   */
  cubes?: boolean;
}

/** Bilan d'un combat, tel que le moteur le remet à l'interface. */
export interface ExpeditionResult {
  victory: boolean;
  clearTimeSec: number;
  wavesCleared: number;
  damageDealt: number;
  bossHpPercentRemaining: number;
  burstsTriggered: number;
  ultimatesUsed: number;
  perfectDodges: number;
  triosTriggered: number;
  /** Compagnons tombés pendant le combat ; attaques annoncées subies (par allié touché). */
  koCount: number;
  hazardHits: number;
  weakBursts: number;
  /** Appuis sur Esquive (journal de test). */
  dodges: number;
  /** Leçons montrées et réussies pendant ce combat (S07.2). */
  lessonsSeen?: string[];
  lessonsPassed?: string[];
}

/** Premières fois montrées au joueur (bulle d'une ligne). */
export type FirstTimeKind = 'cube' | 'weak' | 'burst' | 'trio';

export interface EngineCallbacks {
  /** Première fois qu'un geste se produit dans ce combat ; l'interface décide s'il faut l'expliquer. */
  onFirstTime?: (kind: FirstTimeKind) => void;
  /** Une consigne d'attaque vient d'être montrée (pour la compter dans la sauvegarde). */
  onHazardHint?: (key: string) => void;
  /** Une leçon vient d'être réussie, ou son geste fait en avance (S07.2). */
  onLessonDone?: (id: string) => void;
  onHudUpdate: (snapshot: ExpeditionHudSnapshot) => void;
  /**
   * Victoire acquise : appelé UNE fois par combat, à l'instant où le dernier ennemi tombe, avec le bilan
   * définitif. C'est là que l'interface attribue les récompenses : rien de ce que le joueur fait ensuite
   * (pause, retour au camp, relance) ne peut les lui faire perdre.
   */
  onVictorySecured?: (result: ExpeditionResult) => void;
  /** Fin de la fête ou du repli : demande l'écran de fin. N'arrive jamais si le joueur a quitté avant. */
  onExpeditionComplete: (result: ExpeditionResult) => void;
}
