/**
 * Rendu en pipeline d'effets (spec Atelier, G1.2) : occlusion ambiante (GTAO), halo (bloom) réservé à ce qui
 * brille, contour fin autour des créatures, tone mapping ACES (réglé sur le renderer) et léger étalonnage des
 * couleurs par biome.
 *
 * Trois niveaux : Bas (aucun effet), Moyen (contour, halo), Haut (tout). « Automatique » descend d'un niveau
 * quand la cadence reste sous 45 images par seconde pendant 3 s.
 *
 * Rien de tout cela n'existe en mode headless (simulation, golden) : aucun objet three.js de plus pendant
 * un combat simulé, le golden reste identique.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { VoxelEngine } from '../VoxelEngine';
import type { BiomeId } from '../types';

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';
export type QualityLevel = 'low' | 'medium' | 'high';

/** Règle de l'Automatique : descendre d'un cran sous ce seuil tenu pendant cette durée (pure, testée). */
export const AUTO_QUALITY = { minFps: 45, holdSec: 3 };

export function nextAutoLevel(level: QualityLevel, lowFpsFor: number): QualityLevel {
  if (lowFpsFor < AUTO_QUALITY.holdSec) return level;
  return level === 'high' ? 'medium' : 'low';
}

/** Étalonnage léger par biome : saturation et teinte multipliée (1 = neutre). */
export const BIOME_GRADE: Record<BiomeId | 'camp', { saturation: number; tint: [number, number, number] }> = {
  camp: { saturation: 1.06, tint: [1.02, 1.0, 0.97] },
  meadow: { saturation: 1.08, tint: [1.0, 1.02, 0.96] },
  shore: { saturation: 1.05, tint: [0.97, 1.0, 1.04] },
  volcano: { saturation: 1.1, tint: [1.05, 0.98, 0.93] },
  sanctuary: { saturation: 1.04, tint: [0.99, 0.98, 1.05] },
  tundra: { saturation: 0.96, tint: [0.97, 1.0, 1.05] },
  stormpeak: { saturation: 0.98, tint: [0.98, 0.98, 1.04] },
  canyon: { saturation: 1.07, tint: [1.05, 0.99, 0.94] },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    saturation: { value: 1.0 },
    tint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform vec3 tint;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation) * tint;
      gl_FragColor = c;
    }
  `,
};

export interface PostFx {
  composer: EffectComposer;
  gtao: GTAOPass;
  bloom: UnrealBloomPass;
  outline: OutlinePass;
  grade: ShaderPass;
  /** Tableau réutilisé pour le contour (aucune allocation par image). */
  outlined: THREE.Object3D[];
  level: QualityLevel;
  setting: QualitySetting;
  lowFpsFor: number;
  lastFrameAt: number;
  fpsWindow: number[];
}

export function setupPostFx(self: VoxelEngine, width: number, height: number): void {
  const renderer = self.renderer;
  if (!renderer || self.isSoftwareGl) {
    self.postfx = null;
    return;
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(self.scene, self.camera));
  const gtao = new GTAOPass(self.scene, self.camera, width, height);
  gtao.output = GTAOPass.OUTPUT.Default;
  composer.addPass(gtao);
  const outline = new OutlinePass(new THREE.Vector2(width, height), self.scene, self.camera);
  outline.edgeStrength = 2.2;
  outline.edgeThickness = 1.0;
  outline.edgeGlow = 0;
  outline.visibleEdgeColor.set('#141925');
  outline.hiddenEdgeColor.set('#141925');
  composer.addPass(outline);
  // halo : seuil haut, seules les surfaces lumineuses (flammes, foudre, cristaux, cubes, projectiles) brillent
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.4, 0.86);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  self.postfx = {
    composer,
    gtao,
    bloom,
    outline,
    grade,
    outlined: [],
    level: 'high',
    setting: 'auto',
    lowFpsFor: 0,
    lastFrameAt: 0,
    fpsWindow: [],
  };
  applyQualityLevel(self, 'high');
}

/** Active les passes du niveau choisi. */
export function applyQualityLevel(self: VoxelEngine, level: QualityLevel): void {
  const fx = self.postfx;
  if (!fx) return;
  fx.level = level;
  fx.gtao.enabled = level === 'high';
  fx.outline.enabled = level !== 'low';
  fx.bloom.enabled = level !== 'low';
  fx.grade.enabled = level !== 'low';
}

export function setQuality(self: VoxelEngine, setting: QualitySetting): void {
  const fx = self.postfx;
  if (!fx) return;
  fx.setting = setting;
  fx.lowFpsFor = 0;
  applyQualityLevel(self, setting === 'auto' ? 'high' : setting);
}

export function qualityLabel(self: VoxelEngine): string {
  const fx = self.postfx;
  if (!fx) return 'bas (rendu logiciel ou headless)';
  const name = { low: 'bas', medium: 'moyen', high: 'haut' }[fx.level];
  return fx.setting === 'auto' ? `automatique → ${name}` : name;
}

export function resizePostFx(self: VoxelEngine, w: number, h: number): void {
  self.postfx?.composer.setSize(w, h);
}

/** Étalonnage du biome en cours (camp hors expédition). */
export function setGrade(self: VoxelEngine, key: BiomeId | 'camp'): void {
  const fx = self.postfx;
  if (!fx) return;
  const g = BIOME_GRADE[key] ?? BIOME_GRADE.camp;
  fx.grade.uniforms.saturation.value = g.saturation;
  (fx.grade.uniforms.tint.value as THREE.Vector3).set(...g.tint);
}

/** Rend une image : directement en Bas, par le pipeline sinon ; l'Automatique surveille la cadence. */
export function renderFrame(self: VoxelEngine, dt: number): void {
  const renderer = self.renderer;
  if (!renderer) return;
  const fx = self.postfx;
  if (!fx || fx.level === 'low') {
    renderer.render(self.scene, self.camera);
  } else {
    // contour : les créatures présentes (tableau réutilisé)
    if (fx.outline.enabled) {
      fx.outlined.length = 0;
      if (self.playMode === 'expedition') {
        for (const a of self.allies) if (!a.removed) fx.outlined.push(a.rig.root);
        for (const e of self.enemies) if (!e.removed) fx.outlined.push(e.rig.root);
      } else {
        for (const w of self.campWanderers) fx.outlined.push(w.rig.root);
      }
      fx.outline.selectedObjects = fx.outlined;
    }
    fx.composer.render(dt);
  }
  if (fx && fx.setting === 'auto' && fx.level !== 'low' && dt > 0) {
    fx.lowFpsFor = 1 / dt < AUTO_QUALITY.minFps ? fx.lowFpsFor + dt : 0;
    const next = nextAutoLevel(fx.level, fx.lowFpsFor);
    if (next !== fx.level) {
      fx.lowFpsFor = 0;
      applyQualityLevel(self, next);
    }
  }
}
