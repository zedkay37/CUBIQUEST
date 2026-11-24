INSTRUCTIONS POUR CLAUDE CODE : copie tout ce texte dans le fichier docs/plan/SPRINT_PROTO_DONJON.md (sur la branche proto-meneur, après le tag de sauvegarde de la section 2), commite-le, puis exécute la fiche phase par phase.

# Sprint PROTO-DONJON : un mini-donjon où l'on teste tous les choix en jouant

Rédigé le 24 novembre 2026. Ce sprint remplace la demande « schémas de contrôle + robot esquive-seule », qu'il intègre.

## 1. Pourquoi ce sprint

La maquette PROTO-MENEUR marche, mais elle donne une sensation de jeu de tir dans une arène vide, pour trois raisons :
- le tir à la souris ;
- un Meneur qui tire à distance ;
- une décision principale qui se résume à esquiver.

Le joueur veut juger son jeu sur la bonne sensation :
- jouer comme dans Pokémon Donjon Mystère : une équipe qui explore des étages, trouve l'escalier, croise des créatures, en recrute ;
- des décors à l'ambiance Minecraft Dungeons et Donjon Mystère : des salles riches, des couloirs, des détails, de la lumière.

Le but de ce sprint : un mini-donjon de 3 étages, avec un panneau de réglages qui permet de basculer chaque choix en direct, pour que le joueur et son cousin tranchent en jouant.

Ce n'est pas le jeu final. C'est un banc d'essai.

## 2. Règles de sécurité (non négociables)

- Avant tout, crée le tag `sauvegarde-avant-proto-donjon` sur `proto-meneur`, puis travaille sur `proto-meneur`. Crée un tag `proto-donjon-phaseN` à la fin de chaque phase.
- Le jeu actuel reste intact : ne touche pas à `main`, à `/`, à `/next/`, ni aux modes de jeu existants.
- Publication uniquement sur `/proto/`. Publie à la fin de chaque phase, pour que le joueur puisse essayer à tout moment.
- La sauvegarde du joueur (localStorage) n'est ni lue ni écrite. Les clés de la maquette commencent par `cubiquest_proto_`.
- Juridique :
  - Aucun objet lancé (cube, sphère…) pour libérer ou capturer une créature : les créatures bondissent elles-mêmes (un brevet de Nintendo vise le lancer d'objet).
  - L'ambiance s'inspire de Minecraft Dungeons et de Donjon Mystère, mais ne copie rien : aucune texture, aucun modèle, aucune icône, aucun nom ni aucune interface reprise de ces jeux. Tout est original, en voxels, dans le style F (toon).
- `npm run check` doit passer, et les combats simulés du jeu actuel doivent rester identiques.
- Si une phase devient trop lourde ou trop risquée, arrête-toi après la phase en cours et explique la situation, plutôt que de tout bâcler.

## 3. Direction graphique

- Style F (toon), avec des lueurs ponctuelles : torches, cristaux, sorts, arrivée d'une créature, phase 2 du boss.
- Les .vox existants pour les créatures. Aucune nouvelle créature.
- Lisibilité d'abord :
  - les anneaux au sol (doré pour le Meneur, vert pour l'équipe, violet pour les ennemis) sont gardés ;
  - les attaques annoncées restent visibles malgré les décors ;
  - les décors ne cachent jamais un personnage ; au besoin, ils s'estompent quand un personnage passe derrière.
- Budget de performance : la maquette doit rester fluide sur un PC moyen. Mesure les images par seconde et réduis le décor si besoin.

## 4. Les phases

### Phase 0 : inventaire et architecture (courte)
- Repère ce qui peut être repris de la maquette actuelle : la simulation rejouable, les attaques annoncées, la version A, la version B, les robots.
- Prévois un panneau de réglages (touche F1, et paramètres d'URL) qui changera les options sans recharger la page quand c'est possible.
- Une graine (seed) détermine le donjon généré. Elle est affichée et modifiable, pour rejouer exactement le même donjon.
- Note les constats en 10 lignes au plus.

### Phase 1 : un étage qu'on explore (la sensation Donjon Mystère)
- Génération : un étage = des salles faites à la main, assemblées au hasard selon la graine et reliées par des couloirs. C'est la méthode de Minecraft Dungeons : des salles dessinées à la main, une génération salle par salle, et quelques salles fixes qui servent de repères.
  - 8 à 10 modèles de salles : petite, grande, en L, à piliers, avec un point d'eau, avec un passage étroit, un cul-de-sac avec un trésor, une salle-nid.
  - Une salle de départ et une salle avec l'escalier qui mène à l'étage suivant.
- Exploration :
  - Le Meneur explore ; l'équipe le suit en file dans les couloirs.
  - Un brouillard couvre les salles pas encore visitées.
  - Une mini-carte simple en coin d'écran (réglable : visible ou non).
- Ennemis : des groupes errent ou dorment dans les salles. Ils remarquent l'équipe quand elle approche, et le combat commence sur place, sans changer d'écran.
- Objets au sol : un soin léger, et un cube d'Élan (utile à la version B). Ils se ramassent en marchant dessus.
- 3 étages : un écran court de passage d'étage (« Étage 2 »), puis un boss au 3e étage, dans une salle fixe.

### Phase 2 : les décors (ambiance Minecraft Dungeons et Donjon Mystère)
- Un kit de 25 à 35 éléments de décor en voxels, en style F :
  - arbres et souches, herbes hautes, fleurs, champignons ;
  - rochers et cailloux, murets, ruines, piliers ;
  - torches, cristaux lumineux, caisses, tonneaux, coffres ;
  - eau peu profonde, ponts de bois, racines.
- Des sols variés : herbe, terre, dalles, mousse, avec des transitions. Des murs avec du relief : plusieurs hauteurs et des créneaux.
- Un biome complet : une forêt ancienne avec des ruines, de jour.
  - Si le budget le permet, un 2e biome : une grotte de cristal, sombre, éclairée par les cristaux et les torches.
- Lumière chaude, brume légère au loin, ombres douces.
- Une règle de densité : riche sur les bords des salles, dégagé au centre, là où l'on combat.
- Les décors n'ont qu'un rôle visuel, ou celui d'obstacle fixe. Pas de terrain qui se transforme.

### Phase 3 : les contrôles et le combat
- Les schémas de contrôle, choisis dans le panneau :
  - 1, « Auto-attaque + ordres » :
    - ZQSD pour bouger ;
    - le Meneur attaque seul la cible désignée (clic gauche sur un ennemi), sinon l'ennemi le plus proche à portée ;
    - 1 et 2 lancent les sorts vers le curseur ;
    - Espace pour esquiver.
  - 2, « Clic souris » :
    - clic gauche au sol pour aller à cet endroit ;
    - clic gauche maintenu sur un ennemi pour l'attaquer, le Meneur se rapprochant jusqu'à sa portée ;
    - 1 et 2 lancent les sorts vers le curseur ;
    - Espace pour esquiver vers le curseur.
  - 3, « Tir » : l'ancien schéma, gardé pour comparaison.
- Le Meneur, choisi dans le panneau : Calcinarque (attaque à distance) ou Braizard (attaque au corps à corps).
- La composition, choisie dans le panneau :
  - A, le trio : 2 compagnons suivent. F pour cibler, R pour le retour, 3 et 4 pour leurs sorts.
  - B, la meute : une réserve de 4 créatures, 2 au plus en jeu, une jauge d'Élan de 4 crans. Molette pour choisir, clic droit pour faire bondir la créature au point visé, R pour le rappel.
- Vérifie qu'aucune touche n'entre en conflit, quels que soient les choix.
- Pour que l'équipe compte, et pas seulement l'esquive :
  - un ennemi Soigneur ne peut être atteint qu'en le contournant, ou par une créature qui bondit derrière lui ;
  - un ennemi blindé ne cède qu'à une attaque d'un compagnon précis ;
  - le boss a une attaque qu'un compagnon peut interrompre.
  - Le réglage reste grossier.

### Phase 4 : le recrutement (la sensation Donjon Mystère)
- Après un combat, un ennemi vaincu peut, avec une petite chance, demander à rejoindre l'équipe. Le joueur accepte ou refuse.
- La recrue rejoint la réserve (B) ou remplace un compagnon (A), pour la descente en cours seulement. Rien n'est sauvegardé.
- Une réserve limitée oblige à choisir qui garder.
- Le panneau permet de régler la chance de recrutement (0 %, 10 %, 30 %).

### Phase 5 : le panneau de réglages complet
Tous ces réglages sont accessibles par la touche F1 et par l'URL, et figurent dans les résultats :
- le schéma de contrôle (1, 2 ou 3), la composition (A ou B), le Meneur (Calcinarque ou Braizard) ;
- la caméra (proche, moyenne, éloignée) et son angle (plongée forte ou plus rasante) ;
- la vitesse du jeu (80 %, 100 % ou 120 %) et la densité des ennemis (faible, normale, forte) ;
- le donjon qui se réveille, activable ou non : plus on reste à un étage, plus des patrouilles arrivent ;
- la mini-carte, visible ou non ; la chance de recrutement ; la graine.
- Un bouton « Préréglage Donjon Mystère », qui active : schéma 1, composition A, caméra moyenne, mini-carte, recrutement à 10 %, donjon qui se réveille.

### Phase 6 : les mesures, les robots et le protocole
- Écran de fin d'une descente : issue, étage atteint, durée, PV, actions, dégâts par source (Meneur ou chaque compagnon), recrues. Un bouton « Copier les résultats » (JSON avec tous les réglages).
- Robots, mis à jour pour l'auto-attaque, à faire jouer sur le combat du boss et sur un étage :
  - celui qui appuie sur tout ;
  - celui qui suit une rotation fixe ;
  - celui qui s'adapte ;
  - celui qui esquive seul : il esquive parfaitement, mais n'utilise jamais les compagnons.
- 10 parties par robot, en A et en B. Résultats dans `docs/proto/ROBOTS.md`.
  - Signale clairement si le robot qui esquive seul gagne autant que celui qui s'adapte : cela voudrait dire que l'équipe ne pèse pas encore.
- Mesure les images par seconde dans la salle la plus chargée en décor, et note-les.
- Protocole (`docs/proto/PROTOCOLE.md`) :
  1. Le joueur seul essaie les schémas 1 et 2 pendant 5 minutes chacun, puis garde son schéma.
  2. Avec ce schéma, le joueur puis son cousin font une descente en A, puis une en B, dans un ordre tiré au hasard, sans explication.
  3. Ensuite, 4 questions :
     - « Laquelle veux-tu rejouer ? »
     - « Est-ce que ça t'a fait penser à Donjon Mystère ? Pourquoi ? »
     - « À quel moment t'es-tu senti perdu ? »
     - « Raconte ta meilleure action. »
  4. Une feuille vierge pour 2 testeurs.

## 5. Interdits

- Aucune progression sauvegardée (pas d'étoiles, de talents, de camp ni de tirages), ni réseau ni musique.
- Aucune nouvelle créature : uniquement les .vox existants.
- Pas de terrain qui se transforme, pas de construction.
- Pas d'équilibrage poussé : le but est de comparer les sensations.
- Ne tranche aucun choix à la place du joueur.

## 6. Compte rendu final

Un compte rendu court, en français simple, puis arrête-toi :
1. Les constats de la phase 0.
2. Ce qui a été fait, phase par phase, avec le lien `/proto/` et un lien vers le « Préréglage Donjon Mystère ».
3. Le tableau des robots, avec ta lecture en 3 lignes, surtout sur le robot qui esquive seul.
4. Les images par seconde mesurées.
5. Ce qui n'a pas pu être vérifié, et les phases éventuellement arrêtées.
6. Les tags créés.
