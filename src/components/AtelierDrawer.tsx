import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { CubeMaterial } from '../game/balance';
import { ELEMENT_META } from '../game/catalog';
import { displayedOdds } from '../game/summon';
import type { ElementType, SaveState } from '../game/types';
import { FR } from '../i18n/fr';
import { ElementIcon, ObjectPortrait } from './Icons';
import { AnimatedBar, BlockButton } from './ui';

const MATERIALS: CubeMaterial[] = ['prism', 'crystal', 'stone', 'wood'];
const TIER_KEYS = ['commune', 'peuCommune', 'rare', 'eveillee'] as const;

interface AtelierDrawerProps {
  save: SaveState;
  onOpenCube: (cubeId: string, bait: ElementType | null) => void;
  onClose: () => void;
}

/**
 * L'Atelier (spec Atelier, A2.3) : à gauche l'inventaire de cubes (portraits 3D par matière), au centre le
 * moule (un cube, et si on veut un Appât), à droite la jauge d'Éveil et les chances du cube choisi.
 */
export function AtelierDrawer({ save, onOpenCube, onClose }: AtelierDrawerProps) {
  const groups = useMemo(
    () => MATERIALS.map((m) => ({ material: m, cubes: save.sealedCubes.filter((c) => c.material === m) })).filter((g) => g.cubes.length),
    [save.sealedCubes],
  );
  const [selected, setSelected] = useState<string | null>(save.sealedCubes[0]?.id ?? null);
  const [bait, setBait] = useState<ElementType | null>(null);
  const cube = save.sealedCubes.find((c) => c.id === selected) ?? save.sealedCubes[0] ?? null;
  const odds = cube ? displayedOdds(cube.material, save.awakenGauge) : null;
  const baits = (Object.entries(save.baits) as [ElementType, number][]).filter(([, n]) => n > 0);
  const pct = (x: number) => `${Math.round(x * 100)} %`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/60 p-3" role="dialog" aria-modal="true" aria-labelledby="atelier-title">
      <div className="voxel-panel ui-screen-enter w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl p-4 sm:p-5 text-[#FAF7F0]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="atelier-title" className="font-display text-2xl font-bold">{FR.ui.atelier.titre}</h2>
            <p className="text-sm text-[#B8C2D1]">{FR.ui.atelier.sousTitre}</p>
          </div>
          <button type="button" onClick={onClose} className="voxel-btn rounded-lg border-2 border-[#39445A] p-2" aria-label={FR.ui.atelier.fermer}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr]">
          {/* Inventaire */}
          <section aria-label={FR.ui.atelier.inventaire}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{FR.ui.atelier.inventaireCompte(save.sealedCubes.length)}</h3>
            {!groups.length && <p className="text-sm text-[#94A3B8]">{FR.ui.atelier.aucunCube}</p>}
            <div className="flex flex-col gap-2">
              {groups.map((g) => (
                <button
                  key={g.material}
                  type="button"
                  onClick={() => setSelected(g.cubes[0].id)}
                  className={`voxel-btn flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-left ${cube?.material === g.material ? 'border-[#F4B942] bg-[#2A3448]' : 'border-[#39445A] bg-[#222A3A]'}`}
                >
                  <ObjectPortrait objectKey={`cube:${g.material}`} size={52} />
                  <span className="flex-1">
                    <span className="block font-display font-bold">{FR.ui.atelier.matieres[g.material]}</span>
                    <span className="text-xs text-[#94A3B8]">{FR.ui.atelier.matiereAide[g.material]}</span>
                  </span>
                  <span className="font-mono-num text-lg font-bold text-[#F4B942]">×{g.cubes.length}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Moule */}
          <section className="flex flex-col items-center gap-3" aria-label={FR.ui.atelier.moule}>
            <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border-4 border-[#F4B942]/60 bg-[#141925] shadow-[0_0_40px_rgba(244,185,66,0.25)]">
              {cube ? <ObjectPortrait objectKey={`cube:${cube.material}`} size={150} /> : <span className="text-sm text-[#94A3B8]">{FR.ui.atelier.mouleVide}</span>}
              {bait && (
                <span className="absolute bottom-1 right-1">
                  <ObjectPortrait objectKey={`bait:${bait}`} size={44} />
                </span>
              )}
            </div>
            <div className="w-full">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{FR.ui.atelier.appats}</p>
              {!baits.length && <p className="text-xs text-[#94A3B8]">{FR.ui.atelier.aucunAppat}</p>}
              <div className="flex flex-wrap gap-1.5">
                {baits.map(([el, n]) => (
                  <button
                    key={el}
                    type="button"
                    aria-pressed={bait === el}
                    onClick={() => setBait(bait === el ? null : el)}
                    className={`voxel-btn inline-flex min-h-[44px] items-center gap-1 rounded-lg border-2 px-2 text-xs font-bold ${bait === el ? 'border-[#F4B942] bg-[#2A3448]' : 'border-[#39445A] bg-[#222A3A]'}`}
                  >
                    <ElementIcon element={el} size={14} />
                    {ELEMENT_META[el].label} ×{n}
                  </button>
                ))}
              </div>
              {bait && <p className="mt-1 text-xs text-[#CBD5E1]">{FR.ui.atelier.appatAide(ELEMENT_META[bait].label)}</p>}
            </div>
            <BlockButton variant="primary" size="lg" className="w-full" disabled={!cube} onClick={() => cube && onOpenCube(cube.id, bait)}>
              {FR.ui.atelier.ouvrir}
            </BlockButton>
          </section>

          {/* Jauge et chances */}
          <section className="flex flex-col gap-3" aria-label={FR.ui.atelier.chances}>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{FR.ui.atelier.jaugeEveil}</p>
              <AnimatedBar value={Math.round(save.awakenGauge * 100)} max={100} color="#F4B942" height={12} label={FR.ui.atelier.jaugeEveil} />
              <p className="mt-1 text-xs text-[#CBD5E1]">{save.awakenGauge >= 1 ? FR.ui.atelier.jaugePleine : FR.ui.atelier.jaugeAide(Math.round(save.awakenGauge * 100))}</p>
            </div>
            {odds && (
              <table className="w-full text-sm">
                <caption className="mb-1 text-left text-xs font-bold uppercase tracking-wider text-[#94A3B8]">{FR.ui.atelier.chancesDe(FR.ui.atelier.matieres[cube!.material])}</caption>
                <tbody>
                  {odds.map((o, i) => (
                    <tr key={TIER_KEYS[i]} className="border-t border-[#39445A]">
                      <td className="py-1">{FR.ui.atelier.raretes[TIER_KEYS[i]]}</td>
                      <td className="py-1 text-right font-mono-num font-bold">{pct(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-[#94A3B8]">{FR.ui.atelier.doublonAide}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
