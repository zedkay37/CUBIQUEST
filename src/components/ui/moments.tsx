/**
 * Moments forts de l'interface (sprint UI, section 3) : composants réutilisables qu'on peut passer
 * d'un clic ou d'une touche. Chaque moment a sa démonstration dans `?gallery=ui`.
 * Aucun n'est lié à la boucle de jeu ; tous deviennent un simple fondu avec prefers-reduced-motion.
 */
import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { soundFx } from '../../game/audio';
import { ELEMENT_META, SPECIES } from '../../game/catalog';
import { VoxelCreatureAvatar } from '../Icons';
import { FR } from '../../i18n/fr';
import { CountUp, ElementBadge, usePrefersReducedMotion } from './index';

/** Ferme le moment au premier clic ou à la première touche (et au bout de `autoMs`). */
function useSkippable(onDone: () => void, autoMs: number): void {
  useEffect(() => {
    const done = () => onDone();
    const id = window.setTimeout(done, autoMs);
    window.addEventListener('keydown', done, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', done);
    };
  }, [onDone, autoMs]);
}

const CONFETTI = ['#F4B942', '#E85D3F', '#2FB97A', '#38BDF8', '#C084FC', '#FAF7F0'];

/** Confettis voxel en CSS pur (aucun coût côté moteur 3D). */
export function VoxelConfetti({ count = 30 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: ((i * 53) % 24) / 10,
        duration: 2.4 + ((i * 29) % 18) / 10,
        size: 7 + ((i * 17) % 6),
        color: CONFETTI[i % CONFETTI.length],
        drift: ((i * 41) % 90) - 45,
      })),
    [count],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--confetti-drift': `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ 1. Arrivée d'une créature

/**
 * Arrivée d'une créature (~4 s) : assombrissement, faisceau de la couleur de l'élément, la créature tombe,
 * rebondit et regarde le joueur, son nom s'écrit en grand avec son badge et sa petite phrase, confettis.
 * Créature jamais vue : bandeau « Nouvelle créature ! » et ajout au Carnet.
 */
export function ArrivalScene({ speciesId, isNew, onDone }: { speciesId: string; isNew: boolean; onDone: () => void }) {
  const species = SPECIES[speciesId];
  const reduced = usePrefersReducedMotion();
  useSkippable(onDone, 4200);
  useEffect(() => {
    soundFx.playVictory();
  }, []);
  if (!species) return null;
  const color = ELEMENT_META[species.element].color;
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#05070C]/85 cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onDone}
      role="dialog"
      aria-modal="true"
      aria-label={FR.ui.moments.arrivee(species.name)}
    >
      {/* faisceau de lumière de la couleur de l'élément */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[220px] pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${color}00 0%, ${color}66 55%, ${color}AA 100%)`, filter: 'blur(2px)' }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.5, delay: 0.2 }}
      />
      {!reduced && <VoxelConfetti count={28} />}
      <div className="relative flex flex-col items-center text-center px-6">
        {isNew && (
          <motion.p
            className="mb-3 rounded-[4px] bg-[#F4B942] px-3 py-1 font-display text-sm font-extrabold uppercase tracking-widest text-[#1A0E08]"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            {FR.ui.moments.nouvelleCreature}
          </motion.p>
        )}
        {/* la créature tombe, rebondit, puis regarde le joueur */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { y: -420, rotate: -12 }}
          animate={reduced ? { opacity: 1 } : { y: [-420, 0, -36, 0], rotate: [-12, 0, 4, 0], scale: [1, 1, 1.06, 1] }}
          transition={{ duration: reduced ? 0.3 : 1.1, delay: 0.55, times: [0, 0.55, 0.78, 1], ease: 'easeOut' }}
          className="rounded-[6px] border-4 bg-[#141925] p-3"
          style={{ borderColor: color, boxShadow: `0 0 48px ${color}88, 0 8px 0 rgba(0,0,0,0.6)` }}
        >
          <VoxelCreatureAvatar speciesId={speciesId} size={132} />
        </motion.div>
        <motion.h2
          className="mt-5 font-display text-4xl sm:text-5xl font-extrabold text-[#FAF7F0] hud-text-stroke"
          initial={{ opacity: 0, letterSpacing: '0.4em' }}
          animate={{ opacity: 1, letterSpacing: '0em' }}
          transition={{ delay: 1.4, duration: reduced ? 0 : 0.5 }}
        >
          {species.name}
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="mt-2 flex flex-col items-center gap-2">
          <ElementBadge element={species.element} />
          <p className="max-w-md text-sm text-[#B8C2D1]">{species.dexNote}</p>
          {isNew && <p className="text-xs font-semibold text-[#2FB97A]">{FR.ui.moments.ajouteeAuCarnet}</p>}
        </motion.div>
        <p className="mt-6 text-[11px] text-[#94A3B8]">{FR.ui.moments.toucheOuClic}</p>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ 2. Évolution : avant, après

/** Seconde finale de l'évolution : les deux formes côte à côte. */
export function EvolutionBeforeAfter({ fromSpeciesId, toSpeciesId }: { fromSpeciesId: string; toSpeciesId: string }) {
  const from = SPECIES[fromSpeciesId];
  const to = SPECIES[toSpeciesId];
  if (!from || !to) return null;
  const color = ELEMENT_META[to.element].color;
  return (
    <motion.div
      className="voxel-panel inline-flex items-center gap-4 px-5 py-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      aria-label={FR.ui.moments.avantApres(from.name, to.name)}
    >
      <div className="flex flex-col items-center opacity-70">
        <VoxelCreatureAvatar speciesId={fromSpeciesId} size={56} />
        <span className="mt-1 text-xs text-[#B8C2D1]">{from.name}</span>
      </div>
      <span className="font-display text-2xl font-extrabold" style={{ color }} aria-hidden="true">
        →
      </span>
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.7 }}
        animate={{ scale: [0.7, 1.12, 1] }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <VoxelCreatureAvatar speciesId={toSpeciesId} size={72} />
        <span className="mt-1 text-sm font-bold text-[#FAF7F0]">{to.name}</span>
      </motion.div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ 3. Montée de niveau

/** La carte de la créature saute, « Niv. 12 → 13 » défile, éclat doré. */
export function LevelUpBurst({ speciesId, from, to, delay = 0 }: { speciesId: string; from: number; to: number; delay?: number }) {
  const species = SPECIES[speciesId];
  if (!species) return null;
  return (
    <motion.div
      className="voxel-panel relative flex items-center gap-2.5 px-3 py-2"
      style={{ borderLeftColor: ELEMENT_META[species.element].color, borderLeftWidth: 5 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: [0, -10, 0], opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <motion.span
        className="absolute inset-0 rounded-[6px] pointer-events-none"
        style={{ boxShadow: '0 0 0 2px #F4B942, 0 0 24px #F4B94299' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.9, delay: delay + 0.15 }}
        aria-hidden="true"
      />
      <VoxelCreatureAvatar speciesId={speciesId} size={34} />
      <div className="text-left">
        <p className="text-xs font-bold text-[#FAF7F0]">{species.name}</p>
        <p className="font-mono-num text-xs text-[#F4B942]">
          {FR.ui.moments.nivDe(from)} <CountUp from={from} value={to} duration={700} />
        </p>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ 4. Étoiles de victoire

/** Les étoiles tombent une à une, chacune avec une note plus haute. */
export function StarRain({ earned, previous = [false, false, false], labels }: { earned: boolean[]; previous?: boolean[]; labels: string[] }) {
  const reduced = usePrefersReducedMotion();
  // seules les étoiles nouvelles tombent et sonnent ; celles déjà acquises sont pleines et grisées
  const fresh = earned.map((e, i) => e && !previous[i]);
  const total = earned.filter((e, i) => e || previous[i]).length;
  useEffect(() => {
    let k = 0;
    const ids = fresh.map((f, i) => (f ? window.setTimeout(() => soundFx.playStar(k++), 350 + i * 320) : 0)).filter(Boolean);
    return () => ids.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="mt-2 flex items-end justify-center gap-2" role="img" aria-label={FR.ui.outcomeModal.etoileSur3(total, total > 1 ? 's' : '')}>
      {[0, 1, 2].map((i) => {
        const isFresh = fresh[i];
        const owned = earned[i] || previous[i];
        return (
          <motion.span
            key={i}
            title={labels[i]}
            initial={reduced || !isFresh ? { opacity: 0 } : { y: -90, opacity: 0, rotate: -30 }}
            animate={{ y: 0, opacity: owned && !isFresh ? 0.55 : 1, rotate: 0, scale: owned ? 1 : 0.8 }}
            transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 14, delay: 0.3 + i * 0.32 }}
            className={i === 1 ? '-translate-y-1.5' : ''}
          >
            <Star className={i === 1 ? 'w-12 h-12' : 'w-10 h-10'} fill={isFresh ? '#F4B942' : owned ? '#9CA3AF' : 'transparent'} stroke={owned ? '#141925' : '#475569'} strokeWidth={1.6} />
          </motion.span>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ 6. Déblocage

/** Le chemin se trace jusqu'au nouveau lieu, qui s'illumine. */
export function UnlockReveal({ placeName, isBiome }: { placeName: string; isBiome: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="flex items-center gap-3" aria-label={FR.ui.moments.deblocage(placeName)}>
      <svg width="120" height="40" viewBox="0 0 120 40" aria-hidden="true">
        <circle cx="10" cy="28" r="7" fill="#2FB97A" stroke="#141925" strokeWidth="3" />
        <motion.path
          d="M 17 28 C 45 28, 55 10, 103 12"
          fill="none"
          stroke="#F4B942"
          strokeWidth="4"
          strokeDasharray="1 0"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : 0.9, delay: 0.4 }}
        />
        <motion.rect
          x="100"
          y="3"
          width="18"
          height="18"
          rx="3"
          fill="#F4B942"
          stroke="#141925"
          strokeWidth="3"
          initial={{ opacity: 0.25, scale: 0.6 }}
          animate={{ opacity: 1, scale: [0.6, 1.25, 1] }}
          transition={{ duration: 0.5, delay: reduced ? 0 : 1.25 }}
          style={{ transformOrigin: '109px 12px' }}
        />
      </svg>
      <div className="text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F4B942]">
          {isBiome ? FR.ui.outcomeModal.nouveauBiomeDecouvert : FR.ui.moments.nouveauNiveau}
        </p>
        <p className="font-display text-lg font-extrabold text-[#FAF7F0]">{placeName}</p>
      </div>
    </div>
  );
}
