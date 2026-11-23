import { useEffect, useState } from 'react';
import { BookOpen, Box, ChevronsLeft, ChevronsRight, Compass, Home, Settings, Users, Vibrate, VibrateOff, Volume2, VolumeX } from 'lucide-react';
import type { HubPlaceId } from '../game/engine/hub';
import { FR } from '../i18n/fr';
import { NewBadge } from './ui';

export type NavTab = 'expeditions' | 'atelier' | 'team' | 'carnet';

/** Lieu du camp qui correspond à chaque entrée (et inversement). */
export const TAB_TO_PLACE: Record<NavTab, HubPlaceId> = { expeditions: 'map', atelier: 'atelier', team: 'team', carnet: 'carnet' };

const ENTRIES: { tab: NavTab; Icon: typeof Compass }[] = [
  { tab: 'expeditions', Icon: Compass },
  { tab: 'atelier', Icon: Box },
  { tab: 'team', Icon: Users },
  { tab: 'carnet', Icon: BookOpen },
];

interface CampNavProps {
  active: NavTab | null;
  isOpen: (tab: NavTab) => boolean;
  isNew: (tab: NavTab) => boolean;
  /** Pastille chiffrée (cubes à ouvrir, récompenses à réclamer). */
  counts: Partial<Record<NavTab, number>>;
  /** Lieu survolé dans le camp : son entrée est mise en avant. */
  hoveredPlace: HubPlaceId | null;
  onHover: (tab: NavTab | null) => void;
  onSelect: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  // options
  muted: boolean;
  screenShake: boolean;
  quality?: 'auto' | 'low' | 'medium' | 'high';
  onToggleMute: () => void;
  onToggleShake: () => void;
  onCycleQuality?: () => void;
  onReturnTitle: () => void;
}

/**
 * Navigation du camp (sprint Art, section 0) : une barre latérale à gauche sur bureau (repliable en icônes,
 * choix mémorisé), une rangée d'icônes en bas sur téléphone. Survoler une entrée illumine le bâtiment du camp,
 * et survoler un bâtiment met son entrée en avant. Premier élément atteint par Tab.
 */
export function CampNav(props: CampNavProps) {
  const { active, isOpen, isNew, counts, hoveredPlace, onHover, onSelect, collapsed, onToggleCollapsed } = props;
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (!optionsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopPropagation();
        setOptionsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [optionsOpen]);

  const entries = ENTRIES.filter((e) => isOpen(e.tab));
  const label = (tab: NavTab) => FR.ui.nav[tab];

  return (
    <nav
      aria-label={FR.ui.nav.titre}
      className={`pointer-events-auto fixed z-30 flex gap-1.5 voxel-panel p-1.5
        bottom-2 left-1/2 -translate-x-1/2 flex-row
        sm:bottom-auto sm:left-3 sm:top-24 sm:translate-x-0 sm:flex-col ${collapsed ? 'sm:w-[60px]' : 'sm:w-[184px]'}`}
    >
      {entries.map(({ tab, Icon }) => {
        const highlighted = hoveredPlace === TAB_TO_PLACE[tab];
        const count = counts[tab] ?? 0;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect(tab)}
            onMouseEnter={() => onHover(tab)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(tab)}
            onBlur={() => onHover(null)}
            aria-current={active === tab ? 'page' : undefined}
            aria-label={label(tab)}
            title={label(tab)}
            className={`voxel-btn relative flex min-h-[44px] min-w-[44px] items-center gap-2.5 rounded-lg border-2 px-2.5 text-sm font-semibold ${
              active === tab ? 'block-btn-gold' : highlighted ? 'border-[#F4B942] bg-[#2A3448] text-[#FAF7F0]' : 'block-btn-secondary'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className={`hidden whitespace-nowrap ${collapsed ? '' : 'sm:inline'}`}>{label(tab)}</span>
            {count > 0 && (
              <span className="ui-new-badge absolute -right-1.5 -top-1.5 rounded-[4px] bg-[#F4B942] px-1 font-mono-num text-[10px] font-bold text-[#1A0E08] sm:static sm:ml-auto">
                {count}
              </span>
            )}
            {isNew(tab) && count === 0 && (
              <span className="absolute -right-1.5 -top-1.5 sm:static sm:ml-auto">
                <NewBadge />
              </span>
            )}
          </button>
        );
      })}

      {/* Options : graphismes, tremblement, son, écran titre */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          aria-expanded={optionsOpen}
          aria-label={FR.ui.nav.options}
          title={FR.ui.nav.options}
          className={`voxel-btn flex min-h-[44px] min-w-[44px] w-full items-center gap-2.5 rounded-lg border-2 px-2.5 text-sm font-semibold ${optionsOpen ? 'block-btn-gold' : 'block-btn-secondary'}`}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className={`hidden whitespace-nowrap ${collapsed ? '' : 'sm:inline'}`}>{FR.ui.nav.options}</span>
        </button>
        {optionsOpen && (
          <div className="voxel-panel absolute bottom-full right-0 mb-2 flex w-56 flex-col gap-1.5 p-2 sm:bottom-auto sm:left-full sm:right-auto sm:top-0 sm:mb-0 sm:ml-2" role="group" aria-label={FR.ui.nav.options}>
            {props.quality && props.onCycleQuality && (
              <button type="button" onClick={props.onCycleQuality} className="voxel-btn block-btn-secondary min-h-[44px] rounded-lg border-2 px-3 text-left text-sm font-semibold">
                {FR.ui.campHud.qualiteCourt(FR.ui.campHud.qualites[props.quality])}
              </button>
            )}
            <button type="button" onClick={props.onToggleShake} aria-pressed={props.screenShake} className="voxel-btn block-btn-secondary flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-3 text-left text-sm font-semibold">
              {props.screenShake ? <Vibrate className="h-4 w-4" /> : <VibrateOff className="h-4 w-4" />}
              {props.screenShake ? FR.ui.campHud.tremblementDeCameraActive : FR.ui.campHud.tremblementDeCameraDesactive}
            </button>
            <button type="button" onClick={props.onToggleMute} aria-pressed={!props.muted} className="voxel-btn block-btn-secondary flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-3 text-left text-sm font-semibold">
              {props.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {props.muted ? FR.ui.nav.sonCoupe : FR.ui.nav.sonActif}
            </button>
            <button type="button" onClick={props.onReturnTitle} className="voxel-btn block-btn-secondary flex min-h-[44px] items-center gap-2 rounded-lg border-2 px-3 text-left text-sm font-semibold">
              <Home className="h-4 w-4" />
              {FR.ui.campHud.retourALEcranTitre}
            </button>
          </div>
        )}
      </div>

      {/* Replier / déplier (bureau seulement), choix mémorisé */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? FR.ui.nav.deplier : FR.ui.nav.replier}
        title={collapsed ? FR.ui.nav.deplier : FR.ui.nav.replier}
        className="hidden min-h-[36px] items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#FAF7F0] sm:flex"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </nav>
  );
}
