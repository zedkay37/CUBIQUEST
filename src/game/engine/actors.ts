/**
 * Acteurs de combat : état commun à chaque pas (recul, statuts, temps de recharge), pose animée du modèle,
 * recherche de cible, disparition d'un ennemi vaincu.
 */
import * as THREE from 'three';
import { STATUS_META } from '../catalog';
import { computeStatusDuration } from '../rules';
import type { StatusKind } from '../types';
import { isHoverArchetype, type VoxelCreatureRig } from '../voxelModels';
import { disposeObject } from './camp';
import { ARENA_BOUND } from './constants';
import { tickCubeState } from './cubes';
import { spawnParticleBurst } from './fx';
import type { CombatActor } from './types';
import type { VoxelEngine } from '../VoxelEngine';

export function findNearestLiving(self: VoxelEngine, x: number, z: number, list: CombatActor[]): CombatActor | null {
  let best: CombatActor | null = null;
  let bestDistSq = Infinity;
  for (const a of list) {
    if (a.fainted || a.removed) continue;
    const d2 = (a.x - x) * (a.x - x) + (a.z - z) * (a.z - z);
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = a;
    }
  }
  return best;
}

export function getPrimaryStatus(self: VoxelEngine, actor: CombatActor): StatusKind | null {
  const keys = Object.keys(actor.statuses) as StatusKind[];
  for (const k of keys) {
    const inst = actor.statuses[k];
    if (inst && inst.remaining > 0) return k;
  }
  return null;
}

export function applyStatusToActor(self: VoxelEngine, target: CombatActor, kind: StatusKind, sourceAtk: number): void {
  const duration = computeStatusDuration(kind, target.statusRes);
  target.statuses[kind] = {
    remaining: duration,
    tickTimer: 0.9,
    sourceAtk,
  };
  if (kind === 'shocked' && !target.isBoss) {
    target.stunTimer = Math.max(target.stunTimer, 0.95);
  }
}

export function updateActorCommon(self: VoxelEngine, actor: CombatActor, dt: number, simDt: number): void {
  // Knockback velocity decay
  if (Math.hypot(actor.vx, actor.vz) > 0.05) {
    actor.x = THREE.MathUtils.clamp(actor.x + actor.vx * simDt, -ARENA_BOUND, ARENA_BOUND);
    actor.z = THREE.MathUtils.clamp(actor.z + actor.vz * simDt, -ARENA_BOUND, ARENA_BOUND);
    const decay = Math.exp(-8.5 * simDt);
    actor.vx *= decay;
    actor.vz *= decay;
  }

  actor.basicCooldown = Math.max(0, actor.basicCooldown - simDt);
  actor.skillCooldown = Math.max(0, actor.skillCooldown - simDt);
  actor.buffTimer = Math.max(0, actor.buffTimer - simDt);
  actor.invulnTimer = Math.max(0, actor.invulnTimer - simDt);
  actor.stunTimer = Math.max(0, actor.stunTimer - simDt);
  actor.squashY = THREE.MathUtils.damp(actor.squashY, 1, 12, dt);

  tickCubeState(self, actor, simDt);
  if (actor.cubeRipeFlash > 0) actor.cubeRipeFlash = Math.max(0, actor.cubeRipeFlash - dt);

  // Tick elemental statuses & Burn DoT
  if (!actor.fainted && !actor.removed && simDt > 0) {
    const keys = Object.keys(actor.statuses) as StatusKind[];
    for (const k of keys) {
      const inst = actor.statuses[k];
      if (!inst) continue;
      inst.remaining -= simDt;
      if (k === 'burn') {
        inst.tickTimer -= simDt;
        if (inst.tickTimer <= 0) {
          inst.tickTimer = 1.0;
          const burnDmg = Math.max(6, Math.round(inst.sourceAtk * 0.22));
          actor.hp = Math.max(1, actor.hp - burnDmg);
          spawnParticleBurst(self, actor.x, 1.0, actor.z, STATUS_META.burn.color, 4, 2.2);
          self.floatingText.spawn(actor.x, 1.9, actor.z, `${burnDmg}`, STATUS_META.burn.color, 0.78, 0.65);
          if (!actor.isAlly) self.damageDealt += burnDmg;
        }
      }
      if (inst.remaining <= 0) {
        delete actor.statuses[k];
      }
    }
  }

  // Hit flash emissive highlight & Boss phase rage aura
  if (actor.flashTimer > 0) {
    actor.flashTimer = Math.max(0, actor.flashTimer - dt);
    const white = actor.flashTimer > 0;
    actor.rig.flashMaterials.forEach((m, idx) => {
      if (white) {
        m.emissive.set('#FFFFFF');
        m.emissiveIntensity = 0.85;
      } else if (actor.isBoss && actor.bossPhase >= 2) {
        m.emissive.set(actor.bossPhase === 3 ? '#F4B942' : '#F43F5E');
        m.emissiveIntensity = 0.34;
      } else {
        m.emissive.copy(actor.rig.baseEmissives[idx]);
        m.emissiveIntensity = actor.buffTimer > 0 ? 0.35 : 0.15;
      }
    });
  } else if (actor.isBoss && actor.bossPhase >= 2) {
    const pulse = 0.28 + Math.sin(self.elapsedTotal * 5.2) * 0.1;
    actor.rig.flashMaterials.forEach((m) => {
      m.emissive.set(actor.bossPhase === 3 ? '#F4B942' : '#F43F5E');
      m.emissiveIntensity = pulse;
    });
  }

  actor.rig.root.position.set(actor.x, 0, actor.z);
  actor.rig.root.rotation.y = actor.facing;

  // Update world-space HP bar orientation & fill scale (world-space lookAt ignores parent yaw)
  if (actor.rig.hpBarBg && actor.rig.hpBarFill) {
    actor.rig.hpBarBg.visible = !actor.fainted;
    actor.rig.hpBarBg.lookAt(self.camera.position);
    const ratio = Math.max(0.001, actor.hp / Math.max(1, actor.maxHp));
    actor.rig.hpBarFill.scale.x = ratio;
  }
}

export function animateRigPose(
  self: VoxelEngine,
  rig: VoxelCreatureRig,
  walkPhase: number,
  isMoving: boolean,
  squashY: number,
  elapsed: number,
): void {
  const arch = rig.species.archetype;
  // Déphasage par créature : personne ne respire ni ne se balance à l'unisson
  const seed = rig.root.id * 1.37;
  const hopAmp = arch === 'serpentine' ? 0.08 : 0.24;
  const hop = isMoving ? Math.abs(Math.sin(walkPhase)) * hopAmp : Math.sin(elapsed * 2.8 + seed) * 0.04;
  const hover = isHoverArchetype(arch) ? 0.16 + Math.sin(elapsed * 3.5 + seed) * 0.12 : 0;
  rig.bodyPivot.position.y = hop + hover;

  // Idle : respiration + regard qui se promène quand la créature est à l'arrêt
  const breath = isMoving ? 0 : Math.sin(elapsed * 2.1 + seed) * 0.022;
  const sy = squashY * (1 + breath);
  const invXZ = 1 / Math.sqrt(Math.max(0.5, sy));
  rig.bodyPivot.scale.set(invXZ, sy, invXZ);
  rig.bodyPivot.rotation.y = isMoving ? 0 : Math.sin(elapsed * 0.7 + seed) * 0.16;
  rig.bodyPivot.rotation.x = isMoving ? 0 : Math.sin(elapsed * 1.3 + seed * 0.7) * 0.025;

  // Leg gait sync (les bras du golem font partie de la démarche)
  rig.legs.forEach((leg, idx) => {
    const sign = idx % 2 === 0 ? 1 : -1;
    leg.rotation.x = isMoving ? Math.sin(walkPhase) * 0.45 * sign : 0;
  });

  // Sprint Art : yeux vivants (modèles sculptés) : clignement toutes les 3 à 6 s, regard qui se promène.
  // Déterministe (aucun tirage) : la période dépend de la créature.
  if (rig.eyes?.length) {
    const period = 3 + (Math.abs(seed * 7.3) % 3);
    const phase = (elapsed + seed * 3.1) % period;
    const blink = phase < 0.12 ? 0.12 : 1;
    const look = isMoving ? 0 : Math.sin(elapsed * 0.6 + seed) * 0.025;
    for (const eye of rig.eyes) {
      if (eye.userData.baseX === undefined) eye.userData.baseX = eye.position.x;
      eye.scale.y = blink;
      eye.position.x = eye.userData.baseX + look;
    }
  }

  // Wings / orbiting psychic cubes / tail wag / antlers / body segments / rain strands
  rig.extras.forEach((extra, idx) => {
    switch (arch) {
      case 'floating':
        extra.rotation.y = elapsed * 2.2;
        break;
      case 'cell':
        // pile : les ailettes de bobine tournent (forme finale), le câble se balance
        if (idx < 2 && rig.extras.length > 1) extra.rotation.x = elapsed * 6 * (idx === 0 ? 1 : -1);
        else extra.rotation.y = Math.sin(elapsed * 4 + seed) * 0.3;
        break;
      case 'winged':
        if (idx < 2) {
          const dir = idx === 0 ? 1 : -1;
          extra.rotation.z = Math.sin(elapsed * 7.5) * 0.32 * dir;
        } else {
          extra.rotation.y = Math.sin(elapsed * 5.2 + idx) * 0.25;
        }
        break;
      case 'fungal':
        if (idx === 0) {
          // le chapeau dodeline
          extra.rotation.z = Math.sin(elapsed * 2.2 + seed) * 0.06;
          extra.rotation.x = Math.sin(elapsed * 1.7 + seed) * 0.04;
        } else {
          extra.rotation.y = elapsed * 1.1; // spores en orbite
        }
        break;
      case 'antlered':
        extra.rotation.z = Math.sin(elapsed * 1.6 + seed + idx) * 0.05;
        break;
      case 'crab':
        // les pinces s'ouvrent et se referment en alternance
        extra.rotation.x = Math.sin(elapsed * 3.2 + seed + idx * Math.PI) * 0.16;
        break;
      case 'golem':
        extra.rotation.y = Math.sin(elapsed * 0.9 + seed) * 0.08;
        break;
      case 'lizard':
        if (idx === 0) {
          extra.rotation.y = Math.sin(elapsed * 3 + seed) * 0.35; // la queue balaie
        } else {
          extra.scale.y = 1 + Math.sin(elapsed * 9 + idx * 1.7 + seed) * 0.18; // la crête vacille
        }
        break;
      case 'serpentine': {
        // ondulation qui se propage de la tête vers la queue
        const wave = elapsed * (isMoving ? 9 : 4) + seed - idx * 0.85;
        extra.position.x = Math.sin(wave) * 0.07 * Math.min(4, idx + 1);
        extra.rotation.y = Math.cos(wave) * 0.22;
        break;
      }
      case 'jelly':
        extra.rotation.x = Math.sin(elapsed * 2.4 + idx * 1.3 + seed) * 0.3;
        extra.rotation.z = Math.cos(elapsed * 2.0 + idx) * 0.22;
        break;
      default:
        extra.rotation.y = Math.sin(elapsed * 5.2 + idx) * 0.25;
    }
  });
}

export function updateEnemyDissolve(self: VoxelEngine, enemy: CombatActor, dt: number): void {
  enemy.koDissolveTimer -= dt;
  enemy.rig.bodyPivot.rotation.z = THREE.MathUtils.damp(enemy.rig.bodyPivot.rotation.z, -Math.PI / 2, 10, dt);
  const s = Math.max(0.01, enemy.koDissolveTimer / 0.42) * enemy.rig.species.scale * (enemy.isBoss ? 1.48 : 0.96);
  enemy.rig.root.scale.setScalar(s);
  if (enemy.koDissolveTimer <= 0) {
    enemy.removed = true;
    self.actorsGroup.remove(enemy.rig.root);
    disposeObject(self, enemy.rig.root);
  }
}
