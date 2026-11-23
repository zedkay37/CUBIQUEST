/**
 * Leçons du début (S07.2) : joueur scripté sur le vrai moteur headless.
 * Il n'agit QUE quand une leçon le lui demande ; un autre joueur fait tout en avance et n'en voit aucune.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { installHeadlessDom, withSeededRandom } from '../../tools/headlessDom';
import { STAGE_BY_ID } from './catalog';
import { createInitialSaveState } from './rules';
import { VoxelEngine } from './VoxelEngine';
import { LESSONS } from './engine/lessons';
import { FR } from '../i18n/fr';

installHeadlessDom();
const STEP = 1 / 60;

type Player = (engine: VoxelEngine) => void;

/** Joue meadow-1 puis meadow-2 avec le trio Braise, en mode Semi ; renvoie les leçons vues dans l'ordre. */
function playLessons(player: Player, seed: number): { order: string[]; done: string[]; results: { victory: boolean; lessonsPassed?: string[] }[] } {
  return withSeededRandom(seed, () => {
    const order: string[] = [];
    const done: string[] = [];
    const results: { victory: boolean; lessonsPassed?: string[] }[] = [];
    const engine = new VoxelEngine(
      null,
      {
        onHudUpdate: (snap) => {
          if (snap.lesson && order[order.length - 1] !== snap.lesson.id) order.push(snap.lesson.id);
        },
        onExpeditionComplete: (r) => results.push(r),
        onLessonDone: (id) => done.push(id),
      },
      { headless: true },
    );
    const save = createInitialSaveState('braise', true);
    const squad = save.squadIds.map((uid) => save.roster.find((c) => c.uid === uid)!);
    for (const id of ['meadow-1', 'meadow-2']) {
      engine.setScreenState('playing');
      engine.setLessonsDone(done);
      engine.startExpedition(STAGE_BY_ID[id], squad, save.powerStones, 'semi');
      let t = 0;
      const before = results.length;
      while (results.length === before && t < 240) {
        player(engine);
        engine.stepSimulation(STEP);
        t += STEP;
      }
    }
    engine.dispose();
    return { order, done, results };
  });
}

/** Ne fait que ce que la leçon en cours demande. */
const obedient: Player = (engine) => {
  const lesson = engine.lessonActive;
  if (lesson === 'cast') engine.triggerAllySkill(0);
  if (lesson === 'burst' || lesson === 'trio') {
    const want = lesson === 'burst' ? 'burst' : 'trio';
    for (let s = 0; s < 3; s++) if (engine.getSkillPreview(s) === want) engine.triggerAllySkill(s);
  }
  if (lesson === 'dodge') {
    const left = engine.getNextHazardImpact();
    if (left !== null && left <= 0.18) engine.triggerDodge();
  }
  if (lesson === 'ultimate') engine.triggerUltimate();
};

test('Leçons: elles se déclenchent dans l’ordre et se valident (joueur qui obéit)', () => {
  const { order, done } = playLessons(obedient, 3);
  assert.deepEqual(order, ['cast', 'burst', 'dodge', 'trio', 'ultimate']);
  assert.deepEqual([...done].sort(), ['burst', 'cast', 'dodge', 'trio', 'ultimate']);
});

test('Leçons: un joueur qui fait les gestes en avance n’en voit aucune', () => {
  // ce joueur lance tout dès que possible, esquive juste avant chaque impact et lance le Déchaînement
  const ahead: Player = (engine) => {
    for (let s = 0; s < 3; s++) {
      const p = engine.getSkillPreview(s);
      if (p === 'trio' || p === 'burst' || p === 'cube') engine.triggerAllySkill(s);
    }
    const left = engine.getNextHazardImpact();
    if (left !== null && left <= 0.18) engine.triggerDodge();
    engine.triggerUltimate();
  };
  const withLessons = playLessons(ahead, 3);
  // aucune leçon de sort, d'Éclat ni de Trio ne s'affiche : les gestes viennent avant
  assert.ok(!withLessons.order.includes('cast'), withLessons.order.join(','));
  assert.ok(!withLessons.order.includes('burst'), withLessons.order.join(','));
});

test('Leçons: phrases de 60 caractères au plus, une par leçon', () => {
  for (const l of LESSONS) {
    const text = FR.engine.lecons[l.id];
    assert.ok(text.length > 0 && text.length <= 60, `${l.id} : ${text.length}`);
  }
});

test('Leçons: les outils (sans setLessonsDone) n’en voient jamais', () => {
  withSeededRandom(1, () => {
    let seen = false;
    const engine = new VoxelEngine(null, { onHudUpdate: (s) => (seen ||= Boolean(s.lesson)), onExpeditionComplete: () => {} }, { headless: true });
    const save = createInitialSaveState('braise', true);
    engine.setScreenState('playing');
    engine.startExpedition(STAGE_BY_ID['meadow-1'], save.roster, save.powerStones, 'semi');
    for (let i = 0; i < 60 * 30; i++) engine.stepSimulation(STEP);
    assert.equal(seen, false);
    assert.equal(engine.lessonsOn, false);
    engine.dispose();
  });
});
