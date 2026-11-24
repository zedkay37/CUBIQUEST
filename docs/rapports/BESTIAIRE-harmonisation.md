# BESTIAIRE — harmonisation, étape 1 (modèles) — rapport

Tag `bestiaire-harmonisation`, publié sur https://zedkay37.github.io/CUBIQUEST/next/.
Pour revenir en arrière : `bestiaire-lot7`. `main` n'a pas bougé.

Ton message de porte s'arrêtait à « doublons de… » : j'ai fait l'étape 1 telle qu'elle était lisible, et je m'arrête là.

## Pour regarder

- Magmadrake au volcan : `…/next/?stage=volcano-3&squad=cailloc,granitox,magmadrake`
- Bouches de l'eau : `…/next/?stage=shore-3&squad=corallix,abyssocube,crabastion`
- Grands yeux : `…/next/?stage=stormpeak-2&squad=cumulord,glaciatitan,aetherion`
- Planches et alignements : `docs/captures/bestiaire/harmonisation/` (combats dans `jeu/`)

## Ce qui a changé

- **Magmadrake (créature-étalon)** :
  - cristal d'un **bleu saturé**, propre à lui ; la lueur pâle de la roche se lisait comme de la neige sur lui ;
  - cœur plus gros ;
  - nouvelles veines vues d'en haut : épaules, collerette, ailes.
  - Lueur 9,9 %, juste sous le plafond des boss (10 %). Rien de ce qui avait été ajouté n'est retiré.
  - En combat au volcan, les veines bleues se voient nettement (`jeu/volcan-bureau.png`).
- **Granit plus froid et plus sombre** : il ne vire plus au beige sous la lumière du volcan. Les plaques claires passent du beige à un gris froid. Cela touche les 9 créatures de roche.
- **Bouches de l'eau** :
  - Corallix, téméraire : sourire crâne, lèvre du bas ;
  - Abyssocube, grognon : coins tombants, lèvre boudeuse, un croc qui dépasse d'un côté ;
  - Crabastion, placide : grande bouche droite ;
  - Ramurgel, sérieux : ligne droite ;
  - Auroramure, sereine : coins à peine relevés.
- **Grands yeux (3 × 3)** sur les grosses formes finales : Cumulord, Glaciatitan, Amanitox, Bourgéoliath et Aetherion. Le haut de l'œil reste à la même hauteur, donc les arcades et paupières ne bougent pas.
- **Aucune autre créature n'a changé** (fichiers identiques octet pour octet).
- **Test corrigé** : le test du dépôt appliquait le plafond de 9 % à tous. Il applique maintenant 10 % aux boss, comme `npm run vox:check`.

## Alignement de tout le bestiaire

- `alignement-tout-grand.png` (38 créatures), `alignement-stade1-grand.png`, `alignement-finales-grand.png`.
- **Limite de l'outil** : au-delà d'une dizaine de créatures, la bande des silhouettes est coupée à droite. Les profils en couleur sont complets. À corriger dans l'outil si tu veux juger toutes les silhouettes d'un coup.
- **Tailles relatives** : pas d'écart choquant entre stades.
  - Les stades 1 vont de 14 à 18 blocs de haut (Psycube et Nimbulle sont les plus petits).
  - Les formes finales vont de 24 à 28 blocs.
  - Cailloc est le stade 1 le plus massif, c'est voulu (petit gardien).
- **Doublons de silhouette repérés, non corrigés** :
  - **Givrock et Psycube**, deux petites silhouettes verticales au stade 1. Elles sont d'éléments différents et le flotteur est en l'air, mais leur silhouette se ressemble.
  - **Bourgéon et Aquabloc**, deux quadrupèdes trapus de taille proche. Leurs dos diffèrent (selle de mousse, dôme de récif).

## Vérifications

- `vox:check` est vert sur 38 fichiers ;
- `npm run check` est vert (153 tests) et le golden est identique ;
- le lexique est à zéro.

## Pas encore fait

Étapes suivantes de la fiche (§6, lot final), à ton signal :
- mesure de performance sur le combat le plus chargé, en qualité normale et basse ;
- tons « neutre » et caméra plus proche (STYLES2 et STYLES3), si tu les valides.

## Questions

1. Magmadrake en bleu saturé : est-il au niveau de Cendrox ?
2. Ton message s'arrêtait à « doublons de… » : que voulais-tu ajouter ? Faut-il corriger les deux doublons repérés ?
3. Je passe à la mesure de performance, puis aux tons et à la caméra ?
