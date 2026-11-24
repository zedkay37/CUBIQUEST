/** PROTO-MODELES, modèle C : la main de cartes, le mana, et l'échange de cartes entre deux étages. */
import { useState } from 'react';
import { CARD, CARDS, MANA, type CardState } from './cards';
import type { Game } from './sim';
import { ACTIONS, CONDITIONS, type Rule } from './instincts';

const WHO: Record<string, string> = { 'calcinarque-legendaire': 'Calcinarque', crabastion: 'Crabastion', amanitox: 'Amanitox', ordre: 'Ordre' };
const COLOR: Record<string, string> = { 'calcinarque-legendaire': '#FF8A30', crabastion: '#5FB8E8', amanitox: '#8CD86A', ordre: '#E8D27A' };

export function CardHand({ g, selected, onSettings }: { g: Game; selected: number; tick: number; onSettings: () => void }) {
  const c = g.cards!;
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white">
      <div className="flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-xs">
        <span className="font-bold">Mana</span>
        <div className="h-3 w-56 overflow-hidden rounded bg-black/60">
          <div className="h-full bg-sky-400" style={{ width: `${(100 * c.mana) / MANA.max}%` }} />
        </div>
        <span className="w-8 font-mono">{Math.floor(c.mana)}</span>
      </div>
      <div className="flex items-end gap-2">
        {c.hand.map((id, i) => {
          if (!id) return <div key={i} className="h-28 w-28" />;
          const d = CARD[id];
          const ok = c.mana >= d.cost;
          return (
            <div
              key={i}
              className={`flex h-28 w-28 flex-col rounded-lg border-2 p-1.5 text-xs ${selected === i ? '-translate-y-2 border-amber-300 bg-slate-700' : 'border-white/20 bg-slate-900/90'} ${ok ? '' : 'opacity-50'}`}
              style={{ boxShadow: `inset 0 3px 0 ${COLOR[d.who]}` }}
            >
              <div className="flex justify-between">
                <span className="font-mono font-bold text-amber-300">{i + 1}</span>
                <span className="rounded bg-sky-500 px-1 font-bold">{d.cost}</span>
              </div>
              <div className="mt-1 font-bold leading-tight">{d.name}</div>
              <div className="text-[10px] text-white/60">{WHO[d.who]}</div>
              <div className="mt-auto text-[10px] leading-tight text-white/75">{d.target === 'aucune' ? 'immédiat' : d.target === 'ennemi' ? 'clic : un ennemi' : 'clic : un point'}</div>
            </div>
          );
        })}
        <button type="button" onClick={onSettings} className="pointer-events-auto rounded-md border border-white/20 bg-slate-900/80 px-2 py-2 text-xs">
          Réglages (F1)
        </button>
      </div>
      <div className="text-[11px] text-white/60">Prochaine carte : {c.deck[0] ? CARD[c.deck[0]].name : '—'}</div>
    </div>
  );
}

/** Entre deux étages : échanger jusqu'à 2 cartes du deck contre d'autres de la même équipe. */
export function DeckSwap({ cards, onDone }: { cards: CardState; onDone: () => void }) {
  const [out, setOut] = useState<string | null>(null);
  const [left, setLeft] = useState(2);
  const [, force] = useState(0);
  const deck = cards.all();
  const pool = CARDS.filter((d) => !deck.includes(d.id));
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-4 text-white">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900 p-5 text-sm">
        <h2 className="mb-1 text-xl font-bold">Avant l’étage suivant : ton deck</h2>
        <div className="mb-3 text-white/60">Échanges restants : {left}. Clique une carte du deck, puis une carte de la réserve de l’équipe.</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 font-bold">Deck (10)</div>
            <div className="flex flex-wrap gap-1">
              {deck.map((id, k) => (
                <button key={id + k} type="button" disabled={left === 0} onClick={() => setOut(out === id ? null : id)} className={`rounded px-2 py-1 ${out === id ? 'bg-amber-300 text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}>
                  {CARD[id].name} ({CARD[id].cost})
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-bold">Réserve de l’équipe</div>
            <div className="flex flex-col gap-1">
              {pool.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={!out || left === 0}
                  onClick={() => {
                    cards.swap(out!, d.id);
                    setOut(null);
                    setLeft(left - 1);
                    force((n) => n + 1);
                  }}
                  className="rounded bg-white/10 px-2 py-1 text-left enabled:hover:bg-emerald-400/30 disabled:opacity-50"
                >
                  <b>{d.name}</b> ({d.cost}) — {d.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button type="button" onClick={onDone} className="mt-4 rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">
          Descendre
        </button>
      </div>
    </div>
  );
}

/** E : les quatre places du relais (PV, qui est sur le terrain, effets d'entrée et de sortie). */
export function RelayHud({ g }: { g: Game; tick: number }) {
  const r = g.relay!;
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-2 text-white">
      {r.team.map((m, i) => {
        const on = i === r.active;
        const hp = on ? g.leader.hp : m.hp;
        return (
          <div key={m.def.species} className={`w-40 rounded-lg border-2 p-1.5 text-[11px] ${on ? 'border-amber-300 bg-slate-700' : 'border-white/15 bg-slate-900/85'} ${m.alive ? '' : 'opacity-40'}`}>
            <div className="flex justify-between font-bold">
              <span>
                <span className="font-mono text-amber-300">{i + 1}</span> {m.def.name}
              </span>
              <span>{on ? 'sur le terrain' : m.alive ? '' : 'K.O.'}</span>
            </div>
            <div className="my-1 h-2 overflow-hidden rounded bg-black/60">
              <div className="h-full bg-emerald-400" style={{ width: `${(100 * hp) / m.def.hp}%` }} />
            </div>
            <div className="text-white/70">Entrée : {m.enter}</div>
            <div className="text-white/70">Sortie : {m.exit}</div>
          </div>
        );
      })}
    </div>
  );
}

/** G : les règles « si… alors… » de chaque compagnon (avant la descente et entre deux étages). */
export function InstinctEditor({ g, onDone }: { g: Game; onDone: () => void }) {
  const [, force] = useState(0);
  const rules = g.instincts!;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-4 text-white">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900 p-5 text-sm">
        <h2 className="mb-1 text-xl font-bold">Les instincts de la meute</h2>
        <div className="mb-3 text-white/60">Deux règles par compagnon. En combat, la première règle vraie décide. Tu gardes 3 jetons d’ordre par étage (F focus, R repli, E ultime).</div>
        {Object.entries(rules).map(([sp, list]) => (
          <div key={sp} className="mb-3 rounded-lg bg-white/5 p-3">
            <div className="mb-2 font-bold">{WHO[sp] ?? sp}</div>
            {list.map((r, k) => (
              <div key={k} className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-white/60">Règle {k + 1} : si</span>
                <select
                  value={r.cond}
                  onChange={(e) => {
                    r.cond = e.target.value as Rule['cond'];
                    force((n) => n + 1);
                  }}
                  className="rounded bg-slate-700 px-2 py-1"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <span className="text-white/60">alors</span>
                <select
                  value={r.act}
                  onChange={(e) => {
                    r.act = e.target.value as Rule['act'];
                    force((n) => n + 1);
                  }}
                  className="rounded bg-slate-700 px-2 py-1"
                >
                  {ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
        <button type="button" onClick={onDone} className="mt-2 rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">
          Descendre
        </button>
      </div>
    </div>
  );
}

/** H : la main de cartes-créatures, l'Élan, les avant-postes et la prochaine vague. */
export function ConquestHud({ g, selected, onSettings }: { g: Game; selected: number; tick: number; onSettings: () => void }) {
  const c = g.conquest!;
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white">
      <div className="flex items-center gap-3 rounded bg-black/60 px-2 py-1 text-xs">
        <span className="font-bold">Élan</span>
        <div className="h-3 w-48 overflow-hidden rounded bg-black/60">
          <div className="h-full bg-amber-300" style={{ width: `${(100 * c.elan) / 10}%` }} />
        </div>
        <span className="w-6 font-mono">{Math.floor(c.elan)}</span>
        <span>Avant-postes : {c.outposts()} / 3</span>
        <span>Prochaine vague : {Math.ceil(c.waveT)} s</span>
        <span>Base : {Math.round(g.leader.hp)}</span>
      </div>
      <div className="flex items-end gap-2">
        {c.hand.map((card, i) =>
          card ? (
            <div key={i} className={`flex h-24 w-28 flex-col rounded-lg border-2 p-1.5 text-xs ${selected === i ? '-translate-y-2 border-amber-300 bg-slate-700' : 'border-white/20 bg-slate-900/90'} ${c.elan >= card.cost ? '' : 'opacity-50'}`}>
              <div className="flex justify-between">
                <span className="font-mono font-bold text-amber-300">{i + 1}</span>
                <span className="rounded bg-amber-400 px-1 font-bold text-slate-900">{card.cost}</span>
              </div>
              <div className="mt-1 font-bold">{card.def.name}</div>
              <div className="text-[10px] text-white/60">{card.role === 'tank' ? 'encaisse' : card.role === 'soin' ? 'soigne' : card.role === 'tir' ? 'tire de loin' : 'frappe fort'}</div>
              <div className="mt-auto text-[10px] text-white/70">clic : la poser</div>
            </div>
          ) : (
            <div key={i} className="h-24 w-28" />
          ),
        )}
        <button type="button" onClick={onSettings} className="pointer-events-auto rounded-md border border-white/20 bg-slate-900/80 px-2 py-2 text-xs">
          Réglages (F1)
        </button>
      </div>
    </div>
  );
}
