/**
 * Boucle du moteur : cadence d'affichage (GPU ou rendu logiciel) et pas de jeu `advance`,
 * commun au temps réel (`tick`) et au mode headless (`stepSimulation`).
 */
import { updateStormAmbience, updateWeather } from './atmosphere';
import { updateCamera } from './camera';
import { renderFrame } from './postfx';
import { updateCubeVisuals } from './cubeFx';
import { updateCamp } from './camp';
import { updateExpedition } from './expedition';
import { updateParticles } from './fx';
import type { VoxelEngine } from '../VoxelEngine';

export function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function scheduleNextFrame(self: VoxelEngine): void {
  if (self.disposed) return;
  if (self.isSoftwareGl) {
    afterDraw(self, () => tick(self));
  } else {
    self.frameId = requestAnimationFrame(() => tick(self));
  }
}

export function afterDraw(self: VoxelEngine, cb: () => void): void {
  if (self.disposed || !self.renderer) return;
  const gl = self.renderer.getContext() as WebGL2RenderingContext;
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    if (self.disposed) return;
    const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
    if (state === gl.UNSIGNALED) {
      self.frameId = window.setTimeout(poll, 5);
    } else {
      if (sync) gl.deleteSync(sync);
      self.frameId = window.setTimeout(cb, 80);
    }
  };
  self.frameId = window.setTimeout(poll, 5);
}

export function tick(self: VoxelEngine): void {
  if (self.disposed) return;

  const now = performance.now();
  const rawDt = Math.max(0.001, (now - self.lastTimeMs) / 1000);
  self.lastTimeMs = now;
  advance(self, Math.min(rawDt, 0.05));
  renderFrame(self, rawDt);
  // mesures lues par l'overlay `?debug=1`
  self.frameCount += 1;
  self.lastFrameMs = performance.now() - now;
  if (self.retryClickAt > 0 && self.playMode === 'expedition') {
    self.lastRetryDelayMs = performance.now() - self.retryClickAt;
    self.retryClickAt = 0;
  }
  scheduleNextFrame(self);
}

/** Un pas de jeu complet (logique + caméra), commun à la boucle temps réel et au mode headless. */
export function advance(self: VoxelEngine, dt: number): void {
  self.elapsedTotal += dt;

  if (self.waterUniform) {
    self.waterUniform.value = self.elapsedTotal;
  }

  self.envAnimate?.(self.elapsedTotal);

  if (self.cloudGroup) {
    const clouds = self.cloudGroup.children;
    for (let i = 0; i < clouds.length; i++) {
      const cloud = clouds[i];
      cloud.position.x += (0.55 + (i % 3) * 0.25) * dt;
      if (cloud.position.x > 40) {
        cloud.position.x = -40;
      }
    }
  }

  if (self.screenState !== 'paused') {
    // Hitstop freezes simDt while camera shake, flashes & particles keep ticking in real dt
    const simDt = self.hitstopTimer > 0 ? 0 : self.slowMoTimer > 0 ? dt * self.slowMoScale : dt;
    if (self.slowMoTimer > 0) self.slowMoTimer = Math.max(0, self.slowMoTimer - dt);
    if (self.hitstopTimer > 0) {
      self.hitstopTimer = Math.max(0, self.hitstopTimer - dt);
    }

    if (self.playMode === 'camp') {
      updateCamp(self, dt);
    } else {
      updateExpedition(self, dt, simDt);
    }

    updateParticles(self, dt);
    updateWeather(self, dt);
    updateStormAmbience(self, dt);
    self.floatingText.update(dt);
  }

  updateCubeVisuals(self);
  updateCamera(self, dt);
}
