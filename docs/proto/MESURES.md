# PROTO-DONJON — images par seconde

## Comment

- Page publiée construite en local, Edge sans fenêtre, carte graphique de la machine de développement, 1280 × 800, sans limite à 60 images/s.
- Le Meneur est placé au centre de la salle qui a le plus d'éléments de décor de l'étage. Les ennemis sont retirés.
- Mesure sur 8 secondes, avec ombres, torches et estompage actifs.

| Étage (graine) | Salle la plus chargée | Éléments de décor (salle / étage) | Images/s moyennes | 5 % les plus lentes | Appels de dessin | Triangles |
|---|---|---|---|---|---|---|
| forêt (2000) | point d'eau | 31 / 163 | 488 | 67 | 128 | 252 136 |
| forêt (2001) | point d'eau | 25 / 124 | 487 | 71 | 126 | 218 690 |
| forêt (2002) | grande salle | 30 / 155 | 488 | 71 | 131 | 236 886 |
| grotte, boss (3000) | salle du boss | 48 / 111 | 539 | 58 | 83 | 151 980 |
| grotte, boss (3001) | salle du boss | 60 / 120 | 543 | 57 | 79 | 170 412 |
| forêt (2000), caméra éloignée | point d'eau | 31 / 163 | 513 | 85 | 140 | 252 280 |

## Lecture

- **Large marge sur cette machine.** Le décor est instancié : un appel de dessin par élément et par couche. Le décor n'a pas eu besoin d'être réduit.
- **Quelques images lentes**, autour de 57 à 85 images/s, encore au-dessus de 60 sur cette machine.
- **Non vérifié** : un PC moyen ou un portable, avec un vrai écran. Le navigateur sans fenêtre ne dit rien de fiable sur une autre machine.
- **Pour mesurer chez soi** : ouvrir la page avec `&robot=adaptatif` et regarder la fluidité. Ou demander une mesure par le même script.
