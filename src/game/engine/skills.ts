/**
 * Commandes de combat du joueur : sort d'un allié, Esquive, ultime d'escouade.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import { MOVES } from '../catalog';
import { DODGE_KIT, ULTIMATE_CHARGE, ULTIMATE_KIT } from '../balance';
import { calculateDamage, computeUltimateCharge, getMoveModifiers } from '../rules';
import { findNearestLiving } from './actors';
import { applyCubeRule, gainUltimateCharge, isTargetedMove, newCast, pickTargetFor, SUPPORT_RANGE } from './cubes';
import { ARENA_BOUND } from './constants';
import { applyDamageToActor } from './damage';
import { spawnParticleBurst, spawnProjectile, spawnShockwaveRing } from './fx';
import { emitHudSnapshot } from './hud';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { FR } from '../../i18n/fr';

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
  self.manualCasts += 1;
  executeAllySkill(self, unit);
  emitHudSnapshot(self);
  return true;
}

export function triggerDodge(self: VoxelEngine): boolean {
  if (
    self.playMode !== 'expedition' ||
    self.screenState !== 'playing' ||
    self.expeditionEnded ||
    self.bossIntroTimer > 0 ||
    self.dodgeCooldown > 0
  ) {
    return false;
  }
  self.dodgeCooldown = self.dodgeMaxCooldown;
  soundFx.playDodge();
  // La parfaite se décide à l'impact (damage.ts) : on retient seulement l'instant de l'appui
  self.lastDodgeAt = self.expeditionElapsed;
  self.dodgePerfectGiven = false;
  self.dodgesUsed += 1;

  // Direction : celle du déplacement en cours si une touche de direction est tenue
  let inX = 0;
  let inZ = 0;
  if (self.heldKeys.has('KeyW') || self.heldKeys.has('KeyZ') || self.heldKeys.has('ArrowUp')) inZ -= 1;
  if (self.heldKeys.has('KeyS') || self.heldKeys.has('ArrowDown')) inZ += 1;
  if (self.heldKeys.has('KeyA') || self.heldKeys.has('KeyQ') || self.heldKeys.has('ArrowLeft')) inX -= 1;
  if (self.heldKeys.has('KeyD') || self.heldKeys.has('ArrowRight')) inX += 1;
  const held = Math.hypot(inX, inZ);

  // Sinon : à l'opposé du centre des ennemis
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
    if (held > 0) {
      dx = inX / held;
      dz = inZ / held;
    } else if (len < 0.2) {
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
    ally.dodgeDirX = dx;
    ally.dodgeDirZ = dz;
    ally.dodgeTimer = 0.42;
    ally.invulnTimer = DODGE_KIT.invuln;
    ally.squashY = 1.24;
    spawnParticleBurst(self, ally.x, 0.5, ally.z, '#FAF7F0', 10, 4.2);
  });

  emitHudSnapshot(self);
  return true;
}

/**
 * Ultime d'escouade : Déchaînement (KeyR or HUD button at 100% charge)
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
  self.ultimateLockTimer = ULTIMATE_CHARGE.lockAfterUltimate;
  self.ultimatesUsed += 1;
  self.ultZoomTimer = 0.9; // sprint Art : zoom bref de la caméra
  soundFx.playUltimate();
  self.hitstopTimer = 0.085;
  self.trauma = Math.min(1, self.trauma + 0.7);
  self.bannerText = FR.engine.dechainement;
  self.bannerTimer = 1.8;

  // Le meneur (premier compagnon vivant, dans l'ordre de l'escouade) décide de l'effet
  const leader = livingAllies[0];
  const element = leader.rig.species.element;
  let combinedAtk = 0;
  for (const ally of livingAllies) {
    combinedAtk += ally.atk;
    ally.invulnTimer = Math.max(ally.invulnTimer, ULTIMATE_KIT.invulnSec);
    ally.squashY = 1.38;
    spawnParticleBurst(self, ally.x, 1.0, ally.z, ally.rig.species.palette.accent, 18, 6.2);
    spawnShockwaveRing(self, ally.x, ally.z, 5.5, ally.rig.species.palette.accent);
    if (element === 'grass') {
      const heal = Math.round(ally.maxHp * ULTIMATE_KIT.grassHealRatio);
      ally.hp = Math.min(ally.maxHp, ally.hp + heal);
      self.floatingText.spawn(ally.x, 2.1, ally.z, FR.engine.pv(heal), '#4ADE80', 1.0, 0.9);
    } else if (element === 'rock') {
      ally.shieldHp = Math.max(ally.shieldHp, Math.round(ally.maxHp * ULTIMATE_KIT.rockShieldRatio));
      self.floatingText.spawn(ally.x, 2.1, ally.z, FR.engine.boucl(ally.shieldHp), '#FDE047', 1.0, 0.9);
    } else if (element === 'psychic') {
      ally.skillCooldown = 0;
    }
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
    self.floatingText.spawn(cx, 2.9, cz, FR.engine.dechainementDe(FR.ui.ultimateWords[element]), '#F4B942', 1.4, 1.15);

    const baseUltDmg = Math.round(combinedAtk * ULTIMATE_KIT.baseMult);
    // Un seul lancer : le Déchaînement compte comme un sort de l'élément du meneur
    const cast = newCast();
    if (element === 'water') {
      // Triple coup sur l'ennemi le plus solide, coups espacés
      let target = livingEnemies[0];
      for (const e of livingEnemies) if (e.hp > target.hp) target = e;
      applyDamageToActor(self, target, baseUltDmg, leader, true, true, '#F4B942', element, true, cast);
      self.pendingUltHits = { target, caster: leader, damage: baseUltDmg, remaining: ULTIMATE_KIT.waterHits - 1, timer: ULTIMATE_KIT.waterHitGap, cast };
    } else {
      const dmg = element === 'fire' ? Math.round(baseUltDmg * ULTIMATE_KIT.fireMult) : baseUltDmg;
      for (const enemy of livingEnemies) {
        applyDamageToActor(self, enemy, dmg, leader, true, true, '#F4B942', element, true, cast);
        if (element === 'electric' && !enemy.fainted) {
          enemy.stunTimer = Math.max(enemy.stunTimer, enemy.isBoss ? ULTIMATE_KIT.electricStunBoss : ULTIMATE_KIT.electricStun);
        }
      }
    }
  }

  emitHudSnapshot(self);
  return true;
}

/** Déchaînement Eau : les coups suivants du triple coup. */
export function updatePendingUltimateHits(self: VoxelEngine, simDt: number): void {
  const p = self.pendingUltHits;
  if (!p || simDt <= 0) return;
  p.timer -= simDt;
  if (p.timer > 0) return;
  if (!p.target.fainted && !p.target.removed) {
    applyDamageToActor(self, p.target, p.damage, p.caster, true, true, '#F4B942', p.caster.rig.species.element, true, p.cast);
  }
  p.remaining -= 1;
  p.timer = ULTIMATE_KIT.waterHitGap;
  if (p.remaining <= 0 || p.target.fainted) self.pendingUltHits = null;
}

export function executeAllySkill(self: VoxelEngine, unit: CombatActor): void {
  const move = MOVES[unit.moveId] ?? MOVES.ember_burst;
  const mods = getMoveModifiers(unit.runes);
  unit.skillCooldown = unit.skillMaxCooldown;
  unit.squashY = 1.28;
  soundFx.playSkill(move.element);

  // Ciblage intelligent pour les sorts à cible ; les sorts de mêlée et de zone autour du lanceur
  // touchent ce qui est à leur portée (la règle des cubes s'applique à chaque ennemi touché).
  const target = isTargetedMove(unit.moveId)
    ? pickTargetFor(self, unit, move.range)
    : findNearestLiving(self, unit.x, unit.z, self.enemies);
  const radius = move.aoeRadius * mods.radiusMult;
  const cast = newCast();

  if (move.style === 'buff') {
    unit.buffTimer = 8.0;
    const healAmt = Math.round(unit.maxHp * 0.14);
    unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
    gainUltimateCharge(self, ULTIMATE_CHARGE.support);
    spawnParticleBurst(self, unit.x, 0.9, unit.z, move.color, 14, 4.0);
    self.floatingText.spawn(unit.x, 2.0, unit.z, FR.engine.pv(healAmt), '#4ADE80', 0.95);

    if (mods.shareRatio > 0) {
      for (const mate of self.allies) {
        if (mate.id !== unit.id && !mate.fainted) {
          mate.buffTimer = Math.max(mate.buffTimer, 8.0 * mods.shareRatio + 2.0);
          const sharedHeal = Math.round(healAmt * mods.shareRatio);
          mate.hp = Math.min(mate.maxHp, mate.hp + sharedHeal);
          spawnParticleBurst(self, mate.x, 0.9, mate.z, '#C084FC', 10, 3.4);
          self.floatingText.spawn(mate.x, 2.0, mate.z, FR.engine.pv(sharedHeal), '#4ADE80', 0.85);
        }
      }
    }
    // Le sort de soutien pose aussi son cube, sans dégâts, sur la cible du ciblage intelligent
    const supportTarget = pickTargetFor(self, unit, SUPPORT_RANGE);
    if (supportTarget && Math.hypot(supportTarget.x - unit.x, supportTarget.z - unit.z) <= SUPPORT_RANGE) {
      applyCubeRule(self, supportTarget, move.element, unit, 0, cast);
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
      unit.runes,
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
  // L'ennemi le plus proche du centre passe en premier : c'est lui qui reçoit l'Éclat à effet
  const touched = self.enemies
    .filter((e) => !e.fainted && !e.removed && Math.hypot(e.x - centerX, e.z - centerZ) <= radius + (e.isBoss ? 1.1 : 0.6))
    .sort((a, b) => Math.hypot(a.x - centerX, a.z - centerZ) - Math.hypot(b.x - centerX, b.z - centerZ));
  for (const enemy of touched) {
    {
      const res = calculateDamage(
        unit.atk,
        move,
        enemy.rig.species.element,
        unit.critRate,
        unit.runes,
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
        cast,
      );
      hitAny = true;
    }
  }

  if (hitAny) {
    self.hitstopTimer = Math.max(self.hitstopTimer, 0.045);
    self.trauma = Math.min(1, self.trauma + 0.38);
  }
}
