/**
 * Mots interdits : LA liste des termes venus d'autres jeux, et le compteur commun à
 * `npm run lexique` (tools/lexique.ts) et au test `src/game/lexique.test.ts`.
 *
 * La comparaison ignore la casse et les accents.
 * Ce fichier contient forcément les termes : il s'exclut lui-même du comptage.
 */
import fs from 'node:fs';
import path from 'node:path';

export const FORBIDDEN_TERMS: readonly string[] = [
  'pokemon', 'pokémon', 'nintendo', 'game freak', 'pikachu', 'cubimon', 'à la cube', 'mulligan',
  'ambrosia', 'ambroisie', 'whack', 'wait_less', 'broadburst', 'scattershot', 'stay_strong',
  'scatter', 'dispersion', 'tumblecube', 'gemme-p', 'power charm',
  // S04 : vocabulaire des anciennes réactions
  'évaporation', 'électrocution', 'cristallisation', 'surcharge', 'embrasement', 'trempé', 'vaporize',
  'overload', 'crystallize', 'swirl', 'combo',
  // S05 : l'élément s'appelle « Foudre » à l'écran (identifiant interne `electric`)
  'électrik',
  // A1.1 (spec Atelier) : rien qui rappelle une créature-éclair d'une autre licence
  'joues', 'pika',
  // A2.2 (spec Atelier) : la cuisine disparaît, la Marmite devient l'Atelier
  'marmite', 'chaudron', 'recette', 'ingrédient', 'cuisson',
];

/**
 * Fichiers qui DOIVENT citer d'anciens identifiants, et rien d'autre :
 * la table de conversion des sauvegardes v1 à v8 et les sauvegardes d'essai des tests.
 * Ils sont comptés à part (« exemptés »), jamais ignorés en silence.
 */
export const EXEMPT_FILES: Readonly<Record<string, string>> = {
  'tools/lexiqueCore.ts': 'la liste des mots interdits elle-même',
  'src/game/legacyIds.ts': 'table de conversion des identifiants des sauvegardes v1 à v8',
  'src/game/saveV3.fixture.ts': "sauvegarde v3 d'essai (test de migration)",
  'src/game/saveKitchen.fixture.ts': "ancienne cuisine des sauvegardes v1 à v8 (tests de migration A2.2)",
};

/** Dossiers et fichiers hors audit (fiche S03.1). */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', 'coverage']);
const SKIP_PATHS = ['docs/plan', 'docs/rapports', 'docs/archives'];
const SKIP_FILES = new Set(['package-lock.json', 'bun.lock']);
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt', '.example', '',
]);

/** Minuscules, sans accents : « Pokémon » et « POKEMON » deviennent « pokemon ». */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Termes normalisés et dédoublonnés (« pokemon » et « pokémon » ne comptent qu'une fois). */
export function normalizedTerms(): string[] {
  return [...new Set(FORBIDDEN_TERMS.map(normalizeText))];
}

export function countOccurrences(normalizedHaystack: string, normalizedTerm: string): number {
  let count = 0;
  let at = normalizedHaystack.indexOf(normalizedTerm);
  while (at !== -1) {
    count++;
    at = normalizedHaystack.indexOf(normalizedTerm, at + normalizedTerm.length);
  }
  return count;
}

/** Fichiers texte sous `start` (fichier ou dossier), chemins relatifs à `root` avec des « / ». */
export function listTextFiles(root: string, start = '.'): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = path.join(root, rel);
    const stat = fs.statSync(abs);
    const posix = rel.split(path.sep).join('/').replace(/^\.\//, '');
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(rel)) || SKIP_PATHS.includes(posix)) return;
      for (const name of fs.readdirSync(abs).sort()) walk(path.join(rel, name));
      return;
    }
    if (SKIP_FILES.has(path.basename(rel)) || !TEXT_EXT.has(path.extname(rel))) return;
    out.push(posix);
  };
  if (fs.existsSync(path.join(root, start))) walk(start);
  return out;
}

export interface LexiqueHit { file: string; term: string; count: number; exempt: boolean }

/** Compte chaque terme dans chaque fichier de `starts` (par défaut : tout le dépôt). */
export function scanLexique(root: string, starts: string[] = ['.']): LexiqueHit[] {
  const terms = normalizedTerms();
  const hits: LexiqueHit[] = [];
  for (const start of starts) {
    for (const file of listTextFiles(root, start)) {
      const text = normalizeText(fs.readFileSync(path.join(root, file), 'utf8'));
      for (const term of terms) {
        const count = countOccurrences(text, term);
        if (count > 0) hits.push({ file, term, count, exempt: file in EXEMPT_FILES });
      }
    }
  }
  return hits;
}
