# Sprint ART 3 : créatures sculptées, décor épuré — rapport

## 1. Résumé

- **Créatures** : les 9 créatures reprennent les formes et les couleurs d'ART 1. Ont été ajoutés :
  - des lueurs d'élément, plus fortes la nuit ;
  - des bobines lumineuses ;
  - un contour lumineux ;
  - un dégradé de volume ;
  - une ombre au sol nette.

  Aucune forme n'a été simplifiée (testé).
- **Prairie épurée** :
  - sol en grands aplats de deux verts ;
  - plateaux d'un bloc et falaises en couches, avec des veines de cristal qui luisent la nuit ;
  - arbres de 2 ou 3 volumes ;
  - collines lointaines dans la brume, à la place des gros blocs pâles.
- **Ambiance** : brume plus marquée à l'aube. La nuit, les lueurs des créatures, les cristaux et les lucioles éclairent le décor.
- **Chargeur `.vox`** (MagicaVoxel) : un modèle facultatif par espèce, avec un essai possible dans `?gallery=art`. Il est prouvé par un fichier d'essai généré par script. Aucune créature n'est remplacée. Le guide est `docs/guide-vox.md`.
- **Vérifications** : golden identique à chaque section ; Bas à 171 appels de dessin et 16 832 triangles, sous `art2-final` (175 / 16 884). Publié sur …/next/.

## 2. Tags et retour arrière

Départ : `art2-final` (le tag existe). Branche : `art-3`. `main` n'a pas bougé.

| Tag | État sauvegardé |
| --- | --- |
| `sauvegarde-avant-art3` (tag et branche, vérifiés) | `art2-final` |
| `art3-avant-retour-art1` | avant la section 0 (fiche commitée) |
| `art3-avant-ajouts` | avant la section 1 |
| `art3-avant-decor` | avant la section 2 |
| `art3-avant-lumiere` | avant la section 3 |
| `art3-avant-vox` | avant la section 4 |
| `art3-avant-rapport` | avant la section 5 |
| `art3-final` | fin du sprint |

Tous les tags sont poussés et vérifiés avec `git ls-remote --tags origin`.

Incident : le premier essai de `sauvegarde-avant-art3` a créé un tag imbriqué (un tag qui pointe sur le tag `art2-final`), et le push a échoué, parce que le tag et la branche portent le même nom. Je l'ai recréé sur le commit lui-même, puis poussé avec les références complètes (`refs/tags/…`, `refs/heads/…`).

## 3. Ce qui a changé, par section

### Section 0 : retour aux créatures d'ART 1

- `sculptDefs.ts` est restauré depuis `art-final` (`git checkout art-final -- …`). Il est identique à `sculptDefsArt1.ts`, au nom de l'export près.
- La palette d'origine revient (plus la tête pâle d'ART 2), ainsi que l'ombre douce d'ART 1 (0,16).
- La version d'ART 2 est figée dans `sculptDefsArt2.ts`, uniquement pour la galerie.
- Gardé d'ART 2 :
  - l'allègement en Basse (les yeux et les parties lumineuses ne projettent pas d'ombre) ;
  - le cadrage à 70 % dans la galerie et les portraits ;
  - le vent, le camp, la manette tactile, les boutons de 44 px.
- `?gallery=art` a quatre colonnes (« Avant ART », « ART 1 », « ART 2 », « ART 3 ») et le bouton Silhouettes. Le portrait tournant prend une `version` au lieu de deux booléens.
- Tests :
  - têtes de 30 à 40 % pour le jeu (règle d'ART 1) ;
  - ART 3 a exactement les mêmes blocs qu'ART 1 ;
  - la copie d'ART 2 garde ses têtes de 45 à 50 % ;
  - les 9 silhouettes restent différentes à 64 px.

### Section 1 : faire mieux qu'ART 1, par ajouts seulement

Tout passe par le matériau (`patchArt3Material`, `voxelSculpt.ts`) : aucun objet ni appel de dessin en plus.

1. **Lueurs d'élément** :
   - les parties d'accent qui luisaient déjà (braise, lave de Magmadrake et d'Ignisaur, filament d'Ampoulin, cristaux de Cailloc) luisent 35 % plus fort, et jusqu'à 2,4 fois plus la nuit au camp ;
   - les bandes de cuivre de Bobinard et Voltacier luisent dans leur propre couleur (drapeau `glow` sur des formes existantes : ni forme ni couleur changée) ;
   - la force de la nuit revient au jour au départ d'un combat (il n'y a pas de nuit en combat).
2. **Contour lumineux** : les faces vues en biais s'éclairent légèrement, d'un ton chaud. Il est coupé en Basse.
3. **Ombre au sol nette** : un disque à bord franc (plein jusqu'aux trois quarts), au lieu du dégradé large.
4. **Dégradé de volume** : le bas de chaque pièce est 10 % plus sombre que le haut. Ce n'est pas une nouvelle couleur (testé : rapport de 0,9 à 1).
5. **Yeux** : ceux d'ART 1 ont déjà un reflet blanc (testé depuis ART 1) et le clignement est inchangé. Rien n'a été ajouté.

Décision : aucune créature n'est gardée en version ART 1 pure. Les ajouts ne changent ni la forme ni la couleur, et la colonne ART 3 montre la même créature. **Mais je n'ai pas pu juger « plus vivante et plus impressionnante » ailleurs que sur des images fixes** ; c'est à vous de trancher. Revenir à ART 1 pour une créature ou pour toutes se fait en un point : l'argument `art3` de `buildSculptRig` dans `creatures.ts`.

### Section 2 : décor épuré de la Prairie (camp et niveaux de la Prairie)

1. **Sol** : 9 grands aplats de deux verts voisins, à bords en marches de 8 pixels, sur le vert de fond. Il y a 3 verts en tout ; le damier de petits carrés a disparu.
2. **Plateaux** : des terrasses d'un bloc (au lieu de 0,5). Le dessus alterne deux verts, et les flancs montrent des bandes de terre et de pierre (3 tons) sous une lèvre d'herbe. Tout se fait dans le shader.
3. **Arbres** : 5 silhouettes de 2 ou 3 volumes chacune (bloc et chapeau décalé, table et tour basse, pyramide en trois marches, colonnes jumelles, fuseau haut), en 3 verts proches. Le vent d'ART 2 est gardé.
4. **Fond** : les 14 gros îlots pâles ne sont plus ajoutés à la Prairie. Ils sont remplacés par 12 collines basses à deux étages, couleur de brume. Les autres biomes et les outils n'ont pas changé.
5. **Signature** : il y a des veines de cristal dans 3,5 % des blocs de falaise, qui luisent doucement la nuit, ainsi que 4 blocs de pierre taillée et 4 billes de bois brut (pas en Basse).
6. Gardé d'ART 2 : le premier plan dégagé, les touffes d'herbe et de fleurs, le chemin et les quatre lieux.

Anti-plagiat : seuls les principes ont été repris (aplats, lisibilité). Les arbres ne reprennent pas la boule sur un bâton, et la palette est celle de la Prairie d'origine.

### Section 3 : lumière et ambiance

- Au camp de la Prairie, la brume va de 28 à 78 (au lieu de 30 à 82) ; autour de l'aube, de 18 à 62. Nouvelle capture `camp-aube`.
- La nuit, les lueurs des créatures, les veines de cristal et les lucioles suivent le cycle du camp. Le feu de l'atelier est gardé.
- Attaques annoncées :
  - il n'y a pas de nuit en combat (le cycle ne tourne qu'au camp) ;
  - un test vérifie que le rouge `DANGER` reste bien distinct de chacune des 9 teintes du décor épuré (écart RGB ≥ 0,35) ;
  - **je n'ai pas pu les voir à l'écran** : le navigateur headless ne joue pas le combat jusqu'au boss.

### Section 4 : chargeur `.vox`

- `models/voxFile.ts` lit et écrit le format MagicaVoxel (SIZE, XYZI, RGBA) sans dépendance.
- Couleurs réservées :
  - 240 à 247 : lueur ;
  - 248 : œil ;
  - 249 : reflet ;
  - 250 à 252 et 253 à 255 : jambes.
- La créature `.vox` passe par le même constructeur que les créatures du code : même échelle de bloc, même éclairage, mêmes animations (jambes, clignement, corps) et mêmes lueurs.
- Un fichier facultatif `src/assets/vox/<espèce>.vox` est chargé au démarrage et remplace le modèle de cette espèce. Il n'y en a aucun : les 9 créatures gardent leur modèle (testé).
- Preuve :
  - `npm run vox:exemple` génère `tools/fixtures/exemple-essai.vox` ;
  - `vox.test.ts` vérifie la relecture, l'aller-retour, les rôles, l'orientation, la construction et le refus d'un fichier invalide ;
  - la capture `art-vox` montre le fichier chargé dans la colonne ART 3.
- `?gallery=art` permet « Essayer un .vox » et « Retirer le .vox » (rien n'est enregistré), ainsi que `&vox=exemple`.
- `docs/guide-vox.md` donne la taille, l'orientation, les couleurs réservées, où déposer le fichier, comment le voir, et les limites.

## 4. Mesures avant/après (`?stage=meadow-2&debug=1&quality=X`, 1280 × 720)

| Qualité | `art2-final` (appels / triangles) | ART 3 |
| --- | --- | --- |
| Bas | 175 / 16 884 | **171 / 16 832** |
| Moyen | 378 / 107 894 | 382 / 104 110 |
| Haut | 580 / 161 874 | 586 / 156 198 |

- En Basse, le premier essai donnait 16 976 triangles, au-dessus de la limite. Décision : en Basse, les collines n'ont qu'un étage, et la pierre et le bois ne sont pas posés. Le Bas repasse sous `art2-final`.
- En Moyen et en Haut, il y a 4 à 6 appels de plus (les blocs de pierre et de bois, les collines). La règle ne fixe de plafond qu'en Basse.

`npm run check` : 142 tests, golden identique (840 combats), build OK. `npm run texts` = 0, `npm run lexique` = 0.

## 5. Valeurs de jeu modifiées

Aucune. Le golden est identique ; tout le visuel est réservé au navigateur.

## 6. R17 (au doigt, 390 × 844, qualité Basse)

- Ce sprint n'ajoute aucune action au jeu. Le seul nouveau contrôle est « Essayer un .vox », dans la galerie de développement : c'est un sélecteur de fichier de 44 px.
- La manette, les boutons de 44 px et le recul de la caméra d'ART 2 sont inchangés.
- Les captures en 390 × 844 du camp (jour, nuit, aube) et d'un combat de la Prairie montrent le chemin, les quatre lieux et la mêlée.
- Non vérifié avec un vrai doigt (pas d'événements tactiles en headless). Les captures en téléphone sont faites en qualité par défaut ; la qualité Basse est mesurée à part, en 1280 × 720.

## 7. Captures (`docs/captures/art3/`)

- `avant/` : l'état `art2-final`.
- `apres/` :
  - `art-magmadrake`, `art-pyrocube`, `art-raicube`, `art-silhouettes` (quatre colonnes) ;
  - `lignee-*` ;
  - `camp-jour`, `camp-nuit` et `camp-aube`, en bureau et téléphone ;
  - `combat-prairie` et `boss-prairie` ;
  - `equipe` ;
  - `art-vox` ;
  - `mesure-prairie-low`, `-medium` et `-high`.

## 8. Vu seulement sur images fixes (à juger en jeu)

- Si Magmadrake et les autres paraissent « plus vivants, plus impressionnants » qu'en ART 1 : les ajouts sont discrets, de jour surtout.
- Les lueurs la nuit en mouvement, le contour lumineux en rotation, l'ombre au sol nette pendant les sauts.
- La lisibilité des attaques annoncées sur le nouveau sol (vérifiée seulement par calcul de couleur).
- Le vent dans les nouveaux arbres, et la brume de l'aube qui se lève.
- Les FPS sur une vraie machine.

## 9. Idées (hors périmètre)

- Appliquer le décor épuré (aplats, falaises en couches) aux autres biomes après votre validation.
- Pour les modèles `.vox` : une version allégée en Basse, la variante de couleur, et des pièces animées en plus (queue, ailes) avec d'autres couleurs réservées.

## Restart handle

- Changé :
  - `sculptDefs.ts` (ART 1) et `sculptDefsArt2.ts` (nouveau, figé) ;
  - `voxelSculpt.ts` (ajouts ART 3, `voxels` / `rgb`), `creatures.ts`, `shared.ts` (ombre nette) ;
  - `meadowDecor.ts` (décor épuré), `biomes.ts` (îlots retirés de la Prairie art), `atmosphere.ts`, `expedition.ts`, `postfx.ts`, `main.tsx` ;
  - `voxFile.ts`, `voxExemple.ts` ;
  - `ArtGallery.tsx`, `CreatureTurntable.tsx` ;
  - tests `art`, `vox` ;
  - `captures.ps1` (`camp-aube`, `art-vox`), `package.json` (`vox:exemple`).
- Non vérifié : la section 8, et le toucher réel.
- Retour en arrière : `art3-avant-*` ou `sauvegarde-avant-art3`.
- Ne pas toucher : `main`, et le golden (identique).
- Prochaine étape sûre : comparer ART 1 et ART 3 dans `…/next/?gallery=art`, jouer la Prairie de jour et de nuit, puis avancer `main` sur `art3-final` si le résultat convient.
