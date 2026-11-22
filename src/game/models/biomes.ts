/**
 * Environnement d'un biome : sol, décor instancié, éléments propres (canyon, toundra, orage) et leur animation.
 */
import * as THREE from 'three';
import type { BiomeDef, BiomeId } from '../types';
import { getGroundCheckerTexture, makeBox } from './shared';

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
