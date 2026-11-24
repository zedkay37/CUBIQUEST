/**
 * PROTO-DONJON : robots × A/B × 10 parties, sur deux épreuves :
 * - « étage » : un étage complet (graines 2000+), réussi si l'équipe atteint l'escalier ;
 * - « boss » : l'étage du boss seul (graines 3000+), réussi si le boss tombe.
 * Schéma 1 (auto-attaque), Meneur Calcinarque, densité normale. Écrit `docs/proto/ROBOTS.md` (`--print` : affiche).
 *
 *   npx tsx tools/proto-donjon-robots.ts [--runs 10] [--print] [--leader braizard]
 */
import fs from 'node:fs';
import { newGame, results, step, type LeaderId, type Results, type Version } from '../src/proto/sim';
import { DONJON_BOTS, makeDonjonBot } from '../src/proto/donjon/dbots';
import { enterFloor, type DonjonLevel } from '../src/proto/donjon/level';

const args = process.argv.slice(2);
const runs = Number(args[args.indexOf('--runs') + 1]) || 10;
const print = args.includes('--print');
const leader = (args.includes('--leader') ? args[args.indexOf('--leader') + 1] : 'calcinarque') as LeaderId;

export interface Trial extends Results {
  ok: boolean;
}
export function playTrial(version: Version, bot: string, seed: number, trial: 'etage' | 'boss', lead: LeaderId = leader): Trial {
  const g = newGame(version, seed, { recordEvents: false, scheme: 1, leader: lead, maxTime: trial === 'boss' ? 300 : 420 });
  const opts = { seed, density: 1, wake: false, floors: 3 };
  const lvl = enterFloor(g, opts, trial === 'boss' ? 3 : 1) as DonjonLevel;
  const brain = makeDonjonBot(bot);
  while (!g.result && !lvl.stairsReached) {
    step(g, brain(g));
    if (g.pendingRecruit) g.pendingRecruit = null;
  }
  const r = results(g);
  return { ...r, ok: trial === 'boss' ? r.issue === 'victoire' : lvl.stairsReached };
}

if (process.argv[1]?.includes('proto-donjon-robots')) {
  const rows: string[] = [];
  const wins: Record<string, number> = {};
  for (const trial of ['etage', 'boss'] as const)
    for (const version of ['A', 'B'] as Version[])
      for (const bot of DONJON_BOTS) {
        const list = Array.from({ length: runs }, (_, i) => playTrial(version, bot, (trial === 'boss' ? 3000 : 2000) + i, trial));
        const ok = list.filter((r) => r.ok);
        wins[`${trial}:${version}:${bot}`] = ok.length;
        const avg = (f: (r: Trial) => number, l = list) => (l.length ? l.reduce((s, r) => s + f(r), 0) / l.length : 0);
        const sources: Record<string, number> = {};
        for (const r of list) for (const [k, v] of Object.entries(r.degats_par_source)) sources[k] = (sources[k] ?? 0) + v;
        const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
        const team = Object.entries(sources)
          .filter(([k]) => !k.startsWith(leader === 'braizard' ? 'Braizard —' : 'Calcinarque'))
          .reduce((s, [, v]) => s + v, 0);
        rows.push(
          `| ${trial === 'etage' ? 'étage' : 'boss'} | ${version} | ${bot} | **${ok.length} / ${runs}** | ${avg((r) => r.duree_s).toFixed(0)} s | ${ok.length ? avg((r) => r.pv_meneur, ok).toFixed(0) : '—'} | ${avg((r) => r.actions).toFixed(0)} | ${Math.round((100 * team) / total)} % | ${avg((r) => r.interruptions).toFixed(1)} |`,
        );
        if (print) console.log(rows[rows.length - 1]);
      }
  const verdict: string[] = [];
  for (const trial of ['etage', 'boss'] as const)
    for (const v of ['A', 'B'] as Version[]) {
      const solo = wins[`${trial}:${v}:esquive-seule`];
      const adapt = wins[`${trial}:${v}:adaptatif`];
      const masher = wins[`${trial}:${v}:presse-tout`];
      verdict.push(
        `- ${trial === 'etage' ? 'Étage' : 'Boss'}, version ${v} : esquive-seule ${solo} / ${runs}, adaptatif ${adapt} / ${runs}, presse-tout ${masher} / ${runs} → ` +
          (solo >= adapt ? '**ALERTE : le robot qui esquive seul gagne autant que celui qui s’adapte ; l’équipe ne pèse pas encore ici.**' : 'l’équipe pèse : esquiver seul ne suffit pas.'),
      );
    }
  const md = `# PROTO-DONJON — test des robots

Généré par \`npx tsx tools/proto-donjon-robots.ts\` : ${runs} parties par robot, par composition et par épreuve.
Schéma 1 (auto-attaque), Meneur ${leader === 'braizard' ? 'Braizard' : 'Calcinarque'}, densité normale, recrutement coupé, donjon qui ne se réveille pas.

- **Étage** : un étage complet généré (graines 2000 à ${2000 + runs - 1}) ; réussi si l'équipe atteint l'escalier. Limite : 7 minutes.
- **Boss** : l'étage du boss (graines 3000 à ${3000 + runs - 1}) ; réussi si le boss tombe. Limite : 5 minutes.

| Épreuve | Compo | Robot | Réussites | Durée moy. | PV du Meneur (réussites) | Actions moy. | Part des dégâts de l'équipe | Fournaises interrompues |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Le robot qui esquive seul

${verdict.join('\n')}

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, Esquive, F, R, 3, 4 ; en B entrée et rappel).
- **rotation** : une touche toutes les 1,5 s dans un ordre fixe.
- **adaptatif** : sort des zones annoncées et esquive au dernier moment ; vise le Soigneur en le contournant ;
  envoie Crabastion (F en A, entrée en B) sur le Blindé ; interrompt la Fournaise du boss (Carapace en A, bond d'un
  étourdisseur en B) ; soigne quand il faut.
- **esquive-seule** : la même esquive parfaite, ses propres sorts, mais jamais les compagnons (ni F, R, 3, 4, ni entrée en B).
- Hors combat, tous marchent droit vers l'escalier (ils connaissent la carte). Ce sont des scripts, pas des joueurs.
`;
  if (print) console.log(verdict.join('\n'));
  else {
    fs.writeFileSync('docs/proto/ROBOTS.md', md);
    console.log(rows.join('\n'));
    console.log(verdict.join('\n'));
  }
}
