# Audit de l'interface — avant le sprint UI

Captures : `docs/captures/ui/avant/<écran>-bureau.png` (1280 × 720) et `<écran>-mobile.png` (360 × 640), prises avec Edge sans interface (rendu logiciel) depuis le site construit. Les écrans sans accès direct ont reçu un paramètre de développement `?ui=` (aucune sauvegarde lue ni écrite).

Constat commun : tous les panneaux sont la même boîte (`.voxel-panel` : fond ardoise translucide, bordure grise de 2 px, ombre floue), tous les boutons le même rectangle arrondi avec une ombre de 3 px. Rien ne rappelle les blocs voxel des créatures. La couleur des éléments n'apparaît que dans de petites icônes.

| Écran | Ce qui fait « générique » | Ce qui change |
| --- | --- | --- |
| Titre | Logo correct ; boutons plats, aucune mise en scène | Bouton « Jouer » en bloc principal, le trio reste visible derrière |
| Choix du départ | Trois cartes rectangulaires identiques, texte dense | Grandes `CreatureCard` à bordure d'élément, badge d'élément |
| Camp (jour, nuit) | Dock de cinq boutons plats identiques, sous-titres gris | Boutons en bloc qui s'enfoncent, pastilles « Nouveau » qui pulsent |
| Carte des expéditions | Onglets de biomes en ligne, liste de niveaux en rectangles : rien d'une carte | Biomes reliés par un chemin, étoiles sous chaque niveau, verrous grisés, détail du niveau en panneau bloc |
| Équipe | Liste dense ; **sur mobile le tiroir déborde à droite (texte et boutons coupés)** | Cartes de créature en bloc, colonne unique sur mobile |
| Marmite, Quêtes, Codex | Mêmes boîtes, beaucoup de texte | Nouveaux composants seulement (écrans appelés à disparaître) |
| Combat | HUD lisible mais cartes de sorts plates ; Esquive et Déchaînement de même poids que le reste | Cartes de sorts en bloc à liseré d'élément, gros boutons en bloc pour Esquive et Déchaînement |
| Pause | Boîte et trois boutons plats | `Modal` en bloc, `BlockButton` |
| Victoire | Étoiles fixes, chiffres fixes, deux boutons de même poids | Étoiles qui tombent une à une, chiffres qui défilent, récompenses en cascade, « Suivant » mis en avant, montée de niveau visible |
| Défaite | Rouge et texte d'encouragement | Écran calme, ce qui a manqué en gros, « Réessayer » mis en avant |
| Évolution | Scène 3D réussie, fin abrupte | Seconde finale « avant → après », les deux formes côte à côte |

Écrans non capturables directement : combat de boss (le navigateur sans interface n'avance pas le combat) ; arrivée d'une créature à la marmite (demande une cuisson terminée). Ils sont montrés dans la galerie `?gallery=ui`.
