/**
 * Golden master : garde-fou « le jeu se comporte exactement comme avant ».
 *
 *   npm run golden              # rejoue les combats enregistrés et échoue à la moindre différence
 *   npm run golden -- --record  # réenregistre docs/sim/golden-master.json (UNIQUEMENT après un
 *                               # changement de jeu voulu : équilibrage, contenu, règle)
 *
 * Contenu : tous les niveaux x 2 profils (auto, joueur actif) x réactions (avec, sans) x 10 combats,
 * à graine fixe. Pour chaque combat : vainqueur, durée, PV restants (boss et alliés), dégâts totaux,
 * durées de phases, attaques télégraphiées, plus deux sommes de contrôle (tirages aléatoires
 * consommés, contenu des instantanés HUD) qui bougent dès que le déroulé change.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { fightSeed, runFight, STAGES, type FightResult, type SimProfile } from './simFight';

const FILE = path.join('docs', 'sim', 'golden-master.json');
const SEED = 1;
const RUNS = 10;
const CASES: { key: string; profile: SimProfile; cubes: boolean }[] = [
  { key: 'auto|cubes', profile: 'auto', cubes: true },
  { key: 'auto|sans-cubes', profile: 'auto', cubes: false },
  { key: 'actif|cubes', profile: 'active', cubes: true },
  { key: 'actif|sans-cubes', profile: 'active', cubes: false },
];

interface GoldenFile {
  meta: { seed: number; runs: number; stages: string[]; cases: string[]; note: string };
  fights: Record<string, Record<string, FightResult[]>>;
}

function play(): GoldenFile {
  const fights: GoldenFile['fights'] = {};
  for (const c of CASES) {
    fights[c.key] = {};
    for (const stage of STAGES) {
      const list: FightResult[] = [];
      for (let run = 0; run < RUNS; run++) {
        list.push(runFight(stage, fightSeed(SEED, stage, run), { profile: c.profile, cubes: c.cubes }));
      }
      fights[c.key][stage.id] = list;
    }
  }
  return {
    meta: {
      seed: SEED,
      runs: RUNS,
      stages: STAGES.map((s) => s.id),
      cases: CASES.map((c) => c.key),
      note: 'Généré par `npm run golden -- --record`. Ne pas modifier à la main.',
    },
    fights,
  };
}

/** Une ligne par combat : le fichier reste lisible dans un diff Git. */
function serialize(g: GoldenFile): string {
  const out: string[] = ['{', `"meta": ${JSON.stringify(g.meta)},`, '"fights": {'];
  const caseKeys = Object.keys(g.fights);
  caseKeys.forEach((caseKey, ci) => {
    out.push(`${JSON.stringify(caseKey)}: {`);
    const stageIds = Object.keys(g.fights[caseKey]);
    stageIds.forEach((stageId, si) => {
      out.push(`${JSON.stringify(stageId)}: [`);
      const list = g.fights[caseKey][stageId];
      list.forEach((f, fi) => out.push(JSON.stringify(f) + (fi < list.length - 1 ? ',' : '')));
      out.push(si < stageIds.length - 1 ? '],' : ']');
    });
    out.push(ci < caseKeys.length - 1 ? '},' : '}');
  });
  out.push('}', '}');
  return out.join('\n') + '\n';
}

const started = Date.now();
const current = play();
const total = CASES.length * STAGES.length * RUNS;

if (process.argv.includes('--record')) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, serialize(current));
  console.log(`Golden master enregistré : ${total} combats dans ${FILE} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  process.exit(0);
}

if (!fs.existsSync(FILE)) {
  console.error(`${FILE} est absent. Lancer : npm run golden -- --record`);
  process.exit(1);
}
const expected = JSON.parse(fs.readFileSync(FILE, 'utf8')) as GoldenFile;
// passage par JSON pour comparer exactement ce qui est stocké (null, nombres)
const actual = JSON.parse(serialize(current)) as GoldenFile;

const diffs: string[] = [];
let diffCount = 0;
const note = (line: string): void => {
  diffCount += 1;
  if (diffs.length < 12) diffs.push(line);
};
try {
  assert.deepStrictEqual(actual.meta, expected.meta);
} catch {
  note(`meta : attendu ${JSON.stringify(expected.meta)} / obtenu ${JSON.stringify(actual.meta)}`);
}
for (const caseKey of expected.meta.cases) {
  for (const stageId of expected.meta.stages) {
    const exp = expected.fights[caseKey]?.[stageId] ?? [];
    const act = actual.fights[caseKey]?.[stageId] ?? [];
    for (let run = 0; run < Math.max(exp.length, act.length); run++) {
      const e = exp[run] as unknown as Record<string, unknown> | undefined;
      const a = act[run] as unknown as Record<string, unknown> | undefined;
      if (!e || !a) {
        note(`${caseKey} / ${stageId} / combat ${run} : absent d'un côté`);
        continue;
      }
      for (const field of new Set([...Object.keys(e), ...Object.keys(a)])) {
        if (JSON.stringify(e[field]) !== JSON.stringify(a[field])) {
          note(`${caseKey} / ${stageId} / combat ${run} / ${field} : attendu ${JSON.stringify(e[field])}, obtenu ${JSON.stringify(a[field])}`);
        }
      }
    }
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
if (diffCount > 0) {
  console.error(`GOLDEN DIFFÉRENT : ${diffCount} écart(s) sur ${total} combats (${elapsed} s). Premiers écarts :`);
  for (const d of diffs) console.error(`  - ${d}`);
  console.error('Le comportement du jeu a changé. Si ce n\'est pas voulu : annuler la modification.');
  process.exit(1);
}
console.log(`Golden identique : ${total} combats (${elapsed} s)`);
