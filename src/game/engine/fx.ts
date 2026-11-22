/**
 * Effets visuels du combat : particules (pool fixe), projectiles, ondes de choc, télégraphes au sol, confettis.
 * Les télégraphes portent aussi la logique de leur attaque (`onComplete`), déclenchée par `updateTelegraphs`.
 */
import * as THREE from 'three';
import { soundFx } from '../audio';
import type { ElementType } from '../types';
import { _color, _dummy, CONFETTI_COLORS, ELEMENT_FX, PARTICLE_POOL_SIZE } from './constants';
import type { ActiveProjectile } from './types';
import type { VoxelEngine } from '../VoxelEngine';

export function spawnProjectile(self: VoxelEngine, p: Omit<ActiveProjectile, 'mesh'>): void {
  const geo = new THREE.BoxGeometry(p.radius * 1.4, p.radius * 1.4, p.radius * 1.4);
  const mat = new THREE.MeshStandardMaterial({
    color: p.elementColor,
    emissive: new THREE.Color(p.elementColor),
    emissiveIntensity: 0.7,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x, p.y, p.z);
  self.fxGroup.add(mesh);
  self.projectiles.push({ ...p, mesh });
}

export function spawnShockwaveRing(self: VoxelEngine, x: number, z: number, radius: number, colorHex: string): void {
  const ringGeo = new THREE.RingGeometry(Math.max(0.2, radius * 0.72), radius, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(ringGeo, ringMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.06, z);
  self.fxGroup.add(mesh);

  self.telegraphs.push({
    mesh,
    x,
    z,
    radius,
    elapsed: 0,
    duration: 0.26,
    isLine: false,
    dirX: 0,
    dirZ: 0,
    isEnemyHazard: false,
    onComplete: () => {},
  });
}

export function spawnEnemyTelegraph(
  self: VoxelEngine,
  x: number,
  z: number,
  radius: number,
  duration: number,
  isLine: boolean,
  dirX: number,
  dirZ: number,
  onComplete: () => void,
  opts?: { innerRadius?: number; color?: string; silent?: boolean },
): void {
  if (!opts?.silent) soundFx.playTelegraph();
  const geo = isLine
    ? new THREE.PlaneGeometry(1.4, radius)
    : opts?.innerRadius
      ? new THREE.RingGeometry(opts.innerRadius, radius, 40) // couronne : zone sûre au centre
      : new THREE.CircleGeometry(radius, 28);
  if (isLine) {
    geo.translate(0, radius / 2, 0);
  }
  const mat = new THREE.MeshBasicMaterial({
    color: opts?.color ?? '#EF4444',
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  if (isLine) {
    mesh.rotation.z = Math.atan2(dirX, dirZ) - Math.PI;
  }
  mesh.position.set(x, 0.05, z);
  self.fxGroup.add(mesh);

  self.telegraphs.push({
    mesh,
    x,
    z,
    radius,
    elapsed: 0,
    duration,
    isLine,
    dirX,
    dirZ,
    isEnemyHazard: true,
    onComplete,
  });
}

export function clearProjectilesAndTelegraphs(self: VoxelEngine): void {
  for (const p of self.projectiles) {
    self.fxGroup.remove(p.mesh);
    p.mesh.geometry.dispose();
    (p.mesh.material as THREE.Material).dispose();
  }
  self.projectiles = [];

  for (const t of self.telegraphs) {
    self.fxGroup.remove(t.mesh);
    t.mesh.geometry.dispose();
    (t.mesh.material as THREE.Material).dispose();
  }
  self.telegraphs = [];
}

export function spawnParticleBurst(
  self: VoxelEngine,
  x: number,
  y: number,
  z: number,
  colorHex: string,
  count: number,
  speed: number,
): void {
  for (let i = 0; i < count; i++) {
    const slot = self.particles[self.particleCursor];
    self.particleCursor = (self.particleCursor + 1) % PARTICLE_POOL_SIZE;
    const ang = Math.random() * Math.PI * 2;
    const spd = (0.35 + Math.random() * 0.65) * speed;
    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 0.4;
    slot.y = y + Math.random() * 0.3;
    slot.z = z + (Math.random() - 0.5) * 0.4;
    slot.vx = Math.cos(ang) * spd;
    slot.vy = 2.2 + Math.random() * 3.8;
    slot.vz = Math.sin(ang) * spd;
    slot.maxLife = 0.35 + Math.random() * 0.35;
    slot.life = slot.maxLife;
    slot.size = 0.14 + Math.random() * 0.18;
    slot.colorHex = colorHex;
    slot.gravity = 11.5;
    slot.drag = 0;
    slot.stretchY = 1;
    slot.bounce = 0;
  }
}

/**
 * Gerbe d'impact propre à chaque élément : braises qui montent, gouttes qui rebondissent,
 * feuilles qui planent, étincelles nerveuses, éclats de roche lourds, spirale psy.
 */
export function spawnElementBurst(
  self: VoxelEngine,
  x: number,
  y: number,
  z: number,
  element: ElementType,
  count: number,
  power = 1,
): void {
  const fx = ELEMENT_FX[element];
  for (let i = 0; i < count; i++) {
    const slot = self.particles[self.particleCursor];
    self.particleCursor = (self.particleCursor + 1) % PARTICLE_POOL_SIZE;
    const ang = Math.random() * Math.PI * 2;
    const spd = (0.4 + Math.random() * 0.6) * fx.speed * power;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    slot.active = true;
    slot.x = x + cos * 0.25;
    slot.y = y + Math.random() * 0.4;
    slot.z = z + sin * 0.25;
    // swirl : composante tangentielle pour les feuilles et la spirale psy
    slot.vx = cos * spd - sin * fx.swirl;
    slot.vz = sin * spd + cos * fx.swirl;
    slot.vy = fx.vyMin + Math.random() * (fx.vyMax - fx.vyMin);
    slot.maxLife = fx.lifeMin + Math.random() * (fx.lifeMax - fx.lifeMin);
    slot.life = slot.maxLife;
    slot.size = fx.sizeMin + Math.random() * (fx.sizeMax - fx.sizeMin);
    slot.colorHex = fx.colors[i % fx.colors.length];
    slot.gravity = fx.gravity;
    slot.drag = fx.drag;
    slot.stretchY = fx.stretchY;
    slot.bounce = fx.bounce;
  }
}

export function spawnSteamCube(self: VoxelEngine, x: number, y: number, z: number, colorHex: string): void {
  const slot = self.particles[self.particleCursor];
  self.particleCursor = (self.particleCursor + 1) % PARTICLE_POOL_SIZE;
  slot.active = true;
  slot.x = x + (Math.random() - 0.5) * 0.8;
  slot.y = y;
  slot.z = z + (Math.random() - 0.5) * 0.8;
  slot.vx = (Math.random() - 0.5) * 0.4;
  slot.vy = 1.6 + Math.random() * 0.9;
  slot.vz = (Math.random() - 0.5) * 0.4;
  slot.maxLife = 1.0 + Math.random() * 0.5;
  slot.life = slot.maxLife;
  slot.size = 0.22 + Math.random() * 0.14;
  slot.colorHex = colorHex;
  slot.gravity = -0.35;
  slot.drag = 0;
  slot.stretchY = 1;
  slot.bounce = 0;
}

export function spawnConfetti(self: VoxelEngine, x: number, y: number, z: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const slot = self.particles[self.particleCursor];
    self.particleCursor = (self.particleCursor + 1) % PARTICLE_POOL_SIZE;
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.2 + Math.random() * 2.6;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = Math.cos(ang) * spd;
    slot.vy = 4 + Math.random() * 3.4;
    slot.vz = Math.sin(ang) * spd;
    slot.maxLife = 1.0 + Math.random() * 0.6;
    slot.life = slot.maxLife;
    slot.size = 0.14 + Math.random() * 0.1;
    slot.colorHex = CONFETTI_COLORS[(i + Math.floor(Math.random() * 6)) % CONFETTI_COLORS.length];
    slot.gravity = 6.5;
    slot.drag = 1.3;
    slot.stretchY = 0.35;
    slot.bounce = 0;
  }
}

export function updateParticles(self: VoxelEngine, dt: number): void {
  let dirty = false;
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = self.particles[i];
    if (!p.active) continue;
    dirty = true;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      self.particleMesh.setMatrixAt(i, _dummy.matrix);
      continue;
    }
    p.vy -= p.gravity * dt;
    if (p.drag > 0) {
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      if (p.gravity === 0) p.vy *= damp;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < 0.08) {
      p.y = 0.08;
      if (p.bounce > 0 && p.vy < 0) p.vy = -p.vy * p.bounce;
    }
    p.z += p.vz * dt;
    const ratio = p.life / p.maxLife;
    const s = p.size * ratio;
    _dummy.position.set(p.x, p.y, p.z);
    if (p.stretchY > 1.5) {
      // gouttes / étincelles : alignées sur leur trajectoire au lieu de tournoyer
      _dummy.rotation.set(0, p.life * 3, Math.atan2(p.vx, Math.abs(p.vy) + 0.5) * -0.6);
    } else {
      _dummy.rotation.set(p.life * 6, p.life * 4, 0);
    }
    _dummy.scale.set(s, s * p.stretchY, s);
    _dummy.updateMatrix();
    self.particleMesh.setMatrixAt(i, _dummy.matrix);
    self.particleMesh.setColorAt(i, _color.set(p.colorHex));
  }
  if (dirty) {
    self.particleMesh.instanceMatrix.needsUpdate = true;
    if (self.particleMesh.instanceColor) {
      self.particleMesh.instanceColor.needsUpdate = true;
    }
  }
}

export function updateProjectiles(self: VoxelEngine, dt: number, simDt: number): void {
  // Update projectiles
  for (let i = self.projectiles.length - 1; i >= 0; i--) {
    const p = self.projectiles[i];
    p.life -= simDt;
    p.x += p.vx * simDt;
    p.z += p.vz * simDt;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.y += dt * 7;
    p.mesh.rotation.x += dt * 5;

    const targets = p.fromAlly ? self.enemies : self.allies;
    let hit = false;
    for (const t of targets) {
      if (t.fainted || t.removed) continue;
      const hitRadius = p.radius + (t.isBoss ? 1.2 : 0.72);
      if (Math.hypot(t.x - p.x, t.z - p.z) <= hitRadius) {
        hit = true;
        break;
      }
    }

    if (hit || p.life <= 0) {
      if (hit) {
        for (const t of targets) {
          if (t.fainted || t.removed) continue;
          if (Math.hypot(t.x - p.x, t.z - p.z) <= p.aoeRadius + (t.isBoss ? 1.0 : 0.45)) {
            self.applyDamageToActor(
              t,
              p.damage,
              p.casterUnit,
              p.aoeRadius > 1.5,
              p.isCrit,
              p.elementColor,
              p.elementType,
              Boolean(p.isSkill),
            );
          }
        }
        if (p.aoeRadius > 1.5) {
          spawnShockwaveRing(self, p.x, p.z, p.aoeRadius, p.elementColor);
        }
      }
      self.fxGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      self.projectiles.splice(i, 1);
    }
  }
}

export function updateTelegraphs(self: VoxelEngine, simDt: number): void {
  // Update ground telegraphs & shockwaves
  for (let i = self.telegraphs.length - 1; i >= 0; i--) {
    const tg = self.telegraphs[i];
    tg.elapsed += simDt;
    const ratio = Math.min(1, tg.elapsed / tg.duration);
    const mat = tg.mesh.material as THREE.MeshBasicMaterial;
    if (tg.duration <= 0.3) {
      // Expanding shockwave ring
      tg.mesh.scale.setScalar(0.5 + ratio * 0.7);
      mat.opacity = (1 - ratio) * 0.75;
    } else {
      // Enemy attack windup telegraph pulsing brighter as impact approaches
      mat.opacity = 0.22 + ratio * 0.42;
    }
    if (tg.elapsed >= tg.duration) {
      self.fxGroup.remove(tg.mesh);
      tg.mesh.geometry.dispose();
      mat.dispose();
      self.telegraphs.splice(i, 1);
      tg.onComplete();
    }
  }
}
