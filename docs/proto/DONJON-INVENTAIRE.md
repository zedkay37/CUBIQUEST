# PROTO-DONJON — phase 0 : inventaire et architecture

1. **Repris tel quel** :
   - la simulation rejouable de PROTO-MENEUR (`src/proto/sim.ts`, graine fixe, sans DOM), qui sert aussi aux robots ;
   - les attaques annoncées (disque, couronne, bande) et leur dessin, les versions A et B, l'Élan, le bond.
2. **Généralisé** : le terrain devient une interface `Level` (collisions, chemins, hauteur, mise à jour). La salle de PROTO-MENEUR en est un (`SALLE`, `?proto=salle` inchangé), l'étage de donjon en sera un autre.
3. **Ajouté dans la simulation**, utilisé par les phases suivantes :
   - schémas de contrôle 1, 2, 3 (cible désignée, aller au point, tir) et Meneur au choix ;
   - ennemis qui dorment ou errent, réveil par groupe ;
   - Soigneur à bouclier frontal, Blindé, Fournaise interruptible ;
   - recrutement ;
   - l'équipe suit le Meneur en file, sur sa traînée.
4. **Robots** : ceux de PROTO-MENEUR restent ; ceux du donjon connaîtront la carte (escalier) et l'auto-attaque.
5. **Réglages** (`src/proto/donjon/settings.ts`) :
   - lus dans l'URL, modifiés par le panneau F1, recopiés dans les résultats ;
   - aucune clé de stockage n'est utilisée.
   - La graine, la composition, le Meneur et la densité relancent la descente, sans recharger la page ; le reste s'applique en direct.
6. **Graine** : affichée en jeu et modifiable dans le panneau. La même graine redonne le même donjon (génération pure, testée).
7. **Isolation** :
   - le jeu actuel et son golden ne voient rien ;
   - `/proto/` sans paramètre ouvrira le donjon (et non plus le jeu complet) ;
   - `?proto=salle` reste disponible.
