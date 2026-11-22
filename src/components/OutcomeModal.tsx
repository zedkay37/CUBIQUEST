import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { INGREDIENTS, MOVE_STONES, POT_TIER_META } from '../game/catalog';
import { computeVictoryStars } from '../game/rules';
import type { ExpeditionOutcome } from '../game/types';
import { StoneIcon } from './Icons';
import { FR } from '../i18n/fr';

interface OutcomeModalProps {
  outcome: ExpeditionOutcome;
  hasNextStage: boolean;
  onNextStage: () => void;
  onRetry: () => void;
  onReturnCamp: () => void;
}

const CONFETTI_COLORS = ['#F4B942', '#E85D3F', '#2FB97A', '#38BDF8', '#C084FC', '#FAF7F0'];
const STAR_LABELS = [FR.ui.outcomeModal.victoire, FR.ui.outcomeModal.t2ReactionsElementaires, FR.ui.outcomeModal.ultimeOuEsquiveParfaite];

/** Compteur qui grimpe jusqu'à sa valeur (ease-out) pour donner du poids aux chiffres. */
function useCountUp(target: number, delayMs = 0, durationMs = 850): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs, durationMs]);
  return value;
}

/** Pluie de confettis en CSS pur (aucun coût côté moteur 3D). */
function ConfettiLayer() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: ((i * 53) % 24) / 10,
        duration: 2.6 + ((i * 29) % 18) / 10,
        size: 7 + ((i * 17) % 7),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        drift: ((i * 41) % 90) - 45,
      })),
    [],
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
              height: p.size * 0.6,
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

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 26 } },
};

export function OutcomeModal({
  outcome,
  hasNextStage,
  onNextStage,
  onRetry,
  onReturnCamp,
}: OutcomeModalProps) {
  const mins = Math.floor(outcome.clearTimeSec / 60);
  const secs = Math.floor(outcome.clearTimeSec % 60);
  const stars = computeVictoryStars(outcome);
  const damageShown = useCountUp(outcome.damageDealt, 350);
  const xpShown = useCountUp(outcome.xpPerUnit, 450);

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {outcome.victory && <ConfettiLayer />}

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-modal-title"
        data-no-pop="true"
        className={`voxel-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto cubi-scroll rounded-2xl p-6 text-[#FAF7F0] ${
          outcome.victory ? 'outcome-victory-glow' : ''
        }`}
        initial={{ opacity: 0, y: 28, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <div className="text-center">
          <p
            className={`text-xs font-bold uppercase tracking-widest ${
              outcome.victory ? 'text-[#F4B942]' : 'text-[#E85D3F]'
            }`}
          >
            {outcome.biomeName} · {outcome.stageName}
          </p>

          {outcome.victory && (
            <div
              className="mt-2 flex items-end justify-center gap-2"
              role="img"
              aria-label={FR.ui.outcomeModal.etoileSur3(stars, stars > 1 ? 's' : '')}
            >
              {[0, 1, 2].map((i) => {
                const earned = i < stars;
                return (
                  <motion.span
                    key={i}
                    title={STAR_LABELS[i]}
                    initial={{ scale: 0, rotate: -50, opacity: 0 }}
                    animate={{ scale: earned ? 1 : 0.8, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 13, delay: 0.3 + i * 0.22 }}
                    className={i === 1 ? '-translate-y-1.5' : ''}
                  >
                    <Star
                      className={i === 1 ? 'w-11 h-11' : 'w-9 h-9'}
                      fill={earned ? '#F4B942' : 'transparent'}
                      stroke={earned ? '#141925' : '#475569'}
                      strokeWidth={1.6}
                    />
                  </motion.span>
                );
              })}
            </div>
          )}

          <motion.h2
            id="outcome-modal-title"
            className={`mt-1 font-display text-3xl font-extrabold ${
              outcome.victory ? 'outcome-title-shine' : ''
            }`}
            initial={{ opacity: 0, scale: outcome.victory ? 1.25 : 1, y: outcome.victory ? 0 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.12 }}
          >
            {outcome.victory ? FR.ui.outcomeModal.expeditionReussie : FR.ui.outcomeModal.escouadeVaincue}
          </motion.h2>

          {outcome.victory ? (
            <p className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-[#94A3B8]">
              {STAR_LABELS.map((label, i) => (
                <span key={label} className={i < stars ? 'text-[#F4B942] font-semibold' : ''}>
                  ★ {label}
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[#B8C2D1]">
              {outcome.bossHpPercentRemaining > 0 && outcome.bossHpPercentRemaining <= 35
                ? FR.ui.outcomeModal.siPresDuButGardezDispersion
                : FR.ui.outcomeModal.renforcezVosPierresDePouvoirOu}
            </p>
          )}
        </div>

        <motion.div variants={listVariants} initial="hidden" animate="show">
          {/* 3 Tabular Stat Tiles */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <motion.div
              variants={itemVariants}
              className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">
                {outcome.victory ? FR.ui.outcomeModal.temps : FR.ui.outcomeModal.vagues}
              </p>
              <p className="mt-1 font-mono-num text-lg font-bold text-[#FAF7F0]">
                {outcome.victory
                  ? `${mins}:${secs.toString().padStart(2, '0')}`
                  : `${outcome.wavesCleared}/${outcome.totalWaves}`}
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.outcomeModal.degats}</p>
              <p className="mt-1 font-mono-num text-lg font-bold text-[#F4B942]">
                {damageShown.toLocaleString('fr-FR')}
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="rounded-xl bg-[#222A3A] border border-[#39445A] p-3 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">
                {outcome.victory ? FR.ui.outcomeModal.xpUnite : FR.ui.outcomeModal.pvBoss}
              </p>
              <p className="mt-1 font-mono-num text-lg font-bold text-[#2FB97A]">
                {outcome.victory ? `+${xpShown}` : `${outcome.bossHpPercentRemaining}%`}
              </p>
            </motion.div>
          </div>

          {/* V0.2 Tactical Highlights */}
          <motion.div
            variants={itemVariants}
            className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono-num text-[#B8C2D1]"
          >
            <span>
              {FR.ui.outcomeModal.reactions}<strong className="text-[#F4B942]">{outcome.reactionsTriggered}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.ultimes}<strong className="text-[#F4B942]">{outcome.ultimatesUsed}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.esquivesParfaites}<strong className="text-[#38BDF8]">{outcome.perfectDodges}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.comboMax}<strong className="text-[#2FB97A]">×{outcome.maxCombo}</strong>
            </span>
          </motion.div>

          {outcome.unlockedBiomeName && (
            <motion.div
              variants={itemVariants}
              className="mt-3 rounded-xl border-2 border-[#F4B942] bg-[#F4B942]/12 px-4 py-2.5 text-center outcome-unlock-pulse"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F4B942]">
                {FR.ui.outcomeModal.nouveauBiomeDecouvert}
              </p>
              <p className="font-display text-xl font-extrabold text-[#FAF7F0]">
                {outcome.unlockedBiomeName}
              </p>
            </motion.div>
          )}

          {/* Loot & Progression Summary */}
          <motion.div
            variants={itemVariants}
            className="mt-3.5 rounded-xl bg-[#141A26] border border-[#39445A] p-3.5 space-y-2.5 text-sm"
          >
            {outcome.droppedIngredients.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-1.5">
                  {FR.ui.outcomeModal.ingredientsRecoltes}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {outcome.droppedIngredients.map((item, i) => {
                    const ing = INGREDIENTS[item.id];
                    if (!ing) return null;
                    return (
                      <motion.span
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.75 + i * 0.08 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#222A3A] border border-[#39445A]"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-xs inline-block"
                          style={{ backgroundColor: ing.hex }}
                        />
                        <span>{ing.name}</span>
                        <strong className="font-mono-num text-[#F4B942]">×{item.count}</strong>
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            )}

            {(outcome.droppedStone || outcome.droppedMoveStone) && (
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#273145]">
                {outcome.droppedStone && (
                  <div className="flex items-center gap-2 text-xs">
                    <StoneIcon kind={outcome.droppedStone.kind} size={20} />
                    <span>
                      {FR.ui.outcomeModal.pierre}{outcome.droppedStone.kind === 'atk' ? FR.ui.outcomeModal.atq : FR.ui.outcomeModal.pv}{' '}
                      <strong className="font-mono-num text-[#F4B942]">
                        +{outcome.droppedStone.power}
                      </strong>{' '}
                      ({outcome.droppedStone.rarity})
                    </span>
                  </div>
                )}
                {outcome.droppedMoveStone && (
                  <div
                    className="text-xs font-semibold"
                    style={{ color: MOVE_STONES[outcome.droppedMoveStone].color }}
                  >
                    +1 {MOVE_STONES[outcome.droppedMoveStone].name}
                  </div>
                )}
              </div>
            )}

            {outcome.leveledUpNames.length > 0 && (
              <p className="text-xs text-[#2FB97A] font-semibold pt-1 border-t border-[#273145]">
                {FR.ui.outcomeModal.monteeDeNiveau}{outcome.leveledUpNames.join(' · ')}
              </p>
            )}

            {outcome.potReadyNow && (
              <p className="text-xs text-[#F4B942] font-bold pt-1 border-t border-[#273145]">
                {FR.ui.outcomeModal.votrePlatDansLaMarmiteEst}
              </p>
            )}

            {outcome.unlockedPotTier && (
              <p className="text-xs text-[#38BDF8] font-bold pt-1 border-t border-[#273145]">
                {FR.ui.outcomeModal.nouveauChaudronDebloque}{POT_TIER_META[outcome.unlockedPotTier].label} !
              </p>
            )}

            {outcome.unlockedNextStageName && (
              <p className="text-xs text-[#FAF7F0] pt-1 border-t border-[#273145]">
                {FR.ui.outcomeModal.nouveauNiveauOuvert}<strong>{outcome.unlockedNextStageName}</strong>
              </p>
            )}
          </motion.div>

          {/* Actions */}
          <motion.div variants={itemVariants} className="mt-5 flex flex-wrap gap-2.5 justify-end">
            <button
              type="button"
              onClick={onReturnCamp}
              className="voxel-btn cursor-pointer px-4 py-2.5 rounded-xl bg-[#222A3A] hover:bg-[#2C364A] text-[#FAF7F0] font-semibold text-sm border-2 border-[#39445A] whitespace-nowrap shrink-0"
            >
              {FR.ui.outcomeModal.retourAuCamp}
            </button>

            {outcome.victory && hasNextStage ? (
              <button
                type="button"
                data-start="true"
                onClick={onNextStage}
                className="voxel-btn cursor-pointer px-6 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] whitespace-nowrap shrink-0"
              >
                {FR.ui.outcomeModal.niveauSuivant}
              </button>
            ) : (
              <button
                type="button"
                data-start="true"
                onClick={onRetry}
                className="voxel-btn cursor-pointer px-6 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] whitespace-nowrap shrink-0"
              >
                {outcome.victory ? FR.ui.outcomeModal.rejouerLeNiveau : FR.ui.outcomeModal.reessayer}
              </button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
