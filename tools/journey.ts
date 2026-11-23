/**
 * `npm run journey` (S06.3) : un parcours complet sur le VRAI moteur, depuis une sauvegarde neuve.
 *
 * Le joueur simulé (profil `active` par défaut) joue toujours le niveau suivant ; après deux défaites de
 * suite, il rejoue une fois le niveau précédent pour gagner de l'expérience. Après chaque partie, il fait
 * évoluer toute créature qui le peut (comme un joueur au camp) et équipe ses meilleurs Galets. Il ne cuisine
 * pas, n'équipe aucune Rune et ne change jamais d'escouade : le parcours mesuré est donc PLUS LENT que celui
 * d'un vrai joueur (borne prudente).
 *
 * Temps de jeu : durée des combats + CAMP_OVERHEAD_SEC par partie (écran de fin, carte, lancement).
 *
 *   npm run journey
 *   npm run journey -- --profile auto --seed 2 --max-games 200 --out docs/sim/06-parcours.md
 */
import fs from 'node:fs';
import { fightSeed, runFight, STAGES, type SimProfile } from './simFight';
import { mulberry32 } from './headlessDom';

const { createInitialSaveState, applyExpeditionRewards, canEvolve, evolveCreature, canEquipStone, equipPowerStone, openSealedCube, lineageOf } = await import('../src/game/rules');
const { SUMMON_RARITY } = await import('../src/game/catalog');
type Save = ReturnType<typeof createInitialSaveState>;

/** Le joueur simulé équipe, case par case, le Galet libre le plus puissant qui y entre (simple, sans sous-statistiques). */
function autoEquip(save: Save): Save {
  for (const uid of save.squadIds) {
    const slots = save.roster.find((c) => c.uid === uid)?.stoneBoard.length ?? 0;
    for (let i = 0; i < slots; i++) {
      const c = save.roster.find((x) => x.uid === uid)!;
      const used = new Set(save.roster.flatMap((x) => x.stoneBoard.map((s) => s.stoneId)));
      const current = save.powerStones.find((s) => s.id === c.stoneBoard[i].stoneId)?.power ?? 0;
      const best = save.powerStones
        .filter((s) => !used.has(s.id) && canEquipStone(c, i, s) && s.power > current)
        .sort((a, b) => b.power - a.power)[0];
      if (best) save = equipPowerStone(save, uid, i, best.id);
    }
  }
  return save;
}
const { SPECIES } = await import('../src/game/catalog');

const CAMP_OVERHEAD_SEC = 20;
// essai de taux sans toucher balance.ts : --odds wood=0.9/0.09/0.01/0,stone=0.6/0.3/0.1/0
const { SUMMON } = await import('../src/game/balance');
if (process.argv.includes('--odds')) {
  for (const part of process.argv[process.argv.indexOf('--odds') + 1].split(',')) {
    const [k, v] = part.split('=');
    (SUMMON.odds as Record<string, number[]>)[k] = v.split('/').map(Number);
  }
}
const { XP_KIT } = await import('../src/game/balance');
// essai sans toucher balance.ts : --xp-scale 0.4
if (process.argv.includes('--xp-scale')) XP_KIT.xpScale = Number(process.argv[process.argv.indexOf('--xp-scale') + 1]);

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export interface JourneyStage {
  id: string;
  name: string;
  games: number;
  wins: number;
  /** Minutes de jeu cumulées à la première victoire. */
  clearedAtMin: number | null;
  /** Niveaux de l'escouade à la première victoire. */
  squadLevels: number[];
  /** Nouveautés à la première victoire (S07.3) : mécanique, compagnon, évolution, biome, rune, palier d'étoiles. */
  novelties: string[];
}

export interface JourneyResult {
  stages: JourneyStage[];
  totalGames: number;
  totalMin: number;
  firstEvolutionMin: number | null;
  finished: boolean;
  /** Séries de plus de 4 niveaux gagnés d'affilée sans nouveauté (premier et dernier niveau). */
  dryRuns: string[];
  /** Cube Scellé (A2) : lignées recrutées par rareté à la fin de chaque niveau gagné (dans l'ordre). */
  recruits: { stageId: string; common: number; uncommon: number; rare: number; cubes: number }[];
}

export function runJourney(profile: SimProfile = 'active', seed = 1, maxGames = 250, trio = 'braise'): JourneyResult {
  let save = createInitialSaveState(trio, true);
  const stages: JourneyStage[] = STAGES.map((s) => ({ id: s.id, name: s.name, games: 0, wins: 0, clearedAtMin: null, squadLevels: [], novelties: [] }));
  let elapsed = 0;
  let firstEvolutionMin: number | null = null;
  let lossStreak = 0;
  let games = 0;
  const recruits: JourneyResult['recruits'] = [];
  // butin à graine fixe : le parcours est reproductible
  const rewardRng = mulberry32((seed * 7919) >>> 0);
  while (games < maxGames && save.completedStageIds.length < STAGES.length) {
    const frontier = Math.min(save.highestStageIndex, STAGES.length - 1);
    // après deux défaites de suite : une partie sur le niveau précédent
    const idx = lossStreak >= 2 && frontier > 0 ? frontier - 1 : frontier;
    const stage = STAGES[idx];
    const squad = save.squadIds.map((uid) => save.roster.find((c) => c.uid === uid)!).filter(Boolean);
    const f = runFight(stage, fightSeed(seed, stage, games), { profile, creatures: squad, stones: save.powerStones });
    games += 1;
    elapsed += f.duration + CAMP_OVERHEAD_SEC;
    const o = f.outcome;
    const victory = f.victory;
    const res = applyExpeditionRewards(save, stage, victory, {
      clearTimeSec: f.duration,
      wavesCleared: o?.wavesCleared ?? 0,
      damageDealt: o?.damageDealt ?? 0,
      bossHpPercentRemaining: f.bossHpPct,
      burstsTriggered: o?.burstsTriggered,
      ultimatesUsed: o?.ultimatesUsed,
      perfectDodges: o?.perfectDodges,
      triosTriggered: o?.triosTriggered,
      koCount: o?.koCount,
      hazardHits: o?.hazardHits,
    }, rewardRng);
    save = res.nextSave;
    const row = stages[idx];
    const firstWin = victory && row.clearedAtMin === null;
    if (firstWin) {
      const out = res.outcome;
      row.novelties.push(...out.newFeatures.map((f) => `ouvre ${f}`));
      if (out.joinedSpeciesId) row.novelties.push(`compagnon ${out.joinedSpeciesId}`);
      if (out.unlockedBiomeName) row.novelties.push('biome');
      for (const t of out.starTiers) row.novelties.push(t.rune ? `palier ${t.at} (${t.rune})` : `palier ${t.at}`);
      if (out.droppedRune) row.novelties.push('rune');
    }
    row.games += 1;
    if (victory) {
      row.wins += 1;
      if (row.clearedAtMin === null) {
        row.clearedAtMin = +(elapsed / 60).toFixed(1);
        row.squadLevels = save.squadIds.map((uid) => save.roster.find((c) => c.uid === uid)?.level ?? 0);
      }
    }
    if (idx === frontier) lossStreak = victory ? 0 : lossStreak + 1;
    else lossStreak = 0;
    // A2 : le joueur simulé ouvre tous ses cubes, avec l'Appât dont il a le plus (s'il en a)
    let cubesThisGame = 0;
    while (save.sealedCubes.length) {
      const baitEntry = Object.entries(save.baits).filter(([, n]) => (n ?? 0) > 0).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
      const opened = openSealedCube(save, save.sealedCubes[0].id, (baitEntry?.[0] as never) ?? null, rewardRng);
      if (!opened) break;
      save = opened.nextSave;
      cubesThisGame += 1;
      if (firstWin && opened.result.isNew) row.novelties.push(`recrue ${opened.result.speciesId}`);
    }
    if (firstWin) {
      const owned = new Set(save.roster.map((c) => lineageOf(c.speciesId)));
      const count = (r: string) => [...owned].filter((id) => SUMMON_RARITY[id] === r).length;
      recruits.push({ stageId: stage.id, common: count('common'), uncommon: count('uncommon'), rare: count('rare'), cubes: cubesThisGame });
      if (cubesThisGame > 0) row.novelties.push(`${cubesThisGame} cube(s)`);
    }
    save = autoEquip(save);
    for (const c of save.roster) {
      if (canEvolve(c)) {
        save = evolveCreature(save, c.uid);
        if (firstWin) row.novelties.push('évolution');
        if (firstEvolutionMin === null) firstEvolutionMin = +(elapsed / 60).toFixed(1);
      }
    }
  }
  // séries de plus de 4 niveaux sans nouveauté (la rune tombée au hasard ne compte pas comme une nouveauté prévue)
  const dryRuns: string[] = [];
  let run: string[] = [];
  for (const s of stages.filter((x) => x.clearedAtMin !== null)) {
    if (s.novelties.some((n) => n !== 'rune')) {
      if (run.length > 4) dryRuns.push(`${run[0]} → ${run[run.length - 1]}`);
      run = [];
    } else run.push(s.id);
  }
  if (run.length > 4) dryRuns.push(`${run[0]} → ${run[run.length - 1]}`);
  return { stages, totalGames: games, totalMin: +(elapsed / 60).toFixed(1), firstEvolutionMin, finished: save.completedStageIds.length === STAGES.length, dryRuns, recruits };
}

function toMarkdown(r: JourneyResult, profile: string, seed: number): string {
  const done = r.stages.filter((s) => s.clearedAtMin !== null);
  const avg = done.length ? done.reduce((n, s) => n + s.games, 0) / done.length : 0;
  const lines = [
    `# Parcours (profil ${profile}, graine ${seed})`,
    '',
    `Parties : ${r.totalGames} · temps de jeu : ${r.totalMin} min · première évolution : ${r.firstEvolutionMin ?? '—'} min · moyenne ${avg.toFixed(2)} parties par niveau · maximum ${Math.max(0, ...r.stages.map((s) => s.games))}${r.finished ? '' : ' · PARCOURS INACHEVÉ'}`,
    '',
    `Séries de plus de 4 niveaux sans nouveauté : ${r.dryRuns.length ? r.dryRuns.join(', ') : 'aucune'}`,
    '',
    '| Niveau | Parties | Victoires | Terminé à (min) | Niveaux de l’escouade | Nouveautés |',
    '| --- | --- | --- | --- | --- | --- |',
    ...r.stages.map((s) => `| ${s.id} | ${s.games} | ${s.wins} | ${s.clearedAtMin ?? '—'} | ${s.squadLevels.join(' / ')} | ${s.novelties.join(', ') || '—'} |`),
  ];
  return lines.join('\n') + '\n';
}

if (/tools[\\/]journey\.ts$/.test(process.argv[1] ?? '')) {
  const profile = arg('profile', 'active') as SimProfile;
  const seed = Number(arg('seed', '1'));
  const r = runJourney(profile, seed, Number(arg('max-games', '250')), arg('trio', 'braise'));
  const md = toMarkdown(r, profile, seed);
  const out = arg('out', '');
  if (out) fs.writeFileSync(out, md);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r));
  else console.log(md);
  void SPECIES;
}
