import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveState, createOwnedCreature, swapSquadMember, toggleVariant } from './rules';
import type { SaveState } from './types';

test('Équipe (A3.3): échanger un membre de l’escouade contre la réserve, à la même place', () => {
  const base = createInitialSaveState('braise', true);
  const [a, b, c] = base.squadIds;
  assert.equal(base.squadIds.length, 3);
  const save: SaveState = {
    ...base,
    roster: [...base.roster, createOwnedCreature('givrelin', 5, 0, 'givre'), createOwnedCreature('flambrix', 10, 0, 'dup')],
  };
  // le meneur remplacé : le nouveau prend sa place de meneur
  const swapped = swapSquadMember(save, a, 'givre');
  assert.deepEqual(swapped.squadIds, ['givre', b, c]);
  // une créature de la même lignée remplace celle qu'elle chasse : permis
  const pyroUid = base.roster.find((x) => x.speciesId === 'pyrocube')!.uid;
  assert.ok(base.squadIds.includes(pyroUid));
  const same = swapSquadMember(save, pyroUid, 'dup');
  assert.ok(same.squadIds.includes('dup'));
  assert.ok(!same.squadIds.includes(pyroUid));
  // ... mais pas à la place d'un autre membre (deux Pyrocube dans l'escouade)
  const other = base.squadIds.find((id) => id !== pyroUid)!;
  assert.equal(swapSquadMember(save, other, 'dup'), save);
  // refus : sortant absent de l'escouade, entrant déjà dedans ou inconnu
  assert.equal(swapSquadMember(save, 'givre', 'dup'), save);
  assert.equal(swapSquadMember(save, a, b), save);
  assert.equal(swapSquadMember(save, a, 'nobody'), save);
  // jamais de doublon, toujours 3 membres
  assert.equal(new Set(swapped.squadIds).size, 3);
});

test('Équipe (A3.3): la variante de couleur ne s’active que débloquée, et se coupe', () => {
  const base = createInitialSaveState('braise', true);
  const locked = toggleVariant(base, 'pyrocube');
  assert.equal(locked, base);
  const unlocked: SaveState = { ...base, variantsUnlocked: ['pyrocube'] };
  const on = toggleVariant(unlocked, 'pyrocube');
  assert.deepEqual(on.variantsOn, ['pyrocube']);
  const off = toggleVariant(on, 'pyrocube');
  assert.deepEqual(off.variantsOn, []);
  assert.deepEqual(off.variantsUnlocked, ['pyrocube']);
});
