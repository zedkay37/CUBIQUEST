/**
 * La lumière du sprint Art (section 4), pour la Prairie et le camp, dans le navigateur seulement :
 * - ciel en dégradé (dôme), dont les couleurs suivent celles du fond et de la brume (jour, nuit) ;
 * - soleil rasant le matin et le soir au camp (la lumière principale suit l'heure) ;
 * - ombres plus fines : carte 2048 en qualité Haut, cadre d'ombre resserré qui suit la zone visible ;
 * - brume légère à l'horizon, et rayons de lumière en qualité Haut.
 * Rien en headless : la simulation et le golden ne sont pas concernés.
 */
import * as THREE from 'three';
import type { VoxelEngine } from '../VoxelEngine';
import { isArtDecorOn } from '../models/meadowDecor';

interface ArtLight {
  dome: THREE.Mesh;
  top: THREE.Color;
  bottom: THREE.Color;
  rays: THREE.Group;
  rayMat: THREE.MeshBasicMaterial;
}

const _off = new THREE.Vector3();

function rayTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,244,214,0.0)');
  grad.addColorStop(0.35, 'rgba(255,244,214,0.55)');
  grad.addColorStop(1, 'rgba(255,244,214,0.0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.5, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function setupArtLight(self: VoxelEngine): void {
  if (!self.renderer || self.headless || !isArtDecorOn()) return;
  const top = new THREE.Color('#5EA8E8');
  const bottom = new THREE.Color('#CFE8F8');
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTop: { value: top }, uBottom: { value: bottom } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(uBottom, uTop, h), 1.0); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), mat);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  self.scene.add(dome);

  // rayons de lumière (qualité Haut, de jour) : quelques plans verticaux additifs
  const rayMat = new THREE.MeshBasicMaterial({ map: rayTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.0, side: THREE.DoubleSide, fog: false });
  const rays = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3 + i * 0.6, 26), rayMat);
    p.position.set(-14 + i * 7, 9, -12 + (i % 2) * 5);
    p.rotation.set(0, 0.6, 0.42);
    rays.add(p);
  }
  self.scene.add(rays);

  // ombres plus fines, cadre resserré qui suivra la caméra
  const k = self.keyLight;
  k.shadow.mapSize.set(2048, 2048);
  const d = 17;
  k.shadow.camera.left = -d;
  k.shadow.camera.right = d;
  k.shadow.camera.top = d;
  k.shadow.camera.bottom = -d;
  k.shadow.camera.updateProjectionMatrix();
  k.shadow.radius = 3;
  self.scene.add(k.target);
  self.artLight = { dome, top, bottom, rays, rayMat };
}

/** Un pas : ciel, soleil, cadre d'ombre, rayons. */
export function updateArtLight(self: VoxelEngine): void {
  const a = self.artLight;
  if (!a) return;
  const meadow = self.playMode === 'camp' || self.activeStage?.biomeId === 'meadow';
  a.dome.visible = meadow;
  if (!meadow) {
    a.rays.visible = false;
    return;
  }
  // ciel : le haut prend la couleur du fond (qui suit l'heure), le bas celle de la brume
  if (self.scene.background instanceof THREE.Color) a.top.copy(self.scene.background).offsetHSL(0, 0.05, -0.08);
  if (self.scene.fog) a.bottom.copy(self.scene.fog.color);
  // soleil : au camp, il se lève à l'est et se couche à l'ouest (rasant matin et soir)
  const look = self.camLook;
  if (self.playMode === 'camp') {
    const ang = self.campClock * Math.PI * 2; // 0 aube, 0,25 midi, 0,5 crépuscule
    const elev = Math.max(0.18, Math.sin(ang + 0.15));
    _off.set(Math.cos(ang + 0.15) * 30, elev * 30, 12);
  } else {
    _off.set(16, 26, 14);
  }
  self.keyLight.position.copy(look).add(_off);
  self.keyLight.target.position.copy(look);
  // rayons : qualité Haut, de jour seulement
  const high = self.postfx?.level === 'high';
  const day = self.scene.environmentIntensity > 0.3;
  a.rays.visible = high && day;
  a.rayMat.opacity = 0.22;
  a.rays.position.set(look.x, 0, look.z);
}
