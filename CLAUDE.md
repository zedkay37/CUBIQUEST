# CubiQuest — guide de travail

RPG 3D voxel (React 19 + Three.js + Vite + Tailwind 4) : un trio de créatures-cubes, des expéditions courtes en temps réel. Textes du jeu en français.
Tout le contenu est 100 % original : aucun nom, terme, recette ni design repris d'un autre jeu (test des mots interdits : `npm run lexique`).

## Cadre du projet

Le cadre du projet est `docs/plan/PLAN_DIRECTEUR.md`. Il autorise les changements de mécanique décrits dans ses fiches, et seulement ceux-là.

### Lancer une session

Le plan se lit dans le dépôt ; une session se lance avec un prompt court (modèle complet : partie 7 du plan).

1. Dans PowerShell : `cd $HOMEdevelopmentCUBIQUEST`, puis `claude --permission-mode auto`.
2. Coller le prompt de lancement de la partie 7 en changeant le numéro de session (`S04`, `S05`...). À partir de la deuxième session, y ajouter la validation de la session précédente (« avance `main` sur le tag `sNN-final` ») et les retours de jeu.
3. La session lit, dans l'ordre : « Règles générales pour Claude Code » (partie 7, R1 à R16), le lexique (5.12), sa fiche (partie 8), puis les sections que la fiche demande. Si la fiche ne se termine pas par « — FIN DE LA FICHE Sxx — », elle s'arrête.
4. Elle travaille sur la branche de la fiche depuis le tag de départ, pose un tag `sNN-avant-<section>` avant chaque section et `sNN-final` à la fin, puis écrit `docs/rapports/SNN.md`.
5. `main` n'avance que lorsque le propriétaire a validé la session (porte ou contrôle de la fiche).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm install` | Installation (npm ; `bun` n'est pas requis) |
| `npm run dev` | Serveur Express + Vite sur http://localhost:3000 |
| `npm run check` | `tsc --noEmit` + tous les tests + golden master + `vite build`. **À lancer avant chaque commit.** La même commande tourne sur GitHub (`.github/workflows/check.yml`). |
| `npm test` | Tests seuls (`src/game/*.test.ts`, runner `node:test` via `tsx`) |
| `npm run golden` | Golden master : rejoue 840 combats à graine fixe, échoue à la moindre différence (voir plus bas) |
| `npm run sim` | Mesure d'équilibrage : combats headless sur le vrai moteur (voir plus bas) |
| `npm run texts` | Liste les textes visibles restés en dur dans l'interface |
| `npm run lexique` | Compte, fichier par fichier, les termes venus d'autres jeux (liste : `tools/lexiqueCore.ts`). Doit rester à zéro ; le test `lexique.test.ts` le vérifie. |
| `npm run census -- <niveau>` | Compte les maillages d'une scène sans navigateur (nombres reproductibles, pour comparer avant / après) |

URL utiles en développement (aucune ne touche à la sauvegarde) :

- `?stage=<id>` : lance un niveau avec son escouade de référence. Options : `&squad=a,b,c&lvl=N&bonus=N`.
- `?gallery=1` : galerie de revue (toutes les créatures en 3D + aperçu des biomes).
- `?autostart=1&hour=0.8` : camp à une heure donnée (0 aube · 0.3 jour · 0.66 crépuscule · 0.8 nuit).
- `?debug=1` : overlay de diagnostic (FPS, temps d'image, draw calls, triangles, géométries, textures, particules, entités). Se combine avec les autres. Détail des lignes dans `README.md`.

## Architecture

```
src/i18n/fr.ts             TOUS les textes visibles par le joueur. Données pures, n'importe rien.
src/game/types.ts          Types partagés (SaveState, SpeciesDef, StageDef...). Aucune logique.
src/game/catalog.ts        DONNÉES : espèces, sorts, pierres, ingrédients, recettes, biomes, niveaux, quêtes, succès.
src/game/balance.ts        ÉQUILIBRAGE des niveaux récents (multiplicateurs par niveau, kits de boss). Seul endroit à régler.
src/game/previewConfigs.ts Escouades de référence par niveau (mode aperçu + simulation).
src/game/rules.ts          RÈGLES PURES, sans DOM ni Three : dégâts, recettes, évolutions, récompenses, sauvegarde/migrations.
src/game/legacyIds.ts      Anciens identifiants des sauvegardes (tables de conversion). Seul fichier du jeu qui a le droit de les citer.
src/game/settings.ts       Options de confort (hors SaveState).
src/game/audio.ts          Sons synthétisés (WebAudio), aucun fichier audio.
src/game/VoxelEngine.ts    FAÇADE du moteur : état partagé, construction de la scène, API publique.
src/game/engine/           Logique du moteur, un module par responsabilité (carte ci-dessous).
src/game/voxelModels.ts    Point d'entrée des modèles (réexporte src/game/models/).
src/game/models/           Modèles voxel procéduraux (carte ci-dessous).
src/game/styleGuide.ts     Plages chiffrées de STYLE.md, vérifiées par style.test.ts.
src/game/galleryRenderer.ts Vignettes de la galerie `?gallery=1` (outil de développement).
src/game/*.test.ts         rules, save, engine (moteur headless), style, lineage-* et biome-* (un fichier par ajout de contenu).
src/components/            Interface React (HUD, tiroirs du camp, modales). L'état de jeu vit dans App.tsx.
src/App.tsx                Colle React <-> moteur. Le canvas WebGL est monté une seule fois.
tools/sim.ts               Outil `npm run sim`.
tools/golden.ts            Outil `npm run golden`.
tools/simFight.ts          Un combat headless (commun à sim et golden) : profils « auto » et « joueur actif ».
tools/texts.ts             Outil `npm run texts`.
tools/lexique.ts           Outil `npm run lexique` ; `tools/lexiqueCore.ts` porte la liste des mots interdits (partagée avec le test).
tools/census.ts            Outil `npm run census`.
tools/headlessDom.ts       Faux DOM + aléatoire à graine pour faire tourner le moteur sous Node.
docs/sim/                  `golden-master.json` et tableaux de mesure de la session en cours.
docs/plan/                 PLAN_DIRECTEUR.md : le cadre du projet et les fiches de session.
docs/rapports/             Un rapport par session (`SNN.md`).
docs/archives/             Comptes rendus, tableaux de mesure et captures des sessions précédentes.
```

Flux de données : `i18n/fr` -> `catalog` + `balance` -> `rules` (pur) -> `VoxelEngine` + `engine/*` (simulation + rendu) -> `App` -> composants.
Le moteur ne connaît pas React : il reçoit des données et rappelle `onHudUpdate` / `onExpeditionComplete`.

### Carte du moteur (`src/game/engine/`)

Chaque module exporte des fonctions qui reçoivent le moteur en premier argument (`self: VoxelEngine`). L'état vit dans la classe `VoxelEngine` ; ses champs sont publics pour ces modules uniquement (l'interface et les outils passent par les méthodes publiques).

| Module | Rôle |
| --- | --- |
| `types.ts` | Types internes : acteur de combat, projectile, télégraphe, particule, télémétrie, options. |
| `constants.ts` | Tailles des pools, durées, tables d'effets, de météo et d'éclairage, tampons de calcul partagés. |
| `loop.ts` | Boucle : cadence d'affichage et pas de jeu `advance` (commun au temps réel et au headless). |
| `camera.ts` | Cadrage selon le format d'écran, suivi de l'escouade, tremblement. |
| `atmosphere.ts` | Météo du biome, éclairage, éclairs, cycle jour/nuit du camp. |
| `camp.ts` | Scène du camp, marmite, promeneurs ; `clearGroup` / `disposeObject`. |
| `evolution.ts` | Séquence d'évolution jouée au camp. |
| `expedition.ts` | Départ, vagues, pas de combat (`updateExpedition`), défaite / victoire, envoi du résultat. |
| `allies.ts` | Alliés : déplacement, attaque de base, sort automatique. |
| `enemies.ts` | IA des ennemis : poursuiveur, tireur, chargeur, boss (déplacement, jetons d'attaque). |
| `boss.ts` | Entrée en scène du boss et attaques télégraphiées (patterns 0 à 5, pilotés par `BOSS_KITS`). |
| `skills.ts` | Commandes du joueur : sort d'un allié, Esquive, ultime. |
| `damage.ts` | Résolution d'un coup : faiblesses, statuts, réactions, boucliers, K.O., phases du boss. |
| `actors.ts` | État commun des acteurs, pose animée des modèles, recherche de cible, disparition. |
| `fx.ts` | Particules, projectiles, ondes de choc, télégraphes au sol, confettis. |
| `hud.ts` | Instantané de combat envoyé à l'interface. |
| `debug.ts` | Mesures de l'overlay `?debug=1`. |

### Carte des modèles (`src/game/models/`)

| Module | Rôle |
| --- | --- |
| `shared.ts` | Textures générées une fois, brique `makeBox`. |
| `creatures.ts` | Créatures par silhouette (`archetype`), barre de vie. |
| `campProps.ts` | Marmite et totem du camp. |
| `biomes.ts` | Sol, décor instancié et éléments propres à chaque biome. |
| `floatingText.ts` | Texte flottant (pool fixe). |

## Règle du golden master

`npm run golden` rejoue, à graine fixe, tous les niveaux x 2 profils (« auto », « joueur actif ») x réactions (avec, sans) x 10 combats, et compare chaque combat à `docs/sim/golden-master.json` : vainqueur, durée, PV restants, dégâts, phases de boss, attaques télégraphiées, nombre de tirages aléatoires, somme de contrôle des instantanés HUD.

- **Changement technique** (rangement, performance, outillage, textes déplacés) : le golden doit rester identique. S'il change, la modification a changé le jeu : l'annuler (`git checkout .`) et recommencer plus petit.
- **Changement de jeu voulu** (équilibrage, contenu, règle) : réenregistrer avec `npm run golden -- --record` et committer le fichier AVEC le changement, en le disant dans le message de commit.
- Le golden ne voit que la simulation. Il ne voit ni le rendu, ni le son, ni les textes : pour ceux-là, captures d'écran et relecture.
- « Sans réactions » passe par l'option de moteur `reactions: false`, réservée aux outils. Il n'existe pas de paramètre d'URL pour couper les réactions en jeu.

## Conventions

- **Contenu retirable** : tout nouveau contenu respecte `STYLE.md`. Un commit par lignée et un commit par biome : insérer chaque lignée à un endroit DIFFÉRENT des fichiers partagés (jamais deux ajouts sur des lignes voisines), lui donner son propre fichier de test, ne pas la référencer depuis une autre lignée ou un autre biome, puis vérifier avec `git revert --no-commit <hash> && npm run check`.
- **Data-driven** : une créature, un sort ou un niveau s'ajoute dans `catalog.ts`. Le moteur ne doit pas contenir de cas particulier par espèce ; les différences passent par des champs (`archetype`, `stage`, `bossKit`...).
- **Textes** : tout texte visible vit dans `src/i18n/fr.ts` (`FR.ui.<composant>`, `FR.engine`, `FR.rules`, `FR.balance`, `FR.catalog.<TABLE>.<id>`). Un texte à trous est une fonction (`FR.ui.teamDrawer.nivRequis(niveau)`). Pour une nouvelle créature : ses données dans `catalog.ts`, son nom et ses descriptions dans `fr.ts`. Les noms propres du jeu (`GAME_TITLE`, `WORLD_NAME`, `CREATURE_NOUN`) sont des constantes en tête de `fr.ts` : ne jamais les réécrire en dur dans un texte. `npm run texts` doit rester à zéro. Trois fichiers gardent leurs textes en place : `CodexDrawer.tsx` (Codex, non modifié par prudence), `GalleryPage.tsx` et `DebugOverlay.tsx` (outils de développement).
- **Règles pures testées** : toute nouvelle règle va dans `rules.ts` avec un test. Les fonctions qui tirent au hasard prennent un `rng` en paramètre (défaut `Math.random`) pour être testables.
- **Moteur** : une nouvelle fonction va dans le module de `engine/` dont c'est le rôle, sous la forme `export function nom(self: VoxelEngine, ...)`. Viser moins de 800 lignes par fichier.
- **Sauvegarde** : si la forme de `SaveState` change, incrémenter `SAVE_VERSION` (4 aujourd'hui), compléter `migrateSaveState` et tester depuis toutes les versions précédentes (`saveV3.fixture.ts` est une vraie sauvegarde v3). Un identifiant renommé s'ajoute à `legacyIds.ts` : une ancienne sauvegarde se charge toujours, un identifiant inconnu est ignoré sans erreur. Les quêtes en cours reprennent textes et récompense de leur modèle au chargement. `migrateSaveState` normalise TOUT ce qu'il lit (créatures, pierres, marmite, quêtes) : y ajouter chaque nouveau champ. La clé de stockage ne change pas.
- **Identifiants** en `snake_case` anglais ou sans accent (`glacier_crash`, `givrelin`) ; noms affichés en français.
- **Vocabulaire** : celui du lexique du plan (section 5.12) : Esquive (`dodge`), Rune (`rune_*`, `RuneKind`, `runeBag`), Déchaînement, le Camp, Galets (affichage des `powerStone*`), Fragment Mystique. Aucun terme venu d'un autre jeu : `lexique.test.ts` échoue sinon.
- **Performance** : géométries/matériaux partagés, `InstancedMesh` pour tout ce qui se répète, pools à taille fixe (particules 320, météo 96, éclairs 6, texte flottant 28). Tout objet retiré de la scène passe par `disposeObject()`. Mesurer avec `?debug=1` avant et après.
- **Accessibilité** : respecter `prefers-reduced-motion` ; le tremblement de caméra se désactive.
- Commentaires : expliquer le pourquoi, en français comme le reste du projet.

## Équilibrage avec `npm run sim`

```bash
npm run sim                                    # tous les niveaux x 10 combats, tableau Markdown
npm run sim -- --brief --runs 40 --stages tundra-3,stormpeak-3
npm run sim -- --stages tundra-3 --set tundra-3=9/0.28/3.2   # essai SANS toucher balance.ts (PV ennemis / attaque / PV boss)
npm run sim -- --seed 2 --out docs/sim/mon-tableau.md
npm run sim -- --profile active                # profil « joueur actif » : sorts et ultime dès que prêts, Esquive sur télégraphe
npm run sim -- --reactions 0                   # réactions élémentaires coupées (option d'outil)
```

- Le vrai `VoxelEngine` tourne sans rendu, à pas fixe de 1/60 s, avec l'escouade de `previewConfigs.ts`. La passe complète (21 niveaux x 10 combats) prend environ 11 secondes.
- L'aléatoire est rendu reproductible en remplaçant `Math.random` dans le processus de l'outil uniquement. Le jeu n'est pas modifié.
- Cibles pour un nouveau niveau : 50 à 85 % de victoires en « auto » ; chaque phase de boss assez longue pour qu'il y lance au moins une attaque télégraphiée (colonne « ≥ 1 attaque » à 100 %).
- Les 12 niveaux historiques (Prairie -> Sanctuaire) ne se rééquilibrent pas : un test vérifie leur signature (puissance, XP, Pierres, boss, niveaux et IA des vagues). Changer l'ESPÈCE d'un ennemi y reste possible, mais remesurer : sur le tout premier niveau, un seul échange faisait passer l'Auto de 20 % à 100 %.
- Kits de boss : `BOSS_KITS` (balance.ts) décrit la rotation des 6 attaques existantes et leur habillage. Un nouveau kit se compose là, sans toucher au moteur.
- « Auto Total » n'utilise jamais l'Esquive : un joueur qui esquive fait mieux que le tableau. Le profil « joueur actif » est un script simple, pas un vrai joueur.

## Pièges connus

- **Effet de seuil de l'équilibrage** : les dégâts sont arrondis et les combats en Auto très réguliers. Un multiplicateur qui bouge de 3 % peut faire passer un niveau de 85 % à 43 % de victoires. Toujours vérifier sur plusieurs graines (`--seed 1`, `2`, `3`) avec au moins 40 combats.
- **Un seul combat ne prouve rien.** La session 1 avait réglé les niveaux sur un combat chacun dans un navigateur headless lent : le résultat ne tenait pas (un niveau annoncé gagné était perdu à 100 %).
- Le navigateur headless ne reflète pas de façon fiable la vitesse ni l'issue des combats réels (selon la machine et la session, il tourne en rendu logiciel à ~10 images/s ou en accéléré à 60). Pour l'équilibrage, utiliser `npm run sim` ; le navigateur headless ne sert qu'aux captures d'écran, aux compteurs de `?debug=1` (draw calls, triangles) et à vérifier l'absence d'erreur console. Les FPS se mesurent sur une vraie machine.
- **Tirages aléatoires et golden** : les effets visuels (particules, météo, tremblement) tirent dans le même `Math.random` que le combat, et three.js y tire aussi l'identifiant (UUID) de chaque objet, géométrie ou matériau créé. Ajouter, retirer ou déplacer un tirage, ou créer un objet three.js de plus ou de moins pendant un combat, change donc le golden, même si rien ne change à l'écran. Une optimisation de rendu doit créer exactement les mêmes objets, ou être traitée comme un changement de jeu (golden réenregistré, validé par un humain).
- **Retirer un contenu d'avant la session « Fondations »** : les `git revert <hash>` listés dans `docs/archives/GIGA_UPDATE_2.md` entrent en conflit depuis le découpage du moteur et le déplacement des textes. Une lignée se retire à la main : ses entrées dans `catalog.ts` et `i18n/fr.ts`, sa branche dans `models/creatures.ts`, son cas dans `engine/actors.ts` (`animateRigPose`), son fichier de test. La règle « un commit par lignée » reste valable pour tout nouveau contenu.
- `VoxelEngine` continue de tourner sous l'écran de fin (fête de victoire). Le verrou `resultSent` empêche de redemander l'écran de fin : ne pas le retirer (test dédié).
- **Victoire acquise** : les récompenses sont attribuées par `onVictorySecured`, appelé une seule fois à l'instant où le dernier ennemi tombe (verrou `victorySecured`). `onExpeditionComplete` arrive après la fête et ne fait qu'afficher l'écran de fin ; il n'attribue les récompenses que pour une défaite. Ne jamais remettre l'attribution d'une victoire dans `onExpeditionComplete` : une pause suivie d'un retour au camp pendant la bannière les faisait perdre (tests « Victoire: ... » de `engine.test.ts`). Une fois la victoire acquise, la pause ne propose plus que « Reprendre ».
- Changer de scène : `loadCampScene` et `startExpedition` doivent remettre à zéro tout état d'animation (entrée de boss, évolution, télégraphes). Tout nouvel état transitoire doit y être réinitialisé, et couvert dans `engine.test.ts`.
- Les modules de `engine/` s'importent les uns les autres en cercle : c'est sans danger tant qu'ils n'exécutent rien au chargement. Ne pas y ajouter de code de premier niveau qui appelle un autre module.
- Le sac de Pierres est limité à 48 : passer par `addPowerStoneToBag`, qui ne retire jamais une pierre équipée.
- `catalog.ts` importe `balance.ts` : `balance.ts` ne doit rien importer du catalogue. `i18n/fr.ts` n'importe rien.
- Deux fichiers de verrouillage coexistent : `package-lock.json` (npm, à jour, utilisé par la CI) et `bun.lock` (hérité, pas régénéré faute de `bun` sur la machine de développement).
- Sous Windows / Git Bash : ne jamais passer du code contenant des backticks à `node -e "..."` (le shell les exécute). Écrire un fichier de script à la place.

## Ce qu'un humain doit juger

Les tests, le golden et la simulation ne voient pas : la fluidité réelle (FPS, à lire avec `?debug=1`), le son, la lisibilité des télégraphes, le plaisir de jeu, la beauté des modèles. Après un changement visuel ou sonore, le signaler dans le rapport de session plutôt que de le déclarer validé.
