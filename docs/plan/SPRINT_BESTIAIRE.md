# SPRINT BESTIAIRE — refaire toutes les créatures en .vox sculptés

Fiche écrite le 23 novembre 2026, après validation par le joueur du modèle « Calcinarque légendaire ».
Branche de départ : `styles-3` (dernier tag `styles3-final`). `main` ne bouge pas pendant ce sprint.

---

## 0. Pourquoi ce sprint

Les explorations ART, ART2, ART3, STYLES, STYLES2 et STYLES3 ont montré une chose : **la limite n'est pas le style de voxel, ce sont les modèles construits par le code**. À la taille du combat, les 20 styles se ressemblent. Magmadrake fait ours assis, Calcinarque fait stégosaure de profil et boîte de face.

Le 23/11, un Calcinarque légendaire **sculpté par script** (primitives 3D + passes de couleur, écrit en `.vox`) a été validé par le joueur : « je kiffe ». Il est fourni dans `tools/vox-studio/references/`.

**Objectif** : refaire toutes les créatures du jeu dans ce style et à ce niveau de détail, pour un univers cohérent, beau, lisible en combat, et attirant sur une page Steam.

**Ce qui n'est pas l'objectif** : changer le gameplay, les stats, les noms ou le moteur de rendu. On ne touche qu'aux modèles (et au chargeur `.vox` si c'est indispensable, voir phase 0).

---

## 1. Sauvegarde et retour en arrière (à faire AVANT toute modification)

1. Partir de `styles-3` à jour, arbre de travail propre (`git status` vide).
2. Poser le tag de sauvegarde et créer la branche :
   ```
   git tag sauvegarde-avant-bestiaire
   git push origin sauvegarde-avant-bestiaire
   git checkout -b bestiaire
   ```
3. Après **chaque lot validé** (voir §6), commit, puis tag `bestiaire-lotN` poussé sur le dépôt.
4. À la fin, tag `bestiaire-final`. `main` n'avance qu'après accord écrit du joueur.

**Pour revenir en arrière :**
- Tout le sprint : `git checkout sauvegarde-avant-bestiaire` (ou `git reset --hard sauvegarde-avant-bestiaire` sur la branche `bestiaire`, uniquement si le joueur le demande).
- Un seul lot : `git checkout bestiaire-lot(N-1)`.
- Une seule créature : supprimer son fichier dans `src/assets/vox/`. Le chargeur revient tout seul au modèle construit par le code (comportement documenté dans `docs/guide-vox.md`). C'est le filet de sécurité créature par créature.

Note toujours dans le rapport de session le tag à utiliser pour revenir à l'état précédent.

---

## 2. Ce qui est fourni (dossier `tools/vox-studio/`)

Ces fichiers sont la **référence**, pas forcément le code final :

| Fichier | Rôle |
|---|---|
| `voxlib.py` | Bibliothèque de sculpture : `ellipsoid`, `box`, `capsule` (troncs de cône arrondis), `membrane` (voile plane, dans `ailebraise.py`), `crack` (fissure peinte sur la surface), symétrie `mirror`, passes de couleur (dessus clair / dessous sombre), `legs_split` (indices 250–255), `crop`, `report`, `write_vox`, `read_vox` (relecture indépendante), et deux moteurs d'aperçu (`render_rt` = lancer de rayons exact, à utiliser). |
| `calcinarque_legendaire.py` | **Modèle de référence validé.** À lire en premier : c'est l'exemple de ce qu'on veut. |
| `coureur_cendres.py` | Forme intermédiaire fine (planche Calcinarque n° 10). Validé comme lisible. |
| `ailebraise.py` | Wyverne ailée. **Contre-exemple** : les ailes figées font une cape de loin. Ne pas reproduire. |
| `pixel3d.py` | Test « pixel 3D » (nuances au hasard, résolution ×2). Conclusion : invisible à la taille du combat à résolution normale ; ×2 = 54 voxels de haut. **Hors périmètre de ce sprint.** |
| `references/*.vox` et `*.png` | Les fichiers produits le 23/11 et leurs planches d'aperçu. |

Repère du chargeur (rappel de `docs/guide-vox.md`) : Z = haut, la créature regarde vers −Y (tête aux Y faibles), le voxel le plus bas touche z = 0, seul le premier modèle du fichier est lu. Palette : 1–239 corps ; 240–247 lueur d'élément ; 248 œil (clignote, séparé au milieu) ; 249 reflet de l'œil ; 250–252 patte gauche ; 253–255 patte droite. Dans le chunk RGBA, l'entrée k correspond à l'indice k+1.

Dans le repère de `voxlib`, la gauche de la créature est +X. Si le chargeur suppose l'inverse, il suffit d'inverser 250–252 et 253–255 : vérifie-le en phase 0.

---

## 3. Phase 0 — Inventaire, outillage, questions techniques (une session)

Rien n'est sculpté dans cette phase. Elle se termine par un rapport au joueur.

### 3.1 Inventaire
Lis `catalog.ts` (et tout fichier qui définit lignées, stades, éléments, ennemis et boss). Écris `docs/plan/BESTIAIRE.md` avec un tableau d'une ligne par créature :

`identifiant | nom affiché | élément | lignée | stade (1, 2, final, légendaire, ennemi, boss) | taille actuelle en voxels | plan de corps proposé | signature de lignée | priorité`

Compte les créatures et propose les **lots** (§6). Ne devine aucun nom ni aucun élément : tout vient du code.

### 3.2 Outillage
- Installe le studio dans `tools/vox-studio/`. Deux options : garder Python (si Python 3, numpy et Pillow sont disponibles et que le joueur peut les lancer sur son PC), ou porter `voxlib` en TypeScript/Node pour rester dans l'écosystème du dépôt (`npm run vox:exemple` contient déjà un écrivain `.vox` : réutilise-le). **Choisis, et justifie en deux lignes.**
- Un script par créature : `tools/vox-studio/species/<identifiant>.(py|ts)`.
- Commandes à fournir :
  - `vox:build` : régénère tous les `.vox` dans `src/assets/vox/` (déterministe : même script = même fichier, octet pour octet).
  - `vox:check` : relit chaque `.vox` avec un lecteur indépendant et vérifie version 150, bornes, z min = 0, symétrie X (pattes gauche/droite échangées), présence des yeux (248), absence de lueur (240–247) sur les voxels de pattes, dimensions dans les limites du §4.4, indices 1–255 seulement. Échec = code de sortie non nul.
  - `vox:planche` : une planche par créature (3/4 avant, face, profil, 3/4 arrière, taille réelle en combat : recadrage de l'image du jeu en 1280 × 720, où une forme finale fait 130 à 140 px de haut, silhouette) dans `docs/captures/bestiaire/`. **Rendu du vrai jeu** si le dépôt a déjà une capture automatisée (navigateur sans tête, comme pour `docs/captures/styles3/`), sinon le `render_rt` de `voxlib`. Indique toujours lequel a été utilisé.
  - Une planche d'**alignement** : toutes les créatures d'un lot côte à côte, à l'échelle du jeu, de profil et en silhouette.

### 3.3 Questions techniques à trancher en lisant le code du chargeur (et en testant)
1. **Animation des 4 pattes** : un quadrupède n'a qu'un groupe gauche et un groupe droit. Les pattes d'un même côté bougent-elles ensemble ? Si c'est laid, propose la plus petite modification du chargeur (par exemple séparer avant/arrière selon Y) et mesure-la.
2. **Yeux** : le clignement fonctionne-t-il quand les yeux sont à 3–4 voxels derrière le bout du museau ?
3. **Échelle** : un voxel `.vox` a-t-il la même taille qu'un voxel du modèle code ? Le chargeur normalise-t-il la hauteur ?
4. **Variantes de couleur de lignée** : le guide dit qu'elles ne s'appliquent pas aux `.vox`. Si le jeu s'en sert (individus, rareté), propose une solution (remappage de palette au chargement, ou un `.vox` par variante) et chiffre son coût. Ne casse rien sans accord.
5. **Performance** : combien de voxels et de triangles pour un combat typique (nombre maximal de créatures à l'écran) avec des modèles de ~1 500 à ~4 000 voxels ? Le chargeur fusionne-t-il les faces ? Mesure les images par seconde (avant / après) avec le Calcinarque légendaire de référence, sur la scène de combat la plus chargée. En mode qualité basse, les `.vox` ne sont pas simplifiés : est-ce un problème ?
6. **Lueurs** : à quoi ressemblent 240–247 de jour et de nuit (style O) ? Faut-il plafonner la part de lave ?

**Porte 0** : rapport au joueur avec l'inventaire, les lots proposés, les réponses aux 6 questions, les mesures, et une capture **du vrai jeu** montrant `calcinarque-legendaire.vox` en combat à côté du modèle code. Pas de sculpture avant son accord.

---

## 4. Bible artistique

Ces règles viennent de ce qui a marché (et raté) le 23/11. Elles priment sur les « règles de style » de `docs/guide-vox.md`, qui visaient des créatures mignonnes. Les **contraintes techniques** du guide, elles, restent obligatoires.

### 4.1 La silhouette d'abord
- Chaque créature doit se reconnaître **à sa seule silhouette, à sa taille réelle en combat (1280 × 720 : environ 130 à 140 px de haut pour une forme finale, 60 à 70 px pour une forme de base ; mesuré en phase 0, corrigé le 23/11)**. C'est le premier test, avant les couleurs.
- Chaque lignée a un **plan de corps** distinct : quadrupède bas, bipède, serpentin, trapu à carapace, flotteur, etc. Deux lignées d'un même élément ne partagent jamais le même plan de corps.
- Profil : une ligne de dos qui raconte quelque chose (épaules hautes = prédateur, dos voûté = colosse, ligne basse = rôdeur). La tête est **séparée du corps** par un vide ou un cou visible.
- Face : jamais une boîte. Épaules plus larges que la taille, poitrail en V, membres écartés, tête plus étroite que les épaules.
- **Vue du dessus (ajout du 23/11, porte A)** : la caméra de combat est haute, on voit surtout le dos et le dessus de la tête. Chaque créature doit se lire VUE DU DESSUS : une forme de dos qui raconte la lignée, une tête qui dépasse nettement devant le corps, et une lueur visible d'en haut (pas seulement sur les flancs ou sous la gueule). Les planches ont une vue de dessus (en haut à droite) : la regarder à chaque itération.

### 4.2 Gradation par stade (décision à confirmer par le joueur en porte 0)
Tout rendre intimidant tue l'attachement des premières formes. Proposition :

| Stade | Hauteur (Z) | Tête / hauteur | Ton | Lueur en surface |
|---|---|---|---|---|
| 1 (base) | 14–18 | 30–35 % | attachant mais pas bébé : yeux 2×2 sans reflet géant, déjà la signature de lignée en petit ; **yeux visibles en 3/4 depuis la caméra du jeu** (vérifier sur le recadrage « taille réelle en combat » de la planche ; ajout du 23/11) | 2–4 % |
| 2 (évolué) | 18–24 | 25–30 % | affirmé, posture de chasse | 4–6 % |
| Final / légendaire | 24–30 | 20–25 % | intimidant, niveau Calcinarque légendaire | 5–9 % |
| Ennemis communs | selon rôle | libre | lisibles comme hostiles | 2–5 % |
| Boss | jusqu'à la limite mesurée en phase 0 | libre | spectaculaire | 6–10 % |

Largeur (X) : 12 à 20. Longueur (Y) : 34 au maximum (sauf accord après la mesure de performance).

### 4.3 Signature de lignée
Une lignée = une signature qui **grandit** avec l'évolution. Exemple Calcinarque : fente de lave dans la gueule → fissures sur le poitrail et l'épaule → cornes os puis incandescentes balayées vers l'arrière, ligne dorsale de lave. Écris la signature de chaque lignée dans `BESTIAIRE.md` avant de sculpter.

### 4.4 Construction (règles techniques du style)
- Sculpter avec des volumes qui se chevauchent (ellipsoïdes, capsules, boîtes), puis passes de couleur automatiques : dessus = croûte plus claire, dessous = plus sombre. Ce contraste fait la lisibilité.
- Aucune protubérance d'un seul voxel : tout fait au moins 2 voxels d'épaisseur. Les crocs et les griffes peuvent faire 1×2 s'ils restent dans la silhouette.
- Symétrie gauche/droite parfaite (construire une moitié, miroir).
- Yeux : 2×2, **enfoncés sous une arcade** qui les surplombe d'un voxel. Pas de reflet 249 sauf au stade 1 si le joueur le veut.
- Pattes : indices 250–255, épaisses, coudes ou genoux qui sortent du corps. **Jamais de lueur sur une patte** (elle ne suivrait pas l'animation).
- Queues, ailes, crêtes : statiques. Donc **pas de grandes ailes déployées** : ailes repliées et plaquées au corps, ou réduites à des ailerons, crêtes ou nageoires. (Leçon d'Ailebraise : des ailes figées font une cape.)
- Lueurs 240–247 : des **lignes** (fissures, veines, gueule, bouts de cornes), pas des taches. Un cœur plus chaud (jaune) au milieu des lignes principales. **Plafond** : 9 % de la surface, 10 % pour une créature qui sert de boss (vérifié par `vox:check`, validé le 23/11).

### 4.5 Couleurs
- Par créature : 3 ou 4 couleurs de corps (base sombre, moyenne, croûte du dessus, corne/os), plus la lueur d'élément.
- Par élément, une **langue de matière** commune (exemple feu : basalte brun-noir + lave orange-jaune, jamais rose ni saumon). Propose celle de chaque élément du jeu dans `BESTIAIRE.md` (matière, 3 couleurs de corps, 3 couleurs de lueur, en hexadécimal) **avant** de sculpter le lot. Le joueur valide.
- Les éléments doivent se distinguer d'un coup d'œil, de jour comme de nuit.
- **Contraste avec le sol (ajout du 23/11, après le lot 2)** : le corps d'une créature doit contraster avec le sol de son biome (exemple : le basalte brun du feu se fondait dans le sol brun du volcan ; le feu est passé au basalte charbon, avec plus de lave visible d'en haut). Chaque lot se teste en combat **sur le sol de son biome ET sur un sol clair** (Rive Azur), captures à l'appui.
- **Pas de rangée continue de piques ou de lave du cou à la queue** sur une créature dressée (ça rappelle un monstre de cinéma connu) : des groupes séparés, une ligne en pointillé.

### 4.6 Interdits (plagiat et clichés)
- Aucune ressemblance avec une créature d'un autre jeu (Pokémon, Digimon, Monster Hunter, Palworld, Warcraft, Elden Ring, Spyro…). En cas de doute : changer le plan de corps.
- Pas de flamme ou de boule lumineuse au bout de la queue. Pas de ventre crème sur un corps orange avec des ailes. Pas de couronne. Pas de cheminée ni d'objet manufacturé (ça fait machine). Pas de rangée unique de grandes plaques dorsales (ça fait stégosaure).

---

## 5. Méthode de sculpture d'une créature (boucle à suivre)

1. Relire sa ligne dans `BESTIAIRE.md` (plan de corps, signature, stade, couleurs).
2. Écrire le script : tronc → cou et tête → membres → queue et attributs → passes de couleur → lueurs → yeux → pattes → `crop`.
3. `vox:build` puis `vox:check` : doit passer.
4. `vox:planche` : regarder **soi-même** les 6 vues. Vérifier, dans l'ordre :
   - la silhouette à sa taille réelle en combat (130 à 140 px pour une forme finale) se reconnaît et ne ressemble à aucune autre créature du lot ;
   - la tête se lit (gueule, yeux, arcade) de 3/4 et de face ;
   - de profil, pas d'ours assis ni de stégosaure ; de face, pas de boîte ;
   - la signature de lignée est visible ;
   - les éléments interdits du §4.6 sont absents.
5. Corriger et recommencer. **Au plus 3 itérations** par créature dans une session ; au-delà, garder le modèle code (pas de fichier `.vox`) et le signaler dans le rapport.
6. Vérifier en jeu (`?gallery=art`, puis un vrai combat) au moins une créature par lot.

---

## 6. Plan de production

**Lot 1 — pilote (une session)** : toute la lignée Calcinarque (tous ses stades, en reprenant le légendaire de référence), plus une lignée d'un **autre élément** avec un **autre plan de corps**. But : prouver que la méthode tient sur une lignée complète et sur un deuxième élément.
→ **Porte A** : le joueur juge en jeu. S'il n'aime pas, on corrige la bible (§4) avant tout autre lot.

**Lots 2 à N — production** : un lot = un élément (ou environ 6 à 9 créatures), toujours les lignées complètes. Une session par lot. Après chaque lot : `vox:check` vert, planches dans `docs/captures/bestiaire/lotN/`, planche d'alignement du lot, commit, tag `bestiaire-lotN`, publication sous `/next/`.

**Lot ennemis et boss** : après les créatures du joueur, mêmes règles, avec un langage visuel « hostile » commun à proposer au joueur.

**Lot final — harmonisation (une session)** :
- Planche d'alignement de **tout** le bestiaire, à l'échelle, en silhouette et en couleur.
- Corriger les tailles relatives et les doublons de silhouette.
- Appliquer les gains notés en STYLES2 et STYLES3 si le joueur les valide : tons « neutre » et caméra plus proche.
- Mesure de performance finale sur le combat le plus chargé, en qualité normale et basse.
→ **Porte B** : validation du joueur, tag `bestiaire-final`, puis seulement fusion vers `main` si le joueur le dit.

---

## 7. Critères de réussite (vérifiables)

- `vox:check` vert sur 100 % des fichiers ; `vox:build` déterministe.
- Le build du jeu, les tests et le lint du dépôt passent comme avant le sprint.
- Chaque créature a sa planche ; chaque lot a sa planche d'alignement.
- Test des silhouettes : sur la planche d'alignement en silhouettes (sans noms), le joueur reconnaît chaque créature. Toute confusion est corrigée.
- Performance : images par seconde du combat le plus chargé pas plus de 10 % sous la mesure d'avant le sprint (seuil à confirmer en porte 0 selon la mesure).
- Aucune lueur sur une patte, aucun élément interdit du §4.6.
- Le joueur dit « oui » aux portes 0, A et B.

---

## 8. Règles de session pour Claude Code

- Une session = une phase ou un lot. Commence par relire cette fiche et `BESTIAIRE.md`.
- Ne touche pas à `main`. Ne supprime aucun tag ni aucune branche de sauvegarde.
- Ne modifie le chargeur `.vox` qu'après accord en porte 0, avec un commit à part et une mesure avant / après.
- Distingue toujours dans tes rapports ce qui est **vérifié** (mesuré, regardé, testé en jeu), **supposé**, et **pas encore vérifié**. N'affirme jamais qu'un modèle « rend bien en jeu » sans l'avoir capturé dans le jeu.
- Rapport de fin de session, court : ce qui a été fait, les planches (chemins), ce qui a échoué ou a été abandonné, les questions pour le joueur, **le tag à utiliser pour revenir en arrière**.
- Écris les rapports en français simple, sans jargon : le joueur n'est pas développeur.
