# Sprint STYLES 3 : un légendaire agressif comme deuxième référence — rapport

## 1. Résumé

- **Calcinarque** (nom de travail) est créé : bête de basalte quadrupède en posture de charge.
  - Petite tête basse (environ 24 % de la hauteur), mâchoire lourde sur une gueule de lave, crocs et défenses.
  - Cornes d'obsidienne en lances, dont une ébréchée ; yeux fendus.
  - Crête de cristaux de magma décroissante, éperons, griffes noires, queue à masse de lave fissurée.
  - Pas d'ailes, rien de rond. Environ 1,6 fois la hauteur de Magmadrake, deux fois plus long que haut.
- Calcinarque existe dans les 20 styles A à T. Ce sont les mêmes styles que pour Magmadrake, avec une finesse relative adaptée à sa taille.
- La page `?gallery=styles` a maintenant :
  - un sélecteur Magmadrake / Calcinarque et une comparaison croisée ;
  - des favoris séparés par créature, avec « Copier mon choix » qui indique les deux ;
  - la vraie taille en vue « En jeu » ;
  - des boutons Vue de face, Profil et Silhouettes ;
  - une grille qui s'adapte à la largeur (correctif du débordement).
- Le jeu n'a pas changé : Calcinarque n'est ni dans le catalogue, ni dans l'Atelier, ni dans les combats. Golden identique et `npm run check` passe.
- Captures : les 20 styles de face et de profil (tons neutre, vitrine), deux planches, et la silhouette de profil à côté de Magmadrake. La page est publiée sur …/next/?gallery=styles. Aucun gagnant n'est désigné.

## 2. Tags et retour arrière

Départ : `styles2-final` (existe). Branche : `styles-3`. `main` n'a pas bougé.

| Tag | État |
| --- | --- |
| `sauvegarde-avant-styles3` (tag et branche, vérifiés) | `styles2-final` |
| `styles3-avant-calcinarque` | avant la section 1 (fiche commitée) |
| `styles3-avant-vingt-styles` | avant la section 2 |
| `styles3-avant-page` | avant la section 3 |
| `styles3-avant-rapport` | avant la section 4 |
| `styles3-final` | fin du sprint |

## 3. Ce qui a été fait

### Section 1 : Calcinarque (`src/components/styles/calcinarque.ts`)

- **Formes.** Les volumes du constructeur du jeu sont alignés sur les axes. Calcinarque a donc ses propres formes : la boîte, le « coin » (boîte dont le haut et la largeur varient le long du corps, pour le dos en pente et le museau) et la pointe orientée (cornes, crocs, griffes, crête, éperons). Elles produisent des blocs ordinaires, lus par tous les styles. `voxelSculpt.ts` (le jeu) n'est pas modifié.
- **Posture.**
  - Épaules à 2,2, arrière-train à 1,4.
  - Cou et tête projetés vers l'avant et vers le bas (sommet du crâne à 1,6, sous la ligne des épaules).
  - Pattes avant plus épaisses et plus hautes que les arrière.
- **Mesures** (à 9 blocs par unité) :
  - hauteur 2,89 contre 1,79 pour Magmadrake, soit ×1,61 ;
  - longueur 5,67, soit environ deux fois la hauteur ;
  - tête d'environ 0,7 de haut, soit environ 24 % de la hauteur.
- **Palette** : basalte `#2A2321`, gris-brun `#5A4B42`, obsidienne `#0D0B10`, lave `#FF6410`. Les yeux sont en lave jaune `#FFC21F`. Ce sont les quatre familles de la fiche.
- **Surface.**
  - Plaques de basalte en saillie, irrégulières et pas symétriques.
  - Fissures de lave sur les flancs.
  - Une cicatrice plus claire sur l'épaule gauche, et la corne droite ébréchée (asymétrie voulue).
- **Anti-enfantin et anti-plagiat** :
  - pas d'ailes, et pas de flamme au bout de la queue (c'est une masse de lave refroidie) ;
  - silhouette en pente vers l'avant, hérissée de pointes ;
  - en cas de doute, j'ai poussé vers la « bête de basalte ».
- **Décision : premier essai trop sage.** Les cornes se voyaient mal et la tête était peu menaçante. J'ai épaissi et allongé les cornes, avancé la mâchoire avec deux défenses montantes, et ajouté des éperons d'obsidienne aux épaules et aux coudes.
- **Animation de repos** :
  - la respiration (le corps gonfle de 1,4 %) et la pulsation de la lave sont appliquées par la page, à tous les styles ;
  - la queue balance seulement dans le style A, le seul où la queue est une pièce séparée.

### Section 2 : Calcinarque dans les 20 styles

- **Réglage par créature.** Les styles lisent maintenant « la créature courante » (`styles/subject.ts`) : ses blocs, sa palette, sa finesse, sa lueur. Magmadrake garde exactement ses valeurs : finesse ×1. Les 20 variantes de Magmadrake sont donc les mêmes qu'avant.
- **Finesse relative** : pour Calcinarque, chaque style utilise ×1/1,6 blocs par unité. Exemples : A à 9 au lieu de 14, C à 8 au lieu de 12, H à 16 au lieu de 26. Chaque style garde le même nombre de blocs sur la hauteur de la créature.
- **Styles adaptés à Calcinarque** :
  - A est sa construction de base, comme ART 3 : même constructeur, ajouts de rendu, ombre nette ;
  - B a ses 15 volumes propres ;
  - pour I, sa tête forme un groupe, ce qui lui donne les détails fins.
- Les 40 variantes se construisent sans erreur (vérifié hors navigateur, puis à l'écran).

### Section 3 : la page

- **Créature** : un sélecteur Magmadrake / Calcinarque. Vitrine, en jeu, interrupteurs, favoris et plein écran marchent pour les deux.
- **Comparaison croisée** : pour chaque côté, on choisit la créature puis la lettre (par exemple « Magmadrake C / Calcinarque O »).
- **Favoris** : mémorisés séparément pour chaque créature (Magmadrake garde sa clé d'avant). « Mon classement » montre les deux listes, et « Copier mon choix » donne par exemple « Favoris — Magmadrake : C, G ; Calcinarque : A, O — tons neutre, caméra proche, vue en jeu ».
- **Taille** :
  - en jeu, chaque créature est à sa vraie taille (même caméra) ;
  - en vitrine, le cadrage suit la plus grande créature affichée, pour que les tailles restent comparables dans une comparaison.
- **Correctif du débordement** :
  - la toile ne fixait plus sa largeur en pixels, ce qui la faisait déborder quand la fenêtre rétrécissait ou était zoomée ;
  - le nombre de colonnes dépend maintenant de la largeur (une case fait au moins 230 px, de 1 à 5 colonnes), suivie par un observateur de taille ;
  - la page entière ne défile plus à l'horizontale.
  - Vérifié en 390 × 844 : une colonne, rien de coupé.
- **Angles** :
  - « Vue de face » arrête la rotation, face à la caméra ; « Reprendre la rotation » la relance ;
  - « Profil » met les créatures de côté ;
  - « Silhouettes » dessine tout en noir sur fond blanc.

## 4. Coût de chaque style pour Calcinarque

Appels de dessin / triangles, relevés sur les captures en grille (passe d'ombre comprise).

| Style | Vitrine | En jeu (tons neutre) |
| --- | --- | --- |
| A Étalon | 12 / 11 904 | 32 / 48 284 |
| B Gros blocs | 31 / 380 | 51 / 36 760 |
| C Voxel moyen | 10 / 8 832 | 30 / 45 212 |
| D Biseauté | 5 / 844 220 | 25 / 880 600 |
| E Sculpté lisse | 3 / 12 412 | 23 / 48 792 |
| F Toon | 4 / 13 808 | 24 / 50 188 |
| G Occlusion | 3 / 9 212 | 23 / 45 592 |
| H Haute déf. | 3 / 39 916 | 23 / 76 296 |
| I Hybride | 12 / 7 008 | 32 / 43 388 |
| J Briques | 3 / 9 212 | 23 / 45 592 |
| K Vinyle | 3 / 9 212 | 23 / 45 592 |
| L Pastel | 3 / 9 212 | 23 / 45 592 |
| M Gris + lave | 3 / 9 212 | 23 / 45 592 |
| N Toon clair | 4 / 13 808 | 24 / 50 188 |
| O Nuit volcanique | 5 / 9 246 | 25 / 45 626 |
| P Cristal | 4 / 9 232 | 24 / 45 612 |
| Q Facettes | 3 / 2 284 | 23 / 38 664 |
| R Pixel 3D | 4 / 9 214 | 24 / 45 594 |
| S Carton crayonné | 4 / 9 214 | 24 / 45 594 |
| T Aquarelle | 4 / 9 214 | 24 / 45 594 |

- Calcinarque coûte environ 1,5 fois les triangles de Magmadrake dans la plupart des styles : sa surface est plus grande, pour le même nombre de blocs sur la hauteur.
- D reste hors norme (environ 840 000 triangles).
- R, S et T ajoutent un coût en pixels (passe d'image), pas en triangles.

## 5. Vu seulement sur image fixe (à juger en vrai)

- **Si Calcinarque fait vraiment peur** et ne rappelle aucune créature connue. De profil, la rangée de pointes sur le dos peut évoquer un dinosaure à plaques ; la tête basse, les cornes en lances et la gueule de lave l'en éloignent, à mon avis.
- **Les animations** : respiration, lave qui pulse, queue qui balance (A seulement). Edge headless ne les joue pas.
- **De face**, les cornes pointent vers la caméra et se voient surtout en bout. Le trois-quarts (rotation ou plein écran) les montre mieux.
- La fluidité de la grille avec deux créatures, et le pivot au doigt.

## 6. Captures (`docs/captures/styles3/`)

- `c3-face-A-bureau.png` à `c3-face-T-bureau.png` et `c3-profil-A` à `c3-profil-T` : chaque style en plein écran, vitrine, tons neutre.
- `planche-face.png` et `planche-profil.png` : les 20 réunies.
- `c3-silhouettes-grand.png` : silhouettes noires de profil, Magmadrake A et Calcinarque A, à la même échelle.
- `c3-grille-vitrine` et `c3-grille-jeu` (formats `grand` et `telephone`), et `c3-comparer-jeu-bureau.png` (Magmadrake C / Calcinarque C, en jeu).

## 7. Valeurs de jeu modifiées

Aucune. Golden identique (840 combats), `npm run texts` = 0, `npm run lexique` = 0.

## Restart handle

- Changé :
  - `styles/calcinarque.ts`, `styles/subject.ts` (nouveaux) ;
  - `magmaStyles.ts` et `magmaStyles2.ts` (lisent la créature courante ; Magmadrake inchangé) ;
  - `allStyles.ts`, `StylesGallery.tsx` ;
  - `tools/texts.ts`, `tools/captures.ps1` ;
  - `CLAUDE.md`.
- Non vérifié : la section 5.
- Retour en arrière : `styles3-avant-*` ou `sauvegarde-avant-styles3`.
- Ne pas toucher : `main`, le golden. Calcinarque hors du jeu tant que le joueur ne l'a pas validé.
- Prochaine étape sûre : le joueur compare les deux créatures sur `…/next/?gallery=styles`, étoile ses favoris pour chacune et colle « Copier mon choix ».
