import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pause, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { ELEMENT_META, STATUS_META } from '../game/catalog';
import type { ControlMode, ExpeditionHudSnapshot } from '../game/types';
import { ElementIcon, DodgeIcon, VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';

interface ExpeditionHudProps {
  hud: ExpeditionHudSnapshot;
  muted: boolean;
  onCastSkill: (index: number) => void;
  onDodge: () => void;
  onUltimate: () => void;
  onToggleControlMode: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

const CONTROL_LABELS: Record<ControlMode, string> = {
  semi: FR.ui.expeditionHud.semiAutoE,
  auto: FR.ui.expeditionHud.autoTotalE,
  manual: FR.ui.expeditionHud.manuelE,
};

export function ExpeditionHud({
  hud,
  muted,
  onCastSkill,
  onDodge,
  onUltimate,
  onToggleControlMode,
  onToggleMute,
  onPause,
}: ExpeditionHudProps) {
  const dodgeReady = hud.dodgeCooldown <= 0.05;
  const dodgeRatio = Math.max(
    0,
    Math.min(1, 1 - hud.dodgeCooldown / Math.max(0.1, hud.dodgeMaxCooldown)),
  );
  const ultimateReady = hud.ultimateCharge >= 100;
  const ultimateRatio = Math.max(0, Math.min(1, hud.ultimateCharge / 100));

  const mins = Math.floor(hud.elapsedSec / 60);
  const secs = Math.floor(hud.elapsedSec % 60);
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4 ui-screen-enter">
      {/* Top Perimeter Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Wave & Stage Telemetry */}
        <div className="flex flex-col gap-2 max-w-[65%]">
          <div className="voxel-panel rounded-xl px-3.5 py-2 flex items-center gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-[#B8C2D1] uppercase leading-none">
                {hud.biomeName}
              </p>
              <p className="font-display font-bold text-sm sm:text-base text-[#FAF7F0] leading-tight mt-0.5">
                {hud.stageName}
              </p>
            </div>
            <div className="h-7 w-px bg-[#39445A]" />
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
                {FR.ui.expeditionHud.vague}
              </p>
              <p className="font-mono-num font-bold text-base text-[#F4B942] leading-tight mt-0.5">
                {hud.waveIndex + 1}/{hud.totalWaves}
              </p>
            </div>
            <div className="h-7 w-px bg-[#39445A] hidden sm:block" />
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8C2D1] leading-none">
                {FR.ui.expeditionHud.temps}
              </p>
              <p className="font-mono-num font-bold text-base text-[#FAF7F0] leading-tight mt-0.5">
                {timerStr}
              </p>
            </div>
          </div>

          {/* Boss HP Bar with Phase Markers & Statuses */}
          {hud.boss && (
            <div className="voxel-panel rounded-xl px-3.5 py-2 w-[min(390px,82vw)] border-[#E85D3F]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ElementIcon element={hud.boss.element} size={16} />
                  <span className="font-display font-bold text-sm text-[#FAF7F0] truncate">
                    {hud.boss.name}
                  </span>
                  <span
                    className={`font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 ${
                      hud.boss.phase === 3
                        ? 'bg-[#F4B942] text-[#0F172A]'
                        : hud.boss.phase === 2
                          ? 'bg-[#F43F5E] text-[#FAF7F0]'
                          : 'bg-[#273145] text-[#CBD5E1]'
                    }`}
                  >
                    {FR.ui.expeditionHud.p}{hud.boss.phase}/{hud.boss.maxPhases}
                    {hud.boss.phase === 3
                      ? FR.ui.expeditionHud.dernierSursaut
                      : hud.boss.phase === 2
                        ? FR.ui.expeditionHud.fureur
                        : ''}
                  </span>
                </div>
                <span className="font-mono-num text-xs font-bold text-[#FCA5A5] whitespace-nowrap shrink-0">
                  {hud.boss.telegraphing
                    ? FR.ui.expeditionHud.attaqueEsquivez
                    : `${Math.round(hud.boss.hp)} / ${Math.round(hud.boss.maxHp)}`}
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded bg-[#111622] overflow-hidden border border-[#39445A]">
                <div
                  className={`h-full transition-transform duration-150 origin-left ${
                    hud.boss.phase === 3
                      ? 'bg-[#F4B942]'
                      : hud.boss.phase === 2
                        ? 'bg-[#F43F5E]'
                        : 'bg-[#E85D3F]'
                  }`}
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, hud.boss.hp / Math.max(1, hud.boss.maxHp)))})`,
                  }}
                />
                {/* Phase Threshold Tick Markers (50% and 25% for 3-phase Bosses) */}
                <div className="absolute inset-y-0 left-1/2 w-[2px] bg-[#0F1420]/85 pointer-events-none" />
                {hud.boss.maxPhases === 3 && (
                  <div className="absolute inset-y-0 left-1/4 w-[2px] bg-[#0F1420]/85 pointer-events-none" />
                )}
              </div>
              {/* Carapace de magma : bouclier du boss (les Éclats le brisent trois fois plus vite) */}
              {hud.boss.shieldMax > 0 && hud.boss.shield > 0 && (
                <div className="mt-1 h-1.5 w-full rounded bg-[#111622] overflow-hidden border border-[#39445A]" aria-label={FR.ui.expeditionHud.carapace}>
                  <div
                    className="h-full bg-[#F97316] origin-left"
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, hud.boss.shield / hud.boss.shieldMax))})` }}
                  />
                </div>
              )}
              {hud.boss.statuses.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold">
                  {hud.boss.statuses.map((st) => (
                    <span
                      key={st}
                      style={{ color: STATUS_META[st].color }}
                      className="uppercase tracking-wider"
                    >
                      {STATUS_META[st].shortTag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compteur discret des Éclats et des Trios, et nom du dernier Éclat */}
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-[#141A26]/80 border border-[#39445A] w-fit">
            <span className="font-mono-num text-[11px] font-bold text-[#B8C2D1]">
              {FR.ui.expeditionHud.eclatsTrios(hud.burstsTriggered, hud.triosTriggered)}
            </span>
            {hud.lastBurstLabel && (
              <span
                className="font-display font-bold text-xs tracking-wide uppercase"
                style={{ color: hud.lastBurstColor ?? '#F4B942' }}
              >
                {hud.lastBurstLabel}
              </span>
            )}
          </div>
        </div>

        {/* Top-Right: Compact Utility Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleControlMode();
            }}
            className={`voxel-btn cursor-pointer px-3 h-10 rounded-lg border-2 text-xs font-bold whitespace-nowrap shrink-0 ${
              hud.controlMode === 'auto'
                ? 'bg-[#2FB97A] text-[#0F172A] border-[#141925]'
                : 'bg-[#181E2A]/92 text-[#FAF7F0] border-[#39445A] hover:border-[#F4B942]'
            }`}
            aria-label={FR.ui.expeditionHud.changerLeModeDeControle}
          >
            {CONTROL_LABELS[hud.controlMode]}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="voxel-btn cursor-pointer w-10 h-10 rounded-lg bg-[#181E2A]/92 hover:bg-[#242D3F] text-[#FAF7F0] border-2 border-[#39445A] flex items-center justify-center"
            aria-label={muted ? FR.ui.expeditionHud.activerLeSon : FR.ui.expeditionHud.couperLeSon}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="voxel-btn cursor-pointer w-10 h-10 rounded-lg bg-[#181E2A]/92 hover:bg-[#242D3F] text-[#FAF7F0] border-2 border-[#39445A] flex items-center justify-center"
            aria-label={FR.ui.expeditionHud.mettreEnPause}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transient Wave / Boss Banner */}
      <AnimatePresence mode="wait">
        {hud.bannerText && !hud.bossIntro && (
          <motion.div
            key={hud.bannerText}
            initial={{ opacity: 0, y: -14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className="self-center px-5 py-1.5 rounded-lg bg-[#181E2A]/92 border-2 border-[#F4B942] font-display font-bold text-base sm:text-lg text-[#F4B942] tracking-wide text-center"
          >
            {hud.bannerText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entrée de boss : bandes cinéma + carton de présentation */}
      <AnimatePresence>
        {hud.bossIntro && (
          <motion.div
            key="boss-intro"
            className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="h-[12vh] bg-[#0B0F18]"
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div className="self-center text-center px-6">
              <motion.p
                className="text-xs sm:text-sm font-bold uppercase tracking-[0.45em] text-[#F43F5E] hud-text-stroke"
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.45em' }}
                transition={{ duration: 0.5 }}
              >
                {FR.ui.expeditionHud.alerteBoss}
              </motion.p>
              <motion.h2
                className="mt-1 font-display text-5xl sm:text-6xl font-extrabold hud-text-stroke"
                style={{ color: ELEMENT_META[hud.bossIntro.element].color }}
                initial={{ opacity: 0, scale: 1.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.45 }}
              >
                {hud.bossIntro.name}
              </motion.h2>
              <motion.p
                className="mt-1 text-sm sm:text-base font-semibold text-[#FAF7F0] hud-text-stroke"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
              >
                {hud.bossIntro.title}
              </motion.p>
            </div>
            <motion.div
              className="h-[12vh] bg-[#0B0F18]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Perimeter Dock: 3 Squad Cards + Dodge + Ultimate */}
      {/* Petits écrans : les 3 cartes occupent toute la largeur, Esquive et Ultime passent dessous */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-2 sm:gap-2.5 pointer-events-auto">
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full sm:w-[min(600px,64vw)]">
          {hud.units.map((u, idx) => {
            const hpRatio = Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
            const shieldRatio = Math.max(0, Math.min(1, u.shieldHp / Math.max(1, u.maxHp)));
            const skillReady = !u.fainted && u.moveCooldown <= 0.05;
            const cdRatio = Math.max(
              0,
              Math.min(1, 1 - u.moveCooldown / Math.max(0.1, u.moveMaxCooldown)),
            );
            const moveColor = ELEMENT_META[u.moveElement].color;
            // Aperçu du moteur : Trio (or), Éclat (bleu), cube qui mûrit (« … »), trop loin (grisé)
            const preview = skillReady ? hud.skillPreviews[idx] : null;
            const previewRing =
              preview === 'trio'
                ? ['ring-2', 'ring-[#F4B942]', 'animate-pulse'].join(' ')
                : preview === 'burst'
                  ? ['ring-2', 'ring-[#38BDF8]'].join(' ')
                  : '';

            return (
              <div
                key={u.uid}
                className={`voxel-panel rounded-xl p-2 sm:p-2.5 flex flex-col gap-1.5 ${
                  u.fainted ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <VoxelCreatureAvatar speciesId={u.speciesId} size={34} className="shrink-0 hidden sm:block" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-bold text-xs sm:text-sm text-[#FAF7F0] truncate">
                        {u.name}
                      </span>
                      <span className="font-mono-num text-[10px] text-[#B8C2D1] shrink-0">
                        {FR.ui.expeditionHud.n}{u.level}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 w-full rounded bg-[#111622] overflow-hidden border border-[#39445A]">
                      <div
                        className={`h-full transition-transform duration-150 origin-left ${
                          hpRatio < 0.3 ? 'bg-[#E85D3F]' : 'bg-[#2FB97A]'
                        }`}
                        style={{ transform: `scaleX(${hpRatio})` }}
                      />
                      {shieldRatio > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 bg-[#F4B942]/80 origin-left pointer-events-none"
                          style={{ transform: `scaleX(${shieldRatio})` }}
                        />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] font-mono-num text-[#B8C2D1]">
                      <span className="truncate">
                        {u.fainted
                          ? FR.ui.expeditionHud.reanimS(u.reviveTimer.toFixed(0))
                          : u.shieldHp > 0
                            ? `${Math.round(u.hp)} +${u.shieldHp}`
                            : `${Math.round(u.hp)}/${Math.round(u.maxHp)}`}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {u.buffActive && <span className="text-[#38BDF8] font-bold">{FR.ui.expeditionHud.def}</span>}
                        {u.statuses.slice(0, 2).map((st) => (
                          <span
                            key={st}
                            style={{ color: STATUS_META[st].color }}
                            className="font-bold"
                          >
                            {STATUS_META[st].shortTag}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Special Move Trigger Button */}
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!skillReady}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCastSkill(idx);
                  }}
                  className={`voxel-btn relative overflow-hidden cursor-pointer rounded-lg px-2 py-1.5 border-2 text-left flex items-center justify-between gap-1.5 ${previewRing} ${
                    skillReady
                      ? 'border-[#141925] text-[#FAF7F0]'
                      : 'border-[#39445A] bg-[#161C28] text-[#94A3B8] cursor-not-allowed'
                  } ${preview === 'far' ? 'opacity-60 grayscale' : ''}`}
                  style={skillReady ? { backgroundColor: moveColor } : undefined}
                  aria-label={FR.ui.expeditionHud.lancerAvec(u.moveName, u.name)}
                >
                  {!skillReady && !u.fainted && (
                    <div
                      className="absolute inset-0 bg-white/10 origin-left pointer-events-none"
                      style={{ transform: `scaleX(${cdRatio})` }}
                    />
                  )}
                  <span className="relative z-10 text-[11px] sm:text-xs font-bold truncate hud-text-stroke">
                    {preview === 'trio'
                      ? FR.ui.expeditionHud.previewTrio
                      : preview === 'burst'
                        ? FR.ui.expeditionHud.previewEclat
                        : preview === 'ripening'
                          ? FR.ui.expeditionHud.previewMurit
                          : preview === 'far'
                            ? FR.ui.expeditionHud.previewLoin
                            : u.moveName}
                  </span>
                  <span className="relative z-10 font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#141925]/70 text-[#FAF7F0] shrink-0">
                    {skillReady ? idx + 1 : `${u.moveCooldown.toFixed(1)}s`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 sm:contents">
        {/* Iconic Dodge Button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={!dodgeReady}
          onClick={(e) => {
            e.currentTarget.blur();
            onDodge();
          }}
          className={`voxel-btn relative overflow-hidden cursor-pointer h-14 flex-1 flex-row gap-2 sm:h-[106px] sm:flex-none sm:w-[98px] sm:flex-col sm:gap-1 rounded-xl border-2 flex items-center justify-center shrink-0 ${
            dodgeReady
              ? 'bg-[#E85D3F] hover:bg-[#F06D50] border-[#141925] text-[#FAF7F0]'
              : 'bg-[#181E2A]/92 border-[#39445A] text-[#94A3B8] cursor-not-allowed'
          }`}
          aria-label={FR.ui.expeditionHud.esquiveDeLEscouade}
        >
          {!dodgeReady && (
            <div
              className="absolute inset-x-0 bottom-0 bg-[#E85D3F]/25 origin-bottom pointer-events-none"
              style={{ height: `${dodgeRatio * 100}%` }}
            />
          )}
          <DodgeIcon size={24} />
          <span className="relative z-10 font-display font-bold text-xs leading-none">
            {FR.ui.expeditionHud.esquive}
          </span>
          <span className="relative z-10 font-mono-num text-[10px] opacity-90">
            {dodgeReady ? FR.ui.expeditionHud.espace : `${hud.dodgeCooldown.toFixed(1)}s`}
          </span>
        </button>

        {/* Bouton d'ultime d'escouade (Déchaînement [R]) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={!ultimateReady}
          onClick={(e) => {
            e.currentTarget.blur();
            onUltimate();
          }}
          className={`voxel-btn relative overflow-hidden cursor-pointer h-14 flex-1 flex-row gap-2 sm:h-[106px] sm:flex-none sm:w-[98px] sm:flex-col sm:gap-1 rounded-xl border-2 flex items-center justify-center shrink-0 ${
            ultimateReady
              ? 'hover:brightness-110 border-[#141925] text-[#0F172A]'
              : 'bg-[#181E2A]/92 border-[#39445A] text-[#94A3B8] cursor-not-allowed'
          }`}
          style={ultimateReady ? { backgroundColor: hud.leaderElement ? ELEMENT_META[hud.leaderElement].color : '#F4B942' } : undefined}
          aria-label={FR.ui.expeditionHud.declencherLUltimeDEscouade}
        >
          {!ultimateReady && (
            <div
              className="absolute inset-x-0 bottom-0 bg-[#F4B942]/30 origin-bottom pointer-events-none"
              style={{ height: `${ultimateRatio * 100}%` }}
            />
          )}
          {hud.leaderElement ? (
            <span className="relative z-10">
              <ElementIcon element={hud.leaderElement} size={24} />
            </span>
          ) : (
            <Sparkles className="relative z-10 w-6 h-6" />
          )}
          <span className="relative z-10 font-display font-bold text-xs leading-none">
            {hud.leaderElement ? FR.ui.ultimateWords[hud.leaderElement] : FR.ui.expeditionHud.ultime}
          </span>
          <span className="relative z-10 font-mono-num text-[10px] font-bold">
            {ultimateReady ? FR.ui.expeditionHud.toucheR : `${hud.ultimateCharge}%`}
          </span>
        </button>
        </div>
      </div>
    </div>
  );
}
