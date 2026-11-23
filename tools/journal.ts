/**
 * `npm run journal -- fichier.json [autre.json ...]` (S07.4) : résume un ou plusieurs journaux exportés
 * depuis les options du jeu. Victoires et relances par niveau, gestes moyens par combat, niveaux où ça bloque,
 * leçons ratées. Lecture seule.
 */
import fs from 'node:fs';
import { parseJournal, summarizeJournal, type JournalEntry } from '../src/game/journal';

export function journalReport(entries: JournalEntry[]): string {
  const s = summarizeJournal(entries);
  const lines = [
    `# Journal : ${s.fights} combat(s)`,
    '',
    '| Niveau | Combats | Victoires | Défaites | Relances | Éclats | Trios | Esq. parfaites | Attaques subies | Déchaînements |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...s.stages.map((r) => `| ${r.stageId} | ${r.fights} | ${r.wins} | ${r.defeats} | ${r.retries} | ${r.bursts} | ${r.trios} | ${r.perfectDodges} | ${r.hazardHits} | ${r.ultimates} |`),
    '',
    `Niveaux où ça bloque : ${s.blocking.length ? s.blocking.join(', ') : 'aucun'}`,
    `Leçons ratées : ${Object.keys(s.missedLessons).length ? Object.entries(s.missedLessons).map(([k, n]) => `${k} (${n})`).join(', ') : 'aucune'}`,
  ];
  return lines.join('\n') + '\n';
}

if (/tools[\\/]journal\.ts$/.test(process.argv[1] ?? '')) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error('Usage : npm run journal -- fichier.json [autre.json ...]');
    process.exit(1);
  }
  const entries = files.flatMap((f) => parseJournal(JSON.parse(fs.readFileSync(f, 'utf8'))));
  console.log(journalReport(entries));
}
