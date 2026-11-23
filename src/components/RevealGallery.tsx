import { useState } from 'react';
import type { CubeMaterial } from '../game/balance';
import type { SummonTier } from '../game/summon';
import { SummonReveal } from './SummonReveal';

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
    <div style={{ minHeight: '100vh', background: '#0F1420', color: '#FAF7F0', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Révélations (outil)</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {CASES.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              setCurrent(x.id);
              setRun((r) => r + 1);
            }}
            style={{ padding: '10px 14px', borderRadius: 8, border: '2px solid #39445A', background: '#222A3A', color: '#FAF7F0' }}
          >
            {x.label}
          </button>
        ))}
      </div>
      {c && <SummonReveal key={`${c.id}-${run}`} {...c} autoTap={params.get('auto') === '1'} onDone={() => setCurrent(null)} />}
    </div>
  );
}
