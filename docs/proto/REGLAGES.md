# PROTO-DONJON — les réglages

## Où les trouver

- **Panneau** : touche F1, ou le bouton « Réglages (F1) » en bas de l'écran.
- **Adresse de la page** : https://zedkay37.github.io/CUBIQUEST/proto/?proto=donjon&…
- L'adresse se met à jour à chaque changement. La copier suffit pour rejouer exactement la même chose.
- Tous les réglages figurent aussi dans « Copier les résultats ».

## Les réglages

| Réglage | Paramètre d'adresse | Valeurs | Effet |
|---|---|---|---|
| Schéma de contrôle | `schema` | `1` auto-attaque + ordres · `2` clic souris · `3` tir | en direct |
| Composition | `compo` | `A` trio · `B` meute | relance la descente |
| Meneur | `meneur` | `calcinarque` · `braizard` | relance la descente |
| Caméra | `cam` | `proche` · `moyenne` · `eloignee` | en direct |
| Angle | `angle` | `forte` · `rasante` | en direct |
| Vitesse du jeu | `vitesse` | `0.8` · `1` · `1.2` | en direct |
| Densité des ennemis | `densite` | `faible` · `normale` · `forte` | relance la descente |
| Le donjon se réveille | `reveil` | `0` · `1` | en direct |
| Mini-carte | `carte` | `0` · `1` (touche M) | en direct |
| Chance de recrutement | `recrutement` | `0` · `0.1` · `0.3` | en direct |
| Graine | `seed` | un nombre | relance la descente |

## Préréglage

- **Bouton du panneau** : « Préréglage Exploration ».
- **Adresse** : `?proto=donjon&preset=exploration`.
- **Ce qu'il règle** : schéma 1, composition A, caméra moyenne, mini-carte visible, recrutement 10 %, donjon qui se réveille.

Le nom du jeu dont il s'inspire n'est pas affiché : la section 2 de la fiche interdit de reprendre un nom de ces jeux dans l'interface.

## Outils de test (sans réglage dans le panneau)

- `&etage=3` : commencer directement au 3e étage, celui du boss.
- `&robot=presse-tout|rotation|adaptatif|esquive-seule` : un robot joue à votre place. Il refuse les recrues.
