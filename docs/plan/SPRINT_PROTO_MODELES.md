# Sprint PROTO-MODELES : plusieurs façons de jouer, à essayer une par une

Rédigé le 24 novembre 2026. Le joueur hésite entre plusieurs modèles de jeu. Au lieu de trancher sur papier, il veut une maquette jouable de chacun, sur le même moteur, avec les mêmes créatures, pour comparer en jouant. Il veut aussi de vraies animations pour les sorts.

Le niveau visé est « maquette » : chaque modèle doit être jouable et compréhensible en 5 minutes, pas équilibré finement. Ne tranche aucun choix à la place du joueur.

## 1. Règles de sécurité (identiques au sprint PROTO-DONJON)
- Avant tout, crée le tag `sauvegarde-avant-proto-modeles` sur `proto-meneur`. Travaille sur `proto-meneur`, et crée un tag `proto-modeles-phaseN` à la fin de chaque phase.
- Ne touche ni à `main`, ni à `/`, ni à `/next/`, ni aux modes de jeu existants, ni aux fichiers .vox. `npm run check` doit passer, et les combats simulés du jeu doivent rester identiques.
- Publication uniquement sur `/proto/`, à la fin de chaque phase. Aucune clé de stockage en dehors de `cubiquest_proto_*`.
- Aucun objet lancé pour libérer une créature : elle bondit elle-même. Aucun nom, texture, modèle ni élément d'interface repris de Pokémon, de Minecraft ou de Warcraft.
- Pas de musique, aucune progression sauvegardée, pas de réseau.
- Garde les modes existants (A le trio, B la meute) tels quels, pour pouvoir comparer.
- Si une phase devient trop lourde, arrête-toi après la phase en cours et explique pourquoi.

## 2. Le banc d'essai
- Une page d'accueil `/proto/` qui présente tous les modèles. Pour chacun :
  - son nom ;
  - une phrase qui dit ce que fait le joueur ;
  - ses touches ;
  - un bouton « Jouer ».
- Tous les modèles partagent le même moteur de combat, les mêmes créatures (.vox existants), le style toon et, quand c'est possible, le mini-donjon et ses étages.
- La touche F1 reste disponible partout (vitesse, caméra, densité, graine).
- Écran de fin commun, avec « Copier les résultats » (JSON avec le modèle et les réglages).

## 3. Les modèles à construire, un par phase, du moins cher au plus cher

### Phase 1 : C, « le chef d'orchestre »
(Phase remplacée par décision du joueur ; elle remplace l'ancienne phase 1, « l'équipe qui suit et qui bondit ».)
- Le joueur déplace le Meneur avec ZQSD pour explorer le mini-donjon. Le Meneur n'attaque pas tout seul et ne tire pas.
- Les 2 compagnons et le Meneur combattent automatiquement, avec des attaques de base faibles.
- Toutes les actions qui comptent sont des cartes : une main de 4 cartes, tirées d'un deck de 10 construit à partir de l'équipe. Il y a des sorts de chaque créature et des ordres : Focus, Repli, Regroupement, Protéger le Meneur.
- Une jauge de mana qui se recharge avec le temps. Chaque carte coûte de 1 à 3. Touches 1 à 4 pour choisir une carte, clic pour viser la cible ou la zone. Une carte jouée est remplacée par la suivante du deck.
- Entre deux étages, un écran simple permet d'échanger 2 cartes du deck contre d'autres de la même équipe.
- Se joue dans le mini-donjon, avec la touche F1 disponible.

### Phase 2 : D, « le héros et ses suiveurs » (la référence la plus simple)
- Le joueur dirige une seule créature, avec 4 compétences (1 à 4) et l'esquive.
- 2 petits compagnons suivent et aident seuls. Le joueur ne leur donne aucun ordre.
- Sert de point de comparaison : est-ce que les ordres apportent quelque chose par rapport à un simple jeu d'action ?
- Se joue dans le mini-donjon.

### Phase 3 : E, « le relais »
- Une seule créature sur le terrain à la fois. Le joueur l'échange instantanément avec l'une des 3 autres de l'équipe (Q, E, R, ou 2, 3, 4 si besoin).
- Chaque créature a un effet d'entrée et un effet de sortie, par exemple une vague en sortant, ou un choc sur les ennemis mouillés en entrant.
- Un échange a un court temps de recharge.
- Se joue dans le mini-donjon.

### Phase 4 : F, « la pause tactique »
- Comme le trio A, mais Espace fige le temps : le joueur clique sur une créature et lui donne un ordre (aller ici, attaquer celui-là, lancer tel sort). Les ordres s'affichent sous forme de flèches.
- Une nouvelle pression sur Espace relance le temps.
- L'esquive passe sur une autre touche (Maj, par exemple).
- Se joue dans le mini-donjon.

### Phase 5 : G, « les instincts »
- Avant la descente, un écran simple : pour chaque compagnon, 2 règles « si… alors… » à choisir dans des menus, par exemple « si un allié a moins de 30 % de PV, alors le soigner » ou « toujours viser le Soigneur ennemi ». Entre 6 conditions et 6 actions.
- En combat, la meute suit ses règles. Le joueur dirige le Meneur et dispose de 3 jetons d'ordre par étage : focus, repli, ultime.
- Les règles se modifient entre deux étages.
- Se joue dans le mini-donjon.

### Phase 6 : H, « la conquête » (déploiement pur)
- Le joueur ne dirige aucune créature. Une carte à part : 3 routes entre ta base et celle du boss, avec des avant-postes à prendre.
- Une main de 4 cartes-créatures, tirées d'un deck de 6, et une jauge d'Élan qui monte avec le temps.
- Clic sur une zone autorisée : la créature bondit sur le terrain à cet endroit, puis avance et combat seule selon son rôle.
- Prendre un avant-poste agrandit la zone où l'on peut poser ses créatures, et accélère l'Élan.
- On gagne en détruisant le boss au bout des routes.

### Phase 7 : I, « l'alchimiste du sol » (s'il reste de la marge)
- Dans une salle dédiée, le sol est fait de matières : herbe, eau, roche, lave, glace.
- Les sorts du Meneur transforment le sol : geler l'eau pour faire un pont, inonder, brûler l'herbe.
- Chaque créature est plus forte sur son sol favori : bonus visible.
- 2 transformations par élément au maximum, avec un affichage très clair.
- Si c'est trop lourd, ne fais pas cette phase et explique pourquoi.

### Phase 8 : les animations des sorts (pour tous les modèles)
Pour chaque sort et chaque attaque des créatures utilisées, 3 temps :
- **Préparation** : la créature se ramasse, et une lueur ou des particules se concentrent.
- **Lancer** : un mouvement d'élan, puis le projectile, l'onde ou la zone part avec une forme propre à l'élément (flammes en éventail, vague, éclair en zigzag, racines qui sortent du sol, pics de roche, spirales).
- **Impact** : un flash, des éclats, un léger recul de la cible et une trace au sol qui s'efface.

Style toon : formes simples et lisibles, couleurs de l'élément, contour. Les lueurs sont réservées aux gros sorts. Chaque sort doit se reconnaître à sa forme, pas seulement à sa couleur. Respecte un budget de performance : mesure les images par seconde avec beaucoup de sorts à l'écran.

Ajoute aussi, si c'est possible sans squelette d'animation :
- une respiration au repos ;
- une marche ;
- un coup reçu ;
- un bond avec écrasement au départ et étirement à l'arrivée.

## 4. Mesures et protocole
- Pour chaque modèle, deux robots seulement : celui qui appuie sur tout et celui qui s'adapte, 10 parties chacun. Signale tout modèle où celui qui appuie sur tout gagne autant que celui qui s'adapte. Résultats dans `docs/proto/ROBOTS-MODELES.md`.
-

(Note de Claude Code : la fiche reçue s'arrête ici, sur un tiret vide ; la suite n'a pas été transmise.)
