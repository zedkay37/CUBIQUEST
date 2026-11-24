import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom } from '../../tools/headlessDom';

installHeadlessDom();
const { BIOME_GRADE, BLOOM_DEFAULT } = await import('./engine/postfx');
const { WEATHER_PROFILES } = await import('./engine/constants');

// Lot 3b du bestiaire : la Toundra a un halo et une neige allégés ; les autres biomes ne changent pas.
test('Toundra allégée : halo et neige propres au biome, autres biomes inchangés', () => {
  assert.deepEqual(BLOOM_DEFAULT, { strength: 0.45, threshold: 0.86 });
  for (const [id, g] of Object.entries(BIOME_GRADE)) if (id !== 'tundra') assert.equal(g.bloom, undefined, id);
  assert.ok(BIOME_GRADE.tundra.bloom!.threshold > BLOOM_DEFAULT.threshold);
  for (const [id, w] of Object.entries(WEATHER_PROFILES)) if (id !== 'tundra') assert.equal(w.shown, undefined, id);
  // flocons simulés inchangés (mêmes tirages aléatoires : golden identique), seuls certains sont dessinés
  assert.equal(WEATHER_PROFILES.tundra.count, 96);
  assert.ok(WEATHER_PROFILES.tundra.shown! < 96);
});
