/**
 * Décor vivant de la Prairie (sprint Art, section 2) : relief en terrasses autour de l'arène (qui reste plate),
 * sol d'herbe sans damier avec chemins de terre, touffes d'herbe et fleurs qui ondulent au vent, arbres de cinq
 * formes, buissons, rochers moussus, une mare animée, papillons le jour et lucioles la nuit, pollen.
 *
 * Purement décoratif, instancié, sans collision. Seulement dans le navigateur (`setArtDecor`) : la simulation
 * headless garde l'ancien décor (aucun objet three.js de plus pendant un combat simulé, golden inchangé).
 * Les positions viennent d'un générateur à graine fixe : le décor est le même à chaque visite.
 */
import * as THREE from 'three';

let artDecorOn = false;
let decorDetail: 'low' | 'high' = 'high';
let nightFactor = 0;
/** ART2 : force du vent (Options « Vent : Normal / Doux / Coupé »). */
let windLevel: 'normal' | 'soft' | 'off' = 'normal';
const windUniform = { value: 1 };
export function setWindLevel(level: 'normal' | 'soft' | 'off'): void {
  windLevel = level;
}
/** Vent effectif : coupé en qualité Basse et si le système demande moins d'animations. */
function windFactor(): number {
  if (windLevel === 'off' || decorDetail === 'low') return 0;
  try {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
  } catch {
    // rien
  }
  return windLevel === 'soft' ? 0.5 : 1;
}

export function setArtDecor(on: boolean): void {
  artDecorOn = on;
}
export function isArtDecorOn(): boolean {
  return artDecorOn;
}
/** Qualité Bas : moins d'herbe et de fleurs, pas d'ondulation. */
export function setDecorDetail(level: 'low' | 'high'): void {
  decorDetail = level;
}
/** 0 le jour, 1 la nuit (fourni par le cycle du camp) : papillons ou lucioles. */
export function setDecorNight(n: number): void {
  nightFactor = n;
  crystalNight.value = n; // ART3 : veines de cristal des falaises
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit doux déterministe (somme de sinus) pour le relief. */
const hill = (x: number, z: number) =>
  Math.sin(x * 0.23 + 1.3) * Math.cos(z * 0.19 - 0.7) * 0.9 + Math.sin(x * 0.07 + z * 0.11) * 1.1 + Math.cos(x * 0.41 - z * 0.37) * 0.35;

/** Sol d'herbe (sans damier) avec deux chemins de terre qui traversent le camp ou l'arène. */
export function buildMeadowGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rnd = seeded(11);
  ctx.fillStyle = '#5DB04A';
  ctx.fillRect(0, 0, size, size);
  // ART3 : grands aplats de deux verts voisins (plus de damier de petits carrés), bords en marches de 8 pixels
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#66B851' : '#55A545';
    const cx = rnd() * size;
    const cy = rnd() * size;
    const rad = 50 + rnd() * 60;
    for (let y = -rad; y <= rad; y += 8)
      for (let x = -rad; x <= rad; x += 8) if (x * x + y * y <= rad * rad) ctx.fillRect(Math.floor((cx + x) / 8) * 8, Math.floor((cy + y) / 8) * 8, 8, 8);
  }
  // chemins de terre
  ctx.strokeStyle = '#B08A5A';
  ctx.lineCap = 'square';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.62);
  ctx.bezierCurveTo(size * 0.3, size * 0.5, size * 0.6, size * 0.72, size, size * 0.58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.45, size);
  ctx.bezierCurveTo(size * 0.5, size * 0.7, size * 0.38, size * 0.35, size * 0.52, 0);
  ctx.stroke();
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = rnd() < 0.5 ? '#9C784A' : '#C29C68';
    const x = Math.floor(rnd() * size / 4) * 4;
    const y = Math.floor(rnd() * size / 4) * 4;
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[0] > 150 && d[1] < 150) ctx.fillRect(x, y, 4, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.userData.ownedByScene = true;
  return tex;
}

/** ART3 : lueur des veines de cristal (0 le jour, 1 la nuit), partagée par toutes les falaises. */
const crystalNight = { value: 0 };

/**
 * ART3 : falaises en couches. Le dessus des colonnes garde sa couleur (vert) ; les flancs prennent des bandes de
 * terre et de pierre selon la hauteur, sous une lèvre d'herbe ; quelques blocs de flanc sont des veines de cristal
 * qui luisent doucement la nuit. Tout se passe dans le shader : aucun objet ni appel de dessin en plus.
 */
function addCliffBands(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCrystalNight = crystalNight;
    shader.vertexShader =
      'varying vec3 vCliffPos;\nvarying float vCliffUp;\nvarying float vCliffTop;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  vec4 cliffW = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vCliffPos = cliffW.xyz;
  vCliffUp = normal.y;
  vCliffTop = (modelMatrix * instanceMatrix * vec4(0.0, 0.5, 0.0, 1.0)).y;`,
      );
    shader.fragmentShader =
      'uniform float uCrystalNight;\nvarying vec3 vCliffPos;\nvarying float vCliffUp;\nvarying float vCliffTop;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  float crystalF = 0.0;
  if (vCliffUp < 0.5 && vCliffTop - vCliffPos.y > 0.18) {
    float band = mod(floor(vCliffPos.y * 2.0), 3.0);
    vec3 layer = band < 0.5 ? vec3(0.40, 0.29, 0.18) : band < 1.5 ? vec3(0.50, 0.48, 0.44) : vec3(0.32, 0.23, 0.15);
    vec3 cell = floor(vCliffPos * vec3(1.0, 2.0, 1.0));
    float h = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    if (h < 0.035) { layer = vec3(0.55, 0.86, 0.98); crystalF = 1.0; }
    diffuseColor.rgb = layer;
  }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vec3(0.45, 0.85, 1.0) * crystalF * (0.08 + 0.9 * uCrystalNight);',
        );
  };
  mat.customProgramCacheKey = () => 'art3-cliff';
}

/** Ondulation au vent dans le shader (aucun calcul par image côté processeur). */
function addSway(mat: THREE.MeshStandardMaterial, time: { value: number }, strength: number): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.uniforms.uWind = windUniform;
    shader.vertexShader =
      'uniform float uTime;\nuniform float uWind;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float bend = max(0.0, position.y + 0.5) * ${strength.toFixed(3)} * uWind;
        transformed.x += sin(uTime * 1.8 + ip.x * 0.6 + ip.z * 0.4) * bend;
        transformed.z += cos(uTime * 1.5 + ip.z * 0.5) * bend * 0.6;`,
      );
  };
}

export function addMeadowArtDecor(env: THREE.Group, arenaRadius: number, isCamp: boolean): (elapsed: number) => void {
  const low = decorDetail === 'low';
  const rnd = seeded(isCamp ? 7 : 3);
  const flat = isCamp ? 10 : 14.5;
  const time = { value: 0 };
  /**
   * ART2 : au camp, tout ce qui est haut (arbres, buissons, rochers) et les touffes passent du côté opposé à
   * la caméra (z négatif) : le bas et les côtés de l'écran restent dégagés. En combat, rien ne change.
   */
  const backSector = (a: number) => (isCamp && Math.sin(a) > 0.15 ? -a : a);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // --- relief : colonnes de blocs en terrasses entre l'arène plate et le bord de l'île
  // qualité Bas : relief grossier, ni herbe ni fleurs ni insectes (aussi léger que l'ancien décor)
  const step = low ? 3 : 1;
  const cells: { x: number; z: number; h: number }[] = [];
  for (let x = -arenaRadius; x <= arenaRadius; x += step)
    for (let z = -arenaRadius; z <= arenaRadius; z += step) {
      const r = Math.hypot(x, z);
      if (r < flat + 0.5 || r > arenaRadius - 0.5) continue;
      const rise = Math.min(1, (r - flat) / 6);
      // ART3 : plateaux d'un bloc de haut (au lieu de marches de 0,5) : des terrasses nettes, moins de petites marches
      const h = Math.max(0, Math.round((hill(x, z) * 0.9 + 1.4) * rise));
      // ART2 : au camp, le premier plan (vers la caméra) reste bas et dégagé
      const hh = isCamp && z > 6 ? Math.min(h, 0.5) : h;
      if (hh > 0) cells.push({ x, z, h: hh });
    }
  const terrainMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  addCliffBands(terrainMat);
  const terrain = new THREE.InstancedMesh(new THREE.BoxGeometry(step, 1, step), terrainMat, cells.length);
  cells.forEach((c, i) => {
    dummy.position.set(c.x, c.h / 2, c.z);
    dummy.scale.set(1, c.h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    terrain.setMatrixAt(i, dummy.matrix);
    // une couleur dominante : deux verts voisins qui alternent d'un plateau à l'autre
    color.set(Math.round(c.h) % 2 ? '#5FAE4B' : '#55A545');
    terrain.setColorAt(i, color);
  });
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  env.add(terrain);
  const heightAt = (x: number, z: number) => cells.find((c) => Math.abs(c.x - x) <= step / 2 && Math.abs(c.z - z) <= step / 2)?.h ?? 0;

  // --- touffes d'herbe et fleurs (instanciées, ondulent au vent)
  // ART2 : 40 % d'herbe en moins, en touffes (7 brins) plutôt que semée partout
  const grassCount = low ? 0 : 287;
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  if (!low) addSway(grassMat, time, 0.16);
  const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), grassMat, grassCount);
  let tuftX = 0;
  let tuftZ = 0;
  for (let i = 0; i < grassCount; i++) {
    // une nouvelle touffe tous les 7 brins, plus dense vers les bords : l'arène reste lisible
    if (i % 7 === 0) {
      const a = backSector(rnd() * Math.PI * 2);
      const r = flat * 0.55 + Math.sqrt(rnd()) * (arenaRadius - 1 - flat * 0.55);
      tuftX = Math.cos(a) * r;
      tuftZ = Math.sin(a) * r;
    }
    const x = tuftX + (rnd() - 0.5) * 0.9;
    const z = tuftZ + (rnd() - 0.5) * 0.9;
    const s = 0.6 + rnd() * 0.9;
    dummy.position.set(x, heightAt(x, z) + 0.2 * s, z);
    dummy.scale.set(1, s, 1);
    dummy.rotation.set(0, rnd() * Math.PI, 0);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    color.set(['#7ED957', '#5DB04A', '#9BE26B'][i % 3]);
    grass.setColorAt(i, color);
  }
  env.add(grass);

  const flowerCount = low ? 0 : 66; // ART2 : 40 % de moins, par petits bouquets de trois
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: new THREE.Color('#222222') });
  if (!low) addSway(flowerMat, time, 0.1);
  const flowers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), flowerMat, flowerCount);
  let bunchX = 0;
  let bunchZ = 0;
  for (let i = 0; i < flowerCount; i++) {
    if (i % 3 === 0) {
      const a = backSector(rnd() * Math.PI * 2);
      const r = flat - 1 + rnd() * (arenaRadius - flat);
      bunchX = Math.cos(a) * r;
      bunchZ = Math.sin(a) * r;
    }
    const x = bunchX + (rnd() - 0.5) * 0.6;
    const z = bunchZ + (rnd() - 0.5) * 0.6;
    dummy.position.set(x, heightAt(x, z) + 0.14, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, rnd(), 0);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    color.set(['#FFD93D', '#FF7AA8', '#FFFFFF', '#B58CFF', '#FF8A3D'][i % 5]);
    flowers.setColorAt(i, color);
  }
  env.add(flowers);

  // --- arbres de cinq formes (troncs + feuillages en plusieurs blocs), sur le relief
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7A4E2D', roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
  // ART2 : le feuillage n'est plus déformé dans le shader ; il tourne comme un bloc rigide (voir l'animation)
  const SHAPES: [number, number, number, number, number, number][][] = [
    // [x, y, z, sx, sy, sz] des blocs de feuillage, au-dessus d'un tronc de hauteur 1,6
    // ART3 : deux ou trois volumes francs par arbre, cinq silhouettes différentes
    [[0, 2.3, 0, 2.0, 1.4, 2.0], [0.3, 3.3, -0.2, 1.1, 0.7, 1.1]], // bloc et petit chapeau décalé
    [[0, 2.0, 0, 2.6, 0.7, 2.6], [-0.4, 2.8, 0.2, 1.4, 1.0, 1.4]], // table large et tour basse
    [[0, 2.1, 0, 1.8, 0.8, 1.8], [0, 2.9, 0, 1.2, 0.8, 1.2], [0, 3.6, 0, 0.6, 0.7, 0.6]], // pyramide en trois marches
    [[0.55, 2.2, 0, 1.3, 1.3, 1.3], [-0.55, 2.5, 0.1, 1.2, 1.5, 1.2]], // deux colonnes jumelles
    [[0, 2.7, 0, 1.3, 2.4, 1.3], [0, 4.0, 0, 0.7, 0.5, 0.7]], // fuseau haut
  ];
  const treeCount = low ? 10 : 22;
  const leafTotal = Array.from({ length: treeCount }, (_, i) => SHAPES[i % SHAPES.length].length).reduce((a, b) => a + b, 0);
  const trunks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), trunkMat, treeCount);
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), leafMat, leafTotal);
  // pour la brise : chaque bloc de feuillage tourne autour de la base du feuillage de son arbre
  const leafInfo: { tree: number; pivot: THREE.Vector3; off: THREE.Vector3; scale: THREE.Vector3; rotY: number }[] = [];
  const treePhase: { phase: number; period: number }[] = [];
  let li = 0;
  for (let i = 0; i < treeCount; i++) {
    const a = backSector((i / treeCount) * Math.PI * 2 + rnd() * 0.2);
    const r = flat + 3 + rnd() * (arenaRadius - flat - 4);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y0 = heightAt(x, z);
    const s = 0.85 + rnd() * 0.45;
    dummy.position.set(x, y0 + 0.8 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, rnd() * Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    const tint = ['#4A9E3B', '#3F8E35', '#56A944'][i % 3]; // ART3 : trois verts proches, une couleur dominante
    // phase et période tirées de l'indice, sans consommer le hasard du décor (sa disposition reste celle d'ART)
    treePhase.push({ phase: ((i * 2.399) % 1) * Math.PI * 2, period: 3 + ((i * 0.618) % 1) * 2 });
    const pivot = new THREE.Vector3(x, y0 + 1.6 * s, z);
    for (const [bx, by, bz, sx, sy, sz] of SHAPES[i % SHAPES.length]) {
      dummy.position.set(x + bx * s, y0 + by * s, z + bz * s);
      dummy.scale.set(sx * s, sy * s, sz * s);
      dummy.updateMatrix();
      leaves.setMatrixAt(li, dummy.matrix);
      leafInfo.push({ tree: i, pivot, off: new THREE.Vector3(bx * s, (by - 1.6) * s, bz * s), scale: new THREE.Vector3(sx * s, sy * s, sz * s), rotY: dummy.rotation.y });
      color.set(tint).offsetHSL(0, 0, (by - 2.5) * 0.03);
      leaves.setColorAt(li, color);
      li += 1;
    }
  }
  trunks.castShadow = true;
  leaves.castShadow = true;
  leaves.receiveShadow = true;
  env.add(trunks, leaves);

  // --- ART3 : collines lointaines (silhouettes à deux étages), couleur proche de la brume : elles remplacent les gros
  // blocs pâles qui flottaient au-dessus des arbres (biomes.ts ne les crée plus pour la Prairie du sprint Art)
  const hillCount = 12;
  const hillMat = new THREE.MeshStandardMaterial({ color: '#A6C8B8', roughness: 1 });
  const hills = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hillMat, hillCount * 2);
  for (let i = 0; i < hillCount; i++) {
    const a = (i / hillCount) * Math.PI * 2 + 0.3;
    const d = arenaRadius + 30 + (i % 3) * 10;
    const w = 18 + (i % 4) * 5;
    const h = 1.8 + (i % 3) * 1.2; // basses : des collines au ras de l'horizon, pas des blocs qui flottent
    for (let k = 0; k < 2; k++) {
      dummy.position.set(Math.cos(a) * d, -2 + (k ? h + h * 0.25 : h / 2), Math.sin(a) * d);
      dummy.scale.set(k ? w * 0.5 : w, k ? h * 0.5 : h, k ? w * 0.4 : w * 0.7);
      dummy.rotation.set(0, -a, 0);
      dummy.updateMatrix();
      hills.setMatrixAt(i * 2 + k, dummy.matrix);
      color.set('#A6C8B8').offsetHSL(0, 0, k ? 0.03 : 0);
      hills.setColorAt(i * 2 + k, color);
    }
  }
  env.add(hills);

  // --- ART3 : signature de l'île, matières des Cubes Scellés : pierre taillée et bois brut (pas en qualité Basse)
  if (!low) {
    const craftCount = 8;
    const crafts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), craftCount);
    for (let i = 0; i < craftCount; i++) {
      const a = backSector(rnd() * Math.PI * 2);
      const r = flat + 1 + rnd() * 5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const wood = i % 2 === 1;
      // pierre : bloc taillé presque cubique ; bois : bille couchée
      dummy.scale.set(wood ? 1.6 : 0.8, wood ? 0.45 : 0.8, wood ? 0.45 : 0.8);
      dummy.position.set(x, heightAt(x, z) + dummy.scale.y / 2, z);
      dummy.rotation.set(0, rnd() * Math.PI, 0);
      dummy.updateMatrix();
      crafts.setMatrixAt(i, dummy.matrix);
      color.set(wood ? '#8B5E34' : '#C9C2B2');
      crafts.setColorAt(i, color);
    }
    crafts.castShadow = true;
    crafts.receiveShadow = true;
    env.add(crafts);
  }

  // --- buissons et rochers moussus
  const bushCount = low ? 6 : 26;
  const bushes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), leafMat, bushCount * 2); // statiques
  for (let i = 0; i < bushCount; i++) {
    const a = backSector(rnd() * Math.PI * 2);
    const r = flat - 1 + rnd() * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y0 = heightAt(x, z);
    for (let k = 0; k < 2; k++) {
      dummy.position.set(x + k * 0.5, y0 + 0.35 + k * 0.2, z + k * 0.3);
      dummy.scale.setScalar(1 - k * 0.35);
      dummy.rotation.set(0, rnd(), 0);
      dummy.updateMatrix();
      bushes.setMatrixAt(i * 2 + k, dummy.matrix);
      color.set(k ? '#5FB24A' : '#3F8F36');
      bushes.setColorAt(i * 2 + k, color);
    }
  }
  bushes.castShadow = true;
  env.add(bushes);
  const rockCount = low ? 6 : 18;
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const rocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.7, 0.9), rockMat, rockCount * 2);
  for (let i = 0; i < rockCount; i++) {
    const a = backSector(rnd() * Math.PI * 2);
    const r = flat - 1.5 + rnd() * (arenaRadius - flat);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y0 = heightAt(x, z);
    const s = 0.6 + rnd() * 0.7;
    dummy.position.set(x, y0 + 0.35 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, rnd() * 3, 0);
    dummy.updateMatrix();
    rocks.setMatrixAt(i * 2, dummy.matrix);
    color.set('#9AA0A6');
    rocks.setColorAt(i * 2, color);
    // mousse sur le dessus
    dummy.position.set(x, y0 + 0.72 * s, z);
    dummy.scale.set(s * 0.8, s * 0.2, s * 0.7);
    dummy.updateMatrix();
    rocks.setMatrixAt(i * 2 + 1, dummy.matrix);
    color.set('#5E9E45');
    rocks.setColorAt(i * 2 + 1, color);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  env.add(rocks);

  // --- mare en bord d'arène, avec vaguelettes animées
  const pondMat = new THREE.MeshStandardMaterial({ color: '#3E9FD0', roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.88, emissive: new THREE.Color('#1D6FA5'), emissiveIntensity: 0.04 });
  pondMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.fragmentShader =
      'uniform float uTime;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 q = vViewPosition.xz * 0.0 + gl_FragCoord.xy * 0.02;
        float ring = 0.5 + 0.5 * sin(length(q - vec2(10.0)) * 3.0 - uTime * 2.2);
        diffuseColor.rgb += vec3(0.18) * smoothstep(0.86, 1.0, ring);`,
      );
  };
  const pondX = isCamp ? -7.5 : -flat - 2;
  const pondZ = isCamp ? 6.5 : 4;
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.1, 20), pondMat);
  pond.position.set(pondX, 0.06, pondZ);
  pond.receiveShadow = true;
  env.add(pond);
  const rimMat = new THREE.MeshStandardMaterial({ color: '#8E8A80', roughness: 0.9 });
  const rim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), rimMat, 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    dummy.position.set(pondX + Math.cos(a) * 2.8, 0.15, pondZ + Math.sin(a) * 2.8);
    dummy.scale.setScalar(0.8 + ((i * 7) % 5) * 0.08);
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    rim.setMatrixAt(i, dummy.matrix);
  }
  env.add(rim);

  // --- vie : papillons le jour, lucioles la nuit, pollen dans la lumière
  const bugCount = low ? 1 : 18;
  const bugMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bugs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.04, 0.12), bugMat, bugCount);
  const bugSeeds = Array.from({ length: bugCount }, () => [rnd() * Math.PI * 2, 2 + rnd() * (flat + 3), rnd() * 10]);
  const fireflyMat = new THREE.MeshBasicMaterial({ color: '#FFF3A0', transparent: true, opacity: 0 });
  const fireflies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), fireflyMat, bugCount * 2);
  const pollenCount = low ? 0 : 24;
  const pollen = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: '#FFF6C2', transparent: true, opacity: 0.45 }), Math.max(1, pollenCount));
  pollen.visible = pollenCount > 0;
  env.add(bugs, fireflies, pollen);
  const bugColors = ['#FFD93D', '#FF8FB1', '#9AD8FF', '#FFFFFF'];
  for (let i = 0; i < bugCount; i++) bugs.setColorAt(i, color.set(bugColors[i % bugColors.length]));

  const _q = new THREE.Quaternion();
  const _qy = new THREE.Quaternion();
  const _axis = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);
  let leavesStill = false;
  return (elapsed: number) => {
    time.value = elapsed;
    const wind = windFactor();
    windUniform.value = wind;
    // ART2 : brise dans les arbres : le tronc ne bouge pas, le feuillage tourne d'un bloc (2° au plus),
    // lentement (cycle de 3 à 5 s), avec un décalage par arbre. Aucune déformation.
    if (wind > 0 || !leavesStill) {
      for (let k = 0; k < leafInfo.length; k++) {
        const L = leafInfo[k];
        const tp = treePhase[L.tree];
        const ang = wind * ((2 * Math.PI) / 180) * Math.sin((elapsed / tp.period) * Math.PI * 2 + tp.phase);
        _axis.set(Math.cos(tp.phase), 0, Math.sin(tp.phase));
        _q.setFromAxisAngle(_axis, ang);
        _p.copy(L.off).applyQuaternion(_q).add(L.pivot);
        _qy.setFromAxisAngle(_up, L.rotY);
        dummy.position.copy(_p);
        dummy.quaternion.copy(_q).multiply(_qy);
        dummy.scale.copy(L.scale);
        dummy.updateMatrix();
        leaves.setMatrixAt(k, dummy.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
      leavesStill = wind === 0;
    }
    const night = nightFactor;
    bugs.visible = night < 0.5;
    fireflyMat.opacity = Math.min(1, night * 1.4);
    fireflies.visible = night > 0.05;
    for (let i = 0; i < bugCount; i++) {
      const [a0, r, ph] = bugSeeds[i];
      const a = a0 + elapsed * 0.25 + Math.sin(elapsed * 0.7 + ph) * 0.4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 1.2 + Math.sin(elapsed * 2.3 + ph) * 0.5;
      if (bugs.visible) {
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, -a, Math.sin(elapsed * 18 + ph) * 0.9); // battement d'ailes
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        bugs.setMatrixAt(i, dummy.matrix);
      }
      if (fireflies.visible) {
        for (let k = 0; k < 2; k++) {
          dummy.position.set(x * 0.8 + k * 1.3, 0.6 + Math.sin(elapsed * 1.3 + ph + k) * 0.5 + k * 0.4, z * 0.8 - k);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.6 + 0.4 * Math.sin(elapsed * 4 + ph * 3 + k));
          dummy.updateMatrix();
          fireflies.setMatrixAt(i * 2 + k, dummy.matrix);
        }
      }
    }
    bugs.instanceMatrix.needsUpdate = true;
    fireflies.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < pollenCount; i++) {
      const ph = i * 1.7;
      dummy.position.set(Math.sin(ph) * flat * 0.8 + Math.sin(elapsed * 0.2 + ph) * 2, 1 + ((elapsed * 0.15 + i * 0.37) % 3), Math.cos(ph * 1.3) * flat * 0.8);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      pollen.setMatrixAt(i, dummy.matrix);
    }
    if (pollenCount) pollen.instanceMatrix.needsUpdate = true;
  };
}
