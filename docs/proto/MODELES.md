# PROTO-MODELES — les modèles de jeu du banc d'essai

Page d'accueil : https://zedkay37.github.io/CUBIQUEST/proto/ (chaque modèle a son bouton « Jouer »).

Tous les modèles partagent :
- le même moteur, les mêmes créatures (`.vox` existants) et le style toon ;
- le mini-donjon de 3 étages, sauf H qui a sa propre carte ;
- F1 (vitesse, caméra, densité, graine…) et l'écran de fin avec « Copier les résultats » (JSON avec le modèle et les réglages).

| Modèle | Ce que fait le joueur | Touches |
|---|---|---|
| **A · Le trio** (inchangé) | dirige le Meneur ; deux compagnons obéissent aux ordres | ZQSD, clic gauche (cible), 1 · 2, Espace, F, R, 3 · 4 |
| **B · La meute** (inchangé) | dirige le Meneur ; fait bondir les créatures de sa réserve | ZQSD, clic gauche, 1 · 2, Espace, molette, clic droit, R |
| **C · Le chef d'orchestre** | explore ; l'équipe se bat seule, faiblement ; tout ce qui compte se joue en cartes (main de 4, deck de 10, mana) ; échange de 2 cartes entre deux étages | ZQSD, 1 à 4 (carte), clic gauche (viser), clic droit (annuler) |
| **D · Le héros et ses suiveurs** | une seule créature, 4 compétences et l'esquive ; deux petits suiveurs aident seuls | ZQSD, clic gauche (cible), 1 à 4, Espace |
| **E · Le relais** | une créature sur le terrain ; échange instantané (recharge 2 s) ; effets d'entrée et de sortie | ZQSD, clic gauche (cible), 1 à 4 (échanger), clic droit (sort), Espace |
| **F · La pause tactique** | le trio ; Espace fige le temps, on donne des ordres (aller, attaquer, sort) affichés en flèches | ZQSD, clic gauche, 1 · 2, Maj (esquive), Espace (pause), F, R, 3 · 4 |
| **G · Les instincts** | 2 règles « si… alors… » par compagnon (6 conditions, 6 actions), avant la descente et entre les étages ; 3 jetons d'ordre par étage | ZQSD, clic gauche, 1 · 2, Espace, F (focus), R (repli), E (ultime) |
| **H · La conquête** | ne dirige personne ; pose des cartes-créatures sur 3 routes, prend les avant-postes, abat le boss | ZQSD (caméra), 1 à 4 (carte), clic gauche (poser), clic droit (annuler) |

Aucune touche ne sert à deux choses dans un même modèle (test `proto-donjon.test.ts`, toutes combinaisons).

## Les effets d'entrée et de sortie (E)

| Créature | Entrée | Sortie | Sort (clic droit) |
|---|---|---|---|
| Calcinarque | flammes autour de lui | laisse des braises | Brasier |
| Crabastion | pinces : étourdit | vague : mouille et repousse | Carapace |
| Amanitox | racines : immobilise | soigne celui qui entre | Spores |
| Raicube | éclair : triple sur les mouillés | décharge en chaîne | Foudre (double sur les mouillés) |

## Les animations des sorts (phase 8, tous les modèles)

- **Préparation** :
  - la créature se ramasse ;
  - des éclats aux couleurs de son élément convergent sur elle.
- **Lancer** :
  - un élan vers l'avant et une gerbe dans la direction du tir ;
  - le projectile a la forme de son élément : flamme, goutte, graine, roc qui tourne, éclair, éclat de glace.
- **Impact** :
  - un flash, des éclats qui retombent, un petit recul de la cible, une trace au sol qui s'efface ;
  - les sorts de zone ont leur forme : flammes qui jaillissent, racines qui sortent du sol, pics de roche, anneau de vague, éclairs en zigzag.
- **Créatures** : respiration au repos, balancement en marchant, écrasement au départ d'un bond et étirement à l'arrivée.
- **Pour les voir** :
  - `?proto=donjon&modele=A&vitrine=1` rejoue les six éléments côte à côte ;
  - `&effets=0` coupe les effets, pour comparer.

## Phase 7 (I, l'alchimiste du sol) : non faite

- **Pourquoi** :
  - c'est la seule phase qui transforme le terrain en cours de partie : pont de glace, inondation, herbe brûlée ;
  - le moteur des maquettes suppose un sol fixe (collisions, chemins, décor, brouillard calculés une fois par étage), et les sprints précédents l'interdisaient explicitement ;
  - la faire proprement aurait demandé de refaire ces quatre parties ;
  - la fiche la laissait facultative, et j'ai préféré garder la marge pour les animations des sorts (phase 8), utiles à tous les modèles.
- **Pour la faire plus tard** : une salle dédiée, avec un sol en cases qui change de matière, et des chemins recalculés à chaque transformation.
