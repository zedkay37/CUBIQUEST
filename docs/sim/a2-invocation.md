# Cube Scellé : calibrage (A2.1)

20 parcours `npm run journey` (profil actif, graines 1 à 20, trios Braise et Marée en alternance), le joueur ouvre tous ses cubes avec l'Appât dont il a le plus.

| Taux | 6 communes à la fin du biome 2 | ≥ 3 peu communes à la fin du biome 4 | Rares à la fin (moyenne) | Séries > 4 niveaux sans cube ni recrue |
| --- | --- | --- | --- | --- |
| Spec (retenus) | 6/20 | 16/20 | 3,4 | 0 |
| Bois 90/9/1, Pierre 60/30/10 | 8/20 | 8/20 | 2,95 | 0 |

Cibles : 6 communes avant la fin du biome 2 **non tenue** (30 %) : le joueur n'a qu'environ 8 cubes à ce moment et les doublons sont fréquents ; changer les taux ne suffit pas et coûte les peu communes. Les trois autres cibles sont tenues avec les taux de la spec, gardés tels quels.

## A4.1 : le Bois donne d'abord une commune pas encore recrutée

Mêmes 20 parcours (graines 1 à 20), même joueur simulé.

| Règle | 6 communes à la fin du biome 2 | ≥ 3 peu communes à la fin du biome 4 | Rares à la fin (moyenne) | Séries > 4 niveaux sans cube ni recrue |
| --- | --- | --- | --- | --- |
| A2 (taux seuls) | 6/20 | 16/20 | 3,4 | 0 |
| A4.1 (priorité du Bois) | **20/20** | 13/20 | 3,25 | 0 |

Les Bois ne donnent plus de peu communes tant qu'une commune manque : les peu communes arrivent un peu plus tard (16 → 13 parcours sur 20 à la fin du biome 4). Taux inchangés.
