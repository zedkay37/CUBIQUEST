# vox-studio (référence du 23/11/2026)

Scripts Python qui ont produit le Calcinarque légendaire validé par le joueur.
Lancer depuis ce dossier : `mkdir -p out && python3 calcinarque_legendaire.py` (Python 3, numpy, Pillow).
Sortie : `out/<nom>.vox` et `out/<nom>.png` (planche d'aperçu, rendu par lancer de rayons, pas le rendu du jeu).

- `calcinarque_legendaire.py` : modèle de référence validé.
- `coureur_cendres.py` : forme intermédiaire, lisible.
- `ailebraise.py` : contre-exemple (ailes figées = cape).
- `pixel3d.py` : test pixel 3D, hors périmètre du sprint.

Voir `docs/plan/SPRINT_BESTIAIRE.md`.

## Portage TypeScript (sprint BESTIAIRE, phase 0)

Python n'est pas installé sur la machine de développement : `voxlib.py` est porté en TypeScript (`voxlib.ts`), lancé par `tsx` comme le reste des outils du dépôt.
Le portage est vérifié : `references/calcinarque_legendaire.ts` redonne `references/calcinarque-legendaire.vox` octet pour octet (`npm run vox:build -- --references`, et le test `src/game/voxstudio.test.ts`).

- `npm run vox:build` : `species/<identifiant>.ts` → `src/assets/vox/<identifiant>.vox` (déterministe).
- `npm run vox:check` : relecture indépendante et règles de la fiche.
- `npm run vox:planche` : planches rendues par le jeu (page `?gallery=planche`, Edge sans interface).
- `mesures-phase0.ts` et `bench-edge.mjs` : mesures de la phase 0 (coût, pattes, yeux, échelle, lueurs, images par seconde).

Les scripts Python restent la référence de la méthode.
