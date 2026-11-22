import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { CREATURE_NOUN, GAME_FULL_TITLE, GAME_TITLE, WORLD_NAME_BARE } from '../i18n/fr';
import { EXEMPT_FILES, listTextFiles, normalizeText, scanLexique } from '../../tools/lexiqueCore';

/** Ce que le test surveille (fiche S03.1). `npm run lexique` regarde, lui, tout le dépôt. */
const WATCHED = ['src', 'tools', 'index.html', 'metadata.json', 'README.md', 'CLAUDE.md', 'STYLE.md', 'server.ts'];
const ROOT = process.cwd();

test('Lexique: aucun terme venu d’un autre jeu dans le code, les textes et la documentation', () => {
  const hits = scanLexique(ROOT, WATCHED).filter((h) => !h.exempt);
  assert.deepEqual(
    hits.map((h) => `${h.file} : « ${h.term} » × ${h.count}`),
    [],
    'termes interdits trouvés (liste : tools/lexiqueCore.ts ; détail : npm run lexique)',
  );
});

test('Lexique: les fichiers exemptés existent et restent les seuls à citer les anciens identifiants', () => {
  for (const file of Object.keys(EXEMPT_FILES)) assert.ok(fs.existsSync(file), `${file} est exempté mais n'existe pas`);
  assert.deepEqual(Object.keys(EXEMPT_FILES).sort(), [
    'src/game/legacyIds.ts',
    'src/game/saveV3.fixture.ts',
    'tools/lexiqueCore.ts',
  ]);
});

test('Lexique: le titre, le monde et le nom des créatures ne sont écrits qu’une fois (src/i18n/fr.ts)', () => {
  const names = [GAME_TITLE, WORLD_NAME_BARE, CREATURE_NOUN.singular].map(normalizeText);
  const found: string[] = [];
  for (const file of ['src', 'tools', 'index.html', 'server.ts', 'vite.config.ts'].flatMap((start) => listTextFiles(ROOT, start))) {
    if (file === 'src/i18n/fr.ts' || file in EXEMPT_FILES) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      // Seule exception : les clés de stockage, qui ne changent jamais (sinon les sauvegardes seraient perdues)
      if (line.includes('_STORAGE_KEY')) return;
      const text = normalizeText(line);
      for (const name of names) if (text.includes(name)) found.push(`${file}:${i + 1} : « ${name} »`);
    });
  }
  assert.deepEqual(found, [], 'nom écrit en dur : utiliser GAME_TITLE, WORLD_NAME ou CREATURE_NOUN');
});

test('Lexique: metadata.json porte le titre des constantes', () => {
  const meta = JSON.parse(fs.readFileSync('metadata.json', 'utf8')) as { name: string };
  // JSON statique : il ne peut pas importer la constante, ce test le garde aligné
  assert.equal(normalizeText(meta.name).replace(/['’]/g, ''), normalizeText(GAME_FULL_TITLE).replace(/['’]/g, ''));
});
