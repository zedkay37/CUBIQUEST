# SPRINT UI — Une interface qui a du caractère

Fiche de session hors plan, à exécuter après S06. Elle complète `docs/plan/PLAN_DIRECTEUR.md`, dont les règles générales (R1 à R16) s'appliquent toutes.

- **Départ** : tag `s06-final`
- **Branche** : `ui-polish`
- **Tag final** : `ui-final`
- **Durée visée** : 3 h
- **Ne touche pas à `main`** : les sessions S04 à S06 ne sont pas encore validées.

## But

Remplacer les « boîtes génériques » par une interface qui ressemble au jeu : des panneaux et des boutons en forme de blocs de jouet voxel, des transitions vivantes, et de vrais moments de joie (recrutement, évolution, victoire). **Aucune règle de jeu ne change.**

## Pourquoi maintenant

Les systèmes de combat et de campagne sont en place. L'interface a grandi par ajouts successifs : c'est le moment de lui donner une identité, avant que le jeu soit montré à des joueurs.

## Règles propres à ce sprint

1. **Aucun changement de gameplay.** Le golden master doit rester identique du début à la fin. S'il change, c'est une erreur : cherche-la.
2. **Tags de sauvegarde descriptifs**, poussés et vérifiés avant chaque section : `ui-avant-depart`, `ui-avant-composants`, `ui-avant-animations`, `ui-avant-moments`, `ui-avant-ecrans`, `ui-avant-mobile`, puis `ui-final`. Le message de chaque tag annoté décrit en une phrase l'état sauvegardé (par exemple « Interface d'origine, avant la bibliothèque de composants »).
3. **Rien d'externe** : ni image, ni son, ni police nouvelle, ni dépendance nouvelle. La bibliothèque `motion`, déjà installée, sert aux animations.
4. **Écrans appelés à disparaître** (la Marmite et la cuisine, la grille de Galets, les quêtes tournantes, le Codex) : on leur applique seulement les nouveaux composants, sans refonte. Le plan les remplace plus tard.
5. **Fluidité** : aucune animation React liée à la boucle de jeu à chaque image. Le HUD de combat garde sa fréquence de mise à jour actuelle.
6. **Accessibilité** : toute animation respecte `prefers-reduced-motion` ; les textes gardent un contraste d'au moins 4,5 pour 1.

## Section 0 — Départ et état des lieux · tag `ui-avant-depart`

- `git fetch --all --tags`, puis `git checkout -B ui-polish s06-final`.
- Capture **chaque écran** du jeu, en bureau (1280 × 720) et en mobile (360 × 640), dans `docs/captures/ui/avant/` : titre, choix du départ, camp de jour et de nuit, carte des expéditions, équipe, marmite, quêtes, Codex, combat, combat de boss, pause, victoire, défaite, évolution.
- Écris `docs/ui/audit.md` : pour chaque écran, ce qui fait « générique » (boîtes rectangulaires identiques, boutons plats, textes trop nombreux, hiérarchie confuse) et ce que tu vas changer.

## Section 1 — Une direction artistique et ses composants · tag `ui-avant-composants`

**Direction : « jouet voxel ».** L'interface est faite de blocs, comme les créatures.
- Panneaux en forme de bloc : coins légèrement biseautés, une tranche plus sombre en bas qui donne l'épaisseur, une ombre portée nette (pas de flou).
- Boutons qui **s'enfoncent** au clic : la tranche du bas disparaît, le bouton descend de 2 à 3 px.
- Couleur de chaque élément utilisée comme accent (badges, bordures de carte), jamais comme couleur de texte sur fond clair.
- Typographies déjà chargées : Bricolage Grotesque (titres), Plus Jakarta Sans (texte), JetBrains Mono (chiffres).

**Jetons de design** dans `src/game/styleGuide.ts` et en variables CSS : couleurs (fonds, panneaux, textes, accents, éléments, danger, succès), rayons, épaisseurs de tranche, ombres, espacements (échelle de 4 px), tailles de texte, durées d'animation (rapide 120 ms, normale 220 ms, lente 400 ms) et courbes.

**Bibliothèque de composants** dans `src/components/ui/`, chacun avec sa démonstration sur une page `?gallery=ui` :
- `BlockPanel` (panneau) ;
- `BlockButton` (principal, secondaire, danger, désactivé) ;
- `CreatureCard` (modèle ou icône, nom, niveau, élément, barres) ;
- `ElementBadge` ;
- `AnimatedBar` (PV, XP, Confiance : remplissage animé, gain affiché en surbrillance) ;
- `CountUp` (chiffre qui défile) ;
- `Tabs` ;
- `Toast` (notification courte) ;
- `Modal` (fenêtre en bloc qui entre en rebond).

Ajoute à `STYLE.md` une section « Interface » qui décrit ces règles.

## Section 2 — Transitions et micro-animations · tag `ui-avant-animations`

- **Changements d'écran** : glissement plus fondu (220 ms) ; les tiroirs entrent depuis leur bord avec un léger rebond.
- **Apparition des listes** : en cascade, 30 ms d'écart entre deux éléments, 12 éléments animés au plus.
- **Boutons** : enfoncement au clic, légère montée au survol sur bureau, petit son de clic existant si disponible.
- **Chiffres** : l'XP, les dégâts totaux, les récompenses défilent (`CountUp`).
- **Barres** : remplissage animé ; au passage de niveau, la barre déborde, flashe et repart de zéro.
- **Pastilles « Nouveau »** : légère pulsation, sans clignotement agressif.
- Avec `prefers-reduced-motion`, tout cela devient un simple fondu.

## Section 3 — Les moments forts · tag `ui-avant-moments`

Ce sont les moments que le joueur doit avoir envie de revoir. Chacun est un composant réutilisable, qu'on peut passer d'un clic ou d'une touche.

1. **Arrivée d'une créature** (aujourd'hui, à la sortie de la marmite), composant `ArrivalScene`, réutilisé plus tard par le recrutement par la Confiance. Environ 4 s :
   - assombrissement ;
   - faisceau de lumière de la couleur de l'élément ;
   - la créature tombe, rebondit et regarde le joueur ;
   - son nom s'écrit en grandes lettres, avec son badge d'élément et sa petite phrase ;
   - confettis voxel, son de joie existant.
   - Si c'est une créature jamais vue : bandeau « Nouvelle créature ! » et ajout visible au Carnet.
2. **Évolution** : garder la scène actuelle, et terminer par une seconde « avant, après », les deux formes côte à côte.
3. **Montée de niveau** en fin de combat : la carte de la créature saute, « Niv. 12 → 13 » défile, éclat doré.
4. **Victoire** : étoiles qui tombent une à une avec un son croissant, récompenses qui arrivent en cascade, bouton « Suivant » mis en avant.
5. **Défaite** : écran calme (pas de rouge agressif), ce qui a manqué en gros, bouton « Réessayer » mis en avant.
6. **Déblocage** (nouveau niveau, nouveau biome) : sur la carte, le chemin se trace et le nouveau lieu s'illumine.

## Section 4 — Les écrans principaux · tag `ui-avant-ecrans`

Refais avec les nouveaux composants, en gardant toutes les fonctions actuelles :
- **Écran titre** : le logo, le trio du joueur au camp en arrière-plan, « Jouer » ou « Continuer ».
- **Interface du camp** : trois à quatre gros boutons en bloc, pastilles « Nouveau ».
- **Carte des expéditions** : présentée comme une carte de l'île, avec les biomes, des chemins entre les niveaux, les étoiles sous chaque niveau, les niveaux verrouillés grisés ; le niveau choisi affiche son défi, son boss et le niveau conseillé.
- **Équipe** : grandes cartes de créature, comparaison claire avant et après un changement.
- **HUD de combat** : même information, mieux hiérarchisée. Les cartes de sorts en blocs, le bouton d'esquive et le Déchaînement plus lisibles. Ne change ni les touches ni les règles.
- **Pause** et **options** avec les nouveaux composants.
- Écrans appelés à disparaître (marmite, Galets, quêtes, Codex) : nouveaux composants seulement.

## Section 5 — Mobile, accessibilité, vérification · tag `ui-avant-mobile`

- Tous les écrans de 360 × 640 à 2560 × 1440 : aucun texte coupé, aucun bouton de moins de 44 px sur mobile.
- Navigation au clavier : Tab parcourt les éléments dans un ordre logique, contour de focus visible, Échap ferme, Entrée valide.
- Test automatique du contraste des couleurs de texte de `styleGuide.ts` (au moins 4,5 pour 1).
- Captures **après** de tous les écrans dans `docs/captures/ui/apres/`, mêmes noms que les captures « avant ».
- Publie la branche sur `…/CUBIQUEST/next/` avec `npm run deploy:pages -- --target next`.

## Critères d'acceptation

- `npm run check` passe ; le golden master est **identique** à celui de `s06-final` ; `npm run texts` est à zéro.
- La page `?gallery=ui` montre tous les composants et les six moments forts (avec un bouton pour rejouer chacun).
- Plus aucun panneau ni bouton de l'ancien style sur les écrans principaux (relecture des captures).
- `prefers-reduced-motion` respecté (test ou vérification décrite dans le rapport).
- Tous les tags de la section « Règles » sont poussés et listés en tête du rapport, avec leur description.

## Hors périmètre

- Toute règle de jeu, tout équilibrage, tout nouveau système (deck de cartes, Confiance, Faille).
- La refonte des écrans appelés à disparaître.
- Les nouvelles créatures et les modèles 3D.

## Rapport

`docs/rapports/UI.md`, selon la règle R15, avec en plus :
- un tableau avant / après par écran, avec le nom des deux captures ;
- la liste des composants ;
- ce que tu n'as pas pu voir réellement à l'écran (si le navigateur sans interface ne rend pas le jeu, dis-le clairement).

## Contrôle du propriétaire (15 minutes)

1. Ouvre `…/CUBIQUEST/next/` : l'interface te semble-t-elle propre au jeu, ou encore générique ?
2. Rejoue un niveau jusqu'à la victoire : l'écran de fin te donne-t-il envie de continuer ?
3. Ouvre `?gallery=ui` et rejoue l'arrivée d'une créature : est-ce un moment de joie ?
4. Sur ton téléphone : tout est-il lisible et cliquable ?
5. Note ce qui fait encore « boîte générique ».

FIN DU SPRINT UI
