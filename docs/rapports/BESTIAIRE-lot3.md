# BESTIAIRE — lot 3 (eau : Crabloc → Crabastion, Givrelin → Ramurgel → Auroramure) — rapport

Les cinq créatures sont des `.vox` sculptés dans le jeu. Tout est publié sur …/next/.

## Pour revenir en arrière

- `bestiaire-lot3` : fin de ce lot.
- `bestiaire-lot2b` : avant ce lot (corrections du lot 2 incluses).
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox`.

`main` n'a pas bougé. Le lot 4 n'est pas commencé.

## 1. Les créatures

L'eau compte maintenant **trois plans de corps** différents :
- le bœuf de récif (Aquabloc, lot 1), trapu ;
- le **crabe de roche**, large et bas ;
- le **coureur des glaces**, haut sur pattes, avec un long cou.

On les voit côte à côte sur `docs/captures/bestiaire/lot3/alignement-eau-grand.png`.

**Crabe de roche (Crabloc → Crabastion)**
- Carapace ovale de roche de récif.
- **Deux pinces égales** (pas une pince géante).
- Trois pattes de chaque côté, écartées vers l'extérieur.
- Yeux sur de courts pédoncules, visibles d'en haut et depuis la caméra du jeu.
- Pas de rouge-orangé, pas d'objet fabriqué.
- **La signature grandit.** Crabloc : joint lumineux au bord de la carapace. Crabastion : pinces massives, et **aiguilles de roche en groupe** sur la carapace, veinées de turquoise.

**Coureur des glaces (Givrelin → Ramurgel → Auroramure)**
- Pattes fines et hautes, long cou qui porte la tête en avant (elle dépasse nettement vue du dessus), queue courte.
- **Bois de glace balayés vers l'arrière comme des lames, jamais dressés en couronne**, et pas multicolores.
- **La signature grandit** : deux pointes de glace, puis des bois à une branche et du givre sur les épaules, puis des bois à deux branches au cœur d'aurore et une crinière d'éclats en groupes.
- Palette « glace » : l'ardoise et la lueur de l'eau, avec un bois bleuté à la place de la nacre.

| Créature | Stade | Taille (X×Y×Z) | Lueur | Triangles (haute / basse) | Essais |
|---|---|---|---|---|---|
| Crabloc | 1 | 20×16×15 | 4,0 % | 2 312 / 1 168 | 2 |
| Crabastion | final | 20×23×24 | 7,5 % | 4 848 / 2 314 | 2 |
| Givrelin | 1 | 12×20×17 | 4,1 % | 2 056 / 1 000 | 2 |
| Ramurgel | 2 (boss tundra-1, plafond 10 %) | 12×24×21 | 5,0 % | 2 744 / 1 208 | 2 |
| Auroramure | final | 14×27×28 | 7,2 % | 3 824 / 1 644 | 2 |

`vox:check` est vert sur les 13 fichiers (lots 1 à 3), `npm run check` passe et le golden est identique.

**Décision** : les anciennes Givrelin et Crépitil dépassaient les limites de la bible (33 blocs de haut pour Auroramure). Les nouvelles rentrent dedans : 28 au plus.

## 2. Contraste (nouvelle règle de la bible)

Combats capturés **sur le sol du biome et sur un sol clair**, plus un sol sombre pour être complet. Captures dans `docs/captures/bestiaire/lot3/jeu/` :

| Capture | Sol | Résultat |
|---|---|---|
| `rive-bureau.png` | Rive Azur, sol clair (biome des crabes) | les crabes et Auroramure ressortent nettement |
| `volcan-bureau.png` | volcan, sol sombre | ils ressortent, l'ardoise bleue contraste avec le brun |
| `toundra-bureau.png` | toundra (biome du coureur des glaces) | **toute la scène est noyée dans la brume et la neige du biome**, les anciens modèles ennemis aussi. Nos créatures se devinent à peine |
| `toundra-bas-bureau.png` | toundra, qualité basse | moins de brume, à comparer |

**Le problème de la toundra vient du biome** (brouillard et chute de neige très denses), pas des modèles : sur le sable clair, Auroramure ressort bien. Le corriger demanderait de toucher au décor du biome, ce qui sort de ce sprint. Je te pose la question ci-dessous.

## 3. Planches

- Une planche par créature : `docs/captures/bestiaire/lot3/planche-<identifiant>-grand.png`.
- Alignement de la lignée : `alignement-lot3-grand.png`. Alignement de toute l'eau (lots 1 et 3) : `alignement-eau-grand.png`.
- Essais : `docs/captures/bestiaire/lot3/essais/`. Au premier essai, les pattes des crabes descendaient droit comme des piliers (on aurait dit une table) ; je les ai écartées.

## 4. Ce qui reste discutable

- **Crabastion de profil** : les aiguilles de roche forment un bouquet au milieu de la carapace. En silhouette, elles peuvent se lire comme une crête. Ce n'est pas une rangée qui va du cou à la queue, mais à surveiller.
- **Coureur des glaces** : un cervidé aux bois de glace reste un thème courant dans le genre. Les bois en lames tournées vers l'arrière, sans couronne ni couleurs d'arc-en-ciel, l'en éloignent ; à juger par toi.
- **Crabloc** : la croûte claire du dessus de la carapace contraste moins sur le sable clair que le corps sombre du feu.

## 5. Vérifié / supposé / à vérifier

- **Vérifié** :
  - planches, alignements et combats capturés dans le jeu, sur trois sols ;
  - `vox:check` ;
  - plafond de lueur ;
  - triangles.
- **À vérifier par toi** :
  - les démarches en mouvement (crabe à six pattes, cervidé) ;
  - l'impression générale ;
  - la toundra.

## 6. Questions pour toi

1. Lot 3 validé ? Sinon, qu'est-ce qu'on corrige ?
2. **Toundra** : on allège la brume et la neige du biome pour que les créatures se lisent (c'est hors de ce sprint, donc il me faut ton accord), ou on éclaircit plutôt le corps de la lignée des glaces ?
3. Lot 4 (plante : Bourgéon → Feuilloc → Bourgéoliath, Mycélin → Amanitox) : je le lance à ton signal.
