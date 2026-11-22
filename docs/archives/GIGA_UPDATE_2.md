# GIGA UPDATE 2 — rapport de session

Branche `giga-update-2`, créée depuis `giga-update`. `main`, `sauvegarde-v1` et `giga-update` n'ont pas été touchées.
État final : `npm run check` passe (tsc, 53 tests, build).

## Corrections au rapport de la session 1

- Le rapport annonçait une victoire sur Trône de la Banquise. Mesuré avec l'outil : **0 victoire sur 40** avec la configuration d'aperçu. L'erreur venait d'un réglage sur un seul combat, dans un navigateur headless lent qui ne reproduit pas le jeu réel.
- Un fichier nommé `9000` (une capture d'écran) avait été commité par erreur à la racine. Retiré.

## Phase 0 — mise en place

- `package.json` : `esbuild` passe de `^0.25.0` à `^0.27.0`. `npm install` fonctionne sans option.
- `package-lock.json` est maintenant commité. `bun.lock` n'a pas pu être régénéré (pas de `bun` sur la machine) : il est en retard sur `esbuild`.
- Ajout de `npm run check` (tsc + tests + build) et `npm test`.

## Phase A — socle

### A1. Outil de mesure : `npm run sim`

Le vrai moteur tourne sans rendu ni navigateur, à pas fixe de 1/60 s, en « Auto Total », avec l'escouade de référence du niveau. L'aléatoire est rendu reproductible en remplaçant `Math.random` dans le processus de l'outil seulement. La passe complète (21 niveaux x 10 combats) prend environ 11 secondes.
Sortie : taux de victoire, durée totale, durée du combat de boss, durée de chaque phase, attaques télégraphiées lancées par phase, PV restants du boss sur les défaites.
L'outil reproduit les deux observations humaines : Trône de la Banquise perdu vers 0:30, et Œil du Cyclone avec un boss tué en ~15 s et des phases 2 et 3 de 4 à 5 s.
Tableaux : `docs/sim/00-reference-avant.md` (18 niveaux, état initial), `01-apres-equilibrage-*.md`, `02-fin-de-session-*.md` (21 niveaux).

### A2. Équilibrage des 6 niveaux de la session 1

Toutes les valeurs sont dans `src/game/balance.ts`. Format : PV ennemis / attaque ennemie / PV boss.

| Niveau | Ancienne valeur | Nouvelle valeur | Pourquoi |
| --- | --- | --- | --- |
| tundra-1 | 8 / 0.6 / 2.2 | 8 / 0.274 / 3.4 | boss trop court (14 s) ; allongé, coups allégés pour compenser |
| tundra-2 | 8.5 / 0.5 / 1.8 | 8.5 / 0.385 / 3.0 | idem |
| tundra-3 | 9 / 0.5 / 1.6 | 9 / 0.277 / 3.2 | 0 % de victoires, phase 3 de 2,5 s |
| stormpeak-1 | 9 / 0.48 / 2.0 | 9 / 0.438 / 4.0 | 100 % de victoires, boss de 10 s |
| stormpeak-2 | 9.5 / 0.45 / 1.8 | 9.5 / 0.385 / 2.92 | phases à allonger sans sortir de la cible |
| stormpeak-3 | 10 / 0.45 / 1.9 | 10 / 0.3 / 4.0 | phases 2 et 3 de 4 s |

AVANT (40 combats, graine 1) / APRÈS (40 combats, graine 2), en Auto. Phases = durée moyenne.

| Niveau | Victoires avant | Victoires après | Boss avant | Boss après | Phases avant | Phases après |
| --- | --- | --- | --- | --- | --- | --- |
| tundra-1 | 75 % | 63 % | 14,0 s | 23,6 s | 6,4 / 7,5 | 8,6 / 14,9 |
| tundra-2 | 88 % | 65 % | 14,0 s | 29,5 s | 7,7 / 6,3 | 12,4 / 17,1 |
| tundra-3 | 0 % | 73 % | 13,9 s | 32,3 s | 7,5 / 4,2 / 2,5 | 15,3 / 8,3 / 8,9 |
| stormpeak-1 | 100 % | 80 % | 10,0 s | 18,7 s | 5,1 / 5,0 | 9,4 / 9,3 |
| stormpeak-2 | 83 % | 73 % | 17,7 s | 28,6 s | 8,6 / 9,2 | 10,9 / 17,7 |
| stormpeak-3 | 70 % | 70 % | 14,5 s | 27,8 s | 5,9 / 4,0 / 4,6 | 12,0 / 6,5 / 9,3 |

Après réglage, le boss lance au moins une attaque télégraphiée dans chaque phase dans 100 % des combats mesurés (avant : 73 % en phase 3 de stormpeak-3).
Sur 10 combats seulement, les mêmes niveaux donnent entre 50 % et 80 % : l'échantillon de 10 est trop petit pour juger, d'où les 40.

**Limite importante.** Le taux de victoire ne varie pas en douceur : les dégâts sont arrondis et l'Auto joue de façon très régulière. Exemples mesurés : Mer de Nuages, PV boss 2.9 → 85 %, 3.0 → 43 % ; Piste des Mesas, attaque 0.70 → 95 %, 0.71 → 0 %. Les valeurs à trois décimales sont posées au milieu d'un palier. Un joueur réel, qui esquive, n'est pas sur ces paliers.

Les 12 niveaux historiques n'ont aucune entrée d'équilibrage. Un test compare leur signature (puissance, XP, Pierres, boss, niveaux et IA de chaque vague).

### A3. Bugs

Corrigés, chacun avec un test :

| Bug | Correction | Test |
| --- | --- | --- |
| Mode aperçu : « Montée de niveau » citait l'escouade de la sauvegarde | `buildPreviewSave` | `save.test.ts` « Aperçu » |
| Sac plein (48 pierres) : la plus ancienne était jetée même si elle était équipée, son bonus disparaissait | `addPowerStoneToBag` | `save.test.ts` « Sac de pierres » |
| Sauvegarde ou import avec une créature incomplète (pas de `moveStones`, grille tronquée, sort inconnu) : plantage à l'ouverture de l'équipe ou au combat | `normalizeCreature` | `save.test.ts` « créature abîmée » |
| Pierres sans `substats`, quantités négatives ou textuelles, identifiants inconnus ou en double, pierre équipée deux fois | normalisation complète dans `migrateSaveState` | `save.test.ts` (3 tests) |
| Marmite « en cuisson » avec une recette inconnue ou 0 expédition restante, quêtes mal formées | idem | `save.test.ts` « marmite et quêtes » |
| Sauvegarde illisible (JSON tronqué, version plus récente) : le jeu repartait d'une partie neuve et l'écrasait | copie brute sous la clé `cubiquest_save_unreadable_backup` | `save.test.ts` « Chargement » |
| Récompenses en double sous l'écran de fin (corrigé en session 1 sans test) | inchangé | `engine.test.ts` « envoyé qu'une seule fois » |

Corrigé sans test automatique : `PCFSoftShadowMap` (retiré de three, avertissement console) remplacé par `PCFShadowMap`, vers lequel three retombait déjà.

Audités, aucun bug trouvé (tests ajoutés dans `engine.test.ts`) : libération des géométries et matériaux au changement de scène, taille de la scène stable sur 6 allers-retours, quitter ou relancer pendant l'entrée du boss, quitter avec des télégraphes au sol, pause, animation d'évolution interrompue.

Signalés, non corrigés :

- Pendant la 1,7 s entre la bannière « VICTOIRE » et l'écran de fin, mettre en pause puis « Retour au Camp » fait perdre les récompenses. Je ne peux pas le tester sans simuler l'interface.
- En mode aperçu, « Rejouer » ou « Réessayer » relance le niveau avec l'escouade de la sauvegarde, pas celle de l'aperçu.
- Règle de réaction existante : Eau + Plante déclenche « EMBRASEMENT » (dernière ligne de `resolveElementalReaction`). Probable reliquat, mais c'est une règle de jeu : à toi de décider.
- Premier niveau du jeu (Sentier des Bourgeons) : 0 à 20 % de victoires en Auto avec l'escouade de référence. Dans les 12 niveaux historiques, les boss meurent en 0,3 à 3 s et ne lancent presque jamais d'attaque télégraphiée (`docs/sim/00-reference-avant.md`). Non touché, puisque ces niveaux sont gelés.
- « Auto Total » n'utilise jamais Dispersion (comportement d'origine).

### A4. Documentation et outillage

`CLAUDE.md` (cadre, commandes, architecture, conventions, pièges) et `npm run check`.

## Phase B — `STYLE.md`

Relevé chiffré de l'existant : silhouettes et nombre de blocs, matériaux, palettes, noms, notes, statistiques par stade et par rôle, sorts par style, structure des biomes et des boss, Marmite, ton, interface.
Les plages chiffrées existent aussi dans `src/game/styleGuide.ts` et sont vérifiées sur tout le catalogue par `style.test.ts`. Les 29 espèces et 21 sorts d'origine y passent sans exception.

## Phase C — nouveau contenu

Total : 9 Cubimons (4 lignées, 4 silhouettes), 8 sorts, 1 biome de 3 niveaux, 2 ingrédients, 1 recette. Le jeu compte 38 espèces, 29 sorts, 7 biomes, 21 niveaux, 14 ingrédients, 17 recettes. `SaveState` n'a pas changé (`SAVE_VERSION` reste 3).

| Contenu | Commit | Pour le retirer |
| --- | --- | --- |
| Lignée **Mycélin → Amanitox** (Plante, distance, champignon). Sorts Tir Sporique, Éclosion Fongique. Marmite : Bouillon Végétal, Ragoût Cubique. Rencontres : meadow-2, meadow-3, volcano-2 | `ae409de` | `git revert ae409de` |
| Lignée **Crabloc → Crabastion** (Eau, mêlée puis tank, crabe). Sorts Pince Marée, Ressac Broyeur. Marmite : Nectar des Océans, Crêpe Douceur. Rencontres : shore-1, sanctuary-1 | `2c7d45f` | `git revert 2c7d45f` |
| Lignée **Braizard → Cendrox** (Feu, mêlée, lézard). Sorts Griffe Braise, Vague de Cendres. Marmite : Soupe Ardente, Ambroisie des Légendes. Rencontres : volcano-1, sanctuary-2 | `e811ce5` | `git revert e811ce5` |
| Lignée **Chevrok → Mouflambre → Bélithan** (Roche, mêlée, bélier). Sorts Charge Cornue, Éboulis d'Ambre. Marmite : Mijoté Minéral | `dde7470` | retirer d'abord le biome, puis `git revert dde7470` |
| Biome **Canyon d'Ambre** (3 niveaux après la Cime des Orages) : décor, vent de sable, kit de boss Ambre, Figue des Mesas, Résine d'Ambre, Rôti des Mesas | `9c5b0b2` + `2c28f66` | `git revert 2c28f66 9c5b0b2` |

Les trois premières lignées se retirent chacune seule : vérifié par `git revert --no-commit <hash>` suivi des tests, pour chacune. Le biome se retire seul (ses deux commits). La lignée Chevrok est celle du biome : elle ne se retire qu'après lui. Les deux retraits enchaînés ont aussi été vérifiés avec `npm run check`.
Le second commit du biome existe parce que la première version utilisait des créatures des trois lignées de base, ce qui empêchait de les retirer.

Le kit de boss Ambre ne contient aucune attaque nouvelle. Il enchaîne l'Anneau (kit Givre), l'Aspiration (kit Orage), la double charge et les météores, avec un habillage roche et le statut existant Brise-Armure. Pour le permettre, les kits sont maintenant décrits en données (`BOSS_KITS`) ; ce refactor a été vérifié par une simulation identique avant et après sur les 6 niveaux existants.

Canyon d'Ambre en Auto (40 combats, graine 2) :

| Niveau | Réglage | Victoires | Boss | Phases |
| --- | --- | --- | --- | --- |
| canyon-1 Piste des Mesas | 10 / 0.46 / 5.4 | 78 % | 26,7 s | 12,2 / 14,5 |
| canyon-2 Arche des Fossiles | 10 / 0.322 / 4.0 | 70 % | 33,0 s | 15,4 / 17,6 |
| canyon-3 Trône d'Ambre | 10 / 0.325 / 6.0 | 70 % | 32,1 s | 15,6 / 7,6 / 8,9 |

Effet des nouvelles rencontres sur les niveaux historiques (10 combats, graine 1, avant → fin de session) : meadow-2 80 % → 100 %, meadow-3 80 % → 90 %, les dix autres inchangés. J'avais d'abord placé Mycélin dans le tout premier niveau : l'Auto y passait de 20 % à 100 %. Je l'ai retiré de ce niveau.

Galerie de revue : `?gallery=1` (commit `b85633f`). Chaque Cubimon de face et de profil, par lignée, avec stats, sort, recettes, niveaux où on le rencontre et palette ; un aperçu de chaque biome avec des liens d'aperçu vers ses niveaux.

## Phase D — interface (écrans existants uniquement)

- Nuit du camp : ciel `#0A0F24`, étoiles, lumière ponctuelle chaude autour de la marmite, éclairage ambiant fortement réduit.
- Combat sur petit écran : les cartes d'unité étaient réduites à un chiffre ; elles prennent la largeur, Dispersion et Ultime passent en dessous. Champ de vision élargi en portrait (inchangé en paysage).
- Carte des Expéditions : onglets de biomes sur une ligne défilante en mobile ; message quand un niveau est verrouillé.
- Marmite : en-tête qui ne déborde plus en mobile ; bouton désactivé libellé « Stock insuffisant ».
- Équipe : « Escouade complète », « Dernier membre », « Mauvais type », avec infobulles. Le bouton « Retirer » du dernier membre était cliquable sans effet : il est désactivé.
- Partout : soulèvement au survol, contour doré au focus clavier.
- Captures : `docs/captures/avant` et `docs/captures/apres`, bureau et mobile, avec un `README.md`.

## Ce qui reste à juger par un humain

- L'équilibrage avec esquives. Tous les chiffres sont en Auto, sans Dispersion.
- Les 4 nouvelles silhouettes et le Canyon d'Ambre : je les ai vus en vignettes fixes et sur deux captures de combat, pas en mouvement.
- Les animations propres aux nouvelles silhouettes (chapeau qui dodeline, pinces, queue et crête du lézard).
- La nuit du camp sur un vrai écran : vérifiée sur capture logicielle seulement.
- La lisibilité des télégraphes rouge sombre du kit Ambre sur le sol ocre.
- Le FPS sur un vrai GPU, le son, le survol des boutons : toujours non mesurés.
- Le choix de laisser les boss historiques mourir en 1 à 3 s.

## Comment tester

```bash
npm install
npm run check        # tsc + 53 tests + build
npm run dev          # http://localhost:3000
npm run sim          # 21 niveaux x 10 combats ; -- --brief --runs 40 --stages canyon-3 pour un niveau
```

- Galerie : `http://localhost:3000/?gallery=1`
- Aperçu d'un niveau avec son escouade de référence : `?stage=tundra-3`, `?stage=stormpeak-3`, `?stage=canyon-1`, `?stage=canyon-3`
- Aperçu avec une escouade choisie : `?stage=shore-1&squad=mycelin,crabloc,braizard&lvl=12&bonus=120`
- Camp de nuit : `?autostart=1&hour=0.8`
