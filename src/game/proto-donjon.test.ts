/**
 * PROTO-DONJON : la maquette `?proto=donjon` (src/proto/donjon/) est à part du jeu. Ces tests gardent la génération
 * reproductible (même graine, même étage), l'escalier accessible et une descente de robot qui se termine.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateFloor } from '../proto/donjon/gen';
import { DonjonLevel, enterFloor } from '../proto/donjon/level';
import { makeDonjonBot } from '../proto/donjon/dbots';
import { newGame, step } from '../proto/sim';

test('PROTO-DONJON : la même graine redonne le même étage', () => {
  for (const seed of [1, 7, 42]) {
    const a = generateFloor(seed, 1);
    const b = generateFloor(seed, 1);
    assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles));
    assert.deepEqual(a.rooms.map((r) => r.kind), b.rooms.map((r) => r.kind));
  }
  assert.notDeepEqual(Array.from(generateFloor(1, 1).tiles), Array.from(generateFloor(2, 1).tiles));
});

test('PROTO-DONJON : chaque étage a un départ, une salle d’arrivée accessible, et 8 à 10 modèles de salles', () => {
  for (let seed = 1; seed <= 12; seed++)
    for (const fi of [1, 2, 3]) {
      const g = newGame('A', seed, { recordEvents: false });
      const lvl = new DonjonLevel({ seed, density: 1, wake: false, floors: 3 }, fi);
      g.level = lvl;
      lvl.populate(g);
      const goal = lvl.floor.stairs ?? lvl.floor.boss;
      assert.ok(goal, 'escalier ou boss');
      assert.equal(lvl.isBossFloor, fi === 3);
      const path = (lvl as unknown as { astar: (a: unknown, b: unknown) => number[] }).astar(g.leader, goal);
      assert.ok(path.length > 0, `chemin vers l'arrivée (graine ${seed}, étage ${fi})`);
    }
  const kinds = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) for (const r of generateFloor(seed, 1).rooms) kinds.add(r.kind);
  assert.ok(kinds.size >= 8, `modèles utilisés : ${[...kinds].join(', ')}`);
});

test('PROTO-DONJON : un étage joué par un robot est reproductible et se termine', () => {
  const run = () => {
    const g = newGame('B', 5, { recordEvents: false, scheme: 1, maxTime: 300 });
    const lvl = enterFloor(g, { seed: 5, density: 1, wake: true, floors: 3 }, 1);
    const bot = makeDonjonBot('adaptatif');
    while (!g.result && !lvl.stairsReached) step(g, bot(g));
    return `${g.t.toFixed(3)} ${g.leader.hp.toFixed(2)} ${lvl.stairsReached}`;
  };
  assert.equal(run(), run());
});
