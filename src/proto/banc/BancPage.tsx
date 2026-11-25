/**
 * Banc d'essai n° 1, le geste de combat : page `?banc=controle&variante=0|A|B|C|hasard`.
 * Accueil du banc (prédiction, choix ou tirage de la variante, essais enregistrés, export JSON / CSV), préparation,
 * combat, écran « pourquoi j'ai gagné ou perdu », grille remplie après chaque essai.
 * Stockage : seulement les clés de BANC_STORAGE_KEY, préfixe des maquettes (jamais la sauvegarde du jeu).
 */
import { useEffect, useRef, useState } from 'react';
import { type Input, emptyInput, enemies, step } from '../sim';
import { ProtoView, loadProtoModels } from '../view';
import { DonjonEnv } from '../donjon/env';
import { ARENA_CENTER, BOSS, DEFAULT_CONFIG, NAMES, ROLE, SKILL, SKILL2, SPECIES, type BancConfig, type Ligne, type Priorite, type Sp, type Trial, type Variante, newBanc, trialResults } from './banc';

const BANC_STORAGE_KEY = { essais: 'cubiquest_proto_banc_essais', prediction: 'cubiquest_proto_banc_prediction', rotation: 'cubiquest_proto_banc_rotation' };
const load = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const save = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* stockage indisponible : l'essai reste copiable à l'écran */
  }
};

/** Les 10 critères de la synthèse (fixés par le joueur), notés de 1 à 5 après chaque essai. */
const CRITERES = [
  'Ai-je pris des décisions réellement importantes ?',
  'Ai-je compris pourquoi j’ai gagné ou perdu ?',
  'Chaque créature a-t-elle joué un rôle significatif ?',
  'Ai-je eu envie d’expérimenter une autre composition ?',
  'Ai-je eu envie de recommencer immédiatement ?',
  'Les commandes étaient-elles naturelles et agréables ?',
  'Me suis-je amusé indépendamment des récompenses ?',
  'Ai-je ressenti la personnalité tactique de chaque créature ?',
  'Ai-je ressenti une frustration liée aux commandes plutôt qu’à mes propres erreurs ?',
  'Ai-je envie de maîtriser davantage ce système ?',
];
export interface Essai extends Trial {
  date: string;
  pauses: number[];
  grille: { notes: number[]; agace: string; frustration_commandes: boolean; criteres: string[] };
  tirage_cache: boolean;
}

const VARIANTES: { id: Variante; name: string; text: string; keys: string }[] = [
  { id: '0', name: '0 · Aucun contrôle', text: 'Tu places l’équipe sur deux lignes et choisis une priorité de cible par créature ; ensuite tout est automatique.', keys: 'Espace : pause' },
  { id: 'A', name: 'A · Contrôle collectif', text: 'L’équipe se déplace en groupe ; les attaques sont automatiques ; tu déclenches les 6 sorts (deux par créature) et peux désigner une cible commune.', keys: 'ZQSD : le groupe · 1, 2, 3 puis 4, 5, 6 : les deux sorts de chaque créature, vers le curseur · F : cible commune · Espace : pause' },
  { id: 'B', name: 'B · Meneur fixe', text: 'Tu diriges une créature (choisie avant l’essai, elle tourne d’un essai à l’autre) ; les autres sont automatiques ; tu peux déclencher leurs compétences.', keys: 'ZQSD · clic gauche : sa cible · 1 à 6 : sorts · F : cible commune · Espace : pause' },
  { id: 'C', name: 'C · Contrôle interchangeable', text: 'Comme B, et tu changes de créature à tout moment.', keys: 'ZQSD · clic gauche : sa cible · 1 à 6 : sorts · F : cible commune · Tab ou clic sur un portrait : changer · Espace : pause' },
];
const PRIOS: [Priorite, string][] = [['proche', 'la plus proche'], ['invocations', 'les invocations'], ['boss', 'le boss'], ['faible', 'la plus faible']];

function Home({ onStart }: { onStart: (v: Variante, hidden: boolean) => void }) {
  const [pred, setPred] = useState(() => load<string>(BANC_STORAGE_KEY.prediction, ''));
  const crit = CRITERES;
  const essais = load<Essai[]>(BANC_STORAGE_KEY.essais, []);
  const urlV = new URLSearchParams(window.location.search).get('variante');
  const download = (name: string, text: string, type: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
  };
  const csv = () => {
    const head = ['date', 'variante', 'tirage_cache', 'issue', 'duree_s', 'actions_par_minute', 'pauses', 'interruptions_reussies', 'grosses_attaques_passees', 'zones_subies', 'zones_evitees', 'part_Magmadrake', 'part_Crabastion', 'part_Raicube', 'subis_Magmadrake', 'subis_Crabastion', 'subis_Raicube', 'frustration_commandes', ...crit, 'agace'];
    const rows = essais.map((e) => [e.date, e.variante, e.tirage_cache, e.issue, e.duree_s, e.actions_par_minute, e.pauses.length, e.interruptions_reussies, e.grosses_attaques_passees, e.zones_subies, e.zones_evitees, e.part_degats.Magmadrake ?? 0, e.part_degats.Crabastion ?? 0, e.part_degats.Raicube ?? 0, e.degats_subis.Magmadrake ?? 0, e.degats_subis.Crabastion ?? 0, e.degats_subis.Raicube ?? 0, e.grille.frustration_commandes, ...e.grille.notes, JSON.stringify(e.grille.agace)]);
    return [head, ...rows].map((r) => r.join(';')).join('\n');
  };
  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Banc d’essai n° 1 : le geste de combat</h1>
        <p className="mt-2 text-white/70">Même équipe (Magmadrake, Crabastion, Raicube), même boss (le Gardien de basalte), même arène. Seul le contrôle change.</p>
        <div className="mt-4 rounded-lg bg-white/5 p-3">
          <div className="mb-1 font-bold">Ta prédiction (avant la première séance)</div>
          <input value={pred} onChange={(e) => setPred(e.target.value)} onBlur={() => save(BANC_STORAGE_KEY.prediction, pred)} placeholder="je pense que la variante … va gagner" className="w-full rounded bg-slate-800 px-2 py-1" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {VARIANTES.map((v) => (
            <div key={v.id} className={`rounded-xl border p-4 ${urlV === v.id ? 'border-amber-300' : 'border-white/15'} bg-slate-800`}>
              <div className="text-xl font-bold">{v.name}</div>
              <div className="mt-1 text-sm text-white/80">{v.text}</div>
              <div className="mt-2 text-xs text-white/55">{v.keys}</div>
              <button type="button" onClick={() => onStart(v.id, false)} className="mt-3 rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">Jouer</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onStart(VARIANTES[Math.floor(Math.random() * 4)].id, true)} className="mt-3 rounded-lg bg-emerald-400 px-4 py-2 font-bold text-slate-900">
          Variante tirée au sort (cachée jusqu’à la grille)
        </button>
        <div className="mt-6 rounded-lg bg-white/5 p-3 text-sm">
          <div className="mb-1 font-bold">Les essais enregistrés ({essais.length})</div>
          <table className="w-full text-xs">
            <thead className="text-white/60">
              <tr><td>Variante</td><td>Essais</td><td>Victoires</td><td>Part max. d’une créature (moy.)</td><td>Frustration commandes</td><td>Exclusion (règle fixée d’avance)</td></tr>
            </thead>
            <tbody>
              {VARIANTES.map((v) => {
                const l = essais.filter((e) => e.variante === v.id);
                const hero = l.length ? Object.fromEntries(['Magmadrake', 'Crabastion', 'Raicube'].map((n) => [n, l.reduce((s, e) => s + (e.part_degats[n] ?? 0), 0) / l.length])) : {};
                const maxHero = Math.max(0, ...Object.values(hero));
                const frus = l.filter((e) => e.grille.frustration_commandes).length;
                const out = l.length >= 5 && (maxHero > 60 || frus >= 2);
                return (
                  <tr key={v.id}>
                    <td>{v.id}</td>
                    <td>{l.length}</td>
                    <td>{l.filter((e) => e.issue === 'victoire').length}</td>
                    <td>{l.length ? `${Math.round(maxHero)} %` : '—'}</td>
                    <td>{l.length ? `${frus} / ${l.length}` : '—'}</td>
                    <td>{l.length < 5 ? 'moins de 5 essais' : out ? <b className="text-rose-300">éliminée</b> : 'reste en lice'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => download('banc-controle.json', JSON.stringify({ prediction: pred, criteres: crit, essais }, null, 2), 'application/json')} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Exporter (JSON)</button>
            <button type="button" onClick={() => download('banc-controle.csv', csv(), 'text/csv')} className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Exporter (CSV)</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function Setup({ variante, hidden, onGo }: { variante: Variante; hidden: boolean; onGo: (c: BancConfig) => void }) {
  const rot = load<number>(BANC_STORAGE_KEY.rotation, 0);
  const [cfg, setCfg] = useState<BancConfig>({ ...DEFAULT_CONFIG, variante, controlled: SPECIES[rot % 3], ligne: { ...DEFAULT_CONFIG.ligne }, priorite: { ...DEFAULT_CONFIG.priorite } });
  // tirage caché : réglages par défaut, rien n'est montré qui trahirait la variante
  useEffect(() => {
    if (hidden || variante === 'A') onGo(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (hidden || variante === 'A') return null;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
      <div className="w-full max-w-2xl rounded-xl bg-slate-800 p-5">
        <h2 className="mb-3 text-xl font-bold">Préparation : {VARIANTES.find((v) => v.id === variante)!.name}</h2>
        {variante === '0' &&
          SPECIES.map((sp) => (
            <div key={sp} className="mb-2 flex flex-wrap items-center gap-2">
              <span className="w-28 font-bold">{NAMES[sp]}</span>
              {(['avant', 'arriere'] as Ligne[]).map((l) => (
                <button key={l} type="button" onClick={() => setCfg({ ...cfg, ligne: { ...cfg.ligne, [sp]: l } })} className={`rounded px-2 py-1 text-sm ${cfg.ligne[sp] === l ? 'bg-amber-300 text-slate-900' : 'bg-white/10'}`}>
                  {l === 'avant' ? 'ligne avant' : 'ligne arrière'}
                </button>
              ))}
              <span className="text-white/60">vise</span>
              <select value={cfg.priorite[sp]} onChange={(e) => setCfg({ ...cfg, priorite: { ...cfg.priorite, [sp]: e.target.value as Priorite } })} className="rounded bg-slate-700 px-2 py-1 text-sm">
                {PRIOS.map(([p, l]) => (
                  <option key={p} value={p}>{l}</option>
                ))}
              </select>
            </div>
          ))}
        {(variante === 'B' || variante === 'C') && (
          <div>
            <div className="mb-2 text-white/70">{variante === 'B' ? 'La créature que tu diriges (elle tourne d’un essai à l’autre) :' : 'La créature que tu diriges au départ :'}</div>
            <div className="flex gap-2">
              {SPECIES.map((sp) => (
                <button key={sp} type="button" onClick={() => setCfg({ ...cfg, controlled: sp })} className={`rounded px-3 py-2 ${cfg.controlled === sp ? 'bg-amber-300 font-bold text-slate-900' : 'bg-white/10'}`}>
                  {NAMES[sp]} ({ROLE[sp]})
                </button>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={() => onGo(cfg)} className="mt-4 rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">Combattre</button>
      </div>
    </div>
  );
}

interface Hud {
  t: number;
  team: { sp: Sp; hp: number; max: number; alive: boolean; controlled: boolean; cd: number; cd2: number }[];
  boss: { hp: number; max: number; channel: boolean; vuln: boolean } | null;
  adds: number;
}

function Fight({ cfg, hidden, onEnd }: { cfg: BancConfig; hidden: boolean; onEnd: (t: Trial, pauses: number[]) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [paused, setPaused] = useState(false);
  const switchRef = useRef<(k: number) => void>(() => {});
  useEffect(() => {
    let alive = true;
    let raf = 0;
    let view: ProtoView | null = null;
    let env: DonjonEnv | null = null;
    const g = newBanc(cfg, (Math.random() * 1e9) | 0);
    (window as unknown as { __banc: unknown }).__banc = g;
    const st = g.banc!;
    const keys = new Set<string>();
    let skill = -1;
    let focus = false;
    let sw = -1;
    let lmb = false;
    let pausedNow = false;
    const pauses: number[] = [];
    const mouse = { x: 0, y: 0 };
    let aim = { x: 15, y: 15 };
    switchRef.current = (k) => (sw = k);
    const kd = (e: KeyboardEvent) => {
      if (['Space', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyF'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Space') {
        pausedNow = !pausedNow;
        if (pausedNow) pauses.push(Math.round(g.t * 10) / 10);
        setPaused(pausedNow);
      }
      const d = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
      if (d >= 0) skill = d;
      if (e.code === 'KeyF') focus = true;
      if (e.code === 'Tab') sw = -2;
      keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    const mm = (e: MouseEvent) => {
      const r = host.current!.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const md = (e: MouseEvent) => e.button === 0 && (lmb = true);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const el = host.current!;
    el.addEventListener('mousemove', mm);
    el.addEventListener('mousedown', md);
    const onResize = () => view?.resize();
    window.addEventListener('resize', onResize);
    loadProtoModels().then(() => {
      if (!alive) return;
      view = new ProtoView(el, { salle: false });
      view.followSun = true;
      // même caméra fixe pour toutes les variantes : toute l'arène est visible
      view.camFocus = { ...ARENA_CENTER };
      view.camOffset.set(0, 26, 15);
      env = new DonjonEnv(view.scene, g.level as never, view);
      let last = performance.now();
      let acc = 0;
      let hudT = 0;
      const frame = (now: number) => {
        if (!alive || !view || !env) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const pick = view.pick(mouse.x, mouse.y, 0);
        if (pick) aim = pick;
        if (!pausedNow) {
          acc += dt;
          while (acc >= 1 / 60 && !g.result) {
            const v = cfg.variante;
            const dir = { x: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), y: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0) };
            let inp: Input;
            if (v === '0' || v === 'A') inp = st.aiLeaderInput(g);
            else {
              inp = emptyInput();
              inp.move = dir;
              if (lmb) {
                const t = enemies(g).filter((e) => Math.hypot(e.x - aim.x, e.y - aim.y) < e.r + 1.3).sort((a, b) => Math.hypot(a.x - aim.x, a.y - aim.y) - Math.hypot(b.x - aim.x, b.y - aim.y))[0];
                inp.designate = t ? t.id : -2;
              }
            }
            inp.aim = aim;
            if (v !== '0') {
              if (v === 'A') inp.bancGroup = dir;
              inp.bancSkill = skill;
              inp.focus = focus;
              inp.bancSwitch = sw;
            }
            skill = -1;
            focus = false;
            sw = -1;
            lmb = false;
            step(g, inp);
            acc -= 1 / 60;
          }
        }
        view.render(g, aim, pausedNow ? 0 : dt);
        env.update(g, dt, view.camera.position);
        hudT -= dt;
        if (hudT <= 0) {
          hudT = 0.1;
          const boss = g.units.find((u) => u.role === 'boss' && u.alive);
          setHud({
            t: g.t,
            team: SPECIES.map((sp) => {
              const u = st.team(g).find((x) => x.species === sp)!;
              return { sp, hp: u.hp, max: u.maxHp, alive: u.alive, controlled: u === g.leader && (cfg.variante === 'B' || cfg.variante === 'C'), cd: Math.max(0, st.cds[sp] ?? 0), cd2: Math.max(0, st.cds[`${sp}2`] ?? 0) };
            }),
            boss: boss ? { hp: boss.hp, max: boss.maxHp, channel: boss.channel, vuln: boss.healCd > 0 } : null,
            adds: enemies(g).filter((e) => e.role !== 'boss').length,
          });
        }
        if (g.result) {
          const r = trialResults(g);
          setTimeout(() => alive && onEnd(r, pauses), 900);
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
      el.removeEventListener('mousemove', mm);
      el.removeEventListener('mousedown', md);
      env?.dispose();
      view?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const v = cfg.variante;
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <div ref={host} className="absolute inset-0 cursor-crosshair" style={{ filter: paused ? 'grayscale(0.85) brightness(0.9)' : undefined }} />
      {paused && (
        <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 rounded-lg border-2 border-sky-300 bg-slate-900/85 px-4 py-2 text-center text-white">
          <div className="text-lg font-bold text-sky-300">Pause tactique</div>
          <div className="text-sm">Espace : reprendre. Les commandes données pendant la pause partent à la reprise.</div>
        </div>
      )}
      {hud && (
        <>
          {hud.boss && (
            <div className="pointer-events-none absolute left-1/2 top-3 w-[min(560px,80vw)] -translate-x-1/2 text-center text-sm font-bold text-white">
              Gardien de basalte {hud.boss.channel && <span className="text-rose-300">— Effondrement ! (le Choc de Crabastion l’interrompt)</span>}
              {hud.boss.vuln && <span className="text-sky-300"> — vulnérable</span>}
              <div className="mt-1 h-4 overflow-hidden rounded bg-black/60">
                <div className="h-full" style={{ width: `${(100 * hud.boss.hp) / hud.boss.max}%`, background: hud.boss.vuln ? '#3FA9F5' : '#9B5CFF' }} />
              </div>
              <div className="mt-1 text-xs font-normal text-white/70">Invocations en jeu : {hud.adds} · {Math.floor(hud.t)} s</div>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 text-white">
            {hud.team.map((c, i) => (
              <button
                key={c.sp}
                type="button"
                onClick={() => v === 'C' && switchRef.current(SPECIES.indexOf(c.sp))}
                className={`w-44 rounded-lg border-2 p-2 text-left text-xs ${c.controlled ? 'border-amber-300 bg-slate-700' : 'border-white/15 bg-slate-900/85'} ${c.alive ? '' : 'opacity-40'} ${v === 'C' ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex justify-between font-bold">
                  <span>{NAMES[c.sp]}</span>
                  <span className="text-white/60">{c.controlled ? 'toi' : ROLE[c.sp]}</span>
                </div>
                <div className="my-1 h-2 overflow-hidden rounded bg-black/60">
                  <div className="h-full bg-emerald-400" style={{ width: `${Math.max(0, (100 * c.hp) / c.max)}%` }} />
                </div>
                <div className={c.cd > 0 ? 'text-white/50' : 'text-amber-300'}>
                  {v === '0' ? '' : `${i + 1} · `}
                  {SKILL[c.sp].name} {c.cd > 0 ? `(${Math.ceil(c.cd)} s)` : 'prête'}
                </div>
                <div className={c.cd2 > 0 ? 'text-white/50' : 'text-amber-300'}>
                  {v === '0' ? '' : `${i + 4} · `}
                  {SKILL2[c.sp].name} {c.cd2 > 0 ? `(${Math.ceil(c.cd2)} s)` : 'prête'}
                </div>
              </button>
            ))}
          </div>
          {!hidden && <div className="pointer-events-none absolute bottom-24 left-3 max-w-xs rounded bg-black/55 px-2 py-1 text-xs text-white">Variante {v} · {VARIANTES.find((x) => x.id === v)!.keys}</div>}
          {hidden && <div className="pointer-events-none absolute bottom-24 left-3 max-w-xs rounded bg-black/55 px-2 py-1 text-xs text-white">Variante cachée · essaie ZQSD, clic, 1 2 3, F, Tab · Espace : pause</div>}
        </>
      )}
    </div>
  );
}

/** « Pourquoi j'ai gagné ou perdu » : les chiffres qui comptent, en phrases. */
function why(t: Trial): string[] {
  const out: string[] = [];
  const parts = Object.entries(t.part_degats).sort((a, b) => b[1] - a[1]);
  if (t.grosses_attaques_passees) out.push(`L’Effondrement est passé ${t.grosses_attaques_passees} fois (${BOSS.bigDmg} dégâts à chaque créature).`);
  if (t.interruptions_reussies) out.push(`Tu l’as interrompu ${t.interruptions_reussies} fois : ${BOSS.vuln} s de vulnérabilité à chaque fois.`);
  out.push(`Zones au sol : ${t.zones_evitees} évitées, ${t.zones_subies} subies.`);
  out.push(`Invocations : ${t.invocations} apparues, ${t.invocations_restantes} encore là à la fin.`);
  if (parts[0]) out.push(`${parts[0][0]} a fait ${parts[0][1]} % des dégâts${parts[0][1] > 60 ? ' (effet héros : plus de 60 %)' : ''}.`);
  const worst = Object.entries(t.degats_subis).sort((a, b) => b[1] - a[1])[0];
  if (worst) out.push(`${worst[0]} a le plus encaissé (${worst[1]}).`);
  if (t.issue === 'défaite' && t.boss_pv_restants) out.push(`Il restait ${t.boss_pv_restants} PV au Gardien (${Math.round((100 * t.boss_pv_restants) / BOSS.hp)} %).`);
  return out;
}

function End({ t, pauses, hidden, onSaved }: { t: Trial; pauses: number[]; hidden: boolean; onSaved: () => void }) {
  const crit = CRITERES;
  const [notes, setNotes] = useState<number[]>(crit.map(() => 0));
  const [agace, setAgace] = useState('');
  const [frus, setFrus] = useState(false);
  const [saved, setSaved] = useState(false);
  const done = notes.every((n) => n > 0);
  const store = () => {
    const e: Essai = { ...t, date: new Date().toISOString(), pauses, grille: { notes, agace, frustration_commandes: frus, criteres: crit }, tirage_cache: hidden };
    save(BANC_STORAGE_KEY.essais, [...load<Essai[]>(BANC_STORAGE_KEY.essais, []), e]);
    if (t.variante === 'B') save(BANC_STORAGE_KEY.rotation, load<number>(BANC_STORAGE_KEY.rotation, 0) + 1);
    setSaved(true);
  };
  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className={`text-3xl font-bold ${t.issue === 'victoire' ? 'text-emerald-300' : 'text-rose-300'}`}>{t.issue === 'victoire' ? 'Victoire' : 'Défaite'}</h1>
        <div className="text-white/70">{t.raison} · {t.duree_s} s · {t.actions_par_minute} actions par minute · {pauses.length} pause(s)</div>
        <h2 className="mt-4 font-bold">Pourquoi</h2>
        <ul className="list-disc pl-5 text-sm text-white/85">
          {why(t).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <h2 className="mt-4 font-bold">La grille (à remplir tout de suite)</h2>
        <div className="grid gap-1 text-sm">
          {crit.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-white/80">{c}</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" disabled={saved} onClick={() => setNotes(notes.map((x, k) => (k === i ? n : x)))} className={`h-7 w-7 rounded ${notes[i] === n ? 'bg-amber-300 font-bold text-slate-900' : 'bg-white/10'}`}>
                  {n}
                </button>
              ))}
            </div>
          ))}
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={frus} disabled={saved} onChange={(e) => setFrus(e.target.checked)} /> Une frustration venait des commandes
          </label>
          <textarea value={agace} disabled={saved} onChange={(e) => setAgace(e.target.value)} placeholder="Qu’est-ce qui m’a agacé ?" className="mt-1 h-20 rounded bg-slate-800 p-2" />
        </div>
        {!saved ? (
          <button type="button" disabled={!done} onClick={store} className="mt-3 rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900 disabled:opacity-40">
            Enregistrer l’essai {done ? '' : '(note les 10 critères)'}
          </button>
        ) : (
          <div className="mt-3">
            {hidden && <div className="mb-2 text-lg">La variante tirée était : <b>{VARIANTES.find((v) => v.id === t.variante)!.name}</b></div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify({ ...t, pauses }, null, 2))} className="rounded-lg bg-white/10 px-4 py-2">Copier les résultats (JSON)</button>
              <button type="button" onClick={onSaved} className="rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900">Retour au banc</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BancPage() {
  type Screen = { s: 'home' } | { s: 'setup'; v: Variante; hidden: boolean } | { s: 'fight'; cfg: BancConfig; hidden: boolean } | { s: 'end'; t: Trial; pauses: number[]; hidden: boolean };
  const [screen, setScreen] = useState<Screen>(() => {
    const v = new URLSearchParams(window.location.search).get('variante');
    if (v === 'hasard') return { s: 'setup', v: (['0', 'A', 'B', 'C'] as Variante[])[Math.floor(Math.random() * 4)], hidden: true };
    return v === '0' || v === 'A' || v === 'B' || v === 'C' ? { s: 'setup', v, hidden: false } : { s: 'home' };
  });
  if (screen.s === 'home') return <Home onStart={(v, hidden) => setScreen({ s: 'setup', v, hidden })} />;
  if (screen.s === 'setup') return <Setup variante={screen.v} hidden={screen.hidden} onGo={(cfg) => setScreen({ s: 'fight', cfg, hidden: screen.hidden })} />;
  if (screen.s === 'fight') return <Fight cfg={screen.cfg} hidden={screen.hidden} onEnd={(t, pauses) => setScreen({ s: 'end', t, pauses, hidden: screen.hidden })} />;
  return <End t={screen.t} pauses={screen.pauses} hidden={screen.hidden} onSaved={() => setScreen({ s: 'home' })} />;
}
