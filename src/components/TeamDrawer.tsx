import React, { useState } from 'react';
import { ArrowUpCircle, Lock, Sparkles, X } from 'lucide-react';
import { ELEMENT_META, MOVE_STONES, MOVES, SPECIES } from '../game/catalog';
import {
  canEquipStone,
  canEvolve,
  computeCreatureStats,
  computeSquadPower,
  isStoneEquippedAnywhere,
  xpForNextLevel,
} from '../game/rules';
import type { MoveStoneKind, PowerStone, SaveState } from '../game/types';
import { ElementIcon, StoneIcon, VoxelCreatureAvatar } from './Icons';

interface TeamDrawerProps {
  save: SaveState;
  onToggleSquadMember: (uid: string) => void;
  onEquipStone: (creatureUid: string, slotIdx: number, stoneId: string) => void;
  onUnequipStone: (creatureUid: string, slotIdx: number) => void;
  onEquipMoveStone: (creatureUid: string, slotIdx: number, kind: MoveStoneKind | null) => void;
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
  critRate: 'Critique',
  hitHeal: 'Vampirisme',
  moveSpeed: 'Vitesse',
  statusRes: 'Résist.',
};

export function TeamDrawer({
  save,
  onToggleSquadMember,
  onEquipStone,
  onUnequipStone,
  onEquipMoveStone,
  onEvolve,
  onClose,
}: TeamDrawerProps) {
  const [selectedUid, setSelectedUid] = useState<string>(save.squadIds[0] ?? save.roster[0]?.uid);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [stoneFilter, setStoneFilter] = useState<'all' | 'atk' | 'hp'>('all');

  const creature = save.roster.find((c) => c.uid === selectedUid) ?? save.roster[0];
  if (!creature) return null;

  const species = SPECIES[creature.speciesId] ?? SPECIES.pyrocube;
  const stats = computeCreatureStats(creature, save.powerStones);
  const move = MOVES[creature.moveId] ?? MOVES.ember_burst;
  const squadPower = computeSquadPower(save);
  const inSquad = save.squadIds.includes(creature.uid);
  const evolvable = canEvolve(creature);
  const nextEvoSpecies = species.evolvesTo ? SPECIES[species.evolvesTo] : null;
  const activeSlot = creature.stoneBoard[selectedSlotIdx];
  const stoneMap = new Map(save.powerStones.map((s) => [s.id, s]));

  const filteredStones = save.powerStones
    .filter((s) => stoneFilter === 'all' || s.kind === stoneFilter)
    .sort((a, b) => b.power - a.power);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0F1420]/65 p-3 sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-drawer-title"
        className="voxel-panel w-full max-w-5xl max-h-[88vh] rounded-2xl flex flex-col overflow-hidden text-[#FAF7F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#39445A]">
          <div>
            <h2 id="team-drawer-title" className="font-display text-xl sm:text-2xl font-bold">
              Escouade & Grille de Pierres de Pouvoir
            </h2>
            <p className="text-xs text-[#B8C2D1]">
              Puissance totale d’escouade :{' '}
              <strong className="font-mono-num text-[#F4B942]">
                {squadPower.toLocaleString('fr-FR')}
              </strong>{' '}
              · {save.squadIds.length}/3 actifs · {save.roster.length} compagnons au camp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="voxel-btn cursor-pointer w-9 h-9 rounded-lg bg-[#222A3A] hover:bg-[#2E384E] border border-[#39445A] flex items-center justify-center"
            aria-label="Fermer la gestion d'équipe"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main 3-column responsive grid */}
        <div className="flex-1 overflow-y-auto cubi-scroll p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Column 1: Roster & Active Squad Selector */}
          <div className="lg:col-span-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
              Compagnons ({save.roster.length})
            </p>
            <div className="space-y-2 max-h-[56vh] overflow-y-auto cubi-scroll pr-1">
              {save.roster.map((c) => {
                const sp = SPECIES[c.speciesId];
                const st = computeCreatureStats(c, save.powerStones);
                const isActive = save.squadIds.includes(c.uid);
                const selected = c.uid === creature.uid;
                return (
                  <button
                    key={c.uid}
                    type="button"
                    onClick={() => {
                      setSelectedUid(c.uid);
                      setSelectedSlotIdx(0);
                    }}
                    className={`w-full cursor-pointer text-left rounded-xl p-2.5 border-2 transition-colors flex items-center gap-2.5 ${
                      selected
                        ? 'bg-[#263249] border-[#F4B942]'
                        : 'bg-[#192130] border-[#2E3A50] hover:border-[#64748B]'
                    }`}
                  >
                    <VoxelCreatureAvatar speciesId={c.speciesId} size={38} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-[#FAF7F0] truncate">
                          {sp.name}
                        </span>
                        <span className="font-mono-num text-[10px] text-[#B8C2D1]">N.{c.level}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-0.5">
                        <span className="font-mono-num text-[#F4B942]">{st.power}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-[#2FB97A]">Escouade</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Selected Cubimon Inspector + 3x3 Power Stone Board */}
          <div className="lg:col-span-5 space-y-3">
            {/* Creature Header Card */}
            <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <VoxelCreatureAvatar speciesId={creature.speciesId} size={48} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <ElementIcon element={species.element} size={16} />
                      <h3 className="font-display text-lg font-bold">{species.name}</h3>
                    </div>
                    <p className="text-xs text-[#B8C2D1] mt-0.5">
                      Niv. <strong className="font-mono-num text-[#FAF7F0]">{creature.level}</strong> ·{' '}
                      {ELEMENT_META[species.element].label} · XP{' '}
                      <span className="font-mono-num">
                        {creature.xp}/{xpForNextLevel(creature.level)}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!inSquad && save.squadIds.length >= 3}
                  onClick={() => onToggleSquadMember(creature.uid)}
                  className={`voxel-btn cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 ${
                    inSquad
                      ? 'bg-[#2A3449] border-[#475569] text-[#FAF7F0]'
                      : 'bg-[#2FB97A] border-[#141925] text-[#0F172A]'
                  }`}
                >
                  {inSquad ? 'Retirer escouade' : 'Mettre en escouade'}
                </button>
              </div>

              {/* Stats Strip */}
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-[#202838] py-1.5 px-2">
                  <p className="text-[10px] uppercase text-[#B8C2D1]">PV</p>
                  <p className="font-mono-num text-sm font-bold text-[#2FB97A]">{stats.maxHp}</p>
                </div>
                <div className="rounded-lg bg-[#202838] py-1.5 px-2">
                  <p className="text-[10px] uppercase text-[#B8C2D1]">ATQ</p>
                  <p className="font-mono-num text-sm font-bold text-[#E85D3F]">{stats.atk}</p>
                </div>
                <div className="rounded-lg bg-[#202838] py-1.5 px-2">
                  <p className="text-[10px] uppercase text-[#B8C2D1]">Crit</p>
                  <p className="font-mono-num text-sm font-bold text-[#F4B942]">{stats.critRate}%</p>
                </div>
                <div className="rounded-lg bg-[#202838] py-1.5 px-2">
                  <p className="text-[10px] uppercase text-[#B8C2D1]">Vamp.</p>
                  <p className="font-mono-num text-sm font-bold text-[#38BDF8]">{stats.hitHeal}%</p>
                </div>
              </div>

              {/* Evolution Strip */}
              {nextEvoSpecies && species.evolveLevel && (
                <div className="mt-2.5 pt-2.5 border-t border-[#283247] flex items-center justify-between gap-2">
                  <p className="text-xs text-[#CBD5E1]">
                    Évolution : <strong>{nextEvoSpecies.name}</strong> (Niv. {species.evolveLevel})
                  </p>
                  <button
                    type="button"
                    disabled={!evolvable}
                    onClick={() => onEvolve(creature.uid)}
                    className={`voxel-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 ${
                      evolvable
                        ? 'cursor-pointer bg-[#F4B942] hover:bg-[#F7C75F] text-[#141925] border-[#141925]'
                        : 'bg-[#1D2434] text-[#64748B] border-[#2E384E] cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    {evolvable ? 'Faire évoluer' : `Niv. ${species.evolveLevel} requis`}
                  </button>
                </div>
              )}
            </div>

            {/* Active Move & 2 Move Stone Slots */}
            <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#B8C2D1]">
                    Compétence Spéciale
                  </p>
                  <p className="font-display font-bold text-sm text-[#FAF7F0]">{move.name}</p>
                </div>
                <span className="font-mono-num text-xs text-[#F4B942] whitespace-nowrap shrink-0">
                  {move.cooldown}s
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {creature.moveStones.map((equippedKind, mIdx) => (
                  <div
                    key={mIdx}
                    className="rounded-lg bg-[#1F2738] border border-[#344056] p-2 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#B8C2D1]">
                        Pierre Capacité {mIdx + 1}
                      </span>
                      {equippedKind && (
                        <button
                          type="button"
                          onClick={() => onEquipMoveStone(creature.uid, mIdx, null)}
                          className="cursor-pointer text-[10px] text-[#E85D3F] hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                    {equippedKind ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Sparkles
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: MOVE_STONES[equippedKind].color }}
                        />
                        <span className="truncate">{MOVE_STONES[equippedKind].name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(['broadburst', 'wait_less', 'whack_whack', 'share'] as MoveStoneKind[]).map(
                          (kind) => {
                            const qty = save.moveStoneBag[kind] ?? 0;
                            if (qty <= 0) return null;
                            return (
                              <button
                                key={kind}
                                type="button"
                                onClick={() => onEquipMoveStone(creature.uid, mIdx, kind)}
                                className="cursor-pointer px-1.5 py-0.5 rounded bg-[#151B27] hover:bg-[#2C374F] border border-[#3A4760] text-[10px] font-semibold"
                                style={{ color: MOVE_STONES[kind].color }}
                              >
                                +{MOVE_STONES[kind].name.replace('Pierre ', '')} ({qty})
                              </button>
                            );
                          },
                        )}
                        {Object.values(save.moveStoneBag).every((q) => q <= 0) && (
                          <span className="text-[10px] text-[#64748B]">Aucune en sac</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3x3 Power Stone Board */}
            <div className="rounded-xl bg-[#161C29] border border-[#344056] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                  Grille de Pierres de Pouvoir (3×3)
                </p>
                {activeSlot?.stoneId && (
                  <button
                    type="button"
                    onClick={() => onUnequipStone(creature.uid, selectedSlotIdx)}
                    className="cursor-pointer text-xs font-semibold text-[#E85D3F] hover:underline"
                  >
                    Retirer la pierre
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
                      aria-label={`Emplacement pierre ${idx + 1} (${slot.type})`}
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
                            Niv.{slot.unlockLevel}
                          </span>
                        </>
                      ) : equipped ? (
                        <>
                          <StoneIcon kind={equipped.kind} size={20} />
                          <span className="font-mono-num text-xs font-bold text-[#FAF7F0] mt-0.5">
                            +{equipped.power} {equipped.kind === 'atk' ? 'ATQ' : 'PV'}
                          </span>
                        </>
                      ) : (
                        <>
                          <StoneIcon kind={slot.type} size={18} />
                          <span className="text-[10px] text-[#94A3B8] mt-0.5">
                            {slot.type === 'flex' ? 'Mixte' : slot.type === 'atk' ? 'ATQ' : 'PV'}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 3: Power Stone Bag */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C2D1]">
                Sac de Pierres ({filteredStones.length})
              </p>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#141A26] border border-[#344056]">
                {(['all', 'atk', 'hp'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStoneFilter(f)}
                    className={`cursor-pointer px-2.5 py-1 rounded text-[11px] font-bold ${
                      stoneFilter === f ? 'bg-[#E85D3F] text-[#FAF7F0]' : 'text-[#B8C2D1]'
                    }`}
                  >
                    {f === 'all' ? 'Tout' : f === 'atk' ? 'ATQ' : 'PV'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[56vh] overflow-y-auto cubi-scroll pr-1">
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
                          +{stone.power} {stone.kind === 'atk' ? 'ATQ' : 'PV'}
                        </p>
                        <p className="text-[11px] text-[#B8C2D1] truncate">
                          {stone.substats.length > 0
                            ? stone.substats
                                .map((s) => `${SUBSTAT_LABELS[s.type]} +${s.value}%`)
                                .join(' · ')
                            : 'Pierre standard'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase text-[#F4B942] block">
                        {isOnSelectedSlot ? 'Équipée' : compatible ? 'Équiper' : 'Incompat.'}
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
      </div>
    </div>
  );
}
