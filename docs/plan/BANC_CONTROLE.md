# CubiQuest : fiche du banc d'essai n° 1, le geste de combat (25 nov. 2026)

Fiche à donner à Claude Code. Elle découle de la synthèse GPT « triangulation de l'ADN du joueur » (40 questions), de la critique de Claude et de deux QCM du 25/11 au soir. **Une seule chose change entre les variantes : le contrôle.** Tout le reste est identique.

## Objectif
Trouver le geste de combat le plus plaisant, sans rien conclure sur la composition, la progression ou l'économie.

## Les 4 variantes (choisies par le joueur)
Paramètre d'URL : `?banc=controle&variante=0|A|B|C|hasard`

- **0 · Aucun contrôle (témoin)** : avant le combat, placement sur 2 lignes (avant / arrière) et priorité de cible par créature. Ensuite, tout est automatique, compétences comprises.
- **A · Contrôle collectif** : l'équipe se déplace en groupe (ZQSD). Les attaques sont automatiques. Le joueur déclenche les 3 compétences (1, 2, 3) et peut désigner une cible commune (F + curseur).
- **B · Meneur fixe** : le joueur dirige une créature, choisie avant l'essai, en la faisant tourner d'un essai à l'autre. Les autres sont automatiques. Il peut déclencher les compétences des compagnons. Base existante : maquette A du proto (`modele=A`). Aucun bonus de puissance pour la créature contrôlée.
- **C · Contrôle interchangeable** : comme B, plus le changement de créature contrôlée à tout moment (Tab, ou clic sur le portrait). Pas d'effet d'entrée ni de sortie.
- **Pause tactique** : activable dans toutes les variantes (Espace), avec la scène désaturée. On l'enregistre, on ne l'impose pas.
- **IA des créatures non contrôlées** : la même dans toutes les variantes.

## Créatures (identiques partout)
- **Magmadrake** (destructeur, dégâts de zone) : **à transformer en allié**. C'est aujourd'hui le boss du proto, et le modèle voxel existe.
- **Crabastion** (protecteur) : sa compétence interrompt la grosse attaque du boss.
- **Raicube** (contrôleur, à distance) : existe déjà (`RAICUBE` dans `src/proto/sim.ts`).
- Temps de recharge **individuels**, sans Élan ni ressource commune. Mêmes statistiques et mêmes compétences dans les 4 variantes.

## Le boss : le « Gardien de basalte » (3 problèmes, pas plus)
1. **Invocations prioritaires** : de petites créatures apparaissent à intervalle régulier et débordent l'équipe si on les ignore.
2. **Grosse attaque interruptible** : annoncée clairement (environ 2,5 s), elle est dévastatrice si elle passe. L'interrompre ouvre une fenêtre de vulnérabilité (environ 6 s, dégâts subis augmentés).
3. **Zone au sol annoncée** : il faut en sortir à temps.

Ce sont des valeurs de départ, à régler pour que chaque variante soit **difficile** : on ne cherche pas des taux de victoire égaux. Visuel du boss : au choix, Cendrox est proposé par le document GPT (à vérifier dans les fichiers).

## Arène
Une seule salle, sans donjon, sans brouillard noir, avec la même caméra et la même qualité de retour visuel (impacts, annonces) dans les 4 variantes.

## Mesures automatiques à chaque essai (export JSON ou CSV)
- la part des dégâts infligés et subis par créature ;
- les actions par minute ;
- la pause : nombre d'utilisations et moments ;
- les interruptions réussies ou ratées, les zones évitées ou subies ;
- la durée, le résultat et la variante.

À la fin de chaque essai, un écran « pourquoi j'ai gagné ou perdu » résume ces chiffres.

## Protocole (le joueur teste seul)
- **Avant la première séance**, écrire une ligne de prédiction : « je pense que la variante X va gagner ».
- **Mode `variante=hasard`** : la variante est tirée au sort et cachée jusqu'à ce que la grille soit remplie.
- **Au moins 5 essais par variante**, sur au moins 2 jours différents, sur le vrai PC du joueur.
- **Grille remplie juste après chaque essai** : les 10 critères de la synthèse GPT, plus « Qu'est-ce qui m'a agacé ? ».

## Règle de décision (fixée d'avance)
1. **Exclusion** : une variante est éliminée si une créature fait en moyenne plus de 60 % des dégâts (effet héros), ou si une frustration liée aux commandes revient dans au moins 2 essais sur 5.
2. **Choix** : parmi les variantes restantes, le **ressenti global** du joueur décide.
3. **Date du verdict** : à fixer par le joueur. Ce jour-là, il écrit « je choisis X ».

## Ce que ce test ne dira pas
Il ne dit rien de la profondeur de composition (l'équipe est la même partout), ni des ressources (test 2), ni de la réserve (test 3), ni de l'écart de niveau acceptable (test 4).

## À ne pas développer avant le verdict
Les expéditions procédurales, d'autres créatures, les talents, les étoiles, l'équipement, l'économie, l'Élan, les instincts, les combos d'entrée et de sortie, le terrain transformable, la coop, le PvP et le contenu de campagne. Aucune fusion de variantes.
