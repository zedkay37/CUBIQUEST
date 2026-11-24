# PROTO-DONJON — les touches, sans conflit

Vérifié pour les 12 combinaisons (3 schémas × A ou B × 2 Meneurs) par le test `proto-donjon.test.ts` : aucune touche ne sert à deux choses dans une même combinaison. Le Meneur ne change aucune touche.

| Touche | Schéma 1 (auto-attaque + ordres) | Schéma 2 (clic souris) | Schéma 3 (tir) |
|---|---|---|---|
| ZQSD | bouger | — | bouger |
| Clic gauche | désigner un ennemi (sinon le plus proche à portée) | au sol : y aller ; maintenu sur un ennemi : l'attaquer | tirer vers le curseur |
| 1 · 2 | sorts vers le curseur | sorts vers le curseur | sorts vers le curseur |
| Espace | esquive (sens de la marche) | esquive vers le curseur | esquive (sens de la marche) |

| Touche | A, le trio | B, la meute |
|---|---|---|
| F | compagnons : la cible sous le curseur | — |
| R | compagnons : revenez | rappel de la créature choisie (rend 1 cran) |
| 3 · 4 | sort de chaque compagnon | — |
| Molette | — | choisir une créature |
| Clic droit | — | la créature bondit au point visé |

**Touches communes** : F1 ouvre les réglages, M affiche ou cache la mini-carte.

Les seules touches partagées sont le clic gauche et R. Le rôle du clic gauche dépend du schéma choisi ; celui de R, de la composition. Aucune n'a deux rôles dans une même partie.
