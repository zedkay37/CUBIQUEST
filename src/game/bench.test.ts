import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeFrames } from '../components/BenchOverlay';

test('Mesure ?bench=1 (G1.1): images par seconde moyennes et 5 % les plus lentes', () => {
  // 95 images à 10 ms, 5 images à 50 ms
  const frames = [...Array(95).fill(10), ...Array(5).fill(50)];
  const r = summarizeFrames(frames, [100, 120], [5000, 7000], 'haut');
  assert.equal(r.frames, 100);
  assert.equal(r.avgFps, 83.3); // 100 images en 1,2 s
  assert.equal(r.low5Fps, 20);
  assert.equal(r.avgDrawCalls, 110);
  assert.equal(r.avgTriangles, 6000);
  assert.equal(r.quality, 'haut');
});

test('Qualité (G1.2): l’Automatique descend d’un cran après 3 s sous 45 images/s ; options normalisées', async () => {
  const { nextAutoLevel } = await import('./engine/postfx');
  const { normalizeSettings } = await import('./settings');
  assert.equal(nextAutoLevel('high', 2.9), 'high');
  assert.equal(nextAutoLevel('high', 3), 'medium');
  assert.equal(nextAutoLevel('medium', 3.5), 'low');
  assert.equal(nextAutoLevel('low', 10), 'low');
  assert.equal(normalizeSettings({}).quality, 'auto');
  assert.equal(normalizeSettings({ quality: 'medium' }).quality, 'medium');
  assert.equal(normalizeSettings({ quality: 'ultra' }).quality, 'auto');
});
