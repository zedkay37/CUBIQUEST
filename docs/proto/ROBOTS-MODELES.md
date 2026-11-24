# PROTO-MODELES — robots par modèle

Généré par `npx tsx tools/proto-modeles-robots.ts` : 10 descentes complètes par robot et par modèle (3 étages, boss au 3e),
graines 4000 à 4009, densité normale, recrutement coupé, Meneur Calcinarque. Une descente s'arrête à 15 minutes.

| Modèle | Robot | Victoires (boss vaincu) | Étage atteint moy. | Durée moy. | Actions moy. |
|---|---|---|---|---|---|
| A · Le trio | presse-tout | **1 / 10** | 3.0 | 147 s | 707 |
| A · Le trio | adaptatif | **6 / 10** | 2.5 | 151 s | 150 |
| B · La meute | presse-tout | **0 / 10** | 2.1 | 75 s | 271 |
| B · La meute | adaptatif | **5 / 10** | 2.5 | 198 s | 110 |
| C · Le chef d’orchestre | presse-tout | **0 / 10** | 2.7 | 167 s | 102 |
| C · Le chef d’orchestre | adaptatif | **1 / 10** | 2.6 | 263 s | 73 |
| D · Le héros et ses suiveurs | presse-tout | **4 / 10** | 2.9 | 214 s | 306 |
| D · Le héros et ses suiveurs | adaptatif | **10 / 10** | 3.0 | 140 s | 168 |
| E · Le relais | presse-tout | **7 / 10** | 2.7 | 371 s | 491 |
| E · Le relais | adaptatif | **7 / 10** | 2.7 | 438 s | 214 |
| F · La pause tactique | presse-tout | **1 / 10** | 3.0 | 147 s | 707 |
| F · La pause tactique | adaptatif | **6 / 10** | 2.5 | 151 s | 150 |
| G · Les instincts | presse-tout | **0 / 10** | 2.9 | 125 s | 281 |
| G · Les instincts | adaptatif | **8 / 10** | 3.0 | 186 s | 244 |
| H · La conquête | presse-tout | **9 / 10** | 1.0 | 103 s | 42 |
| H · La conquête | adaptatif | **6 / 10** | 1.0 | 127 s | 33 |

## Presse-tout contre adaptatif

- **E · Le relais : presse-tout gagne autant ou plus que l’adaptatif (7 contre 7).**
- **H · La conquête : presse-tout gagne autant ou plus que l’adaptatif (9 contre 6).**

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, cartes, échanges, ordres…), sans regarder la situation.
- **adaptatif** : sort des zones annoncées, garde ses ressources pour le bon moment (Soigneur, Blindé, Fournaise du boss, soins).
- Hors combat, tous marchent droit vers l'escalier (ils connaissent la carte). Ce sont des scripts, pas des joueurs.

## Lecture

- **Deux alertes.**
  - E (le relais) : appuyer sur tout gagne autant que s'adapter (7 contre 7). Échanger sans arrêt enchaîne des effets d'entrée et de sortie gratuits ; la recharge de 2 s ne suffit pas à rendre le choix important.
  - H (la conquête) : poser dès qu'on peut gagne plus souvent (9 contre 6). Le robot adaptatif attend d'avoir 6 d'Élan et perd du rythme ; le nombre l'emporte sur le choix.
- **Ailleurs, s'adapter paie nettement** :
  - G : 8 contre 0 ;
  - D : 10 contre 4 ;
  - A et F : 6 contre 1 ;
  - B : 5 contre 0.
  - C est très difficile pour les deux robots (1 contre 0) : avec des attaques de base faibles, un mauvais usage des cartes ne pardonne pas, et le robot joue ses cartes moins bien qu'un humain.
- **F est identique à A pour les robots** : ils ne savent pas profiter de la pause (le temps figé ne leur apporte rien). Seul un joueur peut dire si la pause change quelque chose.
- **H n'a pas d'étages** : la colonne « étage atteint » y vaut toujours 1.
- **Réglage grossier** : on compare des façons de jouer, pas des niveaux de difficulté.
