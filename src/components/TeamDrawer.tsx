import React, { useState } from 'react';
import { ArrowUpCircle, ChevronDown, Crown, Lock, Sparkles, X } from 'lucide-react';
import { ELEMENT_META, RUNE_ORDER, RUNES, MOVES, SPECIES } from '../game/catalog';
import {
  canEquipStone,
  canEvolve,
  computeCreatureStats,
  computeSquadPower,
  isStoneEquippedAnywhere,
  lineageOf,
  swapSquadMember,
  toggleSquadMember,
  xpForNextLevel,
} from '../game/rules';
import type { ElementType, OwnedCreature, RuneKind, PowerStone, SaveState } from '../game/types';
import { ElementIcon, StoneIcon, VoxelCreatureAvatar } from './Icons';
import { CreatureTurntable } from './CreatureTurntable';
import { BlockButton, ElementBadge } from './ui';
import { FR } from '../i18n/fr';

interface TeamDrawerProps {
  save: SaveState;
  onToggleSquadMember: (uid: string) => void;
  /** A3.3 : escouade pleine, échange un membre du trio contre une créature de la réserve. */
  onSwapSquadMember: (outUid: string, inUid: string) => void;
  /** A3.3 : active ou coupe la variante de couleur d'une lignée débloquée. */
  onToggleVariant: (lineage: string) => void;
  onEquipStone: (creatureUid: string, slotIdx: number, stoneId: string) => void;
  onUnequipStone: (creatureUid: string, slotIdx: number) => void;
  onEquipRune: (creatureUid: string, slotIdx: number, kind: RuneKind | null) => void;
  onEvolve: (creatureUid: string) => void;
  onClose: () => void;
}

const RARITY_BORDER: Record<PowerStone['rarity'], string> = {
  common: '#475569',
  bronze: '#D97706',
  silver: '#CBD5E1',
  gold: '#F4B942',
};

const SUBSTAT_LABELS: Record<string, string> = {
  critRate: FR.ui.teamDrawer.critique,
  hitHeal: FR.ui.teamDrawer.vampirisme,
  moveSpeed: FR.ui.teamDrawer.vitesse,
  statusRes: FR.ui.teamDrawer.resist,
};

const T = FR.ui.teamDrawer;
const ELEMENT_ORDER = Object.keys(ELEMENT_META) as ElementType[];

export function TeamDrawer({
  save,
  onToggleSquadMember,
  onSwapSquadMember,
  onToggleVariant,
  onEquipStone,
  onUnequipStone,
  onEquipRune,
  onEvolve,
  onClose,
}: TeamDrawerProps) {
  const [selectedUid, setSelectedUid] = useState<string>(save.squadIds[0] ?? save.roster[0]?.uid);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [stoneFilter, setStoneFilter] = useState<'all' | 'atk' | 'hp'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [dragUid, setDragUid] = useState<string | null>(null);

  const creature = save.roster.find((c) => c.uid === selectedUid) ?? save.roster[0];
  if (!creature) return null;

  const species = SPECIES[creature.speciesId] ?? SPECIES.pyrocube;
  const stats = computeCreatureStats(creature, save.powerStones);
  const move = MOVES[creature.moveId] ?? MOVES.ember_burst;
  const squadPower = computeSquadPower(save);
  const squad = save.squadIds
    .map((id) => save.roster.find((c) => c.uid === id))
    .filter((c): c is OwnedCreature => !!c);
  const squadFull = save.squadIds.length >= 3;
  // Le meneur (premier de l'escouade) décide de l'effet du Déchaînement
  const leaderElement = squad[0] ? SPECIES[squad[0].speciesId]?.element : undefined;
  const squadElements = squad.map((c) => SPECIES[c.speciesId]?.element).filter((e): e is ElementType => !!e);
  const trioStatus =
    squad.length < 3 ? T.trioIncomplet : new Set(squadElements).size === 3 ? T.trioPossible : T.trioImpossible;
  const trioOk = squad.length === 3 && new Set(squadElements).size === 3;
  const inSquad = save.squadIds.includes(creature.uid);
  const evolvable = canEvolve(creature);
  const nextEvoSpecies = species.evolvesTo ? SPECIES[species.evolvesTo] : null;
  const activeSlot = creature.stoneBoard[selectedSlotIdx];
  const stoneMap = new Map(save.powerStones.map((s) => [s.id, s]));
  const lineage = lineageOf(creature.speciesId);
  const bond = Math.max(0, Math.min(5, Math.floor(save.bonds[lineage] ?? 0)));
  const variantUnlocked = save.variantsUnlocked.includes(lineage);
  const variantOn = variantUnlocked && save.variantsOn.includes(lineage);

  const filteredStones = save.powerStones
    .filter((s) => stoneFilter === 'all' || s.kind === stoneFilter)
    .sort((a, b) => b.power - a.power);

  // Réserve : le roster hors escouade, trié par élément puis par nom
  const reserve = save.roster
    .filter((c) => !save.squadIds.includes(c.uid))
    .sort((a, b) => {
      const sa = SPECIES[a.speciesId];
      const sb = SPECIES[b.speciesId];
      const d = ELEMENT_ORDER.indexOf(sa.element) - ELEMENT_ORDER.indexOf(sb.element);
      return d !== 0 ? d : sa.name.localeCompare(sb.name, 'fr');
    });

  /** Ce que fait un clic sur une créature de la réserve (règles pures : refus = sauvegarde inchangée). */
  const reserveAction = (uid: string, outUid: string | null): 'add' | 'swap' | null => {
    if (!squadFull) return toggleSquadMember(save, uid) !== save ? 'add' : null;
    if (!outUid || !save.squadIds.includes(outUid)) return null;
    return swapSquadMember(save, outUid, uid) !== save ? 'swap' : null;
  };
  const swapTarget = inSquad ? creature.uid : null;

  const select = (uid: string) => {
    setSelectedUid(uid);
    setSelectedSlotIdx(0);
  };

  const onReserveClick = (uid: string) => {
    const action = reserveAction(uid, swapTarget);
    if (action === 'add') onToggleSquadMember(uid);
    else if (action === 'swap' && swapTarget) onSwapSquadMember(swapTarget, uid);
    else return;
    select(uid);
  };

  const onDropOnTrio = (outUid: string) => {
    if (!dragUid) return;
    if (reserveAction(dragUid, outUid) === 'swap') {
      onSwapSquadMember(outUid, dragUid);
      select(dragUid);
    }
    setDragUid(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-2 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-drawer-title"
        className="voxel-panel w-full max-w-6xl max-h-[94vh] sm:max-h-[90vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* En-tête : titre, puissance, résumé du trio */}
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#39445A]">
          <div className="min-w-0">
            <h2 id="team-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              {T.titre}
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              {T.puissance(squadPower.toLocaleString('fr-FR'))}
            </p>
            {/* Ligne qui résume le trio : éléments, Trio possible ou non, Déchaînement du meneur */}
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#CBD5E1]">
              <span>{T.elements}</span>
              {squadElements.map((el, i) => (
                <ElementIcon key={i} element={el} size={16} />
              ))}
              <span className={`font-bold ${trioOk ? 'text-[#2FB97A]' : 'text-[#F4B942]'}`}>· {trioStatus}</span>
              {leaderElement && (
                <span>
                  · {T.dechainementDuMeneur(FR.ui.ultimateWords[leaderElement])} {FR.ui.ultimateEffects[leaderElement]}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn cursor-pointer w-11 h-11 sm:w-9 sm:h-9 shrink-0 rounded-lg block-btn-secondary border border-[#39445A] flex items-center justify-center"
            aria-label={T.fermerLaGestionDEquipe}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto cubi-scroll p-3 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)] gap-4">
            {/* À gauche : le trio */}
            <section aria-label={T.trio} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                {T.trio} ({save.squadIds.length}/3)
              </p>
              <div className="flex flex-row flex-wrap justify-center sm:flex-col gap-2">
                {squad.map((c, i) => {
                  const sp = SPECIES[c.speciesId];
                  const selected = c.uid === creature.uid;
                  return (
                    <button
                      key={c.uid}
                      type="button"
                      onClick={() => select(c.uid)}
                      onDragOver={(e) => {
                        if (dragUid) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDropOnTrio(c.uid);
                      }}
                      aria-pressed={selected}
                      aria-label={T.choisir(sp.name)}
                      className={`voxel-btn cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center text-center w-[104px] sm:w-full ${
                        selected ? 'bg-[#263249] border-[#F4B942]' : 'bg-[#192130] border-[#2E3A50]'
                      }`}
                      style={{ borderBottomColor: ELEMENT_META[sp.element].color, borderBottomWidth: 5 }}
                    >
                      <VoxelCreatureAvatar speciesId={c.speciesId} size={96} />
                      <span className="mt-1 font-display font-bold text-xs truncate max-w-full">{sp.name}</span>
                      <span className="font-mono-num text-[10px] text-[#B8C2D1]">
                        {T.niv}
                        {c.level}
                      </span>
                      {i === 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#3A2F12] px-1.5 py-0.5 text-[10px] font-bold text-[#F4B942]">
                          <Crown className="w-3 h-3" aria-hidden="true" />
                          {T.meneur}
                        </span>
                      )}
                      {i === 0 && (
                        <span className="mt-1 text-[10px] leading-tight text-[#CBD5E1]">
                          {FR.ui.ultimateEffects[sp.element]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Au centre : la créature choisie */}
            <section className="space-y-3 min-w-0">
              <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3 flex flex-col md:flex-row items-center gap-4">
                <div className="shrink-0">
                  <CreatureTurntable speciesId={creature.speciesId} size={200} variant={variantOn} />
                </div>
                <div className="min-w-0 flex-1 w-full space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl font-bold">{species.name}</h3>
                    <span className="font-mono-num text-sm text-[#B8C2D1]">
                      {T.niv}
                      {creature.level}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <ElementBadge element={species.element} />
                    <span className="text-[#B8C2D1]">
                      {T.role} : <strong className="text-[#FAF7F0]">{FR.ui.carnet.roles[species.role]}</strong>
                    </span>
                    <span className="text-[#F4B942] tracking-wider" aria-label={T.lienAria(bond)} title={T.lienAria(bond)}>
                      {T.etoiles(bond)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-[#1F2738] border border-[#344056] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs">
                        <span className="uppercase tracking-wider text-[10px] text-[#B8C2D1]">{T.sort} · </span>
                        <strong className="font-display">{move.name}</strong>
                      </p>
                      <span className="font-mono-num text-[11px] text-[#F4B942] whitespace-nowrap">
                        {T.recharge(move.cooldown)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#CBD5E1]">{move.description}</p>
                  </div>

                  {variantUnlocked && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={variantOn}
                      onClick={() => onToggleVariant(lineage)}
                      className="cursor-pointer inline-flex items-center gap-2 min-h-[44px] sm:min-h-[36px] text-xs font-semibold"
                    >
                      <span
                        className={`relative inline-block w-10 h-5 rounded-full border transition-colors ${
                          variantOn ? 'bg-[#2FB97A] border-[#141925]' : 'bg-[#2A3449] border-[#475569]'
                        }`}
                        aria-hidden="true"
                      >
                        <span
                          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-[#FAF7F0] transition-all ${
                            variantOn ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </span>
                      {T.variante}
                    </button>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <BlockButton
                      size="sm"
                      silent
                      disabled={(!inSquad && squadFull) || (inSquad && save.squadIds.length <= 1) || (!inSquad && reserveAction(creature.uid, null) === null)}
                      title={
                        !inSquad && squadFull
                          ? T.lEscouadeCompteDeja3Creatures
                          : inSquad && save.squadIds.length <= 1
                            ? T.lEscouadeDoitGarderAuMoins
                            : undefined
                      }
                      variant={inSquad ? 'secondary' : 'primary'}
                      onClick={() => onToggleSquadMember(creature.uid)}
                      className="disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {inSquad
                        ? save.squadIds.length <= 1
                          ? T.dernierMembre
                          : T.retirerEscouade
                        : squadFull
                          ? T.escouadeComplete
                          : T.mettreEnEscouade}
                    </BlockButton>
                    <BlockButton
                      size="sm"
                      aria-expanded={showDetails}
                      aria-controls="team-details"
                      onClick={() => setShowDetails((v) => !v)}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                      {showDetails ? T.masquerDetails : T.details}
                    </BlockButton>
                  </div>

                  {/* Évolution : reste visible hors des détails */}
                  {nextEvoSpecies && species.evolveLevel && (
                    <div className="pt-2 border-t border-[#283247] flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[#CBD5E1]">
                        {T.evolution}<strong>{nextEvoSpecies.name}</strong>{T.niv2}{species.evolveLevel})
                      </p>
                      <button
                        type="button"
                        disabled={!evolvable}
                        onClick={() => onEvolve(creature.uid)}
                        className={`voxel-btn inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[32px] rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 ${
                          evolvable
                            ? 'cursor-pointer bg-[#F4B942] hover:bg-[#F7C75F] text-[#141925] border-[#141925]'
                            : 'bg-[#1D2434] text-[#64748B] border-[#2E384E] cursor-not-allowed'
                        }`}
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        {evolvable ? T.faireEvoluer : T.nivRequis(species.evolveLevel)}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Détails : statistiques, Runes et Galets (contenu de l'ancien tiroir) */}
              {showDetails && (
                <div id="team-details" className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-3 min-w-0">
                    <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">{T.statistiques}</p>
                        <span className="text-[11px] text-[#B8C2D1]">
                          {T.niv}<strong className="font-mono-num text-[#FAF7F0]">{creature.level}</strong>{T.xp}{' '}
                          <span className="font-mono-num">
                            {creature.xp}/{xpForNextLevel(creature.level)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-[#202838] py-1.5 px-1">
                          <p className="text-[10px] uppercase text-[#B8C2D1]">{T.pv}</p>
                          <p className="font-mono-num text-sm font-bold text-[#2FB97A]">{stats.maxHp}</p>
                        </div>
                        <div className="rounded-lg bg-[#202838] py-1.5 px-1">
                          <p className="text-[10px] uppercase text-[#B8C2D1]">{T.atq}</p>
                          <p className="font-mono-num text-sm font-bold text-[#E85D3F]">{stats.atk}</p>
                        </div>
                        <div className="rounded-lg bg-[#202838] py-1.5 px-1">
                          <p className="text-[10px] uppercase text-[#B8C2D1]">{T.crit}</p>
                          <p className="font-mono-num text-sm font-bold text-[#F4B942]">{stats.critRate}%</p>
                        </div>
                        <div className="rounded-lg bg-[#202838] py-1.5 px-1">
                          <p className="text-[10px] uppercase text-[#B8C2D1]">{T.vamp}</p>
                          <p className="font-mono-num text-sm font-bold text-[#38BDF8]">{stats.hitHeal}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Runes */}
                    <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">{T.runes}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {creature.runes.map((equippedKind, mIdx) => (
                          <div
                            key={mIdx}
                            className="rounded-lg bg-[#1F2738] border border-[#344056] p-2 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[#B8C2D1]">
                                {T.rune}{mIdx + 1}
                              </span>
                              {equippedKind && (
                                <button
                                  type="button"
                                  onClick={() => onEquipRune(creature.uid, mIdx, null)}
                                  className="cursor-pointer text-[10px] text-[#E85D3F] hover:underline min-h-[32px]"
                                >
                                  {T.retirer}
                                </button>
                              )}
                            </div>
                            {equippedKind ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <Sparkles
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: RUNES[equippedKind].color }}
                                />
                                <span className="truncate">{RUNES[equippedKind].name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {RUNE_ORDER.map((kind) => {
                                  const qty = save.runeBag[kind] ?? 0;
                                  if (qty <= 0) return null;
                                  return (
                                    <button
                                      key={kind}
                                      type="button"
                                      onClick={() => onEquipRune(creature.uid, mIdx, kind)}
                                      className="cursor-pointer px-1.5 py-0.5 min-h-[32px] rounded bg-[#151B27] hover:bg-[#2C374F] border border-[#3A4760] text-[10px] font-semibold"
                                      style={{ color: RUNES[kind].color }}
                                      title={RUNES[kind].description}
                                    >
                                      +{RUNES[kind].name.replace(/^Rune d(e |’)/, '')} ({qty})
                                    </button>
                                  );
                                })}
                                {Object.values(save.runeBag).every((q) => q <= 0) && (
                                  <span className="text-[10px] text-[#64748B]">{T.aucuneEnSac}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grille de Galets 3x3 */}
                    <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                          {T.grilleDePierresDePouvoir3}
                        </p>
                        {activeSlot?.stoneId && (
                          <button
                            type="button"
                            onClick={() => onUnequipStone(creature.uid, selectedSlotIdx)}
                            className="cursor-pointer text-xs font-semibold text-[#E85D3F] hover:underline min-h-[32px]"
                          >
                            {T.retirerLaPierre}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {creature.stoneBoard.map((slot, idx) => {
                          const locked = creature.level < slot.unlockLevel;
                          const equipped = slot.stoneId ? stoneMap.get(slot.stoneId) : null;
                          const selected = idx === selectedSlotIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={locked}
                              onClick={() => setSelectedSlotIdx(idx)}
                              aria-label={T.emplacementPierre(idx + 1, slot.type)}
                              className={`rounded-xl py-2 px-2 border-2 flex flex-col items-center justify-center min-h-[60px] transition-colors ${
                                locked
                                  ? 'bg-[#121722] border-[#252E40] opacity-55 cursor-not-allowed'
                                  : selected
                                    ? 'bg-[#28344B] border-[#F4B942] cursor-pointer'
                                    : 'bg-[#1C2434] border-[#344056] hover:border-[#64748B] cursor-pointer'
                              }`}
                            >
                              {locked ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-[#64748B]" />
                                  <span className="font-mono-num text-[10px] text-[#94A3B8] mt-0.5">
                                    {T.niv3}{slot.unlockLevel}
                                  </span>
                                </>
                              ) : equipped ? (
                                <>
                                  <StoneIcon kind={equipped.kind} size={20} />
                                  <span className="font-mono-num text-xs font-bold text-[#FAF7F0] mt-0.5">
                                    +{equipped.power} {equipped.kind === 'atk' ? T.atq : T.pv}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <StoneIcon kind={slot.type} size={18} />
                                  <span className="text-[10px] text-[#94A3B8] mt-0.5">
                                    {slot.type === 'flex' ? T.mixte : slot.type === 'atk' ? T.atq : T.pv}
                                  </span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sac de Galets */}
                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                        {T.sacDePierres}{filteredStones.length})
                      </p>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#141A26] border border-[#344056]">
                        {(['all', 'atk', 'hp'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setStoneFilter(f)}
                            className={`cursor-pointer px-2.5 min-h-[36px] rounded text-[11px] font-bold ${
                              stoneFilter === f ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1]'
                            }`}
                          >
                            {f === 'all' ? T.tout : f === 'atk' ? T.atq : T.pv}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[56vh] overflow-y-auto cubi-scroll pr-1 ui-cascade">
                      {filteredStones.map((stone) => {
                        const compatible = canEquipStone(creature, selectedSlotIdx, stone);
                        const ownerUid = isStoneEquippedAnywhere(save, stone.id);
                        const ownerName = ownerUid
                          ? SPECIES[save.roster.find((r) => r.uid === ownerUid)?.speciesId ?? 'pyrocube']?.name
                          : null;
                        const isOnSelectedSlot = activeSlot?.stoneId === stone.id;

                        return (
                          <button
                            key={stone.id}
                            type="button"
                            disabled={!compatible || isOnSelectedSlot}
                            title={compatible ? undefined : T.lEmplacementSelectionneNAcceptePas}
                            onClick={() => onEquipStone(creature.uid, selectedSlotIdx, stone.id)}
                            className={`w-full text-left rounded-xl p-3 border-2 transition-colors flex items-center justify-between gap-2 ${
                              isOnSelectedSlot
                                ? 'bg-[#24322B] border-[#2FB97A] cursor-default'
                                : compatible
                                  ? 'bg-[#1B2333] hover:bg-[#253046] cursor-pointer'
                                  : 'bg-[#141925] opacity-45 cursor-not-allowed'
                            }`}
                            style={{
                              borderColor: isOnSelectedSlot
                                ? '#2FB97A'
                                : compatible
                                  ? RARITY_BORDER[stone.rarity]
                                  : '#263042',
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <StoneIcon kind={stone.kind} size={26} />
                              <div className="min-w-0">
                                <p className="font-mono-num text-sm font-bold text-[#FAF7F0]">
                                  +{stone.power} {stone.kind === 'atk' ? T.atq : T.pv}
                                </p>
                                <p className="text-[11px] text-[#B8C2D1] truncate">
                                  {stone.substats.length > 0
                                    ? stone.substats
                                        .map((s) => `${SUBSTAT_LABELS[s.type]} +${s.value}%`)
                                        .join(' · ')
                                    : T.pierreStandard}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold uppercase text-[#F4B942] block">
                                {isOnSelectedSlot ? T.equipee : compatible ? T.equiper : T.mauvaisType}
                              </span>
                              {ownerName && !isOnSelectedSlot && (
                                <span className="text-[10px] text-[#94A3B8]">{ownerName}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* En bas : la réserve, triée par élément */}
          <section aria-label={T.reserve} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                {T.reserve} ({reserve.length})
              </p>
              {reserve.length > 0 && (
                <p className="text-[11px] text-[#94A3B8]">
                  {!squadFull ? T.aideAjout : swapTarget ? T.aideEchange(species.name) : T.aideChoisir}
                </p>
              )}
            </div>
            {reserve.length === 0 ? (
              <p className="text-xs text-[#64748B]">{T.reserveVide}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {reserve.map((c) => {
                  const sp = SPECIES[c.speciesId];
                  const action = reserveAction(c.uid, swapTarget);
                  const label =
                    action === 'swap'
                      ? T.echangerAvec(sp.name, species.name)
                      : action === 'add'
                        ? T.ajouterAuTrio(sp.name)
                        : squadFull && !swapTarget
                          ? T.aideChoisir
                          : T.memeLignee;
                  return (
                    <button
                      key={c.uid}
                      type="button"
                      draggable={squadFull}
                      onDragStart={() => setDragUid(c.uid)}
                      onDragEnd={() => setDragUid(null)}
                      disabled={action === null}
                      onClick={() => onReserveClick(c.uid)}
                      aria-label={label}
                      title={label}
                      className={`voxel-btn rounded-xl border-2 p-1.5 flex flex-col items-center w-[76px] min-h-[44px] ${
                        action === null
                          ? 'bg-[#141925] border-[#263042] opacity-45 cursor-not-allowed'
                          : 'bg-[#192130] border-[#2E3A50] hover:border-[#F4B942] cursor-pointer'
                      }`}
                      style={{ borderBottomColor: ELEMENT_META[sp.element].color, borderBottomWidth: 4 }}
                    >
                      <VoxelCreatureAvatar speciesId={c.speciesId} size={56} />
                      <span className="mt-0.5 font-display font-bold text-[10px] truncate max-w-full">{sp.name}</span>
                      <span className="font-mono-num text-[10px] text-[#B8C2D1]">
                        {T.n}
                        {c.level}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
