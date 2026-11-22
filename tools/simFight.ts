/**
 * Un combat headless sur le VRAI moteur, commun à `npm run sim` (mesure) et `npm run golden` (garde-fou).
 *
 * Profils de contrôle :
 *  - `auto`   : « Auto Total » du jeu (le moteur lance sorts et ultime, jamais l'Esquive) ;
 *  - `active` : mode « Semi » du jeu piloté par un script qui imite un joueur appliqué, uniquement via
 *               les commandes publiques du moteur (les mêmes que les boutons du HUD) :
 *               sort lancé dès qu'il est prêt et qu'il reste un ennemi, ultime dès 100 %,
 *               Esquive 0,45 s après l'apparition d'un télégraphe.
 *
 * `cubes: false` coupe les cubes d’élément par une option du moteur réservée aux outils
 * (le jeu normal ne la passe jamais).
 */
import { installHeadlessDom, mulberry32 } from './headlessDom';

installHeadlessDom();
const noop = (): void => {};
const { STAGES, SPECIES } = await import('../src/game/catalog');
const { getReferenceConfig } = await import('../src/game/previewConfigs');
const { createOwnedCreature } = await import('../src/game/rules');
const { VoxelEngine } = await import('../src/game/VoxelEngine');

export { STAGES, SPECIES, getReferenceConfig };
export type StageDef = (typeof STAGES)[number];
export type SimProfile = 'auto' | 'active';

export interface FightOptions {
  profile?: SimProfile;
  cubes?: boolean;
}

export const STEP = 1 / 60;
export const MAX_FIGHT_SEC = 300;
const ACTIVE_DODGE_DELAY = 0.45;

interface Outcome {
  victory: boolean;
  clearTimeSec: number;
  wavesCleared: number;
  damageDealt: number;
  bossHpPercentRemaining: number;
  reactionsTriggered: number;
  ultimatesUsed: number;
  perfectDodges: number;
  maxCombo: number;
}

export interface FightResult {
  victory: boolean;
  timedOut: boolean;
  duration: number;
  bossHpPct: number;
  bossAppearedAt: number;
  /** Durée de chaque phase atteinte (null si jamais atteinte). */
  phaseDurations: (number | null)[];
  castsByPhase: number[];
  patternsByPhase: number[][];
  bossMaxPhases: number;
  /** Résultat brut renvoyé par le moteur (null si le combat a dépassé le délai). */
  outcome: Outcome | null;
  /** PV de chaque allié à la fin du combat. */
  allyHp: number[];
  /** Nombre de tirages aléatoires consommés : change dès que le déroulé du combat change. */
  rngCalls: number;
  /** Nombre d'instantanés HUD émis et somme de contrôle de leur contenu (PV, dégâts, ennemis restants). */
  hudUpdates: number;
  hudChecksum: number;
}

export function runFight(stage: StageDef, seed: number, opts: FightOptions = {}): FightResult {
  const profile: SimProfile = opts.profile ?? 'auto';
  const config = getReferenceConfig(stage);

  const realRandom = Math.random;
  const seeded = mulberry32(seed);
  let rngCalls = 0;
  Math.random = () => {
    rngCalls += 1;
    return seeded();
  };
  try {
    let outcome: Outcome | null = null;
    let allyHp: number[] = [];
    let enemiesRemaining = 0;
    let hudUpdates = 0;
    let hudChecksum = 0;
    const engine = new VoxelEngine(
      null,
      {
        onHudUpdate: (snap) => {
          hudUpdates += 1;
          enemiesRemaining = snap.enemiesRemaining;
          allyHp = snap.units.map((u) => u.hp);
          let sum = snap.damageDealt + snap.enemiesRemaining * 7 + snap.ultimateCharge * 3 + snap.comboCount;
          for (const u of snap.units) sum += u.hp + u.shieldHp * 5 + u.moveCooldown;
          if (snap.boss) sum += snap.boss.hp * 11 + snap.boss.phase * 13;
          hudChecksum += sum;
        },
        onExpeditionComplete: (result) => {
          outcome = result;
        },
      },
      { headless: true, cubes: opts.cubes ?? true },
    );
    const creatures = config.squad.map((id, i) =>
      createOwnedCreature(id, config.level, config.bonus, `sim_${i}`),
    );
    engine.setScreenState('playing');
    engine.startExpedition(stage, creatures, [], profile === 'auto' ? 'auto' : 'semi');

    let t = 0;
    let hazardSeenFor = 0;
    while (!outcome && t < MAX_FIGHT_SEC) {
      if (profile === 'active') {
        if (enemiesRemaining > 0) {
          for (let slot = 0; slot < 3; slot++) engine.triggerAllySkill(slot);
          engine.triggerUltimate();
        }
        if (engine.getDebugInfo().telegraphs > 0) {
          hazardSeenFor += STEP;
          if (hazardSeenFor >= ACTIVE_DODGE_DELAY && engine.triggerDodge()) hazardSeenFor = 0;
        } else {
          hazardSeenFor = 0;
        }
      }
      engine.stepSimulation(STEP);
      t += STEP;
    }
    const tel = engine.getCombatTelemetry();
    engine.dispose();

    const final = outcome as Outcome | null;
    const end = tel.elapsed;
    const phaseDurations: (number | null)[] = [0, 1, 2].map((i) => {
      const start = tel.phaseStartedAt[i];
      if (start < 0 || i >= tel.bossMaxPhases) return null;
      const nextStart = i < 2 ? tel.phaseStartedAt[i + 1] : -1;
      const stop = nextStart >= 0 ? nextStart : tel.bossDefeatedAt >= 0 ? tel.bossDefeatedAt : end;
      return Math.max(0, stop - start);
    });
    return {
      victory: Boolean(final?.victory),
      timedOut: !final,
      duration: end,
      bossHpPct: final ? (final.victory ? 0 : final.bossHpPercentRemaining) : 100,
      bossAppearedAt: tel.bossAppearedAt,
      phaseDurations,
      castsByPhase: tel.castsByPhase,
      patternsByPhase: tel.patternsByPhase,
      bossMaxPhases: tel.bossMaxPhases,
      outcome: final,
      allyHp,
      rngCalls,
      hudUpdates,
      hudChecksum,
    };
  } finally {
    Math.random = realRandom;
  }
}

/** Graine propre à chaque combat : stable d'une exécution à l'autre, différente d'un niveau à l'autre. */
export function fightSeed(baseSeed: number, stage: StageDef, run: number): number {
  return baseSeed * 100003 + stage.index * 1009 + run;
}
