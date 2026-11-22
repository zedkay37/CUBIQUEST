/**
 * Audit du vocabulaire : compte, fichier par fichier, les termes venus d'autres jeux.
 *
 *   npm run lexique                    # tableau Markdown sur la sortie standard
 *   npm run lexique -- --out fichier   # l'écrit aussi dans un fichier
 *   npm run lexique -- --strict        # code de sortie 1 s'il reste un terme (hors fichiers exemptés)
 *
 * Hors audit : node_modules, dist, fichiers de verrouillage, docs/plan, docs/rapports, docs/archives.
 * La liste des termes et les fichiers exemptés vivent dans tools/lexiqueCore.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { EXEMPT_FILES, normalizedTerms, scanLexique } from './lexiqueCore';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outFile = outIndex >= 0 ? args[outIndex + 1] : undefined;
const strict = args.includes('--strict');

const hits = scanLexique(process.cwd());
const counted = hits.filter((h) => !h.exempt);
const exempt = hits.filter((h) => h.exempt);

const lines: string[] = [];
lines.push('# Audit du lexique');
lines.push('');
lines.push('Comparaison sans casse ni accents. Hors audit : node_modules, dist, fichiers de verrouillage, docs/plan, docs/rapports, docs/archives.');
lines.push('');
lines.push('## Par terme');
lines.push('');
lines.push('| Terme | Occurrences | Fichiers |');
lines.push('| --- | ---: | ---: |');
let total = 0;
for (const term of normalizedTerms()) {
  const forTerm = counted.filter((h) => h.term === term);
  const sum = forTerm.reduce((n, h) => n + h.count, 0);
  total += sum;
  lines.push(`| \`${term}\` | ${sum} | ${forTerm.length} |`);
}
lines.push('');
lines.push(`**Total : ${total} occurrence(s) dans ${new Set(counted.map((h) => h.file)).size} fichier(s).**`);
lines.push('');
lines.push('Un terme contenu dans un autre est compté pour les deux.');
lines.push('');
lines.push('## Par fichier');
lines.push('');
if (counted.length === 0) {
  lines.push('Aucun terme trouvé.');
} else {
  lines.push('| Fichier | Terme | Occurrences |');
  lines.push('| --- | --- | ---: |');
  for (const h of counted) lines.push(`| ${h.file} | \`${h.term}\` | ${h.count} |`);
}
lines.push('');
lines.push('## Fichiers exemptés');
lines.push('');
for (const [file, why] of Object.entries(EXEMPT_FILES)) {
  const sum = exempt.filter((h) => h.file === file).reduce((n, h) => n + h.count, 0);
  lines.push(`- ${file} : ${sum} occurrence(s) — ${why}`);
}
lines.push('');

const report = lines.join('\n');
console.log(report);
if (outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, report);
}
if (strict && total > 0) process.exit(1);
