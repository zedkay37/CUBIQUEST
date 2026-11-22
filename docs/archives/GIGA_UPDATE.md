# GIGA UPDATE — « Les Confins » (contenu + visuel/juice)

Branche : `giga-update` (créée depuis `main`, jamais fusionnée ; `main` et `sauvegarde-v1` n'ont pas été touchées).
État final : `npx tsc --noEmit` OK · `npx tsx --test src/game/rules.test.ts` 23/23 · `npx vite build` OK.

## Comment tester

```bash
npm install --legacy-peer-deps   # voir « Décisions » : conflit de peer-deps vite/esbuild, bun absent sur la machine
npm run dev                      # puis http://localhost:3000
```

Raccourcis utiles pour voir le nouveau contenu sans tout rejouer :

| But | Comment |
| --- | --- |
| Lancer directement un niveau (rien n'est sauvegardé) | `http://localhost:3000/?stage=tundra-3&squad=ramurgel,cryolithe,auroramure&lvl=44&bonus=1100` |
| Idem, Cime des Orages | `?stage=stormpeak-3&squad=serpeclair,cumulord,glaciatitan&lvl=50&bonus=2000` |
| Ids de niveaux | `tundra-1..3`, `stormpeak-1..3` (et les anciens `meadow-1` … `sanctuary-3`) |
| Paramètres | `squad` = 1 à 3 ids d'espèces, `lvl` = niveau, `bonus` = PV/ATQ ajoutés (simule les Pierres de Pouvoir). Le mode démarre en « Auto Total ». |
| Voir l'animation d'évolution | Camp → Équipe & Pierres → une créature au niveau requis → « Évoluer » |
| Voir le cycle jour/nuit | Rester au camp (un tour complet dure 150 s), ou forcer l'heure : `?autostart=1&hour=0.8` (0 aube · 0.3 jour · 0.66 crépuscule · 0.8 nuit) |
| Couper le tremblement de caméra | Bouton « vibration » en haut à droite du camp, ou case à cocher du menu Pause |
| Tester la migration | Une sauvegarde v1/v2 existante dans le navigateur se charge telle quelle (ou Quêtes → importer un JSON) |

## Ce qui a été ajouté

### Contenu
- **2 biomes, 6 niveaux** (index 12 à 17), débloqués à la suite des biomes existants :
  - **Toundra Boréale** (dominante Eau) — Lisière Givrée, Grotte aux Stalactites, Trône de la Banquise. Décor : sapins enneigés, flèches de glace translucides, congères, étangs gelés, igloo, aurores boréales animées, neige.
  - **Cime des Orages** (dominante Électrik) — Sentier des Paratonnerres, Mer de Nuages, Œil du Cyclone. Décor : piliers coiffés de paratonnerres dorés, monolithes à runes pulsantes, rochers en lévitation, anneau de nuées, pluie battante, foudre d'ambiance (éclair + tonnerre).
- **11 créatures originales** (29 au total), avec 4 nouvelles silhouettes voxel qui s'enrichissent à chaque stade :
  - Givrelin → Ramurgel → Auroramure (Eau, cerf de givre — bois qui gagnent un étage par stade)
  - Givrock → Cryolithe → Glaciatitan (Roche, golem de glace — bras qui balancent, stalactites dorsales)
  - Crépitil → Serpéclair → Tempestrix (Électrik, serpent segmenté qui ondule)
  - Nimbulle → Cumulord (Psy, nuage rêveur flottant à filaments de pluie)
- **8 sorts** : Ruée Givrée, Blizzard Boréal, Fracas Glaciaire, Avalanche Cubique, Arc en Chaîne, Spirale Tempête, Brume Onirique (soin/défense), Orage Mirage.
- **Boss à mécaniques télégraphiées** (données : `StageDef.bossKit`), en plus des 3 attaques classiques, 2 phases (3 pour le boss final de chaque biome) :
  - Kit **Givre** : *Anneau de Givre* (couronne — la zone sûre est AU CONTACT du boss ; applique Trempé/Enraciné), puis en phase 2+ un *Contrecoup* central qui oblige à ressortir, et en phase 3 des éclats de glace en étoile.
  - Kit **Orage** : *Foudre en Rafale* (la foudre « marche » en ligne vers la cible, 5/7/9 impacts, on sort de la ligne) et *Œil du Cyclone* (le vent aspire l'escouade vers le boss avant une détonation : la Dispersion annule l'aspiration).
- **2 Pierres de Capacité** : Pierre Précision (+15 pts de critique sur la compétence) et Pierre Sangsue (rend 10 % des dégâts de compétence). Elles ne tombent que dans les nouveaux biomes (ou via quêtes/succès).
- **4 ingrédients** : Lichen des Neiges, Pétale d'Aurore, Poivre d'Orage, Flocon de Nuage.
- **6 recettes de Marmite** : Banquet Boréal, Sorbet du Glacier, Fondue Permafrost, Tajine Tonnerre, Meringue Céleste, Potée des Confins (16 recettes au total).
- **4 quêtes tournantes** (proposées seulement une fois la Toundra ouverte) et **7 succès** (Brise-Glace, Chevaucheur d'Orage, Maître des Six Biomes, Grand Naturaliste, Bestiaire Complet, Chef des Confins, Éleveur Émérite).

### Visuel / juice
- **Impacts** : gerbes de particules propres à chaque élément (braises qui montent, gouttes qui rebondissent, feuilles qui planent, étincelles nerveuses, éclats lourds, spirale psy) ; nombres de dégâts colorés (critique doré, super efficace orange, résisté gris) ; léger hit-stop sur critique ; flash allongé sur coups lourds ; tremblement de caméra adouci et **désactivable** (option mémorisée).
- **Ambiance** : météo par biome (neige, pluie d'orage + éclairs), décors animés, **cycle jour/nuit doux au camp**, idle des créatures (respiration, regard qui se promène, déphasés entre créatures), petits sauts de joie au camp.
- **Moments forts** :
  - **Évolution** : gros plan caméra, lévitation en toupie dans un halo blanc, étincelles aspirées en spirale, apparition de la nouvelle forme avec onde de choc, l'escouade s'arrête pour regarder ; habillage 2D (bandes cinéma, nom, gains de stats, nouveau sort).
  - **Entrée de boss** : combat gelé ~2 s, le boss tombe du ciel, onde de choc à l'atterrissage, caméra qui plonge, carton « Alerte Boss » avec nom et titre.
  - **Victoire** : l'escouade saute de joie sous les confettis, caméra rapprochée, fanfare, écran de résultat animé (étoiles, compteurs qui grimpent, butin en cascade, annonce « Nouveau biome découvert »).
  - **Transitions d'UI** (`motion`) : fondu d'entrée/sortie des tiroirs, pop des panneaux, bannières et compteur de combo animés. `prefers-reduced-motion` est respecté.
- **Sons synthétisés** ajoutés dans `audio.ts` : impact par élément, entrée de boss, tonnerre, craquement de glace, charge et explosion d'évolution, fanfare, confettis, déblocage de biome, pépiement d'idle.

### Sous le capot
- **Sauvegarde v3** (`SAVE_VERSION = 3`) : sac de pierres étendu + stats `frontierWins` / `frontierDishes`. `migrateSaveState` accepte v1, v2 et v3 ; une sauvegarde qui avait déjà fini le Cœur d'Aetherion voit la Toundra s'ouvrir. Clé de stockage inchangée.
- **Tests** : 11 → 23. Nouveaux tests : intégrité du catalogue, déblocage des biomes, lignées d'évolution, recettes (priorités + non-régression des anciennes), nouvelles pierres, quêtes/succès, migration v2 → v3, étoiles de victoire, équilibrage par niveau, options.
- **Performance** : particules en `InstancedMesh` à plafond dur (320, ring buffer, zéro allocation en combat), météo instanciée (96 max), pool de 6 éclairs à géométrie/matériau partagés, décors des biomes en `InstancedMesh`. Ajout d'un `disposeObject()` : géométries, matériaux et texture de sol sont désormais libérés à chaque changement de scène et à chaque ennemi vaincu (ils ne l'étaient pas).

## Décisions prises (sans te consulter, comme demandé)

1. **Installation** : `bun` est absent et `npm install` échoue sur un conflit de peer-deps (vite 8 demande esbuild ≥ 0.27, le projet épingle 0.25). J'ai installé avec `--legacy-peer-deps --no-package-lock`. `package.json` et `bun.lock` ne sont pas modifiés, aucun `package-lock.json` n'est commité.
2. **La base ne compilait pas** : `tsc` avait 3 erreurs sur `main` (`STATUS_META[...].shortLabel` inexistant → `shortTag`, et un type de phase de boss). Corrigées dans le premier commit, sinon aucun jalon ne pouvait passer.
3. **Test « V0.2 elemental reactions »** : corrigé comme demandé (`'confused' + 'fire'`, plus une assertion que Psy + Psy renvoie `null`). Ce test cachait une **seconde assertion fausse** : il attendait une durée ≥ 1,2 s pour 200 % de résistance alors que la règle plafonne la réduction à 75 % avec un plancher à 1 s (résultat 1,13 s). Même logique que ta consigne : j'ai corrigé le test (≥ 1,0), pas la règle.
4. **Pas de nouvel élément** : les 6 éléments, statuts et réactions restent tels quels pour ne pas déséquilibrer la table des types. Les nouveautés passent par de nouvelles silhouettes, sorts et mécaniques de boss.
5. **Équilibrage des nouveaux biomes** : avec la formule existante, le premier essai (Trône de la Banquise) s'est terminé en 7 s, boss compris : aucune mécanique n'avait le temps d'apparaître. Ajout de 3 réglages par niveau dans le catalogue (`enemyHpMult`, `enemyAtkMult`, `bossHpMult`) : ennemis 8–10× plus résistants, boss ×1,6–2,2 en plus, coups réduits de 40–55 %. **Les 12 anciens niveaux ne sont pas modifiés** (vérifié par un test). Calibré en 4 passes de combats automatiques en navigateur headless. Résultats du réglage final, en « Auto Total » (donc sans aucune esquive), `bonus` = équipement simulé :

   | Niveau | Escouade | Résultat |
   | --- | --- | --- |
   | Lisière Givrée | niv. 38, +684 | victoire en 26 s, 1 K.O. |
   | Grotte aux Stalactites | niv. 41, +900 | victoire en 31 s |
   | Trône de la Banquise | niv. 44, +1100 | victoire en 27 s, boss passé par ses 3 phases, 1 K.O. (mesuré avec des coups 4 % plus forts que le réglage final) |
   | Sentier des Paratonnerres | niv. 46, +1400 | victoire en 18 s (mesuré avec des coups 4 % plus forts que le réglage final) |
   | Mer de Nuages | niv. 48, +1700 | victoire en 31 s, 1 K.O. |
   | Œil du Cyclone | niv. 50, +2000 | victoire en 26 s, 1 K.O. |

   Un seul combat par niveau, et l'aléatoire pèse lourd : à la passe précédente (coups 10 % plus forts, boss 5–10 % plus résistants), Grotte aux Stalactites, Mer de Nuages et Œil du Cyclone étaient perdus, avec un boss restant à 6 %, 15 % et 43 %. Considère ces chiffres comme un ordre de grandeur, pas comme une garantie.
6. **Tremblement de caméra** : option stockée à part (`cubiquest_settings_v1`), pas dans `SaveState`, pour ne pas mêler confort et progression.
7. **Étoiles de victoire** purement cosmétiques (1 = victoire, +1 pour 2 réactions, +1 pour un Ultime ou une esquive parfaite), rien n'est stocké.
8. **Mode aperçu `?stage=`** ajouté pour pouvoir vérifier les niveaux de fin de jeu ; il ne touche jamais à la sauvegarde.
9. **Bug existant corrigé au passage** : à la lecture de la boucle d'expédition, la victoire était re-détectée sous l'écran de résultat et le rappel de fin pouvait repartir toutes les 0,7 s (donc récompenses en double tant que la fenêtre restait ouverte). Ajout d'un verrou `resultSent`. Je l'ai repéré dans le code, je ne l'ai pas reproduit sur `main` avant de le corriger.
10. `OutcomeModal` a déménagé de `StatusModals.tsx` vers son propre fichier (il a triplé de taille). `server.ts` et le Codex Gemini ne sont pas modifiés.

## Abandonné, et pourquoi

- **5e palier de Marmite, nouveaux éléments/statuts** : auraient élargi la forme de la sauvegarde et la table des types pour un gain faible ; préféré finir et tester l'existant.
- **Modèles voxel uniques par boss** : les boss réutilisent la silhouette de leur espèce (agrandie), comme dans le jeu de base.
- **Musique** : uniquement des effets sonores, pas de boucle musicale (risque de fatigue sonore sans réglage de volume).
- **Indicateur d'heure au camp** et portraits 2D par silhouette (les avatars SVG restent génériques, seules les couleurs changent).

## Bugs connus / non vérifié

- **FPS non mesuré sur un vrai GPU.** Toute la vérification visuelle s'est faite en Edge headless avec rendu logiciel (~10 images/s par nature). Les budgets sont plafonnés et instanciés, mais l'objectif « ~60 FPS » reste à confirmer sur ta machine.
- **Je n'ai pas joué à la main.** Les combats ont été observés en mode Auto via des captures et le texte du HUD : aucun plantage ni erreur console sur les 6 nouveaux niveaux, le camp, la carte, la marmite et l'évolution. Le ressenti (lisibilité des télégraphes, difficulté réelle avec esquives) n'a pas été éprouvé par un humain.
- **Équilibrage estimé** : l'équipement d'une vraie escouade en fin de jeu est simulé par un bonus fixe. Si c'est trop dur ou trop facile, tout se règle dans `catalog.ts` (3 nombres par niveau).
- **Le mode Auto n'utilise jamais Dispersion** (comportement d'origine) : il encaisse toutes les attaques télégraphiées, ce qui rend les nouveaux boss serrés en automatique.
- **Flash de foudre** : intensité non jugée sur écran réel. Il est atténué quand le tremblement est désactivé.
- **Animation d'évolution** : la phase de révélation et l'habillage ont été capturés ; la phase de charge (toupie + halo) n'a pas été capturée à l'image, seulement exécutée sans erreur.
- **Sons** : écrits mais jamais écoutés (headless muet). Volumes à ajuster à l'oreille.
- En mode aperçu, la ligne « Montée de niveau » de l'écran de fin affiche l'escouade de la sauvegarde, pas celle de l'aperçu (cosmétique, rien n'est enregistré).
- Avertissements préexistants conservés : `PCFSoftShadowMap` déprécié (three), bundle > 500 kB.
- Le Professeur Cubix (Codex) ne connaît pas le nouveau contenu, son prompt étant dans `server.ts` (interdit de modification).

## Idées pour la suite

- Faire utiliser Dispersion au mode Auto quand un télégraphe ennemi est actif.
- Curseur de volume + petite boucle musicale par biome.
- Avatars 2D par silhouette, et fiche de boss dans la carte des expéditions (rappel de ses mécaniques).
- Défis d'étoiles enregistrés par niveau (3 étoiles = récompense unique).
- Un 3e kit de boss « Mirage » pour Cumulord (clones, zones inversées).
- Découper le bundle (three en chunk séparé) pour le premier chargement.

## Jalons (un commit chacun, tous poussés)

1. Base verte (tests + tsc)
2. Juice des combats
3. Toundra Boréale + ses créatures
4. Cime des Orages + ses créatures
5. Recettes, pierres, quêtes, succès, sauvegarde v3
6. Ambiance, évolution, entrée de boss, victoire, transitions
7. Finitions, équilibrage final, ce document
