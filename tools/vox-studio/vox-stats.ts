/**
 * `npx tsx tools/vox-studio/vox-stats.ts [identifiants…]` : pour chaque créature de `species/`, taille (X×Y×Z),
 * nombre de voxels et part de lueur en surface. Aide à la sculpture (rien n'est écrit).
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isGlow, type Model } from './voxlib';

const want = process.argv.slice(2);
const dir = 'tools/vox-studio/species';
for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts') && !x.startsWith('_'))) {
  const id = f.replace(/\.ts$/, '');
  if (want.length && !want.includes(id)) continue;
  const s = (await import(pathToFileURL(join(process.cwd(), dir, f)).href)) as { build: () => Model };
  const m = s.build();
  const surf = m.surface();
  let n = 0;
  let sn = 0;
  let g = 0;
  for (let i = 0; i < m.v.length; i++) {
    if (m.v[i]) n++;
    if (surf[i]) {
      sn++;
      if (isGlow(m.v[i])) g++;
    }
  }
  console.log(`${id.padEnd(14)} ${m.w}×${m.l}×${m.h}  voxels ${n}  lueur ${((100 * g) / sn).toFixed(1)} %`);
}
