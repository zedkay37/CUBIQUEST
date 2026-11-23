import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_POINTS, COLLECTION_TIERS, SUMMON } from './balance';
import { ACHIEVEMENTS, SPECIES } from './catalog';
import {
  claimableCollectionTiers,
  claimCollectionTier,
  collectionBreakdown,
  collectionLevel,
  collectionPoints,
  isEvolvedForm,
  nextCollectionTier,
} from './collection';
import { countClaimableRewards, createInitialSaveState, createOwnedCreature, migrateSaveState } from './rules';
import { lineageOf } from './summon';
import { FR } from '../i18n/fr';
import type { SaveState } from './types';

/** Partie neuve sans Rune : seules les formes de départ comptent. */
function bare(): SaveState {
  const s = createInitialSaveState('braise', true);
  return {
    ...s,
    runeBag: Object.fromEntries(Object.keys(s.runeBag).map((k) => [k, 0])) as SaveState['runeBag'],
    roster: s.roster.map((c) => ({ ...c, runes: [null, null] })),
  };
}

test('Collection : points calculés catégorie par catégorie', () => {
  const s = bare();
  const forms = new Set(s.roster.map((c) => c.speciesId)).size;
  assert.equal(collectionPoints(s), forms * COLLECTION_POINTS.ownedForm);

  const evolved = Object.values(SPECIES).filter((sp) => isEvolvedForm(sp.id));
  assert.ok(evolved.length > 0 && !isEvolvedForm('pyrocube'));
  const twoEvolved = evolved.slice(0, 2).map((sp) => sp.id);
  const rich: SaveState = {
    ...s,
    // une forme évoluée possédée compte comme forme possédée ET comme évolution vue
    roster: [...s.roster, createOwnedCreature(twoEvolved[0], 20, 0, 'evo_1')],
    discoveredSpeciesIds: [...s.discoveredSpeciesIds, ...twoEvolved, twoEvolved[0], 'espece_fantome'],
    bonds: { pyrocube: 2.9, voltik: 5, cailloc: 99, bourgeon: -3 },
    variantsUnlocked: ['voltik'],
    runeBag: { ...s.runeBag, rune_force: 2 },
    claimedAchievementIds: [ACHIEVEMENTS[0].id, ACHIEVEMENTS[1].id, 'succes_inconnu'],
  };
  rich.roster[0] = { ...rich.roster[0], runes: ['rune_force', 'rune_cadence'] };
  const b = collectionBreakdown(rich);
  assert.equal(b.ownedForms, forms + 1);
  assert.equal(b.evolutionsSeen, 2);
  assert.equal(b.bondStars, 2 + 5 + SUMMON.bondMax); // parties entières, bornées à 0..5
  assert.equal(b.variants, 1);
  assert.equal(b.runes, 2); // Force (en sac et équipée : une fois) + Cadence (équipée)
  assert.equal(b.achievements, 2);
  assert.equal(
    b.total,
    (forms + 1) * 10 + 2 * 5 + 12 * 3 + 8 + 2 * 5 + 2 * 4,
  );
  assert.deepEqual(COLLECTION_POINTS, { ownedForm: 10, evolutionSeen: 5, bondStar: 3, variant: 8, rune: 5, achievement: 4 });
});

test('Collection : paliers croissants, cubes de Bois à Prisme, titres nommés dans fr.ts', () => {
  for (let i = 1; i < COLLECTION_TIERS.length; i++) assert.ok(COLLECTION_TIERS[i].at > COLLECTION_TIERS[i - 1].at);
  assert.equal(COLLECTION_TIERS[0].cubes[0], 'wood');
  assert.deepEqual(COLLECTION_TIERS.at(-1)!.cubes, ['prism']);
  assert.ok(COLLECTION_TIERS.slice(0, -1).every((t) => !t.cubes.includes('prism')));
  for (const t of COLLECTION_TIERS) for (const id of t.titles ?? []) assert.ok(FR.ui.carnet.titres[id], id);
  // le dernier palier est atteignable : toutes les sources de points réunies le dépassent
  const lineages = Object.keys(SPECIES).filter((id) => lineageOf(id) === id);
  const max =
    Object.keys(SPECIES).length * 10 +
    Object.keys(SPECIES).filter(isEvolvedForm).length * 5 +
    lineages.length * SUMMON.bondMax * 3 +
    lineages.length * 8 +
    6 * 5 +
    ACHIEVEMENTS.length * 4;
  assert.ok(max >= COLLECTION_TIERS.at(-1)!.at, `${max}`);
});

test('Collection : un palier se réclame une seule fois, et seulement une fois atteint', () => {
  const s = bare();
  const first = COLLECTION_TIERS[0];
  assert.ok(collectionPoints(s) < first.at);
  assert.equal(claimCollectionTier(s, first.at), s); // pas encore atteint
  assert.equal(nextCollectionTier(s)?.at, first.at);
  assert.equal(collectionLevel(s), 0);

  // assez de points : formes possédées en plus
  const extra = Object.keys(SPECIES).filter((id) => !s.roster.some((c) => c.speciesId === id)).slice(0, 3);
  const ready: SaveState = { ...s, roster: [...s.roster, ...extra.map((id, i) => createOwnedCreature(id, 5, 0, `x_${i}`))] };
  assert.ok(collectionPoints(ready) >= first.at);
  assert.deepEqual(claimableCollectionTiers(ready).map((t) => t.at), [first.at]);
  assert.equal(collectionLevel(ready), 1);
  assert.equal(countClaimableRewards(ready), 1);

  const claimed = claimCollectionTier(ready, first.at);
  assert.deepEqual(claimed.collectionTiersClaimed, [first.at]);
  assert.deepEqual(claimed.sealedCubes.map((c) => c.material), first.cubes);
  for (const [el, n] of Object.entries(first.baits ?? {})) assert.equal(claimed.baits[el as 'fire'], (ready.baits[el as 'fire'] ?? 0) + n);
  assert.deepEqual(claimableCollectionTiers(claimed), []);
  assert.equal(countClaimableRewards(claimed), 0);
  // deuxième clic : rien ne change
  assert.equal(claimCollectionTier(claimed, first.at), claimed);
  // palier inconnu : rien
  assert.equal(claimCollectionTier(claimed, 51), claimed);
  // la réclamation survit à la sauvegarde
  assert.deepEqual(migrateSaveState(JSON.parse(JSON.stringify(claimed)))!.collectionTiersClaimed, [first.at]);
});

test('Collection : un palier à titre ajoute le titre sans doublon', () => {
  const tier = COLLECTION_TIERS.find((t) => t.titles?.length)!;
  const s: SaveState = { ...bare(), titles: [tier.titles![0]] };
  // points suffisants simulés par des Liens pleins sur assez de lignées fictives
  const needed = Math.ceil(tier.at / (SUMMON.bondMax * 3)) + 1;
  const bonds = Object.fromEntries(Array.from({ length: needed }, (_, i) => [`l_${i}`, SUMMON.bondMax]));
  const rich: SaveState = { ...s, bonds };
  const claimed = claimCollectionTier(rich, tier.at);
  assert.ok(claimed.collectionTiersClaimed.includes(tier.at));
  assert.equal(claimed.titles.filter((t) => t === tier.titles![0]).length, 1);
  for (const t of tier.titles!) assert.ok(claimed.titles.includes(t));
});
