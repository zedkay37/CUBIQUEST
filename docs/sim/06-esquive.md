# Réglage de S05 — avant / après

Mesures : `npm run sim -- --brief --runs 40 --seed 1|2|3 --profile auto|active|expert` (40 combats × 3 graines par profil). « Avant » : état `s05-avant-reglage` (escouade de tundra-3 déjà corrigée). Cibles : plan, section 5.8 ; ✗ = hors cible de plus de 5 points (ou durée hors plage de plus de 5 s).

| Niveau | Auto avant → après (cible) | Actif avant → après (cible) | Expert avant → après (cible) | Durée Auto avant → après (cible) | Phases de boss après (durée · attaques) | Esq. parfaites par boss actif · expert |
| --- | --- | --- | --- | --- | --- | --- |
| meadow-1 | 100 % → 100 % (95–100) | 100 % → 100 % (98–100) | 100 % → 100 % (100–100) | 31 → 31 s (25–35) | P1 12.1 s · 2.0 / P2 12.8 s · 3.0 | 1.7 · 2.2 |
| meadow-2 | 100 % → 100 % (85–95) | 100 % → 100 % (95–100) | 100 % → 100 % (100–100) | 41 → 41 s (30–45) | P1 14.4 s · 2.2 / P2 19.7 s · 4.5 | 2.6 · 4.2 |
| meadow-3 | 86 % → 86 % (85–95) | 100 % → 100 % (95–100) | 100 % → 100 % (100–100) | 39 → 39 s (30–45) | P1 13.8 s · 2.0 / P2 9.4 s · 2.1 ✗ / P3 11.1 s · 2.9 | 2.4 · 4.2 |
| shore-1 | 100 % → 100 % ✗ (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 19 → 19 s ✗ (35–55) | P1 6.1 s · 1.0 ✗ / P2 6.4 s · 1.4 ✗ | 1.1 · 1.3 |
| shore-2 | 100 % → 100 % ✗ (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 23 → 23 s ✗ (35–55) | P1 8.1 s · 1.0 ✗ / P2 8.2 s · 2.0 ✗ | 1.0 · 1.3 |
| shore-3 | 94 % → 94 % ✗ (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 45 → 45 s (35–55) | P1 18.3 s · 3.0 / P2 8.3 s · 2.3 ✗ / P3 11.4 s · 2.9 | 3.0 · 4.2 |
| volcano-1 | 73 % → 73 % (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 62 → 62 s ✗ (35–55) | P1 23.8 s · 4.0 / P2 31.5 s · 7.8 | 5.2 · 8.7 |
| volcano-2 | 63 % → 63 % (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 46 → 46 s (35–55) | P1 16.0 s · 2.6 / P2 22.0 s · 5.2 | 3.6 · 5.6 |
| volcano-3 | 81 % → 81 % (60–80) | 100 % → 100 % (90–100) | 100 % → 100 % (97–100) | 52 → 52 s (35–55) | P1 18.5 s · 3.0 / P2 11.8 s · 3.0 / P3 15.1 s · 4.5 | 3.7 · 5.5 |
| sanctuary-1 | 41 % → 41 % (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 51 → 51 s (40–60) | P1 22.1 s · 4.0 / P2 20.3 s · 5.0 | 4.6 · 6.9 |
| sanctuary-2 | 100 % → 100 % ✗ (35–60) | 99 % → 98 % ✗ (80–92) | 100 % → 100 % (95–100) | 29 → 29 s ✗ (40–60) | P1 9.1 s · 1.6 ✗ / P2 12.0 s · 3.1 | 1.3 · 1.6 |
| sanctuary-3 | 34 % → 34 % (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 73 → 73 s (55–75) | P1 30.2 s · 5.2 / P2 22.3 s · 5.1 / P3 13.1 s · 3.4 | 5.7 · 8.2 |
| tundra-1 | 24 % → 24 % ✗ (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 53 → 53 s (40–60) | P1 20.6 s · 3.7 / P2 22.9 s · 4.8 | 4.0 · 6.1 |
| tundra-2 | 54 % → 54 % (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 51 → 51 s (40–60) | P1 11.6 s · 2.0 / P2 18.3 s · 4.3 | 2.3 · 3.1 |
| tundra-3 | 49 % → 49 % (35–60) | 100 % → 99 % ✗ (80–92) | 100 % → 100 % (95–100) | 70 → 70 s (55–75) | P1 25.7 s · 4.6 / P2 10.8 s · 2.6 / P3 11.6 s · 3.1 | 4.2 · 6.6 |
| stormpeak-1 | 51 % → 51 % (35–60) | 51 % → 48 % ✗ (80–92) | 99 % → 99 % (95–100) | 58 → 58 s (40–60) | P1 19.8 s · 3.3 / P2 20.1 s · 4.3 | 2.1 · 3.2 |
| stormpeak-2 | 77 % → 77 % ✗ (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 46 → 46 s (40–60) | P1 13.6 s · 2.4 / P2 15.5 s · 3.6 | 2.1 · 3.5 |
| stormpeak-3 | 30 % → 30 % ✗ (35–60) | 100 % → 99 % ✗ (80–92) | 100 % → 100 % (95–100) | 74 → 74 s (55–75) | P1 32.2 s · 5.7 / P2 19.2 s · 4.5 / P3 17.0 s · 4.5 | 4.6 · 8.2 |
| canyon-1 | 93 % → 93 % ✗ (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 48 → 48 s (40–60) | P1 12.8 s · 2.2 / P2 18.7 s · 3.8 | 2.5 · 3.6 |
| canyon-2 | 31 % → 31 % (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 54 → 54 s (40–60) | P1 20.6 s · 3.5 / P2 22.8 s · 5.2 | 3.9 · 5.7 |
| canyon-3 | 39 % → 39 % (35–60) | 100 % → 100 % ✗ (80–92) | 100 % → 100 % (95–100) | 76 → 76 s (55–75) | P1 31.7 s · 5.8 / P2 17.7 s · 3.9 / P3 18.0 s · 4.6 | 5.1 · 6.7 |

Écart expert − Auto, biomes 3 à 7 : 44 points (cible ≥ 25).
Esquives parfaites par combat de boss : actif 3.2 (cible ≥ 1) · expert 4.8 (cible ≥ 2).
Trios par combat : expert 2.9 · actif 1.3.
Niveaux hors cible : shore-1, shore-2, shore-3, volcano-1, sanctuary-1, sanctuary-2, sanctuary-3, tundra-1, tundra-2, tundra-3, stormpeak-1, stormpeak-2, stormpeak-3, canyon-1, canyon-2, canyon-3.

## Essai de réglage global (biomes 4 à 7, graine 1, 40 combats)

Attaque des ennemis multipliée par 1,4 puis par 2 (option `--scale`), sur sanctuary-1 → canyon-3 :

| Facteur | Auto (12 niveaux) | Actif (12 niveaux) |
| --- | --- | --- |
| × 1,4 | 0, 15, 5, 0, 0, 0, 0, 0, 0, 5, 0, 0 % | 68, 60, 80, 98, 90, 83, 0, 80, 75, 98, 98, 78 % |
| × 2 | 0 % partout | 8 à 60 % |

À × 1,4 l'actif entre dans sa cible (80 à 92 %) mais l'Auto tombe à 0 à 15 % (cible 35 à 60 %). Les deux cibles ne se tiennent pas ensemble avec `STAGE_TUNING` seul : l'écart Auto → actif mesuré (≈ 60 points) est bien plus grand que celui du tableau 5.8 (≈ 35 points). Décision : réglage conservé.
