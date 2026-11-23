/**
 * Le Camp : construction de la scène, atelier central, créatures qui se promènent.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import { BIOMES } from '../catalog';
import type { OwnedCreature } from '../types';
import {
  buildBiomeEnvironment,
  buildCampLandmark,
  buildWorkbenchProp,
  buildVoxelCreature,
} from '../voxelModels';
import { animateRigPose } from './actors';
import { applyBiomeLighting, configureWeather, updateDayNight } from './atmosphere';
import { _dummy, EVO_X, EVO_Z } from './constants';
import { clearEvoRing, updateEvolution } from './evolution';
import { clearProjectilesAndTelegraphs, spawnParticleBurst, spawnSteamCube } from './fx';
import type { VoxelEngine } from '../VoxelEngine';
import { resetLessonState } from './lessons';
import { setGrade } from './postfx';

export function clearGroup(self: VoxelEngine, group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(self, child);
  }
}

/** Libère géométries et matériaux d'un sous-arbre retiré de la scène (les textures partagées sont conservées). */
export function disposeObject(self: VoxelEngine, obj: THREE.Object3D): void {
  obj.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if ((node as THREE.InstancedMesh).isInstancedMesh) (node as THREE.InstancedMesh).dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map && map.userData.ownedByScene) map.dispose();
      m.dispose();
    }
  });
}

export function loadCampScene(
  self: VoxelEngine,
  squadCreatures: OwnedCreature[],
): void {
  self.playMode = 'camp';
  self.activeStage = null;
  self.allies = [];
  self.enemies = [];
  clearProjectilesAndTelegraphs(self);

  clearGroup(self, self.worldGroup);
  clearGroup(self, self.actorsGroup);
  self.campWanderers = [];
  self.evo = null; // le rig d'évolution vient d'être libéré avec actorsGroup
  resetLessonState(self);
  setGrade(self, 'camp');
  clearEvoRing(self);
  self.bossIntroTimer = 0;
  self.bossIntroActor = null;
  self.bossIntroInfo = null;
  self.resultSent = false;
  self.pendingVictory = false;
  self.victorySecured = false;
  self.pendingUltHits = null;
  self.slowMoTimer = 0;
  self.ultimateLockTimer = 0;

  const biome = BIOMES.meadow;
  self.scene.background = new THREE.Color(biome.skyHex);
  self.scene.fog = new THREE.Fog(biome.fogHex, 30, 82);
  self.floatingText.clear();
  const env = buildBiomeEnvironment(biome, true);
  self.worldGroup.add(env.group);
  self.waterUniform = env.waterUniform;
  self.cloudGroup = env.cloudGroup;
  self.envAnimate = env.animate ?? null;
  configureWeather(self, 'meadow');
  applyBiomeLighting(self, 'meadow');

  // Tall waystone + explorer tent landmark framed in initial vista
  const landmark = buildCampLandmark();
  landmark.position.set(4.5, 0, -5.5);
  self.worldGroup.add(landmark);

  // Atelier central
  const workbench = buildWorkbenchProp();
  workbench.group.position.set(0, 0, -1.2);
  self.worldGroup.add(workbench.group);
  self.workbenchLiquidMesh = workbench.liquidMesh;
  self.workbenchFireMesh = workbench.fireMesh;

  // Lueur du feu : éteinte de jour, elle éclaire le cœur du camp la nuit
  self.workbenchLight = new THREE.PointLight('#9FD8FF', 0, 19, 1.5); // A2.3 : le moule de l'Atelier éclaire le camp la nuit
  self.workbenchLight.position.set(0, 2.1, -0.4);
  self.worldGroup.add(self.workbenchLight);

  // Étoiles : petits cubes lointains, invisibles de jour (une seule InstancedMesh)
  const starCount = 90;
  const stars = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: '#F4F7FF', transparent: true, opacity: 0, depthWrite: false, fog: false }),
    starCount,
  );
  for (let i = 0; i < starCount; i++) {
    // répartition déterministe sur une demi-sphère (pas d'aléatoire : le ciel est le même à chaque visite)
    const az = i * 2.399963;
    const el = 0.02 + (((i * 37) % 100) / 100) * 0.7; // surtout près de l'horizon : la caméra du camp regarde vers le bas
    const r = 92;
    _dummy.position.set(Math.cos(az) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(0.35 + ((i * 13) % 5) * 0.12);
    _dummy.updateMatrix();
    stars.setMatrixAt(i, _dummy.matrix);
  }
  stars.frustumCulled = false;
  self.worldGroup.add(stars);
  self.campStars = stars;
  setWorkbenchVisual(self);

  // Spawn active squad roaming happily around the camp
  squadCreatures.slice(0, 3).forEach((c, idx) => {
    const rig = buildVoxelCreature(c.speciesId);
    const angle = (idx / 3) * Math.PI * 2 + 0.6;
    const rx = Math.cos(angle) * 4.2;
    const rz = Math.sin(angle) * 3.8 + 1.8;
    rig.root.position.set(rx, 0, rz);
    self.actorsGroup.add(rig.root);
    self.campWanderers.push({
      uid: c.uid,
      rig,
      x: rx,
      z: rz,
      targetX: rx,
      targetZ: rz,
      waitTimer: 0.8 + idx * 0.6,
      walkPhase: idx * 1.4,
      facing: 0,
      emoteTimer: 3 + idx * 2.5,
      emoteT: 0,
    });
  });

  if (!self.isSoftwareGl) {
    self.renderer?.compile(self.scene, self.camera);
  }
  self.camPos.set(10.8, 9.6, 18.6);
  self.camLook.set(0.4, 2.4, -1.2);
  self.camera.position.copy(self.camPos);
  self.camera.lookAt(self.camLook);
  self.renderer?.render(self.scene, self.camera);
}

/** Lueur du moule de l'Atelier (A2.3). */
export function setWorkbenchVisual(self: VoxelEngine): void {
  if (!self.workbenchLiquidMesh) return;
  const mat = self.workbenchLiquidMesh.material as THREE.MeshStandardMaterial;
  mat.color.set('#BDE8FF');
  mat.emissive.set('#7CC8FF');
  mat.emissiveIntensity = 0.5;
}

export function updateCamp(self: VoxelEngine, dt: number): void {
  updateDayNight(self, dt);
  updateEvolution(self, dt);

  // Braises et petits cubes de vapeur de l'atelier
  if (self.workbenchFireMesh) {
    const flicker = 0.92 + Math.sin(self.elapsedTotal * 14) * 0.14;
    self.workbenchFireMesh.scale.set(flicker, 0.85 + Math.cos(self.elapsedTotal * 11) * 0.22, flicker);
  }
  self.workbenchSteamTimer -= dt;
  if (self.workbenchSteamTimer <= 0) {
    self.workbenchSteamTimer = 0.65;
    spawnSteamCube(self, 0, 1.65, -1.2, '#E2F3FF');
  }

  for (const w of self.campWanderers) {
    let lift = 0;
    if (self.evo) {
      // Toute l'escouade s'arrête pour regarder la métamorphose
      w.facing = Math.atan2(EVO_X - w.x, EVO_Z - w.z);
      animateRigPose(self, w.rig, w.walkPhase, false, 1, self.elapsedTotal);
    } else {
      const dx = w.targetX - w.x;
      const dz = w.targetZ - w.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.25) {
        const spd = 2.2;
        const step = Math.min(dist, spd * dt);
        w.x += (dx / dist) * step;
        w.z += (dz / dist) * step;
        w.facing = Math.atan2(dx, dz);
        w.walkPhase += step * 4.4;
        animateRigPose(self, w.rig, w.walkPhase, true, 1, self.elapsedTotal);
      } else {
        w.waitTimer -= dt;
        // Émote d'attente : un petit saut de joie de temps en temps
        w.emoteTimer -= dt;
        if (w.emoteT <= 0 && w.emoteTimer <= 0) {
          w.emoteT = 0.55;
          w.emoteTimer = 5 + Math.random() * 7;
          spawnParticleBurst(self, w.x, 1.5, w.z, w.rig.species.palette.accent, 4, 2.2);
          if (self.screenState === 'playing') soundFx.playIdleChirp();
        }
        let squash = 1;
        if (w.emoteT > 0) {
          w.emoteT = Math.max(0, w.emoteT - dt);
          const k = 1 - w.emoteT / 0.55;
          lift = Math.sin(k * Math.PI) * 0.6;
          squash = 1 + Math.sin(k * Math.PI * 2) * 0.12;
        }
        animateRigPose(self, w.rig, w.walkPhase, false, squash, self.elapsedTotal);
        if (w.waitTimer <= 0 && w.emoteT <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const r = 2.8 + Math.random() * 4.6;
          w.targetX = Math.cos(ang) * r;
          w.targetZ = Math.sin(ang) * r + 1.2;
          w.waitTimer = 1.8 + Math.random() * 2.4;
        }
      }
    }
    w.rig.bodyPivot.position.y += lift; // l'ombre de contact reste au sol
    w.rig.root.position.set(w.x, 0, w.z);
    w.rig.root.rotation.y = w.facing;
  }
}
