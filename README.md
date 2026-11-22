# CubiQuest

Un jeu d'action-aventure en 3D voxel, jouable dans le navigateur : tu mènes un trio de créatures-cubes dans des expéditions courtes en temps réel, à travers 7 biomes et 21 niveaux. Textes du jeu en français.

- Version validée : https://zedkay37.github.io/CUBIQUEST/
- Version en test (session en cours de validation, sauvegarde séparée) : https://zedkay37.github.io/CUBIQUEST/next/

Le cadre du projet et la feuille de route sont dans [docs/plan/PLAN_DIRECTEUR.md](docs/plan/PLAN_DIRECTEUR.md). Le guide de travail (architecture, conventions, pièges) est dans [CLAUDE.md](CLAUDE.md), la charte du contenu dans [STYLE.md](STYLE.md), les rapports de session dans [docs/rapports/](docs/rapports/).

## Lancer le jeu

Prérequis : Node.js 24 (ou plus récent) et npm.

```bash
npm install
npm run dev:static   # Vite seul : le jeu tel qu'il est mis en ligne
npm run dev          # serveur Express + Vite sur http://localhost:3000 (onglet du Professeur possible)
```

Le jeu est un site statique : `npm run build` produit un dossier `dist/` complet. L'onglet « Professeur » du Codex (questions à une IA) est absent par défaut ; il n'apparaît que si le site est construit avec `VITE_AI_CODEX=1` et servi par `npm run dev`, avec une clé `GEMINI_API_KEY` dans `.env`.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run check` | Tout : types, tests, golden master, build. À lancer avant chaque commit (tourne aussi sur GitHub). |
| `npm test` | Tests seuls. |
| `npm run golden` | Rejoue 840 combats à graine fixe et échoue à la moindre différence avec `docs/sim/golden-master.json`. |
| `npm run sim` | Mesure d'équilibrage : victoires, durées, phases de boss par niveau. |
| `npm run texts` | Textes visibles restés en dur dans l'interface (ils vivent dans `src/i18n/fr.ts`). |
| `npm run lexique` | Termes venus d'autres jeux restés dans le dépôt (doit rester à zéro). |
| `npm run census -- tundra-3` | Compte les maillages d'une scène sans navigateur. |
| `npm run deploy:pages -- --target next` | Met la branche courante en ligne à `…/CUBIQUEST/next/` (`--target root` : à la racine ; `--dry-run` : essai sans publier). |

## Adresses utiles en développement

Aucune ne modifie la sauvegarde. Elles se combinent (`?stage=tundra-3&debug=1`).

| Paramètre | Effet |
| --- | --- |
| `?debug=1` | Overlay de diagnostic : FPS, temps d'image, draw calls, triangles, géométries, textures, particules, entités. |
| `?stage=<id>` | Lance un niveau avec son escouade de référence, en Auto. Options : `&squad=a,b,c&lvl=N&bonus=N`. |
| `?gallery=1` | Galerie de revue : toutes les créatures en 3D et un aperçu de chaque biome. |
| `?autostart=1&hour=0.8` | Camp directement, à une heure donnée (0 aube, 0.3 jour, 0.66 crépuscule, 0.8 nuit). |
