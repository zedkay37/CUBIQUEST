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
import {
  BOSS_KITS,
  DEFAULT_EYE_THEME,
  DEFAULT_RING_THEME,
  DEFAULT_STRIKE_THEME,
  FROST_KIT,
  STORM_KIT,
} from './balance';
import { BIOMES, MOVES, RECIPE_BY_ID, SPECIES } from './catalog';
import {
  animateRigPose,
  applyStatusToActor,
  findNearestLiving,
  updateActorCommon,
  updateEnemyDissolve,
} from './engine/actors';
import { applyBiomeLighting, configureWeather, spawnBolt, updateDayNight } from './engine/atmosphere';
import { fovForAspect, handleResize } from './engine/camera';
import {
  _color,
  _dummy,
  ARENA_BOUND,
  BOLT_POOL_SIZE,
  BOSS_INTRO_SEC,
  EVO_CHARGE_SEC,
  EVO_TOTAL_SEC,
  EVO_X,
  EVO_Z,
  MAX_ATTACK_TOKENS,
  PARTICLE_POOL_SIZE,
  WEATHER_COUNT,
} from './engine/constants';
import { applyDamageToActor } from './engine/damage';
import {
  clearProjectilesAndTelegraphs,
  spawnConfetti,
  spawnElementBurst,
  spawnEnemyTelegraph,
  spawnParticleBurst,
  spawnProjectile,
  spawnShockwaveRing,
  spawnSteamCube,
  updateProjectiles,
  updateTelegraphs,
} from './engine/fx';
import { advance, detectSoftwareGl, scheduleNextFrame } from './engine/loop';
import { executeAllySkill, triggerAllySkill, triggerScatter, triggerUltimate } from './engine/skills';
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
import { calculateDamage, computeCreatureStats, getMoveModifiers } from './rules';
import type {
  BiomeId,
  ControlMode,
  ElementType,
  ExpeditionHudSnapshot,
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
} from './voxelModels';

export type { CombatTelemetry, EngineCallbacks, EngineOptions } from './engine/types';

export class VoxelEngine {
  container: HTMLElement | null;
  headless: boolean;
  reactionsEnabled: boolean;
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
  scatterCooldown = 0;
  readonly scatterMaxCooldown = 5.0;
  ultimateCharge = 0;
  comboCount = 0;
  comboTimer = 0;
  maxCombo = 0;
  reactionsTriggered = 0;
  ultimatesUsed = 0;
  perfectDodges = 0;
  lastReactionLabel: string | null = null;
  lastReactionColor: string | null = null;
  lastReactionTimer = 0;
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
  telemetry: CombatTelemetry = VoxelEngine.emptyTelemetry();

  static emptyTelemetry(): CombatTelemetry {
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
    this.reactionsEnabled = options.reactions !== false;

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

  clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      this.disposeObject(child);
    }
  }

  /** Libère géométries et matériaux d'un sous-arbre retiré de la scène (les textures partagées sont conservées). */
  disposeObject(obj: THREE.Object3D): void {
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
    clearProjectilesAndTelegraphs(this);

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
    configureWeather(this, 'meadow');
    applyBiomeLighting(this, 'meadow');

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

    // Lueur du feu : éteinte de jour, elle éclaire le cœur du camp la nuit
    this.potLight = new THREE.PointLight('#FFAE5A', 0, 19, 1.5);
    this.potLight.position.set(0, 2.1, -0.4);
    this.worldGroup.add(this.potLight);

    // Étoiles : petits cubes lointains, invisibles de jour (une seule InstancedMesh)
    const starCount = 90;
    const stars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: '#F4F7FF', transparent: true, opacity: 0, depthWrite: false, fog: false }),
      starCount,
    );
    for (let i = 0; i < starCount; i++) {
      // répartition déterministe sur une demi-sphère (pas d'aléatoire : le ciel est le même à chaque visite)
      const az = i * 2.399963;
      const el = 0.02 + (((i * 37) % 100) / 100) * 0.7; // surtout près de l'horizon : la caméra du camp regarde vers le bas
      const r = 92;
      _dummy.position.set(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(0.35 + ((i * 13) % 5) * 0.12);
      _dummy.updateMatrix();
      stars.setMatrixAt(i, _dummy.matrix);
    }
    stars.frustumCulled = false;
    this.worldGroup.add(stars);
    this.campStars = stars;
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
    clearProjectilesAndTelegraphs(this);
    this.clearGroup(this.worldGroup);
    this.clearGroup(this.actorsGroup);
    this.campWanderers = [];
    this.potLiquidMesh = null;
    this.potFireMesh = null;
    this.potLight = null;
    this.campStars = null;

    const biome = BIOMES[stage.biomeId];
    this.scene.background = new THREE.Color(biome.skyHex);
    this.scene.fog = new THREE.Fog(biome.fogHex, 30, 84);
    applyBiomeLighting(this, biome.id);
    const env = buildBiomeEnvironment(biome, false);
    this.worldGroup.add(env.group);
    this.waterUniform = env.waterUniform;
    this.cloudGroup = env.cloudGroup;
    this.envAnimate = env.animate ?? null;
    configureWeather(this, stage.biomeId);

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

  spawnWave(index: number): void {
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

      spawnParticleBurst(this, spawnX, 0.8, spawnZ, species.palette.accent, isBoss ? 20 : 10, 4.5);
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

  updateBossIntro(dt: number): void {
    const boss = this.bossIntroActor;
    this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
    if (boss && this.bossDropY > 0) {
      this.bossDropVel += 46 * dt;
      this.bossDropY = Math.max(0, this.bossDropY - this.bossDropVel * dt);
      if (this.bossDropY === 0) {
        // Atterrissage : onde de choc, poussière, écrasement
        boss.squashY = 0.58;
        this.trauma = Math.min(1, this.trauma + 0.6);
        spawnShockwaveRing(this, boss.x, boss.z, 5.5, boss.rig.species.palette.accent);
        spawnElementBurst(this, boss.x, 0.3, boss.z, 'rock', 22, 1.5);
        spawnElementBurst(this, boss.x, 0.8, boss.z, boss.rig.species.element, 18, 1.4);
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

  /** Après la fin du combat : les K.O. se dissolvent, et en cas de victoire l'escouade fait la fête. */
  updateEndSequence(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.removed && enemy.fainted) updateEnemyDissolve(this, enemy, dt);
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
      animateRigPose(this, ally.rig, hopT, true, 1 + Math.sin(hopT * 2) * 0.07, this.elapsedTotal);
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
      spawnConfetti(this, cx / n + (Math.random() - 0.5) * 7, 1.2 + Math.random() * 1.5, cz / n + (Math.random() - 0.5) * 5, 9);
      if (!this.resultSent) soundFx.playConfettiPop();
    }
  }

  /** Règle l'heure du camp (0 = aube, 0.3 = plein jour, 0.64 = crépuscule, 0.8 = nuit). */
  public setCampClock(t: number): void {
    if (Number.isFinite(t)) this.campClock = ((t % 1) + 1) % 1;
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

  clearEvoRing(): void {
    if (!this.evoRing) return;
    this.fxGroup.remove(this.evoRing);
    this.evoRing.geometry.dispose();
    (this.evoRing.material as THREE.Material).dispose();
    this.evoRing = null;
  }

  updateEvolution(dt: number): void {
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
      animateRigPose(this, evo.rig, 0, false, 1, this.elapsedTotal);
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
        spawnParticleBurst(this, EVO_X, 1.3, EVO_Z, '#FFFFFF', 26, 7.5);
        spawnParticleBurst(this, EVO_X, 1.3, EVO_Z, '#F4B942', 26, 6.0);
        spawnElementBurst(this, EVO_X, 1.0, EVO_Z, next.species.element, 22, 1.6);
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
    animateRigPose(this, evo.rig, this.elapsedTotal * 9, q > 0.3, 1, this.elapsedTotal);
    evo.spawnAcc += dt;
    if (evo.spawnAcc > 0.16) {
      evo.spawnAcc = 0;
      spawnParticleBurst(this, EVO_X + (Math.random() - 0.5) * 2, 0.4, EVO_Z + (Math.random() - 0.5) * 1.5, '#F4B942', 4, 3.2);
    }
    if (evo.t >= EVO_TOTAL_SEC) {
      const done = evo.onDone;
      this.evo = null; // le rig reste en scène : onDone recharge le camp, qui le libère
      done();
    }
  }

  public triggerAllySkill(slotIndex: number): boolean {
    return triggerAllySkill(this, slotIndex);
  }

  public triggerScatter(): boolean {
    return triggerScatter(this);
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

  updateCamp(dt: number): void {
    updateDayNight(this, dt);
    this.updateEvolution(dt);

    // Animate cooking pot embers & steam cubes
    if (this.potFireMesh) {
      const flicker = 0.92 + Math.sin(this.elapsedTotal * 14) * 0.14;
      this.potFireMesh.scale.set(flicker, 0.85 + Math.cos(this.elapsedTotal * 11) * 0.22, flicker);
    }
    this.potSteamTimer -= dt;
    if (this.potSteamTimer <= 0) {
      this.potSteamTimer = this.potCookingColor ? 0.22 : 0.65;
      spawnSteamCube(this, 0, 1.65, -1.2, this.potCookingColor ?? '#E2F3FF');
    }

    for (const w of this.campWanderers) {
      let lift = 0;
      if (this.evo) {
        // Toute l'escouade s'arrête pour regarder la métamorphose
        w.facing = Math.atan2(EVO_X - w.x, EVO_Z - w.z);
        animateRigPose(this, w.rig, w.walkPhase, false, 1, this.elapsedTotal);
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
          animateRigPose(this, w.rig, w.walkPhase, true, 1, this.elapsedTotal);
        } else {
          w.waitTimer -= dt;
          // Émote d'attente : un petit saut de joie de temps en temps
          w.emoteTimer -= dt;
          if (w.emoteT <= 0 && w.emoteTimer <= 0) {
            w.emoteT = 0.55;
            w.emoteTimer = 5 + Math.random() * 7;
            spawnParticleBurst(this, w.x, 1.5, w.z, w.rig.species.palette.accent, 4, 2.2);
            if (this.screenState === 'playing') soundFx.playIdleChirp();
          }
          let squash = 1;
          if (w.emoteT > 0) {
            w.emoteT = Math.max(0, w.emoteT - dt);
            const k = 1 - w.emoteT / 0.55;
            lift = Math.sin(k * Math.PI) * 0.6;
            squash = 1 + Math.sin(k * Math.PI * 2) * 0.12;
          }
          animateRigPose(this, w.rig, w.walkPhase, false, squash, this.elapsedTotal);
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
  updateExpedition(dt: number, simDt: number): void {
    if (!this.activeStage) return;

    if (this.expeditionEnded || this.resultSent) {
      this.finishExpedition(dt);
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
      triggerUltimate(this);
    }

    this.updateAllies(dt, simDt);
    this.updateEnemies(dt, simDt);

    if (this.bossIntroActor && this.bossDropY > 0) {
      this.bossIntroActor.rig.root.position.y = this.bossDropY;
    }

    updateProjectiles(this, dt, simDt);
    updateTelegraphs(this, simDt);
    this.updateExpeditionProgress(dt, simDt);
  }

  /** Fin d'expédition : fête ou repli, puis envoi UNIQUE du résultat à l'interface. */
  finishExpedition(dt: number): void {
    if (!this.activeStage) return;
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
  }

  /** Déplacements (clavier, formation, poursuite), attaques de base et sorts automatiques des alliés. */
  updateAllies(dt: number, simDt: number): void {
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
      updateActorCommon(this, ally, dt, simDt);

      if (ally.fainted) {
        ally.reviveTimer = Math.max(0, ally.reviveTimer - simDt);
        ally.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(ally.rig.bodyPivot.rotation.z, Math.PI / 2, 10, dt);
        if (ally.reviveTimer <= 0) {
          ally.fainted = false;
          ally.hp = Math.round(ally.maxHp * 0.55);
          ally.invulnTimer = 1.2;
          ally.rig.bodyPivot.rotation.z = 0;
          spawnParticleBurst(this, ally.x, 0.8, ally.z, '#2FB97A', 16, 4.5);
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
        animateRigPose(this, ally.rig, ally.walkPhase, true, ally.squashY, this.elapsedTotal);
        continue;
      }

      const target = findNearestLiving(this, ally.x, ally.z, this.enemies);
      let moved = false;

      const allySpeedMult = ally.statuses.rooted ? 0.45 : ally.statuses.soaked ? 0.78 : 1.0;
      const effectiveSpeed = ally.moveSpeed * allySpeedMult;

      if (ally.stunTimer > 0) {
        animateRigPose(this, ally.rig, ally.walkPhase, false, 0.88, this.elapsedTotal);
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
            spawnProjectile(this, {
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
            applyDamageToActor(
              this,
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
          executeAllySkill(this, ally);
        }
      }

      animateRigPose(this, ally.rig, ally.walkPhase, moved, ally.squashY, this.elapsedTotal);
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
  }

  /** IA des ennemis : poursuiveur, tireur, chargeur, boss. */
  updateEnemies(dt: number, simDt: number): void {
    // Count active attack tokens for fair crowd pacing
    let activeTokens = this.enemies.filter((e) => !e.fainted && !e.removed && e.hasAttackToken).length;

    // Update Enemies (4 distinct AI policies: chaser, kiter, charger, boss)
    for (const enemy of this.enemies) {
      if (enemy.removed) continue;
      updateActorCommon(this, enemy, dt, simDt);

      if (enemy.fainted) {
        updateEnemyDissolve(this, enemy, dt);
        continue;
      }
      const target = findNearestLiving(this, enemy.x, enemy.z, this.allies);
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
        animateRigPose(this, enemy.rig, enemy.walkPhase, false, 0.84, this.elapsedTotal);
        continue;
      }

      if (enemy.stunTimer > 0) {
        animateRigPose(this, enemy.rig, enemy.walkPhase, false, 0.88, this.elapsedTotal);
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
          spawnProjectile(this, {
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
          spawnEnemyTelegraph(this, enemy.x, enemy.z, chargeLen, 0.65, true, dirX, dirZ, () => {
            enemy.telegraphing = false;
            enemy.hasAttackToken = false;
            enemy.aiCooldown = 4.2;
            if (enemy.fainted || enemy.removed) return;
            enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * chargeLen, -ARENA_BOUND, ARENA_BOUND);
            enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * chargeLen, -ARENA_BOUND, ARENA_BOUND);
            spawnParticleBurst(this, enemy.x, 0.7, enemy.z, enemy.rig.species.palette.accent, 14, 5.0);
            for (const ally of this.allies) {
              if (!ally.fainted && Math.hypot(ally.x - enemy.x, ally.z - enemy.z) <= 2.2) {
                applyDamageToActor(this, ally, Math.round(enemy.atk * 1.45), enemy, true, false, '#EF4444');
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
          this.castBossPattern(enemy, target, dx, dz, dist);
        } else if (dist > 3.1) {
          enemy.x += (dx / dist) * enemySpeed * simDt;
          enemy.z += (dz / dist) * enemySpeed * simDt;
          enemy.walkPhase += enemySpeed * simDt * 3.0;
          moved = true;
        } else if (enemy.basicCooldown <= 0) {
          enemy.basicCooldown = phase >= 2 ? 1.25 : 1.7;
          enemy.squashY = 1.22;
          if (!confusedMiss) {
            applyDamageToActor(this, target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
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
            applyDamageToActor(this, target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
          }
        }
      }

      animateRigPose(this, enemy.rig, enemy.walkPhase, moved, enemy.squashY, this.elapsedTotal);
    }
  }

  /**
   * Lance la prochaine attaque télégraphiée du boss (patterns 0 à 5), selon le kit du niveau et la phase.
   * L'appelant a déjà réservé le jeton d'attaque.
   */
  castBossPattern(enemy: CombatActor, target: CombatActor, dx: number, dz: number, dist: number): void {
    if (!this.activeStage) return;
    const phase = enemy.bossPhase;
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
      spawnEnemyTelegraph(this, tx, tz, aoeRad, windup, false, 0, 0, () => {
        enemy.telegraphing = false;
        enemy.hasAttackToken = false;
        enemy.skillCooldown = cooldownAfter;
        if (enemy.fainted || enemy.removed) return;
        spawnShockwaveRing(this, tx, tz, aoeRad, '#F43F5E');
        spawnParticleBurst(this, tx, 0.8, tz, '#F43F5E', 24, 6.2);
        this.trauma = Math.min(1, this.trauma + 0.45);
        for (const ally of this.allies) {
          if (!ally.fainted && Math.hypot(ally.x - tx, ally.z - tz) <= aoeRad + 0.4) {
            applyDamageToActor(this, ally, Math.round(enemy.atk * 1.65), enemy, true, false, '#F43F5E');
          }
        }
        if (phase >= 2) {
          const fanHalf = phase === 3 ? 2 : 1;
          for (let k = -fanHalf; k <= fanHalf; k++) {
            const baseAng = Math.atan2(tx - enemy.x, tz - enemy.z) + k * 0.42;
            spawnProjectile(this, {
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
      spawnEnemyTelegraph(this, bx, bz, chargeLen * 0.75, windup, true, perpX, perpZ, () => {
        if (enemy.fainted || enemy.removed) return;
        spawnParticleBurst(this, bx + perpX * 4, 0.7, bz + perpZ * 4, '#F4B942', 12, 4.8);
        for (const ally of this.allies) {
          if (ally.fainted) continue;
          const relX = ally.x - bx;
          const relZ = ally.z - bz;
          const proj = relX * perpX + relZ * perpZ;
          const side = Math.abs(relX * dirX + relZ * dirZ);
          if (proj >= -0.6 && proj <= chargeLen * 0.75 + 0.6 && side <= 1.35) {
            applyDamageToActor(this, ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F4B942');
          }
        }
      });
      // Primary forward boss dash
      spawnEnemyTelegraph(this, bx, bz, chargeLen, windup, true, dirX, dirZ, () => {
        enemy.telegraphing = false;
        enemy.hasAttackToken = false;
        enemy.skillCooldown = cooldownAfter;
        if (enemy.fainted || enemy.removed) return;
        const startX = enemy.x;
        const startZ = enemy.z;
        enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
        enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
        spawnParticleBurst(this, enemy.x, 0.8, enemy.z, '#F43F5E', 22, 6.0);
        this.trauma = Math.min(1, this.trauma + 0.4);
        for (const ally of this.allies) {
          if (ally.fainted) continue;
          const relX = ally.x - startX;
          const relZ = ally.z - startZ;
          const proj = relX * dirX + relZ * dirZ;
          const side = Math.abs(relX * -dirZ + relZ * dirX);
          if (proj >= -0.5 && proj <= chargeLen + 0.8 && side <= 1.65) {
            applyDamageToActor(this, ally, Math.round(enemy.atk * 1.6), enemy, true, false, '#F43F5E');
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
        spawnEnemyTelegraph(this, mx, mz, meteorRad, 0.68 + m * 0.34, false, 0, 0, () => {
          if (isLast) {
            enemy.telegraphing = false;
            enemy.hasAttackToken = false;
            enemy.skillCooldown = cooldownAfter;
          }
          if (enemy.fainted || enemy.removed) return;
          spawnShockwaveRing(this, mx, mz, meteorRad, '#F97316');
          spawnParticleBurst(this, mx, 0.8, mz, '#F97316', 18, 5.6);
          this.trauma = Math.min(1, this.trauma + 0.25);
          for (const ally of this.allies) {
            if (!ally.fainted && Math.hypot(ally.x - mx, ally.z - mz) <= meteorRad + 0.35) {
              applyDamageToActor(this, ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F97316');
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
      spawnEnemyTelegraph(
        this,
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
          spawnShockwaveRing(this, bx, bz, outer, ringTheme.burstColor);
          spawnElementBurst(this, bx, 0.6, bz, ringTheme.fx, 26, 1.7);
          this.trauma = Math.min(1, this.trauma + 0.4);
          for (const ally of this.allies) {
            if (ally.fainted) continue;
            const d = Math.hypot(ally.x - bx, ally.z - bz);
            if (d >= inner && d <= outer + 0.4) {
              const exposed = ally.invulnTimer <= 0;
              applyDamageToActor(this, ally, Math.round(enemy.atk * FROST_KIT.ringDamage), enemy, true, false, ringTheme.burstColor);
              if (exposed && !ally.fainted) {
                for (const status of ringTheme.statuses[phase === 1 ? 0 : 1]) {
                  applyStatusToActor(this, ally, status, enemy.atk);
                }
              }
            }
          }
          if (hasFollowUp) {
            this.bannerText = 'Contrecoup — éloignez-vous !';
            this.bannerTimer = 1.0;
            spawnEnemyTelegraph(
              this,
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
                spawnShockwaveRing(this, bx, bz, inner + FROST_KIT.aftershockMargin, ringTheme.aftershockColor);
                spawnElementBurst(this, bx, 0.6, bz, 'rock', 16, 1.3);
                this.trauma = Math.min(1, this.trauma + 0.3);
                for (const ally of this.allies) {
                  if (
                    !ally.fainted &&
                    Math.hypot(ally.x - bx, ally.z - bz) <= inner + FROST_KIT.aftershockMargin + 0.4
                  ) {
                    applyDamageToActor(this, ally, Math.round(enemy.atk * FROST_KIT.aftershockDamage), enemy, true, false, ringTheme.aftershockColor);
                  }
                }
                if (phase === 3) {
                  // Phase 3 : éclats en étoile
                  for (let k = 0; k < FROST_KIT.shardCount; k++) {
                    const shardAng = (k / FROST_KIT.shardCount) * Math.PI * 2 + 0.3;
                    spawnProjectile(this, {
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
        spawnEnemyTelegraph(
          this,
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
              spawnBolt(this, sx, sz);
              if (k % 3 === 0) soundFx.playThunder();
            } else if (k % 3 === 0) {
              soundFx.playHit(true, false);
            }
            spawnElementBurst(this, sx, 0.5, sz, strikeTheme.fx, 10, 1.2);
            this.trauma = Math.min(1, this.trauma + 0.14);
            for (const ally of this.allies) {
              if (
                !ally.fainted &&
                !struck.has(ally.id) &&
                Math.hypot(ally.x - sx, ally.z - sz) <= strikeRad + 0.35
              ) {
                const exposed = ally.invulnTimer <= 0;
                if (exposed) struck.add(ally.id);
                applyDamageToActor(this, ally, Math.round(enemy.atk * STORM_KIT.strikeDamage), enemy, true, false, strikeTheme.color);
                if (exposed && !ally.fainted) applyStatusToActor(this, ally, strikeTheme.status, enemy.atk);
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
      spawnEnemyTelegraph(
        this,
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
            spawnBolt(this, bx, bz, 14);
            soundFx.playThunder();
          } else {
            soundFx.playHit(true, false);
          }
          spawnShockwaveRing(this, bx, bz, eyeRad, eyeTheme.color);
          spawnElementBurst(this, bx, 0.8, bz, eyeTheme.fx, 30, 1.5);
          this.trauma = Math.min(1, this.trauma + 0.5);
          for (const ally of this.allies) {
            if (!ally.fainted && Math.hypot(ally.x - bx, ally.z - bz) <= eyeRad + 0.4) {
              const exposed = ally.invulnTimer <= 0;
              applyDamageToActor(this, ally, Math.round(enemy.atk * STORM_KIT.eyeDamage), enemy, true, false, eyeTheme.color);
              if (exposed && !ally.fainted) applyStatusToActor(this, ally, eyeTheme.status, enemy.atk);
            }
          }
        },
        { color: eyeTheme.color },
      );
    }
  }

  /** Défaite, vague suivante ou victoire, puis instantané HUD (10 Hz au plus). */
  updateExpeditionProgress(dt: number, simDt: number): void {
    if (!this.activeStage) return;
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

  emitHudSnapshot(): void {
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
    clearProjectilesAndTelegraphs(this);
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
