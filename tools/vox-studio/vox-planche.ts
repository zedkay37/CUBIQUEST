/**
 * `npm run vox:planche [identifiants…] [--lot nom=a,b,c] [--fichier nom:espece]` : planches rendues par le VRAI jeu
 * (page `?gallery=planche`, photographiée par Edge sans interface via `tools/captures.ps1`), dans
 * `docs/captures/bestiaire/` (ou `--out <dossier>`).
 *
 * Sans identifiant : une planche par fichier de `src/assets/vox/`. `--lot` ajoute une planche d'alignement
 * (créatures côte à côte à l'échelle du jeu, profil et silhouette). `--fichier calcinarque-legendaire:magmadrake`
 * montre un .vox de référence à la place du modèle d'une espèce (essai, rien n'est enregistré).
 * Les planches sont toujours le rendu du jeu (jamais le lancer de rayons de voxlib).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const take = (flag: string) => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++)
    if (args[i] === flag && args[i + 1]) {
      out.push(args[i + 1]);
      args.splice(i, 2);
      i--;
    }
  return out;
};
const outDir = take('--out')[0] ?? 'docs/captures/bestiaire';
const lots = take('--lot');
const fichiers = take('--fichier');
let ids = args.filter((a) => !a.startsWith('--'));
if (!ids.length && !lots.length && !fichiers.length)
  ids = existsSync('src/assets/vox') ? readdirSync('src/assets/vox').filter((f) => f.endsWith('.vox')).map((f) => f.replace(/\.vox$/, '')) : [];

const screens: [string, string][] = [];
for (const id of ids) screens.push([`planche-${id}`, `?gallery=planche&species=${id}`]);
for (const f of fichiers) {
  const [file, sp] = f.split(':');
  screens.push([`planche-${file}-en-${sp}`, `?gallery=planche&species=${sp}&fichier=${file}`]);
}
for (const l of lots) {
  const [name, list] = l.includes('=') ? l.split('=') : ['lot', l];
  screens.push([`alignement-${name}`, `?gallery=planche&lot=${list}`]);
}
if (!screens.length) {
  console.log('vox:planche : rien à photographier (aucun .vox dans src/assets/vox/, aucun argument).');
  process.exit(0);
}
const extra = screens.map(([n, u]) => `${n}|${u}`).join(';');
console.log(`vox:planche : ${screens.length} planche(s) → ${outDir} (rendu du jeu, Edge sans interface)`);
execFileSync(
  'powershell',
  ['-ExecutionPolicy', 'Bypass', '-File', 'tools/captures.ps1', '-Out', outDir, '-Gpu', '-Formats', 'grand', '-Extra', extra, '-Only', screens.map((s) => s[0]).join(',')],
  { stdio: 'inherit' },
);
