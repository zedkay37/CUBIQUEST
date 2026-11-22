/**
 * Anciens identifiants des sauvegardes v1 à v3, convertis par `migrateSaveState` (rules.ts).
 *
 * C'est le SEUL fichier du jeu où ces anciens noms ont le droit d'apparaître : il est exempté du test
 * des mots interdits (tools/lexiqueCore.ts). N'y ajouter que des tables de conversion, aucune logique.
 * Un identifiant absent de ces tables et inconnu du catalogue est ignoré sans erreur.
 */
import type { RuneKind } from './types';

/** Pierres de capacité (v1 à v3) -> runes (v4). */
export const LEGACY_RUNE_IDS: Readonly<Record<string, RuneKind>> = {
  broadburst: 'rune_ampleur',
  wait_less: 'rune_cadence',
  whack_whack: 'rune_force',
  share: 'rune_partage',
  crit_focus: 'rune_precision',
  leech: 'rune_vigueur',
};

/** Statistiques renommées ou abandonnées en v5. */
export const LEGACY_STAT_FIELDS = {
  /** Devenue `burstsTriggered` (même nombre). */
  bursts: 'reactionsTriggered',
  /** Meilleur enchaînement d'un combat : abandonné (ne se convertit pas en Trios). */
  bestChain: 'maxCombo',
} as const;

/** Quêtes renommées en v5 (« combo » retiré du vocabulaire). */
export const LEGACY_QUEST_IDS: Readonly<Record<string, string>> = {
  q_combos_3: 'q_bursts_3',
  q_combos_6: 'q_bursts_6',
};

/** Succès renommés en v5. */
export const LEGACY_ACHIEVEMENT_IDS: Readonly<Record<string, string>> = {
  ach_first_combo: 'ach_first_burst',
  ach_combo_master: 'ach_burst_master',
  ach_chain_8: 'ach_trios_5',
};

/** Recettes renommées en v4. */
export const LEGACY_RECIPE_IDS: Readonly<Record<string, string>> = {
  mulligan_stew: 'camp_stew',
  ambrosia_legends: 'summit_feast',
};
