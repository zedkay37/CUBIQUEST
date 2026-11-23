/**
 * Modèles des créatures : une construction par silhouette (`archetype`), teintée par la palette de l'espèce.
 */
import * as THREE from 'three';
import { SPECIES } from '../catalog';
import type { CreatureArchetype, SpeciesDef } from '../types';
import { getContactShadowTexture, getToyBumpTexture, makeBox } from './shared';
import { buildSculptRig, withIsolatedRandom, type SculptPalette } from './voxelSculpt';
import { SCULPT_DEFS } from './sculptDefs';

export interface VoxelCreatureRig {
  /** Yeux (modèles sculptés) : clignement et regard. */
  eyes?: THREE.Object3D[];
  root: THREE.Group;
  bodyPivot: THREE.Group;
  legs: THREE.Object3D[];
  extras: THREE.Object3D[]; // wings, orbiting cubes, tail
  flashMaterials: THREE.MeshStandardMaterial[];
  baseEmissives: THREE.Color[];
  hpBarBg?: THREE.Mesh;
  hpBarFill?: THREE.Mesh;
  species: SpeciesDef;
}

/** Silhouettes qui lévitent au lieu de marcher. */
export function isHoverArchetype(archetype: CreatureArchetype): boolean {
  return archetype === 'floating' || archetype === 'jelly';
}

/** Hauteur (échelle 1) où accrocher barre de vie et nombres de dégâts. */
export function getRigTopY(species: SpeciesDef): number {
  switch (species.archetype) {
    case 'floating':
    case 'jelly':
      return 2.0;
    case 'fungal':
      return 1.8;
    case 'antlered':
      return 2.5;
    case 'crab':
      return 1.6;
    case 'golem':
      return 2.1;
    case 'lizard':
      return 1.35;
    case 'serpentine':
      return 1.6;
    case 'ram':
      return 1.85;
    default:
      return 1.72;
  }
}

/**
 * Builds a charismatic 6-12 part composite voxel creature anchored at bottom-center (y = 0)
 */
/**
 * Sprint Art : les modèles sculptés (voxelSculpt.ts) ne servent que dans le navigateur. Les outils et le moteur
 * headless (simulation, golden) gardent les anciens modèles : aucun tirage aléatoire ni objet three.js de plus
 * pendant un combat simulé. `main.tsx` les active au démarrage du jeu.
 */
let sculptOn = false;
const SCULPT_SCALE = 1.18;
let sculptRes = 14;
export function setSculptModels(on: boolean): void {
  sculptOn = on;
}
/** Qualité Bas : version simplifiée automatique (moins de blocs). */
export function setSculptDetail(level: 'low' | 'high'): void {
  sculptRes = level === 'low' ? 9 : 14;
}
export function usesSculpt(speciesId: string): boolean {
  return sculptOn && Boolean(SCULPT_DEFS[speciesId]);
}

export function buildVoxelCreature(speciesId: string, scaleOverride?: number, variant?: boolean): VoxelCreatureRig {
  const species = SPECIES[speciesId] ?? SPECIES.pyrocube;
  if (usesSculpt(species.id)) return withIsolatedRandom(() => buildSculptCreature(species, scaleOverride, variant));
  return buildLegacyCreature(species, scaleOverride, variant);
}

/** Ancienne créature « gros pavés » (toujours utilisée par les outils et pour les espèces pas encore refaites). */
export function buildLegacyCreature(species: SpeciesDef, scaleOverride?: number, variant?: boolean): VoxelCreatureRig {
  const bump = getToyBumpTexture();

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: species.palette.primary,
    roughness: 0.72,
    metalness: 0.05,
    bumpMap: bump,
    bumpScale: 0.015,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: species.palette.secondary,
    roughness: 0.44, // >= 0.25 roughness contrast vs primary
    metalness: species.element === 'rock' || species.element === 'water' ? 0.22 : 0.08,
    bumpMap: bump,
    bumpScale: 0.012,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: species.palette.belly,
    roughness: 0.82,
    metalness: 0.02,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: species.palette.accent,
    roughness: 0.25,
    metalness: species.element === 'psychic' || species.element === 'electric' ? 0.35 : 0.15,
    emissive: new THREE.Color(species.palette.accent),
    emissiveIntensity: species.element === 'fire' || species.element === 'psychic' || species.element === 'electric' ? 0.28 : 0.06,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: species.palette.eye,
    roughness: 0.14,
    metalness: 0.1,
  });
  const eyeHighlightMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.1,
    emissive: new THREE.Color('#FFFFFF'),
    emissiveIntensity: 0.25,
  });

  // A3.3 : variante de couleur (écran d'équipe seulement). Rotation de teinte EN PLACE sur les couleurs
  // existantes : aucun objet three.js ni tirage aléatoire en plus (golden inchangé).
  if (variant) {
    const shift = 150 / 360;
    primaryMat.color.offsetHSL(shift, 0, 0);
    secondaryMat.color.offsetHSL(shift, 0, 0);
    accentMat.color.offsetHSL(shift, 0, 0);
    accentMat.emissive.offsetHSL(shift, 0, 0);
  }

  const flashMaterials = [primaryMat, secondaryMat, bellyMat, accentMat];
  const baseEmissives = flashMaterials.map((m) => m.emissive.clone());

  const legs: THREE.Object3D[] = [];
  const extras: THREE.Object3D[] = [];

  // Contact shadow disc grounded at y = 0.02
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const arch = species.archetype;
  const stage = species.stage ?? 1;

  if (arch === 'quadruped') {
    // Grounded stout quadruped with dorsal bulb/flower (Bourgéon line)
    const torso = makeBox(1.02, 0.72, 1.12, primaryMat, 0, 0.62, 0);
    bodyPivot.add(torso);
    bodyPivot.add(makeBox(0.78, 0.42, 0.22, bellyMat, 0, 0.48, 0.49));
    // Snout & ears
    bodyPivot.add(makeBox(0.68, 0.34, 0.26, primaryMat, 0, 0.56, 0.58));
    bodyPivot.add(makeBox(0.22, 0.24, 0.2, secondaryMat, -0.34, 1.04, 0.34));
    bodyPivot.add(makeBox(0.22, 0.24, 0.2, secondaryMat, 0.34, 1.04, 0.34));
    // Dorsal voxel bulb / bloom (accent)
    const bulbBase = makeBox(0.68, 0.34, 0.68, secondaryMat, 0, 1.06, -0.14);
    const bulbTop = makeBox(0.44, 0.32, 0.44, accentMat, 0, 1.32, -0.14);
    bodyPivot.add(bulbBase, bulbTop);
    extras.push(bulbTop);
    // Eyes
    bodyPivot.add(makeBox(0.16, 0.18, 0.08, eyeMat, -0.25, 0.72, 0.56, false));
    bodyPivot.add(makeBox(0.16, 0.18, 0.08, eyeMat, 0.25, 0.72, 0.56, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, -0.22, 0.76, 0.57, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, 0.28, 0.76, 0.57, false));
    // 4 short voxel legs
    const legCoords: [number, number][] = [
      [-0.34, 0.34],
      [0.34, 0.34],
      [-0.34, -0.34],
      [0.34, -0.34],
    ];
    for (const [lx, lz] of legCoords) {
      const leg = makeBox(0.26, 0.3, 0.26, primaryMat, lx, 0.15, lz);
      bodyPivot.add(leg);
      legs.push(leg);
    }
  } else if (arch === 'fungal') {
    // Champignon : pied crème trapu, grand chapeau à trois étages, pastilles lumineuses (Mycélin / Amanitox)
    bodyPivot.add(makeBox(0.62, 0.62, 0.58, bellyMat, 0, 0.45, 0));
    const sporeFootL = makeBox(0.24, 0.16, 0.3, secondaryMat, -0.18, 0.08, 0.04);
    const sporeFootR = makeBox(0.24, 0.16, 0.3, secondaryMat, 0.18, 0.08, 0.04);
    bodyPivot.add(sporeFootL, sporeFootR);
    legs.push(sporeFootL, sporeFootR);
    bodyPivot.add(makeBox(0.14, 0.2, 0.16, bellyMat, -0.38, 0.44, 0.08));
    bodyPivot.add(makeBox(0.14, 0.2, 0.16, bellyMat, 0.38, 0.44, 0.08));
    bodyPivot.add(makeBox(0.14, 0.18, 0.08, eyeMat, -0.16, 0.52, 0.3, false));
    bodyPivot.add(makeBox(0.14, 0.18, 0.08, eyeMat, 0.16, 0.52, 0.3, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, -0.14, 0.57, 0.31, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, 0.18, 0.57, 0.31, false));
    // Chapeau : pivot à sa base pour qu'il dodeline d'un bloc
    const cap = new THREE.Group();
    cap.position.set(0, 0.76, 0);
    cap.add(makeBox(0.98, 0.12, 0.98, secondaryMat, 0, 0.06, 0)); // lamelles
    cap.add(makeBox(1.24, 0.3, 1.24, primaryMat, 0, 0.26, 0));
    cap.add(makeBox(0.92, 0.26, 0.92, primaryMat, 0, 0.53, 0));
    cap.add(makeBox(0.5, 0.16, 0.5, primaryMat, 0, 0.73, 0));
    const capSpots: [number, number, number][] = [
      [-0.36, 0.43, 0.3],
      [0.34, 0.43, -0.22],
      [0.08, 0.69, 0.12],
    ];
    if (stage >= 3) capSpots.push([-0.12, 0.43, -0.42], [0.42, 0.43, 0.36]);
    for (const [sx, sy, sz] of capSpots) cap.add(makeBox(0.2, 0.06, 0.2, accentMat, sx, sy, sz, false));
    cap.add(makeBox(0.22, 0.14, 0.06, accentMat, 0.3, 0.26, 0.63, false));
    if (stage >= 3) {
      // deux petits champignons ont poussé sur le chapeau
      for (const side of [-1, 1]) {
        cap.add(makeBox(0.12, 0.2, 0.12, bellyMat, side * 0.44, 0.5, -0.4));
        cap.add(makeBox(0.3, 0.14, 0.3, primaryMat, side * 0.44, 0.66, -0.4));
      }
    }
    bodyPivot.add(cap);
    extras.push(cap);
    if (stage >= 3) {
      bodyPivot.add(makeBox(0.8, 0.1, 0.76, secondaryMat, 0, 0.68, 0)); // collerette
      // spores en suspension qui tournent lentement autour du pied
      const spores = new THREE.Group();
      spores.position.set(0, 0.5, 0);
      spores.add(makeBox(0.12, 0.12, 0.12, accentMat, 0.86, 0.1, 0.1, false));
      spores.add(makeBox(0.1, 0.1, 0.1, accentMat, -0.8, -0.12, -0.3, false));
      bodyPivot.add(spores);
      extras.push(spores);
    }
  } else if (arch === 'shelled') {
    // Armored turtle/blaster creature (Aquabloc line)
    bodyPivot.add(makeBox(0.86, 0.88, 0.82, primaryMat, 0, 0.68, 0.06));
    bodyPivot.add(makeBox(0.68, 0.56, 0.16, bellyMat, 0, 0.58, 0.44));
    // Back shell (2-layer)
    bodyPivot.add(makeBox(0.94, 0.76, 0.38, secondaryMat, 0, 0.68, -0.36));
    bodyPivot.add(makeBox(0.74, 0.56, 0.16, accentMat, 0, 0.7, -0.54));
    // Shoulder hydro cannons or fin ears
    const finL = makeBox(0.22, 0.26, 0.3, accentMat, -0.42, 1.08, -0.18);
    const finR = makeBox(0.22, 0.26, 0.3, accentMat, 0.42, 1.08, -0.18);
    bodyPivot.add(finL, finR);
    extras.push(finL, finR);
    // Tail
    const tail = makeBox(0.28, 0.26, 0.36, primaryMat, 0, 0.38, -0.66);
    bodyPivot.add(tail);
    extras.push(tail);
    // Eyes
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, -0.22, 0.88, 0.47, false));
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, 0.22, 0.88, 0.47, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, -0.19, 0.93, 0.48, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, 0.25, 0.93, 0.48, false));
    // Legs + Arms
    const legL = makeBox(0.26, 0.28, 0.3, primaryMat, -0.26, 0.14, 0.08);
    const legR = makeBox(0.26, 0.28, 0.3, primaryMat, 0.26, 0.14, 0.08);
    const armL = makeBox(0.22, 0.24, 0.28, primaryMat, -0.54, 0.58, 0.2);
    const armR = makeBox(0.22, 0.24, 0.28, primaryMat, 0.54, 0.58, 0.2);
    bodyPivot.add(legL, legR, armL, armR);
    legs.push(legL, legR);
  } else if (arch === 'crab') {
    // Crabe : carapace large et basse, yeux sur tiges, deux pinces ouvertes, six pattes (Crabloc / Crabastion)
    bodyPivot.add(makeBox(1.3, 0.5, 0.9, primaryMat, 0, 0.52, 0));
    bodyPivot.add(makeBox(1.0, 0.22, 0.7, secondaryMat, 0, 0.86, -0.02));
    bodyPivot.add(makeBox(0.9, 0.26, 0.1, bellyMat, 0, 0.44, 0.46));
    for (const side of [-1, 1]) {
      // yeux perchés sur des tiges
      bodyPivot.add(makeBox(0.1, 0.3, 0.1, primaryMat, side * 0.26, 1.08, 0.3));
      bodyPivot.add(makeBox(0.2, 0.22, 0.16, eyeMat, side * 0.26, 1.32, 0.32, false));
      bodyPivot.add(makeBox(0.06, 0.06, 0.05, eyeHighlightMat, side * 0.26 + 0.04, 1.37, 0.41, false));
      // pince : bras + deux mâchoires écartées. Au stade final, la pince droite est énorme.
      const claw = new THREE.Group();
      claw.position.set(side * (stage >= 3 && side === 1 ? 0.98 : 0.84), 0.56, 0.28);
      claw.add(makeBox(0.22, 0.2, 0.34, primaryMat, 0, 0, 0.12));
      claw.add(makeBox(0.38, 0.15, 0.4, accentMat, 0, 0.13, 0.48));
      claw.add(makeBox(0.38, 0.15, 0.4, accentMat, 0, -0.13, 0.48));
      if (stage >= 3 && side === 1) claw.scale.setScalar(1.45);
      bodyPivot.add(claw);
      extras.push(claw);
      for (const lz of [0.24, -0.02, -0.28]) {
        const crabLeg = makeBox(0.14, 0.3, 0.14, secondaryMat, side * 0.62, 0.15, lz);
        bodyPivot.add(crabLeg);
        legs.push(crabLeg);
      }
    }
    if (stage >= 3) {
      // créneaux de forteresse et coraux sur la carapace
      for (const [mx, mz] of [
        [-0.4, 0.24],
        [0.4, 0.24],
        [-0.4, -0.28],
        [0.4, -0.28],
      ]) {
        bodyPivot.add(makeBox(0.2, 0.2, 0.2, secondaryMat, mx, 1.07, mz));
      }
      bodyPivot.add(makeBox(0.14, 0.34, 0.14, accentMat, 0, 1.14, -0.04));
      bodyPivot.add(makeBox(0.3, 0.1, 0.1, accentMat, 0.02, 1.2, -0.04));
      bodyPivot.add(makeBox(0.1, 0.2, 0.1, accentMat, -0.12, 1.06, -0.3));
    }
  } else if (arch === 'cell' && species.evolvesTo) {
    // A1.1 : créature-pile (Ampoulin, Bobinard). Même nombre d'objets que le bipède (18 blocs, 1 groupe) :
    // la simulation tire autant de nombres aléatoires (identifiants three.js), le golden reste identique.
    bodyPivot.add(makeBox(0.82, 0.98, 0.82, primaryMat, 0, 0.68, 0)); // carapace de pile
    bodyPivot.add(makeBox(0.88, 0.16, 0.88, secondaryMat, 0, 0.5, 0)); // bague de cuivre
    bodyPivot.add(makeBox(0.36, 0.16, 0.36, secondaryMat, 0, 1.24, 0)); // borne
    bodyPivot.add(makeBox(0.16, 0.12, 0.16, accentMat, 0, 1.37, 0)); // plot qui luit
    bodyPivot.add(makeBox(0.12, 0.34, 0.5, secondaryMat, -0.47, 0.82, -0.04)); // plaques latérales
    bodyPivot.add(makeBox(0.12, 0.34, 0.5, secondaryMat, 0.47, 0.82, -0.04));
    bodyPivot.add(makeBox(0.42, 0.08, 0.06, accentMat, 0, 0.66, 0.42, false)); // jauge de charge
    bodyPivot.add(makeBox(0.3, 0.08, 0.06, accentMat, 0, 0.56, 0.42, false));
    const cable = new THREE.Group(); // câble et fiche
    cable.position.set(0, 0.36, -0.42);
    cable.add(makeBox(0.12, 0.12, 0.44, secondaryMat, 0, 0, -0.2));
    cable.add(makeBox(0.22, 0.2, 0.16, accentMat, 0, 0.04, -0.46));
    bodyPivot.add(cable);
    extras.push(cable);
    // yeux en visière
    bodyPivot.add(makeBox(0.2, 0.12, 0.08, eyeMat, -0.18, 0.92, 0.42, false));
    bodyPivot.add(makeBox(0.2, 0.12, 0.08, eyeMat, 0.18, 0.92, 0.42, false));
    bodyPivot.add(makeBox(0.06, 0.05, 0.09, eyeHighlightMat, -0.13, 0.94, 0.43, false));
    bodyPivot.add(makeBox(0.06, 0.05, 0.09, eyeHighlightMat, 0.23, 0.94, 0.43, false));
    const legL = makeBox(0.26, 0.24, 0.3, secondaryMat, -0.24, 0.12, 0.04);
    const legR = makeBox(0.26, 0.24, 0.3, secondaryMat, 0.24, 0.12, 0.04);
    const armL = makeBox(0.16, 0.28, 0.2, primaryMat, -0.52, 0.5, 0.14);
    const armR = makeBox(0.16, 0.28, 0.2, primaryMat, 0.52, 0.5, 0.14);
    bodyPivot.add(legL, legR, armL, armR);
    legs.push(legL, legR);
  } else if (arch === 'cell') {
    // A1.1 : forme finale (Voltacier), pile volante à ailettes de bobine. Même nombre d'objets que l'ancien
    // modèle ailé (17 blocs, 2 groupes) : golden identique.
    bodyPivot.add(makeBox(0.86, 1.0, 0.86, primaryMat, 0, 0.74, 0));
    bodyPivot.add(makeBox(0.92, 0.16, 0.92, secondaryMat, 0, 0.56, 0));
    bodyPivot.add(makeBox(0.4, 0.18, 0.4, secondaryMat, 0, 1.33, 0));
    bodyPivot.add(makeBox(0.18, 0.14, 0.18, accentMat, 0, 1.48, 0));
    bodyPivot.add(makeBox(0.08, 0.36, 0.08, accentMat, 0, 1.72, 0)); // antenne-paratonnerre
    const finL = new THREE.Group();
    finL.position.set(-0.46, 0.9, -0.1);
    finL.add(makeBox(0.1, 0.5, 0.5, secondaryMat, -0.08, 0.06, 0));
    finL.add(makeBox(0.08, 0.3, 0.3, accentMat, -0.16, 0.06, 0));
    const finR = new THREE.Group();
    finR.position.set(0.46, 0.9, -0.1);
    finR.add(makeBox(0.1, 0.5, 0.5, secondaryMat, 0.08, 0.06, 0));
    finR.add(makeBox(0.08, 0.3, 0.3, accentMat, 0.16, 0.06, 0));
    bodyPivot.add(finL, finR);
    extras.push(finL, finR);
    const cable = makeBox(0.14, 0.14, 0.5, secondaryMat, 0, 0.42, -0.66);
    const plug = makeBox(0.26, 0.24, 0.2, accentMat, 0, 0.46, -0.96);
    bodyPivot.add(cable, plug);
    extras.push(plug);
    bodyPivot.add(makeBox(0.22, 0.13, 0.08, eyeMat, -0.19, 0.98, 0.45, false));
    bodyPivot.add(makeBox(0.22, 0.13, 0.08, eyeMat, 0.19, 0.98, 0.45, false));
    bodyPivot.add(makeBox(0.06, 0.05, 0.09, eyeHighlightMat, -0.14, 1.0, 0.46, false));
    bodyPivot.add(makeBox(0.06, 0.05, 0.09, eyeHighlightMat, 0.24, 1.0, 0.46, false));
    const legL = makeBox(0.28, 0.28, 0.3, secondaryMat, -0.26, 0.14, 0.06);
    const legR = makeBox(0.28, 0.28, 0.3, secondaryMat, 0.26, 0.14, 0.06);
    bodyPivot.add(legL, legR);
    legs.push(legL, legR);
  } else if (arch === 'winged') {
    // Dragon ailé (Ignisaur)
    bodyPivot.add(makeBox(0.88, 0.94, 0.88, primaryMat, 0, 0.72, 0));
    bodyPivot.add(makeBox(0.64, 0.56, 0.16, bellyMat, 0, 0.58, 0.42));
    // Crown horns / crest
    bodyPivot.add(makeBox(0.16, 0.34, 0.18, accentMat, -0.24, 1.3, -0.06));
    bodyPivot.add(makeBox(0.16, 0.34, 0.18, accentMat, 0.24, 1.3, -0.06));
    // Snout
    bodyPivot.add(makeBox(0.46, 0.26, 0.28, primaryMat, 0, 0.76, 0.5));
    // Articulated voxel wings
    const wingL = new THREE.Group();
    wingL.position.set(-0.44, 0.88, -0.22);
    wingL.add(makeBox(0.68, 0.52, 0.12, secondaryMat, -0.34, 0.12, -0.08));
    wingL.add(makeBox(0.48, 0.22, 0.14, primaryMat, -0.26, 0.36, -0.06));
    const wingR = new THREE.Group();
    wingR.position.set(0.44, 0.88, -0.22);
    wingR.add(makeBox(0.68, 0.52, 0.12, secondaryMat, 0.34, 0.12, -0.08));
    wingR.add(makeBox(0.48, 0.22, 0.14, primaryMat, 0.26, 0.36, -0.06));
    bodyPivot.add(wingL, wingR);
    extras.push(wingL, wingR);
    // Glowing tail tip
    const tail = makeBox(0.24, 0.24, 0.52, primaryMat, 0, 0.42, -0.64);
    const tailFlame = makeBox(0.3, 0.34, 0.3, accentMat, 0, 0.62, -0.92);
    bodyPivot.add(tail, tailFlame);
    extras.push(tailFlame);
    // Eyes
    bodyPivot.add(makeBox(0.16, 0.18, 0.08, eyeMat, -0.24, 0.96, 0.45, false));
    bodyPivot.add(makeBox(0.16, 0.18, 0.08, eyeMat, 0.24, 0.96, 0.45, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, -0.21, 1.0, 0.46, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, 0.27, 1.0, 0.46, false));
    // Legs
    const legL = makeBox(0.28, 0.3, 0.3, primaryMat, -0.26, 0.15, 0.06);
    const legR = makeBox(0.28, 0.3, 0.3, primaryMat, 0.26, 0.15, 0.06);
    bodyPivot.add(legL, legR);
    legs.push(legL, legR);
  } else if (arch === 'horned') {
    // Heavy armored / magma horned creature (Cailloc / Granitox / Magmadrake / Flambrix)
    bodyPivot.add(makeBox(1.04, 0.88, 0.94, primaryMat, 0, 0.68, 0));
    bodyPivot.add(makeBox(0.76, 0.48, 0.16, bellyMat, 0, 0.54, 0.44));
    // Shoulder armor plates
    bodyPivot.add(makeBox(0.3, 0.42, 0.64, secondaryMat, -0.6, 0.78, -0.02));
    bodyPivot.add(makeBox(0.3, 0.42, 0.64, secondaryMat, 0.6, 0.78, -0.02));
    // Horn / glowing magma crest
    const crest1 = makeBox(0.24, 0.38, 0.28, accentMat, 0, 1.24, 0.12);
    const crest2 = makeBox(0.2, 0.28, 0.24, accentMat, 0, 1.16, -0.26);
    bodyPivot.add(crest1, crest2);
    extras.push(crest1);
    // Eyes
    bodyPivot.add(makeBox(0.2, 0.16, 0.08, eyeMat, -0.26, 0.84, 0.48, false));
    bodyPivot.add(makeBox(0.2, 0.16, 0.08, eyeMat, 0.26, 0.84, 0.48, false));
    bodyPivot.add(makeBox(0.07, 0.06, 0.09, eyeHighlightMat, -0.22, 0.86, 0.49, false));
    bodyPivot.add(makeBox(0.07, 0.06, 0.09, eyeHighlightMat, 0.3, 0.86, 0.49, false));
    // Sturdy legs
    const legL = makeBox(0.32, 0.3, 0.34, secondaryMat, -0.3, 0.15, 0.06);
    const legR = makeBox(0.32, 0.3, 0.34, secondaryMat, 0.3, 0.15, 0.06);
    bodyPivot.add(legL, legR);
    legs.push(legL, legR);
  } else if (arch === 'lizard') {
    // Lézard de braise : corps long au ras du sol, pattes écartées, crête de flammes, queue à bout ardent (Braizard / Cendrox)
    bodyPivot.add(makeBox(0.7, 0.42, 1.3, primaryMat, 0, 0.42, 0));
    bodyPivot.add(makeBox(0.5, 0.12, 1.0, bellyMat, 0, 0.2, 0.04));
    bodyPivot.add(makeBox(0.6, 0.44, 0.56, primaryMat, 0, 0.56, 0.86));
    bodyPivot.add(makeBox(0.44, 0.24, 0.24, secondaryMat, 0, 0.46, 1.22));
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, -0.2, 0.68, 1.15, false));
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, 0.2, 0.68, 1.15, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, -0.18, 0.72, 1.16, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, 0.22, 0.72, 1.16, false));
    // Queue articulée (elle balaie de gauche à droite)
    const lizardTail = new THREE.Group();
    lizardTail.position.set(0, 0.4, -0.65);
    lizardTail.add(makeBox(0.4, 0.3, 0.5, primaryMat, 0, 0, -0.22));
    lizardTail.add(makeBox(0.26, 0.22, 0.46, secondaryMat, 0, -0.02, -0.66));
    lizardTail.add(makeBox(0.24, 0.3, 0.24, accentMat, 0, 0.08, -0.98));
    bodyPivot.add(lizardTail);
    extras.push(lizardTail);
    // Crête de flammes : plus haute et plus longue au stade final
    const crestBase = stage >= 3 ? 0.78 : 0.66;
    const crestZ = stage >= 3 ? [0.56, 0.2, -0.16, -0.5] : [0.5, 0.1, -0.3];
    crestZ.forEach((cz, i) => {
      const flame = makeBox(0.14, (i % 2 === 0 ? 0.24 : 0.34) + (stage >= 3 ? 0.08 : 0), 0.2, accentMat, 0, crestBase + 0.14, cz, false);
      bodyPivot.add(flame);
      extras.push(flame);
    });
    const lizardLegs: [number, number][] = [
      [-0.46, 0.42],
      [0.46, 0.42],
      [-0.46, -0.38],
      [0.46, -0.38],
    ];
    for (const [lx, lz] of lizardLegs) {
      const leg = makeBox(0.22, 0.26, 0.24, secondaryMat, lx, 0.13, lz);
      bodyPivot.add(leg);
      legs.push(leg);
    }
    if (stage >= 3) {
      // plaques de charbon sur le dos, cornes, flancs fissurés qui rougeoient
      bodyPivot.add(makeBox(0.84, 0.14, 0.44, secondaryMat, 0, 0.7, 0.34));
      bodyPivot.add(makeBox(0.84, 0.14, 0.44, secondaryMat, 0, 0.7, -0.26));
      bodyPivot.add(makeBox(0.12, 0.3, 0.12, secondaryMat, -0.22, 0.92, 0.7));
      bodyPivot.add(makeBox(0.12, 0.3, 0.12, secondaryMat, 0.22, 0.92, 0.7));
      bodyPivot.add(makeBox(0.05, 0.12, 0.56, accentMat, -0.36, 0.42, 0.02, false));
      bodyPivot.add(makeBox(0.05, 0.12, 0.56, accentMat, 0.36, 0.42, 0.02, false));
    }
  } else if (arch === 'floating') {
    // Hovering Psychic crystal creature with orbiting satellites (Psycube / Lunabloc / Aetherion)
    bodyPivot.add(makeBox(0.84, 0.86, 0.84, primaryMat, 0, 0.96, 0));
    bodyPivot.add(makeBox(0.58, 0.48, 0.14, bellyMat, 0, 0.86, 0.41));
    // Psychic crown ears
    bodyPivot.add(makeBox(0.2, 0.36, 0.2, secondaryMat, -0.28, 1.52, 0));
    bodyPivot.add(makeBox(0.2, 0.36, 0.2, secondaryMat, 0.28, 1.52, 0));
    // Orbiting energy cubes
    const orbitGroup = new THREE.Group();
    orbitGroup.position.set(0, 0.96, 0);
    orbitGroup.add(makeBox(0.22, 0.22, 0.22, accentMat, -0.78, 0.1, 0));
    orbitGroup.add(makeBox(0.22, 0.22, 0.22, accentMat, 0.78, -0.1, 0));
    orbitGroup.add(makeBox(0.18, 0.18, 0.18, secondaryMat, 0, 0.32, -0.76));
    bodyPivot.add(orbitGroup);
    extras.push(orbitGroup);
    // Glowing eyes
    bodyPivot.add(makeBox(0.18, 0.2, 0.08, eyeMat, -0.22, 1.06, 0.43, false));
    bodyPivot.add(makeBox(0.18, 0.2, 0.08, eyeMat, 0.22, 1.06, 0.43, false));
    bodyPivot.add(makeBox(0.07, 0.07, 0.09, eyeHighlightMat, -0.19, 1.11, 0.44, false));
    bodyPivot.add(makeBox(0.07, 0.07, 0.09, eyeHighlightMat, 0.25, 1.11, 0.44, false));
  } else if (arch === 'ram') {
    // Bélier des mesas : trapu, sans encolure, deux grosses cornes d'ambre enroulées autour de la tête
    // (Chevrok / Mouflambre / Bélithan)
    bodyPivot.add(makeBox(0.9, 0.66, 1.1, primaryMat, 0, 0.74, -0.08));
    bodyPivot.add(makeBox(0.98, 0.22, 0.92, secondaryMat, 0, 1.12, -0.12)); // échine rocheuse
    bodyPivot.add(makeBox(0.66, 0.4, 0.2, bellyMat, 0, 0.66, 0.5));
    bodyPivot.add(makeBox(0.6, 0.52, 0.54, primaryMat, 0, 1.0, 0.68));
    bodyPivot.add(makeBox(0.36, 0.24, 0.2, bellyMat, 0, 0.86, 1.02));
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, -0.17, 1.08, 0.96, false));
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, 0.17, 1.08, 0.96, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, -0.15, 1.12, 0.97, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, 0.19, 1.12, 0.97, false));
    for (const side of [-1, 1]) {
      // corne en « C » : part vers l'arrière, redescend, revient vers l'avant ; elle s'enroule davantage à chaque stade
      bodyPivot.add(makeBox(0.2, 0.2, 0.36, accentMat, side * 0.4, 1.3, 0.56));
      bodyPivot.add(makeBox(0.2, 0.42, 0.2, accentMat, side * 0.46, 1.08, 0.36));
      bodyPivot.add(makeBox(0.18, 0.18, 0.32, accentMat, side * 0.46, 0.84, 0.52));
      if (stage >= 2) bodyPivot.add(makeBox(0.16, 0.22, 0.16, accentMat, side * 0.46, 0.96, 0.74));
      if (stage >= 3) bodyPivot.add(makeBox(0.26, 0.26, 0.26, accentMat, side * 0.5, 1.34, 0.36));
    }
    if (stage >= 2) bodyPivot.add(makeBox(0.2, 0.2, 0.12, bellyMat, 0, 0.66, 0.98)); // barbiche
    if (stage >= 3) {
      // cristaux d'ambre sur l'échine et épaulières de roche
      bodyPivot.add(makeBox(0.16, 0.3, 0.16, accentMat, -0.22, 1.36, -0.08, false));
      bodyPivot.add(makeBox(0.18, 0.38, 0.18, accentMat, 0.2, 1.4, -0.3, false));
      bodyPivot.add(makeBox(0.14, 0.26, 0.14, accentMat, -0.04, 1.34, -0.5, false));
      bodyPivot.add(makeBox(0.24, 0.4, 0.5, secondaryMat, -0.54, 0.86, 0.16));
      bodyPivot.add(makeBox(0.24, 0.4, 0.5, secondaryMat, 0.54, 0.86, 0.16));
    }
    const ramLegs: [number, number][] = [
      [-0.3, 0.34],
      [0.3, 0.34],
      [-0.3, -0.44],
      [0.3, -0.44],
    ];
    for (const [lx, lz] of ramLegs) {
      const leg = makeBox(0.24, 0.42, 0.24, secondaryMat, lx, 0.21, lz);
      bodyPivot.add(leg);
      legs.push(leg);
    }
    const ramTail = makeBox(0.18, 0.18, 0.18, bellyMat, 0, 0.9, -0.7);
    bodyPivot.add(ramTail);
    extras.push(ramTail);
  } else if (arch === 'antlered') {
    // Cerf de givre : corps élancé, encolure dressée, bois de glace (Givrelin / Ramurgel / Auroramure)
    bodyPivot.add(makeBox(0.84, 0.6, 1.2, primaryMat, 0, 0.8, -0.05));
    bodyPivot.add(makeBox(0.7, 0.46, 0.34, bellyMat, 0, 0.74, 0.5)); // poitrail en fourrure
    bodyPivot.add(makeBox(0.36, 0.52, 0.38, primaryMat, 0, 1.22, 0.46)); // encolure
    bodyPivot.add(makeBox(0.56, 0.48, 0.58, primaryMat, 0, 1.6, 0.6)); // tête
    bodyPivot.add(makeBox(0.34, 0.26, 0.26, secondaryMat, 0, 1.5, 0.98)); // museau
    bodyPivot.add(makeBox(0.14, 0.2, 0.12, secondaryMat, -0.34, 1.78, 0.42));
    bodyPivot.add(makeBox(0.14, 0.2, 0.12, secondaryMat, 0.34, 1.78, 0.42));
    // Bois de glace : un étage de plus à chaque stade d'évolution
    for (const side of [-1, 1]) {
      const antler = new THREE.Group();
      antler.position.set(side * 0.2, 1.84, 0.52);
      antler.add(makeBox(0.11, 0.42 + stage * 0.1, 0.11, accentMat, 0, 0.2 + stage * 0.05, 0));
      antler.add(makeBox(0.3, 0.1, 0.1, accentMat, side * 0.17, 0.3, 0));
      if (stage >= 2) antler.add(makeBox(0.1, 0.26, 0.1, accentMat, side * 0.3, 0.44, 0));
      if (stage >= 3) {
        antler.add(makeBox(0.36, 0.1, 0.1, accentMat, side * 0.2, 0.62, 0));
        antler.add(makeBox(0.1, 0.3, 0.1, accentMat, side * 0.38, 0.78, 0));
      }
      bodyPivot.add(antler);
      extras.push(antler);
    }
    if (stage >= 2) bodyPivot.add(makeBox(0.5, 0.2, 0.7, secondaryMat, 0, 1.14, -0.1)); // selle de givre
    if (stage >= 3) {
      // crinière cristalline le long du dos
      for (let i = 0; i < 3; i++) {
        bodyPivot.add(makeBox(0.16, 0.3 - i * 0.05, 0.18, accentMat, 0, 1.36 - i * 0.03, 0.08 - i * 0.32));
      }
    }
    bodyPivot.add(makeBox(0.2, 0.2, 0.2, bellyMat, 0, 0.98, -0.72)); // queue pompon
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, -0.19, 1.66, 0.9, false));
    bodyPivot.add(makeBox(0.13, 0.16, 0.08, eyeMat, 0.19, 1.66, 0.9, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, -0.17, 1.7, 0.91, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, 0.21, 1.7, 0.91, false));
    const hoofCoords: [number, number][] = [
      [-0.28, 0.38],
      [0.28, 0.38],
      [-0.28, -0.46],
      [0.28, -0.46],
    ];
    for (const [lx, lz] of hoofCoords) {
      const leg = makeBox(0.2, 0.52, 0.2, secondaryMat, lx, 0.26, lz);
      bodyPivot.add(leg);
      legs.push(leg);
    }
  } else if (arch === 'golem') {
    // Golem de glace : torse massif, petite tête enfoncée, poings énormes (Givrock / Cryolithe / Glaciatitan)
    bodyPivot.add(makeBox(1.12, 0.92, 0.84, primaryMat, 0, 0.9, 0));
    bodyPivot.add(makeBox(0.72, 0.5, 0.14, bellyMat, 0, 0.8, 0.44));
    bodyPivot.add(makeBox(0.52, 0.4, 0.5, secondaryMat, 0, 1.54, 0.08));
    bodyPivot.add(makeBox(0.13, 0.1, 0.08, eyeMat, -0.13, 1.56, 0.34, false));
    bodyPivot.add(makeBox(0.13, 0.1, 0.08, eyeMat, 0.13, 1.56, 0.34, false));
    bodyPivot.add(makeBox(0.05, 0.04, 0.09, eyeHighlightMat, -0.11, 1.58, 0.35, false));
    bodyPivot.add(makeBox(0.05, 0.04, 0.09, eyeHighlightMat, 0.15, 1.58, 0.35, false));
    const golemArms: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      // pivot à l'épaule : le bras balance d'un bloc à la marche
      const arm = new THREE.Group();
      arm.position.set(side * 0.8, 1.2, 0.02);
      arm.add(makeBox(0.4, 0.5, 0.46, secondaryMat, 0, -0.12, 0));
      arm.add(makeBox(0.5, 0.52, 0.54, primaryMat, 0, -0.64, 0.06));
      if (stage >= 2) arm.add(makeBox(0.2, 0.26, 0.2, accentMat, 0, 0.24, 0));
      bodyPivot.add(arm);
      golemArms.push(arm);
    }
    const golemLegL = makeBox(0.38, 0.44, 0.42, secondaryMat, -0.3, 0.22, 0);
    const golemLegR = makeBox(0.38, 0.44, 0.42, secondaryMat, 0.3, 0.22, 0);
    bodyPivot.add(golemLegL, golemLegR);
    legs.push(golemLegL, golemLegR, golemArms[1], golemArms[0]); // bras en opposition de phase
    // Stalactites dorsales
    const crystals = new THREE.Group();
    crystals.position.set(0, 1.4, -0.3);
    const crystalCount = 2 + stage;
    for (let i = 0; i < crystalCount; i++) {
      const t = crystalCount === 1 ? 0 : i / (crystalCount - 1) - 0.5;
      const shard = makeBox(0.18, 0.4 + (i % 2) * 0.22 + stage * 0.06, 0.18, accentMat, t * 0.8, 0.14 + (i % 2) * 0.08, -0.04);
      shard.rotation.set(-0.35, 0, t * -0.7);
      crystals.add(shard);
    }
    bodyPivot.add(crystals);
    extras.push(crystals);
  } else if (arch === 'serpentine') {
    // Serpent-éclair : grosse tête, corps segmenté qui ondule (Crépitil / Serpéclair / Tempestrix)
    bodyPivot.add(makeBox(0.72, 0.6, 0.72, primaryMat, 0, 0.66, 0.5));
    bodyPivot.add(makeBox(0.52, 0.2, 0.56, bellyMat, 0, 0.38, 0.56));
    bodyPivot.add(makeBox(0.16, 0.38 + stage * 0.08, 0.16, accentMat, 0, 1.12 + stage * 0.04, 0.4)); // corne-éclair
    bodyPivot.add(makeBox(0.1, 0.3, 0.3, accentMat, -0.42, 0.8, 0.4));
    bodyPivot.add(makeBox(0.1, 0.3, 0.3, accentMat, 0.42, 0.8, 0.4));
    bodyPivot.add(makeBox(0.15, 0.17, 0.08, eyeMat, -0.2, 0.76, 0.87, false));
    bodyPivot.add(makeBox(0.15, 0.17, 0.08, eyeMat, 0.2, 0.76, 0.87, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, -0.18, 0.8, 0.88, false));
    bodyPivot.add(makeBox(0.05, 0.05, 0.09, eyeHighlightMat, 0.22, 0.8, 0.88, false));
    const segmentCount = 3 + stage;
    for (let i = 0; i < segmentCount; i++) {
      const s = Math.max(0.3, 0.62 - i * 0.07);
      const seg = makeBox(s, s * 0.86, 0.5, i % 2 === 0 ? secondaryMat : primaryMat, 0, 0.1 + s * 0.43, -0.1 - i * 0.46);
      if (stage >= 2 && i % 2 === 0) seg.add(makeBox(0.12, 0.2, 0.2, accentMat, 0, s * 0.43 + 0.1, 0));
      bodyPivot.add(seg);
      extras.push(seg);
    }
    const tailTip = makeBox(0.22, 0.34, 0.3, accentMat, 0, 0.4, -0.16 - segmentCount * 0.46);
    bodyPivot.add(tailTip);
    extras.push(tailTip);
    if (stage >= 3) {
      // ailerons de tempête
      bodyPivot.add(makeBox(0.7, 0.08, 0.42, accentMat, -0.66, 0.92, 0.0));
      bodyPivot.add(makeBox(0.7, 0.08, 0.42, accentMat, 0.66, 0.92, 0.0));
    }
  } else if (arch === 'jelly') {
    // Nuage rêveur : dôme cotonneux, filaments de pluie qui se balancent (Nimbulle / Cumulord)
    bodyPivot.add(makeBox(1.0, 0.56, 0.96, primaryMat, 0, 1.2, 0));
    bodyPivot.add(makeBox(0.7, 0.3, 0.68, primaryMat, 0, 1.58, 0));
    bodyPivot.add(makeBox(0.4, 0.36, 0.44, bellyMat, -0.6, 1.12, 0.1));
    bodyPivot.add(makeBox(0.4, 0.36, 0.44, bellyMat, 0.6, 1.12, 0.1));
    bodyPivot.add(makeBox(0.44, 0.34, 0.4, bellyMat, 0, 1.1, -0.56));
    bodyPivot.add(makeBox(0.72, 0.16, 0.7, secondaryMat, 0, 0.86, 0));
    const strandCount = stage >= 3 ? 6 : 4;
    for (let i = 0; i < strandCount; i++) {
      const ang = (i / strandCount) * Math.PI * 2 + 0.4;
      const strand = new THREE.Group(); // pivot en haut du filament
      strand.position.set(Math.cos(ang) * 0.26, 0.8, Math.sin(ang) * 0.26);
      strand.add(makeBox(0.1, 0.46, 0.1, accentMat, 0, -0.24, 0));
      bodyPivot.add(strand);
      extras.push(strand);
    }
    if (stage >= 3) {
      bodyPivot.add(makeBox(0.3, 0.2, 0.3, accentMat, 0, 1.84, 0)); // couronne d'orage
      bodyPivot.add(makeBox(0.34, 0.3, 0.36, bellyMat, -0.46, 1.5, -0.3));
      bodyPivot.add(makeBox(0.34, 0.3, 0.36, bellyMat, 0.46, 1.5, -0.3));
    }
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, -0.22, 1.24, 0.49, false));
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, 0.22, 1.24, 0.49, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, -0.19, 1.29, 0.5, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, 0.25, 1.29, 0.5, false));
    bodyPivot.add(makeBox(0.12, 0.1, 0.08, accentMat, -0.38, 1.08, 0.49, false));
    bodyPivot.add(makeBox(0.12, 0.1, 0.08, accentMat, 0.38, 1.08, 0.49, false));
  } else {
    // Bipède énergique (Pyrocube)
    bodyPivot.add(makeBox(0.88, 0.92, 0.82, primaryMat, 0, 0.68, 0));
    bodyPivot.add(makeBox(0.64, 0.5, 0.14, bellyMat, 0, 0.54, 0.4));
    // Tall ears
    const earL = makeBox(0.2, 0.42, 0.18, primaryMat, -0.28, 1.28, 0.04);
    const earR = makeBox(0.2, 0.42, 0.18, primaryMat, 0.28, 1.28, 0.04);
    bodyPivot.add(earL, earR);
    bodyPivot.add(makeBox(0.21, 0.14, 0.19, secondaryMat, -0.28, 1.46, 0.04));
    bodyPivot.add(makeBox(0.21, 0.14, 0.19, secondaryMat, 0.28, 1.46, 0.04));
    // Cheeks / accents
    bodyPivot.add(makeBox(0.14, 0.14, 0.08, accentMat, -0.34, 0.72, 0.41, false));
    bodyPivot.add(makeBox(0.14, 0.14, 0.08, accentMat, 0.34, 0.72, 0.41, false));
    // Expressive tail with flame or bolt
    const tail = new THREE.Group();
    tail.position.set(0, 0.44, -0.44);
    tail.add(makeBox(0.22, 0.22, 0.42, secondaryMat, 0, 0.06, -0.18));
    tail.add(makeBox(0.28, 0.36, 0.24, accentMat, 0, 0.28, -0.42));
    bodyPivot.add(tail);
    extras.push(tail);
    // Eyes
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, -0.21, 0.88, 0.42, false));
    bodyPivot.add(makeBox(0.16, 0.2, 0.08, eyeMat, 0.21, 0.88, 0.42, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, -0.18, 0.93, 0.43, false));
    bodyPivot.add(makeBox(0.06, 0.06, 0.09, eyeHighlightMat, 0.24, 0.93, 0.43, false));
    // Arms + Legs
    const legL = makeBox(0.24, 0.26, 0.28, primaryMat, -0.24, 0.13, 0.05);
    const legR = makeBox(0.24, 0.26, 0.28, primaryMat, 0.24, 0.13, 0.05);
    const armL = makeBox(0.18, 0.24, 0.22, primaryMat, -0.5, 0.58, 0.16);
    const armR = makeBox(0.18, 0.24, 0.22, primaryMat, 0.5, 0.58, 0.16);
    bodyPivot.add(legL, legR, armL, armR);
    legs.push(legL, legR);
  }

  bakeBlockAo(bodyPivot);

  const finalScale = scaleOverride ?? species.scale;
  root.scale.setScalar(finalScale);

  return {
    root,
    bodyPivot,
    legs,
    extras,
    flashMaterials,
    baseEmissives,
    species,
  };
}

/** Créature sculptée (sprint Art) : volumes → blocs, faces visibles seulement, ombre douce par sommet. */
function buildSculptCreature(species: SpeciesDef, scaleOverride?: number, variant?: boolean): VoxelCreatureRig {
  const p = species.palette;
  const shift = (hex: string) => (variant ? '#' + new THREE.Color(hex).offsetHSL(150 / 360, 0, 0).getHexString() : hex);
  const palette: SculptPalette = {
    primary: shift(p.primary),
    secondary: shift(p.secondary),
    belly: p.belly,
    accent: shift(p.accent),
    eye: p.eye,
    white: '#FFFFFF',
    dark: '#1B1D24',
  };
  const glow = species.element === 'fire' || species.element === 'electric' ? 0.45 : 0.25;
  const parts = buildSculptRig(SCULPT_DEFS[species.id], palette, sculptRes, glow);
  const root = new THREE.Group();
  root.add(parts.bodyPivot);
  const shadowMat = new THREE.MeshBasicMaterial({ map: getContactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.65 });
  const shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.72, 20), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);
  // les sculptures sont plus fines que les anciens pavés : un peu plus grandes pour garder la même présence
  root.scale.setScalar((scaleOverride ?? species.scale) * SCULPT_SCALE);
  return {
    root,
    bodyPivot: parts.bodyPivot,
    legs: parts.legs,
    extras: parts.extras,
    eyes: parts.eyes,
    flashMaterials: parts.materials,
    baseEmissives: parts.materials.map((m) => m.emissive.clone()),
    species,
  };
}

/**
 * G1.2 : occlusion ambiante « par bloc », calculée une fois à la construction (aucun coût par image).
 * Chaque sommet est assombri selon le nombre de blocs voisins qui le recouvrent presque, et un peu plus
 * près du sol. Pas de tirage aléatoire ni d'objet three.js créé : la simulation (golden) n'est pas touchée.
 */
const AO_PER_NEIGHBOR = 0.13;
const AO_MIN = 0.62;
const _aoPoint = new THREE.Vector3();
function bakeBlockAo(pivot: THREE.Object3D): void {
  pivot.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  pivot.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry instanceof THREE.BoxGeometry) meshes.push(o as THREE.Mesh);
  });
  const boxes = meshes.map((m) => {
    m.geometry.computeBoundingBox();
    return m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld).expandByScalar(0.05);
  });
  meshes.forEach((mesh, i) => {
    const pos = mesh.geometry.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      _aoPoint.fromBufferAttribute(pos, v).applyMatrix4(mesh.matrixWorld);
      let n = 0;
      for (let j = 0; j < boxes.length; j++) if (j !== i && boxes[j].containsPoint(_aoPoint)) n++;
      const ground = _aoPoint.y < 0.25 ? 0.9 : 1;
      const shade = Math.max(AO_MIN, (1 - n * AO_PER_NEIGHBOR) * ground);
      colors[v * 3] = shade;
      colors[v * 3 + 1] = shade;
      colors[v * 3 + 2] = shade;
    }
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.vertexColors = true;
  });
}

/**
 * Adds a crisp floating world-space HP bar above an expedition enemy or ally
 */
export function attachWorldHpBar(rig: VoxelCreatureRig, isEnemy: boolean, isBoss = false): void {
  const width = isBoss ? 1.85 : 1.05;
  const height = isBoss ? 0.18 : 0.12;
  const yPos = getRigTopY(rig.species);

  const bgMat = new THREE.MeshBasicMaterial({
    color: '#111622',
    depthTest: true,
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.08, height + 0.06), bgMat);
  bg.position.set(0, yPos, 0);

  const fillGeo = new THREE.PlaneGeometry(width, height);
  // Shift geometry so scaling X shrinks from right to left cleanly
  fillGeo.translate(width / 2, 0, 0.01);
  const fillMat = new THREE.MeshBasicMaterial({
    color: isEnemy ? (isBoss ? '#F43F5E' : '#EF4444') : '#2FB97A',
    depthTest: true,
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.set(-width / 2, 0, 0.01);
  bg.add(fill);

  rig.root.add(bg);
  rig.hpBarBg = bg;
  rig.hpBarFill = fill;
}
