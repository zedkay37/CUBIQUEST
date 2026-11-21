import React from 'react';

interface PauseModalProps {
  stageName: string;
  screenShake: boolean;
  onToggleShake: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnCamp: () => void;
}

export function PauseModal({
  stageName,
  screenShake,
  onToggleShake,
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

        <label className="mt-4 flex items-center justify-center gap-2 text-xs text-[#B8C2D1] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={screenShake}
            onChange={onToggleShake}
            className="w-4 h-4 accent-[#F4B942] cursor-pointer"
          />
          Tremblement de caméra lors des impacts
        </label>
      </div>
    </div>
  );
}
