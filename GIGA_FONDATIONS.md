# Session « Fondations » — rapport

Branche `fondations`. Aucun changement de jeu : le golden master est identique du premier au dernier commit.

## 1. Point de départ

- **`giga-update-3` n'existe pas** : ni branche, ni tag `giga-update-3-final`, sur origin comme en local. Le brief de la session 3 était arrivé tronqué (seule sa section « sauvegardes ») et cette session n'a pas eu lieu. `GIGA_UPDATE_3.md` n'existe donc pas non plus.
- **Décision** : partir du dernier état existant, `giga-update-2` (`dba0e3a`). Si une session 3 a lieu plus tard, la faire à partir de `fondations`.
- Aucune autre branche ni aucun tag existant n'a été touché.

## 2. Tags de sauvegarde

Tous poussés et vérifiés avec `git ls-remote --tags origin`.

| Tag | Commit | Contenu | Revenir à cet état |
| --- | --- | --- | --- |
| `sauvegarde-avant-fondations` | `dba0e3a` | Identique à `giga-update-2` | `git checkout sauvegarde-avant-fondations` |
| `sauvegarde-avant-ci` | `025ded3` | + golden master | `git checkout sauvegarde-avant-ci` |
| `sauvegarde-avant-decoupage-moteur` | `95f7fab` | + workflow GitHub, moteur encore en un fichier | `git checkout sauvegarde-avant-decoupage-moteur` |
| `sauvegarde-avant-diagnostic` | `f731c8a` | + moteur découpé | `git checkout sauvegarde-avant-diagnostic` |
| `sauvegarde-avant-textes` | `dec3071` | + overlay `?debug=1`, bundle découpé, textes encore en dur | `git checkout sauvegarde-avant-textes` |
| `fondations-final` | dernier commit | Tout | `git checkout fondations-final` |

Le tag `sauvegarde-avant-giga-update-3` (`dba0e3a`), posé avant cette session, pointe sur le même commit que `sauvegarde-avant-fondations`.

## 3. Golden master

- `npm run golden` rejoue 840 combats à graine fixe : 21 niveaux x 2 profils x réactions (avec, sans) x 10. Il est inclus dans `npm run check`. Durée : environ 55 s.
- Par combat : vainqueur, durée, PV restants (boss et alliés), dégâts totaux, durée de chaque phase, attaques télégraphiées du boss par phase, plus deux sommes de contrôle (nombre de tirages aléatoires, contenu des instantanés HUD).
- **État : identique de bout en bout.** `docs/sim/golden-master.json` a été enregistré une fois (`025ded3`) et jamais réenregistré. Chacun des commits suivants a passé `npm run check`, en local (Windows) et sur GitHub (Linux).
- La simulation était déjà reproductible : deux enregistrements successifs donnent le même fichier.
- Deux éléments du brief n'existaient pas dans le code et ont été définis ici, côté outils seulement :
  - **`?reactions=0`** : pas de paramètre d'URL ajouté (ce serait une fonction de jeu). « Sans réactions » passe par une option du moteur, `reactions: false`, que seuls `npm run sim` et `npm run golden` utilisent. Un test vérifie que le jeu normal garde ses réactions.
  - **Profil « joueur actif »** : un script dans `tools/simFight.ts` pilote le mode Semi par les commandes publiques du moteur (sort dès qu'il est prêt, ultime à 100 %, Dispersion 0,45 s après l'apparition d'un télégraphe). C'est une approximation, pas un vrai joueur.
- Mesuré dans le golden (10 combats par niveau) : auto 172 victoires sur 210, auto sans réactions 112, joueur actif 192, joueur actif sans réactions 177.

## 4. Tests automatiques sur GitHub

`.github/workflows/check.yml` : à chaque push et pull request, `npm ci` puis `npm run check`, sous Node 24. Le push du workflow a été accepté. 21 exécutions sur la branche, toutes vertes. Rien à activer.

## 5. Découpage du moteur

`VoxelEngine.ts` (3 680 lignes) est devenu une façade de 484 lignes et 17 modules. Les méthodes ont été déplacées par script, sans réécriture : seul `this` devient `self`. Le moteur a été sorti en 11 commits (des modules liés sont partis ensemble : caméra et boucle, acteurs et dégâts, alliés, ennemis et boss, camp et évolution), les modèles en 5. Golden identique après chacun.

Avant de déplacer, `updateExpedition` (850 lignes) a été coupée en six étapes nommées, par déplacement de blocs.

| Module (`src/game/engine/`) | Lignes | Rôle |
| --- | --- | --- |
| `types.ts` | 198 | Types internes : acteur, projectile, télégraphe, télémétrie |
| `constants.ts` | 117 | Pools, durées, tables d'effets, de météo et d'éclairage |
| `loop.ts` | 108 | Boucle d'affichage et pas de jeu |
| `camera.ts` | 99 | Cadrage, suivi, tremblement |
| `atmosphere.ts` | 189 | Météo, éclairage, éclairs, jour/nuit |
| `camp.ts` | 234 | Scène du camp, marmite, promeneurs |
| `evolution.ts` | 160 | Séquence d'évolution |
| `expedition.ts` | 456 | Départ, vagues, pas de combat, fin |
| `allies.ts` | 192 | Déplacement et attaques des alliés |
| `enemies.ts` | 171 | IA des ennemis |
| `boss.ts` | 402 | Entrée du boss et attaques télégraphiées |
| `skills.ts` | 288 | Sorts, Dispersion, ultime |
| `damage.ts` | 278 | Résolution d'un coup, phases du boss |
| `actors.ts` | 225 | État commun, pose animée, cible |
| `fx.ts` | 365 | Particules, projectiles, télégraphes au sol |
| `hud.ts` | 68 | Instantané envoyé à l'interface |
| `debug.ts` | 46 | Mesures de l'overlay |

`voxelModels.ts` (1 608 lignes) ne fait plus que réexporter cinq modules de `src/game/models/` : `shared` (108), `creatures` (646), `campProps` (139), `biomes` (609), `floatingText` (131).

- Plus aucun fichier du moteur ne dépasse 650 lignes.
- `App.tsx` et les tests n'ont pas été modifiés par le découpage : l'API publique est la même.
- Les champs de `VoxelEngine` sont devenus publics pour que les modules y accèdent. L'interface ne doit utiliser que les méthodes.
- **Hors périmètre, laissés tels quels** : `catalog.ts` (3 100 lignes, des données) et `rules.ts` (1 600 lignes, règles pures testées) ne font pas partie du moteur.

## 6. Diagnostic et performances

- **`?debug=1`** affiche FPS, temps d'image, draw calls, triangles, géométries, textures, particules, entités. Sans le paramètre, le composant n'est pas téléchargé et rien ne s'affiche.
- **`npm run census -- <niveau>`** compte les maillages d'une scène sans navigateur, avec des nombres reproductibles.

### Rendu : mesuré, non modifié

| Scène | Draw calls (overlay) | Triangles (overlay) | Maillages | dont projetant une ombre |
| --- | --- | --- | --- | --- |
| Camp | 162 | 10 220 | 117 | 66 |
| volcano-3 | 104 à 137 | 9 812 à 10 082 | 125 | 58 |
| tundra-3 | 234 à 291 | 12 052 à 12 724 | 190 | 108 |
| canyon-3 | 240 à 318 | 12 636 à 13 902 | 192 | 113 |

Colonnes « overlay » : trois relevés à quelques secondes d'écart, dans Edge sans affichage. Colonnes « maillages » : `npm run census`, au même instant d'un combat à graine fixe. **Avant et après sont identiques : aucune optimisation de rendu n'a été conservée.**

Les Cubimons font l'essentiel des appels : 143 des 190 maillages de tundra-3, une boîte par appel.

**Essai abandonné : fusionner les boîtes immobiles d'un même matériau.**

| Scène | Maillages avant | avec fusion | Ombres avant | avec fusion |
| --- | --- | --- | --- | --- |
| Camp | 117 | 100 | 66 | 56 |
| volcano-3 | 125 | 104 | 58 | 46 |
| tundra-3 | 190 | 157 | 108 | 87 |
| canyon-3 | 192 | 141 | 113 | 76 |

Annulé pour deux raisons :
1. Le rendu n'est pas identique. Sur les 83 vignettes de la galerie, 13 changent : 11 de façon imperceptible (1 à 11 pixels sur 102 400), mais Flambrix (70 pixels) et Cailloc (200 pixels) nettement, sans doute là où deux faces se superposent.
2. Le combat simulé divergeait : three.js tire l'identifiant de chaque objet créé dans `Math.random`, le même générateur que le combat. Créer un objet de plus ou de moins change le golden. Le recensement montrait déjà un combat différent ; le golden n'a pas été rejoué, l'essai ayant été annulé avant.

Conséquence : toute optimisation qui change le nombre d'objets three.js créés pendant un combat demande ton accord (golden réenregistré, modèles validés à l'œil).

### Bundle

| | Avant | Après |
| --- | --- | --- |
| Fichiers JavaScript du jeu | 1 fichier de 1 195 kB | code du jeu 322 kB + interface 352 kB + three.js 551 kB |
| Total téléchargé par un joueur | 1 195 kB (330 kB compressé) | 1 225 kB (335 kB compressé) |
| Galerie `?gallery=1` | dans le fichier unique | 8 kB, à la demande |
| Overlay `?debug=1` | — | 1 kB, à la demande |
| CSS | 35,9 kB | 35,9 kB |

- Le total augmente de 30 kB : c'est le coût du module de textes (noms de clés).
- Après une mise à jour du jeu, le navigateur ne retélécharge que le code du jeu (322 kB) ; three.js et l'interface restent en cache.
- Non fait : charger les tiroirs du camp à la demande. Cela changerait leur ouverture (un temps de chargement à la première fois).

Les FPS ne sont pas mesurés ici (rendu logiciel) : à lire sur ton PC avec `?debug=1`.

## 7. Textes centralisés

- 692 occurrences de texte déplacées dans `src/i18n/fr.ts` (691 par script, 1 à la main) : interface (12 composants), bannières et textes flottants du moteur, messages des règles, annonces de boss, noms et descriptions du catalogue (403).
- **Vérifications qu'aucun mot n'a changé :**
  - les données du catalogue, une fois évaluées, sont identiques à l'octet avant et après ;
  - l'ensemble des chaînes de texte du build (1 324 chaînes distinctes) est identique avant et après ;
  - texte relevé sur 14 écrans : identique sur 9, identique hors chiffres sur 3 (combat, pause, défaite), et 2 écarts dus à l'état du combat ou au butin aléatoire (détail dans `docs/captures/fondations/README.md`).
- `npm run texts` : **0 texte en dur** dans l'interface, hors trois exceptions.

| Exception | Textes | Raison |
| --- | --- | --- |
| `CodexDrawer.tsx` | 25 | Consigne permanente « ne pas modifier le Codex » : laissé tel quel par prudence |
| `GalleryPage.tsx` | 36 | Outil de développement, jamais vu par le joueur |
| `DebugOverlay.tsx` | 8 | Outil de développement, jamais vu par le joueur |

- Les fragments sans lettre (« ( », « % », « · ») restent dans les composants.
- `npm run texts -- --strict` échoue s'il reste un texte en dur. Je ne l'ai pas ajouté à `npm run check` ; c'est une ligne à ajouter si tu le veux.

## 8. Conséquences à connaître

- **Les `git revert` de `GIGA_UPDATE_2.md` ne s'appliquent plus.** Essayés sur les trois lignées : conflits dans `VoxelEngine.ts`, `catalog.ts` et `voxelModels.ts`. Retirer une lignée d'avant cette session se fait désormais à la main (procédure dans `CLAUDE.md`, « Pièges connus »). La règle « un commit par lignée » reste valable pour le contenu à venir.
- **Ajouter un Cubimon touche maintenant deux fichiers** : ses données dans `catalog.ts`, ses textes dans `i18n/fr.ts`.
- **Les clés de `fr.ts` sont générées à partir du texte** (`escouadeComplete`, mais aussi `niv2` ou `t3Actifs`). Les phrases à trous sont restées découpées comme dans les composants (« Compagnons ( » + nombre + « ) »). Fidèle, mais peu pratique pour une traduction.
- Vu en passant, non modifié : le Codex propose des questions qui citent « Pokémon Quest » (`CodexDrawer.tsx`).

## 9. À vérifier par un humain

- Jouer un niveau complet et un passage au camp : le découpage n'est couvert côté rendu que par des captures.
- FPS et temps d'image sur ton PC avec `?debug=1`, au camp et sur `?stage=tundra-3&debug=1`.
- Les écrans non capturés : marmite en cuisson et arrivée d'une recrue, bannière d'entrée de boss, affichage mobile.
- Le son : rien n'y a été touché, rien ne le vérifie.
- La décision sur la fusion des boîtes (section 6) et sur les clés de `fr.ts` (section 8).

## 10. Reprise

- **Changé** : outils (`golden`, `census`, `texts`, profils de `sim`), workflow GitHub, moteur et modèles découpés, overlay `?debug=1`, bundle en trois fichiers, textes dans `src/i18n/fr.ts`, `CLAUDE.md`, `README.md`, deux tests du moteur (55 tests au total).
- **Non vérifié** : FPS réels, son, écrans listés en section 9.
- **Retour arrière** : `git checkout <tag>` (section 2). Chaque section est aussi un ou plusieurs commits séparés.
- **Ne pas toucher** : `docs/sim/golden-master.json` à la main ; `main`, `sauvegarde-v1`, `giga-update`, `giga-update-2` et les tags.
- **Prochaine action sûre** : `npm install`, `npm run check`, puis `npm run dev` et `?debug=1`.
