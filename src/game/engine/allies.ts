/**
 * Alliés à chaque pas : déplacement (clavier, formation, poursuite), attaque de base, sort automatique en « Auto ».
 */
import * as THREE from 'three';
import { MOVES } from '../catalog';
import { calculateDamage } from '../rules';
import { animateRigPose, findNearestLiving, updateActorCommon } from './actors';
import { ARENA_BOUND } from './constants';
import { applyDamageToActor } from './damage';
import { spawnParticleBurst, spawnProjectile } from './fx';
import { executeAllySkill } from './skills';
import type { VoxelEngine } from '../VoxelEngine';

/** Déplacements (clavier, formation, poursuite), attaques de base et sorts automatiques des alliés. */
export function updateAllies(self: VoxelEngine, dt: number, simDt: number): void {
  // Manual WASD / ZQSD / Arrow movement vector for leader
  let moveInputX = 0;
  let moveInputZ = 0;
  if (self.heldKeys.has('KeyW') || self.heldKeys.has('KeyZ') || self.heldKeys.has('ArrowUp')) {
    moveInputZ -= 1;
  }
  if (self.heldKeys.has('KeyS') || self.heldKeys.has('ArrowDown')) {
    moveInputZ += 1;
  }
  if (self.heldKeys.has('KeyA') || self.heldKeys.has('KeyQ') || self.heldKeys.has('ArrowLeft')) {
    moveInputX -= 1;
  }
  if (self.heldKeys.has('KeyD') || self.heldKeys.has('ArrowRight')) {
    moveInputX += 1;
  }
  // ART2 : manette tactile (mode Manuel) quand aucune touche n'est tenue
  if (moveInputX === 0 && moveInputZ === 0 && (self.touchMoveX !== 0 || self.touchMoveZ !== 0)) {
    moveInputX = self.touchMoveX;
    moveInputZ = self.touchMoveZ;
  }
  const hasManualInput = moveInputX !== 0 || moveInputZ !== 0;
  if (hasManualInput) {
    const len = Math.hypot(moveInputX, moveInputZ);
    moveInputX /= len;
    moveInputZ /= len;
  }

  // Update Allies
  const leader = self.allies.find((a) => !a.fainted) ?? self.allies[0];
  for (let i = 0; i < self.allies.length; i++) {
    const ally = self.allies[i];
    updateActorCommon(self, ally, dt, simDt);

    if (ally.fainted) {
      ally.reviveTimer = Math.max(0, ally.reviveTimer - simDt);
      ally.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(ally.rig.bodyPivot.rotation.z, Math.PI / 2, 10, dt);
      if (ally.reviveTimer <= 0) {
        ally.fainted = false;
        ally.hp = Math.round(ally.maxHp * 0.55);
        ally.invulnTimer = 1.2;
        ally.rig.bodyPivot.rotation.z = 0;
        spawnParticleBurst(self, ally.x, 0.8, ally.z, '#2FB97A', 16, 4.5);
      }
      continue;
    }

    ally.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(ally.rig.bodyPivot.rotation.z, 0, 12, dt);

    if (ally.dodgeTimer > 0) {
      ally.dodgeTimer = Math.max(0, ally.dodgeTimer - simDt);
      const dashSpd = ally.moveSpeed * 2.55;
      ally.x = THREE.MathUtils.clamp(ally.x + ally.dodgeDirX * dashSpd * simDt, -ARENA_BOUND, ARENA_BOUND);
      ally.z = THREE.MathUtils.clamp(ally.z + ally.dodgeDirZ * dashSpd * simDt, -ARENA_BOUND, ARENA_BOUND);
      ally.facing = Math.atan2(ally.dodgeDirX, ally.dodgeDirZ);
      ally.walkPhase += dashSpd * simDt * 3.2;
      animateRigPose(self, ally.rig, ally.walkPhase, true, ally.squashY, self.elapsedTotal);
      continue;
    }

    const target = findNearestLiving(self, ally.x, ally.z, self.enemies);
    let moved = false;

    const allySpeedMult = ally.statuses.rooted ? 0.45 : ally.statuses.soaked ? 0.78 : 1.0;
    const effectiveSpeed = ally.moveSpeed * allySpeedMult;

    if (ally.stunTimer > 0) {
      animateRigPose(self, ally.rig, ally.walkPhase, false, 0.88, self.elapsedTotal);
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
    } else if (target && self.controlMode !== 'manual') {
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
          spawnProjectile(self, {
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
            self,
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
    if (self.controlMode === 'auto' && target && ally.skillCooldown <= 0) {
      const move = MOVES[ally.moveId] ?? MOVES.ember_burst;
      const dist = Math.hypot(target.x - ally.x, target.z - ally.z);
      if (move.style === 'buff' || dist <= move.range + 1.2) {
        executeAllySkill(self, ally);
      }
    }

    animateRigPose(self, ally.rig, ally.walkPhase, moved, ally.squashY, self.elapsedTotal);
  }

  // Soft separation between living allies so they never overlap
  for (let i = 0; i < self.allies.length; i++) {
    for (let j = i + 1; j < self.allies.length; j++) {
      const a = self.allies[i];
      const b = self.allies[j];
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
