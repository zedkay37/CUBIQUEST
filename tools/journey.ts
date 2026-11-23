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

const { createInitialSaveState, applyExpeditionRewards, canEvolve, evolveCreature, canEquipStone, equipPowerStone } = await import('../src/game/rules');
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
}

export interface JourneyResult {
  stages: JourneyStage[];
  totalGames: number;
  totalMin: number;
  firstEvolutionMin: number | null;
  finished: boolean;
}

export function runJourney(profile: SimProfile = 'active', seed = 1, maxGames = 250): JourneyResult {
  let save = createInitialSaveState('pyrocube', true);
  const stages: JourneyStage[] = STAGES.map((s) => ({ id: s.id, name: s.name, games: 0, wins: 0, clearedAtMin: null, squadLevels: [] }));
  let elapsed = 0;
  let firstEvolutionMin: number | null = null;
  let lossStreak = 0;
  let games = 0;
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
    save = applyExpeditionRewards(save, stage, victory, {
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
    }).nextSave;
    const row = stages[idx];
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
    save = autoEquip(save);
    for (const c of save.roster) {
      if (canEvolve(c)) {
        save = evolveCreature(save, c.uid);
        if (firstEvolutionMin === null) firstEvolutionMin = +(elapsed / 60).toFixed(1);
      }
    }
  }
  return { stages, totalGames: games, totalMin: +(elapsed / 60).toFixed(1), firstEvolutionMin, finished: save.completedStageIds.length === STAGES.length };
}

function toMarkdown(r: JourneyResult, profile: string, seed: number): string {
  const done = r.stages.filter((s) => s.clearedAtMin !== null);
  const avg = done.length ? done.reduce((n, s) => n + s.games, 0) / done.length : 0;
  const lines = [
    `# Parcours (profil ${profile}, graine ${seed})`,
    '',
    `Parties : ${r.totalGames} · temps de jeu : ${r.totalMin} min · première évolution : ${r.firstEvolutionMin ?? '—'} min · moyenne ${avg.toFixed(2)} parties par niveau · maximum ${Math.max(0, ...r.stages.map((s) => s.games))}${r.finished ? '' : ' · PARCOURS INACHEVÉ'}`,
    '',
    '| Niveau | Parties | Victoires | Terminé à (min) | Niveaux de l’escouade |',
    '| --- | --- | --- | --- | --- |',
    ...r.stages.map((s) => `| ${s.id} | ${s.games} | ${s.wins} | ${s.clearedAtMin ?? '—'} | ${s.squadLevels.join(' / ')} |`),
  ];
  return lines.join('\n') + '\n';
}

if (process.argv[1]?.includes('journey')) {
  const profile = arg('profile', 'active') as SimProfile;
  const seed = Number(arg('seed', '1'));
  const r = runJourney(profile, seed, Number(arg('max-games', '250')));
  const md = toMarkdown(r, profile, seed);
  const out = arg('out', '');
  if (out) fs.writeFileSync(out, md);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r));
  else console.log(md);
  void SPECIES;
}
