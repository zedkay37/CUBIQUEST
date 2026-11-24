/**
 * PROTO-DONJON : panneau de réglages (F1). Chaque choix s'applique tout de suite ; ceux qui changent le donjon ou
 * l'équipe (graine, composition, Meneur, densité) relancent la descente, sans recharger la page.
 */
import { useState } from 'react';
import type { DonjonSettings } from './settings';

type Opt<K extends keyof DonjonSettings> = { key: K; label: string; values: [DonjonSettings[K], string][] };
const OPTIONS: Opt<keyof DonjonSettings>[] = [
  { key: 'scheme', label: 'Schéma de contrôle', values: [[1, '1 · Auto-attaque + ordres'], [2, '2 · Clic souris'], [3, '3 · Tir (ancien)']] },
  { key: 'modele', label: 'Modèle de jeu', values: [['A', 'A · le trio'], ['B', 'B · la meute'], ['C', 'C · le chef d’orchestre']] },
  { key: 'leader', label: 'Meneur', values: [['calcinarque', 'Calcinarque (à distance)'], ['braizard', 'Braizard (corps à corps)']] },
  { key: 'cam', label: 'Caméra', values: [['proche', 'proche'], ['moyenne', 'moyenne'], ['eloignee', 'éloignée']] },
  { key: 'angle', label: 'Angle', values: [['forte', 'plongée forte'], ['rasante', 'plus rasante']] },
  { key: 'speed', label: 'Vitesse du jeu', values: [[0.8, '80 %'], [1, '100 %'], [1.2, '120 %']] },
  { key: 'density', label: 'Densité des ennemis', values: [['faible', 'faible'], ['normale', 'normale'], ['forte', 'forte']] },
  { key: 'wake', label: 'Le donjon se réveille', values: [[false, 'non'], [true, 'oui']] },
  { key: 'minimap', label: 'Mini-carte (M)', values: [[true, 'visible'], [false, 'cachée']] },
  { key: 'recruit', label: 'Chance de recrutement', values: [[0, '0 %'], [0.1, '10 %'], [0.3, '30 %']] },
] as Opt<keyof DonjonSettings>[];

export function SettingsPanel({
  settings,
  onChange,
  onPreset,
  onClose,
  restartKeys,
  keys,
}: {
  settings: DonjonSettings;
  onChange: (s: DonjonSettings) => void;
  onPreset: () => void;
  onClose: () => void;
  restartKeys: (keyof DonjonSettings)[];
  keys: [string, string][];
}) {
  const [seed, setSeed] = useState(String(settings.seed));
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-3xl overflow-auto rounded-xl bg-slate-900 p-5 text-sm text-white" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Réglages du banc d’essai</h2>
          <button type="button" onClick={onClose} className="rounded bg-white/10 px-3 py-1">Fermer (F1)</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            {OPTIONS.map((o) => (
              <div key={o.key}>
                <div className="mb-1 text-white/60">
                  {o.label}
                  {restartKeys.includes(o.key) && <span className="text-amber-300/80"> · relance la descente</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {o.values.map(([v, label]) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => onChange({ ...settings, [o.key]: v })}
                      className={`rounded px-2 py-1 ${settings[o.key] === v ? 'bg-amber-300 font-bold text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <div className="mb-1 text-white/60">Graine du donjon <span className="text-amber-300/80">· relance la descente</span></div>
              <div className="flex gap-1">
                <input value={seed} onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} className="w-28 rounded bg-white/10 px-2 py-1 font-mono" />
                <button type="button" onClick={() => onChange({ ...settings, seed: Math.max(1, Number(seed) || 1) })} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Appliquer</button>
                <button
                  type="button"
                  onClick={() => {
                    const s = 1 + Math.floor(Math.random() * 99999);
                    setSeed(String(s));
                    onChange({ ...settings, seed: s });
                  }}
                  className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                >
                  Au hasard
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={onPreset} className="rounded-lg bg-emerald-400 px-3 py-2 font-bold text-slate-900">
              Préréglage Exploration
            </button>
            <div className="text-xs text-white/60">Schéma 1, composition A, caméra moyenne, mini-carte, recrutement 10 %, donjon qui se réveille.</div>
            <div>
              <div className="mb-1 font-bold">Touches</div>
              <table className="text-xs">
                <tbody>
                  {keys.map(([k, d]) => (
                    <tr key={k}>
                      <td className="pr-3 font-mono text-amber-300">{k}</td>
                      <td className="text-white/80">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-white/50">Les réglages sont dans l’adresse de la page : copier l’adresse suffit pour rejouer exactement la même chose.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
