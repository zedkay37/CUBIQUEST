/**
 * Cubes d'élément dans le moteur (S04, plan section 5.1) : pose, maturation, Éclat, Fêlure, Trio.
 * La décision est une règle pure (`resolveCubeHit`, rules.ts) ; ce module applique ses conséquences.
 *
 * Sur un ennemi, le cube REMPLACE les statuts : un seul à la fois, et son effet est le statut de son
 * élément, pour la durée du cube. Les altérations que les boss infligent aux alliés ne sont pas des cubes.
 */
import { soundFx } from '../audio';
import { CUBE_KIT, ULTIMATE_CHARGE } from '../balance';
import { BURSTS, MOVES } from '../catalog';
import { computeUltimateCharge, getStatusForElement, pickSkillTarget, resolveCubeHit, type CubeOutcome } from '../rules';
import type { ElementType } from '../types';
import { findNearestLiving } from './actors';
import { spawnParticleBurst, spawnShockwaveRing } from './fx';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';
import { FR } from '../../i18n/fr';

/** Ajoute de la charge de Déchaînement, sauf pendant le verrou qui suit un Déchaînement. */
export function gainUltimateCharge(self: VoxelEngine, gain: number): void {
  if (self.ultimateLockTimer > 0) return;
  self.ultimateCharge = computeUltimateCharge(self.ultimateCharge, gain);
}

/** Un lancer de sort : un seul Éclat à effet et un seul Trio, quel que soit le nombre de cibles. */
export interface CastContext {
  burstEffectUsed: boolean;
  trioUsed: boolean;
  burstUltGiven: boolean;
}
export const newCast = (): CastContext => ({ burstEffectUsed: false, trioUsed: false, burstUltGiven: false });

/** Ce que voit le joueur sur la carte d'un compagnon : ce que ferait son sort maintenant. */
export type SkillPreview = 'trio' | 'burst' | 'ripening' | 'cube' | 'far';

/** Les Trios ne sont possibles que si le joueur dirige (pas en Auto). */
export const trioAllowed = (self: VoxelEngine): boolean => self.controlMode !== 'auto';

/** Pose (ou rafraîchit) un cube sur un ennemi ; son statut dure aussi longtemps que lui. */
export function setCube(self: VoxelEngine, target: CombatActor, element: ElementType, sourceAtk: number, keepAge = false): void {
  const age = keepAge && target.cube && target.cube.element === element ? target.cube.age : 0;
  target.cube = { element, age, remaining: CUBE_KIT.duration };
  const kind = getStatusForElement(element);
  target.statuses = { [kind]: { remaining: CUBE_KIT.duration, tickTimer: 0.9, sourceAtk } };
  if (kind === 'shocked' && !target.isBoss && !keepAge) target.stunTimer = Math.max(target.stunTimer, 0.95);
}

export function clearCube(target: CombatActor): void {
  target.cube = null;
  target.statuses = {};
}

/** Vieillit le cube, la Fêlure et le verrou d'un ennemi. */
export function tickCubeState(self: VoxelEngine, actor: CombatActor, simDt: number): void {
  if (actor.isAlly || simDt <= 0) return;
  if (actor.cube) {
    const wasRipe = actor.cube.age >= CUBE_KIT.ripenTime;
    actor.cube.age += simDt;
    actor.cube.remaining -= simDt;
    if (actor.cube.remaining <= 0) clearCube(actor);
    else if (!wasRipe && actor.cube.age >= CUBE_KIT.ripenTime) onCubeRipe(self, actor);
  }
  if (actor.crack) {
    actor.crack.remaining -= simDt;
    if (actor.crack.remaining <= 0) {
      actor.crack = null;
      self.cracksExpired += 1;
    }
  }
  if (actor.trioLockTimer > 0) actor.trioLockTimer = Math.max(0, actor.trioLockTimer - simDt);
}

/** Hook de maturation (signal visuel et sonore, voir S04.3). */
export function onCubeRipe(self: VoxelEngine, actor: CombatActor): void {
  if (self.elapsedTotal - self.lastRipeSoundAt >= 0.15) {
    self.lastRipeSoundAt = self.elapsedTotal;
    soundFx.playCubeRipe();
  }
  actor.cubeRipeFlash = 0.18;
}

/**
 * Applique la règle des cubes pour un coup de sort allié sur un ennemi et renvoie le multiplicateur de dégâts.
 * `rawDamage` sert aux effets secondaires (Déflagration, Arc) et peut valoir 0 (sort de soutien).
 */
export function applyCubeRule(
  self: VoxelEngine,
  target: CombatActor,
  element: ElementType,
  attacker: CombatActor,
  rawDamage: number,
  cast: CastContext,
): number {
  if (!self.cubesEnabled) return 1;
  let outcome: CubeOutcome = resolveCubeHit(
    { cube: target.cube, crack: target.crack, trioLock: target.trioLockTimer },
    element,
    { allowTrio: trioAllowed(self) },
  );
  // Un seul Trio par lancer : les autres cibles fêlées reçoivent simplement le cube
  if (outcome === 'trio' && cast.trioUsed) outcome = target.cube ? resolveCubeHit({ cube: target.cube, crack: null, trioLock: 0 }, element, { allowTrio: false }) : 'cube';
  self.cubeOutcomeCounts[outcome] = (self.cubeOutcomeCounts[outcome] ?? 0) + 1;

  switch (outcome) {
    case 'locked':
      return 1;
    case 'cube':
      setCube(self, target, element, attacker.atk);
      self.cubesPlaced += 1;
      self.firstTimeEvent('cube');
      return 1;
    case 'refresh':
      setCube(self, target, element, attacker.atk, true);
      return 1;
    case 'weak': {
      clearCube(target);
      self.weakBurstsTriggered += 1;
      gainUltimateCharge(self, ULTIMATE_CHARGE.weakBurst);
      spawnParticleBurst(self, target.x, 2.2, target.z, '#CBD5E1', 6, 2.6);
      self.floatingText.spawn(target.x, 2.6, target.z, FR.engine.tropTot, '#CBD5E1', 0.85, 0.8);
      soundFx.playWeakBurst();
      self.firstTimeEvent('weak');
      return CUBE_KIT.weakBurstMult;
    }
    case 'burst': {
      const previous = target.cube!.element;
      const burst = BURSTS[element];
      clearCube(target);
      if (trioAllowed(self)) target.crack = { elements: [previous, element], remaining: CUBE_KIT.crackDuration };
      self.burstsTriggered += 1;
      if (!cast.burstUltGiven) {
        cast.burstUltGiven = true;
        gainUltimateCharge(self, ULTIMATE_CHARGE.burst);
      }
      onBurstShatter(self, target, element);
      if (!cast.burstEffectUsed) {
        cast.burstEffectUsed = true;
        applyBurstEffect(self, target, element, previous, attacker, rawDamage);
        self.lastBurstLabel = burst.name;
        self.lastBurstColor = burst.color;
        self.lastBurstTimer = 2.4;
        self.floatingText.spawn(target.x, 2.75, target.z, FR.engine.eclatNomme(burst.name), burst.color, 1.2, 1.1);
        soundFx.playBurst(element);
        self.hitstopTimer = Math.max(self.hitstopTimer, 0.055);
        self.trauma = Math.min(1, self.trauma + 0.34);
        spawnShockwaveRing(self, target.x, target.z, 3.6, burst.color);
      }
      self.firstTimeEvent('burst');
      return burst.damageMult;
    }
    case 'trio': {
      cast.trioUsed = true;
      clearCube(target);
      target.crack = null;
      target.trioLockTimer = CUBE_KIT.trioLock;
      self.triosTriggered += 1;
      gainUltimateCharge(self, ULTIMATE_CHARGE.trio);
      for (const ally of self.allies) {
        if (!ally.fainted) ally.skillCooldown = Math.max(0, ally.skillCooldown - CUBE_KIT.trioCooldownRefund);
      }
      const splash = Math.round(rawDamage * CUBE_KIT.trioDamageMult * CUBE_KIT.trioSplashRatio);
      for (const other of self.enemies) {
        if (other === target || other.fainted || other.removed) continue;
        if (Math.hypot(other.x - target.x, other.z - target.z) <= CUBE_KIT.trioSplashRadius && splash > 0) {
          other.hp = Math.max(1, other.hp - splash);
          self.damageDealt += splash;
          self.floatingText.spawn(other.x, 1.9, other.z, `${splash}`, '#F4B942', 0.95);
        }
      }
      onTrio(self, target);
      self.firstTimeEvent('trio');
      return CUBE_KIT.trioDamageMult;
    }
  }
  return 1;
}

/** Effet d'un Éclat, décidé par l'élément qui fait éclater (table BURSTS). */
function applyBurstEffect(
  self: VoxelEngine,
  target: CombatActor,
  element: ElementType,
  previous: ElementType,
  attacker: CombatActor,
  rawDamage: number,
): void {
  const effect = BURSTS[element].effect;
  if (effect === 'aoe_burn') {
    for (const other of self.enemies) {
      if (other === target || other.fainted || other.removed) continue;
      if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.4) {
        if (other.trioLockTimer <= 0) setCube(self, other, 'fire', attacker.atk);
        const d = Math.round(rawDamage * 0.45);
        if (d > 0) {
          other.hp = Math.max(1, other.hp - d);
          self.damageDealt += d;
          self.floatingText.spawn(other.x, 1.9, other.z, `-${d}`, '#FB923C', 0.9);
        }
      }
    }
  } else if (effect === 'chain_stun') {
    let chains = 0;
    for (const other of self.enemies) {
      if (chains >= 2) break;
      if (other === target || other.fainted || other.removed) continue;
      if (Math.hypot(other.x - target.x, other.z - target.z) <= 5.5) {
        chains += 1;
        if (!other.isBoss) other.stunTimer = Math.max(other.stunTimer, 0.95);
        const d = Math.round(rawDamage * 0.55);
        if (d > 0) {
          other.hp = Math.max(1, other.hp - d);
          self.damageDealt += d;
          self.floatingText.spawn(other.x, 2.0, other.z, `${d}`, '#FACC15', 0.95);
        }
        spawnParticleBurst(self, other.x, 0.9, other.z, '#FACC15', 10, 4.5);
      }
    }
  } else if (effect === 'knockback') {
    const dx = target.x - attacker.x;
    const dz = target.z - attacker.z;
    const len = Math.max(0.01, Math.hypot(dx, dz));
    const kb = target.isBoss ? 3.5 : 8.2;
    target.vx += (dx / len) * kb;
    target.vz += (dz / len) * kb;
  } else if (effect === 'team_heal') {
    for (const ally of self.allies) {
      if (ally.fainted) continue;
      const heal = Math.round(ally.maxHp * 0.06);
      ally.hp = Math.min(ally.maxHp, ally.hp + heal);
      spawnParticleBurst(self, ally.x, 0.9, ally.z, '#4ADE80', 8, 3.2);
      self.floatingText.spawn(ally.x, 2.0, ally.z, FR.engine.pv(heal), '#4ADE80', 0.85);
    }
  } else if (effect === 'team_shield') {
    for (const ally of self.allies) {
      if (ally.fainted) continue;
      const gain = Math.round(ally.maxHp * 0.15);
      ally.shieldHp = Math.min(Math.round(ally.maxHp * 0.35), ally.shieldHp + gain);
      spawnParticleBurst(self, ally.x, 0.9, ally.z, '#EAB308', 8, 3.2);
      self.floatingText.spawn(ally.x, 2.0, ally.z, FR.engine.boucl(gain), '#FDE047', 0.85);
    }
  } else if (effect === 'cd_spread') {
    attacker.skillCooldown = Math.max(0.4, attacker.skillCooldown - 1.5);
    for (const other of self.enemies) {
      if (other === target || other.fainted || other.removed || other.trioLockTimer > 0) continue;
      if (Math.hypot(other.x - target.x, other.z - target.z) <= 4.8) setCube(self, other, previous, attacker.atk);
    }
  }
}

/** Hooks visuels (S04.3). */
export function onBurstShatter(self: VoxelEngine, target: CombatActor, element: ElementType): void {
  spawnParticleBurst(self, target.x, 2.2, target.z, BURSTS[element].color, 10, 5.2);
}
export function onTrio(self: VoxelEngine, target: CombatActor): void {
  self.floatingText.spawn(target.x, 3.0, target.z, FR.engine.trio, '#F4B942', 1.5, 1.2);
  spawnShockwaveRing(self, target.x, target.z, CUBE_KIT.trioSplashRadius, '#F4B942');
  soundFx.playTrio();
  self.hitstopTimer = Math.max(self.hitstopTimer, 0.09);
  // Ralenti : jamais plus d'un toutes les 2 s, et coupé avec le réglage de secousse
  if (self.shakeEnabled && self.elapsedTotal - self.lastSlowMoAt >= 2) {
    self.lastSlowMoAt = self.elapsedTotal;
    self.slowMoTimer = 0.45 + 0.09;
  }
  self.trauma = Math.min(1, self.trauma + 0.45);
}

// ---------------------------------------------------------------- ciblage et aperçu

const TARGETED_AOE_MIN_RANGE = 5.5;
const SUPPORT_RANGE = 9;

/** Le sort de ce compagnon vise-t-il une cible (projectile, ruée, zone à distance) ? */
export function isTargetedMove(moveId: string): boolean {
  const move = MOVES[moveId] ?? MOVES.ember_burst;
  return move.style === 'projectile' || move.style === 'dash' || (move.style === 'aoe' && move.range > TARGETED_AOE_MIN_RANGE);
}

/** Ciblage intelligent : la cible choisie au moment du lancer, ou le plus proche si personne n'est à portée. */
export function pickTargetFor(self: VoxelEngine, unit: CombatActor, range: number): CombatActor | null {
  const move = MOVES[unit.moveId] ?? MOVES.ember_burst;
  const living = self.enemies.filter((e) => !e.fainted && !e.removed);
  const id = pickSkillTarget(
    living.map((e) => ({
      id: e.id,
      dist: Math.hypot(e.x - unit.x, e.z - unit.z),
      isBoss: e.isBoss,
      state: { cube: self.cubesEnabled ? e.cube : null, crack: self.cubesEnabled ? e.crack : null, trioLock: e.trioLockTimer },
    })),
    move.element,
    range,
    trioAllowed(self),
  );
  if (id) return living.find((e) => e.id === id) ?? null;
  return findNearestLiving(self, unit.x, unit.z, self.enemies);
}

const PREVIEW_RANK: Record<CubeOutcome, number> = { trio: 4, burst: 3, weak: 2, cube: 1, refresh: 1, locked: 1 };
const PREVIEW_OF: Record<CubeOutcome, SkillPreview> = { trio: 'trio', burst: 'burst', weak: 'ripening', cube: 'cube', refresh: 'cube', locked: 'cube' };

function outcomeOn(self: VoxelEngine, e: CombatActor, element: ElementType): CubeOutcome {
  if (!self.cubesEnabled) return 'cube';
  return resolveCubeHit({ cube: e.cube, crack: e.crack, trioLock: e.trioLockTimer }, element, { allowTrio: trioAllowed(self) });
}

/** Ce que ferait le sort de l'allié `slot` maintenant. Lecture seule : aucun tirage, aucun changement d'état. */
export function getSkillPreview(self: VoxelEngine, slot: number): SkillPreview {
  const unit = self.allies[slot];
  if (!unit || unit.fainted) return 'far';
  const move = MOVES[unit.moveId] ?? MOVES.ember_burst;
  if (move.style === 'buff' || isTargetedMove(unit.moveId)) {
    const range = move.style === 'buff' ? SUPPORT_RANGE : move.range;
    const target = pickTargetFor(self, unit, range);
    if (!target) return 'far';
    if (move.style === 'buff' && Math.hypot(target.x - unit.x, target.z - unit.z) > SUPPORT_RANGE) return 'far';
    return PREVIEW_OF[outcomeOn(self, target, move.element)];
  }
  // mêlée ou zone autour du lanceur : le meilleur résultat parmi les ennemis touchés
  const radius = move.aoeRadius;
  let best: CubeOutcome | null = null;
  for (const e of self.enemies) {
    if (e.fainted || e.removed) continue;
    if (Math.hypot(e.x - unit.x, e.z - unit.z) > radius + (e.isBoss ? 1.1 : 0.6)) continue;
    const o = outcomeOn(self, e, move.element);
    if (!best || PREVIEW_RANK[o] > PREVIEW_RANK[best]) best = o;
  }
  return best ? PREVIEW_OF[best] : 'far';
}

export { SUPPORT_RANGE };
