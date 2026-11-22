/**
 * Mesures de diagnostic lues par l'overlay `?debug=1`. Lecture seule : aucun effet sur le jeu.
 */
import type { VoxelEngine } from '../VoxelEngine';

export interface EngineDebugStats {
  /** Images affichées depuis la création du moteur (l'overlay en déduit les images par seconde). */
  frames: number;
  /** Temps de calcul de la dernière image, en millisecondes : logique du jeu + envoi du rendu. */
  frameMs: number;
  /** Appels de dessin et triangles de la dernière image (ombres comprises). */
  drawCalls: number;
  triangles: number;
  /** Géométries et textures actuellement en mémoire graphique. */
  geometries: number;
  textures: number;
  /** Particules actives (pool de taille fixe). */
  particles: number;
  /** Cubimons présents : promeneurs au camp, alliés et ennemis en expédition. */
  entities: number;
}

export function getDebugStats(self: VoxelEngine): EngineDebugStats {
  const info = self.renderer?.info;
  let particles = 0;
  for (const p of self.particles) {
    if (p.active) particles += 1;
  }
  let entities = self.campWanderers.length;
  if (self.playMode === 'expedition') {
    entities = self.allies.length;
    for (const enemy of self.enemies) {
      if (!enemy.removed) entities += 1;
    }
  }
  return {
    frames: self.frameCount,
    frameMs: self.lastFrameMs,
    drawCalls: info?.render.calls ?? 0,
    triangles: info?.render.triangles ?? 0,
    geometries: info?.memory.geometries ?? 0,
    textures: info?.memory.textures ?? 0,
    particles,
    entities,
  };
}
