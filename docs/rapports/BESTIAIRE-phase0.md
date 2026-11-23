# BESTIAIRE — phase 0 (inventaire, outillage, mesures) — rapport

Aucune créature n'a été sculptée. Le jeu n'a pas changé : pas de fichier dans `src/assets/vox/`, chargeur `.vox` intact, golden identique.

## Pour revenir en arrière

- Tag `sauvegarde-avant-bestiaire` : l'état `styles3-final`, avant ce sprint. Poussé et vérifié.
- Tag `bestiaire-phase0` : la fin de cette session.
- Branche de travail : `bestiaire`. `main` n'a pas bougé.

## 1. Ce qui a été fait

- **Premier commit** : la fiche `SPRINT_BESTIAIRE.md` et `tools/vox-studio/` (le dossier `out/` est ignoré).
- **Inventaire** dans `docs/plan/BESTIAIRE.md` : 38 créatures, 14 lignées, 6 éléments, des lots et des langues de matière proposés.
- **Outillage** (choix et justification ci-dessous) :
  - `npm run vox:build` : construit les créatures ;
  - `npm run vox:check` : contrôle les fichiers ;
  - `npm run vox:planche` : fabrique les planches, rendues par le vrai jeu ;
  - une page d'outil `?gallery=planche` (planche d'une créature, ou alignement d'un lot) ;
  - un test automatique.
- **Mesures** et **captures du vrai jeu** : le Calcinarque légendaire en combat, au camp de jour et de nuit, avec le modèle actuel à côté.

## 2. Choix de l'outillage (§3.2)

**TypeScript, pas Python.** Python n'est pas installé sur ce PC, et le dépôt tourne déjà sous Node. J'ai porté `voxlib.py` en TypeScript, et le portage redonne **exactement le même fichier** `calcinarque-legendaire.vox` que ton script Python, octet pour octet (vérifié, et un test le revérifie à chaque `npm run check`).

Les planches sont **rendues par le vrai jeu** (constructeur, matières et lumière des portraits du jeu, photographiés par Edge sans interface), pas par le lancer de rayons de `voxlib`.

## 3. Les 6 questions techniques

**1. Animation des 4 pattes — vérifié par le calcul, à revoir en mouvement.**
- Le chargeur ne connaît qu'une patte gauche (250–252) et une patte droite (253–255). Les pattes avant et arrière d'un même côté forment **une seule pièce**, qui pivote autour d'un point unique au milieu du corps.
- Calculé sur le Calcinarque légendaire, au pas le plus grand : le pied avant s'enfonce de **3,7 blocs sous le sol** pendant que le pied arrière se soulève de **5,5 blocs**. C'est laid.
- **Plus petite correction proposée** (environ 15 lignes dans `voxFile.ts`) : couper chaque côté en patte avant et patte arrière (selon la position avant/arrière), dans l'ordre qui donne un trot en diagonale. Chaque patte pivoterait alors sur son épaule : le pied avant se lèverait d'environ 1 bloc et avancerait d'environ 4. Les créatures du code ne changent pas.
- Non fait : il faut ton accord pour toucher au chargeur.

**2. Clignement des yeux — vérifié dans le code et par les captures.**
- Les yeux (248) sont bien trouvés : 8 blocs, 4 de chaque côté, à 4 blocs derrière le bout du museau.
- Le clignement écrase l'œil sur place (ça ne dépend pas de la profondeur), et le crâne derrière apparaît comme une paupière.
- Non vu en mouvement (les captures sont fixes).

**3. Échelle — vérifié.**
- Un bloc de fichier vaut 1/14 d'unité, multiplié par l'échelle de l'espèce : c'est **la même taille de bloc** que les modèles du code en qualité haute (en qualité basse, les modèles du code ont des blocs plus gros).
- **Aucune normalisation de hauteur** : un fichier de 27 blocs de haut à la place de Magmadrake fait 3,37 unités, contre 3,12 pour le Magmadrake actuel.
- La taille finale dépend donc de l'espèce remplacée : un boss est dessiné 1,48 fois plus grand, un ennemi 0,96 fois.

**4. Variantes de couleur — vérifié dans le code.**
- Le jeu s'en sert : la variante d'une lignée se débloque avec les doublons du Cube Scellé et s'active dans l'écran d'équipe.
- Pour les modèles du code, c'est une rotation de teinte de 150°. Les `.vox` l'ignorent aujourd'hui.
- **Solution proposée** : appliquer la même rotation de teinte aux couleurs du `.vox` au chargement (environ 5 lignes, aucun fichier en plus). Non fait sans ton accord.

**5. Performance — mesuré.**
- **Coût d'un modèle** (calcul exact) :
  - le Calcinarque légendaire coûte **7 532 triangles**, contre 4 264 pour le Magmadrake du code en qualité haute et 1 676 en qualité basse ;
  - le chargeur ne garde que les faces visibles, mais **ne fusionne pas** les faces voisines de même couleur ;
  - 6 créatures de ce gabarit (le combat le plus chargé) feraient environ 45 000 triangles de créatures.
- **Images par seconde** (Edge sans interface sur ce PC, carte graphique, combat du Cratère volcano-2, escouade Magmadrake + Ignisaur + Granitox, 30 s, 3 mesures) :

| | qualité haute | qualité basse |
|---|---|---|
| modèle du code | 60 i/s (5 % les plus lents : 59), 94 000 triangles | 60 i/s (52 à 59), 17 400 triangles |
| Calcinarque légendaire à la place de Magmadrake | 60 i/s (59), 114 600 triangles (+22 %) | 59 i/s (48), 29 100 triangles (+67 %), une seule mesure |

- L'écran est plafonné à 60 images par seconde : sur ce PC, **aucune baisse visible**. Ce n'est pas une preuve pour un téléphone.
- **En qualité basse, les `.vox` ne sont pas simplifiés** : un seul légendaire coûte 4,5 fois le modèle du code simplifié. Avec un bestiaire entier en `.vox`, la qualité basse perdrait une bonne partie de son allègement.
- Proposition : en qualité basse, fusionner les faces de même couleur au chargement, ou réduire le modèle de moitié. À décider en porte 0.

**6. Lueurs — vérifié sur captures, de jour et de nuit (au camp).**
- La lave fait **5,6 %** de la surface du Calcinarque légendaire, dans la cible du stade final (5 à 9 %).
- De jour, les fissures se lisent sans dominer. De nuit, elles deviennent la source de lumière de la créature, comme prévu.
- La lueur du jeu est plus discrète que l'aperçu Python (pas de halo autour de la lave).
- Je propose de plafonner la lave à **9 % de la surface** (10 % pour les boss) dans `vox:check`.

## 4. Taille réelle en combat — vérifié, et différent de la fiche

La fiche parle de « taille combat ~64 px ». Dans le vrai jeu (1280 × 720, caméra de combat), une forme finale à la place de Magmadrake fait environ **130 à 140 pixels de haut**, et une forme de base environ 60 à 70. Les planches montrent donc un recadrage de la vraie image de combat, et non une réduction à 64 px.

## 5. Planches et captures (rendu du vrai jeu)

- `docs/captures/bestiaire/planche-calcinarque-legendaire-en-magmadrake-grand.png` : le légendaire rendu par le jeu (4 vues, taille réelle en combat, silhouette).
- `docs/captures/bestiaire/planche-magmadrake-grand.png` : le Magmadrake actuel, même planche.
- `docs/captures/bestiaire/alignement-feu-grand.png` : les 5 créatures de feu actuelles, à l'échelle, de profil et en silhouette.
- `docs/captures/bestiaire/phase0/b0-combat-vox-bureau.png` et `b0-combat-code-bureau.png` : le combat avec et sans le légendaire, à côté des modèles actuels (Ignisaur, Granitox). Versions `-bas` pour la qualité basse.
- `docs/captures/bestiaire/phase0/b0-camp-jour-bureau.png` et `b0-camp-nuit-bureau.png` : le légendaire au camp, de jour et de nuit. **Essai seulement** : il remplace Pyrocube le temps de la capture, d'où sa taille plus petite.

Pour ces captures, le fichier a été copié dans `src/assets/vox/` puis retiré : rien n'est resté dans le jeu.

## 6. Vérifié / supposé / à vérifier

- **Vérifié** :
  - le portage octet pour octet ;
  - `vox:check` (la référence passe, les fichiers abîmés sont refusés ; Ailebraise échoue, avec 31 blocs de haut) ;
  - l'échelle, les yeux, le coût en triangles, les images par seconde sur ce PC ;
  - les captures du jeu, de jour et de nuit.
- **Supposé** :
  - que les pattes d'un même côté qui bougent ensemble soient laides en mouvement (calculé, pas vu) ;
  - qu'un téléphone souffrirait en qualité basse avec un bestiaire entier en `.vox` (pas mesuré sur téléphone).
- **À vérifier** :
  - la démarche en mouvement ;
  - le clignement en mouvement ;
  - les images par seconde sur ton téléphone ;
  - le rendu des variantes de couleur.

## 7. Questions pour toi (porte 0)

1. **Quelle lignée du jeu devient « Calcinarque » ?** Calcinarque n'existe pas dans le jeu. Je propose **Braizard → Cendrox** (feu, quadrupède, deux stades) : le Coureur de Cendres deviendrait Braizard, et le Calcinarque légendaire deviendrait Cendrox. Les noms et les règles du jeu ne changent pas.
2. **Lot 1** : Braizard → Cendrox plus Aquabloc → Corallix → Abyssocube (eau, carapace, trio de départ). D'accord ?
3. **Pattes** : j'applique la correction avant/arrière du chargeur (question 1) avant le lot 1 ?
4. **Qualité basse** : fusion des faces au chargement (même image, moins de triangles), ou modèle réduit de moitié ?
5. **Variantes de couleur** : rotation de teinte au chargement, comme pour les modèles actuels ?
6. **Gradation par stade** (§4.2 de la fiche) et **langues de matière** (`BESTIAIRE.md`) : tu valides, ou tu corriges ? En particulier : la roche garde-t-elle une lueur ambre, proche de la lave du feu ?
7. **Taille en combat** : on garde la caméra actuelle (forme finale ≈ 130 px de haut), ou on teste la caméra plus proche du sprint STYLES ?
