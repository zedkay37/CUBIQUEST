# BESTIAIRE — porte du lot 5 (lot 5b) et lot 6 (roche) — rapport

## Pour revenir en arrière

- `bestiaire-lot6` : fin de ce lot.
- `bestiaire-lot5b` : corrections du lot 5, avant le lot 6.
- `bestiaire-lot5` : le lot 5 tel que tu l'avais vu.
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox`.
- L'ondulation des serpents est un commit à part (`chargeur .vox : une creature sans pattes…`) : on peut l'annuler seul.

`main` n'a pas bougé. Il reste le lot 7 (psychique, 5 créatures), puis l'harmonisation finale.

## Pour regarder

Le jeu en test : https://zedkay37.github.io/CUBIQUEST/next/ (sauvegarde séparée).

**Lot 5b** :
- Serpents qui ondulent à la Cime : `…/next/?stage=stormpeak-3&squad=crepitil,serpeclair,tempestrix`
- Scarabées à la Cime : `…/next/?stage=stormpeak-2&squad=voltik,sparkube,raicube`
- Champignons : `…/next/?stage=meadow-2&squad=mycelin,amanitox,bourgeon`
- Aquabloc, Crabloc, Givrelin : `…/next/?stage=shore-1&squad=aquabloc,crabloc,givrelin`

**Lot 6** :
- Gargouilles au volcan : `…/next/?stage=volcano-3&squad=cailloc,granitox,magmadrake`
- Bondisseurs au canyon : `…/next/?stage=canyon-3&squad=chevrok,mouflambre,belithan`
- Golems en toundra : `…/next/?stage=tundra-3&squad=givrock,cryolithe,glaciatitan`
- Sur le sable : `…/next/?stage=shore-2&squad=magmadrake,belithan,glaciatitan`

**Planches** :
- `docs/captures/bestiaire/lot5b/` et `lot6/` ;
- alignement de la roche : `lot6/alignement-roche-grand.png` ;
- combats : `lot5b/jeu/` et `lot6/jeu/`.

## 1. Lot 5b (tag `bestiaire-lot5b`, publié sur /next/)

**Électrique à la Cime** : ce n'est plus du gris sur gris.
- Bandes de cuivre plus larges : une mante sur les épaules des scarabées, deux rangs sur cinq sur le dos des serpents.
- Éclairs cyan visibles d'en haut : un zigzag sur chaque élytre et sur le crâne, des traits obliques sur le dos des serpents.
- Capturé à la Cime (`cime-serpents`, `cime-scarabees`) et sur le sable (`rive-electrique`).

**Ondulation des serpents** (commit à part) :
- Une créature **sans pattes** est coupée en 6 tranches derrière le cou, et le moteur les fait onduler. Il savait déjà le faire pour les anciens serpents.
- La tête et le cou restent fixes, pour que les yeux ne se détachent pas.
- **Les autres créatures sont identiques au pixel près** : 5 planches avant / après (Cendrox, Aquabloc, Givrelin, Ampoulin, Bourgéoliath), 0 pixel différent. Captures dans `lot5b/chargeur/`.
- **Coût mesuré** : par serpent, 6 morceaux à dessiner en plus et 12 % de triangles en plus (Tempestrix : 3 600 → 4 092).
- Un test le vérifie.

**Mycélin → Amanitox, « porteur de vesse »** :
- Le corps : bipède lourdaud, dos voûté sous une vesse-de-loup craquelée au pore lumineux, jambes très courtes (petits pas), petits bras posés sur le ventre. Ce n'est pas le colosse d'Abyssocube : rien n'est puissant, tout pèse vers le bas.
- Mycélin est **placide et douillet** : grosse tête ronde, petit nez, yeux mi-clos.
- Amanitox est **vénérable et lourdaud** : paupières lourdes, babine, sourcils et barbe de mycélium, petites vesses en grappe sur une seule épaule, mousse sur les pieds.
- En Prairie, la vesse crème se voit de loin (`lot5b/jeu/prairie-champignon-bureau.png`).

**Personnalité reprise** :
- **Aquabloc, placide** : sourire, lèvre du bas, un brin d'algue mâchonné, balanes sur le dôme.
- **Crabloc, farceur** : grand sourire, une pince levée pour saluer.
- **Givrelin, timide** : petite bouche serrée, une oreille tombante.
- Les autres créatures de ces lignées n'ont pas bougé : leurs fichiers sont identiques.

## 2. Lot 6 — roche (tag `bestiaire-lot6`, publié sur /next/)

Trois plans de corps, **aucun à quatre pattes** (règle de diversité). Ce sont des choix de ma part, à valider :

| Lignée | Plan de corps | Caractère |
|---|---|---|
| Cailloc → Granitox → **Magmadrake** | **gargouille** (volant replié) : accroupie, ailes de pierre repliées très haut sur le dos | brave petit gardien → impassible → hautain |
| Chevrok → Mouflambre → Bélithan | **bondisseur** (bipède sauteur) : grosses cuisses, longs pieds, queue en trépied, tête de bélier | casse-cou → chaleureux (toison, cornes d'ambre) → fier-à-bras (corne ébréchée) |
| Givrock → Cryolithe → Glaciatitan | **golem de banquise** (trapu dressé, dos droit) | frileux et grognon (poings joints) → méfiant (poing levé, stalactites) → solennel (barbe de glaçons, glacier) |

- **Chevrok** était « quadrupède grimpeur » dans l'inventaire : je l'ai passé en bipède sauteur pour respecter la règle de diversité.
- **Magmadrake** : ses veines sont en cristal froid (décision du 23/11), et ce n'est plus un « ours assis ».

**Contraste** :
- Le granit gris ressort sur le sol brun du volcan, sur l'orange du canyon, sur la neige et sur le sable.
- La **lueur de cristal** est un peu moins blanche que la langue validée. Au volcan, le blanc pur faisait un halo qui noyait les modèles (première capture, remplacée).

| Créature | Taille (X×Y×Z) | Lueur | Essais |
|---|---|---|---|
| Cailloc | 14×19×15 | 3,6 % | 1 |
| Granitox (boss) | 18×22×19 | 5,2 % | 1 |
| Magmadrake (boss) | 20×26×25 | 6,7 % | 1 |
| Chevrok | 12×19×18 | 3,5 % | 2 |
| Mouflambre (boss) | 12×19×21 | 4,7 % | 2 |
| Bélithan (boss) | 18×26×25 | 6,3 % | 2 |
| Givrock | 16×10×17 | 2,9 % | 1 |
| Cryolithe (boss) | 18×13×19 | 5,1 % | 1 |
| Glaciatitan (boss) | 20×12×26 | 6,0 % | 1 |

Vérifications :
- `vox:check` est vert sur **33 fichiers** (il reste les 5 créatures psychiques) ;
- `npm run check` est vert (153 tests) et le golden est identique ;
- le lexique est à zéro.

## 3. Ce qui reste discutable (à juger par toi)

- **Bondisseurs** :
  - de profil, ils ressemblent encore un peu aux gargouilles (penchés, avec une queue) ;
  - la toison blanche de Mouflambre et de Bélithan prend beaucoup de place ;
  - les longs pieds à plat font un peu « skis ».
- **Gargouilles** : les ailes repliées se lisent peu à la taille du combat, surtout sur Cailloc (petits moignons).
- **Niveau de détail** : la roche n'a eu qu'un ou deux essais par créature. Les formes et les caractères sont là, mais le détail reste en dessous de Cendrox. La passe d'harmonisation pourra y revenir.
- **Ampoulin** est à 5,7 % de lueur, au-dessus de la cible du stade 1 (2–4 %), à cause des éclairs demandés pour le contraste. Braizard (6 %) avait déjà fait la même exception.

## 4. Vérifié / à vérifier

- **Vérifié** :
  - planches, alignement ;
  - combats capturés sur le sol de chaque biome et sur le sable ;
  - pixels identiques des créatures à pattes après la modification du chargeur ;
  - `vox:check`, tests, golden.
- **À vérifier par toi** :
  - l'ondulation des serpents en mouvement ;
  - les démarches (petits pas du porteur de vesse, sauts du bondisseur) ;
  - si les caractères se lisent à la taille du combat ;
  - les FPS.

## 5. Questions pour toi

1. Lot 5b validé (contraste électrique, ondulation, champignons, personnalités) ?
2. Lot 6 : gargouille, bondisseur et golem te vont-ils comme plans de corps ? Chevrok passé en bipède, d'accord ?
3. Lueur de la roche un peu moins blanche : d'accord ?
4. Lot 7 (psychique : Psycube → Lunabloc → Aetherion, Nimbulle → Cumulord) à ton signal.
