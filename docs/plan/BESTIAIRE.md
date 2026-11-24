# BESTIAIRE — inventaire et propositions (phase 0, 23/11/2026)

Tout ce qui vient du jeu (identifiants, noms, éléments, lignées, stades, ennemis, boss) est lu dans `src/game/catalog.ts`. Les colonnes « plan de corps », « signature » et « priorité » sont des **propositions à valider**.

## Ce que dit le code

- **38 créatures**, en **14 lignées**, sur **6 éléments** : feu, eau, plante, électrique, roche, psychique.
- Il n'y a **ni ennemi à part, ni boss à part** : les ennemis et les boss sont les créatures du joueur.
  - Un ennemi est dessiné à 0,96 fois la taille de son espèce, un boss à 1,48 fois (`engine/actors.ts`).
  - Refaire les 38 créatures refait donc aussi tous les ennemis et tous les boss.
- **Aucun légendaire** dans le jeu. Le stade le plus haut est « final » (rare). **Calcinarque n'existe pas dans le jeu** : il n'existe que dans la page d'essai `?gallery=styles`.
- **Combat le plus chargé** : 3 alliés et 3 ennemis à la fois (vagues de 2 à 3 ennemis ; la dernière vague contient le boss).
- **Taille actuelle** : `largeur X × longueur Y × hauteur Z`, en blocs de fichier .vox (14 blocs par unité de forme, comme le chargeur).
  - Pour les 9 créatures refaites aux sprints ART, ce sont leurs vrais blocs.
  - Pour les 29 autres (ancien modèle en gros pavés), c'est leur boîte englobante convertie en blocs.

## Inventaire

| identifiant | nom affiché | élément | lignée | stade | taille actuelle (X×Y×Z) | plan de corps proposé | signature de lignée | priorité |
|---|---|---|---|---|---|---|---|---|
| pyrocube | Pyrocube | feu | Pyrocube | 1 (trio de départ « Braise ») | 16×15×22 | bipède dressé, trapu | braise au poitrail | 2 |
| flambrix | Flambrix | feu | Pyrocube | 2 | 18×18×24 | bipède dressé, épaules hautes | braise → cornes de braise | 2 |
| ignisaur | Ignisaur | feu | Pyrocube | final (rare ; boss volcano-2, sanctuary-2) | 18×21×23 | bipède massif, ailes repliées plaquées | plaques de lave sur le dos | 2 |
| braizard | Braizard | feu | Braizard | 1 | 17×37×12 | quadrupède bas et fin (type « Coureur de Cendres ») | fente de lave dans la gueule | **1 (pilote)** |
| cendrox | Cendrox | feu | Braizard | final (rare) | 17×37×13 | quadrupède prédateur (= **Calcinarque légendaire**, à confirmer) | fissures, cornes incandescentes, ligne dorsale | **1 (pilote)** |
| aquabloc | Aquabloc | eau | Aquabloc | 1 (trio de départ « Marée ») | 17×19×14 | « bœuf de récif » : quadrupède trapu à carapace en bandes, tête basse sous un bouclier de nacre | dôme de récif, bourgeon de corail, un joint lumineux | **1 (pilote)** |
| corallix | Corallix | eau | Aquabloc | 2 (boss shore-1) | 17×19×14 | bœuf de récif, pattes plus hautes | branches de corail sur les épaules, joints et bord de carapace lumineux | **1 (pilote)** |
| abyssocube | Abyssocube | eau | Aquabloc | final (rare ; boss shore-3) | 17×19×14 | colosse de récif, coudes sortis | flèches de corail en deux rangées, veines et gorge lumineuses des abysses | **1 (pilote)** |
| crabloc | Crabloc | eau | Crabloc | 1 | 24×20×17 | large et bas, à pinces | pinces | 3 |
| crabastion | Crabastion | eau | Crabloc | final (rare) | 27×24×17 | forteresse à pinces | pinces → tourelles de carapace | 3 |
| bourgeon | Bourgéon | plante | Bourgéon | 1 (trio « Marée ») | 17×17×18 | quadrupède trapu | bourgeon sur le dos | 4 |
| feuilloc | Feuilloc | plante | Bourgéon | 2 (boss meadow-1) | 17×17×18 | quadrupède trapu | bourgeon → feuilles | 4 |
| bourgeoliath | Bourgéoliath | plante | Bourgéon | final (rare ; boss meadow-3) | 17×17×18 | colosse quadrupède, dos-jardin | feuilles → arbre sur le dos | 4 |
| mycelin | Mycélin | plante | Mycélin | 1 | 17×17×19 | trapu à chapeau (champignon) | chapeau | 4 |
| amanitox | Amanitox | plante | Mycélin | final (rare) | 21×17×19 | trapu à chapeau, plus menaçant | chapeau → spores lumineuses | 4 |
| voltik | Ampoulin | électrique | Ampoulin | 1 (trio « Braise ») | 14×17×18 | petit bipède à antennes (pas de machine) | filament | 5 |
| sparkube | Bobinard | électrique | Ampoulin | 2 (boss meadow-2) | 18×19×21 | bipède à bobines | filament → bobines | 5 |
| raicube | Voltacier | électrique | Ampoulin | final (rare ; boss shore-2) | 18×20×23 | bipède à ailettes repliées | bobines → ailettes | 5 |
| crepitil | Crépitil | électrique | Crépitil | 1 | 17×36×16 | serpentin | arcs le long du dos | 5 |
| serpeclair | Serpéclair | électrique | Crépitil | 2 (boss stormpeak-1) | 17×42×17 | serpentin | arcs → nageoires d'éclair | 5 |
| tempestrix | Tempestrix | électrique | Crépitil | final (rare ; boss stormpeak-3) | 24×47×18 | serpentin dressé | nageoires → couronne d'orage (sans couronne au sens propre) | 5 |
| cailloc | Cailloc | roche | Cailloc | 1 (trio « Braise ») | 16×12×19 | colosse voûté (marche sur les poings) | fissure au front | 6 |
| granitox | Granitox | roche | Cailloc | 2 (boss volcano-1) | 22×14×23 | colosse voûté | fissure → épaules de granit | 6 |
| magmadrake | Magmadrake | roche | Cailloc | final (rare ; boss volcano-3, canyon-2) | 22×24×25 | colosse voûté, veines de magma (plus d'« ours assis ») | épaules → veines de magma | 6 |
| chevrok | Chevrok | roche | Chevrok | 1 | 17×23×17 | quadrupède grimpeur | cornes enroulées | 6 |
| mouflambre | Mouflambre | roche | Chevrok | 2 (boss canyon-1) | 17×23×17 | quadrupède grimpeur | cornes plus grandes | 6 |
| belithan | Bélithan | roche | Chevrok | final (rare ; boss canyon-3) | 17×23×19 | bélier colosse | cornes en spirale massives | 6 |
| givrock | Givrock | roche | Givrock | 1 | 25×17×23 | golem dressé | glace dans la roche | 6 |
| cryolithe | Cryolithe | roche | Givrock | 2 (boss tundra-2) | 25×17×24 | golem dressé, bras énormes | glace → pics de givre | 6 |
| glaciatitan | Glaciatitan | roche | Givrock | final (rare ; boss tundra-3) | 25×17×24 | titan dressé | pics → glacier sur les épaules | 6 |
| psycube | Psycube | psychique | Psycube | 1 (trio « Marée ») | 21×19×20 | flotteur | œil-cristal | 7 |
| lunabloc | Lunabloc | psychique | Psycube | 2 (boss sanctuary-1) | 21×19×20 | flotteur | cristal → croissant | 7 |
| aetherion | Aetherion | psychique | Psycube | final (rare ; boss sanctuary-3) | 21×19×20 | grand flotteur à éclats en orbite (statiques) | croissant → éclats | 7 |
| nimbulle | Nimbulle | psychique | Nimbulle | 1 | 19×18×20 | gelée posée au sol | bulle intérieure | 7 |
| cumulord | Cumulord | psychique | Nimbulle | final (rare ; boss stormpeak-2) | 19×18×23 | gelée colosse | bulle → nuage d'orage intérieur | 7 |
| givrelin | Givrelin | eau | Givrelin | 1 | 17×23×28 | quadrupède haut sur pattes (cervidé) | bois de glace | 3 |
| ramurgel | Ramurgel | eau | Givrelin | 2 (boss tundra-1) | 17×23×29 | quadrupède haut | bois plus grands | 3 |
| auroramure | Auroramure | eau | Givrelin | final (rare) | 17×23×33 | quadrupède haut, port de tête | bois → aurore (lueur) | 3 |

Remarques :

- **Toutes les espèces sont aussi des ennemis.** La colonne « stade » ne cite que les boss.
- **Des tailles actuelles sortent des limites du §4.2** : Crépitil, Serpéclair, Tempestrix et Braizard sont plus longs que 34 ; Givrelin et sa lignée sont plus hauts que 30. Les nouveaux modèles devront rentrer dans les limites, ou obtenir ton accord.

## Lots proposés

| Lot | Contenu | Créatures |
|---|---|---|
| 1 — pilote | Braizard → Cendrox (feu, quadrupède, avec le Calcinarque légendaire) + Aquabloc → Corallix → Abyssocube (eau, carapace, 3 stades, trio de départ) | 5 |
| 2 — feu | Pyrocube → Flambrix → Ignisaur | 3 |
| 3 — eau | Crabloc → Crabastion, Givrelin → Ramurgel → Auroramure | 5 |
| 4 — plante | Bourgéon → Feuilloc → Bourgéoliath, Mycélin → Amanitox | 5 |
| 5 — électrique | Ampoulin → Bobinard → Voltacier, Crépitil → Serpéclair → Tempestrix | 6 |
| 6 — roche | Cailloc → Granitox → Magmadrake, Chevrok → Mouflambre → Bélithan, Givrock → Cryolithe → Glaciatitan | 9 |
| 7 — psychique | Psycube → Lunabloc → Aetherion, Nimbulle → Cumulord | 5 |
| Final | harmonisation, planche d'alignement de tout le bestiaire, mesure finale | — |

Il n'y a pas de lot « ennemis et boss » séparé : ce sont les mêmes modèles.

## Langue de matière par élément (proposition, à valider avant chaque lot)

| Élément | Matière | 3 couleurs de corps | 3 couleurs de lueur |
|---|---|---|---|
| Feu | basalte brun-noir, croûte de cendre, corne claire | `#1F1B1E` `#41372F` `#6E5B4C` (corne `#D2BFA6`) | `#FF3D00` `#FF6A00` `#FFB300` |
| Eau | roche de récif bleu-gris, nacre | `#1C2A36` `#2F4C5E` `#5E8597` (nacre `#E3DCCB`) | `#00C2A8` `#3DF2D0` `#B8FFF0` (turquoise des abysses) |
| Plante | écorce, mousse, bois clair | `#24301E` `#3E5A2E` `#6E8F45` (bois `#C9B48A`) | `#5BE33B` `#A8F05A` `#EFFFB0` (spores) |
| Électrique | ardoise, cuivre, quartz | `#1E2230` `#3A4157` `#B87333` (quartz `#E8E4D8`) | `#2D7BFF` `#6FC3FF` `#E6F7FF` (arc bleu-blanc) |
| Roche | granit gris, cristal froid | `#26262A` `#4A4A50` `#7C7A76` (os `#CFC6B4`) | `#9FB8D8` `#CFE0F2` `#F4F8FF` (cristal froid, blanc bleuté peu saturé ; validé le 23/11 à la place de l'ambre) |
| Psychique | pierre de lune, obsidienne violette | `#1E1A2E` `#3B3357` `#6E6496` (nacre `#E6E0F5`) | `#7B2FFF` `#B07CFF` `#EBD9FF` |

**Décisions du joueur (23/11)** : gradation par stade de la fiche validée ; couleurs des éléments validées ; la roche passe d'une lueur ambre à une lueur froide. Entre jade et cristal froid, j'ai choisi le **cristal froid** (blanc bleuté peu saturé) : un jade (vert) serait trop proche du turquoise de l'eau et du vert-jaune de la plante. Magmadrake est de la **roche** dans le jeu (pas du feu) : son plan de corps (colosse voûté) est déjà distinct de Cendrox (quadrupède prédateur) ; ses veines de magma deviendront du cristal froid, à confirmer au lot roche.

**Lignée « Calcinarque »** = Braizard → Cendrox (validé le 23/11). Braizard part du Coureur de Cendres, adouci pour un stade 1 ; Cendrox reprend le Calcinarque légendaire de référence.

## Lot 4 (plante), 24/11/2026 — à valider

- **Bourgéon → Feuilloc → Bourgéoliath : « sanglier-souche »** (quadrupède trapu en coin, garrot haut, tête basse, groin, défenses de bois). Remplace « quadrupède trapu, bourgeon sur le dos → arbre sur le dos », trop proche de créatures connues (bulbe ou arbre sur le dos). Signature : oreilles-feuilles et selle de mousse → boucliers de feuilles aux épaules → racines aux pattes, arceaux de racines et pousses en groupes, grandes défenses.
- **Mycélin → Amanitox** : essai « porteur de polypores » (bipède, champignons en étagères) refusé après 3 essais ; le jeu garde l'ancien modèle. Brouillon : `tools/vox-studio/brouillons/`.
- **Langue « plante » ajustée** : corps en écorce brun sombre `#1A1712` `#3A2F23` `#5C4B36` (bois `#C9B48A`), mousse `#4A6B2A` et feuilles `#2E8040` en touches, lueur des spores inchangée, yeux ambre `#FFB02E`. Raison : le vert mousse validé se fondait dans l'herbe de la Prairie vue d'en haut (§4.5).
- **Lot 3b** : la lignée glace a un indice de givre (`#93BDD0`) et des sabots sombres (`#141C24`).
