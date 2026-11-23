# SPRINT ART 2 : Lisibilité et finition

Fiche hors plan directeur, à exécuter par Claude Code en autonomie.
Elle suit SPRINT_ART.md. Les règles communes de PLAN_DIRECTEUR.md (R1 à R16) et de SPEC_ATELIER.md s'appliquent.

## But

Le sprint ART a validé la méthode « volumes → blocs », la barre latérale et le camp vivant. Le test du 23 novembre a relevé quatre défauts :

1. Les formes de base (Pyrocube, Ampoulin, Cailloc) restent des boîtes, et Pyrocube est moins lisible qu'avant.
2. Les formes évoluées sont presque d'une seule couleur, avec une surface bruitée : on distingue mal la tête du corps.
3. Les arbres bougent bizarrement au vent, au point que c'est dérangeant (retour du joueur).
4. Le premier plan du camp est encombré : d'énormes blocs verts flous bouchent le bas et les côtés de l'écran, et l'herbe en confettis fatigue l'œil.

Ce sprint corrige ces quatre points et prépare le jeu pour le téléphone. Il ne généralise PAS encore aux autres biomes ni aux autres créatures.

## Ce qui change par rapport aux fiches précédentes

- **Nouvelle règle permanente R17 (téléphone)** : à partir de ce sprint, chaque section doit marcher au doigt, sur un écran de 390 × 844, en qualité Basse. Une action qui n'existe qu'au clavier est un défaut à corriger.
- **Ce qui ne change pas** : le moteur reste Three.js, il n'y a pas de portage (ni Kotlin, ni Unity, ni Godot). L'appli téléphone sera plus tard un simple emballage du jeu web (Capacitor ou TWA), hors de ce sprint.

## Sauvegarde avant de commencer

1. Partir du tag `art-final`. S'il n'existe pas, partir du dernier commit de la branche `art-direction`, et le noter dans le rapport.
2. Poser et pousser le tag `sauvegarde-avant-art2`, ainsi qu'une branche du même nom. Vérifier avec `git ls-remote` que les deux sont bien sur GitHub.
3. Créer la branche `art-lisibilite` et y commiter en premier `docs/plan/SPRINT_ART2.md`.
4. Avant chaque section, poser et pousser un tag `art2-avant-<section>`. À la fin, poser et pousser `art2-final`.
5. Ne pas toucher à `main`.

## Règles de ce sprint

- **Golden master** : changements purement graphiques. Il doit rester identique à chaque section. S'il bouge, c'est un bogue à corriger, pas à réenregistrer.
- **Pas de plagiat** : aucune créature ne doit rappeler une créature existante connue (Pokémon ou autre), ni par sa silhouette, ni par ses couleurs, ni par un détail emblématique. En cas de doute, choisir la forme la plus cubique et la plus originale.
- **Preuves** : pour chaque section, une capture avant/après dans `docs/rapports/art2/`. Tout ce qui n'a été vu que sur image fixe (les animations surtout) doit être signalé comme tel dans le rapport.
- **Performance** : noter les appels de dessin et les triangles en Bas, Moyen et Haut, avant et après, comme dans le rapport ART. En qualité Basse, ne pas dépasser les chiffres de `art-final`.

## Section 0 : le vent dans les arbres

Problème : le mouvement des arbres est dérangeant.

À faire :
- Le tronc ne bouge plus du tout.
- Le feuillage bouge comme un bloc rigide : légère rotation de 2° au maximum autour de sa base, lente (cycle de 3 à 5 secondes), avec un décalage différent pour chaque arbre. Aucune déformation ni cisaillement des blocs.
- L'herbe peut garder son ondulation, mais plus faible.
- En qualité Basse, et si le système demande moins d'animations (`prefers-reduced-motion`), le vent est coupé.
- Ajouter dans Options un réglage « Vent : Normal / Doux / Coupé ».

Critère de réussite : sur une capture vidéo ou une suite de captures, le mouvement doit se lire comme une brise, pas comme une déformation.

## Section 1 : couleurs des créatures

À faire, pour les 9 créatures refaites au sprint ART :
- Chaque créature a 2 à 3 tons nets : une couleur de corps, une couleur d'accent (ventre, crête, plaques, etc.) et des détails sombres.
- Le « bruit » de surface est supprimé, ou limité à ±4 % de luminosité au maximum.
- La tête doit se distinguer du corps par la couleur ou par l'ombre, pas seulement par la forme.
- Le contour et l'éclairage existants (G1) restent.

Critère de réussite : sur une capture à 128 pixels de haut, on doit pouvoir dire où est la tête, où sont les yeux, et de quel élément est la créature.

## Section 2 : les formes de base

Créatures concernées : Pyrocube, Ampoulin et Cailloc. Ce sont les premières que le joueur voit : elles doivent donner envie.

À faire :
- Proportions « mignonnes » : la tête fait environ 45 à 50 % de la hauteur, avec des yeux plus grands (au moins 2 blocs de haut) et un reflet.
- Chaque créature a UN détail signature lisible de loin. Pistes : la braise-cube de Pyrocube, l'ampoule ou le filament d'Ampoulin, la fissure ou le cristal de Cailloc.
- Elles restent cubiques, c'est l'identité du jeu, mais ne sont plus des boîtes : il faut des volumes distincts pour la tête, le corps, les pattes et le détail.
- Mettre à jour le test « Silhouettes » de `?gallery=art` : les 9 silhouettes noires doivent toutes être différentes à 64 pixels.

## Section 3 : les formes évoluées

Créatures concernées : les 6 formes 2 et 3 (Flambrix, Ignisaur, Bobinard, Voltacier, Granitox, Magmadrake).

À faire :
- Appliquer la section 1 (couleurs).
- Plus de contraste entre les parties : chaque partie importante doit avoir au moins 15 % d'écart de luminosité avec ses voisines.
- La créature doit remplir le cadre de la galerie et du portrait à au moins 70 % de sa hauteur.
- Garder les choix anti-plagiat du sprint ART (plaques de lave d'Ignisaur au lieu d'ailes, etc.).

## Section 4 : le premier plan du camp

À faire :
- Supprimer ou éloigner les gros blocs flous du premier plan. Le bas et les côtés de l'écran doivent rester dégagés.
- Réduire la densité de l'herbe et des fleurs en confettis d'environ 40 %, et les regrouper en touffes plutôt que de les semer partout.
- Le chemin et les quatre lieux cliquables (panneau, Atelier, tente, bibliothèque) doivent être les éléments les plus lisibles de l'écran.
- Vérifier le cadrage en 16/9 sur PC et en 390 × 844 sur téléphone.

## Section 5 : contrôle au doigt

À faire :
- Lister toutes les actions du jeu : camp, Atelier, équipe, combat (déplacement, sorts, esquive, Déchaînement, Auto, pause).
- Vérifier que chacune est possible au doigt en 390 × 844. Corriger celles qui ne le sont pas.
- Les boutons tactiles font au moins 44 × 44 pixels.
- Noter le résultat dans le rapport sous forme de tableau (action, au doigt oui/non, corrigé).

## Section 6 : rapport et publication

- Mettre à jour `?gallery=art` avec trois colonnes : « Avant ART », « ART » et « ART 2 », plus le bouton « Silhouettes ».
- Écrire le rapport `docs/rapports/ART2.md` : ce qui a été fait, les captures, les chiffres de performance, ce qui n'a été vu que sur image fixe, et les décisions prises seul.
- Lancer `npm run check` et vérifier le golden master.
- Publier sur …/next/ avec `npm run deploy:pages -- --target next`.
- Terminer par un résumé en 5 lignes.

## Hors de ce sprint

- La généralisation aux autres biomes et aux autres créatures : elle viendra après validation par le joueur.
- Les modèles `.vox` (section 6 de SPRINT_ART).
- L'emballage en appli téléphone.

FIN DU SPRINT ART2
