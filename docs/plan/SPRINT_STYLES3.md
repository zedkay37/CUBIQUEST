# SPRINT STYLES 3 : un légendaire agressif comme deuxième référence

Fiche hors plan directeur, à exécuter par Claude Code en autonomie.
Les règles communes de PLAN_DIRECTEUR.md et de SPEC_ATELIER.md s'appliquent.
C'est une **exploration** : le jeu ne change PAS. Seule la page `?gallery=styles` grandit.

## Pourquoi

Le joueur a étudié les 20 styles de Magmadrake. Constat : Magmadrake est réussi, mais il fait **trop mignon et trop enfantin** pour une créature rare, très forte, en dernière évolution (silhouette d'ours assis). Le joueur veut une deuxième référence : **un légendaire agressif, détaillé, pas enfantin**, du niveau d'intimidation des grands monstres de fin de lignée des jeux du genre, et le voir dans les 20 styles pour choisir.

Ce qui change par rapport aux sprints précédents : jusqu'ici, toutes les créatures suivaient des proportions « mignonnes » (grosse tête, gros yeux). Pour les légendaires, on teste des proportions adultes. Les formes de base pourront rester mignonnes : une lignée qui devient plus menaçante en évoluant est un choix voulu.

## Sauvegarde

1. Partir de `styles2-final`. S'il n'existe pas, partir du dernier commit de la branche `styles-2`, et le noter.
2. Poser et pousser le tag `sauvegarde-avant-styles3` et une branche du même nom ; vérifier avec `git ls-remote`.
3. Créer la branche `styles-3` et y commiter en premier `docs/plan/SPRINT_STYLES3.md`.
4. Tag `styles3-avant-<section>` poussé avant chaque section, `styles3-final` à la fin.
5. Ne pas toucher à `main`. Golden master identique.

## Section 1 : créer le légendaire Calcinarque

**Concept** (nom de travail, modifiable) : **Calcinarque**, légendaire Feu, prédateur volcanique.

- **Corps** : quadrupède massif, en posture de charge, tête basse et projetée vers l'avant, épaules hautes et larges, arrière-train plus bas. Il n'a **pas d'ailes** : c'est voulu, pour ne pas ressembler à un dragon de feu connu.
- **Tête** : petite par rapport au corps (environ 20 à 25 % de la hauteur, contre 45 à 50 % pour les formes mignonnes). Mâchoire lourde avec des crocs visibles, deux cornes d'obsidienne qui pointent vers l'avant comme des lances.
- **Yeux** : étroits, fendus, lumineux, sans grand reflet blanc. Pas de gros yeux ronds.
- **Dos** : une crête de cristaux de magma en pointes, de taille décroissante vers la queue.
- **Queue** : longue, qui se termine par une masse de lave refroidie, fissurée et lumineuse.
- **Pattes** : griffes noires visibles, pattes avant plus puissantes que les arrière.
- **Surface** : roche de basalte sombre, plaques irrégulières, fissures de lave orange vif qui suivent le corps, quelques cicatrices.
- **Palette** : basalte presque noir, gris-brun, obsidienne brillante, lave orange et jaune. Trois à quatre couleurs au maximum.
- **Taille** : environ 1,6 fois la hauteur de Magmadrake, et nettement plus long que haut.

**Règles anti-enfantin** (critères de réussite) :
1. La silhouette noire, de profil, doit lire « prédateur » : pointes, angles, inclinaison vers l'avant. Elle ne doit pas être ronde.
2. Aucune rondeur « peluche » : arêtes et pointes dominent.
3. Proportions adultes : petite tête, gros torse.
4. Posture dynamique, jamais assise.
5. Asymétrie légère permise (une corne ébréchée, une cicatrice).

**Anti-plagiat** : ne pas reprendre l'apparence d'une créature existante connue (pas de dragon ailé orange à flamme au bout de la queue, pas de chien-lion légendaire connu, etc.). En cas de doute, pousser vers le côté « bête de basalte » plutôt que « dragon ».

Animation de repos simple : respiration lente, la lave des fissures pulse doucement, la queue balance un peu.

## Section 2 : Calcinarque dans les 20 styles

- Décliner Calcinarque dans les 20 styles A à T, avec les mêmes définitions que pour Magmadrake (A = construction de base, comme ART 3 ; B gros blocs ; C voxel moyen cohérent ; … ; T aquarelle).
- Adapter seulement l'échelle de voxel à sa grande taille, pour que chaque style garde la même finesse relative.

## Section 3 : la page `?gallery=styles`

- Ajouter en haut un sélecteur de créature : **Magmadrake / Calcinarque**. Tout le reste (vitrine, en jeu, comparaison, interrupteurs, favoris, plein écran) marche pour les deux.
- Dans la comparaison, permettre aussi « Magmadrake style X / Calcinarque style Y ».
- Les favoris sont mémorisés séparément pour chaque créature, et « Copier mon choix » indique les deux.
- En vue « En jeu », Calcinarque apparaît à sa vraie taille (1,6 fois Magmadrake).
- Corriger le problème d'affichage constaté : quand la fenêtre est étroite ou zoomée, la grille déborde à droite et les cases du bord sont coupées. La grille doit s'adapter à la largeur (moins de colonnes si besoin).
- Ajouter un bouton « Vue de face » qui arrête la rotation et tourne toutes les créatures face à la caméra (et « Reprendre la rotation »).

## Section 4 : rapport et publication

- Captures de Calcinarque dans les 20 styles, de face et de profil, en vue Vitrine avec tons neutre, plus une planche unique, dans `docs/captures/styles3/`.
- Une capture de la silhouette noire de profil, à côté de celle de Magmadrake.
- Rapport `docs/rapports/STYLES3.md` : ce qui a été fait, coût de chaque style, ce qui n'a été vu que sur image fixe. NE PAS désigner de gagnant.
- `npm run check`, golden identique, publication sur …/next/ avec `npm run deploy:pages -- --target next`.
- Terminer par un résumé en 5 lignes.

## Hors de ce sprint

- Ajouter Calcinarque au jeu (Atelier, combats, Carnet).
- Appliquer un style au jeu.

FIN DU SPRINT STYLES3
