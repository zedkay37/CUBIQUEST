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

- **Le boss, le Gardien de basalte** (visuel : Cendrox), 2 000 PV :
  1. **Invocations** : 3 petites créatures toutes les 11 s ; elles vont sur la créature la plus fragile.
  2. **Effondrement** : toute l'arène, annoncé 2,5 s, 130 dégâts à chaque créature. Toutes les 15 s, la première à 9 s. Interrompu par le Choc, il ouvre 6 s de vulnérabilité (dégâts × 1,6).
  3. **Faille** : une zone annoncée 1,5 s sous chaque créature, toutes les 6 s ; il faut en sortir.
- **Le reste** :
  - l'IA des créatures non contrôlées : elles sortent des zones avec un temps de réaction de 0,5 s après l'annonce, et Crabastion file au contact pendant l'Effondrement ;
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

- **La grille** reprend les 10 critères de la synthèse, notés de 1 à 5, et le champ « Qu'est-ce qui m'a agacé ? ». La case « une frustration venait des commandes » sert à la règle d'exclusion.
- **La règle d'exclusion est calculée sur l'accueil** à partir de 5 essais par variante : une créature au-dessus de 60 % des dégâts en moyenne, ou une frustration de commande dans au moins 2 essais.
- **Créature contrôlée qui tombe** (B et C) : on prend automatiquement la suivante encore debout (sinon l'essai s'arrêterait).
- **Compétences automatiques** :
  - en 0, toutes partent automatiquement ;
  - en B et C, celles des compagnons non contrôlés partent automatiquement (mêmes règles qu'en 0), et le joueur peut les forcer avec 1, 2 ou 3 ;
  - en A, toutes restent manuelles.
- **F (cible commune)** : disponible en A, B et C.
- **En A**, ZQSD déplace le point de ralliement du groupe ; chaque créature garde sa ligne autour de lui.
- **Réglage** : l'IA seule (variante 0, placement par défaut) gagne 45 essais sur 120, environ 4 sur 10 (graines 1–40, 101–140, 201–240). Dans ses défaites, il reste en moyenne 135 à 162 PV au Gardien.
- **Le Gardien de basalte** est un essai : il n'est pas ajouté au jeu.
