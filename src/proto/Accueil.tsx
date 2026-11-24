/**
 * PROTO-MODELES : page d'accueil de `/proto/` — tous les modèles de jeu, chacun avec son nom, ce que fait le joueur,
 * ses touches et un bouton « Jouer ». Rien n'est stocké.
 */
import { MODEL_INFO } from './modeles';

export function Accueil() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Banc d’essai : les façons de jouer</h1>
        <p className="mt-2 text-white/70">
          Mêmes créatures, même donjon, même moteur. Essaie chaque modèle quelques minutes. Dans tous les modèles, F1 ouvre les réglages (vitesse, caméra, densité, graine), et l’écran de fin propose « Copier les résultats ».
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {MODEL_INFO.map((m) => (
            <div key={m.id} className="flex flex-col rounded-xl border border-white/15 bg-slate-800 p-4">
              <div className="text-xl font-bold">{m.name}</div>
              <div className="mt-1 text-sm text-white/80">{m.phrase}</div>
              <div className="mt-2 text-xs text-white/55">
                <span className="font-bold text-white/70">Touches : </span>
                {m.keys}
              </div>
              <a href={`${base}${m.href}`} className="mt-3 self-start rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900 hover:bg-amber-200">
                Jouer
              </a>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-white/50">
          Ancienne maquette (une salle, sprint PROTO-MENEUR) : <a className="underline" href={`${base}?proto=salle`}>la salle</a>.
        </div>
      </div>
    </div>
  );
}
