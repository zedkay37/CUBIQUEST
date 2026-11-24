/**
 * Sprint PROTO-MENEUR : 3 robots × 2 versions × 10 parties sur la simulation de la maquette (src/proto/sim.ts),
 * à graine fixe. Écrit `docs/proto/ROBOTS.md` (ou l'affiche seulement avec `--print`).
 *
 *   npx tsx tools/proto-robots.ts [--runs 10] [--print]
 */
import fs from 'node:fs';
import { BOTS, makeBot } from '../src/proto/bots';
import { newGame, results, step, type Results, type Version } from '../src/proto/sim';

const args = process.argv.slice(2);
const runs = Number(args[args.indexOf('--runs') + 1]) || 10;
const print = args.includes('--print');

function play(version: Version, bot: (typeof BOTS)[number], seed: number): Results {
  const g = newGame(version, seed, false);
  const brain = makeBot(bot);
  while (!g.result) step(g, brain(g));
  return results(g);
}

const rows: string[] = [];
const detail: string[] = [];
const summary: Record<string, number> = {};
for (const version of ['A', 'B'] as Version[])
  for (const bot of BOTS) {
    const list = Array.from({ length: runs }, (_, i) => play(version, bot, 1000 + i));
    const wins = list.filter((r) => r.issue === 'victoire');
    const avg = (f: (r: Results) => number, l = list) => (l.length ? l.reduce((s, r) => s + f(r), 0) / l.length : 0);
    summary[`${version}:${bot}`] = wins.length;
    const sources: Record<string, number> = {};
    for (const r of list) for (const [k, v] of Object.entries(r.degats_par_source)) sources[k] = (sources[k] ?? 0) + v;
    const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
    const top = Object.entries(sources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} ${Math.round((100 * v) / total)} %`)
      .join(", ");
    const reasons: Record<string, number> = {};
    for (const r of list) reasons[r.raison] = (reasons[r.raison] ?? 0) + 1;
    rows.push(
      `| ${version} | ${bot} | **${wins.length} / ${runs}** | ${avg((r) => r.duree_s).toFixed(0)} s | ${wins.length ? avg((r) => r.pv_meneur, wins).toFixed(0) : '—'} | ${avg((r) => r.actions).toFixed(0)} | ${avg((r) => r.vague_atteinte).toFixed(1)} | ${top} |`,
    );
    detail.push(
      `- ${version} / ${bot} : ` +
        Object.entries(reasons)
          .map(([k, v]) => `${k} × ${v}`)
          .join(' ; '),
    );
  }

const verdict = (['A', 'B'] as Version[]).map((v) => {
  const m = summary[`${v}:presse-tout`];
  const a = summary[`${v}:adaptatif`];
  return `- Version ${v} : presse-tout ${m} / ${runs}, adaptatif ${a} / ${runs} → ${m < a ? 'attendu respecté (presse-tout gagne moins souvent)' : '**ATTENDU NON RESPECTÉ : presse-tout gagne autant ou plus souvent que l’adaptatif**'}.`;
});

const md = `# PROTO-MENEUR — test des robots

Généré par \`npx tsx tools/proto-robots.ts\` : ${runs} parties par robot et par version, graines 1000 à ${1000 + runs - 1},
même salle, mêmes ennemis (2 vagues puis le boss), sur la simulation de la maquette (\`src/proto/sim.ts\`).
Les robots utilisent les mêmes commandes que le joueur. Le pas de jeu est de 1/60 s ; une partie s'arrête à 6 minutes.

| Version | Robot | Victoires | Durée moy. | PV du Meneur (victoires) | Actions moy. | Vague atteinte moy. (3 = boss) | Dégâts : 3 premières sources |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## L'attendu de la fiche

${verdict.join('\n')}

## Fins de partie

${detail.join('\n')}

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, Esquive, F, R, et en B entrée et rappel), même sans raison.
- **rotation** : une touche toutes les 1,5 s dans un ordre fixe (A : 1, 3, F, 2, 4, Espace ; B : entrée, 1, 2, entrée, Espace, R).
- **adaptatif** : sort des zones annoncées et garde l'Esquive pour le dernier moment d'une attaque annoncée ;
  vise le Soigneur en premier (et y envoie F en A, Braizard en B) ; sorts des compagnons quand ils servent ;
  en B, rappelle une créature avant son K.O. et fait entrer Amanitox quand le Meneur saigne.
- Les trois se déplacent de la même façon (garder une distance de tir). Ce sont des scripts simples, pas des joueurs.
`;

if (print) console.log(md);
else {
  fs.mkdirSync('docs/proto', { recursive: true });
  fs.writeFileSync('docs/proto/ROBOTS.md', md);
  console.log(rows.join('\n'));
  console.log(verdict.join('\n'));
}
