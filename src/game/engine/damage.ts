/**
 * Résolution d'un coup : faiblesses, cubes d'élément (cubes.ts), boucliers, K.O., changement de phase du boss.
 */
import { soundFx } from '../audio';
import {
  computeBossPhase,
  computeUltimateCharge,
  getMoveModifiers,
  getTypeEffectiveness,
} from '../rules';
import { BOSS_MODULES, DODGE_KIT, ULTIMATE_CHARGE } from '../balance';
import { grantBossShield, spawnGuardians } from './boss';
import { clearHazards } from './fx';
import type { ElementType } from '../types';
import { getRigTopY } from '../voxelModels';
import { applyCubeRule, gainUltimateCharge, newCast, type CastContext } from './cubes';
import { spawnElementBurst, spawnParticleBurst, spawnShockwaveRing } from './fx';
import { emitHudSnapshot } from './hud';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { LESSON_DODGE } from './lessons';
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
  /** Lancer en cours : un seul Éclat à effet et un seul Trio par lancer (voir cubes.ts). */
  cast?: CastContext,
): void {
  if (target.fainted || target.removed) return;
  // Impact d'une attaque annoncée sur un allié : esquivée (invulnérable) ou subie
  if (self.resolvingHazard && target.isAlly && attacker && !attacker.isAlly) {
    if (target.invulnTimer > 0) {
      onHazardDodged(self, target);
      return;
    }
    self.hazardHitsTaken += 1;
  }
  if (target.invulnTimer > 0) return;

  let dmg = rawDamage;
  // Leçon d'esquive (S07.2) : une attaque annoncée ratée ne fait que 30 % cette fois-là
  if (self.resolvingHazard && target.isAlly && self.lessonActive === 'dodge') dmg *= LESSON_DODGE.missedDamageMult;

  // Sunder (+25% damage taken)
  if (target.statuses.sunder && target.statuses.sunder.remaining > 0) {
    dmg *= 1.25;
  }

  // Cubes d'élément : tout coup de sort allié sur un ennemi applique la règle (pose, Éclat, Trio)
  self.lastCubeOutcome = null;
  if (attacker?.isAlly && isSkillHit && incomingElement && !target.isAlly) {
    dmg *= applyCubeRule(self, target, incomingElement, attacker, rawDamage, cast ?? newCast());
  }
  // Satellites : tant qu'un gardien tient, le boss subit moitié moins
  if (target.isBoss && !target.isAlly && self.enemies.some((g) => g.guardianOf === target.id && !g.fainted && !g.removed)) {
    dmg *= BOSS_MODULES.satellites.damageTakenMult;
  }

  const defMult = target.buffTimer > 0 ? 0.65 : 1.0;
  let finalDmg = Math.max(1, Math.round(dmg * defMult));

  // Le bouclier (Rempart, Déchaînement Roche) absorbe d'abord les dégâts
  if (target.shieldHp > 0) {
    // Carapace de magma : un coup qui déclenche un Éclat ou un Trio compte triple contre le bouclier
    const factor = !target.isAlly && (self.lastCubeOutcome === 'burst' || self.lastCubeOutcome === 'trio') ? BOSS_MODULES.shield.burstFactor : 1;
    const absorbed = Math.min(target.shieldHp, finalDmg * factor);
    target.shieldHp -= absorbed;
    finalDmg -= Math.ceil(absorbed / factor);
    if (finalDmg < 0) finalDmg = 0;
    if (target.shieldHp <= 0 && target.shieldMax > 0 && !target.isAlly) {
      target.shieldHp = 0;
      self.telemetry.shieldBreakSecs.push(self.expeditionElapsed - target.shieldSince);
      spawnParticleBurst(self, target.x, 1.4, target.z, '#F97316', 24, 6);
    }
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
    gainUltimateCharge(self, isSkillHit ? ULTIMATE_CHARGE.skillHit : ULTIMATE_CHARGE.basicHit);

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
      self.allyKos += 1;
      target.reviveTimer = 11.0;
    } else {
      target.koDissolveTimer = 0.42;
    }
  }
}

/** Une attaque annoncée vient d'être annulée par l'invulnérabilité de l'esquive. Parfaite si l'appui est récent. */
function onHazardDodged(self: VoxelEngine, ally: CombatActor): void {
  self.hazardsAvoided += 1;
  if (self.dodgePerfectGiven || self.expeditionElapsed - self.lastDodgeAt > DODGE_KIT.perfectWindow + 1e-6) return;
  self.dodgePerfectGiven = true; // une seule fois par appui
  self.perfectDodges += 1;
  gainUltimateCharge(self, ULTIMATE_CHARGE.perfectDodge);
  self.dodgeCooldown = Math.max(0, self.dodgeCooldown - self.dodgeMaxCooldown * DODGE_KIT.perfectRefund);
  soundFx.playPerfectDodge();
  self.floatingText.spawn(ally.x, 2.4, ally.z, FR.engine.parfait, '#38BDF8', 1.3, 1.05);
  if (self.shakeEnabled) {
    self.slowMoTimer = Math.max(self.slowMoTimer, DODGE_KIT.perfectSlowMo);
    self.slowMoScale = DODGE_KIT.perfectSlowMoScale;
  }
}

export function onBossPhaseShift(self: VoxelEngine, boss: CombatActor, phase: 2 | 3): void {
  self.telemetry.phaseStartedAt[phase - 1] = self.expeditionElapsed;
  // un saut direct de la phase 1 à la phase 3 fait commencer (et finir) la phase 2 au même instant
  if (phase === 3 && self.telemetry.phaseStartedAt[1] < 0) {
    self.telemetry.phaseStartedAt[1] = self.expeditionElapsed;
  }
  soundFx.playBossPhase();
  const label = phase === 3 ? FR.engine.phase3DernierSursaut : FR.engine.phase2Fureur;
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
  // Changement de phase : boss invulnérable, zones actives annulées, aucune attaque pendant 1 s
  boss.invulnTimer = Math.max(boss.invulnTimer, BOSS_MODULES.phaseShift.invuln);
  clearHazards(self);
  boss.skillCooldown = Math.max(1.4, BOSS_MODULES.phaseShift.silence);
  grantBossShield(self, boss);
  spawnGuardians(self, boss);
  emitHudSnapshot(self);
}
