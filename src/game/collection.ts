/**
 * Niveau de collection du Carnet (spec Atelier, A3.2) : règles pures.
 *
 * Les points se CALCULENT à partir de la sauvegarde (formes possédées, évolutions vues, Lien, variantes,
 * Runes, exploits) : ils ne sont jamais stockés, donc ne peuvent pas se désynchroniser. Seuls les paliers
 * réclamés (`collectionTiersClaimed`) et les titres obtenus (`titles`) sont enregistrés.
 */
import { COLLECTION_POINTS, COLLECTION_TIERS, SUMMON, type CollectionTier } from './balance';
import { ACHIEVEMENTS, RUNE_ORDER, SPECIES } from './catalog';
import { addSealedCubes, lineageOf } from './summon';
import type { ElementType, SaveState } from './types';

export type CollectionSave = Pick<
  SaveState,
  'roster' | 'discoveredSpeciesIds' | 'bonds' | 'variantsUnlocked' | 'runeBag' | 'claimedAchievementIds'
>;

/** Une forme évoluée (stade 2 ou 3) : elle descend d'une autre forme. */
export function isEvolvedForm(speciesId: string): boolean {
  return Boolean(SPECIES[speciesId]) && lineageOf(speciesId) !== speciesId;
}

/** Détail des points, catégorie par catégorie (affiché dans le Carnet). */
export function collectionBreakdown(save: CollectionSave): {
  ownedForms: number;
  evolutionsSeen: number;
  bondStars: number;
  variants: number;
  runes: number;
  achievements: number;
  total: number;
} {
  const ownedForms = new Set(save.roster.map((c) => c.speciesId).filter((id) => SPECIES[id])).size;
  const evolutionsSeen = new Set(save.discoveredSpeciesIds.filter(isEvolvedForm)).size;
  const bondStars = Object.values(save.bonds ?? {}).reduce(
    (n, b) => n + Math.floor(Math.max(0, Math.min(SUMMON.bondMax, Number(b) || 0))),
    0,
  );
  const variants = new Set(save.variantsUnlocked ?? []).size;
  const equipped = new Set(save.roster.flatMap((c) => c.runes ?? []));
  const runes = RUNE_ORDER.filter((k) => (save.runeBag?.[k] ?? 0) > 0 || equipped.has(k)).length;
  const achievements = new Set(save.claimedAchievementIds.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))).size;
  const total =
    ownedForms * COLLECTION_POINTS.ownedForm +
    evolutionsSeen * COLLECTION_POINTS.evolutionSeen +
    bondStars * COLLECTION_POINTS.bondStar +
    variants * COLLECTION_POINTS.variant +
    runes * COLLECTION_POINTS.rune +
    achievements * COLLECTION_POINTS.achievement;
  return { ownedForms, evolutionsSeen, bondStars, variants, runes, achievements, total };
}

export function collectionPoints(save: CollectionSave): number {
  return collectionBreakdown(save).total;
}

/** Paliers atteints mais pas encore réclamés. */
export function claimableCollectionTiers(save: CollectionSave & Pick<SaveState, 'collectionTiersClaimed'>): CollectionTier[] {
  const points = collectionPoints(save);
  const claimed = save.collectionTiersClaimed ?? [];
  return COLLECTION_TIERS.filter((t) => t.at <= points && !claimed.includes(t.at));
}

/** Prochain palier à atteindre (null : tous atteints). */
export function nextCollectionTier(save: CollectionSave): CollectionTier | null {
  const points = collectionPoints(save);
  return COLLECTION_TIERS.find((t) => t.at > points) ?? null;
}

/** Niveau de collection : nombre de paliers atteints (0 à COLLECTION_TIERS.length). */
export function collectionLevel(save: CollectionSave): number {
  const points = collectionPoints(save);
  return COLLECTION_TIERS.filter((t) => t.at <= points).length;
}

/**
 * Réclame un palier : cubes (dans la limite de l'inventaire), Appâts, titres et cadres.
 * Chaque palier ne se réclame qu'une fois ; un palier non atteint ou inconnu ne change rien.
 */
export function claimCollectionTier(save: SaveState, at: number): SaveState {
  const tier = claimableCollectionTiers(save).find((t) => t.at === at);
  if (!tier) return save;
  const baits = { ...save.baits };
  for (const [el, n] of Object.entries(tier.baits ?? {}) as [ElementType, number][]) {
    baits[el] = (baits[el] ?? 0) + n;
  }
  const titles = [...save.titles];
  for (const t of tier.titles ?? []) if (!titles.includes(t)) titles.push(t);
  const { nextSave } = addSealedCubes({ ...save, baits, titles }, tier.cubes);
  return { ...nextSave, collectionTiersClaimed: [...save.collectionTiersClaimed, at] };
}

/** Identifiants de tous les titres et cadres que les paliers peuvent donner (normalisation de la sauvegarde). */
export const COLLECTION_TITLE_IDS: readonly string[] = COLLECTION_TIERS.flatMap((t) => t.titles ?? []);
