import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ELEMENT_META, MOVES, SPECIES } from '../game/catalog';
import { ElementIcon } from './Icons';
import { FR } from '../i18n/fr';
import { EvolutionBeforeAfter } from './ui/moments';

interface EvolutionOverlayProps {
  fromSpeciesId: string;
  toSpeciesId: string;
  /** false pendant la charge, true une fois la nouvelle forme apparue dans la scène 3D. */
  revealed: boolean;
}

/**
 * Habillage 2D de l'animation d'évolution (la créature elle-même est animée par VoxelEngine).
 * Couvre l'écran pour bloquer les clics pendant les ~4 secondes de la séquence.
 */
export function EvolutionOverlay({ fromSpeciesId, toSpeciesId, revealed }: EvolutionOverlayProps) {
  const from = SPECIES[fromSpeciesId];
  const to = SPECIES[toSpeciesId];
  if (!from || !to) return null;
  const newMove = to.moveId !== from.moveId ? MOVES[to.moveId] : null;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex flex-col justify-between evolution-vignette"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="h-[12vh] bg-[#0B0F18]"
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />

      <div className="flex-1 flex flex-col items-center justify-start pt-[4vh] px-4 text-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="charging"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F4B942]">
                {FR.ui.evolutionOverlay.metamorphose}
              </p>
              <motion.p
                className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#FAF7F0] hud-text-stroke"
                animate={{ opacity: [1, 0.55, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                {from.name}{FR.ui.evolutionOverlay.rayonneDUneLumiereEtrange}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14 }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#F4B942]">
                {FR.ui.evolutionOverlay.evolutionReussie}
              </p>
              <p className="mt-1 font-display text-3xl sm:text-4xl font-extrabold text-[#FAF7F0] hud-text-stroke">
                {from.name}{FR.ui.evolutionOverlay.devient}{' '}
                <span style={{ color: ELEMENT_META[to.element].color }}>{to.name}</span> !
              </p>
              <motion.div
                className="mt-2 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-1.5 rounded-lg bg-[#141A26]/90 border border-[#39445A] text-xs text-[#CBD5E1]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <span className="inline-flex items-center gap-1">
                  <ElementIcon element={to.element} size={14} /> {ELEMENT_META[to.element].label}
                </span>
                <span className="font-mono-num text-[#2FB97A]">{FR.ui.evolutionOverlay.pv}{to.baseHp - from.baseHp}</span>
                <span className="font-mono-num text-[#F4B942]">{FR.ui.evolutionOverlay.atq}{to.baseAtk - from.baseAtk}</span>
                {newMove && (
                  <span>
                    {FR.ui.evolutionOverlay.nouveauSort}<strong className="text-[#FAF7F0]">{newMove.name}</strong>
                  </span>
                )}
              </motion.div>
              {/* Seconde finale : les deux formes côte à côte */}
              <div className="mt-4">
                <EvolutionBeforeAfter fromSpeciesId={fromSpeciesId} toSpeciesId={toSpeciesId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className="h-[12vh] bg-[#0B0F18]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </motion.div>
  );
}
