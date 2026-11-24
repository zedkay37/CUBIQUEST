# Sprint PROTO-MENEUR : la maquette qui tranche le combat

Fiche à déposer dans `docs/plan/SPRINT_PROTO_MENEUR.md`. Rédigée le 24 novembre 2026.

## 1. Pourquoi ce sprint

Le joueur a scellé sa vision :
- un Meneur dirigé en temps réel ;
- des donjons à étages, avec retour au camp ;
- des étoiles par doublons et des talents modifiables ;
- du recrutement en donjon et des tirages mérités ;
- un défi qui monte avec lui.

Il a aussi passé un pacte : plus aucun document de vision avant d'avoir joué à cette maquette.

Une seule question reste ouverte, et ce sprint doit y répondre en jouant :

> Avec un Meneur dirigé, est-ce plus amusant d'avoir un trio fixe (version A) ou une meute que l'on fait entrer en jeu (version B) ?

Tout ce qui ne sert pas à répondre à cette question est hors sujet.

## 2. Règles de sécurité (non négociables)

- Sauvegarde : avant tout, crée le tag `sauvegarde-avant-proto-meneur` sur la branche la plus récente (vérifie avec `git log` ; en cas de doute, arrête-toi et demande), puis la branche `proto-meneur`. Crée un tag `proto-meneur-phaseN` à la fin de chaque phase.
- Jeu actuel intact : aucun mode de jeu existant n'est modifié. Ne touche pas à `main`.
- Page isolée : la maquette vit sur une page à part, `?proto=salle`.
- Publication séparée : publie sur un chemin à part, `/proto/`. Ne modifie ni `/`, ni `/next/`. Si la configuration de GitHub Pages ne le permet pas simplement, arrête-toi et explique les options avant de faire quoi que ce soit.
- Sauvegarde du joueur : la maquette ne lit ni n'écrit la sauvegarde du jeu (localStorage). Si tu dois stocker quelque chose, utilise une clé à part (`cubiquest_proto_*`).
- Juridique : aucun objet lancé (cube, sphère…) pour libérer ou capturer une créature. Les créatures bondissent elles-mêmes. Un brevet de Nintendo vise le fait de viser et lancer un objet pour capturer une créature ou la faire sortir.

## 3. Direction graphique de la maquette

Le joueur a choisi le style F (toon), avec des effets lumineux ponctuels.

- Créatures et salle en style F.
- Les lueurs (comme l'interrupteur « nuit volcanique ») sont réservées aux moments forts : l'arrivée d'une créature (version B), les sorts, la phase 2 du boss. Pas d'éclairage nocturne permanent.
- Lisibilité d'abord : on distingue les alliés des ennemis au premier coup d'œil (par exemple un anneau au sol de couleur différente). Les attaques annoncées restent lisibles malgré les contours du toon.
- Aucune nouvelle créature : réutilise les .vox existants de la branche `bestiaire` (par exemple Calcinarque ou Braizard comme Meneur, et Amanitox, Crabastion et deux autres comme compagnons).

## 4. Les phases

### Phase 0 : l'inventaire (court)
- Repère ce qui est réutilisable : rendu, caméra, chargeur .vox, code de combat, attaques annoncées, esquive.
- Vérifie que la publication sur `/proto/` est simple. Sinon, arrête-toi (voir section 2).
- Note ces constats en 10 lignes au plus, au début du compte rendu.

### Phase 1 : la salle, le Meneur et la version A
La salle (une seule, faite à la main) :
- un couloir étroit ;
- une plateforme en hauteur, qui donne un bonus de portée aux tirs à distance ;
- quelques obstacles.

Les ennemis :
- 2 petites vagues, avec deux rôles :
  - le Soigneur reste en retrait et soigne ses alliés ;
  - le Chargeur a une charge annoncée à l'avance, qui punit qui reste immobile.
- Puis 1 boss : 2 attaques annoncées, et une 2e phase.

Le Meneur (identique dans A et B) : ZQSD pour bouger, la souris pour viser, 1 et 2 pour ses deux sorts, Espace pour esquiver.

Version A, le trio :
- 2 compagnons suivent le Meneur et attaquent seuls.
- F : ils attaquent la cible sous le curseur. R : ils reviennent près du Meneur.
- 3 et 4 : le sort de chaque compagnon.

### Phase 2 : la version B
- Une réserve de 4 créatures : les 2 de la version A, plus 2 autres. 2 au maximum en jeu en même temps.
- Une jauge d'Élan de 4 crans, qui se recharge avec le temps et avec les ennemis vaincus.
- Molette : choisir une créature.
- Clic droit : la créature bondit depuis le Meneur jusqu'au point visé (portée limitée). Son arrivée produit un petit effet de zone, avec une lueur.
- R : rappel. La créature revient, et une partie de l'Élan est rendue.
- Pas de touches 3 et 4 en version B : le choix, c'est qui entre, où, et quand.

### Phase 3 : les mesures, les robots et le protocole
Choix et mesures :
- Avant chaque partie, un écran pour choisir A ou B.
- Écran de fin :
  - victoire ou défaite ;
  - durée ;
  - PV restants ;
  - nombre d'actions du joueur ;
  - dégâts par source.
- Un bouton « Copier les résultats » (format JSON).

Test des robots :
- 3 robots, pour A comme pour B :
  - un qui appuie sur tout dès que c'est prêt ;
  - un qui suit une rotation fixe ;
  - un qui s'adapte un peu : il garde l'esquive pour les attaques annoncées et vise le Soigneur en premier.
- 10 parties par robot et par version. Tableau des résultats dans `docs/proto/ROBOTS.md`.
- Attendu : celui qui appuie sur tout doit gagner moins souvent que celui qui s'adapte, dans les deux versions. Sinon, signale-le clairement : c'est le résultat le plus important du sprint.

Protocole humain (`docs/proto/PROTOCOLE.md`) :
- Chaque testeur joue 10 minutes à A et 10 minutes à B, dans un ordre tiré au hasard, sans explication.
- Ensuite, 3 questions :
  - « Laquelle veux-tu rejouer ? »
  - « À quel moment t'es-tu senti perdu ? »
  - « Raconte ta meilleure action. »
- Prévois une feuille vierge pour noter les réponses de 2 testeurs : le joueur et son cousin.

## 5. Interdits

- Aucune nouvelle créature, aucun nouveau biome, aucune progression (étoiles, talents, recrutement), ni réseau ni musique.
- Pas de terrain qui se transforme : obstacles fixes seulement.
- Pas d'équilibrage poussé. Un réglage grossier suffit, du moment que les deux versions se jouent dans la même salle, contre les mêmes ennemis.
- Ne tranche pas entre A et B à la place du joueur.

## 6. Compte rendu final

Un compte rendu court, en français simple, puis arrête-toi :
1. Les constats de la phase 0 (10 lignes au plus).
2. Ce qui a été fait, et le lien `/proto/?proto=salle`.
3. Le tableau des robots, avec ta lecture en 3 lignes.
4. Ce qui n'a pas pu être vérifié.
5. Les tags créés.
