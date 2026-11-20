import React, { useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import { BIOMES, ELEMENT_META, INGREDIENTS, SPECIES, STAGES } from '../game/catalog';
import { computeSquadPower } from '../game/rules';
import type { BiomeId, SaveState, StageDef } from '../game/types';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';

interface ExpeditionDrawerProps {
  save: SaveState;
  onLaunchStage: (stage: StageDef) => void;
  onClose: () => void;
}

const BIOME_ORDER: BiomeId[] = ['meadow', 'shore', 'volcano', 'sanctuary'];

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
              Carte des Expéditions
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              Puissance de votre escouade :{' '}
              <strong className="font-mono-num text-[#F4B942]">
                {squadPower.toLocaleString('fr-FR')}
              </strong>{' '}
              · {save.completedStageIds.length}/{STAGES.length} niveaux vaincus
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn cursor-pointer w-9 h-9 rounded-lg bg-[#222A3A] hover:bg-[#2E384E] border border-[#39445A] flex items-center justify-center"
            aria-label="Fermer la carte des expéditions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Biome Tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#2A3346] overflow-x-auto">
          {BIOME_ORDER.map((bId) => {
            const b = BIOMES[bId];
            const firstIdx = STAGES.find((s) => s.biomeId === bId)?.index ?? 0;
            const unlocked = save.highestStageIndex >= firstIdx;
            const active = selectedBiome === bId;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => {
                  setSelectedBiome(bId);
                  const firstInBiome = STAGES.find((s) => s.biomeId === bId);
                  if (firstInBiome) setSelectedStageId(firstInBiome.id);
                }}
                className={`cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#2A3449] border-[#F4B942] text-[#FAF7F0]'
                    : 'bg-[#171D29] border-[#323D52] text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                <ElementIcon element={b.dominantElement} size={16} />
                <span>{b.name}</span>
                {!unlocked && <Lock className="w-3.5 h-3.5 text-[#64748B]" />}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto cubi-scroll p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: 3 Stages in Biome */}
          <div className="md:col-span-6 space-y-2.5">
            <p className="text-xs text-[#B8C2D1] mb-2">{activeBiome.subtitle}</p>
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
                  className={`w-full text-left rounded-xl p-3.5 border-2 transition-colors flex items-center justify-between gap-3 ${
                    locked
                      ? 'bg-[#141A25] border-[#263043] opacity-55 cursor-not-allowed'
                      : selected
                        ? 'bg-[#263147] border-[#F4B942] cursor-pointer'
                        : 'bg-[#1D2535] border-[#334057] hover:border-[#64748B] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <VoxelCreatureAvatar speciesId={boss.id} size={42} className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono-num text-[#B8C2D1]">
                        Niveau {stage.index + 1} · {completed ? 'Terminé' : locked ? 'Verrouillé' : 'Disponible'}
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
                        <p className="text-[10px] uppercase text-[#B8C2D1]">Conseillé</p>
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
          <div className="md:col-span-6 rounded-xl bg-[#161C29] border border-[#344056] p-4 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <VoxelCreatureAvatar speciesId={activeStage.bossSpeciesId} size={56} />
                <div>
                  <p className="text-xs font-semibold text-[#B8C2D1]">
                    Boss du niveau · {ELEMENT_META[SPECIES[activeStage.bossSpeciesId].element].label}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#FAF7F0]">
                    {SPECIES[activeStage.bossSpeciesId].name}
                  </h3>
                  <p className="text-xs text-[#CBD5E1] mt-0.5">
                    {activeStage.waves.length} vagues · XP de base{' '}
                    <span className="font-mono-num text-[#2FB97A]">+{activeStage.xpReward}</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-[#283247] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-2">
                  Butin & Ingrédients
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
                  Pierres de Pouvoir :{' '}
                  <strong className="font-mono-num text-[#F4B942]">
                    +{activeStage.stonePowerRange[0]} à +{activeStage.stonePowerRange[1]}
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isStageLocked || save.squadIds.length === 0}
              onClick={() => onLaunchStage(activeStage)}
              className="voxel-btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full py-3.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-base border-2 border-[#141925] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Lancer l’expédition</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
