# Dessiner une créature dans MagicaVoxel

Le jeu sait afficher une créature dessinée dans MagicaVoxel (fichier `.vox`) à la place de son modèle construit par le code. Elle a la même échelle, le même éclairage, les mêmes animations (marche, clignement, saut, coups reçus) et les mêmes lueurs d'élément.

Sans fichier, rien ne change : les 9 créatures refaites gardent leur modèle du code.

## Taille et orientation

- **Hauteur conseillée : 16 à 24 blocs.** Un bloc du fichier a la taille d'un bloc des créatures du code : 14 blocs font à peu près la hauteur d'un petit compagnon. Une forme évoluée peut monter à 28 ou 30 blocs.
- **Largeur** : 12 à 20 blocs. La créature est centrée automatiquement.
- **Haut** : l'axe Z de MagicaVoxel (le haut normal du logiciel).
- **Devant** : la créature regarde vers **−Y**, le côté « avant » de la vue de face de MagicaVoxel. Les yeux doivent être sur la face la plus proche de ce bord.
- Le bloc le plus bas est posé au sol. Seul le premier modèle du fichier est lu.

## Couleurs réservées (dernières cases de la palette)

Toutes les autres cases (1 à 239) sont libres et forment le corps.

| Cases | Rôle |
| --- | --- |
| 240 à 247 | **Lueur d'élément** : la partie luit dans sa propre couleur, plus fort la nuit (braise, lave, filament, bobine…) |
| 248 | **Œil** : il cligne. Les yeux de chaque côté du milieu forment l'œil gauche et l'œil droit |
| 249 | **Reflet de l'œil** : un petit bloc blanc, devant l'œil |
| 250 à 252 | **Jambe gauche** : elle marche |
| 253 à 255 | **Jambe droite** |

Conseils, qui sont les règles de style du jeu (STYLE.md) :

- 3 à 5 couleurs ;
- des yeux d'au moins 2 × 2 blocs avec un reflet ;
- une tête qui fait 30 à 40 % de la hauteur ;
- des parties épaisses (pas de pièces d'un seul bloc qui dépassent) ;
- rien qui rappelle une créature d'un autre jeu.

## Où déposer le fichier

1. Exporter depuis MagicaVoxel au format `.vox`, sans rien changer aux options.
2. Nommer le fichier avec l'**identifiant** de l'espèce, celui de `catalog.ts` : par exemple `voltik.vox` pour Ampoulin, `magmadrake.vox` pour Magmadrake.
3. Le déposer dans `src/assets/vox/`. Créer le dossier s'il n'existe pas.
4. Relancer `npm run dev`. Le modèle remplace celui du code partout dans le jeu : camp, combat, portraits.

Pour revenir au modèle du code, retirer le fichier.

Un fichier illisible est ignoré, avec un message dans la console : le jeu garde le modèle du code.

## Le voir dans `?gallery=art`

- Ouvrir `http://localhost:3000/?gallery=art`, choisir la créature, puis **« Essayer un .vox »** et prendre le fichier. Il s'affiche dans la colonne **ART 3**, à côté des versions précédentes, et tourne. Le bouton **« Silhouettes »** marche aussi.
- Rien n'est enregistré : recharger la page, ou cliquer sur « Retirer le .vox », revient au modèle du code.
- Un exemple complet (corps, tête, yeux, jambes, crête lumineuse) est généré par `npm run vox:exemple`, dans `tools/fixtures/exemple-essai.vox`. Il s'ouvre dans MagicaVoxel et sert de point de départ. Pour le voir sans rien choisir : `?gallery=art&species=voltik&vox=exemple`.

## Limites actuelles

- En qualité Basse, un modèle `.vox` n'est pas simplifié : il garde tous ses blocs.
- La variante de couleur, celle qu'on débloque pour une lignée, ne s'applique pas aux modèles `.vox`.
- Les pièces animées en plus des jambes et des yeux (queue, ailes) ne bougent pas : elles font partie du corps.
