/**
 * Résolution d'un coup : faiblesses, statuts, réactions élémentaires, boucliers, K.O., changement de phase du boss.
 */
import { soundFx } from '../audio';
import {
  computeBossPhase,
  computeUltimateCharge,
  getMoveModifiers,
  getStatusForElement,
  getTypeEffectiveness,
  resolveElementalReaction,
} from '../rules';
import type { ElementType } from '../types';
import { getRigTopY } from '../voxelModels';
import { applyStatusToActor, getPrimaryStatus } from './actors';
import { spawnElementBurst, spawnParticleBurst, spawnShockwaveRing } from './fx';
import { emitHudSnapshot } from './hud';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { FR } from '../../i18n/fr';

export function applyDamageToActor(
  self: VoxelEngine,
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
    const existing = getPrimaryStatus(self, target);
    const reaction = self.reactionsEnabled ? resolveElementalReaction(existing, incomingElement) : null;
    if (reaction && existing) {
      delete target.statuses[existing];
      dmg *= reaction.damageMult;
      self.reactionsTriggered += 1;
      self.ultimateCharge = computeUltimateCharge(self.ultimateCharge, reaction.ultimateBonus);
      self.lastReactionLabel = reaction.name;
      self.lastReactionColor = reaction.color;
      self.lastReactionTimer = 2.4;
      soundFx.playReaction();
      self.hitstopTimer = Math.max(self.hitstopTimer, 0.055);
      self.trauma = Math.min(1, self.trauma + 0.34);
      spawnShockwaveRing(self, target.x, target.z, 3.6, reaction.color);
      spawnParticleBurst(self, target.x, 1.1, target.z, reaction.color, 22, 6.2);
      self.floatingText.spawn(target.x, 2.55, target.z, reaction.name, reaction.color, 1.25, 1.1);

      // Reaction secondary mechanical effects
      if (reaction.effect === 'aoe_burn') {
        for (const other of self.enemies) {
          if (other.id !== target.id && !other.fainted && !other.removed) {
            if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.4) {
              applyStatusToActor(self, other, 'burn', attacker.atk);
              other.hp = Math.max(1, other.hp - Math.round(rawDamage * 0.45));
              self.floatingText.spawn(other.x, 1.9, other.z, `-${Math.round(rawDamage * 0.45)}`, '#FB923C', 0.9);
            }
          }
        }
      } else if (reaction.effect === 'chain_stun') {
        let chains = 0;
        for (const other of self.enemies) {
          if (chains >= 2) break;
          if (other.id !== target.id && !other.fainted && !other.removed) {
            if (Math.hypot(other.x - target.x, other.z - target.z) <= 5.5) {
              chains += 1;
              applyStatusToActor(self, other, 'shocked', attacker.atk);
              const chainDmg = Math.round(rawDamage * 0.55);
              other.hp = Math.max(1, other.hp - chainDmg);
              spawnParticleBurst(self, other.x, 0.9, other.z, '#FACC15', 10, 4.5);
              self.floatingText.spawn(other.x, 2.0, other.z, `${chainDmg}`, '#FACC15', 0.95);
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
        for (const ally of self.allies) {
          if (!ally.fainted) {
            const shieldGain = Math.round(ally.maxHp * 0.15);
            ally.shieldHp = Math.min(Math.round(ally.maxHp * 0.35), ally.shieldHp + shieldGain);
            spawnParticleBurst(self, ally.x, 0.9, ally.z, '#EAB308', 8, 3.2);
            self.floatingText.spawn(ally.x, 2.0, ally.z, FR.engine.boucl(shieldGain), '#FDE047', 0.85);
          }
        }
      } else if (reaction.effect === 'cd_spread') {
        attacker.skillCooldown = Math.max(0.4, attacker.skillCooldown - 1.5);
        for (const other of self.enemies) {
          if (other.id !== target.id && !other.fainted && !other.removed) {
            if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.8) {
              applyStatusToActor(self, other, existing, attacker.atk);
            }
          }
        }
      }
    } else {
      const applied = getStatusForElement(incomingElement);
      applyStatusToActor(self, target, applied, attacker.atk);
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
    self.floatingText.spawn(
      target.x,
      numY,
      target.z,
      label,
      textColor,
      (isCrit ? 1.2 : isHeavy ? 1.02 : 0.84) * effScale,
      0.78,
    );
  } else {
    self.floatingText.spawn(target.x, numY, target.z, FR.engine.bloque, '#FDE047', 0.82, 0.65);
  }

  if (attacker?.isAlly && !target.isAlly) {
    self.damageDealt += finalDmg;
    self.comboCount += 1;
    self.comboTimer = 4.8;
    if (self.comboCount > self.maxCombo) self.maxCombo = self.comboCount;
    self.ultimateCharge = computeUltimateCharge(self.ultimateCharge, isSkillHit ? 6.5 : 2.8);

    if (attacker.hitHeal > 0 && !attacker.fainted && finalDmg > 0) {
      const heal = Math.max(1, Math.round((finalDmg * attacker.hitHeal) / 100));
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }
    // Rune de Vigueur : la compétence rend une part des dégâts au lanceur
    if (isSkillHit && !attacker.fainted && finalDmg > 0 && attacker.runes.includes('rune_vigueur')) {
      const leech = getMoveModifiers(attacker.runes).leechRatio;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.max(1, Math.round(finalDmg * leech)));
    }
  }

  // Check Boss Phase Shift!
  if (target.isBoss && target.hp > 0) {
    const nextPhase = computeBossPhase(target.hp, target.maxHp, target.bossMaxPhases === 3);
    if (nextPhase > target.bossPhase && nextPhase !== 1) {
      target.bossPhase = nextPhase;
      onBossPhaseShift(self, target, nextPhase);
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
    spawnElementBurst(self, target.x, 0.85, target.z, incomingElement, isHeavy ? 12 : 5, isHeavy ? 1.15 : 0.8);
    if (isCrit) spawnParticleBurst(self, target.x, 1.0, target.z, '#FFE066', 6, 4.6);
  } else {
    spawnParticleBurst(self, target.x, 0.85, target.z, isCrit ? '#FFE066' : fxColor, isHeavy ? 14 : 6, isHeavy ? 5.2 : 3.2);
  }

  if (isCrit || isHeavy) {
    self.trauma = Math.min(1, self.trauma + (isCrit ? 0.3 : 0.18));
  }
  if (isCrit && !target.isAlly) {
    // léger hit-stop sur critique pour faire claquer l'impact
    self.hitstopTimer = Math.max(self.hitstopTimer, 0.032);
  }

  if (target.hp <= 0) {
    target.fainted = true;
    target.telegraphing = false;
    target.hasAttackToken = false;
    target.statuses = {};
    if (target.isBoss && !target.isAlly) self.telemetry.bossDefeatedAt = self.expeditionElapsed;
    soundFx.playKo();
    self.hitstopTimer = Math.max(self.hitstopTimer, target.isBoss ? 0.075 : 0.04);
    self.trauma = Math.min(1, self.trauma + (target.isBoss ? 0.65 : 0.25));
    spawnParticleBurst(
      self,
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

export function onBossPhaseShift(self: VoxelEngine, boss: CombatActor, phase: 2 | 3): void {
  self.telemetry.phaseStartedAt[phase - 1] = self.expeditionElapsed;
  // un saut direct de la phase 1 à la phase 3 fait commencer (et finir) la phase 2 au même instant
  if (phase === 3 && self.telemetry.phaseStartedAt[1] < 0) {
    self.telemetry.phaseStartedAt[1] = self.expeditionElapsed;
  }
  soundFx.playBossPhase();
  const label = phase === 3 ? FR.engine.phase3Surcharge : FR.engine.phase2Fureur;
  const auraColor = phase === 3 ? '#F4B942' : '#F43F5E';
  self.bannerText = `${boss.name} — ${label}`;
  self.bannerTimer = 2.6;
  self.trauma = Math.min(1, self.trauma + 0.55);
  self.hitstopTimer = Math.max(self.hitstopTimer, 0.06);
  spawnShockwaveRing(self, boss.x, boss.z, 6.2, auraColor);
  spawnParticleBurst(self, boss.x, 1.3, boss.z, auraColor, 30, 6.8);
  self.floatingText.spawn(boss.x, 3.0, boss.z, label, auraColor, 1.35, 1.25);

  // Gentle non-lethal pushback so player clearly reads the phase transition
  for (const ally of self.allies) {
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
  emitHudSnapshot(self);
}
