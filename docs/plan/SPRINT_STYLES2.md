# SPRINT STYLES 2 : 20 styles pour Magmadrake

Fiche hors plan directeur, à exécuter par Claude Code en autonomie.
Les règles communes de PLAN_DIRECTEUR.md et de SPEC_ATELIER.md s'appliquent.
C'est une **exploration** : le jeu ne change PAS. Seule la page `?gallery=styles` grandit.

## Pourquoi

Le joueur adore la page `?gallery=styles` (6 variantes A à F, sprint STYLES). Il veut **20 styles en tout**, avec des prises de risque variées, pour bien choisir.

Ce que STYLES a appris (avis du joueur et de l'assistant, à confirmer) :
- A (étalon) et C (blocs d'une seule taille) sont les meilleurs ; B (gros blocs) perd le caractère ; D coûte 50 fois plus de triangles pour un aspect bruité ; E fait pâte à modeler ; F (toon) est trop sombre.
- Les tons « neutre » et la caméra proche changent davantage l'image que le style de voxel.

## Sauvegarde

1. Partir de `styles-final`. S'il n'existe pas, partir du dernier commit de la branche `styles`, et le noter.
2. Poser et pousser le tag `sauvegarde-avant-styles2` et une branche du même nom ; vérifier avec `git ls-remote`.
3. Créer la branche `styles-2` et y commiter en premier `docs/plan/SPRINT_STYLES2.md`.
4. Tag `styles2-avant-<section>` poussé avant chaque section, `styles2-final` à la fin.
5. Ne pas toucher à `main`. Golden master identique.

## Règles

- Les 14 nouvelles variantes gardent l'identité de Magmadrake : roche sombre, lave orange, même posture, mêmes proportions, même taille à l'écran. Seul le STYLE change.
- **Prendre des risques** : chaque variante doit être franchement différente des autres. Une variante ratée mais audacieuse vaut mieux que deux variantes presque identiques.
- **Pas de plagiat** : on reprend des TECHNIQUES de rendu, jamais l'apparence reconnaissable d'un jeu, d'une marque ou d'un jouet existant. En particulier, pas de tenons de brique façon jouet de construction connu.
- Garder A à F exactement comme ils sont.

## Section 1 : 14 nouvelles variantes (G à T)

| Lettre | Nom | Description | Risque |
|---|---|---|---|
| G | Occlusion par sommet | Le modèle C avec une occlusion ambiante calculée à chaque coin de voxel : coins et creux assombris en douceur. Technique classique des beaux jeux voxel. | Faible |
| H | Haute définition propre | Environ 48 voxels de haut, une seule taille, couleurs unies sans aucun bruit. | Faible |
| I | Hybride contrôlé | Corps en blocs moyens et nets ; détails fins seulement sur la tête, les yeux et la lave. | Moyen |
| J | Briques jointées | Chaque voxel est légèrement séparé de ses voisins par un joint sombre fin, comme une mosaïque de pierres taillées. | Moyen |
| K | Figurine vinyle | Matière brillante et lisse, reflets nets, comme une figurine de collection en plastique. | Moyen |
| L | Pastel diffus | Couleurs adoucies vers le pastel, lumière très douce venant de partout, ombres colorées (bleutées) plutôt que noires. | Moyen |
| M | Gris + une couleur | Tout le corps en gris clair mat ; seule la lave garde sa couleur, très vive. | Moyen |
| N | Toon clair | Rendu dessin animé avec 3 tons francs mais CLAIRS, et un contour coloré (version foncée de chaque couleur, jamais noir). Corrige le défaut de F. | Moyen |
| O | Nuit volcanique | Roche presque noire ; la lave est la vraie source de lumière, avec un halo fort qui éclaire le sol autour. | Élevé |
| P | Cristal | Roche semi-transparente façon cristal fumé ; la lave se voit à l'intérieur du corps. | Élevé |
| Q | Polygones facettés | Plus de cubes : formes en triangles plats et facettes nettes (style « low-poly »). | Élevé |
| R | Pixel 3D | Rendu volontairement en basse résolution puis agrandi, avec des pixels nets et une palette réduite à environ 16 couleurs. | Élevé |
| S | Carton crayonné | Faces mates légèrement irrégulières, contours tracés comme au crayon, aspect maquette en carton. | Élevé |
| T | Aquarelle | Ombrage peint avec des bords doux, une texture de papier et des couleurs qui « bavent » légèrement. | Très élevé |

## Section 2 : la page `?gallery=styles` pour 20 styles

- Une grille de 20 cases (A à T), avec la lettre, le nom, une ligne de description, le niveau de risque, les appels de dessin et les triangles.
- **Performance de la page** : 20 scènes 3D en même temps peuvent saturer le navigateur. Utiliser un seul moteur de rendu pour toute la grille (découpage de l'écran), ou bien des pages de 10 cases. La page doit rester fluide sur un PC ordinaire.
- Garder les vues « Vitrine » et « En jeu », et tous les interrupteurs (tons, saturation, anticrénelage, caméra, jour/nuit).
- **Comparer** : choisir librement deux lettres et les afficher côte à côte, en grand.
- **Favoris** : une étoile sur chaque case. Un bouton « Mon classement » affiche les variantes étoilées et permet de les classer (1er, 2e, 3e…). Un bouton « Copier mon choix » copie un court texte, par exemple « Favoris : C, G, O — tons neutre, caméra proche », que le joueur pourra coller dans le chat. Les favoris sont mémorisés dans le navigateur.
- Un bouton « Plein écran » pour une case, qui fait tourner la créature lentement et permet de la faire pivoter à la souris.

## Section 3 : rapport et publication

- Captures des 20 variantes en vue « En jeu », avec tons neutre et caméra proche, dans `docs/captures/styles2/`, plus une planche unique qui les réunit.
- Rapport `docs/rapports/STYLES2.md` : ce qui a été fait, coût de chaque variante, ce qui n'a été vu que sur image fixe. NE PAS désigner de gagnant.
- `npm run check`, golden identique, publication sur …/next/ avec `npm run deploy:pages -- --target next`.
- Terminer par un résumé en 5 lignes.

## Hors de ce sprint

- Appliquer un style au jeu.
- Changer les réglages de rendu du jeu.

FIN DU SPRINT STYLES2
