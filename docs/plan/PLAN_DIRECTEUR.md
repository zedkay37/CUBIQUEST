# PLAN DIRECTEUR — CubiQuest

Version du 22 novembre 2026 · établi sur le tag `fondations-final` (commit 6513bfa) du dépôt `zedkay37/CUBIQUEST`.

Ce fichier est la version texte du document « CubiQuest — Plan directeur » (PDF). Il se dépose dans le dépôt, à l'emplacement `docs/plan/PLAN_DIRECTEUR.md`. Il fait autorité sur le cadre du projet : il autorise les changements de mécanique décrits dans ses fiches, et seulement ceux-là.

## Comment Claude Code utilise ce fichier

- Le prompt de lancement donne un numéro de session (par exemple S03).
- Lis dans cet ordre : la section « Règles générales pour Claude Code » (partie 7), le lexique (section 5.12), la fiche de la session (partie 8), puis les sections que la fiche demande de lire.
- Chaque fiche se termine par la ligne « — FIN DE LA FICHE Sxx — ». Si elle manque, le fichier est tronqué : arrête-toi et dis-le.
- Le fichier se termine par la ligne « FIN DU PLAN DIRECTEUR ».
- Mentions de certitude dans le texte : (constaté) lu dans le code ou vu en jeu · (mesuré) par l'outil de simulation · (hypothèse) valeur de départ ou estimation · (prévu) à construire.

**La vision, en une phrase :** « Un trio de créatures-cubes, trois éléments, quarante secondes : tu composes ton escouade, tu fais éclater les éléments dans le bon ordre, tu esquives au bon moment, et tu as envie de repartir. »

## Sommaire

- Partie 1 — L'essentiel en une page (La vision, le diagnostic en quatre chiffres, ce que je propose)
- Partie 2 — Point de départ : ce que le jeu est vraiment (Ce qui est solide, ce qui empêche le jeu d'être prenant, l'audit des termes repris)
- Partie 3 — La vision (Une phrase, un rôle, trois piliers, quatre boucles)
- Partie 4 — Les ressorts de l'envie de rejouer (Neuf ressorts, et ce qu'on s'interdit)
- Partie 5 — Le game design, système par système (Cubes, Éclat, Trio · Esquive · Boss · Compagnons · Progression · Campagne · Faille · Camp · Identité · Lexique)
- Partie 6 — La feuille de route (Sept phases, seize sessions, quatre portes)
- Partie 7 — La méthode de travail avec Claude Code (Le plan dans le dépôt, le prompt de lancement, les seize règles)
- Partie 8 — Les seize fiches de session (S03 à S18)
  - S03 — Une identité propre · v0.3 · Indispensable
  - S04 — Les cubes d'élément · v0.4 · Indispensable
  - S05 — Lire et esquiver · v0.4 · Indispensable
  - S06 — Les étoiles et le parcours · v0.5 · Indispensable
  - S07 — Les dix premières minutes · v0.5 · Indispensable
  - S08 — Confiance et Lien · v0.6 · Recommandé
  - S09 — Runes et traits · v0.6 · Recommandé
  - S10 — Des évolutions qui se voient · v0.6 · Recommandé
  - S11 — La Faille : la descente · v0.7 · Recommandé
  - S12 — La Faille : faveurs, règles spéciales, défi du jour · v0.7 · Recommandé
  - S13 — Des arènes vivantes · v0.8 · Recommandé
  - S14 — Le bestiaire complété · v0.8 · Optionnel
  - S15 — L'interface et le parcours · v0.9 · Indispensable
  - S16 — Mobile et performances · v0.9 · Recommandé
  - S17 — Le nom, l'identité, le son · v0.9 · Indispensable
  - S18 — La version 1.0 · v1.0 · Indispensable
- Partie 9 — Le tableau de bord (Ce qu'on mesure, avec quelles cibles)
- Partie 10 — Ce qui peut faire échouer ce plan (Dix risques, leur signal, leur parade)
- Partie 11 — Tes décisions (Six choix qui t'appartiennent)
- Partie 12 — Sources (D'où viennent les chiffres)

# PARTIE 1 — L'essentiel en une page

**Vision :** « Un trio de créatures-cubes, trois éléments, quarante secondes : tu composes ton escouade, tu fais éclater les éléments dans le bon ordre, tu esquives au bon moment, et tu as envie de repartir. »

### Le diagnostic en quatre chiffres

- **7 en 46 s** — Déchaînements lancés pendant le boss de la Toundra (capture d'écran du 22/11)
- **niveau 21** — celui du trio en arrivant au 18e niveau s'il gagne chaque niveau une fois, face à des ennemis de niveau 47 à 50 (calculé à partir du code)
- **0,3 à 3,3 s** — durée de vie des boss des 12 premiers niveaux (simulation, session 2)
- **125** — occurrences d'identifiants internes repris de Pokémon Quest (audit du code, 22/11)

Le jeu est complet, joli et techniquement solide. Mais le combat se joue presque tout seul, la progression demande de la répétition sans but précis, et trois de ses systèmes sont des reprises : la marmite et la grille de pierres viennent de Pokémon Quest, les noms des réactions viennent de Genshin Impact.

### Ce que je propose

**Garder le squelette** (le camp, les expéditions, l'escouade de 3, les 6 éléments, les 38 créatures, les évolutions, les 7 biomes) et **remplacer les trois systèmes copiés par trois systèmes à nous, plus simples** :

| Aujourd'hui (copié) | Demain (à nous) | Ce que le joueur y gagne |
| --- | --- | --- |
| Réactions impossibles à prévoir, aux noms de Genshin | **Cubes d'élément → Éclat → Trio** | Il voit ses combos et il les dirige : l'ordre et le moment des trois sorts comptent. |
| Marmite, recettes et ingrédients de Pokémon Quest | **Confiance et Lien** | Chaque combat le rapproche d'un compagnon précis, sans hasard. |
| Grille 3×3 de pierres aléatoires | **Runes** (3 emplacements au plus) | Moins d'inventaire, des choix qui changent sa façon de jouer. |

**Ajouter une seule chose** : *la Faille*, des descentes de 10 minutes où l'on choisit un bonus parmi trois entre chaque combat. C'est le moteur du « encore une ». **Couper** ce qui ne sert aucun pilier : le Codex à base d'IA et les quêtes tournantes.

### La route

7 phases, 16 sessions de Claude Code (S03 à S18), 4 portes où c'est toi qui joues et qui décides. Chaque session livre une version jouable et sauvegardée : on peut s'arrêter à tout moment avec un jeu meilleur que la veille.

> **ESSENTIEL — Ce que tu fais maintenant**
> - Lis les parties 3 à 6 (la vision, le game design, la feuille de route). Les fiches de la partie 8 sont écrites pour Claude Code : tu peux les survoler.
> - Tranche les 6 décisions de la partie 11. Si tu ne dis rien, mes recommandations s'appliquent.
> - Dépose le fichier `PLAN_DIRECTEUR.md` dans le dépôt et lance la session S03 avec le prompt court de la partie 7.

# PARTIE 2 — Point de départ : ce que le jeu est vraiment

Tout ce qui suit a été lu dans le code de la version `fondations-final` (commit 6513bfa), mesuré par l'outil de simulation, ou vu en jouant. Les niveaux de certitude : (constaté) (mesuré) (hypothèse) (prévu).

## Ce qui est solide

- **Un jeu complet et jouable de bout en bout** : 38 créatures en 14 lignées, 29 sorts, 7 biomes, 21 niveaux, boss à phases, évolutions mises en scène. (constaté)
- **Une direction artistique cohérente**, entièrement procédurale (aucun fichier graphique ni sonore externe). (constaté)
- **Un outillage rare pour un projet de cette taille** : un outil qui joue les 21 niveaux sans navigateur, un « golden master » de 840 combats, des tests automatiques sur GitHub, une bible de style vérifiée par des tests (constaté) ; 53 tests et 210 combats simulés en 11 secondes d'après le rapport de la session « Fondations ».
- **Les 9 niveaux récents sont calibrés** : 50 à 90 % de victoires en Auto, boss de 20 à 33 secondes. (mesuré)

## Ce qui empêche le jeu d'être prenant

| Constat | Preuve | Conséquence |
| --- | --- | --- |
| **Le combat demande peu de décisions.** Un sort part sur l'ennemi le plus proche ; la seule bonne stratégie est d'appuyer dès qu'il est prêt, ce que l'Auto fait aussi. | `engine/skills.ts`, `engine/allies.ts` (constaté) | Jouer activement revient à appuyer plus vite que la machine. |
| **Les réactions élémentaires ne se prévoient pas** : rien n'indique ce que le prochain sort va déclencher, et la table suit une cascade que le joueur ne peut pas deviner (Eau + Plante donne « Embrasement »). | `rules.ts`, `resolveElementalReaction` (constaté) | Le système le plus original du jeu ne peut pas s'apprendre. |
| **L'esquive « parfaite » ne demande aucun timing** : il suffit qu'une attaque soit annoncée au moment de l'appui. Elle rend alors invulnérable 0,8 s. | `triggerScatter` (constaté) | Aucune maîtrise à acquérir. |
| **Le Déchaînement part trop souvent** : chaque coup de sort charge 6,5 %, chaque coup de base 2,8 %. Il soigne 22 % des PV à chaque fois. | `damage.ts` ; écran de victoire : 7 Déchaînements en 46 s (constaté) | L'attaque la plus forte du jeu ne veut plus rien dire et efface les erreurs. |
| **Les 12 premiers niveaux ne montrent rien** : leurs boss meurent en 0,3 à 3,3 s. Le tout premier niveau est perdu 10 fois sur 10 en Auto dans la simulation. | `docs/sim/02-fin-de-session-10.md`, 10 combats par niveau (mesuré) | Le joueur n'apprend pas l'esquive là où il devrait l'apprendre. La première impression est ratée. |
| **La progression impose de rejouer sans but précis.** Gagner une fois chacun des 17 premiers niveaux donne 19 105 XP à chaque membre de l'escouade : de quoi atteindre le niveau 21. Or le 18e niveau oppose des ennemis de niveau 47 à 50, et son escouade de référence est au niveau 50 (environ 183 000 XP). Chaque niveau rapporte 6 à 16 fois trop peu pour suivre. Par ailleurs chaque victoire lâche une pierre aléatoire, et le recrutement tire au hasard dans un groupe de 3 à 7 espèces. | `xpForNextLevel`, `STAGES`, `previewConfigs.ts`, `rollCreatureFromPot` (constaté) · calcul du 22/11 | On rejoue beaucoup, pour des chiffres, pas pour un objectif qu'on a choisi. |
| **Trois systèmes sont des copies.** Les pierres de capacité portent en interne les noms des pierres de Pokémon Quest ; la marmite, ses 4 paliers, ses ingrédients par couleur et par rareté et ses recettes en sont la transposition ; 4 réactions sur 6 et le statut « Trempé » portent les noms français de Genshin Impact. | audit du code + sources (partie 12) (constaté) | Pas d'identité propre, et un risque que tu veux écarter. |
| **Les évolutions et les biomes se ressemblent** : plusieurs lignées ne changent que de teinte, et deux biomes partagent la même disposition. | dossier de game design, page 29 (constaté) | Les récompenses les plus attendues déçoivent à l'écran. |
| **Le jeu s'arrête au 21e niveau.** Rien n'invite à revenir ensuite. | structure de `STAGES` (constaté) | Durée de vie courte. |

*(Captures dans le PDF : Écran de victoire du boss de la Toundra, le 22 novembre : sept Déchaînements en 46 secondes. — Les dix-huit créatures d'origine. Aquabloc, Bourgéon, Cailloc et Psycube : trois stades, une seule silhouette.)*

### L'audit des termes repris, en chiffres

| Terme | Nombre | Origine |
| --- | --- | --- |
| « Pokémon » dans les fichiers | 10 (7 fichiers) | mention directe |
| `whack_whack`, `wait_less`, `broadburst` | 61 | pierres de Pokémon Quest |
| `scatter` (interne) / « Dispersion » (affiché) | 64 / 44 | bouton « Scatter », « dispersion » en français |
| `mulligan`, « Ambroisie », « à la Cube » | 15 / 12 / 2 | recettes de Pokémon Quest |
| « Cubimon » | 58 | suffixe « -mon » |
| « Marmite » (onglet « Chaudron ») | 72 | cuisine de Pokémon Quest |
| Pierres : 4 paliers, 0 à 3 bonus secondaires | 1 système | « Gemmes-P » de Pokémon Quest |
| Évaporation, Surcharge, Électrocution, Cristallisation, Trempé | 5 termes | Genshin Impact (version française) |

### Ce que la critique reprochait à Pokémon Quest

À sa sortie en 2018, les critiques ont surtout pointé trois défauts : des combats où l'on n'a presque rien à faire (plusieurs testeurs disent avoir tout laissé en automatique), une boucle répétitive « expédition, cuisine, pierres », et une collection frustrante parce qu'elle dépend du hasard. Sources en partie 12.

**Ce sont exactement les trois défauts dont CubiQuest a hérité.** Le plan les traite dans cet ordre : le combat d'abord (phase 1), la répétition ensuite (phase 2), le hasard enfin (phase 3).

> **À SAVOIR — Un signal encourageant** PokéRogue, un jeu de fans jouable dans le navigateur qui transforme Pokémon en « roguelite », a dépassé le million de joueurs selon la presse spécialisée. Il montre qu'un jeu de créatures par descentes successives, dans un navigateur, trouve son public. Lui utilise les créatures de Nintendo ; nous, non.

# PARTIE 3 — La vision

Une phrase, un rôle pour le joueur, trois piliers. Chaque décision du plan se juge avec ces trois piliers : ce qui n'en sert aucun ne se fait pas.

**La phrase :** « Un trio de créatures-cubes, trois éléments, quarante secondes : tu composes ton escouade, tu fais éclater les éléments dans le bon ordre, tu esquives au bon moment, et tu as envie de repartir. »

**Le rôle du joueur : chef de trio.** Mes trois compagnons ne se ressemblent pas, et c'est moi qui les fais jouer ensemble. Au camp, je compose. En combat, je dirige. Entre les deux, j'ai toujours une raison de repartir.

## Les trois piliers

**Pilier 1 — COMPOSER : « Mon trio, c'est mon build. »** Un compagnon = un élément, un rôle, un sort, un trait. Trois éléments différents ouvrent le Trio ; deux éléments spécialisent. Trois runes au plus par compagnon. Aucun compagnon inutile. Test : le joueur sait dire pourquoi il a choisi ces trois-là.

**Pilier 2 — DIRIGER : « Quarante secondes où mes décisions comptent. »** Chaque appui a un effet visible (cube, Éclat, Trio, esquive). Tout danger s'annonce de la même façon. L'Auto joue mais ne dirige pas : il n'esquive pas et ne fait jamais de Trio. Cinq commandes, pas une de plus. Test : on gagne mieux en jouant qu'en regardant.

**Pilier 3 — REVENIR : « Toujours un but à moins de cinq minutes. »** Chaque combat fait avancer au moins deux barres visibles. Rejouer coûte un clic et deux secondes. Ni minuteur, ni énergie, ni monnaie. La fin de la campagne ouvre la Faille, pas un mur. Test : après une défaite, le joueur relance.

## Ce que le jeu n'est pas

- **Pas un jeu qui se joue tout seul.** L'Auto existe pour rejouer un niveau déjà maîtrisé, pas pour gagner à ta place.
- **Pas un jeu d'attente ni de loterie.** Rien ne se débloque avec le temps, rien d'important ne dépend d'un tirage.
- **Pas un clone.** Aucun nom, aucun terme, aucune recette, aucun écran repris d'un autre jeu.
- **Pas une usine à contenu.** On n'ajoute une créature, un biome ou un menu que s'il sert un pilier.

## On garde, on transforme, on remplace, on coupe, on ajoute

|  | Quoi | Pourquoi |
| --- | --- | --- |
| **On garde** | Le camp et les expéditions · l'escouade de 3 · les 6 éléments et la table des types · les 38 créatures · les évolutions mises en scène · les 7 biomes et 21 niveaux · les boss à phases · le style voxel · l'outillage. | C'est le squelette, il est bon. |
| **On transforme** | Réactions → cubes, Éclat, Trio · « Dispersion » → Esquive au timing · Déchaînement → rare, et typé par le meneur · étoiles → persistantes, avec un défi par niveau · XP → récompenses recalibrées, première victoire bonifiée, tout le camp progresse. | Donner du poids à chaque geste et retirer la répétition. |
| **On remplace** | Marmite, recettes, ingrédients → Confiance et Lien · pierres de pouvoir et de capacité → Runes · un compagnon de départ imposant ses deux équipiers → un trio de départ, au choix parmi deux · Codex à IA → Carnet hors ligne. | Sortir des copies avec des systèmes plus simples. |
| **On coupe** | Les quêtes tournantes · le serveur (le jeu devient un simple site statique) · tous les termes venus d'autres jeux. | Moins de systèmes, tous utiles. |
| **On ajoute** | La Faille · un niveau « Défi » par biome · une particularité d'arène par biome · un trait par lignée. | Rejouabilité et identité. |

## Les quatre boucles

**Les quatre boucles.** 40 secondes : le combat (cube, Éclat, Trio, esquive, Déchaînement). 5 minutes : le niveau (trois vagues, un boss, un écran de fin où deux barres au moins ont bougé). 25 minutes : la session (finir un biome, accueillir un compagnon, voir une évolution, ou deux descentes dans la Faille). Des semaines : le Carnet complet, toutes les étoiles, le Lien, les records de Faille, le défi du jour.

# PARTIE 4 — Les ressorts de l'envie de rejouer

« Addictif » au bon sens du mot : on vise l'envie de revenir, pas l'obligation. Chaque ressort ci-dessous correspond à une mécanique précise du plan et à une façon de vérifier qu'il fonctionne.

| Ressort | Dans le jeu | Comment on le vérifie |
| --- | --- | --- |
| **Maîtrise visible** | Trois gestes qui se réussissent ou se ratent, avec un retour immédiat : l'Éclat, le Trio, l'esquive parfaite. | Le profil « expert » de la simulation gagne au moins 25 points de plus que l'Auto. Un nouveau joueur réussit un Trio avant la fin du premier biome (porte 2). |
| **Des choix qui comptent** | Le trio, l'ordre des trois sorts, les runes, les faveurs de la Faille. | Dans les journaux de test, aucune option n'est prise plus de 60 % du temps ni moins de 5 %. |
| **Objectifs emboîtés** | Une étoile (2 min), un compagnon (10 min), une évolution ou un biome (30 min), le Carnet complet et les records (long terme). | L'écran de fin montre au moins deux barres qui ont avancé et propose une suite. |
| **Récompense variable, mais juste** | Les faveurs « une parmi trois », les invités de la Faille, les variantes rares. Jamais de hasard sur l'essentiel : le recrutement et les runes sont déterministes. | Aucun objectif de collection ne dépend d'un tirage. |
| **Le « presque réussi »** | Une défaite qui montre « boss à 12 % », « 2 Éclats sur 3 » et un conseil précis. | Au moins 70 % de relances après une défaite (journal de test). |
| **Friction nulle** | Rejouer en un clic. Aucune attente, aucun écran inutile. | Moins de 2 secondes entre le clic et le début du combat. |
| **Nouveauté rythmée** | Une nouveauté toutes les dix minutes environ pendant les deux premières heures : mécanique, compagnon, évolution, biome, rune. | La simulation de parcours ne trouve jamais plus de 4 niveaux d'affilée sans nouveauté. |
| **Attachement** | Les compagnons vivent au camp, le Lien grandit quand on joue avec eux, les évolutions se voient vraiment. | Porte 3 : tu sais citer ton compagnon préféré et dire pourquoi. |
| **Rendez-vous** | Le défi du jour de la Faille : la même descente pour tout le monde, une tentative comptée, un résultat à partager. | Porte 4. |

> **ATTENTION — Ce qu'on s'interdit** Les minuteurs, l'énergie, les monnaies, les récompenses de connexion, les comptes à rebours et les loteries. Ces mécaniques fabriquent de la contrainte, pas de l'envie ; le jeu peut être joué par des enfants ; et sans modèle payant elles n'ont aucune raison d'être.

Cadre théorique : la théorie de l'autodétermination appliquée au jeu vidéo (Ryan, Rigby et Przybylski, 2006) identifie trois besoins que les jeux prenants satisfont : la compétence, l'autonomie et le lien. Les trois premières lignes du tableau visent la compétence et l'autonomie, l'attachement vise le lien. Référence citée de mémoire, non relue pour ce document.

# PARTIE 5 — Le game design, système par système

Les chiffres sont des valeurs de départ. Ils partent des valeurs actuelles du code et seront réglés avec l'outil de simulation, puis jugés aux portes. (hypothèse)

## 5.1 · Le cœur du combat : cubes d'élément, Éclat, Trio

C'est la signature du jeu. Elle remplace les « réactions élémentaires » actuelles en gardant leur moteur : aujourd'hui déjà, un sort pose un statut sur l'ennemi et un sort d'un autre élément le consomme. On rend ce mécanisme **visible**, on le rend **simple à apprendre**, et on lui donne un sommet : le Trio.

Schéma : (1) un sort de Feu pose un cube de Feu sur l'ennemi, qui mûrit en 1,2 s ; (2) un sort de Roche fait éclater ce cube : c'est un Éclat, ici « Rempart » (bouclier d'escouade), et l'ennemi est fêlé ; (3) un sort d'Électrik sur l'ennemi fêlé déclenche le Trio.

### Les règles

1. **Le cube.** Un sort qui touche un ennemi lui pose un cube de son élément, qui flotte au-dessus de sa tête pendant 5 s. Un seul cube par ennemi. Les attaques de base n'en posent pas.
2. **Le cube mûrit.** Il apparaît petit et grossit. Au bout de 1,2 s il est **mûr** : il s'allume et un son tinte. C'est le seul temps d'attente du système, et c'est lui qui crée la décision.
3. **L'effet du cube.** Tant qu'il est là, il agit : Feu brûle · Eau ralentit · Plante enracine · Électrik étourdit un instant · Roche fissure l'armure (+25 % de dégâts subis) · Psy désoriente. Ce sont les six statuts actuels.
4. **L'Éclat.** Un sort d'un *autre* élément fait éclater un cube mûr. Les dégâts sont multipliés et un effet se déclenche. **C'est l'élément qui fait éclater qui décide de l'effet.** Trop tôt, sur un cube pas encore mûr : simple *Éclat faible* (×1,15, sans effet), et le cube est perdu.
5. **La Fêlure.** Après un Éclat réussi, l'ennemi reste fêlé 3 s : deux petits cubes aux couleurs des deux éléments tournent autour de lui.
6. **Le Trio.** Un sort d'un *troisième* élément sur un ennemi fêlé déclenche le Trio : dégâts ×2, onde de zone (50 % dans un rayon de 5), +25 % de Déchaînement et −1 s de recharge pour les trois sorts. Pendant 2 s, l'ennemi ne reçoit plus de cube.
7. **Le rythme.** « Un… deux-trois ! » : je pose, j'attends le tintement, je fais éclater, j'enchaîne.
8. **Le ciblage intelligent.** Un sort à cible (projectile, ruée, zone à distance) vise d'abord l'ennemi sur lequel il ferait un Trio, sinon celui sur lequel il ferait un Éclat, sinon le boss ou le plus proche. Un sort de mêlée ou de zone touche tout ce qui est à sa portée, et la règle s'applique à chaque ennemi touché. Le joueur choisit *quand* et *dans quel ordre*, pas *où*.
9. **Les sorts de soutien** (Égide de Fer, Brume Onirique) posent aussi leur cube, sans dégâts, sur l'ennemi le plus proche. Tout compagnon peut donc participer à un Trio.
10. **Les cartes parlent.** La carte d'un compagnon brille en bleu si son sort ferait un Éclat (le cube est mûr), en or s'il ferait un Trio.
11. **En Auto, pas de Trio.** Les compagnons lancent leurs sorts dès qu'ils sont prêts : ils obtiennent des Éclats, souvent faibles, jamais de Trio. Le Trio est le geste du joueur, comme l'esquive.

### Les six Éclats

| Qui fait éclater | Nom | Effet | × |
| --- | --- | --- | --- |
| Feu | **Déflagration** | Explosion de zone, brûle les voisins | 1,45 |
| Eau | **Déferlante** | Le plus gros coup sur une cible, la repousse | 1,65 |
| Plante | **Sève** | Soigne l'escouade (6 % des PV max) | 1,30 |
| Électrik | **Arc** | Rebondit sur 2 ennemis proches et les étourdit | 1,40 |
| Roche | **Rempart** | Bouclier d'escouade (15 % des PV max) | 1,25 |
| Psy | **Écho** | Recharge du lanceur −1,5 s, recopie le cube sur les voisins | 1,35 |

Cinq de ces six effets existent déjà dans le moteur (`aoe_burn`, `burst`, `chain_stun`, `team_shield`, `cd_spread`). Seule la Sève est nouvelle, et elle réutilise le soin existant. (constaté)

### Ce que voit le joueur

Maquette : les trois cartes de compagnon. Carte 1 normale (son cube mûrit), carte 2 en bleu (« ÉCLAT prêt »), carte 3 en or (« TRIO prêt »).

Maquette de principe. Le compteur de coups actuel (« ×133 COMBO ») disparaît : il ne mesure rien d'utile. Il est remplacé par « Éclats 4 · Trios 2 ».

> **ESSENTIEL — Pourquoi ce système plutôt qu'un autre**
> - **Il se voit.** Un cube de couleur au-dessus d'un ennemi, tout le monde comprend. C'est aussi le thème du jeu : des cubes.
> - **Il s'apprend en deux phrases** : « pose, attends le tintement, fais éclater, enchaîne » et « l'élément qui fait éclater décide de l'effet ».
> - **L'ordre compte.** Un même trio offre six enchaînements. Roche puis Eau : armure fissurée, puis le plus gros coup. Finir par Roche quand une grosse attaque arrive : bouclier au bon moment.
> - **Il donne son sens au mot trio.** Trois compagnons d'éléments différents, trois touches, un accord.
> - **Il est à nous.** Ni la table de paires ni les noms d'un autre jeu.

**Pourquoi le cube doit mûrir.** J'ai fait tourner un petit modèle (une cible, trois sorts aux recharges réelles, 40 secondes). Sans temps d'attente, lancer chaque sort dès qu'il est prêt donne à peu près autant de Trios et de dégâts qu'en jouant bien : la meilleure stratégie resterait d'appuyer le plus vite possible, comme aujourd'hui. Avec 1,2 s de maturation, celui qui appuie sans regarder gâche une partie de ses cubes en Éclats faibles et fait de 0 à 5 Trios selon son escouade, quand celui qui attend le tintement en fait 7 à 10. C'est cette seconde d'attente, tenue pendant qu'on surveille les attaques du boss, qui donne une décision à chaque cycle. (hypothèse) Modèle simplifié : le vrai réglage se fera avec l'outil de simulation, puis à la porte 1.

## 5.2 · L'Esquive

La commande « Dispersion » devient l'**Esquive** (touche Espace), et elle devient un geste de précision.

|  | Aujourd'hui (constaté) | Demain |
| --- | --- | --- |
| Recharge | 5 s | 4 s, dont la moitié est rendue si l'esquive est parfaite |
| Invulnérabilité | 0,55 s, ou 0,8 s si une attaque est annoncée | 0,5 s, toujours |
| Esquive « parfaite » | Une attaque est annoncée au moment de l'appui | L'impact tombe dans les 0,35 s qui suivent l'appui |
| Récompense | +14 % de Déchaînement | +12 % de Déchaînement, recharge à moitié rendue, son et texte dédiés |

Appuyer trop tôt ne protège plus : 0,5 s d'invulnérabilité ne couvre pas un impact annoncé une seconde à l'avance. Il faut lire l'attaque. Pour que ce soit juste, chaque attaque annoncée montre exactement quand elle frappe (section suivante).

## 5.3 · Les attaques annoncées : une seule grammaire

Le moteur connaît six attaques annoncées. Aujourd'hui chaque kit de boss a ses couleurs (bleu pour le Givre, jaune pour l'Orage, rouge sombre pour l'Ambre) et les délais descendent jusqu'à 0,62 s. (constaté) Demain, **une forme veut toujours dire la même chose** :

*(Captures dans le PDF : Aujourd'hui : l'Anneau de Givre s'annonce en bleu, avec une consigne écrite… — …et la frappe circulaire en rouge. Demain : une seule couleur de danger, et c'est la forme qui dit quoi faire.)*

| Forme au sol | Ce qu'elle veut dire | Attaques concernées |
| --- | --- | --- |
| **Disque plein** | Sors de là. | Frappe circulaire, détonation du cyclone |
| **Couronne** | Viens au centre, colle-toi au boss. | Anneau de Givre, Anneau d'Ambre |
| **Bande** | Sors du couloir. | Charges en croix, rafale en ligne |
| **Plusieurs petits disques** | Ne reste pas en place. | Pluie de météores |
| **Spirale** | Tu es aspiré : esquive pour te dégager. | Œil du Cyclone, tourbillon de sable |

- **La forme se remplit** du centre vers le bord : quand elle est pleine, ça frappe. Le contour clignote et un son retentit 0,35 s avant l'impact : c'est la fenêtre de l'esquive parfaite.
- **Une seule couleur de danger** dans tout le jeu, avec des hachures : la lecture ne dépend jamais de la couleur seule. Le biome ne colore que les particules.
- **Un délai minimum** entre l'annonce et l'impact : 0,9 s en phase 1, 0,75 s en phase 2, 0,65 s en phase 3.
- **Trois zones de danger au plus** en même temps (cinq pour la pluie de météores).
- **La consigne écrite** (« collez-vous au boss ! ») n'apparaît que les deux premières fois. Ensuite la forme suffit.
- **La caméra recule** quand une zone dépasse l'écran.

## 5.4 · Le Déchaînement

L'attaque d'escouade (touche R) doit redevenir un événement. Deux changements.

**1. Il se mérite.** Il se charge surtout par les gestes réussis :

| Source | Aujourd'hui (constaté) | Demain |
| --- | --- | --- |
| Coup de base | +2,8 | +0,6 |
| Coup de sort | +6,5 | +2,5 |
| Éclat | +16 à +20 | +8 |
| Trio | — | +25 |
| Esquive parfaite | +14 | +12 |

Cible : 1 à 2 Déchaînements par combat de boss en jouant activement, 0 à 1 en Auto. Aujourd'hui : 7 en 46 s. (constaté)

**2. Il porte la couleur du meneur.** Le compagnon placé en premier décide de l'effet, avec la même logique que les Éclats :

| Meneur | Effet du Déchaînement |
| --- | --- |
| Feu | Explosion sur tous les ennemis, qui brûlent |
| Eau | Coup triple sur l'ennemi le plus solide |
| Plante | Soigne 30 % des PV de l'escouade |
| Électrik | Étourdit tous les ennemis 2 s |
| Roche | Bouclier d'escouade de 35 % |
| Psy | Remet à zéro les trois recharges |

Tous gardent les dégâts d'escouade actuels, et le Déchaînement compte comme un sort de l'élément du meneur : il pose son cube ou fait éclater ceux qui sont mûrs. Le soin automatique de 22 % disparaît, sauf pour un meneur Plante.

Une seule table à retenir, donc : **six éléments, six effets**. Elle sert pour les Éclats, pour le Déchaînement, puis pour les runes et les faveurs de la Faille.

## 5.5 · Les boss : une idée par biome

Chaque biome se termine par un boss qui teste **une** compétence. La campagne devient ainsi un apprentissage progressif. Quatre kits existent déjà ; deux mécaniques sont nouvelles.

| Biome | Ce que le boss apprend au joueur | Idée signature | Base |
| --- | --- | --- | --- |
| Prairie Émeraude | Esquiver | Frappe circulaire lente, puis pluie de pétales | attaques existantes |
| Rive Azur | Sortir d'un couloir | Lames d'eau en ligne et charges en croix | attaques existantes |
| Crête Volcanique | L'Éclat est nécessaire | **Carapace de magma** : à chaque phase, un bouclier que les Éclats brisent trois fois plus vite | nouveau |
| Sanctuaire Cristallin | Choisir sa cible, jouer en zone | **Satellites** : deux gardiens divisent par deux les dégâts subis par le boss tant qu'ils sont debout | nouveau |
| Toundra Boréale | Venir au contact | Anneau de Givre, puis Contrecoup | kit Givre |
| Cime des Orages | Bouger sans cesse | Foudre en ligne, Œil du Cyclone qui aspire | kit Orage |
| Canyon d'Ambre | Tout combiner | Anneau, aspiration et charges, armure fissurée | kit Ambre |

Les deux premiers niveaux de chaque biome ont un « mini-boss » qui n'utilise qu'une attaque du kit : il prépare au boss de fin.

## 5.6 · Les compagnons : un rôle, un sort, un trait

Aujourd'hui deux compagnons du même élément et du même rôle se distinguent peu. Chaque **lignée** reçoit un **trait** : une phrase, affichée sur sa fiche, qui lui donne une raison d'être choisie. Quatorze traits, pas un par créature.

| Lignée | Élément · rôle | Trait proposé |
| --- | --- | --- |
| Pyrocube | Feu distance | **Braise vive** : ses cubes mûrissent en 0,8 s au lieu de 1,2 s. |
| Braizard | Feu mêlée | **Sang chaud** : +20 % de dégâts contre un ennemi qui porte un cube. |
| Aquabloc | Eau mêlée puis tank | **Ressac** : sa Déferlante repousse deux fois plus loin. |
| Crabloc | Eau mêlée puis tank | **Carapace** : le premier coup reçu à chaque vague est réduit de 60 %. |
| Givrelin | Eau mêlée | **Élan** : sa charge frappe 30 % plus fort si elle part de loin. |
| Bourgéon | Plante tank | **Racines** : récupère 1,5 % de ses PV par seconde sous 40 % de PV. |
| Mycélin | Plante distance | **Spores** : sa Sève soigne moitié plus. |
| Voltik | Électrik mêlée puis distance | **Survolté** : après une esquive parfaite, son sort est prêt. |
| Crépitil | Électrik distance | **Conducteur** : son Arc touche un ennemi de plus. |
| Cailloc | Roche tank | **Rempart vivant** : son Rempart donne moitié plus de bouclier. |
| Chevrok | Roche mêlée | **Tête dure** : insensible aux reculs et aux aspirations. |
| Givrock | Roche tank | **Glace vive** : ralentit 2 s ceux qui le frappent au corps à corps. |
| Psycube | Psy distance | **Clairvoyance** : la fenêtre d'esquive parfaite gagne 0,1 s. |
| Nimbulle | Psy soutien | **Rêve partagé** : les soins de son sort touchent toute l'escouade. |

Règle de réglage : aucun trait ne doit changer le taux de victoire de plus de 8 points à lui seul (simulation). Les traits arrivent en session S09.

## 5.7 · La progression : trois ressources, pas une de plus

Aujourd'hui le joueur gère de l'XP, 14 ingrédients, une marmite à 4 paliers, 17 recettes, un sac de 48 pierres à sous-statistiques et 6 pierres de capacité. Demain, trois choses : **le niveau** (je joue), **le Lien** (je joue *avec lui*), **les runes** (je choisis).

### a) Le niveau : moins de répétition

Mesure : gagner une fois chacun des 17 premiers niveaux donne 19 105 XP à chaque membre de l'escouade (niveau 21) ; le 18e niveau oppose des ennemis de niveau 47 à 50 et demande environ 183 000 XP (niveau 50). Avec le plan, un joueur qui ne rejoue rien y arrive au niveau 45, et au niveau 50 s'il joue chaque niveau deux fois.

- **Les récompenses d'XP sont recalibrées sur le niveau des ennemis** : 270 XP pour le premier niveau au lieu de 95, 3 400 pour le dixième au lieu de 920, 7 900 pour le dernier au lieu de 6 300. Le tableau complet est dans la fiche S06.
- **La première victoire sur un niveau donne 2,5 fois l'XP.** Les suivantes donnent l'XP normale.
- **Tout le camp progresse** : les compagnons restés au camp reçoivent 60 % de l'XP (rien aujourd'hui). Changer de trio ne coûte plus rien, ce qui sert le pilier « Composer ».
- **Le plafond reste au niveau 50.** La courbe d'XP par niveau et les niveaux d'évolution ne changent pas.
- **Un outil mesure la répétition** : la *simulation de parcours* joue toute la campagne et compte les parties nécessaires par niveau. Cible : 2,2 en moyenne, jamais plus de 4. Mon calcul sur les données du code donne 1,5 à 1,7 avec le tableau proposé ; l'outil le vérifiera avec de vrais combats, défaites comprises. (hypothèse)

### b) La Confiance et le Lien : le recrutement sans hasard

Sur l'île, on se lie d'amitié en se mesurant aux autres. Chaque **lignée** a une barre de **Confiance** visible dans le Carnet, avec les niveaux où on la croise.

| Règle | Valeur de départ |
| --- | --- |
| Vaincre un membre sauvage de la lignée, avant qu'elle ne te rejoigne | +12 de Confiance (+30 si c'est le boss du niveau) |
| Première rencontre de la lignée | +20 |
| La lignée rejoint le camp | à 100 de Confiance, au niveau moyen de l'escouade moins 2 |
| Après le recrutement : le **Lien**, de ★1 à ★5 | à 150, 250, 400, 600 et 900 de Confiance |
| Gagner un combat avec lui dans l'escouade | +10 (c'est la seule façon de faire monter le Lien) |
| Chaque étoile de Lien | +4 % de PV et d'attaque ; 2e emplacement de rune à ★1, 3e à ★3 |

- **Un seul individu par lignée** : 14 compagnons, chacun unique, qui évolue. Le Carnet compte toujours 38 formes à découvrir.
- **L'arrivée est un moment** : le compagnon rejoint le feu de camp dans une courte scène, comme l'évolution aujourd'hui.
- **Rythme visé** : un premier compagnon après le premier boss (niveau 3), puis un tous les deux niveaux environ ; le quatorzième arrive dans le dernier biome. Jamais plus de 4 niveaux sans arrivée ni évolution.
- **Vérifié sur les vagues actuelles** : avec ces valeurs, le premier compagnon arrive bien à la fin du niveau 3, quel que soit le trio de départ. En revanche Mycélin, Crabloc et Braizard n'apparaissent que dans deux ou trois niveaux et plafonneraient vers 50 de Confiance : la fiche S08 les ajoute à d'autres vagues. (constaté)
- **Rien n'est perdu** : les ingrédients et les doublons d'une ancienne sauvegarde sont convertis en Confiance.

### c) Les Runes : peu, mais qui changent le jeu

Les pierres de pouvoir disparaissent : leur puissance est intégrée au niveau, par une courbe calée sur le bonus qu'elles apportent aujourd'hui dans les escouades de référence du code (+33 au niveau 4, +468 au niveau 30, +2 000 au niveau 50). Le Canyon, qui se joue au niveau 50 contre des ennemis de niveau 52 à 60, se gagne alors avec le Lien, les runes et la maîtrise.

Restent **14 runes**. Une rune gagnée est un savoir, pas un objet : tous les compagnons peuvent la porter en même temps, et il n'y a plus d'inventaire. Un compagnon en porte une, puis deux, puis trois selon son Lien. Chacune se gagne à un endroit précis.

| Rune | Effet | Où la gagner |
| --- | --- | --- |
| Fougue | +12 % d'attaque | Boss de la Prairie |
| Garde | +18 % de PV | Boss de la Rive |
| Détonation | Ses Éclats ont 25 % d'effet en plus | Boss de la Crête |
| Ampleur * | +35 % de rayon et de portée du sort | Boss du Sanctuaire |
| Riposte | Après une esquive parfaite, son prochain sort frappe 50 % plus fort | Boss de la Toundra |
| Amorce | Ses cubes mûrissent deux fois plus vite | Boss de la Cime |
| Force * | +40 % de dégâts du sort, recharge +15 % | Boss du Canyon |
| Précision * | +15 points de coup critique sur le sort | 12 étoiles |
| Vigueur * | Rend en PV 10 % des dégâts du sort | 24 étoiles |
| Partage * | Partage 50 % des soins et protections du sort | 36 étoiles |
| Cadence * | Recharge du sort −18 % | 48 étoiles |
| Rebond | Son premier Éclat de chaque vague se répète à moitié de puissance | 3 niveaux Défi réussis |
| Charge | Ses Éclats et ses Trios chargent moitié plus le Déchaînement | Faille, étage 10 |
| Réveil | Se relève 40 % plus vite après un K.O. | Faille, étage 15 |

* Les six runes marquées reprennent les effets des six pierres de capacité actuelles (Élargie, Double, Précision, Sangsue, Partage, Hâte). Les huit autres sont nouvelles.

## 5.8 · La campagne : étoiles, défis, difficulté

### Trois étoiles par niveau, et elles restent

- ★ **Victoire.**
- ★ **Sans K.O.** : aucun compagnon ne tombe.
- ★ **Le défi du niveau** : un objectif choisi pour faire pratiquer un geste. Exemples : « réussis 2 Éclats » (niveau 1), « réussis une esquive parfaite » (niveau 2), « réussis un Trio » (niveau 3), « finis en moins de 50 s », « ne subis aucune attaque annoncée », « gagne sans Déchaînement ».

63 étoiles en tout. Des paliers donnent des runes et ouvrent, dans chaque biome, un **niveau Défi** : le niveau du boss, plus dur, avec une règle spéciale. Aujourd'hui les étoiles existent mais ne sont pas enregistrées. (constaté)

### Les cibles de difficulté

Elles sont mesurées par la simulation, avec trois profils : **Auto** (le mode du jeu : sorts dès que prêts, jamais d'esquive), **actif** (sorts dès que prêts, esquive au bon moment 85 % du temps) et **expert** (aligne ses sorts pour les Trios, esquive presque toujours). Les taux s'entendent avec une escouade au niveau prévu pour le niveau.

| Zone | Auto | Actif | Expert | Durée d'un combat |
| --- | --- | --- | --- | --- |
| Niveau 1 | ≥ 95 % | ≈ 100 % | 100 % | 25 à 35 s |
| Reste du biome 1 | 85 à 95 % | ≥ 95 % | 100 % | 30 à 45 s |
| Biomes 2 et 3 | 60 à 80 % | ≥ 90 % | ≥ 97 % | 35 à 55 s |
| Biomes 4 à 7 | 35 à 60 % | 80 à 92 % | ≥ 95 % | 40 à 60 s, boss de biome 55 à 75 s |
| Niveaux Défi | ≤ 20 % | 45 à 65 % | ≥ 85 % | 60 à 90 s |

Chaque phase de boss dure au moins 10 s et contient au moins 2 attaques annoncées. Avec 4 niveaux d'avance, l'Auto repasse au-dessus de 85 % : on peut toujours rejouer tranquillement un niveau déjà dominé.

### Les dix premières minutes

Le joueur choisit un **trio de départ** parmi deux, et non un seul compagnon : c'est le premier message du jeu, « ici on joue à trois ». Les deux trios se partagent les six éléments : *Braise* (Pyrocube Feu, Voltik Électrik, Cailloc Roche) et *Marée* (Aquabloc Eau, Bourgéon Plante, Psycube Psy). Le trio qu'on n'a pas choisi, on le croise et on le recrute en chemin. Puis tout arrive une chose à la fois.

| Vers | Ce qui arrive | Comment |
| --- | --- | --- |
| 0:00 | Choix du trio de départ | Deux trios, chacun présenté avec ses trois Éclats |
| 0:20 | Premier combat, sans passer par le camp | — |
| 0:40 | Premier cube, premier Éclat | Le jeu ralentit, une touche s'allume, une phrase |
| 1:20 | Première attaque annoncée, première esquive | Ralenti jusqu'à l'appui dans la bonne fenêtre |
| 2:00 | Victoire, les trois étoiles expliquées | Puis le camp, avec un seul bouton : « Partir » |
| 4:00 | Premier Trio | Guidé au niveau 2 |
| 5:30 | Première évolution | Le niveau 8 est atteint à la fin du niveau 2 |
| 8:00 | Premier boss à trois phases | Niveau 3 |
| 9:30 | Un compagnon rejoint le camp | Le menu Escouade s'ouvre, puis le deuxième biome |
| ~14:00 | Le Carnet s'ouvre, deuxième évolution | Après le premier niveau de la Rive |
| ~45:00 | La Faille s'ouvre | Après le boss du troisième biome |

## 5.9 · La Faille : le « encore une »

Une descente de combats qui s'enchaînent, de plus en plus durs, jusqu'à la chute de l'escouade. Une descente dure une dizaine de minutes. Elle réutilise tout : créatures, biomes, boss, attaques. Elle n'ajoute qu'une chose, la plus éprouvée du genre : **choisir un bonus parmi trois**.

Schéma d'une descente : choix d'un premier invité, étage 1, faveur, étage 2, choix du second invité, étage 3, faveur, étage 4, faveur, étage 5 boss, puis faveur rare et soin complet ; étages 6 à 9 avec une règle spéciale chacun ; étage 10 boss ; et ainsi de suite.

- **On part avec son meneur**, un compagnon de son camp, ramené au niveau 8. Avant le premier étage puis après le deuxième, on choisit un **invité** parmi trois pour compléter le trio : des lignées déjà croisées, même pas encore recrutées. Chaque descente fait donc essayer un trio différent.
- **Le trio grandit en descendant** : +2 niveaux par étage. Les évolutions arrivent pendant la descente, en version courte.
- **Entre deux étages, une faveur parmi trois.** 24 faveurs en trois raretés. Chacune change la façon de jouer : « ton premier Éclat de chaque vague se déclenche deux fois », « une esquive parfaite pose un cube sur les ennemis proches », « +35 % de dégâts infligés, +20 % subis ». Aucun bonus de 3 %.
- **La fatigue** : entre deux étages on ne récupère que 35 % des PV manquants. Un boss vaincu soigne tout.
- **À partir de l'étage 6, une règle spéciale par étage**, annoncée avant le combat : ennemis pressés, cubes fragiles, foudre qui frappe tout le monde…
- **Les records** : meilleur étage global et par meneur (14 records à battre). Les paliers atteints pour la première fois donnent des runes.
- **Le défi du jour** : la même descente pour tout le monde, une tentative comptée par jour, un résultat à copier et à partager. Aucun serveur n'est nécessaire.

Cibles de la simulation : étage médian 6 à 8 en Auto, 12 à 16 en jeu actif, plus de 20 pour l'expert. Le Lien et les runes du camp s'appliquent : progresser en campagne aide en Faille, sans la rendre automatique.

## 5.10 · Le camp et l'interface

- **Trois entrées au lieu de cinq** : *Partir* (la carte et la Faille), *Escouade* (le trio, les runes), *Carnet* (compagnons, éléments, boss, exploits). Les options sont derrière une roue dentée.
- **Le feu de camp** remplace la marmite au centre. Les compagnons recrutés s'y promènent ; les nouveaux y arrivent.
- **Le Carnet** remplace le Codex. Il fonctionne sans connexion : la barre de Confiance de chaque lignée et où la trouver, la table des éléments et des six Éclats, les attaques de boss déjà vues et comment les éviter, les exploits.
- **L'écran de fin** montre les étoiles, les barres qui ont avancé (niveau, Confiance), et un bouton principal : « Suivant » après une victoire, « Réessayer » après une défaite.
- **Les règles de l'interface** : un seul bouton principal par écran ; un chiffre n'est affiché que s'il aide à décider ; aucun texte de plus de deux lignes en combat.

## 5.11 · L'identité : nom, ton, image, son

**Le nom est ta décision.** « CubiQuest » rappelle « Pokémon Quest », « Cubimon » porte le suffixe « -mon », et « L'Île aux Cubes » reprend l'idée de l'île de Pokémon Quest (« Tumblecube Island », « Île Trois-Dés » en français). Je recommande un titre qui dit la signature du jeu. Pistes, dont la disponibilité n'est pas vérifiée :

| Pour le jeu | Pour les créatures |
| --- | --- |
| **Tricube** : trois cubes, le Trio | **Cubins** |
| **Cubéclat** : le cube et l'Éclat | **Kubis** |
| **L'Île aux Éclats** | **Cubilles** |

- **Le ton** : une aventure douce et malicieuse. Les petites phrases des fiches de créature sont déjà dans ce ton : on le garde partout.
- **L'image** : le voxel procédural reste. Trois chantiers : des évolutions qui changent de silhouette, des biomes qui diffèrent par la forme et pas seulement par la couleur, des boss de biome reconnaissables.
- **Le son** : les effets synthétisés restent. Chaque geste clé a son son : cube posé, Éclat, Trio, fenêtre d'esquive. La musique est une décision à part (partie 11).

## 5.12 · Le lexique : ce qui change de nom

| Avant | Après | Session |
| --- | --- | --- |
| Cubimon | À choisir. Provisoire : **Cubin** | S03 |
| Dispersion · `scatter` | **Esquive** · `dodge` | S03 |
| Cubi-Déchaînement | **Déchaînement** | S03 |
| Camp de Base | **le Camp** | S03 |
| Pierre Élargie, Hâte, Double, Partage, Précision, Sangsue · `broadburst`, `wait_less`, `whack_whack`, `share`, `crit_focus`, `leech` | **Rune** d'Ampleur, de Cadence, de Force, de Partage, de Précision, de Vigueur · `rune_ampleur`, `rune_cadence`, `rune_force`, `rune_partage`, `rune_precision`, `rune_vigueur` | S03 |
| Éclat Mystique (ingrédient) | **Fragment Mystique** : le mot « Éclat » est réservé au combat | S03 |
| Pierres de Pouvoir | **Galets** (provisoire), puis supprimés | S03, S09 |
| Ragoût Cubique (`mulligan_stew`), Ambroisie des Légendes, « … à la Cube » | Noms originaux, puis retirés avec la cuisine | S03, S08 |
| Réactions : Évaporation, Embrasement, Électrocution, Surcharge, Cristallisation, Résonance Psy | **Éclats** : Déferlante, Déflagration, Arc, Rempart, Écho, Sève | S04 |
| Statuts : Brûlure, Trempé, Enraciné, Électrifié, Brise-Armure, Confusion | **Cube** de Feu, d'Eau, de Plante, d'Électrik, de Roche, de Psy | S04 |
| ×133 COMBO | **Éclats 4 · Trios 2** | S04 |
| « Phase 3 — Surcharge » | **« Phase 3 — Dernier sursaut »** | S04 |
| Marmite, Chaudron | **Feu de camp** | S08 |
| Codex, Professeur Cubix | **Carnet** | S08 |

# PARTIE 6 — La feuille de route

Sept phases, seize sessions, quatre portes. Chaque phase livre un jeu jouable, sauvegardé, meilleur que le précédent.

Phase 0 Assainir (v0.3) : S03. Phase 1 Le combat (v0.4) : S04, S05, puis Porte 1 « Le combat est-il amusant ? ». Phase 2 La campagne (v0.5) : S06, S07, puis Porte 2 « Un nouveau joueur comprend-il seul ? ». Phase 3 La collection (v0.6) : S08, S09, S10, puis Porte 3 « A-t-on envie de tous les avoir ? ». Phase 4 La Faille (v0.7) : S11, S12, puis Porte 4 « Est-ce qu'on relance ? ». Phase 5 Le monde (v0.8) : S13, S14 (optionnelle). Phase 6 La finition (v0.9) : S15, S16, S17. Phase 7 La sortie (v1.0) : S18.

> **À SAVOIR — Où s'arrêter si tu dois t'arrêter**
> - **Après v0.5** (S07) : un jeu propre, au combat prenant, avec une campagne à étoiles. Il garde la marmite et les pierres, renommées.
> - **Après v0.7** (S12) : le jeu complet, avec son identité et sa rejouabilité. Il lui manque la finition.
> - **v1.0** (S18) : publiable.

Durées (hypothèse) : les trois sessions de ce week-end ont pris environ 1 h 15 chacune pour une portée comparable. Seize sessions représentent donc de l'ordre de 20 à 40 heures de machine. Ce qui limitera vraiment le rythme, ce sont les portes : ton temps de jeu et tes décisions.

### Les seize sessions

| Session | Nom | Ce qui change pour le joueur | Priorité |
| --- | --- | --- | --- |
| S03 | Une identité propre | Nouveaux noms, premiers niveaux réparés, jeu en ligne par un lien | Indispensable |
| S04 | Les cubes d'élément | Il voit ses combos, l'ordre des sorts compte, le Trio existe | Indispensable |
| S05 | Lire et esquiver | L'esquive demande du timing, tous les boss montrent leurs attaques | Indispensable |
| S06 | Les étoiles et le parcours | Trois étoiles par niveau, bien moins de répétition | Indispensable |
| S07 | Les dix premières minutes | Trio de départ, apprentissage en jouant, premier compagnon | Indispensable |
| S08 | Confiance et Lien | Recrutement sans hasard, Carnet, feu de camp | Recommandé · D1, D4 |
| S09 | Runes et traits | Fin de la grille de pierres, des builds lisibles | Recommandé · D2 |
| S10 | Des évolutions qui se voient | Chaque stade change de silhouette | Recommandé |
| S11 | La Faille : la descente | Un mode sans fin, des records | Recommandé · D3 |
| S12 | La Faille : faveurs et défi du jour | Choix « une parmi trois », invités, rendez-vous quotidien | Recommandé · D3 |
| S13 | Des arènes vivantes | Chaque biome a sa particularité et son boss reconnaissable | Recommandé |
| S14 | Le bestiaire complété | Trois lignées de plus, variantes rares | Optionnel |
| S15 | L'interface et le parcours | Trois menus, options, accessibilité | Indispensable |
| S16 | Mobile et performances | Jouable au doigt, installable, fluide | Recommandé |
| S17 | Le nom, l'identité, le son | Titre définitif, logo, écran titre, sons soignés | Indispensable · D5, D6 |
| S18 | La version 1.0 | Dernier équilibrage, plus de bugs connus, sortie publique | Indispensable |

# PARTIE 7 — La méthode de travail avec Claude Code

Le plan vit dans le dépôt. Chaque session se lance avec quatre lignes.

## Pourquoi changer de méthode

Le prompt de la session 3 est arrivé tronqué au collage : Claude Code n'en a reçu que la première section, et la session n'a pas eu lieu. (constaté) Un long prompt collé à la main est fragile. Désormais **le plan est un fichier du dépôt** (`docs/plan/PLAN_DIRECTEUR.md`), que Claude Code lit lui-même. Chaque fiche se termine par une ligne de contrôle, et il s'arrête s'il ne la trouve pas.

## Une fois pour toutes

**1. Dépose le plan.** Télécharge le fichier `PLAN_DIRECTEUR.md` joint, puis colle ces trois lignes dans PowerShell :

```
cd $HOME\development\CUBIQUEST
mkdir docs\plan -Force
copy "$HOME\Downloads\PLAN_DIRECTEUR.md" docs\plan\
```

**2. Change la description du dépôt GitHub**, qui dit encore « Pokemon quest the way I dreamt it ». Tu peux aussi me le demander : je le fais par le navigateur.

**3. Règle la mise en veille de Windows sur « Jamais »** avant chaque session.

**4. Après la session S03, active la mise en ligne** : sur GitHub, *Settings*, *Pages*, source « Deploy from a branch », branche `gh-pages`, dossier racine. Le jeu sera alors jouable à `https://zedkay37.github.io/CUBIQUEST/` (dernière version validée) et à `…/CUBIQUEST/next/` (session à valider). Le dépôt étant public, cette adresse le sera aussi. Les libellés de GitHub ont pu changer : je peux le faire avec toi.

## Lancer une session

Dans PowerShell :

```
cd $HOME\development\CUBIQUEST
claude --permission-mode auto
```

Colle ensuite ce prompt, en changeant le numéro de session :

```
Tu travailles SEUL, sans moi. Ne me pose aucune question : prends la décision la plus prudente, note-la dans le rapport et continue.

1. Lis docs/plan/PLAN_DIRECTEUR.md : la partie « Règles générales pour Claude Code », le lexique (5.12), la fiche S03, puis les sections que la fiche demande de lire. Si le fichier est absent, ou si la fiche ne se termine pas par « FIN DE LA FICHE S03 », arrête-toi et dis-le-moi.
2. Exécute la session S03 exactement comme la fiche la décrit, section par section, en respectant les règles générales.
3. Termine par le rapport docs/rapports/S03.md et affiche-m'en le résumé.
```

À partir de la deuxième fois, ajoute deux lignes : la validation de la session précédente, et tes retours.

```
Tu travailles SEUL, sans moi. Ne me pose aucune question : prends la décision la plus prudente, note-la dans le rapport et continue.

La session S03 est validée : avance `main` sur le tag `s03-final` avant de commencer.
Mes retours à traiter en priorité, avant la fiche : (écris ici ce que tu as remarqué en jouant, ou « aucun »).

1. Lis docs/plan/PLAN_DIRECTEUR.md : la partie « Règles générales pour Claude Code », le lexique (5.12), la fiche S04, puis les sections que la fiche demande de lire. Si le fichier est absent, ou si la fiche ne se termine pas par « FIN DE LA FICHE S04 », arrête-toi et dis-le-moi.
2. Exécute la session S04 exactement comme la fiche la décrit, section par section, en respectant les règles générales.
3. Termine par le rapport docs/rapports/S04.md et affiche-m'en le résumé.
```

## Après chaque session : la porte

1. **Lis le résumé** que Claude Code affiche (5 lignes), puis la section « À juger par un humain » de son rapport.
2. **Joue 10 à 20 minutes** à la version à valider, par le lien `…/next/` ou en local (`npm.cmd run dev`), en suivant la liste de la porte.
3. **Décide** : « validé », ou la liste de ce qui ne va pas. Tu peux m'envoyer le rapport : je teste la branche dans le navigateur, comme je l'ai fait pour les sessions précédentes, et je te dis ce que je vois.
4. **Lance la session suivante** avec tes retours dans le prompt. Si une porte échoue, on refait une session courte sur le même sujet avant d'avancer.

> **ATTENTION — Si une session casse quelque chose** Rien n'est perdu. `main` reste la dernière version validée, et chaque session pose un tag avant chacune de ses sections. Pour revenir en arrière : `git checkout <nom-du-tag>`. Les noms des tags et leur contenu sont listés en tête de chaque rapport.

## Règles générales pour Claude Code

Ces seize règles s'appliquent à toutes les sessions. Elles reprennent ce qui a fonctionné ce week-end et corrigent ce qui a échoué.

- **R1 · Autonomie.** Ne pose aucune question. Prends la décision la plus prudente, note-la dans le rapport, continue.
- **R2 · Départ.** `git fetch --all --tags`. Si l'arbre de travail contient des modifications non commitées autres que `docs/plan/`, arrête-toi et liste-les. Si le prompt de lancement dit qu'une session est validée, avance d'abord `main` en avance rapide sur son tag final (`git checkout main && git merge --ff-only <tag> && git push origin main`) ; si l'avance rapide est impossible, arrête-toi et explique pourquoi. Crée ensuite la branche de la fiche depuis le tag de départ indiqué (`git checkout -B <branche> <tag>`). Si `docs/plan/` contient une version du plan plus récente que celle du dépôt, committe-la en premier sur cette branche. Ne touche à aucune autre branche ni à aucun tag existant ; seule exception, la branche `gh-pages`, que le script de mise en ligne régénère (R16).
- **R3 · Sauvegardes.** Avant chaque section de la fiche, crée et pousse un tag annoté `sNN-avant-<section>` qui décrit l'état sauvegardé. À la fin, `sNN-final`. Vérifie chaque tag avec `git ls-remote --tags origin`. Si le push d'un tag échoue, arrête-toi et explique pourquoi. Ne supprime ni ne déplace jamais un tag.
- **R4 · Qualité.** Après chaque section : `npm run check` passe, commit clair, `git push -u origin <branche>`. Si une section casse et que tu ne répares pas en 10 minutes environ, reviens au dernier commit (`git reset --hard HEAD`, puis retire les fichiers que la section avait créés), note-le dans le rapport et passe à la section suivante.
- **R5 · Golden master.** Changement technique : le golden reste identique. Changement de jeu voulu par la fiche : `npm run golden -- --record`, dans un commit séparé intitulé « golden: réenregistré après <section> », avec le résumé des écarts dans le message.
- **R6 · Mesure.** Tout réglage d'équilibrage se fait avec `npm run sim`, sur au moins 40 combats et 3 graines par essai. Jamais sur un seul combat. Les cibles sont dans la fiche. Les valeurs réglables vivent dans `balance.ts`.
- **R7 · Données, textes, règles.** Le contenu va dans `catalog.ts` et `balance.ts` ; tout texte visible dans `src/i18n/fr.ts` (`npm run texts` reste à zéro) ; toute règle nouvelle est une fonction pure de `rules.ts` avec son test. Le moteur ne contient aucun cas particulier par espèce.
- **R8 · Sauvegarde du joueur.** Si la forme de `SaveState` change : `SAVE_VERSION` + 1, migration testée depuis toutes les versions précédentes. Une ancienne sauvegarde se charge toujours. Rien n'est perdu : ce qui est supprimé est converti.
- **R9 · Vocabulaire.** Utilise le lexique du plan (5.12). Le test des mots interdits doit passer : aucun terme venu d'un autre jeu.
- **R10 · Périmètre.** Fais ce que la fiche demande, rien de plus. Une idée en plus va dans la section « Idées » du rapport. Aucun asset externe (images, sons, modèles), aucune dépendance nouvelle sans que la fiche le demande, aucun service payant, aucune collecte de données, aucune requête réseau ajoutée au jeu.
- **R11 · Captures.** À la fin, enregistre des captures des écrans modifiés dans `docs/captures/sNN/` et liste-les dans le rapport.
- **R12 · Documentation.** Mets à jour `CLAUDE.md` (architecture, commandes, pièges) et `STYLE.md` si le style change. Le cadre du projet est ce plan directeur.
- **R13 · Honnêteté.** Dans le rapport, distingue ce qui est mesuré, ce qui est vérifié à l'écran et ce qui n'est pas vérifié. N'écris jamais « validé » pour le plaisir de jeu, le son, la fluidité ou la beauté : c'est le rôle de la porte humaine.
- **R14 · Temps.** Vise la durée de la fiche. Si le temps manque, coupe par la fin de la fiche, jamais dans la qualité. Vers 85 % du temps : plus de nouveauté, vérification complète, rapport.
- **R15 · Rapport.** `docs/rapports/SNN.md`, court et factuel, sans superlatif, avec ce plan : 1. Résumé en 5 lignes · 2. Tags et retour arrière · 3. Ce qui a changé, par section · 4. Mesures avant/après · 5. Valeurs de jeu modifiées (ancienne → nouvelle, pourquoi) · 6. Décisions prises seul · 7. Non fait ou coupé, et pourquoi · 8. Bugs trouvés · 9. À juger par un humain (recopie la porte ou le contrôle de la fiche) · 10. Idées.
- **R16 · Mise en ligne de la version à tester.** À partir de S03, termine chaque session par `npm run deploy:pages -- --target next` : la branche de la session devient jouable à l'adresse `…/CUBIQUEST/next/`, avec un emplacement de sauvegarde séparé. Quand le prompt de lancement dit qu'une session est validée, après avoir avancé `main`, lance aussi `npm run deploy:pages -- --target root` depuis `main`. N'active ni ne modifie jamais les réglages du dépôt GitHub (Pages, description, visibilité) : c'est le rôle du propriétaire.

# PARTIE 8 — Les seize fiches de session

Chaque fiche est un contrat entre toi et Claude Code : un but, des étapes, des critères mesurables, et ce que toi seul peux juger à la fin. Elles sont écrites pour lui. Tu peux les survoler, sauf la dernière boîte de chacune, qui s'adresse à toi.

### Comment lire une fiche

- **Départ, branche, tag final.** La session part d'un tag, travaille sur sa propre branche et se termine par un tag `sNN-final`. `main` n'avance que lorsque tu as validé.
- **Les sections numérotées** sont exécutées dans l'ordre. Avant chacune, Claude Code pose un tag de sauvegarde dont le nom figure à droite du titre : on peut toujours revenir juste avant.
- **Les critères d'acceptation** sont mesurables par une commande ou par un test. Ce qui ne peut pas se mesurer n'y figure pas : c'est l'objet de la porte.
- **Hors périmètre** : ce que la session ne doit pas faire, même si l'occasion se présente.
- **Porte ou contrôle** : la liste de ce que tu regardes en jouant. Une *porte* (cadre doré) clôt une phase et décide de la suite ; un *contrôle* (cadre bleu) prend dix à vingt minutes.
- **Variante de repli** : ce que fait la session si tu as répondu non à la décision qui la concerne (partie 11).

| Fiche | Nom | Phase | Part de | Durée visée | À la fin |
| --- | --- | --- | --- | --- | --- |
| S03 | Une identité propre | 0 · Assainir | `fondations-final` | 2 h 30 | Contrôle |
| S04 | Les cubes d'élément | 1 · Le combat | `s03-final` | 3 h | Contrôle |
| S05 | Lire et esquiver | 1 · Le combat | `s04-final` | 3 h | **Porte 1** |
| S06 | Les étoiles et le parcours | 2 · La campagne | `s05-final` | 3 h | Contrôle |
| S07 | Les dix premières minutes | 2 · La campagne | `s06-final` | 2 h 30 | **Porte 2** |
| S08 | Confiance et Lien | 3 · La collection | `s07-final` | 3 h | Contrôle |
| S09 | Runes et traits | 3 · La collection | `s08-final` | 3 h | Contrôle |
| S10 | Des évolutions qui se voient | 3 · La collection | `s09-final` | 2 h 30 | **Porte 3** |
| S11 | La Faille : la descente | 4 · La Faille | `s10-final` | 3 h | Contrôle |
| S12 | La Faille : faveurs, règles spéciales, défi du jour | 4 · La Faille | `s11-final` | 3 h | **Porte 4** |
| S13 | Des arènes vivantes | 5 · Le monde | `s12-final` | 3 h | Contrôle |
| S14 | Le bestiaire complété | 5 · Le monde | `s13-final` | 2 h 30 | Contrôle |
| S15 | L'interface et le parcours | 6 · La finition | `s14-final` | 3 h | Contrôle |
| S16 | Mobile et performances | 6 · La finition | `s15-final` | 3 h | Contrôle |
| S17 | Le nom, l'identité, le son | 6 · La finition | `s16-final` | 2 h 30 | Contrôle |
| S18 | La version 1.0 | 7 · La sortie | `s17-final` | 3 h | **Porte finale** |

Les durées visées sont des estimations tirées des trois sessions déjà réalisées (environ 1 h 15 chacune pour une portée un peu moindre). (hypothèse) Si une session dépasse, elle coupe par la fin de sa fiche et le dit dans son rapport (règle R14).

## FICHE S03 — Une identité propre

- Version visée : v0.3 · Piliers : Socle · Durée visée : 2 h 30 · Priorité : Indispensable
- Départ : `fondations-final` · Branche : `s03-identite` · Tag final : `s03-final`

**But.** Retirer du projet tout ce qui vient d'un autre jeu, réparer les douze premiers niveaux juste assez pour qu'ils montrent quelque chose, et rendre le jeu jouable par un simple lien. Aucune mécanique nouvelle.

**Pourquoi maintenant.** Tout ce qui suit va renommer, déplacer et rééquilibrer. Mieux vaut le faire une fois sur une base propre. Et le propriétaire doit pouvoir tester chaque session sans rien installer.

**À lire avant de commencer :** partie 3 (la vision), sections 5.11 et 5.12, partie 7 (règles générales).

### S03.0 — Installer le plan

- Vérifie que `docs/plan/PLAN_DIRECTEUR.md` existe et se termine par la ligne « FIN DU PLAN DIRECTEUR ». Committe-le tel quel : c'est le premier commit de la branche.
- Dans `CLAUDE.md`, remplace la section « Cadre fixé par le propriétaire » par : « Le cadre du projet est `docs/plan/PLAN_DIRECTEUR.md`. Il autorise les changements de mécanique décrits dans ses fiches, et seulement ceux-là. » Ajoute la procédure de lancement d'une session (partie 7).
- Crée `docs/rapports/` et `docs/archives/`. Déplace dans `docs/archives/` les anciens comptes rendus (`GIGA_UPDATE.md`, `GIGA_UPDATE_2.md`, `GIGA_FONDATIONS.md`, les `.md` de `docs/sim/`, les anciennes captures). `docs/sim/golden-master.json` reste où il est.

### S03.1 — Audit et renommage · tag avant la section : `s03-avant-renommage`

- Écris `tools/lexique.ts` (commande `npm run lexique`) : il compte, fichier par fichier, les occurrences d'une liste de termes, sans tenir compte de la casse ni des accents, hors `node_modules`, `dist`, les fichiers de verrouillage, `docs/plan`, `docs/rapports` et `docs/archives`. Enregistre le résultat de départ dans `docs/rapports/S03-audit-avant.md`.
- Repères du 22 novembre sur `fondations-final` : « pokemon » 10 fois dans 7 fichiers (`CLAUDE.md` 2, `GIGA_FONDATIONS.md` 1, `STYLE.md` 1, `index.html` 1, `metadata.json` 1, `server.ts` 2, `CodexDrawer.tsx` 2) ; `whack_whack`, `wait_less`, `broadburst` 61 ; `scatter` 64 ; « Dispersion » 44 ; « Cubimon » 58 ; `mulligan` 15 ; « ambroisie » ou « ambrosia » 12 ; « à la Cube » 2.
- **Mentions d'autres jeux.** Supprime ou reformule toute mention de Pokémon, Pokémon Quest ou Nintendo : commentaires, `index.html` (titre, description, balises Open Graph, qui parlent aussi de « 4 biomes »), `metadata.json`, consigne du Professeur dans `server.ts`, `CodexDrawer.tsx`, `CLAUDE.md`, `STYLE.md`, et la mention unique dans les archives.
- **Esquive.** `scatter` → `dodge` dans tous les identifiants (`triggerScatter` → `triggerDodge`, `scatterCooldown`, `scatterMaxCooldown`, `scatterTimer`, `scatterDirX`, `scatterDirZ`, champs de `ExpeditionHudSnapshot`, `soundFx.playScatter`, clés de `fr.ts`). À l'écran : « Dispersion » → « Esquive ».
- **Runes.** `MoveStoneKind` → `RuneKind` avec `broadburst` → `rune_ampleur`, `wait_less` → `rune_cadence`, `whack_whack` → `rune_force`, `share` → `rune_partage`, `crit_focus` → `rune_precision`, `leech` → `rune_vigueur` ; `moveStoneBag` → `runeBag`, `MOVE_STONES` → `RUNES`. À l'écran : « Rune d'Ampleur », « de Cadence », « de Force », « de Partage », « de Précision », « de Vigueur ».
- **Autres libellés.** « Cubi-Déchaînement » → « Déchaînement » ; « Camp de Base » → « le Camp » ; « Pierres de Pouvoir » → « Galets » (affichage seulement : les identifiants `powerStone*` disparaîtront en S09) ; ingrédient « Éclat Mystique » → « Fragment Mystique ».
- **Recettes.** Identifiant `mulligan_stew` → `camp_stew` ; tout identifiant contenant `ambrosia` → `summit_feast`, affiché « Festin des Cimes » ; retire « à la Cube » des noms (« Soupe Ardente »).
- **Noms en constantes.** Dans `fr.ts` : `GAME_TITLE` (« CubiQuest »), `WORLD_NAME` (« l'Île aux Cubes ») et `CREATURE_NOUN` (singulier et pluriel, valeur provisoire « Cubin », « Cubins »). Plus aucune occurrence en dur de ces noms ailleurs, sauf le nom du paquet et l'adresse du dépôt. Le titre ne change pas dans cette session (décision D5). Propose cinq noms de créature et cinq titres dans le rapport.
- **Sauvegarde.** `SAVE_VERSION` passe de 3 à 4. `migrateSaveState` convertit les identifiants renommés (`runeBag`, runes équipées, `pot.recipeId`, `discoveredRecipeIds`). Ajoute à `save.test.ts` une sauvegarde v3 réaliste (escouade, pierres, cuisson en cours, recettes découvertes) et vérifie qu'elle se charge sans perte. Un identifiant inconnu est ignoré sans erreur.
- **Test des mots interdits** (`src/game/lexique.test.ts`) : échoue si un terme de la liste apparaît dans `src/`, `tools/`, `index.html`, `metadata.json`, `README.md`, `CLAUDE.md`, `STYLE.md` ou `server.ts`. Liste de départ : `pokemon`, `pokémon`, `nintendo`, `game freak`, `pikachu`, `cubimon`, `à la cube`, `mulligan`, `ambrosia`, `ambroisie`, `whack`, `wait_less`, `broadburst`, `scattershot`, `stay_strong`, `scatter`, `dispersion`, `tumblecube`, `gemme-p`, `power charm`. La liste vit dans un seul fichier, que le test et l'outil partagent.
- Ces renommages ne changent aucun comportement : `npm run golden` doit rester identique. S'il change, cherche l'erreur au lieu de réenregistrer.

### S03.2 — La victoire qui ne compte pas · tag avant la section : `s03-avant-bug-victoire`

- Constat fait en test : une pause ouverte pendant la bannière « VICTOIRE » peut faire perdre les récompenses du combat. Reproduis-le d'abord par un test du moteur (dernier ennemi vaincu, pause, reprise ; puis dernier ennemi vaincu, pause, abandon).
- Correction attendue : la victoire est acquise à l'instant où le dernier ennemi tombe. Les récompenses sont attribuées une fois et une seule, quoi que fasse le joueur ensuite. Une fois la victoire acquise, la pause ne propose plus d'abandonner.
- Si tu ne reproduis pas le défaut, écris quand même le test qui garantit l'attribution unique et dis-le dans le rapport.

### S03.3 — Les douze premiers niveaux, a minima · tag avant la section : `s03-avant-premiers-niveaux`

- Mesure de départ (`docs/archives/sim/02-fin-de-session-10.md`) : en Auto, « Sentier des Bourgeons » (`meadow-1`) est perdu 10 fois sur 10 ; les boss des douze niveaux historiques tombent en 0,3 à 3,3 s et ne lancent presque jamais d'attaque annoncée.
- Cherche d'abord pourquoi `meadow-1` est perdu avec l'escouade de référence (niveau 4) et écris la cause dans le rapport.
- Donne une entrée `STAGE_TUNING` à chacun des douze niveaux. Cibles provisoires, mesurées sur 40 combats et 3 graines : `meadow-1` gagné au moins 9 fois sur 10 en Auto ; les autres entre 75 et 95 % ; chaque boss vit au moins 8 s et lance au moins une attaque annoncée dans chaque phase.
- Le test qui gelait les douze niveaux historiques est remplacé par un test de bornes : chaque niveau a une entrée, et les multiplicateurs restent dans des limites raisonnables (PV de 0,5 à 12, attaque de 0,2 à 1,5). Mets à jour l'en-tête de `balance.ts`.
- Les neuf niveaux récents ne bougent pas. Le golden master est réenregistré dans un commit à part (R5). Le vrai réglage de toute la campagne viendra en S05.

### S03.4 — Un jeu qui se lance par un lien · tag avant la section : `s03-avant-mise-en-ligne`

- **Sans serveur.** `vite build` doit produire un site complet. L'onglet du Professeur n'apparaît que si `import.meta.env.VITE_AI_CODEX === '1'` ; par défaut il est absent et le jeu n'appelle jamais `/api`. `npm run dev` reste inchangé ; ajoute `npm run dev:static` (Vite seul).
- **Chemin de base.** Dans `vite.config.ts`, `base` vient de la variable d'environnement `BASE_PATH` (par défaut `/`). Vérifie que rien dans le code n'utilise de chemin absolu commençant par `/`.
- **Emplacement de sauvegarde.** Les clés de `localStorage` (`cubiquest_save_v2`, sa copie de secours, `cubiquest_settings_v1`) reçoivent le suffixe de `import.meta.env.VITE_SAVE_SLOT` quand il est défini. Les outils sans navigateur ne doivent pas en dépendre.
- **Script de mise en ligne** `npm run deploy:pages -- --target next|root` (`tools/deploy.mjs`, sans dépendance nouvelle, compatible Windows) : construit la branche courante (`next` : `BASE_PATH=/CUBIQUEST/next/` et `VITE_SAVE_SLOT=next` ; `root` : `BASE_PATH=/CUBIQUEST/`), puis met à jour la branche `gh-pages` par un `git worktree` temporaire : `next` ne remplace que le dossier `next/`, `root` remplace tout sauf `next/`. Ajoute `.nojekyll`. Message de commit : « pages: <cible> ← <branche>@<sha> ». L'arbre de travail n'est jamais modifié.
- Sur la version `next`, l'écran titre affiche en petit « version en test » et le nom de la branche.
- À la fin de cette session, déploie la branche vers `next` et vers `root` : il n'existe pas encore de version validée capable de tourner sans serveur.
- **N'active pas GitHub Pages et ne touche pas à la description du dépôt.** Si `gh` est disponible, vérifie seulement avec `gh api repos/zedkay37/CUBIQUEST/pages` si la publication est déjà active, et note-le. Sinon, rappelle dans le rapport les quatre clics de la partie 7.
- **README.** Remplace le texte d'origine par une page courte : ce qu'est le jeu (sans comparaison avec un autre), comment le lancer, les commandes utiles, le lien vers le plan. Renomme le paquet `react-example` en `cubiquest` dans `package.json`.

### Critères d'acceptation (mesurables)

- `npm run check` passe ; `npm run texts` est à zéro ; le test des mots interdits passe ; `npm run lexique` ne trouve plus aucun terme de la liste hors des dossiers exclus.
- Le golden master est identique après la section 1, et n'est réenregistré qu'une fois, après la section 3.
- Une sauvegarde v3 se charge en v4 avec la même escouade, les mêmes pierres, les mêmes runes (renommées) et la même progression (test).
- Simulation, 40 combats × 3 graines, en Auto : `meadow-1` ≥ 90 % ; les onze autres niveaux historiques entre 75 et 95 % ; boss ≥ 8 s et au moins une attaque annoncée par phase ; les neuf niveaux récents à ± 3 points de leurs valeurs d'avant.
- Le site construit avec `BASE_PATH=/CUBIQUEST/` se charge depuis un sous-dossier (serveur statique local), sans erreur dans la console et sans requête vers `/api`.
- La branche `gh-pages` est poussée et contient `index.html` et `next/index.html`.

### Hors périmètre

- Toute mécanique nouvelle, y compris les cubes d'élément (S04) et la nouvelle esquive (S05).
- Le changement de titre du jeu (S17) ; la suppression de la cuisine (S08) et des pierres (S09) : on ne fait ici que renommer.
- Les polices chargées depuis Google Fonts dans `index.html` : elles seront hébergées dans le dépôt en S16.

### Risques et parades

- Un renommage en masse casse des imports ou des clés de texte. → Un lot par famille de termes, `npm run check` entre chaque lot, un commit par lot.
- La migration oublie un identifiant renommé. → Sauvegarde v3 réaliste dans les tests ; les identifiants inconnus sont ignorés, jamais bloquants.
- Allonger les boss fait chuter les victoires par effet de seuil. → Valeurs placées au milieu d'un palier, comme pour les neuf niveaux récents ; 3 graines par essai.
- Le script de mise en ligne abîme le dépôt local. → Il travaille dans un `git worktree` temporaire et ne touche qu'à `gh-pages`. Essaie-le d'abord avec une option `--dry-run`.

### Contrôle du propriétaire (10 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Active GitHub Pages (partie 7), puis ouvre `https://zedkay37.github.io/CUBIQUEST/next/` : le jeu se lance-t-il ?
2. En local, ta sauvegarde est-elle intacte (escouade, pierres, progression) ?
3. Parcours les menus : reste-t-il un mot qui rappelle un autre jeu ?
4. Joue le premier niveau en Auto, puis à la main : se gagne-t-il, et le boss a-t-il le temps d'annoncer une attaque ?
5. Choisis un nom provisoire pour les créatures parmi ceux du rapport, ou garde « Cubin ».

— FIN DE LA FICHE S03 —

## FICHE S04 — Les cubes d'élément

- Version visée : v0.4 · Piliers : Diriger · Composer · Durée visée : 3 h · Priorité : Indispensable
- Départ : `s03-final` · Branche : `s04-cubes` · Tag final : `s04-final`

**But.** Remplacer les réactions élémentaires par la signature du jeu : un sort pose un cube, le cube mûrit, un autre élément le fait éclater, un troisième déclenche le Trio. Rendre le tout visible, et rendre au Déchaînement sa rareté.

**Pourquoi maintenant.** C'est le cœur du pilier « Diriger » et le pari central du plan. Tout le reste (boss, défis, runes, faveurs) s'appuie dessus : il faut le jouer le plus tôt possible.

**À lire avant de commencer :** sections 5.1 et 5.4 en entier, 5.12 ; partie 9 (cibles).

### S04.1 — Les règles, en fonctions pures · tag avant la section : `s04-avant-regles`

- Dans `balance.ts`, un bloc `CUBE_KIT` : `duration` 5 s · `ripenTime` 1,2 s · `weakBurstMult` 1,15 · `crackDuration` 3 s · `trioLock` 2 s · `trioDamageMult` 2 · `trioSplashRatio` 0,5 · `trioSplashRadius` 5 · `trioCooldownRefund` 1 s · `burstUltBonus` 8 · `trioUltBonus` 25.
- Dans `catalog.ts`, la table `BURSTS`, indexée par l'élément **qui fait éclater** :

| Élément | Identifiant | Nom affiché | × | Effet (implémentation existante à réutiliser) |
| --- | --- | --- | --- | --- |
| fire | `deflagration` | Déflagration | 1,45 | `aoe_burn` : 45 % des dégâts et un cube de Feu aux ennemis dans un rayon de 4,4 |
| water | `deferlante` | Déferlante | 1,65 | `burst` + `knockback` : recul de 8,2 (3,5 sur un boss) |
| grass | `seve` | Sève | 1,30 | nouveau, `team_heal` : chaque allié vivant récupère 6 % de ses PV max |
| electric | `arc` | Arc | 1,40 | `chain_stun` : 55 % des dégâts à 2 ennemis dans un rayon de 5,5, étourdis |
| rock | `rempart` | Rempart | 1,25 | `team_shield` : bouclier de 15 % des PV max, plafond 35 % |
| psychic | `echo` | Écho | 1,35 | `cd_spread` : recharge du lanceur −1,5 s, cube recopié dans un rayon de 4,8 |

- Dans `rules.ts` : `resolveCubeHit(state, incomingElement, opts)` renvoie l'un de `'cube'` (pose), `'refresh'` (même élément : la durée repart, l'âge est conservé), `'weak'` (cube pas mûr), `'burst'` (cube mûr, autre élément), `'trio'` (cible fêlée, troisième élément, et `opts.allowTrio`), `'locked'` (verrou après un Trio : dégâts normaux, pas de cube). `state` porte le cube (élément, âge), la Fêlure (les deux éléments, temps restant) et le verrou.
- `resolveElementalReaction`, `ELEMENTAL_REACTIONS`, `ReactionId` et la table en cascade sont supprimés.
- Tests : les 30 paires ordonnées d'éléments donnent le bon Éclat ; même élément = `refresh` ; avant 1,2 s = `weak` ; le Trio demande une Fêlure active et un troisième élément ; jamais de Trio si `allowTrio` est faux ; rien pendant le verrou.

### S04.2 — Le moteur · tag avant la section : `s04-avant-moteur`

- Sur un ennemi, le cube remplace les statuts multiples : un seul cube à la fois (`cube`, `crack`, `trioLockTimer` sur `CombatActor`). L'effet du cube est le statut actuel de son élément (brûlure, ralentissement, enracinement, étourdissement à la pose, armure fissurée, désorientation) et dure aussi longtemps que le cube. Les altérations que les boss infligent aux **alliés** ne changent pas et ne s'appellent pas « cubes ».
- Dans `applyDamageToActor` (`engine/damage.ts`), la branche des réactions devient l'application de `resolveCubeHit` pour tout coup de sort allié sur un ennemi. `allowTrio` vaut `controlMode !== 'auto'` : en Auto, un Éclat ne crée pas de Fêlure et il n'y a jamais de Trio.
- **Éclat** : dégâts × multiplicateur, effet de la table, cube consommé, Fêlure de 3 s, +8 de Déchaînement. **Éclat faible** : dégâts × 1,15, aucun effet, aucune Fêlure, cube consommé. **Trio** : dégâts × 2, onde de 50 % des dégâts aux ennemis dans un rayon de 5, +25 de Déchaînement, −1 s sur la recharge en cours des trois sorts, verrou de 2 s.
- **Un seul effet par lancer.** Un sort de zone applique la règle à chaque ennemi touché, mais il ne déclenche qu'un Éclat à effet (sur la cible la plus proche du centre) et qu'un Trio. Les autres cibles à cube mûr subissent le multiplicateur sans l'effet.
- **Sorts de soutien** (`style: 'buff'` : Égide de Fer, Brume Onirique) : en plus de leur effet actuel, ils appliquent la règle sans dégâts à la cible choisie par le ciblage intelligent, jusqu'à 9 unités. Un Éclat sans dégâts déclenche quand même son effet.
- **Ciblage intelligent.** Dans `executeAllySkill` (`engine/skills.ts`), `findNearestLiving` est remplacé par `pickSkillTarget` pour les sorts à cible (projectile, ruée, zone dont `range` dépasse 5,5). Parmi les ennemis à portée du sort : Trio possible, sinon Éclat plein possible, sinon cible sans cube ou à cube du même élément (le boss d'abord, puis le plus proche), et en dernier recours une cible dont le cube n'est pas mûr. Le classement est une fonction pure testée de `rules.ts`. Si aucun ennemi n'est à portée, comportement actuel.
- Ajoute au moteur une lecture sans effet de bord, `getSkillPreview(slot)`, qui renvoie ce que ferait le sort maintenant : `'trio'`, `'burst'`, `'ripening'` (un cube d'un autre élément mûrit), `'cube'`, ou `'far'` (sort de mêlée ou de zone qui ne toucherait personne). L'interface et l'outil de simulation s'en servent.
- Le Déchaînement compte comme un sort de l'élément du meneur sur chaque ennemi touché (c'est déjà le cas dans `triggerUltimate`) : il pose son cube, fait éclater les cubes mûrs, peut conclure un Trio.
- L'option d'outil `reactions` devient `cubes` (`false` : aucun cube, pour le golden « sans cubes »).

### S04.3 — Rendre le système visible · tag avant la section : `s04-avant-lisibilite`

- **Le cube.** Un cube de la couleur de l'élément flotte au-dessus de l'ennemi et tourne lentement. Il grossit de 0,25 à 0,5 unité pendant qu'il mûrit ; à maturité, un éclair blanc bref et un tintement (`soundFx.playCubeRipe`, au plus un toutes les 0,15 s). Il clignote pendant sa dernière seconde. Chaque face porte le symbole de l'élément (flamme, goutte, feuille, éclair, roc, œil), dessiné par code : la lecture ne dépend jamais de la couleur seule.
- Tous les cubes sont dessinés par un seul `InstancedMesh`, les mini-cubes de Fêlure par un second. Aucun objet créé par ennemi.
- **La Fêlure.** Deux mini-cubes (0,22) aux couleurs des deux éléments tournent autour de l'ennemi, avec un liseré clair sur sa silhouette, pendant 3 s.
- **L'Éclat.** Le cube se brise en 8 à 12 fragments (pool de particules existant), texte flottant « ÉCLAT · Rempart », onde de la couleur de l'élément, son d'Éclat avec une note propre à chaque élément. **Éclat faible** : petit « pop », texte gris « Trop tôt ! ».
- **Le Trio.** Arrêt sur image de 0,09 s, puis ralenti à 0,35× pendant 0,45 s (jamais plus d'un ralenti toutes les 2 s), onde dorée au sol, texte « TRIO ! », accord de trois notes, secousse moyenne. Le ralenti et la secousse respectent le réglage `screenShake`.
- **Les cartes de compagnon.** D'après `getSkillPreview` : normale ; trois points gris quand un cube mûrit (« … ») ; liseré bleu et « ÉCLAT » ; liseré or qui pulse et « TRIO » ; grisée avec « trop loin ». Les touches 1, 2 et 3 restent affichées.
- **Le compteur.** « ×N COMBO » disparaît de l'écran, de `ExpeditionHudSnapshot`, de `ExpeditionOutcome` et de `PlayerStats`. À la place, en haut et discret : « Éclats N · Trios N ». L'écran de fin affiche Éclats, Trios, esquives parfaites et Déchaînements.
- **Première fois.** Une bulle d'une ligne au premier cube, au premier Éclat faible (« Attends que le cube s'allume »), au premier Éclat et au premier Trio. L'état est rangé dans la sauvegarde (`SAVE_VERSION` + 1). Le vrai apprentissage viendra en S07.
- Renomme selon le lexique dans tous les textes, quêtes et succès : « réactions » → « Éclats », statuts → « cubes ». La statistique `reactionsTriggered` devient `burstsTriggered` ; `maxCombo` est remplacée par `triosTriggered` (migration). Le libellé « Phase 3 — Surcharge » devient « Phase 3 — Dernier sursaut ».
- Ajoute à la liste des mots interdits : `évaporation`, `électrocution`, `cristallisation`, `surcharge`, `embrasement`, `trempé`, `vaporize`, `overload`, `crystallize`, `swirl`, `combo`.

### S04.4 — Le Déchaînement · tag avant la section : `s04-avant-dechainement`

- **Charge** (`balance.ts`) : coup de base +0,6 (au lieu de 2,8) ; coup de sort +2,5 (au lieu de 6,5) ; Éclat +8 ; Éclat faible +2 ; Trio +25 ; sort de soutien +3 (au lieu de 8) ; esquive parfaite : inchangée dans cette session. Aucune charge pendant les 2 s qui suivent un Déchaînement.
- **Effet selon l'élément du meneur** (le premier compagnon vivant, dans l'ordre de l'escouade). Tous gardent l'invulnérabilité de 0,9 s et des dégâts de base égaux à l'attaque cumulée × 1,35. Le soin de 22 % est supprimé.

| Meneur | Mot sur le bouton | Effet |
| --- | --- | --- |
| Feu | Explosion | Dégâts de base × 1,3 sur tous les ennemis |
| Eau | Triple coup | Trois coups de base, espacés de 0,15 s, sur l'ennemi qui a le plus de PV |
| Plante | Soin | Dégâts de base sur tous, et chaque allié vivant récupère 30 % de ses PV max |
| Électrik | Étourdissement | Dégâts de base sur tous, étourdis 2 s (1 s pour un boss) |
| Roche | Bouclier | Dégâts de base sur tous, et bouclier de 35 % des PV max pour chaque allié |
| Psy | Recharges | Dégâts de base sur tous, et les trois sorts sont prêts |

- Le bouton du Déchaînement prend la couleur et le symbole de l'élément du meneur, avec son mot. L'écran d'équipe marque « Meneur » sur le premier emplacement et rappelle l'effet.

### S04.5 — La mesure et le réglage · tag avant la section : `s04-avant-mesure`

- `tools/simFight.ts` gagne le profil `expert`, qui pilote le mode « Semi » par les commandes publiques et `getSkillPreview` : (1) un sort qui ferait un Trio part tout de suite ; (2) un sort qui ferait un Éclat plein part si un troisième élément est prêt dans moins de 2,5 s ; (3) si aucun cube n'est posé et que les deux autres sorts seront prêts dans moins de 2 s, il pose le cube avec le sort à la plus longue recharge ; (4) jamais d'Éclat faible volontaire, mais un sort prêt depuis plus de 2,5 s part quand même s'il ne gâche pas un cube qui mûrit ; (5) Déchaînement dès 100 %, sauf si un Trio est possible dans la seconde. Il esquive comme le profil `active`.
- `npm run sim` affiche par profil : Éclats, Éclats faibles et Trios par combat, Déchaînements par combat et par combat de boss.
- Le golden master enregistre quatre séries : Auto, Auto sans cubes, actif, expert.
- **Réglage.** L'arrivée des cubes change la puissance des escouades. Règle `CUBE_KIT`, les multiplicateurs de `BURSTS` puis `STAGE_TUNING` pour que, niveau par niveau, les victoires en Auto restent à ± 8 points de leur valeur d'avant session et la durée moyenne à ± 20 %.
- Si le profil `active` (qui appuie dès que possible) obtient plus de la moitié des Trios de l'expert, la maturation est trop courte : allonge `ripenTime` par pas de 0,1 s, sans dépasser 1,5 s.

### Critères d'acceptation (mesurables)

- Tous les tests de la section 1 passent, ainsi que : un seul effet par lancer de zone ; le ciblage intelligent (5 cas) ; aucun Trio en mode Auto.
- Simulation, 40 combats × 3 graines, escouades de référence à trois éléments : Éclats par combat, faibles compris, Auto ≥ 3 et actif ≥ 6 ; Trios par combat, Auto = 0 et expert ≥ 4.
- Déchaînements par combat de boss : Auto 0 à 1, actif 1 à 2, expert 1 à 3.
- Sur les neuf niveaux des biomes 5 à 7, l'expert gagne au moins 20 points de plus que l'Auto en moyenne. La cible de 25 points sur toute la campagne sera tenue en S05.
- Victoires en Auto de chaque niveau à ± 8 points d'avant session, durées à ± 20 %.
- Un seul `InstancedMesh` pour les cubes, un pour les mini-cubes ; aucune allocation par image dans la boucle (relecture du code).
- `npm run check`, `npm run texts` et le test des mots interdits (liste étendue) passent.

### Hors périmètre

- L'esquive, les attaques annoncées et les kits de boss (S05).
- Les traits de lignée et les runes nouvelles (S09) ; l'apprentissage guidé (S07).
- Toute nouvelle créature, tout nouveau sort.

### Risques et parades

- Dans la mêlée, on ne voit pas quel cube est mûr. → Taille qui change, éclair et tintement à maturité, cartes qui passent au bleu : trois signaux pour la même information.
- Les sorts de zone déclenchent cinq effets d'un coup et font exploser les chiffres. → Un seul Éclat à effet et un seul Trio par lancer.
- Le ralenti du Trio gêne quand les Trios s'enchaînent. → Un ralenti toutes les 2 s au plus, coupé avec le réglage de secousse.
- Le profil qui appuie sans regarder fait presque aussi bien que l'expert. → C'est le signal que la maturation est trop courte : règle de la section 5.
- Le ciblage intelligent fait changer de cible à contretemps. → Il ne joue qu'au moment du lancer et ne déplace personne ; les sorts de mêlée ne sont pas concernés.

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Joue « Clairière du Colosse » et « Lisière Givrée » à la main. Vois-tu les cubes, et vois-tu quand ils sont mûrs ?
2. Essaie de faire un Trio exprès : pose, attends le tintement, fais éclater, enchaîne. Y arrives-tu trois fois sur cinq ?
3. Appuie volontairement trop tôt : le « Trop tôt ! » se comprend-il ?
4. Change de meneur et lance un Déchaînement : l'effet change-t-il comme annoncé ?
5. Note ce qui est illisible. La vraie porte vient après S05, mais dis-le dès maintenant si l'attente du cube t'agace.

— FIN DE LA FICHE S04 —

## FICHE S05 — Lire et esquiver

- Version visée : v0.4 · Piliers : Diriger · Durée visée : 3 h · Priorité : Indispensable
- Départ : `s04-final` · Branche : `s05-esquive` · Tag final : `s05-final`

**But.** Faire de l'esquive un geste de précision, donner à toutes les attaques annoncées la même grammaire, faire de chaque boss de biome une leçon, puis régler les 21 niveaux sur les cibles du plan.

**Pourquoi maintenant.** Avec les cubes, le joueur a un geste offensif à réussir. Il lui faut le geste défensif qui va avec, et des combats assez longs et assez lisibles pour placer les deux.

**À lire avant de commencer :** sections 5.2, 5.3, 5.5 et 5.8 (cibles de difficulté).

### S05.1 — L'Esquive au timing · tag avant la section : `s05-avant-esquive`

- État actuel (`triggerDodge`, ex-`triggerScatter`) : recharge de 5 s ; l'esquive est « parfaite » dès qu'une annonce ennemie est active à l'appui ; invulnérabilité de 0,8 s dans ce cas, 0,55 s sinon ; déplacement de 0,42 s à l'opposé du centre des ennemis.
- Nouveau, dans `balance.ts` (`DODGE_KIT`) : `cooldown` 4 s · `invuln` 0,5 s dans tous les cas · `perfectWindow` 0,35 s · `perfectRefund` 0,5 (moitié de la recharge rendue) · `perfectUlt` 12.
- Chaque `GroundTelegraph` expose l'instant de son impact (aujourd'hui `duration − elapsed`). Ajoute au moteur `getNextHazardImpact()` : le délai avant le prochain impact ennemi qui toucherait au moins un allié là où il se trouve, ou `null`.
- **Esquive parfaite** : une attaque annoncée qui aurait touché un allié est annulée par l'invulnérabilité de l'esquive, et l'appui date de 0,35 s au plus. Elle se décide donc à l'impact, pas à l'appui, et une seule fois par appui. Récompense : +12 de Déchaînement, moitié de la recharge rendue, texte « PARFAIT ! », son dédié, ralenti de 0,2 s à 0,5×.
- Direction : celle du déplacement en cours si le joueur tient une touche de direction ; sinon comme aujourd'hui.
- Aucun mode de contrôle n'esquive à la place du joueur.
- Simulation : le profil `active` appuie 0,25 s avant l'impact, avec un écart-type de 0,12 s, et réagit à 85 % des attaques ; le profil `expert` appuie 0,20 s avant, écart-type 0,06 s, 97 %. Ils n'appuient que si un allié est dans la zone. Le résumé affiche esquives, esquives parfaites et attaques annoncées subies.
- Tests du moteur : appui 0,2 s avant l'impact = parfaite ; 0,45 s avant = esquivée, pas parfaite ; 0,8 s avant et resté dans la zone = touché.

### S05.2 — Une seule grammaire pour les annonces · tag avant la section : `s05-avant-annonces`

- Un module `engine/telegraphs.ts` dessine les cinq formes de la section 5.3. Chaque attaque existante déclare la sienne : 0 Frappe circulaire = disque ; 1 Double charge en croix = bandes ; 2 Pluie de météores = plusieurs disques ; 3 Anneau = couronne, et son Contrecoup = disque ; 4 Rafale en ligne = bande ; 5 Aspiration = spirale, puis disque.
- Rendu : un fond de la couleur unique `DANGER` (à ajouter à `styleGuide.ts`) à 35 % d'opacité, avec des hachures diagonales générées par code ; un remplissage plus opaque qui progresse du centre vers le bord (de l'origine vers le bout pour une bande) et atteint le bord à l'impact ; un contour clair doublé d'un trait sombre, qui clignote pendant les 0,35 dernières secondes ; un « tic » identique pour toutes les attaques à 0,35 s de l'impact.
- Les couleurs propres aux kits (`telegraphColor`, `color` des thèmes de `balance.ts`) ne servent plus qu'aux particules et aux éclats, jamais à la zone de danger. Un test de style le vérifie.
- **Délais minimaux** entre l'annonce et l'impact : 0,9 s en phase 1, 0,75 s en phase 2, 0,65 s en phase 3 (test). À corriger aujourd'hui : la Frappe circulaire (0,82 / 0,72 / 0,62 s), les charges (0,78 / 0,68 s) et le premier impact de la Rafale (0,72 s).
- Jamais plus de trois zones de danger à la fois (cinq pour la pluie de météores) : le boss attend.
- La consigne écrite (« Collez-vous au boss ! ») ne s'affiche que les deux premières fois par type d'attaque (compteur dans la sauvegarde).
- La caméra recule, de 25 % au plus, quand une zone active sort du cadre, puis revient.
- Tant qu'une annonce est active, les particules décoratives du biome sont réduites de moitié et aucun texte flottant ne recouvre la zone.

### S05.3 — Des boss qui enseignent · tag avant la section : `s05-avant-boss`

- Chaque biome a son kit dans `BOSS_KITS`, et `cycle` peut désormais donner une rotation par phase. Trois nouveaux kits recombinent les six attaques existantes :

| Biome | Kit | Phase 1 | Phases 2 et 3 | Module |
| --- | --- | --- | --- | --- |
| Prairie | `meadow` | 0, délai porté à 1,1 s | 0, 2 (« pluie de pétales ») | — |
| Rive | `shore` | 4 (« lames d'eau ») | 4, 1 | — |
| Crête | `volcano` | 0, 2 | 0, 1, 2 | `shield` |
| Sanctuaire | `sanctuary` | 0, 4 | 2, 4, 1 | `satellites` |
| Toundra, Cime, Canyon | `frost`, `storm`, `amber` | inchangé | inchangé | — |

- **Module `shield`, la Carapace de magma.** Au début de chaque phase, le boss reçoit un bouclier égal à 18 % de ses PV max. Les dégâts d'un coup qui déclenche un Éclat ou un Trio comptent triple contre ce bouclier. Tant qu'il tient, le boss attaque 20 % plus vite. Visuel : des plaques autour du boss, qui se fendent ; une barre de bouclier au-dessus de la barre de PV.
- **Module `satellites`.** En phases 2 et 3, deux gardiens apparaissent (6 % des PV max du boss chacun). Tant qu'un gardien est debout, le boss subit moitié moins de dégâts ; un lien lumineux les relie à lui.
- Les deux modules sont génériques et réglés dans `balance.ts`. Aucun cas particulier par espèce dans le moteur.
- **Mini-boss.** Au niveau 1 d'un biome, le boss n'utilise que la première attaque de la phase 1 du kit ; au niveau 2, les deux premières attaques ; ni module, ni troisième phase.
- **Changement de phase** : le boss est invulnérable 0,8 s, les zones actives sont annulées, aucune attaque pendant 1 s, le nom de la phase s'affiche.

### S05.4 — Le grand réglage · tag avant la section : `s05-avant-reglage`

- Les escouades de référence (`previewConfigs.ts`) restent le repère. Chacune doit aligner trois éléments et trois lignées différents : aujourd'hui celle de `tundra-3` contient Ramurgel et Auroramure, deux formes de la même lignée. Corrige-la.
- Règle les 21 niveaux sur le tableau de la section 5.8 (Auto, actif, expert, durées), par `STAGE_TUNING` et les kits uniquement : 40 combats × 3 graines par essai.
- Pour chaque boss : chaque phase dure au moins 10 s et contient au moins deux attaques annoncées. Avec 4 niveaux d'avance, l'Auto repasse au-dessus de 85 %.
- Écris `docs/sim/05-reglage.md` : pour chaque niveau et chaque profil, la valeur avant et après. Réenregistre le golden dans un commit à part.

### Critères d'acceptation (mesurables)

- Les 21 niveaux respectent le tableau de la section 5.8 à ± 5 points ; les écarts restants sont listés dans le rapport, avec leur raison.
- L'expert gagne au moins 25 points de plus que l'Auto en moyenne sur les biomes 3 à 7.
- Chaque phase de boss : au moins 10 s et deux attaques annoncées (colonnes de phase de `npm run sim`).
- Aucun délai d'annonce sous le minimum de sa phase ; toutes les zones de danger utilisent `DANGER` (tests).
- Les trois tests de l'esquive passent. Esquives parfaites par combat de boss : actif ≥ 1, expert ≥ 2.
- Le boss de la Crête perd son bouclier au moins deux fois plus vite face au profil expert que face au profil Auto (simulation).
- `npm run check`, `npm run texts` et le test des mots interdits passent.

### Hors périmètre

- Les étoiles, les défis de niveau et l'XP (S06).
- Toute nouvelle attaque de boss : on recombine les six qui existent.
- Les particularités d'arène (S13).

### Risques et parades

- La fenêtre de 0,35 s est trop dure ou trop facile pour un humain. → Une seule constante, `perfectWindow`, à régler après la porte. La simulation ne tranche pas cette question.
- Les hachures se lisent mal sur les sols clairs de la Toundra. → Contour clair doublé d'un trait sombre ; capture de contrôle dans chaque biome.
- Sans esquive, l'Auto s'effondre dans les derniers biomes. → C'est voulu, dans les limites du tableau 5.8 ; avec 4 niveaux d'avance il doit repasser 85 %.
- Les gardiens du Sanctuaire allongent trop le combat. → Leurs PV sont un seul réglage ; cible de durée du tableau 5.8.

### PORTE 1 · Le combat est-il amusant ? (à recopier à la fin du rapport, section « À juger par un humain »)

1. Joue les trois niveaux de la Prairie sans Auto. As-tu compris cube, Éclat et Trio sans lire d'explication ?
2. Réussis-tu un Trio exprès, trois fois sur cinq ?
3. Rate volontairement une esquive, puis réussis-en une parfaite : la différence se sent-elle (son, texte, ralenti) ?
4. Bats le boss de la Crête, puis celui du Sanctuaire. As-tu compris seul ce qu'il fallait faire ?
5. Joue un niveau de la Toundra en Auto, puis à la main. Est-ce plus efficace à la main ? Est-ce plus amusant ?
6. Y a-t-il un moment où tu ne comprends pas ce qui se passe à l'écran ?
7. **Verdict.** As-tu envie de refaire un Trio ? Si oui, on avance. Si non, la session suivante est une session d'ajustement sur ce seul sujet (durée de maturation, retours visuels, ciblage), et le plan B est décrit en partie 10.

— FIN DE LA FICHE S05 —

## FICHE S06 — Les étoiles et le parcours

- Version visée : v0.5 · Piliers : Revenir · Durée visée : 3 h · Priorité : Indispensable
- Départ : `s05-final` · Branche : `s06-etoiles` · Tag final : `s06-final`

**But.** Donner à chaque niveau trois étoiles qui restent, dont un défi qui fait pratiquer un geste ; supprimer la répétition forcée en recalibrant l'XP ; rendre l'écran de fin utile, après une victoire comme après une défaite.

**Pourquoi maintenant.** Le combat a maintenant de la profondeur : il faut une raison de rejouer un niveau qui ne soit pas « il me manque de l'XP ».

**À lire avant de commencer :** sections 5.7 a) et 5.8 ; partie 4 (objectifs emboîtés, « presque réussi », friction nulle).

### S06.1 — Trois étoiles par niveau · tag avant la section : `s06-avant-etoiles`

- `SaveState.stageStars` : pour chaque niveau, `win`, `noKo` et `challenge`. `SAVE_VERSION` + 1 ; les niveaux déjà terminés reçoivent `win`.
- `computeVictoryStars` (purement décoratif aujourd'hui) est remplacée par `computeStageStars(résultat, niveau)`, pure et testée. Les étoiles s'additionnent d'une partie à l'autre.
- `STAGE_CHALLENGES` dans `catalog.ts`, textes dans `fr.ts`. Types génériques : `bursts ≥ n`, `trios ≥ n`, `perfectDodges ≥ n`, `duration ≤ s`, `noTelegraphHit`, `noUltimate`, et leurs combinaisons.

| Biome | Niveau 1 | Niveau 2 | Niveau 3 (boss) |
| --- | --- | --- | --- |
| Prairie | 2 Éclats | 1 esquive parfaite | 1 Trio |
| Rive | Moins de 50 s | 3 esquives parfaites | Aucune attaque annoncée subie |
| Crête | 5 Éclats | 2 Trios | 3 Trios |
| Sanctuaire | Moins de 60 s | Aucune attaque annoncée subie | 4 Trios |
| Toundra | 4 esquives parfaites | Moins de 70 s | Aucune attaque annoncée subie |
| Cime | 6 Éclats | 4 Trios | Sans Déchaînement |
| Canyon | Moins de 75 s | 5 esquives parfaites | Aucune attaque subie et 3 Trios |

- Calibrage, sur 40 combats × 3 graines : parmi ses victoires, l'expert réussit le défi au moins 6 fois sur 10 et le profil actif entre 15 et 40 fois sur 100. Sinon ajuste le seuil, pas le type. Les durées du tableau sont des points de départ : prends 80 % de la durée médiane du profil actif.
- Le défi s'affiche sur la carte du niveau avant le combat, et pendant le combat sur une ligne discrète, cochée quand il est acquis, barrée quand il est perdu.

### S06.2 — L'écran de fin et la carte · tag avant la section : `s06-avant-ecran-de-fin`

- **Victoire.** Les trois étoiles s'allument une à une (celles déjà acquises sont pleines et grisées) ; l'XP de chaque compagnon avec une barre animée ; Éclats, Trios, esquives parfaites, durée. Bouton principal : « Suivant » (le niveau suivant s'il est ouvert, sinon la carte). Boutons secondaires : « Rejouer », « Camp ».
- **Défaite.** Ce qui a manqué, en chiffres : « Boss à 12 % » ou la vague atteinte ; l'état du défi ; un conseil choisi par règle dans une table de huit (aucune esquive réussie ; aucun Éclat ; Éclats faibles nombreux ; escouade sous le niveau des ennemis ; élément faible contre le boss ; un compagnon tombé tôt ; Déchaînement jamais lancé ; combat très long). Bouton principal : « Réessayer ».
- « Réessayer » et « Rejouer » relancent le combat sans repasser par le camp. Mesure le délai entre le clic et la première image du combat et affiche-le en `?debug=1`.
- **Carte.** Les étoiles sous chaque niveau, le total par biome (sur 9) et le total général (sur 63).

### S06.3 — Moins de répétition · tag avant la section : `s06-avant-xp`

- Constat calculé sur les données du code : gagner une fois chacun des 17 premiers niveaux donne 19 105 XP par compagnon, soit le niveau 21, alors que le 18e niveau oppose des ennemis de niveau 47 à 50. Chaque niveau rapporte 6 à 16 fois trop peu.
- Nouvelles récompenses `xpReward` (valeur actuelle → nouvelle valeur) :

| Biome | Niveau 1 | Niveau 2 | Niveau 3 |
| --- | --- | --- | --- |
| Prairie | 95 → **270** | 140 → **430** | 210 → **560** |
| Rive | 270 → **760** | 340 → **940** | 420 → **1 180** |
| Crête | 510 → **1 550** | 620 → **1 950** | 760 → **2 550** |
| Sanctuaire | 920 → **3 400** | 1 120 → **4 800** | 1 500 → **5 800** |
| Toundra | 1 750 → **6 200** | 2 000 → **6 500** | 2 400 → **6 700** |
| Cime | 2 800 → **6 900** | 3 250 → **7 100** | 3 900 → **7 300** |
| Canyon | 4 600 → **7 500** | 5 400 → **7 700** | 6 300 → **7 900** |

- Dans `balance.ts` : `firstClearXpMult` 2,5 (première victoire sur un niveau) ; `benchXpShare` 0,6 (les compagnons hors escouade reçoivent 60 % de l'XP de base). L'écran de fin affiche « Première victoire × 2,5 » et « +60 % au camp ». `xpForNextLevel`, le plafond de 50 et les niveaux d'évolution ne changent pas.
- Vérification par le calcul avec ce tableau : en jouant chaque niveau deux fois, on arrive à chaque niveau à un niveau près de son escouade de référence ; en ne rejouant rien, avec 1 à 5 niveaux de retard.
- **Outil `npm run journey`** (`tools/journey.ts`) : il joue la campagne dans l'ordre avec le vrai moteur et un profil (`--profile active` par défaut), en partant d'une sauvegarde neuve. Règles du joueur simulé : il joue le niveau suivant ; après deux défaites de suite, il rejoue le niveau précédent, puis réessaie. Sorties par niveau : parties jouées, niveau de l'escouade à l'arrivée, niveau des ennemis, évolutions, temps de jeu estimé cumulé. Résumé : parties par niveau (moyenne, maximum), temps total.
- Cibles : 2,2 parties par niveau au plus en moyenne, jamais plus de 4 sur un niveau ; première évolution avant 8 minutes de jeu estimé. Si une cible manque, ajuste dans cet ordre : `firstClearXpMult`, puis le tableau d'XP. Archive la sortie dans `docs/sim/06-parcours.md`.

### S06.4 — Les paliers d'étoiles et les niveaux Défi · tag avant la section : `s06-avant-defis`

- Paliers d'étoiles : 12, 24, 36, 48 et 63. Récompenses, chacune donnée une fois : un exemplaire de la Rune de Précision, de Vigueur, de Partage, de Cadence ; à 63, un titre et un cadre doré. La carte montre le prochain palier.
- Sept **niveaux Défi**, un par biome, ouverts quand le biome compte 6 étoiles sur 9 : même arène et même boss que le niveau 3, ennemis 3 niveaux plus haut, PV et attaque × 1,35, et une règle spéciale. Un Défi réussi donne un sceau (7 en tout), sans étoile.
- Les règles spéciales vivent dans une table générique `MUTATORS` (`balance.ts`), qui resservira dans la Faille : Prairie « Meute » (+50 % d'ennemis, −30 % de PV chacun) ; Rive « Ennemis pressés » (cadence +25 %) ; Crête « Carapaces » (chaque ennemi commence avec un petit bouclier du module `shield`) ; Sanctuaire « Cubes fragiles » (les cubes durent 3 s) ; Toundra « Vent contraire » (l'esquive va moitié moins loin) ; Cime « Tempête » (une bande de foudre annoncée toutes les 8 s) ; Canyon « Colosse » (boss +40 % de PV, et un ennemi d'élite par vague).
- Règle les Défi sur le tableau 5.8 : Auto 20 % au plus, actif 45 à 65 %, expert 85 % au moins.

### Critères d'acceptation (mesurables)

- La migration est testée ; les étoiles persistent ; le tableau des 21 défis calibrés figure dans le rapport, avec le taux de réussite de l'actif et de l'expert.
- `npm run journey -- --profile active` : 2,2 parties par niveau au plus en moyenne, 4 au plus sur un niveau ; première évolution avant 8 minutes estimées.
- Délai mesuré entre « Réessayer » et le combat : moins de 2 s.
- Les sept niveaux Défi respectent le tableau 5.8 à ± 5 points.
- Après une victoire, l'écran de fin anime au moins deux barres (XP et étoiles).
- Le tableau 5.8 reste respecté pour les 21 niveaux : le changement d'XP ne modifie pas les escouades de référence.

### Hors périmètre

- La Confiance et le recrutement (S08) ; les runes comme savoirs et non comme objets (S09).
- Le choix du trio de départ et l'apprentissage guidé (S07).

### Risques et parades

- Avec plus d'XP, le joueur prend de l'avance et la campagne devient trop facile. → La simulation de parcours compare le niveau à l'arrivée et le niveau des ennemis ; cible : jamais plus de 2 niveaux d'avance.
- Des défis impossibles pour certaines escouades (pas de Trio à deux éléments). → Le défi affiche sa condition avant le combat ; l'écran d'équipe signale « pas de Trio possible ».
- L'outil de parcours est lent. → Mode `--brief`, 1 graine pour explorer, 3 graines pour la mesure finale.

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Rejoue trois niveaux pour leurs étoiles. As-tu envie d'aller chercher la troisième ?
2. Perds exprès un combat : l'écran de défaite te dit-il quoi changer ? As-tu envie de relancer ?
3. As-tu eu besoin de rejouer un niveau uniquement pour l'XP ?
4. Essaie un niveau Défi : est-il dur comme il faut ?

— FIN DE LA FICHE S06 —

## FICHE S07 — Les dix premières minutes

- Version visée : v0.5 · Piliers : Diriger · Revenir · Durée visée : 2 h 30 · Priorité : Indispensable
- Départ : `s06-final` · Branche : `s07-premiers-pas` · Tag final : `s07-final`

**But.** Qu'un joueur qui n'a jamais vu le jeu réussisse, sans rien lire de long, un Éclat, une esquive parfaite et un Trio avant la fin du premier biome. Et qu'on dispose d'un journal de test pour le vérifier sur de vrais joueurs.

**Pourquoi maintenant.** La porte 2 fait jouer des personnes extérieures. Le début doit être prêt, et il faut pouvoir mesurer ce qu'elles font.

**À lire avant de commencer :** section 5.8 (« Les dix premières minutes »), sections 5.1 à 5.4.

### S07.1 — Le trio de départ · tag avant la section : `s07-avant-trio-de-depart`

- État actuel : `StarterModal.tsx` fait choisir un compagnon parmi trois ; `createInitialSaveState` lui ajoute d'office deux équipiers de niveau 3 et un Cailloc en réserve.
- Nouveau : l'écran propose **deux trios**. Chaque carte montre les trois compagnons animés, leurs éléments, et leurs trois Éclats en une ligne chacun.

| Trio | Compagnons | Éclats disponibles |
| --- | --- | --- |
| **Braise** | Pyrocube Feu · Voltik Électrik · Cailloc Roche | Déflagration · Arc · Rempart |
| **Marée** | Aquabloc Eau · Bourgéon Plante · Psycube Psy | Déferlante · Sève · Écho |

- Les trois compagnons commencent au niveau 4. Plus de quatrième compagnon en réserve. Le reste de l'inventaire de départ ne change pas. Les sauvegardes existantes ne sont pas touchées.
- Équité : `npm run sim` sur les trois niveaux de la Prairie avec chacun des deux trios. Les cibles de la section 5.8 sont tenues par les deux, à 5 points d'écart au plus. Sinon ajuste les vagues de la Prairie, pas les créatures.

### S07.2 — Apprendre en jouant · tag avant la section : `s07-avant-lecons`

- Un système de leçons (`engine/lessons.ts`, état `lessonsDone` dans la sauvegarde). Une leçon : un déclencheur, un ralenti, une touche qui s'allume, une phrase de 60 caractères au plus, une condition de réussite. Jamais de fenêtre qui bloque, jamais deux phrases à la fois.

| Où | Déclencheur | Phrase | Réussite |
| --- | --- | --- | --- |
| Niveau 1, vague 1 | Premier ennemi à portée | « 1 : ton compagnon lance son sort. » | Un cube est posé |
| Niveau 1, vague 1 | Le cube est mûr | « Le cube s'allume : 2 le fait éclater. » | Un Éclat plein |
| Niveau 1, mini-boss | Le contour d'une annonce clignote | « Espace : esquive maintenant. » | Une esquive parfaite |
| Niveau 1, fin | Écran de victoire | Une phrase par étoile | — |
| Niveau 2, vague 1 | Un ennemi est fêlé | « Un troisième élément : TRIO ! » | Un Trio |
| Niveau 2, vague 3 | Jauge pleine (portée à 100 % pour la leçon) | « R : Déchaînement. » | Un Déchaînement |
| Niveau 3 | Aucun texte | Le boss à trois phases est l'examen | — |

- Pendant la leçon de l'esquive, le temps passe à 0,3× dès que le contour clignote. Si elle est ratée, l'attaque ne fait que 30 % de ses dégâts cette fois-là et la leçon revient à l'annonce suivante.
- Un joueur qui réussit le geste avant la leçon ne la voit pas : elle est marquée faite.
- Le mode Auto est grisé jusqu'à la victoire sur le premier boss (« Disponible après le premier boss »).
- Les leçons peuvent être revues depuis les options.

### S07.3 — Le premier quart d'heure, ouvert pas à pas · tag avant la section : `s07-avant-deblocages`

- Nouvelle partie : écran titre, choix du trio, puis le niveau 1 directement, sans passer par le camp.
- Table `UNLOCKS` dans `catalog.ts`, lue par une fonction pure testée :

| Après | Ce qui s'ouvre |
| --- | --- |
| Niveau 1 | Le camp, avec un seul bouton : « Partir » |
| Niveau 2 | Rien de plus : c'est la première évolution, au niveau 8, qui occupe ce moment |
| Niveau 3 (premier boss) | Un compagnon rejoint le camp : Bourgéon pour le trio Braise, Voltik pour le trio Marée. L'écran d'équipe s'ouvre, puis le deuxième biome et le mode Auto |
| Premier niveau de la Rive | Le Codex ; la cuisine (elle sera remplacée en S08) |
| Boss de la Rive | Les Galets et leur grille (ils disparaîtront en S09) |

- L'arrivée du compagnon est une courte scène de 4 s au camp, que l'on peut passer : il entre, rejoint le centre, saute, son nom et son élément s'affichent. Il arrive au niveau moyen de l'escouade moins 2.
- Chaque ouverture pose une pastille « Nouveau » sur le bouton concerné, avec une phrase. Une sauvegarde existante a déjà tout ouvert.
- `npm run journey` gagne une colonne « nouveautés » (mécanique, compagnon, évolution, biome, rune, palier d'étoiles) et signale toute série de plus de 4 niveaux sans nouveauté.

### S07.4 — Le journal de test · tag avant la section : `s07-avant-journal`

- Un journal local, jamais envoyé nulle part. Une ligne par combat : niveau, escouade (espèces et niveaux), mode de contrôle, résultat, durée, Éclats, Éclats faibles, Trios, esquives et esquives parfaites, attaques annoncées subies, Déchaînements, PV restants du boss en cas de défaite, relance après une défaite (oui ou non), leçons vues et réussies. Rangé dans `localStorage`, 500 lignes au plus.
- Dans les options : « Exporter mon journal » (un fichier `.json`) et « Effacer ». Une phrase dit ce que le fichier contient et qu'il ne quitte pas l'appareil tant qu'on ne l'envoie pas soi-même.
- `npm run journal -- fichier.json` (`tools/journal.ts`) : victoires et relances par niveau, gestes par combat, niveaux où ça bloque, leçons ratées.

### Critères d'acceptation (mesurables)

- Nouvelle partie : de l'écran titre au premier coup porté, 3 clics et 25 s au plus.
- Test du moteur, joueur scripté : les six leçons se déclenchent dans l'ordre et se valident ; un joueur qui réussit les gestes en avance n'en voit aucune.
- Les deux trios tiennent les cibles de la Prairie, à 5 points d'écart au plus.
- `npm run journey` avec chaque trio : première évolution à la fin du niveau 2 ; premier compagnon après le niveau 3 ; jamais plus de 4 niveaux sans nouveauté.
- Le journal s'exporte et `npm run journal` le résume (test).
- Aucune phrase de leçon ne dépasse 60 caractères ; `npm run texts` est à zéro.

### Hors périmètre

- La Confiance : le premier compagnon est ici un déblocage écrit à l'avance ; S08 le remplacera par la règle générale.
- Toute cinématique d'introduction, toute histoire écrite.

### Risques et parades

- Le ralenti des leçons casse le rythme des joueurs à l'aise. → Une leçon ne s'affiche pas si le geste a déjà été réussi.
- Un des deux trios est nettement plus facile au début. → Mesure des deux trios sur la Prairie ; ajustement par les vagues.
- Le journal grossit ou gêne. → 500 lignes au plus, écriture en fin de combat seulement.

### PORTE 2 · Un nouveau joueur comprend-il seul ? (à recopier à la fin du rapport, section « À juger par un humain »)

1. Efface ta sauvegarde (ou ouvre une fenêtre de navigation privée) et joue les quinze premières minutes. Note chaque hésitation.
2. Fais jouer deux ou trois personnes qui ne connaissent pas le jeu, **sans rien leur dire**. Réussissent-elles un Éclat ? Une esquive parfaite ? Un Trio avant la fin de la Prairie ?
3. Où regardent-elles ? Où cliquent-elles par erreur ?
4. Après une défaite, relancent-elles d'elles-mêmes ?
5. Demande-leur de décrire le jeu en une phrase. Si elle ressemble à la vision, c'est gagné.
6. Exporte leur journal et garde les fichiers dans `docs/journaux/` : ils serviront au réglage final (S18).

— FIN DE LA FICHE S07 —

## FICHE S08 — Confiance et Lien

- Version visée : v0.6 · Piliers : Revenir · Composer · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s07-final` · Branche : `s08-confiance` · Tag final : `s08-final`
- Décision du propriétaire liée : D1 et D4

**But.** Remplacer la cuisine par un recrutement sans hasard : chaque combat rapproche d'un compagnon précis, que l'on voit arriver au camp. Remplacer le Codex à base d'IA par un Carnet qui fonctionne sans connexion.

**Pourquoi maintenant.** C'est le système le plus directement repris d'un autre jeu, et le plus aléatoire. C'est aussi lui qui donne un but à moins de dix minutes : « encore deux combats et Givrelin me rejoint ».

**À lire avant de commencer :** sections 5.7 b), 5.10 et 5.12 ; partie 11 (D1 et D4). Si le prompt de lancement dit que D1 ou D4 est refusée, applique la variante de repli.

### S08.1 — Les règles · tag avant la section : `s08-avant-regles`

- `balance.ts`, bloc `TRUST` : `perWildDefeat` 12 · `perBossDefeat` 30 · `firstEncounter` 20 · `recruitAt` 100 · `perWinInSquad` 10 · `bondThresholds` 150, 250, 400, 600, 900 · `bondStatBonus` 0,04.
- `lineageOf(speciesId)` dans `rules.ts` : la racine de la chaîne d'évolution. Test : les 38 espèces se rangent en 14 lignées (`pyrocube`, `braizard`, `aquabloc`, `crabloc`, `givrelin`, `bourgeon`, `mycelin`, `voltik`, `crepitil`, `cailloc`, `chevrok`, `givrock`, `psycube`, `nimbulle`).
- `SaveState.trust` : un nombre par lignée. `applyTrustGains(sauvegarde, résultat du combat)`, pure et testée : avant le recrutement, chaque ennemi vaincu de la lignée (toutes ses formes) donne 12, son boss 30, la première rencontre 20, y compris en cas de défaite pour les ennemis effectivement vaincus. Après le recrutement, seule une victoire avec le compagnon dans l'escouade fait monter le total, de 10.
- À 100, la lignée rejoint le camp : un individu unique, sous sa forme de base, au niveau moyen de l'escouade moins 2 (au moins 1). S'il a déjà le niveau d'évoluer, l'évolution est proposée au camp comme aujourd'hui.
- `bondLevel(trust)` donne le Lien, de 0 à 5 étoiles. `computeCreatureStats` multiplie PV et attaque par 1 + 0,04 × Lien.
- Invariant testé : `roster` ne contient jamais deux individus de la même lignée.

### S08.2 — La migration · tag avant la section : `s08-avant-migration`

- `SAVE_VERSION` + 1. Pour chaque lignée, garde l'individu de plus haut niveau (à égalité : celui de l'escouade, puis la forme la plus évoluée). Chaque doublon ajoute 60 à la Confiance de sa lignée ; ses pierres et ses runes retournent au sac.
- `potBonus` devient `legacyBonus` : il est conservé tel quel dans les statistiques de l'individu gardé, et n'augmentera plus jamais.
- Lignées déjà possédées : Confiance d'au moins 100. Un individu qui porte deux runes reçoit au moins 150 (il gardera ses deux emplacements en S09).
- Ingrédients : commun 2, rare 5, mystique 12 points de Confiance chacun, versés d'abord à la lignée non recrutée la plus avancée parmi celles déjà rencontrées, puis à la suivante ; s'il n'en reste aucune, aux lignées de l'escouade.
- Une cuisson en cours est terminée sur-le-champ et son résultat traité comme un recrutement ou un doublon.
- Trois sauvegardes de test : un début de partie ; un milieu de partie avec doublons, ingrédients et cuisson en cours ; une fin de partie avec les 38 formes.
- Au premier lancement après la migration, un écran unique « Ce qui a changé » : cinq lignes, et la liste de ce que le joueur a reçu.

### S08.3 — Le Carnet · tag avant la section : `s08-avant-carnet`

- Il remplace `CodexDrawer.tsx`. Quatre onglets.
- **Compagnons** : les 14 lignées. Pour chacune, les silhouettes de ses formes (grisées tant qu'elles n'ont pas été vues), la barre de Confiance ou les étoiles de Lien, « Où le trouver » (calculé à partir des vagues de `STAGES`, par exemple « Prairie 2 et 3, Crête 2 »), sa petite phrase.
- **Éléments** : la table des forces et faiblesses, les six Éclats et les six Déchaînements, une ligne chacun.
- **Boss** : les attaques annoncées déjà vues, avec leur forme et leur consigne.
- **Exploits** : les anciens succès.
- **Décision D4.** Supprime le Professeur : `server.ts`, les dépendances `@google/genai`, `express` et `dotenv`, `.env.example`, la capacité déclarée dans `metadata.json`, les types `CodexAnswer` et `CodexSource`. `npm run dev` lance Vite seul. Test : aucun `fetch(` dans `src/`.

### S08.4 — Le feu de camp · tag avant la section : `s08-avant-feu-de-camp`

- Au centre du camp, la marmite devient un feu de camp (`models/campProps.ts`, dans le respect de `STYLE.md`). Il garde le rôle de source de lumière la nuit. Les compagnons hors escouade continuent de se promener autour.
- **L'arrivée.** Au retour au camp après le combat où une Confiance a atteint 100, la scène de S07 se joue pour le nouveau compagnon : « Givrelin rejoint le camp ! ». Plusieurs arrivées se jouent l'une après l'autre.
- L'écran de fin de combat montre les barres de Confiance qui ont bougé, trois au plus, la plus proche de 100 d'abord : « Givrelin 72 → 96 / 100 ». Pour les compagnons de l'escouade, il montre le Lien.
- **Suppression de la cuisine** : `CookingDrawer.tsx`, les recettes, les ingrédients, les paliers de marmite, `resolveRecipe`, `startCookingPot`, `rollCreatureFromPot`, `collectCookedCreature`, `dropIngredients`, `setPotVisual`, `triggerCookBurstFx`, les statistiques `dishesCooked` et `frontierDishes`, les quêtes et succès de cuisine. Ils sont remplacés par des exploits de Confiance et de Lien (« Premier ami », « Camp complet », « Lien ★5 »).
- Ajoute à la liste des mots interdits : `marmite`, `chaudron`, `recette`, `ingrédient`, `cuisson`, `pot_`.

### S08.5 — Le rythme des arrivées · tag avant la section : `s08-avant-rythme`

- `npm run journey` suit la Confiance : à quel niveau chaque lignée rejoint le camp, et la plus longue série de niveaux sans arrivée ni évolution.
- Constat calculé sur les vagues actuelles, avec les valeurs de la section 1 et une victoire par niveau : le premier compagnon arrive à la fin du niveau 3 pour les deux trios ; Givrelin et Givrock au 14e niveau ; Crépitil et Nimbulle au 18e ; Chevrok au 20e. En revanche Mycélin (croisé aux niveaux 2, 3 et 8), Crabloc (4 et 10) et Braizard (7 et 11) plafonnent entre 44 et 56.
- Calendrier visé, à un niveau près, pour une partie jouée à deux parties par niveau :

| Première victoire au niveau | Compagnon qui rejoint le camp |
| --- | --- |
| 3 | Première lignée du trio non choisi (Bourgéon ou Voltik) |
| 4 à 5 | Mycélin |
| 5 à 7 | Deuxième lignée du trio non choisi |
| 6 à 7 | Crabloc |
| 8 à 9 | Braizard |
| 8 à 12 | Troisième lignée du trio non choisi |
| 13 à 14 · 14 à 15 | Givrelin · Givrock |
| 16 à 17 · 17 à 18 | Crépitil · Nimbulle |
| 19 à 20 | Chevrok |

- Moyens, dans cet ordre : les valeurs de `TRUST` ; puis la composition des vagues, en remplaçant un ennemi par un autre de même niveau pour qu'une lignée à recruter apparaisse dans au moins trois niveaux. Toute vague modifiée est remesurée (tableau 5.8).
- Le Lien ajoute de la puissance : mets dans les escouades de référence le Lien attendu à ce stade du parcours, et revérifie le tableau 5.8.

### Critères d'acceptation (mesurables)

- Tests : règles de Confiance, invariant d'unicité, trois migrations, `lineageOf`.
- `npm run journey` avec chaque trio : le calendrier de la section 5 est tenu à un niveau près ; 14 compagnons à la fin de la campagne ; jamais plus de 4 niveaux sans arrivée ni évolution ; toujours 2,2 parties par niveau au plus.
- Aucune requête réseau après le chargement de la page (hors polices) ; `npm run dev` fonctionne sans fichier `.env`.
- Le test des mots interdits passe avec la liste étendue ; `npm run texts` est à zéro.
- Le tableau 5.8 reste respecté à ± 5 points.

### Hors périmètre

- Les runes et les emplacements liés au Lien (S09).
- Le remodelage des créatures (S10).

### Risques et parades

- Une sauvegarde avancée perd des créatures auxquelles le joueur tenait. → On garde toujours l'individu le plus fort de chaque lignée ; l'écran « Ce qui a changé » dit ce qui a été converti.
- Le rythme dépend de vagues que personne n'a encore réglées pour ça. → Calendrier chiffré, outil de parcours, tolérance d'un niveau.
- Supprimer le serveur casse le lancement habituel du propriétaire. → `npm run dev` garde le même nom et lance Vite ; le dire en tête du rapport.

### Variante de repli, si le propriétaire a répondu non à D1 et D4

**Si D1 est refusée**, la cuisine reste, mais sans loterie : chaque recette affiche les espèces qu'elle peut attirer ; le tirage donne d'abord une espèce que le joueur n'a pas ; un doublon se convertit tout seul en bonus pour l'individu déjà possédé. Les sections 1, 2 et 5 sont remplacées par ce travail ; le Carnet (section 3, sans barres de Confiance) et la scène d'arrivée (section 4) se font quand même. **Si D4 est refusée**, le Professeur reste, comme cinquième onglet du Carnet, masqué quand aucune clé n'est configurée ; `server.ts` et ses dépendances restent.

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Charge ta sauvegarde : tout ce à quoi tu tenais est-il là ? L'écran « Ce qui a changé » est-il clair ?
2. Joue trois niveaux : vois-tu les barres de Confiance monter ? Sais-tu quel compagnon arrive bientôt ?
3. L'arrivée d'un compagnon au camp fait-elle plaisir ?
4. Ouvre le Carnet : trouves-tu en dix secondes où aller chercher un compagnon précis ?

— FIN DE LA FICHE S08 —

## FICHE S09 — Runes et traits

- Version visée : v0.6 · Piliers : Composer · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s08-final` · Branche : `s09-runes` · Tag final : `s09-final`
- Décision du propriétaire liée : D2

**But.** Supprimer la grille de pierres et son inventaire : la puissance vient du niveau et du Lien, et les choix viennent de quatorze runes et de quatorze traits de lignée.

**Pourquoi maintenant.** Le pilier « Composer » demande des choix qui changent la façon de jouer, pas un tri de 48 pierres. Et la grille de pierres est le dernier système repris d'un autre jeu.

**À lire avant de commencer :** sections 5.6 et 5.7 c) ; partie 11 (D2). Si le prompt de lancement dit que D2 est refusée, applique la variante de repli.

### S09.1 — Les statistiques sans pierres · tag avant la section : `s09-avant-statistiques`

- Avant de toucher au code, enregistre dans `docs/sim/09-stats-avant.md` les PV et l'attaque de chaque escouade de référence.
- Nouvelle formule dans `computeCreatureStats` : PV = PV de base + (niveau − 1) × 18 + `legacyBonus` + `statCurve(niveau)` ; attaque = attaque de base + (niveau − 1) × 15 + `legacyBonus` + `statCurve(niveau)` ; le tout × (1 + 0,04 × Lien) ; puis les runes Garde et Fougue.
- `statCurve` (`balance.ts`) est une interpolation linéaire entre des points repris du `bonus` des escouades de référence actuelles :

| Niveau | 1 | 4 | 7 | 10 | 12 | 15 | 17 | 19 | 22 | 24 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bonus | 20 | 33 | 59 | 91 | 124 | 156 | 195 | 241 | 286 | 338 |
| **Niveau** | **27** | **30** | **34** | **38** | **41** | **44** | **46** | **48** | **50** |  |
| Bonus | 403 | 468 | 572 | 684 | 900 | 1 100 | 1 400 | 1 700 | 2 000 |  |

- Dans `previewConfigs.ts`, `bonus` disparaît ; chaque configuration de référence reçoit un Lien et des runes attendus. Pour les trois niveaux du Canyon, joués au niveau 50 avec un `bonus` de 2 300 à 3 000 aujourd'hui : Lien ★3 et trois runes. Si cela ne suffit pas, baisse leurs multiplicateurs dans `STAGE_TUNING`.
- Les sous-statistiques des pierres (critique, soin par coup, vitesse, résistance) disparaissent avec elles ; le critique de base reste à 8 %.
- **Suppression** : `PowerStone`, `StoneSlot`, `stoneBoard`, `powerStones`, `POWER_STONE_BAG_LIMIT`, `createStoneBoardForRole`, `equipPowerStone`, `unequipPowerStone`, `canEquipStone`, `addPowerStoneToBag`, `generatePowerStone`, `stonePowerRange`, la pierre gagnée à chaque victoire, les récompenses de quête en pierres.
- **Migration** (`SAVE_VERSION` + 1) : pour chaque compagnon d'une sauvegarde existante, si PV ou attaque baissent de plus de 5 % par rapport à avant, la différence est ajoutée à son `legacyBonus`. Test sur les trois sauvegardes de S08.
- À l'écran, « Puissance conseillée » devient « Niveau conseillé » : le niveau de l'escouade de référence. `recommendedPower` est supprimé.

### S09.2 — Les quatorze runes · tag avant la section : `s09-avant-runes`

- `RuneKind` passe de 6 à 14 valeurs. Les effets sont paramétrés dans `balance.ts` et lus par `getMoveModifiers`, étendue. Tableau des effets : section 5.7 c). Précisions pour les nouvelles : Amorce divise par deux le temps de maturation de ses cubes ; Détonation ajoute 25 % à l'effet de ses Éclats (rayon, soin, bouclier, réduction de recharge) ; Rebond répète à moitié de puissance son premier Éclat de chaque vague ; Charge ajoute 50 % au Déchaînement donné par ses Éclats et ses Trios ; Riposte ajoute 50 % de dégâts à son prochain sort après une esquive parfaite ; Garde +18 % de PV ; Fougue +12 % d'attaque ; Réveil ramène le délai de relève de 11 s à 6,6 s.
- **Une rune est un savoir, pas un objet.** `runeBag` devient `unlockedRunes`. Une rune débloquée peut être portée par tous les compagnons à la fois, une fois chacun. Plus de sac, plus de doublons, plus de tirage à 55 % en fin de combat.
- `OwnedCreature.runes` : un emplacement au départ, un deuxième à Lien ★1, un troisième à Lien ★3.
- Sources, chacune donnée une seule fois et rappelée sur les runes encore verrouillées : première victoire sur le boss de la Prairie (Fougue), de la Rive (Garde), de la Crête (Détonation), du Sanctuaire (Ampleur), de la Toundra (Riposte), de la Cime (Amorce), du Canyon (Force) ; 12, 24, 36 et 48 étoiles (Précision, Vigueur, Partage, Cadence) ; 3 niveaux Défi réussis (Rebond) ; étages 10 et 15 de la Faille (Charge, Réveil, verrouillées jusqu'à S11).
- Migration : toute rune possédée en au moins un exemplaire est débloquée ; toute rune dont la source est déjà accomplie l'est aussi ; les runes équipées le restent dans la limite des emplacements.

### S09.3 — Les quatorze traits de lignée · tag avant la section : `s09-avant-traits`

- `LINEAGE_TRAITS` dans `catalog.ts` (lignée, nom, texte), valeurs dans `balance.ts`. Tableau : section 5.6.
- Les traits, les runes et plus tard les faveurs passent par les mêmes crochets génériques du moteur : `onCubeApplied`, `onBurst`, `onTrio`, `onPerfectDodge`, `onWaveStart`, `onHitTaken`, et des modificateurs de statistiques. Aucun test sur l'espèce dans le moteur.
- Règle de réglage : pour chaque trait, une escouade de référence est simulée avec et sans lui (40 combats × 3 graines). L'écart de victoires doit se situer entre 1 et 8 points. Sinon ajuste la valeur du trait.
- Le trait s'affiche en une ligne sur la fiche du compagnon, dans l'écran d'équipe et dans le Carnet.

### S09.4 — L'écran d'équipe · tag avant la section : `s09-avant-ecran-equipe`

- Une seule page remplace `TeamDrawer.tsx` et la grille 3 × 3. À gauche, le trio : le premier emplacement porte « Meneur » et l'effet de son Déchaînement. Au centre, le compagnon choisi : modèle, niveau, PV, attaque, élément, rôle, trait, sort et l'Éclat qu'il déclenche. À droite, ses emplacements de rune et la liste des runes ; celles qui sont verrouillées disent où les gagner. En bas, la réserve, triée par élément.
- Une ligne résume le trio : « Feu · Électrik · Roche : Trio possible » ou « Deux éléments : pas de Trio », suivie des trois Éclats disponibles.
- Un seul bouton principal, « Partir ». Aucun chiffre qui ne serve pas à décider.

### S09.5 — Le réglage · tag avant la section : `s09-avant-reglage`

- Remesure toute la campagne et les niveaux Défi sur le tableau 5.8, avec des escouades de référence équipées des runes disponibles à ce stade. Réenregistre le golden dans un commit à part.
- Diversité : sur les escouades de référence, essaie chaque rune à tour de rôle. Aucune ne doit valoir plus de 10 points de victoires ni moins de 1 point en moyenne. Liste les écarts dans le rapport.
- `npm run journey` : le calendrier des arrivées et les 2,2 parties par niveau restent tenus.

### Critères d'acceptation (mesurables)

- PV et attaque de chaque escouade de référence à ± 5 % de leur valeur d'avant session, hors Canyon.
- Migration : aucun compagnon des trois sauvegardes de test ne perd plus de 5 % de PV ou d'attaque.
- Chaque rune a un test qui mesure son effet ; chaque trait déplace les victoires de 1 à 8 points.
- Le tableau 5.8 est respecté à ± 5 points, Canyon compris.
- Plus aucune occurrence de `powerStone`, `stoneBoard` ni « Galet » dans `src/` ; `npm run texts` est à zéro.
- L'écran d'équipe tient sur une page en 1280 × 720 et en 360 × 640 (captures).

### Hors périmètre

- Les faveurs de la Faille (S12), qui réutiliseront les crochets.
- Toute rune au-delà des quatorze.

### Risques et parades

- La courbe par niveau ne reproduit pas la puissance qu'apportaient les pierres. → Points repris des escouades de référence ; mesure avant et après ; tolérance de 5 %.
- Le Canyon devient infaisable sans pierres. → Lien et runes dans sa référence, puis baisse de ses multiplicateurs si nécessaire.
- Une rune écrase les autres. → Mesure de diversité de la section 5.
- Les traits rendent certaines lignées obligatoires. → Plafond de 8 points par trait.

### Variante de repli, si le propriétaire a répondu non à D2

**Si D2 est refusée**, les Galets restent, simplifiés : plus de sous-statistiques (un Galet, une valeur), un bouton « Équiper le meilleur », un recyclage automatique des Galets inférieurs. La section 1 se réduit à cela. Les huit nouvelles runes (section 2, sous forme d'objets comme aujourd'hui), les traits (section 3) et le réglage (section 5) se font quand même ; l'écran d'équipe garde un panneau « Galets ».

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Ta sauvegarde : tes compagnons sont-ils aussi forts qu'avant ?
2. Change deux runes et rejoue un niveau : sens-tu la différence ?
3. Lis trois traits : te donnent-ils envie d'essayer un autre trio ?
4. L'écran d'équipe se comprend-il en dix secondes ?

— FIN DE LA FICHE S09 —

## FICHE S10 — Des évolutions qui se voient

- Version visée : v0.6 · Piliers : Revenir · Durée visée : 2 h 30 · Priorité : Recommandé
- Départ : `s09-final` · Branche : `s10-evolutions` · Tag final : `s10-final`

**But.** Qu'une évolution se reconnaisse à la silhouette, sans lire le nom : chaque stade ajoute des formes, pas seulement une teinte.

**Pourquoi maintenant.** L'évolution est la récompense la plus attendue du jeu, et le recrutement donne maintenant envie de collectionner. Aujourd'hui plusieurs lignées déçoivent à l'écran.

**À lire avant de commencer :** section 5.11 ; `STYLE.md` en entier.

### S10.1 — Mesurer avant de modeler · tag avant la section : `s10-avant-mesure`

- Constat fait sur les captures du 22 novembre : chez Aquabloc, Bourgéon, Cailloc et Psycube, les trois stades ont la même silhouette et ne diffèrent que par la teinte ; Voltik et Sparkube sont identiques. Seule la lignée de Pyrocube change vraiment de forme. Les huit lignées plus récentes gardent toutes le même archétype d'un stade à l'autre : à mesurer.
- Outil `npm run silhouettes` : pour chaque espèce, il construit le modèle sans navigateur et relève le nombre de pièces, la boîte englobante, et une silhouette de face et de profil en 64 × 64 (projection des boîtes, hauteur normalisée). Pour chacun des 24 passages de stade, il calcule l'écart de pièces, l'écart de boîte englobante par axe et la part de pixels différents entre les deux silhouettes.
- Test `evolution-readability` : chaque passage de stade doit (a) ajouter au moins 3 pièces, (b) agrandir la boîte englobante d'au moins 12 % sur un axe, (c) changer au moins 18 % des pixels de la silhouette de face ou de profil, (d) déclarer au moins un attribut nouveau et nommé (crête, corne, aile, queue, plaque, anneau…). Note l'état de départ dans le rapport.

### S10.2 — Retravailler les lignées · tag avant la section : `s10-avant-lignees`

- Ordre : Aquabloc, Bourgéon, Cailloc, Psycube, Voltik, puis toutes les lignées qui échouent au test. Un commit par lignée.
- Directions, à interpréter : **Aquabloc** → Corallix (crête de corail, nageoires) → Abyssocube (carapace à plaques, lanterne, posture basse et large de tank). **Bourgéon** → Feuilloc (le bourgeon s'ouvre en couronne de feuilles, défenses plus longues) → Bourgéoliath (grande fleur ouverte, dos couvert de lianes, pattes massives). **Cailloc** → Granitox (épaulières de granit, double corne) → Magmadrake (veines lumineuses, crête dorsale, queue en masse). **Psycube** → Lunabloc (croissant flottant dans le dos, antennes longues) → Aetherion (anneau d'étoiles en orbite, traîne de fragments). **Voltik** → Sparkube (oreilles en éclair, queue en zigzag).
- Contraintes : `STYLE.md` (palette, proportions, yeux) ; une signature de la lignée conservée d'un stade à l'autre ; au plus 40 % de pièces en plus par créature (`npm run census`) ; animations existantes intactes ; le rayon de collision ne change pas, même si le modèle grandit.
- La scène d'évolution se termine par une seconde « avant, après », les deux formes côte à côte à la même échelle.

### S10.3 — Galerie et captures · tag avant la section : `s10-avant-galerie`

- `?gallery=1` gagne une vue « lignées » : les stades d'une même lignée côte à côte, à la même échelle.
- Captures avant et après de chaque lignée retravaillée dans `docs/captures/s10/`.
- Le Carnet utilise les nouvelles silhouettes pour les formes non encore vues.

### Critères d'acceptation (mesurables)

- Le test `evolution-readability` passe pour les 24 passages de stade.
- Les tests de style et de lignée existants passent ; le budget de pièces est respecté.
- Le golden master est identique : ce sont des changements visuels.
- `npm run check` passe.

### Hors périmètre

- Toute nouvelle espèce (S14). Tout changement de statistiques ou de sort.
- Les boss de biome (S13).

### Risques et parades

- Le test est satisfait par des ajouts sans goût. → Les critères sont un plancher ; le jugement est celui de la porte 3, captures à l'appui.
- Les modèles plus riches coûtent en fluidité. → Plafond de pièces par créature ; mesure avec `npm run census`.
- Un modèle agrandi fausse les collisions. → Le rayon de collision est figé ; le golden doit rester identique.

### PORTE 3 · A-t-on envie de tous les avoir ? (à recopier à la fin du rapport, section « À juger par un humain »)

1. Ouvre le Carnet. Quel compagnon te manque ? Sais-tu où aller le chercher ?
2. Recrutes-en un : combien de combats a-t-il fallu ? Trop, pas assez ?
3. Regarde trois évolutions : reconnais-tu la lignée, et vois-tu le changement sans lire le nom ?
4. Change de trio et de runes : la différence se sent-elle en combat ?
5. Cite ton compagnon préféré, et dis pourquoi. S'il n'y en a pas, on retravaille les traits avant d'avancer.
6. Regrettes-tu la marmite ou la grille de pierres ? Si oui, dis ce qui te manque précisément.

— FIN DE LA FICHE S10 —

## FICHE S11 — La Faille : la descente

- Version visée : v0.7 · Piliers : Revenir · Diriger · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s10-final` · Branche : `s11-faille` · Tag final : `s11-final`
- Décision du propriétaire liée : D3

**But.** Ajouter le mode qui donne envie d'en refaire une : une suite de combats de plus en plus durs, que l'on commence avec son meneur et deux invités, jusqu'à la chute. Cette session pose la structure et les records ; les faveurs viennent en S12.

**Pourquoi maintenant.** La campagne s'arrête au 21e niveau. La Faille réutilise tout ce qui existe et le rend rejouable.

**À lire avant de commencer :** section 5.9 ; partie 11 (D3). Si le prompt de lancement dit que D3 est refusée, applique la variante de repli.

### S11.1 — Les règles d'une descente · tag avant la section : `s11-avant-regles`

- Tout est en fonctions pures dans `src/game/faille.ts`, avec un générateur aléatoire à graine passé en paramètre (type `RngFn`) : la même graine donne la même descente (test).
- `generateFloor(graine, étage, biomes ouverts)` : un biome tiré parmi ceux que le joueur a ouverts ; deux vagues tirées dans les ennemis de ce biome ; tous les 5 étages, un boss de biome avec son kit, sans répétition tant que tous n'ont pas été vus. Niveau des ennemis : 8 + 2 × (étage − 1). Multiplicateurs dans `FAILLE_TUNING` (`balance.ts`).
- **Départ.** Le joueur choisit son meneur parmi ses compagnons. Il est ramené au niveau 8 et à la forme qu'il aurait à ce niveau ; il garde son Lien, ses runes et son trait.
- **Invités.** Avant l'étage 1, puis après l'étage 2, un invité à choisir parmi trois : des lignées déjà rencontrées, même non recrutées, d'un élément absent du trio quand c'est possible. Au moins un des trois choix doit permettre un trio à trois éléments. L'invité a le niveau du meneur et son trait, ni Lien ni rune. Les étages 1 et 2 se jouent donc à deux : ils sont courts.
- **Montée.** Après chaque étage, tout le trio gagne 2 niveaux. Une évolution se joue en version courte (1,2 s) entre deux étages.
- **Fatigue.** Entre deux étages, chaque compagnon récupère 35 % de ses PV manquants ; un compagnon à terre revient avec 30 % de ses PV. Après un boss, soin complet.
- **Fin.** Le trio entier à terre, ou l'abandon.
- **Ce que la descente rapporte au camp**, plafonné : de l'XP pour tout le camp, au plus l'équivalent de deux niveaux de campagne du niveau du joueur ; 4 de Confiance par étage pour le meneur ; 20 de Confiance, une fois par descente, pour chaque lignée invitée non encore recrutée.
- La Faille s'ouvre après la première victoire sur le boss de la Crête (`volcano-3`).

### S11.2 — Le moteur et les écrans · tag avant la section : `s11-avant-moteur-ecrans`

- Une descente enchaîne des expéditions d'une arène chacune, en réutilisant `engine/expedition.ts`. Entre deux étages, pas de retour au camp : l'arène et l'ambiance changent en moins de 3 s.
- **Entre deux étages** : l'étage atteint, les PV du trio, le choix du moment (un invité ; ou, en attendant S12, un soin de 15 % à la place de la faveur), le bouton « Descendre ».
- **Entrée** : dans « Partir », un second onglet « La Faille ». Choix du meneur parmi les compagnons du camp, avec le record de chacun ; record général ; bouton « Descendre ».
- **Fin de descente** : étage atteint, record battu ou non, Éclats, Trios, esquives parfaites, XP et Confiance gagnées, bouton principal « Redescendre » avec le même meneur.
- La descente en cours est sauvegardée entre deux étages : on peut fermer le jeu et reprendre.

### S11.3 — Les records · tag avant la section : `s11-avant-records`

- `SaveState.faille` : meilleur étage, meilleur étage par lignée, nombre de descentes, paliers atteints, descente en cours. `SAVE_VERSION` + 1.
- Paliers, récompensés la première fois : étage 5, un exploit ; étage 10, la rune Charge ; étage 15, la rune Réveil ; étages 20, 25 et 30, des titres et des cadres.
- Le Carnet gagne une section « Faille » dans les exploits : les 14 records par meneur.

### S11.4 — La mesure · tag avant la section : `s11-avant-mesure`

- `npm run sim -- --faille --runs 60 --profile auto|active|expert [--leader <lignée>]` : étage médian, répartition, durée médiane d'une descente, cause de la chute.
- Cibles (`FAILLE_TUNING`) : étage médian de 6 à 8 en Auto, de 12 à 16 pour le profil actif, au-delà de 20 pour l'expert ; une descente du profil actif dure de 8 à 14 minutes ; aucun meneur à plus de 25 % d'écart de l'étage médian général.
- Le golden master gagne 30 descentes à graine fixe.

### Critères d'acceptation (mesurables)

- Même graine, même descente (test) ; une descente interrompue reprend à l'identique après rechargement (test).
- Les cibles de la section 4 sont tenues ; le tableau par meneur figure dans le rapport.
- Passage d'un étage au suivant : moins de 3 s (mesuré en `?debug=1`).
- La campagne n'a pas bougé : le golden de la campagne est identique.
- `npm run check` et `npm run texts` passent.

### Hors périmètre

- Les faveurs, les règles spéciales d'étage et le défi du jour (S12).
- Tout classement en ligne.

### Risques et parades

- Les deux premiers étages, joués à deux, sont ennuyeux. → Ils sont courts et faciles ; mesure leur durée (moins de 30 s chacun pour le profil actif).
- Certains meneurs sont injouables dans la Faille. → Tableau par meneur ; correction par les invités proposés, pas par les créatures.
- La Faille devient le meilleur moyen de gagner de l'XP. → Plafond d'XP et de Confiance par descente.

### Variante de repli, si le propriétaire a répondu non à D3

**Si D3 est refusée**, pas de Faille. À la place, « la Série des boss » : les sept boss de biome à la suite, au niveau 50, sans soin complet entre eux, avec un record de temps et un record de boss vaincus. Les sections 2 et 3 s'appliquent en version réduite ; la session S12 est remplacée par les règles spéciales appliquées à cette série.

### Contrôle du propriétaire (20 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Fais deux descentes avec deux meneurs différents. Combien de temps durent-elles ?
2. As-tu joué un compagnon que tu n'avais pas ? As-tu eu envie de le recruter ?
3. La chute arrive-t-elle sur une erreur de ta part, ou sur un mur ?
4. As-tu relancé de toi-même ?

— FIN DE LA FICHE S11 —

## FICHE S12 — La Faille : faveurs, règles spéciales, défi du jour

- Version visée : v0.7 · Piliers : Revenir · Composer · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s11-final` · Branche : `s12-faveurs` · Tag final : `s12-final`
- Décision du propriétaire liée : D3

**But.** Donner à chaque descente son histoire : une faveur à choisir parmi trois entre deux étages, une règle spéciale par étage à partir du sixième, et un défi du jour identique pour tout le monde.

**Pourquoi maintenant.** La structure de la Faille existe. Ce sont les choix entre deux combats qui font qu'aucune descente ne ressemble à la précédente.

**À lire avant de commencer :** sections 5.9 et 5.1 ; partie 4 (« des choix qui comptent », « récompense variable, mais juste », « rendez-vous »).

### S12.1 — Les vingt-quatre faveurs · tag avant la section : `s12-avant-faveurs`

- `FAVORS` dans `catalog.ts`, valeurs dans `balance.ts`, effets branchés sur les crochets de S09. Une faveur dure jusqu'à la fin de la descente. Une faveur est proposée après chaque étage, sauf après le deuxième, où le joueur choisit son second invité.

| Faveur | Rareté | Effet |
| --- | --- | --- |
| Mèche longue | commune | Les cubes durent 3 s de plus |
| Poudre | commune | Déflagration : rayon +40 % |
| Lame de fond | commune | Déferlante : +30 % de dégâts |
| Sève vive | commune | Sève : soin doublé |
| Fil conducteur | commune | Arc : deux rebonds de plus |
| Mur | commune | Rempart : bouclier +50 % |
| Résonance | commune | Écho : −1 s de recharge pour toute l'escouade |
| Second souffle | commune | Une esquive parfaite soigne 5 % des PV de l'escouade |
| Pas de côté | commune | Recharge de l'esquive −1 s |
| Élan | commune | +20 % de dégâts pendant 4 s après une esquive parfaite |
| Cuir épais | commune | −15 % de dégâts subis |
| Mûrissement | commune | Les cubes mûrissent en 0,8 s |
| Double détente | rare | Le premier Éclat de chaque vague se déclenche deux fois |
| Contre | rare | Une esquive parfaite pose un cube de l'élément du meneur sur les ennemis proches (rayon 6) |
| Trio majeur | rare | L'onde du Trio fait 100 % des dégâts au lieu de 50 % |
| Chaîne | rare | Un Trio laisse sur la cible un cube mûr de l'élément du lanceur |
| Tambour | rare | Chaque Éclat retire 0,5 s à la recharge des deux autres sorts |
| Réserve | rare | La jauge de Déchaînement monte jusqu'à 150 % ; un Déchaînement en consomme 100 |
| Verre | rare | +35 % de dégâts infligés, +20 % de dégâts subis |
| Dernier debout | rare | Quand un compagnon tombe, les autres gagnent 30 % d'attaque jusqu'à sa relève |
| Trio infini | légendaire | Plus de verrou après un Trio |
| Cœur double | légendaire | Le Déchaînement se lance deux fois de suite |
| Cubes mûrs | légendaire | Les cubes sont mûrs dès qu'ils sont posés |
| Phénix | légendaire | Une fois par descente, le trio à terre se relève avec 50 % de ses PV |

- **Tirage** : trois faveurs différentes que le joueur n'a pas. Pondération : 75 % communes, 22 % rares, 3 % légendaires avant l'étage 5 ; 55, 37 et 8 % ensuite. Après un boss, au moins une rare. Une faveur liée à un Éclat n'est proposée que si son élément est dans le trio. Le tirage dépend de la graine (test).
- **Carte de faveur** : nom, une phrase, symbole de l'élément s'il y en a un, rareté marquée par la forme du cadre et pas seulement par sa couleur.
- Les faveurs acquises s'affichent en petites icônes pendant le combat (douze visibles au plus) et dans le menu de pause.

### S12.2 — Les règles spéciales · tag avant la section : `s12-avant-regles-speciales`

- La table `MUTATORS` de S06 passe à dix règles : Meute, Ennemis pressés, Carapaces, Cubes fragiles, Vent contraire, Tempête, Colosse, et trois nouvelles : **Brume** (les annonces apparaissent 0,2 s plus tard, sans jamais passer sous le délai minimal), **Sol brûlant** (un disque de danger annoncé apparaît sous l'escouade toutes les 6 s), **Silence** (le Déchaînement se charge deux fois moins vite).
- À partir de l'étage 6, chaque étage a une règle, tirée de la graine et annoncée en une phrase sur l'écran qui précède le combat. Pas de règle sur un étage de boss avant l'étage 15.
- Mesure : chaque règle doit faire perdre entre 0,5 et 2 étages à l'étage médian du profil actif. Sinon ajuste-la.

### S12.3 — Le défi du jour · tag avant la section : `s12-avant-defi-du-jour`

- La graine est la date locale. Elle fixe le meneur (le même pour tous, parmi les 14 lignées, qu'on l'ait recruté ou non), les invités proposés, les étages, les règles et les faveurs proposées. Lien et runes sont neutralisés : meneur à Lien ★3, avec deux runes imposées par la graine.
- Une tentative comptée par jour. Les suivantes sont possibles et marquées « entraînement ». Le résultat est rangé dans la sauvegarde : étage, Éclats, Trios.
- Bouton « Partager » : il copie un texte court, sans lien de suivi, par exemple « CubiQuest · Défi du 22/11 · Étage 14 · 9 Trios », avec l'adresse du jeu. Le titre vient de `GAME_TITLE`.
- Aucun classement en ligne. La série de jours joués peut s'afficher, sans récompense ni pénalité : le plan interdit les récompenses de connexion.

### S12.4 — Réglage et diversité · tag avant la section : `s12-avant-reglage`

- Les faveurs ajoutent de la puissance : reprends `FAILLE_TUNING` pour retrouver les cibles de S11 (étage médian de 6 à 8, de 12 à 16, au-delà de 20).
- Sur 600 descentes simulées où la faveur est choisie au hasard, mesure l'effet de chaque faveur sur l'étage atteint. Aucune ne doit déplacer l'étage médian de plus de 3 étages ni de moins de 0,3. Liste-les dans le rapport.
- Le profil expert choisit par une règle simple : d'abord une faveur liée aux éléments de son trio, sinon la plus rare.
- Le journal de test enregistre les faveurs proposées et celle qui a été choisie.

### Critères d'acceptation (mesurables)

- Chacune des 24 faveurs a un test qui mesure son effet ; le tirage est reproductible et respecte ses quatre règles.
- Cibles de S11 tenues avec les faveurs ; tableau d'effet des 24 faveurs et des 10 règles dans le rapport.
- Le défi du jour est identique pour une même date sur deux sauvegardes différentes (test).
- Le texte partagé ne contient aucune donnée personnelle ni aucun paramètre de suivi.
- `npm run check` et `npm run texts` passent.

### Hors périmètre

- Tout serveur, tout classement, toute notification.
- De nouvelles créatures ou de nouveaux boss.

### Risques et parades

- Une faveur est prise à chaque fois. → Mesure de diversité ; puis, à la porte 4, lecture des choix dans ton journal.
- Les effets cumulés deviennent illisibles. → Douze icônes au plus à l'écran, une phrase par faveur, pas de pourcentage inférieur à 15 %.
- Le défi du jour pousse à jouer par obligation. → Aucune récompense de régularité, aucune pénalité, aucune notification.

### PORTE 4 · Est-ce qu'on relance ? (à recopier à la fin du rapport, section « À juger par un humain »)

1. Fais trois descentes d'affilée avec trois meneurs différents. As-tu relancé de toi-même à chaque fois ?
2. As-tu hésité entre deux faveurs au moins une fois sur trois ? Si tu prends toujours la même, elle est trop forte.
3. Une descente t'a-t-elle fait découvrir un compagnon que tu es ensuite allé chercher en campagne ?
4. Une descente tient-elle en dix à quinze minutes ?
5. Joue le défi du jour et envoie ton résultat à quelqu'un.
6. Exporte ton journal : on y lira quelles faveurs tu choisis.

— FIN DE LA FICHE S12 —

## FICHE S13 — Des arènes vivantes

- Version visée : v0.8 · Piliers : Diriger · Revenir · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s12-final` · Branche : `s13-arenes` · Tag final : `s13-final`

**But.** Que chaque biome se reconnaisse et se joue différemment : une particularité d'arène par biome, des décors de formes distinctes, et un boss de biome qui a l'allure d'un boss.

**Pourquoi maintenant.** Les biomes sont la troisième récompense du jeu, après les compagnons et les évolutions. Aujourd'hui ils diffèrent surtout par la couleur, et leurs boss sont des créatures ordinaires agrandies.

**À lire avant de commencer :** sections 5.3, 5.5 et 5.11 ; `STYLE.md`.

### S13.1 — Une particularité par biome · tag avant la section : `s13-avant-particularites`

- Un module générique `ARENA_FEATURES` (`balance.ts`), une entrée par biome. Règles communes : rien ne bloque le déplacement ; tout ce qui blesse s'annonce avec la grammaire de S05 ; alliés et ennemis sont traités de la même façon chaque fois que c'est possible.

| Biome | Particularité | Effet |
| --- | --- | --- |
| Prairie | Aucune | C'est le biome où l'on apprend. |
| Rive | La marée | Toutes les 20 s, une bande d'eau annoncée 1,5 s traverse l'arène : cube d'Eau pour les ennemis touchés, alliés ralentis 2 s. |
| Crête | Les évents | Trois évents fixes. L'un s'allume toutes les 12 s (disque annoncé 1,2 s) : dégâts pour tous, cube de Feu pour les ennemis. |
| Sanctuaire | Les cristaux résonants | Deux cristaux flottants. Un Éclat déclenché à moins de 6 unités d'un cristal se répète à moitié de puissance sur l'ennemi le plus proche de ce cristal. |
| Toundra | Le verglas | Des plaques visibles : l'esquive y va moitié plus loin, les charges ennemies aussi. |
| Cime | Les paratonnerres | Trois mâts. La foudre annoncée frappe d'abord le mât le plus proche de sa cible : un ennemi près d'un mât frappé reçoit un cube d'Électrik. |
| Canyon | Le vent de sable | Toutes les 15 s, une rafale annoncée 1,5 s pousse tout le monde de 3 unités et emporte les cubes en place. Aucun dégât. |

- La particularité est présentée par une phrase au premier niveau du biome, puis dans le Carnet.
- Mesure : aucune particularité ne déplace les victoires d'un profil de plus de 6 points ; pour au moins quatre des six, l'expert en tire au moins 2 points de mieux que sur l'arène nue. La Faille utilise la particularité du biome tiré.

### S13.2 — Des décors de formes distinctes · tag avant la section : `s13-avant-decors`

- Constat du dossier de game design : deux biomes partagent la même disposition de décor. Dans `models/biomes.ts`, chaque biome reçoit un pourtour, un relief d'arrière-plan et un motif de sol qui lui sont propres.
- La zone de jeu ne change ni de taille ni de forme (`ARENA_BOUND`) : l'équilibrage n'est pas touché.
- Étends les tests de biome : deux biomes ne doivent partager ni la même silhouette de pourtour ni le même motif de sol.

### S13.3 — Les sept souverains · tag avant la section : `s13-avant-souverains`

- Le boss du niveau 3 de chaque biome prend une « forme souveraine », par un module générique `sovereign` paramétré par biome : même espèce, taille × 1,6, une couronne ou une crête propre au biome, une aura au sol, une barre de PV découpée en phases.
- L'entrée en scène existante (`updateBossIntro`, 1,9 s) affiche le nom complet : « Bourgéoliath, souverain de la Prairie ».
- La chute d'un souverain a sa mise en scène de 1,5 s : ralenti, éclats de cubes, puis les récompenses.
- Les boss de la Faille et des niveaux Défi utilisent la forme souveraine.

### Critères d'acceptation (mesurables)

- Mesures de la section 1 tenues ; le tableau 5.8 reste respecté à ± 5 points.
- Tests de biome étendus au vert ; captures des sept arènes et des sept souverains dans `docs/captures/s13/`.
- Toute zone qui blesse utilise la couleur `DANGER` et respecte les délais minimaux (tests de S05).
- Budget d'affichage : pas plus de 10 % de pièces en plus par arène (`npm run census`).
- `npm run check` passe ; golden réenregistré dans un commit à part.

### Hors périmètre

- Tout nouvel ennemi, toute nouvelle attaque de boss.
- Tout obstacle qui bloque le déplacement.

### Risques et parades

- Les particularités ajoutent du bruit à des combats déjà chargés. → Une seule par biome, aucune dans la Prairie, toujours annoncée ; plafond de trois zones de danger maintenu.
- Le vent du Canyon frustre en emportant les cubes. → Il est annoncé et régulier : l'expert pose ses cubes juste après. À surveiller dans la mesure.

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Reconnais-tu chaque biome en plissant les yeux ?
2. Comprends-tu chaque particularité sans lire sa phrase ?
3. Les sept boss de biome ont-ils l'air de boss ?
4. Une particularité te gêne-t-elle plus qu'elle ne t'amuse ?

— FIN DE LA FICHE S13 —

## FICHE S14 — Le bestiaire complété

- Version visée : v0.8 · Piliers : Composer · Durée visée : 2 h 30 · Priorité : Optionnel
- Départ : `s13-final` · Branche : `s14-bestiaire` · Tag final : `s14-final`

**But.** Combler les rôles qui manquent dans trois éléments, et ajouter une collection secondaire sans effet sur le jeu : les variantes rares.

**Pourquoi maintenant.** Aujourd'hui le Feu, la Plante et le Psy n'ont que deux lignées chacun, contre trois pour l'Eau et la Roche. Cette session est facultative : le jeu est complet sans elle.

**À lire avant de commencer :** sections 5.6 et 5.7 b) ; `STYLE.md`.

### S14.1 — Trois lignées · tag avant la section : `s14-avant-lignees`

- Une lignée par élément, sur un rôle absent de cet élément : **Feu**, un tank ; **Plante**, un combattant de mêlée à ruée ; **Psy**, un combattant de mêlée.
- Chacune : trois stades ; des sorts qui réutilisent un style existant (projectile, zone, mêlée, ruée, soutien) ; un trait de lignée (règle des 8 points) ; une petite phrase par forme ; sa place dans le calendrier des arrivées, dans les vagues d'au moins trois niveaux et dans la Faille.
- Les noms sont inventés, dans l'esprit des noms actuels. Vérifie de mémoire qu'aucun n'est le nom d'une créature d'un autre jeu, en français comme en anglais, et liste-les dans le rapport pour validation.
- Chaque lignée passe les tests de lignée existants et le test `evolution-readability`.

### S14.2 — Les variantes rares · tag avant la section : `s14-avant-variantes`

- Chaque lignée a une variante de palette. Un ennemi sauvage sur 40 l'arbore. La vaincre l'ajoute au Carnet. Aucun effet sur les statistiques.
- Une fois une variante vue, le joueur peut l'appliquer à son compagnon de la même lignée depuis sa fiche.
- Le tirage vient d'un générateur à part : il ne doit pas modifier le déroulé des combats (golden identique hors apparence).

### S14.3 — Réglage · tag avant la section : `s14-avant-reglage`

- Remesure les niveaux dont les vagues ont changé (tableau 5.8), le parcours (`npm run journey`) et la Faille. Réenregistre le golden dans un commit à part.

### Critères d'acceptation (mesurables)

- 17 lignées, 47 formes ; tests de lignée et de lisibilité des évolutions au vert pour les trois nouvelles.
- Chaque nouveau trait déplace les victoires de 1 à 8 points.
- Tableau 5.8, calendrier des arrivées et cibles de la Faille toujours tenus.
- `npm run check` et `npm run texts` passent.

### Hors périmètre

- Tout nouvel élément, tout nouveau style de sort, tout nouveau biome.

### Risques et parades

- Un nom inventé existe déjà ailleurs. → Liste dans le rapport ; le propriétaire valide avant la sortie.
- Trois lignées de plus déséquilibrent les vagues. → Remplacement à niveau égal, puis mesure.

### Contrôle du propriétaire (10 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Les trois nouvelles lignées ont-elles leur place à côté des autres ?
2. Valide ou change leurs noms.
3. As-tu croisé une variante rare ? Donne-t-elle envie d'en chercher d'autres ?

— FIN DE LA FICHE S14 —

## FICHE S15 — L'interface et le parcours

- Version visée : v0.9 · Piliers : Revenir · Durée visée : 3 h · Priorité : Indispensable
- Départ : `s14-final` · Branche : `s15-interface` · Tag final : `s15-final`

**But.** Passer de cinq menus à trois, supprimer ce qui ne sert aucun pilier, ajouter les options qu'un joueur attend, et relire chaque écran avec la même liste de contrôle.

**Pourquoi maintenant.** Les systèmes sont en place. L'interface a grandi par ajouts successifs : c'est le moment de la resserrer.

**À lire avant de commencer :** section 5.10 ; partie 4 (friction nulle). Si la session S14 n'a pas eu lieu, pars du tag `s13-final`.

### S15.1 — Trois entrées · tag avant la section : `s15-avant-trois-entrees`

- Le camp n'a plus que trois boutons : **Partir** (la carte et la Faille), **Escouade**, **Carnet**. Une roue dentée ouvre les options. Les anciens tiroirs (`ExpeditionDrawer`, `TeamDrawer`, `QuestsDrawer`, Carnet) sont redistribués dans ces trois entrées.
- Chaque écran a un seul bouton principal, toujours au même endroit. Échap ferme l'écran courant ; Entrée valide le bouton principal ; Tab parcourt les éléments dans un ordre logique, avec un contour de focus visible.
- Le menu de pause : Reprendre, Recommencer, Options, Abandonner. Il rappelle le défi du niveau ou, en Faille, les faveurs acquises.

### S15.2 — La fin des quêtes tournantes · tag avant la section : `s15-avant-quetes`

- Supprime les quêtes tournantes : `QUEST_POOL`, `activeQuests`, `createInitialQuests`, `claimQuestReward`, `QuestsDrawer.tsx`. Migration : les récompenses en attente sont accordées.
- Les exploits sont revus : 24 exploits liés aux trois piliers (premier Trio, dix esquives parfaites, trois étoiles sur un biome, camp complet, Lien ★5, étage 20 de la Faille…). Récompenses : des titres et des cadres. Plus aucune récompense de puissance ni de hasard.
- Les exploits se réclament d'un clic depuis le Carnet ; une pastille signale ceux qui attendent.

### S15.3 — Les options · tag avant la section : `s15-avant-options`

- `GameSettings` ne contient aujourd'hui que `screenShake`. Ajoute, avec normalisation testée : volume général et volume des effets ; intensité des secousses (0 à 100 %) ; réduction des animations (coupe ralentis et éclairs) ; contraste renforcé (cubes et zones de danger plus marqués) ; taille du texte (100, 115, 130 %) ; touches personnalisables (sorts, esquive, Déchaînement, mode, déplacement) ; main dominante pour le tactile.
- Sauvegarde : exporter dans un fichier, importer, effacer (double confirmation). `exportSaveToJson` et `importSaveFromJson` existent déjà dans `rules.ts`.
- Le journal de test (S07) et la révision des leçons se trouvent aussi dans les options.

### S15.4 — La cohérence · tag avant la section : `s15-avant-coherence`

- Passe tous les écrans à la même liste : titre ; marges ; bouton principal ; état vide ; message d'erreur ; focus visible ; aucun texte tronqué en 360 × 640 ; aucun chiffre inutile ; aucun texte de plus de deux lignes en combat.
- `STYLE.md` gagne une section « Interface » avec ces règles. Celles qui peuvent se tester le sont : contraste du texte d'au moins 4,5 pour 1, calculé sur les couleurs de `styleGuide.ts` ; taille de police minimale ; taille minimale des zones cliquables.
- Captures de tous les écrans, en bureau et en mobile, dans `docs/captures/s15/`.

### Critères d'acceptation (mesurables)

- Trois entrées au camp ; toutes les actions sont accessibles au clavier (test de navigation).
- Tests de contraste, de taille de police et de taille des zones cliquables au vert.
- Les options sont conservées d'une session à l'autre et tolèrent des valeurs invalides (test).
- Plus aucune trace des quêtes tournantes dans `src/` ; migration testée.
- `npm run check` et `npm run texts` passent.

### Hors périmètre

- Le tactile et les performances (S16) ; le nom, le logo et le son (S17).
- Toute nouvelle mécanique.

### Risques et parades

- En regroupant les menus, on enterre une fonction utile. → Avant de commencer, liste chaque action possible aujourd'hui et sa nouvelle place ; joins la liste au rapport.
- Les touches personnalisées entrent en conflit. → Refus d'une touche déjà prise, bouton « Par défaut ».

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Trouves-tu chaque fonction en moins de trois clics ?
2. Y a-t-il encore un écran où tu ne sais pas quoi faire ?
3. Change la taille du texte et les touches : tout reste-t-il utilisable ?
4. Les quêtes te manquent-elles ?

— FIN DE LA FICHE S15 —

## FICHE S16 — Mobile et performances

- Version visée : v0.9 · Piliers : Revenir · Durée visée : 3 h · Priorité : Recommandé
- Départ : `s15-final` · Branche : `s16-mobile` · Tag final : `s16-final`

**But.** Que le jeu se joue au doigt sur un téléphone, s'installe comme une application, démarre sans connexion, et reste fluide.

**Pourquoi maintenant.** Un jeu qui se lance par un lien sera ouvert d'abord sur un téléphone. Aucun humain n'a encore mesuré la fluidité.

**À lire avant de commencer :** partie 9 (images par seconde, poids) ; `CLAUDE.md`, pièges du golden master.

### S16.1 — Mesurer d'abord · tag avant la section : `s16-avant-mesure`

- `?debug=1` affiche déjà des statistiques. Ajoute une page `?bench=1` : elle joue 30 s d'un combat écrit à l'avance sur « Trône d'Ambre » et affiche les images par seconde (moyenne et 5 % les plus lentes), les appels de dessin et les triangles. C'est le propriétaire qui la lancera sur son PC et sur un téléphone.
- Relève les appels de dessin et les triangles actuels de chaque arène en combat. Le budget est fixé à 70 % de ces valeurs si le PC du propriétaire ne tient pas 60 images par seconde ; sinon aux valeurs actuelles.

### S16.2 — Le tactile · tag avant la section : `s16-avant-tactile`

- Un bâton virtuel sous le pouce gauche ; à droite, les trois sorts, l'esquive et le Déchaînement. Zones d'au moins 48 px. Disposition inversée pour les gauchers (option de S15).
- Rien ne dépend du survol. Pas de zoom ni de défilement parasites (`touch-action`). En portrait, un message invite à tourner l'appareil.
- Une vibration brève sur un Trio et sur une esquive parfaite, si l'appareil le permet et si l'option est active.
- Toutes les vues de 640 × 360 à 2560 × 1440, encoches comprises. Captures à trois tailles.

### S16.3 — Les performances · tag avant la section : `s16-avant-performances`

- Moyens autorisés : fusion des maillages statiques du décor ; instanciation des ennemis identiques ; plafond du pool de particules ; ombres simplifiées ; résolution de rendu adaptative (de 1 à 0,7 quand la cadence passe sous 45 images par seconde pendant 2 s) ; trois niveaux de qualité dans les options, automatique par défaut.
- Piège connu : la création d'objets three.js consomme des tirages de `Math.random` et peut changer le golden master. Si une fusion le modifie, réenregistre-le dans un commit à part, en expliquant pourquoi.
- Découpe le code pour charger le camp d'abord et le combat ensuite.

### S16.4 — Installable, et sans connexion · tag avant la section : `s16-avant-installable`

- Héberge dans le dépôt les trois polices aujourd'hui chargées depuis Google Fonts (Bricolage Grotesque, JetBrains Mono, Plus Jakarta Sans, toutes sous licence libre) et retire les liens externes de `index.html`. Ajoute leurs licences dans `docs/licences/`.
- `manifest.webmanifest`, icônes produites par code au moment du build, et un service worker écrit à la main qui met en cache les fichiers du build et se met à jour à la version suivante. Aucune dépendance nouvelle.
- Après une première visite, le jeu démarre sans réseau et ne fait plus aucune requête externe.

### Critères d'acceptation (mesurables)

- Tests : zones tactiles d'au moins 48 px ; manifeste valide ; le service worker met en cache tous les fichiers du build.
- Poids transféré au premier chargement : 1,4 Mo au plus (compressé). Aucune requête vers un autre domaine.
- Budget d'appels de dessin et de triangles tenu dans les sept arènes (relevé dans le rapport).
- À mesurer par le propriétaire avec `?bench=1` : 60 images par seconde sur son PC, au moins 30 sur un téléphone de milieu de gamme.
- `npm run check` passe.

### Hors périmètre

- Toute application native, toute boutique d'applications.
- La manette de jeu.

### Risques et parades

- Le tactile rend l'esquive imprécise. → Bouton d'esquive large, sous le pouce ; à vérifier au contrôle, la fenêtre de 0,35 s reste réglable.
- Le service worker sert une vieille version. → Nom de cache lié à la version ; rechargement proposé quand une mise à jour est prête.
- La fusion des maillages casse le golden. → Commit séparé et justification, comme la règle R5 le demande.

### Contrôle du propriétaire (20 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Ouvre le lien sur ton téléphone et joue deux niveaux au doigt. Réussis-tu une esquive parfaite et un Trio ?
2. Lance `?bench=1` sur ton PC, puis sur ton téléphone, et note les deux résultats.
3. Installe le jeu sur l'écran d'accueil, coupe le réseau, relance-le.
4. Un bouton est-il trop petit, ou mal placé ?

— FIN DE LA FICHE S16 —

## FICHE S17 — Le nom, l'identité, le son

- Version visée : v0.9 · Piliers : Identité · Durée visée : 2 h 30 · Priorité : Indispensable
- Départ : `s16-final` · Branche : `s17-identite` · Tag final : `s17-final`
- Décision du propriétaire liée : D5 et D6

**But.** Donner au jeu son nom définitif, son logo, son écran titre, et un son où chaque geste clé se reconnaît les yeux fermés.

**Pourquoi maintenant.** Tout le reste est en place. Le nom arrive en dernier parce qu'il est le plus facile à changer : trois constantes depuis S03.

**À lire avant de commencer :** section 5.11 ; partie 11 (D5 et D6). Le prompt de lancement doit donner trois lignes : NOM DU JEU, NOM DES CRÉATURES, MUSIQUE (oui ou non). Si une ligne manque, garde la valeur provisoire et signale-le en tête du rapport.

### S17.1 — Le nom · tag avant la section : `s17-avant-nom`

- `GAME_TITLE`, `CREATURE_NOUN` et `WORLD_NAME` prennent les valeurs du propriétaire. Mets à jour `package.json`, `index.html` (titre, description, Open Graph), le manifeste, le README et le texte de partage du défi du jour.
- Les clés de `localStorage` gardent leur nom actuel : aucune sauvegarde ne doit être perdue.
- Test : l'ancien titre et l'ancien nom des créatures n'apparaissent plus dans `src/`, `index.html` ni le README.

### S17.2 — Le logo et l'écran titre · tag avant la section : `s17-avant-logo`

- Le logo est dessiné par code : trois cubes de trois couleurs qui s'assemblent, la signature du jeu, avec le titre.
- L'écran titre montre le trio du joueur autour du feu de camp, « Jouer » ou « Continuer », et le numéro de version.
- L'icône du site, les icônes d'installation et une image de partage de 1200 × 630 sont produites au moment du build à partir du même dessin.

### S17.3 — Le son · tag avant la section : `s17-avant-son`

- Dresse dans `docs/son.md` la table de tous les sons de `audio.ts` : événement, son, priorité.
- Priorités de mixage : 1, les annonces d'attaque et le « tic » de la fenêtre d'esquive, toujours audibles ; 2, cube mûr, Éclat, Trio, esquive parfaite, Déchaînement ; 3, les coups ; 4, l'ambiance. Huit voix au plus, un limiteur en sortie, une variation de hauteur de 6 % sur les sons répétés.
- Chaque élément a sa note dans une gamme à cinq tons : l'Éclat joue la note de l'élément qui fait éclater, le Trio joue l'accord des trois. On doit reconnaître un Trio sans regarder.
- Test : chaque événement sonore déclare une priorité, et aucun son de priorité 1 n'est coupé par le plafond de voix.

### S17.4 — La musique (si D6 est acceptée) · tag avant la section : `s17-avant-musique`

- Produite par code avec l'API audio du navigateur : un petit séquenceur à trois pistes (basse, arpège, mélodie courte). Une boucle par biome, une pour le camp, une pour la Faille qui s'intensifie tous les 5 étages.
- Volume séparé, coupure possible, 12 dB sous les effets, fondu entre deux scènes. Elle ne démarre qu'après un premier geste du joueur.
- Si D6 est refusée : des ambiances seulement (vent, vagues, feu), au même réglage de volume.

### S17.5 — À propos, et dépôt propre · tag avant la section : `s17-avant-a-propos`

- Un écran « À propos » : les auteurs, les outils, les licences des polices, la mention « jeu indépendant, sans lien avec une autre marque », la mention « aucune donnée n'est collectée ». N'ajoute pas de licence au code sans instruction du propriétaire.
- `tools/export-clean.mjs` prépare, dans un dossier voisin, une copie du projet sans historique git et sans `docs/archives`, prête à être poussée vers un nouveau dépôt. Le script ne pousse rien et ne supprime rien : c'est le propriétaire qui décide.

### Critères d'acceptation (mesurables)

- Test de l'ancien nom au vert ; une sauvegarde d'avant la session se charge.
- Tests de priorité sonore au vert ; `docs/son.md` à jour.
- L'icône, le manifeste et l'image de partage portent le nouveau nom.
- `npm run check` et `npm run texts` passent.

### Hors périmètre

- Tout fichier sonore ou image externe.
- Toute publication : ni nouveau dépôt, ni page publique.

### Risques et parades

- Le nom choisi est déjà pris. → La vérification revient au propriétaire avant de lancer la session ; le changement ne coûte que trois constantes.
- La musique produite par code fatigue vite. → Boucles courtes et variées, volume bas par défaut, coupure en un clic ; c'est le contrôle qui tranche.

### Contrôle du propriétaire (15 minutes) (à recopier à la fin du rapport, section « À juger par un humain »)

1. Joue cinq minutes au casque. Un son t'agace-t-il ?
2. Ferme les yeux pendant un combat : reconnais-tu un Trio ? une attaque qui arrive ?
3. Le nom, le logo et l'écran titre te plaisent-ils ?
4. Gardes-tu la musique ?

— FIN DE LA FICHE S17 —

## FICHE S18 — La version 1.0

- Version visée : v1.0 · Piliers : Les trois · Durée visée : 3 h · Priorité : Indispensable
- Départ : `s17-final` · Branche : `s18-sortie` · Tag final : `s18-final`

**But.** Régler le jeu sur ce que de vrais joueurs ont fait, chasser les défauts, et préparer tout ce qu'il faut pour une sortie publique que le propriétaire déclenchera lui-même.

**Pourquoi maintenant.** La simulation a réglé les nombres ; il reste à les confronter aux parties réelles et à s'assurer qu'une personne inconnue ne peut pas casser le jeu.

**À lire avant de commencer :** parties 9 et 10 en entier. Avant de lancer, le propriétaire dépose les journaux de test dans `docs/journaux/`.

### S18.1 — Le réglage sur données réelles · tag avant la section : `s18-avant-journaux`

- `npm run journal -- docs/journaux/*.json` produit `docs/sim/18-journaux.md` : par niveau, victoires réelles et simulées, relances après défaite, Éclats, Trios, esquives parfaites, niveaux où les joueurs s'arrêtent.
- Recale d'abord les profils de la simulation sur les humains (part des attaques esquivées, précision, part des Éclats faibles), puis corrige les cinq plus gros écarts par `balance.ts`, en gardant le tableau 5.8.
- S'il n'y a pas de journaux, écris-le, n'invente rien et ne change aucun réglage.

### S18.2 — La chasse aux défauts · tag avant la section : `s18-avant-robustesse`

- Un test de bout en bout sans navigateur : nouvelle partie, les 21 niveaux, puis 5 étages de Faille, en passant par les vraies fonctions de sauvegarde.
- Tests de robustesse : sauvegarde illisible (la copie de secours est conservée et un message l'explique) ; stockage plein ou indisponible (on joue sans sauvegarder, avec un bandeau) ; onglet en arrière-plan (pause) ; redimensionnement en plein combat ; double clic sur chaque bouton principal ; perte du contexte d'affichage (rechargement propre) ; migration depuis chaque version de sauvegarde depuis la v3.
- Liste des défauts connus restants dans le rapport, classés en bloquant, gênant et mineur. Aucun bloquant à la fin de la session.

### S18.3 — La liste de sortie · tag avant la section : `s18-avant-sortie`

- Version `1.0.0`, affichée sur l'écran titre et dans « À propos » ; tag `v1.0.0` en plus de `s18-final`.
- `CHANGELOG.md` depuis la version 0.3 ; README final ; `docs/` rangé ; `CLAUDE.md` à jour.
- Chaque ligne du tableau de bord (partie 9) est reportée dans le rapport avec sa valeur mesurée : au vert, ou écart expliqué.
- Le mode `?debug=1` reste disponible mais n'est mentionné nulle part dans le jeu.

### S18.4 — La page du jeu · tag avant la section : `s18-avant-page-du-jeu`

- `docs/sortie/page.md` : des textes prêts à copier pour une page de présentation (titre, phrase d'accroche tirée de la vision, cinq points forts, commandes, configuration), sans comparaison avec un autre jeu.
- Six captures au format 16:9 dans `docs/captures/s18/`.
- Une archive du build avec chemins relatifs, utilisable sur une plateforme d'hébergement de jeux web.
- Ne publie rien : c'est le propriétaire qui met en ligne.

### S18.5 — L'anglais (si le temps le permet) · tag avant la section : `s18-avant-anglais`

- `src/i18n/en.ts` complet, un sélecteur de langue dans les options, et `npm run texts` qui vérifie que les deux langues ont les mêmes clés.
- La traduction est à faire relire par quelqu'un : dis-le dans le rapport.

### Critères d'acceptation (mesurables)

- Le test de bout en bout et les tests de robustesse passent.
- Aucun défaut bloquant connu.
- Tableau de bord de la partie 9 reporté ligne à ligne dans le rapport.
- `npm run check`, `npm run texts` et le test des mots interdits passent ; les tests automatiques sur GitHub sont au vert.
- Tags `s18-final` et `v1.0.0` poussés.

### Hors périmètre

- Toute fonction nouvelle.
- Toute publication, toute annonce.

### Risques et parades

- Trop peu de journaux pour conclure. → Dire combien de parties ont été analysées ; sous 30 parties par niveau, ne corriger que les écarts de plus de 15 points.
- Une correction de dernière minute casse autre chose. → Golden master, test de bout en bout, un tag avant chaque section.

### PORTE FINALE · Peut-on le montrer ? (à recopier à la fin du rapport, section « À juger par un humain »)

1. Joue une heure d'affilée à la version à valider, sans t'arrêter aux détails. Quelque chose t'a-t-il sorti du jeu ?
2. Fais jouer une personne nouvelle pendant vingt minutes, sans l'aider.
3. Relis la page du jeu : dit-elle ce que le jeu a d'unique ?
4. Vérifie que le nom est libre, et demande un avis juridique si tu comptes vendre le jeu.
5. Si tout est bon : valide, laisse `main` avancer, puis mets en ligne toi-même.

— FIN DE LA FICHE S18 —

# PARTIE 9 — Le tableau de bord

Ce qu'on mesure pour savoir si le plan fonctionne. Les cibles sont des hypothèses de départ (hypothèse) ; les portes humaines ont le dernier mot.

| Indicateur | Cible | Mesuré par | Dès |
| --- | --- | --- | --- |
| Victoires en Auto, actif, expert, par zone | Tableau de la section 5.8 | `npm run sim`, 40 combats × 3 graines | S05 |
| Écart expert − Auto (biomes 3 à 7) | ≥ 25 points | `npm run sim` | S05 |
| Éclats par combat, faibles compris | Auto ≥ 3 · actif ≥ 6 | `npm run sim` | S04 |
| Trios par combat (trio à 3 éléments) | Auto 0 (par règle) · expert ≥ 4 | `npm run sim` | S04 |
| Déchaînements par combat de boss | Actif 1 à 2 · Auto 0 à 1 | `npm run sim` | S04 |
| Phases de boss | ≥ 10 s et ≥ 2 attaques annoncées chacune | `npm run sim` | S05 |
| Parties par niveau pour finir la campagne | ≤ 2,2 en moyenne, 4 au plus | `npm run journey` | S06 |
| Niveaux d'affilée sans nouveauté | 4 au plus | `npm run journey` | S08 |
| Étage médian en Faille | Auto 6 à 8 · actif 12 à 16 · expert > 20 | `npm run sim -- --faille` | S11 |
| Délai entre « Réessayer » et le combat | < 2 s | chronomètre, journal de test | S06 |
| Relance après une défaite | ≥ 70 % | journal de test local | S07 |
| Images par seconde | 60 sur ton PC, 30 sur téléphone | `?debug=1`, par un humain | S16 |
| Poids téléchargé | ≤ 1,4 Mo, premier écran en moins de 3 s | build | S16 |
| Mots interdits dans le code et les textes | 0 | test automatique | S03 |
| Tests, golden master, tests sur GitHub | verts à chaque session | `npm run check` | S03 |

> **À SAVOIR — Ce que les chiffres ne diront jamais** Si un Trio fait plaisir. Si une défaite donne envie de relancer. Si un compagnon est attachant. La simulation règle les nombres ; les quatre portes jugent le jeu. À la porte 2, fais jouer deux ou trois personnes qui ne connaissent pas le jeu, sans les aider, et regarde où elles bloquent.

# PARTIE 10 — Ce qui peut faire échouer ce plan

J'ai cherché les raisons pour lesquelles il pourrait ne pas marcher. Les voici, avec le signal qui doit alerter et la parade.

| Risque | Signal d'alerte | Parade |
| --- | --- | --- |
| **Le Trio n'est pas amusant en vrai** : trop mécanique, ou illisible dans la mêlée. C'est le pari central, et personne ne l'a encore joué. | Porte 1 : tu ne cherches pas à le refaire. | Une session courte d'ajustement (durées, ciblage, retours visuels). Plan B : garder les Éclats, retirer le Trio, renforcer l'esquive. |
| **La seconde d'attente agace** : attendre que le cube mûrisse casse le rythme au lieu de le créer. | Porte 1 : tu appuies quand même trop tôt après dix combats, ou tu repasses en Auto. | La durée est une seule valeur, réglable de 0,8 à 1,5 s. Plan B : plus de maturation, mais le Trio reste réservé au joueur. |
| **Trop de refontes à la fois** cassent ce qui marchait. | Golden rouge, portes qui échouent deux fois de suite. | Une session = une version jouable et taguée. Les remplacements de la marmite et des pierres sont optionnels et ont une variante de repli. |
| **Claude Code ne peut pas juger le plaisir.** | Des rapports qui disent « amélioré » sans mesure. | Règle R13, critères mesurables, portes humaines, journal de test. |
| **La simulation ne joue pas comme un humain.** | Tes parties contredisent les tableaux. | Trois profils au lieu d'un, puis réglage final sur des journaux de vraies parties (S18). |
| **Le périmètre dérive** : des ajouts que personne n'a demandés. | Des sections « en plus » dans les rapports. | Règle R10, fiches fermées, lexique, test des trois piliers. |
| **La parenté avec Pokémon Quest reste visible** malgré les changements (créatures cubiques, escouade de 3, île). | Un regard extérieur dit « c'est Pokémon Quest ». | S03, S04, S08, S09 et S17 traitent les noms et les systèmes. Je ne suis pas avocat : avant toute sortie commerciale, fais relire par un avocat en propriété intellectuelle. |
| **Personne n'y joue.** | Aucun retour après la mise en ligne. | Lien public dès S03, trois testeurs dès la porte 2, page itch.io en S18. La taille du public est une inconnue. |
| **Le jeu rame sur téléphone.** | Moins de 30 images par seconde. | Session S16, budget d'affichage, réglage de qualité. |
| **L'élan retombe** avant la fin des 16 sessions. | Plus d'une semaine sans session. | Chaque phase livre un jeu meilleur : on peut s'arrêter après v0.5 ou v0.7. |
| **Une refonte abîme la sauvegarde d'un testeur.** | Un testeur perd sa partie. | Migrations testées à chaque version, copie de secours, export en un clic. |

# PARTIE 11 — Tes décisions

Six choix t'appartiennent. Pour chacun je donne ma recommandation et ce qui se passe si tu dis non. Sans réponse de ta part, la recommandation s'applique.

|  | La question | Ma recommandation | Si tu dis non | Avant |
| --- | --- | --- | --- | --- |
| **D1** | Remplacer la marmite par la Confiance ? | **Oui.** C'est le système le plus copié et le plus aléatoire. | On garde la cuisine, rendue transparente : on voit ce qu'une recette attire, et elle donne en priorité une espèce que tu n'as pas. | S08 |
| **D2** | Remplacer les pierres par les Runes ? | **Oui.** Moins d'inventaire, des choix plus nets. | On garde les pierres de pouvoir, sans sous-statistiques, avec un bouton « équiper le meilleur ». | S09 |
| **D3** | Ajouter la Faille ? | **Oui.** Sans elle, le jeu s'arrête au 21e niveau. | À la place : les niveaux Défi et une suite de boss à enchaîner. | S11 |
| **D4** | Retirer le Codex à base d'IA ? | **Oui.** Il dépend d'une clé payante et d'un serveur ; sans lui le jeu est un simple site, gratuit à héberger. | Il reste en option, masqué quand aucune clé n'est configurée. | S08 |
| **D5** | Quel nom pour le jeu et pour les créatures ? | **Un titre qui dit la signature** (pistes en 5.11). | « CubiQuest » reste, avec sa ressemblance. | S17 |
| **D6** | De la musique ? | **Oui, discrète** : une boucle par biome, réglable et coupable. | Effets sonores seulement, comme aujourd'hui. | S17 |

### Ce que toi seul peux faire

- Jouer aux quatre portes et dire ce que tu ressens.
- Trancher D1 à D6.
- Changer la description du dépôt et activer la mise en ligne (ou me le demander).
- Faire jouer deux ou trois personnes à la porte 2.
- Consulter un avocat avant une sortie commerciale.

### Ce que je ne sais pas

- **Si le Trio est amusant.** Il est cohérent sur le papier ; personne ne l'a joué.
- **Comment le jeu tourne sur ton PC et sur un téléphone.** Aucun humain n'a encore mesuré la fluidité.
- **Ton ambition** : jeu personnel, jeu gratuit en ligne, ou jeu vendu. Le plan vise un jeu gratuit en ligne ; une vente demanderait un avis juridique et une plateforme.
- **La durée réelle des sessions.** Mon estimation vient de trois sessions seulement.
- **Si les noms proposés sont libres.** Je ne les ai pas vérifiés.

# PARTIE 12 — Sources

### Le projet

- Dépôt `zedkay37/CUBIQUEST`, tag `fondations-final` (commit 6513bfa), lu le 22 novembre 2026 : `CLAUDE.md`, `STYLE.md`, `engine/skills.ts`, `engine/damage.ts`, `engine/allies.ts`, `engine/expedition.ts`, `balance.ts`, `rules.ts`, `types.ts`, `previewConfigs.ts`, `catalog.ts`.
- Mesures : `docs/sim/02-fin-de-session-10.md` et `-40.md` (session 2), `GIGA_FONDATIONS.md` (golden master : 172, 112, 192 et 177 victoires sur 210 selon le profil et les réactions).
- Audit des termes : comptage automatique sur les 85 fichiers texte du dépôt, 22 novembre 2026.
- Calculs de progression (XP, niveau à l'arrivée de chaque niveau, Confiance par lignée) : refaits le 22 novembre 2026 à partir de `xpForNextLevel`, des 21 entrées de `STAGES` et des escouades de `previewConfigs.ts`. Modèle du système de cubes : une cible, trois sorts aux recharges réelles, 40 secondes.
- « CubiQuest, dossier de game design » (22 novembre 2026) pour les captures et les constats visuels.

### Pokémon Quest

- Noms des pierres de capacité : RPG Site, « Pokemon Quest Move Stone Guide » (rpgsite.net/feature/7420) ; Bulbapedia, « Power Stone » et « Power Charm ».
- Bouton « Scatter », île « Tumblecube Island », l'Auto qui ne se disperse jamais : Bulbapedia, « Pokémon Quest ».
- Termes français (« bouton de dispersion », « Gemmes-P », « Chaudrons », « Île Trois-Dés », paliers Classique, Bronze, Argent, Or) : Pokébip, dossier Pokémon Quest (pokebip.com).
- Recettes : Shacknews, « Cooking Ingredients and Recipes in Pokemon Quest » (shacknews.com/article/105180).
- Critiques de 2018 : Game Informer (gameinformer.com/review/pokemon-quest), Common Sense Media, Kotaku (kotaku.com/1826469110), Nintendo Life, et la synthèse de Wikipédia.

### Autres références

- Genshin Impact, noms français des réactions : Millenium, « Guide des éléments et des combos élémentaires » (millenium.org/guide/372245.html).
- PokéRogue : VideoGamer, « Fan-made roguelike that reinvents Pokémon now has over a million players » ; Dot Esports, « What is PokéRogue? ».
- Litige Nintendo contre Pocketpair (Palworld) : Windows Central, 1er octobre 2026 ; Techdirt. Consultés le 21 novembre 2026.
- Ryan, Rigby et Przybylski (2006), « The Motivational Pull of Video Games: A Self-Determination Theory Approach », *Motivation and Emotion*. Citée de mémoire.
- Claude Code, référence de la ligne de commande (code.claude.com/docs/en/cli-reference), consultée le 22 novembre 2026, pour l'option `--permission-mode auto`.

Les valeurs chiffrées du game design (durées, multiplicateurs, seuils) sont des propositions de départ construites à partir des valeurs actuelles du code. Elles n'ont pas été jouées.

FIN DU PLAN DIRECTEUR
