/**
 * ÉQUILIBRAGE — toutes les valeurs réglables des niveaux ajoutés depuis la Giga Update.
 *
 * Règle du projet : les 12 niveaux historiques (Prairie -> Sanctuaire) n'ont AUCUNE entrée ici
 * et gardent la formule d'origine (un test le vérifie). Tout se règle dans ce fichier, puis se
 * mesure avec `npm run sim` (voir CLAUDE.md).
 *
 * Cibles de réglage, mesurées en « Auto Total » avec les escouades de `previewConfigs.ts` :
 *  - 50 à 85 % de victoires ;
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
