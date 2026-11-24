# BESTIAIRE — lot 6b (roche refaite) et lot 7 (psychique) — rapport

**Les 38 créatures du jeu sont maintenant des `.vox` sculptés.** `vox:check` est vert sur les 38.

## Pour revenir en arrière

- `bestiaire-lot7` : fin de ce lot.
- `bestiaire-lot6b` : roche refaite, avant le lot 7.
- `bestiaire-lot6` : la roche telle que tu l'avais vue.
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox`.

`main` n'a pas bougé. Il reste la passe d'harmonisation finale (porte B).

## Pour regarder

Le jeu en test : https://zedkay37.github.io/CUBIQUEST/next/ (sauvegarde séparée).

**Roche refaite** :
- `…/next/?stage=volcano-3&squad=cailloc,granitox,magmadrake`
- `…/next/?stage=canyon-3&squad=chevrok,mouflambre,belithan`
- `…/next/?stage=tundra-3&squad=givrock,cryolithe,glaciatitan`

**Psychique** :
- Au Sanctuaire : `…/next/?stage=sanctuary-3&squad=psycube,lunabloc,aetherion`
- Nuages à la Cime : `…/next/?stage=stormpeak-2&squad=nimbulle,cumulord,psycube`
- Sur le sable : `…/next/?stage=shore-2&squad=aetherion,cumulord,nimbulle`

**Planches** :
- `docs/captures/bestiaire/lot6b/` et `lot7/` ;
- alignements : `lot6b/alignement-roche-grand.png` et `lot7/alignement-psy-grand.png` ;
- combats : `lot6b/jeu/` et `lot7/jeu/`.

## 1. Lot 6b — roche refaite (tag `bestiaire-lot6b`, publié)

Le détail est dans `docs/rapports/BESTIAIRE-lot6b.md`. En résumé :
- **Grandes masses de couleur** : plus de gravats en points. La lueur est en lignes.
- **Gargouilles** : ailes dressées, lisibles de profil et d'en haut dès Cailloc.
- **Magmadrake** traité en pièce maîtresse.
- **Sauteurs** : droits, cornes enroulées visibles, pieds courts, toison compacte.
- **Golems** : un vrai caractère visible (frileux qui se serre dans ses bras, méfiant au sourcil levé, solennel aux yeux mi-clos).

## 2. Lot 7 — psychique (tag `bestiaire-lot7`, publié)

Deux plans de corps nouveaux : un **flotteur** et une **gelée posée**.

**Veilleur de pierre de lune** (Psycube → Lunabloc → Aetherion) :
- Le corps : il flotte (le moteur le fait planer), en goutte renversée, avec une tête ronde, des nageoires-mains et une traîne de cristal.
- Autour de lui flottent des objets immobiles, toujours en groupes : la signature.
- **Caractère** :
  - Psycube, **méticuleux** : ses cailloux sont rangés en ligne, d'un seul côté.
  - Lunabloc, **vaniteux** : menton levé, sourire de travers, croissant d'obsidienne dans le dos (pas une couronne), satellites cubiques.
  - Aetherion, **sage et distant** : yeux mi-clos, éclats géométriques en trois groupes au large.

**Gelée de nuage** (Nimbulle → Cumulord) :
- Le corps : un amas de boules de nuage, large et bas, au dessous d'orage sombre.
- **Caractère** :
  - Nimbulle, **distrait** : une paupière tombante, bouche en « o », bruine d'un côté.
  - Cumulord, **majestueux et malicieux** : sourcils d'orage, sourire en coin, bras de nuage, éclairs violets dans le ventre, petits nuages satellites (ses mirages).

**Couleurs, à valider** :
- Le corps est en **pierre de lune gris clair**, avec de grandes plaques d'**obsidienne**, au lieu d'un corps violet sombre.
- Le violet se fondait dans le sol du Sanctuaire, et un corps lavande éteignait la lueur violette. La lueur violette validée est inchangée.
- En capture, les veilleurs ressortent nettement sur le sol violet (`lot7/jeu/sanctuaire-bureau.png`).

**Chargeur** (commit à part) : seul un corps **allongé** sans pattes ondule (les serpents). Un flotteur ou une gelée reste d'un seul bloc. Les serpents et les créatures à pattes sont inchangés ; un test le vérifie.

| Créature | Stade | Taille (X×Y×Z) | Lueur | Essais |
|---|---|---|---|---|
| Psycube | 1 (trio « Marée ») | 16×9×16 | 3,6 % | 2 |
| Lunabloc | 2 (boss) | 18×13×22 | 7,0 % | 2 |
| Aetherion | final (boss) | 20×17×24 | 6,9 % | 2 |
| Nimbulle | 1 | 16×11×14 | 3,8 % | 2 |
| Cumulord | final (boss) | 20×17×25 | 5,5 % | 2 |

Vérifications :
- `vox:check` est vert sur 38 fichiers ;
- `npm run check` est vert (153 tests) et le golden est identique ;
- le lexique est à zéro.

## 3. Ce qui reste discutable

- **Lunabloc** est à 7 % de lueur, au-dessus de la cible du stade 2 (4–6 %), mais sous le plafond des boss (10 %).
- **Les veilleurs n'ont pas de pattes** : ils planent (le moteur les fait monter et descendre), sans autre animation. Leurs objets en orbite sont immobiles.
- **Les nuages ne bougent pas** non plus (gelée posée).
- **Les yeux 2 × 2** sont petits sur les grosses gelées. C'est la règle de la bible, mais Cumulord gagnerait à de plus grands yeux. À trancher pendant l'harmonisation.
- **Au volcan**, la roche prend une teinte beige sous la lumière chaude (lot 6b).

## 4. Vérifié / à vérifier

- **Vérifié** :
  - planches et alignements ;
  - combats capturés au Sanctuaire, à la Cime et sur le sable ;
  - `vox:check`, tests, golden.
- **À vérifier par toi** :
  - le vol plané en mouvement ;
  - si les caractères se lisent à la taille du combat ;
  - les FPS.

## 5. Questions pour toi

1. Lot 6b (roche refaite) : est-il au niveau ? Magmadrake te convient-il comme créature-étalon ?
2. Lot 7 : flotteur et gelée de nuage, pierre de lune grise avec obsidienne au lieu du violet sombre : d'accord ?
3. On lance la passe d'harmonisation finale ? Elle comprendrait :
   - l'alignement de tout le bestiaire ;
   - les bouches des 5 créatures d'eau qui n'en ont pas ;
   - les tailles relatives ;
   - la mesure de performance ;
   - les tons et la caméra (STYLES).
