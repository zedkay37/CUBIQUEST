/**
 * IA des ennemis à chaque pas : poursuiveur, tireur, chargeur, boss (déplacement et jetons d'attaque).
 */
import * as THREE from 'three';
import { STORM_KIT } from '../balance';
import { animateRigPose, findNearestLiving, updateActorCommon, updateEnemyDissolve } from './actors';
import { castBossPattern } from './boss';
import { ARENA_BOUND, MAX_ATTACK_TOKENS } from './constants';
import { applyDamageToActor } from './damage';
import { spawnEnemyTelegraph, spawnParticleBurst, spawnProjectile } from './fx';
import type { VoxelEngine } from '../VoxelEngine';

/** IA des ennemis : poursuiveur, tireur, chargeur, boss. */
export function updateEnemies(self: VoxelEngine, dt: number, simDt: number): void {
  // Count active attack tokens for fair crowd pacing
  let activeTokens = self.enemies.filter((e) => !e.fainted && !e.removed && e.hasAttackToken).length;

  // Update Enemies (4 distinct AI policies: chaser, kiter, charger, boss)
  for (const enemy of self.enemies) {
    if (enemy.removed) continue;
    updateActorCommon(self, enemy, dt, simDt);

    if (enemy.fainted) {
      updateEnemyDissolve(self, enemy, dt);
      continue;
    }
    const target = findNearestLiving(self, enemy.x, enemy.z, self.allies);
    if (!target) continue;

    const dx = target.x - enemy.x;
    const dz = target.z - enemy.z;
    const dist = Math.max(0.01, Math.hypot(dx, dz));
    enemy.facing = Math.atan2(dx, dz);
    let moved = false;

    // Œil du Cyclone : tant que le boss charge, le vent aspire les alliés vers lui
    if (enemy.pullTimer > 0) {
      enemy.pullTimer = Math.max(0, enemy.pullTimer - simDt);
      for (const ally of self.allies) {
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
      animateRigPose(self, enemy.rig, enemy.walkPhase, false, 0.84, self.elapsedTotal);
      continue;
    }

    if (enemy.stunTimer > 0) {
      animateRigPose(self, enemy.rig, enemy.walkPhase, false, 0.88, self.elapsedTotal);
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
        spawnProjectile(self, {
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
        spawnEnemyTelegraph(self, enemy.x, enemy.z, chargeLen, 0.65, true, dirX, dirZ, () => {
          enemy.telegraphing = false;
          enemy.hasAttackToken = false;
          enemy.aiCooldown = 4.2;
          if (enemy.fainted || enemy.removed) return;
          enemy.x = THREE.MathUtils.clamp(enemy.x + dirX * chargeLen, -ARENA_BOUND, ARENA_BOUND);
          enemy.z = THREE.MathUtils.clamp(enemy.z + dirZ * chargeLen, -ARENA_BOUND, ARENA_BOUND);
          spawnParticleBurst(self, enemy.x, 0.7, enemy.z, enemy.rig.species.palette.accent, 14, 5.0);
          for (const ally of self.allies) {
            if (!ally.fainted && Math.hypot(ally.x - enemy.x, ally.z - enemy.z) <= 2.2) {
              applyDamageToActor(self, ally, Math.round(enemy.atk * 1.45), enemy, true, false, '#EF4444');
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
        castBossPattern(self, enemy, target, dx, dz, dist);
      } else if (dist > 3.1) {
        enemy.x += (dx / dist) * enemySpeed * simDt;
        enemy.z += (dz / dist) * enemySpeed * simDt;
        enemy.walkPhase += enemySpeed * simDt * 3.0;
        moved = true;
      } else if (enemy.basicCooldown <= 0) {
        enemy.basicCooldown = phase >= 2 ? 1.25 : 1.7;
        enemy.squashY = 1.22;
        if (!confusedMiss) {
          applyDamageToActor(self, target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
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
          applyDamageToActor(self, target, enemy.atk, enemy, false, false, enemy.rig.species.palette.accent);
        }
      }
    }

    animateRigPose(self, enemy.rig, enemy.walkPhase, moved, enemy.squashY, self.elapsedTotal);
  }
}
