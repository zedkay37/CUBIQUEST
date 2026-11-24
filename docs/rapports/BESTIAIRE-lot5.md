# BESTIAIRE — porte du lot 4 (corrections, règles) et lot 5 (électrique) — rapport

## Pour revenir en arrière

- `bestiaire-lot5` : fin de ce lot.
- `bestiaire-lot4` : avant ce lot.
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox`.

`main` n'a pas bougé. Le lot 6 n'est pas commencé.

## Pour regarder

- Le jeu en test : https://zedkay37.github.io/CUBIQUEST/next/ (sauvegarde séparée).
  - Serpents à la Cime des Orages : `…/next/?stage=stormpeak-3&squad=crepitil,serpeclair,tempestrix`
  - Scarabées en Prairie : `…/next/?stage=meadow-2&squad=voltik,sparkube,raicube`
  - Sur le sable : `…/next/?stage=shore-2&squad=voltik,crepitil,raicube`
  - Boucliers de feuilles : `…/next/?stage=meadow-3&squad=bourgeon,feuilloc,bourgeoliath`
- Planches du lot 5 : `docs/captures/bestiaire/lot5/` (alignement : `alignement-lot5-grand.png`).
- Les deux esquisses de champignon : `docs/captures/bestiaire/lot4b/propositions-champignon/`.

## 1. Suites de la porte du lot 4

**Boucliers de feuilles** (Feuilloc, Bourgéoliath) :
- Chaque bouclier est fait de **4 ou 5 feuilles superposées** en écailles (3 aux hanches), en **3 verts**.
- Chaque feuille a une pointe qui retombe, et une sur deux dépasse un peu : le bord est découpé.
- Planches : `docs/captures/bestiaire/lot4b/`.

**Règles ajoutées à la bible** (`docs/plan/SPRINT_BESTIAIRE.md`) :
- **§4.7 « Personnalité »**, avec tes cinq points. Elle est aussi ajoutée à la relecture des planches (§5).
- **§4.8 « Diversité »** : plus de nouvelle lignée à quatre pattes sans ton accord.
- **§4.6** : interdiction de la bête basse à six pattes qui porte des champignons.

**`vox:check`** n'exige plus la symétrie que des **pattes** et des **yeux** ; un test le vérifie dans les deux sens.
- Le recadrage des modèles reste centré : une créature au corps asymétrique garde ses yeux et ses pattes en miroir dans le fichier.
- Les 16 fichiers déjà faits n'ont pas changé d'un octet.

**Personnalité des 16 créatures déjà faites** : leur trait est écrit dans `docs/plan/BESTIAIRE.md`, avec ce qui se voit déjà et ce qui manque. Rien n'est refait.
- **Manquent nettement de caractère** : Aquabloc, Crabloc et Givrelin. Ils n'ont pas de bouche lisible et leur trait ne se voit pas.
- **Puis** : Corallix, Abyssocube, Crabastion, Ramurgel et Auroramure, qui n'ont pas de bouche.
- **Feu et sanglier** : bouche et yeux lisibles, mais sourcils et posture à pousser.

## 2. Mycélin → Amanitox : deux plans de corps à choisir

Ce sont des **esquisses** (un seul essai chacune, pour juger le plan de corps, pas le détail), rendues par le jeu. Elles ne sont pas dans le jeu.

- **A — « limace-colonie »** : rampante, sans pattes, l'avant dressé.
  - Une colonie de petits champignons (chapeaux ocre et crème) pousse en groupes sur son dos.
  - Des fils de mycélium lumineux courent sur ses flancs.
  - Mycélin est casanier : sourire, paupières lourdes. Amanitox est sage : barbe de mycélium, sourcils tombants.
  - Planches : `planche-proposition-a-mycelin-…`, `…-a-amanitox-…`.
- **B — « porteur de vesse »** : trapu sur deux jambes courtes, grosse tête basse.
  - Il porte sur le dos une **vesse-de-loup** : un champignon rond et craquelé, qui s'ouvre au sommet par un pore lumineux.
  - À la forme finale, de petites vesses lui poussent sur les épaules, en groupe asymétrique.
  - Planches : `planche-proposition-b-…`.
- **Mon avis** :
  - B se lit mieux de loin : une grosse boule claire sur le dos, visible d'en haut.
  - A est plus original, mais il est bas, donc moins lisible au combat.
  - Aucun des deux ne copie une créature connue à ma connaissance. B pourrait rappeler un porteur de sac : à toi de juger.

## 3. Lot 5 — électrique (tag `bestiaire-lot5`, publié sur /next/)

Deux plans de corps nouveaux (§4.8) : un **bipède** et un **serpentin sans pattes**.

**Scarabée-pile** (Ampoulin → Bobinard → Voltacier) :
- Le corps :
  - bipède trapu, gros abdomen au ventre de quartz strié ;
  - élytres de cuivre posés sur le dos, avec un joint lumineux en pointillé, visible d'en haut ;
  - antennes à filaments lumineux ;
  - griffes de quartz.
- Rien de fabriqué : la « pile » est le ventre, le « câble » de la fiche de Bobinard est une antenne qui traîne au sol.
- **Caractère** :
  - Ampoulin, **curieux** : sourcils hauts, bouche en « o », une antenne dressée et l'autre recourbée.
  - Bobinard, **bougon** : sourcils en V, une mandibule qui dépasse, spires de cuivre lumineuses sur les avant-bras.
  - Voltacier, **fier** : menton levé, poitrail bombé avec une fissure en V, élytres entrouverts sur des ailettes repliées.

**Serpent d'orage** (Crépitil → Serpéclair → Tempestrix) :
- Le corps : il est posé en S, l'avant dressé en col de cygne, avec un ventre en écailles de quartz et des bandes de cuivre sur le dos.
- **Caractère** :
  - Crépitil, **nerveux** : yeux grands ouverts, petite crête hérissée.
  - Serpéclair, **espiègle** : sourire de travers, une nageoire pliée, cou un peu de travers.
  - Tempestrix, **orageux** : dressé, collerette de nageoires sur les côtés du cou (pas une couronne), arcade lourde, gueule entrouverte aux crocs de quartz.
- La lueur est en points groupés sur le dos, puis sur les crêtes des nageoires, puis sur les nervures de la collerette.

**Langue « électrique »** : les couleurs validées, avec un changement à valider. Le cuivre est **réservé** aux élytres, aux spires, aux nageoires et aux bandes. Le dessus du corps est une ardoise plus claire (`#5A6584`), sinon tout le dessus devenait cuivre. Les yeux sont jaune d'orage.

| Créature | Stade | Taille (X×Y×Z) | Lueur | Cible | Essais |
|---|---|---|---|---|---|
| Ampoulin | 1 (trio de départ) | 12×11×18 | 3,2 % | 2–4 % | 3 |
| Bobinard | 2 (boss meadow-2) | 14×19×20 | 5,3 % | 4–6 % | 3 |
| Voltacier | final (boss shore-2) | 16×19×28 | 5,2 % | 5–9 % | 3 |
| Crépitil | 1 | 14×28×15 | 3,3 % | 2–4 % | 3 |
| Serpéclair | 2 (boss stormpeak-1) | 14×31×19 | 4,3 % | 4–6 % | 3 |
| Tempestrix | final (boss stormpeak-3) | 16×33×27 | 7,0 % | 5–9 % | 3 |

Vérifications :
- `vox:check` est vert sur 22 fichiers ;
- `npm run check` est vert (152 tests) et le golden est identique ;
- le lexique est à zéro.

## 4. Ce qui reste discutable (à juger par toi)

- **Serpents à la Cime** (`lot5/jeu/cime-bureau.png`) : l'ardoise du corps se distingue mal du sol gris. Seuls le cuivre et la lueur les détachent. Il faudra peut-être éclaircir le ventre ou mettre plus de cuivre.
- **Les serpents n'ont pas de pattes, donc ils ne s'animent pas** : ils glissent, raides. Les faire onduler demanderait de toucher au chargeur, ce qui exige ton accord (fiche §8).
- **Scarabées** : les élytres sont posés sur l'abdomen, mais vus de dos ils font encore un peu « sac à dos ». Ils sont moins détaillés que Cendrox.
- **Tempestrix** : son cou reste assez droit. Il faut le regarder de 3/4 en combat.
- Les essais sont gardés dans `lot5/essais1/` et `essais2/`.

## 5. Vérifié / à vérifier

- **Vérifié** :
  - planches et alignement rendus par le jeu ;
  - combats capturés à la Cime (sol du biome), en Prairie et sur le sable ;
  - `vox:check`, tests, golden.
- **À vérifier par toi** :
  - le glissement des serpents en mouvement ;
  - la démarche des scarabées ;
  - si les caractères se lisent vraiment à la taille du combat ;
  - les FPS sur ta machine.

## 6. Questions pour toi

1. Boucliers de feuilles : est-ce que ça va ?
2. Champignons : A (limace-colonie) ou B (porteur de vesse) ? Ou une autre idée ?
3. Lot 5 validé ? Ardoise plus claire et cuivre réservé : d'accord ?
4. Serpents : on accepte qu'ils glissent sans onduler, ou tu veux que je propose une petite modification du chargeur (mesurée, commit à part) ?
5. Faut-il reprendre la personnalité des créatures déjà faites (en commençant par Aquabloc, Crabloc et Givrelin) avant le lot 6 (roche, 9 créatures) ?
