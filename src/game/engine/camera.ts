/**
 * Caméra : cadrage selon le format d'écran, suivi de l'escouade, tremblement.
 */
import * as THREE from 'three';
import { findNearestLiving } from './actors';
import { TELEGRAPH_KIT } from '../balance';

/** Distance au centre du cadre au-delà de laquelle une zone sort de l'écran (estimation pour le cadrage par défaut). */
const CAMERA_FRAME_REACH = 11;
import { _vecA, _vecB, _vecC, EVO_X, EVO_Z } from './constants';
import type { VoxelEngine } from '../VoxelEngine';
import { resizePostFx } from './postfx';
import { hubCameraNudge } from './hub';

/**
 * Champ de vision vertical : 42° en paysage (inchangé). En portrait, on l'ouvre progressivement
 * pour que l'escouade et ses adversaires restent dans le cadre d'un écran étroit.
 */
export function fovForAspect(aspect: number): number {
  if (!(aspect < 1)) return 42;
  return THREE.MathUtils.clamp(42 + (1 - aspect) * 46, 42, 72);
}

export function handleResize(self: VoxelEngine): void {
  if (self.disposed || !self.container || !self.renderer) return;
  const w = Math.max(1, self.container.clientWidth);
  const h = Math.max(1, self.container.clientHeight);
  self.camera.aspect = w / h;
  self.camera.fov = fovForAspect(w / h);
  self.camera.updateProjectionMatrix();
  self.renderer.setSize(w, h);
  resizePostFx(self, w, h);
  self.renderer.render(self.scene, self.camera);
}

export function updateCamera(self: VoxelEngine, dt: number): void {
  if (self.screenState === 'title') {
    // Atmospheric isometric diorama orbit with upper sky negative space for the Title Lockup
    const ang = self.elapsedTotal * 0.16 + 0.52;
    _vecA.set(Math.sin(ang) * 21.5, 9.6, Math.cos(ang) * 21.5);
    _vecB.set(0.4, 2.5, -1.2);
  } else if (self.playMode === 'camp') {
    if (self.evo) {
      // Gros plan sur la créature qui évolue
      _vecA.set(EVO_X + 1.6, 2.9, EVO_Z + 5.4);
      _vecB.set(EVO_X, 1.2, EVO_Z);
    } else {
      // Scenic Base Camp diorama showing island shoreline, waystone, cauldron & roaming squad
      _vecA.set(0.6, 11.4, 20.5);
      _vecB.set(0.4, 1.4, -1.2);
      hubCameraNudge(self, _vecA, _vecB);
    }
  } else if (self.bossIntroTimer > 0 && self.bossIntroActor) {
    // Entrée de boss : la caméra plonge sur lui
    _vecA.set(self.bossIntroActor.x - 1.5, 6.6, self.bossIntroActor.z + 10.5);
    _vecB.set(self.bossIntroActor.x, 1.9, self.bossIntroActor.z);
  } else {
    // Expedition tactical isometric follow camera centered on living squad + slight enemy lead
    let sx = 0;
    let sz = 0;
    let count = 0;
    for (const a of self.allies) {
      if (!a.fainted) {
        sx += a.x;
        sz += a.z;
        count += 1;
      }
    }
    if (count > 0) {
      sx /= count;
      sz /= count;
    }
    const nearestEnemy = findNearestLiving(self, sx, sz, self.enemies);
    const focusX = nearestEnemy ? sx * 0.72 + nearestEnemy.x * 0.28 : sx;
    const focusZ = nearestEnemy ? sz * 0.72 + nearestEnemy.z * 0.28 : sz;

    if (self.pendingVictory && (self.expeditionEnded || self.resultSent)) {
      // Victoire : la caméra se rapproche de l'escouade en fête
      _vecA.set(sx, 10.2, sz + 11.5);
      _vecB.set(sx, 1.0, sz);
    } else {
      // Une zone de danger loin du centre : la caméra recule (25 % au plus), puis revient
      let reach = 0;
      for (const tg of self.telegraphs) {
        if (!tg.isEnemyHazard) continue;
        const far = tg.isLine
          ? Math.max(Math.hypot(tg.x - focusX, tg.z - focusZ), Math.hypot(tg.x + tg.dirX * tg.radius - focusX, tg.z + tg.dirZ * tg.radius - focusZ))
          : Math.hypot(tg.x - focusX, tg.z - focusZ) + tg.radius;
        reach = Math.max(reach, far);
      }
      const wanted = 1 + Math.min(TELEGRAPH_KIT.cameraBackoff, Math.max(0, (reach - CAMERA_FRAME_REACH) / CAMERA_FRAME_REACH));
      self.camBackoff += (wanted - self.camBackoff) * (1 - Math.exp(-3 * dt));
      _vecA.set(focusX, 15.8 * self.camBackoff, focusZ + 16.5 * self.camBackoff);
      _vecB.set(focusX, 0.7, focusZ);
    }
  }

  const alpha = 1 - Math.exp(-5.5 * dt);
  self.camPos.lerp(_vecA, alpha);
  self.camLook.lerp(_vecB, alpha);

  // Trauma-squared decaying camera shake
  _vecC.set(0, 0, 0);
  if (self.trauma > 0) {
    self.trauma = Math.max(0, self.trauma - dt * 1.9);
    if (self.shakeEnabled) {
      const shake = self.trauma * self.trauma * 0.5;
      _vecC.set(
        (Math.random() - 0.5) * 2 * shake,
        (Math.random() - 0.5) * 2 * shake,
        0,
      );
    }
  }

  self.camera.position.copy(self.camPos).add(_vecC);
  self.camera.lookAt(self.camLook);
}
