# CubiQuest — guide de travail

RPG 3D voxel (React 19 + Three.js + Vite + Tailwind 4) : un trio de créatures-cubes, des expéditions courtes en temps réel. Textes du jeu en français.
Tout le contenu est 100 % original : aucun nom, terme, règle ni design repris d'un autre jeu (test des mots interdits : `npm run lexique`).

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
| `npm run dev` | Serveur Express + Vite sur http://localhost:3000 (seul moyen d'utiliser l'onglet du Professeur, avec `VITE_AI_CODEX=1`) |
| `npm run dev:static` | Vite seul, sans serveur : le jeu tel qu'il est mis en ligne |
| `npm run deploy:pages -- --target next\|root` | Met la branche courante en ligne sur GitHub Pages (`next` : `…/CUBIQUEST/next/`, sauvegarde séparée ; `root` : racine). `--dry-run` pour essayer. Ne touche qu'à la branche `gh-pages`, par un worktree temporaire. |
| `npm run check` | `tsc --noEmit` + tous les tests + golden master + `vite build`. **À lancer avant chaque commit.** La même commande tourne sur GitHub (`.github/workflows/check.yml`). |
| `npm test` | Tests seuls (`src/game/*.test.ts`, runner `node:test` via `tsx`) |
| `npm run golden` | Golden master : rejoue 840 combats à graine fixe, échoue à la moindre différence (voir plus bas) |
| `npm run sim` | Mesure d'équilibrage : combats headless sur le vrai moteur (voir plus bas) |
| `npm run journey` | Parcours complet sur le vrai moteur depuis une sauvegarde neuve (profil actif ; `--profile`, `--seed`, `--xp-scale`, `--out`). Parties par niveau, première évolution. Reproductible. |
| `npm run journal -- fichier.json` | Résume un journal de test exporté depuis les options du jeu (victoires, relances, gestes, niveaux qui bloquent, leçons ratées). |
| `npm run texts` | Liste les textes visibles restés en dur dans l'interface |
| `npm run vox:build` | BESTIAIRE : régénère `src/assets/vox/<id>.vox` depuis `tools/vox-studio/species/<id>.ts` (déterministe) ; `-- --references` vérifie que le portage TypeScript de voxlib redonne les .vox de référence octet pour octet |
| `npm run vox:check [fichiers]` | BESTIAIRE : relit chaque .vox (lecteur indépendant) : version, bornes, z = 0, symétrie, yeux, pas de lueur sur une patte, dimensions |
| `npm run vox:planche [ids] [--lot nom=a,b] [--fichier ref:espece]` | BESTIAIRE : planches rendues par le jeu (`?gallery=planche`) dans `docs/captures/bestiaire/` |
| `npm run vox:exemple` | Génère le modèle MagicaVoxel d'essai `tools/fixtures/exemple-essai.vox` (ART 3, voir `docs/guide-vox.md`) |
| `npm run lexique` | Compte, fichier par fichier, les termes venus d'autres jeux (liste : `tools/lexiqueCore.ts`). Doit rester à zéro ; le test `lexique.test.ts` le vérifie. |
| `npm run census -- <niveau>` | Compte les maillages d'une scène sans navigateur (nombres reproductibles, pour comparer avant / après) |

URL utiles en développement (aucune ne touche à la sauvegarde) :

- `?stage=<id>` : lance un niveau avec son escouade de référence. Options : `&squad=a,b,c&lvl=N&bonus=N`.
- `?gallery=1` : galerie de revue (toutes les créatures en 3D + aperçu des biomes).
- `?autostart=1&hour=0.8` : camp à une heure donnée (0 aube · 0.3 jour · 0.66 crépuscule · 0.8 nuit).
- `?bench=1` : mesure de 30 s d'un combat à graine fixe (images/s moyennes et 5 % les plus lentes, appels de dessin, triangles). `&quality=low|medium|high` impose la qualité.
- `?gallery=styles` : Magmadrake et Calcinarque (légendaire d'essai, hors du jeu, sprint STYLES3) en vingt styles A à T (exploration ; `src/components/styles/`, créature courante dans `subject.ts`) ; `&creature=calcinarque`, `&angle=face|profil`, `&silhouette=1`, `&compare=magmadrake:C,calcinarque:O`, favoris et classement, `&compare=C,O`, `&focus=O` (plein écran). Planche des captures : `tools/planche.ps1`. Vues Vitrine / En jeu, interrupteurs de rendu propres à la page (`&view=jeu&tone=aucun|neutre&sat=1&aa=2&cam=proche&nuit=1&compare=C`). Ne touche pas au jeu.
- `?banc=controle` (`&variante=0|A|B|C|hasard`) : banc d'essai n° 1, le geste de combat (`src/proto/banc/`, mode d'emploi `docs/proto/BANC_CONTROLE.md`) ; essais et grille sous les clés `cubiquest_proto_banc_*`.
- `/proto/` (ou `?proto=accueil`) : page d'accueil PROTO-MODELES, tous les modèles de jeu (A à H) ; `?proto=donjon&modele=C` en joue un ; `&vitrine=1` rejoue les effets de chaque élément, `&effets=0` les coupe. Robots : `npx tsx tools/proto-modeles-robots.ts`.
- `?proto=donjon` : maquette PROTO-DONJON, 3 étages générés par graine (`src/proto/donjon/`), panneau F1 ; réglages dans l'adresse (`docs/proto/REGLAGES.md`), `&etage=3`, `&robot=adaptatif|esquive-seule|…`. Robots : `npx tsx tools/proto-donjon-robots.ts`.
- `?proto=salle` : maquette du sprint PROTO-MENEUR (`src/proto/`, simulation à part, ne touche ni au jeu ni à la sauvegarde ; `&version=A|B`, `&robot=presse-tout|rotation|adaptatif`). Robots : `npx tsx tools/proto-robots.ts`. Publication : `npm run deploy:pages -- --target proto` (dossier `proto/` seul).
- `?gallery=art` : créatures refaites, ancien et nouveau modèle côte à côte (bouton « Silhouettes »).
- `?debug=1` : overlay de diagnostic (FPS, temps d'image, draw calls, triangles, géométries, textures, particules, entités). Se combine avec les autres. Détail des lignes dans `src/game/engine/debug.ts`.

## Architecture

```
src/i18n/fr.ts             TOUS les textes visibles par le joueur. Données pures, n'importe rien.
src/game/types.ts          Types partagés (SaveState, SpeciesDef, StageDef...). Aucune logique.
src/game/catalog.ts        DONNÉES : espèces, sorts, pierres, raretés d'invocation, biomes, niveaux, exploits (succès, par thème).
src/game/balance.ts        ÉQUILIBRAGE des niveaux récents (multiplicateurs par niveau, kits de boss), points et paliers de collection. Seul endroit à régler.
src/game/previewConfigs.ts Escouades de référence par niveau (mode aperçu + simulation).
src/game/rules.ts          RÈGLES PURES, sans DOM ni Three : dégâts, évolutions, récompenses, sauvegarde/migrations (règles du Cube Scellé : `summon.ts` ; niveau de collection du Carnet : `collection.ts`).
src/game/legacyIds.ts      Anciens identifiants des sauvegardes (tables de conversion). Seul fichier du jeu qui a le droit de les citer.
src/game/settings.ts       Options de confort (hors SaveState).
src/game/audio.ts          Sons synthétisés (WebAudio), aucun fichier audio.
src/game/VoxelEngine.ts    FAÇADE du moteur : état partagé, construction de la scène, API publique.
src/game/engine/           Logique du moteur, un module par responsabilité (carte ci-dessous).
src/game/voxelModels.ts    Point d'entrée des modèles (réexporte src/game/models/).
src/game/models/           Modèles voxel procéduraux (carte ci-dessous).
src/game/styleGuide.ts     Plages chiffrées de STYLE.md, vérifiées par style.test.ts.
src/game/portraitStudio.ts  Portraits 3D des créatures (rendu hors écran, cache) utilisés par toutes les icônes.
src/game/galleryRenderer.ts Vignettes de la galerie `?gallery=1` (outil de développement).
src/game/*.test.ts         rules, save, engine (moteur headless), style, lineage-* et biome-* (un fichier par ajout de contenu).
src/components/            Interface React (HUD, tiroirs du camp, modales). L'état de jeu vit dans App.tsx. Le Carnet (`CarnetDrawer.tsx` + `CarnetSave.tsx`) remplace le Codex et l'écran des quêtes : créatures, collection, exploits, éléments, sauvegarde et journal (et le Professeur avec `VITE_AI_CODEX=1`).
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
| `camp.ts` | Scène du camp, atelier central, promeneurs ; `clearGroup` / `disposeObject`. |
| `evolution.ts` | Séquence d'évolution jouée au camp. |
| `expedition.ts` | Départ, vagues, pas de combat (`updateExpedition`), défaite / victoire, envoi du résultat. |
| `allies.ts` | Alliés : déplacement, attaque de base, sort automatique. |
| `enemies.ts` | IA des ennemis : poursuiveur, tireur, chargeur, boss (déplacement, jetons d'attaque). |
| `boss.ts` | Entrée en scène du boss, attaques télégraphiées (patterns 0 à 5, pilotés par `BOSS_KITS`), mini-boss (`bossCycle`), modules Carapace de magma et Satellites. |
| `skills.ts` | Commandes du joueur : sort d'un allié, Esquive, ultime. |
| `damage.ts` | Résolution d'un coup : faiblesses, cubes (via `cubes.ts`), boucliers, K.O., phases du boss. |
| `cubes.ts` | Cubes d'élément : pose, maturation, Éclat (effets de `BURSTS`), Fêlure, Trio, un seul effet par lancer (`CastContext`), ciblage intelligent, `getSkillPreview`, charge du Déchaînement (`gainUltimateCharge`). |
| `telegraphs.ts` | Grammaire unique des attaques annoncées : disque, couronne, bande, spirale ; couleur `DANGER` (styleGuide.ts) hachurée, remplissage jusqu'au bord à l'impact, contour qui clignote, « tic » commun. |
| `cubeFx.ts` | Affichage des cubes et des Fêlures : un `InstancedMesh` chacun, atlas de symboles d'élément dessiné par code. |
| `actors.ts` | État commun des acteurs, pose animée des modèles, recherche de cible, disparition. |
| `fx.ts` | Particules, projectiles, ondes de choc, télégraphes au sol, confettis. |
| `hud.ts` | Instantané de combat envoyé à l'interface. |
| `artLight.ts` | Sprint Art : ciel en dégradé, soleil qui suit l'heure, ombres plus fines, rayons (Prairie et camp). |
| `hub.ts` | Hub cliquable du camp (A3) : lieux, survol, positions à l'écran, promeneurs. Seulement au camp. |
| `postfx.ts` | Pipeline d'effets (G1) : GTAO, contour, halo, étalonnage par biome ; niveaux Bas/Moyen/Haut/Automatique. Jamais en headless. |
| `debug.ts` | Mesures de l'overlay `?debug=1`. |

### Carte des modèles (`src/game/models/`)

| Module | Rôle |
| --- | --- |
| `shared.ts` | Textures générées une fois, brique `makeBox`. |
| `voxelSculpt.ts` | Sprint Art : constructeur « volumes → blocs » (`voxelize` pur et testé, maillage des faces visibles, ombre douce par sommet). |
| `sculptDefs.ts` | Sprint Art : créatures refaites (lignées Pyrocube, Ampoulin, Cailloc). Règles de style dans `art.test.ts`. |
| `meadowDecor.ts` | Sprint Art : décor vivant de la Prairie (relief, végétation, mare, papillons, lucioles). |
| `creatures.ts` | Créatures par silhouette (`archetype`), barre de vie. |
| `campProps.ts` | Atelier (modèle provisoire, `buildWorkbenchProp`) et totem du camp. |
| `biomes.ts` | Sol, décor instancié et éléments propres à chaque biome. |
| `floatingText.ts` | Texte flottant (pool fixe). |

## Règle du golden master

`npm run golden` rejoue, à graine fixe, tous les niveaux x 4 séries (« auto », « auto sans cubes », « joueur actif », « expert ») x 10 combats, et compare chaque combat à `docs/sim/golden-master.json` : vainqueur, durée, PV restants, dégâts, phases de boss, attaques télégraphiées, nombre de tirages aléatoires, somme de contrôle des instantanés HUD.

- **Changement technique** (rangement, performance, outillage, textes déplacés) : le golden doit rester identique. S'il change, la modification a changé le jeu : l'annuler (`git checkout .`) et recommencer plus petit.
- **Changement de jeu voulu** (équilibrage, contenu, règle) : réenregistrer avec `npm run golden -- --record` et committer le fichier AVEC le changement, en le disant dans le message de commit.
- Le golden ne voit que la simulation. Il ne voit ni le rendu, ni le son, ni les textes : pour ceux-là, captures d'écran et relecture.
- « Sans cubes » passe par l'option de moteur `cubes: false`, réservée aux outils. Il n'existe pas de paramètre d'URL pour couper les cubes en jeu.

## Conventions

- **Contenu retirable** : tout nouveau contenu respecte `STYLE.md`. Un commit par lignée et un commit par biome : insérer chaque lignée à un endroit DIFFÉRENT des fichiers partagés (jamais deux ajouts sur des lignes voisines), lui donner son propre fichier de test, ne pas la référencer depuis une autre lignée ou un autre biome, puis vérifier avec `git revert --no-commit <hash> && npm run check`.
- **Data-driven** : une créature, un sort ou un niveau s'ajoute dans `catalog.ts`. Le moteur ne doit pas contenir de cas particulier par espèce ; les différences passent par des champs (`archetype`, `stage`, `bossKit`...).
- **Textes** : tout texte visible vit dans `src/i18n/fr.ts` (`FR.ui.<composant>`, `FR.engine`, `FR.rules`, `FR.balance`, `FR.catalog.<TABLE>.<id>`). Un texte à trous est une fonction (`FR.ui.teamDrawer.nivRequis(niveau)`). Pour une nouvelle créature : ses données dans `catalog.ts`, son nom et ses descriptions dans `fr.ts`. Les noms propres du jeu (`GAME_TITLE`, `WORLD_NAME`, `CREATURE_NOUN`) sont des constantes en tête de `fr.ts` : ne jamais les réécrire en dur dans un texte. `npm run texts` doit rester à zéro. Seuls les outils de développement gardent leurs textes en place (`GalleryPage.tsx`, `DebugOverlay.tsx`, `BenchOverlay.tsx`, `RevealGallery.tsx`, `ui/UiGallery.tsx` : liste dans `tools/texts.ts`).
- **Règles pures testées** : toute nouvelle règle va dans `rules.ts` avec un test. Les fonctions qui tirent au hasard prennent un `rng` en paramètre (défaut `Math.random`) pour être testables.
- **Moteur** : une nouvelle fonction va dans le module de `engine/` dont c'est le rôle, sous la forme `export function nom(self: VoxelEngine, ...)`. Viser moins de 800 lignes par fichier.
- **Sauvegarde** : si la forme de `SaveState` change, incrémenter `SAVE_VERSION` (10 aujourd'hui), compléter `migrateSaveState` et tester depuis toutes les versions précédentes (`saveV3.fixture.ts` est une vraie sauvegarde v3 ; `saveKitchen.fixture.ts` porte l'ancienne cuisine des v1 à v8, convertie en Appâts, cubes et Lien par `readLegacyKitchen`, legacyIds.ts). Un identifiant renommé s'ajoute à `legacyIds.ts` : une ancienne sauvegarde se charge toujours, un identifiant inconnu est ignoré sans erreur. Les quêtes tournantes ont été supprimées en v10 (A3.2) : une quête terminée mais pas réclamée donne sa récompense à la migration (`LEGACY_QUEST_REWARDS`). `migrateSaveState` normalise TOUT ce qu'il lit (créatures, pierres, cubes, paliers de collection, titres) : y ajouter chaque nouveau champ. La clé de stockage ne change pas.
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
npm run sim -- --profile expert                # profil « expert » : piloté par getSkillPreview (Trios, Éclats pleins)
npm run sim -- --profile kite                  # profil « kite » : mode Manuel, fuir puis revenir (hit and run)
npm run sim -- --cubes 0                       # cubes d'élément coupés (option d'outil)
npm run sim -- --scale 1/0.7/1                 # multiplie les réglages de tous les niveaux choisis (essai global)
```

- Le vrai `VoxelEngine` tourne sans rendu, à pas fixe de 1/60 s, avec l'escouade de `previewConfigs.ts`. La passe complète (21 niveaux x 10 combats) prend environ 11 secondes.
- L'aléatoire est rendu reproductible en remplaçant `Math.random` dans le processus de l'outil uniquement. Le jeu n'est pas modifié.
- Cibles pour un nouveau niveau : 50 à 85 % de victoires en « auto » ; chaque phase de boss assez longue pour qu'il y lance au moins une attaque télégraphiée (colonne « ≥ 1 attaque » à 100 %).
- Les 21 niveaux ont une entrée `STAGE_TUNING` (S03 : réglage a minima des 12 premiers ; vrai réglage en S05). Un test borne les multiplicateurs (PV ennemis 0,5–12, attaque 0,05–1,5, PV du boss 0,5–25) et garde la signature du contenu des 12 premiers niveaux (puissance, XP, Galets, boss, niveaux et IA des vagues). Changer l'ESPÈCE d'un ennemi reste possible, mais remesurer : sur le tout premier niveau, un seul échange faisait passer l'Auto de 20 % à 100 %.
- Kits de boss : `BOSS_KITS` (balance.ts) décrit la rotation des 6 attaques existantes et leur habillage. Un nouveau kit se compose là, sans toucher au moteur.
- « Auto Total » n'utilise jamais l'Esquive et ne fait jamais de Trio (règle du jeu) : un joueur qui esquive fait mieux que le tableau. Les profils « joueur actif » et « expert » sont des scripts simples, pas de vrais joueurs ; l'expert lit l'état du moteur (recharges, cubes), ce qu'aucun joueur ne voit aussi précisément.
- Chaque ligne `--brief` donne aussi, par combat : Éclats (faibles), Trios, Déchaînements (pendant le boss). Cibles S04 : Éclats Auto ≥ 3 et actif ≥ 6 ; Trios expert ≥ 4 ; Déchaînements par combat de boss Auto 0–1, actif 1–2, expert 1–3.

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
- **Site statique** : `vite build` produit un site complet, sans serveur. `base` vient de `BASE_PATH` (défaut `/`) : aucun chemin absolu commençant par `/` dans le code (utiliser `import.meta.env.BASE_URL`). Les clés de `localStorage` passent par `withSaveSlot` (`src/game/saveSlot.ts`) : la version `next/` (`VITE_SAVE_SLOT=next`) partage le domaine de la version validée mais pas sa sauvegarde. L'onglet du Professeur n'existe que si `VITE_AI_CODEX=1` ; sinon le jeu n'appelle jamais `/api`. Le titre de `index.html` est injecté au build depuis `fr.ts` (repère `%GAME_FULL_TITLE%`).
- **Esquive** (S05) : `DODGE_KIT` (balance.ts). La parfaite se décide à l'IMPACT d'une attaque annoncée (`resolvingHazard` pendant `onComplete`, voir fx.ts et damage.ts), jamais à l'appui. Toute nouvelle attaque de boss doit passer par `spawnEnemyTelegraph` avec `{ phase }` (délai minimal de la phase, test dédié) et infliger ses dégâts dans `onComplete`.
- **Annonces** : `TELEGRAPH_KIT` ; au plus trois zones à la fois (cinq avec les météores) ; consigne écrite montrée deux fois par attaque (`hazardHintsSeen` dans la sauvegarde v6, `showHazardHint`).
- **Boss** : un kit par biome (`BIOME_BOSS_KITS`), modules génériques (`BOSS_MODULES`). Les simulations « actif » et « expert » appuient sur Esquive avant l'impact avec un tirage À PART (`dodgeRng` de simFight.ts) : l'aléatoire du jeu n'est pas consommé par le joueur simulé.
- **Cubes** : la règle (`resolveCubeHit`, `pickSkillTarget`) est pure dans `rules.ts` ; ses réglages dans `CUBE_KIT`, `ULTIMATE_CHARGE`, `ULTIMATE_KIT` (`balance.ts`) et `BURSTS` (`catalog.ts`). Sur un ennemi, le cube remplace les statuts (un seul, de la durée du cube) ; les altérations infligées aux alliés restent des statuts. Tout nouvel état transitoire de combat (`pendingUltHits`, `slowMoTimer`, verrous) se remet à zéro dans `startExpedition` et `loadCampScene`.
- **Étoiles** (S06) : victoire, aucun K.O., défi (`STAGE_CHALLENGES`, catalog.ts). Aucun défi ni aucune récompense ne dépend des Éclats ou des Trios (retour du propriétaire : les cubes pourraient être retirés). Les étoiles ne se perdent jamais (`mergeStars`) ; paliers `STAR_TIERS` rattrapés à la victoire suivante (`starTiersClaimed`). XP : table de catalog.ts × `XP_KIT.xpScale`, réglée avec `npm run journey`.
- **Début de partie** (S07) : trios `STARTER_TRIOS`, ouvertures `UNLOCKS` (`unlockedFeatures`, une sauvegarde d'avant S07 a `allUnlocked`), leçons `engine/lessons.ts` (actives seulement après `setLessonsDone` : les outils ne les voient jamais, le golden reste identique). Journal de test : `src/game/journal.ts` (localStorage, 500 lignes, jamais envoyé). Profil `idle` de `npm run sim` = débutant qui n'appuie sur rien ; `--starter` / `--trio` pour mesurer avec les trios de départ.
- **ART 3** : les créatures du jeu reprennent les formes et la palette d'ART 1 (`sculptDefs.ts`) ; ART 1 et ART 2 sont figés (`sculptDefsArt1.ts`, `sculptDefsArt2.ts`) pour `?gallery=art` (quatre colonnes). Règle : ne jamais simplifier une créature, seulement ajouter (lueurs, contour, dégradé, ombre : `patchArt3Material` dans `voxelSculpt.ts`, uniformes `CREATURE_LIGHT`). Décor épuré de la Prairie (`meadowDecor.ts`) : aplats, falaises en couches et veines de cristal dans le shader, collines lointaines ; `ART3_GROUND_TONES` testé contre `DANGER`. Modèles `.vox` facultatifs : `src/assets/vox/<espèce>.vox`, `models/voxFile.ts`, guide `docs/guide-vox.md`.
- **ART 2** (couleurs figées dans `sculptDefsArt2.ts`) : couleurs des créatures refaites calculées par `models/artPalette.ts` (tête plus claire, détails sombres, écart ≥ 15 %, testé) ; `SCULPT_DEFS_ART1` est une copie figée pour `?gallery=art` (trois colonnes). Vent : réglage `settings.wind` (Normal / Doux / Coupé), coupé en Bas et avec reduced-motion ; il ne tire jamais dans le hasard du décor. R17 : tout se fait au doigt en 390 × 844 en qualité Basse (manette tactile `TouchStick.tsx` en mode Manuel, boutons ≥ 44 px) ; captures `tools/captures.ps1 -Formats bureau,mobile,telephone`.
- **Sprint Art : navigateur seulement.** `main.tsx` active `setSculptModels(true)` et `setArtDecor(true)`. Les outils et le moteur headless gardent les anciens modèles et l'ancien décor, et les effets aléatoires ajoutés (éclats de blocs, K.O.) ne partent que si `!self.headless` : le golden reste identique. Un nouveau modèle ou décor « art » doit suivre la même règle, sinon il change le nombre d'objets three.js créés pendant un combat simulé.
- `catalog.ts` importe `balance.ts` : `balance.ts` ne doit rien importer du catalogue. `i18n/fr.ts` n'importe rien.
- Deux fichiers de verrouillage coexistent : `package-lock.json` (npm, à jour, utilisé par la CI) et `bun.lock` (hérité, pas régénéré faute de `bun` sur la machine de développement).
- Sous Windows / Git Bash : ne jamais passer du code contenant des backticks à `node -e "..."` (le shell les exécute). Écrire un fichier de script à la place.

## Ce qu'un humain doit juger

Les tests, le golden et la simulation ne voient pas : la fluidité réelle (FPS, à lire avec `?debug=1`), le son, la lisibilité des télégraphes, le plaisir de jeu, la beauté des modèles. Après un changement visuel ou sonore, le signaler dans le rapport de session plutôt que de le déclarer validé.
