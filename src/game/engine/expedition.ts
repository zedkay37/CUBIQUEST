/**
 * Déroulement d'une expédition : départ, apparition des vagues, pas de combat, défaite / victoire, envoi du résultat.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import { BIOMES, MOVES, SPECIES } from '../catalog';
import { computeCreatureStats, getMoveModifiers } from '../rules';
import type { ControlMode, OwnedCreature, PowerStone, StageDef } from '../types';
import { attachWorldHpBar, buildBiomeEnvironment, buildVoxelCreature } from '../voxelModels';
import { animateRigPose, updateEnemyDissolve } from './actors';
import { updateAllies } from './allies';
import { applyBiomeLighting, configureWeather } from './atmosphere';
import { updateBossIntro } from './boss';
import { clearGroup } from './camp';
import { BOSS_INTRO_SEC } from './constants';
import { updateEnemies } from './enemies';
import { clearEvoRing } from './evolution';
import {
  clearProjectilesAndTelegraphs,
  spawnConfetti,
  spawnParticleBurst,
  updateProjectiles,
  updateTelegraphs,
} from './fx';
import { emitHudSnapshot } from './hud';
import { triggerUltimate, updatePendingUltimateHits } from './skills';
import type { CombatTelemetry, ExpeditionResult } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { FR } from '../../i18n/fr';

export function emptyTelemetry(): CombatTelemetry {
  return {
    bossAppearedAt: -1,
    phaseStartedAt: [-1, -1, -1],
    minWindupByPhase: [-1, -1, -1],
    bossDefeatedAt: -1,
    castsByPhase: [0, 0, 0],
    patternsByPhase: [[], [], []],
    bossMaxPhases: 0,
    elapsed: 0,
  };
}

export function startExpedition(
  self: VoxelEngine,
  stage: StageDef,
  squadCreatures: OwnedCreature[],
  allStones: PowerStone[],
  controlMode: ControlMode,
): void {
  self.playMode = 'expedition';
  self.controlMode = controlMode;
  self.activeStage = stage;
  self.waveIndex = 0;
  self.expeditionElapsed = 0;
  self.damageDealt = 0;
  self.dodgeCooldown = 0;
  self.ultimateCharge = 25; // Start with 25% momentum so player reaches Ultimate cleanly
  self.slowMoTimer = 0;
  self.lastSlowMoAt = -10;
  self.cubesPlaced = 0;
  self.cubeOutcomeCounts = {};
  self.cracksExpired = 0;
  self.ultimateLockTimer = 0;
  self.pendingUltHits = null;
  self.burstsTriggered = 0;
  self.weakBurstsTriggered = 0;
  self.triosTriggered = 0;
  self.lastRipeSoundAt = -1;
  self.firstTimeSeen = new Set<string>();
  self.ultimatesUsed = 0;
  self.perfectDodges = 0;
  self.lastDodgeAt = -10;
  self.dodgePerfectGiven = true;
  self.resolvingHazard = false;
  self.dodgesUsed = 0;
  self.hazardsAvoided = 0;
  self.hazardHitsTaken = 0;
  self.lastBurstLabel = null;
  self.lastBurstColor = null;
  self.lastBurstTimer = 0;
  self.expeditionEnded = false;
  self.pendingVictory = false;
  self.resultSent = false;
  self.victorySecured = false;
  self.telemetry = emptyTelemetry();
  self.confettiTimer = 0;
  self.bossIntroTimer = 0;
  self.bossIntroActor = null;
  self.bossIntroInfo = null;
  self.evo = null;
  clearEvoRing(self);
  self.endDelayTimer = 0;
  self.waveSpawnDelay = 0;
  self.trauma = 0;
  self.hitstopTimer = 0;
  self.heldKeys.clear();
  self.floatingText.clear();
  clearProjectilesAndTelegraphs(self);
  clearGroup(self, self.worldGroup);
  clearGroup(self, self.actorsGroup);
  self.campWanderers = [];
  self.potLiquidMesh = null;
  self.potFireMesh = null;
  self.potLight = null;
  self.campStars = null;

  const biome = BIOMES[stage.biomeId];
  self.scene.background = new THREE.Color(biome.skyHex);
  self.scene.fog = new THREE.Fog(biome.fogHex, 30, 84);
  applyBiomeLighting(self, biome.id);
  const env = buildBiomeEnvironment(biome, false);
  self.worldGroup.add(env.group);
  self.waterUniform = env.waterUniform;
  self.cloudGroup = env.cloudGroup;
  self.envAnimate = env.animate ?? null;
  configureWeather(self, stage.biomeId);

  // Spawn 3 allied creatures in an open clearing facing forward (+X/-Z toward wave)
  self.allies = squadCreatures.slice(0, 3).map((c, idx) => {
    const species = SPECIES[c.speciesId] ?? SPECIES.pyrocube;
    const stats = computeCreatureStats(c, allStones);
    const move = MOVES[c.moveId] ?? MOVES.ember_burst;
    const mods = getMoveModifiers(c.runes);
    const rig = buildVoxelCreature(c.speciesId);
    attachWorldHpBar(rig, false, false);

    const startX = -7.5 + (idx === 0 ? 1.2 : 0);
    const startZ = (idx - 1) * 2.8;
    rig.root.position.set(startX, 0, startZ);
    self.actorsGroup.add(rig.root);

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
      runes: c.runes,
      basicCooldown: 0.3 + idx * 0.15,
      skillCooldown: 0.6 + idx * 0.25,
      skillMaxCooldown: maxCd,
      buffTimer: 0,
      flashTimer: 0,
      invulnTimer: 0,
      stunTimer: 0,
      dodgeTimer: 0,
      dodgeDirX: 0,
      dodgeDirZ: 0,
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
      cube: null,
      crack: null,
      trioLockTimer: 0,
      cubeRipeFlash: 0,
      bossPhase: 1,
      bossMaxPhases: 2,
      bossPatternIndex: 0,
      pullTimer: 0,
    };
  });

  self.enemies = [];
  spawnWave(self, 0);
  self.camPos.set(-4, 15.5, 16.5);
  self.camLook.set(0, 0.8, 0);
  emitHudSnapshot(self);

  if (!self.isSoftwareGl) {
    self.renderer?.compile(self.scene, self.camera);
  }
}

export function spawnWave(self: VoxelEngine, index: number): void {
  if (!self.activeStage) return;
  const wave = self.activeStage.waves[index];
  if (!wave) return;

  self.waveIndex = index;
  const isBossWave = index === self.activeStage.waves.length - 1;
  self.bannerText = isBossWave
    ? FR.engine.alerteBossPreparezLEsquive
    : FR.engine.vague(index + 1, self.activeStage.waves.length);
  self.bannerTimer = 2.4;

  const stageHpMult = self.activeStage.enemyHpMult ?? 1;
  const stageAtkMult = self.activeStage.enemyAtkMult ?? 1;
  const stageBossHpMult = self.activeStage.bossHpMult ?? 1;
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
    self.actorsGroup.add(rig.root);

    // Balanced enemy stats so Level 1 is genuinely winnable and later stages scale meaningfully
    const levelScale = 1 + (def.level - 1) * 0.14;
    const maxHp = Math.round(species.baseHp * levelScale * (isBoss ? 3.4 * stageBossHpMult : 1.15) * stageHpMult);
    const atk = Math.round(
      species.baseAtk * (0.42 + (def.level - 1) * 0.055) * (isBoss ? 1.45 : 0.9) * stageAtkMult,
    );

    const isFinalBiomeBoss = isBoss && self.activeStage?.stageNumber === 3;
    self.enemies.push({
      id: `enemy_${index}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      isAlly: false,
      isBoss,
      ai: def.ai,
      speciesId: species.id,
      name: isBoss ? FR.engine.boss(species.name) : species.name,
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
      runes: [],
      basicCooldown: 1.0 + i * 0.35,
      skillCooldown: isBoss ? 3.2 : 4.2,
      skillMaxCooldown: isBoss ? 5.0 : 5.5,
      buffTimer: 0,
      flashTimer: 0,
      invulnTimer: 0,
      stunTimer: 0,
      dodgeTimer: 0,
      dodgeDirX: 0,
      dodgeDirZ: 0,
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
      cube: null,
      crack: null,
      trioLockTimer: 0,
      cubeRipeFlash: 0,
      bossPhase: 1,
      bossMaxPhases: isFinalBiomeBoss ? 3 : 2,
      bossPatternIndex: 0,
      pullTimer: 0,
    });

    spawnParticleBurst(self, spawnX, 0.8, spawnZ, species.palette.accent, isBoss ? 20 : 10, 4.5);
  });

  // Entrée de boss : il tombe du ciel pendant une courte cinématique (combat gelé)
  const boss = isBossWave ? self.enemies.find((e) => e.isBoss && !e.removed && !e.fainted) : undefined;
  if (boss) {
    self.telemetry.bossAppearedAt = self.expeditionElapsed;
    self.telemetry.phaseStartedAt[0] = self.expeditionElapsed;
    self.telemetry.bossMaxPhases = boss.bossMaxPhases;
    self.bossIntroActor = boss;
    self.bossIntroTimer = BOSS_INTRO_SEC;
    self.bossDropY = 11;
    self.bossDropVel = 0;
    self.bossIntroInfo = {
      name: boss.rig.species.name,
      title:
        self.activeStage.stageNumber === 3
          ? FR.engine.souverain(BIOMES[self.activeStage.biomeId].name)
          : FR.engine.gardien(self.activeStage.name),
      element: boss.rig.species.element,
    };
    self.bannerText = null;
    self.bannerTimer = 0;
    boss.rig.root.position.y = self.bossDropY;
    soundFx.playBossIntro();
    emitHudSnapshot(self);
  }
}

export function updateExpedition(self: VoxelEngine, dt: number, simDt: number): void {
  if (!self.activeStage) return;

  if (self.expeditionEnded || self.resultSent) {
    finishExpedition(self, dt);
    return;
  }

  if (self.bossIntroTimer > 0) {
    // Cinématique d'entrée : la simulation est gelée, seul le boss tombe
    updateBossIntro(self, dt);
    simDt = 0;
  }
  self.expeditionElapsed += simDt;
  if (self.dodgeCooldown > 0) self.dodgeCooldown = Math.max(0, self.dodgeCooldown - simDt);
  if (self.ultimateLockTimer > 0) self.ultimateLockTimer = Math.max(0, self.ultimateLockTimer - simDt);
  if (self.bannerTimer > 0) {
    self.bannerTimer = Math.max(0, self.bannerTimer - dt);
    if (self.bannerTimer === 0) self.bannerText = null;
  }
  if (self.lastBurstTimer > 0) {
    self.lastBurstTimer = Math.max(0, self.lastBurstTimer - dt);
    if (self.lastBurstTimer === 0) {
      self.lastBurstLabel = null;
      self.lastBurstColor = null;
    }
  }
  if (self.controlMode === 'auto' && self.ultimateCharge >= 100 && self.enemies.some((e) => !e.fainted && !e.removed)) {
    triggerUltimate(self);
  }

  updatePendingUltimateHits(self, simDt);
  updateAllies(self, dt, simDt);
  updateEnemies(self, dt, simDt);

  if (self.bossIntroActor && self.bossDropY > 0) {
    self.bossIntroActor.rig.root.position.y = self.bossDropY;
  }

  updateProjectiles(self, dt, simDt);
  updateTelegraphs(self, simDt);
  updateExpeditionProgress(self, dt, simDt);
}

/** Bilan du combat. Une fois le combat terminé il ne bouge plus : la simulation est arrêtée. */
function buildExpeditionResult(self: VoxelEngine): ExpeditionResult {
  const stage = self.activeStage;
  const boss = self.enemies.find((e) => e.isBoss);
  const bossPct = boss ? (boss.hp / Math.max(1, boss.maxHp)) * 100 : 0;
  return {
    victory: self.pendingVictory,
    clearTimeSec: self.expeditionElapsed,
    wavesCleared: self.pendingVictory && stage ? stage.waves.length : self.waveIndex,
    damageDealt: self.damageDealt,
    bossHpPercentRemaining: self.pendingVictory ? 0 : bossPct,
    burstsTriggered: self.burstsTriggered,
    ultimatesUsed: self.ultimatesUsed,
    perfectDodges: self.perfectDodges,
    triosTriggered: self.triosTriggered,
  };
}

/** Fin d'expédition : fête ou repli, puis envoi UNIQUE du résultat à l'interface. */
export function finishExpedition(self: VoxelEngine, dt: number): void {
  if (!self.activeStage) return;
  updateEndSequence(self, dt);
  if (self.expeditionEnded) {
    self.endDelayTimer -= dt;
    if (self.endDelayTimer <= 0) {
      const cb = self.callbacks.onExpeditionComplete;
      self.expeditionEnded = false;
      // Le résultat ne part qu'UNE fois : sans ce verrou, la boucle re-détectait la victoire
      // sous la fenêtre de fin et renvoyait les récompenses en boucle.
      self.resultSent = true;
      self.screenState = 'gameover';
      cb(buildExpeditionResult(self));
    }
  }
}

/** Défaite, vague suivante ou victoire, puis instantané HUD (10 Hz au plus). */
export function updateExpeditionProgress(self: VoxelEngine, dt: number, simDt: number): void {
  if (!self.activeStage) return;
  // Check Defeat (all 3 allies fainted simultaneously)
  const livingAllies = self.allies.filter((a) => !a.fainted);
  if (livingAllies.length === 0) {
    self.expeditionEnded = true;
    self.pendingVictory = false;
    self.endDelayTimer = 0.65;
    self.bannerText = FR.engine.escouadeKORepliAuCamp;
    self.bannerTimer = 1.5;
    soundFx.playDefeat();
    emitHudSnapshot(self);
    return;
  }

  // Check Wave Clear / Victory
  const livingEnemies = self.enemies.filter((e) => !e.fainted && !e.removed);
  if (livingEnemies.length === 0) {
    if (self.waveIndex + 1 < self.activeStage.waves.length) {
      self.waveSpawnDelay += simDt;
      if (self.waveSpawnDelay >= 1.1) {
        self.waveSpawnDelay = 0;
        spawnWave(self, self.waveIndex + 1);
      }
    } else {
      self.expeditionEnded = true;
      self.pendingVictory = true;
      self.endDelayTimer = 1.7; // le temps de fêter ça : sauts de joie + confettis
      self.confettiTimer = 0;
      self.bannerText = FR.engine.victoireExpeditionReussie;
      self.bannerTimer = 2.0;
      soundFx.playFanfare();
      emitHudSnapshot(self);
      // La victoire est acquise maintenant, pas à la fin de la fête : l'interface attribue les
      // récompenses tout de suite. Sans cela, quitter pendant la bannière les faisait perdre.
      if (!self.victorySecured) {
        self.victorySecured = true;
        self.callbacks.onVictorySecured?.(buildExpeditionResult(self));
      }
    }
  }

  // Throttled React HUD snapshot (<= 10Hz)
  self.hudEmitAccum += dt;
  if (self.hudEmitAccum >= 0.1) {
    self.hudEmitAccum = 0;
    emitHudSnapshot(self);
  }
}

/** Après la fin du combat : les K.O. se dissolvent, et en cas de victoire l'escouade fait la fête. */
export function updateEndSequence(self: VoxelEngine, dt: number): void {
  for (const enemy of self.enemies) {
    if (!enemy.removed && enemy.fainted) updateEnemyDissolve(self, enemy, dt);
  }
  if (!self.pendingVictory) return;

  let cx = 0;
  let cz = 0;
  let n = 0;
  for (let i = 0; i < self.allies.length; i++) {
    const ally = self.allies[i];
    if (ally.fainted) continue;
    const hopT = self.elapsedTotal * 8.5 + i * 1.3;
    ally.rig.root.position.set(ally.x, 0, ally.z);
    ally.rig.root.rotation.y = Math.sin(self.elapsedTotal * 3 + i * 2.1) * 0.7;
    animateRigPose(self, ally.rig, hopT, true, 1 + Math.sin(hopT * 2) * 0.07, self.elapsedTotal);
    ally.rig.bodyPivot.position.y += Math.abs(Math.sin(hopT)) * 0.4;
    ally.rig.bodyPivot.rotation.z = 0;
    if (ally.rig.hpBarBg) ally.rig.hpBarBg.visible = false;
    cx += ally.x;
    cz += ally.z;
    n += 1;
  }
  if (n === 0) return;

  self.confettiTimer -= dt;
  if (self.confettiTimer <= 0) {
    // rafales denses avant l'écran de résultat, puis pluie légère derrière la fenêtre
    self.confettiTimer = self.resultSent ? 0.5 : 0.14;
    spawnConfetti(self, cx / n + (Math.random() - 0.5) * 7, 1.2 + Math.random() * 1.5, cz / n + (Math.random() - 0.5) * 5, 9);
    if (!self.resultSent) soundFx.playConfettiPop();
  }
}
