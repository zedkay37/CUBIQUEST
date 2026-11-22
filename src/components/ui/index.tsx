/**
 * Bibliothèque de composants de l'interface, direction « jouet voxel » (sprint UI).
 * Les formes viennent des classes `.voxel-panel` et `.voxel-btn` (src/index.css) et des jetons
 * `UI_TOKENS` (styleGuide.ts). Démonstration : `?gallery=ui`.
 *
 * Aucune de ces animations n'est liée à la boucle de jeu : elles ne tournent que quand l'interface change.
 * Toutes respectent `prefers-reduced-motion` (MotionConfig reducedMotion="user" dans l'application, et
 * `usePrefersReducedMotion` pour les animations faites à la main).
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { soundFx } from '../../game/audio';
import { ELEMENT_META } from '../../game/catalog';
import { UI_TOKENS } from '../../game/styleGuide';
import type { ElementType } from '../../game/types';
import { ElementIcon, VoxelCreatureAvatar } from '../Icons';
import { FR } from '../../i18n/fr';

/** Vrai si le joueur a demandé moins d'animations. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

// ------------------------------------------------------------------ BlockPanel

export function BlockPanel({
  children,
  className = '',
  accent,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  return (
    <div
      className={`voxel-panel text-[#FAF7F0] ${className}`}
      style={accent ? { borderTopColor: accent, borderTopWidth: 4, ...rest.style } : rest.style}
      {...rest}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ BlockButton

export type BlockButtonVariant = 'primary' | 'secondary' | 'danger' | 'gold';

export function BlockButton({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  onClick,
  silent,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BlockButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Pas de son de clic (le parent en joue déjà un). */
  silent?: boolean;
}) {
  const pad = size === 'lg' ? 'px-7 py-3.5 text-lg min-h-[52px]' : size === 'sm' ? 'px-3 py-2 text-xs min-h-[44px] sm:min-h-[36px]' : 'px-5 py-2.5 text-sm min-h-[44px]';
  return (
    <button
      type="button"
      className={`voxel-btn block-btn-${variant} cursor-pointer font-display font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap ${pad} ${className}`}
      onClick={(e) => {
        if (!silent) soundFx.playUiClick();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ ElementBadge

export function ElementBadge({ element, compact = false }: { element: ElementType; compact?: boolean }) {
  const meta = ELEMENT_META[element];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-[4px] border-2 bg-[#141925] px-1.5 py-0.5 text-[11px] font-bold text-[#FAF7F0]"
      style={{ borderColor: meta.color }}
    >
      <ElementIcon element={element} size={14} />
      {!compact && meta.label}
    </span>
  );
}

// ------------------------------------------------------------------ AnimatedBar

/**
 * Barre animée (PV, XP, Confiance). Un gain est montré en surbrillance avant d'être absorbé.
 * `levelUps` : chaque incrément fait déborder la barre, flasher, puis repartir de zéro.
 */
export function AnimatedBar({
  value,
  max,
  color = UI_TOKENS.color.success,
  levelUps = 0,
  label,
  height = 10,
}: {
  value: number;
  max: number;
  color?: string;
  levelUps?: number;
  label?: string;
  height?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const prev = useRef(ratio);
  const [ghost, setGhost] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const lastLevel = useRef(levelUps);
  useEffect(() => {
    if (levelUps > lastLevel.current) {
      lastLevel.current = levelUps;
      setFlash((n) => n + 1);
    }
  }, [levelUps]);
  useEffect(() => {
    if (ratio > prev.current) setGhost(prev.current);
    prev.current = ratio;
    const id = window.setTimeout(() => setGhost(null), reduced ? 0 : UI_TOKENS.duration.slow * 2);
    return () => window.clearTimeout(id);
  }, [ratio, reduced]);
  return (
    <div
      className="relative w-full overflow-hidden rounded-[3px] border-2 border-[#0B0F18] bg-[#0E131D]"
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
    >
      {ghost !== null && (
        <div className="absolute inset-y-0 left-0 bg-[#FFF3C4]" style={{ width: `${ratio * 100}%` }} />
      )}
      <motion.div
        key={flash}
        className="absolute inset-y-0 left-0"
        style={{ backgroundColor: color }}
        initial={flash > 0 && !reduced ? { width: '100%', filter: 'brightness(2)' } : false}
        animate={{ width: `${(ghost ?? ratio) * 100}%`, filter: 'brightness(1)' }}
        transition={{ duration: reduced ? 0 : UI_TOKENS.duration.slow / 1000, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/20 pointer-events-none" />
    </div>
  );
}

// ------------------------------------------------------------------ CountUp

/** Chiffre qui défile jusqu'à sa valeur (instantané avec prefers-reduced-motion). */
export function CountUp({
  value,
  duration = UI_TOKENS.duration.slow * 2,
  format = (n: number) => Math.round(n).toLocaleString('fr-FR'),
  from = 0,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  from?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? value : from);
  const start = useRef(from);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const begin = performance.now();
    const origin = start.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - begin) / duration));
      const eased = 1 - (1 - t) ** 3;
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
      else start.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);
  return <span className="font-mono-num">{format(shown)}</span>;
}

// ------------------------------------------------------------------ Tabs

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`voxel-btn cursor-pointer min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-bold ${active ? 'block-btn-gold' : 'block-btn-secondary'}`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              e.preventDefault();
              const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
              onChange(tabs[next].id);
              refs.current[next]?.focus();
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Toast

export function Toast({ message, onDone, duration = 2600 }: { message: string | null; onDone: () => void; duration?: number }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(id);
  }, [message, duration, onDone]);
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none" role="status" aria-live="polite">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="voxel-panel px-4 py-2.5 text-sm font-semibold"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------ Modal

/** Fenêtre en bloc qui entre en rebond ; Échap ferme, le premier bouton reçoit le focus. */
export function Modal({
  open,
  title,
  onClose,
  children,
  accent,
  className = '',
}: {
  open: boolean;
  title: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  const titleId = useId();
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: UI_TOKENS.duration.normal / 1000 }}
        >
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-no-pop
            initial={{ y: 28, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`voxel-panel w-full max-w-md p-5 sm:p-6 text-[#FAF7F0] ${className}`}
            style={accent ? { borderTopColor: accent, borderTopWidth: 4 } : undefined}
          >
            <h2 id={titleId} className="font-display text-xl sm:text-2xl font-bold">
              {title}
            </h2>
            <div className="mt-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------ CreatureCard

export function CreatureCard({
  speciesId,
  name,
  level,
  element,
  hp,
  maxHp,
  xp,
  xpMax,
  selected = false,
  badge,
  onClick,
}: {
  speciesId: string;
  name: string;
  level: number;
  element: ElementType;
  hp?: number;
  maxHp?: number;
  xp?: number;
  xpMax?: number;
  selected?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
}) {
  const color = ELEMENT_META[element].color;
  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-[4px] border-2 bg-[#141925] p-1" style={{ borderColor: color }}>
          <VoxelCreatureAvatar speciesId={speciesId} size={44} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-base truncate">{name}</span>
            <span className="font-mono-num text-xs text-[#B8C2D1] shrink-0">{FR.ui.components.niv(level)}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <ElementBadge element={element} />
            {badge}
          </div>
        </div>
      </div>
      {maxHp !== undefined && hp !== undefined && (
        <div className="mt-2.5">
          <AnimatedBar value={hp} max={maxHp} label={FR.ui.components.pv} />
        </div>
      )}
      {xpMax !== undefined && xp !== undefined && (
        <div className="mt-1.5">
          <AnimatedBar value={xp} max={xpMax} color={UI_TOKENS.color.accent} height={6} label={FR.ui.components.xp} />
        </div>
      )}
    </>
  );
  const cls = `voxel-panel block w-full p-3 text-[#FAF7F0] ${selected ? 'outline outline-2 outline-[#F4B942]' : ''}`;
  const style = { borderLeftColor: color, borderLeftWidth: 5 };
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} voxel-btn cursor-pointer`} style={style}>
      {body}
    </button>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

/** Pastille « Nouveau » (pulsation douce). */
export function NewBadge() {
  return (
    <span className="ui-new-badge inline-block rounded-[4px] bg-[#F4B942] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1A0E08]">
      {FR.ui.components.nouveau}
    </span>
  );
}

/** Apparition en cascade : 30 ms d'écart, 12 éléments animés au plus (les suivants apparaissent d'un coup). */
export function cascade(index: number): { initial: object; animate: object; transition: object } {
  const animated = index < 12;
  return {
    initial: animated ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: animated ? index * 0.03 : 0, duration: UI_TOKENS.duration.normal / 1000, ease: [0.16, 1, 0.3, 1] },
  };
}
