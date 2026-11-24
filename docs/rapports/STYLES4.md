# STYLES4 — la page des styles sur nos vrais modèles .vox — compte rendu

Branche `styles-4`, partie de `bestiaire` (tag `bestiaire-harmonisation`, celle qui contient les .vox les plus récents). Sauvegarde : tag `sauvegarde-avant-styles4`. `main`, le jeu et les `.vox` n'ont pas été touchés.

Lien : https://zedkay37.github.io/CUBIQUEST/next/?gallery=styles

## Ce qui a été fait

- **Créatures** :
  - les 4 de ta préférence, toutes lues dans leur `.vox` : Calcinarque légendaire (le `.vox` de référence validé le 23/11), Amanitox, Crabastion et Braizard ;
  - les anciens Magmadrake et Calcinarque construits par le code restent en fin de liste.
- **Styles** :
  - filtre par défaut « Présélection » : A, D, E, F, H, I ;
  - « Tous » montre les vingt.
- **Nuit volcanique** (l'ancien O) est maintenant un interrupteur d'éclairage, applicable à n'importe quel style. La scène s'assombrit et la lueur de chaque créature devient une source de lumière : lumière, halo et reflet au sol, dans la couleur de sa lueur.
  - O reste dans « Tous » comme style.
- **Planche 4 × 6** (bouton, ou `&planche=1`) : une ligne par créature, une colonne par style.
  - En vue Vitrine, chaque ligne est cadrée sur sa créature.
  - Les vues face, profil, silhouette, les favoris et « Copier mon choix » sont gardés. Sur la planche, les boutons ★ des cases sont cachés pour la lisibilité ; ils restent dans la grille normale.
- **Captures** (`docs/captures/styles4/`) : `planche-vitrine.png`, `planche-en-jeu.png`, `planche-vitrine-nuit-volcanique.png`, `planche-en-jeu-nuit-volcanique.png`.
  - Essais et grilles « Tous » des 4 créatures : `essais/`.

## Styles qui cassent sur les .vox

- **B (gros blocs)** : cassé. Il dessine 15 volumes faits à la main pour l'ancien Magmadrake ; sur un `.vox`, il montre une silhouette de Magmadrake dans les couleurs de la créature.
- **R (pixel 3D)** : dégradé. À 7 blocs par unité, les parties fines (pattes, pinces) se détachent en pixels isolés.
- **Tous les autres s'appliquent correctement**, couleurs exactes du `.vox` comprises. L et M changent les couleurs, mais c'est voulu (pastel, gris + une couleur).

## Mesures

Mesures prises dans Edge sans interface, avec la carte graphique de la machine de développement et la synchronisation verticale coupée.
- Images par seconde : six créatures à l'écran (les 4 + 2), vue du combat, 12 s mesurées.
- « 5 % plus lentes » : images par seconde des 5 % d'images les plus lentes.

| Style | Triangles par créature (Calcinarque / Amanitox / Crabastion / Braizard) | Triangles, 6 créatures | Images/s | 5 % plus lentes |
|---|---|---|---|---|
| A étalon | 14 608 / 9 548 / 9 336 / 6 308 | 101 016 | 895 | 588 |
| **D biseauté** | **768 020 / 514 820 / 477 620 / 306 020** | **3 386 380** | **237** | à-coups |
| E sculpté lisse | 14 316 / 9 300 / 9 428 / 6 100 | 99 820 | 959 | 588 |
| F toon | 14 612 / 9 728 / 10 328 / 5 948 | 102 016 | 848 | 556 |
| H haute définition | 49 428 / 32 156 / 33 108 / 20 196 | 253 532 | 716 | 588 |
| I hybride | 6 564 / 4 812 / 4 296 / 2 496 | 66 604 | 646 | 417 |
| B | 380 (cassé) | 39 340 | 786 | 500 |
| C | 10 008 / 6 640 / 6 812 / 4 072 | 81 240 | 1 025 | 667 |
| G, J, K, L, M, R, S, T | 9 748 / 6 492 / 6 892 / 3 972 | 80 404 | 739 à 819 | 435 à 526 |
| N | 14 612 / 9 728 / 10 328 / 5 948 | 102 016 | 748 | 455 |
| O | 9 782 / 6 526 / 6 926 / 4 006 | 80 608 | 579 | 526 |
| P | 8 788 / 7 384 / 5 912 / 2 972 | 78 288 | 740 | 476 |
| Q | 3 332 / 2 124 / 2 108 / 1 452 | 51 532 | 813 | 526 |

Données brutes : `docs/captures/styles4/mesures-brutes.json`. Outil : `node tools/styles-banc.mjs <site construit>`.

**Trop lourd pour un jeu web : D (voxel biseauté)**.
- Il compte 300 000 à 770 000 triangles par créature, et 3,4 millions avec six créatures : 30 fois l'étalon.
- C'est le seul style qui chute nettement, avec des à-coups, même sur cette machine. Sur un portable ou un téléphone, il serait injouable tel quel.
- La cause : chaque bloc est une petite boîte arrondie complète. Il faudrait le refaire autrement pour le garder.

H est 2,5 fois plus lourd que l'étalon (250 000 triangles pour six créatures) : acceptable sur ordinateur, à surveiller sur téléphone. Les autres restent proches de l'étalon.

## Pas pu être vérifié

- **Les images par seconde sur une vraie machine de joueur**, surtout un téléphone. Celles du tableau viennent d'Edge sans interface sur la machine de développement ; elles servent à comparer les styles entre eux, pas à prédire le jeu. Le banc est dans la page : `?gallery=styles&banc=D` (le résultat s'affiche en haut).
- **Le rendu des vues de profil et de silhouette**, regardé seulement sur quelques cases (les captures demandées sont de face).
- **Le jugement esthétique** : c'est à toi de choisir.
