/**
 * Point d'entrée des modèles voxel procéduraux. Le code vit dans ./models :
 *   shared.ts       textures partagées et brique de base (`makeBox`)
 *   creatures.ts    Cubimons par silhouette, barre de vie
 *   campProps.ts    marmite et totem du camp
 *   biomes.ts       sol, décors et animations de chaque biome
 *   floatingText.ts texte flottant (pool fixe)
 * Ce fichier ne fait que réexporter, pour que les imports existants restent valables.
 */

export { getContactShadowTexture, getGroundCheckerTexture, getToyBumpTexture } from './models/shared';
export {
  attachWorldHpBar,
  buildVoxelCreature,
  getRigTopY,
  isHoverArchetype,
  type VoxelCreatureRig,
} from './models/creatures';
export { buildCampLandmark, buildCookingPotProp } from './models/campProps';
export { buildBiomeEnvironment, type BiomeEnvironmentHandle } from './models/biomes';
export { FloatingTextPool } from './models/floatingText';

