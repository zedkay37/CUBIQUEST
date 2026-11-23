/**
 * Tests du moteur en mode headless (sans navigateur ni rendu) : cohérence d'état quand on quitte,
 * met en pause ou relance pendant une animation, et libération de la mémoire au changement de scène.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type * as THREE from 'three';
import { installHeadlessDom, withSeededRandom } from '../../tools/headlessDom';
import { STAGE_BY_ID } from './catalog';
import { getReferenceConfig } from './previewConfigs';
import { createOwnedCreature } from './rules';
import type { OwnedCreature, StageDef } from './types';
import { VoxelEngine } from './VoxelEngine';
import { DANGER } from './styleGuide';
import { bossCycle } from './engine/boss';
import { newCast } from './engine/cubes';
import { applyDamageToActor } from './engine/damage';
import { clearProjectilesAndTelegraphs, spawnEnemyTelegraph } from './engine/fx';

installHeadlessDom();

const STEP = 1 / 60;

interface Harness {
  engine: VoxelEngine;
  results: { victory: boolean }[];
  outcomes: { koCount: number; hazardHits: number }[];
  squad: (stage: StageDef) => OwnedCreature[];
  start: (stageId: string) => StageDef;
  run: (seconds: number, until?: () => boolean) => number;
}

function makeHarness(): Harness {
  const results: { victory: boolean }[] = [];
  const outcomes: { koCount: number; hazardHits: number }[] = [];
  const engine = new VoxelEngine(
    null,
    { onHudUpdate: () => {}, onExpeditionComplete: (r) => { results.push({ victory: r.victory }); outcomes.push(r); } },
    { headless: true },
  );
  engine.setScreenState('playing');
  const squad = (stage: StageDef): OwnedCreature[] => {
    const cfg = getReferenceConfig(stage);
    return cfg.squad.map((id, i) => createOwnedCreature(id, cfg.level, cfg.bonus, `t_${i}`));
  };
  return {
    engine,
    results,
    outcomes,
    squad,
    start: (stageId) => {
      const stage = STAGE_BY_ID[stageId];
      engine.setScreenState('playing');
      engine.startExpedition(stage, squad(stage), [], 'auto');
      return stage;
    },
    run: (seconds, until) => {
      let t = 0;
      while (t < seconds && !(until && until())) {
        engine.stepSimulation(STEP);
        t += STEP;
      }
      return t;
    },
  };
}

/** Géométries et matériaux actuellement accrochés à la scène. */
function collectResources(scene: THREE.Scene): Set<THREE.BufferGeometry | THREE.Material> {
  const found = new Set<THREE.BufferGeometry | THREE.Material>();
  scene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) found.add(mesh.geometry);
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) found.add(m);
  });
  return found;
}

test('Moteur: le résultat d\'une expédition n\'est envoyé qu\'une seule fois', () => {
  withSeededRandom(11, () => {
    const h = makeHarness();
    h.start('stormpeak-1');
    h.run(240, () => h.results.length > 0);
    assert.equal(h.results.length, 1);
    // la boucle continue de tourner sous l'écran de fin (fête, confettis) : aucun second envoi
    h.run(30);
    assert.equal(h.results.length, 1);
    h.engine.dispose();
  });
});

test('Moteur: même graine, même combat (la simulation est reproductible)', () => {
  const play = (seed: number) =>
    withSeededRandom(seed, () => {
      const h = makeHarness();
      h.start('tundra-1');
      h.run(240, () => h.results.length > 0);
      const tel = h.engine.getCombatTelemetry();
      h.engine.dispose();
      return { victory: h.results[0]?.victory, elapsed: tel.elapsed, phases: tel.phaseStartedAt, casts: tel.castsByPhase };
    });
  assert.deepEqual(play(5), play(5));
  assert.equal(typeof play(5).victory, 'boolean');
});

test('Moteur: changer de scène libère les géométries et matériaux de l\'ancienne', () => {
  withSeededRandom(3, () => {
    const h = makeHarness();
    const disposed = new Set<unknown>();
    const watch = (set: Set<THREE.BufferGeometry | THREE.Material>) => {
      for (const res of set) {
        (res as THREE.BufferGeometry).addEventListener('dispose', () => disposed.add(res));
      }
    };
    const scene = h.engine.getDebugInfo().scene;

    // expédition en cours (projectiles, télégraphes, ennemis) -> retour au camp
    const stage = h.start('tundra-1');
    h.run(4);
    const duringFight = collectResources(scene);
    assert.ok(duringFight.size > 40);
    watch(duringFight);
    h.engine.loadCampScene(h.squad(stage), null, 'idle');
    const atCamp = collectResources(scene);
    let leaked = 0;
    for (const res of duringFight) if (!atCamp.has(res) && !disposed.has(res)) leaked += 1;
    assert.equal(leaked, 0, 'ressources retirées de la scène mais jamais libérées (expédition -> camp)');

    // camp -> expédition
    h.run(2);
    watch(atCamp);
    h.start('stormpeak-1');
    const nextFight = collectResources(scene);
    leaked = 0;
    for (const res of atCamp) if (!nextFight.has(res) && !disposed.has(res)) leaked += 1;
    assert.equal(leaked, 0, 'ressources retirées de la scène mais jamais libérées (camp -> expédition)');
    h.engine.dispose();
  });
});

test('Moteur: la scène ne grossit pas au fil des allers-retours camp / expédition', () => {
  withSeededRandom(4, () => {
    const h = makeHarness();
    const stage = STAGE_BY_ID['meadow-1'];
    const sizes: string[] = [];
    for (let i = 0; i < 6; i++) {
      h.start('meadow-1');
      h.run(3);
      h.engine.loadCampScene(h.squad(stage), null, 'idle');
      h.run(1);
      const d = h.engine.getDebugInfo();
      assert.equal(d.telegraphs, 0);
      assert.equal(d.projectiles, 0);
      sizes.push(`${d.worldNodes}/${d.actorNodes}/${d.fxNodes}`);
    }
    assert.equal(new Set(sizes).size, 1, `tailles de scène : ${sizes.join(' ')}`);
    h.engine.dispose();
  });
});

test('Moteur: quitter ou relancer pendant l\'entrée du boss laisse un état propre', () => {
  withSeededRandom(8, () => {
    const h = makeHarness();
    const stage = h.start('meadow-1');
    h.run(60, () => h.engine.getDebugInfo().bossIntroActive);
    assert.equal(h.engine.getDebugInfo().bossIntroActive, true);

    // retour au camp en pleine cinématique
    h.engine.loadCampScene(h.squad(stage), null, 'idle');
    assert.equal(h.engine.getDebugInfo().bossIntroActive, false);
    assert.equal(h.engine.getDebugInfo().playMode, 'camp');
    h.run(5);
    assert.equal(h.results.length, 0, 'aucun résultat fantôme après avoir quitté');

    // relance en pleine cinématique : le nouveau combat repart de zéro
    h.start('meadow-1');
    h.run(60, () => h.engine.getDebugInfo().bossIntroActive);
    h.start('meadow-1');
    const d = h.engine.getDebugInfo();
    assert.equal(d.bossIntroActive, false);
    const tel = h.engine.getCombatTelemetry();
    assert.equal(tel.elapsed, 0);
    assert.equal(tel.bossAppearedAt, -1);
    // ce combat-là va au bout et n'envoie qu'un résultat
    h.run(240, () => h.results.length > 0);
    assert.equal(h.results.length, 1);
    h.engine.dispose();
  });
});

test('Moteur: quitter avec des télégraphes au sol ne déclenche rien après coup', () => {
  withSeededRandom(21, () => {
    const h = makeHarness();
    const stage = h.start('tundra-3');
    h.run(120, () => h.engine.getDebugInfo().telegraphs > 0 && h.engine.getCombatTelemetry().castsByPhase[0] > 0);
    assert.ok(h.engine.getDebugInfo().telegraphs > 0);
    h.engine.loadCampScene(h.squad(stage), null, 'idle');
    assert.equal(h.engine.getDebugInfo().telegraphs, 0);
    h.run(8); // les anciens rappels d'attaque ne doivent ni planter ni terminer un combat
    assert.equal(h.results.length, 0);
    h.engine.dispose();
  });
});

test('Moteur: la pause gèle le combat, la reprise le relance', () => {
  withSeededRandom(2, () => {
    const h = makeHarness();
    h.start('tundra-1');
    h.run(3);
    const before = h.engine.getCombatTelemetry().elapsed;
    assert.ok(before > 2.5);
    h.engine.setScreenState('paused');
    h.run(5);
    assert.equal(h.engine.getCombatTelemetry().elapsed, before);
    assert.equal(h.results.length, 0);
    h.engine.setScreenState('playing');
    h.run(1);
    assert.ok(h.engine.getCombatTelemetry().elapsed > before + 0.5);
    h.engine.dispose();
  });
});

test('Moteur: animation d\'évolution — menée à terme une fois, ou abandonnée proprement', () => {
  withSeededRandom(6, () => {
    const h = makeHarness();
    const stage = STAGE_BY_ID['meadow-1'];
    h.engine.loadCampScene(h.squad(stage), null, 'idle');

    // séquence complète
    let reveals = 0;
    let dones = 0;
    h.engine.playEvolutionSequence('pyrocube', 'flambrix', { onReveal: () => reveals++, onDone: () => dones++ });
    assert.equal(h.engine.getDebugInfo().evolutionActive, true);
    h.run(10);
    assert.equal(reveals, 1);
    assert.equal(dones, 1);
    assert.equal(h.engine.getDebugInfo().evolutionActive, false);

    // séquence interrompue par un départ en expédition : plus aucun rappel, pas d'état résiduel
    h.engine.loadCampScene(h.squad(stage), null, 'idle');
    let lateCalls = 0;
    h.engine.playEvolutionSequence('aquabloc', 'corallix', { onReveal: () => lateCalls++, onDone: () => lateCalls++ });
    h.run(1);
    h.start('meadow-1');
    assert.equal(h.engine.getDebugInfo().evolutionActive, false);
    h.run(8);
    assert.equal(lateCalls, 0);

    // hors du camp, la séquence se termine immédiatement (l'appelant n'attend jamais pour rien)
    let immediate = 0;
    h.engine.playEvolutionSequence('bourgeon', 'feuilloc', { onDone: () => immediate++ });
    assert.equal(immediate, 1);

    h.engine.dispose();
    h.engine.dispose(); // un second dispose ne plante pas
  });
});

test('diagnostic : getDebugStats compte les entités et ne mesure aucun rendu en headless', () => {
  withSeededRandom(11, () => {
    const h = makeHarness();
    h.engine.loadCampScene(h.squad(STAGE_BY_ID['meadow-1']), null, 'idle');
    const camp = h.engine.getDebugStats();
    assert.equal(camp.entities, 3, 'au camp : les 3 créatures de l’escouade');
    assert.equal(camp.drawCalls, 0);
    assert.equal(camp.frames, 0, 'aucune image affichée sans boucle de rendu');

    h.start('meadow-1');
    h.run(1);
    const fight = h.engine.getDebugStats();
    assert.ok(fight.entities > 3, `alliés + ennemis attendus, reçu ${fight.entities}`);
    assert.ok(fight.particles >= 0 && fight.particles <= 320);
    h.engine.dispose();
  });
});

test('outils : l’option cubes=false coupe les cubes, le jeu normal les garde', () => {
  const play = (cubes: boolean | undefined): number =>
    withSeededRandom(3, () => {
      let triggered = -1;
      const engine = new VoxelEngine(
        null,
        { onHudUpdate: () => {}, onExpeditionComplete: (r) => (triggered = r.burstsTriggered) },
        cubes === undefined ? { headless: true } : { headless: true, cubes },
      );
      const stage = STAGE_BY_ID['tundra-1'];
      const cfg = getReferenceConfig(stage);
      engine.setScreenState('playing');
      engine.startExpedition(
        stage,
        cfg.squad.map((id, i) => createOwnedCreature(id, cfg.level, cfg.bonus, `r_${i}`)),
        [],
        'auto',
      );
      for (let t = 0; t < 300 && triggered < 0; t += STEP) engine.stepSimulation(STEP);
      engine.dispose();
      return triggered;
    });
  const normal = play(undefined);
  assert.ok(normal > 0, `le combat de référence doit déclencher des Éclats (reçu ${normal})`);
  assert.equal(play(true), normal, 'cubes=true est le comportement par défaut');
  assert.equal(play(false), 0);
});

/** Un combat mené jusqu'à l'instant où le dernier ennemi tombe (bannière « VICTOIRE », résultat pas encore envoyé). */
function runToVictoryBanner(h: Harness, secured: unknown[]): void {
  // escouade surpuissante : le test porte sur la victoire, pas sur l'équilibrage
  const stage = STAGE_BY_ID['volcano-1'];
  h.engine.setScreenState('playing');
  h.engine.startExpedition(stage, ['ignisaur', 'abyssocube', 'bourgeoliath'].map((id, i) => createOwnedCreature(id, 50, 3000, `fort_${i}`)), [], 'auto');
  h.run(240, () => h.engine.expeditionEnded && h.engine.pendingVictory);
  assert.equal(h.engine.pendingVictory, true, 'le combat de référence doit être gagné');
  assert.equal(h.results.length, 0, 'la fête de victoire n’est pas finie : l’écran de fin n’est pas encore demandé');
  assert.equal(secured.length, 1, 'la victoire est acquise à l’instant où le dernier ennemi tombe');
}

function makeVictoryHarness(): { h: Harness; secured: { victory: boolean }[] } {
  const h = makeHarness();
  const secured: { victory: boolean }[] = [];
  h.engine.callbacks.onVictorySecured = (r) => secured.push({ victory: r.victory });
  return { h, secured };
}

test('Victoire: pause pendant la bannière puis reprise — récompenses acquises une fois, écran de fin une fois', () => {
  withSeededRandom(11, () => {
    const { h, secured } = makeVictoryHarness();
    runToVictoryBanner(h, secured);
    h.engine.setScreenState('paused');
    h.run(5);
    assert.equal(secured.length, 1);
    assert.equal(h.results.length, 0, 'en pause, rien n’avance');
    h.engine.setScreenState('playing');
    h.run(30);
    assert.deepEqual(secured, [{ victory: true }]);
    assert.deepEqual(h.results, [{ victory: true }]);
    h.engine.dispose();
  });
});

test('Victoire: pause pendant la bannière puis abandon — la victoire reste acquise, une seule fois', () => {
  withSeededRandom(11, () => {
    const { h, secured } = makeVictoryHarness();
    const stage = STAGE_BY_ID['volcano-1'];
    // retour au camp
    runToVictoryBanner(h, secured);
    h.engine.setScreenState('paused');
    h.run(2);
    h.engine.loadCampScene(h.squad(stage), null, 'idle');
    h.engine.setScreenState('playing');
    h.run(10);
    assert.deepEqual(secured, [{ victory: true }], 'quitter après la victoire ne la fait pas perdre');
    assert.equal(h.results.length, 0, 'pas d’écran de fin pour un combat quitté');

    h.engine.dispose();
  });
});

test('Victoire: « recommencer » pendant la bannière — la victoire acquise reste, le combat suivant compte à part', () => {
  withSeededRandom(11, () => {
    const { h, secured } = makeVictoryHarness();
    runToVictoryBanner(h, secured);
    h.engine.setScreenState('paused');
    h.start('volcano-1');
    assert.equal(secured.length, 1, 'relancer ne retire ni ne répète la victoire déjà acquise');
    h.run(240, () => h.results.length > 0);
    h.run(30);
    // le second combat se termine une fois, et n'annonce une victoire que s'il est gagné
    assert.equal(h.results.length, 1);
    assert.equal(secured.length, 1 + (h.results[0].victory ? 1 : 0));
    h.engine.dispose();
  });
});

test('Victoire: une défaite n’est jamais annoncée comme victoire acquise', () => {
  withSeededRandom(3, () => {
    const { h, secured } = makeVictoryHarness();
    const stage = STAGE_BY_ID['stormpeak-3'];
    // escouade de niveau 1 : défaite certaine
    h.engine.setScreenState('playing');
    h.engine.startExpedition(stage, getReferenceConfig(stage).squad.map((id, i) => createOwnedCreature(id, 1, 0, `faible_${i}`)), [], 'auto');
    h.run(240, () => h.results.length > 0);
    assert.deepEqual(h.results, [{ victory: false }]);
    assert.equal(secured.length, 0);
    h.engine.dispose();
  });
});

test('Cubes: aucun Trio en Auto, des Éclats oui', () => {
  withSeededRandom(4, () => {
    const h = makeHarness();
    h.start('tundra-1');
    h.run(240, () => h.results.length > 0);
    assert.ok(h.engine.burstsTriggered + h.engine.weakBurstsTriggered > 0);
    assert.equal(h.engine.triosTriggered, 0);
    h.engine.dispose();
  });
});

test('Cubes: un sort de zone ne déclenche qu’un Éclat à effet et qu’un Trio', () => {
  withSeededRandom(5, () => {
    const h = makeHarness();
    h.start('tundra-1');
    h.engine.controlMode = 'semi';
    h.run(1.5);
    const enemies = h.engine.enemies.filter((e) => !e.fainted && !e.removed);
    assert.ok(enemies.length >= 2);
    const caster = h.engine.allies[0];
    for (const a of h.engine.allies) a.shieldHp = 0;
    // cubes mûrs partout : un lancer de Roche les fait tous éclater, mais un seul Rempart
    for (const e of enemies) e.cube = { element: 'fire', age: 2, remaining: 3 };
    const cast = newCast();
    for (const e of enemies) applyDamageToActor(h.engine, e, 10, caster, true, false, '#fff', 'rock', true, cast);
    assert.equal(h.engine.burstsTriggered, enemies.length);
    for (const a of h.engine.allies) if (!a.fainted) assert.equal(a.shieldHp, Math.round(a.maxHp * 0.15));
    // toutes fêlées (feu + roche) : un lancer de Foudre ne fait qu'un Trio
    const trioCast = newCast();
    for (const e of enemies) applyDamageToActor(h.engine, e, 10, caster, true, false, '#fff', 'electric', true, trioCast);
    assert.equal(h.engine.triosTriggered, 1);
    h.engine.dispose();
  });
});

test('Déchaînement: l’effet suit le meneur, plus de soin automatique, pas de charge pendant 2 s', () => {
  withSeededRandom(6, () => {
    const h = makeHarness();
    h.start('tundra-1'); // meneur : Ignisaur (Feu)
    h.engine.controlMode = 'semi';
    h.run(3);
    const leader = h.engine.allies[0];
    assert.equal(leader.rig.species.element, 'fire');
    const mate = h.engine.allies[1];
    mate.hp = Math.round(mate.maxHp * 0.5);
    const hpBefore = mate.hp;
    h.engine.ultimateCharge = 100;
    assert.equal(h.engine.triggerUltimate(), true);
    assert.equal(mate.hp, hpBefore, 'meneur Feu : aucun soin');
    assert.equal(h.engine.ultimateLockTimer, 2);
    // pendant le verrou, aucun geste ne recharge
    h.run(1.5);
    assert.equal(h.engine.ultimateCharge, 0);
    // meneur Psy : les trois sorts sont prêts
    for (const a of h.engine.allies) a.skillCooldown = 4;
    const psy = h.engine.allies[0];
    const realElement = psy.rig.species.element;
    (psy.rig.species as { element: string }).element = 'psychic';
    h.engine.ultimateCharge = 100;
    h.engine.triggerUltimate();
    (psy.rig.species as { element: string }).element = realElement;
    for (const a of h.engine.allies) if (!a.fainted) assert.equal(a.skillCooldown, 0);
    h.engine.dispose();
  });
});

/** Une attaque annoncée qui couvre toute l'arène, d'impact dans `impactIn` secondes ; esquive à `pressBefore` s de l'impact. */
function dodgeScenario(pressBefore: number): { perfect: number; avoided: number; hits: number } {
  return withSeededRandom(8, () => {
    const h = makeHarness();
    h.start('tundra-1');
    h.engine.controlMode = 'semi';
    h.run(2.5);
    // aucune autre attaque pendant le test : ennemis étourdis, annonces en cours retirées
    clearProjectilesAndTelegraphs(h.engine);
    for (const e of h.engine.enemies) e.stunTimer = 30;
    const boss = h.engine.enemies.find((e) => !e.fainted && !e.removed)!;
    const impactIn = 1.2;
    // on ne compte que ce que produit CETTE attaque (mesuré pendant son impact)
    const r = { perfect: 0, avoided: 0, hits: 0 };
    spawnEnemyTelegraph(h.engine, 0, 0, 40, impactIn, false, 0, 0, () => {
      const before = { perfect: h.engine.perfectDodges, avoided: h.engine.hazardsAvoided, hits: h.engine.hazardHitsTaken };
      for (const ally of h.engine.allies) if (!ally.fainted) applyDamageToActor(h.engine, ally, 5, boss, true, false, '#f00');
      r.perfect = h.engine.perfectDodges - before.perfect;
      r.avoided = h.engine.hazardsAvoided - before.avoided;
      r.hits = h.engine.hazardHitsTaken - before.hits;
    });
    h.run(impactIn - pressBefore);
    assert.equal(h.engine.triggerDodge(), true);
    h.run(pressBefore + 0.1);
    h.engine.dispose();
    return r;
  });
}

test('Esquive: appui 0,2 s avant l’impact = parfaite (une seule fois par appui)', () => {
  const r = dodgeScenario(0.2);
  assert.equal(r.perfect, 1);
  assert.ok(r.avoided >= 1);
  assert.equal(r.hits, 0);
});

test('Esquive: appui 0,45 s avant l’impact = esquivée, pas parfaite', () => {
  const r = dodgeScenario(0.45);
  assert.equal(r.perfect, 0);
  assert.ok(r.avoided >= 1);
  assert.equal(r.hits, 0);
});

test('Esquive: appui 0,8 s avant l’impact et resté dans la zone = touché', () => {
  const r = dodgeScenario(0.8);
  assert.equal(r.perfect, 0);
  assert.equal(r.avoided, 0);
  assert.ok(r.hits >= 1);
});

test('Esquive: aucun mode de contrôle n’esquive à la place du joueur', () => {
  withSeededRandom(9, () => {
    const h = makeHarness();
    h.start('tundra-1');
    h.run(240, () => h.results.length > 0);
    assert.equal(h.engine.dodgesUsed, 0);
    h.engine.dispose();
  });
});

test('Annonces: aucun délai sous le minimum de sa phase (0,9 / 0,75 / 0,65 s)', () => {
  const seen: number[][] = [[], [], []];
  for (const id of ['meadow-3', 'shore-3', 'volcano-3', 'tundra-3', 'stormpeak-3', 'canyon-3']) {
    withSeededRandom(12, () => {
      const h = makeHarness();
      h.start(id);
      h.run(240, () => h.results.length > 0);
      h.engine.getCombatTelemetry().minWindupByPhase.forEach((w, i) => {
        if (w >= 0) seen[i].push(w);
      });
      h.engine.dispose();
    });
  }
  const min = [0.9, 0.75, 0.65];
  for (let i = 0; i < 3; i++) for (const w of seen[i]) assert.ok(w >= min[i] - 1e-9, `phase ${i + 1} : délai ${w}`);
  assert.ok(seen[0].length > 0 && seen[1].length > 0, 'des annonces ont bien été observées');
});

test('Annonces: toutes les zones de danger utilisent DANGER, jamais la couleur du kit', () => {
  withSeededRandom(13, () => {
    const h = makeHarness();
    h.start('tundra-1');
    spawnEnemyTelegraph(h.engine, 0, 0, 3, 1, false, 0, 0, () => {}, { color: '#00FF00', phase: 1 });
    spawnEnemyTelegraph(h.engine, 0, 0, 5, 1, false, 0, 0, () => {}, { color: '#0000FF', innerRadius: 2 });
    spawnEnemyTelegraph(h.engine, 0, 0, 6, 1, true, 1, 0, () => {}, { color: '#FF00FF' });
    const zones = h.engine.telegraphs.filter((t) => t.isEnemyHazard);
    assert.ok(zones.length >= 3);
    for (const z of zones) {
      z.mesh.traverse((node) => {
        const mat = (node as { material?: { color?: { getHexString(): string } } }).material;
        if (mat?.color && node.name !== 'outlineDark' && node.name !== 'outlineLight') {
          assert.equal(`#${mat.color.getHexString()}`.toUpperCase(), DANGER.toUpperCase());
        }
      });
    }
    h.engine.dispose();
  });
});

test('Annonces: la consigne écrite d’une attaque ne s’affiche que deux fois', () => {
  const h = makeHarness();
  const shown: string[] = [];
  h.engine.callbacks.onHazardHint = (k) => shown.push(k);
  h.engine.setHazardHintCounts({ eye: 1 });
  for (let i = 0; i < 3; i++) h.engine.showHazardHint('ring', 'texte', 1);
  h.engine.showHazardHint('eye', 'texte', 1);
  h.engine.showHazardHint('eye', 'texte', 1);
  assert.deepEqual(shown, ['ring', 'ring', 'eye']);
  h.engine.dispose();
});

test('Boss: mini-boss (une puis deux attaques), modules Carapace et Satellites, changement de phase', () => {
  const kit = { cycle: [[0], [0, 2]] };
  assert.deepEqual(bossCycle(1, kit, 1), [0]);
  assert.deepEqual(bossCycle(2, kit, 2), [0, 2]);
  assert.deepEqual(bossCycle(3, { cycle: [[4], [4, 1]] }, 3), [4, 1]);
  withSeededRandom(14, () => {
    const h = makeHarness();
    // Crête, niveau 3 : bouclier de 18 % dès l'arrivée du boss
    h.engine.setScreenState('playing');
    h.engine.startExpedition(STAGE_BY_ID['volcano-3'], h.squad(STAGE_BY_ID['volcano-3']), [], 'semi');
    h.run(120, () => h.engine.enemies.some((e) => e.isBoss));
    const boss = h.engine.enemies.find((e) => e.isBoss)!;
    assert.equal(boss.shieldHp, Math.round(boss.maxHp * 0.18));
    // un coup qui fait éclater un cube compte triple contre le bouclier
    const caster = h.engine.allies[0];
    boss.cube = { element: caster.rig.species.element === 'fire' ? 'water' : 'fire', age: 5, remaining: 3 };
    const before = boss.shieldHp;
    boss.invulnTimer = 0;
    applyDamageToActor(h.engine, boss, 10, caster, true, false, '#fff', caster.rig.species.element, true);
    assert.ok(before - boss.shieldHp >= 3 * 10, `bouclier ${before} -> ${boss.shieldHp}`);
    h.engine.dispose();
  });
  withSeededRandom(15, () => {
    const h = makeHarness();
    h.engine.setScreenState('playing');
    h.engine.startExpedition(STAGE_BY_ID['sanctuary-3'], h.squad(STAGE_BY_ID['sanctuary-3']), [], 'semi');
    h.run(120, () => h.engine.enemies.some((e) => e.isBoss));
    const boss = h.engine.enemies.find((e) => e.isBoss)!;
    boss.invulnTimer = 0;
    // passage en phase 2 : deux gardiens, boss invulnérable, zones annulées
    boss.hp = Math.round(boss.maxHp * 0.52);
    applyDamageToActor(h.engine, boss, Math.round(boss.maxHp * 0.05), h.engine.allies[0], false, false, '#fff');
    assert.equal(boss.bossPhase, 2);
    assert.equal(h.engine.enemies.filter((e) => e.guardianOf === boss.id).length, 2);
    assert.ok(boss.invulnTimer > 0);
    assert.equal(h.engine.telegraphs.filter((t) => t.isEnemyHazard).length, 0);
    // tant qu'un gardien tient, le boss subit moitié moins
    boss.invulnTimer = 0;
    const hp = boss.hp;
    applyDamageToActor(h.engine, boss, 100, h.engine.allies[0], false, false, '#fff');
    assert.equal(hp - boss.hp, 50);
    h.engine.dispose();
  });
});

test('Étoiles (S06): le résultat compte les K.O. et les attaques subies ; relancer remet tout à zéro', () => {
  withSeededRandom(5, () => {
    const h = makeHarness();
    h.start('stormpeak-1');
    h.run(240, () => h.results.length > 0);
    const r = h.outcomes[0];
    assert.equal(r.koCount, h.engine.allyKos);
    assert.equal(r.hazardHits, h.engine.hazardHitsTaken);
    assert.ok(r.koCount >= 0 && r.hazardHits >= 0);
    // relancer : compteurs remis à zéro (état transitoire)
    h.engine.allyKos = 4;
    h.engine.markRetryClick();
    h.start('meadow-1');
    assert.equal(h.engine.allyKos, 0);
    h.engine.dispose();
  });
});
