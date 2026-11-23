import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, STAGES } from './catalog';
import {
  addPowerStoneToBag,
  applyExpeditionRewards,
  buildPreviewSave,
  computeCreatureStats,
  createInitialSaveState,
  createOwnedCreature,
  importSaveFromJson,
  lineageOf,
  loadSaveState,
  markFirstTimeSeen,
  migrateSaveState,
  normalizeCreature,
  normalizePowerStone,
  POWER_STONE_BAG_LIMIT,
  SAVE_BACKUP_STORAGE_KEY,
  SAVE_STORAGE_KEY,
  SAVE_VERSION,
} from './rules';
import type { PowerStone, SaveState } from './types';
import { SAVE_V3_FIXTURE } from './saveV3.fixture';
import { KITCHEN_EARLY, KITCHEN_LATE, KITCHEN_MID, REMOVED_KITCHEN_QUEST_ID } from './saveKitchen.fixture';
import { withSaveSlot } from './saveSlot';
import { LEGACY_QUEST_IDS, LEGACY_STAT_FIELDS } from './legacyIds';
import { normalizedTerms, normalizeText } from '../../tools/lexiqueCore';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

test('Sauvegarde: une créature abîmée est réparée au lieu de faire planter le jeu', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  const broken = clone(fresh) as unknown as Record<string, unknown>;
  const roster = broken.roster as Record<string, unknown>[];
  // créature sans pierres de capacité, sort inconnu, grille tronquée, niveau absurde, XP négative
  roster[0] = { uid: 'starter_1', speciesId: 'pyrocube', level: 999, xp: -5, moveId: 'sort_inconnu', stoneBoard: [] };
  // espèce inconnue : la créature est écartée
  roster[1] = { ...roster[1], speciesId: 'espece_fantome' };
  // doublon d'identifiant : seule la première est gardée
  roster.push({ ...roster[2] });

  const migrated = migrateSaveState(broken);
  assert.ok(migrated !== null);
  const starter = migrated.roster[0];
  assert.equal(starter.level, 50);
  assert.equal(starter.xp, 0);
  assert.equal(starter.potBonus, 0);
  assert.equal(starter.moveId, SPECIES.pyrocube.moveId);
  assert.deepEqual(starter.runes, [null, null]);
  assert.equal(starter.stoneBoard.length, 9);
  assert.ok(starter.stoneBoard.every((slot) => slot.stoneId === null));
  assert.equal(migrated.roster.some((c) => c.speciesId === 'espece_fantome'), false);
  assert.equal(new Set(migrated.roster.map((c) => c.uid)).size, migrated.roster.length);
  // l'escouade ne référence que des créatures restantes, sans doublon
  assert.ok(migrated.squadIds.length >= 1 && migrated.squadIds.length <= 3);
  for (const uid of migrated.squadIds) assert.ok(migrated.roster.some((c) => c.uid === uid));
  // le jeu sait calculer les stats de la créature réparée (c'est ce qui plantait)
  assert.ok(computeCreatureStats(starter, migrated.powerStones).power > 0);

  assert.equal(normalizeCreature(null, new Set()), null);
  assert.equal(normalizeCreature({ uid: '', speciesId: 'pyrocube' }, new Set()), null);
});

test('Sauvegarde: pierres, sac et compteurs invalides sont nettoyés', () => {
  const fresh = createInitialSaveState('aquabloc', true);
  const broken = clone(fresh) as unknown as Record<string, unknown>;
  broken.powerStones = [
    ...(broken.powerStones as unknown[]),
    { id: 'sans_stats', kind: 'atk', power: 40, rarity: 'gold' }, // pas de tableau substats
    { id: 'init_stone_atk_2', kind: 'atk', power: 999, rarity: 'gold', substats: [] }, // identifiant en double
    { id: 'type_inconnu', kind: 'vitesse', power: 10, rarity: 'common', substats: [] },
    { id: 'puissance_nulle', kind: 'hp', power: 'beaucoup', rarity: 'common', substats: [] },
    null,
  ];
  broken.runeBag = { rune_ampleur: -2, rune_cadence: 'x', rune_partage: 2.7 };
  broken.stats = { expeditionsWon: -3, triosTriggered: 'beaucoup', burstsTriggered: 4 };
  broken.expeditionsCompleted = 'trois';
  broken.completedStageIds = ['meadow-1', 'meadow-1', 'niveau_fantome', 42];
  broken.discoveredSpeciesIds = ['pyrocube', 'pyrocube', 'espece_fantome'];
  broken.claimedAchievementIds = ['ach_first_win', 'ach_first_win', 'succes_fantome'];
  broken.highestStageIndex = 'loin';

  const m = migrateSaveState(broken);
  assert.ok(m !== null);
  assert.equal(m.powerStones.filter((s) => s.id === 'init_stone_atk_2').length, 1);
  assert.equal(m.powerStones.find((s) => s.id === 'init_stone_atk_2')!.power, 36);
  assert.deepEqual(m.powerStones.find((s) => s.id === 'sans_stats')!.substats, []);
  assert.equal(m.powerStones.some((s) => s.id === 'type_inconnu' || s.id === 'puissance_nulle'), false);
  assert.deepEqual(m.runeBag, { rune_ampleur: 0, rune_cadence: 0, rune_force: 0, rune_partage: 2, rune_precision: 0, rune_vigueur: 0 });
  assert.equal(m.stats.expeditionsWon, 0);
  assert.equal(m.stats.triosTriggered, 0);
  assert.equal(m.stats.burstsTriggered, 4);
  assert.equal(m.expeditionsCompleted, 0);
  assert.deepEqual(m.completedStageIds, ['meadow-1']);
  assert.equal(m.highestStageIndex, 1); // déduit du niveau terminé
  assert.equal(m.discoveredSpeciesIds.includes('espece_fantome'), false);
  assert.equal(new Set(m.discoveredSpeciesIds).size, m.discoveredSpeciesIds.length);
  for (const c of m.roster) assert.ok(m.discoveredSpeciesIds.includes(c.speciesId));
  assert.deepEqual(m.claimedAchievementIds, ['ach_first_win']);

  assert.equal(normalizePowerStone({ id: 'ok', kind: 'hp', power: 12.4, rarity: 'inconnue', substats: [{ type: 'critRate', value: 5 }, { type: 'magie', value: 1 }] })?.rarity, 'common');
  assert.equal(normalizePowerStone('pierre'), null);
});

test('Sauvegarde: une pierre ne peut être équipée qu\'une fois, et une pierre disparue libère son emplacement', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  const broken = clone(fresh);
  // la même pierre sur deux créatures + une pierre qui n'existe plus
  broken.roster[1].stoneBoard[0].stoneId = 'init_stone_atk_1';
  broken.roster[2].stoneBoard[0].stoneId = 'pierre_disparue';
  const m = migrateSaveState(broken)!;
  const holders = m.roster.filter((c) => c.stoneBoard.some((s) => s.stoneId === 'init_stone_atk_1'));
  assert.equal(holders.length, 1);
  assert.equal(holders[0].uid, 'starter_1');
  assert.equal(m.roster[2].stoneBoard[0].stoneId, null);
});

test('Migration v9 -> v10 (A3.2) : quêtes supprimées, récompenses en attente accordées une fois', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  const v9 = clone(fresh) as unknown as Record<string, unknown>;
  delete v9.collectionTiersClaimed;
  delete v9.titles;
  v9.version = 9;
  v9.unlocksSeen = ['camp', 'quests'];
  v9.activeQuests = [
    // terminée, pas réclamée : Appât Eau + Rune de Cadence
    { uid: 'quest_a', templateId: 'q_ult_1', title: 'x', description: 'x', metric: 'ultimatesUsed', progress: 1, target: 1, reward: { label: 'x' } },
    // pas finie : rien
    { uid: 'quest_b', templateId: 'q_dodge_2', title: 'x', description: 'x', metric: 'perfectDodges', progress: 1, target: 2, reward: { label: 'x' } },
    // terminée, cube de Bois (+ Rune d'Ampleur)
    { uid: 'quest_c', templateId: 'q_win_3', title: 'x', description: 'x', metric: 'expeditionsWon', progress: 3, target: 3, reward: { label: 'x' } },
    // même quête recopiée (sauvegarde abîmée) : payée une seule fois
    { uid: 'quest_c', templateId: 'q_win_3', progress: 3, target: 3 },
    // quête retirée du jeu (cuisine) ou abîmée : ignorée sans erreur
    { uid: 'quest_d', templateId: REMOVED_KITCHEN_QUEST_ID, progress: 9, target: 1 },
    null,
    12,
  ];
  const m = migrateSaveState(clone(v9))!;
  assert.ok(m);
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 10);
  assert.equal('activeQuests' in m, false);
  assert.deepEqual(m.baits, { water: 1 });
  assert.equal(m.runeBag.rune_cadence, fresh.runeBag.rune_cadence + 1);
  assert.equal(m.runeBag.rune_partage, fresh.runeBag.rune_partage);
  assert.equal(m.runeBag.rune_ampleur, fresh.runeBag.rune_ampleur + 1);
  assert.deepEqual(m.sealedCubes.map((c) => c.material), ['wood']);
  assert.deepEqual(m.collectionTiersClaimed, []);
  assert.deepEqual(m.titles, []);
  // la pastille vue des quêtes vaut pour le Carnet
  assert.deepEqual(m.unlocksSeen, ['camp', 'carnet']);
  // une quête qui donnait un Galet le tire avec le rng fourni
  const withStone = migrateSaveState({ ...clone(v9), activeQuests: [{ uid: 'q', templateId: Object.keys(LEGACY_QUEST_IDS)[0], progress: 5, target: 3 }] }, () => 0.5)!;
  assert.equal(withStone.powerStones.length, fresh.powerStones.length + 1);
  assert.equal(withStone.powerStones[0].rarity, 'silver');
  // stable : la v10 ne redonne rien
  assert.deepEqual(migrateSaveState(clone(m)), m);
  // champs v10 normalisés : paliers et titres inconnus ignorés, doublons retirés
  const n = migrateSaveState({ ...clone(m), collectionTiersClaimed: [50, 50, 7, 'x', 120], titles: ['titre_pisteur', 'inconnu', 'titre_pisteur', 3] })!;
  assert.deepEqual(n.collectionTiersClaimed, [50, 120]);
  assert.deepEqual(n.titles, ['titre_pisteur']);
});

test('Sauvegarde: imports JSON invalides refusés avec un message, jamais d\'exception', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  const bad: string[] = [
    '',
    '   ',
    'null',
    '42',
    '"texte"',
    '[]',
    '[1,2,3]',
    '{}',
    '{"version":3}',
    JSON.stringify({ ...fresh, roster: [] }),
    JSON.stringify({ ...fresh, roster: 'beaucoup' }),
    JSON.stringify({ ...fresh, roster: [{ uid: 'x', speciesId: 'espece_fantome' }] }),
    JSON.stringify({ ...fresh, squadIds: null }),
    JSON.stringify({ ...fresh, version: SAVE_VERSION + 1 }),
    JSON.stringify({ ...fresh, version: '3' }),
    '{"roster": [',
  ];
  for (const raw of bad) {
    const res = importSaveFromJson(raw);
    assert.equal(res.ok, false, raw.slice(0, 40));
    if (!res.ok) assert.ok(res.error.length > 10);
  }
  // une sauvegarde valide de chaque version passe toujours (v1, v2, v3)
  for (const version of [1, 2, 3]) {
    const res = importSaveFromJson(JSON.stringify({ ...fresh, version }));
    assert.equal(res.ok, true, `version ${version}`);
    if (res.ok) assert.equal(res.save.version, SAVE_VERSION);
  }
  // champs facultatifs absents : valeurs par défaut
  const minimal = importSaveFromJson(JSON.stringify({ version: 1, roster: fresh.roster, squadIds: fresh.squadIds }));
  assert.equal(minimal.ok, true);
  if (minimal.ok) {
    assert.deepEqual(minimal.save.baits, {});
    assert.deepEqual(minimal.save.sealedCubes, []);
    assert.deepEqual(minimal.save.kitchenConversion, { baits: 0, crystal: 0, stone: 0, bonds: 0 });
    assert.deepEqual(minimal.save.collectionTiersClaimed, []);
    assert.deepEqual(minimal.save.titles, []);
    assert.deepEqual(minimal.save.powerStones, []);
  }
});

test('Sac de pierres: la limite ne retire jamais une pierre équipée', () => {
  let save = createInitialSaveState('pyrocube', true);
  const mk = (i: number): PowerStone => ({ id: `filler_${i}`, kind: 'atk', power: 10 + i, rarity: 'common', substats: [] });
  // sac rempli : les 2 pierres équipées de départ se retrouvent tout au fond (les plus anciennes)
  const fillers = Array.from({ length: POWER_STONE_BAG_LIMIT - save.powerStones.length }, (_, i) => mk(i));
  save = { ...save, powerStones: [...fillers, ...save.powerStones] };
  assert.equal(save.powerStones.length, POWER_STONE_BAG_LIMIT);
  const powerBefore = computeCreatureStats(save.roster[0], save.powerStones).atk;

  const bag = addPowerStoneToBag(save.powerStones, save.roster, mk(900));
  assert.equal(bag.length, POWER_STONE_BAG_LIMIT);
  assert.equal(bag[0].id, 'filler_900');
  assert.ok(bag.some((s) => s.id === 'init_stone_atk_1'), 'pierre équipée conservée');
  assert.ok(bag.some((s) => s.id === 'init_stone_hp_1'), 'pierre équipée conservée');
  // c'est la plus ancienne pierre NON équipée qui part
  assert.equal(bag.some((s) => s.id === 'init_stone_hp_2'), false);
  assert.equal(computeCreatureStats(save.roster[0], bag).atk, powerBefore);

  // bout en bout : une victoire avec le sac plein ne fait pas perdre la pierre équipée
  const { nextSave } = applyExpeditionRewards(save, STAGES[0], true, { clearTimeSec: 10, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 }, () => 0.4);
  assert.equal(nextSave.powerStones.length, POWER_STONE_BAG_LIMIT);
  assert.ok(nextSave.powerStones.some((s) => s.id === 'init_stone_atk_1'));
  assert.equal(computeCreatureStats(nextSave.roster[0], nextSave.powerStones).atk >= powerBefore, true);

  // sous la limite : simple ajout en tête
  assert.equal(addPowerStoneToBag([mk(1)], [], mk(2)).length, 2);
});

test('Aperçu: l\'écran de fin parle de l\'escouade de l\'aperçu, pas de celle de la sauvegarde', () => {
  const save = createInitialSaveState('pyrocube', true);
  const preview = ['ramurgel', 'cryolithe', 'auroramure'].map((id, i) => createOwnedCreature(id, 5, 1100, `preview_${i}`));
  const stage = STAGES.find((s) => s.id === 'tundra-3')!;
  const stats = { clearTimeSec: 40, wavesCleared: 3, damageDealt: 1, bossHpPercentRemaining: 0 };

  const { outcome, nextSave } = applyExpeditionRewards(buildPreviewSave(save, preview), stage, true, stats, () => 0.4);
  assert.ok(outcome.leveledUpNames.length > 0);
  for (const label of outcome.leveledUpNames) {
    assert.ok(/^(Ramurgel|Cryolithe|Auroramure) Niv\.\d+$/.test(label), label);
  }
  // le bug : sans buildPreviewSave, on annonçait les créatures de la sauvegarde
  const wrong = applyExpeditionRewards(save, stage, true, stats, () => 0.4).outcome.leveledUpNames;
  assert.ok(wrong.some((label) => label.startsWith('Pyrocube')));
  // la sauvegarde réelle n'est pas touchée par l'aperçu
  assert.equal(save.roster.length, 3); // S07.1 : plus de quatrième compagnon en réserve
  assert.equal(save.roster[0].level, 4);
  assert.equal(nextSave.roster.length, 3);
});

test('Chargement: une sauvegarde illisible est copiée avant que le jeu ne reparte de zéro', () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  const previous = g.window;
  g.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  };
  try {
    // rien de stocké : partie neuve, aucune copie
    assert.equal(loadSaveState().starterChosen, false);
    assert.equal(store.has(SAVE_BACKUP_STORAGE_KEY), false);

    // JSON tronqué
    store.set(SAVE_STORAGE_KEY, '{"version":3,"roster":[');
    assert.equal(loadSaveState().starterChosen, false);
    assert.equal(store.get(SAVE_BACKUP_STORAGE_KEY), '{"version":3,"roster":[');

    // sauvegarde d'une version plus récente que ce build
    const future = JSON.stringify({ ...createInitialSaveState('bourgeon', true), version: SAVE_VERSION + 1 });
    store.set(SAVE_STORAGE_KEY, future);
    assert.equal(loadSaveState().starterChosen, false);
    assert.equal(store.get(SAVE_BACKUP_STORAGE_KEY), future);

    // sauvegarde valide : chargée, et la copie de secours n'est pas modifiée
    const good = createInitialSaveState('aquabloc', true);
    store.set(SAVE_STORAGE_KEY, JSON.stringify(good));
    const loaded: SaveState = loadSaveState();
    assert.equal(loaded.starterChosen, true);
    assert.equal(loaded.roster[0].speciesId, 'aquabloc');
    assert.equal(store.get(SAVE_BACKUP_STORAGE_KEY), future);
  } finally {
    g.window = previous;
  }
});

test('Sauvegarde: une sauvegarde v3 réaliste se charge en v10 sans perte, identifiants renommés', () => {
  const v3 = clone(SAVE_V3_FIXTURE) as Record<string, any>;
  assert.equal(v3.version, 3);
  const m = migrateSaveState(clone(v3));
  assert.ok(m !== null);
  assert.equal(m.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 10);

  // escouade et créatures : rien ne bouge, sauf le nom du champ des runes équipées
  assert.deepEqual(m.squadIds, v3.squadIds);
  assert.equal(m.roster.length, v3.roster.length);
  m.roster.forEach((c, i) => {
    const { moveStones: _old, ...before } = v3.roster[i];
    const { runes: _now, ...after } = c;
    assert.deepEqual(after, before);
    assert.equal('moveStones' in c, false);
  });
  assert.deepEqual(m.roster[0].runes, ['rune_force', 'rune_vigueur']);
  assert.deepEqual(m.roster[1].runes, ['rune_partage', null]);
  assert.deepEqual(m.roster[2].runes, [null, null]);

  // pierres, sac de runes (renommé, mêmes quantités), progression, compteurs
  assert.deepEqual(m.powerStones, v3.powerStones);
  assert.deepEqual(m.runeBag, {
    // A3.2 : rune_cadence +1, récompense de la quête « q_ult_1 » terminée mais pas réclamée
    rune_ampleur: 2, rune_cadence: 2, rune_force: 2, rune_partage: 0, rune_precision: 1, rune_vigueur: 1,
  });
  assert.equal('moveStoneBag' in m, false);
  assert.deepEqual(m.completedStageIds, v3.completedStageIds);
  assert.equal(m.highestStageIndex, v3.highestStageIndex);
  assert.equal(m.expeditionsCompleted, v3.expeditionsCompleted);
  // statistiques : anciennes réactions -> Éclats (même nombre) ; l'ancien meilleur enchaînement est abandonné
  const otherStats = { ...v3.stats };
  delete otherStats[LEGACY_STAT_FIELDS.bursts];
  delete otherStats[LEGACY_STAT_FIELDS.bestChain];
  // A2.2 : les statistiques de l'ancienne cuisine disparaissent
  delete otherStats.dishesCooked;
  delete otherStats.frontierDishes;
  assert.deepEqual(m.stats, { ...otherStats, burstsTriggered: v3.stats[LEGACY_STAT_FIELDS.bursts], triosTriggered: 0 });
  assert.deepEqual(m.firstTimesSeen, []);
  assert.deepEqual(m.hazardHintsSeen, {});
  // v7 : les niveaux déjà terminés reçoivent l'étoile de victoire
  for (const id of v3.completedStageIds) assert.deepEqual(m.stageStars[id], { win: true, noKo: false, challenge: false });
  assert.deepEqual(m.discoveredSpeciesIds, v3.discoveredSpeciesIds);
  assert.deepEqual(m.claimedAchievementIds, v3.claimedAchievementIds);
  // A2.2 : l'ancienne cuisine est convertie (rouges 19 -> 3 Feu, bleus 17 -> 3 Eau, jaunes 20 -> 4 Foudre,
  // gris 11 -> 2 Roche ; 3 Fragments Mystiques -> 3 cubes Cristal ; le plat en route -> 1 cube Pierre)
  // A3.2 : + les Appâts des quêtes terminées mais pas réclamées (q_win_1 : Feu et Eau ; q_ult_1 : Eau)
  assert.deepEqual(m.baits, { fire: 4, water: 5, electric: 4, rock: 2 });
  assert.deepEqual(m.sealedCubes.map((c) => c.material), ['crystal', 'crystal', 'crystal', 'stone']);
  assert.deepEqual(m.kitchenConversion, { baits: 12, crystal: 3, stone: 1, bonds: 0 }); // la cuisine seule
  for (const gone of Object.keys(KITCHEN_EARLY)) assert.equal(gone in m, false, gone);

  // quêtes : supprimées (A3.2) ; la quête renommée en v5 (q_bursts_3) n'était pas finie : pas de Galet
  assert.equal('activeQuests' in m, false);
  assert.deepEqual(m.powerStones, v3.powerStones);
  assert.ok(v3.activeQuests.some((q: any) => q.templateId in LEGACY_QUEST_IDS));

  // plus aucun ancien nom nulle part dans la sauvegarde chargée (textes de quêtes compris)
  const dump = normalizeText(JSON.stringify(m));
  for (const term of normalizedTerms()) assert.equal(dump.includes(term), false, `ancien terme « ${term} » encore présent`);

  // stable : recharger la v4 ne change plus rien, et elle survit à un export / import
  assert.deepEqual(migrateSaveState(clone(m)), m);
  const round = importSaveFromJson(JSON.stringify(m));
  assert.equal(round.ok, true);
  if (round.ok) assert.deepEqual(round.save, m);
});

test('Sauvegarde: un identifiant inconnu est ignoré sans erreur', () => {
  const v3 = clone(SAVE_V3_FIXTURE) as Record<string, any>;
  v3.moveStoneBag.pierre_fantome = 3;
  v3.roster[2].moveStones = ['pierre_fantome', 12];
  const m = migrateSaveState(v3);
  assert.ok(m !== null);
  assert.equal('pierre_fantome' in m.runeBag, false);
  assert.equal(Object.keys(m.runeBag).length, 6);
  assert.deepEqual(m.roster[2].runes, [null, null]);
  assert.equal(m.roster.length, 4);
});

test('Sauvegarde: sans VITE_SAVE_SLOT (outils, tests), les clés de stockage restent celles d’origine', () => {
  assert.equal(SAVE_STORAGE_KEY, 'cubiquest_save_v2');
  assert.equal(SAVE_BACKUP_STORAGE_KEY, 'cubiquest_save_unreadable_backup');
  assert.equal(withSaveSlot('cle'), 'cle');
});

test('Sauvegarde: les bulles « première fois » sont rangées une fois, les valeurs inconnues ignorées', () => {
  const fresh = createInitialSaveState('pyrocube', true);
  assert.deepEqual(fresh.firstTimesSeen, []);
  const once = markFirstTimeSeen(fresh, 'burst');
  assert.deepEqual(markFirstTimeSeen(once, 'burst').firstTimesSeen, ['burst']);
  const m = migrateSaveState({ ...clone(once), firstTimesSeen: ['burst', 'trio', 'inconnu', 3, 'trio'] });
  assert.deepEqual(m?.firstTimesSeen, ['burst', 'trio']);
});

/** Sauvegarde v8 (d'avant l'Atelier) : la partie neuve, sans les champs v9, avec l'ancienne cuisine et un effectif donné. */
function v8Save(kitchen: object, extraSpecies: string[]): Record<string, unknown> {
  const fresh = clone(createInitialSaveState('pyrocube', true)) as unknown as Record<string, unknown>;
  for (const k of ['sealedCubes', 'cubeCounter', 'baits', 'awakenGauge', 'bonds', 'duplicates', 'variantsUnlocked', 'variantsOn', 'kitchenConversion']) delete fresh[k];
  const extra = extraSpecies.map((id, i) => createOwnedCreature(id, 12, 20, `old_${i}`));
  return { ...fresh, ...clone(kitchen), version: 8, roster: [...(fresh.roster as unknown[]), ...clone(extra)] };
}

test('Migration A2.2 : début de partie (rien à convertir), bilan à zéro pour l’écran de l’Atelier', () => {
  const raw = v8Save(KITCHEN_EARLY, []);
  const m = migrateSaveState(clone(raw))!;
  assert.ok(m);
  assert.equal(m.version, SAVE_VERSION);
  assert.deepEqual(m.baits, {});
  assert.deepEqual(m.sealedCubes, []);
  assert.deepEqual(m.bonds, {});
  assert.deepEqual(m.duplicates, {});
  assert.deepEqual(m.kitchenConversion, { baits: 0, crystal: 0, stone: 0, bonds: 0 });
  assert.deepEqual(m.roster.map((c) => c.uid), (raw.roster as { uid: string }[]).map((c) => c.uid));
  for (const gone of Object.keys(KITCHEN_EARLY)) assert.equal(gone in m, false, gone);
  // une partie neuve n'a rien à montrer
  assert.equal(createInitialSaveState('pyrocube', true).kitchenConversion, null);
});

test('Migration A2.2 : milieu de partie (réserve, plat en route, un doublon)', () => {
  // le trio Braise (Pyrocube, Voltik, Cailloc) + un Flambrix : deux créatures de la lignée Pyrocube
  const raw = v8Save(KITCHEN_MID, ['flambrix']);
  const m = migrateSaveState(clone(raw))!;
  assert.ok(m);
  assert.deepEqual(m.baits, { fire: 2, electric: 1 }); // 11 rouges -> 2, 5 jaunes -> 1 ; restes perdus
  assert.deepEqual(m.sealedCubes.map((c) => c.material), ['stone']);
  assert.equal(m.cubeCounter, 1);
  assert.deepEqual(m.bonds, { pyrocube: 1 });
  assert.deepEqual(m.duplicates, { pyrocube: 1 });
  assert.deepEqual(m.kitchenConversion, { baits: 3, crystal: 0, stone: 1, bonds: 1 });
  // rien n'est perdu côté créatures : mêmes créatures, mêmes niveaux, même escouade
  const before = raw.roster as { uid: string; speciesId: string; level: number }[];
  assert.deepEqual(m.roster.map((c) => [c.uid, c.speciesId, c.level]), before.map((c) => [c.uid, c.speciesId, c.level]));
  assert.deepEqual(m.squadIds, raw.squadIds);
  assert.equal(lineageOf('flambrix'), 'pyrocube');
});

test('Migration A2.2 : fin de partie (grosse réserve, Fragments Mystiques, plusieurs doublons, Lien plafonné)', () => {
  // + 2 Bourgéon-lignée (sans l'original : 1 doublon), 6 Cailloc-lignée de plus (6 doublons, Lien plafonné à 5),
  // + 1 Sparkube (lignée Voltik : 1 doublon)
  const extra = ['bourgeon', 'feuilloc', 'cailloc', 'cailloc', 'granitox', 'cailloc', 'granitox', 'cailloc', 'sparkube'];
  const raw = v8Save(KITCHEN_LATE, extra);
  const m = migrateSaveState(clone(raw))!;
  assert.ok(m);
  assert.deepEqual(m.baits, { fire: 8, water: 8, electric: 8, rock: 7 });
  assert.deepEqual(m.sealedCubes.map((c) => c.material), ['crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'crystal', 'stone']);
  assert.equal(new Set(m.sealedCubes.map((c) => c.id)).size, 7);
  assert.deepEqual(m.duplicates, { voltik: 1, cailloc: 6, bourgeon: 1 });
  assert.deepEqual(m.bonds, { voltik: 1, cailloc: 5, bourgeon: 1 });
  assert.deepEqual(m.kitchenConversion, { baits: 31, crystal: 6, stone: 1, bonds: 7 });
  assert.equal(m.roster.length, 3 + extra.length);
  assert.deepEqual(m.roster.map((c) => c.speciesId), (raw.roster as { speciesId: string }[]).map((c) => c.speciesId));

  // stable : la sauvegarde v9 obtenue se relit à l'identique (pas de deuxième conversion), et survit à un export / import
  assert.deepEqual(migrateSaveState(clone(m)), m);
  const round = importSaveFromJson(JSON.stringify(m));
  assert.equal(round.ok, true);
  if (round.ok) assert.deepEqual(round.save, m);
  // une fois l'écran vu (null), la valeur reste null ; une valeur abîmée est normalisée
  assert.equal(migrateSaveState({ ...clone(m), kitchenConversion: null })!.kitchenConversion, null);
  assert.deepEqual(migrateSaveState({ ...clone(m), kitchenConversion: { baits: -2, crystal: 'x', stone: 1.8 } })!.kitchenConversion, { baits: 0, crystal: 0, stone: 1, bonds: 0 });
});
