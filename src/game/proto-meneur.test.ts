/**
 * Sprint PROTO-MENEUR : la maquette `?proto=salle` (src/proto/) est une simulation à part, reproductible,
 * qui ne touche pas au jeu. Ces tests gardent ses règles de base (Élan, réserve, fin de partie).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBot } from '../proto/bots';
import { ELAN, emptyInput, newGame, results, step } from '../proto/sim';

test('PROTO-MENEUR : une partie de robot est reproductible et se termine', () => {
  for (const v of ['A', 'B'] as const) {
    const run = () => {
      const g = newGame(v, 7, false);
      const bot = makeBot('adaptatif');
      while (!g.result) step(g, bot(g));
      return JSON.stringify(results(g));
    };
    const a = run();
    assert.equal(a, run());
    assert.ok(JSON.parse(a).issue !== 'en cours');
  }
});

test('PROTO-MENEUR : version B, l’entrée coûte de l’Élan, deux créatures au plus, le rappel en rend', () => {
  const g = newGame('B', 1, false);
  const enter = (sel: number) => {
    const i = emptyInput();
    i.aim = { x: 0, y: 8 };
    while (g.selected !== sel) {
      const s = emptyInput();
      s.select = 1;
      step(g, s);
    }
    i.enter = true;
    step(g, i);
    for (let k = 0; k < 60; k++) step(g, emptyInput());
  };
  enter(0);
  assert.equal(g.comps[0].inPlay, true);
  assert.ok(g.elan < ELAN.max - ELAN.cost + 0.5);
  g.elan = ELAN.max;
  enter(1);
  g.elan = ELAN.max;
  enter(2);
  assert.equal(g.comps.filter((c) => c.inPlay).length, 2, 'jamais plus de deux en jeu');
  const before = g.elan;
  const r = emptyInput();
  r.recall = true;
  step(g, r);
  for (let k = 0; k < 40; k++) step(g, emptyInput());
  assert.equal(g.comps.filter((c) => c.inPlay).length, 1);
  assert.ok(g.elan >= Math.min(ELAN.max, before + ELAN.refund) - 0.01);
});

test('PROTO-MENEUR : version A, pas de réserve ni d’Élan ; B, pas de sorts de compagnon', () => {
  const a = newGame('A', 1, false);
  assert.equal(a.comps.length, 2);
  assert.ok(a.comps.every((c) => c.inPlay));
  const b = newGame('B', 1, false);
  assert.equal(b.comps.length, 4);
  const i = emptyInput();
  i.comp1 = i.comp2 = true;
  step(b, i);
  assert.equal(b.actions, 0, 'les touches 3 et 4 ne font rien en B');
});
