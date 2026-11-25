# Banc d'essai n° 1 : le geste de combat — mode d'emploi

- **Fiche** : `docs/plan/BANC_CONTROLE.md`.
- **Lien** : https://zedkay37.github.io/CUBIQUEST/proto/?banc=controle (aussi depuis l'accueil `/proto/`).
- **Code** : `src/proto/banc/` ; tests : `src/game/proto-banc.test.ts`.

## Les adresses

| Adresse | Effet |
|---|---|
| `?banc=controle` | accueil du banc : prédiction, les 4 variantes, tirage au sort, essais enregistrés, export JSON / CSV |
| `?banc=controle&variante=0`, `A`, `B` ou `C` | lance directement une variante |
| `?banc=controle&variante=hasard` | variante tirée au sort, cachée jusqu'à ce que la grille soit remplie |

## Ce qui est identique dans les 4 variantes

- **L'équipe** :
  - Magmadrake (destructeur : ses coups éclaboussent autour de la cible) ;
  - Crabastion (protecteur) ;
  - Raicube (contrôleur, à distance).
  - Mêmes statistiques partout, aucun bonus pour la créature contrôlée (vérifié par test).
- **Les compétences**, chacune avec sa propre recharge, sans ressource commune :

| Touche | Créature | Compétence | Recharge | Effet |
|---|---|---|---|---|
| 1 | Magmadrake | Éruption | 9 s | zone de feu au point visé (70) |
| 2 | Crabastion | Choc | 10 s | étourdit autour de lui, attire les coups ; **seule façon d'interrompre l'Effondrement** |
| 3 | Raicube | Filet d'éclairs | 8 s | immobilise 2 s les invocations au point visé (25) |

- **Le boss, le Gardien de basalte** (visuel : Cendrox), 2 200 PV :
  1. **Invocations** : 3 petites créatures toutes les 11 s ; elles vont sur la créature la plus fragile.
  2. **Effondrement** : toute l'arène, annoncé 2,5 s, 130 dégâts à chaque créature. Toutes les 15 s, la première à 9 s. Interrompu par le Choc, il ouvre 6 s de vulnérabilité (dégâts × 1,6).
  3. **Faille** : une zone annoncée 1,5 s sous chaque créature, toutes les 6 s ; il faut en sortir.
- **Le reste** :
  - l'IA des créatures non contrôlées : elles sortent des zones, et Crabastion file au contact pendant l'Effondrement ;
  - une seule salle sans brouillard, une caméra fixe, les mêmes effets.
- **Pause tactique** (Espace) dans toutes les variantes : scène désaturée. Chaque pause est enregistrée, avec son moment.

## Les mesures enregistrées à chaque essai

- issue, durée, variante ;
- actions par minute (seulement celles du joueur), pauses et leurs moments ;
- dégâts infligés et subis par créature, part des dégâts ;
- interruptions réussies, Effondrements passés ;
- zones évitées et subies ;
- invocations apparues et restantes ;
- changements de créature (C).

Chaque essai s'enregistre dans le navigateur (`cubiquest_proto_banc_essais`), avec la grille. Les deux exports (JSON, CSV) sont sur l'accueil du banc.

## Écarts et choix à connaître

- **Les 10 critères de la synthèse GPT ne sont pas dans la fiche.** La grille a 10 lignes « Critère 1 » à « Critère 10 », notées de 1 à 5 ; leurs intitulés se saisissent une fois sur l'accueil du banc. Il y a aussi une case « une frustration venait des commandes », pour la règle d'exclusion.
- **La règle d'exclusion est calculée sur l'accueil** à partir de 5 essais par variante : une créature au-dessus de 60 % des dégâts en moyenne, ou une frustration de commande dans au moins 2 essais.
- **Créature contrôlée qui tombe** (B et C) : on prend automatiquement la suivante encore debout (sinon l'essai s'arrêterait).
- **B et C** : les compétences des compagnons ne partent que si le joueur les déclenche. Seule la variante 0 les lance automatiquement.
- **F (cible commune)** : disponible en A, B et C.
- **En A**, ZQSD déplace le point de ralliement du groupe ; chaque créature garde sa ligne autour de lui.
- **Réglage de départ** : l'IA seule (variante 0, placement par défaut) perd de peu (il reste environ 60 PV au Gardien). Une seule interruption manquée ou réussie fait basculer l'issue, d'où un réglage « difficile » sans victoire assurée.
- **Le Gardien de basalte** est un essai : il n'est pas ajouté au jeu.
