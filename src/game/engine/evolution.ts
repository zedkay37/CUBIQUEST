/**
 * Séquence d'évolution jouée au camp (charge, flash, nouvelle forme).
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import { buildVoxelCreature } from '../voxelModels';
import { animateRigPose } from './actors';
import { disposeObject } from './camp';
import { EVO_CHARGE_SEC, EVO_TOTAL_SEC, EVO_X, EVO_Z, PARTICLE_POOL_SIZE } from './constants';
import { spawnElementBurst, spawnParticleBurst } from './fx';
import type { VoxelEngine } from '../VoxelEngine';

/**
 * Animation d'évolution au camp : la créature s'élève en tournoyant dans un halo blanc,
 * puis la nouvelle forme apparaît dans une gerbe d'étincelles. `onDone` recharge le camp.
 */
export function playEvolutionSequence(
  self: VoxelEngine,
  fromSpeciesId: string,
  toSpeciesId: string,
  callbacks: { onReveal?: () => void; onDone: () => void },
): void {
  if (self.playMode !== 'camp' || self.disposed) {
    callbacks.onReveal?.();
    callbacks.onDone();
    return;
  }
  if (self.evo) {
    self.actorsGroup.remove(self.evo.rig.root);
    disposeObject(self, self.evo.rig.root);
  }
  const rig = buildVoxelCreature(fromSpeciesId);
  rig.root.position.set(EVO_X, 0, EVO_Z);
  self.actorsGroup.add(rig.root);
  self.evo = {
    t: 0,
    revealed: false,
    rig,
    baseScale: rig.root.scale.x,
    toSpeciesId,
    spawnAcc: 0,
    onReveal: callbacks.onReveal,
    onDone: callbacks.onDone,
  };
  soundFx.playEvolutionCharge();
}

export function clearEvoRing(self: VoxelEngine): void {
  if (!self.evoRing) return;
  self.fxGroup.remove(self.evoRing);
  self.evoRing.geometry.dispose();
  (self.evoRing.material as THREE.Material).dispose();
  self.evoRing = null;
}

export function updateEvolution(self: VoxelEngine, dt: number): void {
  if (self.evoRing) {
    self.evoRingT += dt;
    const k = Math.min(1, self.evoRingT / 0.6);
    self.evoRing.scale.setScalar(0.6 + k * 6.5);
    (self.evoRing.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
    if (k >= 1) clearEvoRing(self);
  }

  const evo = self.evo;
  if (!evo) return;
  evo.t += dt;

  if (!evo.revealed) {
    // Phase 1 — charge : lévitation, toupie de plus en plus rapide, halo blanc croissant
    const p = Math.min(1, evo.t / EVO_CHARGE_SEC);
    animateRigPose(self, evo.rig, 0, false, 1, self.elapsedTotal);
    evo.rig.root.position.y = p * p * 0.9;
    evo.rig.root.rotation.y += dt * (2 + p * p * 26);
    evo.rig.root.scale.setScalar(evo.baseScale * (1 + Math.sin(evo.t * (8 + p * 20)) * 0.06 * p));
    for (const m of evo.rig.flashMaterials) {
      m.emissive.set('#FFFFFF');
      m.emissiveIntensity = p * p * 1.5;
    }
    // étincelles aspirées en spirale vers la créature
    evo.spawnAcc += dt;
    while (evo.spawnAcc > 0.045) {
      evo.spawnAcc -= 0.045;
      const slot = self.particles[self.particleCursor];
      self.particleCursor = (self.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const r = 2.2 + Math.random() * 1.2;
      const life = 0.45 + Math.random() * 0.2;
      slot.active = true;
      slot.x = EVO_X + Math.cos(ang) * r;
      slot.y = 0.3 + Math.random() * 2.2;
      slot.z = EVO_Z + Math.sin(ang) * r;
      slot.vx = (-Math.cos(ang) * r) / life - Math.sin(ang) * 1.6;
      slot.vy = (1.0 - slot.y) / life;
      slot.vz = (-Math.sin(ang) * r) / life + Math.cos(ang) * 1.6;
      slot.maxLife = life;
      slot.life = life;
      slot.size = 0.12 + Math.random() * 0.1;
      slot.colorHex = Math.random() < 0.5 ? '#FFFFFF' : evo.rig.species.palette.accent;
      slot.gravity = 0;
      slot.drag = 0;
      slot.stretchY = 1;
      slot.bounce = 0;
    }

    if (evo.t >= EVO_CHARGE_SEC) {
      // Bascule : l'ancienne forme est libérée, la nouvelle surgit
      self.actorsGroup.remove(evo.rig.root);
      disposeObject(self, evo.rig.root);
      const next = buildVoxelCreature(evo.toSpeciesId);
      next.root.position.set(EVO_X, 0.9, EVO_Z);
      self.actorsGroup.add(next.root);
      evo.rig = next;
      evo.baseScale = next.root.scale.x;
      evo.revealed = true;
      soundFx.playEvolutionBurst();
      spawnParticleBurst(self, EVO_X, 1.3, EVO_Z, '#FFFFFF', 26, 7.5);
      spawnParticleBurst(self, EVO_X, 1.3, EVO_Z, '#F4B942', 26, 6.0);
      spawnElementBurst(self, EVO_X, 1.0, EVO_Z, next.species.element, 22, 1.6);
      self.trauma = Math.min(1, self.trauma + 0.35);
      self.lightningFlash = Math.max(self.lightningFlash, self.shakeEnabled ? 0.6 : 0.25);
      clearEvoRing(self);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.82, 1, 32),
        new THREE.MeshBasicMaterial({
          color: '#FFF7D6',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(EVO_X, 0.08, EVO_Z);
      self.fxGroup.add(ring);
      self.evoRing = ring;
      self.evoRingT = 0;
      evo.onReveal?.();
    }
    return;
  }

  // Phase 2 — révélation : apparition avec rebond, sauts de joie, fontaine dorée
  const q = Math.min(1, (evo.t - EVO_CHARGE_SEC) / (EVO_TOTAL_SEC - EVO_CHARGE_SEC));
  const pop = q < 0.2 ? 0.3 + (q / 0.2) * 0.95 : 1.25 - Math.min(1, (q - 0.2) / 0.15) * 0.25;
  evo.rig.root.scale.setScalar(evo.baseScale * pop);
  evo.rig.root.position.y = Math.max(0, 0.9 - q * 3.6);
  evo.rig.root.rotation.y = THREE.MathUtils.damp(evo.rig.root.rotation.y, 0.2, 6, dt);
  animateRigPose(self, evo.rig, self.elapsedTotal * 9, q > 0.3, 1, self.elapsedTotal);
  evo.spawnAcc += dt;
  if (evo.spawnAcc > 0.16) {
    evo.spawnAcc = 0;
    spawnParticleBurst(self, EVO_X + (Math.random() - 0.5) * 2, 0.4, EVO_Z + (Math.random() - 0.5) * 1.5, '#F4B942', 4, 3.2);
  }
  if (evo.t >= EVO_TOTAL_SEC) {
    const done = evo.onDone;
    self.evo = null; // le rig reste en scène : onDone recharge le camp, qui le libère
    done();
  }
}
