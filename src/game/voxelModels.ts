/**
 * Point d'entrée des modèles voxel procéduraux. Le code vit dans ./models :
 *   shared.ts       textures partagées et brique de base (`makeBox`)
 *   creatures.ts    Cubimons par silhouette, barre de vie
 *   campProps.ts    marmite et totem du camp
 *   biomes.ts       sol, décors et animations de chaque biome
 *   floatingText.ts texte flottant (pool fixe)
 * Ce fichier ne fait que réexporter, pour que les imports existants restent valables.
 */
import * as THREE from 'three';
import { SPECIES } from './catalog';
import {
  getContactShadowTexture,
  getGroundCheckerTexture,
  getToyBumpTexture,
  makeBox,
} from './models/shared';
import type { BiomeDef, BiomeId, CreatureArchetype, SpeciesDef } from './types';

export { getContactShadowTexture, getGroundCheckerTexture, getToyBumpTexture } from './models/shared';

export interface VoxelCreatureRig {
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
 * Builds a charismatic 6-12 part composite voxel Cubimon anchored at bottom-center (y = 0)
 */
export function buildVoxelCreature(speciesId: string, scaleOverride?: number): VoxelCreatureRig {
  const species = SPECIES[speciesId] ?? SPECIES.pyrocube;
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
    // Armored turtle/blaster Cubimon (Aquabloc line)
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
  } else if (arch === 'winged') {
    // Majestic winged dragon / thunderbird Cubimon (Ignisaur / Raicube)
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
    // Heavy armored / magma horned Cubimon (Cailloc / Granitox / Magmadrake / Flambrix)
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
    // Hovering Psychic crystal Cubimon with orbiting satellites (Psycube / Lunabloc / Aetherion)
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
    // Cute energetic biped (Pyrocube / Voltik / Sparkube)
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

/**
 * Builds the iconic Base Camp Cooking Pot with campfire logs, liquid mesh & tripod
 */
export function buildCookingPotProp(): {
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  fireMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const bump = getToyBumpTexture();

  const ironMat = new THREE.MeshStandardMaterial({
    color: '#343A46',
    roughness: 0.42,
    metalness: 0.65,
    bumpMap: bump,
    bumpScale: 0.015,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#525C6E',
    roughness: 0.3,
    metalness: 0.78,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#7C4D2B',
    roughness: 0.85,
    metalness: 0.02,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#8D867E',
    roughness: 0.88,
    metalness: 0.04,
  });
  const fireMat = new THREE.MeshStandardMaterial({
    color: '#FF7A28',
    emissive: new THREE.Color('#FF5A1F'),
    emissiveIntensity: 1.1,
    roughness: 0.35,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: '#52B788',
    emissive: new THREE.Color('#34D399'),
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.1,
  });

  // Ring of hearth stones grounded at y = 0
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const stone = makeBox(0.46, 0.28, 0.46, stoneMat, Math.cos(ang) * 1.15, 0.14, Math.sin(ang) * 1.15);
    stone.rotation.y = ang;
    group.add(stone);
  }

  // Crossed firewood logs
  const log1 = makeBox(1.5, 0.2, 0.22, woodMat, 0, 0.12, 0);
  log1.rotation.y = 0.5;
  const log2 = makeBox(1.5, 0.2, 0.22, woodMat, 0, 0.14, 0);
  log2.rotation.y = -0.6;
  group.add(log1, log2);

  // Fire core
  const fireMesh = makeBox(0.7, 0.45, 0.7, fireMat, 0, 0.32, 0, false);
  group.add(fireMesh);

  // Cauldron body & beveled rim (composite 4 parts)
  group.add(makeBox(1.56, 0.92, 1.56, ironMat, 0, 0.95, 0));
  group.add(makeBox(1.78, 0.22, 1.78, rimMat, 0, 1.44, 0));
  group.add(makeBox(0.24, 0.26, 0.44, rimMat, -0.92, 1.18, 0));
  group.add(makeBox(0.24, 0.26, 0.44, rimMat, 0.92, 1.18, 0));

  // Soup liquid surface inside pot
  const liquidMesh = makeBox(1.36, 0.16, 1.36, liquidMat, 0, 1.48, 0, false);
  group.add(liquidMesh);

  // Wooden tripod legs
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.4;
    const leg = makeBox(0.16, 2.7, 0.16, woodMat, Math.cos(ang) * 1.1, 1.25, Math.sin(ang) * 1.1);
    leg.rotation.z = Math.cos(ang) * 0.28;
    leg.rotation.x = -Math.sin(ang) * 0.28;
    group.add(leg);
  }

  return { group, liquidMesh, fireMesh };
}

/**
 * Builds the tall Camp Waystone Landmark visible in initial framing
 */
export function buildCampLandmark(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#D6CFC2', roughness: 0.82, metalness: 0.05 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: '#7D766D', roughness: 0.75, metalness: 0.12 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: new THREE.Color('#0EA5E9'),
    emissiveIntensity: 0.55,
    roughness: 0.16,
    metalness: 0.35,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#9A633A', roughness: 0.8 });
  const awningMat = new THREE.MeshStandardMaterial({ color: '#E85D3F', roughness: 0.72 });
  const awningAltMat = new THREE.MeshStandardMaterial({ color: '#FAF3E6', roughness: 0.76 });

  // Stone plinth + monument obelisk
  group.add(makeBox(2.4, 0.45, 2.4, darkStoneMat, 0, 0.225, 0));
  group.add(makeBox(1.5, 3.2, 1.5, stoneMat, 0, 2.05, 0));
  group.add(makeBox(1.75, 0.35, 1.75, darkStoneMat, 0, 3.65, 0));
  const topCrystal = makeBox(0.85, 0.85, 0.85, crystalMat, 0, 4.45, 0);
  topCrystal.rotation.set(0.4, Math.PI / 4, 0.4);
  group.add(topCrystal);

  // Explorer tent beside the waystone
  const tent = new THREE.Group();
  tent.position.set(-4.2, 0, 1.4);
  tent.rotation.y = 0.35;
  tent.add(makeBox(0.22, 1.8, 0.22, woodMat, -1.2, 0.9, 1.1));
  tent.add(makeBox(0.22, 1.8, 0.22, woodMat, 1.2, 0.9, 1.1));
  tent.add(makeBox(0.22, 1.6, 0.22, woodMat, -1.2, 0.8, -1.1));
  tent.add(makeBox(0.22, 1.6, 0.22, woodMat, 1.2, 0.8, -1.1));
  // Striped voxel canopy
  tent.add(makeBox(0.9, 0.26, 2.6, awningMat, -0.9, 1.85, 0));
  tent.add(makeBox(0.9, 0.26, 2.6, awningAltMat, 0, 1.98, 0));
  tent.add(makeBox(0.9, 0.26, 2.6, awningMat, 0.9, 1.85, 0));
  // Crate props anchored cleanly on the floor
  tent.add(makeBox(0.62, 0.62, 0.62, woodMat, 0.65, 0.31, -0.4));
  tent.add(makeBox(0.48, 0.48, 0.48, woodMat, 0.1, 0.24, -0.55));
  group.add(tent);

  return group;
}

export interface BiomeEnvironmentHandle {
  group: THREE.Group;
  waterUniform: { value: number };
  cloudGroup: THREE.Group;
  /** Animation légère propre au décor du biome (aurores, rochers flottants...). */
  animate?: (elapsed: number) => void;
}

interface BiomeDecorStyle {
  cliff: string;
  foam: string;
  seaRoughness: number;
  seaEmissive: number;
  cloud: string;
  cloudOpacity: number;
  trunk: string;
  trunkStretch: number;
  crownTints: string[];
  crownRoughness: number;
  crownMetalness: number;
  crownScale: [number, number]; // [largeur, hauteur]
  rockTints: string[];
}

const TEMPERATE_DECOR: BiomeDecorStyle = {
  cliff: '#8C6E4E',
  foam: '#E0F5FF',
  seaRoughness: 0.24,
  seaEmissive: 0.08,
  cloud: '#FFFFFF',
  cloudOpacity: 0.85,
  trunk: '#7A5230',
  trunkStretch: 1,
  crownTints: ['#2F843D', '#3E9B47', '#266E36', '#56A943'],
  crownRoughness: 0.76,
  crownMetalness: 0.04,
  crownScale: [1.05, 0.95],
  rockTints: ['#9C9488', '#B5ADA0', '#7D766C'],
};

/** Habillage du décor par biome (palette, forme des "arbres", mer). */
const BIOME_DECOR: Record<BiomeId, BiomeDecorStyle> = {
  meadow: TEMPERATE_DECOR,
  shore: { ...TEMPERATE_DECOR, crownTints: ['#2E9468', '#3BB07B', '#237A5E', '#52BC7C'] },
  volcano: {
    ...TEMPERATE_DECOR,
    cliff: '#2A2322',
    foam: '#FFD166',
    seaRoughness: 0.34,
    seaEmissive: 0.45,
    cloud: '#7A544E',
    cloudOpacity: 0.65,
    trunk: '#2F2726',
    trunkStretch: 1.5,
    crownTints: ['#3C3232', '#523C38', '#C84B24', '#4A3A38'],
    rockTints: ['#3A3231', '#544643', '#D9532F'],
  },
  sanctuary: {
    ...TEMPERATE_DECOR,
    cliff: '#4C446B',
    foam: '#E9D5FF',
    seaEmissive: 0.24,
    cloud: '#635699',
    trunk: '#584E7A',
    crownTints: ['#8B5CF6', '#A78BFA', '#6366F1', '#C084FC'],
    crownRoughness: 0.28,
    crownMetalness: 0.25,
    crownScale: [0.65, 1.5],
    rockTints: ['#6B6091', '#8E7CC3', '#5EEAD4'],
  },
  // Sapins enneigés, mer glacée, nuages pâles
  tundra: {
    ...TEMPERATE_DECOR,
    cliff: '#7FA3C2',
    foam: '#FFFFFF',
    seaRoughness: 0.14,
    seaEmissive: 0.12,
    cloud: '#DCEBFA',
    cloudOpacity: 0.7,
    trunk: '#5A4636',
    crownTints: ['#F4FAFE', '#2F6B5A', '#E8F4FB', '#3C7F6B'],
    crownScale: [0.85, 1.35],
    rockTints: ['#DCEEF8', '#A5D8F0', '#67E8F9'],
  },
  // Piliers de pierre coiffés de paratonnerres dorés, mer de nuages
  stormpeak: {
    ...TEMPERATE_DECOR,
    cliff: '#3B4250',
    foam: '#E5E7EB',
    seaRoughness: 0.9,
    seaEmissive: 0.05,
    cloud: '#2B313B',
    cloudOpacity: 0.9,
    trunk: '#4B5563',
    trunkStretch: 1.9,
    crownTints: ['#FACC15', '#FDE047', '#EAB308', '#FEF08A'],
    crownRoughness: 0.3,
    crownMetalness: 0.6,
    crownScale: [0.22, 1.5],
    rockTints: ['#4B5563', '#6B7280', '#FACC15'],
  },
  // Cheminées de fée (piliers coiffés d'une dalle), falaises ocre, mer de sable
  canyon: {
    ...TEMPERATE_DECOR,
    cliff: '#8E5A34',
    foam: '#F2D6A2',
    seaRoughness: 0.95,
    seaEmissive: 0.04,
    cloud: '#FBE8C4',
    cloudOpacity: 0.7,
    trunk: '#A8703F',
    trunkStretch: 1.3,
    crownTints: ['#C97F3F', '#B56A30', '#DDA15E', '#9C5A2C'],
    crownRoughness: 0.9,
    crownScale: [1.25, 0.5],
    rockTints: ['#B98045', '#D9A05B', '#F59E0B'],
  },
};

/** Décor propre au Canyon d'Ambre : mesas à strates, arches de pierre, cristaux d'ambre, côtes fossiles. */
function addCanyonDecor(env: THREE.Group, arenaRadius: number): (elapsed: number) => void {
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // Mesas (3 strates empilées) et arches (2 piliers + linteau) : une seule InstancedMesh colorée
  const strata = ['#B56A30', '#D39A5B', '#E8B873'];
  const blocks: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; color: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.35;
    const r = arenaRadius - 3.2 + (i % 2) * 1.6;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const w = 5.2 + (i % 3) * 1.4;
    for (let k = 0; k < 3; k++) {
      blocks.push({ x, y: 1.1 + k * 2.0, z, sx: w - k * 1.3, sy: 2.0, sz: w * 0.8 - k * 1.1, rot: ang + i, color: strata[k] });
    }
  }
  for (const [ax, az, rot] of [
    [-13.5, -13.5, 0.8],
    [14.5, -11.5, -0.6],
  ] as [number, number, number][]) {
    const dx = Math.cos(rot) * 2.1;
    const dz = Math.sin(rot) * 2.1;
    blocks.push({ x: ax - dx, y: 2.0, z: az - dz, sx: 1.2, sy: 4.0, sz: 1.2, rot, color: strata[0] });
    blocks.push({ x: ax + dx, y: 2.0, z: az + dz, sx: 1.2, sy: 4.0, sz: 1.2, rot, color: strata[0] });
    blocks.push({ x: ax, y: 4.4, z: az, sx: 6.0, sy: 0.9, sz: 1.4, rot: -rot, color: strata[1] });
  }
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
  const rockInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rockMat, blocks.length);
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  blocks.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.rotation.set(0, b.rot, 0);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    rockInst.setColorAt(i, tint.set(b.color));
  });
  rockInst.computeBoundingSphere();
  env.add(rockInst);

  // Cristaux d'ambre qui affleurent autour de l'arène
  const amberMat = new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    emissive: new THREE.Color('#F59E0B'),
    emissiveIntensity: 0.5,
    roughness: 0.18,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  const amberCount = 14;
  const amber = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), amberMat, amberCount);
  amber.castShadow = true;
  for (let i = 0; i < amberCount; i++) {
    const ang = (i / amberCount) * Math.PI * 2 + 0.1;
    const r = 16.2 + ((i * 37) % 30) / 10;
    const s = 0.6 + ((i * 23) % 70) / 100;
    dummy.position.set(Math.cos(ang) * r, 0.6 * s, Math.sin(ang) * r);
    dummy.scale.set(s, s * (1 + (i % 3) * 0.3), s);
    dummy.rotation.set(((i % 5) - 2) * 0.12, i * 1.1, ((i % 4) - 1.5) * 0.14);
    dummy.updateMatrix();
    amber.setMatrixAt(i, dummy.matrix);
  }
  amber.computeBoundingSphere();
  env.add(amber);

  // Côtes d'un grand fossile à demi ensablé
  const boneMat = new THREE.MeshStandardMaterial({ color: '#F3E9D2', roughness: 0.7 });
  const ribCount = 7;
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 2.6, 0.34), boneMat, ribCount * 2 + 1);
  ribs.castShadow = true;
  for (let i = 0; i < ribCount; i++) {
    const h = 0.7 + Math.sin((i / (ribCount - 1)) * Math.PI) * 0.6;
    for (const side of [-1, 1]) {
      dummy.position.set(i * 0.95 - 2.85, 1.0 * h, side * 0.9);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(side * 0.5, 0, 0);
      dummy.updateMatrix();
      ribs.setMatrixAt(i * 2 + (side === 1 ? 1 : 0), dummy.matrix);
    }
  }
  // colonne vertébrale couchée
  dummy.position.set(0, 0.2, 0);
  dummy.scale.set(1, 2.7, 1);
  dummy.rotation.set(0, 0, Math.PI / 2);
  dummy.updateMatrix();
  ribs.setMatrixAt(ribCount * 2, dummy.matrix);
  ribs.computeBoundingSphere();
  const fossil = new THREE.Group();
  fossil.add(ribs);
  fossil.position.set(12.5, 0, 13.5); // au bord de l'arène, hors de la zone de combat centrale
  fossil.rotation.y = 0.5;
  env.add(fossil);

  return (elapsed) => {
    amberMat.emissiveIntensity = 0.45 + Math.sin(elapsed * 1.6) * 0.2;
  };
}

/** Décor propre à la Toundra Boréale : flèches de glace, congères, étangs gelés, igloo, aurores. */
function addTundraDecor(env: THREE.Group, arenaRadius: number): (elapsed: number) => void {
  const dummy = new THREE.Object3D();

  const iceMat = new THREE.MeshStandardMaterial({
    color: '#BFEFFF',
    emissive: new THREE.Color('#38BDF8'),
    emissiveIntensity: 0.32,
    roughness: 0.12,
    metalness: 0.3,
    transparent: true,
    opacity: 0.9,
  });
  const spireCount = 18;
  const spires = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 2.6, 0.7), iceMat, spireCount);
  spires.castShadow = true;
  for (let i = 0; i < spireCount; i++) {
    const ang = (i / spireCount) * Math.PI * 2 + 0.17;
    const r = 17 + ((i * 41) % 60) / 10;
    const s = 0.7 + ((i * 29) % 80) / 100;
    dummy.position.set(Math.cos(ang) * r, 1.1 * s, Math.sin(ang) * r);
    dummy.scale.set(s, s * (1 + (i % 3) * 0.35), s);
    dummy.rotation.set(((i % 5) - 2) * 0.07, i * 0.9, ((i % 4) - 1.5) * 0.08);
    dummy.updateMatrix();
    spires.setMatrixAt(i, dummy.matrix);
  }
  spires.computeBoundingSphere();
  env.add(spires);

  const snowMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.95 });
  const driftCount = 16;
  const drifts = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.36, 1.8), snowMat, driftCount);
  drifts.receiveShadow = true;
  for (let i = 0; i < driftCount; i++) {
    const ang = (i / driftCount) * Math.PI * 2 + 0.6;
    const r = 16.2 + ((i * 17) % 50) / 10;
    const s = 0.8 + ((i * 23) % 70) / 100;
    dummy.position.set(Math.cos(ang) * r, 0.16 * s, Math.sin(ang) * r);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, i * 1.3, 0);
    dummy.updateMatrix();
    drifts.setMatrixAt(i, dummy.matrix);
  }
  drifts.computeBoundingSphere();
  env.add(drifts);

  // Étangs gelés (plats : ne gênent pas les déplacements)
  const pondMat = new THREE.MeshStandardMaterial({ color: '#9BD8F2', roughness: 0.06, metalness: 0.4 });
  const pondA = makeBox(6.5, 0.05, 4.6, pondMat, -8.5, 0.03, -9.5, false);
  pondA.rotation.y = 0.3;
  const pondB = makeBox(4.4, 0.05, 5.6, pondMat, 9.5, 0.03, 8.5, false);
  pondB.rotation.y = -0.5;
  env.add(pondA, pondB);

  // Igloo en gradins
  const igloo = new THREE.Group();
  igloo.position.set(-18.5, 0, -15);
  igloo.rotation.y = 0.7;
  igloo.add(makeBox(3.2, 1.0, 3.2, snowMat, 0, 0.5, 0));
  igloo.add(makeBox(2.5, 0.8, 2.5, snowMat, 0, 1.4, 0));
  igloo.add(makeBox(1.6, 0.6, 1.6, snowMat, 0, 2.1, 0));
  igloo.add(makeBox(0.9, 0.9, 0.3, new THREE.MeshStandardMaterial({ color: '#22324A', roughness: 0.9 }), 0, 0.45, 1.56));
  env.add(igloo);

  // Aurores boréales : rubans lumineux qui ondulent lentement dans le ciel
  const auroraColors = ['#5EEAD4', '#A78BFA', '#67E8F9', '#F0ABFC'];
  const ribbons: THREE.Mesh[] = [];
  const ribbonGeo = new THREE.BoxGeometry(44, 0.6, 2.2);
  auroraColors.forEach((hex, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      fog: false,
    });
    const ribbon = new THREE.Mesh(ribbonGeo, mat);
    ribbon.position.set((i - 1.5) * 9, 20 + i * 1.6, -(arenaRadius + 8) - i * 4);
    ribbon.rotation.set(0.5, (i - 1.5) * 0.12, (i % 2 === 0 ? 1 : -1) * 0.06);
    env.add(ribbon);
    ribbons.push(ribbon);
  });

  return (elapsed) => {
    for (let i = 0; i < ribbons.length; i++) {
      const ribbon = ribbons[i];
      (ribbon.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(elapsed * 0.6 + i * 1.7) * 0.16;
      ribbon.position.y = 20 + i * 1.6 + Math.sin(elapsed * 0.35 + i) * 0.8;
      ribbon.rotation.z = Math.sin(elapsed * 0.25 + i * 2.1) * 0.08;
    }
  };
}

/** Décor propre à la Cime des Orages : monolithes runiques, rochers en lévitation, anneau de nuées. */
function addStormDecor(env: THREE.Group, arenaRadius: number): (elapsed: number) => void {
  const dummy = new THREE.Object3D();

  const slabMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.8, metalness: 0.15 });
  const runeMat = new THREE.MeshStandardMaterial({
    color: '#FDE047',
    emissive: new THREE.Color('#FACC15'),
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.52;
    const monolith = new THREE.Group();
    monolith.position.set(Math.cos(ang) * 18.2, 0, Math.sin(ang) * 18.2);
    monolith.rotation.y = -ang + Math.PI / 2;
    monolith.add(makeBox(1.3, 4.6 + (i % 2) * 1.2, 0.7, slabMat, 0, 2.3 + (i % 2) * 0.6, 0));
    monolith.add(makeBox(0.28, 2.6, 0.06, runeMat, 0, 2.6, 0.37, false));
    monolith.add(makeBox(0.8, 0.22, 0.06, runeMat, 0, 3.4, 0.37, false));
    env.add(monolith);
  }

  // Rochers en lévitation autour de l'arène
  const shardCount = 14;
  const shardMat = new THREE.MeshStandardMaterial({ color: '#4B5563', roughness: 0.85 });
  const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.0, 1.4), shardMat, shardCount);
  shards.castShadow = true;
  for (let i = 0; i < shardCount; i++) {
    const ang = (i / shardCount) * Math.PI * 2 + 0.2;
    const r = 20 + ((i * 31) % 50) / 10;
    const s = 0.6 + ((i * 19) % 90) / 100;
    dummy.position.set(Math.cos(ang) * r, 4.5 + ((i * 13) % 50) / 10, Math.sin(ang) * r);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(i * 0.4, i * 1.1, i * 0.7);
    dummy.updateMatrix();
    shards.setMatrixAt(i, dummy.matrix);
  }
  shards.computeBoundingSphere();
  const shardGroup = new THREE.Group();
  shardGroup.add(shards);
  env.add(shardGroup);

  // Anneau de nuées d'orage au ras du plateau
  const cloudRing = new THREE.Group();
  const stormCloudMat = new THREE.MeshStandardMaterial({
    color: '#9CA3AF',
    roughness: 1,
    transparent: true,
    opacity: 0.92,
  });
  const puffGeo = new THREE.BoxGeometry(9, 1.6, 6);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const puff = new THREE.Mesh(puffGeo, stormCloudMat);
    puff.position.set(Math.cos(ang) * (arenaRadius + 5), -0.9 + (i % 3) * 0.5, Math.sin(ang) * (arenaRadius + 5));
    puff.rotation.y = -ang;
    puff.scale.setScalar(0.8 + (i % 4) * 0.18);
    cloudRing.add(puff);
  }
  env.add(cloudRing);

  return (elapsed) => {
    shardGroup.position.y = Math.sin(elapsed * 0.6) * 0.45;
    shardGroup.rotation.y = elapsed * 0.02;
    cloudRing.rotation.y = elapsed * -0.012;
    runeMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 2.4) * 0.3;
  };
}

/**
 * Builds natural perimeter environment (trees, rocks, cliffs, animated PBR water, voxel clouds)
 */
export function buildBiomeEnvironment(biome: BiomeDef, isCamp: boolean): BiomeEnvironmentHandle {
  const env = new THREE.Group();
  const decor = BIOME_DECOR[biome.id];

  // Extended natural terrain island slab (grounded, no floating rectangular walls!)
  const groundTex = getGroundCheckerTexture(biome.groundHex, biome.groundAltHex);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTex,
    roughness: 0.86,
    metalness: 0.02,
  });

  const arenaRadius = isCamp ? 16.5 : 26;
  const mainIsland = new THREE.Mesh(
    new THREE.BoxGeometry(arenaRadius * 2, 2.4, arenaRadius * 2),
    groundMat,
  );
  mainIsland.position.set(0, -1.2, 0);
  mainIsland.receiveShadow = true;
  env.add(mainIsland);

  // Subtle stepped lower cliff rim around island
  const cliffMat = new THREE.MeshStandardMaterial({
    color: decor.cliff,
    roughness: 0.9,
    metalness: 0.04,
  });
  const lowerSlab = new THREE.Mesh(
    new THREE.BoxGeometry(arenaRadius * 2 + 2.6, 2.2, arenaRadius * 2 + 2.6),
    cliffMat,
  );
  lowerSlab.position.set(0, -2.5, 0);
  env.add(lowerSlab);

  // Animated PBR water / magma / astral sea using onBeforeCompile (single pass, software-WebGL friendly)
  const waterUniform = { value: 0 };
  const shoreExtent = arenaRadius + 1.4;
  const foamColor = new THREE.Color(decor.foam);

  const seaMat = new THREE.MeshStandardMaterial({
    color: biome.waterHex,
    roughness: decor.seaRoughness,
    metalness: 0.14,
    emissive: new THREE.Color(biome.waterHex),
    emissiveIntensity: decor.seaEmissive,
  });

  seaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniform;
    shader.uniforms.uShore = { value: shoreExtent };
    shader.uniforms.uFoamColor = { value: foamColor };

    shader.vertexShader =
      `uniform float uTime;\nvarying vec2 vSeaPos;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vSeaPos = position.xy;
        float w1 = sin(position.x * 0.22 + uTime * 1.9) * 0.16;
        float w2 = cos(position.y * 0.24 - uTime * 1.5) * 0.14;
        transformed.z += w1 + w2;`,
      );

    shader.fragmentShader =
      `uniform float uTime;\nuniform float uShore;\nuniform vec3 uFoamColor;\nvarying vec2 vSeaPos;\n` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float edgeDist = max(abs(vSeaPos.x), abs(vSeaPos.y)) - uShore;
        float shoreBand = smoothstep(3.4, 0.0, abs(edgeDist - 0.6)) * step(-0.5, edgeDist);
        float ripple = 0.5 + 0.5 * sin(edgeDist * 2.8 - uTime * 3.2 + sin(vSeaPos.x * 0.4 + vSeaPos.y * 0.4));
        float crest = smoothstep(0.68, 0.98, sin(vSeaPos.x * 0.28 + uTime * 1.4) * cos(vSeaPos.y * 0.26 - uTime * 1.1));
        float foamMix = clamp(shoreBand * (0.38 + 0.36 * ripple) + crest * 0.14, 0.0, 0.65);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, foamMix);`,
      );
  };

  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(240, 240, 32, 32), seaMat);
  seaPlane.rotation.x = -Math.PI / 2;
  seaPlane.position.y = -1.6;
  env.add(seaPlane);

  // Drifting stylized voxel sky clouds (high and peripheral so Title Lockup stays crisp)
  const cloudGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: decor.cloud,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: decor.cloudOpacity,
  });
  const cloudCoords: [number, number, number, number][] = [
    [-26, 13.5, -24, 1.3],
    [24, 15.0, -28, 1.45],
    [-10, 16.5, -36, 1.2],
    [32, 13.0, -8, 1.1],
    [-34, 14.5, 4, 1.25],
    [14, 15.5, -34, 1.05],
  ];
  for (const [cx, cy, cz, cs] of cloudCoords) {
    const cluster = new THREE.Group();
    cluster.position.set(cx, cy, cz);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(5.2 * cs, 1.25 * cs, 2.8 * cs), cloudMat);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(3.2 * cs, 1.55 * cs, 2.4 * cs), cloudMat);
    c2.position.set(-0.7 * cs, 0.65 * cs, 0.1 * cs);
    const c3 = new THREE.Mesh(new THREE.BoxGeometry(2.4 * cs, 1.1 * cs, 2.2 * cs), cloudMat);
    c3.position.set(1.5 * cs, 0.4 * cs, -0.2 * cs);
    cluster.add(c1, c2, c3);
    cloudGroup.add(cluster);
  }
  env.add(cloudGroup);

  // Distant decorative voxel islets for rich horizon depth
  const isletGeo = new THREE.BoxGeometry(1, 1, 1);
  const isletMat = new THREE.MeshStandardMaterial({ color: biome.groundAltHex, roughness: 0.88 });
  const isletInst = new THREE.InstancedMesh(isletGeo, isletMat, 14);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + 0.25;
    const dist = arenaRadius + 13 + (i % 3) * 8;
    dummy.position.set(Math.cos(ang) * dist, -0.5 + (i % 2) * 0.8, Math.sin(ang) * dist);
    dummy.scale.set(6 + (i % 4) * 2.5, 3.2 + (i % 3) * 1.8, 6 + ((i + 1) % 3) * 2.2);
    dummy.rotation.y = (i * 0.7) % Math.PI;
    dummy.updateMatrix();
    isletInst.setMatrixAt(i, dummy.matrix);
  }
  isletInst.computeBoundingSphere();
  env.add(isletInst);

  // Perimeter voxel trees / crystals / volcanic spires via InstancedMesh (natural perimeter framing)
  const treeCount = 28;
  const trunkGeo = new THREE.BoxGeometry(0.65, 1.8, 0.65);
  const crownGeo = new THREE.BoxGeometry(1.9, 1.6, 1.9);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: decor.trunk,
    roughness: 0.88,
  });
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: decor.crownRoughness,
    metalness: decor.crownMetalness,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  trunks.castShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;

  const paletteTints = decor.crownTints;

  const tmpColor = new THREE.Color();
  const minR = isCamp ? 10.5 : 16.5;
  const maxR = arenaRadius - 2.0;

  for (let i = 0; i < treeCount; i++) {
    const ang = (i / treeCount) * Math.PI * 2 + (i % 2) * 0.09;
    // Keep front-south camera sightline slightly lower/open
    const r = minR + ((i * 37) % 100) / 100 * (maxR - minR);
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    const s = 0.85 + ((i * 19) % 30) / 100;

    dummy.position.set(x, 0.9 * s, z);
    dummy.scale.set(s, s * decor.trunkStretch, s);
    dummy.rotation.y = (i * 0.5) % (Math.PI * 2);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, (decor.trunkStretch > 1.6 ? 3.6 : 2.2) * s, z);
    dummy.scale.set(s * decor.crownScale[0], s * decor.crownScale[1], s * decor.crownScale[0]);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);

    tmpColor.set(paletteTints[i % paletteTints.length]);
    crowns.setColorAt(i, tmpColor);
  }
  trunks.computeBoundingSphere();
  crowns.computeBoundingSphere();
  env.add(trunks, crowns);

  // Decorative ground rocks / flowers instanced around edges (never obstructing spawn center)
  const rockCount = 26;
  const rockGeo = new THREE.BoxGeometry(0.85, 0.55, 0.85);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.08,
  });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const rockTints = decor.rockTints;

  for (let i = 0; i < rockCount; i++) {
    const ang = (i / rockCount) * Math.PI * 2 + 0.4;
    const r = (isCamp ? 10.5 : 14.2) + ((i * 23) % 70) / 10;
    const s = 0.7 + ((i * 13) % 50) / 100;
    dummy.position.set(Math.cos(ang) * r, 0.27 * s, Math.sin(ang) * r);
    dummy.scale.set(s * 1.2, s, s);
    dummy.rotation.y = i * 0.8;
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    tmpColor.set(rockTints[i % rockTints.length]);
    rocks.setColorAt(i, tmpColor);
  }
  rocks.computeBoundingSphere();
  env.add(rocks);

  // Décor signature des biomes de la Giga Update
  let animate: ((elapsed: number) => void) | undefined;
  if (biome.id === 'tundra') animate = addTundraDecor(env, arenaRadius);
  else if (biome.id === 'stormpeak') animate = addStormDecor(env, arenaRadius);
  else if (biome.id === 'canyon') animate = addCanyonDecor(env, arenaRadius);

  return { group: env, waterUniform, cloudGroup, animate };
}

// === V0.2 ZERO-GC FLOATING 3D COMBAT TEXT SPRITE POOL ===
interface FloatingTextSlot {
  active: boolean;
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  life: number;
  maxLife: number;
  vy: number;
  baseScaleX: number;
  baseScaleY: number;
}

export class FloatingTextPool {
  private slots: FloatingTextSlot[] = [];
  private cursor = 0;

  constructor(parent: THREE.Group, size = 20) {
    for (let i = 0; i < size; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 72;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 20;
      parent.add(sprite);

      this.slots.push({
        active: false,
        sprite,
        canvas,
        ctx,
        tex,
        life: 0,
        maxLife: 0.9,
        vy: 1.8,
        baseScaleX: 2.6,
        baseScaleY: 0.74,
      });
    }
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    text: string,
    colorHex: string,
    scale = 1.0,
    duration = 0.85,
  ): void {
    const slot = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % this.slots.length;

    const { canvas, ctx } = slot;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSize = text.length > 10 ? 28 : 40;
    ctx.font = `900 ${fontSize}px "Bricolage Grotesque", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#141925';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 2);
    ctx.fillStyle = colorHex;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    slot.tex.needsUpdate = true;

    slot.active = true;
    slot.life = duration;
    slot.maxLife = duration;
    slot.vy = 1.65 + scale * 0.45;
    slot.baseScaleX = 2.65 * scale;
    slot.baseScaleY = 0.76 * scale;
    slot.sprite.position.set(
      x + (Math.random() - 0.5) * 0.55,
      y,
      z + (Math.random() - 0.5) * 0.35,
    );
    slot.sprite.scale.set(slot.baseScaleX, slot.baseScaleY, 1);
    (slot.sprite.material as THREE.SpriteMaterial).opacity = 1;
    slot.sprite.visible = true;
  }

  public update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        slot.sprite.visible = false;
        continue;
      }
      const progress = 1 - slot.life / slot.maxLife;
      slot.sprite.position.y += slot.vy * (1 - progress * 0.55) * dt;
      const pop = progress < 0.16 ? 0.85 + (progress / 0.16) * 0.3 : 1.15 - progress * 0.2;
      slot.sprite.scale.set(slot.baseScaleX * pop, slot.baseScaleY * pop, 1);
      const fade = progress > 0.65 ? Math.max(0, 1 - (progress - 0.65) / 0.35) : 1;
      (slot.sprite.material as THREE.SpriteMaterial).opacity = fade;
    }
  }

  public clear(): void {
    for (const slot of this.slots) {
      slot.active = false;
      slot.sprite.visible = false;
    }
  }

  public dispose(): void {
    for (const slot of this.slots) {
      slot.tex.dispose();
      (slot.sprite.material as THREE.Material).dispose();
    }
  }
}
