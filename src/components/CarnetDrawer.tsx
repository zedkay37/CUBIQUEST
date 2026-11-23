import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Star, X } from 'lucide-react';
import { COLLECTION_POINTS, COLLECTION_TIERS, type CollectionTier } from '../game/balance';
import { ACHIEVEMENTS, BIOMES, ELEMENT_META, MOVES, RUNES, SPECIES, STAGES, SUMMON_RARITY } from '../game/catalog';
import {
  claimableCollectionTiers,
  collectionBreakdown,
  collectionLevel,
  nextCollectionTier,
} from '../game/collection';
import { countClaimableAchievements, getAchievementProgress, lineageOf } from '../game/rules';
import type { AchievementTheme, CodexAnswer, ElementType, QuestReward, SaveState, SpeciesDef } from '../game/types';
import { FR } from '../i18n/fr';
import { CarnetProfessorPanel, CarnetSavePanel } from './CarnetSave';
import { CreatureTurntable } from './CreatureTurntable';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { AnimatedBar, BlockButton, BlockPanel, Tabs } from './ui';

const T = FR.ui.carnet;

/** L'onglet du Professeur interroge un serveur : il n'existe que si le site est construit avec VITE_AI_CODEX=1. */
const AI_CODEX = import.meta.env.VITE_AI_CODEX === '1';

const ELEMENTS: ElementType[] = ['fire', 'water', 'grass', 'electric', 'rock', 'psychic'];
const THEMES: AchievementTheme[] = ['combat', 'collection', 'exploration'];
const RARITY_KEY = { common: 'commune', uncommon: 'peuCommune', rare: 'rare' } as const;
/** Couleur du cadre obtenu (le plus récent l'emporte) : bordure du Carnet. */
const FRAME_COLORS: Record<string, string> = {
  cadre_bois: '#A0703C',
  cadre_pierre: '#8B95A5',
  cadre_cristal: '#7DD3FC',
  cadre_prisme: '#C084FC',
};

type CarnetTab = 'creatures' | 'collection' | 'exploits' | 'elements' | 'sauvegarde' | 'professeur';

interface CarnetDrawerProps {
  save: SaveState;
  onClaimAchievement: (achId: string) => void;
  onClaimTier: (at: number) => void;
  onImportSave: (nextSave: SaveState) => void;
  onResetSave: () => void;
  onReplayLessons?: () => void;
  codexHistory: CodexAnswer[];
  onSaveCodexAnswer: (answer: CodexAnswer) => void;
  onClose: () => void;
}

/** Les lignées (forme de base puis ses évolutions), dans l'ordre du catalogue. */
function buildLineages(): SpeciesDef[][] {
  const out: SpeciesDef[][] = [];
  for (const sp of Object.values(SPECIES)) {
    if (lineageOf(sp.id) !== sp.id) continue;
    const chain: SpeciesDef[] = [sp];
    let cur = sp;
    while (cur.evolvesTo && SPECIES[cur.evolvesTo] && chain.length < 4) {
      cur = SPECIES[cur.evolvesTo];
      chain.push(cur);
    }
    out.push(chain);
  }
  return out;
}

function formatReward(reward: Omit<QuestReward, 'label'>): string[] {
  const parts: string[] = [];
  for (const [el, qty] of Object.entries(reward.baits ?? {})) {
    if (qty) parts.push(T.appat(qty, ELEMENT_META[el as ElementType].label));
  }
  if (reward.cube) parts.push(T.cube(T.matieres[reward.cube]));
  if (reward.powerStoneRange) {
    const r = reward.guaranteedRarity;
    parts.push(T.pierre(r === 'gold' ? T.or : r === 'silver' ? T.argent : r === 'bronze' ? T.bronze : T.aleatoire));
  }
  if (reward.rune) parts.push(T.rune(RUNES[reward.rune].name));
  return parts;
}

function formatTier(tier: CollectionTier): string[] {
  const parts: string[] = [];
  for (const m of tier.cubes) parts.push(T.cube(T.matieres[m]));
  parts.push(...formatReward({ baits: tier.baits }));
  for (const t of tier.titles ?? []) parts.push(T.recompenseTitre(T.titres[t] ?? t));
  return parts;
}

/** Où rencontrer une espèce : niveaux dont une vague la contient ou dont elle est le boss. */
function encounterPlaces(speciesId: string): string[] {
  return STAGES.filter((s) => s.bossSpeciesId === speciesId || s.waves.some((w) => w.enemies.some((e) => e.speciesId === speciesId))).map(
    (s) => {
      const label = `${BIOMES[s.biomeId].name} · ${s.name}`;
      return s.bossSpeciesId === speciesId ? T.bossDe(label) : label;
    },
  );
}

/**
 * Le Carnet (spec Atelier, A3.2) : créatures par lignée, niveau de collection et paliers, exploits,
 * table des éléments, sauvegarde et journal. Le niveau de collection reste visible en haut, quel que soit l'onglet.
 */
export function CarnetDrawer({
  save,
  onClaimAchievement,
  onClaimTier,
  onImportSave,
  onResetSave,
  onReplayLessons,
  codexHistory,
  onSaveCodexAnswer,
  onClose,
}: CarnetDrawerProps) {
  const [tab, setTab] = useState<CarnetTab>('creatures');
  const [detail, setDetail] = useState<string | null>(null);
  const lineages = useMemo(buildLineages, []);
  const allCount = Object.keys(SPECIES).length;
  const ownedSpecies = useMemo(() => new Set(save.roster.map((c) => c.speciesId)), [save.roster]);
  const seenSpecies = useMemo(() => new Set(save.discoveredSpeciesIds), [save.discoveredSpeciesIds]);

  const breakdown = collectionBreakdown(save);
  const level = collectionLevel(save);
  const next = nextCollectionTier(save);
  const prevAt = COLLECTION_TIERS.filter((t) => t.at <= breakdown.total).slice(-1)[0]?.at ?? 0;
  const tiersReady = claimableCollectionTiers(save).length;
  const achReady = countClaimableAchievements(save);
  const frame = [...save.titles].reverse().find((t) => FRAME_COLORS[t]);
  const title = [...save.titles].reverse().find((t) => t.startsWith('titre_'));

  // Échap ferme d'abord la fiche détaillée (écoute en capture : avant la touche Échap de l'application)
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setDetail(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [detail]);

  const tabs: { id: CarnetTab; label: ReactNode }[] = [
    { id: 'creatures', label: T.tabs.creatures(save.discoveredSpeciesIds.length, allCount) },
    { id: 'collection', label: <TabLabel text={T.tabs.collection} count={tiersReady} /> },
    { id: 'exploits', label: <TabLabel text={T.tabs.exploits} count={achReady} /> },
    { id: 'elements', label: T.tabs.elements },
    { id: 'sauvegarde', label: T.tabs.sauvegarde },
    ...(AI_CODEX ? [{ id: 'professeur' as const, label: T.tabs.professeur }] : []),
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-2 sm:p-5">
      <BlockPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="carnet-title"
        accent={frame ? FRAME_COLORS[frame] : undefined}
        className="ui-screen-enter w-full max-w-5xl max-h-[94vh] sm:max-h-[88vh] rounded-2xl flex flex-col overflow-hidden"
      >
        {/* En-tête : titre, niveau de collection (toujours visible), onglets */}
        <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-[#39445A] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="carnet-title" className="font-display text-xl sm:text-2xl font-bold">
                {T.titre}
              </h2>
              <p className="text-xs text-[#B8C2D1]">{title ? T.titreActuel(T.titres[title] ?? title) : T.sousTitre}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="voxel-btn cursor-pointer w-11 h-11 shrink-0 rounded-lg bg-[#222A3A] hover:bg-[#2E384E] border-2 border-[#39445A] flex items-center justify-center"
              aria-label={T.fermer}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setDetail(null);
              setTab('collection');
            }}
            className="voxel-btn cursor-pointer block w-full text-left rounded-xl border-2 border-[#39445A] bg-[#141A26] px-3 py-2"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-1.5">
              <span className="font-display font-bold text-sm text-[#F4B942]">{T.niveauCollection(level)}</span>
              <span className="font-mono-num text-xs text-[#CBD5E1]">
                {T.points(breakdown.total)}
                {tiersReady > 0 && <span className="ml-2 font-bold text-[#2FB97A]">{T.aReclamer(tiersReady)}</span>}
              </span>
            </span>
            <AnimatedBar
              value={next ? breakdown.total - prevAt : 1}
              max={next ? next.at - prevAt : 1}
              color="#F4B942"
              height={10}
              label={T.niveauCollection(level)}
            />
            <span className="block mt-1 text-[11px] text-[#B8C2D1]">
              {next ? T.prochainPalier(next.at, next.at - breakdown.total) : T.tousPaliers}
            </span>
          </button>

          <Tabs
            label={T.onglets}
            tabs={tabs}
            value={tab}
            onChange={(id) => {
              setDetail(null);
              setTab(id);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto cubi-scroll p-3 sm:p-5" role="tabpanel">
          {tab === 'creatures' && detail && (
            <CreatureDetail speciesId={detail} owned={ownedSpecies.has(detail)} save={save} onBack={() => setDetail(null)} />
          )}

          {tab === 'creatures' && !detail && (
            <div className="space-y-3">
              <p className="text-xs text-[#B8C2D1]">{T.aideCreatures}</p>
              {lineages.map((chain) => {
                const base = chain[0];
                const bond = Math.floor(save.bonds[base.id] ?? 0);
                const variant = save.variantsUnlocked.includes(base.id);
                const baseName = seenSpecies.has(base.id) ? base.name : T.inconnu;
                return (
                  <section key={base.id} aria-label={T.lignee(baseName)} className="rounded-xl bg-[#161C29] border border-[#2C374C] p-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      {chain.map((sp) => {
                        const owned = ownedSpecies.has(sp.id);
                        const seen = seenSpecies.has(sp.id) || owned;
                        const name = seen ? sp.name : T.inconnu;
                        const body = (
                          <>
                            <span className={owned ? '' : seen ? 'opacity-80' : 'opacity-60'}>
                              <VoxelCreatureAvatar speciesId={sp.id} size={56} silhouette={!owned} />
                            </span>
                            <span className="font-display font-bold text-xs sm:text-sm leading-tight break-words text-center">{name}</span>
                            {owned ? (
                              <span className="flex flex-wrap items-center justify-center gap-1">
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#F4B942]" aria-label={T.lienAria(bond)}>
                                  <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                                  <span className="font-mono-num">{bond}</span>
                                </span>
                                {variant && (
                                  <span className="rounded-[4px] bg-[#C084FC] px-1 text-[10px] font-bold text-[#1A0E08]">{T.variante}</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#94A3B8]">{seen ? T.vue : T.jamaisVue}</span>
                            )}
                          </>
                        );
                        const cls = `flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 min-h-[44px] ${
                          owned ? 'bg-[#202838] border-[#39445A]' : 'bg-[#141924] border-[#252E40]'
                        }`;
                        return seen ? (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => setDetail(sp.id)}
                            aria-label={T.ouvrirFiche(sp.name)}
                            className={`${cls} voxel-btn cursor-pointer hover:border-[#F4B942]`}
                          >
                            {body}
                          </button>
                        ) : (
                          <div key={sp.id} className={cls}>
                            {body}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {tab === 'collection' && <CollectionPanel save={save} breakdown={breakdown} onClaimTier={onClaimTier} />}

          {tab === 'exploits' && <ExploitsPanel save={save} onClaimAchievement={onClaimAchievement} />}

          {tab === 'elements' && (
            <div className="space-y-3">
              <p className="text-xs text-[#B8C2D1]">{T.aideElements}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ELEMENTS.map((el) => {
                  const meta = ELEMENT_META[el];
                  return (
                    <div key={el} className="rounded-xl bg-[#192130] border border-[#344056] p-4 space-y-2" style={{ borderLeftColor: meta.color, borderLeftWidth: 5 }}>
                      <div className="flex items-center gap-2">
                        <ElementIcon element={el} size={26} />
                        <h3 className="font-display font-bold text-base">{meta.label}</h3>
                      </div>
                      <ElementRow label={T.superEfficace} color="text-[#2FB97A]" list={meta.strongAgainst} />
                      <ElementRow label={T.peuEfficace} color="text-[#FCA5A5]" list={meta.weakAgainst} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'sauvegarde' && (
            <CarnetSavePanel save={save} onImportSave={onImportSave} onResetSave={onResetSave} onReplayLessons={onReplayLessons} />
          )}

          {AI_CODEX && tab === 'professeur' && <CarnetProfessorPanel save={save} history={codexHistory} onSaveAnswer={onSaveCodexAnswer} />}
        </div>
      </BlockPanel>
    </div>
  );
}

function TabLabel({ text, count }: { text: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {count > 0 && <span className="ui-new-badge font-mono-num text-[11px] font-bold rounded-[4px] bg-[#2FB97A] text-[#0F172A] px-1.5">{count}</span>}
    </span>
  );
}

function ElementRow({ label, color, list }: { label: string; color: string; list: ElementType[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={`font-semibold ${color}`}>{label}</span>
      {list.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-[4px] border-2 bg-[#141925] px-1.5 py-0.5 font-bold" style={{ borderColor: ELEMENT_META[t].color }}>
          <ElementIcon element={t} size={14} />
          {ELEMENT_META[t].label}
        </span>
      ))}
    </div>
  );
}

function CreatureDetail({ speciesId, owned, save, onBack }: { speciesId: string; owned: boolean; save: SaveState; onBack: () => void }) {
  const sp = SPECIES[speciesId];
  const move = MOVES[sp.moveId];
  const lineage = lineageOf(sp.id);
  const rarity = SUMMON_RARITY[lineage];
  const places = encounterPlaces(sp.id);
  const evolved = sp.evolvesTo ? SPECIES[sp.evolvesTo] : null;
  const bond = Math.floor(save.bonds[lineage] ?? 0);
  return (
    <div className="space-y-4">
      <BlockButton variant="secondary" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        <span>{T.retour}</span>
      </BlockButton>
      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="shrink-0 rounded-xl border-2 bg-[#141925] p-2" style={{ borderColor: ELEMENT_META[sp.element].color, filter: owned ? undefined : 'brightness(0)' }}>
          <CreatureTurntable speciesId={sp.id} size={180} />
        </div>
        <div className="min-w-0 flex-1 space-y-3 w-full">
          <div>
            <h3 className="font-display text-2xl font-bold">{sp.name}</h3>
            <p className="text-xs text-[#B8C2D1]">
              {owned ? T.possede : T.vue}
              {owned && ` · ${T.lien(bond)}`}
              {owned && save.variantsUnlocked.includes(lineage) && ` · ${T.variante}`}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-[#94A3B8]">{T.element}</dt>
            <dd className="inline-flex items-center gap-1.5 font-semibold">
              <ElementIcon element={sp.element} size={16} />
              {ELEMENT_META[sp.element].label}
            </dd>
            <dt className="text-[#94A3B8]">{T.role}</dt>
            <dd className="font-semibold">{T.roles[sp.role]}</dd>
            <dt className="text-[#94A3B8]">{T.sort}</dt>
            <dd>
              <span className="font-semibold">{move.name}</span>
              <span className="block text-xs text-[#CBD5E1]">{move.description}</span>
            </dd>
          </dl>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{T.description}</h4>
            <p className="text-sm text-[#E2E8F0] leading-snug">{sp.dexNote}</p>
            {evolved && sp.evolveLevel && <p className="mt-1 text-xs text-[#CBD5E1]">{T.evolueEn(evolved.name, sp.evolveLevel)}</p>}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{T.ouRencontrer}</h4>
            <ul className="mt-1 text-sm text-[#E2E8F0] list-disc pl-5 space-y-0.5">
              {places.map((p) => (
                <li key={p}>{p}</li>
              ))}
              {rarity && <li>{T.cubeScelle(FR.ui.atelier.raretes[RARITY_KEY[rarity]])}</li>}
              {!places.length && !rarity && <li>{T.nulPart}</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionPanel({
  save,
  breakdown,
  onClaimTier,
}: {
  save: SaveState;
  breakdown: ReturnType<typeof collectionBreakdown>;
  onClaimTier: (at: number) => void;
}) {
  const rows: [keyof typeof T.categories, number, number][] = [
    ['ownedForms', breakdown.ownedForms, COLLECTION_POINTS.ownedForm],
    ['evolutionsSeen', breakdown.evolutionsSeen, COLLECTION_POINTS.evolutionSeen],
    ['bondStars', breakdown.bondStars, COLLECTION_POINTS.bondStar],
    ['variants', breakdown.variants, COLLECTION_POINTS.variant],
    ['runes', breakdown.runes, COLLECTION_POINTS.rune],
    ['achievements', breakdown.achievements, COLLECTION_POINTS.achievement],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <section className="rounded-xl bg-[#141A26] border border-[#39445A] p-3">
          <h3 className="font-display font-bold text-sm mb-2">{T.detailPoints}</h3>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([key, n, pts]) => (
                <tr key={key} className="border-t border-[#2C374C] first:border-t-0">
                  <td className="py-1 pr-2">{T.categories[key]}</td>
                  <td className="py-1 text-right font-mono-num text-xs text-[#CBD5E1] whitespace-nowrap">{T.calcul(n, pts, n * pts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl bg-[#141A26] border border-[#39445A] p-3">
          <h3 className="font-display font-bold text-sm mb-2">{T.titresEtCadres}</h3>
          {save.titles.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">{T.aucunTitre}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {save.titles.map((t) => (
                <li
                  key={t}
                  className="rounded-[4px] border-2 bg-[#1D2535] px-2 py-0.5 text-xs font-bold"
                  style={{ borderColor: FRAME_COLORS[t] ?? '#F4B942' }}
                >
                  {T.titres[t] ?? t}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h3 className="font-display font-bold text-sm mb-2">{T.paliers}</h3>
        <ol className="space-y-2">
          {COLLECTION_TIERS.map((tier) => {
            const claimed = save.collectionTiersClaimed.includes(tier.at);
            const ready = !claimed && breakdown.total >= tier.at;
            return (
              <li
                key={tier.at}
                className={`rounded-xl border-2 p-3 flex flex-wrap items-center justify-between gap-2 ${
                  ready ? 'bg-[#1D2D27] border-[#2FB97A]' : claimed ? 'bg-[#182030] border-[#2C374C] opacity-85' : 'bg-[#202838] border-[#39445A]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-sm text-[#F4B942]">{T.palier(tier.at)}</p>
                  <p className="text-xs text-[#CBD5E1]">{formatTier(tier).join(' · ')}</p>
                </div>
                {claimed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2FB97A]">
                    <Check className="w-3.5 h-3.5" />
                    {T.obtenu}
                  </span>
                ) : ready ? (
                  <BlockButton variant="primary" size="sm" silent onClick={() => onClaimTier(tier.at)}>
                    {T.reclamer}
                  </BlockButton>
                ) : (
                  <span className="text-xs text-[#94A3B8]">{T.verrouille(tier.at - breakdown.total)}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function ExploitsPanel({ save, onClaimAchievement }: { save: SaveState; onClaimAchievement: (achId: string) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-[#B8C2D1]">{T.aideExploits}</p>
      {THEMES.map((theme) => {
        const list = ACHIEVEMENTS.filter((a) => a.theme === theme);
        const done = list.filter((a) => save.claimedAchievementIds.includes(a.id)).length;
        return (
          <section key={theme}>
            <h3 className="font-display font-bold text-base mb-2">
              {T.themes[theme]} <span className="font-mono-num text-xs text-[#94A3B8]">{done}/{list.length}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {list.map((ach) => {
                const progress = getAchievementProgress(save, ach);
                const claimed = save.claimedAchievementIds.includes(ach.id);
                const ready = !claimed && progress >= ach.target;
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl p-3.5 border-2 flex flex-col justify-between gap-2.5 ${
                      ready ? 'bg-[#1D2D27] border-[#2FB97A]' : claimed ? 'bg-[#182030] border-[#2C374C] opacity-85' : 'bg-[#202838] border-[#39445A]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display font-bold text-sm">{ach.title}</h4>
                        <span className="font-mono-num text-[11px] font-bold text-[#F4B942] shrink-0">
                          {Math.min(progress, ach.target)}/{ach.target}
                        </span>
                      </div>
                      <p className="text-xs text-[#CBD5E1]">{ach.description}</p>
                      <AnimatedBar value={Math.min(progress, ach.target)} max={ach.target} color={claimed || ready ? '#2FB97A' : '#38BDF8'} height={8} label={ach.title} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#F4B942] min-w-0">
                        {[...formatReward(ach.reward), T.pointsCollection(COLLECTION_POINTS.achievement)].join(' · ')}
                      </span>
                      {claimed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2FB97A] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          {T.obtenu}
                        </span>
                      ) : (
                        ready && (
                          <BlockButton variant="primary" size="sm" silent onClick={() => onClaimAchievement(ach.id)}>
                            {T.reclamer}
                          </BlockButton>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
