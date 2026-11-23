import React, { useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, RotateCcw, Search, Upload } from 'lucide-react';
import { BIOMES, ELEMENT_META, SPECIES, STAGES } from '../game/catalog';
import { exportSaveToJson, importSaveFromJson } from '../game/rules';
import type { CodexAnswer, SaveState } from '../game/types';
import { FR, GAME_TITLE } from '../i18n/fr';
import { JournalPanel } from './JournalPanel';
import { BlockButton } from './ui';

const T = FR.ui.carnet;

/**
 * Onglet « Sauvegarde et journal » du Carnet (A3.2) : repris tel quel de l'ancien écran des quêtes
 * (export / import JSON, leçons, journal de test, réinitialisation en deux temps).
 */
export function CarnetSavePanel({
  save,
  onImportSave,
  onResetSave,
  onReplayLessons,
}: {
  save: SaveState;
  onImportSave: (nextSave: SaveState) => void;
  onResetSave: () => void;
  onReplayLessons?: () => void;
}) {
  const [pasteJson, setPasteJson] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadJson = () => {
    const json = exportSaveToJson(save);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${GAME_TITLE.toLowerCase()}-sauvegarde-v${save.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ kind: 'success', text: T.fichierDeSauvegardeTelechargeJson });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportSaveToJson(save));
      setCopied(true);
      setFeedback({ kind: 'success', text: T.sauvegardeCopieeDansLePressePapiers });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ kind: 'error', text: T.impossibleDAccederAuPressePapiers });
    }
  };

  const applyRawImport = (raw: string) => {
    const res = importSaveFromJson(raw);
    if (!res.ok) {
      setFeedback({ kind: 'error', text: res.error });
      return;
    }
    onImportSave(res.save);
    setPasteJson('');
    setConfirmReset(false);
    setFeedback({
      kind: 'success',
      text: T.sauvegardeRestaureeCreaturesNiveaux(res.save.roster.length, res.save.completedStageIds.length, STAGES.length),
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      applyRawImport(await file.text());
    } catch {
      setFeedback({ kind: 'error', text: T.erreurLorsDeLaLectureDu });
    }
  };

  const stats: [string, number, string][] = [
    [T.expeditions, save.stats.expeditionsWon, 'text-[#FAF7F0]'],
    [T.eclats, save.stats.burstsTriggered, 'text-[#F4B942]'],
    [T.trios, save.stats.triosTriggered, 'text-[#38BDF8]'],
    [T.creatures, save.roster.length, 'text-[#2FB97A]'],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {stats.map(([label, value, color]) => (
          <div key={label} className="rounded-xl bg-[#202838] border border-[#39445A] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">{label}</p>
            <p className={`font-mono-num text-lg font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl px-4 py-2.5 border text-xs font-semibold ${
            feedback.kind === 'success' ? 'bg-[#1D2D27] border-[#2FB97A] text-[#A7F3D0]' : 'bg-[#311A21] border-[#E85D3F] text-[#FECACA]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="rounded-xl bg-[#141A26] border border-[#39445A] p-4 space-y-2.5">
        <h3 className="font-display font-bold text-sm text-[#FAF7F0]">{T.exporterVotreSauvegarde(save.version)}</h3>
        <p className="text-xs text-[#B8C2D1]">{T.conservezUneCopieDeVotreEquipe}</p>
        <div className="flex flex-wrap gap-2">
          <BlockButton variant="primary" size="sm" onClick={handleDownloadJson}>
            <Download className="w-4 h-4" />
            <span>{T.telechargerJson}</span>
          </BlockButton>
          <BlockButton variant="secondary" size="sm" onClick={handleCopyJson}>
            {copied ? <Check className="w-4 h-4 text-[#2FB97A]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? T.copie : T.copierLeJson}</span>
          </BlockButton>
        </div>
      </div>

      <div className="rounded-xl bg-[#141A26] border border-[#39445A] p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-bold text-sm text-[#FAF7F0]">{T.importerUneSauvegardeJson}</h3>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileSelected} className="hidden" />
          <BlockButton variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>{T.choisirUnFichierJson}</span>
          </BlockButton>
        </div>
        <textarea
          value={pasteJson}
          onChange={(e) => setPasteJson(e.target.value)}
          rows={4}
          aria-label={T.collerJsonAria}
          placeholder={T.ouCollezIciLeContenuJson}
          className="w-full rounded-lg bg-[#0F1420] border border-[#39445A] p-2.5 text-xs font-mono-num text-[#FAF7F0] placeholder:text-[#64748B] focus:outline-none focus:border-[#F4B942]"
        />
        <div className="flex justify-end">
          <BlockButton variant="primary" size="sm" onClick={() => applyRawImport(pasteJson)}>
            {T.validerImporter}
          </BlockButton>
        </div>
      </div>

      {/* Leçons du début (S07.2) : les revoir */}
      <div className="voxel-panel p-4 flex flex-col gap-2">
        <h3 className="font-display font-bold text-sm text-[#FAF7F0]">{FR.ui.journal.lecons}</h3>
        <ul className="text-xs text-[#CBD5E1] list-disc pl-4">
          {(['cast', 'burst', 'dodge', 'trio', 'ultimate'] as const).map((id) => (
            <li key={id}>
              <strong className="text-[#FAF7F0]">{FR.rules.titresLecons[id]}</strong> — {FR.engine.lecons[id]}
            </li>
          ))}
        </ul>
        {onReplayLessons && (
          <div>
            <BlockButton variant="secondary" className="whitespace-normal! text-left" onClick={onReplayLessons}>
              {FR.ui.journal.revoirLecons}
            </BlockButton>
          </div>
        )}
      </div>

      {/* Journal de test (S07.4) */}
      <JournalPanel />

      {/* Réinitialisation en deux temps */}
      <div className="rounded-xl bg-[#1F151A] border border-[#5B2A35] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-sm text-[#FECACA]">{T.reinitialiserLaSauvegarde}</h3>
          <p className="text-xs text-[#CBD5E1]">{T.repartDeZeroSurLIle}</p>
        </div>
        {!confirmReset ? (
          <BlockButton variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{T.reinitialiser}</span>
          </BlockButton>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <BlockButton variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
              {T.annuler}
            </BlockButton>
            <BlockButton
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmReset(false);
                onResetSave();
              }}
            >
              {T.confirmerLaRemiseAZero}
            </BlockButton>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Onglet du Professeur (ancien Codex) : n'existe que si le site est construit avec VITE_AI_CODEX=1,
 * car il interroge le serveur (`/api/codex/search`).
 */
export function CarnetProfessorPanel({
  save,
  history,
  onSaveAnswer,
}: {
  save: SaveState;
  history: CodexAnswer[];
  onSaveAnswer: (answer: CodexAnswer) => void;
}) {
  const P = T.professeur;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQueryAttempt, setLastQueryAttempt] = useState('');

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setError(P.questionTropCourte);
      return;
    }
    setError(null);
    setLoading(true);
    setLastQueryAttempt(trimmed);
    const teamSummary = save.squadIds
      .map((uid) => {
        const c = save.roster.find((r) => r.uid === uid);
        if (!c) return null;
        const sp = SPECIES[c.speciesId];
        return P.resume(sp.name, ELEMENT_META[sp.element].label, c.level);
      })
      .filter(Boolean)
      .join(', ');
    const currentStage = STAGES[Math.min(save.highestStageIndex, STAGES.length - 1)];
    const currentBiome = BIOMES[currentStage.biomeId].name;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/codex/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, teamSummary, currentBiome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || P.erreurProfesseur);
        return;
      }
      onSaveAnswer({ query: trimmed, answer: data.answer, sources: Array.isArray(data.sources) ? data.sources : [], timestamp: Date.now() });
      setQuery('');
    } catch {
      setError(P.serveurInjoignable);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex flex-col sm:flex-row gap-2.5"
      >
        <label htmlFor="carnet-search-input" className="sr-only">
          {P.etiquette}
        </label>
        <input
          id="carnet-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={P.exemple}
          className="flex-1 min-h-[44px] rounded-xl bg-[#141A26] border-2 border-[#344056] focus:border-[#F4B942] focus:outline-none px-4 py-2.5 text-sm text-[#FAF7F0] placeholder:text-[#64748B]"
        />
        <BlockButton type="submit" variant="primary" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>{P.rechercher}</span>
        </BlockButton>
      </form>

      <div className="flex flex-wrap gap-2">
        {P.questionsRapides.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={loading}
            onClick={() => runSearch(preset)}
            className="cursor-pointer min-h-[44px] disabled:opacity-50 text-left text-xs px-3 py-1.5 rounded-lg bg-[#1D2535] hover:bg-[#273248] border border-[#344056] text-[#CBD5E1] hover:text-[#FAF7F0]"
          >
            {preset}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-[#351B1E] border border-[#E85D3F] p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#FECACA]">
          <span>{error}</span>
          {lastQueryAttempt && (
            <BlockButton variant="danger" size="sm" onClick={() => runSearch(lastQueryAttempt)}>
              {P.reessayer}
            </BlockButton>
          )}
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-[#161C29] border border-[#344056] p-5 flex items-center gap-3 text-sm text-[#B8C2D1]">
          <Loader2 className="w-5 h-5 animate-spin text-[#F4B942] shrink-0" />
          <span>{P.enCours}</span>
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="rounded-xl bg-[#161C29] border border-[#2C374C] p-6 text-center text-sm text-[#B8C2D1]">{P.vide}</div>
      )}

      <div className="space-y-3">
        {history.map((item) => (
          <article key={item.timestamp} className="rounded-xl bg-[#161C29] border border-[#344056] p-4 space-y-3">
            <p className="font-display font-bold text-sm text-[#F4B942]">{item.query}</p>
            <div className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-line">{item.answer}</div>
            {item.sources.length > 0 && (
              <div className="pt-2.5 border-t border-[#283247]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">{P.sources}</p>
                <div className="flex flex-wrap gap-2">
                  {item.sources.map((src) => (
                    <a
                      key={src.uri}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#222B3E] hover:bg-[#2C3750] border border-[#39445A] text-[#7DD3FC]"
                    >
                      <span className="max-w-[220px] truncate">{src.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
