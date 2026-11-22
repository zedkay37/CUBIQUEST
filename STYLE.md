# STYLE.md — bible de style de CubiQuest

Ce document décrit ce qui **existe** dans le jeu (relevé sur le catalogue et les modèles, session 2). Il ne fixe aucune nouveauté.
Tout nouveau contenu doit s'y conformer. Les chiffres viennent de `src/game/catalog.ts` et `src/game/voxelModels.ts`.

## 1. Créatures

### 1.1 Lignées

- 29 espèces, 10 lignées : 9 lignées à 3 stades, 1 lignée à 2 stades (Nimbulle -> Cumulord).
- Une lignée garde **le même élément** du début à la fin (vérifié par test).
- Le stade final porte `isRare: true`.
- Le rôle peut changer une fois dans la lignée (Aquabloc mêlée -> Abyssocube tank ; Voltik mêlée -> Sparkube distance), jamais deux fois.
- Niveaux d'évolution : 1er palier entre 8 et 15 (20 pour la lignée courte), 2e palier entre 16 et 26. Les lignées de fin de jeu évoluent plus tard (14–15 puis 24–26) que celles de départ (8 puis 16).

### 1.2 Construction voxel

Un modèle est un assemblage de boîtes (`makeBox`) posé sur le sol (y = 0), regard vers +Z, avec une ombre de contact ronde.

- **Volume** : le corps tient dans environ 1 x 1 x 1 unité à l'échelle 1 ; la tête ou le sommet culmine entre 1,3 et 1,9.
- **Nombre de blocs** : 11 à 18 pour les silhouettes d'origine, 14 à 30 pour celles de la Giga Update.
- **5 matériaux par créature**, toujours les mêmes rôles :
  - `primary` : masse du corps (mat) ;
  - `secondary` : pièces rapportées — carapace, oreilles, armure, segments (plus lisse) ;
  - `belly` : plaque claire du ventre ou du poitrail, toujours visible de face ;
  - `accent` : l'organe signature, légèrement lumineux — flamme, bulbe, corne, cristal, joues ;
  - `eye` : deux yeux rectangulaires sombres avec un reflet blanc carré en haut à droite.
- **Visage** : deux yeux écartés sur la face avant, pas de bouche. C'est ce qui rend toutes les créatures sympathiques, boss compris.
- **Parties animées** : `legs` (balancement à la marche) et `extras` (ailes, queue, cubes en orbite, bois, segments, filaments).

Silhouettes existantes (`CreatureArchetype`) :

| Silhouette | Lecture immédiate | Blocs | Utilisée par |
| --- | --- | --- | --- |
| `biped` | petit bipède à grandes oreilles et queue à pompon | 18 | Pyrocube, Voltik, Sparkube |
| `quadruped` | trapu à 4 pattes, bulbe sur le dos | 15 | lignée Bourgéon |
| `shelled` | debout, carapace dorsale à deux couches, ailerons d'épaule | 15 | lignée Aquabloc |
| `winged` | deux ailes articulées, crête, queue à bout lumineux | 17 | Ignisaur, Raicube |
| `horned` | large, épaulières, crête-corne lumineuse | 12 | Flambrix, lignée Cailloc |
| `floating` | cube en lévitation, trois satellites en orbite | 11 | lignée Psycube |
| `antlered` | cerf élancé, encolure dressée, bois | 20 / 23 / 30 | lignée Givrelin |
| `golem` | torse massif, petite tête enfoncée, poings énormes, cristaux dorsaux | 16 / 19 / 20 | lignée Givrock |
| `serpentine` | grosse tête, corps segmenté qui ondule, sans pattes | 14 / 18 / 21 | lignée Crépitil |
| `jelly` | dôme cotonneux flottant, filaments pendants | 16 / 21 | lignée Nimbulle |

### 1.3 Ce qui change à chaque stade

Deux écoles coexistent :

- **Lignées d'origine** : le modèle ne dépend que de la silhouette. Deux lignées changent de silhouette en évoluant (Pyrocube `biped` -> Flambrix `horned` -> Ignisaur `winged` ; Voltik/Sparkube `biped` -> Raicube `winged`), les quatre autres gardent la même. La différence entre stades vient alors de l'échelle et de la palette.
- **Lignées de la Giga Update** : même silhouette aux trois stades, enrichie par le champ `stage` — un étage de bois en plus, un segment de corps en plus, des cristaux en plus, une couronne ou des ailerons au stade final.

Constantes dans les deux cas :

- **Échelle** : base 0,95–1,04 · milieu 1,15–1,28 · final 1,32–1,50. Les tanks sont en haut de chaque plage.
- **Palette** : elle fonce ou se sature à chaque stade ; le stade final adopte souvent une teinte inattendue (Ignisaur prend un secondaire bleu-vert, Aetherion devient presque blanc, Tempestrix passe du jaune au bleu nuit, Cumulord du blanc au gris orage).
- **Yeux** : sombres ; quatre stades finaux ont des yeux clairs ou lumineux (Magmadrake, Glaciatitan, Tempestrix, Cumulord).

### 1.4 Palettes par élément

Couleur d'interface de chaque élément (`ELEMENT_META`) et teintes de corps observées :

| Élément | Couleur UI | Corps (`primary`) | Accent |
| --- | --- | --- | --- |
| Feu | `#E85D3F` | rouges orangés `#EF6442` -> `#DC4329` | jaune flamme `#FFDC4A` |
| Eau | `#2F8CE8` | bleus `#4DA6E8` -> `#2661A8` ; glace très pâle `#DCEFFA` | cyan clair `#8CE0FF`, `#67E8F9` |
| Plante | `#35A85C` | verts `#55B87B` -> `#39916E` | vert tendre puis rose fleur `#F06584` |
| Foudre | `#E5B324` | jaunes dorés `#F5C936` -> `#EFA92C` | rouge joue `#E8523F`, puis bleu électrique `#38BDF8` |
| Roche | `#A98359` | gris-bruns `#9E8C7A` -> `#4B3E3B` ; gris-bleu glacé `#9FB6C9` | ambre `#E0B86A` -> lave `#FF6B2B` ; glace `#7DD3FC` |
| Psy | `#9B5CE5` | violets `#A87CE8` -> `#8A5AD6` ; lavande pâle `#E9E4FB` | turquoise `#5EEAD4`, or `#F4C95D` |

Le ventre (`belly`) est toujours une version très claire du corps ou un crème chaud. Le secondaire est soit un ton plus foncé du corps, soit un brun/anthracite neutre.

### 1.5 Noms

- 6 à 12 lettres : 6–8 au stade de base, 8–10 au milieu, 7–12 au final.
- Mots-valises français, souvent autour de « cube / bloc » pour les lignées d'origine : Pyro**cube**, Aqua**bloc**, Psy**cube**, Luna**bloc**, Abysso**cube**, Rai**cube**, Spark**ube**.
- Les stades suivants montent en gravité avec des suffixes sonores : `-ix` (Flambrix, Corallix, Tempestrix), `-ox` (Granitox), `-saur`, `-drake`, `-liath`, `-titan`, `-lord`, `-ion`.
- Les lignées récentes partent d'un mot de nature : Givr**elin**, Ramur**gel**, Aurora**mure**, Crépit**il**, Serpé**clair**, Nimb**ulle**.
- Accents français autorisés dans le nom affiché ; identifiant en minuscules sans accent (`bourgeon`, `serpeclair`).
- Jamais de nom repris d'un autre jeu ni de calque évident.

### 1.6 Textes de créature (`dexNote`)

Une seule phrase, 80 à 110 caractères, au présent, ton tendre et légèrement amusé. Elle raconte une habitude concrète ou un lien avec le camp, pas des statistiques.
Exemples : « Sa queue cubique crépite plus fort lorsqu'une bonne marmite mijote au camp. » · « Il se love autour des paratonnerres pour faire la sieste et se réveille chargé à bloc. »
Le stade final a une phrase plus solennelle, de l'ordre de la légende locale.

### 1.7 Statistiques

Trois rôles : `melee` (mêlée), `ranged` (distance), `tank`.

| Stade | Rôle | PV de base | ATQ de base | Vitesse | Portée | PV + ATQ |
| --- | --- | --- | --- | --- | --- | --- |
| base | mêlée | 110–150 | 115–140 | 4,6–5,3 | 2,6–3,2 | 250–280 |
| base | distance | 115–135 | 135–150 | 4,7–5,4 | 5,8–6,4 | 250–270 |
| base | tank | 155–180 | 105–110 | 4,0–4,4 | 2,5–2,7 | 260–290 |
| milieu | mêlée | 215–230 | 185–205 | 4,8–5,1 | 2,9–3,0 | 400–435 |
| milieu | distance | 170–195 | 215–245 | 4,9–5,5 | 5,8–6,8 | 390–440 |
| milieu | tank | 235–290 | 170–195 | 4,1–4,5 | 2,8–3,0 | 405–485 |
| final | mêlée | 345 | 300 | 5,2 | 3,4 | 645 |
| final | distance | 255–320 | 330–375 | 5,0–5,6 | 6,4–7,4 | 595–695 |
| final | tank | 335–420 | 250–295 | 4,2–4,5 | 3,3–4,8 | 605–710 |

Lecture : le total PV + ATQ est d'environ 250–290 au stade de base, 390–485 au milieu, 595–710 au final. Les tanks ont le total le plus haut de leur stade, les créatures à distance le plus d'attaque et le moins de PV. La vitesse et la portée ne montent que de 0,1 à 0,4 par stade.

## 2. Sorts

21 sorts. Cinq styles (`MoveStyle`) :

| Style | Multiplicateur | Recharge | Portée | Zone | Emploi |
| --- | --- | --- | --- | --- | --- |
| `melee` | 1,95–2,1 | 4,2–4,9 s | 4,0–4,4 | 2,8–3,0 | coup en arc autour du lanceur |
| `dash` | 1,9–2,0 | 4,0–4,4 s | 6,5–7,0 | 2,3–2,5 | charge jusqu'à la cible |
| `projectile` | 1,85–2,4 | 4,5–6,0 s | 8,5–10 | 2,0–2,8 | tir qui éclate au contact |
| `aoe` | 2,3–2,65 | 6,0–6,8 s | 4,2–7,5 | 3,8–4,8 | grande zone (portée > 5,5 : centrée sur la cible) |
| `buff` | 0,9 | 6,5–6,8 s | 3,5 | 5,0 | soin + défense du lanceur, partageable |

- Les deux premiers stades d'une lignée partagent en général un sort « simple » (mêlée, ruée ou projectile, recharge 4–5 s) ; le stade final reçoit un sort de zone plus puissant (recharge 6–7 s).
- Un sort a l'élément de la lignée qui le porte.
- Nom en deux mots, imagé, avec majuscules (« Fouet Lianes », « Hydro-Rafale », « Fracas Glaciaire »). Description en une phrase à l'infinitif ou au présent, 60 à 90 caractères.
- Couleur : une teinte vive de l'élément (voir tableau des palettes).

## 3. Biomes et niveaux

### 3.1 Structure

- 6 biomes, **3 niveaux chacun**, joués dans l'ordre ; finir un niveau ouvre le suivant.
- Chaque niveau a **3 vagues** : deux vagues de 3 ennemis, puis une vague avec 1 ennemi d'escorte et le boss.
- IA disponibles : `chaser` (poursuite au contact), `kiter` (garde ses distances et tire), `charger` (télégraphe en ligne puis ruée), `boss`.
- Les niveaux d'ennemis montent d'environ +3 par niveau de jeu ; le boss a 2 à 3 niveaux de plus que son escorte.
- Le boss du 3e niveau d'un biome est le stade final d'une lignée emblématique du biome et a **3 phases** ; les autres boss en ont 2. Le boss est une espèce normale, agrandie (x1,48).
- Butin : 3 ou 4 ingrédients par niveau (dont ceux du biome), une plage de puissance de Pierres, de l'XP. Tout croît régulièrement d'un niveau au suivant.
- Les vagues mêlent les espèces du biome et des visiteurs d'autres biomes (jamais un seul élément).

### 3.2 Identité visuelle d'un biome

Un biome est défini par : une couleur de ciel, de brume, deux teintes de sol en damier, une couleur d'accent, une couleur de « mer » ; un habillage de décor (`BIOME_DECOR` : falaise, écume, nuages, troncs, houppiers, rochers) ; une météo (`WEATHER_PROFILES`) ; un éclairage (`BIOME_LIGHTING`).

| Biome | Élément | Ciel / sol | Décor du pourtour | Météo |
| --- | --- | --- | --- | --- |
| Prairie Émeraude | Plante | bleu clair / verts | arbres feuillus, rochers gris | pollen qui dérive |
| Rive Azur | Eau | bleu très clair / sable | arbres vert d'eau, rochers gris | embruns obliques |
| Crête Volcanique | Feu | brun sombre / basalte | souches calcinées étirées, roches rougeoyantes, mer de lave | braises qui montent |
| Sanctuaire Cristallin | Psy | violet nuit / pierre mauve | cristaux hauts et fins, mer astrale | éclats qui flottent |
| Toundra Boréale | Eau | bleu crépuscule / neige | sapins enneigés, flèches de glace, congères, étangs gelés, igloo, aurores | neige |
| Cime des Orages | Foudre | gris ardoise / dalle grise | piliers à paratonnerres dorés, monolithes à runes, rochers en lévitation, anneau de nuées | pluie battante, foudre au loin |

Règles communes : l'arène centrale reste dégagée (rayon ~15), le décor vit sur le pourtour ; tout ce qui se répète est instancié ; les deux biomes récents ajoutent un décor « signature » animé très légèrement.

### 3.3 Boss

Attaques télégraphiées existantes (une zone colorée au sol, puis l'impact) :

- communes (`classic`) : Frappe circulaire (+ projectiles en éventail dès la phase 2), Double charge en croix, Pluie de météores ;
- kit `frost` : Anneau de Givre (zone sûre au contact du boss), Contrecoup central, éclats en étoile ;
- kit `storm` : Foudre en Rafale (impacts en ligne), Œil du Cyclone (aspiration puis détonation).

Un nouveau boss se compose en choisissant un kit existant ; il ne reçoit pas d'attaque inédite.

## 4. Marmite

- 12 ingrédients : 4 couleurs (rouge, bleu, jaune, gris), 3 raretés (commun, rare, mystique). Chaque biome récent apporte 2 ingrédients (1 commun, 1 rare).
- 16 recettes. Une recette = un nom de plat, une couleur de soupe, 1 à 3 expéditions de cuisson, un indice en clair, un vivier de 3 à 7 espèces.
- Schéma des viviers : recette d'élément ou de lignée = les 3 stades de la lignée, du plus commun au plus rare (les marmites d'argent et d'or favorisent la fin de liste) ; recette « débutant » = 4 à 6 espèces de base ; recette « d'élite » = 6 ou 7 stades avancés.
- Noms de plats : cuisine familière + touche d'élément ou de lieu (« Soupe Ardente », « Tajine Tonnerre », « Meringue Céleste »).

## 5. Ton des textes

- Français, vouvoiement du joueur dans l'interface (« Placez 5 ingrédients », « Préparez l'Esquive ! »).
- Registre chaleureux et clair, jamais ironique ni sombre. Vocabulaire du camp, de la cuisine et de l'exploration.
- Annonces de combat en capitales avec point d'exclamation (« ALERTE BOSS ! », « TRIO ! », « DÉCHAÎNEMENT ! »).
- Consignes de boss : nom de l'attaque, tiret, action à faire (« Anneau de Givre — collez-vous au boss ! »).
- Typographie française : espace avant `!` `?` `:`, guillemets « », apostrophe courbe dans les textes du catalogue.
- Noms propres avec majuscules à chaque mot pour les lieux, plats et sorts (« Trône de la Banquise », « Rune de Précision »).

## 6. Interface

- Panneaux sombres bleu ardoise (`#181E2A`, bordure `#39445A`), texte crème `#FAF7F0`, texte secondaire `#B8C2D1`.
- Trois accents : corail `#E85D3F` (action principale), or `#F4B942` (valeurs, récompenses, sélection), vert `#2FB97A` (soin, succès).
- Polices : Bricolage Grotesque (titres), Plus Jakarta Sans (texte), JetBrains Mono (chiffres).
- Boutons « voxel » : bord épais, ombre portée dure de 3 px qui s'écrase au clic.
- L'interface occupe le pourtour de l'écran ; le centre reste à la scène 3D.

## 7. Ajouts de la session 2 (conformes aux sections ci-dessus, vérifiés par `style.test.ts`)

Les sections 1 à 6 décrivent l'état du jeu AVANT ces ajouts ; elles restent la référence.

| Silhouette | Lecture immédiate | Blocs | Utilisée par |
| --- | --- | --- | --- |
| `fungal` | pied crème, grand chapeau à trois étages et pastilles lumineuses | 17 / 26 | Mycélin → Amanitox (Plante) |
| `crab` | carapace large et basse, yeux sur tiges, deux pinces ouvertes, six pattes | 21 / 28 | Crabloc → Crabastion (Eau) |
| `lizard` | corps long au ras du sol, crête de flammes, queue à bout ardent | 18 / 25 | Braizard → Cendrox (Feu) |
| `ram` | trapu, sans encolure, grosses cornes d'ambre enroulées | 20 / 23 / 30 | Chevrok → Mouflambre → Bélithan (Roche) |

- 7e biome : **Canyon d'Ambre** (Roche) — ciel chaud, sol ocre, cheminées de fée, mesas à strates, arches, cristaux d'ambre, côtes fossiles ; sable porté par le vent. Kit de boss `amber` = Anneau + Aspiration + attaques communes, habillés en roche, statut Brise-Armure.
- Les plages chiffrées de STYLE.md existent aussi sous forme vérifiable dans `src/game/styleGuide.ts`.
