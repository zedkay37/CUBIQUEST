/**
 * Constantes du moteur : tailles des pools, durées des séquences, tables d'effets, de météo et d'éclairage.
 * Les objets `_vec*`, `_dummy` et `_color` sont des tampons de calcul partagés (aucune allocation par image).
 */
import * as THREE from 'three';
import type { BiomeId, ElementType } from '../types';
import type { WeatherKind } from './types';

// Module-level preallocated math scratch objects (Zero GC inside render loop)
export const _vecA = new THREE.Vector3();

export const _vecB = new THREE.Vector3();

export const _vecC = new THREE.Vector3();

export const _dummy = new THREE.Object3D();

export const _color = new THREE.Color();

// Signature visuelle des impacts par élément (couleurs + comportement physique des cubes)
export const ELEMENT_FX: Record<
  ElementType,
  {
    colors: string[];
    speed: number;
    vyMin: number;
    vyMax: number;
    gravity: number;
    drag: number;
    stretchY: number;
    bounce: number;
    lifeMin: number;
    lifeMax: number;
    sizeMin: number;
    sizeMax: number;
    spin: number;
  }
> = {
  // braises qui montent
  fire: { colors: ['#FF7043', '#FDBA74', '#FDE047'], speed: 2.6, vyMin: 1.6, vyMax: 4.2, gravity: -3.2, drag: 1.6, stretchY: 1.25, bounce: 0, lifeMin: 0.45, lifeMax: 0.85, sizeMin: 0.12, sizeMax: 0.26, spin: 0 },
  // gouttes étirées qui rebondissent
  water: { colors: ['#38BDF8', '#7DD3FC', '#E0F2FE'], speed: 4.4, vyMin: 3.0, vyMax: 6.2, gravity: 17, drag: 0, stretchY: 1.8, bounce: 0.32, lifeMin: 0.4, lifeMax: 0.7, sizeMin: 0.1, sizeMax: 0.2, spin: 0 },
  // feuilles plates qui planent
  grass: { colors: ['#4ADE80', '#86EFAC', '#FDE68A'], speed: 3.6, vyMin: 2.0, vyMax: 3.8, gravity: 3.4, drag: 2.4, stretchY: 0.35, bounce: 0, lifeMin: 0.7, lifeMax: 1.1, sizeMin: 0.16, sizeMax: 0.28, spin: 1.4 },
  // étincelles nerveuses, très brèves
  electric: { colors: ['#FACC15', '#FEF9C3', '#FFFFFF'], speed: 9.5, vyMin: -1.0, vyMax: 5.0, gravity: 0, drag: 7.5, stretchY: 2.6, bounce: 0, lifeMin: 0.14, lifeMax: 0.32, sizeMin: 0.07, sizeMax: 0.15, spin: 0 },
  // éclats lourds
  rock: { colors: ['#D6A874', '#A98359', '#78716C'], speed: 3.8, vyMin: 3.2, vyMax: 6.0, gravity: 21, drag: 0, stretchY: 1, bounce: 0.45, lifeMin: 0.6, lifeMax: 0.95, sizeMin: 0.2, sizeMax: 0.36, spin: 0 },
  // spirale ascendante
  psychic: { colors: ['#C084FC', '#E9D5FF', '#67E8F9'], speed: 2.4, vyMin: 0.8, vyMax: 2.6, gravity: -1.6, drag: 1.1, stretchY: 1, bounce: 0, lifeMin: 0.6, lifeMax: 1.0, sizeMin: 0.1, sizeMax: 0.2, spin: 4.2 },
};

// Scène d'évolution : devant l'atelier, face caméra
export const EVO_X = 0;

export const EVO_Z = 3.2; // assez près du centre pour que la caméra reste devant les arbres du pourtour

export const EVO_CHARGE_SEC = 2.0;

export const EVO_TOTAL_SEC = 3.8;

export const BOSS_INTRO_SEC = 1.9;

export const CONFETTI_COLORS = ['#F4B942', '#E85D3F', '#2FB97A', '#38BDF8', '#C084FC', '#FAF7F0'];

// Cycle jour/nuit doux du camp (un tour complet = CAMP_DAY_LENGTH secondes)
export const CAMP_DAY_LENGTH = 150;

export function skyKey(t: number, sky: string, fog: string, key: string, keyI: number, hemiI: number, envI: number) {
  return { t, sky: new THREE.Color(sky), fog: new THREE.Color(fog), key: new THREE.Color(key), keyI, hemiI, envI };
}

export const CAMP_SKY_KEYS = [
  skyKey(0.0, '#F6C9A0', '#F8DDC6', '#FFD2A6', 1.0, 0.46, 0.34), // aube
  skyKey(0.1, '#A7D8F7', '#C5E6FA', '#FFF2D6', 1.28, 0.52, 0.42), // jour
  skyKey(0.52, '#A7D8F7', '#C5E6FA', '#FFF2D6', 1.28, 0.52, 0.42),
  skyKey(0.64, '#F0A774', '#F3C3A0', '#FFB27A', 0.95, 0.42, 0.3), // crépuscule
  // Nuit : ciel vraiment sombre, clair de lune faible. La lisibilité vient du feu de l'atelier
  // (lumière chaude ponctuelle, voir updateDayNight) et non d'un éclairage ambiant élevé.
  skyKey(0.74, '#0A0F24', '#121936', '#8FA8FF', 0.2, 0.15, 0.05),
  skyKey(0.92, '#0A0F24', '#121936', '#8FA8FF', 0.2, 0.15, 0.05),
  skyKey(1.0, '#F6C9A0', '#F8DDC6', '#FFD2A6', 1.0, 0.46, 0.34),
];

export const PARTICLE_POOL_SIZE = 320; // plafond dur : ring buffer, jamais d'allocation en combat

export const WEATHER_COUNT = 96; // capacité max de l'InstancedMesh météo (le nombre actif dépend du biome)

export const BOLT_POOL_SIZE = 6;

/** Ambiance particulaire par biome. */
export const WEATHER_PROFILES: Record<
  BiomeId,
  { kind: WeatherKind; count: number; colors: string[]; /** vent latéral ajouté aux particules qui dérivent */ wind?: number }
> = {
  meadow: { kind: 'drift', count: 54, colors: ['#FEF08A', '#BBF7D0', '#FDE68A'] }, // pollen
  shore: { kind: 'rain', count: 54, colors: ['#E0F2FE', '#7DD3FC', '#BAE6FD'] }, // embruns
  volcano: { kind: 'rise', count: 54, colors: ['#FB923C', '#FDE047', '#EF4444'] }, // braises
  sanctuary: { kind: 'float', count: 54, colors: ['#E9D5FF', '#67E8F9', '#C084FC'] }, // éclats astraux
  tundra: { kind: 'snow', count: 96, colors: ['#FFFFFF', '#E0F2FE', '#F8FAFC'] }, // neige
  stormpeak: { kind: 'rain', count: 96, colors: ['#CBD5E1', '#94A3B8', '#E2E8F0'] }, // pluie battante
  canyon: { kind: 'drift', count: 80, colors: ['#F2D6A2', '#E8B873', '#FBE8C4'], wind: 3.4 }, // sable porté par le vent
};

export const BIOME_LIGHTING: Record<BiomeId, { sky: string; ground: string; key: string }> = {
  meadow: { sky: '#BCE2FF', ground: '#8D7356', key: '#FFF2D6' },
  shore: { sky: '#BCE2FF', ground: '#8D7356', key: '#FFF2D6' },
  volcano: { sky: '#FFA987', ground: '#3A2422', key: '#FFD6B0' },
  sanctuary: { sky: '#D8C4FF', ground: '#3E345C', key: '#EFE4FF' },
  tundra: { sky: '#CFE6FF', ground: '#6F86A8', key: '#EAF6FF' },
  stormpeak: { sky: '#C2CCDA', ground: '#3B4252', key: '#DDE6F2' },
  canyon: { sky: '#FFE2B8', ground: '#8A5A3A', key: '#FFD9A0' },
};

export const ARENA_BOUND = 15.5;

export const MAX_ATTACK_TOKENS = 3;
