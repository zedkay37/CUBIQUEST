/**
 * Leçons du début de partie (S07.2) : apprendre en jouant, sans fenêtre qui bloque.
 *
 * Une leçon = un niveau, un déclencheur, une touche qui s'allume, une phrase courte (fr.ts, 60 caractères
 * au plus) et une condition de réussite. Jamais deux phrases à la fois. Un geste réussi AVANT sa leçon la
 * marque faite sans l'afficher.
 *
 * Les leçons ne tournent que si l'interface les active (`setLessonsDone`) : les outils (sim, golden) ne
 * les voient jamais, la simulation reste identique.
 */
import { CUBE_KIT } from '../balance';
import { FR } from '../../i18n/fr';
import type { VoxelEngine } from '../VoxelEngine';
import { getNextHazardImpact } from './fx';
import { getSkillPreview } from './cubes';
import { triggerAllySkill } from './skills';

export type LessonId = 'cast' | 'burst' | 'dodge' | 'trio' | 'ultimate';
export type LessonKey = '1' | '2' | '3' | 'Espace' | 'R';

export interface LessonDef {
  id: LessonId;
  /** Niveau où la leçon peut apparaître. */
  stageId: string;
  /** Touche allumée dans le HUD. */
  key: LessonKey;
}

/** Ordre d'apparition. Le niveau 3 n'a aucun texte : son boss à trois phases est l'examen. */
export const LESSONS: LessonDef[] = [
  { id: 'cast', stageId: 'meadow-1', key: '1' },
  { id: 'burst', stageId: 'meadow-1', key: '2' },
  { id: 'dodge', stageId: 'meadow-1', key: 'Espace' },
  { id: 'trio', stageId: 'meadow-2', key: '3' },
  { id: 'ultimate', stageId: 'meadow-2', key: 'R' },
];
export const LESSON_IDS = LESSONS.map((l) => l.id);

/** Pendant la leçon d'esquive : le temps passe à 0,3× dès que le contour clignote ; un impact raté ne fait que 30 %. */
export const LESSON_DODGE = { blinkAt: 0.6, slowScale: 0.3, missedDamageMult: 0.3 };

export function lessonText(id: LessonId): string {
  return FR.engine.lecons[id];
}

/** Le geste de la leçon a-t-il été réussi dans ce combat ? */
function gestureDone(self: VoxelEngine, id: LessonId): boolean {
  switch (id) {
    case 'cast':
      return self.cubesPlaced > 0;
    case 'burst':
      return self.burstsTriggered > 0;
    case 'dodge':
      return self.perfectDodges > 0;
    case 'trio':
      return self.triosTriggered > 0;
    case 'ultimate':
      return self.ultimatesUsed > 0;
  }
}

/** Le déclencheur de la leçon est-il là ? */
function triggered(self: VoxelEngine, id: LessonId): boolean {
  const living = self.enemies.filter((e) => !e.fainted && !e.removed && !e.isAlly);
  switch (id) {
    case 'cast':
      // premier ennemi à portée d'un sort
      // le sort du compagnon 1 est prêt et une cible est à portée
      return Boolean(self.allies[0] && !self.allies[0].fainted && self.allies[0].skillCooldown <= 0 && getSkillPreview(self, 0) !== 'far') && living.length > 0;
    case 'burst':
      // le cube est mûr et un compagnon prêt peut le faire éclater
      return living.some((e) => e.cube && e.cube.age >= CUBE_KIT.ripenTime) && readyWith(self, 'burst');
    case 'dodge': {
      const left = getNextHazardImpact(self);
      return left !== null && left <= LESSON_DODGE.blinkAt;
    }
    case 'trio':
      return living.some((e) => e.crack) && readyWith(self, 'trio');
    case 'ultimate':
      return self.waveIndex >= 2;
  }
}

/** Un pas de leçon, appelé à chaque pas de combat. */
/** Secondes pendant lesquelles le déclencheur doit tenir avant d'afficher la leçon. */
export const LESSON_GRACE = 0.4;

export function updateLessons(self: VoxelEngine, simDt: number): void {
  if (!self.lessonsOn || !self.activeStage || self.controlMode === 'auto' || self.expeditionEnded) return;
  const stageId = self.activeStage.id;

  // Réussites (leçon en cours ou geste fait en avance)
  for (const l of LESSONS) {
    if (self.lessonsDone.has(l.id) || !gestureDone(self, l.id)) continue;
    // un sort lancé à la main avant la leçon « 1 » compte comme fait en avance
    self.lessonsDone.add(l.id);
    if (self.lessonActive === l.id) {
      self.lessonsPassed.push(l.id);
      self.lessonActive = null;
    }
    self.callbacks.onLessonDone?.(l.id);
  }
  if (self.lessonActive === null && !self.lessonsDone.has('cast') && self.manualCasts > 0) {
    self.lessonsDone.add('cast');
    self.callbacks.onLessonDone?.('cast');
  }

  // Déclenchement de la prochaine leçon du niveau (une seule à la fois, dans l'ordre)
  if (self.lessonActive === null) {
    const next = LESSONS.find((l) => l.stageId === stageId && !self.lessonsDone.has(l.id));
    // délai de grâce : le joueur qui fait déjà le geste ne voit pas la leçon (sauf esquive et Déchaînement)
    const grace = next && (next.id === 'dodge' || next.id === 'ultimate') ? 0 : LESSON_GRACE;
    const ready = Boolean(next && triggered(self, next.id));
    self.lessonTriggerAge = ready ? self.lessonTriggerAge + simDt : 0;
    if (next && ready && self.lessonTriggerAge >= grace) {
      self.lessonTriggerAge = 0;
      self.lessonActive = next.id;
      if (!self.lessonsSeen.includes(next.id)) self.lessonsSeen.push(next.id);
      // la leçon du Déchaînement remplit la jauge pour qu'on puisse essayer tout de suite
      if (next.id === 'ultimate') self.ultimateCharge = 100;
    }
  }

  // Aide du débutant : tant que la leçon suivante attend un cube mûr ou une Fêlure, le jeu les prépare
  // lui-même (le joueur n'a qu'à faire le geste demandé). Jamais pendant qu'une leçon attend le joueur.
  if (self.lessonActive === null) assistNextLesson(self, stageId);

  // Leçon d'esquive : ralenti dès que le contour clignote
  if (self.lessonActive === 'dodge') {
    const left = getNextHazardImpact(self);
    if (left !== null && left <= LESSON_DODGE.blinkAt) {
      self.slowMoScale = LESSON_DODGE.slowScale;
      self.slowMoTimer = Math.max(self.slowMoTimer, 0.05);
    }
  }
}

function assistNextLesson(self: VoxelEngine, stageId: string): void {
  const next = LESSONS.find((l) => l.stageId === stageId && !self.lessonsDone.has(l.id));
  if (!next || (next.id !== 'burst' && next.id !== 'trio')) return;
  const living = self.enemies.filter((e) => !e.fainted && !e.removed);
  if (next.id === 'trio' && living.some((e) => e.crack)) return;
  const previews = [0, 1, 2].map((s) => getSkillPreview(self, s));
  const hasCube = living.some((e) => e.cube);
  if (!hasCube) {
    // poser un cube
    const s = previews.indexOf('cube');
    if (s >= 0) triggerAllySkill(self, s);
    return;
  }
  // pour la leçon du Trio : faire éclater le cube mûr (ce qui laisse une Fêlure)
  if (next.id === 'trio') {
    const s = previews.indexOf('burst');
    if (s >= 0) triggerAllySkill(self, s);
  }
}

/** Remise à zéro de l'état d'une leçon (changement de scène). */
export function resetLessonState(self: VoxelEngine): void {
  self.lessonActive = null;
  self.lessonsSeen = [];
  self.lessonsPassed = [];
  self.manualCasts = 0;
  self.lessonTriggerAge = 0;
}

/** Un compagnon prêt (sort rechargé) ferait ce geste maintenant. */
function readyWith(self: VoxelEngine, want: 'burst' | 'trio'): boolean {
  return [0, 1, 2].some((s) => {
    const a = self.allies[s];
    return Boolean(a && !a.fainted && a.skillCooldown <= 0 && getSkillPreview(self, s) === want);
  });
}
