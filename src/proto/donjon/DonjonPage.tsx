/**
 * PROTO-DONJON : page `?proto=donjon` (banc d'essai, hors du jeu). Une descente de trois étages générés par la
 * graine, le panneau de réglages (F1), la mini-carte, le passage d'étage, le recrutement et l'écran de fin.
 * Ne lit ni n'écrit la sauvegarde du jeu ; aucune clé de stockage n'est utilisée (les réglages vivent dans l'URL).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CD, ELAN, RECRUITS, RESERVE_MAX, type Game, type Input, type Results, emptyInput, enemies, newGame, resolveRecruit, results, step } from '../sim';
import { ProtoView, loadProtoModels } from '../view';
import { CARD } from '../cards';
import { CardHand, DeckSwap } from '../CardHud';
import { schemeFor, setupGame } from '../modeles';
import { BOTS, type BotId } from '../bots';
import { makeDonjonBot } from './dbots';
import { Bar, Chip } from '../ProtoSalle';
import { DonjonEnv } from './env';
import { DonjonLevel, enterFloor } from './level';
import { DENSITY_MULT, PRESET_EXPLORATION, RESTART_KEYS, type DonjonSettings, keysFor, readSettings, settingsToQuery } from './settings';
import { SettingsPanel } from './SettingsPanel';
import { Minimap } from './Minimap';

export const FLOORS = 3;

export interface DescentResults extends Results {
  modele: string;
  cartes_jouees?: Record<string, number>;
  deck_final?: string[];
  etage_atteint: number;
  etages: number;
  reglages: DonjonSettings;
}

interface Hud {
  t: number;
  floor: number;
  hp: number;
  maxHp: number;
  comps: { name: string; hp: number; max: number; alive: boolean; inPlay: boolean; revive: number }[];
  cds: Record<string, number>;
  elan: number;
  selected: number;
  boss: { hp: number; max: number; phase: number; channel: boolean } | null;
  focus: boolean;
  target: string | null;
  awake: number;
}

const CAM: Record<string, number> = { proche: 0.72, moyenne: 1, eloignee: 1.35 };
function camOffset(s: DonjonSettings): [number, number, number] {
  const k = CAM[s.cam];
  return s.angle === 'forte' ? [0, 17 * k, 11 * k] : [0, 10.5 * k, 15 * k];
}

function Play({ settings, onEnd, onSettings, panel, setPanel }: { settings: DonjonSettings; onEnd: (r: DescentResults) => void; onSettings: (s: DonjonSettings) => void; panel: boolean; setPanel: (v: boolean) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef(settings);
  live.current = settings;
  const [hud, setHud] = useState<Hud | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [recruit, setRecruit] = useState<string | null>(null);
  const gameRef = useRef<Game | null>(null);
  const levelRef = useRef<DonjonLevel | null>(null);
  const [mapTick, setMapTick] = useState(0);
  const [cardSelected, setCardSelected] = useState(-1);
  const [interlude, setInterlude] = useState<'deck' | null>(null);
  const interludeRef = useRef(false);
  const panelRef = useRef(panel);
  panelRef.current = panel;

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let view: ProtoView | null = null;
    let env: DonjonEnv | null = null;
    const s0 = live.current;
    const opts = { seed: s0.seed, density: DENSITY_MULT[s0.density], wake: s0.wake, floors: FLOORS };
    const g = setupGame(s0);
    // `&etage=3` : commencer directement à un étage (outil de test ; le boss est au 3e)
    const startFloor = Math.min(FLOORS, Math.max(1, Number(new URLSearchParams(window.location.search).get('etage')) || 1));
    let level = enterFloor(g, opts, startFloor);
    gameRef.current = g;
    levelRef.current = level;
    (window as unknown as { __donjon: unknown }).__donjon = { g, get level() { return level; } };
    const robotId = new URLSearchParams(window.location.search).get('robot') as BotId | null;
    const robot = robotId && (BOTS as string[]).concat('esquive-seule').includes(robotId) ? makeDonjonBot(robotId) : null;

    const keys = new Set<string>();
    const pressed: Partial<Record<keyof Input, boolean>> = {};
    let wheel = 0;
    let lmb = false;
    let lmbEdge = false;
    let rmb = false;
    const mouse = { x: 0, y: 0 };
    let aim = { x: 0, y: 0 };
    let transition = 0;
    // C : carte choisie (1 à 4) en attente d'un clic, et carte à jouer au prochain pas
    let cardSel = -1;
    let cardPlay: Input['card'] = null;
    let swapDoneFor = 0;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === 'F1') {
        e.preventDefault();
        if (down) setPanel(!panelRef.current);
        return;
      }
      if (panelRef.current) return;
      if (['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyF', 'KeyR'].includes(e.code)) e.preventDefault();
      if (down && !e.repeat && g.cards) {
        const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
        if (i >= 0) {
          const id = g.cards.hand[i];
          if (id && CARD[id].target === 'aucune') cardPlay = { index: i, at: aim, target: -1 };
          else cardSel = cardSel === i ? -1 : i;
          setCardSelected(cardSel);
        }
        if (e.code === 'KeyM') onSettings({ ...live.current, minimap: !live.current.minimap });
      } else if (down && !e.repeat) {
        const map: Record<string, keyof Input> = { Digit1: 'spell1', Digit2: 'spell2', Digit3: 'comp1', Digit4: 'comp2', Space: 'dodge', KeyF: 'focus', KeyR: 'recall' };
        if (map[e.code]) pressed[map[e.code]] = true;
        if (e.code === 'KeyM') onSettings({ ...live.current, minimap: !live.current.minimap });
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
      if (e.button === 0) {
        lmb = true;
        lmbEdge = true;
      }
      if (e.button === 2) {
        rmb = true;
        if (cardSel >= 0) {
          cardSel = -1;
          setCardSelected(-1);
        }
      }
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) lmb = false;
    };
    const wh = (e: WheelEvent) => {
      e.preventDefault();
      wheel = e.deltaY > 0 ? 1 : -1;
    };
    const ctx = (e: Event) => e.preventDefault();
    const onResize = () => view?.resize();
    const help = (e: Event) => e.preventDefault(); // F1 : pas d'aide du navigateur
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('resize', onResize);
    window.addEventListener('help', help);
    const el = host.current!;
    el.addEventListener('mousemove', mm);
    el.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    el.addEventListener('wheel', wh, { passive: false });
    el.addEventListener('contextmenu', ctx);

    /** Ennemi sous le curseur (le plus proche du point visé, à 1,3 m près). */
    const enemyAt = (p: { x: number; y: number }) => {
      let best = -1;
      let bd = 1.3;
      for (const e of enemies(g)) {
        const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r;
        if (d < bd && level.isSeen(e)) {
          bd = d;
          best = e.id;
        }
      }
      return best;
    };

    loadProtoModels().then(() => {
      if (!alive) return;
      view = new ProtoView(el, { salle: false });
      (window as unknown as { __donjonView: ProtoView }).__donjonView = view; // outil : mesure des images par seconde
      view.followSun = true;
      view.visibleFn = (u) => u.team === 'ally' || level.isSeen(u);
      env = new DonjonEnv(view.scene, level, view);
      setLoading(false);
      setBanner(startFloor >= FLOORS ? `Étage ${startFloor} — le boss` : `Étage ${startFloor}`);
      transition = 1.4;
      let last = performance.now();
      let acc = 0;
      let hudT = 0;
      let mapT = 0;
      const frame = (now: number) => {
        if (!alive || !view || !env) return;
        const s = live.current;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        g.scheme = schemeFor(s);
        g.recruitChance = s.recruit;
        level.opts.wake = s.wake;
        view.camOffset.set(...camOffset(s));
        const pick = view.pick(mouse.x, mouse.y, 0);
        if (pick) aim = pick;
        if (transition > 0) {
          transition -= dt;
          if (transition <= 0) setBanner(null);
        } else if (!panelRef.current && !g.pendingRecruit && !interludeRef.current) {
          acc += dt * s.speed;
          while (acc >= 1 / 60 && !g.result && !g.pendingRecruit) {
            const inp = emptyInput();
            if (g.scheme !== 2) inp.move = { x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), y: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) };
            inp.aim = aim;
            Object.assign(inp, pressed);
            if (g.cards) {
              if (lmbEdge && cardSel >= 0) {
                cardPlay = { index: cardSel, at: aim, target: enemyAt(aim) };
                cardSel = -1;
                setCardSelected(-1);
              }
              inp.card = cardPlay;
              cardPlay = null;
            } else if (g.scheme === 3) inp.fire = lmb;
            else if (lmbEdge || (g.scheme === 2 && lmb)) {
              const id = enemyAt(aim);
              if (id >= 0) inp.designate = id;
              else if (g.scheme === 2) inp.moveTo = aim;
              else if (lmbEdge) inp.designate = -2;
            }
            lmbEdge = false;
            inp.select = wheel;
            inp.enter = rmb;
            for (const k of Object.keys(pressed)) delete pressed[k as keyof Input];
            wheel = 0;
            rmb = false;
            step(g, robot ? robot(g) : inp);
            acc -= 1 / 60;
            if (level.stairsReached && !g.result) break;
          }
          // un robot (outil) refuse les recrues pour ne pas bloquer la démonstration
          if (g.pendingRecruit && robot) resolveRecruit(g, -1);
          if (g.pendingRecruit) setRecruit(g.pendingRecruit);
          // C : entre deux étages, échanger jusqu'à 2 cartes du deck (la partie attend)
          if (level.stairsReached && !g.result && g.cards && swapDoneFor < level.floorIndex && !robot) {
            swapDoneFor = level.floorIndex;
            interludeRef.current = true;
            setInterlude('deck');
          } else if (level.stairsReached && !g.result) {
            const next = level.floorIndex + 1;
            setBanner(next >= FLOORS ? `Étage ${next} — le boss` : `Étage ${next}`);
            transition = 1.4;
            env.dispose();
            level = enterFloor(g, { ...opts, wake: s.wake }, next);
            levelRef.current = level;
            env = new DonjonEnv(view.scene, level, view);
            setMapTick((t) => t + 1);
          }
        }
        if (g.pendingRecruit && !robot) setRecruit((r) => r ?? g.pendingRecruit);
        view.render(g, aim, dt);
        env.update(g, dt, view.camera.position);
        hudT -= dt;
        mapT -= dt;
        if (hudT <= 0) {
          hudT = 0.1;
          const boss = enemies(g).find((e) => e.role === 'boss' && e.aggro);
          const tgt = enemies(g).find((e) => e.id === g.leaderTarget);
          setHud({
            t: g.t,
            floor: level.floorIndex,
            hp: g.leader.hp,
            maxHp: g.leader.maxHp,
            comps: g.comps.map((c) => ({ name: c.name, hp: c.hp, max: c.maxHp, alive: c.alive, inPlay: c.inPlay, revive: c.reviveT })),
            cds: { ...g.cds },
            elan: g.elan,
            selected: g.selected,
            boss: boss ? { hp: boss.hp, max: boss.maxHp, phase: g.bossPhase, channel: boss.channel } : null,
            focus: g.focusId >= 0,
            target: tgt ? tgt.name : null,
            awake: level.patrols,
          });
        }
        if (mapT <= 0) {
          mapT = 0.2;
          setMapTick((t) => t + 1);
        }
        if (g.result) {
          const r: DescentResults = { ...results(g), modele: live.current.modele, cartes_jouees: g.cards ? { ...g.cards.played } : undefined, deck_final: g.cards?.all(), etage_atteint: level.floorIndex, etages: FLOORS, reglages: { ...live.current } };
          setTimeout(() => alive && onEnd(r), 900);
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
      window.removeEventListener('help', help);
      window.removeEventListener('mouseup', mu);
      el.removeEventListener('mousemove', mm);
      el.removeEventListener('mousedown', md);
      el.removeEventListener('wheel', wh);
      el.removeEventListener('contextmenu', ctx);
      env?.dispose();
      view?.dispose();
    };
    // la descente ne redémarre que pour les réglages qui changent le donjon ou l'équipe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.seed, settings.version, settings.leader, settings.density]);

  const answerRecruit = (replace: number) => {
    const g = gameRef.current;
    if (g) resolveRecruit(g, replace);
    setRecruit(null);
  };
  const cd = (k: string) => hud?.cds[k] ?? 0;
  const g = gameRef.current;
  const version = settings.version;
  const L = g?.leaderDef;
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={host} className="absolute inset-0 cursor-crosshair" />
      {loading && <div className="absolute inset-0 flex items-center justify-center text-white">Chargement des créatures…</div>}
      {banner && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-5xl font-bold tracking-wide text-amber-200">{banner}</div>
        </div>
      )}
      {hud && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded-lg bg-black/55 p-2 text-xs text-white">
            <div className="font-bold">
              Étage {hud.floor} / {FLOORS} · {Math.floor(hud.t)} s · graine {settings.seed}
              {hud.awake > 0 && <span className="text-rose-300"> · le donjon s’éveille ({hud.awake})</span>}
            </div>
            <div className="flex items-center gap-2"><span className="w-24">{L?.name}</span><Bar v={hud.hp} max={hud.maxHp} color="#FFD02A" /></div>
            {hud.comps.map((c, i) => (
              <div key={c.name + i} className={`flex items-center gap-2 ${version === 'B' && i === hud.selected ? 'rounded bg-amber-300/25' : ''}`}>
                <span className="w-24">{version === 'B' && i === hud.selected ? '▶ ' : ''}{c.name}</span>
                <Bar v={c.alive ? c.hp : 0} max={c.max} color="#3BD16F" w="w-32" />
                <span className="w-24 text-white/70">{!c.alive ? `K.O. ${Math.ceil(c.revive)} s` : version === 'B' ? (c.inPlay ? 'en jeu' : 'réserve') : ''}</span>
              </div>
            ))}
            {hud.target && <div className="text-amber-200">Cible : {hud.target}</div>}
          </div>
          {hud.boss && (
            <div className="pointer-events-none absolute left-1/2 top-3 w-[min(520px,70vw)] -translate-x-1/2 text-center text-sm font-bold text-white">
              Magmadrake {hud.boss.phase === 2 ? '— phase 2' : ''} {hud.boss.channel && <span className="text-sky-300">— Fournaise ! (un étourdissement l’interrompt)</span>}
              <div className="mt-1 h-4 overflow-hidden rounded bg-black/60">
                <div className="h-full" style={{ width: `${(100 * hud.boss.hp) / hud.boss.max}%`, background: hud.boss.phase === 2 ? '#FF5A1F' : '#9B5CFF' }} />
              </div>
            </div>
          )}
          {settings.minimap && levelRef.current && g && <Minimap level={levelRef.current} game={g} tick={mapTick} />}
          {g?.cards && <CardHand g={g} selected={cardSelected} tick={hud.t} onSettings={() => setPanel(true)} />}
          <div className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 items-end gap-2 text-white ${g?.cards ? 'hidden' : 'flex'}`}>
            <Chip k="1" label={L?.spell1 ?? ''} cd={cd('spell1')} total={CD.spell1} />
            <Chip k="2" label="Brasier" cd={cd('spell2')} total={CD.spell2} />
            <Chip k="Esp." label="Esquive" cd={cd('dodge')} total={CD.dodge} />
            {settings.modele === 'D' ? (
              <>
                <Chip k="3" label="Trait" cd={cd('spell3')} total={4} />
                <Chip k="4" label="Onde de feu" cd={cd('spell4')} total={12} />
              </>
            ) : version === 'A' ? (
              <>
                <Chip k="F" label={hud.focus ? 'Cible !' : 'Cible'} cd={cd('focus')} total={CD.focus} />
                <Chip k="R" label="Retour" cd={cd('recall')} total={CD.recallA} />
                <Chip k="3" label={g?.comps[0]?.species === 'crabastion' ? 'Carapace' : 'Coup'} cd={cd('comp1')} total={CD.comp1} />
                <Chip k="4" label={g?.comps[1]?.species === 'amanitox' ? 'Spores' : 'Soin'} cd={cd('comp2')} total={CD.comp2} />
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
            <button type="button" onClick={() => setPanel(true)} className="pointer-events-auto rounded-md border border-white/20 bg-slate-900/80 px-2 py-2 text-xs">
              Réglages (F1)
            </button>
          </div>
        </>
      )}
      {interlude === 'deck' && g?.cards && (
        <DeckSwap
          cards={g.cards}
          onDone={() => {
            interludeRef.current = false;
            setInterlude(null);
          }}
        />
      )}
      {recruit && g && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="max-w-md rounded-xl bg-slate-800 p-5 text-white">
            <div className="mb-2 text-lg font-bold">{RECRUITS[recruit].name} veut rejoindre l’équipe !</div>
            <div className="mb-3 text-sm text-white/70">Pour cette descente seulement.</div>
            <div className="flex flex-wrap gap-2">
              {version === 'B' && g.comps.length < RESERVE_MAX && (
                <button type="button" onClick={() => answerRecruit(g.comps.length)} className="rounded bg-emerald-400 px-3 py-2 font-bold text-slate-900">Accepter (réserve)</button>
              )}
              {(version === 'A' || g.comps.length >= RESERVE_MAX) &&
                g.comps.map((c, i) => (
                  <button key={c.id} type="button" onClick={() => answerRecruit(i)} className="rounded bg-emerald-400/90 px-3 py-2 text-sm font-bold text-slate-900">
                    Accepter à la place de {c.name}
                  </button>
                ))}
              <button type="button" onClick={() => answerRecruit(-1)} className="rounded bg-white/15 px-3 py-2">Refuser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function End({ r, onAgain }: { r: DescentResults; onAgain: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(r, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-white">
      <h1 className={`text-3xl font-bold ${r.issue === 'victoire' ? 'text-emerald-300' : 'text-rose-300'}`}>{r.issue === 'victoire' ? 'Victoire' : 'Défaite'}</h1>
      <div className="text-white/70">{r.raison}</div>
      <table className="text-sm">
        <tbody>
          <tr><td className="pr-4 text-white/60">Étage atteint</td><td>{r.etage_atteint} / {r.etages}</td></tr>
          <tr><td className="pr-4 text-white/60">Durée</td><td>{r.duree_s} s</td></tr>
          <tr><td className="pr-4 text-white/60">PV restants du Meneur</td><td>{r.pv_meneur} / {r.pv_meneur_max}</td></tr>
          <tr><td className="pr-4 text-white/60">PV des créatures</td><td>{r.pv_compagnons.map((c) => `${c.nom} ${c.pv}/${c.max}`).join(' · ')}</td></tr>
          <tr><td className="pr-4 text-white/60">Actions du joueur</td><td>{r.actions} ({Object.entries(r.actions_detail).map(([k, v]) => `${k} ${v}`).join(', ')})</td></tr>
          <tr><td className="pr-4 align-top text-white/60">Dégâts par source</td><td>{Object.entries(r.degats_par_source).map(([k, v]) => <div key={k}>{k} : {v}</div>)}</td></tr>
          <tr><td className="pr-4 text-white/60">Recrues</td><td>{r.recrues.length ? r.recrues.join(', ') : 'aucune'}</td></tr>
          <tr><td className="pr-4 text-white/60">Réglages</td><td className="font-mono text-xs">{settingsToQuery(r.reglages)}</td></tr>
        </tbody>
      </table>
      <div className="flex gap-3">
        <button type="button" onClick={copy} className="rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">Copier les résultats</button>
        <button type="button" onClick={onAgain} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">Nouvelle descente</button>
      </div>
      {copied && <div className="text-emerald-300">Copié (JSON avec tous les réglages).</div>}
    </div>
  );
}

export function DonjonPage() {
  const [settings, setSettingsRaw] = useState<DonjonSettings>(() => readSettings(window.location.search));
  const [result, setResult] = useState<DescentResults | null>(null);
  const [run, setRun] = useState(0);
  const [panel, setPanel] = useState(false);
  const setSettings = useCallback((s0: DonjonSettings) => {
    // la composition suit le modèle (B : la meute ; les autres modèles partent d'un trio)
    const s: DonjonSettings = { ...s0, version: s0.modele === 'B' ? 'B' : 'A' };
    setSettingsRaw(s);
    window.history.replaceState(null, '', `${window.location.pathname}?${settingsToQuery(s)}`);
  }, []);
  const onEnd = useCallback((r: DescentResults) => setResult(r), []);
  if (result)
    return (
      <End
        r={result}
        onAgain={() => {
          setResult(null);
          setRun((n) => n + 1);
        }}
      />
    );
  return (
    <>
      <Play key={run} settings={settings} onEnd={onEnd} onSettings={setSettings} panel={panel} setPanel={setPanel} />
      {panel && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onPreset={() => setSettings({ ...settings, ...PRESET_EXPLORATION })}
          restartKeys={RESTART_KEYS}
          onClose={() => setPanel(false)}
          keys={keysFor(settings)}
        />
      )}
    </>
  );
}
