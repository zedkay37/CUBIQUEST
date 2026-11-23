import test from 'node:test';
import assert from 'node:assert/strict';
import { appendJournal, JOURNAL_MAX, markRetry, parseJournal, summarizeJournal, type JournalEntry } from './journal';
import { journalReport } from '../../tools/journal';

const entry = (o: Partial<JournalEntry> = {}): JournalEntry => ({
  at: '2026-11-23T10:00:00.000Z',
  stageId: 'meadow-1',
  squad: [{ speciesId: 'pyrocube', level: 4 }],
  mode: 'semi',
  victory: true,
  durationSec: 30,
  bursts: 2,
  weakBursts: 1,
  trios: 0,
  dodges: 3,
  perfectDodges: 1,
  hazardHits: 1,
  ultimates: 1,
  bossHpLeft: null,
  retried: null,
  lessonsSeen: [],
  lessonsPassed: [],
  ...o,
});

test('Journal (S07.4): 500 lignes au plus, relance notée, export relu et résumé', () => {
  let list: JournalEntry[] = [];
  for (let i = 0; i < JOURNAL_MAX + 20; i++) list = appendJournal(list, entry({ durationSec: i }));
  assert.equal(list.length, JOURNAL_MAX);
  assert.equal(list[0].durationSec, 20);
  // défaite puis relance du même niveau : oui ; puis autre niveau : non
  let j = appendJournal([], entry({ victory: false, bossHpLeft: 32, lessonsSeen: ['dodge'] }));
  j = markRetry(j, 'meadow-1');
  assert.equal(j[0].retried, true);
  j = appendJournal(j, entry({ victory: false, bossHpLeft: 10 }));
  j = markRetry(j, 'meadow-2');
  assert.equal(j[1].retried, false);
  // une victoire n'est jamais qualifiée de relance
  assert.equal(markRetry(appendJournal([], entry()), 'meadow-1')[0].retried, null);
  j = appendJournal(j, entry({ victory: false }));
  // export -> fichier -> relecture (les lignes abîmées sont ignorées)
  const parsed = parseJournal(JSON.parse(JSON.stringify([...j, { foo: 1 }, null])));
  assert.equal(parsed.length, 3);
  const s = summarizeJournal(parsed);
  assert.equal(s.stages[0].stageId, 'meadow-1');
  assert.equal(s.stages[0].defeats, 3);
  assert.equal(s.stages[0].retries, 1);
  assert.deepEqual(s.blocking, ['meadow-1']);
  assert.deepEqual(s.missedLessons, { dodge: 1 });
  const md = journalReport(parsed);
  assert.match(md, /\| meadow-1 \| 3 \| 0 \| 3 \| 1 \|/);
  assert.match(md, /Leçons ratées : dodge \(1\)/);
});
