import { useState } from 'react';
import type { CubeMaterial } from '../game/balance';
import type { SummonTier } from '../game/summon';
import { SummonReveal, TIER_COLOR } from './SummonReveal';
import { ObjectPortrait } from './Icons';
import { SPECIES } from '../game/catalog';

/**
 * `?gallery=reveal` (outil de développement, A2.5) : rejoue la révélation pour chaque rareté et pour un doublon.
 * `&case=rare&auto=1` lance directement un cas et tape le cube tout seul (captures). Textes en place : outil.
 */
const CASES: { id: string; label: string; material: CubeMaterial; speciesId: string; tier: SummonTier; isNew: boolean; bondAfter: number; variantUnlocked: boolean }[] = [
  { id: 'common', label: 'Commune (Bois)', material: 'wood', speciesId: 'psycube', tier: 'common', isNew: true, bondAfter: 0, variantUnlocked: false },
  { id: 'uncommon', label: 'Peu commune (Pierre)', material: 'stone', speciesId: 'mycelin', tier: 'uncommon', isNew: true, bondAfter: 0, variantUnlocked: false },
  { id: 'rare', label: 'Rare (Cristal)', material: 'crystal', speciesId: 'givrelin', tier: 'rare', isNew: true, bondAfter: 0, variantUnlocked: false },
  { id: 'awakened', label: 'Forme éveillée (Prisme)', material: 'prism', speciesId: 'flambrix', tier: 'awakened', isNew: true, bondAfter: 0, variantUnlocked: false },
  { id: 'duplicate', label: 'Doublon (Lien ★3)', material: 'wood', speciesId: 'pyrocube', tier: 'common', isNew: false, bondAfter: 3, variantUnlocked: false },
  { id: 'variant', label: 'Doublon : variante débloquée', material: 'wood', speciesId: 'cailloc', tier: 'common', isNew: false, bondAfter: 5, variantUnlocked: true },
];

export function RevealGallery() {
  const params = new URLSearchParams(window.location.search);
  const [current, setCurrent] = useState<string | null>(params.get('case'));
  const [run, setRun] = useState(0);
  const c = CASES.find((x) => x.id === current);
  return (
    <div className="min-h-screen bg-[#0F1420] px-4 py-8 text-[#FAF7F0] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#F4B942]">Outil de développement</p>
        <h1 className="font-display text-3xl font-bold">Révélations du Cube Scellé</h1>
        <p className="mt-1 text-sm text-[#B8C2D1]">Chaque carte rejoue une révélation complète. Tape le cube trois fois (clic, toucher ou Espace) ; maintiens le clic pour accélérer.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setCurrent(x.id);
                setRun((r) => r + 1);
              }}
              className="voxel-panel voxel-btn flex min-h-[88px] items-center gap-3 rounded-xl px-4 py-3 text-left"
              style={{ borderLeftColor: TIER_COLOR[x.tier], borderLeftWidth: 6 }}
            >
              <ObjectPortrait objectKey={`cube:${x.material}`} size={56} />
              <span>
                <span className="block font-display text-lg font-bold">{x.label}</span>
                <span className="text-xs text-[#94A3B8]">{SPECIES[x.speciesId].name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {c && <SummonReveal key={`${c.id}-${run}`} {...c} autoTap={params.get('auto') === '1'} startAtResult={params.get('fin') === '1'} onDone={() => setCurrent(null)} />}
    </div>
  );
}
