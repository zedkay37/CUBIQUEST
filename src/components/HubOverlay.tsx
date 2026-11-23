import { useEffect, useRef, useState } from 'react';
import type { HubPlaceId } from '../game/engine/hub';
import type { VoxelEngine } from '../game/VoxelEngine';
import { FR } from '../i18n/fr';

interface HubOverlayProps {
  getEngine: () => VoxelEngine | null;
  /** Le hub ne réagit qu'au camp, quand aucune fenêtre n'est ouverte. */
  enabled: boolean;
  /** Lieux déjà ouverts (les autres ne réagissent pas). */
  isOpen: (id: HubPlaceId) => boolean;
  /** Pastille au-dessus d'un lieu quand il y a du nouveau (nombre, ou true). */
  badges: Partial<Record<HubPlaceId, number | boolean>>;
  onOpen: (id: HubPlaceId) => void;
  /** Le lieu survolé change (pour mettre en avant son entrée dans la barre latérale). */
  onHoverChange?: (id: HubPlaceId | null) => void;
}

/**
 * Hub cliquable (spec Atelier, A3.1) : survol (ou premier toucher) = le lieu s'illumine et son nom s'affiche ;
 * clic (ou second toucher) = l'écran s'ouvre. Pastilles au-dessus des lieux qui ont du nouveau.
 */
export function HubOverlay({ getEngine, enabled, isOpen, badges, onOpen, onHoverChange }: HubOverlayProps) {
  const [hover, setHover] = useState<HubPlaceId | null>(null);
  const [anchors, setAnchors] = useState<{ id: HubPlaceId; x: number; y: number }[]>([]);
  const hoverRef = useRef<HubPlaceId | null>(null);
  const propsRef = useRef({ isOpen, onOpen, onHoverChange });
  propsRef.current = { isOpen, onOpen, onHoverChange };

  useEffect(() => {
    const engine = getEngine();
    if (!enabled || !engine) {
      engine?.setHubHover(null);
      setHover(null);
      hoverRef.current = null;
      return;
    }
    const canvas = () => getEngine()?.renderer?.domElement ?? null;
    const pick = (e: PointerEvent): HubPlaceId | null => {
      const c = canvas();
      if (!c || e.target !== c) return null;
      const r = c.getBoundingClientRect();
      const id = getEngine()?.pickHubPlace(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1) ?? null;
      return id && propsRef.current.isOpen(id) ? id : null;
    };
    const setH = (id: HubPlaceId | null) => {
      if (hoverRef.current !== id) propsRef.current.onHoverChange?.(id);
      hoverRef.current = id;
      setHover(id);
      getEngine()?.setHubHover(id);
      const c = canvas();
      if (c) c.style.cursor = id ? 'pointer' : '';
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setH(pick(e));
    };
    const onUp = (e: PointerEvent) => {
      const id = pick(e);
      if (!id) return;
      // au toucher : le premier toucher montre le lieu, le second l'ouvre
      if (e.pointerType === 'touch' && hoverRef.current !== id) {
        setH(id);
        return;
      }
      setH(null);
      propsRef.current.onOpen(id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    let raf = 0;
    const loop = () => {
      setAnchors(getEngine()?.getHubAnchors() ?? []);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cancelAnimationFrame(raf);
      setH(null);
    };
  }, [enabled, getEngine]);

  if (!enabled) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-10" aria-hidden="true">
      {/* consigne discrète sur bureau (le dock y est masqué) */}
      <p className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 rounded-lg bg-[#141925]/80 px-3 py-1 text-xs font-semibold text-[#FAF7F0] sm:block">{FR.ui.hub.aide}</p>
      {anchors.map((a) => {
        if (!isOpen(a.id)) return null;
        const badge = badges[a.id];
        const showName = hover === a.id;
        return (
          <div key={a.id} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: a.x, top: a.y }}>
            {badge ? (
              <span className="ui-new-badge mx-auto mb-1 block w-max rounded-[4px] bg-[#F4B942] px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-[#1A0E08]">
                {typeof badge === 'number' ? badge : '!'}
              </span>
            ) : null}
            {showName && (
              <span className="voxel-panel block whitespace-nowrap px-3 py-1 font-display text-sm font-bold text-[#FAF7F0]">{FR.ui.hub.lieux[a.id]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
