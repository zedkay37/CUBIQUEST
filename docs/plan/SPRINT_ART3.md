# SPRINT ART 3 : Créatures sculptées, décor épuré

Fiche hors plan directeur, à exécuter par Claude Code en autonomie.
Elle suit SPRINT_ART.md et SPRINT_ART2.md. Les règles communes de PLAN_DIRECTEUR.md (R1 à R17) et de SPEC_ATELIER.md s'appliquent.

## Ce qui a changé, et pourquoi

| Avant | Ce qui s'est passé | Conclusion qui tient désormais |
|---|---|---|
| Après ART, la recommandation était de simplifier les créatures façon Pokémon Quest (gros blocs, visages peints) et de corriger leurs couleurs (ART 2). | Le joueur a comparé les trois versions dans `?gallery=art`. Il préfère largement les créatures d'ART 1 ; Magmadrake ART 1 est cité comme « incroyable ». Les couleurs d'ART 2 sont jugées moins bonnes : tête rose pâle de Pyrocube, aplats ternes. | **Les créatures restent sculptées et détaillées (base : ART 1).** On les améliore seulement par AJOUTS (lumière, lueurs, contour), sans simplifier leur forme. |
| Le décor de la Prairie était fait de nombreux petits blocs de verts différents. | Les références de Pokémon Quest montrent qu'un décor en grands aplats simples rend la scène plus lisible et plus belle. | **Le décor est épuré** : grands aplats, plateaux et falaises en couches, une couleur dominante. Le contraste « décor simple, créatures détaillées » fait ressortir les créatures. |

ART 2 reste utile pour tout ce qui ne touche pas aux modèles des créatures : le vent, le premier plan du camp, la manette tactile, les boutons de 44 px, l'option Vent et les performances. Tout cela est conservé.

## But

Faire **mieux qu'ART 1**, sans perdre ce qui plaît dans ART 1 : des silhouettes sculptées, détaillées, avec du caractère (Magmadrake en est la référence).

## Sauvegarde avant de commencer

1. Partir du tag `art2-final`. S'il n'existe pas, partir du dernier commit de la branche `art-lisibilite`, et le noter dans le rapport.
2. Poser et pousser le tag `sauvegarde-avant-art3`, ainsi qu'une branche du même nom. Vérifier avec `git ls-remote` que les deux sont sur GitHub.
3. Créer la branche `art-3` et y commiter en premier `docs/plan/SPRINT_ART3.md`.
4. Avant chaque section, poser et pousser un tag `art3-avant-<section>`. À la fin, poser et pousser `art3-final`.
5. Ne pas toucher à `main`.

## Règles de ce sprint

- **Golden master** : changements purement graphiques. Il doit rester identique à chaque section. S'il bouge, c'est un bogue à corriger, pas à réenregistrer.
- **Règle d'or des créatures** : on ne change NI la silhouette, NI les proportions, NI la palette principale des modèles d'ART 1. On ne fait qu'AJOUTER. En cas de doute entre la version ART 1 et une amélioration, garder ART 1 et le noter dans le rapport.
- **Pas de plagiat** : aucune créature ni aucun décor ne doit rappeler une œuvre existante connue (Pokémon Quest ou autre). On reprend des PRINCIPES (aplats, lisibilité), jamais des éléments reconnaissables (formes de chaudron, arbres identiques, palettes copiées).
- **Téléphone (R17)** : tout doit marcher au doigt, en 390 × 844, en qualité Basse.
- **Performance** : en qualité Basse, ne pas dépasser les appels de dessin et les triangles de `art2-final`. Les ajouts lumineux peuvent être coupés en Basse.
- **Preuves** : pour chaque section, une capture avant/après dans `docs/captures/art3/`. Tout ce qui n'a été vu que sur image fixe doit être signalé comme tel.

## Section 0 : retour aux créatures d'ART 1

- Restaurer les modèles des 9 créatures (lignées Pyrocube, Ampoulin, Cailloc) tels qu'ils étaient au tag `art-final`, par exemple avec `git checkout art-final -- <fichiers des modèles>`.
- Garder les versions allégées en qualité Basse d'ART 1 ; si ART 2 en a amélioré l'allègement sans toucher à la forme, garder cet allègement.
- Garder tout le reste d'ART 2 (vent, camp, manette tactile, boutons, options).
- Vérifier que les 9 silhouettes restent toutes différentes à 64 px.
- Mettre à jour `?gallery=art` avec quatre colonnes : « Avant ART », « ART 1 », « ART 2 » et « ART 3 », plus le bouton « Silhouettes ».

## Section 1 : faire mieux qu'ART 1, par ajouts seulement

À appliquer aux 9 créatures, en prenant Magmadrake comme référence de qualité :

1. **Lueurs d'élément** : les parties liées à l'élément brillent légèrement, et davantage la nuit. Exemples : les fissures et les plaques de lave de Magmadrake et d'Ignisaur, la braise-cube de Pyrocube, le filament d'Ampoulin, les bobines de Bobinard et de Voltacier. Ce sont des parties existantes : on ne crée pas de nouvelles formes, on les rend lumineuses.
2. **Contour lumineux** (lumière de contre-jour, « rim light ») discret, pour détacher la créature du fond.
3. **Ombre portée au sol** nette sous chaque créature, pour qu'elle ne flotte pas.
4. **Dégradé de volume** : le dessous de chaque volume est un peu plus sombre que le dessus, à 10 % d'écart au plus. Pas de nouvelle couleur, pas de tête plus pâle que le corps.
5. **Yeux** : garder ceux d'ART 1, en ajoutant seulement un petit reflet blanc s'il n'y en a pas, et en gardant le clignement.

Critère de réussite : sur une capture côte à côte ART 1 / ART 3, Magmadrake doit paraître la même créature, mais plus vivante et plus impressionnante. Si ce n'est pas le cas pour une créature, garder sa version ART 1 et le noter.

## Section 2 : décor épuré de la Prairie

But : un décor simple et lisible qui met les créatures en valeur.

1. **Sol en grands aplats** : 2 à 3 teintes de vert au maximum, posées en grandes zones. Supprimer le damier de petits carrés de verts différents.
2. **Relief en plateaux** : des terrasses nettes, dont les bords montrent des falaises en couches (bandes de terre et de pierre de 2 à 3 teintes).
3. **Arbres** : 2 à 3 volumes francs chacun, en gardant le correctif du vent d'ART 2. Varier les formes pour ne pas copier les arbres de Pokémon Quest.
4. **Fond** : supprimer les gros blocs verts pâles qui flottent au-dessus des arbres. Les remplacer par des îles ou des collines lointaines, en silhouettes, noyées dans une brume légère.
5. **Signature CubiQuest** : l'île est faite des matières des Cubes Scellés. Mettre quelques veines de cristal dans les falaises et quelques blocs de pierre taillée ou de bois brut. Les veines de cristal brillent doucement la nuit.
6. Garder le premier plan dégagé, les touffes d'herbe et de fleurs d'ART 2, et la lisibilité du chemin et des quatre lieux cliquables du camp.

À appliquer au camp et aux niveaux de la Prairie. Les autres biomes ne changent pas dans ce sprint.

## Section 3 : lumière et ambiance

- Brume légère au loin, plus marquée le matin.
- La nuit : les lueurs des créatures, les veines de cristal et les lucioles deviennent la source de lumière principale du décor.
- Vérifier que les attaques ennemies annoncées en rouge hachuré restent parfaitement lisibles, de jour comme de nuit.

## Section 4 : chargeur de modèles .vox

Reprendre la section 6 de SPRINT_ART, coupée faute de temps.

- Le jeu sait charger un fichier `.vox` (format de MagicaVoxel) et l'afficher comme une créature, avec la même échelle, le même éclairage, les mêmes animations et les mêmes lueurs d'élément que les créatures construites par le code.
- Une créature peut avoir un modèle `.vox` facultatif. S'il existe, il remplace le modèle construit par le code ; sinon, le modèle du code reste utilisé.
- Prouver que ça marche avec un petit fichier `.vox` de test généré par un script. Ne remplacer AUCUNE des 9 créatures par un modèle `.vox`.
- Écrire `docs/guide-vox.md` : comment dessiner une créature dans MagicaVoxel (taille conseillée, orientation, couleurs réservées aux lueurs d'élément), où déposer le fichier et comment le voir dans `?gallery=art`.

## Section 5 : rapport et publication

- Vérifier R17 (au doigt, 390 × 844, qualité Basse) sur le camp et un combat de la Prairie.
- Noter les appels de dessin et les triangles en Bas, Moyen et Haut, avant et après.
- Écrire le rapport `docs/rapports/ART3.md` : ce qui a été fait, les captures, les chiffres de performance, ce qui n'a été vu que sur image fixe, et les décisions prises seul (notamment chaque créature gardée en version ART 1 faute d'amélioration nette).
- Lancer `npm run check` et vérifier le golden master.
- Publier sur …/next/ avec `npm run deploy:pages -- --target next`.
- Terminer par un résumé en 5 lignes.

## Hors de ce sprint

- La généralisation aux autres biomes et aux autres créatures : elle viendra après validation par le joueur.
- Le remplacement des créatures par des modèles `.vox` dessinés à la main.
- L'emballage en appli téléphone.

FIN DU SPRINT ART3
