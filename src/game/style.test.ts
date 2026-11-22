import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom } from '../../tools/headlessDom';
import { MOVES, RECIPES, SPECIES, STAGES } from './catalog';
import { checkMoveStyle, checkSpeciesStyle, getEvolutionTier } from './styleGuide';
import { buildVoxelCreature } from './voxelModels';

installHeadlessDom();

test('Style: chaque créature respecte les plages de STYLE.md', () => {
  const issues = Object.values(SPECIES).flatMap((s) => checkSpeciesStyle(s));
  assert.deepEqual(issues, []);
});

test('Style: chaque sort respecte les plages de STYLE.md', () => {
  const issues = Object.keys(MOVES).flatMap((id) => checkMoveStyle(id));
  assert.deepEqual(issues, []);
});

test('Style: lignées — 2 ou 3 stades, même élément, un seul changement de rôle, niveaux d\'évolution croissants', () => {
  const bases = Object.values(SPECIES).filter((s) => getEvolutionTier(s) === 'base');
  const seen = new Set<string>();
  for (const base of bases) {
    const chain = [base];
    while (chain[chain.length - 1].evolvesTo) chain.push(SPECIES[chain[chain.length - 1].evolvesTo!]);
    assert.ok(chain.length === 2 || chain.length === 3, base.id);
    for (const s of chain) {
      assert.equal(s.element, base.element, s.id);
      assert.equal(seen.has(s.id), false, `${s.id} appartient à deux lignées`);
      seen.add(s.id);
    }
    let roleChanges = 0;
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].role !== chain[i - 1].role) roleChanges += 1;
      assert.ok(chain[i].scale > chain[i - 1].scale, `${chain[i].id} doit être plus grand que le stade précédent`);
      assert.ok(chain[i].baseHp + chain[i].baseAtk > chain[i - 1].baseHp + chain[i - 1].baseAtk);
    }
    assert.ok(roleChanges <= 1, base.id);
    const levels = chain.map((s) => s.evolveLevel).filter((l): l is number => l !== undefined);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] > levels[i - 1], base.id);
    assert.equal(chain[chain.length - 1].isRare, true);
  }
  // aucune espèce orpheline
  assert.equal(seen.size, Object.keys(SPECIES).length);
});

test('Style: chaque créature se recrute à la Marmite et son modèle voxel se construit', () => {
  for (const species of Object.values(SPECIES)) {
    assert.ok(
      RECIPES.some((r) => r.poolSpeciesIds.includes(species.id)),
      `${species.id} n'est dans aucun vivier de recette`,
    );
    const rig = buildVoxelCreature(species.id);
    let blocks = 0;
    rig.root.traverse((node) => {
      if ((node as { isMesh?: boolean }).isMesh) blocks += 1;
    });
    blocks -= 1; // ombre de contact
    assert.ok(blocks >= 11 && blocks <= 30, `${species.id} : ${blocks} blocs (attendu 11 à 30)`);
    assert.equal(rig.flashMaterials.length, 4);
    assert.equal(rig.root.scale.x, species.scale);
  }
});

test('Style: structure des niveaux — 3 vagues, boss en dernière vague, 2 à 3 niveaux au-dessus de l\'escorte', () => {
  for (const stage of STAGES) {
    assert.equal(stage.waves.length, 3, stage.id);
    assert.equal(stage.waves[0].enemies.length + stage.waves[1].enemies.length >= 5, true, stage.id);
    const last = stage.waves[2].enemies;
    assert.equal(last.length, 2, stage.id);
    const boss = last.find((e) => e.isBoss)!;
    const escort = last.find((e) => !e.isBoss)!;
    assert.equal(boss.ai, 'boss', stage.id);
    assert.equal(boss.speciesId, stage.bossSpeciesId, stage.id);
    assert.ok(boss.level - escort.level >= 2 && boss.level - escort.level <= 3, stage.id);
    assert.ok(stage.dropIngredients.length >= 3 && stage.dropIngredients.length <= 4, stage.id);
    if (stage.stageNumber === 3) assert.equal(SPECIES[stage.bossSpeciesId].isRare, true, stage.id);
  }
});
