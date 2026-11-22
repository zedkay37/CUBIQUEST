/**
 * Pont vers l'interface React : instantané de combat envoyé au HUD (10 Hz au plus).
 */
import { BIOMES, MOVES } from '../catalog';
import type { ExpeditionHudSnapshot, StatusKind } from '../types';
import type { VoxelEngine } from '../VoxelEngine';
import { getSkillPreview } from './cubes';

export function emitHudSnapshot(self: VoxelEngine): void {
  if (!self.activeStage || self.playMode !== 'expedition') return;
  const biome = BIOMES[self.activeStage.biomeId];
  const boss = self.enemies.find((e) => e.isBoss && !e.removed);
  const livingEnemies = self.enemies.filter((e) => !e.fainted && !e.removed).length;

  const snapshot: ExpeditionHudSnapshot = {
    stageId: self.activeStage.id,
    stageName: self.activeStage.name,
    biomeName: biome.name,
    waveIndex: self.waveIndex,
    totalWaves: self.activeStage.waves.length,
    elapsedSec: self.expeditionElapsed,
    dodgeCooldown: self.dodgeCooldown,
    dodgeMaxCooldown: self.dodgeMaxCooldown,
    ultimateCharge: Math.round(self.ultimateCharge),
    burstsTriggered: self.burstsTriggered,
    triosTriggered: self.triosTriggered,
    lastBurstLabel: self.lastBurstLabel,
    lastBurstColor: self.lastBurstColor,
    skillPreviews: [0, 1, 2].map((slot) => getSkillPreview(self, slot)),
    leaderElement: self.allies.find((a) => !a.fainted)?.rig.species.element ?? null,
    controlMode: self.controlMode,
    enemiesRemaining: livingEnemies,
    damageDealt: self.damageDealt,
    bannerText: self.bannerText,
    bossIntro: self.bossIntroTimer > 0 ? self.bossIntroInfo : null,
    boss: boss
      ? {
          name: boss.name,
          element: boss.rig.species.element,
          hp: boss.hp,
          maxHp: boss.maxHp,
          phase: boss.bossPhase,
          maxPhases: boss.bossMaxPhases,
          telegraphing: boss.telegraphing,
          statuses: Object.keys(boss.statuses) as StatusKind[],
        }
      : null,
    units: self.allies.map((a) => {
      const move = MOVES[a.moveId] ?? MOVES.ember_burst;
      return {
        uid: a.id,
        speciesId: a.speciesId,
        name: a.name,
        element: a.rig.species.element,
        level: a.level,
        hp: a.hp,
        maxHp: a.maxHp,
        shieldHp: Math.round(a.shieldHp),
        fainted: a.fainted,
        reviveTimer: a.reviveTimer,
        moveName: move.name,
        moveElement: move.element,
        moveCooldown: a.skillCooldown,
        moveMaxCooldown: a.skillMaxCooldown,
        buffActive: a.buffTimer > 0,
        statuses: Object.keys(a.statuses) as StatusKind[],
      };
    }),
  };
  self.callbacks.onHudUpdate(snapshot);
}
