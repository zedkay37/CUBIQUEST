/**
 * Ambiance : météo du biome, éclairage, éclairs et flash d'orage, cycle jour/nuit du camp.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import type { BiomeId } from '../types';
import {
  _color,
  _dummy,
  BIOME_LIGHTING,
  CAMP_DAY_LENGTH,
  CAMP_SKY_KEYS,
  WEATHER_PROFILES,
} from './constants';
import type { WeatherMote } from './types';
import type { VoxelEngine } from '../VoxelEngine';

export function configureWeather(self: VoxelEngine, biomeId: BiomeId): void {
  self.activeBiomeId = biomeId;
  const profile = WEATHER_PROFILES[biomeId];
  const kind = profile.kind;
  self.weatherKind = kind;
  self.weatherCount = profile.count;
  self.weatherMesh.count = profile.count;
  self.weatherMotes = [];
  const stormy = biomeId === 'stormpeak';

  for (let i = 0; i < profile.count; i++) {
    const small = 0.14 + Math.random() * 0.08;
    const mote: WeatherMote = {
      x: (Math.random() - 0.5) * 34,
      y: 0.8 + Math.random() * 12,
      z: (Math.random() - 0.5) * 34,
      vx:
        kind === 'rain'
          ? stormy
            ? -5.2
            : -2.2
          : kind === 'snow'
            ? 0.9 + Math.random() * 0.7
            : kind === 'rise'
              ? (Math.random() - 0.5) * 1.1
              : (Math.random() - 0.5) * 0.9 + (profile.wind ?? 0),
      vy:
        kind === 'rain'
          ? (stormy ? -16 : -11.5) - Math.random() * 3
          : kind === 'rise'
            ? 1.6 + Math.random() * 1.8
            : kind === 'float'
              ? 0.45 + Math.random() * 0.55
              : kind === 'snow'
                ? -1.3 - Math.random() * 1.1
                : -0.55 - Math.random() * 0.4,
      vz: kind === 'rain' ? 1.4 : (Math.random() - 0.5) * 0.8,
      sizeX: kind === 'rain' ? 0.06 : kind === 'snow' ? small * 0.8 : small,
      sizeY: kind === 'rain' ? (stormy ? 0.9 : 0.65) : kind === 'snow' ? small * 0.8 : small,
      sizeZ: kind === 'rain' ? 0.06 : kind === 'snow' ? small * 0.8 : small,
      phase: Math.random() * Math.PI * 2,
    };
    self.weatherMotes.push(mote);
    self.weatherMesh.setColorAt(i, _color.set(profile.colors[i % profile.colors.length]));
  }
  if (self.weatherMesh.instanceColor) {
    self.weatherMesh.instanceColor.needsUpdate = true;
  }
}

export function applyBiomeLighting(self: VoxelEngine, biomeId: BiomeId): void {
  const light = BIOME_LIGHTING[biomeId];
  self.hemiLight.color.set(light.sky);
  self.hemiLight.groundColor.set(light.ground);
  self.keyLight.color.set(light.key);
  self.keyLight.intensity = 1.28;
  self.baseHemiIntensity = 0.52;
  self.scene.environmentIntensity = 0.42;
  self.lightningFlash = 0;
  self.stormTimer = 3 + Math.random() * 3;
}

/** Éclair voxel bref (pool fixe) + flash lumineux. */
export function spawnBolt(self: VoxelEngine, x: number, z: number, height = 11): void {
  const bolt = self.bolts[self.boltCursor];
  self.boltCursor = (self.boltCursor + 1) % self.bolts.length;
  bolt.mesh.position.set(x, 0, z);
  bolt.mesh.scale.set(1, height, 1);
  bolt.mesh.rotation.z = (Math.random() - 0.5) * 0.22;
  bolt.mesh.visible = true;
  bolt.life = 0.16;
  self.lightningFlash = Math.max(self.lightningFlash, self.shakeEnabled ? 0.55 : 0.2);
}

export function updateStormAmbience(self: VoxelEngine, dt: number): void {
  for (const bolt of self.bolts) {
    if (bolt.life > 0) {
      bolt.life -= dt;
      bolt.mesh.visible = bolt.life > 0;
    }
  }
  if (self.lightningFlash > 0) {
    self.lightningFlash = Math.max(0, self.lightningFlash - dt * 3.6);
  }
  self.hemiLight.intensity = self.baseHemiIntensity + self.lightningFlash * 1.5;

  // Orage d'ambiance : la foudre tombe au loin toutes les quelques secondes
  if (self.activeBiomeId !== 'stormpeak' || self.playMode !== 'expedition') return;
  self.stormTimer -= dt;
  if (self.stormTimer <= 0) {
    self.stormTimer = 5 + Math.random() * 6;
    const ang = Math.random() * Math.PI * 2;
    spawnBolt(self, Math.cos(ang) * 21, Math.sin(ang) * 21, 17);
    soundFx.playThunder();
  }
}

export function updateWeather(self: VoxelEngine, dt: number): void {
  const kind = self.weatherKind;
  const isRain = kind === 'rain';
  const sway = isRain ? 0.15 : kind === 'snow' ? 0.9 : 0.65;
  // Pendant une annonce ennemie, les particules décoratives sont réduites de moitié
  const hazard = self.playMode === 'expedition' && self.telegraphs.some((tg) => tg.isEnemyHazard);

  for (let i = 0; i < self.weatherCount; i++) {
    const m = self.weatherMotes[i];
    if (!m) continue;
    m.phase += dt * (kind === 'float' ? 1.8 : 2.6);
    m.x += (m.vx + Math.sin(m.phase) * sway) * dt;
    m.y += m.vy * dt;
    m.z += (m.vz + Math.cos(m.phase * 0.8) * (isRain ? 0.15 : 0.55)) * dt;

    // Wrap seamlessly inside biome volume
    if (kind === 'rise') {
      if (m.y > 14) {
        m.y = 0.5;
        m.x = (Math.random() - 0.5) * 34;
        m.z = (Math.random() - 0.5) * 34;
      }
    } else if (kind === 'float') {
      if (m.y > 15 || m.y < 1.2) {
        m.vy *= -1;
      }
    } else if (m.y < 0.3) {
      m.y = 11 + Math.random() * 6;
      m.x = (Math.random() - 0.5) * 36;
      m.z = (Math.random() - 0.5) * 36;
    }

    if (m.x > 20) m.x = -20;
    else if (m.x < -20) m.x = 20;
    if (m.z > 20) m.z = -20;
    else if (m.z < -20) m.z = 20;

    _dummy.position.set(m.x, m.y, m.z);
    if (isRain) {
      _dummy.rotation.set(0, 0, m.vx < -4 ? 0.3 : 0.12);
    } else {
      _dummy.rotation.set(m.phase * 0.7, m.phase * 0.9, 0);
    }
    if (hazard && i % 2 === 1) _dummy.scale.setScalar(0.0001);
    else _dummy.scale.set(m.sizeX, m.sizeY, m.sizeZ);
    _dummy.updateMatrix();
    self.weatherMesh.setMatrixAt(i, _dummy.matrix);
  }
  self.weatherMesh.instanceMatrix.needsUpdate = true;
}

/** Cycle jour/nuit doux du camp : ciel, brume et lumières interpolés entre des clés. */
export function updateDayNight(self: VoxelEngine, dt: number): void {
  self.campClock = (self.campClock + dt / CAMP_DAY_LENGTH) % 1;
  let idx = 0;
  while (idx < CAMP_SKY_KEYS.length - 2 && self.campClock >= CAMP_SKY_KEYS[idx + 1].t) idx += 1;
  const a = CAMP_SKY_KEYS[idx];
  const b = CAMP_SKY_KEYS[idx + 1];
  const raw = THREE.MathUtils.clamp((self.campClock - a.t) / Math.max(0.0001, b.t - a.t), 0, 1);
  const f = raw * raw * (3 - 2 * raw);
  if (self.scene.background instanceof THREE.Color) self.scene.background.lerpColors(a.sky, b.sky, f);
  if (self.scene.fog) self.scene.fog.color.lerpColors(a.fog, b.fog, f);
  self.keyLight.color.lerpColors(a.key, b.key, f);
  self.keyLight.intensity = THREE.MathUtils.lerp(a.keyI, b.keyI, f);
  self.baseHemiIntensity = THREE.MathUtils.lerp(a.hemiI, b.hemiI, f);
  self.scene.environmentIntensity = THREE.MathUtils.lerp(a.envI, b.envI, f);

  // 0 en plein jour, 1 en pleine nuit : pilote la lueur du feu et les étoiles
  const night = THREE.MathUtils.clamp((0.42 - self.scene.environmentIntensity) / 0.37, 0, 1);
  if (self.potLight) {
    const flicker = 0.92 + Math.sin(self.elapsedTotal * 11) * 0.05 + Math.sin(self.elapsedTotal * 17.3) * 0.03;
    self.potLight.intensity = night * 60 * flicker;
  }
  if (self.campStars) {
    (self.campStars.material as THREE.MeshBasicMaterial).opacity = night * night * 0.95;
    self.campStars.visible = night > 0.02;
  }
}
