import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { CampHud, type CampDrawerTab } from './components/CampHud';
import { CodexDrawer } from './components/CodexDrawer';
import { AtelierDrawer } from './components/AtelierDrawer';
import { HubOverlay } from './components/HubOverlay';
import { SummonReveal, type SummonRevealProps } from './components/SummonReveal';
import { Modal } from './components/ui';
import { ExpeditionDrawer } from './components/ExpeditionDrawer';
import { EvolutionOverlay } from './components/EvolutionOverlay';
import { ArrivalScene } from './components/ui/moments';
import { ExpeditionHud } from './components/ExpeditionHud';
import { OutcomeModal } from './components/OutcomeModal';
import { QuestsDrawer } from './components/QuestsDrawer';
import { StarterModal } from './components/StarterModal';
import { PauseModal } from './components/StatusModals';
import type { ExpeditionResult, FirstTimeKind } from './game/engine/types';
import { FR } from './i18n/fr';

const FIRST_TIME_TEXT: Record<FirstTimeKind, string> = {
  cube: FR.ui.expeditionHud.premiereFoisCube,
  weak: FR.ui.expeditionHud.premiereFoisFaible,
  burst: FR.ui.expeditionHud.premiereFoisEclat,
  trio: FR.ui.expeditionHud.premiereFoisTrio,
};
import { TeamDrawer } from './components/TeamDrawer';
import { TitleOverlay } from './components/TitleOverlay';
import { soundFx } from './game/audio';
import { SPECIES, STAGE_BY_ID, STAGES } from './game/catalog';
import {
  applyExpeditionRewards,
  markFirstTimeSeen,
  markHazardHintSeen,
  markLessonDone,
  isAutoUnlocked,
  markUnlockSeen,
  lineageOf,
  openSealedCube,
  toggleSquadMember,
  unlockedFeatures,
  buildPreviewSave,
  claimAchievementReward,
  claimQuestReward,
  countClaimableRewards,
  createInitialSaveState,
  createOwnedCreature,
  equipRune,
  equipPowerStone,
  evolveCreature,
  loadSaveState,
  persistSaveState,
  unequipPowerStone,
} from './game/rules';
import { appendJournal, loadJournal, markRetry, saveJournal } from './game/journal';
import { escapeTarget, nextDrawer } from './game/uiNav';
import type {
  ElementType,
  CodexAnswer,
  ControlMode,
  ExpeditionHudSnapshot,
  ExpeditionOutcome,
  GameScreenState,
  RuneKind,
  OwnedCreature,
  PlayMode,
  SaveState,
  StageDef,
} from './game/types';
import { getReferenceConfig } from './game/previewConfigs';
import { loadSettings, persistSettings, QUALITY_ORDER, type GameSettings } from './game/settings';
import { VoxelEngine } from './game/VoxelEngine';

// `?debug=1` : overlay de diagnostic (FPS, draw calls...). Le composant n'est téléchargé que dans ce cas.
const DEBUG_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
const DebugOverlay = lazy(() => import('./components/DebugOverlay'));
const BenchOverlay = lazy(() => import('./components/BenchOverlay'));
const isBench = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('bench') === '1';

/**
 * `?ui=<écran>` (outil de développement, captures) : ouvre directement un écran sans toucher à la sauvegarde.
 * Tiroirs du camp : expeditions, team, quests, codex (avec ?autostart=1). Départ : starter.
 * Avec ?stage=<id> : pause, victory, defeat. Évolution : evolution (avec ?autostart=1).
 */
function getUiParam(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('ui');
}

function hasAutostartParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

/**
 * Mode aperçu pour tester un niveau sans toucher à la sauvegarde :
 *   ?stage=tundra-3&squad=givrelin,cryolithe,auroramure&lvl=42&bonus=1200
 * (escouade, niveau et bonus facultatifs ; aucune récompense n'est enregistrée).
 * `bonus` simule les Pierres de Pouvoir : il s'ajoute aux PV et à l'ATQ de chaque créature.
 */
function getPreviewParams(): { stage: StageDef; squad: string[]; level: number; bonus: number } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  // ?bench=1 sans niveau : le Cratère (volcano-2), combat chargé en effets
  const stage = STAGE_BY_ID[params.get('stage') ?? (params.get('bench') === '1' ? 'volcano-2' : '')];
  if (!stage) return null;
  // Sans paramètre, on prend l'escouade de référence du niveau (la même que l'outil `npm run sim`)
  const reference = getReferenceConfig(stage);
  const squad = (params.get('squad') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => Boolean(SPECIES[id]))
    .slice(0, 3);
  const rawLevel = Number(params.get('lvl'));
  const level = rawLevel > 0 ? Math.max(1, Math.min(50, Math.floor(rawLevel))) : reference.level;
  const rawBonus = Number(params.get('bonus'));
  const bonus = Number.isFinite(rawBonus) && rawBonus > 0 ? Math.min(6000, rawBonus) : reference.bonus;
  return { stage, squad: squad.length > 0 ? squad : reference.squad, level, bonus };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const getDebugStats = useCallback(() => engineRef.current?.getDebugStats() ?? null, []);
  const getEngine = useCallback(() => engineRef.current, []);

  const [save, setSave] = useState<SaveState>(() => {
    const loaded = loadSaveState();
    if (hasAutostartParam() && !loaded.starterChosen) {
      return { ...loaded, starterChosen: true };
    }
    return loaded;
  });

  const [screenState, setScreenState] = useState<GameScreenState>(() =>
    hasAutostartParam() ? 'playing' : 'title',
  );
  const [playMode, setPlayMode] = useState<PlayMode>('camp');
  const [activeDrawer, setActiveDrawer] = useState<CampDrawerTab>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>('semi');
  const controlModeRef = useRef<ControlMode>('semi');
  controlModeRef.current = controlMode;
  const [muted, setMuted] = useState(false);
  // ?quality=low|medium|high|auto : impose la qualité graphique (outil de mesure, G1.4)
  const [settings, setSettings] = useState<GameSettings>(() => {
    const s = loadSettings();
    const q = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('quality');
    return q && (QUALITY_ORDER as string[]).includes(q) ? { ...s, quality: q as GameSettings['quality'] } : s;
  });

  const [activeStage, setActiveStage] = useState<StageDef | null>(null);
  const [hudSnapshot, setHudSnapshot] = useState<ExpeditionHudSnapshot | null>(null);
  const [outcome, setOutcome] = useState<ExpeditionOutcome | null>(null);
  const [recruitedPreview, setRecruitedPreview] = useState<OwnedCreature | null>(null);
  const [codexHistory, setCodexHistory] = useState<CodexAnswer[]>([]);
  const [evolution, setEvolution] = useState<{ from: string; to: string; revealed: boolean } | null>(
    null,
  );
  const evolutionGuardRef = useRef(0);

  // Refs so Three.js callbacks never stale-close or tear down the canvas
  const saveRef = useRef(save);
  const activeStageRef = useRef(activeStage);
  /** Écran de fin d'une victoire déjà récompensée, en attente d'affichage (voir onVictorySecured). */
  const securedOutcomeRef = useRef<ExpeditionOutcome | null>(null);
  const [victorySecured, setVictorySecured] = useState(false);
  /** Arrivée d'une créature (moment fort, sprint UI). */
  // A2 : révélation d'un Cube Scellé en cours
  const [reveal, setReveal] = useState<Omit<SummonRevealProps, 'onDone'> | null>(null);
  const handleOpenCube = useCallback((cubeId: string, bait: ElementType | null) => {
    const before = saveRef.current;
    const cube = before.sealedCubes.find((c) => c.id === cubeId);
    const opened = openSealedCube(before, cubeId, bait);
    if (!opened || !cube) return;
    saveRef.current = opened.nextSave;
    setSave(opened.nextSave);
    setActiveDrawer(null);
    setReveal({
      material: cube.material,
      speciesId: opened.result.speciesId,
      tier: opened.result.tier,
      isNew: opened.result.isNew,
      bondAfter: opened.result.bondAfter,
      variantUnlocked: opened.result.variantUnlocked,
      // toute première ouverture : pas d'accélération
      firstTime: before.cubeCounter - before.sealedCubes.length === 0,
    });
  }, []);
  const [arrival, setArrival] = useState<{ speciesId: string; isNew: boolean } | null>(null);
  /** Bulle « première fois » affichée en combat (S04.3). */
  const [firstTimeTip, setFirstTimeTip] = useState<FirstTimeKind | null>(null);
  useEffect(() => {
    if (!firstTimeTip) return;
    const id = window.setTimeout(() => setFirstTimeTip(null), 3800);
    return () => window.clearTimeout(id);
  }, [firstTimeTip]);
  const previewRef = useRef(false); // true : expédition d'aperçu, rien n'est sauvegardé
  const pendingArrivalRef = useRef<string | null>(null);
  const launchStageRef = useRef<((stage: StageDef) => void) | null>(null);
  const previewCreaturesRef = useRef<OwnedCreature[]>([]);
  saveRef.current = save;
  activeStageRef.current = activeStage;

  // Persist save changes
  useEffect(() => {
    persistSaveState(save);
  }, [save]);

  // Mirror state machine to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = screenState;
    engineRef.current?.setScreenState(screenState);
  }, [screenState]);

  const getSquadCreatures = useCallback((state: SaveState): OwnedCreature[] => {
    return state.squadIds
      .map((uid) => state.roster.find((c) => c.uid === uid))
      .filter((c): c is OwnedCreature => Boolean(c))
      // A2 : le Lien de la lignée (+4 % PV et attaque par étoile) accompagne la créature au combat
      .map((c) => ({ ...c, bond: state.bonds?.[lineageOf(c.speciesId)] ?? 0 }));
  }, []);

  // Mount WebGLRenderer once in isolated ref container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    /** Attribue les récompenses d'un combat et renvoie le contenu de l'écran de fin. */
    const settleExpedition = (stage: StageDef, result: ExpeditionResult): ExpeditionOutcome => {
      // En aperçu, l'écran de fin est calculé pour l'escouade de l'aperçu (et rien n'est enregistré)
      const { nextSave, outcome: finalOutcome } = applyExpeditionRewards(
        previewRef.current
          ? buildPreviewSave(saveRef.current, previewCreaturesRef.current)
          : saveRef.current,
        stage,
        result.victory,
        result,
      );
      if (!previewRef.current) {
        saveRef.current = nextSave;
        setSave(nextSave);
        // S07.3 : le compagnon qui rejoint le camp arrive quand on y revient (scène de 4 s)
        if (finalOutcome.joinedSpeciesId) pendingArrivalRef.current = finalOutcome.joinedSpeciesId;
        // Journal de test : une ligne par combat, écrite en fin de combat seulement
        const squadNow = getSquadCreatures(saveRef.current);
        saveJournal(
          appendJournal(loadJournal(), {
            at: new Date().toISOString(),
            stageId: stage.id,
            squad: squadNow.map((c) => ({ speciesId: c.speciesId, level: c.level })),
            mode: controlModeRef.current,
            victory: result.victory,
            durationSec: Math.round(result.clearTimeSec * 10) / 10,
            bursts: result.burstsTriggered,
            weakBursts: result.weakBursts,
            trios: result.triosTriggered,
            dodges: result.dodges,
            perfectDodges: result.perfectDodges,
            hazardHits: result.hazardHits,
            ultimates: result.ultimatesUsed,
            bossHpLeft: result.victory ? null : Math.round(result.bossHpPercentRemaining),
            retried: null,
            lessonsSeen: result.lessonsSeen ?? [],
            lessonsPassed: result.lessonsPassed ?? [],
          }),
        );
      }
      return finalOutcome;
    };

    const engine = new VoxelEngine(mount, {
      onHudUpdate: (snap) => {
        setHudSnapshot(snap);
      },
      // Victoire acquise (dernier ennemi tombé) : récompenses attribuées tout de suite, une seule fois.
      // L'écran de fin viendra après la fête ; quitter entre-temps ne fait plus rien perdre.
      onVictorySecured: (result) => {
        const stage = activeStageRef.current;
        if (!stage || securedOutcomeRef.current) return;
        securedOutcomeRef.current = settleExpedition(stage, result);
        setVictorySecured(true);
      },
      // Première fois qu'un geste apparaît : une bulle d'une ligne, une seule fois par sauvegarde
      onFirstTime: (kind) => {
        if (previewRef.current || saveRef.current.firstTimesSeen.includes(kind)) return;
        const next = markFirstTimeSeen(saveRef.current, kind);
        saveRef.current = next;
        setSave(next);
        setFirstTimeTip(kind);
      },
      onLessonDone: (id) => {
        if (previewRef.current) return;
        const next = markLessonDone(saveRef.current, id);
        saveRef.current = next;
        setSave(next);
      },
      onHazardHint: (key) => {
        if (previewRef.current) return;
        const next = markHazardHintSeen(saveRef.current, key);
        saveRef.current = next;
        setSave(next);
      },
      onExpeditionComplete: (result) => {
        const stage = activeStageRef.current;
        if (!stage) return;
        // Victoire : déjà réglée par onVictorySecured. Défaite : réglée ici.
        const finalOutcome = securedOutcomeRef.current ?? settleExpedition(stage, result);
        securedOutcomeRef.current = null;
        if (finalOutcome.unlockedBiomeName) {
          window.setTimeout(() => soundFx.playBiomeUnlock(), 1100);
        }
        setOutcome(finalOutcome);
        setScreenState('gameover');
      },
    });
    engineRef.current = engine;

    const initialSave = saveRef.current;
    engine.loadCampScene(getSquadCreatures(initialSave));
    engine.setScreenState(hasAutostartParam() ? 'playing' : 'title');

    // ?hour=0.8 : règle l'heure du camp (0 aube · 0.3 jour · 0.64 crépuscule · 0.8 nuit)
    const hourParam = new URLSearchParams(window.location.search).get('hour');
    if (hourParam !== null) engine.setCampClock(Number(hourParam));

    const preview = getPreviewParams();
    if (preview) {
      const creatures = preview.squad.map((id, i) =>
        createOwnedCreature(id, preview.level, preview.bonus, `preview_${i}`),
      );
      previewRef.current = true;
      previewCreaturesRef.current = creatures;
      activeStageRef.current = preview.stage;
      setActiveStage(preview.stage);
      setPlayMode('expedition');
      setScreenState('playing');
      setControlMode('auto');
      engine.startExpedition(preview.stage, creatures, [], 'auto');
      engine.setScreenState('playing');
    }

    // ?ui=... : écran ouvert d'office, pour les captures (rien n'est enregistré)
    const ui = getUiParam();
    if (ui === 'expeditions' || ui === 'atelier' || ui === 'team' || ui === 'quests' || ui === 'codex') {
      setActiveDrawer(ui);
    } else if (ui === 'starter') {
      setScreenState('playing');
      engine.setScreenState('playing');
    } else if (ui === 'evolution') {
      setEvolution({ from: 'pyrocube', to: 'flambrix', revealed: true });
    } else if (preview && ui === 'pause') {
      setScreenState('paused');
    } else if (preview && (ui === 'victory' || ui === 'defeat')) {
      const won = ui === 'victory';
      const { outcome: shown } = applyExpeditionRewards(
        buildPreviewSave(saveRef.current, previewCreaturesRef.current),
        preview.stage,
        won,
        { clearTimeSec: 48, wavesCleared: won ? 3 : 2, damageDealt: 18250, bossHpPercentRemaining: won ? 0 : 23, burstsTriggered: 5, ultimatesUsed: 1, perfectDodges: 2, triosTriggered: 2 },
        () => 0.3,
      );
      setOutcome(shown);
      setScreenState('gameover');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [getSquadCreatures]);

  // Options de confort (tremblement de caméra) : persistance + synchro moteur
  useEffect(() => {
    persistSettings(settings);
    engineRef.current?.setShakeEnabled(settings.screenShake);
    engineRef.current?.setQuality(settings.quality);
  }, [settings]);

  const handleCycleQuality = useCallback(() => {
    soundFx.playUiClick();
    setSettings((prev) => ({ ...prev, quality: QUALITY_ORDER[(QUALITY_ORDER.indexOf(prev.quality) + 1) % QUALITY_ORDER.length] }));
  }, []);

  const handleToggleShake = useCallback(() => {
    soundFx.playUiClick();
    setSettings((prev) => ({ ...prev, screenShake: !prev.screenShake }));
  }, []);

  // Actions
  const handleStartFromTitle = useCallback(() => {
    soundFx.playUiClick();
    document.body.dataset.state = 'playing';
    setScreenState('playing');
    setPlayMode('camp');
    setActiveDrawer(null);
  }, []);

  const handleNewAdventure = useCallback(() => {
    soundFx.playUiClick();
    const fresh = createInitialSaveState('pyrocube', false);
    setSave(fresh);
    setOutcome(null);
    setActiveDrawer(null);
    setPlayMode('camp');
    setScreenState('playing');
    engineRef.current?.loadCampScene(getSquadCreatures(fresh));
  }, [getSquadCreatures]);

  const handleSelectStarter = useCallback(
    (speciesId: string) => {
      soundFx.playEvolution();
      const fresh = createInitialSaveState(speciesId, true);
      saveRef.current = fresh;
      setSave(fresh);
      // S07.3 : une nouvelle partie va droit au niveau 1, sans passer par le camp
      if (launchStageRef.current) launchStageRef.current(STAGES[0]);
      else engineRef.current?.loadCampScene(getSquadCreatures(fresh));
    },
    [getSquadCreatures],
  );

  const handleLaunchStage = useCallback(
    (stage: StageDef) => {
      soundFx.playUiClick();
      previewRef.current = false;
      securedOutcomeRef.current = null;
      setVictorySecured(false);
      setActiveDrawer(null);
      setOutcome(null);
      setActiveStage(stage);
      setPlayMode('expedition');
      setScreenState('playing');
      document.body.dataset.state = 'playing';
      engineRef.current?.markRetryClick();
      // journal : après une défaite, relancer le même niveau ou non
      saveJournal(markRetry(loadJournal(), stage.id));
      engineRef.current?.setHazardHintCounts(saveRef.current.hazardHintsSeen);
      engineRef.current?.setLessonsDone(saveRef.current.lessonsDone);
      engineRef.current?.startExpedition(
        stage,
        getSquadCreatures(saveRef.current),
        saveRef.current.powerStones,
        controlMode,
      );
    },
    [controlMode, getSquadCreatures],
  );
  launchStageRef.current = handleLaunchStage;

  const handleReturnCamp = useCallback(() => {
    soundFx.playUiClick();
    previewRef.current = false;
    securedOutcomeRef.current = null;
    setVictorySecured(false);
    setOutcome(null);
    setActiveStage(null);
    setHudSnapshot(null);
    setPlayMode('camp');
    setScreenState('playing');
    engineRef.current?.loadCampScene(getSquadCreatures(saveRef.current));
    if (pendingArrivalRef.current) {
      setArrival({ speciesId: pendingArrivalRef.current, isNew: true });
      pendingArrivalRef.current = null;
    }
  }, [getSquadCreatures]);

  const handleToggleControlMode = useCallback(() => {
    soundFx.playUiClick();
    setControlMode((prev) => {
      // S07.2 : l'Auto n'ouvre qu'après le premier boss (Prairie-3) ; avant, Semi <-> Manuel
      const autoOk = isAutoUnlocked(saveRef.current);
      const next: ControlMode = prev === 'semi' ? (autoOk ? 'auto' : 'manual') : prev === 'auto' ? 'manual' : 'semi';
      engineRef.current?.setControlMode(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundFx.toggleMute();
    setMuted(nextMuted);
  }, []);

  // Global keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (screenState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartFromTitle();
        }
        return;
      }

      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      // A1.2 : Échap ferme toujours la fenêtre du dessus (arrivée, recrue, écran de fin, tiroir du camp)
      if (e.code === 'Escape') {
        const target = escapeTarget({
          arrival: Boolean(arrival),
          recruit: Boolean(recruitedPreview),
          outcome: screenState === 'gameover' && Boolean(outcome),
          drawer: playMode === 'camp' && Boolean(activeDrawer),
        });
        if (target) {
          e.preventDefault();
          if (target === 'arrival') setArrival(null);
          else if (target === 'recruit') setRecruitedPreview(null);
          else if (target === 'outcome') handleReturnCamp();
          else setActiveDrawer(null);
          return;
        }
      }

      if (playMode === 'expedition') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          if (screenState === 'playing') setScreenState('paused');
          else if (screenState === 'paused') setScreenState('playing');
          return;
        }

        if (screenState === 'playing') {
          if (e.code === 'Digit1' || e.code === 'Numpad1') {
            engineRef.current?.triggerAllySkill(0);
          } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
            engineRef.current?.triggerAllySkill(1);
          } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
            engineRef.current?.triggerAllySkill(2);
          } else if (e.code === 'Space') {
            e.preventDefault();
            engineRef.current?.triggerDodge();
          } else if (e.code === 'KeyR' && !e.repeat) {
            engineRef.current?.triggerUltimate();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer, arrival, handleReturnCamp, handleStartFromTitle, handleToggleMute, outcome, playMode, recruitedPreview, screenState]);

  // Separate clean listener for `KeyE` Auto toggle during expedition
  useEffect(() => {
    const onAutoKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (playMode === 'expedition' && screenState === 'playing' && e.code === 'KeyE' && !e.repeat) {
        handleToggleControlMode();
      }
    };
    window.addEventListener('keydown', onAutoKey);
    return () => window.removeEventListener('keydown', onAutoKey);
  }, [handleToggleControlMode, playMode, screenState]);

  // Team & Stones handlers
  const handleToggleSquadMember = (uid: string) => {
    soundFx.playUiClick();
    setSave((prev) => {
      // A2 : règle pure (1 à 3 membres, une lignée une seule fois)
      const nextSave = toggleSquadMember(prev, uid);
      if (nextSave === prev) return prev;
      if (playMode === 'camp') {
        engineRef.current?.loadCampScene(getSquadCreatures(nextSave));
      }
      return nextSave;
    });
  };

  const handleEquipStone = (creatureUid: string, slotIdx: number, stoneId: string) => {
    soundFx.playUiClick();
    setSave((prev) => equipPowerStone(prev, creatureUid, slotIdx, stoneId));
  };

  const handleUnequipStone = (creatureUid: string, slotIdx: number) => {
    soundFx.playUiClick();
    setSave((prev) => unequipPowerStone(prev, creatureUid, slotIdx));
  };

  const handleEquipRune = (
    creatureUid: string,
    slotIdx: number,
    kind: RuneKind | null,
  ) => {
    soundFx.playUiClick();
    setSave((prev) => equipRune(prev, creatureUid, slotIdx, kind));
  };

  const handleEvolve = (creatureUid: string) => {
    const prev = saveRef.current;
    const before = prev.roster.find((c) => c.uid === creatureUid);
    const next = evolveCreature(prev, creatureUid);
    const after = next.roster.find((c) => c.uid === creatureUid);
    if (!before || !after || next === prev) return;

    saveRef.current = next;
    setSave(next);
    setActiveDrawer(null);
    setEvolution({ from: before.speciesId, to: after.speciesId, revealed: false });

    const finish = () => {
      window.clearTimeout(evolutionGuardRef.current);
      setEvolution(null);
      engineRef.current?.loadCampScene(getSquadCreatures(saveRef.current));
    };
    // Filet de sécurité : si la séquence 3D est interrompue, l'habillage ne reste jamais bloqué
    window.clearTimeout(evolutionGuardRef.current);
    evolutionGuardRef.current = window.setTimeout(finish, 6500);

    const engine = engineRef.current;
    if (!engine) {
      finish();
      return;
    }
    engine.playEvolutionSequence(before.speciesId, after.speciesId, {
      onReveal: () => setEvolution((cur) => (cur ? { ...cur, revealed: true } : cur)),
      onDone: finish,
    });
  };
  // V0.2 Quests, Achievements & Local Save Import/Reset handlers
  const handleClaimQuest = (questUid: string) => {
    soundFx.playRewardClaim();
    setSave((prev) => claimQuestReward(prev, questUid));
  };

  const handleClaimAchievement = (achId: string) => {
    soundFx.playRewardClaim();
    setSave((prev) => claimAchievementReward(prev, achId));
  };

  const handleImportSave = (imported: SaveState) => {
    soundFx.playRewardClaim();
    setSave(imported);
    if (playMode === 'camp') {
      engineRef.current?.loadCampScene(getSquadCreatures(imported));
    }
  };

  const claimableCount = countClaimableRewards(save);

  const nextStageDef = activeStage
    ? STAGES.find((s) => s.index === activeStage.index + 1) ?? null
    : null;

  return (
    <MotionConfig reducedMotion="user">
    <main className="relative w-full h-full overflow-hidden bg-[#181E2A]">
      {/* Isolated WebGL 3D Canvas Mount (never re-created by React HUD state) */}
      <div
        ref={canvasMountRef}
        data-testid="voxel-viewport"
        className="fixed inset-0 w-full h-full"
      />

      {DEBUG_ENABLED && (
        <Suspense fallback={null}>
          <DebugOverlay getStats={getDebugStats} />
        </Suspense>
      )}
      {isBench && (
        <Suspense fallback={null}>
          <BenchOverlay getStats={getDebugStats} quality={() => engineRef.current?.getQualityLabel() ?? '—'} />
        </Suspense>
      )}

      {/* Title Screen */}
      {screenState === 'title' && (
        <TitleOverlay
          hasExistingSave={save.starterChosen}
          onStart={handleStartFromTitle}
          onNewAdventure={handleNewAdventure}
        />
      )}

      {/* First-run Starter Selection */}
      {screenState === 'playing' && playMode === 'camp' && !save.starterChosen && (
        <StarterModal onSelectStarter={handleSelectStarter} />
      )}

      {/* Base Camp HUD & Drawers */}
      {screenState === 'playing' && playMode === 'camp' && save.starterChosen && (
        <>
          {/* A3.1 : les lieux du camp sont les menus */}
          <HubOverlay
            getEngine={getEngine}
            enabled={!activeDrawer && !reveal && !arrival && !save.kitchenConversion}
            isOpen={(id) => (id === 'map' ? true : unlockedFeatures(save).has(id === 'carnet' ? 'codex' : id))}
            badges={{
              atelier: save.sealedCubes.length || false,
              carnet: claimableCount || false,
              team: !save.allUnlocked && unlockedFeatures(save).has('team') && !save.unlocksSeen.includes('team'),
            }}
            onOpen={(id) => {
              soundFx.playUiClick();
              const tab = ({ map: 'expeditions', atelier: 'atelier', team: 'team', carnet: 'codex' } as const)[id];
              if (!save.unlocksSeen.includes(tab)) {
                const next = markUnlockSeen(saveRef.current, tab);
                saveRef.current = next;
                setSave(next);
              }
              setActiveDrawer(tab);
            }}
          />
          <CampHud
            save={save}
            activeDrawer={activeDrawer}
            claimableCount={claimableCount}
            dockCollapsed={dockCollapsed}
            muted={muted}
            screenShake={settings.screenShake}
            onToggleShake={handleToggleShake}
            quality={settings.quality}
            onCycleQuality={handleCycleQuality}
            onSelectDrawer={(tab) => {
              soundFx.playUiClick();
              setActiveDrawer((cur) => (tab ? nextDrawer(cur, tab) : null));
            }}
            unlocked={unlockedFeatures(save)}
            unseen={[...unlockedFeatures(save)].filter((f) => !save.allUnlocked && !save.unlocksSeen.includes(f))}
            onSeenUnlock={(f) => {
              const next = markUnlockSeen(saveRef.current, f);
              saveRef.current = next;
              setSave(next);
            }}
            onToggleCollapse={() => {
              soundFx.playUiClick();
              setDockCollapsed((v) => !v);
            }}
            onToggleMute={handleToggleMute}
            onReturnTitle={() => {
              soundFx.playUiClick();
              setActiveDrawer(null);
              setScreenState('title');
            }}
          />

          {/* Tiroirs du camp : fondu d'entrée/sortie (motion) + pop du panneau (CSS) */}
          <AnimatePresence>
            {activeDrawer && (
              <motion.div
                key={activeDrawer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
          {activeDrawer === 'expeditions' && (
            <ExpeditionDrawer
              save={save}
              onLaunchStage={handleLaunchStage}
              onClose={() => setActiveDrawer(null)}
            />
          )}

          {activeDrawer === 'atelier' && (
            <AtelierDrawer save={save} onOpenCube={handleOpenCube} onClose={() => setActiveDrawer(null)} />
          )}

          {activeDrawer === 'team' && (
            <TeamDrawer
              save={save}
              onToggleSquadMember={handleToggleSquadMember}
              onEquipStone={handleEquipStone}
              onUnequipStone={handleUnequipStone}
              onEquipRune={handleEquipRune}
              onEvolve={handleEvolve}
              onClose={() => setActiveDrawer(null)}
            />
          )}

          {activeDrawer === 'quests' && (
            <QuestsDrawer
              save={save}
              onClaimQuest={handleClaimQuest}
              onClaimAchievement={handleClaimAchievement}
              onImportSave={handleImportSave}
              onResetSave={handleNewAdventure}
              onReplayLessons={() => {
                const next = { ...saveRef.current, lessonsDone: [] };
                saveRef.current = next;
                setSave(next);
              }}
              onClose={() => setActiveDrawer(null)}
            />
          )}

          {activeDrawer === 'codex' && (
            <CodexDrawer
              save={save}
              history={codexHistory}
              onSaveAnswer={(ans) => setCodexHistory((prev) => [ans, ...prev])}
              onClose={() => setActiveDrawer(null)}
            />
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Révélation d'un Cube Scellé (A2.4) */}
      {reveal && (
        <SummonReveal
          {...reveal}
          onDone={() => {
            setReveal(null);
            engineRef.current?.loadCampScene(getSquadCreatures(saveRef.current));
          }}
        />
      )}

      {/* Une seule fois après la migration : ce que la cuisine est devenue (A2.2) */}
      {save.kitchenConversion && screenState === 'playing' && playMode === 'camp' && (
        <Modal
          open
          title={FR.ui.atelier.conversionTitre}
          onClose={() => {
            const next = { ...saveRef.current, kitchenConversion: null };
            saveRef.current = next;
            setSave(next);
          }}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm text-[#CBD5E1]">
            {FR.ui.atelier
              .conversionLignes(save.kitchenConversion.baits, save.kitchenConversion.crystal, save.kitchenConversion.stone, save.kitchenConversion.bonds)
              .map((l) => (
                <li key={l}>{l}</li>
              ))}
          </ul>
          <button
            type="button"
            className="voxel-btn block-btn-primary mt-4 rounded-xl border-2 px-5 py-2 font-display font-bold"
            onClick={() => {
              const next = { ...saveRef.current, kitchenConversion: null };
              saveRef.current = next;
              setSave(next);
            }}
          >
            {FR.ui.atelier.compris}
          </button>
        </Modal>
      )}

      {/* Arrivée d'une créature : un clic ou une touche pour passer */}
      <AnimatePresence>
        {arrival && <ArrivalScene key="arrival" speciesId={arrival.speciesId} isNew={arrival.isNew} onDone={() => setArrival(null)} />}
      </AnimatePresence>

      {/* Habillage de l'animation d'évolution (bloque les clics pendant la séquence) */}
      <AnimatePresence>
        {evolution && (
          <EvolutionOverlay
            key="evolution"
            fromSpeciesId={evolution.from}
            toSpeciesId={evolution.to}
            revealed={evolution.revealed}
          />
        )}
      </AnimatePresence>

      {/* Expedition Active HUD */}
      {playMode === 'expedition' && hudSnapshot && screenState !== 'title' && (
        <ExpeditionHud
          hud={hudSnapshot}
          muted={muted}
          onCastSkill={(idx) => engineRef.current?.triggerAllySkill(idx)}
          onDodge={() => engineRef.current?.triggerDodge()}
          onUltimate={() => engineRef.current?.triggerUltimate()}
          onToggleControlMode={handleToggleControlMode}
          autoLocked={!previewRef.current && !isAutoUnlocked(save)}
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState('paused')}
        />
      )}

      {/* Bulle « première fois » */}
      {playMode === 'expedition' && firstTimeTip && screenState === 'playing' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 py-2 rounded-xl bg-[#141A26]/92 border border-[#F4B942] text-[#FAF7F0] text-sm font-semibold max-w-[90vw] text-center" role="status">
          {FIRST_TIME_TEXT[firstTimeTip]}
        </div>
      )}

      {/* Pause Modal */}
      {screenState === 'paused' && activeStage && (
        <PauseModal
          stageName={activeStage.name}
          screenShake={settings.screenShake}
          victorySecured={victorySecured}
          onToggleShake={handleToggleShake}
          onResume={() => setScreenState('playing')}
          onRestart={() => handleLaunchStage(activeStage)}
          onReturnCamp={handleReturnCamp}
        />
      )}

      {/* Victory / Defeat Modal */}
      {screenState === 'gameover' && outcome && activeStage && (
        <OutcomeModal
          outcome={outcome}
          hasNextStage={Boolean(nextStageDef && nextStageDef.index <= save.highestStageIndex)}
          onNextStage={() => {
            if (nextStageDef) handleLaunchStage(nextStageDef);
          }}
          onRetry={() => handleLaunchStage(activeStage)}
          onReturnCamp={handleReturnCamp}
          onOpenMap={() => {
            handleReturnCamp();
            setActiveDrawer('expeditions');
          }}
        />
      )}
    </main>
    </MotionConfig>
  );
}
