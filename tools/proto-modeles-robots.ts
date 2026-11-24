/**
 * PROTO-MODELES : pour chaque modèle, deux robots (presse-tout et adaptatif), 10 descentes complètes chacun
 * (3 étages, boss au 3e), graines 4000 à 4009, densité normale, recrutement coupé. Écrit
 * `docs/proto/ROBOTS-MODELES.md` (`--print` : affiche seulement ; `--modeles A,C` : une partie des modèles).
 *
 *   npx tsx tools/proto-modeles-robots.ts [--runs 10] [--print] [--modeles A,B,C]
 */
import fs from 'node:fs';
import { results, step, type Results } from '../src/proto/sim';
import { makeDonjonBot } from '../src/proto/donjon/dbots';
import { enterFloor } from '../src/proto/donjon/level';
import { DEFAULTS, type DonjonSettings, type Modele } from '../src/proto/donjon/settings';
import { MODEL_INFO, setupGame } from '../src/proto/modeles';
import { MODEL_BOTS } from '../src/proto/modelBots';

const args = process.argv.slice(2);
const runs = Number(args[args.indexOf('--runs') + 1]) || 10;
const print = args.includes('--print');
const only = args.includes('--modeles') ? args[args.indexOf('--modeles') + 1].split(',') : null;
const FLOORS = 3;

interface Descent extends Results {
  etage: number;
}
export function descend(modele: Modele, bot: string, seed: number): Descent {
  const s: DonjonSettings = { ...DEFAULTS, modele, version: modele === 'B' ? 'B' : 'A', seed, scheme: 1 };
  const g = setupGame(s, 900);
  g.recordEvents = false;
  const opts = { seed, density: 1, wake: false, floors: FLOORS };
  let lvl = enterFloor(g, opts, 1);
  const brain = MODEL_BOTS[modele]?.(bot) ?? makeDonjonBot(bot);
  while (!g.result) {
    step(g, brain(g));
    if (g.pendingRecruit) g.pendingRecruit = null;
    if (lvl.stairsReached && lvl.floorIndex < FLOORS) lvl = enterFloor(g, opts, lvl.floorIndex + 1);
  }
  return { ...results(g), etage: lvl.floorIndex };
}

if (process.argv[1]?.includes('proto-modeles-robots')) {
  const rows: string[] = [];
  const alerts: string[] = [];
  const models = MODEL_INFO.filter((m) => m.id !== 'H' && (!only || only.includes(m.id)));
  for (const m of models) {
    const wins: Record<string, number> = {};
    for (const bot of ['presse-tout', 'adaptatif']) {
      const list = Array.from({ length: runs }, (_, i) => descend(m.id as Modele, bot, 4000 + i));
      const ok = list.filter((r) => r.issue === 'victoire');
      wins[bot] = ok.length;
      const avg = (f: (r: Descent) => number, l = list) => (l.length ? l.reduce((s, r) => s + f(r), 0) / l.length : 0);
      const row = `| ${m.name} | ${bot} | **${ok.length} / ${runs}** | ${avg((r) => r.etage).toFixed(1)} | ${avg((r) => r.duree_s).toFixed(0)} s | ${avg((r) => r.actions).toFixed(0)} |`;
      rows.push(row);
      if (print) console.log(row);
    }
    if (wins['presse-tout'] >= wins.adaptatif) alerts.push(`- **${m.name} : presse-tout gagne autant ou plus que l’adaptatif (${wins['presse-tout']} contre ${wins.adaptatif}).**`);
  }
  const md = `# PROTO-MODELES — robots par modèle

Généré par \`npx tsx tools/proto-modeles-robots.ts\` : ${runs} descentes complètes par robot et par modèle (3 étages, boss au 3e),
graines 4000 à ${4000 + runs - 1}, densité normale, recrutement coupé, Meneur Calcinarque. Une descente s'arrête à 15 minutes.

| Modèle | Robot | Victoires (boss vaincu) | Étage atteint moy. | Durée moy. | Actions moy. |
|---|---|---|---|---|---|
${rows.join('\n')}

## Presse-tout contre adaptatif

${alerts.length ? alerts.join('\n') : '- Aucun modèle où celui qui appuie sur tout gagne autant que celui qui s’adapte.'}

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, cartes, échanges, ordres…), sans regarder la situation.
- **adaptatif** : sort des zones annoncées, garde ses ressources pour le bon moment (Soigneur, Blindé, Fournaise du boss, soins).
- Hors combat, tous marchent droit vers l'escalier (ils connaissent la carte). Ce sont des scripts, pas des joueurs.
`;
  if (print) console.log(alerts.join('\n'));
  else {
    fs.writeFileSync('docs/proto/ROBOTS-MODELES.md', md);
    console.log(rows.join('\n'));
    console.log(alerts.join('\n'));
  }
}
