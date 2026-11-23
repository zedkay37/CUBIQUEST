import React, { useEffect, useMemo, useState } from 'react';
import { BIOME_ORDER, BIOMES, ELEMENT_META, MOVES, SPECIES, STAGES, SUMMON_RARITY } from '../game/catalog';
import { renderGalleryShots, type GalleryShots } from '../game/galleryRenderer';
import { buildPreviewQuery } from '../game/previewConfigs';
import type { SpeciesDef } from '../game/types';
import { ElementIcon } from './Icons';

const ROLE_LABEL: Record<SpeciesDef['role'], string> = { melee: 'Mêlée', ranged: 'Distance', tank: 'Tank' };

/** ?gallery=1&line=<id> : n'affiche que la lignée de cette espèce de base (captures). */
const lineFilter = (chain: SpeciesDef[]): boolean => {
  const line = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('line');
  return !line || chain[0].id === line;
};

/** Lignées dans l'ordre du catalogue : [base, stade 2, stade 3]. */
function buildLineages(): SpeciesDef[][] {
  const all = Object.values(SPECIES);
  const evolved = new Set(all.map((s) => s.evolvesTo).filter(Boolean));
  return all
    .filter((s) => !evolved.has(s.id))
    .map((base) => {
      const chain = [base];
      let current = base;
      while (current.evolvesTo && SPECIES[current.evolvesTo] && chain.length < 4) {
        current = SPECIES[current.evolvesTo];
        chain.push(current);
      }
      return chain;
    });
}

/**
 * Galerie de revue (`?gallery=1`) — outil de développement, pas un écran du jeu.
 * Affiche chaque créature en 3D (face et profil) à chaque stade avec ses données, et un aperçu de chaque biome.
 */
export function GalleryPage() {
  const lineages = useMemo(buildLineages, []);
  const [shots, setShots] = useState<GalleryShots | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // laisse le temps d'afficher « Rendu en cours » avant le rendu synchrone des vignettes
    const timer = window.setTimeout(() => {
      try {
        setShots(renderGalleryShots(Object.keys(SPECIES), BIOME_ORDER.map((id) => BIOMES[id])));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, []);

  const speciesCount = Object.keys(SPECIES).length;

  return (
    <main
      data-testid="gallery-page"
      data-ready={shots ? 'true' : 'false'}
      className="w-full h-full overflow-y-auto cubi-scroll bg-[#121722] text-[#FAF7F0] p-4 sm:p-6"
    >
      <header className="max-w-6xl mx-auto mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#F4B942]">Outil de développement</p>
        <h1 className="font-display text-3xl font-extrabold">Galerie de revue</h1>
        <p className="mt-1 text-sm text-[#B8C2D1]">
          {speciesCount} créatures en {lineages.length} lignées · {BIOME_ORDER.length} biomes · {STAGES.length} niveaux.
          Images fixes rendues avec les modèles et l’éclairage du jeu.{' '}
          <a className="underline text-[#38BDF8]" href="?">
            Retour au jeu
          </a>
        </p>
        {!shots && !error && <p className="mt-3 text-sm text-[#F4B942]">Rendu des vignettes en cours…</p>}
        {error && <p className="mt-3 text-sm text-[#E85D3F]">Rendu impossible : {error}</p>}
      </header>

      <section className="max-w-6xl mx-auto space-y-4" aria-label="Créatures par lignée">
        {lineages.filter(lineFilter).map((chain) => (
          <div key={chain[0].id} className="voxel-panel rounded-2xl p-3 sm:p-4" data-lineage={chain[0].id}>
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <ElementIcon element={chain[0].element} size={18} />
              Lignée {chain.map((s) => s.name).join(' → ')}
              <span className="text-xs font-normal text-[#B8C2D1]">· {ELEMENT_META[chain[0].element].label}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {chain.map((species, idx) => {
                const move = MOVES[species.moveId];
                const summonRarity = SUMMON_RARITY[species.id];
                const seenIn = STAGES.filter((st) =>
                  st.waves.some((w) => w.enemies.some((e) => e.speciesId === species.id)),
                ).map((st) => st.id);
                return (
                  <article
                    key={species.id}
                    data-species={species.id}
                    className="rounded-xl bg-[#1B2231] border border-[#344056] p-3"
                  >
                    <div className="flex gap-2 justify-center bg-[#141A26] rounded-lg">
                      {shots?.creatures[species.id] ? (
                        shots.creatures[species.id].map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            width={150}
                            height={150}
                            alt={`${species.name}, ${i === 0 ? 'trois-quarts face' : 'profil'}`}
                          />
                        ))
                      ) : (
                        <div className="h-[150px]" />
                      )}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-xl font-bold">{species.name}</h3>
                      <span className="text-[11px] font-mono-num text-[#B8C2D1]">
                        stade {idx + 1}/{chain.length}
                        {species.isRare ? ' · rare' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#CBD5E1]">
                      {ELEMENT_META[species.element].label} · {ROLE_LABEL[species.role]} · silhouette{' '}
                      <code>{species.archetype}</code> · échelle {species.scale}
                    </p>
                    <dl className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] font-mono-num">
                      {(
                        [
                          ['PV', species.baseHp],
                          ['ATQ', species.baseAtk],
                          ['Vit.', species.moveSpeed],
                          ['Portée', species.attackRange],
                        ] as [string, number][]
                      ).map(([label, value]) => (
                        <div key={label} className="rounded bg-[#222A3A] py-1">
                          <dt className="text-[#94A3B8]">{label}</dt>
                          <dd className="font-bold text-[#FAF7F0]">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-xs">
                      <strong style={{ color: move?.color }}>{move?.name ?? species.moveId}</strong>{' '}
                      <span className="text-[#94A3B8]">
                        ({move?.style} · ×{move?.powerMultiplier} · {move?.cooldown} s)
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-[#B8C2D1]">
                      {species.evolvesTo
                        ? `Évolue en ${SPECIES[species.evolvesTo]?.name} au niveau ${species.evolveLevel}.`
                        : 'Stade final.'}
                    </p>
                    <p className="mt-1 text-[11px] italic text-[#CBD5E1]">{species.dexNote}</p>
                    <p className="mt-1 text-[10px] text-[#94A3B8]">
                      Cube Scellé : {summonRarity ?? 'ne sort pas des cubes'}
                      <br />
                      Rencontré dans : {seenIn.length ? seenIn.join(', ') : 'aucun niveau'}
                    </p>
                    <div className="mt-2 flex gap-1" aria-label="Palette">
                      {Object.entries(species.palette).map(([key, hex]) => (
                        <span
                          key={key}
                          title={`${key} ${hex}`}
                          className="w-5 h-5 rounded border border-[#0F1420]"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="max-w-6xl mx-auto mt-8" aria-label="Biomes">
        <h2 className="font-display text-2xl font-extrabold mb-3">Biomes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BIOME_ORDER.map((id) => {
            const biome = BIOMES[id];
            const stages = STAGES.filter((s) => s.biomeId === id);
            return (
              <article key={id} data-biome={id} className="voxel-panel rounded-2xl overflow-hidden">
                {shots?.biomes[id] ? (
                  <img src={shots.biomes[id]} alt={`Aperçu de ${biome.name}`} className="w-full block" />
                ) : (
                  <div className="aspect-video bg-[#141A26]" />
                )}
                <div className="p-3">
                  <h3 className="font-display text-xl font-bold flex items-center gap-2">
                    <ElementIcon element={biome.dominantElement} size={18} />
                    {biome.name}
                  </h3>
                  <p className="text-xs text-[#B8C2D1]">{biome.subtitle}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {stages.map((stage) => (
                      <li key={stage.id} className="flex flex-wrap items-baseline gap-x-2">
                        <a className="underline text-[#38BDF8] font-semibold" href={buildPreviewQuery(stage)}>
                          {stage.name}
                        </a>
                        <span className="text-[#94A3B8]">
                          boss {SPECIES[stage.bossSpeciesId]?.name} · kit {stage.bossKit ?? 'classic'} · puissance{' '}
                          {stage.recommendedPower}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
