/**
 * Commandes de combat du joueur : sort d'un allié, Dispersion (esquive), ultime d'escouade.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import { MOVES } from '../catalog';
import { calculateDamage, computeUltimateCharge, getMoveModifiers } from '../rules';
import { findNearestLiving } from './actors';
import { ARENA_BOUND } from './constants';
import { applyDamageToActor } from './damage';
import { spawnParticleBurst, spawnProjectile, spawnShockwaveRing } from './fx';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';

export function triggerAllySkill(self: VoxelEngine, slotIndex: number): boolean {
  if (
    self.playMode !== 'expedition' ||
    self.screenState !== 'playing' ||
    self.expeditionEnded ||
    self.bossIntroTimer > 0 // cinématique d'entrée : commandes gelées
  ) {
    return false;
  }
  const unit = self.allies[slotIndex];
  if (!unit || unit.fainted || unit.skillCooldown > 0) return false;
  executeAllySkill(self, unit);
  self.emitHudSnapshot();
  return true;
}

export function triggerScatter(self: VoxelEngine): boolean {
  if (
    self.playMode !== 'expedition' ||
    self.screenState !== 'playing' ||
    self.expeditionEnded ||
    self.bossIntroTimer > 0 ||
    self.scatterCooldown > 0
  ) {
    return false;
  }
  self.scatterCooldown = self.scatterMaxCooldown;
  soundFx.playScatter();

  // Perfect Dodge check: if any enemy hazard telegraph is active right now, reward the squad!
  const activeHazard = self.telegraphs.some((tg) => tg.isEnemyHazard);
  if (activeHazard) {
    self.perfectDodges += 1;
    self.ultimateCharge = computeUltimateCharge(self.ultimateCharge, 14);
    soundFx.playPerfectDodge();
    const firstAlive = self.allies.find((a) => !a.fainted);
    if (firstAlive) {
      self.floatingText.spawn(firstAlive.x, 2.4, firstAlive.z, 'ESQUIVE PARFAITE !', '#38BDF8', 1.25, 1.05);
    }
  }

  // Compute enemy centroid to dash AWAY from danger
  let cx = 0;
  let cz = 0;
  const livingEnemies = self.enemies.filter((e) => !e.fainted && !e.removed);
  if (livingEnemies.length > 0) {
    for (const e of livingEnemies) {
      cx += e.x;
      cz += e.z;
    }
    cx /= livingEnemies.length;
    cz /= livingEnemies.length;
  }

  self.allies.forEach((ally, idx) => {
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
    spawnParticleBurst(self, ally.x, 0.5, ally.z, activeHazard ? '#38BDF8' : '#FAF7F0', 10, 4.2);
  });

  self.emitHudSnapshot();
  return true;
}

/**
 * V0.2 Squad Ultimate: Cubi-Déchaînement (KeyR or HUD button at 100% charge)
 */
export function triggerUltimate(self: VoxelEngine): boolean {
  if (
    self.playMode !== 'expedition' ||
    self.screenState !== 'playing' ||
    self.expeditionEnded ||
    self.bossIntroTimer > 0 ||
    self.ultimateCharge < 100
  ) {
    return false;
  }

  const livingAllies = self.allies.filter((a) => !a.fainted);
  if (livingAllies.length === 0) return false;

  self.ultimateCharge = 0;
  self.ultimatesUsed += 1;
  soundFx.playUltimate();
  self.hitstopTimer = 0.085;
  self.trauma = Math.min(1, self.trauma + 0.7);
  self.bannerText = 'CUBI-DÉCHAÎNEMENT !';
  self.bannerTimer = 1.8;

  let combinedAtk = 0;
  for (const ally of livingAllies) {
    combinedAtk += ally.atk;
    ally.invulnTimer = Math.max(ally.invulnTimer, 0.9);
    ally.squashY = 1.38;
    const heal = Math.round(ally.maxHp * 0.22);
    ally.hp = Math.min(ally.maxHp, ally.hp + heal);
    spawnParticleBurst(self, ally.x, 1.0, ally.z, ally.rig.species.palette.accent, 18, 6.2);
    self.floatingText.spawn(ally.x, 2.1, ally.z, `+${heal} PV`, '#4ADE80', 1.0, 0.9);
    spawnShockwaveRing(self, ally.x, ally.z, 5.5, ally.rig.species.palette.accent);
  }

  const livingEnemies = self.enemies.filter((e) => !e.fainted && !e.removed);
  if (livingEnemies.length > 0) {
    let cx = 0;
    let cz = 0;
    for (const e of livingEnemies) {
      cx += e.x;
      cz += e.z;
    }
    cx /= livingEnemies.length;
    cz /= livingEnemies.length;
    spawnShockwaveRing(self, cx, cz, 8.5, '#F4B942');
    spawnParticleBurst(self, cx, 1.2, cz, '#FFE066', 36, 7.4);
    self.floatingText.spawn(cx, 2.9, cz, 'CUBI-DÉCHAÎNEMENT !', '#F4B942', 1.4, 1.15);

    const leadAlly = livingAllies[0];
    const baseUltDmg = Math.round(combinedAtk * 1.35);
    for (const enemy of livingEnemies) {
      applyDamageToActor(
        self,
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

  self.emitHudSnapshot();
  return true;
}

export function executeAllySkill(self: VoxelEngine, unit: CombatActor): void {
  const move = MOVES[unit.moveId] ?? MOVES.ember_burst;
  const mods = getMoveModifiers(unit.moveStones);
  unit.skillCooldown = unit.skillMaxCooldown;
  unit.squashY = 1.28;
  soundFx.playSkill(move.element);

  const target = findNearestLiving(self, unit.x, unit.z, self.enemies);
  const radius = move.aoeRadius * mods.radiusMult;

  if (move.style === 'buff') {
    unit.buffTimer = 8.0;
    const healAmt = Math.round(unit.maxHp * 0.14);
    unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
    self.ultimateCharge = computeUltimateCharge(self.ultimateCharge, 8);
    spawnParticleBurst(self, unit.x, 0.9, unit.z, move.color, 14, 4.0);
    self.floatingText.spawn(unit.x, 2.0, unit.z, `+${healAmt} PV`, '#4ADE80', 0.95);

    if (mods.shareRatio > 0) {
      for (const mate of self.allies) {
        if (mate.id !== unit.id && !mate.fainted) {
          mate.buffTimer = Math.max(mate.buffTimer, 8.0 * mods.shareRatio + 2.0);
          const sharedHeal = Math.round(healAmt * mods.shareRatio);
          mate.hp = Math.min(mate.maxHp, mate.hp + sharedHeal);
          spawnParticleBurst(self, mate.x, 0.9, mate.z, '#C084FC', 10, 3.4);
          self.floatingText.spawn(mate.x, 2.0, mate.z, `+${sharedHeal} PV`, '#4ADE80', 0.85);
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
    spawnProjectile(self, {
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
    spawnParticleBurst(self, unit.x, 0.7, unit.z, move.color, 18, 5.4);
  }

  // Melee / AoE / Dash arrival impact
  const centerX = move.style === 'aoe' && target && move.range > 5.5 ? target.x : unit.x;
  const centerZ = move.style === 'aoe' && target && move.range > 5.5 ? target.z : unit.z;
  spawnShockwaveRing(self, centerX, centerZ, radius, move.color);
  spawnParticleBurst(self, centerX, 0.8, centerZ, move.color, 20, 5.6);

  let hitAny = false;
  for (const enemy of self.enemies) {
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
      applyDamageToActor(
        self,
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
    self.hitstopTimer = Math.max(self.hitstopTimer, 0.045);
    self.trauma = Math.min(1, self.trauma + 0.38);
  }
}
