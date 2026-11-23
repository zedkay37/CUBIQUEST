# BESTIAIRE — lot 1 (pilote) — rapport

Lot 1 : Braizard → Cendrox (feu) et Aquabloc → Corallix → Abyssocube (eau). Les cinq créatures sont maintenant des `.vox` sculptés dans le jeu, en combat comme au camp.

## Pour revenir en arrière

- Tag `bestiaire-lot1` : fin de ce lot.
- Tag `bestiaire-phase0` : avant ce lot (aucune créature en `.vox`, chargeur d'origine).
- Tag `sauvegarde-avant-bestiaire` : avant tout le sprint.
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox` ; le jeu reprend son modèle construit par le code.

`main` n'a pas bougé. Le lot 2 n'est pas commencé.

## 1. Ce qui a été fait

**Documents** (commit à part)
- Fiche corrigée : la taille réelle en combat est de 130 à 140 pixels pour une forme finale (60 à 70 pour une forme de base), et non 64. Le test des silhouettes se fait à cette taille.
- `BESTIAIRE.md` : tes décisions de la porte 0, les signatures du lot 1, et la roche en **cristal froid** (blanc bleuté). J'ai préféré le cristal au jade : un vert serait trop proche du turquoise de l'eau et du vert de la plante.
- Magmadrake est de la **roche** dans le jeu, pas du feu. Son plan de corps prévu (colosse voûté) est déjà distinct de Cendrox (quadrupède prédateur).

**Chargeur `.vox`** (trois commits à part, chacun mesuré)

1. **Pattes avant et arrière séparées, trot en diagonale.**
   - Le chargeur coupe chaque côté là où un vide sépare la patte avant de la patte arrière.
   - L'avant gauche avance avec l'arrière droite, puis l'inverse.
   - Captures avant/après : `docs/captures/bestiaire/lot1/pattes-avant/` et `pattes-apres/`, avec la vue « marche » en bas à droite de chaque planche. Les pieds ne s'enfoncent plus dans le sol.
   - **Modèles du code inchangés** : les planches de Pyrocube et Bourgéoliath sont identiques au pixel près avant et après (0 pixel différent sur 1,5 million). Un test le vérifie aussi.
2. **Fusion des faces en qualité basse.**
   - En qualité haute, même la fusion « exacte » (faces de même couleur et de même ombre de coin) changeait encore 46 pixels d'arête sur 1,5 million. Comme tu l'as demandé dans ce cas, **la fusion ne sert qu'en qualité basse**. En qualité haute, rien ne change.
   - En basse, la fusion abandonne l'ombre des coins sur les faces fusionnées : 3,5 % des pixels de la planche changent. On le voit à peine : les coins sont un peu moins sombres (`docs/captures/bestiaire/lot1/fusion/`).
   - Calcinarque légendaire : 7 532 triangles devient 3 900 en qualité basse. Les modèles du code ne sont jamais fusionnés.
3. **Variantes de couleur.**
   - Même rotation de teinte que les modèles du code, **seulement sur le corps (1–239) et les pattes**. La lueur (240–247) et les yeux (248–249) gardent la couleur de l'élément.
   - Capture : `docs/captures/bestiaire/lot1/variante/variante-cendrox-grand.png` (Cendrox vert-de-gris, lave toujours orange). Testé.

**Créatures** (scripts dans `tools/vox-studio/species/`, fichiers dans `src/assets/vox/`)

| Créature | Stade | Taille (X×Y×Z) | Lueur en surface | Cible | Triangles (haute / basse) | Essais |
|---|---|---|---|---|---|---|
| Braizard | 1 | 14×28×17 | 2,6 % | 2–4 % | 3 256 / 1 510 | 3 |
| Cendrox | final | 20×34×27 | 5,6 % | 5–9 % | 7 532 / 3 900 | 0 (référence reprise telle quelle) |
| Aquabloc | 1 | 16×20×17 | 2,5 % | 2–4 % | 3 156 / 1 514 | 3 |
| Corallix | 2 | 16×26×21 | 4,4 % | 4–6 % | 4 640 / 2 248 | 3 |
| Abyssocube | final | 20×31×27 | 6,3 % | 5–9 % | 6 620 / 3 228 | 3 |

- **Braizard** : le Coureur de Cendres adouci.
  - Plus court et plus rond.
  - Tête relevée à hauteur d'épaule, et plus grande : 35 % de la hauteur.
  - Yeux jaunes 2×2 sous une arcade, petits crocs, cornes d'os naissantes.
  - Fente de lave dans la gueule et courte ligne dorsale : la signature en petit.
- **Cendrox** : le Calcinarque légendaire de référence, identique octet pour octet.
- **Aquabloc → Abyssocube : « bœuf de récif ».**
  - Quadrupède trapu à carapace de récif en bandes.
  - Tête basse sous un bouclier de nacre qui surplombe les yeux.
  - Pattes en piliers, queue courte à arêtes. Ce n'est pas une tortue : pas d'écailles hexagonales, tête non rétractable, épaules en bosse.
  - La signature grandit : bourgeon de corail et un joint lumineux, puis branches de corail et bord de carapace lumineux, puis flèches de corail, veines et gorge lumineuses des abysses.

Les deux lignées ont des plans de corps nettement différents : prédateur fin et allongé contre bœuf massif. On le voit sur l'alignement en silhouettes : `docs/captures/bestiaire/lot1/alignement-lot1-grand.png`.

`vox:check` est vert sur les 5 fichiers. Un test vérifie que les fichiers du dépôt sont exactement ceux des scripts (`vox:build` déterministe). `npm run check` passe et le golden est identique.

## 2. Planches (rendu du vrai jeu)

- Une par créature : `docs/captures/bestiaire/lot1/planche-<identifiant>-grand.png`. Elle montre :
  - 4 vues ;
  - la marche ;
  - la taille réelle en combat ;
  - la silhouette.
- Alignement du lot : `docs/captures/bestiaire/lot1/alignement-lot1-grand.png`, avec le profil en couleur et les silhouettes à la vraie taille du combat (42 pixels par unité).
- Combat dans le jeu (Trône des Marées, shore-3, escouade Braizard + Cendrox + Aquabloc contre Corallix et Abyssocube), dans `docs/captures/bestiaire/lot1/jeu/` :
  - `combat-lot1-bureau.png` : caméra actuelle ;
  - `combat-lot1-proche-bureau.png` : **caméra proche**, à comparer. C'est un réglage d'outil `?cam=proche` ; le jeu garde sa caméra ;
  - `combat-lot1-bas-bureau.png` : qualité basse.
- Essais intermédiaires : `docs/captures/bestiaire/lot1/essais/`.

## 3. Performance : pire cas

Mesures sur ce PC : Edge sans interface, avec la carte graphique, combat réel de 30 s (`?bench=1`), 2 mesures par cas. L'écran est plafonné à 60 images par seconde (i/s). Entre parenthèses : les 5 % d'images les plus lentes.

**Pire cas.** Le combat le plus chargé compte 6 créatures à l'écran (3 alliés et 3 ennemis, Cratère volcano-2). Pour la mesure, **toutes les espèces** ont reçu le plus gros modèle du lot, le Calcinarque légendaire (Cendrox, 7 532 triangles). Cette construction n'a servi qu'à mesurer : les copies ont été retirées ensuite.

| | qualité normale | qualité basse |
|---|---|---|
| modèles du code (avant) | 59,4 à 60 i/s (49 à 59), 93 700 triangles, 216 appels | 59 à 60 i/s (44 à 59), 17 300 triangles, 62 appels |
| pire cas, tout en `.vox` | 59,8 à 60 i/s (54 à 58), 161 000 triangles (+72 %), 198 appels | 59,3 à 59,7 i/s (47 à 54), 31 900 triangles (+84 %), 54 appels |

**Combat réel du lot 1** (Trône des Marées shore-3, Braizard + Cendrox + Aquabloc contre Corallix, Aquabloc et Abyssocube) :

| | qualité normale | qualité basse |
|---|---|---|
| modèles du code | 59,5 à 59,8 i/s (50 à 55), 29 800 triangles, 449 appels | 60 i/s (59), 9 900 triangles, 140 appels |
| lot 1 en `.vox` | 58,5 à 58,9 i/s (39 à 44), 108 000 à 148 000 triangles, 176 à 230 appels | 59,3 à 59,5 i/s (49 à 50), 28 700 triangles, 68 appels |

Ce qu'on en tire :
- **Sur ce PC, la moyenne ne baisse pas de plus de 2 %** dans tous les cas. La règle du sprint (pas plus de 10 % sous la mesure d'avant) est donc respectée sur ce PC.
- **Les images les plus lentes baissent**, en particulier au Trône des Marées en qualité normale (de 50–55 à 39–44 i/s). C'est le signe que la carte graphique travaille davantage ; ce qui ralentit le plus, ce sont les ombres de ces modèles plus détaillés.
- **Les appels de dessin baissent** avec les `.vox` (moins de pièces par créature), mais **les triangles augmentent beaucoup**. En qualité basse, la fusion des faces divise par deux le coût des `.vox`, et ils restent environ 1,8 fois plus chers que les modèles simplifiés du code.
- **Ce n'est pas une preuve pour un téléphone.** C'est la prochaine mesure à faire sur un vrai appareil, avant d'étendre au bestiaire entier.

## 4. Ce qui a échoué ou reste discutable

- **Abyssocube, de profil** : la rangée de coraux sur le dos peut rappeler une rangée de plaques. Ce sont deux rangées de branches avec des rameaux, mais en silhouette elles se lisent comme une crête. J'ai atteint les 3 essais permis par la fiche ; je le garde et je te le signale. Une correction possible : moins de flèches, plus courtes, penchées vers l'avant.
- **Aquabloc, de face** : encore assez carré (le dôme et le bouclier forment un bloc). C'est mieux qu'au premier essai, mais pas encore le « poitrail en V » demandé par la fiche.
- **Incident corrigé** : un fichier `src/assets/vox/magmadrake.vox` (copie du légendaire, laissée par une mesure de la phase 0 interrompue) traînait dans le dossier, non commité. Je l'ai supprimé avant de construire le lot. Il n'a jamais été dans un commit.
- **Icônes du bas d'écran en qualité basse** : le portrait d'Aquabloc garde l'ancien modèle (capture `combat-lot1-bas`). Je n'ai pas cherché la cause : c'est à vérifier au lot suivant.

## 5. Vérifié / supposé / à vérifier

- **Vérifié** :
  - les planches et le combat capturés dans le jeu ;
  - modèles du code inchangés (au pixel près) ;
  - `vox:check` ;
  - le déterminisme ;
  - les triangles ;
  - les images par seconde sur ce PC.
- **Supposé** : que le trot en diagonale soit agréable en mouvement. Je n'ai vu que la pose extrême, sur image fixe.
- **À vérifier par toi** :
  - la démarche en mouvement ;
  - l'impression générale du bœuf de récif ;
  - Braizard « attachant mais pas bébé » ;
  - la caméra proche contre l'actuelle ;
  - les images par seconde sur ton téléphone.

## 6. Questions pour toi (porte A)

1. La méthode tient-elle sur ces deux lignées ? Sinon, qu'est-ce qu'on corrige dans la bible avant le lot 2 ?
2. Abyssocube : je garde les flèches de corail, ou je les remplace par des coraux plus bas et penchés pour écarter tout air de « plaques dorsales » ?
3. Caméra : on reste sur l'actuelle, ou la proche te plaît davantage ?
4. Faut-il un plafond de lueur dans `vox:check` (9 % de la surface, 10 % pour les boss), comme proposé en phase 0 ?
