import React, { useState } from 'react';
import { Flame, Lock, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import {
  ELEMENT_META,
  INGREDIENT_LIST,
  INGREDIENTS,
  POT_TIER_META,
  RECIPE_BY_ID,
  RECIPES,
  SPECIES,
} from '../game/catalog';
import { getPotIngredientCost, resolveRecipe } from '../game/rules';
import type { OwnedCreature, PotTier, SaveState } from '../game/types';
import { ElementIcon, VoxelCreatureAvatar } from './Icons';
import { FR } from '../i18n/fr';

interface CookingDrawerProps {
  save: SaveState;
  recruitedPreview: OwnedCreature | null;
  onDismissRecruit: () => void;
  onChangePotTier: (tier: PotTier) => void;
  onAddIngredient: (ingredientId: string) => void;
  onRemoveSlot: (slotIdx: number) => void;
  onClearSlots: () => void;
  onAutoFillSlots: () => void;
  onStartCooking: () => void;
  onFastFinishCooking: () => void;
  onCollectCreature: () => void;
  onClose: () => void;
}

const TIERS: PotTier[] = ['iron', 'bronze', 'silver', 'gold'];

export function CookingDrawer({
  save,
  recruitedPreview,
  onDismissRecruit,
  onChangePotTier,
  onAddIngredient,
  onRemoveSlot,
  onClearSlots,
  onAutoFillSlots,
  onStartCooking,
  onFastFinishCooking,
  onCollectCreature,
  onClose,
}: CookingDrawerProps) {
  const [view, setView] = useState<'pot' | 'recipes'>('pot');
  const { pot } = save;
  const costPerSlot = getPotIngredientCost(pot.tier);
  const previewRecipe = resolveRecipe(pot.slots);
  const activeRecipe = pot.recipeId ? RECIPE_BY_ID[pot.recipeId] : null;

  // Compute remaining stock after counting ingredients currently staged in the 5 slots
  const stagedCounts: Record<string, number> = {};
  for (const id of pot.slots) {
    if (id) stagedCounts[id] = (stagedCounts[id] ?? 0) + costPerSlot;
  }

  const canCook =
    pot.status === 'idle' &&
    previewRecipe !== null &&
    Object.entries(stagedCounts).every(([id, qty]) => (save.ingredients[id] ?? 0) >= qty);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-3 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cooking-drawer-title"
        className="voxel-panel w-full max-w-4xl max-h-[86vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 border-b border-[#39445A]">
          <div className="min-w-0 flex-1 basis-56">
            <h2 id="cooking-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              {FR.ui.cookingDrawer.marmiteDuCampement}
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              {FR.ui.cookingDrawer.placez5IngredientsPourCuisinerUn}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141A26] border border-[#344056]">
              <button
                type="button"
                onClick={() => setView('pot')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${
                  view === 'pot' ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                {FR.ui.cookingDrawer.chaudron}
              </button>
              <button
                type="button"
                onClick={() => setView('recipes')}
                className={`cursor-pointer px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 ${
                  view === 'recipes' ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1] hover:text-[#FAF7F0]'
                }`}
              >
                {FR.ui.cookingDrawer.recettes}{save.discoveredRecipeIds.length}/{RECIPES.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="voxel-btn cursor-pointer w-9 h-9 rounded-lg bg-[#222A3A] hover:bg-[#2E384E] border border-[#39445A] flex items-center justify-center"
              aria-label={FR.ui.cookingDrawer.fermerLaMarmite}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bannière de la créature tout juste recrutée */}
        {recruitedPreview && (
          <div className="mx-5 mt-4 rounded-xl bg-[#202E2B] border-2 border-[#2FB97A] p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <VoxelCreatureAvatar speciesId={recruitedPreview.speciesId} size={56} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2FB97A]">
                  {FR.ui.cookingDrawer.nouvelleRecrueAttireeAuCamp}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <ElementIcon element={SPECIES[recruitedPreview.speciesId].element} size={18} />
                  <h3 className="font-display text-lg font-bold text-[#FAF7F0]">
                    {SPECIES[recruitedPreview.speciesId].name}{FR.ui.cookingDrawer.niv}{' '}
                    <span className="font-mono-num">{recruitedPreview.level}</span>
                  </h3>
                </div>
                <p className="text-xs text-[#CBD5E1] mt-0.5">
                  {FR.ui.cookingDrawer.ajouteAVotreReserveEquipezLe}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissRecruit}
              className="voxel-btn cursor-pointer px-4 py-2 rounded-lg bg-[#2FB97A] text-[#0F172A] font-bold text-xs border border-[#141925]"
            >
              {FR.ui.cookingDrawer.super}
            </button>
          </div>
        )}

        {view === 'recipes' ? (
          <div className="flex-1 overflow-y-auto cubi-scroll p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RECIPES.map((r) => {
              const discovered = save.discoveredRecipeIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  className="rounded-xl bg-[#192130] border border-[#323E54] p-3.5 flex items-start gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-[#141925] shrink-0 mt-0.5"
                    style={{ backgroundColor: r.soupHex }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm text-[#FAF7F0]">{r.name}</h3>
                      <span className="font-mono-num text-[11px] text-[#F4B942]">
                        {r.cookExpeditions}{FR.ui.cookingDrawer.exp}
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1] mt-0.5">{r.description}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                      {FR.ui.cookingDrawer.astuce}{r.hint} {discovered ? FR.ui.cookingDrawer.decouverte : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto cubi-scroll p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Pot Tier & 5 Ingredient Slots */}
            <div className="md:col-span-6 flex flex-col gap-4">
              {/* Pot Tier Selector */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-2">
                  {FR.ui.cookingDrawer.typeDeChaudron}{costPerSlot}{FR.ui.cookingDrawer.parIngredient}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIERS.map((tier) => {
                    const meta = POT_TIER_META[tier];
                    const unlocked = save.unlockedPotTiers.includes(tier);
                    const active = pot.tier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={!unlocked || pot.status !== 'idle'}
                        onClick={() => onChangePotTier(tier)}
                        title={meta.unlockHint}
                        className={`rounded-lg p-2 border text-left transition-colors ${
                          !unlocked
                            ? 'bg-[#141925] border-[#263042] opacity-50 cursor-not-allowed'
                            : active
                              ? 'bg-[#28334A] border-[#F4B942] cursor-pointer'
                              : 'bg-[#1C2434] border-[#334057] hover:border-[#64748B] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#FAF7F0]">
                            {meta.label.replace('Marmite en ', '')}
                          </span>
                          {!unlocked && <Lock className="w-3 h-3 text-[#94A3B8]" />}
                        </div>
                        <p className="font-mono-num text-[10px] text-[#B8C2D1] mt-0.5">
                          {FR.ui.cookingDrawer.niv2}{meta.minLevel}-{meta.maxLevel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5 Cauldron Slots */}
              <div className="rounded-xl bg-[#161C29] border border-[#344056] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                    {FR.ui.cookingDrawer.emplacements5Requis}
                  </span>
                  {pot.status === 'idle' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onAutoFillSlots}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-[#F4B942] hover:underline"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {FR.ui.cookingDrawer.remplirAuto}
                      </button>
                      <button
                        type="button"
                        onClick={onClearSlots}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-[#B8C2D1] hover:text-[#FAF7F0]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {FR.ui.cookingDrawer.vider}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {pot.slots.map((ingId, idx) => {
                    const ing = ingId ? INGREDIENTS[ingId] : null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={pot.status !== 'idle' || !ing}
                        onClick={() => onRemoveSlot(idx)}
                        aria-label={
                          ing
                            ? FR.ui.cookingDrawer.retirerDeLEmplacement(ing.name, idx + 1)
                            : FR.ui.cookingDrawer.emplacementVide(idx + 1)
                        }
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1.5 transition-colors ${
                          ing
                            ? 'bg-[#242E42] border-[#F4B942] cursor-pointer hover:bg-[#2E3A54]'
                            : 'bg-[#121722] border-dashed border-[#36425A] text-[#64748B]'
                        }`}
                      >
                        {ing ? (
                          <>
                            <span
                              className="w-6 h-6 rounded-md border border-[#141925]"
                              style={{ backgroundColor: ing.hex }}
                            />
                            <span className="mt-1 text-[10px] leading-tight text-center truncate w-full">
                              {ing.name.split(' ')[0]}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono-num text-xs">{idx + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live Recipe Status Box */}
                <div className="mt-4 pt-3 border-t border-[#2A3447]">
                  {pot.status === 'idle' && (
                    <>
                      {previewRecipe ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-8 h-8 rounded-lg border-2 border-[#141925] shrink-0"
                              style={{ backgroundColor: previewRecipe.soupHex }}
                            />
                            <div className="min-w-0">
                              <p className="font-display font-bold text-sm text-[#FAF7F0] truncate">
                                {previewRecipe.name}
                              </p>
                              <p className="text-xs text-[#B8C2D1]">
                                {FR.ui.cookingDrawer.cuisson}{' '}
                                <strong className="font-mono-num text-[#F4B942]">
                                  {previewRecipe.cookExpeditions}
                                </strong>{' '}
                                {FR.ui.cookingDrawer.expedition}{previewRecipe.cookExpeditions > 1 ? 's' : ''}
                                {previewRecipe.targetElement
                                  ? FR.ui.cookingDrawer.type(ELEMENT_META[previewRecipe.targetElement].label)
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!canCook}
                            title={
                              canCook
                                ? undefined
                                : FR.ui.cookingDrawer.chaqueEmplacementCouteIngredientAvecCe(costPerSlot, costPerSlot > 1 ? 's' : '')
                            }
                            onClick={onStartCooking}
                            className="voxel-btn cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl bg-[#E85D3F] hover:bg-[#F06D50] text-[#FAF7F0] font-display font-bold text-sm border-2 border-[#141925] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Flame className="w-4 h-4" />
                            {canCook ? FR.ui.cookingDrawer.lancerLaCuisson : FR.ui.cookingDrawer.stockInsuffisant}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[#B8C2D1]">
                          {FR.ui.cookingDrawer.cliquezSurVosIngredientsADroite}
                        </p>
                      )}
                    </>
                  )}

                  {pot.status === 'cooking' && activeRecipe && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-bold text-sm text-[#F4B942]">
                            {FR.ui.cookingDrawer.cuissonEnCours}{activeRecipe.name}
                          </p>
                          <p className="text-xs text-[#CBD5E1]">
                            {FR.ui.cookingDrawer.encore}{' '}
                            <strong className="font-mono-num">
                              {pot.expeditionsRemaining}
                            </strong>{' '}
                            {FR.ui.cookingDrawer.expedition}{pot.expeditionsRemaining > 1 ? 's' : ''}{FR.ui.cookingDrawer.avantDegustation}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onFastFinishCooking}
                          className="voxel-btn cursor-pointer px-3 py-1.5 rounded-lg bg-[#242F44] hover:bg-[#313F59] text-xs font-semibold text-[#F4B942] border border-[#F4B942]/60 whitespace-nowrap shrink-0"
                        >
                          {FR.ui.cookingDrawer.terminerMaintenant}
                        </button>
                      </div>
                      <div className="h-2.5 rounded bg-[#101520] border border-[#344056] overflow-hidden">
                        <div
                          className="h-full bg-[#F4B942]"
                          style={{
                            width: `${Math.max(
                              12,
                              ((pot.expeditionsTotal - pot.expeditionsRemaining) /
                                Math.max(1, pot.expeditionsTotal)) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {pot.status === 'ready' && activeRecipe && (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display font-bold text-base text-[#2FB97A]">
                          {activeRecipe.name}{FR.ui.cookingDrawer.estPret}
                        </p>
                        <p className="text-xs text-[#CBD5E1]">
                          {FR.ui.cookingDrawer.uneCreatureAttireeParLOdeur}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onCollectCreature}
                        className="voxel-btn cursor-pointer px-5 py-2.5 rounded-xl bg-[#2FB97A] hover:bg-[#38C987] text-[#0F172A] font-display font-bold text-sm border-2 border-[#141925] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-4 h-4" />
                        {FR.ui.cookingDrawer.accueillirLaRecrue}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Ingredient Inventory */}
            <div className="md:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1] mb-2">
                {FR.ui.cookingDrawer.reserveDIngredients}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {INGREDIENT_LIST.map((ing) => {
                  const totalStock = save.ingredients[ing.id] ?? 0;
                  const usedInSlots = stagedCounts[ing.id] ?? 0;
                  const available = Math.max(0, totalStock - usedInSlots);
                  const canAdd =
                    pot.status === 'idle' &&
                    pot.slots.includes(null) &&
                    available >= costPerSlot;

                  return (
                    <button
                      key={ing.id}
                      type="button"
                      disabled={!canAdd}
                      onClick={() => onAddIngredient(ing.id)}
                      className={`text-left rounded-xl p-3 border transition-colors flex items-center gap-3 ${
                        canAdd
                          ? 'bg-[#1D2535] hover:bg-[#273248] border-[#344056] hover:border-[#F4B942] cursor-pointer'
                          : 'bg-[#141924] border-[#252E40] opacity-55 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-lg border-2 border-[#141925] shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: ing.hex }}
                      >
                        <span
                          className="w-3 h-3 rounded-xs"
                          style={{ backgroundColor: ing.accentHex }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs leading-tight text-[#FAF7F0] break-words">
                            {ing.name}
                          </span>
                          <span className="font-mono-num text-xs font-bold text-[#F4B942] shrink-0">
                            ×{available}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                          {ing.rarity === 'mystic'
                            ? FR.ui.cookingDrawer.mystique
                            : ing.rarity === 'rare'
                              ? FR.ui.cookingDrawer.rare
                              : FR.ui.cookingDrawer.commun}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
