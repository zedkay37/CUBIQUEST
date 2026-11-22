/**
 * Outil de mesure d'équilibrage : joue N combats par niveau SANS navigateur ni rendu.
 *
 *   npm run sim                                   # 18 niveaux x 10 combats
 *   npm run sim -- --runs 30 --stages tundra-3,stormpeak-3
 *   npm run sim -- --seed 7 --out docs/sim/reference.md
 *   npm run sim -- --json                         # sortie brute
 *   npm run sim -- --brief                        # une ligne par niveau (pratique pour régler)
 *   npm run sim -- --profile active               # profil « joueur actif » (voir tools/simFight.ts)
 *   npm run sim -- --cubes 0                  # cubes d’élément coupés (option d'outil)
 *   npm run sim -- --stages tundra-3 --set tundra-3=14/0.4/1.8
 *   npm run sim -- --scale 1/0.7/1        # multiplie les réglages de tous les niveaux (essai global)
 *        # essaie des multiplicateurs (PV ennemis / attaque / PV boss) SANS toucher à balance.ts
 *
 * Fonctionnement :
 *  - le VRAI moteur (`VoxelEngine`) tourne en mode headless, pas à pas fixe de 1/60 s ;
 *  - l'escouade est celle du mode aperçu (`src/game/previewConfigs.ts`), en contrôle « Auto Total » ;
 *  - l'aléatoire est rendu reproductible en remplaçant `Math.random` DANS CE PROCESSUS uniquement
 *    par un générateur à graine : le code du jeu n'est pas modifié et se comporte comme d'habitude
 *    dans le navigateur.
 *
 * Limite à garder en tête : « Auto Total » ne se sert jamais de l'Esquive. Un joueur qui esquive
 * fait mieux que ces chiffres.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  fightSeed,
  getReferenceConfig,
  runFight,
  SPECIES,
  STAGES,
  type FightResult,
  type SimProfile,
  type StageDef,
} from './simFight';
export interface StageSummary {
  stageId: string;
  stageName: string;
  config: string;
  runs: number;
  winRate: number;
  durationAvg: number;
  durationMin: number;
  durationMax: number;
  bossFightAvg: number | null;
  /** Par phase : durée moyenne, attaques moyennes, part des combats avec >= 1 attaque (parmi ceux qui ont atteint la phase). */
  phases: ({ reached: number; durationAvg: number; durationMin: number; castsAvg: number; withCast: number } | null)[];
  bossHpOnDefeatAvg: number | null;
  timeouts: number;
  /** Par combat : Éclats pleins, Éclats faibles, Trios, Déchaînements ; Déchaînements par combat de boss. */
  burstsAvg: number;
  weakBurstsAvg: number;
  triosAvg: number;
  ultimatesAvg: number;
  bossUltimatesAvg: number;
}

const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function summarize(stage: StageDef, fights: FightResult[]): StageSummary {
  const config = getReferenceConfig(stage);
  const defeats = fights.filter((f) => !f.victory);
  const maxPhases = Math.max(...fights.map((f) => f.bossMaxPhases), 0);
  const bossFights = fights
    .filter((f) => f.bossAppearedAt >= 0)
    .map((f) => f.duration - f.bossAppearedAt);
  return {
    stageId: stage.id,
    stageName: stage.name,
    config: `${config.squad.map((id) => SPECIES[id]?.name ?? id).join(' / ')} · niv. ${config.level} · +${config.bonus}`,
    runs: fights.length,
    winRate: fights.filter((f) => f.victory).length / fights.length,
    durationAvg: avg(fights.map((f) => f.duration)),
    durationMin: Math.min(...fights.map((f) => f.duration)),
    durationMax: Math.max(...fights.map((f) => f.duration)),
    bossFightAvg: bossFights.length ? avg(bossFights) : null,
    phases: [0, 1, 2].map((i) => {
      if (i >= maxPhases) return null;
      const reached = fights.filter((f) => f.phaseDurations[i] !== null);
      if (reached.length === 0) return { reached: 0, durationAvg: 0, durationMin: 0, castsAvg: 0, withCast: 0 };
      const durations = reached.map((f) => f.phaseDurations[i] as number);
      return {
        reached: reached.length,
        durationAvg: avg(durations),
        durationMin: Math.min(...durations),
        castsAvg: avg(reached.map((f) => f.castsByPhase[i])),
        withCast: reached.filter((f) => f.castsByPhase[i] >= 1).length / reached.length,
      };
    }),
    bossHpOnDefeatAvg: defeats.length ? avg(defeats.map((f) => f.bossHpPct)) : null,
    timeouts: fights.filter((f) => f.timedOut).length,
    burstsAvg: avg(fights.map((f) => f.bursts)),
    weakBurstsAvg: avg(fights.map((f) => f.weakBursts)),
    triosAvg: avg(fights.map((f) => f.trios)),
    ultimatesAvg: avg(fights.map((f) => f.ultimates)),
    bossUltimatesAvg: avg(fights.filter((f) => f.bossAppearedAt >= 0).map((f) => f.bossUltimates)),
  };
}

const pct = (x: number): string => `${Math.round(x * 100)} %`;
const sec = (x: number): string => `${x.toFixed(1)} s`;

function phaseCell(p: StageSummary['phases'][number]): string {
  if (p === null) return '—';
  if (p.reached === 0) return 'jamais atteinte';
  return `${sec(p.durationAvg)} (min ${sec(p.durationMin)}) · ${p.castsAvg.toFixed(1)} att. · ${pct(p.withCast)}`;
}

export function toMarkdown(
  summaries: StageSummary[],
  runs: number,
  seed: number,
  profile: SimProfile = 'auto',
  cubes = true,
): string {
  const control =
    profile === 'auto'
      ? 'contrôle « Auto Total » (aucune esquive)'
      : profile === 'expert'
        ? 'profil « expert » (mode Semi piloté par l’aperçu des sorts : Trios, Éclats pleins, Esquive sur télégraphe)'
        : 'profil « joueur actif » (mode Semi : sorts et ultime dès que prêts, Esquive sur télégraphe)';
  const lines = [
    `Simulation headless — ${runs} combats par niveau, graine ${seed}, ${control}${cubes ? '' : ', cubes d’élément coupés'}.`,
    '',
    'Colonnes de phase : durée moyenne (durée minimale) · attaques télégraphiées lancées en moyenne · part des combats où le boss en a lancé au moins une dans cette phase.',
    '',
    '| Niveau | Escouade de référence | Victoires | Durée totale (min–max) | Combat de boss | Phase 1 | Phase 2 | Phase 3 | PV boss restants (défaites) | Éclats (faibles) · Trios · Déchaînements (boss) par combat |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const s of summaries) {
    lines.push(
      `| ${s.stageId} — ${s.stageName} | ${s.config} | ${pct(s.winRate)} | ${sec(s.durationAvg)} (${sec(s.durationMin)}–${sec(s.durationMax)}) | ${
        s.bossFightAvg === null ? '—' : sec(s.bossFightAvg)
      } | ${phaseCell(s.phases[0])} | ${phaseCell(s.phases[1])} | ${phaseCell(s.phases[2])} | ${
        s.bossHpOnDefeatAvg === null ? '—' : `${Math.round(s.bossHpOnDefeatAvg)} %`
      }${s.timeouts ? ` · ${s.timeouts} hors délai` : ''} | ${s.burstsAvg.toFixed(1)} (${s.weakBurstsAvg.toFixed(1)}) · ${s.triosAvg.toFixed(1)} · ${s.ultimatesAvg.toFixed(1)} (${s.bossUltimatesAvg.toFixed(1)}) |`,
    );
  }
  return lines.join('\n') + '\n';
}

function parseArgs(argv: string[]): {
  runs: number;
  seed: number;
  stages: string[] | null;
  out: string | null;
  json: boolean;
  brief: boolean;
  set: string | null;
  scale: string | null;
  profile: SimProfile;
  cubes: boolean;
} {
  const get = (name: string): string | null => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  return {
    runs: Math.max(1, Number(get('runs')) || 10),
    seed: Number(get('seed')) || 1,
    stages: get('stages')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null,
    out: get('out'),
    json: argv.includes('--json'),
    brief: argv.includes('--brief'),
    set: get('set'),
    scale: get('scale'),
    profile: (['active', 'expert', 'kite'] as const).find((p) => p === get('profile')) ?? 'auto',
    cubes: get('cubes') !== '0',
  };
}

function briefLine(s: StageSummary): string {
  const ph = s.phases
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p, i) =>
      p.reached === 0
        ? `P${i + 1} jamais`
        : `P${i + 1} ${p.durationAvg.toFixed(1)}s(min ${p.durationMin.toFixed(1)}) ${p.castsAvg.toFixed(1)}att ${Math.round(p.withCast * 100)}%`,
    )
    .join(' | ');
  return `${s.stageId.padEnd(12)} ${pct(s.winRate).padStart(5)}  total ${s.durationAvg.toFixed(1)}s  boss ${
    s.bossFightAvg === null ? '-' : s.bossFightAvg.toFixed(1) + 's'
  }  ${ph}  | Éclats ${s.burstsAvg.toFixed(1)} (+${s.weakBurstsAvg.toFixed(1)} faibles) Trios ${s.triosAvg.toFixed(1)} Déch. ${s.ultimatesAvg.toFixed(1)} (boss ${s.bossUltimatesAvg.toFixed(1)})${s.bossHpOnDefeatAvg === null ? '' : `  | défaites: boss ${Math.round(s.bossHpOnDefeatAvg)}%`}`;
}

const args = parseArgs(process.argv.slice(2));
const selected = args.stages ? STAGES.filter((s) => args.stages!.includes(s.id)) : STAGES;
if (selected.length === 0) {
  console.error(`Aucun niveau trouvé. Identifiants valides : ${STAGES.map((s) => s.id).join(', ')}`);
  process.exit(1);
}

// Essai de réglage global : --scale pv/attaque/pvBoss multiplie les valeurs de TOUS les niveaux choisis
// (en mémoire, pour ce processus seulement), avant un éventuel --set.
if (args.scale) {
  const [hp, atk, boss] = args.scale.split('/').map(Number);
  if (![hp, atk, boss].every((n) => Number.isFinite(n) && n > 0)) {
    console.error(`--scale invalide : ${args.scale} (attendu pv/attaque/pvBoss)`);
    process.exit(1);
  }
  for (const stage of selected) {
    stage.enemyHpMult = (stage.enemyHpMult ?? 1) * hp;
    stage.enemyAtkMult = (stage.enemyAtkMult ?? 1) * atk;
    stage.bossHpMult = (stage.bossHpMult ?? 1) * boss;
  }
}

// Essai de réglage : --set id=pvEnnemis/attaque/pvBoss[,id=...] (en mémoire, pour ce processus seulement)
if (args.set) {
  for (const part of args.set.split(',')) {
    const [id, values] = part.split('=');
    const stage = STAGES.find((s) => s.id === id);
    const [hp, atk, boss] = (values ?? '').split('/').map(Number);
    if (!stage || ![hp, atk, boss].every((n) => Number.isFinite(n) && n > 0)) {
      console.error(`--set invalide : ${part} (attendu id=pvEnnemis/attaque/pvBoss)`);
      process.exit(1);
    }
    stage.enemyHpMult = hp;
    stage.enemyAtkMult = atk;
    stage.bossHpMult = boss;
  }
}

const started = Date.now();
const summaries: StageSummary[] = [];
for (const stage of selected) {
  const fights: FightResult[] = [];
  for (let run = 0; run < args.runs; run++) {
    fights.push(
      runFight(stage, fightSeed(args.seed, stage, run), { profile: args.profile, cubes: args.cubes }),
    );
  }
  summaries.push(summarize(stage, fights));
  if (args.brief) console.log(briefLine(summaries[summaries.length - 1]));
  else if (!args.json) process.stderr.write(`  ${stage.id} : ${pct(summaries[summaries.length - 1].winRate)}\n`);
}
if (args.brief) process.exit(0);

if (args.json) {
  console.log(JSON.stringify(summaries, null, 2));
} else {
  const md = toMarkdown(summaries, args.runs, args.seed, args.profile, args.cubes);
  console.log(md);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, md);
    process.stderr.write(`Tableau écrit dans ${args.out}\n`);
  }
  process.stderr.write(`Terminé en ${((Date.now() - started) / 1000).toFixed(1)} s\n`);
}
