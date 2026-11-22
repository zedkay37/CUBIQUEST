/**
 * Un combat headless sur le VRAI moteur, commun à `npm run sim` (mesure) et `npm run golden` (garde-fou).
 *
 * Profils de contrôle :
 *  - `auto`   : « Auto Total » du jeu (le moteur lance sorts et ultime, jamais l'Esquive) ;
 *  - `active` : mode « Semi » du jeu piloté par un script qui imite un joueur appliqué, uniquement via
 *               les commandes publiques du moteur (les mêmes que les boutons du HUD) :
 *               sort lancé dès qu'il est prêt et qu'il reste un ennemi, ultime dès 100 %,
 *               Esquive 0,45 s après l'apparition d'un télégraphe.
 *  - `expert` : mode « Semi » piloté par `getSkillPreview` (fiche S04.5) : Trio tout de suite ; Éclat plein
 *               si un troisième élément est prêt dans moins de 2,5 s ; pose du cube par le sort à la plus
 *               longue recharge quand les deux autres seront prêts dans moins de 2 s ; jamais d'Éclat faible
 *               volontaire, mais un sort prêt depuis plus de 2,5 s part s'il ne gâche pas un cube qui mûrit ;
 *               Déchaînement dès 100 %, sauf si un Trio est possible dans la seconde. Il esquive comme `active`.
 *               Il lit les recharges et les cubes dans l'état du moteur (outil seulement).
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
export type SimProfile = 'auto' | 'active' | 'expert';

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
  burstsTriggered: number;
  ultimatesUsed: number;
  perfectDodges: number;
  triosTriggered: number;
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
  /** Cubes : Éclats pleins, Éclats faibles, Trios ; Déchaînements (total et pendant le combat de boss). */
  bursts: number;
  weakBursts: number;
  trios: number;
  ultimates: number;
  bossUltimates: number;
}

type Engine = InstanceType<typeof VoxelEngine>;

/** Profil « expert » : une décision par pas de simulation. `readySince` : depuis quand chaque sort est prêt. */
function expertStep(engine: Engine, readySince: number[], dt: number): void {
  const allies = engine.allies;
  const ready = allies.map((a) => !a.fainted && a.skillCooldown <= 0);
  for (let i = 0; i < 3; i++) readySince[i] = ready[i] ? readySince[i] + dt : 0;
  const preview = [0, 1, 2].map((i) => (ready[i] ? engine.getSkillPreview(i) : null));
  const element = (i: number) => allies[i]?.rig.species.element;
  const soon = (i: number, s: number) => Boolean(allies[i]) && !allies[i].fainted && allies[i].skillCooldown < s;

  // (5) Déchaînement dès 100 %, sauf si un Trio est possible dans la seconde
  const trioSoon = [0, 1, 2].some((i) => soon(i, 1) && (preview[i] === 'trio' || (!ready[i] && engine.getSkillPreview(i) === 'trio')));
  if (engine.ultimateCharge >= 100 && !trioSoon) engine.triggerUltimate();

  // (1) Trio tout de suite
  for (let i = 0; i < 3; i++) if (preview[i] === 'trio' && engine.triggerAllySkill(i)) return;
  // (2) Éclat plein si un troisième élément est prêt dans moins de 2,5 s
  for (let i = 0; i < 3; i++) {
    if (preview[i] !== 'burst') continue;
    const third = [0, 1, 2].some((j) => j !== i && soon(j, 2.5) && element(j) !== element(i));
    if (third && engine.triggerAllySkill(i)) return;
  }
  // (3) aucun cube posé et les deux autres prêts dans moins de 2 s : pose avec la plus longue recharge
  const anyCube = engine.enemies.some((e) => !e.fainted && !e.removed && (e.cube || e.crack));
  if (!anyCube) {
    let best = -1;
    for (let i = 0; i < 3; i++) {
      if (!ready[i] || preview[i] === 'far') continue;
      const others = [0, 1, 2].filter((j) => j !== i);
      if (!others.every((j) => !allies[j] || allies[j].fainted || soon(j, 2))) continue;
      if (best < 0 || allies[i].skillMaxCooldown > allies[best].skillMaxCooldown) best = i;
    }
    if (best >= 0 && engine.triggerAllySkill(best)) return;
  }
  // (4) prêt depuis plus de 2,5 s : part s'il ne gâche pas un cube qui mûrit
  for (let i = 0; i < 3; i++) {
    if (ready[i] && readySince[i] > 2.5 && preview[i] !== 'ripening' && preview[i] !== 'far' && engine.triggerAllySkill(i)) return;
  }
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
          let sum = snap.damageDealt + snap.enemiesRemaining * 7 + snap.ultimateCharge * 3 + snap.burstsTriggered * 5 + snap.triosTriggered * 17;
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
    let ultimatesAtBoss = -1;
    const readySince = [0, 0, 0];
    while (!outcome && t < MAX_FIGHT_SEC) {
      if (ultimatesAtBoss < 0 && engine.getCombatTelemetry().bossAppearedAt >= 0) ultimatesAtBoss = engine.ultimatesUsed;
      if (profile === 'expert' && enemiesRemaining > 0) expertStep(engine, readySince, STEP);
      if (profile === 'active' && enemiesRemaining > 0) {
        for (let slot = 0; slot < 3; slot++) engine.triggerAllySkill(slot);
        engine.triggerUltimate();
      }
      if (profile !== 'auto') {
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
    const counts = {
      bursts: engine.burstsTriggered,
      weakBursts: engine.weakBurstsTriggered,
      trios: engine.triosTriggered,
      ultimates: engine.ultimatesUsed,
      bossUltimates: ultimatesAtBoss < 0 ? 0 : engine.ultimatesUsed - ultimatesAtBoss,
    };
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
      ...counts,
    };
  } finally {
    Math.random = realRandom;
  }
}

/** Graine propre à chaque combat : stable d'une exécution à l'autre, différente d'un niveau à l'autre. */
export function fightSeed(baseSeed: number, stage: StageDef, run: number): number {
  return baseSeed * 100003 + stage.index * 1009 + run;
}
