/**
 * Le Cube Scellé (spec Atelier, A2.1) : règles pures, déterministes à graine connue.
 *
 * On ouvre un cube (et, si on veut, un Appât) : il en sort une créature. Rareté tirée selon la matière du
 * cube, jauge d'Éveil qui garantit une rare, Appât qui oriente l'élément, doublons qui font monter le Lien,
 * variante de couleur au 5ᵉ doublon, forme éveillée (stade 2) seulement dans un cube Prisme et pour une
 * lignée déjà recrutée.
 */
import { SUMMON, type CubeMaterial } from './balance';
import { SPECIES, SUMMON_RARITY, type SummonRarity } from './catalog';
import { createOwnedCreature, woodPriorityLineage } from './rules';
import type { ElementType, OwnedCreature, SaveState } from './types';

export type RngFn = () => number;
export type SummonTier = SummonRarity | 'awakened';

export interface SealedCube {
  id: string;
  material: CubeMaterial;
  /** Premier cube après le premier boss : il contient forcément la lignée prévue. */
  guaranteedSpeciesId?: string;
}

export interface SummonResult {
  speciesId: string;
  tier: SummonTier;
  isNew: boolean;
  /** Doublon : la lignée gagne une étoile de Lien (ou remplit la jauge au-delà de la variante). */
  duplicate: boolean;
  bondAfter: number;
  variantUnlocked: boolean;
  /** Le cube a été ouvert alors que la jauge d'Éveil était pleine. */
  pityUsed: boolean;
  baitUsed: ElementType | null;
}

/** Forme de base (lignée) d'une espèce. */
export function lineageOf(speciesId: string): string {
  let id = speciesId;
  for (let guard = 0; guard < 4; guard++) {
    const parent = Object.values(SPECIES).find((s) => s.evolvesTo === id);
    if (!parent) return id;
    id = parent.id;
  }
  return id;
}

export function ownedLineages(roster: OwnedCreature[]): Set<string> {
  return new Set(roster.map((c) => lineageOf(c.speciesId)));
}

/** Tirage de la rareté (sans la jauge). */
export function rollTier(material: CubeMaterial, rng: RngFn): SummonTier {
  const [c, u, r] = SUMMON.odds[material];
  const x = rng();
  if (x < c) return 'common';
  if (x < c + u) return 'uncommon';
  if (x < c + u + r) return 'rare';
  return 'awakened';
}

const pick = <T,>(list: T[], rng: RngFn): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** Une lignée de cette rareté ; l'Appât l'oriente vers son élément avec 60 % de chances (si c'est possible). */
export function pickLineage(rarity: SummonRarity, bait: ElementType | null, rng: RngFn): string {
  const pool = Object.keys(SUMMON_RARITY).filter((id) => SUMMON_RARITY[id] === rarity);
  if (bait) {
    const baited = pool.filter((id) => SPECIES[id]?.element === bait);
    const roll = rng();
    if (baited.length && roll < SUMMON.baitChance) return pick(baited, rng);
  }
  return pick(pool, rng);
}

/** Ouvre un cube de l'inventaire. Renvoie la sauvegarde suivante et ce qui est sorti (null : cube introuvable). */
export function openSealedCube(
  save: SaveState,
  cubeId: string,
  bait: ElementType | null,
  rng: RngFn = Math.random,
): { nextSave: SaveState; result: SummonResult } | null {
  const cube = save.sealedCubes.find((c) => c.id === cubeId);
  if (!cube) return null;
  const useBait = bait && (save.baits[bait] ?? 0) > 0 ? bait : null;
  const owned = ownedLineages(save.roster);
  const pityUsed = save.awakenGauge >= 1 - 1e-9;

  // 1. rareté : jauge pleine -> rare au moins ; forme éveillée seulement si une lignée est déjà recrutée
  let tier: SummonTier = cube.guaranteedSpeciesId ? 'common' : rollTier(cube.material, rng);
  if (pityUsed && (tier === 'common' || tier === 'uncommon')) tier = 'rare';
  const awakenable = [...owned].filter((id) => SPECIES[id]?.evolvesTo);
  if (tier === 'awakened' && !awakenable.length) tier = 'rare';

  // 1 bis. A4.1 : le Bois donne d'abord une commune pas encore recrutée (la jauge pleine garde la priorité)
  const woodFirst = !cube.guaranteedSpeciesId && cube.material === 'wood' && !pityUsed ? woodPriorityLineage(owned, useBait, rng) : null;
  if (woodFirst) tier = 'common';

  // 2. espèce
  let speciesId: string;
  if (woodFirst) {
    speciesId = woodFirst;
  } else if (cube.guaranteedSpeciesId) {
    speciesId = cube.guaranteedSpeciesId;
    tier = SUMMON_RARITY[lineageOf(speciesId)] ?? 'common';
  } else if (tier === 'awakened') {
    const base = useBait && awakenable.some((id) => SPECIES[id].element === useBait) && rng() < SUMMON.baitChance
      ? pick(awakenable.filter((id) => SPECIES[id].element === useBait), rng)
      : pick(awakenable, rng);
    speciesId = SPECIES[base].evolvesTo!;
  } else {
    speciesId = pickLineage(tier, useBait, rng);
  }
  const lineage = lineageOf(speciesId);

  // 3. nouvelle créature, ou doublon (Lien, variante, jauge)
  const already = tier === 'awakened' ? save.roster.some((c) => c.speciesId === speciesId) : owned.has(lineage);
  let roster = save.roster;
  let bonds = save.bonds;
  let duplicates = save.duplicates;
  let variantsUnlocked = save.variantsUnlocked;
  let gauge = pityUsed ? 0 : save.awakenGauge;
  let variantUnlocked = false;
  if (!already) {
    const squad = save.roster.filter((c) => save.squadIds.includes(c.uid));
    const avg = squad.length ? squad.reduce((n, c) => n + c.level, 0) / squad.length : 4;
    const minLevel = tier === 'awakened' ? (SPECIES[lineage].evolveLevel ?? 1) : 1;
    const level = Math.max(minLevel, Math.round(avg) - 2);
    roster = [...save.roster, createOwnedCreature(speciesId, level, 0, `cube_${cube.id}`)];
  } else {
    const dupCount = (save.duplicates[lineage] ?? 0) + 1;
    duplicates = { ...save.duplicates, [lineage]: dupCount };
    if (dupCount <= SUMMON.variantAtDuplicates) {
      bonds = { ...save.bonds, [lineage]: Math.min(SUMMON.bondMax, (save.bonds[lineage] ?? 0) + 1) };
      if (dupCount === SUMMON.variantAtDuplicates && !variantsUnlocked.includes(lineage)) {
        variantsUnlocked = [...variantsUnlocked, lineage];
        variantUnlocked = true;
      }
    } else {
      gauge = Math.min(1, gauge + SUMMON.duplicateAwakenBonus);
    }
  }
  // 4. jauge : +10 % pour toute ouverture sans rare
  if (tier === 'common' || tier === 'uncommon') gauge = Math.min(1, gauge + SUMMON.awakenStep);

  const baits = useBait ? { ...save.baits, [useBait]: (save.baits[useBait] ?? 0) - 1 } : save.baits;
  const discovered = save.discoveredSpeciesIds.includes(speciesId) ? save.discoveredSpeciesIds : [...save.discoveredSpeciesIds, speciesId];
  const nextSave: SaveState = {
    ...save,
    roster,
    bonds,
    duplicates,
    variantsUnlocked,
    awakenGauge: Math.round(gauge * 1000) / 1000,
    baits,
    sealedCubes: save.sealedCubes.filter((c) => c.id !== cube.id),
    discoveredSpeciesIds: discovered,
  };
  return {
    nextSave,
    result: {
      speciesId,
      tier,
      isNew: !already,
      duplicate: already,
      bondAfter: bonds[lineage] ?? 0,
      variantUnlocked,
      pityUsed,
      baitUsed: useBait,
    },
  };
}

/** Ajoute des cubes à l'inventaire (50 au plus : au-delà, ils sont perdus). Identifiants uniques et stables. */
export function addSealedCubes(save: SaveState, materials: CubeMaterial[], guaranteedSpeciesId?: string): { nextSave: SaveState; added: CubeMaterial[] } {
  const room = Math.max(0, SUMMON.inventoryMax - save.sealedCubes.length);
  const added = materials.slice(0, room);
  let counter = save.cubeCounter;
  const cubes: SealedCube[] = added.map((material, i) => ({
    id: `cube_${++counter}`,
    material,
    ...(guaranteedSpeciesId && i === 0 ? { guaranteedSpeciesId } : {}),
  }));
  return { nextSave: { ...save, sealedCubes: [...save.sealedCubes, ...cubes], cubeCounter: counter }, added };
}

/** Chances affichées à l'Atelier pour un cube (transparence totale), jauge comprise. */
export function displayedOdds(material: CubeMaterial, gauge: number): [number, number, number, number] {
  const [c, u, r, a] = SUMMON.odds[material];
  if (gauge >= 1 - 1e-9) {
    const total = r + a || 1;
    return [0, 0, r / total, a / total];
  }
  return [c, u, r, a];
}

/** Bonus de PV et d'attaque du Lien (+4 % par étoile pleine). */
export function bondMultiplier(bond: number | undefined): number {
  return 1 + Math.floor(Math.max(0, Math.min(SUMMON.bondMax, bond ?? 0))) * SUMMON.bondStatBonus;
}
