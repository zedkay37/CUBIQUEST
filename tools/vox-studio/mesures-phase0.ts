/**
 * Phase 0 du sprint BESTIAIRE : mesures reproductibles du chargeur .vox du jeu (sans navigateur).
 *   npx tsx tools/vox-studio/mesures-phase0.ts
 * - triangles et maillages d'un .vox de référence construit par le chargeur du jeu, contre les modèles du code ;
 * - question 1 : où vont les pieds d'un quadrupède quand la patte gauche (avant + arrière) tourne d'un bloc ;
 * - question 2 : yeux détectés, et position du pivot de clignement ;
 * - question 3 : taille réelle d'un bloc ;
 * - question 6 : part de lueur en surface.
 */
import { readFileSync } from 'node:fs';
import { installHeadlessDom } from '../headlessDom';

installHeadlessDom();
type ThreeNs = typeof import('three');
const THREE: ThreeNs = await import('three');
const { SPECIES } = await import('../../src/game/catalog');
const { buildLegacyCreature, buildSculptCreature, setSculptDetail, setSculptModels } = await import('../../src/game/models/creatures');
const { parseVox, registerVoxModel, voxToSculptDef } = await import('../../src/game/models/voxFile');
const { SCULPT_DEFS } = await import('../../src/game/models/sculptDefs');

setSculptModels(true);
const tri = (root: import('three').Object3D) => {
  let t = 0;
  let meshes = 0;
  root.traverse((o: import('three').Object3D) => {
    const m = o as import('three').Mesh;
    if (!m.isMesh || m.geometry instanceof THREE.CircleGeometry) return;
    meshes++;
    const g = m.geometry;
    t += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { t, meshes };
};

const file = process.argv[2] ?? 'tools/vox-studio/references/calcinarque-legendaire.vox';
const buf = readFileSync(file);
const model = parseVox(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
console.log(`fichier ${file} : ${model.voxels.length} voxels, boîte ${model.size.join(' × ')}`);

// --- coût : le .vox à la place de Magmadrake, contre le modèle du code (haut et bas)
registerVoxModel('magmadrake', model);
const vox = tri(buildSculptCreature(SPECIES.magmadrake).root);
registerVoxModel('magmadrake', null);
setSculptDetail('high');
const codeHigh = tri(buildSculptCreature(SPECIES.magmadrake).root);
setSculptDetail('low');
const codeLow = tri(buildSculptCreature(SPECIES.magmadrake).root);
setSculptDetail('high');
console.log(`triangles : .vox ${vox.t} (${vox.meshes} maillages) ; Magmadrake du code ${codeHigh.t} en qualité haute, ${codeLow.t} en qualité basse`);
const legacy = ['bourgeoliath', 'glaciatitan', 'tempestrix'].map((id) => `${id} ${tri(buildLegacyCreature(SPECIES[id]).root).t}`);
console.log(`modèles anciens (pour comparer) : ${legacy.join(', ')}`);
console.log(`combat le plus chargé (3 alliés + 3 ennemis) avec 6 .vox de ce type : ${6 * vox.t} triangles de créatures`);

// --- question 1 : pattes d'un même côté = une seule pièce qui tourne autour d'un pivot unique
const def = voxToSculptDef(model);
const legL = def.voxels!.filter((v) => v.group === 'legL');
const ys = legL.map((v) => v.y);
const zs = legL.map((v) => v.z);
const top = Math.max(...ys) + 1;
const pivotZ = (Math.min(...zs) + Math.max(...zs) + 1) / 2;
const zFront = Math.max(...zs) + 0.5;
const zBack = Math.min(...zs) + 0.5;
const angle = 0.45; // amplitude de engine/actors.ts (rotation.x = sin(pas) × 0,45)
const foot = (z: number) => {
  // pied (y = 0) tourné de `angle` autour de l'axe X passant par (top, pivotZ)
  const dy = 0 - top;
  const dz = z - pivotZ;
  return { y: top + dy * Math.cos(angle) - dz * Math.sin(angle), z: pivotZ + dy * Math.sin(angle) + dz * Math.cos(angle) };
};
const f1 = foot(zFront);
const f2 = foot(zBack);
console.log(
  `Q1 patte gauche : ${legL.length} blocs, de z=${Math.min(...zs)} à ${Math.max(...zs)} (avant et arrière ensemble), pivot à y=${top}, z=${pivotZ}`,
);
console.log(`   au pas extrême : pied avant à y=${f1.y.toFixed(1)} bloc(s) (sous le sol si < 0), pied arrière à y=${f2.y.toFixed(1)}`);
// proposition : séparer avant / arrière (même seuil que le milieu du corps) → chaque patte tourne autour de son épaule
const front = legL.filter((v) => v.z >= pivotZ);
const frontTop = Math.max(...front.map((v) => v.y)) + 1;
const fz = (Math.min(...front.map((v) => v.z)) + Math.max(...front.map((v) => v.z)) + 1) / 2;
const dyF = 0 - frontTop;
console.log(
  `   avec avant/arrière séparés : le pied avant se lève de ${(frontTop + dyF * Math.cos(angle)).toFixed(1)} bloc(s) et avance de ${(-dyF * Math.sin(angle)).toFixed(1)} (pivot à z=${fz})`,
);

// --- question 2 : yeux
const eyes = def.voxels!.filter((v) => v.group.startsWith('eye'));
const snout = Math.max(...def.voxels!.map((v) => v.z));
console.log(`Q2 yeux : ${eyes.length} blocs (${def.eyes?.join(' + ')}), ${snout - Math.max(...eyes.map((v) => v.z))} bloc(s) derrière le bout du museau`);

// --- question 3 : échelle
const unit = SPECIES.magmadrake.scale * 1.18;
console.log(
  `Q3 un bloc de fichier = 1/14 d'unité × échelle de l'espèce ; en Magmadrake : ${((1 / 14) * unit).toFixed(3)} unité de monde ; hauteur ${model.size[2]} blocs = ${((model.size[2] / 14) * unit).toFixed(2)} (Magmadrake du code : ${((25 / 14) * unit).toFixed(2)})`,
);
void SCULPT_DEFS;

// --- question 6 : lueur en surface
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
const set = new Set(model.voxels.map((v) => key(v.x, v.y, v.z)));
let surf = 0;
let glow = 0;
for (const v of model.voxels) {
  const out = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([a, b, c]) => !set.has(key(v.x + a, v.y + b, v.z + c)));
  if (!out) continue;
  surf++;
  if (v.i >= 240 && v.i <= 247) glow++;
}
console.log(`Q6 lueur en surface : ${glow} / ${surf} (${((100 * glow) / surf).toFixed(1)} %)`);
