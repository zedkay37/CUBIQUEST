# SPRINT STYLES : Magmadrake en plusieurs styles

Fiche hors plan directeur, à exécuter par Claude Code en autonomie.
Les règles communes de PLAN_DIRECTEUR.md et de SPEC_ATELIER.md s'appliquent.
Ce sprint est une **exploration** : il ne change RIEN au jeu lui-même. Il ajoute seulement une page de comparaison.

## Pourquoi ce sprint

Le joueur trouve Pokémon Quest « stylé » et CubiQuest « pire que Minecraft ». Magmadrake (version ART 3) est l'étalon actuel : c'est le modèle préféré. Avant de refaire toutes les créatures, le joueur veut VOIR plusieurs styles de voxel appliqués à Magmadrake et choisir.

Hypothèses à vérifier visuellement (rien n'est prouvé, c'est le but de la page) :
1. **Taille des voxels mélangée** : on mélange des micro-cubes (effet bruit) et de grosses boîtes. Minecraft et Pokémon Quest gardent UNE échelle cohérente.
2. **Arêtes dures et facettes plates** : Pokémon Quest a des arêtes légèrement arrondies et un ombrage doux.
3. **Couleurs ternes** : le tone mapping ajouté au sprint G1 désature peut-être les couleurs (gris, bruns).
4. **Créatures trop petites à l'écran** : la caméra est haute et lointaine.
5. **Crénelage** : les bords en escalier « pixelisés ».

## Sauvegarde

1. Partir de `art3-final`. S'il n'existe pas, partir du dernier commit de la branche `art-3`, et le noter.
2. Poser et pousser le tag `sauvegarde-avant-styles` et une branche du même nom ; vérifier avec `git ls-remote`.
3. Créer la branche `styles` et y commiter en premier `docs/plan/SPRINT_STYLES.md`.
4. Tag `styles-avant-<section>` poussé avant chaque section, `styles-final` à la fin.
5. Ne pas toucher à `main`. Golden master identique (aucun changement de jeu).

## Section 1 : six variantes de Magmadrake

Créer six versions de Magmadrake, qui gardent toutes la même identité : roche sombre, lave orange, même posture générale, mêmes proportions. Ne changer que le STYLE.

| Lettre | Nom | Description |
|---|---|---|
| A | Étalon ART 3 | Le modèle actuel, sans aucun changement. |
| B | Gros blocs | 8 à 15 volumes francs au maximum, aplats de couleur, visage net. Esprit « jouet ». |
| C | Voxel moyen cohérent | UNE seule taille de voxel pour tout le modèle (environ 24 voxels de haut), sans aucun micro-détail plus fin. Esprit « figurine Minecraft soignée ». |
| D | Voxel biseauté | Comme C, mais chaque cube a des arêtes légèrement arrondies (biseau) et un ombrage doux. |
| E | Sculpté lisse | La finesse d'ART 3, mais la surface est fusionnée en une seule peau (pas de faces internes, pas de bruit), avec un ombrage lissé. |
| F | Toon | Le modèle C avec un rendu dessin animé : 2 ou 3 niveaux d'ombre francs et un contour noir épais. |

Aucune variante ne doit rappeler une créature existante connue.

## Section 2 : la page `?gallery=styles`

- Une grille montrant les six variantes en même temps, qui tournent lentement, avec leur lettre et leur nom.
- **Deux vues**, avec un bouton pour passer de l'une à l'autre :
  - « Vitrine » : la créature en grand, sur fond neutre ;
  - « En jeu » : la créature posée sur un morceau de Prairie (ART 3), à la taille et avec l'angle de la caméra de combat. C'est la vue la plus importante : on juge un style à la taille réelle.
- **Interrupteurs de rendu**, qui s'appliquent à toutes les variantes, pour tester les hypothèses :
  - Tone mapping : actuel / aucun / neutre ;
  - Saturation : normale / +20 % ;
  - Anticrénelage : actuel / renforcé ;
  - Caméra en jeu : actuelle / plus proche et plus basse ;
  - Jour / nuit.
- Un bouton « Comparer A et ? » qui met l'étalon à côté de la variante choisie, en grand.
- Un lien vers cette page depuis `?gallery=art`.

## Section 3 : rapport et publication

- Captures des six variantes dans les deux vues, avec les réglages par défaut, dans `docs/captures/styles/`.
- Une capture « interrupteurs » : la même variante avec et sans chaque interrupteur, pour montrer ce que chacun change.
- Noter pour chaque variante les appels de dessin et les triangles.
- Rapport `docs/rapports/STYLES.md` : ce qui a été fait, ce que chaque interrupteur change, ce qui n'a été vu que sur image fixe. NE PAS désigner de gagnant : le choix appartient au joueur.
- `npm run check`, golden identique, publication sur …/next/ avec `npm run deploy:pages -- --target next`.
- Terminer par un résumé en 5 lignes.

## Hors de ce sprint

- Appliquer un style au jeu ou aux autres créatures.
- Changer les réglages de rendu du jeu (les interrupteurs n'agissent que dans la page `?gallery=styles`).

FIN DU SPRINT STYLES
