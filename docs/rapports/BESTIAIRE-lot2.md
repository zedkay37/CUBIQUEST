# BESTIAIRE — lot 2 (feu : Pyrocube → Flambrix → Ignisaur) — rapport

Les trois créatures sont des `.vox` sculptés dans le jeu, et la version est publiée sur …/next/ pour que tu la regardes.

## Pour revenir en arrière

- `bestiaire-lot2` : fin de ce lot.
- `bestiaire-lot1` : avant ce lot (lot 1 validé).
- Une seule créature : supprimer `src/assets/vox/<identifiant>.vox`.

`main` n'a pas bougé. Le lot 3 n'est pas commencé.

## 1. Suites de la porte A (commit à part)

- **Plafond de lueur** dans `vox:check` : 9 % de la surface, 10 % pour une créature qui sert de boss (la liste des boss vient du catalogue). Testé.
- **Bible (§4)** :
  - **Lecture vue du dessus** : forme du dos, tête qui dépasse devant le corps, lueur visible d'en haut.
  - **Stade 1** : yeux visibles en 3/4 depuis la caméra du jeu.
  - Le plafond de lueur est noté dans la bible.
- **Planches** : il y a maintenant une **vue de dessus**, en haut à droite.
- **Icône d'Aquabloc en qualité basse**.
  - **Pas reproduit** : sur 3 nouvelles captures en qualité basse, les trois icônes montrent bien le nouveau modèle (`docs/captures/bestiaire/lot2/icone/`).
  - **Cause probable** : l'icône dessinée d'attente, aux couleurs de l'espèce et qui ressemble à l'ancien modèle, s'affiche tant que la photo 3D de la créature n'est pas prête. Les photos étaient prises une par image.
  - **Correction** : plusieurs photos par image (jusqu'à 12 ms), pour qu'elles soient prêtes plus vite au début d'un combat. Ce n'est pas vérifié sur la capture d'origine, puisque le défaut ne se reproduit plus.
- **Incident découvert et corrigé** :
  - un serveur de captures resté ouvert (une capture interrompue) servait un **ancien** site ; les premières planches de ce lot montraient donc encore l'ancien modèle ;
  - je l'ai arrêté, et `tools/captures.ps1` refuse maintenant de photographier si son port est déjà pris ;
  - toutes les planches du lot ont été refaites ensuite. Les captures du lot 1 avaient été prises avant l'apparition de ce serveur.

## 2. Les créatures

**Plan de corps : « marcheur de forge ».**
- Bipède dressé, penché en avant.
- Jambes digitigrades (genou en avant, talon relevé).
- Queue lourde qui descend vers le sol, sans rien au bout.
- Avant-bras qui grossissent avec l'évolution.

Il est nettement différent de l'autre lignée de feu, Braizard → Cendrox, qui est un quadrupède bas : voir `docs/captures/bestiaire/lot2/alignement-feu-grand.png`.

**Interdits évités** : basalte sombre (pas de corps orange), pas de ventre crème, pas de flamme au bout de la queue, pas d'ailes, et pas de rangée unique de grandes plaques (les plaques sont petites et décalées sur deux rangs).

**Signature qui grandit** : cœur de braise en croix sur le poitrail, puis fissures jusqu'aux épaules et cornes d'os aux pointes de braise, puis carapace dorsale à joints de lave, cornes incandescentes et veines sur les avant-bras.

| Créature | Stade | Taille (X×Y×Z) | Lueur en surface | Cible | Triangles (haute / basse) | Essais |
|---|---|---|---|---|---|---|
| Pyrocube | 1 (trio de départ) | 12×19×17 | 3,7 % | 2–4 % | 2 228 / 1 196 | 2 |
| Flambrix | 2 | 14×25×22 | 4,1 % | 4–6 % | 3 392 / 1 810 | 2 |
| Ignisaur | final, boss | 20×29×28 | 5,2 % | 5–9 % (plafond 10 %) | 5 408 / 2 662 | 2 |

- **Pyrocube** : ses yeux jaunes se voient bien depuis la caméra du jeu, parce que son arcade ne déborde pas, comme demandé pour le stade 1. Une petite braise sur le crâne se voit d'en haut.
- **Vue de dessus** : la tête dépasse nettement devant le poitrail pour les trois. La lueur se voit d'en haut sur le crâne de Pyrocube, et sur le dos et les épaules de Flambrix et Ignisaur.

`vox:check` est vert sur les 8 fichiers (lots 1 et 2), `npm run check` passe et le golden est identique.

## 3. Planches et captures (rendu du vrai jeu)

- `docs/captures/bestiaire/lot2/planche-pyrocube-grand.png`, `planche-flambrix-grand.png`, `planche-ignisaur-grand.png`.
- `docs/captures/bestiaire/lot2/alignement-lot2-grand.png` (la lignée), `alignement-feu-grand.png` (les deux lignées de feu côte à côte).
- Combat, Cratère Ardent (volcano-2), escouade Pyrocube + Flambrix + Ignisaur contre Flambrix et Ignisaur : `docs/captures/bestiaire/lot2/jeu/combat-lot2-bureau.png` et `-bas` (qualité basse).
- Essais : `docs/captures/bestiaire/lot2/essais2/` (les planches de `essais/` montrent l'ancien site, voir l'incident).

## 4. Ce qui reste discutable

- **Sur le sol brun du volcan**, ces créatures de basalte se détachent mal (capture de combat). Le contraste vient surtout de la lave. Ce sera à juger avec l'harmonisation finale (tons, éventuellement un sol de volcan plus clair ou plus froid), pas en changeant la matière du feu que tu as validée.
- **Ignisaur** : ses avant-bras de forge se voient peu de profil, ils restent dans la masse du corps.
- **Pyrocube et Flambrix** se ressemblent (même plan, l'un plus grand). C'est voulu pour une lignée, mais la différence tient surtout aux cornes.

## 5. Vérifié / supposé / à vérifier

- **Vérifié** :
  - planches, alignements et combat capturés dans le jeu ;
  - `vox:check` ;
  - plafond de lueur ;
  - modèles déterministes ;
  - triangles.
- **Supposé** : que la photo plus rapide des portraits règle le défaut de l'icône (non reproduit).
- **À vérifier par toi** :
  - la démarche du bipède en mouvement ;
  - l'impression générale ;
  - la lisibilité sur le volcan.

## 6. Pour regarder

- Version en ligne : `…/CUBIQUEST/next/` (lien complet dans ma réponse). Le trio de départ « Braise » commence avec Pyrocube.
- Un combat direct sans toucher à ta sauvegarde : `…/next/?stage=volcano-2&squad=pyrocube,flambrix,ignisaur`.
- Une planche : `…/next/?gallery=planche&species=ignisaur`.

---

# Corrections après validation (lot 2b) — tag `bestiaire-lot2b`

1. **Contraste du feu** (Pyrocube, Flambrix, Ignisaur, Braizard, Cendrox).
   - Le corps passe en **basalte charbon** : presque noir, avec le dessus un peu plus clair pour garder le relief.
   - Il y a **plus de lave visible d'en haut** : des chevrons sur le dos, les épaules et le dessus de la tête, avec une ligne médiane en pointillé.
   - Parts de lave en surface :

     | Créature | Avant | Maintenant |
     |---|---|---|
     | Pyrocube | 3,7 % | 6,6 % |
     | Flambrix | 4,1 % | 7,5 % |
     | Ignisaur (boss, plafond 10 %) | 5,2 % | 9,0 % |
     | Braizard | 2,6 % | 6,0 % |
     | Cendrox | 5,6 % | 8,6 % |

   - Les stades 1 dépassent maintenant la fourchette de 2–4 % de la bible, comme tu l'as demandé ; ils restent sous le plafond de 9 %.
   - **La forme de Cendrox est inchangée** : un test vérifie qu'elle occupe exactement les mêmes blocs que le Calcinarque légendaire validé.
   - **Vérifié en combat** au volcan (Cratère Ardent) et à Rive Azur (sol clair) : les créatures ressortent nettement dans les deux cas. Voir `docs/captures/bestiaire/lot2b/jeu/volcan-a`, `volcan-b`, `rive-a`, `rive-b`.
2. **Ignisaur**.
   - **Posture de chasse** : tronc presque à l'horizontale, tête basse en avant, queue tendue en contrepoids à hauteur de hanche.
   - Les piques forment des **groupes séparés** : trois sur chaque épaule, deux sur le haut du dos, rien derrière.
   - Pas de ligne médiane de lave : le dos porte des taches en chevrons, et rien de continu.
   - **Avant-bras** plus gros, tendus en avant, avec des veines de lave.
   - Il passe de 28 à 24 blocs de haut et de 29 à 33 de long : il est plus long que haut, comme un prédateur.
   - Planche : `docs/captures/bestiaire/lot2b/planche-ignisaur-grand.png`.
3. **Bible** : deux règles ajoutées.
   - Le corps doit contraster avec le sol de son biome ; chaque lot se teste sur le sol de son biome ET sur un sol clair.
   - Jamais de rangée continue de piques ou de lave du cou à la queue sur une créature dressée.

**À juger** : sur Ignisaur, les taches de lave en chevrons donnent un motif tacheté. Il est lisible, mais à voir si tu l'aimes.
