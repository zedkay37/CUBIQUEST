import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  HardDrive,
  RotateCcw,
  ScrollText,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS, INGREDIENTS, RUNES, STAGES } from '../game/catalog';
import {
  exportSaveToJson,
  getAchievementProgress,
  importSaveFromJson,
} from '../game/rules';
import type { QuestReward, SaveState } from '../game/types';
import { FR, GAME_TITLE } from '../i18n/fr';

type DrawerSection = 'missions' | 'achievements' | 'save';
type AchievementFilter = 'all' | 'claimable' | 'completed';

interface QuestsDrawerProps {
  save: SaveState;
  onClaimQuest: (questUid: string) => void;
  onClaimAchievement: (achId: string) => void;
  onImportSave: (nextSave: SaveState) => void;
  onResetSave: () => void;
  onClose: () => void;
}

function formatRewardSummary(reward: QuestReward): string {
  const parts: string[] = [];
  if (reward.ingredients) {
    for (const [id, qty] of Object.entries(reward.ingredients)) {
      const name = INGREDIENTS[id]?.name ?? id;
      parts.push(`+${qty} ${name}`);
    }
  }
  if (reward.powerStoneRange) {
    const rarityLabel =
      reward.guaranteedRarity === 'gold'
        ? FR.ui.questsDrawer.or
        : reward.guaranteedRarity === 'silver'
          ? FR.ui.questsDrawer.argent
          : reward.guaranteedRarity === 'bronze'
            ? FR.ui.questsDrawer.bronze
            : FR.ui.questsDrawer.aleatoire;
    parts.push(FR.ui.questsDrawer.pierre(rarityLabel));
  }
  if (reward.rune) {
    parts.push(`+1 ${RUNES[reward.rune].name}`);
  }
  return parts.join(' · ');
}

export function QuestsDrawer({
  save,
  onClaimQuest,
  onClaimAchievement,
  onImportSave,
  onResetSave,
  onClose,
}: QuestsDrawerProps) {
  const [section, setSection] = useState<DrawerSection>('missions');
  const [achFilter, setAchFilter] = useState<AchievementFilter>('all');
  const [pasteJson, setPasteJson] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const claimableQuests = useMemo(
    () => save.activeQuests.filter((q) => q.progress >= q.target).length,
    [save.activeQuests],
  );

  const achievementEntries = useMemo(() => {
    return ACHIEVEMENTS.map((ach) => {
      const progress = getAchievementProgress(save, ach);
      const claimed = save.claimedAchievementIds.includes(ach.id);
      const ready = !claimed && progress >= ach.target;
      return { ach, progress, claimed, ready };
    });
  }, [save]);

  const claimableAchCount = useMemo(
    () => achievementEntries.filter((e) => e.ready).length,
    [achievementEntries],
  );

  const filteredAchievements = useMemo(() => {
    if (achFilter === 'claimable') return achievementEntries.filter((e) => e.ready);
    if (achFilter === 'completed') return achievementEntries.filter((e) => e.claimed);
    return achievementEntries;
  }, [achFilter, achievementEntries]);

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
    setFeedback({ kind: 'success', text: FR.ui.questsDrawer.fichierDeSauvegardeTelechargeJson });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportSaveToJson(save));
      setCopied(true);
      setFeedback({ kind: 'success', text: FR.ui.questsDrawer.sauvegardeCopieeDansLePressePapiers });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({
        kind: 'error',
        text: FR.ui.questsDrawer.impossibleDAccederAuPressePapiers,
      });
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
      text: FR.ui.questsDrawer.sauvegardeRestaureeCreaturesNiveaux(res.save.roster.length, res.save.completedStageIds.length, STAGES.length),
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      applyRawImport(text);
    } catch {
      setFeedback({ kind: 'error', text: FR.ui.questsDrawer.erreurLorsDeLaLectureDu });
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quests-drawer-title"
        className="voxel-panel w-full max-w-3xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#39445A] bg-[#141A26]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B8C2D1]">
              {FR.ui.questsDrawer.journalDuCampV02}
            </p>
            <h2 id="quests-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              {FR.ui.questsDrawer.quetesSuccesSauvegarde}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn cursor-pointer w-9 h-9 rounded-lg bg-[#222A3A] hover:bg-[#2C364A] border-2 border-[#39445A] flex items-center justify-center"
            aria-label={FR.ui.questsDrawer.fermerLeJournal}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-[#273145] bg-[#181E2A]">
          <button
            type="button"
            onClick={() => setSection('missions')}
            className={`voxel-btn cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border-2 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              section === 'missions'
                ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                : 'bg-[#202838] border-[#39445A] text-[#B8C2D1] hover:text-[#FAF7F0]'
            }`}
          >
            <ScrollText className="w-4 h-4 text-[#F4B942]" />
            <span>{FR.ui.questsDrawer.missions}{save.activeQuests.length})</span>
            {claimableQuests > 0 && (
              <span className="font-mono-num text-[#2FB97A]">· {claimableQuests}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection('achievements')}
            className={`voxel-btn cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border-2 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              section === 'achievements'
                ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                : 'bg-[#202838] border-[#39445A] text-[#B8C2D1] hover:text-[#FAF7F0]'
            }`}
          >
            <Trophy className="w-4 h-4 text-[#F4B942]" />
            <span>
              {FR.ui.questsDrawer.succes}{save.claimedAchievementIds.length}/{ACHIEVEMENTS.length})
            </span>
            {claimableAchCount > 0 && (
              <span className="font-mono-num text-[#2FB97A]">· {claimableAchCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection('save')}
            className={`voxel-btn cursor-pointer px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border-2 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              section === 'save'
                ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                : 'bg-[#202838] border-[#39445A] text-[#B8C2D1] hover:text-[#FAF7F0]'
            }`}
          >
            <HardDrive className="w-4 h-4 text-[#38BDF8]" />
            <span>{FR.ui.questsDrawer.sauvegarde}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {section === 'missions' && (
            <div className="space-y-3 ui-cascade">
              <p className="text-xs text-[#B8C2D1]">
                {FR.ui.questsDrawer.completezDesObjectifsEnExpeditionOu}
              </p>

              {save.activeQuests.map((q) => {
                const ratio = Math.max(0, Math.min(1, q.progress / Math.max(1, q.target)));
                const ready = q.progress >= q.target;

                return (
                  <div
                    key={q.uid}
                    className={`rounded-xl p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      ready
                        ? 'bg-[#1D2D27] border-[#2FB97A]'
                        : 'bg-[#202838] border-[#39445A]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-[#FAF7F0]">
                          {q.title}
                        </h3>
                        <span className="font-mono-num text-xs font-bold text-[#F4B942]">
                          {Math.min(q.progress, q.target)} / {q.target}
                        </span>
                      </div>
                      <p className="text-xs text-[#CBD5E1]">{q.description}</p>
                      <div className="h-2 w-full rounded bg-[#111622] overflow-hidden border border-[#39445A]">
                        <div
                          className={`h-full transition-transform duration-200 origin-left ${
                            ready ? 'bg-[#2FB97A]' : 'bg-[#F4B942]'
                          }`}
                          style={{ transform: `scaleX(${ratio})` }}
                        />
                      </div>
                      <p className="text-[11px] font-semibold text-[#F4B942]">
                        {FR.ui.questsDrawer.recompense}{formatRewardSummary(q.reward)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimQuest(q.uid)}
                      className={`voxel-btn cursor-pointer px-4 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm border-2 whitespace-nowrap shrink-0 ${
                        ready
                          ? 'bg-[#2FB97A] hover:bg-[#38C987] text-[#0F172A] border-[#141925]'
                          : 'bg-[#161C28] text-[#64748B] border-[#2D3648] cursor-not-allowed'
                      }`}
                    >
                      {ready ? FR.ui.questsDrawer.reclamer : FR.ui.questsDrawer.enCours}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {section === 'achievements' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#B8C2D1]">
                  {FR.ui.questsDrawer.paliersPermanentsDeVotreAventureSur}
                </p>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      ['all', FR.ui.questsDrawer.tous],
                      ['claimable', FR.ui.questsDrawer.aReclamer(claimableAchCount)],
                      ['completed', FR.ui.questsDrawer.termines],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAchFilter(id)}
                      className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${
                        achFilter === id
                          ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                          : 'bg-[#161C28] border-[#39445A] text-[#B8C2D1] hover:text-[#FAF7F0]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAchievements.length === 0 ? (
                <div className="rounded-xl bg-[#161C28] border border-[#39445A] p-6 text-center text-xs text-[#B8C2D1]">
                  {FR.ui.questsDrawer.aucunSuccesDansCeFiltrePour}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ui-cascade">
                  {filteredAchievements.map(({ ach, progress, claimed, ready }) => {
                    const ratio = Math.max(0, Math.min(1, progress / Math.max(1, ach.target)));
                    return (
                      <div
                        key={ach.id}
                        className={`rounded-xl p-3.5 border-2 flex flex-col justify-between gap-2.5 ${
                          ready
                            ? 'bg-[#1D2D27] border-[#2FB97A]'
                            : claimed
                              ? 'bg-[#182030] border-[#2C374C] opacity-85'
                              : 'bg-[#202838] border-[#39445A]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display font-bold text-sm text-[#FAF7F0]">
                              {ach.title}
                            </h3>
                            <span className="font-mono-num text-[11px] font-bold text-[#F4B942]">
                              {Math.min(progress, ach.target)}/{ach.target}
                            </span>
                          </div>
                          <p className="text-xs text-[#CBD5E1]">{ach.description}</p>
                          <div className="h-1.5 w-full rounded bg-[#111622] overflow-hidden border border-[#39445A]">
                            <div
                              className={`h-full origin-left ${
                                claimed || ready ? 'bg-[#2FB97A]' : 'bg-[#38BDF8]'
                              }`}
                              style={{ transform: `scaleX(${ratio})` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-semibold text-[#F4B942] truncate">
                            {formatRewardSummary(ach.reward)}
                          </span>
                          {claimed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2FB97A] shrink-0">
                              <Check className="w-3.5 h-3.5" />{FR.ui.questsDrawer.obtenu}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!ready}
                              onClick={() => onClaimAchievement(ach.id)}
                              className={`voxel-btn cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${
                                ready
                                  ? 'bg-[#2FB97A] hover:bg-[#38C987] text-[#0F172A] border-[#141925]'
                                  : 'bg-[#161C28] text-[#64748B] border-[#2D3648] cursor-not-allowed'
                              }`}
                            >
                              {ready ? FR.ui.questsDrawer.reclamer : FR.ui.questsDrawer.verrouille}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {section === 'save' && (
            <div className="space-y-4">
              {/* Compact Profile Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-[#202838] border border-[#39445A] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.questsDrawer.expeditions}</p>
                  <p className="font-mono-num text-lg font-bold text-[#FAF7F0] mt-0.5">
                    {save.stats.expeditionsWon}
                  </p>
                </div>
                <div className="rounded-xl bg-[#202838] border border-[#39445A] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.questsDrawer.eclats}</p>
                  <p className="font-mono-num text-lg font-bold text-[#F4B942] mt-0.5">
                    {save.stats.burstsTriggered}
                  </p>
                </div>
                <div className="rounded-xl bg-[#202838] border border-[#39445A] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.questsDrawer.trios}</p>
                  <p className="font-mono-num text-lg font-bold text-[#38BDF8] mt-0.5">
                    {save.stats.triosTriggered}
                  </p>
                </div>
                <div className="rounded-xl bg-[#202838] border border-[#39445A] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.questsDrawer.creatures}</p>
                  <p className="font-mono-num text-lg font-bold text-[#2FB97A] mt-0.5">
                    {save.roster.length}
                  </p>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`rounded-xl px-4 py-2.5 border text-xs font-semibold ${
                    feedback.kind === 'success'
                      ? 'bg-[#1D2D27] border-[#2FB97A] text-[#A7F3D0]'
                      : 'bg-[#311A21] border-[#E85D3F] text-[#FECACA]'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* Export Section */}
              <div className="rounded-xl bg-[#141A26] border border-[#39445A] p-4 space-y-2.5">
                <h3 className="font-display font-bold text-sm text-[#FAF7F0]">
                  {FR.ui.questsDrawer.exporterVotreSauvegardeLocaleV}{save.version})
                </h3>
                <p className="text-xs text-[#B8C2D1]">
                  {FR.ui.questsDrawer.conservezUneCopieDeVotreEquipe}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="voxel-btn cursor-pointer px-4 py-2 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-bold text-xs sm:text-sm border-2 border-[#141925] inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{FR.ui.questsDrawer.telechargerJson}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="voxel-btn cursor-pointer px-4 py-2 rounded-xl bg-[#222A3A] hover:bg-[#2C364A] text-[#FAF7F0] font-semibold text-xs sm:text-sm border-2 border-[#39445A] inline-flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#2FB97A]" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? FR.ui.questsDrawer.copie : FR.ui.questsDrawer.copierLeJson}</span>
                  </button>
                </div>
              </div>

              {/* Import Section */}
              <div className="rounded-xl bg-[#141A26] border border-[#39445A] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-sm text-[#FAF7F0]">
                    {FR.ui.questsDrawer.importerUneSauvegardeJson}
                  </h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="voxel-btn cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#222A3A] hover:bg-[#2C364A] text-[#FAF7F0] font-semibold text-xs border border-[#39445A] inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{FR.ui.questsDrawer.choisirUnFichierJson}</span>
                  </button>
                </div>
                <textarea
                  value={pasteJson}
                  onChange={(e) => setPasteJson(e.target.value)}
                  rows={4}
                  placeholder={FR.ui.questsDrawer.ouCollezIciLeContenuJson}
                  className="w-full rounded-lg bg-[#0F1420] border border-[#39445A] p-2.5 text-xs font-mono-num text-[#FAF7F0] placeholder:text-[#64748B] focus:outline-none focus:border-[#F4B942]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => applyRawImport(pasteJson)}
                    className="voxel-btn cursor-pointer px-4 py-2 rounded-xl bg-[#2FB97A] hover:bg-[#38C987] text-[#0F172A] font-bold text-xs sm:text-sm border-2 border-[#141925]"
                  >
                    {FR.ui.questsDrawer.validerImporter}
                  </button>
                </div>
              </div>

              {/* Two-Step Safe Reset */}
              <div className="rounded-xl bg-[#1F151A] border border-[#5B2A35] p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-[#FECACA]">
                    {FR.ui.questsDrawer.reinitialiserLaSauvegarde}
                  </h3>
                  <p className="text-xs text-[#CBD5E1]">
                    {FR.ui.questsDrawer.repartDeZeroSurLIle}
                  </p>
                </div>
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="voxel-btn cursor-pointer px-3.5 py-2 rounded-xl bg-[#311A21] hover:bg-[#42222B] text-[#FECACA] font-semibold text-xs border border-[#E85D3F] inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{FR.ui.questsDrawer.reinitialiser}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#222A3A] text-xs font-semibold text-[#FAF7F0] border border-[#39445A]"
                    >
                      {FR.ui.questsDrawer.annuler}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmReset(false);
                        onResetSave();
                      }}
                      className="voxel-btn cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#E85D3F] text-xs font-bold text-[#FAF7F0] border border-[#141925]"
                    >
                      {FR.ui.questsDrawer.confirmerLaRemiseAZero}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
