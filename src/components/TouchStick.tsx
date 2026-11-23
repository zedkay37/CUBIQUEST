import { useRef, useState } from 'react';
import { FR } from '../i18n/fr';

/**
 * Manette tactile (sprint ART 2, section 5) : en mode Manuel, le déplacement du meneur se fait au doigt,
 * comme avec les touches de direction. Glisser depuis le centre ; relâcher arrête la créature.
 */
export function TouchStick({ onMove }: { onMove: (x: number, z: number) => void }) {
  const base = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 46;

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    setKnob({ x: dx, y: dy });
    // petite zone morte au centre
    const k = Math.hypot(dx, dy) < 8 ? 0 : 1;
    onMove((dx / R) * k, (dy / R) * k);
  };
  const stop = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={base}
      role="group"
      aria-label={FR.ui.expeditionHud.manetteTactile}
      className="pointer-events-auto relative h-[132px] w-[132px] touch-none select-none rounded-full border-2 border-[#39445A] bg-[#141925]/60"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-[#141925] bg-[#F4B942]/85"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
