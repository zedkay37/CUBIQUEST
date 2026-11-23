/**
 * Anciens identifiants des sauvegardes v1 à v8, convertis par `migrateSaveState` (rules.ts).
 *
 * C'est le SEUL fichier du jeu où ces anciens noms ont le droit d'apparaître : il est exempté du test
 * des mots interdits (tools/lexiqueCore.ts). N'y ajouter que des tables de conversion, et la seule
 * lecture des anciens champs de la cuisine (`readLegacyKitchen`, A2.2).
 * Un identifiant absent de ces tables et inconnu du catalogue est ignoré sans erreur.
 */
import { BIOMES } from './catalog';
import type { BiomeId, ElementType, RuneKind } from './types';

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

/**
 * Ingrédients de la Marmite (v1 à v8) -> élément de l'Appât qu'ils deviennent (A2.2) : rouge -> Feu,
 * bleu -> Eau, jaune -> Foudre, gris -> Roche ; ceux des biomes récents comptent pour l'élément
 * dominant de leur biome. Le Fragment Mystique (`mystic_shard`) devient un cube Cristal, à part.
 */
export const LEGACY_INGREDIENT_ELEMENTS: Readonly<Record<string, ElementType | { biome: BiomeId }>> = {
  ruby_berry: 'fire',
  crimson_root: 'fire',
  azure_drop: 'water',
  frost_crystal: 'water',
  sun_pollen: 'electric',
  amber_honey: 'electric',
  pebble_gray: 'rock',
  snow_lichen: { biome: 'tundra' },
  aurora_petal: { biome: 'tundra' },
  storm_pepper: { biome: 'stormpeak' },
  cloud_fluff: { biome: 'stormpeak' },
  mesa_fig: { biome: 'canyon' },
  amber_resin: { biome: 'canyon' },
};
export const LEGACY_MYSTIC_SHARD = 'mystic_shard';
/** Une tranche de 5 ingrédients d'un même élément donne 1 Appât ; le reste est perdu. */
export const LEGACY_INGREDIENTS_PER_BAIT = 5;

/**
 * Lit l'ancienne cuisine d'une sauvegarde v1 à v8 (champs `ingredients` et `pot`) et dit ce qu'elle devient :
 * Appâts par élément, cubes Cristal (un par Fragment Mystique), cube Pierre (une cuisson en cours ou prête).
 * Tout ce qui est abîmé ou inconnu compte pour zéro.
 */
export function readLegacyKitchen(raw: object): {
  baits: Partial<Record<ElementType, number>>;
  crystalCubes: number;
  stoneCubes: number;
} {
  const obj = raw as { ingredients?: unknown; pot?: unknown };
  const count = (v: unknown) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const perElement: Partial<Record<ElementType, number>> = {};
  let crystalCubes = 0;
  if (obj.ingredients && typeof obj.ingredients === 'object') {
    for (const [id, qty] of Object.entries(obj.ingredients as Record<string, unknown>)) {
      if (id === LEGACY_MYSTIC_SHARD) {
        crystalCubes += count(qty);
        continue;
      }
      const target = Object.hasOwn(LEGACY_INGREDIENT_ELEMENTS, id) ? LEGACY_INGREDIENT_ELEMENTS[id] : undefined;
      if (!target) continue;
      const el = typeof target === 'string' ? target : BIOMES[target.biome].dominantElement;
      perElement[el] = (perElement[el] ?? 0) + count(qty);
    }
  }
  const baits: Partial<Record<ElementType, number>> = {};
  for (const [el, n] of Object.entries(perElement) as [ElementType, number][]) {
    const b = Math.floor(n / LEGACY_INGREDIENTS_PER_BAIT);
    if (b > 0) baits[el] = b;
  }
  const pot = obj.pot && typeof obj.pot === 'object' ? (obj.pot as { status?: unknown }) : null;
  const stoneCubes = pot && (pot.status === 'cooking' || pot.status === 'ready') ? 1 : 0;
  return { baits, crystalCubes, stoneCubes };
}
