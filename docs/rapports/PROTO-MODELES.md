# PROTO-MODELES — rapport

Lien : https://zedkay37.github.io/CUBIQUEST/proto/ (page d'accueil de tous les modèles). Branche `proto-meneur`. `main`, `/` et `/next/` n'ont pas bougé.

## La fiche

- Elle a été reçue coupée au début de la section 4, sur un tiret vide.
- La phase 1 a été remplacée par décision du joueur : « le chef d'orchestre ».
- J'ai appliqué ce qui était écrit et ce que les sprints précédents faisaient déjà : robots, mesures, rapport.

## Ce qui a été fait

| Phase | Modèle | Tag |
|---|---|---|
| 1 | C · Le chef d'orchestre, plus la page d'accueil de tous les modèles | `proto-modeles-phase1` |
| 2 | D · Le héros et ses suiveurs | `proto-modeles-phase2` |
| 3 | E · Le relais | `proto-modeles-phase3` |
| 4 | F · La pause tactique | `proto-modeles-phase4` |
| 5 | G · Les instincts | `proto-modeles-phase5` |
| 6 | H · La conquête | `proto-modeles-phase6` |
| 7 | I · L'alchimiste du sol : **non faite** (voir `docs/proto/MODELES.md`) | — |
| 8 | Animations des sorts et des créatures, pour tous les modèles | `proto-modeles-phase8` |

- **Détail** des modèles, des touches et des effets : `docs/proto/MODELES.md`.
- **Captures** : `docs/captures/proto-modeles/`.
- **A et B** restent inchangés.
- **Commun à tous les modèles** : F1, la graine, l'écran de fin et « Copier les résultats ». Le JSON inclut le modèle, les réglages, et selon le modèle les cartes jouées, les règles ou les échanges.

## Robots

Le détail est dans `docs/proto/ROBOTS-MODELES.md`.

- Deux alertes : E (7 contre 7) et H (9 contre 6) ; appuyer sur tout y gagne autant ou plus que s'adapter.
- F ne se distingue pas de A pour un robot.

## Images par seconde (sorts à l'écran)

Mesures dans un navigateur sans fenêtre, sur la machine de développement.

| Situation | Images/s moyennes | 5 % les plus lentes | Effets à l'écran (max) |
|---|---|---|---|
| Vitrine en charge (6 éléments toutes les 0,2 s) | 213 à 254 | 23 à 39 | 242 |
| Combat du boss, robot presse-tout, effets activés | 191 à 192 | 13 à 14 | 90 |
| Le même combat, effets coupés | 143 à 198 | 9 à 14 | 0 |

- **Les effets ne coûtent presque rien** : avec ou sans, les chiffres sont les mêmes.
- **Le combat du boss a des à-coups**, présents même effets coupés. Ils étaient déjà là avant cette phase et restent à étudier : création des attaques annoncées, chemins.

## Non vérifié

- La sensation de chaque modèle avec un vrai joueur. La pause tactique (F), les cartes (C) et les règles (G) n'ont été essayées que par script ou en capture.
- La fluidité sur une vraie machine, et l'origine des à-coups du combat du boss.
- La lisibilité des animations en mouvement : je les ai vues seulement en captures et dans la vitrine.
