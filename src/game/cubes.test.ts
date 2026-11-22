/**
 * Règles pures des cubes d'élément (S04, plan section 5.1) : Éclats, maturation, Trio, verrou.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_KIT } from './balance';
import { BURSTS } from './catalog';
import { pickSkillTarget, resolveCubeHit, type CubeTargetState } from './rules';
import type { ElementType } from './types';

const ELEMENTS: ElementType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'psychic'];
const ripe = (element: ElementType): CubeTargetState => ({
  cube: { element, age: CUBE_KIT.ripenTime + 0.01, remaining: 2 },
  crack: null,
  trioLock: 0,
});

test('Cubes: valeurs du kit (plan, fiche S04.1)', () => {
  assert.deepEqual(
    { ...CUBE_KIT },
    {
      duration: 5, ripenTime: 1.2, weakBurstMult: 1.15, crackDuration: 3, trioLock: 2, trioDamageMult: 2,
      trioSplashRatio: 0.5, trioSplashRadius: 5, trioCooldownRefund: 1, burstUltBonus: 8, trioUltBonus: 25,
    },
  );
});

test('Cubes: les 30 paires ordonnées donnent l’Éclat de l’élément qui fait éclater', () => {
  const expected: Record<ElementType, [string, number, string]> = {
    fire: ['deflagration', 1.45, 'aoe_burn'],
    water: ['deferlante', 1.65, 'knockback'],
    grass: ['seve', 1.3, 'team_heal'],
    electric: ['arc', 1.4, 'chain_stun'],
    rock: ['rempart', 1.25, 'team_shield'],
    psychic: ['echo', 1.35, 'cd_spread'],
  };
  let pairs = 0;
  for (const onTarget of ELEMENTS) {
    for (const incoming of ELEMENTS) {
      if (onTarget === incoming) continue;
      assert.equal(resolveCubeHit(ripe(onTarget), incoming, { allowTrio: true }), 'burst', `${onTarget} <- ${incoming}`);
      const b = BURSTS[incoming];
      assert.deepEqual([b.id, b.damageMult, b.effect], expected[incoming]);
      assert.equal(b.element, incoming);
      pairs++;
    }
  }
  assert.equal(pairs, 30);
});

test('Cubes: pose, même élément = refresh, cube pas mûr = Éclat faible', () => {
  const empty: CubeTargetState = { cube: null, crack: null, trioLock: 0 };
  assert.equal(resolveCubeHit(empty, 'fire', { allowTrio: true }), 'cube');
  assert.equal(resolveCubeHit({ ...empty, cube: { element: 'fire', age: 3, remaining: 0 } }, 'water', { allowTrio: true }), 'cube');
  for (const e of ELEMENTS) assert.equal(resolveCubeHit(ripe(e), e, { allowTrio: true }), 'refresh');
  const young: CubeTargetState = { cube: { element: 'fire', age: 1.19, remaining: 4 }, crack: null, trioLock: 0 };
  assert.equal(resolveCubeHit(young, 'water', { allowTrio: true }), 'weak');
  assert.equal(resolveCubeHit(young, 'fire', { allowTrio: true }), 'refresh');
  assert.equal(resolveCubeHit({ ...young, cube: { ...young.cube!, age: 1.2 } }, 'water', { allowTrio: true }), 'burst');
});

test('Cubes: le Trio demande une Fêlure active et un troisième élément, et allowTrio', () => {
  const cracked: CubeTargetState = { cube: null, crack: { elements: ['fire', 'rock'], remaining: 1.5 }, trioLock: 0 };
  assert.equal(resolveCubeHit(cracked, 'electric', { allowTrio: true }), 'trio');
  // un des deux éléments de la Fêlure : pas de Trio, simple pose
  assert.equal(resolveCubeHit(cracked, 'fire', { allowTrio: true }), 'cube');
  assert.equal(resolveCubeHit(cracked, 'rock', { allowTrio: true }), 'cube');
  // Fêlure expirée
  assert.equal(resolveCubeHit({ ...cracked, crack: { elements: ['fire', 'rock'], remaining: 0 } }, 'electric', { allowTrio: true }), 'cube');
  // jamais de Trio si allowTrio est faux (mode Auto)
  for (const e of ELEMENTS) assert.notEqual(resolveCubeHit(cracked, e, { allowTrio: false }), 'trio');
});

test('Cubes: rien pendant le verrou du Trio', () => {
  const locked: CubeTargetState = { cube: null, crack: { elements: ['fire', 'rock'], remaining: 2 }, trioLock: 0.5 };
  for (const e of ELEMENTS) assert.equal(resolveCubeHit(locked, e, { allowTrio: true }), 'locked');
  assert.equal(resolveCubeHit({ ...ripe('fire'), trioLock: 1 }, 'water', { allowTrio: true }), 'locked');
});

test('Ciblage intelligent: Trio, puis Éclat, puis boss ou plus proche, puis cube pas mûr', () => {
  const none = { cube: null, crack: null, trioLock: 0 };
  const c = (id: string, dist: number, state: CubeTargetState = none, isBoss = false) => ({ id, dist, isBoss, state });
  const ripeRock: CubeTargetState = { cube: { element: 'rock', age: 2, remaining: 3 }, crack: null, trioLock: 0 };
  const youngRock: CubeTargetState = { cube: { element: 'rock', age: 0.3, remaining: 4 }, crack: null, trioLock: 0 };
  const cracked: CubeTargetState = { cube: null, crack: { elements: ['rock', 'water'], remaining: 2 }, trioLock: 0 };
  // 1. le Trio passe avant tout, même plus loin
  assert.equal(pickSkillTarget([c('near', 1), c('burst', 3, ripeRock), c('trio', 6, cracked)], 'fire', 8, true), 'trio');
  // 2. sans Trio possible (Auto), l'Éclat plein passe avant le reste
  assert.equal(pickSkillTarget([c('near', 1), c('burst', 3, ripeRock), c('trio', 6, cracked)], 'fire', 8, false), 'burst');
  // 3. sinon le boss d'abord, puis le plus proche
  assert.equal(pickSkillTarget([c('near', 1), c('boss', 5, none, true)], 'fire', 8, true), 'boss');
  assert.equal(pickSkillTarget([c('far', 4), c('near', 1)], 'fire', 8, true), 'near');
  // 4. un cube pas mûr n'est visé qu'en dernier recours
  assert.equal(pickSkillTarget([c('young', 1, youngRock), c('free', 6)], 'fire', 8, true), 'free');
  assert.equal(pickSkillTarget([c('young', 1, youngRock)], 'fire', 8, true), 'young');
  // 5. hors de portée : personne (le moteur reprend alors le plus proche)
  assert.equal(pickSkillTarget([c('trio', 9, cracked)], 'fire', 8, true), null);
});
