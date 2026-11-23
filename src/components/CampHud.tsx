import React from 'react';
import { computeSquadPower } from '../game/rules';
import type { SaveState } from '../game/types';
import { VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';
import { CampNav, TAB_TO_PLACE } from './CampNav';
import type { HubPlaceId } from '../game/engine/hub';

export type CampDrawerTab = 'expeditions' | 'atelier' | 'team' | 'carnet' | null;

interface CampHudProps {
  save: SaveState;
  activeDrawer: CampDrawerTab;
  claimableCount: number;
  dockCollapsed: boolean;
  muted: boolean;
  screenShake: boolean;
  onToggleShake: () => void;
  /** G1.2 : qualité graphique (cycle Auto → Haut → Moyen → Bas). */
  quality?: 'auto' | 'low' | 'medium' | 'high';
  onCycleQuality?: () => void;
  onSelectDrawer: (tab: CampDrawerTab) => void;
  onToggleCollapse: () => void;
  onToggleMute: () => void;
  onReturnTitle: () => void;
  /** Ouvertures (S07.3) : boutons visibles, et celles dont la pastille « Nouveau » n'a pas été vue. */
  unlocked?: Set<string>;
  unseen?: string[];
  onSeenUnlock?: (feature: string) => void;
  /** Sprint Art, section 0 : navigation latérale et lien avec les bâtiments du camp. */
  hubHover?: HubPlaceId | null;
  onNavHover?: (place: HubPlaceId | null) => void;
  navCollapsed?: boolean;
  onToggleNav?: () => void;
}

export function CampHud({
  save,
  activeDrawer,
  claimableCount,
  dockCollapsed,
  muted,
  screenShake,
  onToggleShake,
  quality,
  onCycleQuality,
  onSelectDrawer,
  onToggleCollapse,
  onToggleMute,
  onReturnTitle,
  unlocked,
  unseen = [],
  onSeenUnlock,
  hubHover = null,
  onNavHover,
  navCollapsed = false,
  onToggleNav,
}: CampHudProps) {
  const isOpen = (tab: string) => !unlocked || unlocked.has(tab);
  const cubeCount = save.sealedCubes?.length ?? 0;
  const isNew = (tab: string) => isOpen(tab) && unseen.includes(tab);
  const selectDrawer = (tab: Exclude<CampDrawerTab, null>) => {
    if (isNew(tab)) onSeenUnlock?.(tab);
    onSelectDrawer(tab);
  };
  // une phrase pour la dernière ouverture pas encore vue
  const newest = (['atelier', 'team', 'carnet'] as const).find((t) => isNew(t));
  const squadPower = computeSquadPower(save);
  const squad = save.squadIds
    .map((uid) => save.roster.find((c) => c.uid === uid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4 ui-screen-enter">
      {/* Top Perimeter Bar: Compact Camp Identity & Utilities */}
      <div className="flex items-start justify-between gap-3">
        <div className="voxel-panel rounded-xl px-4 py-2.5 flex items-center gap-3.5 pointer-events-auto">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
              {FR.ui.campHud.leCamp}
            </p>
            <p className="font-display font-bold text-base text-[#FAF7F0] leading-tight mt-0.5">
              {FR.ui.campHud.ileAuxCubes}
            </p>
          </div>
          <div className="h-8 w-px bg-[#39445A]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
              {FR.ui.campHud.puissance}
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
      </div>

      <CampNav
        active={activeDrawer}
        isOpen={(tab) => tab === 'expeditions' || isOpen(tab)}
        isNew={(tab) => isNew(tab)}
        counts={{ atelier: cubeCount, carnet: claimableCount }}
        hoveredPlace={hubHover}
        onHover={(tab) => onNavHover?.(tab ? TAB_TO_PLACE[tab] : null)}
        onSelect={(tab) => selectDrawer(tab)}
        collapsed={navCollapsed}
        onToggleCollapsed={() => onToggleNav?.()}
        muted={muted}
        screenShake={screenShake}
        quality={quality}
        onToggleMute={onToggleMute}
        onToggleShake={onToggleShake}
        onCycleQuality={onCycleQuality}
        onReturnTitle={onReturnTitle}
      />
    </div>
  );
}
