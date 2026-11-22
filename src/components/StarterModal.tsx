import React from 'react';
import { ELEMENT_META, MOVES, SPECIES, STARTER_IDS } from '../game/catalog';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';

interface StarterModalProps {
  onSelectStarter: (speciesId: string) => void;
}

export function StarterModal({ onSelectStarter }: StarterModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="starter-dialog-title"
        className="voxel-panel w-full max-w-2xl rounded-2xl p-6 text-[#FAF7F0]"
      >
        <div className="mb-5 text-center">
          <h2 id="starter-dialog-title" className="font-display text-2xl sm:text-3xl font-bold">
            {FR.ui.starterModal.choisissezVotrePremiereCreature}
          </h2>
          <p className="mt-1.5 text-sm text-[#B8C2D1]">
            {FR.ui.starterModal.deuxEclaireursVousRejoindrontAussitotPour}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STARTER_IDS.map((id) => {
            const sp = SPECIES[id];
            const move = MOVES[sp.moveId];
            const el = ELEMENT_META[sp.element];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectStarter(id)}
                className="voxel-btn cursor-pointer group flex flex-col items-center text-left rounded-xl bg-[#222A3A] hover:bg-[#2A3448] border-2 border-[#39445A] hover:border-[#F4B942] p-4 focus-visible:outline-2 focus-visible:outline-[#F4B942]"
              >
                <VoxelCreatureAvatar speciesId={id} size={74} className="mb-2" />
                <div className="flex items-center gap-1.5">
                  <ElementIcon element={sp.element} size={18} />
                  <span className="font-display text-lg font-bold text-[#FAF7F0]">{sp.name}</span>
                </div>
                <p className="mt-1 text-xs text-[#B8C2D1] text-center">
                  {el.label} · {sp.role === 'tank' ? FR.ui.starterModal.tank : sp.role === 'ranged' ? FR.ui.starterModal.distance : FR.ui.starterModal.melee}
                </p>
                <div className="mt-3 w-full border-t border-[#39445A] pt-2.5 flex justify-between text-xs font-mono-num">
                  <span className="text-[#2FB97A]">{FR.ui.starterModal.pv}{sp.baseHp}</span>
                  <span className="text-[#F4B942]">{FR.ui.starterModal.atq}{sp.baseAtk}</span>
                </div>
                <p className="mt-2 text-xs text-[#CBD5E1] text-center leading-snug">
                  {FR.ui.starterModal.sort}<strong className="text-[#FAF7F0]">{move.name}</strong>
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
