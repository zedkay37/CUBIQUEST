# Sprint STYLES 2 : 20 styles pour Magmadrake — rapport

## 1. Résumé

- `?gallery=styles` passe de 6 à 20 styles (A à T). Les 14 nouveaux, de G à T, prennent chacun un parti net : occlusion, haute définition, hybride, joints, vinyle, pastel, gris + lave, toon clair, nuit volcanique, cristal, facettes, pixel, carton crayonné, aquarelle.
- La page a gagné :
  - le choix libre de deux lettres à comparer ;
  - des favoris avec étoile et un classement, mémorisés dans le navigateur ;
  - un bouton « Copier mon choix » ;
  - un plein écran qui tourne et pivote à la souris ou au doigt.
- Un seul moteur de rendu dessine la grille. Avec 20 cases, il redessine 5 cases par image, à tour de rôle.
- Le jeu n'a pas changé : golden identique, `npm run check` passe. A à F sont inchangés.
- Captures : les 20 styles en « En jeu » (tons neutre, caméra proche), plus une planche unique. Aucun gagnant n'est désigné.

## 2. Tags et retour arrière

Départ : `styles-final` (existe). Branche : `styles-2`. `main` n'a pas bougé.

| Tag | État |
| --- | --- |
| `sauvegarde-avant-styles2` (tag et branche, vérifiés) | `styles-final` |
| `styles2-avant-variantes` | avant la section 1 (fiche commitée) |
| `styles2-avant-page` | avant la section 2 |
| `styles2-avant-rapport` | avant la section 3 |
| `styles2-final` | fin du sprint |

## 3. Ce qui a été fait

### Section 1 : 14 variantes (`src/components/styles/magmaStyles2.ts`)

Toutes partent de la forme d'ART 3 (lue, pas modifiée), à la même échelle que le jeu, avec la même posture, la même ombre au sol et la lave orange.

| | Nom | Comment c'est fait |
| --- | --- | --- |
| G | Occlusion par sommet | Blocs de C en une seule peau. Occlusion « classique » à 4 niveaux par coin (deux côtés et le coin voisin). La lave n'est pas assombrie |
| H | Haute définition propre | Voxelisée à 26 blocs par unité (environ 48 de haut), une seule peau, couleurs unies, aucune ombre de bloc |
| I | Hybride contrôlé | Corps à 8 blocs par unité (gros blocs nets, ombre faible) ; tête, yeux, crête et lave à 18 par unité |
| J | Briques jointées | Peau de C. Dans le shader, chaque face devient une pierre taillée (nuance propre, bord éclairci, joint sombre fin). La lave n'a pas de joint |
| K | Figurine vinyle | Couleurs plus franches, arêtes légèrement adoucies (2 passes de lissage), vernis brillant (vernis transparent, rugosité 0,28) |
| L | Pastel diffus | Couleurs tirées vers le pastel ; lumière du ciel ×2,2 en rose et bleu, soleil ×0,45 ; lumière propre bleutée qui remonte les ombres |
| M | Gris + une couleur | Corps gris clair mat (yeux un peu plus sombres), lave `#FF4A10` qui luit 3 fois plus |
| N | Toon clair | Trois paliers clairs (175 / 220 / 255) ; contour de la couleur foncée de chaque bloc (×0,38), jamais noir |
| O | Nuit volcanique | Roche à 28 % de sa luminosité ; lumière orange au cœur des coulées, halo additif et tache lumineuse au sol ; la lumière de la scène baisse à 25-30 % dans cette case |
| P | Cristal | Coque de cristal fumé, transparente à 42 %, vernie ; un cœur de lave (les blocs à deux pas de la surface ou plus) luit à l'intérieur |
| Q | Polygones facettés | Forme grossière (7 par unité), très lissée (12 passes), dessinée en facettes plates : plus aucun cube |
| R | Pixel 3D | Les blocs de G, dessinés au cinquième de la définition puis agrandis sans lissage ; palette fixe de 16 couleurs (herbe, chemin, pierre, roche, lave, ciel, ardoise, nuit) |
| S | Carton crayonné | Couleurs tirées vers le kraft ; sommets légèrement de travers (déformation fixe) ; traits de crayon qui tremblent, grain du carton, hachures dans les ombres |
| T | Aquarelle | Forme adoucie ; les couleurs bavent (moyenne sur un voisinage déformé), le pigment s'accumule sur les bords, granulation et papier |

Les passes d'image de R, S et T s'appliquent à **toute la case**, décor compris : c'est le style entier qui est montré, pas seulement la créature.

Décisions :

- **T** était trop flou et délavé au premier essai (créature presque invisible en Vitrine). J'ai réduit la bavure et le lavis.
- **R** : au premier essai, le fond gris de la Vitrine tombait sur du brun. J'ai remplacé un bleu nuit de la palette par l'ardoise du fond.
- **Anti-plagiat** : seules des techniques de rendu ont été reprises. Pas de tenons de brique ; les joints de J sont des pierres taillées, sans relief rond.

### Section 2 : la page (`StylesGallery.tsx`, `styles/allStyles.ts`)

- **Grille** : 20 cases (5 colonnes, 4 sur tablette, 2 sur téléphone). Chaque case montre la lettre, le nom, le risque, les appels de dessin et les triangles. La description complète apparaît en comparaison et en plein écran.
- **Fluidité** : un seul rendu WebGL ; on redessine 5 cases par image, à tour de rôle (le tampon d'image est conservé), et tout se redessine quand un réglage change. Chaque case tourne donc à un quart de la fréquence d'image. Je n'ai pas mesuré les images par seconde : le navigateur headless ne sait pas le faire.
- **Vues et interrupteurs** : « Vitrine » et « En jeu », et tous les interrupteurs du sprint STYLES sont gardés (tons, saturation, anticrénelage, caméra, jour/nuit).
- **Comparer deux styles** : on choisit la gauche et la droite parmi A à T.
- **Favoris** : ☆ sur chaque case. « Mon classement » liste les étoiles dans l'ordre, avec ↑ ↓ ✕. « Copier mon choix » copie par exemple « Favoris : C, G, O — tons neutre, caméra proche, vue en jeu ». Les favoris sont gardés dans le navigateur (clé passée par `withSaveSlot`).
- **Plein écran** (⤢) : la créature tourne lentement, et on la fait pivoter en glissant (souris ou doigt).
- Boutons de 44 px. Paramètres d'URL pour les captures : `&compare=C,O`, `&focus=O`, plus ceux de STYLES.

## 4. Coût de chaque variante

Appels de dessin / triangles, relevés sur les captures. Les compteurs incluent la passe d'ombre ; R, S et T ajoutent une passe d'image (1 appel).

| | Vitrine (créature seule) | En jeu (décor, caméra proche) |
| --- | --- | --- |
| A Étalon | 18 / 8 152 | 38 / 44 532 |
| B Gros blocs | 31 / 380 | 51 / 36 760 |
| C Voxel moyen | 17 / 6 000 | 37 / 42 380 |
| D Biseauté | 5 / 420 020 | 25 / 456 400 |
| E Sculpté lisse | 3 / 7 908 | 23 / 44 288 |
| F Toon | 4 / 8 684 | 24 / 45 064 |
| G Occlusion | 3 / 5 796 | 23 / 42 176 |
| H Haute déf. | 3 / 27 852 | 23 / 64 232 |
| I Hybride | 18 / 6 408 | 38 / 42 788 |
| J Briques | 3 / 5 796 | 23 / 42 176 |
| K Vinyle | 3 / 5 796 | 23 / 42 176 |
| L Pastel | 3 / 5 796 | 23 / 42 176 |
| M Gris + lave | 3 / 5 796 | 23 / 42 176 |
| N Toon clair | 4 / 8 684 | 24 / 45 064 |
| O Nuit volcanique | 5 / 5 830 | 25 / 42 210 |
| P Cristal | 4 / 5 708 | 24 / 42 088 |
| Q Facettes | 3 / 1 764 | 23 / 38 144 |
| R Pixel 3D | 4 / 5 798 | 24 / 42 178 |
| S Carton crayonné | 4 / 5 798 | 24 / 42 178 |
| T Aquarelle | 4 / 5 798 | 24 / 42 178 |

Ce que les chiffres ne montrent pas :

- **Passes d'image (R, S, T)** : elles coûtent des pixels, pas des triangles. T lit 25 points de l'image par pixel, S 9 points.
- **P** (transparence avec vernis) et **K** (vernis) ont une matière plus chère.
- **O** ajoute une lumière ponctuelle : ailleurs dans le jeu, cela forcerait un autre programme d'ombrage.
- **H** coûte environ 4,7 fois les triangles de G pour la même créature.

## 5. Vu seulement sur image fixe (à juger en vrai)

- Toutes les variantes : Edge headless n'anime pas, chaque capture est prise à un seul angle.
- Le tremblement du crayon (S) et la bavure (T) en mouvement : ils sont figés dans l'image, ils ne « grouillent » pas.
- Le rendu de P (transparence) quand la créature tourne : l'ordre des faces transparentes peut faire des artefacts selon l'angle.
- La fluidité de la grille de 20 cases sur un PC ordinaire et sur un téléphone ; le pivot au doigt en plein écran ; le presse-papiers (« Copier mon choix ») dans un vrai navigateur.

## 6. Captures (`docs/captures/styles2/`)

- `s2-A-bureau.png` à `s2-T-bureau.png` : chaque style en plein écran, vue « En jeu », tons neutre, caméra proche.
- `planche-20-styles.png` : les 20 réunies (5 × 4), assemblées par `tools/planche.ps1`.
- `s2-grille-jeu-grand.png` (réglages de la fiche) et `s2-grille-vitrine-grand.png` : la grille entière.
- `s2-comparer-bureau.png` : la comparaison C et O.

## 7. Valeurs de jeu modifiées

Aucune. Golden identique (840 combats), `npm run texts` = 0 (nouveaux fichiers d'outil ajoutés à la liste de `tools/texts.ts`), `npm run lexique` = 0.

## Restart handle

- Changé :
  - `src/components/styles/magmaStyles2.ts` et `allStyles.ts` (nouveaux) ;
  - `magmaStyles.ts` : outils rendus publics, champs facultatifs `before`, `after` et `post` ; A à F inchangés ;
  - `StylesGallery.tsx` (réécrite) ;
  - `tools/texts.ts`, `tools/captures.ps1`, `tools/planche.ps1` (nouveau) ;
  - `CLAUDE.md`.
- Non vérifié : la section 5.
- Retour en arrière : `styles2-avant-*` ou `sauvegarde-avant-styles2`.
- Ne pas toucher : `main`, le golden, et les réglages de rendu du jeu.
- Prochaine étape sûre : le joueur étoile ses favoris sur `…/next/?gallery=styles`, les classe, puis colle « Copier mon choix » dans le chat.
