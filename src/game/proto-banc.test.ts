/**
 * Banc d'essai n° 1 (src/proto/banc/) : seul le contrôle change d'une variante à l'autre. Ces tests gardent
 * l'essai reproductible, les mêmes statistiques partout, et le Choc de Crabastion comme seule interruption.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG, SPECIES, newBanc, swapControl, trialResults, type Variante } from '../proto/banc/banc';
import { enemies, step } from '../proto/sim';

const run = (v: Variante, seed: number) => {
  const g = newBanc({ ...DEFAULT_CONFIG, variante: v }, seed, false);
  while (!g.result) step(g, g.banc!.aiLeaderInput(g));
  return trialResults(g);
};

test('BANC : un essai joué par l’IA est reproductible et se termine', () => {
  assert.deepEqual(run('0', 4), run('0', 4));
  const r = run('0', 4);
  assert.ok(r.duree_s > 10 && r.duree_s <= 420);
});

test('BANC : mêmes créatures et mêmes statistiques dans les 4 variantes, quelle que soit la créature contrôlée', () => {
  const stats = (v: Variante, sp: (typeof SPECIES)[number]) => {
    const g = newBanc({ ...DEFAULT_CONFIG, variante: v, controlled: sp }, 1, false);
    return g.banc!.team(g).map((u) => `${u.species}:${u.maxHp}:${u.speed}:${u.comp!.dmg}:${u.comp!.range}`).sort();
  };
  const ref = stats('0', 'magmadrake');
  for (const v of ['A', 'B', 'C'] as Variante[]) for (const sp of SPECIES) assert.deepEqual(stats(v, sp), ref);
});

test('BANC : seul le Choc de Crabastion interrompt l’Effondrement, qui ouvre la vulnérabilité', () => {
  const g = newBanc({ ...DEFAULT_CONFIG, variante: 'C' }, 2, false);
  const st = g.banc!;
  const boss = enemies(g).find((e) => e.role === 'boss')!;
  const team = st.team(g);
  for (const u of team) Object.assign(u, { x: boss.x, y: boss.y - 2 });
  boss.channel = true;
  boss.windup = 2;
  st.skill(g, team.find((u) => u.species === 'raicube')!, { x: boss.x, y: boss.y });
  st.skill(g, team.find((u) => u.species === 'magmadrake')!, { x: boss.x, y: boss.y });
  assert.equal(boss.channel, true, 'Raicube et Magmadrake n’interrompent pas');
  st.skill(g, team.find((u) => u.species === 'crabastion')!);
  assert.equal(boss.channel, false);
  assert.ok(boss.healCd > 0, 'fenêtre de vulnérabilité ouverte');
  assert.equal(trialResults(g).interruptions_reussies, 1);
});

test('BANC : C change de créature contrôlée sans rien changer à l’équipe', () => {
  const g = newBanc({ ...DEFAULT_CONFIG, variante: 'C', controlled: 'raicube' }, 1, false);
  const before = g.banc!.team(g).map((u) => `${u.species}:${u.hp}`).sort();
  assert.equal(g.leader.species, 'raicube');
  swapControl(g, 0);
  assert.notEqual(g.leader.species, 'raicube');
  assert.deepEqual(g.banc!.team(g).map((u) => `${u.species}:${u.hp}`).sort(), before);
});

test('BANC : chaque créature a un second sort, lancé par l’IA en variante 0', () => {
  const g = newBanc({ ...DEFAULT_CONFIG, variante: '0' }, 7, false);
  while (!g.result) step(g, g.banc!.aiLeaderInput(g));
  const used = g.banc!.m.skills;
  for (const name of ['Coulée', 'Rempart', 'Chaîne']) assert.ok((used[name] ?? 0) > 0, `${name} jamais lancé : ${JSON.stringify(used)}`);
});
