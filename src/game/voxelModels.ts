import * as THREE from 'three';
import { SPECIES } from './catalog';
import type { BiomeDef, SpeciesDef } from './types';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
let sharedToyBumpTex: THREE.CanvasTexture | null = null;
let sharedGroundTileTex: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(12, 16, 26, 0.58)');
  grad.addColorStop(0.6, 'rgba(12, 16, 26, 0.25)');
  grad.addColorStop(1, 'rgba(12, 16, 26, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  sharedContactShadowTex = tex;
  return tex;
}

export function getToyBumpTexture(): THREE.CanvasTexture {
  if (sharedToyBumpTex) return sharedToyBumpTex;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Subtle matte voxel bevel border + fine ceramic grain
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  for (let i = 0; i < 180; i++) {
    const x = (i * 29) % size;
    const y = (i * 47) % size;
    const shade = 118 + ((i * 17) % 24);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  sharedToyBumpTex = tex;
  return tex;
}

export function getGroundCheckerTexture(primaryHex: string, altHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cells = 4;
  const step = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? primaryHex : altHex;
      ctx.fillRect(x * step, y * step, step, step);
      // Subtle top-left bevel highlight for toybox voxel floor feel
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x * step, y * step, step, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x * step, (y + 1) * step - 3, step, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  sharedGroundTileTex = tex;
  return sharedGroundTileTex;
}

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

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
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
  const yPos = rig.species.archetype === 'floating' ? 2.0 : 1.72;

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
}

/**
 * Builds natural perimeter environment (trees, rocks, cliffs, animated PBR water, voxel clouds)
 */
export function buildBiomeEnvironment(biome: BiomeDef, isCamp: boolean): BiomeEnvironmentHandle {
  const env = new THREE.Group();

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
    color: biome.id === 'volcano' ? '#2A2322' : biome.id === 'sanctuary' ? '#4C446B' : '#8C6E4E',
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
  const foamColor =
    biome.id === 'volcano'
      ? new THREE.Color('#FFD166')
      : biome.id === 'sanctuary'
        ? new THREE.Color('#E9D5FF')
        : new THREE.Color('#E0F5FF');

  const seaMat = new THREE.MeshStandardMaterial({
    color: biome.waterHex,
    roughness: biome.id === 'volcano' ? 0.34 : 0.24,
    metalness: 0.14,
    emissive: new THREE.Color(biome.waterHex),
    emissiveIntensity: biome.id === 'volcano' ? 0.45 : biome.id === 'sanctuary' ? 0.24 : 0.08,
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
    color:
      biome.id === 'volcano'
        ? '#7A544E'
        : biome.id === 'sanctuary'
          ? '#635699'
          : '#FFFFFF',
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: biome.id === 'volcano' ? 0.65 : 0.85,
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
    color: biome.id === 'volcano' ? '#2F2726' : biome.id === 'sanctuary' ? '#584E7A' : '#7A5230',
    roughness: 0.88,
  });
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: biome.id === 'sanctuary' ? 0.28 : 0.76,
    metalness: biome.id === 'sanctuary' ? 0.25 : 0.04,
  });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  trunks.castShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;

  const paletteTints =
    biome.id === 'meadow'
      ? ['#2F843D', '#3E9B47', '#266E36', '#56A943']
      : biome.id === 'shore'
        ? ['#2E9468', '#3BB07B', '#237A5E', '#52BC7C']
        : biome.id === 'volcano'
          ? ['#3C3232', '#523C38', '#C84B24', '#4A3A38']
          : ['#8B5CF6', '#A78BFA', '#6366F1', '#C084FC'];

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
    dummy.scale.set(s, s * (biome.id === 'volcano' ? 1.5 : 1.0), s);
    dummy.rotation.y = (i * 0.5) % (Math.PI * 2);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 2.2 * s, z);
    dummy.scale.set(
      s * (biome.id === 'sanctuary' ? 0.65 : 1.05),
      s * (biome.id === 'sanctuary' ? 1.5 : 0.95),
      s * (biome.id === 'sanctuary' ? 0.65 : 1.05),
    );
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
  const rockTints =
    biome.id === 'volcano'
      ? ['#3A3231', '#544643', '#D9532F']
      : biome.id === 'sanctuary'
        ? ['#6B6091', '#8E7CC3', '#5EEAD4']
        : ['#9C9488', '#B5ADA0', '#7D766C'];

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

  return { group: env, waterUniform, cloudGroup };
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
