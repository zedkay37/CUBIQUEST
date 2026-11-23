import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeTarget, nextDrawer } from './uiNav';

test('Navigation (A1.2): un autre bouton du dock ferme l’écran en cours et ouvre le sien', () => {
  assert.equal(nextDrawer(null, 'team'), 'team');
  assert.equal(nextDrawer('team', 'codex'), 'codex');
  assert.equal(nextDrawer('codex', 'codex'), null);
});

test('Navigation (A1.2): Échap ferme toujours la fenêtre du dessus', () => {
  const none = { arrival: false, recruit: false, outcome: false, drawer: false };
  assert.equal(escapeTarget(none), null);
  assert.equal(escapeTarget({ ...none, drawer: true }), 'drawer');
  assert.equal(escapeTarget({ ...none, drawer: true, recruit: true }), 'recruit');
  assert.equal(escapeTarget({ ...none, outcome: true }), 'outcome');
  assert.equal(escapeTarget({ arrival: true, recruit: true, outcome: true, drawer: true }), 'arrival');
});
