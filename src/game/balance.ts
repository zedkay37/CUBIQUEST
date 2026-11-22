/**
 * ÉQUILIBRAGE — toutes les valeurs réglables des 21 niveaux.
 *
 * Chaque niveau a une entrée dans STAGE_TUNING (un test le vérifie, ainsi que des bornes : PV ennemis
 * 0,5 à 12, attaque 0,2 à 1,5, PV du boss 0,5 à 25). Tout se règle dans ce fichier, puis se mesure avec
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
  'meadow-1': { enemyHpMult: 1, enemyAtkMult: 0.25, bossHpMult: 9 },
  // avant 100 %, boss 2 s -> 77 %, boss ~13 s (seuil raide : bossHpMult 10.5 => 58 %)
  'meadow-2': { enemyHpMult: 1, enemyAtkMult: 0.25, bossHpMult: 11 },
  // avant 85 %, boss 3 s -> 88 %, boss ~14 s, attaque annoncée dans les 3 phases
  'meadow-3': { enemyHpMult: 0.5, enemyAtkMult: 0.2, bossHpMult: 16 },
  // avant 100 %, boss 2 s -> 88 %, boss ~11 s
  'shore-1': { enemyHpMult: 1, enemyAtkMult: 0.35, bossHpMult: 10 },
  // avant 98 %, boss 3 s -> 82 %, boss ~12 s
  'shore-2': { enemyHpMult: 1, enemyAtkMult: 0.2, bossHpMult: 9 },
  // avant 100 %, boss 0,5 s -> 87 %, boss ~17 s (phase 3 : attaque annoncée dans 93 % des combats)
  'shore-3': { enemyHpMult: 0.55, enemyAtkMult: 0.2, bossHpMult: 22 },
  // avant 100 %, boss 1 s -> 93 %, boss ~12 s
  'volcano-1': { enemyHpMult: 1, enemyAtkMult: 0.4, bossHpMult: 13 },
  // avant 100 %, boss 1 s -> 83 %, boss ~12 s
  'volcano-2': { enemyHpMult: 1, enemyAtkMult: 0.25, bossHpMult: 12 },
  // avant 100 %, boss 1 s -> 89 %, boss ~15 s
  'volcano-3': { enemyHpMult: 1, enemyAtkMult: 0.25, bossHpMult: 12 },
  // avant 100 %, boss 0,4 s -> 87 %, boss ~12 s (phase 1 : 98 %)
  'sanctuary-1': { enemyHpMult: 1, enemyAtkMult: 0.36, bossHpMult: 13 },
  // avant 100 %, boss 1 s -> 84 %, boss ~15 s
  'sanctuary-2': { enemyHpMult: 1, enemyAtkMult: 0.2, bossHpMult: 13 },
  // avant 100 %, boss 1,5 s -> 77 %, boss ~12 s. NON ATTEINT : phase 2 trop courte (attaque annoncée
  // dans 60 % des combats) ; allonger le boss fait chuter les victoires sous 50 %. À reprendre en S05.
  'sanctuary-3': { enemyHpMult: 0.7, enemyAtkMult: 0.2, bossHpMult: 15 },
  // --- Toundra Boréale ---
  // avant 8 / 0.6 / 2.2 (75 %, boss 14 s)                -> ~61 %, boss ~24 s
  'tundra-1': { enemyHpMult: 8, enemyAtkMult: 0.274, bossHpMult: 3.4 },
  // avant 8.5 / 0.5 / 1.8 (88 %, boss 14 s)              -> ~60 %, boss ~29 s
  'tundra-2': { enemyHpMult: 8.5, enemyAtkMult: 0.385, bossHpMult: 3.0 },
  // avant 9 / 0.5 / 1.6 (0 %, phase 3 de 2,5 s)          -> ~70 %, phases 15 / 8 / 9 s
  'tundra-3': { enemyHpMult: 9, enemyAtkMult: 0.277, bossHpMult: 3.2 },
  // --- Cime des Orages ---
  // avant 9 / 0.48 / 2.0 (100 %, boss 10 s)              -> ~79 %, boss ~19 s
  'stormpeak-1': { enemyHpMult: 9, enemyAtkMult: 0.438, bossHpMult: 4.0 },
  // avant 9.5 / 0.45 / 1.8 (83 %, boss 18 s)             -> ~74 %, boss ~29 s
  'stormpeak-2': { enemyHpMult: 9.5, enemyAtkMult: 0.385, bossHpMult: 2.92 },
  // avant 10 / 0.45 / 1.9 (70 %, phases 2 et 3 de 4 s)   -> ~74 %, phases 12 / 6,5 / 9 s
  'stormpeak-3': { enemyHpMult: 10, enemyAtkMult: 0.3, bossHpMult: 4.0 },
  // --- Canyon d'Ambre (session 2, réglé directement avec `npm run sim`) ---
  // canyon-1 : seuil très raide — attaque 0.46 => 85 %, 0.465 => 44 % ; affiné par les PV du boss (5.3 => 85 %, 5.5 => 53 %)
  'canyon-1': { enemyHpMult: 10, enemyAtkMult: 0.46, bossHpMult: 5.4 },
  'canyon-2': { enemyHpMult: 10, enemyAtkMult: 0.322, bossHpMult: 4.0 },
  'canyon-3': { enemyHpMult: 10, enemyAtkMult: 0.325, bossHpMult: 6.0 },
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
  /** Rotation des attaques : [en phase 1, en phases 2 et 3]. */
  cycle: [number[], number[]];
  ring?: RingTheme;
  strike?: StrikeTheme;
  eye?: StrikeTheme;
}

export const BOSS_KITS: Record<BossKit, BossKitDef> = {
  classic: { cycle: [[0], [0, 1, 2]] },
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
