/**
 * Boss : cinématique d'entrée et attaques télégraphiées (patterns 0 à 5).
 * La rotation et l'habillage des attaques viennent de `BOSS_KITS` (balance.ts).
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import {
  BOSS_KITS,
  DEFAULT_EYE_THEME,
  DEFAULT_RING_THEME,
  DEFAULT_STRIKE_THEME,
  FROST_KIT,
  STORM_KIT,
} from '../balance';
import { applyStatusToActor } from './actors';
import { spawnBolt } from './atmosphere';
import { ARENA_BOUND } from './constants';
import { applyDamageToActor } from './damage';
import {
  spawnElementBurst,
  spawnEnemyTelegraph,
  spawnParticleBurst,
  spawnProjectile,
  spawnShockwaveRing,
} from './fx';
import { emitHudSnapshot } from './hud';
import { BOSS_MODULES, TELEGRAPH_KIT, type BossKitDef } from '../balance';
import { spawnEnemyActor } from './expedition';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { FR } from '../../i18n/fr';

export function updateBossIntro(self: VoxelEngine, dt: number): void {
  const boss = self.bossIntroActor;
  self.bossIntroTimer = Math.max(0, self.bossIntroTimer - dt);
  if (boss && self.bossDropY > 0) {
    self.bossDropVel += 46 * dt;
    self.bossDropY = Math.max(0, self.bossDropY - self.bossDropVel * dt);
    if (self.bossDropY === 0) {
      // Atterrissage : onde de choc, poussière, écrasement
      boss.squashY = 0.58;
      self.trauma = Math.min(1, self.trauma + 0.6);
      spawnShockwaveRing(self, boss.x, boss.z, 5.5, boss.rig.species.palette.accent);
      spawnElementBurst(self, boss.x, 0.3, boss.z, 'rock', 22, 1.5);
      spawnElementBurst(self, boss.x, 0.8, boss.z, boss.rig.species.element, 18, 1.4);
      soundFx.playHit(true, false);
      soundFx.playElementImpact('rock', true);
    }
  }
  if (self.bossIntroTimer === 0) {
    self.bossIntroActor = null;
    self.bossIntroInfo = null;
    self.bossDropY = 0;
    self.bannerText = FR.engine.alerteBossPreparezLEsquive;
    self.bannerTimer = 2.2;
    emitHudSnapshot(self);
  }
}

/**
 * Rotation d'attaques du boss pour cette phase. Mini-boss (niveaux 1 et 2 d'un biome) : seulement la
 * première (niveau 1) ou les deux premières (niveau 2) attaques du kit, dans l'ordre où elles apparaissent.
 */
export function bossCycle(stageNumber: number, kit: BossKitDef, phase: number): number[] {
  if (stageNumber < 3) {
    const order: number[] = [];
    for (const p of kit.cycle.flat()) if (!order.includes(p)) order.push(p);
    return order.slice(0, stageNumber);
  }
  return kit.cycle[Math.min(phase - 1, kit.cycle.length - 1)];
}

/** Module du boss de ce niveau (seulement pour le boss de biome, niveau 3). */
export function bossModule(self: VoxelEngine): BossKitDef['module'] {
  const stage = self.activeStage;
  if (!stage || stage.stageNumber !== 3) return undefined;
  return BOSS_KITS[stage.bossKit ?? 'classic'].module;
}

/** Carapace de magma : bouclier de 18 % des PV max au début de chaque phase. */
export function grantBossShield(self: VoxelEngine, boss: CombatActor): void {
  if (bossModule(self) !== 'shield') return;
  boss.shieldMax = Math.round(boss.maxHp * BOSS_MODULES.shield.hpRatio);
  boss.shieldHp = boss.shieldMax;
  boss.shieldSince = self.expeditionElapsed;
}

/** Satellites : deux gardiens autour du boss (phases 2 et 3). */
export function spawnGuardians(self: VoxelEngine, boss: CombatActor): void {
  if (bossModule(self) !== 'satellites') return;
  const cfg = BOSS_MODULES.satellites;
  for (let k = 0; k < cfg.count; k++) {
    const g = spawnEnemyActor(self, { speciesId: boss.speciesId, level: boss.level, ai: 'chaser' }, k, cfg.count);
    g.maxHp = Math.max(1, Math.round(boss.maxHp * cfg.hpRatio));
    g.hp = g.maxHp;
    g.guardianOf = boss.id;
    const ang = (k / cfg.count) * Math.PI * 2;
    g.x = boss.x + Math.cos(ang) * 3;
    g.z = boss.z + Math.sin(ang) * 3;
    g.rig.root.position.set(g.x, 0, g.z);
  }
}

/**
 * Lance la prochaine attaque télégraphiée du boss (patterns 0 à 5), selon le kit du niveau et la phase.
 * L'appelant a déjà réservé le jeton d'attaque.
 */
export function castBossPattern(self: VoxelEngine, enemy: CombatActor, target: CombatActor, dx: number, dz: number, dist: number): void {
  if (!self.activeStage) return;
  const phase = enemy.bossPhase;
  // Rotation des attaques selon le kit du boss (données : StageDef.bossKit)
  const kitDef = BOSS_KITS[self.activeStage.bossKit ?? 'classic'];
  const cycle = bossCycle(self.activeStage.stageNumber, kitDef, phase);
  const pattern = cycle[enemy.bossPatternIndex % cycle.length];
  // Jamais plus de trois zones de danger à la fois (cinq avec la pluie de météores) : le boss attend
  const activeZones = self.telegraphs.filter((tg) => tg.isEnemyHazard).length;
  const adding = pattern === 2 ? (phase === 3 ? 4 : 3) : pattern === 1 ? 2 : 1;
  const cap = pattern === 2 ? TELEGRAPH_KIT.maxZonesMeteor : TELEGRAPH_KIT.maxZones;
  if (activeZones > 0 && activeZones + adding > cap) {
    enemy.telegraphing = false;
    enemy.hasAttackToken = false;
    enemy.skillCooldown = 0.3;
    return;
  }
  self.telemetry.castsByPhase[phase - 1] += 1;
  if (!self.telemetry.patternsByPhase[phase - 1].includes(pattern)) {
    self.telemetry.patternsByPhase[phase - 1].push(pattern);
  }
  enemy.bossPatternIndex += 1;
  // Carapace de magma : tant que le bouclier tient, le boss attaque 20 % plus vite
  const cooldownAfter = (phase === 3 ? 2.8 : phase === 2 ? 3.4 : 4.6) / (enemy.shieldHp > 0 ? 1 + BOSS_MODULES.shield.attackSpeedBonus : 1);

  if (pattern === 0) {
    // Pattern 0: Circular AoE Slam (+ radial projectiles in Phase 2/3)
    const aoeRad = phase === 3 ? 4.6 : phase === 2 ? 4.2 : 3.6;
    const windup = kitDef.slamWindup ? kitDef.slamWindup[phase - 1] : phase === 3 ? 0.62 : phase === 2 ? 0.72 : 0.82;
    const tx = target.x;
    const tz = target.z;
    spawnEnemyTelegraph(self, tx, tz, aoeRad, windup, false, 0, 0, () => {
      enemy.telegraphing = false;
      enemy.hasAttackToken = false;
      enemy.skillCooldown = cooldownAfter;
      if (enemy.fainted || enemy.removed) return;
      spawnShockwaveRing(self, tx, tz, aoeRad, '#F43F5E');
      spawnParticleBurst(self, tx, 0.8, tz, '#F43F5E', 24, 6.2);
      self.trauma = Math.min(1, self.trauma + 0.45);
      for (const ally of self.allies) {
        if (!ally.fainted && Math.hypot(ally.x - tx, ally.z - tz) <= aoeRad + 0.4) {
          applyDamageToActor(self, ally, Math.round(enemy.atk * 1.65), enemy, true, false, '#F43F5E');
        }
      }
      if (phase >= 2) {
        const fanHalf = phase === 3 ? 2 : 1;
        for (let k = -fanHalf; k <= fanHalf; k++) {
          const baseAng = Math.atan2(tx - enemy.x, tz - enemy.z) + k * 0.42;
          spawnProjectile(self, {
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
    }, { phase });
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
    spawnEnemyTelegraph(self, bx, bz, chargeLen * 0.75, windup, true, perpX, perpZ, () => {
      if (enemy.fainted || enemy.removed) return;
      spawnParticleBurst(self, bx + perpX * 4, 0.7, bz + perpZ * 4, '#F4B942', 12, 4.8);
      for (const ally of self.allies) {
        if (ally.fainted) continue;
        const relX = ally.x - bx;
        const relZ = ally.z - bz;
        const proj = relX * perpX + relZ * perpZ;
        const side = Math.abs(relX * dirX + relZ * dirZ);
        if (proj >= -0.6 && proj <= chargeLen * 0.75 + 0.6 && side <= 1.35) {
          applyDamageToActor(self, ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F4B942');
        }
      }
    }, { phase });
    // Primary forward boss dash
    spawnEnemyTelegraph(self, bx, bz, chargeLen, windup, true, dirX, dirZ, () => {
      enemy.telegraphing = false;
      enemy.hasAttackToken = false;
      enemy.skillCooldown = cooldownAfter;
      if (enemy.fainted || enemy.removed) return;
      const startX = enemy.x;
      const startZ = enemy.z;
      enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
      enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * Math.min(chargeLen, 6.8), -ARENA_BOUND, ARENA_BOUND);
      spawnParticleBurst(self, enemy.x, 0.8, enemy.z, '#F43F5E', 22, 6.0);
      self.trauma = Math.min(1, self.trauma + 0.4);
      for (const ally of self.allies) {
        if (ally.fainted) continue;
        const relX = ally.x - startX;
        const relZ = ally.z - startZ;
        const proj = relX * dirX + relZ * dirZ;
        const side = Math.abs(relX * -dirZ + relZ * dirX);
        if (proj >= -0.5 && proj <= chargeLen + 0.8 && side <= 1.65) {
          applyDamageToActor(self, ally, Math.round(enemy.atk * 1.6), enemy, true, false, '#F43F5E');
        }
      }
    }, { phase });
  } else if (pattern === 2) {
    // Pattern 2: Sequential Meteor Volley (3 staggered impact circles on squad!)
    const living = self.allies.filter((a) => !a.fainted);
    const meteorCount = phase === 3 ? 4 : 3;
    for (let m = 0; m < meteorCount; m++) {
      const focus = living[m % Math.max(1, living.length)] ?? target;
      const mx = THREE.MathUtils.clamp(focus.x + (Math.random() - 0.5) * 1.8, -ARENA_BOUND + 1, ARENA_BOUND - 1);
      const mz = THREE.MathUtils.clamp(focus.z + (Math.random() - 0.5) * 1.8, -ARENA_BOUND + 1, ARENA_BOUND - 1);
      const isLast = m === meteorCount - 1;
      const meteorRad = 2.6;
      spawnEnemyTelegraph(self, mx, mz, meteorRad, 0.68 + m * 0.34, false, 0, 0, () => {
        if (isLast) {
          enemy.telegraphing = false;
          enemy.hasAttackToken = false;
          enemy.skillCooldown = cooldownAfter;
        }
        if (enemy.fainted || enemy.removed) return;
        spawnShockwaveRing(self, mx, mz, meteorRad, '#F97316');
        spawnParticleBurst(self, mx, 0.8, mz, '#F97316', 18, 5.6);
        self.trauma = Math.min(1, self.trauma + 0.25);
        for (const ally of self.allies) {
          if (!ally.fainted && Math.hypot(ally.x - mx, ally.z - mz) <= meteorRad + 0.35) {
            applyDamageToActor(self, ally, Math.round(enemy.atk * 1.35), enemy, true, false, '#F97316');
          }
        }
      }, { phase });
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
    self.showHazardHint('ring', ringTheme.label, 1.4);
    spawnEnemyTelegraph(
      self,
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
        spawnShockwaveRing(self, bx, bz, outer, ringTheme.burstColor);
        spawnElementBurst(self, bx, 0.6, bz, ringTheme.fx, 26, 1.7);
        self.trauma = Math.min(1, self.trauma + 0.4);
        for (const ally of self.allies) {
          if (ally.fainted) continue;
          const d = Math.hypot(ally.x - bx, ally.z - bz);
          if (d >= inner && d <= outer + 0.4) {
            const exposed = ally.invulnTimer <= 0;
            applyDamageToActor(self, ally, Math.round(enemy.atk * FROST_KIT.ringDamage), enemy, true, false, ringTheme.burstColor);
            if (exposed && !ally.fainted) {
              for (const status of ringTheme.statuses[phase === 1 ? 0 : 1]) {
                applyStatusToActor(self, ally, status, enemy.atk);
              }
            }
          }
        }
        if (hasFollowUp) {
          self.showHazardHint('aftershock', FR.engine.contrecoupEloignezVous, 1.0);
          spawnEnemyTelegraph(
            self,
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
              spawnShockwaveRing(self, bx, bz, inner + FROST_KIT.aftershockMargin, ringTheme.aftershockColor);
              spawnElementBurst(self, bx, 0.6, bz, 'rock', 16, 1.3);
              self.trauma = Math.min(1, self.trauma + 0.3);
              for (const ally of self.allies) {
                if (
                  !ally.fainted &&
                  Math.hypot(ally.x - bx, ally.z - bz) <= inner + FROST_KIT.aftershockMargin + 0.4
                ) {
                  applyDamageToActor(self, ally, Math.round(enemy.atk * FROST_KIT.aftershockDamage), enemy, true, false, ringTheme.aftershockColor);
                }
              }
              if (phase === 3) {
                // Phase 3 : éclats en étoile
                for (let k = 0; k < FROST_KIT.shardCount; k++) {
                  const shardAng = (k / FROST_KIT.shardCount) * Math.PI * 2 + 0.3;
                  spawnProjectile(self, {
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
            { color: ringTheme.telegraphColor, phase },
          );
        }
      },
      { innerRadius: inner, color: ringTheme.telegraphColor, phase },
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
    self.showHazardHint('strike', strikeTheme.label, 1.4);
    soundFx.playTelegraph();
    for (let k = 0; k < strikes; k++) {
      const sx = THREE.MathUtils.clamp(bx + dirX * (2.4 + k * 2.3), -ARENA_BOUND, ARENA_BOUND);
      const sz = THREE.MathUtils.clamp(bz + dirZ * (2.4 + k * 2.3), -ARENA_BOUND, ARENA_BOUND);
      const isLast = k === strikes - 1;
      spawnEnemyTelegraph(
        self,
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
            spawnBolt(self, sx, sz);
            if (k % 3 === 0) soundFx.playThunder();
          } else if (k % 3 === 0) {
            soundFx.playHit(true, false);
          }
          spawnElementBurst(self, sx, 0.5, sz, strikeTheme.fx, 10, 1.2);
          self.trauma = Math.min(1, self.trauma + 0.14);
          for (const ally of self.allies) {
            if (
              !ally.fainted &&
              !struck.has(ally.id) &&
              Math.hypot(ally.x - sx, ally.z - sz) <= strikeRad + 0.35
            ) {
              const exposed = ally.invulnTimer <= 0;
              if (exposed) struck.add(ally.id);
              applyDamageToActor(self, ally, Math.round(enemy.atk * STORM_KIT.strikeDamage), enemy, true, false, strikeTheme.color);
              if (exposed && !ally.fainted) applyStatusToActor(self, ally, strikeTheme.status, enemy.atk);
            }
          }
        },
        { color: strikeTheme.color, silent: true, phase },
      );
    }
  } else {
    // Aspiration puis détonation (kit Orage à l'origine) : l'escouade est tirée vers le boss.
    // Réponse attendue : Esquive (qui annule l'aspiration) pour sortir du cercle.
    const eyeTheme = kitDef.eye ?? DEFAULT_EYE_THEME;
    const eyeRad = STORM_KIT.eyeRadius[phase - 1];
    const windup = STORM_KIT.eyeWindup[phase - 1];
    const bx = enemy.x;
    const bz = enemy.z;
    enemy.pullTimer = windup;
    self.showHazardHint('eye', eyeTheme.label, 1.5);
    spawnEnemyTelegraph(
      self,
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
          spawnBolt(self, bx, bz, 14);
          soundFx.playThunder();
        } else {
          soundFx.playHit(true, false);
        }
        spawnShockwaveRing(self, bx, bz, eyeRad, eyeTheme.color);
        spawnElementBurst(self, bx, 0.8, bz, eyeTheme.fx, 30, 1.5);
        self.trauma = Math.min(1, self.trauma + 0.5);
        for (const ally of self.allies) {
          if (!ally.fainted && Math.hypot(ally.x - bx, ally.z - bz) <= eyeRad + 0.4) {
            const exposed = ally.invulnTimer <= 0;
            applyDamageToActor(self, ally, Math.round(enemy.atk * STORM_KIT.eyeDamage), enemy, true, false, eyeTheme.color);
            if (exposed && !ally.fainted) applyStatusToActor(self, ally, eyeTheme.status, enemy.atk);
          }
        }
      },
      { color: eyeTheme.color, phase, shape: 'spiral' },
    );
  }
}
