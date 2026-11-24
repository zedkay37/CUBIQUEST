/**
 * `npx tsx tools/vox-studio/brouillons/build-propositions.ts` : écrit les .vox des propositions (brouillons) dans ce
 * dossier, pour les planches (`npm run vox:planche -- --fichier proposition-a-mycelin:mycelin`). Ne touche pas au jeu.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { writeVoxBytes, type Model, type Palette } from '../voxlib';

for (const f of ['mycelin-a', 'amanitox-a', 'mycelin-b', 'amanitox-b']) {
  const s = (await import(pathToFileURL(`${process.cwd()}/tools/vox-studio/brouillons/${f}.ts`).href)) as { ID: string; PALETTE: Palette; build: () => Model };
  writeFileSync(`tools/vox-studio/brouillons/${s.ID}.vox`, writeVoxBytes(s.build(), s.PALETTE));
  console.log(`écrit tools/vox-studio/brouillons/${s.ID}.vox`);
}
