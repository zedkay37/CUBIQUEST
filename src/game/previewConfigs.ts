import { SPECIES, STAGES } from './catalog';
import type { StageDef } from './types';

/**
 * Escouades de référence par niveau.
 *
 * Elles servent à deux choses, avec exactement les mêmes valeurs :
 *  - le mode aperçu du jeu (`?stage=<id>` sans autre paramètre) ;
 *  - l'outil de mesure `npm run sim`, donc les cibles d'équilibrage.
 *
 * `bonus` s'ajoute aux PV et à l'ATQ de chaque créature : il représente les Pierres de Pouvoir
 * qu'une vraie escouade porterait à ce stade (c'est une estimation, pas une mesure).
 */
export interface PreviewConfig {
  squad: string[];
  level: number;
  bonus: number;
}

/** Niveaux de la Giga Update : configurations fixées à la main (celles des URL d'aperçu). */
const EXPLICIT_CONFIGS: Record<string, PreviewConfig> = {
  'tundra-1': { squad: ['ignisaur', 'abyssocube', 'bourgeoliath'], level: 38, bonus: 684 },
  'tundra-2': { squad: ['ramurgel', 'givrock', 'ignisaur'], level: 41, bonus: 900 },
  'tundra-3': { squad: ['ramurgel', 'cryolithe', 'auroramure'], level: 44, bonus: 1100 },
  'stormpeak-1': { squad: ['auroramure', 'glaciatitan', 'raicube'], level: 46, bonus: 1400 },
  'stormpeak-2': { squad: ['tempestrix', 'cryolithe', 'nimbulle'], level: 48, bonus: 1700 },
  'stormpeak-3': { squad: ['serpeclair', 'cumulord', 'glaciatitan'], level: 50, bonus: 2000 },
};

/** Forme d'une lignée qu'aurait une créature de ce niveau (elle évolue dès qu'elle le peut). */
export function evolvedFormAtLevel(baseSpeciesId: string, level: number): string {
  let id = baseSpeciesId;
  for (let guard = 0; guard < 4; guard++) {
    const species = SPECIES[id];
    if (!species?.evolvesTo || !species.evolveLevel || level < species.evolveLevel) break;
    id = species.evolvesTo;
  }
  return id;
}

/**
 * Configuration de référence d'un niveau.
 * Pour les 12 niveaux historiques (aucune configuration fixée), elle est dérivée :
 * les trois lignées de départ au stade de leur niveau, niveau = niveau du boss - 1 (4 au minimum,
 * le niveau du starter), bonus = 1,3 x la plus petite Pierre que le niveau peut donner.
 */
export function getReferenceConfig(stage: StageDef): PreviewConfig {
  const explicit = EXPLICIT_CONFIGS[stage.id];
  if (explicit) return { ...explicit, squad: [...explicit.squad] };

  const bossWave = stage.waves[stage.waves.length - 1];
  const bossLevel = bossWave.enemies.find((e) => e.isBoss)?.level ?? stage.waves[0].enemies[0].level;
  const level = Math.max(4, bossLevel - 1);
  return {
    squad: ['pyrocube', 'aquabloc', 'bourgeon'].map((id) => evolvedFormAtLevel(id, level)),
    level,
    bonus: Math.round(stage.stonePowerRange[0] * 1.3),
  };
}

export function listReferenceConfigs(): { stage: StageDef; config: PreviewConfig }[] {
  return STAGES.map((stage) => ({ stage, config: getReferenceConfig(stage) }));
}

/** URL d'aperçu correspondant à la configuration de référence d'un niveau. */
export function buildPreviewQuery(stage: StageDef, config: PreviewConfig = getReferenceConfig(stage)): string {
  return `?stage=${stage.id}&squad=${config.squad.join(',')}&lvl=${config.level}&bonus=${config.bonus}`;
}
