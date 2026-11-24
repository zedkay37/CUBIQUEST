# PROTO-MENEUR — test des robots

Généré par `npx tsx tools/proto-robots.ts` : 10 parties par robot et par version, graines 1000 à 1009,
même salle, mêmes ennemis (2 vagues puis le boss), sur la simulation de la maquette (`src/proto/sim.ts`).
Les robots utilisent les mêmes commandes que le joueur. Le pas de jeu est de 1/60 s ; une partie s'arrête à 6 minutes.

| Version | Robot | Victoires | Durée moy. | PV du Meneur (victoires) | Actions moy. | Vague atteinte moy. (3 = boss) | Dégâts : 3 premières sources |
|---|---|---|---|---|---|---|---|
| A | presse-tout | **0 / 10** | 72 s | — | 225 | 3.0 | Calcinarque — tir 51 %, Crabastion 15 %, Calcinarque — Salve 13 % |
| A | rotation | **0 / 10** | 74 s | — | 36 | 3.0 | Calcinarque — tir 54 %, Crabastion 18 %, Amanitox 12 % |
| A | adaptatif | **10 / 10** | 97 s | 301 | 55 | 3.0 | Calcinarque — tir 50 %, Calcinarque — Salve 16 %, Crabastion 14 % |
| B | presse-tout | **0 / 10** | 43 s | — | 75 | 2.4 | Calcinarque — tir 54 %, Calcinarque — Salve 13 %, Calcinarque — Brasier 12 % |
| B | rotation | **0 / 10** | 54 s | — | 39 | 3.0 | Calcinarque — tir 46 %, Crabastion 16 %, Braizard 10 % |
| B | adaptatif | **10 / 10** | 76 s | 239 | 94 | 3.0 | Calcinarque — tir 38 %, Braizard 14 %, Calcinarque — Salve 11 % |

## L'attendu de la fiche

- Version A : presse-tout 0 / 10, adaptatif 10 / 10 → attendu respecté (presse-tout gagne moins souvent).
- Version B : presse-tout 0 / 10, adaptatif 10 / 10 → attendu respecté (presse-tout gagne moins souvent).

## Fins de partie

- A / presse-tout : Le Meneur est tombé. × 10
- A / rotation : Le Meneur est tombé. × 10
- A / adaptatif : Le boss est vaincu. × 10
- B / presse-tout : Le Meneur est tombé. × 10
- B / rotation : Le Meneur est tombé. × 10
- B / adaptatif : Le boss est vaincu. × 10

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, Esquive, F, R, et en B entrée et rappel), même sans raison.
- **rotation** : une touche toutes les 1,5 s dans un ordre fixe (A : 1, 3, F, 2, 4, Espace ; B : entrée, 1, 2, entrée, Espace, R).
- **adaptatif** : sort des zones annoncées et garde l'Esquive pour le dernier moment d'une attaque annoncée ;
  vise le Soigneur en premier (et y envoie F en A, Braizard en B) ; sorts des compagnons quand ils servent ;
  en B, rappelle une créature avant son K.O. et fait entrer Amanitox quand le Meneur saigne.
- Les trois se déplacent de la même façon (garder une distance de tir). Ce sont des scripts simples, pas des joueurs.

## Lecture

- L'attendu tient dans les deux versions, mais l'écart est extrême (0 contre 10). Il vient presque entièrement des attaques annoncées : le seul robot qui sort des zones et garde l'Esquive survit ; les deux autres meurent avant la fin. Le choix des cibles et des créatures pèse peu à côté.
- Les robots ne départagent pas A et B : l'adaptatif gagne 10 fois sur 10 dans les deux. En B, il finit plus vite (76 s contre 97 s) mais avec moins de PV (239 contre 301).
- Le Meneur fait environ la moitié des dégâts dans toutes les colonnes : les créatures comptent, sans porter le combat à elles seules.
