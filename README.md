# CubiQuest

RPG 3D voxel jouable dans le navigateur (React 19, Three.js, Vite, Tailwind 4). Textes du jeu en français.
Le guide de travail détaillé (architecture, conventions, pièges) est dans [CLAUDE.md](CLAUDE.md) ; la charte du contenu dans [STYLE.md](STYLE.md).

## Lancer le jeu

Prérequis : Node.js 24 (ou plus récent) et npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

Le Codex (questions au « Professeur Cubix ») a besoin d'une clé `GEMINI_API_KEY` dans un fichier `.env` ; le reste du jeu fonctionne sans.

Version de production : `npm run build` puis `npm run preview`.

## Tester

| Commande | Ce qu'elle vérifie |
| --- | --- |
| `npm run check` | Tout : types (`tsc`), tests, golden master, build. À lancer avant chaque commit. |
| `npm test` | Tests unitaires seuls. |
| `npm run golden` | Rejoue 840 combats à graine fixe et échoue à la moindre différence avec `docs/sim/golden-master.json`. |
| `npm run sim` | Mesure d'équilibrage : taux de victoire, durées, phases de boss par niveau. |
| `npm run texts` | Liste les textes visibles restés en dur dans l'interface (ils vivent dans `src/i18n/fr.ts`). |
| `npm run census -- tundra-3` | Compte les maillages d'une scène sans navigateur : nombres reproductibles, pour comparer avant / après une optimisation. |

Les mêmes vérifications tournent sur GitHub à chaque push et pull request (`.github/workflows/check.yml`).

### Le golden master

`npm run golden` est le garde-fou « le jeu se comporte comme avant ». Un changement technique (rangement, performance, outillage) ne doit rien y changer. Après un changement de jeu voulu (équilibrage, contenu, règle), on réenregistre la référence et on committe le fichier avec le changement :

```bash
npm run golden -- --record
```

## Adresses utiles en développement

Aucune ne modifie la sauvegarde. Elles se combinent (`?stage=tundra-3&debug=1`).

| Paramètre | Effet |
| --- | --- |
| `?debug=1` | Overlay de diagnostic en haut à gauche (voir ci-dessous). |
| `?stage=<id>` | Lance un niveau avec son escouade de référence, en Auto. Options : `&squad=a,b,c&lvl=N&bonus=N`. |
| `?gallery=1` | Galerie de revue : tous les Cubimons en 3D et un aperçu de chaque biome. |
| `?autostart=1&hour=0.8` | Camp directement, à une heure donnée (0 aube, 0.3 jour, 0.66 crépuscule, 0.8 nuit). |

### `?debug=1`

L'overlay est désactivé par défaut et n'est pas téléchargé sans le paramètre. Il affiche, deux fois par seconde :

| Ligne | Sens |
| --- | --- |
| FPS | Images affichées par seconde. |
| Image | Temps de calcul de la dernière image (logique + envoi du rendu), en millisecondes. 16,7 ms correspond à 60 FPS. |
| Draw calls | Appels de dessin de la dernière image, ombres comprises. |
| Triangles | Triangles dessinés dans la dernière image. |
| Géométries, Textures | Objets en mémoire graphique. Un nombre qui monte sans fin d'un niveau à l'autre signale une fuite. |
| Particules | Particules actives (le pool est plafonné à 320). |
| Entités | Cubimons présents : promeneurs au camp, alliés et ennemis en expédition. |

Pour comparer deux versions, mesurer au même endroit : par exemple `?stage=tundra-3&debug=1`, pendant la première vague.
