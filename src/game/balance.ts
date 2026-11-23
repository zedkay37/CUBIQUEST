/**
 * ÉQUILIBRAGE — toutes les valeurs réglables des 21 niveaux.
 *
 * Chaque niveau a une entrée dans STAGE_TUNING (un test le vérifie, ainsi que des bornes : PV ennemis
 * 0,5 à 12, attaque 0,05 à 1,5, PV du boss 0,5 à 25).
 *
 * S04 (cubes d'élément) : l'Auto a perdu le soin de 22 % du Déchaînement et la plupart de ses Déchaînements
 * (charge réduite) ; sans retouche il perdait presque tout. L'attaque des ennemis (enemyAtkMult) de CHAQUE
 * niveau a donc été multipliée par un facteur de 0,38 à 0,76, mesuré niveau par niveau (3 graines x 40
 * combats) pour rester près des victoires en Auto d'avant la session. Les commentaires « avant / après »
 * ci-dessous décrivent les sessions précédentes ; les valeurs actuelles sont celles de S04 (rapport S04). Tout se règle dans ce fichier, puis se mesure avec
 * `npm run sim` (voir CLAUDE.md), sur au moins 40 combats et 3 graines.
 *
 * Cibles, mesurées en « Auto Total » avec les escouades de `previewConfigs.ts` :
 *  - niveaux récents (Toundra et après) : 50 à 85 % de victoires ;
 *  - douze premiers niveaux (session S03, a minima) : meadow-1 au moins 90 %, les autres 75 à 95 %,
 *    boss d'au moins 8 s ; le vrai réglage de toute la campagne viendra en S05 ;
 *  - chaque phase de boss dure assez pour que le boss y lance au moins une attaque télégraphiée.
 *
 * Ce fichier ne doit rien importer du catalogue (le catalogue l'importe).
 */
import type { BossKit, ElementType, StatusKind } from './types';
import { FR } from '../i18n/fr';

export interface StageTuning {
  /** Multiplie les PV de tous les ennemis du niveau (boss compris). */
  enemyHpMult: number;
  /** Multiplie l'attaque de tous les ennemis du niveau (boss compris). */
  enemyAtkMult: number;
  /** Multiplie encore les PV du boss (se cumule avec enemyHpMult). */
  bossHpMult: number;
}

/**
 * Pourquoi ces multiplicateurs existent : avec la formule d'origine, une escouade équipée tue un
 * boss de fin de jeu en 1 à 2 secondes (voir docs/archives/sim/00-reference-avant.md), ses mécaniques
 * n'apparaissent donc jamais. Les nouveaux niveaux allongent les combats (PV) et allègent les
 * coups (attaque) pour laisser le temps de lire et d'esquiver.
 *
 * Lecture rapide :
 *  - enemyHpMult  ↑  => vagues plus longues ;
 *  - bossHpMult   ↑  => phases de boss plus longues (phase 2 = 25 % des PV, phase 3 = 25 %) ;
 *  - enemyAtkMult ↓  => plus de victoires.
 *
 * ATTENTION — effet de seuil : les dégâts sont arrondis à l'entier et les combats en Auto sont très
 * réguliers, donc le taux de victoire ne varie pas en douceur. Exemple mesuré sur la Mer de Nuages :
 * bossHpMult 2.9 => 85 % de victoires, 3.0 => 43 %. D'où des valeurs à 2 ou 3 décimales : elles sont
 * placées au milieu d'un palier, pas « précises ». Après toute retouche, relancer `npm run sim`.
 *
 * Valeurs réglées en session 2 avec 3 graines x 40 combats par essai. En commentaire :
 * l'ancienne valeur de la session 1 (réglée sur 1 seul combat par niveau) et le taux mesuré.
 */
export const STAGE_TUNING: Record<string, StageTuning> = {
  // --- Douze premiers niveaux (S03 : a minima). Avant : formule d'origine, soit 1 / 1 / 1. ---
  // Mesures : 40 combats x graines 1, 2, 3, en Auto. « boss » = durée moyenne du combat de boss.
  // meadow-1 : avant 21 % (le boss tuait l'escouade de niveau 4 en ~5 s) -> 96 %, boss ~13 s
  'meadow-1': { enemyHpMult: 0.787, enemyAtkMult: 0.087, bossHpMult: 16.2 },
  // avant 100 %, boss 2 s -> 77 %, boss ~13 s (seuil raide : bossHpMult 10.5 => 58 %)
  'meadow-2': { enemyHpMult: 1.129, enemyAtkMult: 0.062, bossHpMult: 19.8 },
  // avant 85 %, boss 3 s -> 88 %, boss ~14 s, attaque annoncée dans les 3 phases
  'meadow-3': { enemyHpMult: 0.628, enemyAtkMult: 0.077, bossHpMult: 25 },
  // avant 100 %, boss 2 s -> 88 %, boss ~11 s
  'shore-1': { enemyHpMult: 1, enemyAtkMult: 0.224, bossHpMult: 10 },
  // avant 98 %, boss 3 s -> 82 %, boss ~12 s
  'shore-2': { enemyHpMult: 1, enemyAtkMult: 0.096, bossHpMult: 9 },
  // avant 100 %, boss 0,5 s -> 87 %, boss ~17 s (phase 3 : attaque annoncée dans 93 % des combats)
  'shore-3': { enemyHpMult: 0.799, enemyAtkMult: 0.101, bossHpMult: 25 },
  // avant 100 %, boss 1 s -> 93 %, boss ~12 s
  'volcano-1': { enemyHpMult: 1.821, enemyAtkMult: 0.138, bossHpMult: 25 },
  // avant 100 %, boss 1 s -> 83 %, boss ~12 s
  'volcano-2': { enemyHpMult: 1.301, enemyAtkMult: 0.065, bossHpMult: 21.6 },
  // avant 100 %, boss 1 s -> 89 %, boss ~15 s
  'volcano-3': { enemyHpMult: 0.94, enemyAtkMult: 0.063, bossHpMult: 18.81 },
  // avant 100 %, boss 0,4 s -> 87 %, boss ~12 s (phase 1 : 98 %)
  'sanctuary-1': { enemyHpMult: 1.6, enemyAtkMult: 0.114, bossHpMult: 23.4 },
  // avant 100 %, boss 1 s -> 84 %, boss ~15 s
  'sanctuary-2': { enemyHpMult: 1, enemyAtkMult: 0.126, bossHpMult: 13 },
  // avant 100 %, boss 1,5 s -> 77 %, boss ~12 s. NON ATTEINT : phase 2 trop courte (attaque annoncée
  // dans 60 % des combats) ; allonger le boss fait chuter les victoires sous 50 %. À reprendre en S05.
  'sanctuary-3': { enemyHpMult: 1.344, enemyAtkMult: 0.053, bossHpMult: 25 },
  // --- Toundra Boréale ---
  // avant 8 / 0.6 / 2.2 (75 %, boss 14 s)                -> ~61 %, boss ~24 s
  'tundra-1': { enemyHpMult: 4.571, enemyAtkMult: 0.146, bossHpMult: 8.99 },
  // avant 8.5 / 0.5 / 1.8 (88 %, boss 14 s)              -> ~60 %, boss ~29 s
  'tundra-2': { enemyHpMult: 8.5, enemyAtkMult: 0.239, bossHpMult: 3 },
  // avant 9 / 0.5 / 1.6 (0 %, phase 3 de 2,5 s)          -> ~70 %, phases 15 / 8 / 9 s
  'tundra-3': { enemyHpMult: 9, enemyAtkMult: 0.125, bossHpMult: 4.01 },
  // --- Cime des Orages ---
  // avant 9 / 0.48 / 2.0 (100 %, boss 10 s)              -> ~79 %, boss ~19 s
  'stormpeak-1': { enemyHpMult: 12, enemyAtkMult: 0.293, bossHpMult: 5.92 },
  // avant 9.5 / 0.45 / 1.8 (83 %, boss 18 s)             -> ~74 %, boss ~29 s
  'stormpeak-2': { enemyHpMult: 9.5, enemyAtkMult: 0.285, bossHpMult: 2.92 },
  // avant 10 / 0.45 / 1.9 (70 %, phases 2 et 3 de 4 s)   -> ~74 %, phases 12 / 6,5 / 9 s
  'stormpeak-3': { enemyHpMult: 5.305, enemyAtkMult: 0.124, bossHpMult: 16.01 },
  // --- Canyon d'Ambre (session 2, réglé directement avec `npm run sim`) ---
  // canyon-1 : seuil très raide — attaque 0.46 => 85 %, 0.465 => 44 % ; affiné par les PV du boss (5.3 => 85 %, 5.5 => 53 %)
  'canyon-1': { enemyHpMult: 10, enemyAtkMult: 0.248, bossHpMult: 5.4 },
  'canyon-2': { enemyHpMult: 7.18, enemyAtkMult: 0.178, bossHpMult: 6.29 },
  'canyon-3': { enemyHpMult: 5.078, enemyAtkMult: 0.135, bossHpMult: 22.23 },
};

/**
 * CUBES D'ÉLÉMENT (S04, plan section 5.1). Durées en secondes.
 *  - un sort allié pose un cube de son élément (duration), qui mûrit en ripenTime ;
 *  - un autre élément sur un cube mûr : Éclat (BURSTS, catalog.ts), Fêlure de crackDuration ;
 *    sur un cube pas mûr : Éclat faible (× weakBurstMult, sans effet) ;
 *  - un troisième élément sur une cible fêlée : Trio (× trioDamageMult, onde de trioSplashRatio dans
 *    trioSplashRadius, −trioCooldownRefund sur les trois recharges), puis trioLock sans cube.
 */
export const CUBE_KIT = {
  duration: 5,
  ripenTime: 1.2,
  weakBurstMult: 1.15,
  crackDuration: 3,
  trioLock: 2,
  trioDamageMult: 2,
  trioSplashRatio: 0.5,
  trioSplashRadius: 5,
  trioCooldownRefund: 1,
  burstUltBonus: 8,
  trioUltBonus: 25,
};

/**
 * Charge du Déchaînement (sur 100) par geste. Les Éclats et les Trios en sont la source principale.
 */
export const ULTIMATE_CHARGE = {
  // S04.4 : avant 2,8 / 6,5 / 8 (soutien) — le Déchaînement redevient rare (plan 5.4)
  basicHit: 0.6,
  skillHit: 2.5,
  burst: CUBE_KIT.burstUltBonus,
  weakBurst: 2,
  trio: CUBE_KIT.trioUltBonus,
  support: 3,
  /** S05 : 14 -> 12 (DODGE_KIT.perfectUlt). */
  perfectDodge: 8, // S06 : 12 -> 8 (DODGE_KIT.perfectUlt)
  /** Secondes sans aucune charge après un Déchaînement. */
  lockAfterUltimate: 2,
};

/**
 * ESQUIVE (S05.1, plan 5.2). Durées en secondes.
 * Parfaite : une attaque annoncée qui aurait touché un allié est annulée par l'invulnérabilité de l'esquive,
 * et l'appui date de `perfectWindow` au plus. Elle se décide à l'impact, une seule fois par appui.
 */
/**
 * Expérience (S06.3). Les XP de base des niveaux sont dans `catalog.ts` (table de la fiche S06.3).
 * - première victoire sur un niveau : XP × firstClearXpMult ;
 * - créatures restées au camp : benchXpShare de l'XP de l'escouade.
 */
export const XP_KIT = {
  /** Multiplie l'XP de base de tous les niveaux : réglé avec `npm run journey` (retour du propriétaire : ~3 parties par niveau). */
  xpScale: 1,
  firstClearXpMult: 2.5,
  benchXpShare: 0.6,
};

/**
 * Paliers d'étoiles (S06.4) : chaque récompense est donnée une seule fois.
 * À 63 (toutes les étoiles) : un titre et un cadre doré, sans objet.
 */
export const STAR_TIERS: { at: number; rune: 'rune_precision' | 'rune_vigueur' | 'rune_partage' | 'rune_cadence' | null }[] = [
  { at: 12, rune: 'rune_precision' },
  { at: 24, rune: 'rune_vigueur' },
  { at: 36, rune: 'rune_partage' },
  { at: 48, rune: 'rune_cadence' },
  { at: 63, rune: null },
];

export const DODGE_KIT = {
  cooldown: 4,
  invuln: 0.5,
  perfectWindow: 0.25, // S06 (retour du propriétaire) : 0,35 -> 0,25
  /** Part de la recharge rendue après une esquive parfaite. */
  perfectRefund: 0, // S06 : plus aucune recharge rendue (avant 0,5)
  perfectUlt: 8, // S06 : 12 -> 8
  /** Ralenti d'une esquive parfaite. */
  perfectSlowMo: 0.2,
  perfectSlowMoScale: 0.5,
};

/**
 * ANNONCES (S05.2, plan 5.3). Délais minimaux entre l'annonce et l'impact par phase de boss, nombre
 * maximal de zones de danger simultanées, rendu.
 */
export const TELEGRAPH_KIT = {
  minWindup: [0.9, 0.75, 0.65] as const,
  maxZones: 3,
  maxZonesMeteor: 5,
  /** Le contour clignote et le « tic » sonne à cette durée de l'impact. */
  warnBefore: 0.35,
  backgroundOpacity: 0.35,
  fillOpacity: 0.55,
  /** La consigne écrite n'apparaît que les N premières fois par attaque (compteur dans la sauvegarde). */
  hintShows: 2,
  /** La caméra recule au plus de cette part quand une zone sort du cadre. */
  cameraBackoff: 0.25,
};

/** Déchaînement selon l'élément du meneur (plan 5.4). Dégâts de base = attaque cumulée × baseMult. */
export const ULTIMATE_KIT = {
  baseMult: 1.35,
  invulnSec: 0.9,
  fireMult: 1.3,
  waterHits: 3,
  waterHitGap: 0.15,
  grassHealRatio: 0.3,
  electricStun: 2,
  electricStunBoss: 1,
  rockShieldRatio: 0.35,
};

/**
 * Kit de boss « Givre » (StageDef.bossKit = 'frost').
 * Les tableaux à 3 valeurs sont indexés par phase : [phase 1, phase 2, phase 3].
 * Les dégâts sont des multiples de l'attaque du boss.
 */
export const FROST_KIT = {
  /** Anneau de Givre : rayon de la zone sûre collée au boss. */
  safeRadius: 2.7,
  /** Anneau de Givre : rayon extérieur de la couronne. */
  ringRadius: [7.0, 8.2, 8.2],
  /** Anneau de Givre : délai entre le télégraphe et l'impact (s). */
  ringWindup: [1.05, 0.9, 0.8],
  ringDamage: 1.5,
  /** Contrecoup central (phases 2 et 3) : rayon = safeRadius + cette marge, délai en secondes. */
  aftershockMargin: 0.9,
  aftershockWindup: 0.78,
  aftershockDamage: 1.4,
  /** Éclats de glace en étoile (phase 3). */
  shardCount: 6,
  shardDamage: 0.85,
} as const;

/**
 * COMPOSITION DES KITS DE BOSS
 *
 * Six attaques télégraphiées existent dans le moteur, numérotées :
 *   0 Frappe circulaire · 1 Double charge en croix · 2 Pluie de météores (communes)
 *   3 Anneau (zone sûre au contact) + Contrecoup · 4 Rafale en ligne · 5 Aspiration puis détonation
 *
 * Un kit ne crée pas d'attaque : il choisit lesquelles enchaîner (`cycle`) et comment les HABILLER
 * (`theme` : texte de la consigne, couleurs, élément des particules, statut existant infligé).
 * Les chiffres (rayons, délais, dégâts) restent ceux de FROST_KIT et STORM_KIT.
 */
export interface RingTheme {
  label: string;
  telegraphColor: string;
  burstColor: string;
  aftershockColor: string;
  shardColor: string;
  fx: ElementType;
  /** Statuts infligés par l'anneau : [en phase 1, en phases 2 et 3]. */
  statuses: [StatusKind[], StatusKind[]];
  sound: 'frost' | 'impact';
}
export interface StrikeTheme {
  label: string;
  color: string;
  fx: ElementType;
  status: StatusKind;
  /** true : éclair voxel + tonnerre à chaque impact. */
  lightning: boolean;
}

export const DEFAULT_RING_THEME: RingTheme = {
  label: FR.balance.anneauDeGivreCollezVousAu,
  telegraphColor: '#0284C7', // bleu soutenu : lisible sur la neige
  burstColor: '#7DD3FC',
  aftershockColor: '#E0F2FE',
  shardColor: '#A5F3FC',
  fx: 'water',
  statuses: [['soaked'], ['soaked', 'rooted']],
  sound: 'frost',
};
export const DEFAULT_STRIKE_THEME: StrikeTheme = {
  label: FR.balance.foudreEnRafaleSortezDeLa,
  color: '#FACC15',
  fx: 'electric',
  status: 'shocked',
  lightning: true,
};
export const DEFAULT_EYE_THEME: StrikeTheme = {
  label: FR.balance.ilDuCycloneEsquivePourFuir,
  color: '#FACC15',
  fx: 'electric',
  status: 'shocked',
  lightning: true,
};

export interface BossKitDef {
  /**
   * Rotation des attaques par phase : [phase 1, phase 2, phase 3]. Avec deux entrées, la seconde sert aux
   * phases 2 et 3. Les mini-boss (niveaux 1 et 2 d'un biome) n'en prennent que la ou les premières attaques.
   */
  cycle: number[][];
  /** Délai de la Frappe circulaire par phase (porté au minimum de la phase si plus court). */
  slamWindup?: [number, number, number];
  /** Mécanique propre au boss de biome (niveau 3 seulement). */
  module?: 'shield' | 'satellites';
  ring?: RingTheme;
  strike?: StrikeTheme;
  eye?: StrikeTheme;
}

export const BOSS_KITS: Record<BossKit, BossKitDef> = {
  classic: { cycle: [[0], [0, 1, 2]] },
  // S05.3 : un kit par biome, une leçon par boss (plan 5.5)
  // Prairie : esquiver. Frappe circulaire lente, puis la pluie (de pétales) s'ajoute.
  meadow: { cycle: [[0], [0, 2]], slamWindup: [1.1, 0.9, 0.8] },
  // Rive : sortir d'un couloir. Lames d'eau en ligne, puis charges en croix.
  shore: {
    cycle: [[4], [4, 1]],
    strike: { label: FR.balance.lamesDEauSortezDeLaLigne, color: '#38BDF8', fx: 'water', status: 'soaked', lightning: false },
  },
  // Crête : l'Éclat est nécessaire (Carapace de magma).
  volcano: { cycle: [[0, 2], [0, 1, 2]], module: 'shield' },
  // Sanctuaire : choisir sa cible, jouer en zone (Satellites).
  sanctuary: { cycle: [[0, 4], [2, 4, 1]], module: 'satellites' },
  frost: { cycle: [[3, 0], [3, 1, 0, 2]] },
  storm: { cycle: [[4, 0], [4, 5, 1, 0]] },
  // Kit « Ambre » (Canyon d'Ambre) : aucune attaque nouvelle. Il recombine l'Anneau du kit Givre,
  // l'Aspiration du kit Orage et les charges/météores communs, habillés en roche et en sable.
  // Le statut infligé devient Brise-Armure (statut existant de l'élément Roche).
  amber: {
    cycle: [[3, 1], [5, 3, 1, 2]],
    ring: {
      label: FR.balance.anneauDAmbreCollezVousAu,
      telegraphColor: '#B91C1C', // rouge sombre : lisible sur le sol ocre
      burstColor: '#F59E0B',
      aftershockColor: '#FDE68A',
      shardColor: '#FBBF24',
      fx: 'rock',
      statuses: [['sunder'], ['sunder', 'rooted']],
      sound: 'impact',
    },
    eye: {
      label: FR.balance.tourbillonDeSableEsquivePourFuir,
      color: '#B91C1C',
      fx: 'rock',
      status: 'sunder',
      lightning: false,
    },
  },
};

/** Kit de boss par biome (le niveau peut le remplacer par `bossKit`). */
export const BIOME_BOSS_KITS: Record<string, BossKit> = {
  meadow: 'meadow',
  shore: 'shore',
  volcano: 'volcano',
  sanctuary: 'sanctuary',
  tundra: 'frost',
  stormpeak: 'storm',
  canyon: 'amber',
};

/** Modules de boss (S05.3), génériques : aucun cas particulier par espèce dans le moteur. */
export const BOSS_MODULES = {
  /** Carapace de magma : bouclier au début de chaque phase. */
  shield: { hpRatio: 0.18, burstFactor: 3, attackSpeedBonus: 0.2 },
  /** Satellites : deux gardiens en phases 2 et 3, le boss subit moitié moins tant qu'un gardien tient. */
  satellites: { count: 2, hpRatio: 0.06, damageTakenMult: 0.5 },
  /** Changement de phase : boss invulnérable, puis silencieux. */
  phaseShift: { invuln: 0.8, silence: 1.0 },
};

/** Kit de boss « Orage » (StageDef.bossKit = 'storm'). Même convention que FROST_KIT. */
export const STORM_KIT = {
  /** Foudre en Rafale : nombre d'impacts en ligne. */
  strikeCount: [5, 7, 9],
  strikeRadius: 1.9,
  /** Délai du premier impact, puis écart entre deux impacts (s). */
  strikeFirstDelay: 0.72,
  strikeInterval: 0.14,
  /** Un allié ne peut encaisser qu'un impact par rafale. */
  strikeDamage: 1.25,
  /** Œil du Cyclone : rayon de la détonation, délai, dégâts, vitesse d'aspiration (unités/s). */
  eyeRadius: [6.0, 6.0, 6.6],
  eyeWindup: [1.35, 1.35, 1.2],
  eyeDamage: 1.4,
  pullSpeed: 3.1,
} as const;
