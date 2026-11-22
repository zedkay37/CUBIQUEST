# CubiQuest — guide de travail

RPG 3D voxel (React 19 + Three.js + Vite + Tailwind 4), inspiré de Pokémon Quest. Textes du jeu en français.
Tout le contenu est 100 % original : aucun nom ni design Pokémon réel.

## Cadre fixé par le propriétaire du projet

Le propriétaire dirige la vision. Sans demande explicite de sa part :

- **Autorisé** : nouveaux Cubimons, biomes/niveaux, sorts, recettes, ingrédients ; amélioration des écrans existants ; corrections, performances, tests, outillage, documentation.
- **Interdit** : nouveaux modes de jeu, nouvelles mécaniques ou systèmes, nouveaux éléments ou statuts, nouveaux menus, musique. Tout nouveau contenu réutilise ce qui existe (6 éléments, 5 styles de sorts, 6 statuts, 6 réactions, attaques télégraphiées et kits de boss existants).
- Ne pas modifier `server.ts` ni le Codex (prompt Gemini). Aucun asset externe, aucune dépendance payante.
- Tout nouveau contenu respecte `STYLE.md`.
- Un commit par lignée de Cubimons et un commit par biome, pour qu'on puisse retirer l'un sans casser le reste. Concrètement : insérer chaque lignée à un endroit DIFFÉRENT des fichiers partagés (jamais deux ajouts sur des lignes voisines), lui donner son propre fichier de test, ne pas la référencer depuis une autre lignée ou un autre biome, puis vérifier avec `git revert --no-commit <hash> && npm run check`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm install` | Installation (npm ; `bun` n'est pas requis) |
| `npm run dev` | Serveur Express + Vite sur http://localhost:3000 |
| `npm run check` | `tsc --noEmit` + tous les tests + `vite build`. **À lancer avant chaque commit.** |
| `npm test` | Tests seuls (`src/game/*.test.ts`, runner `node:test` via `tsx`) |
| `npm run sim` | Mesure d'équilibrage : combats headless sur le vrai moteur (voir plus bas) |

URL utiles en développement (aucune ne touche à la sauvegarde) :

- `?stage=<id>` : lance un niveau avec son escouade de référence. Options : `&squad=a,b,c&lvl=N&bonus=N`.
- `?gallery=1` : galerie de revue (tous les Cubimons en 3D + aperçu des biomes).
- `?autostart=1&hour=0.8` : camp à une heure donnée (0 aube · 0.3 jour · 0.66 crépuscule · 0.8 nuit).

## Architecture

```
src/game/types.ts          Types partagés (SaveState, SpeciesDef, StageDef...). Aucune logique.
src/game/catalog.ts        DONNÉES : espèces, sorts, pierres, ingrédients, recettes, biomes, niveaux, quêtes, succès.
src/game/balance.ts        ÉQUILIBRAGE des niveaux récents (multiplicateurs par niveau, kits de boss). Seul endroit à régler.
src/game/previewConfigs.ts Escouades de référence par niveau (mode aperçu + simulation).
src/game/rules.ts          RÈGLES PURES, sans DOM ni Three : dégâts, recettes, évolutions, récompenses, sauvegarde/migrations.
src/game/settings.ts       Options de confort (hors SaveState).
src/game/voxelModels.ts    Modèles voxel procéduraux (créatures par silhouette, décors de biomes, texte flottant).
src/game/VoxelEngine.ts    Moteur temps réel : scène Three, IA, combats, boss, particules, météo, caméra.
src/game/audio.ts          Sons synthétisés (WebAudio), aucun fichier audio.
src/game/styleGuide.ts     Plages chiffrées de STYLE.md, vérifiées par style.test.ts.
src/game/galleryRenderer.ts Vignettes de la galerie `?gallery=1` (outil de développement).
src/game/*.test.ts         rules (règles), save (sauvegarde/import), engine (moteur headless), style, lineage-* et biome-* (un fichier par ajout de contenu).
src/components/            Interface React (HUD, tiroirs du camp, modales). L'état de jeu vit dans App.tsx.
src/App.tsx                Colle React <-> moteur. Le canvas WebGL est monté une seule fois.
tools/sim.ts               Outil `npm run sim`.
tools/headlessDom.ts       Faux DOM + aléatoire à graine pour faire tourner le moteur sous Node.
docs/sim/                  Tableaux de mesure (avant/après).
```

Flux de données : `catalog` + `balance` -> `rules` (pur) -> `VoxelEngine` (simulation + rendu) -> `App` -> composants.
Le moteur ne connaît pas React : il reçoit des données et rappelle `onHudUpdate` / `onExpeditionComplete`.

## Conventions

- **Data-driven** : un Cubimon, un sort ou un niveau s'ajoute dans `catalog.ts`. Le moteur ne doit pas contenir de cas particulier par espèce ; les différences passent par des champs (`archetype`, `stage`, `bossKit`...).
- **Règles pures testées** : toute nouvelle règle va dans `rules.ts` avec un test. Les fonctions qui tirent au hasard prennent un `rng` en paramètre (défaut `Math.random`) pour être testables.
- **Sauvegarde** : si la forme de `SaveState` change, incrémenter `SAVE_VERSION`, compléter `migrateSaveState` et tester depuis v1, v2 et v3. `migrateSaveState` normalise TOUT ce qu'il lit (créatures, pierres, marmite, quêtes) : y ajouter chaque nouveau champ. La clé de stockage ne change pas.
- **Identifiants** en `snake_case` anglais ou sans accent (`glacier_crash`, `givrelin`) ; noms affichés en français.
- **Performance** : géométries/matériaux partagés, `InstancedMesh` pour tout ce qui se répète, pools à taille fixe (particules 320, météo 96, éclairs 6, texte flottant 28). Tout objet retiré de la scène passe par `disposeObject()`.
- **Accessibilité** : respecter `prefers-reduced-motion` ; le tremblement de caméra se désactive.
- Commentaires : expliquer le pourquoi, en français comme le reste du projet.

## Équilibrage avec `npm run sim`

```bash
npm run sim                                    # 18 niveaux x 10 combats, tableau Markdown
npm run sim -- --brief --runs 40 --stages tundra-3,stormpeak-3
npm run sim -- --stages tundra-3 --set tundra-3=9/0.28/3.2   # essai SANS toucher balance.ts (PV ennemis / attaque / PV boss)
npm run sim -- --seed 2 --out docs/sim/mon-tableau.md
```

- Le vrai `VoxelEngine` tourne sans rendu, à pas fixe de 1/60 s, en contrôle « Auto Total », avec l'escouade de `previewConfigs.ts`. La passe complète (21 niveaux x 10 combats) prend environ 11 secondes.
- L'aléatoire est rendu reproductible en remplaçant `Math.random` dans le processus de l'outil uniquement. Le jeu n'est pas modifié.
- Cibles pour un nouveau niveau : 50 à 85 % de victoires ; chaque phase de boss assez longue pour qu'il y lance au moins une attaque télégraphiée (colonne « ≥ 1 attaque » à 100 %).
- Les 12 niveaux historiques (Prairie -> Sanctuaire) ne se rééquilibrent pas : un test vérifie leur signature (puissance, XP, Pierres, boss, niveaux et IA des vagues). Changer l'ESPÈCE d'un ennemi y reste possible, mais remesurer : sur le tout premier niveau, un seul échange faisait passer l'Auto de 20 % à 100 %.
- Kits de boss : `BOSS_KITS` (balance.ts) décrit la rotation des 6 attaques existantes et leur habillage. Un nouveau kit se compose là, sans toucher au moteur.
- « Auto Total » n'utilise jamais Dispersion : un joueur qui esquive fait mieux que le tableau.

## Pièges connus

- **Effet de seuil de l'équilibrage** : les dégâts sont arrondis et les combats en Auto très réguliers. Un multiplicateur qui bouge de 3 % peut faire passer un niveau de 85 % à 43 % de victoires. Toujours vérifier sur plusieurs graines (`--seed 1`, `2`, `3`) avec au moins 40 combats.
- **Un seul combat ne prouve rien.** La session 1 avait réglé les niveaux sur un combat chacun dans un navigateur headless lent : le résultat ne tenait pas (un niveau annoncé gagné était perdu à 100 %).
- Le navigateur headless (rendu logiciel, ~10 images/s) ne reflète ni la vitesse ni l'issue des combats réels. Pour l'équilibrage, utiliser `npm run sim` ; le navigateur headless ne sert qu'aux captures d'écran et à vérifier l'absence d'erreur console.
- `VoxelEngine` continue de tourner sous l'écran de fin (fête de victoire). Le verrou `resultSent` empêche de renvoyer les récompenses : ne pas le retirer (test dédié).
- Changer de scène : `loadCampScene` et `startExpedition` doivent remettre à zéro tout état d'animation (entrée de boss, évolution, télégraphes). Tout nouvel état transitoire doit y être réinitialisé, et couvert dans `engine.test.ts`.
- Le sac de Pierres est limité à 48 : passer par `addPowerStoneToBag`, qui ne retire jamais une pierre équipée.
- `catalog.ts` importe `balance.ts` : `balance.ts` ne doit rien importer du catalogue.
- Deux fichiers de verrouillage coexistent : `package-lock.json` (npm, à jour) et `bun.lock` (hérité, pas régénéré faute de `bun` sur la machine de développement).
- Sous Windows / Git Bash : ne jamais passer du code contenant des backticks à `node -e "..."` (le shell les exécute). Écrire un fichier de script à la place.

## Ce qu'un humain doit juger

Les tests et la simulation ne voient pas : la fluidité réelle (FPS), le son, la lisibilité des télégraphes, le plaisir de jeu, la beauté des modèles. Après un changement visuel ou sonore, le signaler dans le rapport de session plutôt que de le déclarer validé.
