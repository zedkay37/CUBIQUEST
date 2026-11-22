import React from 'react';
import { TitleLockup } from './Icons';
import { FR } from '../i18n/fr';

interface TitleOverlayProps {
  hasExistingSave: boolean;
  onStart: () => void;
  onNewAdventure: () => void;
}

export function TitleOverlay({
  hasExistingSave,
  onStart,
  onNewAdventure,
}: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none px-6 py-8 ui-screen-enter">
      {/* Upper calm negative-space lockup over the sunlit 3D sky */}
      <div className="flex flex-col items-center pt-4 sm:pt-8">
        <TitleLockup />
      </div>

      {/* Lower primary CTA + single flat control-hint line */}
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="voxel-btn cursor-pointer px-8 py-3.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-lg tracking-wide border-2 border-[#181E2A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4B942]"
          >
            {hasExistingSave ? FR.ui.titleOverlay.continuerLAventure : FR.ui.titleOverlay.commencerLAventure}
          </button>

          {hasExistingSave && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onNewAdventure();
              }}
              className="voxel-btn cursor-pointer px-5 py-3.5 rounded-xl bg-[#181E2A]/90 hover:bg-[#242D3F] text-[#FAF7F0] font-semibold text-sm border-2 border-[#39445A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4B942]"
            >
              {FR.ui.titleOverlay.nouvelleIle}
            </button>
          )}
        </div>

        <p className="text-xs sm:text-sm font-medium text-[#FAF7F0] hud-text-stroke tracking-wide text-center">
          {FR.ui.titleOverlay.t123SortsEspaceEsquive}
        </p>
        {import.meta.env.VITE_TEST_BRANCH && (
          <p className="text-[10px] font-mono-num text-[#B8C2D1] hud-text-stroke tracking-wide">
            {FR.ui.titleOverlay.versionEnTest(import.meta.env.VITE_TEST_BRANCH)}
          </p>
        )}
      </div>
    </div>
  );
}
