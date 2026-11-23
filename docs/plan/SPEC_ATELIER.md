# SPEC ATELIER — Le hub, l'invocation et les graphismes

Spécification hors plan, en quatre sessions à enchaîner. Elle complète `docs/plan/PLAN_DIRECTEUR.md` : ses règles générales (R1 à R16) s'appliquent toutes, et les règles de cette spec priment en cas de conflit.

Décidé par le propriétaire le 23 novembre 2026, après un audit du hub (marmite, équipe, quêtes, Codex) sur la version `s07-premiers-pas`.

---

## Ce qui change par rapport au plan directeur (à lire en premier)

Le plan n'est pas supprimé. Ces décisions le modifient ; les anciennes conclusions restent dans le plan, avec ce renvoi.

| Plan directeur | Ce qui le remplace | Pourquoi |
|---|---|---|
| D1 et S08 : la Marmite remplacée par la **Confiance** (recrutement sans hasard, en battant une lignée) | Le **Cube Scellé** : une invocation au hasard, mais méritée (matière du cube selon la difficulté, jauge de garantie, appâts) | Le propriétaire veut du hasard et de la surprise, avec des créatures rares vraiment méritées. |
| S08 : le **Lien** monte avec les victoires | Le Lien monte avec les **doublons** du Cube Scellé **et** avec les victoires | Les doublons doivent être une récompense. |
| D4 et S08 : le Codex remplacé par le **Carnet** | Confirmé, et le Carnet absorbe aussi les **quêtes** et les succès, avec un **niveau de collection** | Demande du propriétaire. |
| S15 : un dock de 3 boutons | Un **hub cliquable** : les bâtiments du camp sont les menus | Une interface propre au jeu, et non des boîtes génériques. |
| S16 et S17 : les graphismes à la fin | Un sprint **Graphismes** dès maintenant (éclairage, effets, portraits 3D) | Il faut des portraits 3D pour l'Atelier et le Carnet. |

Restent inchangés : le combat, les étoiles, les leçons, les Galets et les Runes (refonte prévue en S09), la Faille (S11 et S12).

---

## Règles communes aux quatre sessions

1. **Sauvegarde avant le gros changement.** Avant toute modification, sur le commit de départ :
   - tag annoté `sauvegarde-avant-atelier`, avec le message « État du jeu avant la spec Atelier (hub, invocation, graphismes) » ;
   - branche `sauvegarde-avant-atelier` sur le même commit.
   Pousse les deux et vérifie-les avec `git ls-remote --tags origin` et `git ls-remote --heads origin`. Si l'une manque, arrête-toi et dis-le.
2. **Commit de départ** : le tag `nuit-final` s'il existe, sinon `s07-final`. Écris dans le premier rapport lequel tu as pris.
3. **Une branche par session**, chacune partant du tag final de la précédente. Ne touche pas à `main`.
4. **Un tag descriptif avant chaque section** (noms donnés dans chaque session), poussé et vérifié, avec une phrase qui décrit l'état sauvegardé. Ne regroupe jamais deux sections sous un seul tag.
5. **Golden master** : il doit rester identique dans les sessions 1, 2 et 4. Dans la session 3, s'il change, explique pourquoi dans un commit séparé (R5).
6. **Rien d'externe** : ni image, ni son, ni police, ni dépendance nouvelle. Les modules livrés avec three.js (`three/examples/jsm/...` ou `three/addons/...`) sont autorisés.
7. **Rien de payant, jamais** : aucune monnaie réelle, aucune boutique, aucune publicité.
8. À la fin de chaque session : rapport `docs/rapports/<ID>.md` (règle R15), captures avant et après dans `docs/captures/<id>/`, publication sur `…/CUBIQUEST/next/` avec `npm run deploy:pages -- --target next`.

---

## SESSION A1 — Nettoyage avant les testeurs (1 h 30)

- **Branche** : `a1-nettoyage` · **Tag final** : `a1-final`
- **But** : corriger ce qui gâcherait la première impression d'un joueur, en particulier d'un fan de Pokémon.

### A1.1 Voltik · tag `a1-avant-voltik`
- Constat : Voltik est une petite créature jaune aux joues rouges, dont la description dit qu'elle « stocke des étincelles dans ses joues carmin ». La ressemblance avec une créature très connue d'une autre licence est trop forte.
- Redessine **toute la lignée** (Voltik, Sparkube, Raicube) : une autre silhouette (par exemple une petite créature à carapace de pile, ou un oiseau-tonnerre trapu, ou un hérisson à pointes conductrices), une autre palette (pas de jaune dominant avec joues rouges ; le jaune peut rester en accent), une nouvelle description pour chaque forme, de nouveaux noms si les actuels gardent une connotation trop proche (`Raicube` en particulier).
- Garde les identifiants internes, les statistiques, les sorts et le rayon de collision : le golden master ne doit pas changer.
- Ajoute au test des mots interdits : `joues`, `pika`, `rai` en début de nom de créature.
- Relis aussi les **38 descriptions** du Codex et réécris toute phrase qui décrit une créature d'une autre licence.

### A1.2 Restes et incohérences · tag `a1-avant-restes`
- « créatures Psy » dans une recette : utilise le nom d'élément affiché actuel.
- L'ingrédient « Galet Fossile » porte le même mot que les Galets (pierres de puissance) : renomme-le « Pierre Fossile ».
- L'en-tête « JOURNAL DU CAMP · V0.2 » : retire « V0.2 ».
- « Fragment Mystiq… » coupé : aucun nom d'objet ne doit être tronqué en 1280 × 800 (réduis ou passe à la ligne).
- « coût 1 » répété sur chaque ingrédient : retire l'information quand elle est la même partout.
- Jargon de l'écran d'équipe : « VAMP. » devient « Vol de vie », « MAUVAIS TYPE » devient « Pour un autre emplacement ».
- **La touche Échap doit fermer toute fenêtre ouverte**, et cliquer sur un autre bouton du dock doit fermer la fenêtre en cours puis ouvrir la nouvelle (test).
- Le Codex ne montre plus l'icône ni les statistiques des créatures non découvertes : ombre noire et « ??? » seulement.

### A1.3 Vérification · tag `a1-avant-verification`
- `npm run lexique`, `npm run texts`, test des mots interdits, `npm run check`.
- Captures de la lignée Voltik avant et après, de la marmite, de l'équipe et du Codex.

---

## SESSION G1 — Graphismes et portraits 3D (3 h)

- **Départ** : `a1-final` · **Branche** : `g1-graphismes` · **Tag final** : `g1-final`
- **But** : rendre le jeu nettement plus beau sans le ralentir, et remplacer toutes les petites têtes 2D par de vrais portraits 3D.

### G1.1 Mesure de départ · tag `g1-avant-mesure`
- Ajoute `?bench=1` si cette page n'existe pas : 30 s d'un combat écrit à l'avance, avec affichage des images par seconde (moyenne et 5 % les plus lentes), des appels de dessin et des triangles.
- Captures de référence : camp de jour, camp de nuit, un combat dans chacun des 7 biomes, la scène d'évolution.

### G1.2 Éclairage et effets · tag `g1-avant-rendu`
- Rendu en pipeline d'effets (`EffectComposer`) :
  - **occlusion ambiante** (ombres douces dans les creux) ;
  - **halo** léger (bloom) réservé aux éléments lumineux : flammes, foudre, cristaux, cubes d'élément, projectiles ;
  - **contour fin** autour des créatures, pour les détacher du sol ;
  - **tone mapping** ACES et un léger étalonnage des couleurs par biome.
- Pour les modèles de créatures : occlusion ambiante **par bloc** calculée à la construction (chaque face légèrement assombrie selon ses voisins), sans coût par image.
- **Trois niveaux de qualité** dans les options : Bas (aucun effet), Moyen (contour, halo), Haut (tout). Par défaut, **Automatique** : passe d'un niveau à l'autre si la cadence reste sous 45 images par seconde pendant 3 s.
- Le mode headless (simulation, golden) n'active aucun effet : **le golden master doit rester identique**.

### G1.3 Portraits 3D · tag `g1-avant-portraits`
- Un module `PortraitStudio` : un second rendu, hors écran, qui photographie chaque créature (et plus tard chaque objet) en 3/4 face, sur fond transparent, avec un éclairage de studio, en 256 × 256. Les images sont produites au chargement, à la demande, puis gardées en mémoire.
- Options : portrait fixe, ou **portrait qui tourne** (une petite scène 3D, réservée aux grands affichages pour ne pas multiplier les rendus).
- Remplace **toutes** les icônes 2D de créatures : HUD de combat, équipe, Codex, choix du départ, écran de fin, arrivée d'une créature.
- Les créatures non découvertes : le même portrait, en **ombre noire unie**.

### G1.4 Vérification · tag `g1-avant-verification`
- Captures après, mêmes vues qu'en G1.1.
- Tableau des performances avant et après, pour chaque niveau de qualité (mesuré en headless quand c'est possible ; sinon dis-le, c'est le propriétaire qui lancera `?bench=1`).
- Golden master identique.

---

## SESSION A2 — Le Cube Scellé et l'Atelier (3 h 30)

- **Départ** : `g1-final` · **Branche** : `a2-atelier` · **Tag final** : `a2-final`
- **But** : remplacer la Marmite par une invocation propre au jeu, aléatoire mais méritée, avec une révélation mémorable.

### Le principe

Chaque combat peut rapporter un **Cube Scellé**. À l'**Atelier**, au centre du camp, on l'ouvre : il en sort une créature, révélée d'abord en ombre puis en couleur. Les meilleures créatures ne sortent que des cubes les plus durs à gagner. Les doublons font progresser la créature.

### A2.1 Les règles, en fonctions pures · tag `a2-avant-regles`

**Raretés des créatures.** Seules les formes de base (stade 1) sortent normalement des cubes. Répartition des 14 lignées, à placer dans `catalog.ts` (`summonRarity`) :
- **Commune** (6) : les six lignées des trios de départ (Pyrocube, Aquabloc, Bourgéon, la lignée Foudre de départ, Cailloc, Psycube) ;
- **Peu commune** (4) : Mycélin, Crabloc, Braizard, Chevrok ;
- **Rare** (4) : Givrelin, Givrock, Crépitil, Nimbulle ;
- **Forme éveillée** (spéciale) : uniquement dans un cube Prisme, une lignée déjà recrutée peut sortir directement à son **stade 2**.

**Les quatre matières de cube** (`balance.ts`, bloc `SUMMON`) :

| Matière | Comment on l'obtient (première fois) | Chances : commune / peu commune / rare / éveillée |
|---|---|---|
| **Bois** | Toute première victoire sur un niveau ; ensuite 30 % de chances par victoire | 75 / 22 / 3 / 0 |
| **Pierre** | Première victoire sur un boss de biome ; obtenir les 3 étoiles d'un niveau | 45 / 40 / 15 / 0 |
| **Cristal** | Palier de 12, 24, 36 et 48 étoiles ; première victoire sur les boss des biomes 4 à 7 | 15 / 40 / 42 / 3 |
| **Prisme** | 63 étoiles ; plus tard, la Faille (étage 20) et le défi du jour | 0 / 20 / 65 / 15 |

- Les cubes sont mis de côté dans un **inventaire de cubes** (50 au plus) ; on les ouvre quand on veut.
- **Jauge d'Éveil** : chaque ouverture qui ne donne pas de rare ajoute 10 %. À 100 %, la prochaine ouverture donne une rare (ou mieux), et la jauge repart à 0. La jauge est visible en permanence à l'Atelier.
- **Appâts** : chaque biome rapporte, à chaque première victoire de niveau, un Appât de son élément dominant. Placé dans le moule avant l'ouverture, un Appât fait que la créature tirée a 60 % de chances d'être de cet élément (si une créature de cet élément est possible dans la rareté tirée). Un Appât est consommé à l'ouverture.
- **Doublons** : un doublon donne à la lignée **+1 Lien** (★1 à ★5 ; chaque étoile : +4 % de PV et d'attaque). Au 5ᵉ doublon d'une lignée, la **variante de couleur** de cette lignée est débloquée (nouvelle palette, choisie dans l'écran d'équipe). Au-delà, un doublon remplit la jauge d'Éveil de 25 %.
- Le Lien monte aussi de 0,1 étoile par victoire avec la créature dans l'escouade (une étoile toutes les 10 victoires), sans dépasser ★5.
- Tout est déterministe à graine connue : `openSealedCube(state, cube, appât, rng)` dans `rules.ts`, avec ses tests (les tables de chances, la jauge, les appâts, les doublons, la variante au 5ᵉ doublon, la forme éveillée seulement si la lignée est recrutée).

**Calibrage, avec `npm run journey`** (parcours d'un joueur qui ouvre tous ses cubes, avec appât quand il en a) :
- les 6 communes recrutées avant la fin du biome 2 ;
- au moins 3 peu communes avant la fin du biome 4 ;
- au moins 2 rares à la fin de la campagne, en moyenne sur 20 parcours ;
- jamais plus de 4 niveaux d'affilée sans cube ni nouvelle créature.
Ajuste les taux de `SUMMON`, pas les règles.

### A2.2 La fin de la Marmite · tag `a2-avant-migration`
- Supprime la cuisine : `CookingDrawer.tsx`, recettes, paliers de chaudron, ingrédients, `resolveRecipe`, `startCookingPot`, `rollCreatureFromPot`, `collectCookedCreature`, les gains d'ingrédients en fin de combat, les quêtes et succès de cuisine.
- **Migration** (`SAVE_VERSION` + 1, testée sur trois sauvegardes : début, milieu, fin de partie) :
  - chaque tranche de 5 ingrédients d'une couleur devient 1 Appât de l'élément correspondant (rouge → Feu, bleu → Eau, jaune → Foudre, gris → Roche, et pour les ingrédients des nouveaux biomes, l'élément dominant de leur biome) ; chaque Fragment Mystique devient 1 cube Cristal ;
  - une cuisson en cours devient 1 cube Pierre ;
  - les créatures déjà possédées restent ; chaque doublon existant d'une lignée devient +1 Lien.
- Écran unique au premier lancement après migration : « La Marmite devient l'Atelier », en cinq lignes, avec ce que le joueur a reçu.
- Ajoute au test des mots interdits : `marmite`, `chaudron`, `recette`, `ingrédient`, `cuisson`.

### A2.3 L'Atelier · tag `a2-avant-atelier`
- Au centre du camp, la marmite devient l'**Atelier** (modèle voxel neuf, dans le style de `STYLE.md`) : un établi de pierre avec un **moule** lumineux au centre, des outils, des cubes empilés autour. La nuit, le moule éclaire le camp.
- L'écran de l'Atelier :
  - à gauche, l'**inventaire de cubes**, chaque cube affiché en portrait 3D selon sa matière ;
  - au centre, le **moule** : on y glisse (ou on clique) un cube et, si on le veut, un Appât ;
  - à droite, la **jauge d'Éveil** et les chances affichées pour le cube choisi (transparence totale) ;
  - un gros bouton « Ouvrir ».
- Modèles voxel des quatre cubes : **Bois** (planches et clous), **Pierre** (blocs gravés), **Cristal** (translucide, lueur bleue), **Prisme** (facettes irisées, petits éclats en orbite). Les Appâts : un petit objet voxel par élément.

### A2.4 La révélation · tag `a2-avant-revelation`
Composant `SummonReveal`, réutilisable, environ 6 s, que l'on peut accélérer en maintenant le clic (sauf la toute première fois).
1. **Le cube** se pose dans le moule, la caméra se rapproche, le décor s'assombrit.
2. **Les coups** : le joueur tape sur le cube (clic, toucher, ou Espace) ; trois coups, et des fissures lumineuses s'ouvrent à chaque coup. Elles sont blanches ; leur **couleur de rareté** n'apparaît qu'au troisième coup (gris, vert, bleu, or).
3. **L'éclatement** : le cube explose en blocs, qui volent, ralentissent et **se réassemblent en une ombre noire** : la silhouette exacte de la créature, construite à partir de ses vrais blocs. Seul son **symbole d'élément** s'affiche sous l'ombre.
4. **Le suspense** : l'ombre tourne lentement pendant 1,2 s, roulement de tambour (son produit par code), petites particules de la couleur de la rareté.
5. **La couleur** remonte **bloc par bloc, des pieds à la tête**, avec un tintement à chaque rangée ; la créature saute, regarde le joueur, son nom s'affiche en grand.
6. **Le résultat** : « Nouvelle créature ! » (avec son ajout au Carnet) ou, pour un doublon, la jauge de Lien qui se remplit d'une étoile ; « Variante débloquée ! » au 5ᵉ doublon ; « Forme éveillée ! » pour un cube Prisme.
- Effets plus forts selon la rareté (plus de particules, son plus riche, léger ralenti pour une rare, flash doré pour une forme éveillée).
- Avec `prefers-reduced-motion` : fondu simple de l'ombre vers la couleur, sans explosion.
- Le premier cube est **donné après le premier boss** (il remplace l'arrivée scriptée du premier compagnon de S07 : ce cube contient forcément la lignée prévue).

### A2.5 Vérification · tag `a2-avant-verification`
- Tests des règles, de la migration et de l'unicité des lignées dans l'équipe.
- `npm run journey` : les cibles de A2.1, tableau dans le rapport.
- La page `?gallery=reveal` rejoue la révélation pour chaque rareté et pour un doublon.
- Golden master identique (le combat n'a pas changé).

---

## SESSION A3 — Le hub vivant, le Carnet et l'équipe (3 h 30)

- **Départ** : `a2-final` · **Branche** : `a3-hub` · **Tag final** : `a3-final`
- **But** : faire du camp lui-même le menu, et remplacer le Codex et les quêtes par un Carnet de collection qui récompense.

### A3.1 Le hub cliquable · tag `a3-avant-hub`
- Quatre lieux du camp deviennent les menus. Au survol (ou au premier toucher sur téléphone), le lieu s'illumine, sa caméra s'approche légèrement et son nom s'affiche ; au clic, l'écran correspondant s'ouvre.
  - **Le panneau de l'île** → la carte des expéditions ;
  - **L'Atelier** → l'invocation ;
  - **La tente** → l'équipe ;
  - **La bibliothèque** (nouveau modèle voxel : étagère de livres-cubes) → le Carnet.
- Une pastille flotte au-dessus d'un lieu quand il y a du nouveau (un cube à ouvrir, un palier de collection à réclamer…).
- Le dock de boutons du bas disparaît sur bureau. Il reste, plus petit, sur téléphone et pour la navigation au clavier (accessibilité).
- Les compagnons du camp vont et viennent entre les lieux.

### A3.2 Le Carnet · tag `a3-avant-carnet`
Il remplace le Codex et l'écran des quêtes.
- **Créatures** : les 38 formes, en portraits 3D, groupées par lignée. Une forme jamais vue apparaît en **ombre noire** avec « ??? » ; vue au combat mais pas possédée, en ombre avec son nom ; possédée, en couleur, avec ses étoiles de Lien et sa variante si elle est débloquée. Fiche détaillée : portrait qui tourne, élément, rôle, sort, description, « Où la rencontrer ».
- **Collection** : un **niveau de collection** qui monte avec des points : nouvelle forme possédée (10), évolution vue (5), étoile de Lien (3), variante débloquée (8), Rune débloquée (5), exploit réussi (4). Des paliers de récompenses, réclamés d'un clic : cubes (Bois, Pierre, Cristal, puis Prisme), Appâts, titres et cadres. Barre et prochain palier toujours visibles.
- **Exploits** : les anciens succès, regroupés par thème (combat, collection, exploration), avec récompenses en points de collection et en cubes.
- **Les quêtes tournantes sont supprimées** (migration : les récompenses en attente sont accordées).
- **Éléments** : la table des forces et faiblesses, illustrée.
- **Sauvegarde et journal** : l'export du journal de test et de la sauvegarde y restent accessibles.

### A3.3 L'écran d'équipe · tag `a3-avant-equipe`
- À gauche, le **trio** en grands portraits 3D, le premier marqué « Meneur » avec l'effet de son Déchaînement.
- Au centre, la créature choisie en **grand modèle 3D qui tourne**, avec seulement : nom, niveau, élément, rôle, étoiles de Lien, sort et ce qu'il fait. Un bouton « Détails » déplie les statistiques, les Runes et les Galets.
- En bas, la **réserve**, en portraits triés par élément ; glisser ou cliquer pour échanger.
- Une ligne résume le trio : éléments, Trio possible ou non, effet du Déchaînement.
- Choix de la **variante de couleur** quand elle est débloquée.

### A3.4 Vérification · tag `a3-avant-verification`
- Navigation complète au clavier et au toucher ; Échap ferme toujours.
- Aucun texte coupé de 360 × 640 à 2560 × 1440 ; zones cliquables d'au moins 44 px sur téléphone.
- Captures avant et après de tous les écrans du hub.
- Golden master : identique, sinon explication (règle 5).

---

## Hors périmètre de toute la spec
- Le combat, ses règles et son équilibrage.
- Le deck de cartes, la Faille, le multijoueur, les nouvelles créatures (hors refonte de la lignée Foudre de départ).
- Toute boutique ou monnaie réelle.

## Contrôle du propriétaire, à la fin des quatre sessions (20 minutes)
1. En navigation privée, nouvelle partie jusqu'au premier boss : le premier cube s'ouvre-t-il avec émotion ?
2. Ouvre 5 cubes (avec `?gallery=reveal` si besoin) : la révélation en ombre donne-t-elle envie d'en ouvrir un autre ?
3. Le camp : trouves-tu chaque menu en cliquant sur les lieux, sans aide ?
4. Le Carnet : as-tu envie de remplir les ombres ?
5. Les graphismes : le jeu est-il plus beau ? Reste-t-il fluide sur ton PC et ton téléphone (`?bench=1`) ?
6. La nouvelle lignée Foudre : fait-elle encore penser à une autre licence ?

FIN DE LA SPEC ATELIER
