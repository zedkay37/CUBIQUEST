import React from 'react';
import { INGREDIENTS, MOVE_STONES, POT_TIER_META } from '../game/catalog';
import type { ExpeditionOutcome } from '../game/types';
import { StoneIcon } from './Icons';

interface PauseModalProps {
  stageName: string;
  onResume: () => void;
  onRestart: () => void;
  onReturnCamp: () => void;
}

export function PauseModal({
  stageName,
  onResume,
  onRestart,
  onReturnCamp,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        className="voxel-panel w-full max-w-sm rounded-2xl p-6 text-center text-[#FAF7F0]"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
          Expédition en pause
        </p>
        <h2 id="pause-modal-title" className="mt-1 font-display text-2xl font-bold">
          {stageName}
        </h2>
        <p className="mt-2 text-xs text-[#B8C2D1]">
          Appuyez sur Échap ou P pour reprendre le combat.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="voxel-btn cursor-pointer w-full py-3 rounded-xl bg-[#2FB97A] hover:bg-[#38C987] text-[#0F172A] font-display font-bold text-base border-2 border-[#141925]"
          >
            Reprendre
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="voxel-btn cursor-pointer w-full py-2.5 rounded-xl bg-[#222A3A] hover:bg-[#2B3548] text-[#FAF7F0] font-semibold text-sm border-2 border-[#39445A]"
          >
            Recommencer le niveau
          </button>
          <button
            type="button"
            onClick={onReturnCamp}
            className="voxel-btn cursor-pointer w-full py-2.5 rounded-xl bg-[#181E2A] hover:bg-[#222A3A] text-[#CBD5E1] font-semibold text-sm border-2 border-[#39445A]"
          >
            Retour au Camp de Base
          </button>
        </div>
      </div>
    </div>
  );
}

interface OutcomeModalProps {
  outcome: ExpeditionOutcome;
  hasNextStage: boolean;
  onNextStage: () => void;
  onRetry: () => void;
  onReturnCamp: () => void;
}

export function OutcomeModal({
  outcome,
  hasNextStage,
  onNextStage,
  onRetry,
  onReturnCamp,
}: OutcomeModalProps) {
  const mins = Math.floor(outcome.clearTimeSec / 60);
  const secs = Math.floor(outcome.clearTimeSec % 60);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/75 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-modal-title"
        className="voxel-panel w-full max-w-lg rounded-2xl p-6 text-[#FAF7F0]"
      >
        <div className="text-center">
          <p
            className={`text-xs font-bold uppercase tracking-widest ${
              outcome.victory ? 'text-[#F4B942]' : 'text-[#E85D3F]'
            }`}
          >
            {outcome.biomeName} · {outcome.stageName}
          </p>
          <h2 id="outcome-modal-title" className="mt-1 font-display text-3xl font-extrabold">
            {outcome.victory ? 'Expédition réussie !' : 'Escouade vaincue'}
          </h2>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">
              {outcome.victory ? 'Temps' : 'Vagues'}
            </p>
            <p className="mt-1 font-mono-num text-lg font-bold text-[#FAF7F0]">
              {outcome.victory
                ? `${mins}:${secs.toString().padStart(2, '0')}`
                : `${outcome.wavesCleared}/${outcome.totalWaves}`}
            </p>
          </div>
          <div className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">Dégâts</p>
            <p className="mt-1 font-mono-num text-lg font-bold text-[#F4B942]">
              {outcome.damageDealt.toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">
              {outcome.victory ? 'XP / Unité' : 'PV Boss'}
            </p>
            <p className="mt-1 font-mono-num text-lg font-bold text-[#2FB97A]">
              {outcome.victory ? `+${outcome.xpPerUnit}` : `${outcome.bossHpPercentRemaining}%`}
            </p>
          </div>
        </div>

        {/* V0.2 Tactical Highlights */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono-num text-[#B8C2D1]">
          <span>
            Réactions <strong className="text-[#F4B942]">{outcome.reactionsTriggered}</strong>
          </span>
          <span>
            Ultimes <strong className="text-[#F4B942]">{outcome.ultimatesUsed}</strong>
          </span>
          <span>
            Esquives parfaites <strong className="text-[#38BDF8]">{outcome.perfectDodges}</strong>
          </span>
          <span>
            Combo max <strong className="text-[#2FB97A]">×{outcome.maxCombo}</strong>
          </span>
        </div>

        {/* Loot & Progression Summary */}
        <div className="mt-3.5 rounded-xl bg-[#141A26] border border-[#39445A] p-3.5 space-y-2.5 text-sm">
          {outcome.droppedIngredients.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-1.5">
                Ingrédients récoltés
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {outcome.droppedIngredients.map((item) => {
                  const ing = INGREDIENTS[item.id];
                  if (!ing) return null;
                  return (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#222A3A] border border-[#39445A]"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-xs inline-block"
                        style={{ backgroundColor: ing.hex }}
                      />
                      <span>{ing.name}</span>
                      <strong className="font-mono-num text-[#F4B942]">×{item.count}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {(outcome.droppedStone || outcome.droppedMoveStone) && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#273145]">
              {outcome.droppedStone && (
                <div className="flex items-center gap-2 text-xs">
                  <StoneIcon kind={outcome.droppedStone.kind} size={20} />
                  <span>
                    Pierre {outcome.droppedStone.kind === 'atk' ? 'ATQ' : 'PV'}{' '}
                    <strong className="font-mono-num text-[#F4B942]">
                      +{outcome.droppedStone.power}
                    </strong>{' '}
                    ({outcome.droppedStone.rarity})
                  </span>
                </div>
              )}
              {outcome.droppedMoveStone && (
                <div className="text-xs text-[#C084FC] font-semibold">
                  +1 {MOVE_STONES[outcome.droppedMoveStone].name}
                </div>
              )}
            </div>
          )}

          {outcome.leveledUpNames.length > 0 && (
            <p className="text-xs text-[#2FB97A] font-semibold pt-1 border-t border-[#273145]">
              Montée de niveau : {outcome.leveledUpNames.join(' · ')}
            </p>
          )}

          {outcome.potReadyNow && (
            <p className="text-xs text-[#F4B942] font-bold pt-1 border-t border-[#273145]">
              Votre plat dans la Marmite est prêt ! Rentrez au Camp pour accueillir la recrue.
            </p>
          )}

          {outcome.unlockedPotTier && (
            <p className="text-xs text-[#38BDF8] font-bold pt-1 border-t border-[#273145]">
              Nouveau chaudron débloqué : {POT_TIER_META[outcome.unlockedPotTier].label} !
            </p>
          )}

          {outcome.unlockedNextStageName && (
            <p className="text-xs text-[#FAF7F0] pt-1 border-t border-[#273145]">
              Nouveau niveau ouvert : <strong>{outcome.unlockedNextStageName}</strong>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2.5 justify-end">
          <button
            type="button"
            onClick={onReturnCamp}
            className="voxel-btn cursor-pointer px-4 py-2.5 rounded-xl bg-[#222A3A] hover:bg-[#2C364A] text-[#FAF7F0] font-semibold text-sm border-2 border-[#39445A] whitespace-nowrap shrink-0"
          >
            Retour au Camp
          </button>

          {outcome.victory && hasNextStage ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextStage}
              className="voxel-btn cursor-pointer px-6 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] whitespace-nowrap shrink-0"
            >
              Niveau suivant
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRetry}
              className="voxel-btn cursor-pointer px-6 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] whitespace-nowrap shrink-0"
            >
              {outcome.victory ? 'Rejouer le niveau' : 'Réessayer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
