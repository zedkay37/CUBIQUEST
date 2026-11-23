/**
 * Recensement des maillages d'une scène, sans navigateur : `npm run census -- tundra-3 canyon-3`.
 *
 * Complète l'overlay `?debug=1` : ici les nombres sont exactement reproductibles (même instant de
 * la même simulation), donc comparables avant / après une optimisation de rendu.
 * Ordre de grandeur des appels de dessin d'une image : maillages + maillages qui projettent une ombre.
 * Le camp est toujours recensé ; les niveaux sont passés en arguments.
 */
import * as THREE from 'three';

import { installHeadlessDom } from './headlessDom';

installHeadlessDom();
const { STAGES } = await import('../src/game/catalog');
const { getReferenceConfig } = await import('../src/game/previewConfigs');
const { createOwnedCreature } = await import('../src/game/rules');
const { VoxelEngine } = await import('../src/game/VoxelEngine');

function census(label: string, root: THREE.Object3D): void {
  let meshes = 0;
  let instanced = 0;
  let casters = 0;
  let tris = 0;
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes += 1;
    if ((o as THREE.InstancedMesh).isInstancedMesh) instanced += 1;
    if (m.castShadow) casters += 1;
    geos.add(m.geometry);
    const idx = m.geometry.index;
    const count = (idx ? idx.count : m.geometry.attributes.position.count) / 3;
    tris += count * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mats.add(mat);
  });
  console.log(
    `${label.padEnd(26)} maillages ${String(meshes).padStart(4)} (instanciés ${String(instanced).padStart(2)})  ombres ${String(casters).padStart(4)}  géométries ${String(geos.size).padStart(4)}  matériaux ${String(mats.size).padStart(4)}  triangles ${Math.round(tris)}`,
  );
}

const noop = (): void => {};
for (const id of ['camp', ...process.argv.slice(2)]) {
  const engine = new VoxelEngine(null, { onHudUpdate: noop, onExpeditionComplete: noop }, { headless: true });
  engine.setScreenState('playing');
  if (id === 'camp') {
    const squad = ['pyrocube', 'aquabloc', 'bourgeon'].map((s, i) => createOwnedCreature(s, 8, 0, `c_${i}`));
    engine.loadCampScene(squad);
  } else {
    const stage = STAGES.find((s) => s.id === id)!;
    const config = getReferenceConfig(stage);
    const squad = config.squad.map((s, i) => createOwnedCreature(s, config.level, config.bonus, `c_${i}`));
    engine.startExpedition(stage, squad, [], 'auto');
  }
  for (let i = 0; i < 120; i++) engine.stepSimulation(1 / 60);
  console.log(`== ${id}`);
  census('  décor (worldGroup)', engine.worldGroup);
  census('  acteurs (actorsGroup)', engine.actorsGroup);
  census('  effets (fxGroup)', engine.fxGroup);
  census('  scène entière', engine.scene);
  engine.dispose();
}
