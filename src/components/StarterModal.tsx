import React from 'react';
import { BURSTS, ELEMENT_META, SPECIES, STARTER_TRIOS, STARTER_TRIO_IDS, type StarterTrioId } from '../game/catalog';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';

interface StarterModalProps {
  /** Reçoit l'identifiant du trio choisi (S07.1). */
  onSelectStarter: (trioId: StarterTrioId) => void;
}

/** Choix du trio de départ (S07.1) : deux cartes, trois compagnons chacune, et leurs trois Éclats. */
export function StarterModal({ onSelectStarter }: StarterModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/70 p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="starter-dialog-title"
        className="voxel-panel w-full max-w-3xl rounded-2xl p-5 sm:p-6 text-[#FAF7F0] ui-screen-enter"
      >
        <div className="mb-4 text-center">
          <h2 id="starter-dialog-title" className="font-display text-2xl sm:text-3xl font-bold">
            {FR.ui.starterModal.choisisTonTrio}
          </h2>
          <p className="mt-1.5 text-sm text-[#B8C2D1]">{FR.ui.starterModal.troisElements}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ui-cascade">
          {STARTER_TRIO_IDS.map((trioId) => (
            <button
              key={trioId}
              type="button"
              data-start="true"
              onClick={() => onSelectStarter(trioId)}
              className="voxel-btn cursor-pointer group flex flex-col rounded-xl bg-[#222A3A] hover:bg-[#2A3448] border-2 border-[#39445A] hover:border-[#F4B942] p-4 text-left focus-visible:outline-2 focus-visible:outline-[#F4B942]"
            >
              <span className="font-display text-xl font-bold text-[#F4B942] text-center">{FR.ui.starterModal.nomsTrios[trioId]}</span>
              {/* les trois compagnons, qui sautillent à tour de rôle */}
              <div className="mt-2 flex justify-center gap-2">
                {STARTER_TRIOS[trioId].map((id, i) => (
                  <span key={id} className="starter-hop" style={{ animationDelay: `${i * 0.25}s` } as React.CSSProperties}>
                    <VoxelCreatureAvatar speciesId={id} size={64} />
                  </span>
                ))}
              </div>
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-[#39445A] pt-2.5">
                {STARTER_TRIOS[trioId].map((id) => {
                  const sp = SPECIES[id];
                  const burst = BURSTS[sp.element];
                  return (
                    <li key={id} className="flex items-start gap-2 text-xs leading-snug">
                      <ElementIcon element={sp.element} size={16} />
                      <span>
                        <strong className="text-[#FAF7F0]">{sp.name}</strong>
                        <span className="text-[#94A3B8]"> · {ELEMENT_META[sp.element].label} · </span>
                        <strong style={{ color: burst.color }}>{burst.name}</strong>
                        <span className="text-[#CBD5E1]"> : {FR.ui.starterModal.eclatCourt[burst.id as keyof typeof FR.ui.starterModal.eclatCourt]}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
