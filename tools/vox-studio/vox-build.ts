/**
 * `npm run vox:build` : régénère les .vox des créatures (un script par créature dans `species/<identifiant>.ts`,
 * qui exporte `ID`, `PALETTE` et `build()`) dans `src/assets/vox/<identifiant>.vox`.
 * Déterministe : aucun tirage au hasard, même script = même fichier, octet pour octet (vérifié : chaque modèle est
 * construit deux fois et les deux fichiers comparés).
 *
 * `npm run vox:build -- --references` : reconstruit aussi les modèles de `references/*.ts` dans `out/` et les
 * compare aux .vox de référence (preuve que le portage TypeScript de voxlib donne les mêmes fichiers que Python).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeVoxBytes, type Model, type Palette } from './voxlib';

interface Script {
  ID?: string;
  FILE?: string;
  PALETTE: Palette;
  build: () => Model;
}

const HERE = 'tools/vox-studio';
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

async function load(file: string): Promise<Script> {
  return (await import(pathToFileURL(join(process.cwd(), file)).href)) as Script;
}

let failed = false;
const species = existsSync(join(HERE, 'species')) ? readdirSync(join(HERE, 'species')).filter((f) => f.endsWith('.ts') && !f.startsWith('_')) : [];
if (!species.length) console.log('vox:build : aucune créature dans tools/vox-studio/species/ (rien à écrire).');
mkdirSync('src/assets/vox', { recursive: true });
for (const f of species) {
  const s = await load(join(HERE, 'species', f));
  const id = s.ID ?? f.replace(/\.ts$/, '');
  const a = writeVoxBytes(s.build(), s.PALETTE);
  const b = writeVoxBytes(s.build(), s.PALETTE);
  if (!same(a, b)) {
    console.error(`ÉCHEC ${id} : deux constructions donnent deux fichiers différents (non déterministe)`);
    failed = true;
    continue;
  }
  writeFileSync(`src/assets/vox/${id}.vox`, a);
  console.log(`écrit src/assets/vox/${id}.vox (${a.length} octets)`);
}

if (process.argv.includes('--references')) {
  mkdirSync(join(HERE, 'out'), { recursive: true });
  for (const f of readdirSync(join(HERE, 'references')).filter((x) => x.endsWith('.ts'))) {
    const s = await load(join(HERE, 'references', f));
    const name = s.FILE ?? f.replace(/\.ts$/, '').replace(/_/g, '-');
    const a = writeVoxBytes(s.build(), s.PALETTE);
    writeFileSync(join(HERE, 'out', `${name}.vox`), a);
    const refPath = join(HERE, 'references', `${name}.vox`);
    if (!existsSync(refPath)) {
      console.log(`référence ${name} : pas de .vox à comparer`);
      continue;
    }
    const ok = same(a, new Uint8Array(readFileSync(refPath)));
    console.log(`référence ${name} : ${ok ? 'identique octet pour octet' : 'DIFFÉRENT'} (${a.length} octets)`);
    if (!ok) failed = true;
  }
}
process.exit(failed ? 1 : 0);
