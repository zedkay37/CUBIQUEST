/**
 * Façade du moteur temps réel : état partagé, construction de la scène, API publique appelée par App.tsx.
 *
 * La logique vit dans les modules de ./engine, sous forme de fonctions qui reçoivent le moteur (`self`)
 * en premier argument. Les champs ci-dessous sont donc publics pour ces modules ; l'interface React
 * et les outils ne doivent utiliser que les méthodes publiques. Carte des modules : voir CLAUDE.md.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundFx } from './audio';
import { configureWeather } from './engine/atmosphere';
import { fovForAspect, handleResize } from './engine/camera';
import { clearGroup, loadCampScene, setPotVisual } from './engine/camp';
import { _color, _dummy, BOLT_POOL_SIZE, PARTICLE_POOL_SIZE, WEATHER_COUNT } from './engine/constants';
import { playEvolutionSequence } from './engine/evolution';
import { createCubeMeshes } from './engine/cubeFx';
import { DODGE_KIT, TELEGRAPH_KIT } from './balance';
import { getNextHazardImpact, keepOutOfHazards } from './engine/fx';
import type { CastContext } from './engine/cubes';
import { emptyTelemetry, startExpedition } from './engine/expedition';
import { clearProjectilesAndTelegraphs, spawnParticleBurst } from './engine/fx';
import { getDebugStats, type EngineDebugStats } from './engine/debug';
import { emitHudSnapshot } from './engine/hud';
import { advance, detectSoftwareGl, scheduleNextFrame } from './engine/loop';
import { triggerAllySkill, triggerDodge, triggerUltimate } from './engine/skills';
import type {
  ActiveProjectile,
  CampWanderer,
  CombatActor,
  CombatTelemetry,
  EngineCallbacks,
  EngineOptions,
  EvolutionSequence,
  GroundTelegraph,
  ParticleSlot,
  WeatherKind,
  WeatherMote,
} from './engine/types';
import type {
  BiomeId,
  ControlMode,
  ElementType,
  OwnedCreature,
  PlayMode,
  PowerStone,
  StageDef,
} from './types';
import { FloatingTextPool } from './voxelModels';

export type { EngineDebugStats } from './engine/debug';
export type { CombatTelemetry, EngineCallbacks, EngineOptions, FirstTimeKind } from './engine/types';
export type { SkillPreview } from './engine/cubes';
import { getSkillPreview, type SkillPreview } from './engine/cubes';
import type { FirstTimeKind } from './engine/types';

export class VoxelEngine {
  container: HTMLElement | null;
  headless: boolean;
  cubesEnabled: boolean;
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  isSoftwareGl: boolean;

  frameId = 0;
  disposed = false;
  lastTimeMs = 0;
  elapsedTotal = 0;
  // Diagnostic (`?debug=1`) : images affichées et temps de calcul de la dernière
  frameCount = 0;
  lastFrameMs = 0;

  // Groups
  worldGroup = new THREE.Group();
  actorsGroup = new THREE.Group();
  fxGroup = new THREE.Group();

  // Particle pool, floating text pool & biome weather
  particleMesh: THREE.InstancedMesh;
  particles: ParticleSlot[] = [];
  particleCursor = 0;
  floatingText: FloatingTextPool;
  weatherMesh: THREE.InstancedMesh;
  /** Cubes d'élément et mini-cubes de Fêlure : un maillage instancié chacun (engine/cubeFx.ts). */
  cubeMesh: THREE.InstancedMesh | null = null;
  crackMesh: THREE.InstancedMesh | null = null;
  weatherMotes: WeatherMote[] = [];
  activeBiomeId: BiomeId = 'meadow';
  waterUniform: { value: number } | null = null;
  cloudGroup: THREE.Group | null = null;
  envAnimate: ((elapsed: number) => void) | null = null;
  weatherKind: WeatherKind = 'drift';
  weatherCount = 54;

  // Éclairs (pool fixe) + flash d'orage
  bolts: { mesh: THREE.Mesh; life: number }[] = [];
  boltCursor = 0;
  boltGeo: THREE.BoxGeometry | null = null;
  boltMat: THREE.MeshBasicMaterial | null = null;
  lightningFlash = 0;
  stormTimer = 4;
  baseHemiIntensity = 0.52;

  // Moments forts : cycle jour/nuit, évolution, entrée de boss, fête de victoire
  campClock = 0.2;
  evo: EvolutionSequence | null = null;
  evoRing: THREE.Mesh | null = null;
  evoRingT = 0;
  bossIntroTimer = 0;
  bossIntroActor: CombatActor | null = null;
  bossDropY = 0;
  bossDropVel = 0;
  bossIntroInfo: { name: string; title: string; element: ElementType } | null = null;
  resultSent = false;
  /** Victoire déjà annoncée à l'interface pour ce combat (`onVictorySecured` ne part qu'une fois). */
  victorySecured = false;
  confettiTimer = 0;

  // Mode & state
  screenState: 'title' | 'playing' | 'paused' | 'gameover' = 'title';
  playMode: PlayMode = 'camp';
  controlMode: ControlMode = 'semi';

  // Camera rig
  camPos = new THREE.Vector3(0, 14, 18);
  camLook = new THREE.Vector3(0, 1, 0);
  trauma = 0;
  hitstopTimer = 0;
  shakeEnabled = true;

  // Camp props & wanderers
  potLiquidMesh: THREE.Mesh | null = null;
  potFireMesh: THREE.Mesh | null = null;
  potCookingColor: string | null = null;
  potSteamTimer = 0;
  potLight: THREE.PointLight | null = null; // lueur chaude du feu, visible la nuit
  campStars: THREE.InstancedMesh | null = null;
  campWanderers: CampWanderer[] = [];

  // Expedition runtime
  activeStage: StageDef | null = null;
  waveIndex = 0;
  expeditionElapsed = 0;
  damageDealt = 0;
  dodgeCooldown = 0;
  readonly dodgeMaxCooldown = DODGE_KIT.cooldown;
  /** Instant (temps de jeu) du dernier appui sur Esquive, et parfaite déjà accordée pour cet appui. */
  lastDodgeAt = -10;
  dodgePerfectGiven = true;
  /** Vrai pendant la résolution de l'impact d'une attaque annoncée (engine/fx.ts). */
  resolvingHazard = false;
  /** Compteurs d'esquive du combat : appuis, attaques annoncées esquivées et subies. */
  dodgesUsed = 0;
  /** Compagnons tombés pendant ce combat (étoile « Aucun K.O. »). */
  allyKos = 0;
  hazardsAvoided = 0;
  hazardHitsTaken = 0;
  /** Facteur du ralenti en cours (0,35 pour un Trio, 0,5 pour une esquive parfaite). */
  slowMoScale = 0.35;
  ultimateCharge = 0;
  /** Compteurs des cubes pour ce combat. */
  cubesPlaced = 0;
  /** Diagnostic (outils) : issues de la règle des cubes et Fêlures perdues sans Trio. */
  cubeOutcomeCounts: Record<string, number> = {};
  /** Issue de la règle des cubes pour le coup en cours (bouclier de la Carapace de magma). */
  lastCubeOutcome: string | null = null;
  cracksExpired = 0;
  /** Pas de charge de Déchaînement tant qu'il dure (après un Déchaînement). */
  ultimateLockTimer = 0;
  /** Déchaînement Eau : coups restants sur la cible, espacés (engine/skills.ts). */
  pendingUltHits: { target: CombatActor; caster: CombatActor; damage: number; remaining: number; timer: number; cast: CastContext } | null = null;
  burstsTriggered = 0;
  weakBurstsTriggered = 0;
  triosTriggered = 0;
  lastRipeSoundAt = -1;
  /** Gestes déjà signalés à l'interface pendant ce combat. */
  firstTimeSeen = new Set<string>();
  ultimatesUsed = 0;
  perfectDodges = 0;
  /** Dernier Éclat (nom, couleur), affiché brièvement en haut de l'écran. */
  lastBurstLabel: string | null = null;
  lastBurstColor: string | null = null;
  lastBurstTimer = 0;
  /** Ralenti du Trio (temps réel restant) et dernier déclenchement. */
  slowMoTimer = 0;
  lastSlowMoAt = -10;
  /** Recul de la caméra (1 = cadrage normal) quand une zone de danger sort du cadre. */
  camBackoff = 1;
  hazardHintCounts: Record<string, number> = {};
  bannerText: string | null = null;
  bannerTimer = 0;
  expeditionEnded = false;
  endDelayTimer = 0;
  pendingVictory = false;
  waveSpawnDelay = 0;

  allies: CombatActor[] = [];
  enemies: CombatActor[] = [];
  projectiles: ActiveProjectile[] = [];
  telegraphs: GroundTelegraph[] = [];

  // Input state (cleared on blur)
  heldKeys = new Set<string>();
  hudEmitAccum = 0;
  callbacks: EngineCallbacks;
  resizeObserver: ResizeObserver | null = null;
  telemetry: CombatTelemetry = emptyTelemetry();

  constructor(container: HTMLElement | null, callbacks: EngineCallbacks, options: EngineOptions = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.headless = Boolean(options.headless) || !container;
    this.cubesEnabled = options.cubes !== false;

    let width = 1280;
    let height = 720;
    if (this.headless || !container) {
      this.isSoftwareGl = true;
      this.renderer = null;
    } else {
      this.isSoftwareGl = detectSoftwareGl();

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

    this.camera = new THREE.PerspectiveCamera(fovForAspect(width / height), width / height, 0.5, 160);
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

    createCubeMeshes(this);

    // Zero-GC 3D Floating Combat Text Pool
    this.floatingText = new FloatingTextPool(this.fxGroup, 28);
    // Aucun texte flottant ne recouvre une zone de danger : il est poussé au bord de la zone
    this.floatingText.relocate = (p) => keepOutOfHazards(this, p);

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
    configureWeather(this, 'meadow');

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
      this.resizeObserver = new ResizeObserver(() => handleResize(this));
      this.resizeObserver.observe(container);

      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
      document.addEventListener('visibilitychange', this.handleVisibility);

      this.lastTimeMs = performance.now();
      scheduleNextFrame(this);
    }
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.heldKeys.add(e.code);
  };

  handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  handleBlur = (): void => {
    this.heldKeys.clear();
  };

  handleVisibility = (): void => {
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
    emitHudSnapshot(this);
  }

  public setPotVisual(recipeId: string | null, status: 'idle' | 'cooking' | 'ready'): void {
    return setPotVisual(this, recipeId, status);
  }

  public loadCampScene(
    squadCreatures: OwnedCreature[],
    potRecipeId: string | null,
    potStatus: 'idle' | 'cooking' | 'ready',
  ): void {
    return loadCampScene(this, squadCreatures, potRecipeId, potStatus);
  }

  public startExpedition(
    stage: StageDef,
    squadCreatures: OwnedCreature[],
    allStones: PowerStone[],
    controlMode: ControlMode,
  ): void {
    return startExpedition(this, stage, squadCreatures, allStones, controlMode);
  }

  /** Règle l'heure du camp (0 = aube, 0.3 = plein jour, 0.64 = crépuscule, 0.8 = nuit). */
  public setCampClock(t: number): void {
    if (Number.isFinite(t)) this.campClock = ((t % 1) + 1) % 1;
  }

  public playEvolutionSequence(
    fromSpeciesId: string,
    toSpeciesId: string,
    callbacks: { onReveal?: () => void; onDone: () => void },
  ): void {
    return playEvolutionSequence(this, fromSpeciesId, toSpeciesId, callbacks);
  }

  public triggerAllySkill(slotIndex: number): boolean {
    return triggerAllySkill(this, slotIndex);
  }

  /** Ce que ferait le sort de l'allié `slot` maintenant (lecture seule). */
  public getSkillPreview(slot: number): SkillPreview {
    return getSkillPreview(this, slot);
  }

  /** Signale un geste à l'interface, une fois par combat. */
  firstTimeEvent(kind: FirstTimeKind): void {
    if (this.firstTimeSeen.has(kind)) return;
    this.firstTimeSeen.add(kind);
    this.callbacks.onFirstTime?.(kind);
  }

  /** Combien de fois chaque consigne d'attaque a déjà été montrée (sauvegarde) ; fourni par l'interface. */
  public setHazardHintCounts(counts: Record<string, number>): void {
    this.hazardHintCounts = { ...counts };
  }

  /** Consigne écrite d'une attaque (« Collez-vous au boss ! ») : seulement les premières fois. */
  showHazardHint(key: string, text: string, seconds: number): void {
    const seen = this.hazardHintCounts[key] ?? 0;
    if (seen >= TELEGRAPH_KIT.hintShows) return;
    this.hazardHintCounts[key] = seen + 1;
    this.bannerText = text;
    this.bannerTimer = seconds;
    this.callbacks.onHazardHint?.(key);
  }

  /** Délai avant le prochain impact ennemi annoncé qui toucherait un allié là où il est, ou null. */
  public getNextHazardImpact(): number | null {
    return getNextHazardImpact(this);
  }

  public triggerDodge(): boolean {
    return triggerDodge(this);
  }

  public triggerUltimate(): boolean {
    return triggerUltimate(this);
  }

  public triggerCookBurstFx(colorHex: string): void {
    soundFx.playCookBubble();
    spawnParticleBurst(this, 0, 1.8, -1.2, colorHex, 22, 4.6);
  }

  /**
   * Avance la simulation d'un pas fixe, sans horloge ni rendu.
   * Réservé au mode headless (`npm run sim`) : en jeu, c'est `tick()` qui pilote.
   */
  public stepSimulation(dt: number): void {
    if (this.disposed) return;
    advance(this, Math.min(Math.max(dt, 0.001), 0.05));
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

  /** Mesures de rendu pour l'overlay `?debug=1` (FPS, draw calls, mémoire graphique...). */
  public getDebugStats(): EngineDebugStats {
    return getDebugStats(this);
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
    clearProjectilesAndTelegraphs(this);
    clearGroup(this, this.worldGroup);
    clearGroup(this, this.actorsGroup);
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
