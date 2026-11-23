# Sprint ART 2 : lisibilité — rapport

Branche `art-lisibilite`, partie de `art-final`. `main` n'a pas bougé.
Fiche : `docs/plan/SPRINT_ART2.md`, commitée en premier.

## Sauvegarde et tags (tous poussés et vérifiés par `git ls-remote --tags origin`)

| Tag / branche | Moment |
| --- | --- |
| `sauvegarde-avant-art2` (tag + branche) | état `art-final`, avant tout changement |
| `art2-avant-vent` | avant la section 0 |
| `art2-avant-couleurs` | avant la section 1 |
| `art2-avant-formes-de-base` | avant la section 2 |
| `art2-avant-formes-evoluees` | avant la section 3 |
| `art2-avant-premier-plan` | avant la section 4 |
| `art2-avant-tactile` | avant la section 5 |
| `art2-avant-rapport` | avant la section 6 |
| `art2-final` | fin du sprint |

Retour en arrière : `git checkout sauvegarde-avant-art2` (ou un tag `art2-avant-*` pour annuler une section).

`npm run check` est passé après chaque section : 135 tests, golden identique (840 combats), build OK. `npm run texts` et `npm run lexique` sont à 0.

## Ce qui a changé

### Section 0 : vent

- Le tronc reste immobile. Le feuillage tourne d'un bloc (au plus 2°), sur un cycle de 3 à 5 s, décalé d'un arbre à l'autre. Il n'est pas déformé (`meadowDecor.ts`).
- Les herbes oscillent deux fois moins (0,35 → 0,16) et les fleurs aussi (0,25 → 0,1).
- Le vent est coupé en qualité Basse et quand le système demande moins d'animations.
- Nouveau réglage dans Options : « Vent : Normal / Doux / Coupé » (`settings.wind`, testé dans `bench.test.ts`).
- Décision de la section 6 : la phase et la période de chaque arbre se calculent à partir de son numéro, sans tirage aléatoire. Avec des tirages, tout le décor suivant changeait de place, et la scène de mesure ne pouvait plus être comparée à `art-final`.

### Section 1 : couleurs des 9 créatures

- `models/artPalette.ts` calcule la palette :
  - le corps ;
  - la tête, plus claire ;
  - les détails sombres, avec au moins 25 % d'écart de luminosité ;
  - le ventre et l'accent.
- Le bruit de surface est ramené à ±1,3 % (`ART2_AO_STRENGTH`). La limite était de ±4 %.
- Le contour et l'éclairage sont gardés.
- Test (`art.test.ts`) : la tête, les détails, le ventre et l'accent ont tous au moins 15 % d'écart avec le corps.
- Décision : j'ai essayé des normales lissées pour adoucir les surfaces en escalier. Elles faisaient des taches sur les faces plates, je les ai abandonnées (l'option existe mais n'est pas utilisée, voir le commentaire dans `creatures.ts`).

### Section 2 : formes de base

| Créature | Détail signature |
| --- | --- |
| Pyrocube | cube de braise lumineux sur la tête |
| Ampoulin | ampoule sur sa douille |
| Cailloc | deux cristaux d'ambre et une fissure sombre au front |

- Les têtes font 48 %, 46 % et 45 % de la hauteur.
- Les yeux font 3 blocs de haut, avec un reflet.
- La tête, le corps, les pattes et le détail sont des volumes distincts, en boîtes aux coins taillés.
- Nouveaux tests :
  - la tête des formes de base fait 45 à 50 % de la hauteur, celle des formes évoluées 30 à 40 % ;
  - les 9 silhouettes noires vues de face, ramenées à 64 px, sont toutes différentes (recouvrement < 90 % deux à deux).

### Section 3 : formes évoluées

- Flambrix, Ignisaur, Bobinard, Voltacier, Granitox et Magmadrake :
  - les derniers ellipsoïdes sont devenus des boîtes : plus de rayures en escalier ;
  - la palette de la section 1 s'applique ;
  - les têtes de Granitox et Magmadrake sont agrandies jusqu'au seuil de 30 %.
- Cadrage : la créature remplit au moins 70 % de la hauteur, sa largeur étant bornée à 90 %. Cela vaut dans la galerie, les portraits (`portraitStudio.ts`) et le portrait qui tourne (`CreatureTurntable.tsx`).
- Les choix anti-plagiat du sprint ART sont gardés : plaques de lave d'Ignisaur, lignée du feu toute cubique, ailettes de bobine de Voltacier.

### Section 4 : premier plan du camp

- Au camp seulement, les arbres, les buissons, les rochers, les touffes et les fleurs passent du côté opposé à la caméra.
- Le relief du premier plan est plafonné à 0,5 : les gros blocs flous du bas de l'écran ont disparu.
- Il y a 40 % d'herbe en moins (480 → 287), en touffes de 7 brins, et 40 % de fleurs en moins (110 → 66), en bouquets de 3.
- Le panneau des expéditions est rapproché : il était coupé en 390 × 844.
- Le chemin et les 4 lieux (Atelier, panneau, totem, bibliothèque) sont dégagés au format 16:9 et en 390 × 844.
- Le combat ne change pas.
- `tools/captures.ps1 -Formats bureau,mobile,telephone` ajoute le format 390 × 844.

### Section 5 : au doigt (R17)

- Il n'existait aucun moyen de se déplacer au doigt en mode Manuel. J'ai ajouté une manette tactile (`TouchStick.tsx`) :
  - elle n'apparaît qu'en mode Manuel ;
  - elle a une zone morte au centre ;
  - relâcher arrête la créature ;
  - les touches du clavier restent prioritaires.
- Le moteur lit `setTouchMove`, remis à zéro à chaque départ. Un test le couvre.
- Les boutons du HUD de combat passent à 44 px (Auto, son, pause, cartes de sort).
- Sur un écran en hauteur, la caméra de combat recule de 35 % pour garder la mêlée en vue (`camera.ts`).

| Écran | Action | Au doigt (390 × 844) | Taille |
| --- | --- | --- | --- |
| Camp | toucher un lieu (Atelier, panneau, totem, bibliothèque) | oui (lieux en 3D, A3) | lieux larges |
| Camp | barre Expéditions / Options | oui | 44 px |
| Atelier | onglets, créer, fermer | oui | ≥ 44 px (A2) |
| Équipe | choisir le trio, meneur, détails, fermer | oui | 44 px sur téléphone (`w-11`, `min-h-[44px]`) |
| Équipe | variante (interrupteur) | oui | ligne de 44 px |
| Combat | se déplacer (mode Manuel) | **ajouté** : manette | 132 px |
| Combat | sorts (cartes) | oui | ≥ 44 px (corrigé) |
| Combat | Esquive | oui | grand bouton |
| Combat | Déchaînement | oui | grand bouton |
| Combat | Auto / Manuel | oui | 44 px (corrigé, 40 avant) |
| Combat | son, pause | oui | 44 px (corrigé, 40 avant) |
| Pause | Reprendre / Camp | oui | ≥ 44 px |

Vérifié par le code et par les captures en 390 × 844, mais **pas avec un vrai doigt** : le navigateur headless n'envoie pas d'événements tactiles. À essayer sur un téléphone, surtout la manette.

### Section 6

- `?gallery=art` affiche trois colonnes, « Avant ART », « ART » et « ART 2 », avec le bouton Silhouettes. La colonne ART utilise `SCULPT_DEFS_ART1`, une copie figée des modèles du sprint ART.
- Mesures : voir le tableau suivant.

## Performance (`?stage=meadow-2&debug=1&quality=X`, 1280 × 720, même instant)

| Qualité | `art-final` (draw calls / triangles) | ART 2 |
| --- | --- | --- |
| Bas | 178 / 17 460 | **175 / 16 884** |
| Moyen | 396 / 116 582 | 378 / 107 894 |
| Haut | 607 / 174 906 | 580 / 161 874 |

- J'ai remesuré `art-final` à la fin, dans un worktree, avec le même script.
- Incident : supprimer le worktree de mesure (`git worktree remove --force`) a vidé `node_modules` par la jonction. Réinstallé avec `npm ci` (même verrou, aucune dépendance ajoutée), puis `npm run check` repassé. Le dépôt n'a pas été touché.
- Après les formes de base, le Bas montait à 184 draw calls (le cadrage de l'instant mesuré changeait). Décision : les yeux et les parties lumineuses ne projettent plus d'ombre. On ne le voit pas à l'écran, et le Bas repasse sous `art-final`.

## Captures

- `docs/rapports/art2/avant/` : l'état `art-final`.
- `docs/rapports/art2/apres/` contient :
  - le camp de jour et de nuit, en bureau, mobile et téléphone ;
  - le combat et le boss en bureau et téléphone ;
  - l'équipe et l'Atelier ;
  - les 3 lignées ;
  - `art-<id>` pour les 9 créatures et les silhouettes ;
  - les mesures Bas, Moyen et Haut.

## Vu seulement sur images fixes (à juger en jeu)

- Le vent : le balancement du feuillage, le cycle de 3 à 5 s, le réglage Doux. Edge headless n'anime rien.
- La manette tactile : la sensation, la zone morte, la vitesse.
- Le recul de la caméra sur téléphone pendant un vrai combat (boss compris).
- Les couleurs et les formes en mouvement, et la ressemblance éventuelle avec des créatures existantes : à mon avis, aucune, toutes les formes sont des boîtes.

## Restart handle

- Changé : `meadowDecor.ts`, `settings.ts`, `artPalette.ts`, `sculptDefs.ts`, `sculptDefsArt1.ts`, `voxelSculpt.ts`, `creatures.ts`, cadrages (`portraitStudio`, `galleryRenderer`, `CreatureTurntable`), `camp.ts` (panneau), `camera.ts`, `TouchStick.tsx`, `ExpeditionHud.tsx`, `ArtGallery.tsx`, `captures.ps1`.
- Non vérifié : tout ce qui est listé ci-dessus comme vu seulement sur images fixes, et les FPS sur une vraie machine.
- Retour en arrière : tags `art2-avant-*` ou `sauvegarde-avant-art2`.
- Ne pas toucher : `main`, et le golden (identique).
- Prochaine étape sûre : jouer `…/next/` sur téléphone, puis avancer `main` sur `art2-final` si le résultat convient.
