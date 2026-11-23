# Rapport du sprint ART — La révolution graphique

Fiche `docs/plan/SPRINT_ART.md`, branche `art-direction`, partie de `a4-final`. `main` n'a pas bougé.

## 1. Résumé en 5 lignes

1. **Barre latérale du camp** : Expéditions, Atelier, Équipe, Carnet, Options. Survoler une entrée illumine le bâtiment, et survoler un bâtiment met son entrée en avant. Sur téléphone, elle devient une rangée d'icônes ; elle se replie et le choix est mémorisé.
2. **Constructeur « volumes → blocs »** : les trois lignées du trio Braise (9 formes) sont refaites, avec des yeux qui clignent et une version simplifiée en qualité Bas. Des règles de style sont vérifiées par un test.
3. **La Prairie devient un décor vivant** : relief en terrasses, herbe et fleurs au vent, arbres de cinq formes, mare, papillons et lucioles. La lumière est revue : ciel en dégradé, soleil rasant au camp, ombres plus fines, rayons en qualité Haut.
4. **Animation** : écrasement et étirement au saut, démarches selon la silhouette, recul et éclat de blocs aux coups, K.O. en blocs qui rebondissent, zoom bref sur le Déchaînement.
5. **Contraintes tenues** : golden identique à chaque section, aucune règle de jeu changée, tout produit par code. La page `?gallery=art` compare l'ancien et le nouveau modèle. La section 6 (modèles `.vox`), facultative, n'est pas faite.

## 2. Tags et retour arrière

| Tag | État |
| --- | --- |
| `sauvegarde-avant-art` (tag + branche) | = `a4-final`, « État du jeu avant la révolution graphique » |
| `art-avant-navigation` | = `a4-final` |
| `art-avant-creatures` | barre latérale |
| `art-avant-decor` | créatures refaites |
| `art-avant-animation` | décor de la Prairie |
| `art-avant-lumiere` | animation |
| `art-avant-comparaison` | lumière |
| `art-final` | fin du sprint |

`docs/plan/SPRINT_ART.md` était déjà commité, sans modification, depuis la session A4 : il n'y avait rien à commiter en premier sur `art-direction`.

## 3. Ce qui a changé, par section

- **Section 0 · Navigation** :
  - `components/CampNav.tsx` remplace le dock et les boutons du coin ; les Options regroupent graphismes, tremblement, son et écran titre ;
  - le survol est lié dans les deux sens : HubOverlay → App → CampNav, et CampNav → `engine.setHubHover` ;
  - choix « barre repliée » dans `settings.ts` (`navCollapsed`) ;
  - pastilles « Nouveau » et compteurs (cubes, récompenses) ;
  - la barre est le premier élément atteint au clavier.
- **Section 1 · Créatures** :
  - `models/voxelSculpt.ts` : ellipsoïdes, boîtes, capsules, cônes ; symétrie, formes soustractives, pièces mobiles (jambes, queue, ailes ou plaques, yeux) ; faces visibles seulement, ombre douce par sommet ;
  - `models/sculptDefs.ts` : Pyrocube, Flambrix, Ignisaur, Ampoulin, Bobinard, Voltacier, Cailloc, Granitox, Magmadrake ;
  - clignement des yeux toutes les 3 à 6 s, regard qui se promène au repos ;
  - qualité Bas : 9 blocs par unité au lieu de 14 ;
  - test `art.test.ts` : chaque partie fait au moins 2 blocs d'épaisseur, la tête 30 à 40 % de la hauteur, les yeux au moins 2 × 2 blocs avec un reflet blanc ; 3 à 5 couleurs ; au plus 2 500 blocs visibles (mesuré : 628 à 1 160).
- **Section 2 · Décor (Prairie et camp)** : `models/meadowDecor.ts` :
  - relief en terrasses hors de l'arène, qui reste plate ;
  - sol d'herbe sans damier, avec deux chemins de terre ;
  - herbe et fleurs instanciées qui ondulent (dans le shader) ;
  - arbres de cinq formes, buissons, rochers moussus ;
  - mare aux vaguelettes animées ;
  - papillons le jour, lucioles la nuit, pollen.
- **Section 3 · Animation** (`engine/actors.ts`, `damage.ts`, `camera.ts`) :
  - écrasement au sol, étirement en l'air, respiration au repos ;
  - démarches lourde (le corps roule), sautillante ou flottante ;
  - recul de 0,2 s après un coup, éclat de blocs de la couleur de l'élément, K.O. en 22 à 40 blocs qui rebondissent ;
  - balancement lent de la caméra, zoom de 0,9 s sur le Déchaînement.
- **Section 4 · Lumière** (`engine/artLight.ts`) :
  - dôme de ciel en dégradé, qui suit l'heure du camp ;
  - soleil qui se lève et se couche au camp ;
  - carte d'ombres 2 048 au cadre resserré qui suit la caméra ;
  - rayons de lumière en qualité Haut ;
  - étalonnage de la Prairie et du camp un peu plus chaud.
- **Section 5 · Comparaison** :
  - `?gallery=art` (`components/ArtGallery.tsx`) : ancien et nouveau modèle qui tournent, bouton « Silhouettes » ;
  - `CreatureTurntable` accepte désormais `legacy` et `silhouette`.

**Règle clé : tout ce qui est neuf n'existe que dans le navigateur.**
- `main.tsx` active les modèles sculptés et le décor.
- Les outils et le moteur headless gardent l'ancien rendu.
- Les effets aléatoires neufs ne partent que si `!self.headless`.
- La construction d'une sculpture utilise un `Math.random` à part.

C'est ce qui garde le golden identique.

## 4. Mesures avant / après

Combat de la Prairie (meadow-2, première vague), 1280 × 720, Edge headless avec GPU, lu dans `?debug=1` (captures `docs/captures/art/avant|apres/mesure-prairie-*`) :

| Qualité | Appels de dessin avant → après | Triangles avant → après |
| --- | --- | --- |
| Bas | 193 → 178 | 10 496 → 17 460 |
| Moyen | 408 → 396 | 21 014 → 116 582 |
| Haut | 605 → 607 | 31 514 → 174 906 |

- **Bas** reste aussi léger en appels de dessin, avec 1,7 fois plus de triangles : pas d'herbe, pas de fleurs, relief grossier, créatures simplifiées.
- **Moyen et Haut** ont environ 5 fois plus de triangles, chaque passe (ombres, contour, occlusion) redessinant le nouveau décor et les créatures. Les appels de dessin ne changent pas.
- **Images par seconde : non mesurées** (navigateur headless). C'est à toi de lancer `?bench=1` sur ton PC et ton téléphone ; l'Automatique descend d'un cran sous 45 images/s.

Captures avant et après, mêmes noms : camp de jour, camp de nuit, combat dans la Prairie, combat de boss dans la Prairie, les trois lignées (galerie), et `art-<espèce>` (après seulement, la page n'existait pas avant).

## 5. Valeurs de jeu modifiées

Aucune. Rayon de collision, statistiques, vagues et sorts sont inchangés. La taille affichée des créatures sculptées est multipliée par 1,18 pour garder leur présence à l'écran, sans effet sur le jeu.

## 6. Décisions prises seul

- **Lignée Feu éloignée d'une autre licence.** Une première version sculptée de Pyrocube, Flambrix et Ignisaur ressemblait trop à une lignée connue : lézard orange à flamme en goutte au bout de la queue, dragon ailé. J'ai donc :
  - gardé des corps et têtes **cubiques**, qui sont la signature de la lignée ;
  - mis une braise cubique au bout de la queue ;
  - remplacé les ailes d'Ignisaur par des **plaques de lave dorsales**, comme le dit sa description.
- **Ornements de tête** (oreilles, cornes, borne) : rangés à part, la tête mesurée sans eux pour la règle des 30 à 40 %.
- **Options** : sortis du coin supérieur droit, ils vivent dans la barre latérale.
- **Qualité Bas** : ni herbe ni fleurs ni insectes, relief grossier. Le détail est choisi dès la première scène, d'après les options ou `?quality=low`.
- **Regard « qui suit la cible »** : en combat, le corps de la créature se tourne déjà vers sa cible ; les yeux regardent donc devant elle. Au repos, ils se promènent.
- **Section 6 (`.vox`) coupée**, faute de temps (elle était facultative). Aucun modèle `.vox` fourni, aucun document `docs/art/modeles-vox.md`.

## 7. Non fait ou coupé

- **Section 6** (chargement de fichiers `.vox`).
- **Les autres biomes et les autres créatures** : hors périmètre, prévus dans un second sprint si tu valides.
- **Lisibilité des évolutions** : pas de test dédié (il n'en existait pas). Chaque forme garde les couleurs et la silhouette de sa lignée, à juger sur `?gallery=art`.

**Pas vus en mouvement** (le navigateur headless n'anime pas) :
- clignement des yeux, herbe et arbres au vent, papillons, lucioles, vaguelettes de la mare ;
- écrasement et étirement, démarches, recul, éclats et K.O. en blocs ;
- balancement et zoom de la caméra ;
- soleil qui se déplace, rayons qui tournent ;
- la barre latérale au survol (seulement sur capture fixe).

## 8. Bugs trouvés

- **La lumière du sprint plantait le jeu au démarrage** : elle était installée avant la création de la lumière principale. Les captures ont montré un écran vide. Corrigé avant le commit de la section 4.
- **La qualité Bas n'allégeait pas le décor** de la première scène : le pipeline d'effets remettait le détail en Haut au démarrage. Corrigé.

## 9. À juger par un humain

### Contrôle du propriétaire (15 minutes)

1. Le camp avec la barre latérale : comprends-tu tout de suite où aller ?
2. Un combat dans la Prairie : le jeu te paraît-il nettement plus beau ? Est-ce encore « basique » ?
3. `?gallery=art` : les trois lignées refaites sont-elles plus belles et toujours reconnaissables ?
4. `?bench=1` sur ton PC et ton téléphone : est-ce toujours fluide ?
5. Verdict : on généralise à tout le jeu, on ajuste, ou on rediscute du moteur ?

## 10. Idées

- Fusionner les pièces fixes d'une créature en une seule géométrie, et réduire les passes d'effets sur le décor (contour seulement sur les créatures, déjà le cas), pour alléger les triangles en Moyen et Haut.

## Reprise

- **Changé** : branche `art-direction`.
- **Retour arrière** : `sauvegarde-avant-art` (tag et branche), ou les tags `art-avant-*`.
- **Ne pas toucher** : `main`.
