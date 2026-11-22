/**
 * Galerie de l'interface (`?gallery=ui`, outil de développement) : chaque composant et chaque moment fort,
 * avec un bouton pour le rejouer. Textes en place (outil jamais vu par le joueur, comme GalleryPage).
 */
import React, { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ELEMENT_META } from '../../game/catalog';
import type { ElementType } from '../../game/types';
import { AnimatedBar, BlockButton, BlockPanel, CountUp, CreatureCard, ElementBadge, Modal, NewBadge, Tabs, Toast } from './index';
import { MOMENT_DEMOS } from './moments';

const ELEMENTS = Object.keys(ELEMENT_META) as ElementType[];

export function UiGallery() {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [xp, setXp] = useState(40);
  const [levels, setLevels] = useState(0);
  const [count, setCount] = useState(1250);
  const [moment, setMoment] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const active = MOMENT_DEMOS.find((m) => m.id === moment);
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-full overflow-y-auto bg-[#141925] p-4 sm:p-8 text-[#FAF7F0]" style={{ height: '100vh' }}>
        <h1 className="font-display text-3xl font-extrabold">Interface — composants et moments</h1>
        <p className="text-sm text-[#B8C2D1] mt-1">Direction « jouet voxel ». Outil de développement.</p>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <BlockPanel className="p-4">
            <h2 className="font-display font-bold text-lg">BlockButton</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <BlockButton variant="primary">Principal</BlockButton>
              <BlockButton variant="secondary">Secondaire</BlockButton>
              <BlockButton variant="danger">Danger</BlockButton>
              <BlockButton variant="gold">Doré</BlockButton>
              <BlockButton variant="primary" disabled>
                Désactivé
              </BlockButton>
            </div>
          </BlockPanel>

          <BlockPanel className="p-4" accent="#F4B942">
            <h2 className="font-display font-bold text-lg">BlockPanel et ElementBadge</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ELEMENTS.map((e) => (
                <ElementBadge key={e} element={e} />
              ))}
              <NewBadge />
            </div>
          </BlockPanel>

          <BlockPanel className="p-4">
            <h2 className="font-display font-bold text-lg">CreatureCard</h2>
            <div className="mt-3 grid gap-2">
              <CreatureCard speciesId="pyrocube" name="Pyrocube" level={12} element="fire" hp={180} maxHp={240} xp={xp} xpMax={100} selected />
              <CreatureCard speciesId="aquabloc" name="Aquabloc" level={11} element="water" hp={240} maxHp={240} badge={<NewBadge />} onClick={() => setToast('Carte choisie')} />
            </div>
          </BlockPanel>

          <BlockPanel className="p-4">
            <h2 className="font-display font-bold text-lg">AnimatedBar et CountUp</h2>
            <div className="mt-3 space-y-3">
              <AnimatedBar value={xp} max={100} color="#F4B942" levelUps={levels} label="XP" />
              <div className="flex flex-wrap gap-2">
                <BlockButton size="sm" onClick={() => setXp((v) => Math.min(100, v + 25))}>
                  +25 XP
                </BlockButton>
                <BlockButton
                  size="sm"
                  variant="gold"
                  onClick={() => {
                    setLevels((n) => n + 1);
                    setXp(15);
                  }}
                >
                  Passer un niveau
                </BlockButton>
              </div>
              <p className="font-display text-3xl font-extrabold text-[#F4B942]">
                <CountUp key={count} value={count} />
              </p>
              <BlockButton size="sm" onClick={() => setCount((c) => c + 1750)}>
                Rejouer le défilement
              </BlockButton>
            </div>
          </BlockPanel>

          <BlockPanel className="p-4">
            <h2 className="font-display font-bold text-lg">Tabs, Toast, Modal</h2>
            <div className="mt-3 space-y-3">
              <Tabs
                label="Démo"
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'a', label: 'Prairie' },
                  { id: 'b', label: 'Rive' },
                  { id: 'c', label: 'Crête' },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <BlockButton size="sm" onClick={() => setToast('Recette découverte !')}>
                  Afficher un Toast
                </BlockButton>
                <BlockButton size="sm" variant="primary" onClick={() => setModal(true)}>
                  Ouvrir une Modal
                </BlockButton>
              </div>
            </div>
          </BlockPanel>
        </section>

        <h2 className="mt-8 font-display text-2xl font-extrabold">Moments forts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOMENT_DEMOS.map((m) => (
            <BlockButton
              key={m.id}
              variant={moment === m.id ? 'gold' : 'secondary'}
              onClick={() => {
                setMoment(m.id);
                setReplay((n) => n + 1);
              }}
            >
              {m.label}
            </BlockButton>
          ))}
        </div>
        {active && (
          <div className="mt-4" key={`${active.id}-${replay}`}>
            {active.render(() => setMoment(null))}
          </div>
        )}

        <Modal open={modal} title="Fenêtre en bloc" onClose={() => setModal(false)}>
          <p className="text-sm text-[#B8C2D1]">Elle entre en rebond ; Échap la ferme.</p>
          <div className="mt-4 flex justify-end">
            <BlockButton variant="primary" onClick={() => setModal(false)}>
              Fermer
            </BlockButton>
          </div>
        </Modal>
        <Toast message={toast} onDone={() => setToast(null)} />
      </div>
    </MotionConfig>
  );
}
