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
