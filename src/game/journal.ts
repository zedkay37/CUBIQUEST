/**
 * Journal de test (S07.4) : une ligne par combat, rangée dans le navigateur (`localStorage`), jamais envoyée.
 * Le joueur peut l'exporter en `.json` depuis les options ; `npm run journal -- fichier.json` le résume.
 * Logique pure ici (ajout, résumé) ; la lecture et l'écriture du stockage sont protégées (try/catch).
 */
import { withSaveSlot } from './saveSlot';

export const JOURNAL_MAX = 500;
export const JOURNAL_STORAGE_KEY = 'cubiquest-journal-v1';

export interface JournalEntry {
  /** Date du combat (ISO). */
  at: string;
  stageId: string;
  squad: { speciesId: string; level: number }[];
  mode: 'auto' | 'semi' | 'manual';
  victory: boolean;
  durationSec: number;
  bursts: number;
  weakBursts: number;
  trios: number;
  dodges: number;
  perfectDodges: number;
  hazardHits: number;
  ultimates: number;
  /** PV restants du boss (en %) en cas de défaite, null après une victoire. */
  bossHpLeft: number | null;
  /** Après une défaite : le joueur a-t-il relancé le même niveau ? null tant qu'on ne sait pas. */
  retried: boolean | null;
  /** Leçons montrées et réussies pendant ce combat. */
  lessonsSeen: string[];
  lessonsPassed: string[];
}

/** Ajoute une ligne ; garde les JOURNAL_MAX dernières. */
export function appendJournal(list: JournalEntry[], entry: JournalEntry): JournalEntry[] {
  const next = [...list, entry];
  return next.length > JOURNAL_MAX ? next.slice(next.length - JOURNAL_MAX) : next;
}

/**
 * Un nouveau combat commence : si la dernière ligne est une défaite pas encore qualifiée, on note
 * si le joueur relance le même niveau (oui) ou passe à autre chose (non).
 */
export function markRetry(list: JournalEntry[], nextStageId: string): JournalEntry[] {
  const last = list[list.length - 1];
  if (!last || last.victory || last.retried !== null) return list;
  return [...list.slice(0, -1), { ...last, retried: last.stageId === nextStageId }];
}

/** Lit une liste venue d'un fichier ou du stockage : toute ligne mal formée est ignorée. */
export function parseJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is JournalEntry =>
      Boolean(e) && typeof e === 'object' && typeof (e as JournalEntry).stageId === 'string' && typeof (e as JournalEntry).victory === 'boolean',
  );
}

export interface JournalStageSummary {
  stageId: string;
  fights: number;
  wins: number;
  defeats: number;
  retries: number;
  /** Moyennes par combat. */
  bursts: number;
  trios: number;
  perfectDodges: number;
  hazardHits: number;
  ultimates: number;
}

export interface JournalSummary {
  fights: number;
  stages: JournalStageSummary[];
  /** Niveaux où ça bloque : au moins 3 défaites, ou moins d'une victoire sur deux après 4 combats. */
  blocking: string[];
  /** Leçons montrées sans être réussies (nombre de fois). */
  missedLessons: Record<string, number>;
}

const avg = (xs: number[]): number => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

export function summarizeJournal(list: JournalEntry[]): JournalSummary {
  const order: string[] = [];
  const by: Record<string, JournalEntry[]> = {};
  for (const e of list) {
    if (!by[e.stageId]) {
      by[e.stageId] = [];
      order.push(e.stageId);
    }
    by[e.stageId].push(e);
  }
  const stages = order.map((stageId) => {
    const es = by[stageId];
    const wins = es.filter((e) => e.victory).length;
    return {
      stageId,
      fights: es.length,
      wins,
      defeats: es.length - wins,
      retries: es.filter((e) => e.retried === true).length,
      bursts: avg(es.map((e) => e.bursts)),
      trios: avg(es.map((e) => e.trios)),
      perfectDodges: avg(es.map((e) => e.perfectDodges)),
      hazardHits: avg(es.map((e) => e.hazardHits)),
      ultimates: avg(es.map((e) => e.ultimates)),
    };
  });
  const blocking = stages.filter((s) => s.defeats >= 3 || (s.fights >= 4 && s.wins / s.fights < 0.5)).map((s) => s.stageId);
  const missedLessons: Record<string, number> = {};
  for (const e of list) for (const l of e.lessonsSeen ?? []) if (!(e.lessonsPassed ?? []).includes(l)) missedLessons[l] = (missedLessons[l] ?? 0) + 1;
  return { fights: list.length, stages, blocking, missedLessons };
}

// ---- stockage du navigateur (protégé : navigation privée, stockage plein ou bloqué)

export function loadJournal(): JournalEntry[] {
  try {
    const raw = window.localStorage.getItem(withSaveSlot(JOURNAL_STORAGE_KEY));
    return raw ? parseJournal(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveJournal(list: JournalEntry[]): void {
  try {
    window.localStorage.setItem(withSaveSlot(JOURNAL_STORAGE_KEY), JSON.stringify(list));
  } catch {
    // stockage indisponible : le journal n'est simplement pas gardé
  }
}

export function clearJournal(): void {
  try {
    window.localStorage.removeItem(withSaveSlot(JOURNAL_STORAGE_KEY));
  } catch {
    // rien à faire
  }
}
