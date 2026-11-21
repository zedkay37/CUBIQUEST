import React from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  Home,
  Trophy,
  Users,
  Vibrate,
  VibrateOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { computeSquadPower } from '../game/rules';
import type { SaveState } from '../game/types';
import { VoxelCreatureAvatar } from './Icons';

export type CampDrawerTab = 'expeditions' | 'cooking' | 'team' | 'quests' | 'codex' | null;

interface CampHudProps {
  save: SaveState;
  activeDrawer: CampDrawerTab;
  claimableCount: number;
  dockCollapsed: boolean;
  muted: boolean;
  screenShake: boolean;
  onToggleShake: () => void;
  onSelectDrawer: (tab: CampDrawerTab) => void;
  onToggleCollapse: () => void;
  onToggleMute: () => void;
  onReturnTitle: () => void;
}

export function CampHud({
  save,
  activeDrawer,
  claimableCount,
  dockCollapsed,
  muted,
  screenShake,
  onToggleShake,
  onSelectDrawer,
  onToggleCollapse,
  onToggleMute,
  onReturnTitle,
}: CampHudProps) {
  const squadPower = computeSquadPower(save);
  const squad = save.squadIds
    .map((uid) => save.roster.find((c) => c.uid === uid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const potNotice =
    save.pot.status === 'ready'
      ? 'Plat prêt !'
      : save.pot.status === 'cooking'
        ? `Cuisson (${save.pot.expeditionsRemaining})`
        : null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Perimeter Bar: Compact Camp Identity & Utilities */}
      <div className="flex items-start justify-between gap-3">
        <div className="voxel-panel rounded-xl px-4 py-2.5 flex items-center gap-3.5 pointer-events-auto">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
              Camp de Base
            </p>
            <p className="font-display font-bold text-base text-[#FAF7F0] leading-tight mt-0.5">
              Île aux Cubes
            </p>
          </div>
          <div className="h-8 w-px bg-[#39445A]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
              Puissance
            </p>
            <p className="font-mono-num font-bold text-base text-[#F4B942] leading-tight mt-0.5">
              {squadPower.toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="hidden sm:flex items-center -space-x-1.5 pl-1">
            {squad.map((c) => (
              <VoxelCreatureAvatar key={c.uid} speciesId={c.speciesId} size={32} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleShake();
            }}
            className={`voxel-btn cursor-pointer w-10 h-10 rounded-lg bg-[#181E2A]/92 hover:bg-[#242D3F] border-2 border-[#39445A] flex items-center justify-center ${
              screenShake ? 'text-[#FAF7F0]' : 'text-[#64748B]'
            }`}
            aria-label={
              screenShake
                ? 'Désactiver le tremblement de caméra'
                : 'Activer le tremblement de caméra'
            }
            aria-pressed={screenShake}
            title={screenShake ? 'Tremblement de caméra : activé' : 'Tremblement de caméra : désactivé'}
          >
            {screenShake ? <Vibrate className="w-4 h-4" /> : <VibrateOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="voxel-btn cursor-pointer w-10 h-10 rounded-lg bg-[#181E2A]/92 hover:bg-[#242D3F] text-[#FAF7F0] border-2 border-[#39445A] flex items-center justify-center"
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onReturnTitle();
            }}
            className="voxel-btn cursor-pointer w-10 h-10 rounded-lg bg-[#181E2A]/92 hover:bg-[#242D3F] text-[#FAF7F0] border-2 border-[#39445A] flex items-center justify-center"
            aria-label="Retour à l'écran titre"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Collapsible Unified Control Dock (Zero Center Viewport Occlusion) */}
      <div className="flex flex-col items-center pointer-events-auto">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="cursor-pointer mb-1.5 px-3 py-1 rounded-t-lg bg-[#181E2A]/92 border border-[#39445A] text-[11px] font-semibold text-[#B8C2D1] hover:text-[#FAF7F0] inline-flex items-center gap-1"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Afficher le camp
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Masquer le dock
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="voxel-panel rounded-2xl p-2 flex flex-wrap items-center justify-center gap-2 max-w-[min(860px,95vw)]">
            <button
              type="button"
              onClick={() => onSelectDrawer('expeditions')}
              className={`voxel-btn cursor-pointer px-4 sm:px-5 py-2.5 rounded-xl font-display font-bold text-sm border-2 inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeDrawer === 'expeditions'
                  ? 'bg-[#F06D50] border-[#FAF7F0] text-[#FAF7F0]'
                  : 'bg-[#E85D3F] hover:bg-[#F06D50] border-[#141925] text-[#FAF7F0]'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Expéditions</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDrawer('cooking')}
              className={`voxel-btn cursor-pointer px-4 py-2.5 rounded-xl font-semibold text-sm border-2 inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeDrawer === 'cooking'
                  ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                  : 'bg-[#202838] hover:bg-[#2A3448] border-[#39445A] text-[#FAF7F0]'
              }`}
            >
              <Flame className="w-4 h-4 text-[#F4B942]" />
              <span>Marmite</span>
              {potNotice && (
                <span className="font-mono-num text-[11px] text-[#2FB97A] font-bold">
                  · {potNotice}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectDrawer('team')}
              className={`voxel-btn cursor-pointer px-4 py-2.5 rounded-xl font-semibold text-sm border-2 inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeDrawer === 'team'
                  ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                  : 'bg-[#202838] hover:bg-[#2A3448] border-[#39445A] text-[#FAF7F0]'
              }`}
            >
              <Users className="w-4 h-4 text-[#38BDF8]" />
              <span>Équipe & Pierres</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectDrawer('quests')}
              className={`voxel-btn cursor-pointer px-4 py-2.5 rounded-xl font-semibold text-sm border-2 inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeDrawer === 'quests'
                  ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                  : 'bg-[#202838] hover:bg-[#2A3448] border-[#39445A] text-[#FAF7F0]'
              }`}
            >
              <Trophy className="w-4 h-4 text-[#F4B942]" />
              <span>Quêtes</span>
              {claimableCount > 0 && (
                <span className="font-mono-num text-[11px] text-[#2FB97A] font-bold">
                  · {claimableCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectDrawer('codex')}
              className={`voxel-btn cursor-pointer px-4 py-2.5 rounded-xl font-semibold text-sm border-2 inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
                activeDrawer === 'codex'
                  ? 'bg-[#2B374E] border-[#F4B942] text-[#FAF7F0]'
                  : 'bg-[#202838] hover:bg-[#2A3448] border-[#39445A] text-[#FAF7F0]'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#C084FC]" />
              <span>Codex Web</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
