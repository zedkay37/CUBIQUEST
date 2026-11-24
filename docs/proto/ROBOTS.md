# PROTO-DONJON — test des robots

Généré par `npx tsx tools/proto-donjon-robots.ts` : 10 parties par robot, par composition et par épreuve.
Schéma 1 (auto-attaque), Meneur Calcinarque, densité normale, recrutement coupé, donjon qui ne se réveille pas.

- **Étage** : un étage complet généré (graines 2000 à 2009) ; réussi si l'équipe atteint l'escalier. Limite : 7 minutes.
- **Boss** : l'étage du boss (graines 3000 à 3009) ; réussi si le boss tombe. Limite : 5 minutes.

| Épreuve | Compo | Robot | Réussites | Durée moy. | PV du Meneur (réussites) | Actions moy. | Part des dégâts de l'équipe | Fournaises interrompues |
|---|---|---|---|---|---|---|---|---|
| étage | A | presse-tout | **10 / 10** | 42 s | 284 | 196 | 35 % | 0.0 |
| étage | A | rotation | **10 / 10** | 42 s | 273 | 51 | 43 % | 0.0 |
| étage | A | adaptatif | **7 / 10** | 90 s | 192 | 39 | 42 % | 0.0 |
| étage | A | esquive-seule | **10 / 10** | 40 s | 302 | 28 | 36 % | 0.0 |
| étage | B | presse-tout | **8 / 10** | 112 s | 223 | 138 | 41 % | 0.0 |
| étage | B | rotation | **10 / 10** | 42 s | 278 | 98 | 44 % | 0.0 |
| étage | B | adaptatif | **9 / 10** | 76 s | 209 | 31 | 53 % | 0.0 |
| étage | B | esquive-seule | **3 / 10** | 97 s | 166 | 47 | 0 % | 0.0 |
| boss | A | presse-tout | **1 / 10** | 60 s | 11 | 277 | 31 % | 0.2 |
| boss | A | rotation | **0 / 10** | 54 s | — | 62 | 36 % | 0.0 |
| boss | A | adaptatif | **6 / 10** | 80 s | 182 | 101 | 32 % | 0.2 |
| boss | A | esquive-seule | **0 / 10** | 74 s | — | 52 | 24 % | 0.0 |
| boss | B | presse-tout | **0 / 10** | 52 s | — | 177 | 23 % | 0.4 |
| boss | B | rotation | **0 / 10** | 50 s | — | 90 | 40 % | 0.4 |
| boss | B | adaptatif | **10 / 10** | 75 s | 190 | 106 | 43 % | 1.2 |
| boss | B | esquive-seule | **0 / 10** | 43 s | — | 42 | 0 % | 0.0 |

## Le robot qui esquive seul

- Étage, version A : esquive-seule 10 / 10, adaptatif 7 / 10, presse-tout 10 / 10 → **ALERTE : le robot qui esquive seul gagne autant que celui qui s’adapte ; l’équipe ne pèse pas encore ici.**
- Étage, version B : esquive-seule 3 / 10, adaptatif 9 / 10, presse-tout 8 / 10 → l’équipe pèse : esquiver seul ne suffit pas.
- Boss, version A : esquive-seule 0 / 10, adaptatif 6 / 10, presse-tout 1 / 10 → l’équipe pèse : esquiver seul ne suffit pas.
- Boss, version B : esquive-seule 0 / 10, adaptatif 10 / 10, presse-tout 0 / 10 → l’équipe pèse : esquiver seul ne suffit pas.

## Les robots

- **presse-tout** : appuie sur tout dès que c'est prêt (sorts, Esquive, F, R, 3, 4 ; en B entrée et rappel).
- **rotation** : une touche toutes les 1,5 s dans un ordre fixe.
- **adaptatif** : sort des zones annoncées et esquive au dernier moment ; vise le Soigneur en le contournant ;
  envoie Crabastion (F en A, entrée en B) sur le Blindé ; interrompt la Fournaise du boss (Carapace en A, bond d'un
  étourdisseur en B) ; soigne quand il faut.
- **esquive-seule** : la même esquive parfaite, ses propres sorts, mais jamais les compagnons (ni F, R, 3, 4, ni entrée en B).
- Hors combat, tous marchent droit vers l'escalier (ils connaissent la carte). Ce sont des scripts, pas des joueurs.

## Lecture

- **Étage, version A : alerte.** Le robot qui esquive seul gagne 10 fois sur 10, plus que l'adaptatif (7 sur 10). En A, les compagnons attaquent seuls (environ 36 % des dégâts) même quand on ne leur donne aucun ordre. Le premier étage est assez facile pour que les ordres ne servent pas. L'adaptatif perd en allant contourner les Soigneurs au milieu des Chargeurs.
- **Étage, version B, et boss (A et B) : l'équipe pèse.** Celui qui esquive seul ne fait pas entrer de créature et gagne 3 fois sur 10 l'étage en B. Il ne bat jamais le boss : la Fournaise frappe trois fois, et une seule Esquive ne suffit pas. Il faut un étourdissement (Carapace de Crabastion en A, bond de Crabastion ou Givrelin en B).
- **Le boss départage A et B chez l'adaptatif** : 10 sur 10 en B, 6 sur 10 en A. En B, faire bondir un étourdisseur sur le boss interrompt plus souvent la Fournaise (1,2 fois par combat contre 0,2) que d'amener Crabastion au contact en A.
- Ce sont des scripts simples. Les chiffres comparent des façons de jouer ; ils ne prédisent pas un joueur.
