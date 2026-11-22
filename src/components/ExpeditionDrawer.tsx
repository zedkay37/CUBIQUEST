import React, { useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import { BIOME_ORDER, BIOMES, ELEMENT_META, INGREDIENTS, SPECIES, STAGES } from '../game/catalog';
import { computeSquadPower, isBiomeUnlocked } from '../game/rules';
import type { BiomeId, SaveState, StageDef } from '../game/types';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';

/** Position des sept biomes sur la carte de l'île (repère 700 × 118), dans l'ordre de la campagne. */
const MAP_POINTS: [number, number][] = [
  [55, 78],
  [150, 38],
  [250, 80],
  [350, 36],
  [450, 80],
  [550, 38],
  [645, 78],
];

interface ExpeditionDrawerProps {
  save: SaveState;
  onLaunchStage: (stage: StageDef) => void;
  onClose: () => void;
}


export function ExpeditionDrawer({
  save,
  onLaunchStage,
  onClose,
}: ExpeditionDrawerProps) {
  const highestStage = STAGES[Math.min(save.highestStageIndex, STAGES.length - 1)];
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>(highestStage.biomeId);
  const [selectedStageId, setSelectedStageId] = useState<string>(highestStage.id);

  const squadPower = computeSquadPower(save);
  const biomeStages = STAGES.filter((s) => s.biomeId === selectedBiome);
  const activeStage = STAGES.find((s) => s.id === selectedStageId) ?? biomeStages[0];
  const activeBiome = BIOMES[selectedBiome];
  const isStageLocked = activeStage.index > save.highestStageIndex;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-3 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expedition-drawer-title"
        className="voxel-panel w-full max-w-4xl max-h-[86vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#39445A]">
          <div>
            <h2 id="expedition-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              {FR.ui.expeditionDrawer.carteDesExpeditions}
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              {FR.ui.expeditionDrawer.puissanceDeVotreEscouade}{' '}
              <strong className="font-mono-num text-[#F4B942]">
                {squadPower.toLocaleString('fr-FR')}
              </strong>{' '}
              · {save.completedStageIds.length}/{STAGES.length}{FR.ui.expeditionDrawer.niveauxVaincus}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn cursor-pointer w-9 h-9 rounded-lg block-btn-secondary border border-[#39445A] flex items-center justify-center"
            aria-label={FR.ui.expeditionDrawer.fermerLaCarteDesExpeditions}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carte de l'île : les biomes reliés par un chemin, les verrouillés grisés (défile sur mobile) */}
        <div className="border-b border-[#2A3346] overflow-x-auto cubi-scroll">
          <div className="relative mx-auto h-[118px] min-w-[620px] max-w-[860px]" role="tablist" aria-label={FR.ui.expeditionDrawer.carteDesExpeditions}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 700 118" preserveAspectRatio="none" aria-hidden="true">
              {BIOME_ORDER.slice(1).map((bId, i) => {
                const a = MAP_POINTS[i];
                const b = MAP_POINTS[i + 1];
                const open = isBiomeUnlocked(save, bId);
                return (
                  <path
                    key={bId}
                    d={`M ${a[0]} ${a[1]} C ${(a[0] + b[0]) / 2} ${a[1]}, ${(a[0] + b[0]) / 2} ${b[1]}, ${b[0]} ${b[1]}`}
                    fill="none"
                    stroke={open ? '#F4B942' : '#39445A'}
                    strokeWidth={open ? 5 : 4}
                    strokeDasharray={open ? undefined : '6 7'}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
            {BIOME_ORDER.map((bId, i) => {
              const b = BIOMES[bId];
              const unlocked = isBiomeUnlocked(save, bId);
              const active = selectedBiome === bId;
              const [x, y] = MAP_POINTS[i];
              return (
                <button
                  key={bId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedBiome(bId);
                    const firstInBiome = STAGES.find((s) => s.biomeId === bId);
                    if (firstInBiome) setSelectedStageId(firstInBiome.id);
                  }}
                  className={`voxel-btn absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[78px] text-[11px] font-bold ${
                    active ? 'block-btn-gold' : unlocked ? 'block-btn-secondary' : 'block-btn-secondary opacity-60 grayscale'
                  }`}
                  style={{ left: `${(x / 700) * 100}%`, top: `${(y / 118) * 100}%`, borderBottomColor: ELEMENT_META[b.dominantElement].color }}
                >
                  <span className="flex items-center gap-1">
                    <ElementIcon element={b.dominantElement} size={16} />
                    {!unlocked && <Lock className="w-3 h-3" />}
                  </span>
                  <span className="whitespace-nowrap">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto cubi-scroll p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: 3 Stages in Biome */}
          <div className="md:col-span-6 space-y-2.5 ui-cascade">
            <p className="text-xs text-[#B8C2D1] mb-2">{activeBiome.subtitle}</p>
            {!isBiomeUnlocked(save, selectedBiome) && biomeStages[0] && biomeStages[0].index > 0 && (
              <p className="text-xs font-semibold text-[#F4B942] mb-2">
                {FR.ui.expeditionDrawer.biomeVerrouilleTerminez}{STAGES[biomeStages[0].index - 1].name}{FR.ui.expeditionDrawer.pourLOuvrir}
              </p>
            )}
            {biomeStages.map((stage) => {
              const locked = stage.index > save.highestStageIndex;
              const completed = save.completedStageIds.includes(stage.id);
              const selected = stage.id === activeStage.id;
              const boss = SPECIES[stage.bossSpeciesId];
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`voxel-btn w-full text-left p-3.5 border-2 flex items-center justify-between gap-3 ${
                    locked
                      ? 'bg-[#141A25] border-[#263043] opacity-55 grayscale cursor-not-allowed'
                      : selected
                        ? 'bg-[#263147] border-[#F4B942] cursor-pointer'
                        : 'bg-[#1D2535] border-[#334057] cursor-pointer'
                  }`}
                  style={{ borderLeftColor: ELEMENT_META[boss.element].color, borderLeftWidth: 5 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <VoxelCreatureAvatar speciesId={boss.id} size={42} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono-num text-[#B8C2D1]">
                        {FR.ui.expeditionDrawer.niveau}{stage.index + 1} · {completed ? FR.ui.expeditionDrawer.termine : locked ? FR.ui.expeditionDrawer.verrouille : FR.ui.expeditionDrawer.disponible}
                      </p>
                      <p className="font-display font-bold text-sm sm:text-base text-[#FAF7F0] truncate">
                        {stage.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {locked ? (
                      <Lock className="w-4 h-4 text-[#94A3B8] ml-auto" />
                    ) : (
                      <>
                        <p className="text-[10px] uppercase text-[#B8C2D1]">{FR.ui.expeditionDrawer.conseille}</p>
                        <p
                          className={`font-mono-num text-sm font-bold ${
                            squadPower >= stage.recommendedPower ? 'text-[#2FB97A]' : 'text-[#F4B942]'
                          }`}
                        >
                          {stage.recommendedPower}
                        </p>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Stage Briefing */}
          <div className="md:col-span-6 voxel-panel p-4 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <VoxelCreatureAvatar speciesId={activeStage.bossSpeciesId} size={56} />
                <div>
                  <p className="text-xs font-semibold text-[#B8C2D1]">
                    {FR.ui.expeditionDrawer.bossDuNiveau}{ELEMENT_META[SPECIES[activeStage.bossSpeciesId].element].label}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#FAF7F0]">
                    {SPECIES[activeStage.bossSpeciesId].name}
                  </h3>
                  <p className="text-xs text-[#CBD5E1] mt-0.5">
                    {activeStage.waves.length}{FR.ui.expeditionDrawer.vaguesXpDeBase}{' '}
                    <span className="font-mono-num text-[#2FB97A]">+{activeStage.xpReward}</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-[#283247] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-2">
                  {FR.ui.expeditionDrawer.butinIngredients}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeStage.dropIngredients.map((ingId) => {
                    const ing = INGREDIENTS[ingId];
                    if (!ing) return null;
                    return (
                      <span
                        key={ingId}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#222B3D] border border-[#344056]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: ing.hex }}
                        />
                        {ing.name}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-xs text-[#B8C2D1]">
                  {FR.ui.expeditionDrawer.pierresDePouvoir}{' '}
                  <strong className="font-mono-num text-[#F4B942]">
                    +{activeStage.stonePowerRange[0]}{FR.ui.expeditionDrawer.a}{activeStage.stonePowerRange[1]}
                  </strong>
                </p>
              </div>
            </div>

            <div className="space-y-2">
            {isStageLocked && activeStage.index > 0 && (
              <p className="text-xs font-semibold text-[#F4B942] text-center">
                {FR.ui.expeditionDrawer.niveauVerrouilleTerminezDAbord}{STAGES[activeStage.index - 1].name} ».
              </p>
            )}
            <button
              type="button"
              disabled={isStageLocked || save.squadIds.length === 0}
              onClick={() => onLaunchStage(activeStage)}
              className="voxel-btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full py-3.5 rounded-xl block-btn-primary font-display font-bold text-base border-2 border-[#141925] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{FR.ui.expeditionDrawer.lancerLExpedition}</span>
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
