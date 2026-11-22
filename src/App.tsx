import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { CampHud, type CampDrawerTab } from './components/CampHud';
import { CodexDrawer } from './components/CodexDrawer';
import { CookingDrawer } from './components/CookingDrawer';
import { ExpeditionDrawer } from './components/ExpeditionDrawer';
import { EvolutionOverlay } from './components/EvolutionOverlay';
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
import { INGREDIENT_LIST, RECIPE_BY_ID, SPECIES, STAGE_BY_ID, STAGES } from './game/catalog';
import {
  applyExpeditionRewards,
  markFirstTimeSeen,
  buildPreviewSave,
  claimAchievementReward,
  claimQuestReward,
  collectCookedCreature,
  countClaimableRewards,
  createInitialSaveState,
  createOwnedCreature,
  equipRune,
  equipPowerStone,
  evolveCreature,
  getPotIngredientCost,
  loadSaveState,
  persistSaveState,
  startCookingPot,
  unequipPowerStone,
} from './game/rules';
import type {
  CodexAnswer,
  ControlMode,
  ExpeditionHudSnapshot,
  ExpeditionOutcome,
  GameScreenState,
  RuneKind,
  OwnedCreature,
  PlayMode,
  PotTier,
  SaveState,
  StageDef,
} from './game/types';
import { getReferenceConfig } from './game/previewConfigs';
import { loadSettings, persistSettings, type GameSettings } from './game/settings';
import { VoxelEngine } from './game/VoxelEngine';

// `?debug=1` : overlay de diagnostic (FPS, draw calls...). Le composant n'est téléchargé que dans ce cas.
const DEBUG_ENABLED =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
const DebugOverlay = lazy(() => import('./components/DebugOverlay'));

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
  const stage = STAGE_BY_ID[params.get('stage') ?? ''];
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
  const [muted, setMuted] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

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
  /** Bulle « première fois » affichée en combat (S04.3). */
  const [firstTimeTip, setFirstTimeTip] = useState<FirstTimeKind | null>(null);
  useEffect(() => {
    if (!firstTimeTip) return;
    const id = window.setTimeout(() => setFirstTimeTip(null), 3800);
    return () => window.clearTimeout(id);
  }, [firstTimeTip]);
  const previewRef = useRef(false); // true : expédition d'aperçu, rien n'est sauvegardé
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
      .filter((c): c is OwnedCreature => Boolean(c));
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
    engine.loadCampScene(
      getSquadCreatures(initialSave),
      initialSave.pot.recipeId,
      initialSave.pot.status,
    );
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

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [getSquadCreatures]);

  // Options de confort (tremblement de caméra) : persistance + synchro moteur
  useEffect(() => {
    persistSettings(settings);
    engineRef.current?.setShakeEnabled(settings.screenShake);
  }, [settings]);

  const handleToggleShake = useCallback(() => {
    soundFx.playUiClick();
    setSettings((prev) => ({ ...prev, screenShake: !prev.screenShake }));
  }, []);

  // Sync Camp 3D pot liquid visual whenever pot state changes in Camp
  useEffect(() => {
    if (playMode === 'camp') {
      engineRef.current?.setPotVisual(save.pot.recipeId, save.pot.status);
    }
  }, [playMode, save.pot.recipeId, save.pot.status]);

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
    engineRef.current?.loadCampScene(
      getSquadCreatures(fresh),
      fresh.pot.recipeId,
      fresh.pot.status,
    );
  }, [getSquadCreatures]);

  const handleSelectStarter = useCallback(
    (speciesId: string) => {
      soundFx.playEvolution();
      const fresh = createInitialSaveState(speciesId, true);
      setSave(fresh);
      engineRef.current?.loadCampScene(
        getSquadCreatures(fresh),
        fresh.pot.recipeId,
        fresh.pot.status,
      );
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
      engineRef.current?.startExpedition(
        stage,
        getSquadCreatures(saveRef.current),
        saveRef.current.powerStones,
        controlMode,
      );
    },
    [controlMode, getSquadCreatures],
  );

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
    engineRef.current?.loadCampScene(
      getSquadCreatures(saveRef.current),
      saveRef.current.pot.recipeId,
      saveRef.current.pot.status,
    );
  }, [getSquadCreatures]);

  const handleToggleControlMode = useCallback(() => {
    soundFx.playUiClick();
    setControlMode((prev) => {
      const next: ControlMode = prev === 'semi' ? 'auto' : prev === 'auto' ? 'manual' : 'semi';
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
      } else if (playMode === 'camp' && e.code === 'Escape' && activeDrawer) {
        setActiveDrawer(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer, handleStartFromTitle, handleToggleMute, playMode, screenState]);

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

  // Cooking Pot handlers
  const handleChangePotTier = (tier: PotTier) => {
    soundFx.playUiClick();
    setSave((prev) => ({
      ...prev,
      pot: { ...prev.pot, tier, slots: [null, null, null, null, null] },
    }));
  };

  const handleAddIngredient = (ingId: string) => {
    soundFx.playUiClick();
    setSave((prev) => {
      const emptyIdx = prev.pot.slots.indexOf(null);
      if (emptyIdx === -1) return prev;
      const nextSlots = [...prev.pot.slots];
      nextSlots[emptyIdx] = ingId;
      return { ...prev, pot: { ...prev.pot, slots: nextSlots } };
    });
  };

  const handleRemovePotSlot = (idx: number) => {
    soundFx.playUiClick();
    setSave((prev) => {
      const nextSlots = [...prev.pot.slots];
      nextSlots[idx] = null;
      return { ...prev, pot: { ...prev.pot, slots: nextSlots } };
    });
  };

  const handleClearPotSlots = () => {
    soundFx.playUiClick();
    setSave((prev) => ({
      ...prev,
      pot: { ...prev.pot, slots: [null, null, null, null, null] },
    }));
  };

  const handleAutoFillPot = () => {
    soundFx.playUiClick();
    setSave((prev) => {
      const cost = getPotIngredientCost(prev.pot.tier);
      const nextSlots = [...prev.pot.slots];
      const tempStock = { ...prev.ingredients };
      for (const id of nextSlots) {
        if (id) tempStock[id] = Math.max(0, (tempStock[id] ?? 0) - cost);
      }
      for (let i = 0; i < 5; i++) {
        if (nextSlots[i] !== null) continue;
        const pick = INGREDIENT_LIST.find((ing) => (tempStock[ing.id] ?? 0) >= cost);
        if (!pick) break;
        nextSlots[i] = pick.id;
        tempStock[pick.id] -= cost;
      }
      return { ...prev, pot: { ...prev.pot, slots: nextSlots } };
    });
  };

  const handleStartCooking = () => {
    setSave((prev) => {
      const next = startCookingPot(prev);
      if (next.pot.status === 'cooking' && next.pot.recipeId) {
        const hex = RECIPE_BY_ID[next.pot.recipeId]?.soupHex ?? '#F4B942';
        engineRef.current?.triggerCookBurstFx(hex);
      }
      return next;
    });
  };

  const handleFastFinishCooking = () => {
    soundFx.playCookBubble();
    setSave((prev) => {
      if (prev.pot.status !== 'cooking') return prev;
      return {
        ...prev,
        pot: { ...prev.pot, expeditionsRemaining: 0, status: 'ready' },
      };
    });
  };

  const handleCollectCreature = () => {
    const { nextSave, creature } = collectCookedCreature(saveRef.current);
    if (creature) {
      soundFx.playVictory();
      engineRef.current?.triggerCookBurstFx('#2FB97A');
      setSave(nextSave);
      setRecruitedPreview(creature);
    }
  };

  // Team & Stones handlers
  const handleToggleSquadMember = (uid: string) => {
    soundFx.playUiClick();
    setSave((prev) => {
      const exists = prev.squadIds.includes(uid);
      let nextSquad: string[];
      if (exists) {
        if (prev.squadIds.length <= 1) return prev; // Keep at least 1 active
        nextSquad = prev.squadIds.filter((id) => id !== uid);
      } else {
        if (prev.squadIds.length >= 3) return prev;
        nextSquad = [...prev.squadIds, uid];
      }
      const nextSave = { ...prev, squadIds: nextSquad };
      if (playMode === 'camp') {
        engineRef.current?.loadCampScene(
          getSquadCreatures(nextSave),
          nextSave.pot.recipeId,
          nextSave.pot.status,
        );
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
      engineRef.current?.loadCampScene(
        getSquadCreatures(saveRef.current),
        saveRef.current.pot.recipeId,
        saveRef.current.pot.status,
      );
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
      engineRef.current?.loadCampScene(
        getSquadCreatures(imported),
        imported.pot.recipeId,
        imported.pot.status,
      );
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
          <CampHud
            save={save}
            activeDrawer={activeDrawer}
            claimableCount={claimableCount}
            dockCollapsed={dockCollapsed}
            muted={muted}
            screenShake={settings.screenShake}
            onToggleShake={handleToggleShake}
            onSelectDrawer={(tab) => {
              soundFx.playUiClick();
              setActiveDrawer((cur) => (cur === tab ? null : tab));
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
                transition={{ duration: 0.16 }}
              >
          {activeDrawer === 'expeditions' && (
            <ExpeditionDrawer
              save={save}
              onLaunchStage={handleLaunchStage}
              onClose={() => setActiveDrawer(null)}
            />
          )}

          {activeDrawer === 'cooking' && (
            <CookingDrawer
              save={save}
              recruitedPreview={recruitedPreview}
              onDismissRecruit={() => setRecruitedPreview(null)}
              onChangePotTier={handleChangePotTier}
              onAddIngredient={handleAddIngredient}
              onRemoveSlot={handleRemovePotSlot}
              onClearSlots={handleClearPotSlots}
              onAutoFillSlots={handleAutoFillPot}
              onStartCooking={handleStartCooking}
              onFastFinishCooking={handleFastFinishCooking}
              onCollectCreature={handleCollectCreature}
              onClose={() => setActiveDrawer(null)}
            />
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
        />
      )}
    </main>
    </MotionConfig>
  );
}
