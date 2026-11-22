import React from 'react';
import { motion } from 'motion/react';
import { INGREDIENTS, RUNES, POT_TIER_META } from '../game/catalog';
import { computeVictoryStars } from '../game/rules';
import type { ExpeditionOutcome } from '../game/types';
import { StoneIcon } from './Icons';
import { FR } from '../i18n/fr';
import { BlockButton, CountUp } from './ui';
import { LevelUpBurst, StarRain, UnlockReveal, VoxelConfetti } from './ui/moments';

interface OutcomeModalProps {
  outcome: ExpeditionOutcome;
  hasNextStage: boolean;
  onNextStage: () => void;
  onRetry: () => void;
  onReturnCamp: () => void;
}

const STAR_LABELS = [FR.ui.outcomeModal.victoire, FR.ui.outcomeModal.t2Eclats, FR.ui.outcomeModal.ultimeOuEsquiveParfaite];

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

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {outcome.victory && <VoxelConfetti count={34} />}

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outcome-modal-title"
        data-no-pop="true"
        className={`voxel-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto cubi-scroll p-5 sm:p-6 text-[#FAF7F0] ${
          outcome.victory ? 'outcome-victory-glow' : ''
        }`}
        initial={{ opacity: 0, y: 28, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <div className="text-center">
          <p
            className={`text-xs font-bold uppercase tracking-widest ${
              outcome.victory ? 'text-[#F4B942]' : 'text-[#B8C2D1]'
            }`}
          >
            {outcome.biomeName} · {outcome.stageName}
          </p>

          {/* Étoiles qui tombent une à une, chacune sur une note plus haute */}
          {outcome.victory && <StarRain stars={stars} labels={STAR_LABELS} />}

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
            /* Défaite : écran calme, ce qui a manqué en gros */
            <div className="mt-3">
              {outcome.wavesCleared >= outcome.totalWaves - 1 && outcome.bossHpPercentRemaining > 0 ? (
                <>
                  <p className="text-xs uppercase tracking-widest text-[#B8C2D1]">{FR.ui.moments.ceQuiAManque}</p>
                  <p className="font-display text-5xl font-extrabold text-[#FAF7F0]">
                    <CountUp value={outcome.bossHpPercentRemaining} format={(n) => `${Math.round(n)} %`} />
                  </p>
                </>
              ) : (
                <p className="font-display text-2xl font-extrabold text-[#FAF7F0]">
                  {FR.ui.moments.vaguesTenues(outcome.wavesCleared, outcome.totalWaves)}
                </p>
              )}
              <p className="mt-2 text-sm text-[#B8C2D1]">
                {outcome.bossHpPercentRemaining > 0 && outcome.bossHpPercentRemaining <= 35
                  ? FR.ui.outcomeModal.siPresDuButGardezLEsquive
                  : FR.ui.outcomeModal.renforcezVosPierresDePouvoirOu}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">{FR.ui.moments.calme}</p>
            </div>
          )}
        </div>

        <motion.div variants={listVariants} initial="hidden" animate="show">
          {/* 3 Tabular Stat Tiles */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <motion.div
              variants={itemVariants}
              className="voxel-panel p-3 text-center"
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
              className="voxel-panel p-3 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">{FR.ui.outcomeModal.degats}</p>
              <p className="mt-1 font-mono-num text-lg font-bold text-[#F4B942]">
                <CountUp value={outcome.damageDealt} />
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="voxel-panel p-3 text-center"
            >
              <p className="text-[11px] uppercase tracking-wider text-[#B8C2D1]">
                {outcome.victory ? FR.ui.outcomeModal.xpUnite : FR.ui.outcomeModal.pvBoss}
              </p>
              <p className="mt-1 font-mono-num text-lg font-bold text-[#2FB97A]">
                {outcome.victory ? <CountUp value={outcome.xpPerUnit} format={(n) => `+${Math.round(n)}`} /> : `${outcome.bossHpPercentRemaining}%`}
              </p>
            </motion.div>
          </div>

          {/* V0.2 Tactical Highlights */}
          <motion.div
            variants={itemVariants}
            className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono-num text-[#B8C2D1]"
          >
            <span>
              {FR.ui.outcomeModal.eclats}<strong className="text-[#38BDF8]">{outcome.burstsTriggered}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.trios}<strong className="text-[#F4B942]">{outcome.triosTriggered}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.esquivesParfaites}<strong className="text-[#38BDF8]">{outcome.perfectDodges}</strong>
            </span>
            <span>
              {FR.ui.outcomeModal.dechainements}<strong className="text-[#2FB97A]">{outcome.ultimatesUsed}</strong>
            </span>
          </motion.div>

          {/* Déblocage : le chemin se trace jusqu'au nouveau lieu */}
          {(outcome.unlockedBiomeName || outcome.unlockedNextStageName) && (
            <motion.div variants={itemVariants} className="mt-3 voxel-panel px-4 py-2.5 flex justify-center">
              <UnlockReveal
                placeName={(outcome.unlockedBiomeName ?? outcome.unlockedNextStageName) as string}
                isBiome={Boolean(outcome.unlockedBiomeName)}
              />
            </motion.div>
          )}

          {/* Montées de niveau : la carte saute, le niveau défile */}
          {outcome.levelUps.length > 0 && (
            <motion.div variants={itemVariants} className="mt-3 flex flex-wrap justify-center gap-2">
              {outcome.levelUps.map((lv, i) => (
                <LevelUpBurst key={`${lv.speciesId}-${i}`} speciesId={lv.speciesId} from={lv.from} to={lv.to} delay={0.6 + i * 0.15} />
              ))}
            </motion.div>
          )}

          {/* Loot & Progression Summary */}
          <motion.div
            variants={itemVariants}
            className="mt-3.5 voxel-panel p-3.5 space-y-2.5 text-sm"
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

            {(outcome.droppedStone || outcome.droppedRune) && (
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
                {outcome.droppedRune && (
                  <div
                    className="text-xs font-semibold"
                    style={{ color: RUNES[outcome.droppedRune].color }}
                  >
                    +1 {RUNES[outcome.droppedRune].name}
                  </div>
                )}
              </div>
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

          </motion.div>

          {/* Actions : « Suivant » (ou « Réessayer ») mis en avant */}
          <motion.div variants={itemVariants} className="mt-5 flex flex-wrap-reverse gap-2.5 justify-end">
            <BlockButton variant="secondary" onClick={onReturnCamp} silent>
              {FR.ui.outcomeModal.retourAuCamp}
            </BlockButton>
            {outcome.victory && hasNextStage ? (
              <BlockButton variant="primary" size="lg" data-start="true" onClick={onNextStage} silent>
                {FR.ui.outcomeModal.niveauSuivant}
              </BlockButton>
            ) : (
              <BlockButton variant="primary" size="lg" data-start="true" onClick={onRetry} silent>
                {outcome.victory ? FR.ui.outcomeModal.rejouerLeNiveau : FR.ui.outcomeModal.reessayer}
              </BlockButton>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
