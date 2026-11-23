# SPRINT ART — La révolution graphique

Fiche hors plan, à exécuter après A4. Les règles générales du plan directeur (R1 à R16) et les règles communes de `docs/plan/SPEC_ATELIER.md` s'appliquent toutes.

- **Départ** : `a4-final`
- **Branche** : `art-direction`
- **Tag final** : `art-final`
- **Durée visée** : 4 h
- **Ne touche pas à `main`.**

## Sauvegarde avant le gros changement

Avant toute modification : tag annoté **et** branche `sauvegarde-avant-art`, sur `a4-final`, avec le message « État du jeu avant la révolution graphique ». Pousse les deux et vérifie-les avec `git ls-remote`. Si l'un manque, arrête-toi.

## But

Le propriétaire trouve le jeu « pas encore beau, trop basique ». Le moteur n'est pas en cause : ce sont les modèles (quelques gros pavés), le décor (sol plat en damier) et l'animation (raide). Ce sprint transforme la direction artistique, d'abord sur **un biome (la Prairie) et trois lignées de départ**, pour que le propriétaire juge sur pièces avant de tout généraliser.

## Règles propres à ce sprint

1. **Aucune règle de jeu ne change.** Le rayon de collision, les statistiques, les vagues et les sorts restent identiques. Le golden master doit rester identique ; si une construction de modèle consomme des tirages aléatoires et le change, isole-la (générateur à part) au lieu de réenregistrer.
2. **Tout reste produit par code**, sans fichier externe. Exception prévue en section 6 : le chargement de fichiers `.vox` dessinés à la main, pour plus tard.
3. **La fluidité reste une contrainte** : les trois niveaux de qualité de G1 s'appliquent. En qualité Bas, le jeu doit rester aussi léger qu'aujourd'hui.
4. **Captures avant et après** de chaque section, dans `docs/captures/art/avant/` et `docs/captures/art/apres/`, mêmes noms.

## Section 0 · Navigation latérale du camp · tag `art-avant-navigation`

Demande directe du propriétaire : les nouveaux joueurs ne savent pas quel bâtiment ouvre quoi.
- Une **barre latérale** discrète, à gauche, toujours visible au camp : une icône et un nom par lieu (Expéditions, Atelier, Équipe, Carnet, puis Options).
- Au survol d'une entrée, le bâtiment correspondant s'illumine dans le camp, et inversement : survoler un bâtiment met son entrée en avant. Le joueur apprend ainsi le camp tout seul.
- Un clic sur une entrée ouvre l'écran comme un clic sur le bâtiment. Les pastilles « Nouveau » apparaissent aux deux endroits.
- Sur téléphone, la barre devient une rangée d'icônes en bas (elle remplace le dock actuel) ; au clavier, elle est le premier élément atteint par Tab.
- La barre peut être repliée en icônes seules ; ce choix est mémorisé.

## Section 1 · Des créatures plus fines · tag `art-avant-creatures`

- Un constructeur **« volumes → blocs »** (`models/voxelSculpt.ts`) : une créature se décrit par des formes simples (ellipsoïdes, capsules, boîtes arrondies, cônes), avec symétrie et formes soustractives ; le programme les convertit en blocs à une résolution donnée, ne dessine que les faces visibles, et calcule l'ombre douce par bloc.
- Règles de style, vérifiées par un test : aucune partie de moins de 2 blocs d'épaisseur ; tête entre 30 et 40 % de la hauteur ; yeux d'au moins 2 × 2 blocs avec reflet blanc ; 3 à 5 couleurs.
- **Yeux vivants** : clignement toutes les 3 à 6 s, regard qui suit la cible en combat.
- Refais avec ce constructeur les **trois lignées du trio Braise** (Pyrocube, Ampoulin, Cailloc, et leurs évolutions), en gardant leur identité (couleurs, traits signature). Chaque évolution doit rester reconnaissable comme membre de sa lignée et passer le test de lisibilité des évolutions s'il existe.
- Budget : au plus 2 500 blocs visibles par créature en qualité Haut, avec une version simplifiée automatique en qualité Bas.

## Section 2 · Un décor vivant (la Prairie) · tag `art-avant-decor`

- **Relief** : le sol n'est plus plat en damier. Petites collines et creux autour de l'arène (la zone de combat reste plate et de même taille), bordures en terrasses, chemins de terre.
- **Végétation** : touffes d'herbe et fleurs instanciées qui ondulent au vent, arbres de 4 à 5 formes différentes avec feuillages en plusieurs blocs, buissons, rochers moussus.
- **Eau** : un ruisseau ou une mare en bord d'arène, avec reflets et petites vaguelettes animées.
- **Vie** : papillons ou lucioles selon l'heure, pollen dans la lumière.
- Tout cela décoratif, instancié, sans collision, et réduit automatiquement en qualité Bas.

## Section 3 · L'animation · tag `art-avant-animation`

- **Squash and stretch** : les créatures s'écrasent avant un saut et s'étirent en l'air ; elles « respirent » au repos.
- **Impact des coups** : bref arrêt sur image déjà présent, plus un recul visible et un éclat de blocs de la couleur de l'élément ; les K.O. se défont en blocs qui rebondissent.
- **Démarches** différentes selon l'archétype (sautillante, lourde, flottante).
- **Caméra** : léger mouvement d'accompagnement en combat, zoom bref sur le Déchaînement.

## Section 4 · La lumière · tag `art-avant-lumiere`

- **Ciel** en dégradé avec quelques nuages voxel qui dérivent ; soleil rasant le matin et le soir au camp.
- **Ombres** plus douces et mieux résolues sur la zone visible ; ombre de contact sous chaque créature.
- **Brume légère** à l'horizon et rayons de lumière (en qualité Haut).
- Étalonnage de la Prairie revu avec ces nouveaux éléments.

## Section 5 · Comparaison et mesure · tag `art-avant-comparaison`

- Page `?gallery=art` : pour chaque créature refaite, l'ancien et le nouveau modèle côte à côte, qui tournent ; un bouton « silhouettes ».
- Captures avant et après : camp de jour, camp de nuit, combat dans la Prairie, combat de boss dans la Prairie, chaque créature refaite.
- Appels de dessin et triangles avant et après, pour chaque niveau de qualité, dans le rapport.

## Section 6 · Préparer les modèles faits à la main (optionnel, si le temps le permet) · tag `art-avant-vox`

- Le jeu sait charger un modèle `.vox` (format de MagicaVoxel) à la place d'un modèle produit par code, pour une espèce donnée, en gardant ses animations de base.
- Documente dans `docs/art/modeles-vox.md` comment ajouter un modèle dessiné à la main (taille, origine, palette, points d'attache).
- Ne fournis aucun modèle `.vox` toi-même.

## Hors périmètre

- Les autres biomes et les autres créatures : ils seront refaits dans un second sprint si le propriétaire valide ce résultat.
- Toute règle de jeu et tout équilibrage.

## Rapport

`docs/rapports/ART.md` selon la règle R15, avec en plus le tableau avant/après des captures et des performances, et la liste de ce que tu n'as pas pu voir en mouvement.

## Contrôle du propriétaire (15 minutes)

1. Le camp avec la barre latérale : comprends-tu tout de suite où aller ?
2. Un combat dans la Prairie : le jeu te paraît-il nettement plus beau ? Est-ce encore « basique » ?
3. `?gallery=art` : les trois lignées refaites sont-elles plus belles et toujours reconnaissables ?
4. `?bench=1` sur ton PC et ton téléphone : est-ce toujours fluide ?
5. Verdict : on généralise à tout le jeu, on ajuste, ou on rediscute du moteur ?

FIN DU SPRINT ART
