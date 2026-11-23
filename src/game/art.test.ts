/**
 * Sprint Art, section 1 : règles de style des créatures sculptées (voxelSculpt.ts), vérifiées sans rendu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCULPT_DEFS } from './models/sculptDefs';
import { exposedVoxels, voxelize, type Voxel } from './models/voxelSculpt';
import { SPECIES } from './catalog';

const RES_HIGH = 14;
const RES_LOW = 9;
const span = (list: Voxel[], k: 'x' | 'y' | 'z') => Math.max(...list.map((v) => v[k])) - Math.min(...list.map((v) => v[k])) + 1;

for (const [id, def] of Object.entries(SCULPT_DEFS)) {
  test(`Art (${id}) : parties épaisses, tête 30-40 %, yeux 2×2 avec reflet, 3 à 5 couleurs, budget de blocs`, () => {
    assert.ok(SPECIES[id], id);
    const v = voxelize(def, RES_HIGH);
    const groups = [...new Set(v.map((x) => x.group))];
    // aucune partie de moins de 2 blocs d'épaisseur
    for (const g of groups) {
      const list = v.filter((x) => x.group === g);
      assert.ok(Math.min(span(list, 'x'), span(list, 'y'), span(list, 'z')) >= 2, `${id} / ${g}`);
    }
    // tête (yeux compris, sans les ornements) entre 30 et 40 % de la hauteur
    const head = v.filter((x) => x.group === 'head' || x.group.startsWith('eye'));
    const ratio = span(head, 'y') / span(v, 'y');
    assert.ok(ratio >= 0.3 && ratio <= 0.4, `${id} : tête ${Math.round(ratio * 100)} %`);
    // deux yeux d'au moins 2 × 2 blocs, chacun avec un reflet blanc
    for (const eye of ['eyeL', 'eyeR']) {
      const list = v.filter((x) => x.group === eye);
      assert.ok(span(list, 'x') >= 2 && span(list, 'y') >= 2, `${id} / ${eye}`);
      assert.ok(list.some((x) => x.color === 'white'), `${id} / ${eye} : reflet`);
    }
    // 3 à 5 couleurs (hors yeux)
    const colors = new Set(v.filter((x) => x.color !== 'eye' && x.color !== 'white').map((x) => x.color));
    assert.ok(colors.size >= 3 && colors.size <= 5, `${id} : ${colors.size} couleurs`);
    // budget : au plus 2 500 blocs visibles en qualité Haut, et moins en qualité Bas
    const moving = new Set([...(def.legs ?? []), ...(def.extras ?? []).map((e) => e.group), ...(def.eyes ?? [])]);
    const high = exposedVoxels(v, moving).length;
    const low = exposedVoxels(voxelize(def, RES_LOW), moving).length;
    assert.ok(high <= 2500, `${id} : ${high} blocs visibles`);
    assert.ok(low < high, `${id} : version simplifiée`);
  });
}

test('Art : les trois lignées du trio Braise sont refaites, évolutions comprises', () => {
  for (const base of ['pyrocube', 'voltik', 'cailloc']) {
    let id: string | undefined = base;
    while (id) {
      assert.ok(SCULPT_DEFS[id], id);
      id = SPECIES[id].evolvesTo;
    }
  }
});

test('ART2 (couleurs) : tons nets, tête distincte, détails sombres, bruit de surface ±4 % au plus', async () => {
  const { art2Palette, contrast, ART2_AO_STRENGTH } = await import('./models/artPalette');
  // trois voisins au plus assombrissent un coin : ±4 % de luminosité au maximum
  assert.ok(ART2_AO_STRENGTH * 3 <= 0.04);
  for (const id of Object.keys(SCULPT_DEFS)) {
    const t = art2Palette(SPECIES[id].palette);
    for (const [part, c] of [['tête', t.head], ['détails', t.secondary], ['ventre', t.belly], ['accent', t.accent]] as const) {
      assert.ok(contrast(c, t.primary) >= 0.15, `${id} : ${part} ${Math.round(contrast(c, t.primary) * 100)} %`);
    }
  }
});
