# Sprint STYLES : Magmadrake en plusieurs styles — rapport

## 1. Résumé

- La nouvelle page `?gallery=styles` montre Magmadrake en six styles (A à F), qui tournent, en vue « Vitrine » ou « En jeu » (sur la Prairie ART 3, avec la caméra de combat).
- Des interrupteurs propres à la page permettent de tester les hypothèses de la fiche : mappage des tons, saturation, anticrénelage, caméra, jour ou nuit. Un bouton « Comparer A et ? » met l'étalon à côté d'une autre variante, en grand.
- Le jeu n'est pas modifié. Seuls ont été ajoutés la page, son module de variantes, une route dans `main.tsx` et un lien dans `?gallery=art`. Le golden est identique et `npm run check` passe.
- Chaque case affiche ses appels de dessin et ses triangles (tableau en partie 4). Aucun gagnant n'est désigné : le choix appartient au joueur.
- La page est publiée sur …/next/?gallery=styles.

## 2. Tags et retour arrière

Départ : `art3-final` (le tag existe). Branche : `styles`. `main` n'a pas bougé.

| Tag | État |
| --- | --- |
| `sauvegarde-avant-styles` (tag et branche, vérifiés) | `art3-final` |
| `styles-avant-variantes` | avant la section 1 (fiche commitée) |
| `styles-avant-page` | avant la section 2 |
| `styles-avant-rapport` | avant la section 3 |
| `styles-final` | fin du sprint |

## 3. Ce qui a été fait

### Section 1 : six variantes (`src/components/styles/magmaStyles.ts`)

Toutes partent de la forme d'ART 3 (`sculptDefs.ts`, lue sans être modifiée), sauf B qui la reprend en gros volumes. Toutes ont la même échelle que le jeu (échelle de l'espèce × 1,18), la même palette (roche `#4B3E3B` et `#2C2524`, lave `#FF6B2B`, yeux `#FFCA3A`), la même posture et la même ombre au sol nette.

| | Nom | Fabrication |
| --- | --- | --- |
| A | Étalon ART 3 | `buildVoxelCreature('magmadrake')`, le modèle du jeu tel quel |
| B | Gros blocs | 15 boîtes : corps, ventre, tête, museau, 2 yeux, 2 bras, 2 jambes, veine de lave du dos, 2 cornes, queue, braise. Aplats, sans ombre de blocs |
| C | Voxel moyen cohérent | Même forme, voxelisée à 12 blocs par unité (environ 22 de haut). Les blocs isolés sont retirés en deux passes (sauf les yeux), l'ombre de blocs est réduite de moitié. Les ajouts d'ART 3 sont gardés |
| D | Voxel biseauté | Les blocs visibles de C, chacun en cube à arêtes arrondies (`RoundedBoxGeometry` de three.js, biseau de 20 %), instanciés. La lave luit |
| E | Sculpté lisse | La forme voxelisée à la finesse d'ART 3 (14 par unité), en une seule peau : aucune face interne entre les pièces. Lissage de Taubin (6 passes), normales lissées ; la lave luit dans sa couleur |
| F | Toon | Les blocs de C en `MeshToonMaterial` à 3 niveaux d'ombre francs, avec un contour noir épais (coque gonflée le long des normales moyennes, sans fissure) |

Décisions :

- **C garde les ajouts d'ART 3** (lueurs, contour lumineux, dégradé), pour que seule la taille des blocs change par rapport à A.
- **B, D, E et F** n'utilisent pas le constructeur des créatures : leurs lueurs suivent la même loi (jusqu'à 2,4 fois la nuit) par leur propre matériau.
- **Le premier rendu de F** était presque noir (palette sombre et matériau toon sans environnement) : j'ai éclairci les paliers (110 / 190 / 255).
- **Anti-plagiat** : aucune forme nouvelle. B reprend les repères de la forme d'ART 3 (cornes, veine de lave, braise de la queue).

### Section 2 : la page `?gallery=styles` (`src/components/StylesGallery.tsx`)

- **Rendu** : un seul rendu WebGL, découpé en cases (3 colonnes, 2 sur téléphone). À chaque case, seule sa variante est visible, et l'ombre est recalculée par case. Les créatures tournent lentement.
- **Vitrine** : fond neutre, lumière des portraits du jeu (clé chaude, contre-jour bleu, environnement de studio).
- **En jeu** :
  - le décor de combat de la Prairie (ART 3, `buildBiomeEnvironment`) ;
  - la lumière du combat (`VoxelEngine` : hémisphère, clé, contre-jour, environnement 0,42) ;
  - la caméra de combat : 42°, (0 ; 15,8 ; 16,5) vers (0 ; 0,7 ; 0). La créature occupe la même part de la hauteur de la case que de l'écran en jeu.
- **Interrupteurs** (page seulement) :
  - tons : actuel / aucun / neutre ;
  - saturation +20 % ;
  - anticrénelage renforcé ;
  - caméra proche et basse ;
  - jour / nuit.
- **« Comparer A et ? »** : deux cases en grand, et « Les six » pour revenir à la grille.
- Boutons de 44 px. Les paramètres d'URL servent aux captures (`&view=jeu&tone=aucun&sat=1&aa=2&cam=proche&nuit=1&compare=C`).
- Un lien vers la page a été ajouté dans `?gallery=art`, et un lien retour dans la page.
- La page ne reproduit pas le pipeline d'effets du jeu (contour, occlusion, ciel en dégradé), ce qui est écrit sur la page. Elle sert à comparer les variantes entre elles, pas à imiter l'image exacte du jeu.

## 4. Mesures par variante (appels de dessin / triangles, 1280 px de large)

Les compteurs incluent la passe d'ombre (chaque maillage est dessiné deux fois). Les nombres sont relevés sur les captures.

| Variante | Vitrine (créature seule) | En jeu (avec le décor) |
| --- | --- | --- |
| A Étalon ART 3 | 18 / 8 152 | 38 / 44 532 |
| B Gros blocs | 31 / 380 | 51 / 36 760 |
| C Voxel moyen | 17 / 6 000 | 37 / 42 380 |
| D Biseauté | 5 / 420 020 | 25 / 456 400 |
| E Sculpté lisse | 3 / 7 908 | 23 / 44 288 |
| F Toon | 4 / 8 684 | 24 / 45 064 |

Ce que montrent les chiffres :

- **D** coûte environ 50 fois les triangles de A, parce que chaque cube arrondi a environ 300 triangles. En jeu, il faudrait le fabriquer autrement (biseau dans le shader, ou une seule peau biseautée).
- **B** demande le plus d'appels (une boîte par volume), mais très peu de triangles. Fusionner ses boîtes en un seul maillage ramènerait les appels à 2 ou 3.
- **E et F** n'ont qu'un ou deux maillages : peu d'appels, autant de triangles que A.

## 5. Ce que chaque interrupteur change

Captures « avec / sans » (sur la paire A et C, vue En jeu) : `styles-tons-actuel`, `styles-tons-aucun`, `styles-tons-neutre`, `styles-saturation`, `styles-aa`, `styles-camera-proche`.

- **Tons** :
  - **actuel** : ACES filmique, exposition 0,94, comme le jeu ;
  - **aucun** : pas de mappage. Les verts et l'orange sont nettement plus vifs et plus clairs, et la roche brune de Magmadrake ressort mieux du sol ;
  - **neutre** (`NeutralToneMapping`) : entre les deux, couleurs moins grises qu'avec ACES, sans les hautes lumières brûlées.
  - Sur les captures, l'écart entre « actuel » et les deux autres est visible. Cela va dans le sens de l'hypothèse 3 (le mappage ACES ternit), sans la prouver.
- **Saturation +20 %** : filtre CSS `saturate(1.2)` sur le dessin, sans toucher au rendu. **Sur la capture headless, je ne vois pas de différence nette** : à vérifier dans un vrai navigateur.
- **Anticrénelage renforcé** : rendu à deux fois la résolution de l'écran, plafonné à ×4, puis réduit (suréchantillonnage). Les bords en escalier s'adoucissent sur la capture `styles-aa`, surtout ceux des blocs fins. Le coût est de 4 fois les pixels.
- **Caméra proche et basse** : (0 ; 7,5 ; 10) vers (0 ; 1 ; 0), au lieu de (0 ; 15,8 ; 16,5). La créature paraît environ deux fois plus haute à l'écran, et la vue de trois quarts montre la face et la lave. C'est l'hypothèse 4.
- **Nuit** : la lumière de la nuit du camp ; les lueurs de lave et les lucioles s'allument. Sur la Prairie, la roche sombre se confond avec le sol la nuit : seules les lueurs restent lisibles.

## 6. Vu seulement sur image fixe (à juger en vrai)

- Toutes les comparaisons de style : Edge headless n'anime pas, les captures sont prises à un seul angle de rotation.
- La saturation +20 % (pas de différence visible sur la capture), l'anticrénelage en mouvement (le crénelage se voit surtout quand la créature tourne).
- Les fréquences d'image, en particulier pour D (456 000 triangles).
- La lisibilité sur un vrai téléphone (les étiquettes de case sont réduites sur écran étroit ; les compteurs sont masqués).

## 7. Captures (`docs/captures/styles/`)

- `styles-vitrine` et `styles-jeu`, en `grand` (1280 × 1180) et en `telephone` (390 × 844) : les six variantes dans les deux vues, réglages par défaut.
- `styles-vitrine-nuit`, `styles-jeu-nuit`.
- Interrupteurs (A et C, En jeu) : `styles-tons-actuel`, `-tons-aucun`, `-tons-neutre`, `styles-saturation`, `styles-aa`, `styles-camera-proche`.
- `styles-comparer-e` : A et E en grand, en Vitrine.
- `tools/captures.ps1` gagne le format `grand` (1280 × 1180) et ces écrans.

## 8. Valeurs de jeu modifiées

Aucune. Golden identique (840 combats), `npm run texts` = 0 (la page et son module sont des outils de développement, ajoutés à la liste de `tools/texts.ts`), `npm run lexique` = 0.

## Restart handle

- Changé :
  - `src/components/StylesGallery.tsx`, `src/components/styles/magmaStyles.ts` (nouveaux) ;
  - `src/main.tsx` (route `?gallery=styles`), `ArtGallery.tsx` (lien) ;
  - `tools/texts.ts`, `tools/captures.ps1` ;
  - `CLAUDE.md`.
- Non vérifié : la section 6.
- Retour en arrière : `styles-avant-*` ou `sauvegarde-avant-styles`.
- Ne pas toucher : `main`, le golden, et les réglages de rendu du jeu.
- Prochaine étape sûre : le joueur ouvre `…/next/?gallery=styles`, compare en vue « En jeu », puis choisit un style. Appliquer ce style au jeu sera un autre sprint.
