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
import { BIOMES, MOVES, RECIPE_BY_ID } from './catalog';
import { animateRigPose } from './engine/actors';
import { applyBiomeLighting, configureWeather, updateDayNight } from './engine/atmosphere';
import { fovForAspect, handleResize } from './engine/camera';
import {
  _color,
  _dummy,
  BOLT_POOL_SIZE,
  EVO_CHARGE_SEC,
  EVO_TOTAL_SEC,
  EVO_X,
  EVO_Z,
  PARTICLE_POOL_SIZE,
  WEATHER_COUNT,
} from './engine/constants';
import { emptyTelemetry, startExpedition } from './engine/expedition';
import {
  clearProjectilesAndTelegraphs,
  spawnElementBurst,
  spawnParticleBurst,
  spawnSteamCube,
} from './engine/fx';
import { advance, detectSoftwareGl, scheduleNextFrame } from './engine/loop';
import { triggerAllySkill, triggerScatter, triggerUltimate } from './engine/skills';
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
  ExpeditionHudSnapshot,
  OwnedCreature,
  PlayMode,
  PowerStone,
  StageDef,
  StatusKind,
} from './types';
import {
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
  telemetry: CombatTelemetry = emptyTelemetry();

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
    return startExpedition(this, stage, squadCreatures, allStones, controlMode);
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
