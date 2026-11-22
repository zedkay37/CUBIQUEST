/**
 * Point d'entrée des modèles voxel procéduraux. Le code vit dans ./models :
 *   shared.ts       textures partagées et brique de base (`makeBox`)
 *   creatures.ts    Cubimons par silhouette, barre de vie
 *   campProps.ts    marmite et totem du camp
 *   biomes.ts       sol, décors et animations de chaque biome
 *   floatingText.ts texte flottant (pool fixe)
 * Ce fichier ne fait que réexporter, pour que les imports existants restent valables.
 */
import * as THREE from 'three';

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

// === V0.2 ZERO-GC FLOATING 3D COMBAT TEXT SPRITE POOL ===
interface FloatingTextSlot {
  active: boolean;
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  life: number;
  maxLife: number;
  vy: number;
  baseScaleX: number;
  baseScaleY: number;
}

export class FloatingTextPool {
  private slots: FloatingTextSlot[] = [];
  private cursor = 0;

  constructor(parent: THREE.Group, size = 20) {
    for (let i = 0; i < size; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 72;
      const ctx = canvas.getContext('2d')!;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 20;
      parent.add(sprite);

      this.slots.push({
        active: false,
        sprite,
        canvas,
        ctx,
        tex,
        life: 0,
        maxLife: 0.9,
        vy: 1.8,
        baseScaleX: 2.6,
        baseScaleY: 0.74,
      });
    }
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    text: string,
    colorHex: string,
    scale = 1.0,
    duration = 0.85,
  ): void {
    const slot = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % this.slots.length;

    const { canvas, ctx } = slot;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSize = text.length > 10 ? 28 : 40;
    ctx.font = `900 ${fontSize}px "Bricolage Grotesque", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#141925';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2 + 2);
    ctx.fillStyle = colorHex;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    slot.tex.needsUpdate = true;

    slot.active = true;
    slot.life = duration;
    slot.maxLife = duration;
    slot.vy = 1.65 + scale * 0.45;
    slot.baseScaleX = 2.65 * scale;
    slot.baseScaleY = 0.76 * scale;
    slot.sprite.position.set(
      x + (Math.random() - 0.5) * 0.55,
      y,
      z + (Math.random() - 0.5) * 0.35,
    );
    slot.sprite.scale.set(slot.baseScaleX, slot.baseScaleY, 1);
    (slot.sprite.material as THREE.SpriteMaterial).opacity = 1;
    slot.sprite.visible = true;
  }

  public update(dt: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        slot.sprite.visible = false;
        continue;
      }
      const progress = 1 - slot.life / slot.maxLife;
      slot.sprite.position.y += slot.vy * (1 - progress * 0.55) * dt;
      const pop = progress < 0.16 ? 0.85 + (progress / 0.16) * 0.3 : 1.15 - progress * 0.2;
      slot.sprite.scale.set(slot.baseScaleX * pop, slot.baseScaleY * pop, 1);
      const fade = progress > 0.65 ? Math.max(0, 1 - (progress - 0.65) / 0.35) : 1;
      (slot.sprite.material as THREE.SpriteMaterial).opacity = fade;
    }
  }

  public clear(): void {
    for (const slot of this.slots) {
      slot.active = false;
      slot.sprite.visible = false;
    }
  }

  public dispose(): void {
    for (const slot of this.slots) {
      slot.tex.dispose();
      (slot.sprite.material as THREE.Material).dispose();
    }
  }
}
