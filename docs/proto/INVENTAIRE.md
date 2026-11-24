# PROTO-MENEUR — phase 0 : l'inventaire

1. **Rendu et style F** : réutilisables tels quels. `buildAnyStyle('F', id)` (page `?gallery=styles`) construit n'importe quel `.vox` en toon à contour noir ; `setNight` sert de lueur ponctuelle.
2. **Chargeur .vox** : réutilisable (`parseVox`, `voxToSculptDef`, `loadVoxSubject` ajouté dans `voxSubjects.ts`). Aucune créature nouvelle.
3. **Caméra** : celle du jeu (`engine/camera.ts`) est liée au moteur et à l'escouade ; la maquette a sa propre caméra qui suit le Meneur (20 lignes).
4. **Code de combat** : non réutilisable sans risque. Le moteur (`VoxelEngine`) pilote une escouade automatique, et tout objet créé change le golden. La maquette a donc sa propre simulation pure (`src/proto/sim.ts`), à graine fixe.
5. **Attaques annoncées** : la grammaire est reprise (disque, couronne, bande ; couleur `DANGER`, hachures, remplissage, contour qui clignote), mais pas le code de `telegraphs.ts`, lié au moteur.
6. **Esquive** : même idée que le jeu (invulnérable un court instant), écrite à part.
7. **Isolation** : page `?proto=salle` routée dans `main.tsx` avant tout le reste. Elle ne monte pas `App`, ne lit pas les options et ne touche pas au localStorage (vérifié par une trace de tous les accès : aucun).
8. **Publication `/proto/`** : simple. `gh-pages` est rangée par dossiers ; j'ai ajouté une cible `proto` à `tools/deploy.mjs`, qui ne remplace que le dossier `proto/`. La cible `root` garde désormais `next/` et `proto/`.
9. **Sauvegarde** : le build `/proto/` utilise `VITE_SAVE_SLOT=proto`. La maquette ne garde que son historique, sous la clé `cubiquest_proto_resultats`.
