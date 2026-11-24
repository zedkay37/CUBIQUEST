/**
 * Sprint PROTO-MENEUR : page isolée `?proto=salle` (maquette, hors du jeu). Écran de choix A / B, la salle,
 * l'écran de fin et « Copier les résultats ». Ne lit ni n'écrit la sauvegarde du jeu : seul l'historique des
 * parties de la maquette est gardé, sous une clé à part (PROTO_STORAGE_KEY, préfixe imposé par la fiche).
 */
import { useEffect, useRef, useState } from 'react';
import { CD, ELAN, type Game, type Input, type Results, type Version, emptyInput, enemies, newGame, results, step } from './sim';
import { ProtoView, loadProtoModels } from './view';
import { BOTS, makeBot, type BotId } from './bots';

const PROTO_STORAGE_KEY = 'cubiquest_proto_resultats';
function saveHistory(r: Results) {
  try {
    const list = JSON.parse(localStorage.getItem(PROTO_STORAGE_KEY) ?? '[]') as unknown[];
    list.push({ ...r, date: new Date().toISOString() });
    localStorage.setItem(PROTO_STORAGE_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* stockage indisponible : on ne garde rien */
  }
}

interface Hud {
  t: number;
  hp: number;
  maxHp: number;
  comps: { name: string; hp: number; max: number; alive: boolean; inPlay: boolean; revive: number }[];
  cds: Record<string, number>;
  elan: number;
  selected: number;
  wave: number;
  boss: { hp: number; max: number; phase: number } | null;
  focus: boolean;
}
function snapshot(g: Game): Hud {
  const boss = enemies(g).find((e) => e.role === 'boss');
  return {
    t: g.t,
    hp: g.leader.hp,
    maxHp: g.leader.maxHp,
    comps: g.comps.map((c) => ({ name: c.name, hp: c.hp, max: c.maxHp, alive: c.alive, inPlay: c.inPlay, revive: c.reviveT })),
    cds: { ...g.cds },
    elan: g.elan,
    selected: g.selected,
    wave: g.wave,
    boss: boss ? { hp: boss.hp, max: boss.maxHp, phase: g.bossPhase } : null,
    focus: g.focusId >= 0,
  };
}

const KEYS_A = [
  ['ZQSD', 'bouger'],
  ['Souris', 'viser · clic gauche : tirer'],
  ['1 · 2', 'sorts du Meneur'],
  ['Espace', 'esquive'],
  ['F', 'compagnons : attaquez la cible sous le curseur'],
  ['R', 'compagnons : revenez'],
  ['3 · 4', 'sort de Crabastion · d’Amanitox'],
];
const KEYS_B = [
  ['ZQSD', 'bouger'],
  ['Souris', 'viser · clic gauche : tirer'],
  ['1 · 2', 'sorts du Meneur'],
  ['Espace', 'esquive'],
  ['Molette', 'choisir une créature de la réserve'],
  ['Clic droit', 'elle bondit jusqu’au point visé (coûte 2 crans d’Élan)'],
  ['R', 'rappel (rend 1 cran)'],
];

function Choice({ onPick }: { onPick: (v: Version) => void }) {
  const [draw, setDraw] = useState<string | null>(null);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold">Maquette du Meneur — une salle</h1>
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {(['A', 'B'] as Version[]).map((v) => (
          <button key={v} onClick={() => onPick(v)} className="rounded-xl border-2 border-white/20 bg-slate-800 p-5 text-left hover:border-amber-300">
            <div className="mb-2 text-xl font-bold">Version {v} {v === 'A' ? '— le trio' : '— la meute'}</div>
            <table className="text-sm">
              <tbody>
                {(v === 'A' ? KEYS_A : KEYS_B).map(([k, d]) => (
                  <tr key={k}>
                    <td className="pr-3 font-mono text-amber-300">{k}</td>
                    <td className="text-white/80">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </button>
        ))}
      </div>
      <button onClick={() => setDraw(Math.random() < 0.5 ? 'A puis B' : 'B puis A')} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
        Tirer l’ordre au hasard (protocole)
      </button>
      {draw && <div className="text-lg">Ordre tiré : <b>{draw}</b></div>}
    </div>
  );
}

export function Bar({ v, max, color, w = 'w-48' }: { v: number; max: number; color: string; w?: string }) {
  return (
    <div className={`h-3 ${w} overflow-hidden rounded bg-black/60`}>
      <div className="h-full" style={{ width: `${Math.max(0, (100 * v) / max)}%`, background: color }} />
    </div>
  );
}
export function Chip({ k, label, cd, total }: { k: string; label: string; cd: number; total: number }) {
  const ready = cd <= 0;
  return (
    <div className={`relative w-20 overflow-hidden rounded-md border px-1 py-1 text-center text-xs ${ready ? 'border-amber-300 bg-slate-800' : 'border-white/10 bg-slate-900/80 text-white/50'}`}>
      {!ready && <div className="absolute inset-x-0 bottom-0 bg-white/10" style={{ height: `${(100 * cd) / total}%` }} />}
      <div className="relative font-mono text-sm font-bold">{k}</div>
      <div className="relative truncate">{label}</div>
    </div>
  );
}

function Play({ version, onEnd }: { version: Version; onEnd: (r: Results) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    let raf = 0;
    let view: ProtoView | null = null;
    const g = newGame(version, (Math.random() * 1e9) | 0);
    // `&robot=adaptatif` (ou presse-tout, rotation) : un robot joue à la place du joueur (pour regarder, et pour les captures)
    const robotId = new URLSearchParams(window.location.search).get('robot') as BotId | null;
    const robot = robotId && BOTS.includes(robotId) ? makeBot(robotId) : null;
    (window as unknown as { __proto: Game }).__proto = g;
    const keys = new Set<string>();
    const pressed: Partial<Record<keyof Input, boolean>> = {};
    let wheel = 0;
    let fire = false;
    let enter = false;
    const mouse = { x: 0, y: 0 };
    let aim = { x: 0, y: 10 };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyF', 'KeyR'].includes(e.code)) e.preventDefault();
      if (down && !e.repeat) {
        const map: Record<string, keyof Input> = { Digit1: 'spell1', Digit2: 'spell2', Digit3: 'comp1', Digit4: 'comp2', Space: 'dodge', KeyF: 'focus', KeyR: 'recall' };
        if (map[e.code]) pressed[map[e.code]] = true;
      }
      if (down) keys.add(e.code);
      else keys.delete(e.code);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const mm = (e: MouseEvent) => {
      const r = host.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const md = (e: MouseEvent) => {
      if (e.button === 0) fire = true;
      if (e.button === 2) enter = true;
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) fire = false;
    };
    const wh = (e: WheelEvent) => {
      e.preventDefault();
      wheel = e.deltaY > 0 ? 1 : -1;
    };
    const ctx = (e: Event) => e.preventDefault();
    const onResize = () => view?.resize();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('resize', onResize);
    const el = host.current!;
    el.addEventListener('mousemove', mm);
    el.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    el.addEventListener('wheel', wh, { passive: false });
    el.addEventListener('contextmenu', ctx);

    loadProtoModels().then(() => {
      if (!alive) return;
      view = new ProtoView(el);
      setLoading(false);
      let last = performance.now();
      let acc = 0;
      let hudT = 0;
      const frame = (now: number) => {
        if (!alive || !view) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        acc += dt;
        const pick = view.pick(mouse.x, mouse.y, 0);
        if (pick) aim = pick;
        while (acc >= 1 / 60 && !g.result) {
          const inp = emptyInput();
          inp.move = { x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), y: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) };
          inp.aim = aim;
          inp.fire = fire;
          Object.assign(inp, pressed);
          if (version === 'A') inp.recall = Boolean(pressed.recall);
          inp.select = wheel;
          inp.enter = enter;
          for (const k of Object.keys(pressed)) delete pressed[k as keyof Input];
          wheel = 0;
          enter = false;
          step(g, robot ? robot(g) : inp);
          acc -= 1 / 60;
        }
        view.render(g, aim, dt);
        hudT -= dt;
        if (hudT <= 0) {
          hudT = 0.1;
          setHud(snapshot(g));
        }
        if (g.result) {
          const r = results(g);
          saveHistory(r);
          setTimeout(() => alive && onEnd(r), 900);
          view.render(g, aim, 0);
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mouseup', mu);
      el.removeEventListener('mousemove', mm);
      el.removeEventListener('mousedown', md);
      el.removeEventListener('wheel', wh);
      el.removeEventListener('contextmenu', ctx);
      view?.dispose();
    };
  }, [version, onEnd]);

  const cd = (k: string) => hud?.cds[k] ?? 0;
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={host} className="absolute inset-0 cursor-crosshair" />
      {loading && <div className="absolute inset-0 flex items-center justify-center text-white">Chargement des créatures…</div>}
      {hud && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded-lg bg-black/50 p-2 text-xs text-white">
            <div className="font-bold">Version {version} · {hud.wave === 0 ? 'Entre dans le couloir' : hud.wave < 3 ? `Vague ${hud.wave} / 2` : 'Boss'} · {Math.floor(hud.t)} s</div>
            <div className="flex items-center gap-2"><span className="w-24">Calcinarque</span><Bar v={hud.hp} max={hud.maxHp} color="#FFD02A" /></div>
            {hud.comps.map((c, i) => (
              <div key={c.name} className={`flex items-center gap-2 ${version === 'B' && i === hud.selected ? 'rounded bg-amber-300/25' : ''}`}>
                <span className="w-24">{version === 'B' && i === hud.selected ? '▶ ' : ''}{c.name}</span>
                <Bar v={c.alive ? c.hp : 0} max={c.max} color="#3BD16F" w="w-32" />
                <span className="w-24 text-white/70">{!c.alive ? `K.O. ${Math.ceil(c.revive)} s` : version === 'B' ? (c.inPlay ? 'en jeu' : 'réserve') : ''}</span>
              </div>
            ))}
          </div>
          {hud.boss && (
            <div className="pointer-events-none absolute left-1/2 top-3 w-[min(520px,80vw)] -translate-x-1/2 text-center text-sm font-bold text-white">
              Magmadrake {hud.boss.phase === 2 ? '— phase 2' : ''}
              <div className="mt-1 h-4 overflow-hidden rounded bg-black/60">
                <div className="h-full" style={{ width: `${(100 * hud.boss.hp) / hud.boss.max}%`, background: hud.boss.phase === 2 ? '#FF5A1F' : '#9B5CFF' }} />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-2 text-white">
            <Chip k="1" label="Salve" cd={cd('spell1')} total={CD.spell1} />
            <Chip k="2" label="Brasier" cd={cd('spell2')} total={CD.spell2} />
            <Chip k="Esp." label="Esquive" cd={cd('dodge')} total={CD.dodge} />
            {version === 'A' ? (
              <>
                <Chip k="F" label={hud.focus ? 'Cible !' : 'Cible'} cd={cd('focus')} total={CD.focus} />
                <Chip k="R" label="Retour" cd={cd('recall')} total={CD.recallA} />
                <Chip k="3" label="Carapace" cd={cd('comp1')} total={CD.comp1} />
                <Chip k="4" label="Spores" cd={cd('comp2')} total={CD.comp2} />
              </>
            ) : (
              <>
                <Chip k="R" label="Rappel" cd={cd('recall')} total={CD.recallB} />
                <div className="rounded-md bg-slate-900/80 px-2 py-1 text-center text-xs">
                  <div className="mb-1 font-bold">Élan</div>
                  <div className="flex gap-1">
                    {Array.from({ length: ELAN.max }, (_, i) => (
                      <div key={i} className="h-4 w-5 overflow-hidden rounded-sm border border-amber-200/60 bg-black/50">
                        <div className="h-full bg-amber-300" style={{ width: `${Math.max(0, Math.min(1, hud.elan - i)) * 100}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function End({ r, onAgain }: { r: Results; onAgain: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(r, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-white">
      <h1 className={`text-3xl font-bold ${r.issue === 'victoire' ? 'text-emerald-300' : 'text-rose-300'}`}>{r.issue === 'victoire' ? 'Victoire' : 'Défaite'} — version {r.version}</h1>
      <div className="text-white/70">{r.raison}</div>
      <table className="text-sm">
        <tbody>
          <tr><td className="pr-4 text-white/60">Durée</td><td>{r.duree_s} s</td></tr>
          <tr><td className="pr-4 text-white/60">PV restants du Meneur</td><td>{r.pv_meneur} / {r.pv_meneur_max}</td></tr>
          <tr><td className="pr-4 text-white/60">PV restants des créatures</td><td>{r.pv_compagnons.map((c) => `${c.nom} ${c.pv}/${c.max}`).join(' · ')}</td></tr>
          <tr><td className="pr-4 text-white/60">Actions du joueur</td><td>{r.actions} ({Object.entries(r.actions_detail).map(([k, v]) => `${k} ${v}`).join(', ')})</td></tr>
          <tr><td className="pr-4 align-top text-white/60">Dégâts par source</td><td>{Object.entries(r.degats_par_source).map(([k, v]) => <div key={k}>{k} : {v}</div>)}</td></tr>
          <tr><td className="pr-4 text-white/60">Dégâts subis</td><td>{r.degats_subis}</td></tr>
        </tbody>
      </table>
      <div className="flex gap-3">
        <button onClick={copy} className="rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">Copier les résultats</button>
        <button onClick={onAgain} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Rejouer</button>
      </div>
      {copied && <div className="text-emerald-300">Copié (JSON).</div>}
    </div>
  );
}

export function ProtoSalle() {
  const [screen, setScreen] = useState<{ s: 'choix' } | { s: 'jeu'; v: Version } | { s: 'fin'; r: Results }>(() => {
    const v = new URLSearchParams(window.location.search).get('version');
    return v === 'A' || v === 'B' ? { s: 'jeu', v } : { s: 'choix' };
  });
  const [onEnd] = useState(() => (r: Results) => setScreen({ s: 'fin', r }));
  if (screen.s === 'choix') return <Choice onPick={(v) => setScreen({ s: 'jeu', v })} />;
  if (screen.s === 'jeu') return <Play version={screen.v} onEnd={onEnd} />;
  return <End r={screen.r} onAgain={() => setScreen({ s: 'choix' })} />;
}
