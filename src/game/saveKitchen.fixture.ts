/**
 * Anciens champs de la cuisine (sauvegardes v1 à v8), pour les tests de migration A2.2 (save.test.ts).
 * Comme saveV3.fixture.ts, ce fichier DOIT citer les anciens noms : il est exempté du test des mots interdits.
 * Chaque objet se pose sur une sauvegarde v8 ; le test vérifie ce qu'il devient (Appâts, cubes).
 */

/** Début de partie : rien en réserve, marmite au repos. */
export const KITCHEN_EARLY = {
  ingredients: {},
  pot: { tier: 'iron', slots: [null, null, null, null, null], status: 'idle', recipeId: null, expeditionsRemaining: 0, expeditionsTotal: 0 },
  unlockedPotTiers: ['iron'],
  discoveredRecipeIds: [],
};

/**
 * Milieu de partie : rouges 7 + 4 = 11 -> 2 Appâts Feu ; bleus 4 -> 0 ; jaunes 5 -> 1 Appât Foudre ;
 * gris 3 -> 0 ; une cuisson en cours -> 1 cube Pierre.
 */
export const KITCHEN_MID = {
  ingredients: { ruby_berry: 7, crimson_root: 4, azure_drop: 4, sun_pollen: 5, pebble_gray: 3 },
  pot: { tier: 'bronze', slots: ['ruby_berry', 'ruby_berry', 'ruby_berry', 'sun_pollen', 'pebble_gray'], status: 'cooking', recipeId: 'fiery_soup', expeditionsRemaining: 1, expeditionsTotal: 2 },
  unlockedPotTiers: ['iron', 'bronze'],
  discoveredRecipeIds: ['camp_stew', 'fiery_soup'],
};

/**
 * Fin de partie, tous les biomes : rouges 30 + 12 = 42 -> 8 Feu ; bleus 20 + 9 + Toundra 8 + 4 = 41 -> 8 Eau ;
 * jaunes 15 + 6 + Cime 10 + 9 = 40 -> 8 Foudre ; gris 22 + Canyon 7 + 6 = 35 -> 7 Roche (31 Appâts) ;
 * 6 Fragments Mystiques -> 6 cubes Cristal ; un plat prêt -> 1 cube Pierre. Un identifiant inconnu est ignoré.
 */
export const KITCHEN_LATE = {
  ingredients: {
    ruby_berry: 30,
    crimson_root: 12,
    azure_drop: 20,
    frost_crystal: 9,
    snow_lichen: 8,
    aurora_petal: 4,
    sun_pollen: 15,
    amber_honey: 6,
    storm_pepper: 10,
    cloud_fluff: 9,
    pebble_gray: 22,
    mesa_fig: 7,
    amber_resin: 6,
    mystic_shard: 6,
    ingredient_fantome: 50,
  },
  pot: { tier: 'gold', slots: [null, null, null, null, null], status: 'ready', recipeId: 'aurora_banquet', expeditionsRemaining: 0, expeditionsTotal: 3 },
  unlockedPotTiers: ['iron', 'bronze', 'silver', 'gold'],
  discoveredRecipeIds: ['camp_stew', 'fiery_soup', 'aurora_banquet', 'mesa_roast'],
};

/** Quête de cuisine retirée du jeu en A2.2 (identifiant de modèle d'une sauvegarde v8). */
export const REMOVED_KITCHEN_QUEST_ID = 'q_cook_1';

/** Réserve d'une sauvegarde v1 (rules.test.ts) : 19 rouges -> 3 Appâts Feu, le reste perdu. */
export const KITCHEN_RED_19 = { ingredients: { ruby_berry: 19 } };
