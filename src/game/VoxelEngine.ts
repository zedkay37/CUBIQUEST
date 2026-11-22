import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundFx } from './audio';
import {
  BOSS_KITS,
  DEFAULT_EYE_THEME,
  DEFAULT_RING_THEME,
  DEFAULT_STRIKE_THEME,
  FROST_KIT,
  STORM_KIT,
} from './balance';
import { BIOMES, MOVES, RECIPE_BY_ID, SPECIES, STATUS_META } from './catalog';
import {
  calculateDamage,
  computeBossPhase,
  computeCreatureStats,
  computeStatusDuration,
  computeUltimateCharge,
  getMoveModifiers,
  getTypeEffectiveness,
  getStatusForElement,
  resolveElementalReaction,
} from './rules';
import type {
  BiomeId,
  ControlMode,
  ElementType,
  ExpeditionHudSnapshot,
  MoveStoneKind,
  OwnedCreature,
  PlayMode,
  PowerStone,
  StageDef,
  StatusKind,
} from './types';
import {
  attachWorldHpBar,
  buildBiomeEnvironment,
  buildCampLandmark,
  buildCookingPotProp,
  buildVoxelCreature,
  FloatingTextPool,
  getRigTopY,
  isHoverArchetype,
  type VoxelCreatureRig,
} from './voxelModels';

// Module-level preallocated math scratch objects (Zero GC inside render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface ParticleSlot {
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

// Signature visuelle des impacts par élément (couleurs + comportement physique des cubes)
const ELEMENT_FX: Record<
  ElementType,
  {
    colors: string[];
    speed: number;
    vyMin: number;
    vyMax: number;
    gravity: number;
    drag: number;
    stretchY: number;
    bounce: number;
    lifeMin: number;
    lifeMax: number;
    sizeMin: number;
    sizeMax: number;
    swirl: number;
  }
> = {
  // braises qui montent
  fire: { colors: ['#FF7043', '#FDBA74', '#FDE047'], speed: 2.6, vyMin: 1.6, vyMax: 4.2, gravity: -3.2, drag: 1.6, stretchY: 1.25, bounce: 0, lifeMin: 0.45, lifeMax: 0.85, sizeMin: 0.12, sizeMax: 0.26, swirl: 0 },
  // gouttes étirées qui rebondissent
  water: { colors: ['#38BDF8', '#7DD3FC', '#E0F2FE'], speed: 4.4, vyMin: 3.0, vyMax: 6.2, gravity: 17, drag: 0, stretchY: 1.8, bounce: 0.32, lifeMin: 0.4, lifeMax: 0.7, sizeMin: 0.1, sizeMax: 0.2, swirl: 0 },
  // feuilles plates qui planent
  grass: { colors: ['#4ADE80', '#86EFAC', '#FDE68A'], speed: 3.6, vyMin: 2.0, vyMax: 3.8, gravity: 3.4, drag: 2.4, stretchY: 0.35, bounce: 0, lifeMin: 0.7, lifeMax: 1.1, sizeMin: 0.16, sizeMax: 0.28, swirl: 1.4 },
  // étincelles nerveuses, très brèves
  electric: { colors: ['#FACC15', '#FEF9C3', '#FFFFFF'], speed: 9.5, vyMin: -1.0, vyMax: 5.0, gravity: 0, drag: 7.5, stretchY: 2.6, bounce: 0, lifeMin: 0.14, lifeMax: 0.32, sizeMin: 0.07, sizeMax: 0.15, swirl: 0 },
  // éclats lourds
  rock: { colors: ['#D6A874', '#A98359', '#78716C'], speed: 3.8, vyMin: 3.2, vyMax: 6.0, gravity: 21, drag: 0, stretchY: 1, bounce: 0.45, lifeMin: 0.6, lifeMax: 0.95, sizeMin: 0.2, sizeMax: 0.36, swirl: 0 },
  // spirale ascendante
  psychic: { colors: ['#C084FC', '#E9D5FF', '#67E8F9'], speed: 2.4, vyMin: 0.8, vyMax: 2.6, gravity: -1.6, drag: 1.1, stretchY: 1, bounce: 0, lifeMin: 0.6, lifeMax: 1.0, sizeMin: 0.1, sizeMax: 0.2, swirl: 4.2 },
};

interface ActiveProjectile {
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

interface GroundTelegraph {
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

interface ActorStatusInstance {
  remaining: number;
  tickTimer: number;
  sourceAtk: number;
}

interface CombatActor {
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
  moveStones: (MoveStoneKind | null)[];
  basicCooldown: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  buffTimer: number;
  flashTimer: number;
  invulnTimer: number;
  stunTimer: number;
  scatterTimer: number;
  scatterDirX: number;
  scatterDirZ: number;
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

interface CampWanderer {
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

interface EvolutionSequence {
  t: number;
  revealed: boolean;
  rig: VoxelCreatureRig;
  baseScale: number;
  toSpeciesId: string;
  spawnAcc: number;
  onReveal?: () => void;
  onDone: () => void;
}

// Scène d'évolution : devant la marmite, face caméra
const EVO_X = 0;
const EVO_Z = 3.2; // assez près du centre pour que la caméra reste devant les arbres du pourtour
const EVO_CHARGE_SEC = 2.0;
const EVO_TOTAL_SEC = 3.8;
const BOSS_INTRO_SEC = 1.9;
const CONFETTI_COLORS = ['#F4B942', '#E85D3F', '#2FB97A', '#38BDF8', '#C084FC', '#FAF7F0'];

// Cycle jour/nuit doux du camp (un tour complet = CAMP_DAY_LENGTH secondes)
const CAMP_DAY_LENGTH = 150;
function skyKey(t: number, sky: string, fog: string, key: string, keyI: number, hemiI: number, envI: number) {
  return { t, sky: new THREE.Color(sky), fog: new THREE.Color(fog), key: new THREE.Color(key), keyI, hemiI, envI };
}
const CAMP_SKY_KEYS = [
  skyKey(0.0, '#F6C9A0', '#F8DDC6', '#FFD2A6', 1.0, 0.46, 0.34), // aube
  skyKey(0.1, '#A7D8F7', '#C5E6FA', '#FFF2D6', 1.28, 0.52, 0.42), // jour
  skyKey(0.52, '#A7D8F7', '#C5E6FA', '#FFF2D6', 1.28, 0.52, 0.42),
  skyKey(0.64, '#F0A774', '#F3C3A0', '#FFB27A', 0.95, 0.42, 0.3), // crépuscule
  skyKey(0.74, '#27345E', '#34437A', '#A9BCFF', 0.42, 0.28, 0.13), // nuit claire (lune bleutée)
  skyKey(0.92, '#27345E', '#34437A', '#A9BCFF', 0.42, 0.28, 0.13),
  skyKey(1.0, '#F6C9A0', '#F8DDC6', '#FFD2A6', 1.0, 0.46, 0.34),
];

interface WeatherMote {
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

const PARTICLE_POOL_SIZE = 320; // plafond dur : ring buffer, jamais d'allocation en combat
const WEATHER_COUNT = 96; // capacité max de l'InstancedMesh météo (le nombre actif dépend du biome)
const BOLT_POOL_SIZE = 6;

type WeatherKind = 'drift' | 'rain' | 'rise' | 'float' | 'snow';

/** Ambiance particulaire par biome. */
const WEATHER_PROFILES: Record<
  BiomeId,
  { kind: WeatherKind; count: number; colors: string[]; /** vent latéral ajouté aux particules qui dérivent */ wind?: number }
> = {
  meadow: { kind: 'drift', count: 54, colors: ['#FEF08A', '#BBF7D0', '#FDE68A'] }, // pollen
  shore: { kind: 'rain', count: 54, colors: ['#E0F2FE', '#7DD3FC', '#BAE6FD'] }, // embruns
  volcano: { kind: 'rise', count: 54, colors: ['#FB923C', '#FDE047', '#EF4444'] }, // braises
  sanctuary: { kind: 'float', count: 54, colors: ['#E9D5FF', '#67E8F9', '#C084FC'] }, // éclats astraux
  tundra: { kind: 'snow', count: 96, colors: ['#FFFFFF', '#E0F2FE', '#F8FAFC'] }, // neige
  stormpeak: { kind: 'rain', count: 96, colors: ['#CBD5E1', '#94A3B8', '#E2E8F0'] }, // pluie battante
  canyon: { kind: 'drift', count: 80, colors: ['#F2D6A2', '#E8B873', '#FBE8C4'], wind: 3.4 }, // sable porté par le vent
};

const BIOME_LIGHTING: Record<BiomeId, { sky: string; ground: string; key: string }> = {
  meadow: { sky: '#BCE2FF', ground: '#8D7356', key: '#FFF2D6' },
  shore: { sky: '#BCE2FF', ground: '#8D7356', key: '#FFF2D6' },
  volcano: { sky: '#FFA987', ground: '#3A2422', key: '#FFD6B0' },
  sanctuary: { sky: '#D8C4FF', ground: '#3E345C', key: '#EFE4FF' },
  tundra: { sky: '#CFE6FF', ground: '#6F86A8', key: '#EAF6FF' },
  stormpeak: { sky: '#C2CCDA', ground: '#3B4252', key: '#DDE6F2' },
  canyon: { sky: '#FFE2B8', ground: '#8A5A3A', key: '#FFD9A0' },
};
const ARENA_BOUND = 15.5;
const MAX_ATTACK_TOKENS = 3;

export class VoxelEngine {
  private container: HTMLElement | null;
  private headless: boolean;
  private renderer: THREE.WebGLRenderer | null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private elapsedTotal = 0;

  // Groups
  private worldGroup = new THREE.Group();
  private actorsGroup = new THREE.Group();
  private fxGroup = new THREE.Group();

  // Particle pool, floating text pool & biome weather
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private floatingText: FloatingTextPool;
  private weatherMesh: THREE.InstancedMesh;
  private weatherMotes: WeatherMote[] = [];
  private activeBiomeId: BiomeId = 'meadow';
  private waterUniform: { value: number } | null = null;
  private cloudGroup: THREE.Group | null = null;
  private envAnimate: ((elapsed: number) => void) | null = null;
  private weatherKind: WeatherKind = 'drift';
  private weatherCount = 54;

  // Éclairs (pool fixe) + flash d'orage
  private bolts: { mesh: THREE.Mesh; life: number }[] = [];
  private boltCursor = 0;
  private boltGeo: THREE.BoxGeometry | null = null;
  private boltMat: THREE.MeshBasicMaterial | null = null;
  private lightningFlash = 0;
  private stormTimer = 4;
  private baseHemiIntensity = 0.52;

  // Moments forts : cycle jour/nuit, évolution, entrée de boss, fête de victoire
  private campClock = 0.2;
  private evo: EvolutionSequence | null = null;
  private evoRing: THREE.Mesh | null = null;
  private evoRingT = 0;
  private bossIntroTimer = 0;
  private bossIntroActor: CombatActor | null = null;
  private bossDropY = 0;
  private bossDropVel = 0;
  private bossIntroInfo: { name: string; title: string; element: ElementType } | null = null;
  private resultSent = false;
  private confettiTimer = 0;

  // Mode & state
  private screenState: 'title' | 'playing' | 'paused' | 'gameover' = 'title';
  private playMode: PlayMode = 'camp';
  private controlMode: ControlMode = 'semi';

  // Camera rig
  private camPos = new THREE.Vector3(0, 14, 18);
  private camLook = new THREE.Vector3(0, 1, 0);
  private trauma = 0;
  private hitstopTimer = 0;
  private shakeEnabled = true;

  // Camp props & wanderers
  private potLiquidMesh: THREE.Mesh | null = null;
  private potFireMesh: THREE.Mesh | null = null;
  private potCookingColor: string | null = null;
  private potSteamTimer = 0;
  private campWanderers: CampWanderer[] = [];

  // Expedition runtime
  private activeStage: StageDef | null = null;
  private waveIndex = 0;
  private expeditionElapsed = 0;
  private damageDealt = 0;
  private scatterCooldown = 0;
  private readonly scatterMaxCooldown = 5.0;
  private ultimateCharge = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private maxCombo = 0;
  private reactionsTriggered = 0;
  private ultimatesUsed = 0;
  private perfectDodges = 0;
  private lastReactionLabel: string | null = null;
  private lastReactionColor: string | null = null;
  private lastReactionTimer = 0;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private expeditionEnded = false;
  private endDelayTimer = 0;
  private pendingVictory = false;
  private waveSpawnDelay = 0;

  private allies: CombatActor[] = [];
  private enemies: CombatActor[] = [];
  private projectiles: ActiveProjectile[] = [];
  private telegraphs: GroundTelegraph[] = [];

  // Input state (cleared on blur)
  private heldKeys = new Set<string>();
  private hudEmitAccum = 0;
  private callbacks: EngineCallbacks;
  private resizeObserver: ResizeObserver | null = null;
  private telemetry: CombatTelemetry = VoxelEngine.emptyTelemetry();

  private static emptyTelemetry(): CombatTelemetry {
    return {
      bossAppearedAt: -1,
      phaseStartedAt: [-1, -1, -1],
      bossDefeatedAt: -1,
      castsByPhase: [0, 0, 0],
      patternsByPhase: [[], [], []],
      bossMaxPhases: 0,
      elapsed: 0,
    };
  }

  constructor(container: HTMLElement | null, callbacks: EngineCallbacks, options: EngineOptions = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.headless = Boolean(options.headless) || !container;

    let width = 1280;
    let height = 720;
    if (this.headless || !container) {
      this.isSoftwareGl = true;
      this.renderer = null;
    } else {
      this.isSoftwareGl = VoxelEngine.detectSoftwareGl();

      const renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.94;
      renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      // PCFSoftShadowMap a été retiré de three (il retombait déjà sur PCFShadowMap avec un avertissement console)
      renderer.shadowMap.type = THREE.PCFShadowMap;

      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      this.renderer = renderer;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#A7D8F7');
    this.scene.fog = new THREE.Fog('#C5E6FA', 34, 88);

    if (this.renderer) {
      // Mandatory Studio PMREM Environment Map on every device (calibrated intensity so matte voxels keep rich saturation)
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }
    this.scene.environmentIntensity = 0.42;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 160);
    this.camera.position.set(11, 10.5, 20);
    this.camera.lookAt(0, 2.2, -1);

    // Warm/Cool 3-point outdoor studio lighting
    this.hemiLight = new THREE.HemisphereLight('#B4DFFF', '#7D6044', 0.52);
    this.hemiLight.position.set(0, 40, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#FFEED1', 1.28);
    this.keyLight.position.set(16, 26, 14);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 75;
    const d = 22;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight('#93C5FD', 0.32);
    rimLight.position.set(-14, 12, -16);
    this.scene.add(rimLight);

    this.scene.add(this.worldGroup, this.actorsGroup, this.fxGroup);

    // Pooled voxel particle ring buffer (InstancedMesh)
    const pGeo = new THREE.BoxGeometry(1, 1, 1);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_POOL_SIZE);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.001,
        colorHex: '#ffffff',
        gravity: 9.8,
        drag: 0,
        stretchY: 1,
        bounce: 0,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.set('#ffffff'));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.fxGroup.add(this.particleMesh);

    // Zero-GC 3D Floating Combat Text Pool
    this.floatingText = new FloatingTextPool(this.fxGroup, 28);

    // Pooled Biome Weather InstancedMesh (petals / rain / embers / astral shards)
    const wGeo = new THREE.BoxGeometry(1, 1, 1);
    const wMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
    });
    this.weatherMesh = new THREE.InstancedMesh(wGeo, wMat, WEATHER_COUNT);
    this.weatherMesh.frustumCulled = false;
    this.weatherMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fxGroup.add(this.weatherMesh);
    this.configureWeather('meadow');

    // Pool d'éclairs voxel (géométrie + matériau partagés)
    this.boltGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
    this.boltGeo.translate(0, 0.5, 0);
    this.boltMat = new THREE.MeshBasicMaterial({ color: '#FEF9C3', transparent: true, opacity: 0.95, fog: false });
    for (let i = 0; i < BOLT_POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
      mesh.visible = false;
      this.fxGroup.add(mesh);
      this.bolts.push({ mesh, life: 0 });
    }

    if (!this.headless && container) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(container);

      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
      document.addEventListener('visibilitychange', this.handleVisibility);

      this.lastTimeMs = performance.now();
      this.scheduleNextFrame();
    }
  }

  private configureWeather(biomeId: BiomeId): void {
    this.activeBiomeId = biomeId;
    const profile = WEATHER_PROFILES[biomeId];
    const kind = profile.kind;
    this.weatherKind = kind;
    this.weatherCount = profile.count;
    this.weatherMesh.count = profile.count;
    this.weatherMotes = [];
    const stormy = biomeId === 'stormpeak';

    for (let i = 0; i < profile.count; i++) {
      const small = 0.14 + Math.random() * 0.08;
      const mote: WeatherMote = {
        x: (Math.random() - 0.5) * 34,
        y: 0.8 + Math.random() * 12,
        z: (Math.random() - 0.5) * 34,
        vx:
          kind === 'rain'
            ? stormy
              ? -5.2
              : -2.2
            : kind === 'snow'
              ? 0.9 + Math.random() * 0.7
              : kind === 'rise'
                ? (Math.random() - 0.5) * 1.1
                : (Math.random() - 0.5) * 0.9 + (profile.wind ?? 0),
        vy:
          kind === 'rain'
            ? (stormy ? -16 : -11.5) - Math.random() * 3
            : kind === 'rise'
              ? 1.6 + Math.random() * 1.8
              : kind === 'float'
                ? 0.45 + Math.random() * 0.55
                : kind === 'snow'
                  ? -1.3 - Math.random() * 1.1
                  : -0.55 - Math.random() * 0.4,
        vz: kind === 'rain' ? 1.4 : (Math.random() - 0.5) * 0.8,
        sizeX: kind === 'rain' ? 0.06 : kind === 'snow' ? small * 0.8 : small,
        sizeY: kind === 'rain' ? (stormy ? 0.9 : 0.65) : kind === 'snow' ? small * 0.8 : small,
        sizeZ: kind === 'rain' ? 0.06 : kind === 'snow' ? small * 0.8 : small,
        phase: Math.random() * Math.PI * 2,
      };
      this.weatherMotes.push(mote);
      this.weatherMesh.setColorAt(i, _color.set(profile.colors[i % profile.colors.length]));
    }
    if (this.weatherMesh.instanceColor) {
      this.weatherMesh.instanceColor.needsUpdate = true;
    }
  }

  private applyBiomeLighting(biomeId: BiomeId): void {
    const light = BIOME_LIGHTING[biomeId];
    this.hemiLight.color.set(light.sky);
    this.hemiLight.groundColor.set(light.ground);
    this.keyLight.color.set(light.key);
    this.keyLight.intensity = 1.28;
    this.baseHemiIntensity = 0.52;
    this.scene.environmentIntensity = 0.42;
    this.lightningFlash = 0;
    this.stormTimer = 3 + Math.random() * 3;
  }

  /** Éclair voxel bref (pool fixe) + flash lumineux. */
  private spawnBolt(x: number, z: number, height = 11): void {
    const bolt = this.bolts[this.boltCursor];
    this.boltCursor = (this.boltCursor + 1) % this.bolts.length;
    bolt.mesh.position.set(x, 0, z);
    bolt.mesh.scale.set(1, height, 1);
    bolt.mesh.rotation.z = (Math.random() - 0.5) * 0.22;
    bolt.mesh.visible = true;
    bolt.life = 0.16;
    this.lightningFlash = Math.max(this.lightningFlash, this.shakeEnabled ? 0.55 : 0.2);
  }

  private updateStormAmbience(dt: number): void {
    for (const bolt of this.bolts) {
      if (bolt.life > 0) {
        bolt.life -= dt;
        bolt.mesh.visible = bolt.life > 0;
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.6);
    }
    this.hemiLight.intensity = this.baseHemiIntensity + this.lightningFlash * 1.5;

    // Orage d'ambiance : la foudre tombe au loin toutes les quelques secondes
    if (this.activeBiomeId !== 'stormpeak' || this.playMode !== 'expedition') return;
    this.stormTimer -= dt;
    if (this.stormTimer <= 0) {
      this.stormTimer = 5 + Math.random() * 6;
      const ang = Math.random() * Math.PI * 2;
      this.spawnBolt(Math.cos(ang) * 21, Math.sin(ang) * 21, 17);
      soundFx.playThunder();
    }
  }
  private static detectSoftwareGl(): boolean {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private handleResize(): void {
    if (this.disposed || !this.container || !this.renderer) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.heldKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.heldKeys.clear();
    }
  };

  public setScreenState(state: 'title' | 'playing' | 'paused' | 'gameover'): void {
    this.screenState = state;
    if (state !== 'playing') {
      this.heldKeys.clear();
    }
  }

  /** Option de confort : coupe le tremblement de caméra (le hit-stop reste actif). */
  public setShakeEnabled(enabled: boolean): void {
    this.shakeEnabled = enabled;
    if (!enabled) this.trauma = 0;
  }

  public setControlMode(mode: ControlMode): void {
    this.controlMode = mode;
    this.emitHudSnapshot();
  }

  public setPotVisual(recipeId: string | null, status: 'idle' | 'cooking' | 'ready'): void {
    if (!this.potLiquidMesh) return;
    const mat = this.potLiquidMesh.material as THREE.MeshStandardMaterial;
    if (status === 'idle') {
      this.potCookingColor = null;
      mat.color.set('#38BDF8');
      mat.emissive.set('#0284C7');
      mat.emissiveIntensity = 0.2;
    } else {
      const hex = (recipeId && RECIPE_BY_ID[recipeId]?.soupHex) || '#F59E0B';
      this.potCookingColor = hex;
      mat.color.set(hex);
      mat.emissive.set(hex);
      mat.emissiveIntensity = status === 'ready' ? 0.75 : 0.42;
    }
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      this.disposeObject(child);
    }
  }

  /** Libère géométries et matériaux d'un sous-arbre retiré de la scène (les textures partagées sont conservées). */
  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if ((node as THREE.InstancedMesh).isInstancedMesh) (node as THREE.InstancedMesh).dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      for (const m of Array.isArray(mat) ? mat : [mat]) {
        const map = (m as THREE.MeshStandardMaterial).map;
        if (map && map.userData.ownedByScene) map.dispose();
        m.dispose();
      }
    });
  }
  public loadCampScene(
    squadCreatures: OwnedCreature[],
    potRecipeId: string | null,
    potStatus: 'idle' | 'cooking' | 'ready',
  ): void {
    this.playMode = 'camp';
    this.activeStage = null;
    this.allies = [];
    this.enemies = [];
    this.clearProjectilesAndTelegraphs();

    this.clearGroup(this.worldGroup);
    this.clearGroup(this.actorsGroup);
    this.campWanderers = [];
    this.evo = null; // le rig d'évolution vient d'être libéré avec actorsGroup
    this.clearEvoRing();
    this.bossIntroTimer = 0;
    this.bossIntroActor = null;
    this.bossIntroInfo = null;
    this.resultSent = false;
    this.pendingVictory = false;

    const biome = BIOMES.meadow;
    this.scene.background = new THREE.Color(biome.skyHex);
    this.scene.fog = new THREE.Fog(biome.fogHex, 30, 82);
    this.floatingText.clear();
    const env = buildBiomeEnvironment(biome, true);
    this.worldGroup.add(env.group);
    this.waterUniform = env.waterUniform;
    this.cloudGroup = env.cloudGroup;
    this.envAnimate = env.animate ?? null;
    this.configureWeather('meadow');
    this.applyBiomeLighting('meadow');

    // Tall waystone + explorer tent landmark framed in initial vista
    const landmark = buildCampLandmark();
    landmark.position.set(4.5, 0, -5.5);
    this.worldGroup.add(landmark);

    // Central Cooking Pot
    const pot = buildCookingPotProp();
    pot.group.position.set(0, 0, -1.2);
    this.worldGroup.add(pot.group);
    this.potLiquidMesh = pot.liquidMesh;
    this.potFireMesh = pot.fireMesh;
    this.setPotVisual(potRecipeId, potStatus);

    // Spawn active squad roaming happily around the camp
    squadCreatures.slice(0, 3).forEach((c, idx) => {
      const rig = buildVoxelCreature(c.speciesId);
      const angle = (idx / 3) * Math.PI * 2 + 0.6;
      const rx = Math.cos(angle) * 4.2;
      const rz = Math.sin(angle) * 3.8 + 1.8;
      rig.root.position.set(rx, 0, rz);
      this.actorsGroup.add(rig.root);
      this.campWanderers.push({
        uid: c.uid,
        rig,
        x: rx,
        z: rz,
        targetX: rx,
        targetZ: rz,
        waitTimer: 0.8 + idx * 0.6,
        walkPhase: idx * 1.4,
        facing: 0,
        emoteTimer: 3 + idx * 2.5,
        emoteT: 0,
      });
    });

    if (!this.isSoftwareGl) {
      this.renderer?.compile(this.scene, this.camera);
    }
    this.camPos.set(10.8, 9.6, 18.6);
    this.camLook.set(0.4, 2.4, -1.2);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.renderer?.render(this.scene, this.camera);
  }

  public startExpedition(
    stage: StageDef,
    squadCreatures: OwnedCreature[],
    allStones: PowerStone[],
    controlMode: ControlMode,
  ): void {
    this.playMode = 'expedition';
    this.controlMode = controlMode;
    this.activeStage = stage;
    this.waveIndex = 0;
    this.expeditionElapsed = 0;
    this.damageDealt = 0;
    this.scatterCooldown = 0;
    this.ultimateCharge = 25; // Start with 25% momentum so player reaches Ultimate cleanly
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.reactionsTriggered = 0;
    this.ultimatesUsed = 0;
    this.perfectDodges = 0;
    this.lastReactionLabel = null;
    this.lastReactionColor = null;
    this.lastReactionTimer = 0;
    this.expeditionEnded = false;
    this.pendingVictory = false;
    this.resultSent = false;
    this.telemetry = VoxelEngine.emptyTelemetry();
    this.confettiTimer = 0;
    this.bossIntroTimer = 0;
    this.bossIntroActor = null;
    this.bossIntroInfo = null;
    this.evo = null;
    this.clearEvoRing();
    this.endDelayTimer = 0;
    this.waveSpawnDelay = 0;
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.heldKeys.clear();
    this.floatingText.clear();
    this.clearProjectilesAndTelegraphs();
    this.clearGroup(this.worldGroup);
    this.clearGroup(this.actorsGroup);
    this.campWanderers = [];
    this.potLiquidMesh = null;
    this.potFireMesh = null;

    const biome = BIOMES[stage.biomeId];
    this.scene.background = new THREE.Color(biome.skyHex);
    this.scene.fog = new THREE.Fog(biome.fogHex, 30, 84);
    this.applyBiomeLighting(biome.id);
    const env = buildBiomeEnvironment(biome, false);
    this.worldGroup.add(env.group);
    this.waterUniform = env.waterUniform;
    this.cloudGroup = env.cloudGroup;
    this.envAnimate = env.animate ?? null;
    this.configureWeather(stage.biomeId);

    // Spawn 3 allied Cubimons in an open clearing facing forward (+X/-Z toward wave)
    this.allies = squadCreatures.slice(0, 3).map((c, idx) => {
      const species = SPECIES[c.speciesId] ?? SPECIES.pyrocube;
      const stats = computeCreatureStats(c, allStones);
      const move = MOVES[c.moveId] ?? MOVES.ember_burst;
      const mods = getMoveModifiers(c.moveStones);
      const rig = buildVoxelCreature(c.speciesId);
      attachWorldHpBar(rig, false, false);

      const startX = -7.5 + (idx === 0 ? 1.2 : 0);
      const startZ = (idx - 1) * 2.8;
      rig.root.position.set(startX, 0, startZ);
      this.actorsGroup.add(rig.root);

      const maxCd = Math.max(2.0, move.cooldown * mods.cooldownMult);
      return {
        id: c.uid,
        isAlly: true,
        isBoss: false,
        ai: 'ally',
        speciesId: species.id,
        name: species.name,
        level: c.level,
        rig,
        x: startX,
        z: startZ,
        vx: 0,
        vz: 0,
        facing: Math.PI / 2,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        shieldHp: 0,
        atk: stats.atk,
        critRate: stats.critRate,
        hitHeal: stats.hitHeal,
        statusRes: stats.statusRes,
        moveSpeed: species.moveSpeed * stats.moveSpeedMult,
        attackRange: species.attackRange,
        moveId: move.id,
        moveStones: c.moveStones,
        basicCooldown: 0.3 + idx * 0.15,
        skillCooldown: 0.6 + idx * 0.25,
        skillMaxCooldown: maxCd,
        buffTimer: 0,
        flashTimer: 0,
        invulnTimer: 0,
        stunTimer: 0,
        scatterTimer: 0,
        scatterDirX: 0,
        scatterDirZ: 0,
        walkPhase: 0,
        squashY: 1,
        fainted: false,
        reviveTimer: 0,
        koDissolveTimer: 0,
        removed: false,
        telegraphing: false,
        aiCooldown: 0,
        hasAttackToken: false,
        statuses: {},
        bossPhase: 1,
        bossMaxPhases: 2,
        bossPatternIndex: 0,
        pullTimer: 0,
      };
    });

    this.enemies = [];
    this.spawnWave(0);
    this.camPos.set(-4, 15.5, 16.5);
    this.camLook.set(0, 0.8, 0);
    this.emitHudSnapshot();

    if (!this.isSoftwareGl) {
      this.renderer?.compile(this.scene, this.camera);
    }
  }

  private spawnWave(index: number): void {
    if (!this.activeStage) return;
    const wave = this.activeStage.waves[index];
    if (!wave) return;

    this.waveIndex = index;
    const isBossWave = index === this.activeStage.waves.length - 1;
    this.bannerText = isBossWave
      ? 'ALERTE BOSS ! Préparez Dispersion !'
      : `Vague ${index + 1} / ${this.activeStage.waves.length}`;
    this.bannerTimer = 2.4;

    const stageHpMult = this.activeStage.enemyHpMult ?? 1;
    const stageAtkMult = this.activeStage.enemyAtkMult ?? 1;
    const stageBossHpMult = this.activeStage.bossHpMult ?? 1;
    wave.enemies.forEach((def, i) => {
      const species = SPECIES[def.speciesId] ?? SPECIES.bourgeon;
      const isBoss = Boolean(def.isBoss);
      const scaleMult = isBoss ? 1.48 : 0.96;
      const rig = buildVoxelCreature(species.id, species.scale * scaleMult);
      attachWorldHpBar(rig, true, isBoss);

      const spreadZ = (i - (wave.enemies.length - 1) / 2) * 3.8;
      const spawnX = 8.0 + (isBoss ? 2.2 : (i % 2) * 1.8);
      const spawnZ = spreadZ;
      rig.root.position.set(spawnX, 0, spawnZ);
      this.actorsGroup.add(rig.root);

      // Balanced enemy stats so Level 1 is genuinely winnable and later stages scale meaningfully
      const levelScale = 1 + (def.level - 1) * 0.14;
      const maxHp = Math.round(species.baseHp * levelScale * (isBoss ? 3.4 * stageBossHpMult : 1.15) * stageHpMult);
      const atk = Math.round(
        species.baseAtk * (0.42 + (def.level - 1) * 0.055) * (isBoss ? 1.45 : 0.9) * stageAtkMult,
      );

      const isFinalBiomeBoss = isBoss && this.activeStage?.stageNumber === 3;
      this.enemies.push({
        id: `enemy_${index}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        isAlly: false,
        isBoss,
        ai: def.ai,
        speciesId: species.id,
        name: isBoss ? `Boss ${species.name}` : species.name,
        level: def.level,
        rig,
        x: spawnX,
        z: spawnZ,
        vx: 0,
        vz: 0,
        facing: -Math.PI / 2,
        hp: maxHp,
        maxHp,
        shieldHp: 0,
        atk,
        critRate: 5,
        hitHeal: 0,
        statusRes: isBoss ? 25 : 0,
        moveSpeed: species.moveSpeed * (isBoss ? 0.72 : 0.78),
        attackRange: isBoss ? 4.4 : def.ai === 'kiter' ? 6.8 : 2.7,
        moveId: species.moveId,
        moveStones: [],
        basicCooldown: 1.0 + i * 0.35,
        skillCooldown: isBoss ? 3.2 : 4.2,
        skillMaxCooldown: isBoss ? 5.0 : 5.5,
        buffTimer: 0,
        flashTimer: 0,
        invulnTimer: 0,
        stunTimer: 0,
        scatterTimer: 0,
        scatterDirX: 0,
        scatterDirZ: 0,
        walkPhase: 0,
        squashY: 1,
        fainted: false,
        reviveTimer: 0,
        koDissolveTimer: 0,
        removed: false,
        telegraphing: false,
        aiCooldown: 1.4 + i * 0.5,
        hasAttackToken: false,
        statuses: {},
        bossPhase: 1,
        bossMaxPhases: isFinalBiomeBoss ? 3 : 2,
        bossPatternIndex: 0,
        pullTimer: 0,
      });

      this.spawnParticleBurst(spawnX, 0.8, spawnZ, species.palette.accent, isBoss ? 20 : 10, 4.5);
    });

    // Entrée de boss : il tombe du ciel pendant une courte cinématique (combat gelé)
    const boss = isBossWave ? this.enemies.find((e) => e.isBoss && !e.removed && !e.fainted) : undefined;
    if (boss) {
      this.telemetry.bossAppearedAt = this.expeditionElapsed;
      this.telemetry.phaseStartedAt[0] = this.expeditionElapsed;
      this.telemetry.bossMaxPhases = boss.bossMaxPhases;
      this.bossIntroActor = boss;
      this.bossIntroTimer = BOSS_INTRO_SEC;
      this.bossDropY = 11;
      this.bossDropVel = 0;
      this.bossIntroInfo = {
        name: boss.rig.species.name,
        title:
          this.activeStage.stageNumber === 3
            ? `Souverain — ${BIOMES[this.activeStage.biomeId].name}`
            : `Gardien — ${this.activeStage.name}`,
        element: boss.rig.species.element,
      };
      this.bannerText = null;
      this.bannerTimer = 0;
      boss.rig.root.position.y = this.bossDropY;
      soundFx.playBossIntro();
      this.emitHudSnapshot();
    }
  }

  private updateBossIntro(dt: number): void {
    const boss = this.bossIntroActor;
    this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
    if (boss && this.bossDropY > 0) {
      this.bossDropVel += 46 * dt;
      this.bossDropY = Math.max(0, this.bossDropY - this.bossDropVel * dt);
      if (this.bossDropY === 0) {
        // Atterrissage : onde de choc, poussière, écrasement
        boss.squashY = 0.58;
        this.trauma = Math.min(1, this.trauma + 0.6);
        this.spawnShockwaveRing(boss.x, boss.z, 5.5, boss.rig.species.palette.accent);
        this.spawnElementBurst(boss.x, 0.3, boss.z, 'rock', 22, 1.5);
        this.spawnElementBurst(boss.x, 0.8, boss.z, boss.rig.species.element, 18, 1.4);
        soundFx.playHit(true, false);
        soundFx.playElementImpact('rock', true);
      }
    }
    if (this.bossIntroTimer === 0) {
      this.bossIntroActor = null;
      this.bossIntroInfo = null;
      this.bossDropY = 0;
      this.bannerText = 'ALERTE BOSS ! Préparez Dispersion !';
      this.bannerTimer = 2.2;
      this.emitHudSnapshot();
    }
  }

  private updateEnemyDissolve(enemy: CombatActor, dt: number): void {
    enemy.koDissolveTimer -= dt;
    enemy.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(enemy.rig.bodyPivot.rotation.z, -Math.PI / 2, 10, dt);
    const s = Math.max(0.01, enemy.koDissolveTimer / 0.42) * enemy.rig.species.scale * (enemy.isBoss ? 1.48 : 0.96);
    enemy.rig.root.scale.setScalar(s);
    if (enemy.koDissolveTimer <= 0) {
      enemy.removed = true;
      this.actorsGroup.remove(enemy.rig.root);
      this.disposeObject(enemy.rig.root);
    }
  }

  /** Après la fin du combat : les K.O. se dissolvent, et en cas de victoire l'escouade fait la fête. */
  private updateEndSequence(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.removed && enemy.fainted) this.updateEnemyDissolve(enemy, dt);
    }
    if (!this.pendingVictory) return;

    let cx = 0;
    let cz = 0;
    let n = 0;
    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      if (ally.fainted) continue;
      const hopT = this.elapsedTotal * 8.5 + i * 1.3;
      ally.rig.root.position.set(ally.x, 0, ally.z);
      ally.rig.root.rotation.y = Math.sin(this.elapsedTotal * 3 + i * 2.1) * 0.7;
      this.animateRigPose(ally.rig, hopT, true, 1 + Math.sin(hopT * 2) * 0.07, this.elapsedTotal);
      ally.rig.bodyPivot.position.y += Math.abs(Math.sin(hopT)) * 0.4;
      ally.rig.bodyPivot.rotation.z = 0;
      if (ally.rig.hpBarBg) ally.rig.hpBarBg.visible = false;
      cx += ally.x;
      cz += ally.z;
      n += 1;
    }
    if (n === 0) return;

    this.confettiTimer -= dt;
    if (this.confettiTimer <= 0) {
      // rafales denses avant l'écran de résultat, puis pluie légère derrière la fenêtre
      this.confettiTimer = this.resultSent ? 0.5 : 0.14;
      this.spawnConfetti(cx / n + (Math.random() - 0.5) * 7, 1.2 + Math.random() * 1.5, cz / n + (Math.random() - 0.5) * 5, 9);
      if (!this.resultSent) soundFx.playConfettiPop();
    }
  }

  private spawnConfetti(x: number, y: number, z: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 2.6;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = 4 + Math.random() * 3.4;
      slot.vz = Math.sin(ang) * spd;
      slot.maxLife = 1.0 + Math.random() * 0.6;
      slot.life = slot.maxLife;
      slot.size = 0.14 + Math.random() * 0.1;
      slot.colorHex = CONFETTI_COLORS[(i + Math.floor(Math.random() * 6)) % CONFETTI_COLORS.length];
      slot.gravity = 6.5;
      slot.drag = 1.3;
      slot.stretchY = 0.35;
      slot.bounce = 0;
    }
  }

  /** Règle l'heure du camp (0 = aube, 0.3 = plein jour, 0.64 = crépuscule, 0.8 = nuit). */
  public setCampClock(t: number): void {
    if (Number.isFinite(t)) this.campClock = ((t % 1) + 1) % 1;
  }

  /** Cycle jour/nuit doux du camp : ciel, brume et lumières interpolés entre des clés. */
  private updateDayNight(dt: number): void {
    this.campClock = (this.campClock + dt / CAMP_DAY_LENGTH) % 1;
    let idx = 0;
    while (idx < CAMP_SKY_KEYS.length - 2 && this.campClock >= CAMP_SKY_KEYS[idx + 1].t) idx += 1;
    const a = CAMP_SKY_KEYS[idx];
    const b = CAMP_SKY_KEYS[idx + 1];
    const raw = THREE.MathUtils.clamp((this.campClock - a.t) / Math.max(0.0001, b.t - a.t), 0, 1);
    const f = raw * raw * (3 - 2 * raw);
    if (this.scene.background instanceof THREE.Color) this.scene.background.lerpColors(a.sky, b.sky, f);
    if (this.scene.fog) this.scene.fog.color.lerpColors(a.fog, b.fog, f);
    this.keyLight.color.lerpColors(a.key, b.key, f);
    this.keyLight.intensity = THREE.MathUtils.lerp(a.keyI, b.keyI, f);
    this.baseHemiIntensity = THREE.MathUtils.lerp(a.hemiI, b.hemiI, f);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(a.envI, b.envI, f);
  }

  /**
   * Animation d'évolution au camp : la créature s'élève en tournoyant dans un halo blanc,
   * puis la nouvelle forme apparaît dans une gerbe d'étincelles. `onDone` recharge le camp.
   */
  public playEvolutionSequence(
    fromSpeciesId: string,
    toSpeciesId: string,
    callbacks: { onReveal?: () => void; onDone: () => void },
  ): void {
    if (this.playMode !== 'camp' || this.disposed) {
      callbacks.onReveal?.();
      callbacks.onDone();
      return;
    }
    if (this.evo) {
      this.actorsGroup.remove(this.evo.rig.root);
      this.disposeObject(this.evo.rig.root);
    }
    const rig = buildVoxelCreature(fromSpeciesId);
    rig.root.position.set(EVO_X, 0, EVO_Z);
    this.actorsGroup.add(rig.root);
    this.evo = {
      t: 0,
      revealed: false,
      rig,
      baseScale: rig.root.scale.x,
      toSpeciesId,
      spawnAcc: 0,
      onReveal: callbacks.onReveal,
      onDone: callbacks.onDone,
    };
    soundFx.playEvolutionCharge();
  }

  private clearEvoRing(): void {
    if (!this.evoRing) return;
    this.fxGroup.remove(this.evoRing);
    this.evoRing.geometry.dispose();
    (this.evoRing.material as THREE.Material).dispose();
    this.evoRing = null;
  }

  private updateEvolution(dt: number): void {
    if (this.evoRing) {
      this.evoRingT += dt;
      const k = Math.min(1, this.evoRingT / 0.6);
      this.evoRing.scale.setScalar(0.6 + k * 6.5);
      (this.evoRing.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
      if (k >= 1) this.clearEvoRing();
    }

    const evo = this.evo;
    if (!evo) return;
    evo.t += dt;

    if (!evo.revealed) {
      // Phase 1 — charge : lévitation, toupie de plus en plus rapide, halo blanc croissant
      const p = Math.min(1, evo.t / EVO_CHARGE_SEC);
      this.animateRigPose(evo.rig, 0, false, 1, this.elapsedTotal);
      evo.rig.root.position.y = p * p * 0.9;
      evo.rig.root.rotation.y += dt * (2 + p * p * 26);
      evo.rig.root.scale.setScalar(evo.baseScale * (1 + Math.sin(evo.t * (8 + p * 20)) * 0.06 * p));
      for (const m of evo.rig.flashMaterials) {
        m.emissive.set('#FFFFFF');
        m.emissiveIntensity = p * p * 1.5;
      }
      // étincelles aspirées en spirale vers la créature
      evo.spawnAcc += dt;
      while (evo.spawnAcc > 0.045) {
        evo.spawnAcc -= 0.045;
        const slot = this.particles[this.particleCursor];
        this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
        const ang = Math.random() * Math.PI * 2;
        const r = 2.2 + Math.random() * 1.2;
        const life = 0.45 + Math.random() * 0.2;
        slot.active = true;
        slot.x = EVO_X + Math.cos(ang) * r;
        slot.y = 0.3 + Math.random() * 2.2;
        slot.z = EVO_Z + Math.sin(ang) * r;
        slot.vx = (-Math.cos(ang) * r) / life - Math.sin(ang) * 1.6;
        slot.vy = (1.0 - slot.y) / life;
        slot.vz = (-Math.sin(ang) * r) / life + Math.cos(ang) * 1.6;
        slot.maxLife = life;
        slot.life = life;
        slot.size = 0.12 + Math.random() * 0.1;
        slot.colorHex = Math.random() < 0.5 ? '#FFFFFF' : evo.rig.species.palette.accent;
        slot.gravity = 0;
        slot.drag = 0;
        slot.stretchY = 1;
        slot.bounce = 0;
      }

      if (evo.t >= EVO_CHARGE_SEC) {
        // Bascule : l'ancienne forme est libérée, la nouvelle surgit
        this.actorsGroup.remove(evo.rig.root);
        this.disposeObject(evo.rig.root);
        const next = buildVoxelCreature(evo.toSpeciesId);
        next.root.position.set(EVO_X, 0.9, EVO_Z);
        this.actorsGroup.add(next.root);
        evo.rig = next;
        evo.baseScale = next.root.scale.x;
        evo.revealed = true;
        soundFx.playEvolutionBurst();
        this.spawnParticleBurst(EVO_X, 1.3, EVO_Z, '#FFFFFF', 26, 7.5);
        this.spawnParticleBurst(EVO_X, 1.3, EVO_Z, '#F4B942', 26, 6.0);
        this.spawnElementBurst(EVO_X, 1.0, EVO_Z, next.species.element, 22, 1.6);
        this.trauma = Math.min(1, this.trauma + 0.35);
        this.lightningFlash = Math.max(this.lightningFlash, this.shakeEnabled ? 0.6 : 0.25);
        this.clearEvoRing();
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.82, 1, 32),
          new THREE.MeshBasicMaterial({
            color: '#FFF7D6',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(EVO_X, 0.08, EVO_Z);
        this.fxGroup.add(ring);
        this.evoRing = ring;
        this.evoRingT = 0;
        evo.onReveal?.();
      }
      return;
    }

    // Phase 2 — révélation : apparition avec rebond, sauts de joie, fontaine dorée
    const q = Math.min(1, (evo.t - EVO_CHARGE_SEC) / (EVO_TOTAL_SEC - EVO_CHARGE_SEC));
    const pop = q < 0.2 ? 0.3 + (q / 0.2) * 0.95 : 1.25 - Math.min(1, (q - 0.2) / 0.15) * 0.25;
    evo.rig.root.scale.setScalar(evo.baseScale * pop);
    evo.rig.root.position.y = Math.max(0, 0.9 - q * 3.6);
    evo.rig.root.rotation.y = THREE.MathUtils.damp(evo.rig.root.rotation.y, 0.2, 6, dt);
    this.animateRigPose(evo.rig, this.elapsedTotal * 9, q > 0.3, 1, this.elapsedTotal);
    evo.spawnAcc += dt;
    if (evo.spawnAcc > 0.16) {
      evo.spawnAcc = 0;
      this.spawnParticleBurst(EVO_X + (Math.random() - 0.5) * 2, 0.4, EVO_Z + (Math.random() - 0.5) * 1.5, '#F4B942', 4, 3.2);
    }
    if (evo.t >= EVO_TOTAL_SEC) {
      const done = evo.onDone;
      this.evo = null; // le rig reste en scène : onDone recharge le camp, qui le libère
      done();
    }
  }

  public triggerAllySkill(slotIndex: number): boolean {
    if (
      this.playMode !== 'expedition' ||
      this.screenState !== 'playing' ||
      this.expeditionEnded ||
      this.bossIntroTimer > 0 // cinématique d'entrée : commandes gelées
    ) {
      return false;
    }
    const unit = this.allies[slotIndex];
    if (!unit || unit.fainted || unit.skillCooldown > 0) return false;
    this.executeAllySkill(unit);
    this.emitHudSnapshot();
    return true;
  }

  public triggerScatter(): boolean {
    if (
      this.playMode !== 'expedition' ||
      this.screenState !== 'playing' ||
      this.expeditionEnded ||
      this.bossIntroTimer > 0 ||
      this.scatterCooldown > 0
    ) {
      return false;
    }
    this.scatterCooldown = this.scatterMaxCooldown;
    soundFx.playScatter();

    // Perfect Dodge check: if any enemy hazard telegraph is active right now, reward the squad!
    const activeHazard = this.telegraphs.some((tg) => tg.isEnemyHazard);
    if (activeHazard) {
      this.perfectDodges += 1;
      this.ultimateCharge = computeUltimateCharge(this.ultimateCharge, 14);
      soundFx.playPerfectDodge();
      const firstAlive = this.allies.find((a) => !a.fainted);
      if (firstAlive) {
        this.floatingText.spawn(firstAlive.x, 2.4, firstAlive.z, 'ESQUIVE PARFAITE !', '#38BDF8', 1.25, 1.05);
      }
    }

    // Compute enemy centroid to dash AWAY from danger
    let cx = 0;
    let cz = 0;
    const livingEnemies = this.enemies.filter((e) => !e.fainted && !e.removed);
    if (livingEnemies.length > 0) {
      for (const e of livingEnemies) {
        cx += e.x;
        cz += e.z;
      }
      cx /= livingEnemies.length;
      cz /= livingEnemies.length;
    }

    this.allies.forEach((ally, idx) => {
      if (ally.fainted) return;
      let dx = ally.x - cx;
      let dz = ally.z - cz;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) {
        const ang = (idx / 3) * Math.PI * 2 + 0.5;
        dx = Math.cos(ang);
        dz = Math.sin(ang);
      } else {
        dx /= len;
        dz /= len;
        const spread = (idx - 1) * 0.48;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const rx = dx * cos - dz * sin;
        const rz = dx * sin + dz * cos;
        dx = rx;
        dz = rz;
      }
      ally.scatterDirX = dx;
      ally.scatterDirZ = dz;
      ally.scatterTimer = 0.42;
      ally.invulnTimer = activeHazard ? 0.8 : 0.55;
      ally.squashY = 1.24;
      this.spawnParticleBurst(ally.x, 0.5, ally.z, activeHazard ? '#38BDF8' : '#FAF7F0', 10, 4.2);
    });

    this.emitHudSnapshot();
    return true;
  }

  /**
   * V0.2 Squad Ultimate: Cubi-Déchaînement (KeyR or HUD button at 100% charge)
   */
  public triggerUltimate(): boolean {
    if (
      this.playMode !== 'expedition' ||
      this.screenState !== 'playing' ||
      this.expeditionEnded ||
      this.bossIntroTimer > 0 ||
      this.ultimateCharge < 100
    ) {
      return false;
    }

    const livingAllies = this.allies.filter((a) => !a.fainted);
    if (livingAllies.length === 0) return false;

    this.ultimateCharge = 0;
    this.ultimatesUsed += 1;
    soundFx.playUltimate();
    this.hitstopTimer = 0.085;
    this.trauma = Math.min(1, this.trauma + 0.7);
    this.bannerText = 'CUBI-DÉCHAÎNEMENT !';
    this.bannerTimer = 1.8;

    let combinedAtk = 0;
    for (const ally of livingAllies) {
      combinedAtk += ally.atk;
      ally.invulnTimer = Math.max(ally.invulnTimer, 0.9);
      ally.squashY = 1.38;
      const heal = Math.round(ally.maxHp * 0.22);
      ally.hp = Math.min(ally.maxHp, ally.hp + heal);
      this.spawnParticleBurst(ally.x, 1.0, ally.z, ally.rig.species.palette.accent, 18, 6.2);
      this.floatingText.spawn(ally.x, 2.1, ally.z, `+${heal} PV`, '#4ADE80', 1.0, 0.9);
      this.spawnShockwaveRing(ally.x, ally.z, 5.5, ally.rig.species.palette.accent);
    }

    const livingEnemies = this.enemies.filter((e) => !e.fainted && !e.removed);
    if (livingEnemies.length > 0) {
      let cx = 0;
      let cz = 0;
      for (const e of livingEnemies) {
        cx += e.x;
        cz += e.z;
      }
      cx /= livingEnemies.length;
      cz /= livingEnemies.length;
      this.spawnShockwaveRing(cx, cz, 8.5, '#F4B942');
      this.spawnParticleBurst(cx, 1.2, cz, '#FFE066', 36, 7.4);
      this.floatingText.spawn(cx, 2.9, cz, 'CUBI-DÉCHAÎNEMENT !', '#F4B942', 1.4, 1.15);

      const leadAlly = livingAllies[0];
      const baseUltDmg = Math.round(combinedAtk * 1.35);
      for (const enemy of livingEnemies) {
        this.applyDamageToActor(
          enemy,
          baseUltDmg,
          leadAlly,
          true,
          true,
          '#F4B942',
          leadAlly.rig.species.element,
          true,
        );
      }
    }

    this.emitHudSnapshot();
    return true;
  }

  public triggerCookBurstFx(colorHex: string): void {
    soundFx.playCookBubble();
    this.spawnParticleBurst(0, 1.8, -1.2, colorHex, 22, 4.6);
  }

  private executeAllySkill(unit: CombatActor): void {
    const move = MOVES[unit.moveId] ?? MOVES.ember_burst;
    const mods = getMoveModifiers(unit.moveStones);
    unit.skillCooldown = unit.skillMaxCooldown;
    unit.squashY = 1.28;
    soundFx.playSkill(move.element);

    const target = this.findNearestLiving(unit.x, unit.z, this.enemies);
    const radius = move.aoeRadius * mods.radiusMult;

    if (move.style === 'buff') {
      unit.buffTimer = 8.0;
      const healAmt = Math.round(unit.maxHp * 0.14);
      unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
      this.ultimateCharge = computeUltimateCharge(this.ultimateCharge, 8);
      this.spawnParticleBurst(unit.x, 0.9, unit.z, move.color, 14, 4.0);
      this.floatingText.spawn(unit.x, 2.0, unit.z, `+${healAmt} PV`, '#4ADE80', 0.95);

      if (mods.shareRatio > 0) {
        for (const mate of this.allies) {
          if (mate.id !== unit.id && !mate.fainted) {
            mate.buffTimer = Math.max(mate.buffTimer, 8.0 * mods.shareRatio + 2.0);
            const sharedHeal = Math.round(healAmt * mods.shareRatio);
            mate.hp = Math.min(mate.maxHp, mate.hp + sharedHeal);
            this.spawnParticleBurst(mate.x, 0.9, mate.z, '#C084FC', 10, 3.4);
            this.floatingText.spawn(mate.x, 2.0, mate.z, `+${sharedHeal} PV`, '#4ADE80', 0.85);
          }
        }
      }
      return;
    }

    if (move.style === 'projectile' && target) {
      const dx = target.x - unit.x;
      const dz = target.z - unit.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      unit.facing = Math.atan2(dx, dz);

      const hit = calculateDamage(
        unit.atk,
        move,
        target.rig.species.element,
        unit.critRate,
        unit.moveStones,
      );
      this.spawnProjectile({
        x: unit.x,
        y: 0.9,
        z: unit.z,
        vx: (dx / dist) * 14.5,
        vz: (dz / dist) * 14.5,
        radius: 0.45,
        life: 1.4,
        fromAlly: true,
        damage: hit.damage,
        elementColor: move.color,
        elementType: move.element,
        isSkill: true,
        aoeRadius: radius,
        isCrit: hit.isCrit,
        casterUnit: unit,
      });
      return;
    }

    if (move.style === 'dash' && target) {
      const dx = target.x - unit.x;
      const dz = target.z - unit.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      const dashDist = Math.min(dist, 5.2);
      unit.x = THREE.MathUtils.clamp(unit.x + (dx / dist) * dashDist, -ARENA_BOUND, ARENA_BOUND);
      unit.z = THREE.MathUtils.clamp(unit.z + (dz / dist) * dashDist, -ARENA_BOUND, ARENA_BOUND);
      unit.facing = Math.atan2(dx, dz);
      this.spawnParticleBurst(unit.x, 0.7, unit.z, move.color, 18, 5.4);
    }

    // Melee / AoE / Dash arrival impact
    const centerX = move.style === 'aoe' && target && move.range > 5.5 ? target.x : unit.x;
    const centerZ = move.style === 'aoe' && target && move.range > 5.5 ? target.z : unit.z;
    this.spawnShockwaveRing(centerX, centerZ, radius, move.color);
    this.spawnParticleBurst(centerX, 0.8, centerZ, move.color, 20, 5.6);

    let hitAny = false;
    for (const enemy of this.enemies) {
      if (enemy.fainted || enemy.removed) continue;
      const dist = Math.hypot(enemy.x - centerX, enemy.z - centerZ);
      if (dist <= radius + (enemy.isBoss ? 1.1 : 0.6)) {
        const res = calculateDamage(
          unit.atk,
          move,
          enemy.rig.species.element,
          unit.critRate,
          unit.moveStones,
        );
        this.applyDamageToActor(
          enemy,
          res.damage,
          unit,
          true,
          res.isCrit,
          move.color,
          move.element,
          true,
        );
        hitAny = true;
      }
    }

    if (hitAny) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
      this.trauma = Math.min(1, this.trauma + 0.38);
    }
  }

  private getPrimaryStatus(actor: CombatActor): StatusKind | null {
    const keys = Object.keys(actor.statuses) as StatusKind[];
    for (const k of keys) {
      const inst = actor.statuses[k];
      if (inst && inst.remaining > 0) return k;
    }
    return null;
  }

  private applyStatusToActor(target: CombatActor, kind: StatusKind, sourceAtk: number): void {
    const duration = computeStatusDuration(kind, target.statusRes);
    target.statuses[kind] = {
      remaining: duration,
      tickTimer: 0.9,
      sourceAtk,
    };
    if (kind === 'shocked' && !target.isBoss) {
      target.stunTimer = Math.max(target.stunTimer, 0.95);
    }
  }

  private applyDamageToActor(
    target: CombatActor,
    rawDamage: number,
    attacker: CombatActor | undefined,
    isHeavy: boolean,
    isCrit: boolean,
    fxColor: string,
    incomingElement?: ElementType,
    isSkillHit = false,
  ): void {
    if (target.fainted || target.removed || target.invulnTimer > 0) return;

    let dmg = rawDamage;

    // Sunder (+25% damage taken)
    if (target.statuses.sunder && target.statuses.sunder.remaining > 0) {
      dmg *= 1.25;
    }

    // Check V0.2 Elemental Reactions when an ally skill hits a target carrying an elemental status
    if (attacker?.isAlly && isSkillHit && incomingElement && !target.isAlly) {
      const existing = this.getPrimaryStatus(target);
      const reaction = resolveElementalReaction(existing, incomingElement);
      if (reaction && existing) {
        delete target.statuses[existing];
        dmg *= reaction.damageMult;
        this.reactionsTriggered += 1;
        this.ultimateCharge = computeUltimateCharge(this.ultimateCharge, reaction.ultimateBonus);
        this.lastReactionLabel = reaction.name;
        this.lastReactionColor = reaction.color;
        this.lastReactionTimer = 2.4;
        soundFx.playReaction();
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
        this.trauma = Math.min(1, this.trauma + 0.34);
        this.spawnShockwaveRing(target.x, target.z, 3.6, reaction.color);
        this.spawnParticleBurst(target.x, 1.1, target.z, reaction.color, 22, 6.2);
        this.floatingText.spawn(target.x, 2.55, target.z, reaction.name, reaction.color, 1.25, 1.1);

        // Reaction secondary mechanical effects
        if (reaction.effect === 'aoe_burn') {
          for (const other of this.enemies) {
            if (other.id !== target.id && !other.fainted && !other.removed) {
              if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.4) {
                this.applyStatusToActor(other, 'burn', attacker.atk);
                other.hp = Math.max(1, other.hp - Math.round(rawDamage * 0.45));
                this.floatingText.spawn(other.x, 1.9, other.z, `-${Math.round(rawDamage * 0.45)}`, '#FB923C', 0.9);
              }
            }
          }
        } else if (reaction.effect === 'chain_stun') {
          let chains = 0;
          for (const other of this.enemies) {
            if (chains >= 2) break;
            if (other.id !== target.id && !other.fainted && !other.removed) {
              if (Math.hypot(other.x - target.x, other.z - target.z) <= 5.5) {
                chains += 1;
                this.applyStatusToActor(other, 'shocked', attacker.atk);
                const chainDmg = Math.round(rawDamage * 0.55);
                other.hp = Math.max(1, other.hp - chainDmg);
                this.spawnParticleBurst(other.x, 0.9, other.z, '#FACC15', 10, 4.5);
                this.floatingText.spawn(other.x, 2.0, other.z, `${chainDmg}`, '#FACC15', 0.95);
              }
            }
          }
        } else if (reaction.effect === 'knockback') {
          const dx = target.x - attacker.x;
          const dz = target.z - attacker.z;
          const len = Math.max(0.01, Math.hypot(dx, dz));
          const kb = target.isBoss ? 3.5 : 8.2;
          target.vx += (dx / len) * kb;
          target.vz += (dz / len) * kb;
        } else if (reaction.effect === 'team_shield') {
          for (const ally of this.allies) {
            if (!ally.fainted) {
              const shieldGain = Math.round(ally.maxHp * 0.15);
              ally.shieldHp = Math.min(Math.round(ally.maxHp * 0.35), ally.shieldHp + shieldGain);
              this.spawnParticleBurst(ally.x, 0.9, ally.z, '#EAB308', 8, 3.2);
              this.floatingText.spawn(ally.x, 2.0, ally.z, `+${shieldGain} BOUCL.`, '#FDE047', 0.85);
            }
          }
        } else if (reaction.effect === 'cd_spread') {
          attacker.skillCooldown = Math.max(0.4, attacker.skillCooldown - 1.5);
          for (const other of this.enemies) {
            if (other.id !== target.id && !other.fainted && !other.removed) {
              if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.8) {
                this.applyStatusToActor(other, existing, attacker.atk);
              }
            }
          }
        }
      } else {
        const applied = getStatusForElement(incomingElement);
        this.applyStatusToActor(target, applied, attacker.atk);
      }
    }

    const defMult = target.buffTimer > 0 ? 0.65 : 1.0;
    let finalDmg = Math.max(1, Math.round(dmg * defMult));

    // Absorb damage with Crystallize shield if present
    if (target.shieldHp > 0) {
      const absorbed = Math.min(target.shieldHp, finalDmg);
      target.shieldHp -= absorbed;
      finalDmg -= absorbed;
    }

    if (finalDmg > 0) {
      target.hp = Math.max(0, target.hp - finalDmg);
    }
    target.flashTimer = isHeavy || isCrit ? 0.11 : 0.07;
    target.squashY = 0.76;
    const effectiveness =
      incomingElement && !target.isAlly
        ? getTypeEffectiveness(incomingElement, target.rig.species.element)
        : 1;

    // 3D Floating Damage Number
    const numY = getRigTopY(target.rig.species) + 0.15;
    if (finalDmg > 0) {
      // Lisible d'un coup d'œil : critique doré, super efficace orange, résisté gris
      const textColor = target.isAlly
        ? '#FCA5A5'
        : isCrit
          ? '#FFE066'
          : effectiveness > 1
            ? '#FDBA74'
            : effectiveness < 1
              ? '#94A3B8'
              : '#FAF7F0';
      const label = isCrit ? `${finalDmg}!` : `${finalDmg}`;
      const effScale = effectiveness > 1 ? 1.12 : effectiveness < 1 ? 0.9 : 1;
      this.floatingText.spawn(
        target.x,
        numY,
        target.z,
        label,
        textColor,
        (isCrit ? 1.2 : isHeavy ? 1.02 : 0.84) * effScale,
        0.78,
      );
    } else {
      this.floatingText.spawn(target.x, numY, target.z, 'BLOQUÉ', '#FDE047', 0.82, 0.65);
    }

    if (attacker?.isAlly && !target.isAlly) {
      this.damageDealt += finalDmg;
      this.comboCount += 1;
      this.comboTimer = 4.8;
      if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
      this.ultimateCharge = computeUltimateCharge(this.ultimateCharge, isSkillHit ? 6.5 : 2.8);

      if (attacker.hitHeal > 0 && !attacker.fainted && finalDmg > 0) {
        const heal = Math.max(1, Math.round((finalDmg * attacker.hitHeal) / 100));
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      }
      // Pierre Sangsue : la compétence rend une part des dégâts au lanceur
      if (isSkillHit && !attacker.fainted && finalDmg > 0 && attacker.moveStones.includes('leech')) {
        const leech = getMoveModifiers(attacker.moveStones).leechRatio;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.max(1, Math.round(finalDmg * leech)));
      }
    }

    // Check Boss Phase Shift!
    if (target.isBoss && target.hp > 0) {
      const nextPhase = computeBossPhase(target.hp, target.maxHp, target.bossMaxPhases === 3);
      if (nextPhase > target.bossPhase && nextPhase !== 1) {
        target.bossPhase = nextPhase;
        this.onBossPhaseShift(target, nextPhase);
      }
    }

    // Directional knockback
    if (attacker) {
      const dx = target.x - attacker.x;
      const dz = target.z - attacker.z;
      const len = Math.max(0.01, Math.hypot(dx, dz));
      const kb = (isHeavy ? 4.8 : 2.0) * (target.isBoss ? 0.35 : 1.0);
      target.vx += (dx / len) * kb;
      target.vz += (dz / len) * kb;
    }

    soundFx.playHit(isHeavy, isCrit);
    if (incomingElement) {
      soundFx.playElementImpact(incomingElement, isHeavy);
      this.spawnElementBurst(target.x, 0.85, target.z, incomingElement, isHeavy ? 12 : 5, isHeavy ? 1.15 : 0.8);
      if (isCrit) this.spawnParticleBurst(target.x, 1.0, target.z, '#FFE066', 6, 4.6);
    } else {
      this.spawnParticleBurst(target.x, 0.85, target.z, isCrit ? '#FFE066' : fxColor, isHeavy ? 14 : 6, isHeavy ? 5.2 : 3.2);
    }

    if (isCrit || isHeavy) {
      this.trauma = Math.min(1, this.trauma + (isCrit ? 0.3 : 0.18));
    }
    if (isCrit && !target.isAlly) {
      // léger hit-stop sur critique pour faire claquer l'impact
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.032);
    }

    if (target.hp <= 0) {
      target.fainted = true;
      target.telegraphing = false;
      target.hasAttackToken = false;
      target.statuses = {};
      if (target.isBoss && !target.isAlly) this.telemetry.bossDefeatedAt = this.expeditionElapsed;
      soundFx.playKo();
      this.hitstopTimer = Math.max(this.hitstopTimer, target.isBoss ? 0.075 : 0.04);
      this.trauma = Math.min(1, this.trauma + (target.isBoss ? 0.65 : 0.25));
      this.spawnParticleBurst(
        target.x,
        0.8,
        target.z,
        target.rig.species.palette.primary,
        target.isBoss ? 28 : 16,
        6.0,
      );

      if (target.isAlly) {
        target.reviveTimer = 11.0;
      } else {
        target.koDissolveTimer = 0.42;
      }
    }
  }

  private onBossPhaseShift(boss: CombatActor, phase: 2 | 3): void {
    this.telemetry.phaseStartedAt[phase - 1] = this.expeditionElapsed;
    // un saut direct de la phase 1 à la phase 3 fait commencer (et finir) la phase 2 au même instant
    if (phase === 3 && this.telemetry.phaseStartedAt[1] < 0) {
      this.telemetry.phaseStartedAt[1] = this.expeditionElapsed;
    }
    soundFx.playBossPhase();
    const label = phase === 3 ? 'PHASE 3 : SURCHARGE !' : 'PHASE 2 : FUREUR !';
    const auraColor = phase === 3 ? '#F4B942' : '#F43F5E';
    this.bannerText = `${boss.name} — ${label}`;
    this.bannerTimer = 2.6;
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.06);
    this.spawnShockwaveRing(boss.x, boss.z, 6.2, auraColor);
    this.spawnParticleBurst(boss.x, 1.3, boss.z, auraColor, 30, 6.8);
    this.floatingText.spawn(boss.x, 3.0, boss.z, label, auraColor, 1.35, 1.25);

    // Gentle non-lethal pushback so player clearly reads the phase transition
    for (const ally of this.allies) {
      if (ally.fainted) continue;
      const dx = ally.x - boss.x;
      const dz = ally.z - boss.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      if (dist < 6.0) {
        ally.vx += (dx / dist) * 6.5;
        ally.vz += (dz / dist) * 6.5;
      }
    }
    boss.skillCooldown = 1.4;
    this.emitHudSnapshot();
  }

  private spawnProjectile(p: Omit<ActiveProjectile, 'mesh'>): void {
    const geo = new THREE.BoxGeometry(p.radius * 1.4, p.radius * 1.4, p.radius * 1.4);
    const mat = new THREE.MeshStandardMaterial({
      color: p.elementColor,
      emissive: new THREE.Color(p.elementColor),
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    this.fxGroup.add(mesh);
    this.projectiles.push({ ...p, mesh });
  }

  private spawnShockwaveRing(x: number, z: number, radius: number, colorHex: string): void {
    const ringGeo = new THREE.RingGeometry(Math.max(0.2, radius * 0.72), radius, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    this.fxGroup.add(mesh);

    this.telegraphs.push({
      mesh,
      x,
      z,
      radius,
      elapsed: 0,
      duration: 0.26,
      isLine: false,
      dirX: 0,
      dirZ: 0,
      isEnemyHazard: false,
      onComplete: () => {},
    });
  }

  private spawnEnemyTelegraph(
    x: number,
    z: number,
    radius: number,
    duration: number,
    isLine: boolean,
    dirX: number,
    dirZ: number,
    onComplete: () => void,
    opts?: { innerRadius?: number; color?: string; silent?: boolean },
  ): void {
    if (!opts?.silent) soundFx.playTelegraph();
    const geo = isLine
      ? new THREE.PlaneGeometry(1.4, radius)
      : opts?.innerRadius
        ? new THREE.RingGeometry(opts.innerRadius, radius, 40) // couronne : zone sûre au centre
        : new THREE.CircleGeometry(radius, 28);
    if (isLine) {
      geo.translate(0, radius / 2, 0);
    }
    const mat = new THREE.MeshBasicMaterial({
      color: opts?.color ?? '#EF4444',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    if (isLine) {
      mesh.rotation.z = Math.atan2(dirX, dirZ) - Math.PI;
    }
    mesh.position.set(x, 0.05, z);
    this.fxGroup.add(mesh);

    this.telegraphs.push({
      mesh,
      x,
      z,
      radius,
      elapsed: 0,
      duration,
      isLine,
      dirX,
      dirZ,
      isEnemyHazard: true,
      onComplete,
    });
  }

  private clearProjectilesAndTelegraphs(): void {
    for (const p of this.projectiles) {
      this.fxGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.projectiles = [];

    for (const t of this.telegraphs) {
      this.fxGroup.remove(t.mesh);
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
    }
    this.telegraphs = [];
  }

  private spawnParticleBurst(
    x: number,
    y: number,
    z: number,
    colorHex: string,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.65) * speed;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.4;
      slot.y = y + Math.random() * 0.3;
      slot.z = z + (Math.random() - 0.5) * 0.4;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = 2.2 + Math.random() * 3.8;
      slot.vz = Math.sin(ang) * spd;
      slot.maxLife = 0.35 + Math.random() * 0.35;
      slot.life = slot.maxLife;
      slot.size = 0.14 + Math.random() * 0.18;
      slot.colorHex = colorHex;
      slot.gravity = 11.5;
      slot.drag = 0;
      slot.stretchY = 1;
      slot.bounce = 0;
    }
  }

  /**
   * Gerbe d'impact propre à chaque élément : braises qui montent, gouttes qui rebondissent,
   * feuilles qui planent, étincelles nerveuses, éclats de roche lourds, spirale psy.
   */
  private spawnElementBurst(
    x: number,
    y: number,
    z: number,
    element: ElementType,
    count: number,
    power = 1,
  ): void {
    const fx = ELEMENT_FX[element];
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.4 + Math.random() * 0.6) * fx.speed * power;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      slot.active = true;
      slot.x = x + cos * 0.25;
      slot.y = y + Math.random() * 0.4;
      slot.z = z + sin * 0.25;
      // swirl : composante tangentielle pour les feuilles et la spirale psy
      slot.vx = cos * spd - sin * fx.swirl;
      slot.vz = sin * spd + cos * fx.swirl;
      slot.vy = fx.vyMin + Math.random() * (fx.vyMax - fx.vyMin);
      slot.maxLife = fx.lifeMin + Math.random() * (fx.lifeMax - fx.lifeMin);
      slot.life = slot.maxLife;
      slot.size = fx.sizeMin + Math.random() * (fx.sizeMax - fx.sizeMin);
      slot.colorHex = fx.colors[i % fx.colors.length];
      slot.gravity = fx.gravity;
      slot.drag = fx.drag;
      slot.stretchY = fx.stretchY;
      slot.bounce = fx.bounce;
    }
  }

  private spawnSteamCube(x: number, y: number, z: number, colorHex: string): void {
    const slot = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 0.8;
    slot.y = y;
    slot.z = z + (Math.random() - 0.5) * 0.8;
    slot.vx = (Math.random() - 0.5) * 0.4;
    slot.vy = 1.6 + Math.random() * 0.9;
    slot.vz = (Math.random() - 0.5) * 0.4;
    slot.maxLife = 1.0 + Math.random() * 0.5;
    slot.life = slot.maxLife;
    slot.size = 0.22 + Math.random() * 0.14;
    slot.colorHex = colorHex;
    slot.gravity = -0.35;
    slot.drag = 0;
    slot.stretchY = 1;
    slot.bounce = 0;
  }

  private findNearestLiving(x: number, z: number, list: CombatActor[]): CombatActor | null {
    let best: CombatActor | null = null;
    let bestDistSq = Infinity;
    for (const a of list) {
      if (a.fainted || a.removed) continue;
      const d2 = (a.x - x) * (a.x - x) + (a.z - z) * (a.z - z);
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = a;
      }
    }
    return best;
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    if (this.disposed || !this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTimeMs) / 1000);
    this.lastTimeMs = now;
    this.advance(Math.min(rawDt, 0.05));
    this.renderer?.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  /**
   * Avance la simulation d'un pas fixe, sans horloge ni rendu.
   * Réservé au mode headless (`npm run sim`) : en jeu, c'est `tick()` qui pilote.
   */
  public stepSimulation(dt: number): void {
    if (this.disposed) return;
    this.advance(Math.min(Math.max(dt, 0.001), 0.05));
  }

  /** Accès en lecture pour les tests et outils (fuites mémoire, cohérence d'état). */
  public getDebugInfo(): {
    scene: THREE.Scene;
    worldNodes: number;
    actorNodes: number;
    fxNodes: number;
    telegraphs: number;
    projectiles: number;
    bossIntroActive: boolean;
    evolutionActive: boolean;
    playMode: PlayMode;
  } {
    return {
      scene: this.scene,
      worldNodes: this.worldGroup.children.length,
      actorNodes: this.actorsGroup.children.length,
      fxNodes: this.fxGroup.children.length,
      telegraphs: this.telegraphs.length,
      projectiles: this.projectiles.length,
      bossIntroActive: this.bossIntroTimer > 0,
      evolutionActive: this.evo !== null,
      playMode: this.playMode,
    };
  }

  public getCombatTelemetry(): CombatTelemetry {
    return {
      ...this.telemetry,
      phaseStartedAt: [...this.telemetry.phaseStartedAt],
      castsByPhase: [...this.telemetry.castsByPhase],
      patternsByPhase: [
        [...this.telemetry.patternsByPhase[0]],
        [...this.telemetry.patternsByPhase[1]],
        [...this.telemetry.patternsByPhase[2]],
      ],
      elapsed: this.expeditionElapsed,
    };
  }

  /** Un pas de jeu complet (logique + caméra), commun à la boucle temps réel et au mode headless. */
  private advance(dt: number): void {
    this.elapsedTotal += dt;

    if (this.waterUniform) {
      this.waterUniform.value = this.elapsedTotal;
    }

    this.envAnimate?.(this.elapsedTotal);

    if (this.cloudGroup) {
      const clouds = this.cloudGroup.children;
      for (let i = 0; i < clouds.length; i++) {
        const cloud = clouds[i];
        cloud.position.x += (0.55 + (i % 3) * 0.25) * dt;
        if (cloud.position.x > 40) {
          cloud.position.x = -40;
        }
      }
    }

    if (this.screenState !== 'paused') {
      // Hitstop freezes simDt while camera shake, flashes & particles keep ticking in real dt
      const simDt = this.hitstopTimer > 0 ? 0 : dt;
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      }

      if (this.playMode === 'camp') {
        this.updateCamp(dt);
      } else {
        this.updateExpedition(dt, simDt);
      }

      this.updateParticles(dt);
      this.updateWeather(dt);
      this.updateStormAmbience(dt);
      this.floatingText.update(dt);
    }

    this.updateCamera(dt);
  }

  private updateCamp(dt: number): void {
    this.updateDayNight(dt);
    this.updateEvolution(dt);

    // Animate cooking pot embers & steam cubes
    if (this.potFireMesh) {
      const flicker = 0.92 + Math.sin(this.elapsedTotal * 14) * 0.14;
      this.potFireMesh.scale.set(flicker, 0.85 + Math.cos(this.elapsedTotal * 11) * 0.22, flicker);
    }
    this.potSteamTimer -= dt;
    if (this.potSteamTimer <= 0) {
      this.potSteamTimer = this.potCookingColor ? 0.22 : 0.65;
      this.spawnSteamCube(0, 1.65, -1.2, this.potCookingColor ?? '#E2F3FF');
    }

    for (const w of this.campWanderers) {
      let lift = 0;
      if (this.evo) {
        // Toute l'escouade s'arrête pour regarder la métamorphose
        w.facing = Math.atan2(EVO_X - w.x, EVO_Z - w.z);
        this.animateRigPose(w.rig, w.walkPhase, false, 1, this.elapsedTotal);
      } else {
        const dx = w.targetX - w.x;
        const dz = w.targetZ - w.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.25) {
          const spd = 2.2;
          const step = Math.min(dist, spd * dt);
          w.x += (dx / dist) * step;
          w.z += (dz / dist) * step;
          w.facing = Math.atan2(dx, dz);
          w.walkPhase += step * 4.4;
          this.animateRigPose(w.rig, w.walkPhase, true, 1, this.elapsedTotal);
        } else {
          w.waitTimer -= dt;
          // Émote d'attente : un petit saut de joie de temps en temps
          w.emoteTimer -= dt;
          if (w.emoteT <= 0 && w.emoteTimer <= 0) {
            w.emoteT = 0.55;
            w.emoteTimer = 5 + Math.random() * 7;
            this.spawnParticleBurst(w.x, 1.5, w.z, w.rig.species.palette.accent, 4, 2.2);
            if (this.screenState === 'playing') soundFx.playIdleChirp();
          }
          let squash = 1;
          if (w.emoteT > 0) {
            w.emoteT = Math.max(0, w.emoteT - dt);
            const k = 1 - w.emoteT / 0.55;
            lift = Math.sin(k * Math.PI) * 0.6;
            squash = 1 + Math.sin(k * Math.PI * 2) * 0.12;
          }
          this.animateRigPose(w.rig, w.walkPhase, false, squash, this.elapsedTotal);
          if (w.waitTimer <= 0 && w.emoteT <= 0) {
            const ang = Math.random() * Math.PI * 2;
            const r = 2.8 + Math.random() * 4.6;
            w.targetX = Math.cos(ang) * r;
            w.targetZ = Math.sin(ang) * r + 1.2;
            w.waitTimer = 1.8 + Math.random() * 2.4;
          }
        }
      }
      w.rig.bodyPivot.position.y += lift; // l'ombre de contact reste au sol
      w.rig.root.position.set(w.x, 0, w.z);
      w.rig.root.rotation.y = w.facing;
    }
  }
  private updateExpedition(dt: number, simDt: number): void {
    if (!this.activeStage) return;

    if (this.expeditionEnded || this.resultSent) {
      this.updateEndSequence(dt);
      if (this.expeditionEnded) {
        this.endDelayTimer -= dt;
        if (this.endDelayTimer <= 0) {
          const boss = this.enemies.find((e) => e.isBoss);
          const bossPct = boss ? (boss.hp / Math.max(1, boss.maxHp)) * 100 : 0;
          const wavesCleared = this.pendingVictory
            ? this.activeStage.waves.length
            : this.waveIndex;
          const cb = this.callbacks.onExpeditionComplete;
          this.expeditionEnded = false;
          // Le résultat ne part qu'UNE fois : sans ce verrou, la boucle re-détectait la victoire
          // sous la fenêtre de fin et renvoyait les récompenses en boucle.
          this.resultSent = true;
          this.screenState = 'gameover';
          cb({
            victory: this.pendingVictory,
            clearTimeSec: this.expeditionElapsed,
            wavesCleared,
            damageDealt: this.damageDealt,
            bossHpPercentRemaining: this.pendingVictory ? 0 : bossPct,
            reactionsTriggered: this.reactionsTriggered,
            ultimatesUsed: this.ultimatesUsed,
            perfectDodges: this.perfectDodges,
            maxCombo: this.maxCombo,
          });
        }
      }
      return;
    }

    if (this.bossIntroTimer > 0) {
      // Cinématique d'entrée : la simulation est gelée, seul le boss tombe
      this.updateBossIntro(dt);
      simDt = 0;
    }
    this.expeditionElapsed += simDt;
    if (this.scatterCooldown > 0) this.scatterCooldown = Math.max(0, this.scatterCooldown - simDt);
    if (this.bannerTimer > 0) {
      this.bannerTimer = Math.max(0, this.bannerTimer - dt);
      if (this.bannerTimer === 0) this.bannerText = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - simDt);
      if (this.comboTimer === 0) {
        this.comboCount = 0;
      }
    }
    if (this.lastReactionTimer > 0) {
      this.lastReactionTimer = Math.max(0, this.lastReactionTimer - dt);
      if (this.lastReactionTimer === 0) {
        this.lastReactionLabel = null;
        this.lastReactionColor = null;
      }
    }
    if (this.controlMode === 'auto' && this.ultimateCharge >= 100 && this.enemies.some((e) => !e.fainted && !e.removed)) {
      this.triggerUltimate();
    }

    // Manual WASD / ZQSD / Arrow movement vector for leader
    let moveInputX = 0;
    let moveInputZ = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('KeyZ') || this.heldKeys.has('ArrowUp')) {
      moveInputZ -= 1;
    }
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
      moveInputZ += 1;
    }
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('KeyQ') || this.heldKeys.has('ArrowLeft')) {
      moveInputX -= 1;
    }
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
      moveInputX += 1;
    }
    const hasManualInput = moveInputX !== 0 || moveInputZ !== 0;
    if (hasManualInput) {
      const len = Math.hypot(moveInputX, moveInputZ);
      moveInputX /= len;
      moveInputZ /= len;
    }

    // Update Allies
    const leader = this.allies.find((a) => !a.fainted) ?? this.allies[0];
    for (let i = 0; i < this.allies.length; i++) {
      const ally = this.allies[i];
      this.updateActorCommon(ally, dt, simDt);

      if (ally.fainted) {
        ally.reviveTimer = Math.max(0, ally.reviveTimer - simDt);
        ally.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(ally.rig.bodyPivot.rotation.z, Math.PI / 2, 10, dt);
        if (ally.reviveTimer <= 0) {
          ally.fainted = false;
          ally.hp = Math.round(ally.maxHp * 0.55);
          ally.invulnTimer = 1.2;
          ally.rig.bodyPivot.rotation.z = 0;
          this.spawnParticleBurst(ally.x, 0.8, ally.z, '#2FB97A', 16, 4.5);
        }
        continue;
      }

      ally.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(ally.rig.bodyPivot.rotation.z, 0, 12, dt);

      if (ally.scatterTimer > 0) {
        ally.scatterTimer = Math.max(0, ally.scatterTimer - simDt);
        const dashSpd = ally.moveSpeed * 2.55;
        ally.x = THREE.MathUtils.clamp(ally.x + ally.scatterDirX * dashSpd * simDt, -ARENA_BOUND, ARENA_BOUND);
        ally.z = THREE.MathUtils.clamp(ally.z + ally.scatterDirZ * dashSpd * simDt, -ARENA_BOUND, ARENA_BOUND);
        ally.facing = Math.atan2(ally.scatterDirX, ally.scatterDirZ);
        ally.walkPhase += dashSpd * simDt * 3.2;
        this.animateRigPose(ally.rig, ally.walkPhase, true, ally.squashY, this.elapsedTotal);
        continue;
      }

      const target = this.findNearestLiving(ally.x, ally.z, this.enemies);
      let moved = false;

      const allySpeedMult = ally.statuses.rooted ? 0.45 : ally.statuses.soaked ? 0.78 : 1.0;
      const effectiveSpeed = ally.moveSpeed * allySpeedMult;

      if (ally.stunTimer > 0) {
        this.animateRigPose(ally.rig, ally.walkPhase, false, 0.88, this.elapsedTotal);
        continue;
      }

      if (hasManualInput && ally === leader) {
        ally.x = THREE.MathUtils.clamp(ally.x + moveInputX * effectiveSpeed * simDt, -ARENA_BOUND, ARENA_BOUND);
        ally.z = THREE.MathUtils.clamp(ally.z + moveInputZ * effectiveSpeed * simDt, -ARENA_BOUND, ARENA_BOUND);
        ally.facing = Math.atan2(moveInputX, moveInputZ);
        ally.walkPhase += effectiveSpeed * simDt * 3.8;
        moved = true;
      } else if (hasManualInput && leader && ally !== leader) {
        // Teammates follow leader smoothly in formation when player steers manually
        const formX = leader.x - moveInputX * 2.1 + (i === 1 ? -1.4 : 1.4);
        const formZ = leader.z - moveInputZ * 2.1 + (i === 1 ? 1.4 : -1.4);
        const dx = formX - ally.x;
        const dz = formZ - ally.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.6) {
          const step = Math.min(dist, effectiveSpeed * simDt);
          ally.x = THREE.MathUtils.clamp(ally.x + (dx / dist) * step, -ARENA_BOUND, ARENA_BOUND);
          ally.z = THREE.MathUtils.clamp(ally.z + (dz / dist) * step, -ARENA_BOUND, ARENA_BOUND);
          ally.facing = Math.atan2(dx, dz);
          ally.walkPhase += step * 3.8;
          moved = true;
        }
      } else if (target && this.controlMode !== 'manual') {
        const dx = target.x - ally.x;
        const dz = target.z - ally.z;
        const dist = Math.hypot(dx, dz);
        ally.facing = Math.atan2(dx, dz);

        if (dist > ally.attackRange * 0.9) {
          const step = effectiveSpeed * simDt;
          ally.x = THREE.MathUtils.clamp(ally.x + (dx / Math.max(0.01, dist)) * step, -ARENA_BOUND, ARENA_BOUND);
          ally.z = THREE.MathUtils.clamp(ally.z + (dz / Math.max(0.01, dist)) * step, -ARENA_BOUND, ARENA_BOUND);
          ally.walkPhase += step * 3.8;
          moved = true;
        }
      }

      // Auto basic attack when in range (always active for teammates, and active for leader unless dashing)
      if (target && ally.basicCooldown <= 0) {
        const dist = Math.hypot(target.x - ally.x, target.z - ally.z);
        if (dist <= ally.attackRange + (target.isBoss ? 1.0 : 0.4)) {
          ally.basicCooldown = 1.05;
          ally.squashY = 1.18;
          const basicMove = { element: ally.rig.species.element, powerMultiplier: 0.58 };
          const res = calculateDamage(ally.atk, basicMove, target.rig.species.element, ally.critRate);
          if (ally.rig.species.role === 'ranged') {
            const dx = target.x - ally.x;
            const dz = target.z - ally.z;
            const dLen = Math.max(0.01, Math.hypot(dx, dz));
            this.spawnProjectile({
              x: ally.x,
              y: 0.8,
              z: ally.z,
              vx: (dx / dLen) * 12.5,
              vz: (dz / dLen) * 12.5,
              radius: 0.28,
              life: 1.1,
              fromAlly: true,
              damage: res.damage,
              elementColor: ally.rig.species.palette.accent,
              elementType: ally.rig.species.element,
              isSkill: false,
              aoeRadius: 0.9,
              isCrit: res.isCrit,
              casterUnit: ally,
            });
          } else {
            this.applyDamageToActor(
              target,
              res.damage,
              ally,
              false,
              res.isCrit,
              ally.rig.species.palette.accent,
              ally.rig.species.element,
              false,
            );
          }
        }
      }

      // Auto-cast skill in 'auto' mode
      if (this.controlMode === 'auto' && target && ally.skillCooldown <= 0) {
        const move = MOVES[ally.moveId] ?? MOVES.ember_burst;
        const dist = Math.hypot(target.x - ally.x, target.z - ally.z);
        if (move.style === 'buff' || dist <= move.range + 1.2) {
          this.executeAllySkill(ally);
        }
      }

      this.animateRigPose(ally.rig, ally.walkPhase, moved, ally.squashY, this.elapsedTotal);
    }

    // Soft separation between living allies so they never overlap
    for (let i = 0; i < this.allies.length; i++) {
      for (let j = i + 1; j < this.allies.length; j++) {
        const a = this.allies[i];
        const b = this.allies[j];
        if (a.fainted || b.fainted) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001 && dist < 1.35) {
          const push = (1.35 - dist) * 0.5;
          a.x -= (dx / dist) * push;
          a.z -= (dz / dist) * push;
          b.x += (dx / dist) * push;
          b.z += (dz / dist) * push;
        }
      }
    }

    // Count active attack tokens for fair crowd pacing
    let activeTokens = this.enemies.filter((e) => !e.fainted && !e.removed && e.hasAttackToken).length;

    // Update Enemies (4 distinct AI policies: chaser, kiter, charger, boss)
    for (const enemy of this.enemies) {
      if (enemy.removed) continue;
      this.updateActorCommon(enemy, dt, simDt);

      if (enemy.fainted) {
        this.updateEnemyDissolve(enemy, dt);
        continue;
      }
      const target = this.findNearestLiving(enemy.x, enemy.z, this.allies);
      if (!target) continue;

      const dx = target.x - enemy.x;
      const dz = target.z - enemy.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      enemy.facing = Math.atan2(dx, dz);
      let moved = false;

      // Œil du Cyclone : tant que le boss charge, le vent aspire les alliés vers lui
      if (enemy.pullTimer > 0) {
        enemy.pullTimer = Math.max(0, enemy.pullTimer - simDt);
        for (const ally of this.allies) {
          if (ally.fainted || ally.scatterTimer > 0) continue;
          const px = enemy.x - ally.x;
          const pz = enemy.z - ally.z;
          const pd = Math.hypot(px, pz);
          if (pd > 1.8) {
            ally.x += (px / pd) * STORM_KIT.pullSpeed * simDt;
            ally.z += (pz / pd) * STORM_KIT.pullSpeed * simDt;
          }
        }
      }

      if (enemy.telegraphing) {
        // Hold crouch stance during attack telegraph
        this.animateRigPose(enemy.rig, enemy.walkPhase, false, 0.84, this.elapsedTotal);
        continue;
      }

      if (enemy.stunTimer > 0) {
        this.animateRigPose(enemy.rig, enemy.walkPhase, false, 0.88, this.elapsedTotal);
        continue;
      }

      const enemySpeedMult = enemy.statuses.rooted ? 0.45 : enemy.statuses.soaked ? 0.75 : 1.0;
      const enemySpeed = enemy.moveSpeed * enemySpeedMult * (enemy.isBoss && enemy.bossPhase >= 2 ? 1.15 : 1.0);
      const confusedMiss = Boolean(enemy.statuses.confused) && Math.random() < 0.22;

      enemy.aiCooldown = Math.max(0, enemy.aiCooldown - simDt);

      if (enemy.ai === 'kiter') {
        // Kiter maintains preferred mid-range distance & fires avoidable projectiles
        if (dist > 7.2) {
          enemy.x += (dx / dist) * enemySpeed * simDt;
          enemy.z += (dz / dist) * enemySpeed * simDt;
          enemy.walkPhase += enemySpeed * simDt * 3.5;
          moved = true;
        } else if (dist < 4.0) {
          enemy.x = THREE.MathUtils.clamp(enemy.x - (dx / dist) * enemySpeed * 0.75 * simDt, -ARENA_BOUND, ARENA_BOUND);
          enemy.z = THREE.MathUtils.clamp(enemy.z - (dz / dist) * enemySpeed * 0.75 * simDt, -ARENA_BOUND, ARENA_BOUND);
          enemy.walkPhase += enemySpeed * simDt * 3.0;
          moved = true;
        }
        if (enemy.basicCooldown <= 0 && dist <= 9.5) {
          enemy.basicCooldown = 2.2;
          enemy.squashY = 1.2;
          const jitter = confusedMiss ? (Math.random() - 0.5) * 0.9 : 0;
          const ang = Math.atan2(dx, dz) + jitter;
          this.spawnProjectile({
            x: enemy.x,
            y: 0.85,
            z: enemy.z,
            vx: Math.sin(ang) * 8.2,
            vz: Math.cos(ang) * 8.2,
            radius: 0.34,
            life: 1.6,
            fromAlly: false,
            damage: enemy.atk,
            elementColor: enemy.rig.species.palette.accent,
            aoeRadius: 1.1,
            isCrit: false,
            casterUnit: enemy,
          });
        }
      } else if (enemy.ai === 'charger') {
        // Line-of-sight Charger pauses with a red ground sight-line telegraph then lunges!
        if (enemy.aiCooldown <= 0 && dist < 8.5 && activeTokens < MAX_ATTACK_TOKENS) {
          enemy.telegraphing = true;
          enemy.hasAttackToken = true;
          activeTokens += 1;
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const chargeLen = Math.min(7.5, dist + 2.0);
          this.spawnEnemyTelegraph(enemy.x, enemy.z, chargeLen, 0.65, true, dirX, dirZ, () => {
            enemy.telegraphing = false;
            enemy.hasAttackToken = false;
            enemy.aiCooldown = 4.2;
            if (enemy.fainted || enemy.removed) return;
            enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * chargeLen, -ARENA_BOUND, ARENA_BOUND);
            enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * chargeLen, -ARENA_BOUND, ARENA_BOUND);
            this.spawnParticleBurst(enemy.x, 0.7, enemy.z, enemy.rig.species.palette.accent, 14, 5.0);
            for (const ally of this.allies) {
              if (!ally.fainted && Math.hypot(ally.x - enemy.x, ally.z - enemy.z) <= 2.2) {
                this.applyDamageToActor(ally, Math.round(enemy.atk * 1.45), enemy, true, false, '#EF4444');
              }
            }
          });
        } else if (dist > 2.8) {
          enemy.x += (dx / dist) * enemySpeed * 0.85 * simDt;
          enemy.z += (dz / dist) * enemySpeed * 0.85 * simDt;
          enemy.walkPhase += enemySpeed * simDt * 3.4;
          moved = true;
        }
      } else if (enemy.ai === 'boss') {
        // V0.2 Multi-Phase Tactical Boss:
        // Phase 1: Circular AoE Slam
        // Phase 2+: Alternates AoE Slam + Fan, Double Cross Charge, and Sequential Meteor Volley
        const phase = enemy.bossPhase;
        if (enemy.skillCooldown <= 0 && activeTokens < MAX_ATTACK_TOKENS) {
          enemy.telegraphing = true;
          enemy.hasAttackToken = true;
          activeTokens += 1;
          // Rotation des attaques selon le kit du boss (données : StageDef.bossKit)
          const kitDef = BOSS_KITS[this.activeStage.bossKit ?? 'classic'];
          const cycle = kitDef.cycle[phase === 1 ? 0 : 1];          const pattern = cycle[enemy.bossPatternIndex % cycle.length];
          this.telemetry.castsByPhase[phase - 1] += 1;
          if (!this.telemetry.patternsByPhase[phase - 1].includes(pattern)) {
            this.telemetry.patternsByPhase[phase - 1].push(pattern);
          }
          enemy.bossPatternIndex += 1;
          const cooldownAfter = phase === 3 ? 2.8 : phase === 2 ? 3.4 : 4.6;

          if (pattern === 0) {
            // Pattern 0: Circular AoE Slam (+ radial projectiles in Phase 2/3)
            const aoeRad = phase === 3 ? 4.6 : phase === 2 ? 4.2 : 3.6;
            const windup = phase === 3 ? 0.62 : phase === 2 ? 0.72 : 0.82;
            const tx = target.x;
            const tz = target.z;
            this.spawnEnemyTelegraph(tx, tz, aoeRad, windup, false, 0, 0, () => {
              enemy.telegraphing = false;
              enemy.hasAttackToken = false;
              enemy.skillCooldown = cooldownAfter;
              if (enemy.fainted || enemy.removed) return;
              this.spawnShockwaveRing(tx, tz, aoeRad, '#F43F5E');
              this.spawnParticleBurst(tx, 0.8, tz, '#F43F5E', 24, 6.2);
              this.trauma = Math.min(1, this.trauma + 0.45);
              for (const ally of this.allies) {
                if (!ally.fainted && Math.hypot(ally.x - tx, ally.z - tz) <= aoeRad + 0.4) {
                  this.applyDamageToActor(ally, Math.round(enemy.atk * 1.65), enemy, true, false, '#F43F5E');
                }
              }
              if (phase >= 2) {
                const fanHalf = phase === 3 ? 2 : 1;
                for (let k = -fanHalf; k <= fanHalf; k++) {
                  const baseAng = Math.atan2(tx - enemy.x, tz - enemy.z) + k * 0.42;
                  this.spawnProjectile({
                    x: enemy.x,
                    y: 0.9,
                    z: enemy.z,
                    vx: Math.sin(baseAng) * 8.6,
                    vz: Math.cos(baseAng) * 8.6,
                    radius: 0.38,
                    life: 1.8,
                    fromAlly: false,
                    damage: Math.round(enemy.atk * 0.92),
                    elementColor: phase === 3 ? '#F4B942' : '#F43F5E',
                    aoeRadius: 1.2,
                    isCrit: false,
                    casterUnit: enemy,
                  });
                }
              }
            });
          } else if (pattern === 1) {
            // Pattern 1: Double Cross Line Charge (2 perpendicular red sight-lines!)
            const dirX = dx / dist;
            const dirZ = dz / dist;
            const perpX = -dirZ;
            const perpZ = dirX;
            const chargeLen = 8.4;
            const windup = phase === 3 ? 0.68 : 0.78;
            const bx = enemy.x;
            const bz = enemy.z;
            // Secondary cross beam visual + damage
            this.spawnEnemyTelegraph(bx, bz, chargeLen * 0.75, windup, true, perpX, perpZ, () => {
              if (enemy.fainted || enemy.removed) return;
              this.spawnParticleBurst(bx + perpX * 4, 0.7, bz + perpZ * 4, '#F4B942', 12, 4.8);
              for (const ally of this.allies) {
                if (ally.fainted) continue;
                const relX = ally.x - bx;
                const relZ = ally.z - bz;
                const proj = relX * perpX + relZ * perpZ;
                const side = Math.abs(relX * dirX + relZ * dirZ);
                if (proj >= -0.6 && proj <= chargeLen * 0.75 + 0.6 && side <= 1.35) {
                  this.applyDamageToActor(ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F4B942');
                }
              }
            });
            // Primary forward boss dash
            this.spawnEnemyTelegraph(bx, bz, chargeLen, windup, true, dirX, dirZ, () => {
              enemy.telegraphing = false;
              enemy.hasAttackToken = false;
              enemy.skillCooldown = cooldownAfter;
              if (enemy.fainted || enemy.removed) return;
              const startX = enemy.x;
              const startZ = enemy.z;
              enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
              enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
              this.spawnParticleBurst(enemy.x, 0.8, enemy.z, '#F43F5E', 22, 6.0);
              this.trauma = Math.min(1, this.trauma + 0.4);
              for (const ally of this.allies) {
                if (ally.fainted) continue;
                const relX = ally.x - startX;
                const relZ = ally.z - startZ;
                const proj = relX * dirX + relZ * dirZ;
                const side = Math.abs(relX * -dirZ + relZ * dirX);
                if (proj >= -0.5 && proj <= chargeLen + 0.8 && side <= 1.65) {
                  this.applyDamageToActor(ally, Math.round(enemy.atk * 1.6), enemy, true, false, '#F43F5E');
                }
              }
            });
          } else if (pattern === 2) {
            // Pattern 2: Sequential Meteor Volley (3 staggered impact circles on squad!)
            const living = this.allies.filter((a) => !a.fainted);
            const meteorCount = phase === 3 ? 4 : 3;
            for (let m = 0; m < meteorCount; m++) {
              const focus = living[m % Math.max(1, living.length)] ?? target;
              const mx = THREE.MathUtils.clamp(focus.x + (Math.random() - 0.5) * 1.8, -ARENA_BOUND + 1, ARENA_BOUND - 1);
              const mz = THREE.MathUtils.clamp(focus.z + (Math.random() - 0.5) * 1.8, -ARENA_BOUND + 1, ARENA_BOUND - 1);
              const isLast = m === meteorCount - 1;
              const meteorRad = 2.6;
              this.spawnEnemyTelegraph(mx, mz, meteorRad, 0.68 + m * 0.34, false, 0, 0, () => {
                if (isLast) {
                  enemy.telegraphing = false;
                  enemy.hasAttackToken = false;
                  enemy.skillCooldown = cooldownAfter;
                }
                if (enemy.fainted || enemy.removed) return;
                this.spawnShockwaveRing(mx, mz, meteorRad, '#F97316');
                this.spawnParticleBurst(mx, 0.8, mz, '#F97316', 18, 5.6);
                this.trauma = Math.min(1, this.trauma + 0.25);
                for (const ally of this.allies) {
                  if (!ally.fainted && Math.hypot(ally.x - mx, ally.z - mz) <= meteorRad + 0.35) {
                    this.applyDamageToActor(ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F97316');
                  }
                }
              });
            }
          } else if (pattern === 3) {
            // Anneau (kit Givre à l'origine) : couronne autour du boss, habillée par le thème du kit.
            // Zone sûre = au contact du boss. En phase 2+, un contrecoup central oblige à ressortir.
            const ringTheme = kitDef.ring ?? DEFAULT_RING_THEME;
            const ringSound = (): void => {
              if (ringTheme.sound === 'frost') soundFx.playFrostCrack();
              else soundFx.playHit(true, false);
            };
            const inner = FROST_KIT.safeRadius;
            const outer = FROST_KIT.ringRadius[phase - 1];
            const windup = FROST_KIT.ringWindup[phase - 1];
            const bx = enemy.x;
            const bz = enemy.z;
            const hasFollowUp = phase >= 2;
            this.bannerText = ringTheme.label;
            this.bannerTimer = 1.4;
            this.spawnEnemyTelegraph(
              bx,
              bz,
              outer,
              windup,
              false,
              0,
              0,
              () => {
                if (!hasFollowUp) {
                  enemy.telegraphing = false;
                  enemy.hasAttackToken = false;
                  enemy.skillCooldown = cooldownAfter;
                }
                if (enemy.fainted || enemy.removed) return;
                ringSound();
                this.spawnShockwaveRing(bx, bz, outer, ringTheme.burstColor);
                this.spawnElementBurst(bx, 0.6, bz, ringTheme.fx, 26, 1.7);
                this.trauma = Math.min(1, this.trauma + 0.4);
                for (const ally of this.allies) {
                  if (ally.fainted) continue;
                  const d = Math.hypot(ally.x - bx, ally.z - bz);
                  if (d >= inner && d <= outer + 0.4) {
                    const exposed = ally.invulnTimer <= 0;
                    this.applyDamageToActor(ally, Math.round(enemy.atk * FROST_KIT.ringDamage), enemy, true, false, ringTheme.burstColor);
                    if (exposed && !ally.fainted) {
                      for (const status of ringTheme.statuses[phase === 1 ? 0 : 1]) {
                        this.applyStatusToActor(ally, status, enemy.atk);
                      }
                    }
                  }
                }
                if (hasFollowUp) {
                  this.bannerText = 'Contrecoup — éloignez-vous !';
                  this.bannerTimer = 1.0;
                  this.spawnEnemyTelegraph(
                    bx,
                    bz,
                    inner + FROST_KIT.aftershockMargin,
                    FROST_KIT.aftershockWindup,
                    false,
                    0,
                    0,
                    () => {
                      enemy.telegraphing = false;
                      enemy.hasAttackToken = false;
                      enemy.skillCooldown = cooldownAfter;
                      if (enemy.fainted || enemy.removed) return;
                      ringSound();
                      this.spawnShockwaveRing(bx, bz, inner + FROST_KIT.aftershockMargin, ringTheme.aftershockColor);
                      this.spawnElementBurst(bx, 0.6, bz, 'rock', 16, 1.3);
                      this.trauma = Math.min(1, this.trauma + 0.3);
                      for (const ally of this.allies) {
                        if (
                          !ally.fainted &&
                          Math.hypot(ally.x - bx, ally.z - bz) <= inner + FROST_KIT.aftershockMargin + 0.4
                        ) {
                          this.applyDamageToActor(ally, Math.round(enemy.atk * FROST_KIT.aftershockDamage), enemy, true, false, ringTheme.aftershockColor);
                        }
                      }
                      if (phase === 3) {
                        // Phase 3 : éclats en étoile
                        for (let k = 0; k < FROST_KIT.shardCount; k++) {
                          const shardAng = (k / FROST_KIT.shardCount) * Math.PI * 2 + 0.3;
                          this.spawnProjectile({
                            x: bx,
                            y: 0.9,
                            z: bz,
                            vx: Math.sin(shardAng) * 7.4,
                            vz: Math.cos(shardAng) * 7.4,
                            radius: 0.36,
                            life: 1.7,
                            fromAlly: false,
                            damage: Math.round(enemy.atk * FROST_KIT.shardDamage),
                            elementColor: ringTheme.shardColor,
                            aoeRadius: 1.1,
                            isCrit: false,
                            casterUnit: enemy,
                          });
                        }
                      }
                    },
                    { color: ringTheme.telegraphColor },
                  );
                }
              },
              { innerRadius: inner, color: ringTheme.telegraphColor },
            );
          } else if (pattern === 4) {
            // Rafale en ligne (kit Orage à l'origine) : les impacts « marchent » du boss vers sa cible.
            // On l'évite en sortant de la ligne.
            const strikeTheme = kitDef.strike ?? DEFAULT_STRIKE_THEME;
            const dirX = dx / dist;
            const dirZ = dz / dist;
            const strikes = STORM_KIT.strikeCount[phase - 1];
            const strikeRad = STORM_KIT.strikeRadius;
            const bx = enemy.x;
            const bz = enemy.z;
            // Les cercles se chevauchent : chaque allié n'encaisse qu'UN impact par rafale
            const struck = new Set<string>();
            this.bannerText = strikeTheme.label;
            this.bannerTimer = 1.4;
            soundFx.playTelegraph();
            for (let k = 0; k < strikes; k++) {
              const sx = THREE.MathUtils.clamp(bx + dirX * (2.4 + k * 2.3), -ARENA_BOUND, ARENA_BOUND);
              const sz = THREE.MathUtils.clamp(bz + dirZ * (2.4 + k * 2.3), -ARENA_BOUND, ARENA_BOUND);
              const isLast = k === strikes - 1;
              this.spawnEnemyTelegraph(
                sx,
                sz,
                strikeRad,
                STORM_KIT.strikeFirstDelay + k * STORM_KIT.strikeInterval,
                false,
                0,
                0,
                () => {
                  if (isLast) {
                    enemy.telegraphing = false;
                    enemy.hasAttackToken = false;
                    enemy.skillCooldown = cooldownAfter;
                  }
                  if (enemy.fainted || enemy.removed) return;
                  if (strikeTheme.lightning) {
                    this.spawnBolt(sx, sz);
                    if (k % 3 === 0) soundFx.playThunder();
                  } else if (k % 3 === 0) {
                    soundFx.playHit(true, false);
                  }
                  this.spawnElementBurst(sx, 0.5, sz, strikeTheme.fx, 10, 1.2);
                  this.trauma = Math.min(1, this.trauma + 0.14);
                  for (const ally of this.allies) {
                    if (
                      !ally.fainted &&
                      !struck.has(ally.id) &&
                      Math.hypot(ally.x - sx, ally.z - sz) <= strikeRad + 0.35
                    ) {
                      const exposed = ally.invulnTimer <= 0;
                      if (exposed) struck.add(ally.id);
                      this.applyDamageToActor(ally, Math.round(enemy.atk * STORM_KIT.strikeDamage), enemy, true, false, strikeTheme.color);
                      if (exposed && !ally.fainted) this.applyStatusToActor(ally, strikeTheme.status, enemy.atk);
                    }
                  }
                },
                { color: strikeTheme.color, silent: true },
              );
            }
          } else {
            // Aspiration puis détonation (kit Orage à l'origine) : l'escouade est tirée vers le boss.
            // Réponse attendue : Dispersion (qui annule l'aspiration) pour sortir du cercle.
            const eyeTheme = kitDef.eye ?? DEFAULT_EYE_THEME;
            const eyeRad = STORM_KIT.eyeRadius[phase - 1];
            const windup = STORM_KIT.eyeWindup[phase - 1];
            const bx = enemy.x;
            const bz = enemy.z;
            enemy.pullTimer = windup;
            this.bannerText = eyeTheme.label;
            this.bannerTimer = 1.5;
            this.spawnEnemyTelegraph(
              bx,
              bz,
              eyeRad,
              windup,
              false,
              0,
              0,
              () => {
                enemy.telegraphing = false;
                enemy.hasAttackToken = false;
                enemy.skillCooldown = cooldownAfter;
                enemy.pullTimer = 0;
                if (enemy.fainted || enemy.removed) return;
                if (eyeTheme.lightning) {
                  this.spawnBolt(bx, bz, 14);
                  soundFx.playThunder();
                } else {
                  soundFx.playHit(true, false);
                }
                this.spawnShockwaveRing(bx, bz, eyeRad, eyeTheme.color);
                this.spawnElementBurst(bx, 0.8, bz, eyeTheme.fx, 30, 1.5);
                this.trauma = Math.min(1, this.trauma + 0.5);
                for (const ally of this.allies) {
                  if (!ally.fainted && Math.hypot(ally.x - bx, ally.z - bz) <= eyeRad + 0.4) {
                    const exposed = ally.invulnTimer <= 0;
                    this.applyDamageToActor(ally, Math.round(enemy.atk * STORM_KIT.eyeDamage), enemy, true, false, eyeTheme.color);
                    if (exposed && !ally.fainted) this.applyStatusToActor(ally, eyeTheme.status, enemy.atk);
                  }
                }
              },
              { color: eyeTheme.color },
            );
          }
        } else if (dist > 3.1) {
          enemy.x += (dx / dist) * enemySpeed * simDt;
          enemy.z += (dz / dist) * enemySpeed * simDt;
          enemy.walkPhase += enemySpeed * simDt * 3.0;
          moved = true;
        } else if (enemy.basicCooldown <= 0) {
          enemy.basicCooldown = phase >= 2 ? 1.25 : 1.7;
          enemy.squashY = 1.22;
          if (!confusedMiss) {
            this.applyDamageToActor(target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
          }
        }
      } else {
        // Chaser / Swarmer
        if (dist > 2.2) {
          enemy.x += (dx / dist) * enemySpeed * simDt;
          enemy.z += (dz / dist) * enemySpeed * simDt;
          enemy.walkPhase += enemySpeed * simDt * 3.6;
          moved = true;
        } else if (enemy.basicCooldown <= 0) {
          enemy.basicCooldown = 1.55;
          enemy.squashY = 1.18;
          if (!confusedMiss) {
            this.applyDamageToActor(target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
          }
        }
      }

      this.animateRigPose(enemy.rig, enemy.walkPhase, moved, enemy.squashY, this.elapsedTotal);
    }

    if (this.bossIntroActor && this.bossDropY > 0) {
      this.bossIntroActor.rig.root.position.y = this.bossDropY;
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= simDt;
      p.x += p.vx * simDt;
      p.z += p.vz * simDt;
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += dt * 7;
      p.mesh.rotation.x += dt * 5;

      const targets = p.fromAlly ? this.enemies : this.allies;
      let hit = false;
      for (const t of targets) {
        if (t.fainted || t.removed) continue;
        const hitRadius = p.radius + (t.isBoss ? 1.2 : 0.72);
        if (Math.hypot(t.x - p.x, t.z - p.z) <= hitRadius) {
          hit = true;
          break;
        }
      }

      if (hit || p.life <= 0) {
        if (hit) {
          for (const t of targets) {
            if (t.fainted || t.removed) continue;
            if (Math.hypot(t.x - p.x, t.z - p.z) <= p.aoeRadius + (t.isBoss ? 1.0 : 0.45)) {
              this.applyDamageToActor(
                t,
                p.damage,
                p.casterUnit,
                p.aoeRadius > 1.5,
                p.isCrit,
                p.elementColor,
                p.elementType,
                Boolean(p.isSkill),
              );
            }
          }
          if (p.aoeRadius > 1.5) {
            this.spawnShockwaveRing(p.x, p.z, p.aoeRadius, p.elementColor);
          }
        }
        this.fxGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }

    // Update ground telegraphs & shockwaves
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      tg.elapsed += simDt;
      const ratio = Math.min(1, tg.elapsed / tg.duration);
      const mat = tg.mesh.material as THREE.MeshBasicMaterial;
      if (tg.duration <= 0.3) {
        // Expanding shockwave ring
        tg.mesh.scale.setScalar(0.5 + ratio * 0.7);
        mat.opacity = (1 - ratio) * 0.75;
      } else {
        // Enemy attack windup telegraph pulsing brighter as impact approaches
        mat.opacity = 0.22 + ratio * 0.42;
      }
      if (tg.elapsed >= tg.duration) {
        this.fxGroup.remove(tg.mesh);
        tg.mesh.geometry.dispose();
        mat.dispose();
        this.telegraphs.splice(i, 1);
        tg.onComplete();
      }
    }

    // Check Defeat (all 3 allies fainted simultaneously)
    const livingAllies = this.allies.filter((a) => !a.fainted);
    if (livingAllies.length === 0) {
      this.expeditionEnded = true;
      this.pendingVictory = false;
      this.endDelayTimer = 0.65;
      this.bannerText = 'Escouade K.O. ! Repli au camp...';
      this.bannerTimer = 1.5;
      soundFx.playDefeat();
      this.emitHudSnapshot();
      return;
    }

    // Check Wave Clear / Victory
    const livingEnemies = this.enemies.filter((e) => !e.fainted && !e.removed);
    if (livingEnemies.length === 0) {
      if (this.waveIndex + 1 < this.activeStage.waves.length) {
        this.waveSpawnDelay += simDt;
        if (this.waveSpawnDelay >= 1.1) {
          this.waveSpawnDelay = 0;
          this.spawnWave(this.waveIndex + 1);
        }
      } else {
        this.expeditionEnded = true;
        this.pendingVictory = true;
        this.endDelayTimer = 1.7; // le temps de fêter ça : sauts de joie + confettis
        this.confettiTimer = 0;
        this.bannerText = 'VICTOIRE ! Expédition réussie !';
        this.bannerTimer = 2.0;
        soundFx.playFanfare();
        this.emitHudSnapshot();
      }
    }

    // Throttled React HUD snapshot (<= 10Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private updateActorCommon(actor: CombatActor, dt: number, simDt: number): void {
    // Knockback velocity decay
    if (Math.hypot(actor.vx, actor.vz) > 0.05) {
      actor.x = THREE.MathUtils.clamp(actor.x + actor.vx * simDt, -ARENA_BOUND, ARENA_BOUND);
      actor.z = THREE.MathUtils.clamp(actor.z + actor.vz * simDt, -ARENA_BOUND, ARENA_BOUND);
      const decay = Math.exp(-8.5 * simDt);
      actor.vx *= decay;
      actor.vz *= decay;
    }

    actor.basicCooldown = Math.max(0, actor.basicCooldown - simDt);
    actor.skillCooldown = Math.max(0, actor.skillCooldown - simDt);
    actor.buffTimer = Math.max(0, actor.buffTimer - simDt);
    actor.invulnTimer = Math.max(0, actor.invulnTimer - simDt);
    actor.stunTimer = Math.max(0, actor.stunTimer - simDt);
    actor.squashY = THREE.MathUtils.damp(actor.squashY, 1, 12, dt);

    // Tick elemental statuses & Burn DoT
    if (!actor.fainted && !actor.removed && simDt > 0) {
      const keys = Object.keys(actor.statuses) as StatusKind[];
      for (const k of keys) {
        const inst = actor.statuses[k];
        if (!inst) continue;
        inst.remaining -= simDt;
        if (k === 'burn') {
          inst.tickTimer -= simDt;
          if (inst.tickTimer <= 0) {
            inst.tickTimer = 1.0;
            const burnDmg = Math.max(6, Math.round(inst.sourceAtk * 0.22));
            actor.hp = Math.max(1, actor.hp - burnDmg);
            this.spawnParticleBurst(actor.x, 1.0, actor.z, STATUS_META.burn.color, 4, 2.2);
            this.floatingText.spawn(actor.x, 1.9, actor.z, `${burnDmg}`, STATUS_META.burn.color, 0.78, 0.65);
            if (!actor.isAlly) this.damageDealt += burnDmg;
          }
        }
        if (inst.remaining <= 0) {
          delete actor.statuses[k];
        }
      }
    }

    // Hit flash emissive highlight & Boss phase rage aura
    if (actor.flashTimer > 0) {
      actor.flashTimer = Math.max(0, actor.flashTimer - dt);
      const white = actor.flashTimer > 0;
      actor.rig.flashMaterials.forEach((m, idx) => {
        if (white) {
          m.emissive.set('#FFFFFF');
          m.emissiveIntensity = 0.85;
        } else if (actor.isBoss && actor.bossPhase >= 2) {
          m.emissive.set(actor.bossPhase === 3 ? '#F4B942' : '#F43F5E');
          m.emissiveIntensity = 0.34;
        } else {
          m.emissive.copy(actor.rig.baseEmissives[idx]);
          m.emissiveIntensity = actor.buffTimer > 0 ? 0.35 : 0.15;
        }
      });
    } else if (actor.isBoss && actor.bossPhase >= 2) {
      const pulse = 0.28 + Math.sin(this.elapsedTotal * 5.2) * 0.1;
      actor.rig.flashMaterials.forEach((m) => {
        m.emissive.set(actor.bossPhase === 3 ? '#F4B942' : '#F43F5E');
        m.emissiveIntensity = pulse;
      });
    }

    actor.rig.root.position.set(actor.x, 0, actor.z);
    actor.rig.root.rotation.y = actor.facing;

    // Update world-space HP bar orientation & fill scale (world-space lookAt ignores parent yaw)
    if (actor.rig.hpBarBg && actor.rig.hpBarFill) {
      actor.rig.hpBarBg.visible = !actor.fainted;
      actor.rig.hpBarBg.lookAt(this.camera.position);
      const ratio = Math.max(0.001, actor.hp / Math.max(1, actor.maxHp));
      actor.rig.hpBarFill.scale.x = ratio;
    }
  }

  private animateRigPose(
    rig: VoxelCreatureRig,
    walkPhase: number,
    isMoving: boolean,
    squashY: number,
    elapsed: number,
  ): void {
    const arch = rig.species.archetype;
    // Déphasage par créature : personne ne respire ni ne se balance à l'unisson
    const seed = rig.root.id * 1.37;
    const hopAmp = arch === 'serpentine' ? 0.08 : 0.24;
    const hop = isMoving ? Math.abs(Math.sin(walkPhase)) * hopAmp : Math.sin(elapsed * 2.8 + seed) * 0.04;
    const hover = isHoverArchetype(arch) ? 0.16 + Math.sin(elapsed * 3.5 + seed) * 0.12 : 0;
    rig.bodyPivot.position.y = hop + hover;

    // Idle : respiration + regard qui se promène quand la créature est à l'arrêt
    const breath = isMoving ? 0 : Math.sin(elapsed * 2.1 + seed) * 0.022;
    const sy = squashY * (1 + breath);
    const invXZ = 1 / Math.sqrt(Math.max(0.5, sy));
    rig.bodyPivot.scale.set(invXZ, sy, invXZ);
    rig.bodyPivot.rotation.y = isMoving ? 0 : Math.sin(elapsed * 0.7 + seed) * 0.16;
    rig.bodyPivot.rotation.x = isMoving ? 0 : Math.sin(elapsed * 1.3 + seed * 0.7) * 0.025;

    // Leg gait sync (les bras du golem font partie de la démarche)
    rig.legs.forEach((leg, idx) => {
      const sign = idx % 2 === 0 ? 1 : -1;
      leg.rotation.x = isMoving ? Math.sin(walkPhase) * 0.45 * sign : 0;
    });

    // Wings / orbiting psychic cubes / tail wag / antlers / body segments / rain strands
    rig.extras.forEach((extra, idx) => {
      switch (arch) {
        case 'floating':
          extra.rotation.y = elapsed * 2.2;
          break;
        case 'winged':
          if (idx < 2) {
            const dir = idx === 0 ? 1 : -1;
            extra.rotation.z = Math.sin(elapsed * 7.5) * 0.32 * dir;
          } else {
            extra.rotation.y = Math.sin(elapsed * 5.2 + idx) * 0.25;
          }
          break;
        case 'fungal':
          if (idx === 0) {
            // le chapeau dodeline
            extra.rotation.z = Math.sin(elapsed * 2.2 + seed) * 0.06;
            extra.rotation.x = Math.sin(elapsed * 1.7 + seed) * 0.04;
          } else {
            extra.rotation.y = elapsed * 1.1; // spores en orbite
          }
          break;
        case 'antlered':
          extra.rotation.z = Math.sin(elapsed * 1.6 + seed + idx) * 0.05;
          break;
        case 'crab':
          // les pinces s'ouvrent et se referment en alternance
          extra.rotation.x = Math.sin(elapsed * 3.2 + seed + idx * Math.PI) * 0.16;
          break;
        case 'golem':
          extra.rotation.y = Math.sin(elapsed * 0.9 + seed) * 0.08;
          break;
        case 'lizard':
          if (idx === 0) {
            extra.rotation.y = Math.sin(elapsed * 3 + seed) * 0.35; // la queue balaie
          } else {
            extra.scale.y = 1 + Math.sin(elapsed * 9 + idx * 1.7 + seed) * 0.18; // la crête vacille
          }
          break;
        case 'serpentine': {
          // ondulation qui se propage de la tête vers la queue
          const wave = elapsed * (isMoving ? 9 : 4) + seed - idx * 0.85;
          extra.position.x = Math.sin(wave) * 0.07 * Math.min(4, idx + 1);
          extra.rotation.y = Math.cos(wave) * 0.22;
          break;
        }
        case 'jelly':
          extra.rotation.x = Math.sin(elapsed * 2.4 + idx * 1.3 + seed) * 0.3;
          extra.rotation.z = Math.cos(elapsed * 2.0 + idx) * 0.22;
          break;
        default:
          extra.rotation.y = Math.sin(elapsed * 5.2 + idx) * 0.25;
      }
    });
  }
  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= p.gravity * dt;
      if (p.drag > 0) {
        const damp = Math.exp(-p.drag * dt);
        p.vx *= damp;
        p.vz *= damp;
        if (p.gravity === 0) p.vy *= damp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < 0.08) {
        p.y = 0.08;
        if (p.bounce > 0 && p.vy < 0) p.vy = -p.vy * p.bounce;
      }
      p.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      const s = p.size * ratio;
      _dummy.position.set(p.x, p.y, p.z);
      if (p.stretchY > 1.5) {
        // gouttes / étincelles : alignées sur leur trajectoire au lieu de tournoyer
        _dummy.rotation.set(0, p.life * 3, Math.atan2(p.vx, Math.abs(p.vy) + 0.5) * -0.6);
      } else {
        _dummy.rotation.set(p.life * 6, p.life * 4, 0);
      }
      _dummy.scale.set(s, s * p.stretchY, s);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.set(p.colorHex));
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private updateWeather(dt: number): void {
    const kind = this.weatherKind;
    const isRain = kind === 'rain';
    const sway = isRain ? 0.15 : kind === 'snow' ? 0.9 : 0.65;

    for (let i = 0; i < this.weatherCount; i++) {
      const m = this.weatherMotes[i];
      if (!m) continue;
      m.phase += dt * (kind === 'float' ? 1.8 : 2.6);
      m.x += (m.vx + Math.sin(m.phase) * sway) * dt;
      m.y += m.vy * dt;
      m.z += (m.vz + Math.cos(m.phase * 0.8) * (isRain ? 0.15 : 0.55)) * dt;

      // Wrap seamlessly inside biome volume
      if (kind === 'rise') {
        if (m.y > 14) {
          m.y = 0.5;
          m.x = (Math.random() - 0.5) * 34;
          m.z = (Math.random() - 0.5) * 34;
        }
      } else if (kind === 'float') {
        if (m.y > 15 || m.y < 1.2) {
          m.vy *= -1;
        }
      } else if (m.y < 0.3) {
        m.y = 11 + Math.random() * 6;
        m.x = (Math.random() - 0.5) * 36;
        m.z = (Math.random() - 0.5) * 36;
      }

      if (m.x > 20) m.x = -20;
      else if (m.x < -20) m.x = 20;
      if (m.z > 20) m.z = -20;
      else if (m.z < -20) m.z = 20;

      _dummy.position.set(m.x, m.y, m.z);
      if (isRain) {
        _dummy.rotation.set(0, 0, m.vx < -4 ? 0.3 : 0.12);
      } else {
        _dummy.rotation.set(m.phase * 0.7, m.phase * 0.9, 0);
      }
      _dummy.scale.set(m.sizeX, m.sizeY, m.sizeZ);
      _dummy.updateMatrix();
      this.weatherMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.weatherMesh.instanceMatrix.needsUpdate = true;
  }
  private updateCamera(dt: number): void {
    if (this.screenState === 'title') {
      // Atmospheric isometric diorama orbit with upper sky negative space for the Title Lockup
      const ang = this.elapsedTotal * 0.16 + 0.52;
      _vecA.set(Math.sin(ang) * 21.5, 9.6, Math.cos(ang) * 21.5);
      _vecB.set(0.4, 2.5, -1.2);
    } else if (this.playMode === 'camp') {
      if (this.evo) {
        // Gros plan sur la créature qui évolue
        _vecA.set(EVO_X + 1.6, 2.9, EVO_Z + 5.4);
        _vecB.set(EVO_X, 1.2, EVO_Z);
      } else {
        // Scenic Base Camp diorama showing island shoreline, waystone, cauldron & roaming squad
        _vecA.set(0.6, 11.4, 20.5);
        _vecB.set(0.4, 1.4, -1.2);
      }
    } else if (this.bossIntroTimer > 0 && this.bossIntroActor) {
      // Entrée de boss : la caméra plonge sur lui
      _vecA.set(this.bossIntroActor.x - 1.5, 6.6, this.bossIntroActor.z + 10.5);
      _vecB.set(this.bossIntroActor.x, 1.9, this.bossIntroActor.z);
    } else {
      // Expedition tactical isometric follow camera centered on living squad + slight enemy lead
      let sx = 0;
      let sz = 0;
      let count = 0;
      for (const a of this.allies) {
        if (!a.fainted) {
          sx += a.x;
          sz += a.z;
          count += 1;
        }
      }
      if (count > 0) {
        sx /= count;
        sz /= count;
      }
      const nearestEnemy = this.findNearestLiving(sx, sz, this.enemies);
      const focusX = nearestEnemy ? sx * 0.72 + nearestEnemy.x * 0.28 : sx;
      const focusZ = nearestEnemy ? sz * 0.72 + nearestEnemy.z * 0.28 : sz;

      if (this.pendingVictory && (this.expeditionEnded || this.resultSent)) {
        // Victoire : la caméra se rapproche de l'escouade en fête
        _vecA.set(sx, 10.2, sz + 11.5);
        _vecB.set(sx, 1.0, sz);
      } else {
        _vecA.set(focusX, 15.8, focusZ + 16.5);
        _vecB.set(focusX, 0.7, focusZ);
      }
    }

    const alpha = 1 - Math.exp(-5.5 * dt);
    this.camPos.lerp(_vecA, alpha);
    this.camLook.lerp(_vecB, alpha);

    // Trauma-squared decaying camera shake
    _vecC.set(0, 0, 0);
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.9);
      if (this.shakeEnabled) {
        const shake = this.trauma * this.trauma * 0.5;
        _vecC.set(
          (Math.random() - 0.5) * 2 * shake,
          (Math.random() - 0.5) * 2 * shake,
          0,
        );
      }
    }

    this.camera.position.copy(this.camPos).add(_vecC);
    this.camera.lookAt(this.camLook);
  }

  private emitHudSnapshot(): void {
    if (!this.activeStage || this.playMode !== 'expedition') return;
    const biome = BIOMES[this.activeStage.biomeId];
    const boss = this.enemies.find((e) => e.isBoss && !e.removed);
    const livingEnemies = this.enemies.filter((e) => !e.fainted && !e.removed).length;

    const snapshot: ExpeditionHudSnapshot = {
      stageId: this.activeStage.id,
      stageName: this.activeStage.name,
      biomeName: biome.name,
      waveIndex: this.waveIndex,
      totalWaves: this.activeStage.waves.length,
      elapsedSec: this.expeditionElapsed,
      scatterCooldown: this.scatterCooldown,
      scatterMaxCooldown: this.scatterMaxCooldown,
      ultimateCharge: Math.round(this.ultimateCharge),
      comboCount: this.comboCount,
      comboTimer: this.comboTimer,
      lastReactionLabel: this.lastReactionLabel,
      lastReactionColor: this.lastReactionColor,
      controlMode: this.controlMode,
      enemiesRemaining: livingEnemies,
      damageDealt: this.damageDealt,
      bannerText: this.bannerText,
      bossIntro: this.bossIntroTimer > 0 ? this.bossIntroInfo : null,
      boss: boss
        ? {
            name: boss.name,
            element: boss.rig.species.element,
            hp: boss.hp,
            maxHp: boss.maxHp,
            phase: boss.bossPhase,
            maxPhases: boss.bossMaxPhases,
            telegraphing: boss.telegraphing,
            statuses: Object.keys(boss.statuses) as StatusKind[],
          }
        : null,
      units: this.allies.map((a) => {
        const move = MOVES[a.moveId] ?? MOVES.ember_burst;
        return {
          uid: a.id,
          speciesId: a.speciesId,
          name: a.name,
          element: a.rig.species.element,
          level: a.level,
          hp: a.hp,
          maxHp: a.maxHp,
          shieldHp: Math.round(a.shieldHp),
          fainted: a.fainted,
          reviveTimer: a.reviveTimer,
          moveName: move.name,
          moveElement: move.element,
          moveCooldown: a.skillCooldown,
          moveMaxCooldown: a.skillMaxCooldown,
          buffActive: a.buffTimer > 0,
          statuses: Object.keys(a.statuses) as StatusKind[],
        };
      }),
    };
    this.callbacks.onHudUpdate(snapshot);
  }

  public dispose(): void {
    this.disposed = true;
    if (!this.headless) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.resizeObserver?.disconnect();
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    this.clearProjectilesAndTelegraphs();
    this.clearGroup(this.worldGroup);
    this.clearGroup(this.actorsGroup);
    this.floatingText.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.particleMesh.dispose();
    this.weatherMesh.geometry.dispose();
    (this.weatherMesh.material as THREE.Material).dispose();
    this.weatherMesh.dispose();
    this.boltGeo?.dispose();
    this.boltMat?.dispose();
    this.renderer?.dispose();
  }
}
