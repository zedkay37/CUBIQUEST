# PROTO-MENEUR — rapport

Lien : https://zedkay37.github.io/CUBIQUEST/proto/?proto=salle. Branche `proto-meneur`. `main`, `/` et `/next/` n'ont pas bougé.

## 1. Phase 0 : constats

Le détail est dans `docs/proto/INVENTAIRE.md`.

- **Réutilisé** :
  - le style F et le chargeur `.vox`, tels quels ;
  - la grammaire des attaques annoncées : couleur DANGER, hachures, remplissage, contour qui clignote.
- **Écrit à part** :
  - le combat, la caméra et l'esquive. Le moteur du jeu est lié à son escouade automatique et au golden.
  - La maquette a donc sa propre simulation pure, à graine fixe (`src/proto/sim.ts`), commune au navigateur et aux robots.
- **Publication `/proto/`** :
  - c'était simple : nouvelle cible `proto` de `deploy:pages`, qui ne remplace que le dossier `proto/` ;
  - la cible `root` garde désormais `next/` et `proto/` ;
  - la publication n'a changé que des fichiers de `proto/`, 65 au total (vérifié).
- **Isolation** : une trace de tous les accès au stockage local pendant une partie n'en relève aucun.

## 2. Ce qui a été fait

- **La salle** :
  - une entrée, un couloir étroit, une arène ;
  - une plateforme en hauteur avec une rampe : les tirs y portent 40 % plus loin ;
  - cinq rochers fixes.
- **Les ennemis** :
  - vague 1 : 2 Chargeurs et 1 Soigneur ;
  - vague 2 : 3 Chargeurs et 2 Soigneurs ;
  - puis le boss (Magmadrake), avec deux attaques annoncées : l'onde (un disque, qui devient une couronne en phase 2) et la pluie (3 disques, puis 5 en phase 2) ;
  - en phase 2, le boss appelle deux Chargeurs et s'allume.
  - Le Chargeur annonce une bande avant de charger ; le Soigneur reste en retrait et porte une croix verte.
- **Le Meneur** (Calcinarque légendaire), identique en A et en B : ZQSD, souris (clic gauche : tir), 1 Salve, 2 Brasier, Espace Esquive.
- **Version A** : Crabastion et Amanitox suivent le Meneur. F pour la cible, R pour le retour, 3 Carapace, 4 Spores.
- **Version B** :
  - une réserve de 4 créatures (Crabastion, Amanitox, Braizard, Givrelin), 2 au plus en jeu ;
  - l'Élan a 4 crans : il se recharge d'un cran toutes les 7 s et d'un demi-cran par ennemi vaincu ;
  - la molette choisit la créature ;
  - au clic droit, elle bondit d'elle-même jusqu'au point visé, à 9 m au plus. L'entrée coûte 2 crans et produit un effet de zone avec une lueur ;
  - R la rappelle et rend 1 cran.
- **Lisibilité** : anneau au sol doré pour le Meneur, vert pour les alliés, violet pour les ennemis. Les lueurs ne viennent qu'aux sorts, aux arrivées et à la phase 2.
- **Écrans** :
  - choix A / B, avec un bouton qui tire l'ordre au hasard ;
  - écran de fin : issue, durée, PV, actions, dégâts par source ;
  - « Copier les résultats » donne le JSON.
- **Outils** :
  - `&robot=adaptatif` fait jouer un robot dans la page ;
  - `npx tsx tools/proto-robots.ts` refait le tableau ;
  - `src/game/proto-meneur.test.ts` contient 3 tests.
- **Protocole** : `docs/proto/PROTOCOLE.md`, avec la feuille vierge pour 2 testeurs.

Les phases 1 et 2 ont été écrites ensemble (B partage toute la simulation). Les tags `phase1` et `phase2` pointent donc sur le même commit.

## 3. Robots

Le tableau est dans `docs/proto/ROBOTS.md`.

| Version | presse-tout | rotation | adaptatif |
|---|---|---|---|
| A | 0 / 10 | 0 / 10 | 10 / 10 |
| B | 0 / 10 | 0 / 10 | 10 / 10 |

## 4. Non vérifié

- Le plaisir, la prise en main et la fluidité, sur une vraie machine.
- La lisibilité en mouvement : je n'ai vu que des captures.
- Le réglage, qui reste grossier.

## Tags

- `sauvegarde-avant-proto-meneur`, posé sur `styles-4`, la branche la plus récente, qui contient `bestiaire` ;
- `proto-meneur-phase0`, `proto-meneur-phase1`, `proto-meneur-phase2`, `proto-meneur-phase3`.
