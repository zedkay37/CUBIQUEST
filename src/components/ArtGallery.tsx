import { useState } from 'react';
import { SPECIES } from '../game/catalog';
import { SCULPT_DEFS } from '../game/models/sculptDefs';
import { CreatureTurntable } from './CreatureTurntable';

/**
 * `?gallery=art` (outil, sprint Art section 5) : pour chaque créature refaite, l'ancien et le nouveau modèle
 * côte à côte, qui tournent ; un bouton « Silhouettes ». Une créature à la fois (deux rendus seulement).
 * `&species=<id>&silhouette=1` pour les captures. Textes en place : outil de développement.
 */
export function ArtGallery() {
  const params = new URLSearchParams(window.location.search);
  const ids = Object.keys(SCULPT_DEFS);
  const [current, setCurrent] = useState(params.get('species') && SCULPT_DEFS[params.get('species')!] ? params.get('species')! : ids[0]);
  const [silhouette, setSilhouette] = useState(params.get('silhouette') === '1');
  return (
    <div className="min-h-screen bg-[#0F1420] px-4 py-6 text-[#FAF7F0] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#F4B942]">Outil de développement</p>
        <h1 className="font-display text-3xl font-bold">Avant / après : créatures refaites</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCurrent(id)}
              className={`voxel-btn min-h-[44px] rounded-lg border-2 px-3 text-sm font-semibold ${current === id ? 'block-btn-gold' : 'block-btn-secondary'}`}
            >
              {SPECIES[id].name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSilhouette((v) => !v)}
            aria-pressed={silhouette}
            className={`voxel-btn ml-auto min-h-[44px] rounded-lg border-2 px-3 text-sm font-semibold ${silhouette ? 'block-btn-primary' : 'block-btn-secondary'}`}
          >
            Silhouettes
          </button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(['avant', 'après'] as const).map((label) => (
            <div key={`${current}-${label}-${silhouette}`} className="voxel-panel flex flex-col items-center p-4">
              <p className="mb-2 font-display text-lg font-bold">{label === 'avant' ? 'Avant (gros pavés)' : 'Après (volumes → blocs)'}</p>
              <CreatureTurntable speciesId={current} size={300} legacy={label === 'avant'} silhouette={silhouette} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
