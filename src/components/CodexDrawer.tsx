import React, { useState } from 'react';
import { ExternalLink, Loader2, Search, X } from 'lucide-react';
import { BIOMES, ELEMENT_META, SPECIES, STAGES } from '../game/catalog';
import type { CodexAnswer, ElementType, SaveState } from '../game/types';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';

interface CodexDrawerProps {
  save: SaveState;
  history: CodexAnswer[];
  onSaveAnswer: (answer: CodexAnswer) => void;
  onClose: () => void;
}

const PRESET_QUERIES = [
  'Quelles recettes préparer à la Marmite pour bien démarrer ?',
  'Comment tirer parti des Runes de Partage et de Vigueur en combat ?',
  'Quels conseils pour éviter les attaques de Boss avec Esquive ?',
  'Quelles synergies de types élémentaires fonctionnent le mieux pour une équipe de 3 ?',
];

/** L'onglet du Professeur interroge un serveur : il n'existe que si le site est construit avec VITE_AI_CODEX=1. */
const AI_CODEX = import.meta.env.VITE_AI_CODEX === '1';

const ELEMENTS: ElementType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'psychic'];

export function CodexDrawer({
  save,
  history,
  onSaveAnswer,
  onClose,
}: CodexDrawerProps) {
  const [tab, setTab] = useState<'search' | 'dex' | 'types'>(AI_CODEX ? 'search' : 'dex');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQueryAttempt, setLastQueryAttempt] = useState<string>('');

  const allSpecies = Object.values(SPECIES);

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!AI_CODEX) return;
    if (trimmed.length < 2) {
      setError('Veuillez saisir une question d’au moins 2 caractères.');
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
        return `${sp.name} (${ELEMENT_META[sp.element].label}, Niv.${c.level})`;
      })
      .filter(Boolean)
      .join(', ');

    const currentStage = STAGES[Math.min(save.highestStageIndex, STAGES.length - 1)];
    const currentBiome = BIOMES[currentStage.biomeId].name;

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/codex/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          teamSummary,
          currentBiome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la consultation du Professeur Cubix.');
        return;
      }
      onSaveAnswer({
        query: trimmed,
        answer: data.answer,
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: Date.now(),
      });
      setQuery('');
    } catch {
      setError('Impossible de joindre le serveur du Codex. Vérifiez la connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-3 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="codex-drawer-title"
        className="voxel-panel w-full max-w-4xl max-h-[86vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#39445A]">
          <div>
            <h2 id="codex-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              {AI_CODEX ? 'Codex & Professeur Cubix' : 'Codex'}
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              {AI_CODEX
                ? 'Stratégies vérifiées en direct via Google Search, bestiaire de l’île et affinités.'
                : 'Bestiaire de l’île et affinités des éléments.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141A26] border border-[#344056]">
              {AI_CODEX && (
              <button
                type="button"
                onClick={() => setTab('search')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${
                  tab === 'search' ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                Professeur (Web)
              </button>
              )}
              <button
                type="button"
                onClick={() => setTab('dex')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${
                  tab === 'dex' ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                Bestiaire ({save.discoveredSpeciesIds.length}/{allSpecies.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('types')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${
                  tab === 'types' ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                Types
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="voxel-btn cursor-pointer w-9 h-9 rounded-lg bg-[#222A3A] hover:bg-[#2E384E] border border-[#39445A] flex items-center justify-center"
              aria-label="Fermer le Codex"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto cubi-scroll p-5">
          {AI_CODEX && tab === 'search' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runSearch(query);
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <label htmlFor="codex-search-input" className="sr-only">
                  Poser une question stratégique au Professeur Cubix
                </label>
                <input
                  id="codex-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex. : Recettes pour débuter, astuces Boss, synergies de runes..."
                  className="flex-1 rounded-xl bg-[#141A26] border-2 border-[#344056] focus:border-[#F4B942] focus:outline-none px-4 py-2.5 text-sm text-[#FAF7F0] placeholder:text-[#64748B]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="voxel-btn cursor-pointer disabled:opacity-55 px-5 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Rechercher</span>
                </button>
              </form>

              {/* Quick strategic presets */}
              <div className="flex flex-wrap gap-2">
                {PRESET_QUERIES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={loading}
                    onClick={() => runSearch(preset)}
                    className="cursor-pointer disabled:opacity-50 text-left text-xs px-3 py-1.5 rounded-lg bg-[#1D2535] hover:bg-[#273248] border border-[#344056] text-[#CBD5E1] hover:text-[#FAF7F0] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded-xl bg-[#351B1E] border border-[#E85D3F] p-3.5 flex items-center justify-between gap-3 text-sm text-[#FECACA]">
                  <span>{error}</span>
                  {lastQueryAttempt && (
                    <button
                      type="button"
                      onClick={() => runSearch(lastQueryAttempt)}
                      className="cursor-pointer px-3 py-1 rounded-lg bg-[#E85D3F] text-[#FAF7F0] font-bold text-xs whitespace-nowrap shrink-0"
                    >
                      Réessayer
                    </button>
                  )}
                </div>
              )}

              {loading && (
                <div className="rounded-xl bg-[#161C29] border border-[#344056] p-5 flex items-center gap-3 text-sm text-[#B8C2D1]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#F4B942] shrink-0" />
                  <span>Le Professeur Cubix consulte les archives Google Search en direct...</span>
                </div>
              )}

              {history.length === 0 && !loading && (
                <div className="rounded-xl bg-[#161C29] border border-[#2C374C] p-6 text-center text-sm text-[#B8C2D1]">
                  Posez une question ci-dessus ou cliquez sur un thème rapide pour obtenir des
                  stratégies documentées et adaptées à votre escouade actuelle.
                </div>
              )}

              <div className="space-y-3">
                {history.map((item) => (
                  <article
                    key={item.timestamp}
                    className="rounded-xl bg-[#161C29] border border-[#344056] p-4 space-y-3"
                  >
                    <p className="font-display font-bold text-sm text-[#F4B942]">{item.query}</p>
                    <div className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </div>
                    {item.sources.length > 0 && (
                      <div className="pt-2.5 border-t border-[#283247]">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                          Sources vérifiées (Google Search)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {item.sources.map((src) => (
                            <a
                              key={src.uri}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-[#222B3E] hover:bg-[#2C3750] border border-[#39445A] text-[#7DD3FC]"
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
          )}

          {tab === 'dex' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allSpecies.map((sp) => {
                const seen = save.discoveredSpeciesIds.includes(sp.id);
                return (
                  <div
                    key={sp.id}
                    className={`rounded-xl p-3.5 border flex items-start gap-3 ${
                      seen
                        ? 'bg-[#192130] border-[#344056]'
                        : 'bg-[#141924] border-[#252E40] opacity-60'
                    }`}
                  >
                    {/* A1.2 : une espèce non découverte n'est qu'une ombre noire, sans élément ni statistiques */}
                    <VoxelCreatureAvatar speciesId={sp.id} size={46} className="shrink-0" silhouette={!seen} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {seen && <ElementIcon element={sp.element} size={15} />}
                        <h3 className="font-display font-bold text-sm text-[#FAF7F0] truncate">
                          {seen ? sp.name : '???'}
                        </h3>
                      </div>
                      {seen && (
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          {ELEMENT_META[sp.element].label} ·{' '}
                          <span className="font-mono-num">
                            PV {sp.baseHp} / ATQ {sp.baseAtk}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-[#CBD5E1] mt-1 leading-snug">
                        {seen ? sp.dexNote : 'Explorez l’île ou cuisinez pour découvrir cette espèce.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'types' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ELEMENTS.map((el) => {
                const meta = ELEMENT_META[el];
                return (
                  <div
                    key={el}
                    className="rounded-xl bg-[#192130] border border-[#344056] p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <ElementIcon element={el} size={22} />
                      <h3 className="font-display font-bold text-base text-[#FAF7F0]">
                        {meta.label}
                      </h3>
                    </div>
                    <p className="text-xs text-[#2FB97A]">
                      Super efficace (×1.5) :{' '}
                      <strong>
                        {meta.strongAgainst.map((t) => ELEMENT_META[t].label).join(', ')}
                      </strong>
                    </p>
                    <p className="text-xs text-[#FCA5A5]">
                      Peu efficace (×0.7) :{' '}
                      <strong>
                        {meta.weakAgainst.map((t) => ELEMENT_META[t].label).join(', ')}
                      </strong>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
