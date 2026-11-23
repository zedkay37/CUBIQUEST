/**
 * Tous les textes visibles par le joueur, en français.
 *
 * Organisation : `ui.<composant>` (interface), `engine` (bannières et textes flottants du combat),
 * `rules` (messages des règles), `balance` (annonces des attaques de boss),
 * `catalog.<TABLE>.<id>` (noms et descriptions du contenu).
 * Les clés ont été générées à partir du texte lors de la centralisation : elles peuvent être
 * renommées librement, seul le texte compte.
 *
 * Un texte à trous est une fonction : `(a, b) => `...${a}...``, les arguments suivant l'ordre du texte.
 * Ce module ne contient que des données : il n'importe rien.
 * `npm run texts` liste les textes restés en dur dans l'interface.
 */
/**
 * Les noms propres du jeu, à UN seul endroit : les changer ici les change partout (textes, onglet du
 * navigateur, nom du fichier de sauvegarde exporté). Seuls le nom du paquet npm et l'adresse du dépôt
 * les répètent. Le titre ne change pas avant la session S17 ; « Cubin » est provisoire.
 */
/** Titre du jeu, en deux moitiés : le logo les colore séparément. */
export const GAME_TITLE_PARTS = ['Cubi', 'Quest'] as const;
export const GAME_TITLE = GAME_TITLE_PARTS.join('');
/** Nom du monde, sans article puis avec (« sur l’Île aux Cubes », « de l’Île aux Cubes »). */
export const WORLD_NAME_BARE = 'Île aux Cubes';
export const WORLD_NAME = `l’${WORLD_NAME_BARE}`;
/** Nom commun des créatures. */
export const CREATURE_NOUN = { singular: 'Cubin', plural: 'Cubins' } as const;
/** Titre complet : onglet du navigateur, logo. */
export const GAME_FULL_TITLE = `${GAME_TITLE} : L’${WORLD_NAME_BARE}`;

export const FR = {
  ui: {
    /** Moments forts (src/components/ui/moments.tsx). */
    moments: {
      arrivee: (a: string | number) => `Arrivée de ${a}`,
      nouvelleCreature: 'Nouvelle créature !',
      ajouteeAuCarnet: 'Ajoutée au Carnet',
      toucheOuClic: 'Une touche ou un clic pour continuer',
      avantApres: (a: string | number, b: string | number) => `${a} est devenu ${b}`,
      nivDe: (a: string | number) => `Niv. ${a} →`,
      deblocage: (a: string | number) => `${a} s’ouvre`,
      nouveauNiveau: 'Nouveau niveau ouvert',
      ceQuiAManque: 'Il restait au boss',
      vaguesTenues: (a: string | number, b: string | number) => `Vagues tenues : ${a} sur ${b}`,
      calme: 'Pas de panique : chaque essai fait progresser l’escouade.',
    },
    /** Bibliothèque de composants (src/components/ui). */
    components: {
      niv: (a: string | number) => `Niv. ${a}`,
      pv: "Points de vie",
      xp: "Expérience",
      nouveau: "Nouveau",
    },
    /** Mot du Déchaînement selon l'élément du meneur (bouton, écran d'équipe). */
    ultimateWords: {
      fire: 'Explosion',
      water: 'Triple coup',
      grass: 'Soin',
      electric: 'Étourdissement',
      rock: 'Bouclier',
      psychic: 'Recharges',
    },
    /** Effet du Déchaînement selon le meneur (écran d'équipe). */
    ultimateEffects: {
      fire: 'Dégâts renforcés sur tous les ennemis.',
      water: 'Trois coups sur l’ennemi le plus solide.',
      grass: 'Dégâts sur tous, et l’escouade récupère 30 % de ses PV.',
      electric: 'Dégâts sur tous, et ils sont étourdis 2 s (1 s pour un boss).',
      rock: 'Dégâts sur tous, et bouclier de 35 % des PV pour chaque allié.',
      psychic: 'Dégâts sur tous, et les trois sorts sont prêts.',
    },
    /** Navigation du camp (sprint Art, section 0). */
    nav: {
      titre: 'Lieux du camp',
      expeditions: 'Expéditions',
      atelier: 'Atelier',
      team: 'Équipe',
      carnet: 'Carnet',
      options: 'Options',
      replier: 'Replier la barre',
      deplier: 'Déplier la barre',
      sonActif: 'Son : activé',
      sonCoupe: 'Son : coupé',
      vent: (a: string | number) => `Vent : ${a}`,
      vents: { normal: 'Normal', soft: 'Doux', off: 'Coupé' },
    },
    /** Hub cliquable du camp (A3.1). */
    hub: {
      lieux: { map: 'Panneau de l’île : expéditions', atelier: 'Atelier : Cubes Scellés', team: 'Tente : équipe', carnet: 'Bibliothèque : Carnet' },
      aide: 'Clique sur un lieu du camp',
    },
    /** L'Atelier et le Cube Scellé (spec Atelier, A2). */
    atelier: {
      bouton: 'Atelier',
      titre: 'L’Atelier',
      sousTitre: 'Ouvre un Cube Scellé : une créature en sort. Les plus rares viennent des cubes les plus durs à gagner.',
      fermer: 'Fermer l’Atelier',
      inventaire: 'Inventaire de cubes',
      inventaireCompte: (a: string | number) => `Cubes (${a}/50)`,
      aucunCube: 'Aucun cube : gagne des combats pour en obtenir.',
      matieres: { wood: 'Cube de Bois', stone: 'Cube de Pierre', crystal: 'Cube de Cristal', prism: 'Cube Prisme' },
      matiereAide: {
        wood: 'Première victoire sur un niveau',
        stone: 'Boss de biome, ou 3 étoiles',
        crystal: 'Paliers d’étoiles, boss lointains',
        prism: 'Toutes les étoiles',
      },
      moule: 'Le moule',
      mouleVide: 'Choisis un cube',
      appats: 'Appât (facultatif)',
      aucunAppat: 'Aucun Appât : chaque première victoire en donne un.',
      appatAide: (a: string | number) => `60 % de chances d’une créature de l’élément ${a}, si la rareté tirée le permet.`,
      ouvrir: 'Ouvrir',
      chances: 'Chances',
      jaugeEveil: 'Jauge d’Éveil',
      jaugePleine: 'Jauge pleine : la prochaine ouverture donne une rare, ou mieux !',
      jaugeAide: (a: string | number) => `${a} % : +10 % à chaque ouverture sans rare.`,
      chancesDe: (a: string | number) => `Chances : ${a}`,
      raretes: { commune: 'Commune', peuCommune: 'Peu commune', rare: 'Rare', eveillee: 'Forme éveillée' },
      doublonAide: 'Un doublon fait monter le Lien de sa lignée (+4 % de PV et d’attaque par étoile) ; au 5ᵉ, une variante de couleur.',
      formeEveillee: 'Forme éveillée !',
      nouvelleCreature: 'Nouvelle créature !',
      doublon: 'Doublon : +1 étoile de Lien',
      lienAria: (a: string | number) => `Lien : ${a} étoile(s) sur 5`,
      varianteDebloquee: 'Variante débloquée !',
      continuer: 'Continuer',
      revelationAria: 'Ouverture d’un Cube Scellé',
      tapeLeCube: (a: string | number) => `Tape sur le cube ! (${a})`,
      maintenirPourAccelerer: 'Maintiens le clic pour accélérer',
      cubesGagnes: (a: string | number) => `+${a} Cube(s) Scellé(s) à ouvrir à l’Atelier`,
      conversionTitre: 'Le camp a changé : voici l’Atelier',
      conversionLignes: (a: string | number, b: string | number, c: string | number, d: string | number) => [
        'Au centre du camp, un établi remplace l’ancien foyer.',
        `Tes réserves sont devenues ${a} Appât(s), pour orienter l’élément des créatures.`,
        `Tu reçois ${b} Cube(s) de Cristal et ${c} Cube(s) de Pierre.`,
        `Tes compagnons en double ont donné ${d} étoile(s) de Lien.`,
        'Ouvre tes cubes à l’Atelier : chaque cube contient une créature.',
      ],
      compris: 'Compris !',
    },
    campHud: {
      /** Bouton unique du camp tant que l'équipe n'est pas ouverte (S07.3). */
      partir: 'Partir',
      qualites: { auto: 'Auto', high: 'Haut', medium: 'Moyen', low: 'Bas' },
      qualiteCourt: (a: string | number) => `Graphismes : ${a}`,
      qualiteAria: (a: string | number) => `Qualité graphique : ${a} (cliquer pour changer)`,
      /** Phrases des ouvertures (S07.3). */
      nouveautes: {
        atelier: 'Nouveau : l’Atelier ! Ouvre ton premier Cube Scellé.',
        carnet: 'Nouveau : le Carnet (créatures, collection, exploits, sauvegarde et journal de test).',
        team: 'Nouveau : l’écran d’équipe s’ouvre, ton nouveau compagnon t’y attend.',
      },
      leCamp: 'Le Camp',
      ileAuxCubes: WORLD_NAME_BARE,
      puissance: 'Puissance',
      desactiverLeTremblementDeCamera: 'Désactiver le tremblement de caméra',
      activerLeTremblementDeCamera: 'Activer le tremblement de caméra',
      tremblementDeCameraActive: 'Tremblement de caméra : activé',
      tremblementDeCameraDesactive: 'Tremblement de caméra : désactivé',
      activerLeSon: 'Activer le son',
      couperLeSon: 'Couper le son',
      retourALEcranTitre: 'Retour à l\'écran titre',
      afficherLeCamp: ' Afficher le camp',
      masquerLeDock: ' Masquer le dock',
      expeditions: 'Expéditions',
      equipePierres: 'Équipe & Galets',
      carnet: 'Carnet',
    },
    evolutionOverlay: {
      metamorphose: 'Métamorphose',
      rayonneDUneLumiereEtrange: ' rayonne d’une lumière étrange…',
      evolutionReussie: 'Évolution réussie',
      devient: ' devient',
      pv: 'PV +',
      atq: 'ATQ +',
      nouveauSort: 'Nouveau sort : ',
    },
    expeditionDrawer: {
      etoilesTotal: (a: string | number, b: string | number) => `★ ${a}/${b}`,
      etoilesBiome: (a: string | number) => `★ ${a}/9`,
      etoilesNiveau: (a: string | number) => `${a} étoile(s) sur 3`,
      defiDuNiveau: 'Défi du niveau',
      prochainPalier: (a: string | number, b: string | number) => `Prochain palier : ★ ${a} (${b})`,
      palierTitre: 'titre et cadre doré',
      titreGardien: 'Gardien des étoiles',
      carteDesExpeditions: 'Carte des Expéditions',
      puissanceDeVotreEscouade: 'Puissance de votre escouade :',
      niveauxVaincus: ' niveaux vaincus',
      fermerLaCarteDesExpeditions: 'Fermer la carte des expéditions',
      biomeVerrouilleTerminez: 'Biome verrouillé : terminez « ',
      pourLOuvrir: ' » pour l’ouvrir.',
      niveau: 'Niveau ',
      termine: 'Terminé',
      verrouille: 'Verrouillé',
      disponible: 'Disponible',
      conseille: 'Conseillé',
      bossDuNiveau: 'Boss du niveau · ',
      vaguesXpDeBase: ' vagues · XP de base',
      butin: 'Butin',
      pierresDePouvoir: 'Galets :',
      a: ' à +',
      niveauVerrouilleTerminezDAbord: 'Niveau verrouillé : terminez d’abord « ',
      lancerLExpedition: 'Lancer l’expédition',
    },
    expeditionHud: {
      semiAutoE: 'Semi-Auto [E]',
      autoTotalE: 'Auto Total [E]',
      manuelE: 'Manuel [E]',
      vague: 'Vague',
      temps: 'Temps',
      p: 'P',
      dernierSursaut: ' · DERNIER SURSAUT',
      fureur: ' · FUREUR',
      attaqueEsquivez: 'ATTAQUE ! ESQUIVEZ !',
      premiereFoisCube: 'Un sort pose un cube : attends qu’il s’allume, puis fais-le éclater avec un autre élément.',
      premiereFoisFaible: 'Attends que le cube s’allume.',
      premiereFoisEclat: 'Éclat ! L’élément qui fait éclater décide de l’effet.',
      premiereFoisTrio: 'TRIO ! Un troisième élément sur un ennemi fêlé.',
      carapace: 'Carapace de magma',
      defiEtat: (a: string | number, b: string | number) => `Défi : ${a} (${b})`,
      autoPlusTard: 'Auto : disponible après le premier boss',
      manetteTactile: 'Manette : glisse le doigt pour déplacer le meneur',
      etatsDefi: { pending: 'en cours', done: 'réussi', lost: 'manqué' },
      eclatsTrios: (a: string | number, b: string | number) => `Éclats ${a} · Trios ${b}`,
      previewTrio: 'TRIO',
      previewEclat: 'ÉCLAT',
      previewMurit: '…',
      previewLoin: 'trop loin',
      changerLeModeDeControle: 'Changer le mode de contrôle',
      activerLeSon: 'Activer le son',
      couperLeSon: 'Couper le son',
      mettreEnPause: 'Mettre en pause',
      alerteBoss: 'Alerte Boss',
      n: 'N.',
      reanimS: (a: string | number) => `Réanim. ${a}s`,
      def: 'DEF+',
      lancerAvec: (a: string | number, b: string | number) => `Lancer ${a} avec ${b}`,
      esquiveDeLEscouade: 'Esquive de l\'escouade',
      esquive: 'Esquive',
      espace: 'ESPACE',
      declencherLUltimeDEscouade: 'Déclencher le Déchaînement',
      ultime: 'Déchaînement',
      toucheR: 'TOUCHE R',
    },
    icons: {
      titreComplet: GAME_FULL_TITLE,
      cubi: GAME_TITLE_PARTS[0].toUpperCase(),
      quest: GAME_TITLE_PARTS[1].toUpperCase(),
      lIleAuxCubes: `L’${WORLD_NAME_BARE}`.toUpperCase(),
    },
    outcomeModal: {
      victoire: 'Victoire',
      t2Eclats: '2 Éclats',
      ultimeOuEsquiveParfaite: 'Déchaînement ou esquive parfaite',
      etoileSur3: (a: string | number, b: string | number) => `${a} étoile${b} sur 3`,
      expeditionReussie: 'Expédition réussie !',
      escouadeVaincue: 'Escouade vaincue',
      siPresDuButGardezLEsquive: 'Si près du but ! Gardez l\'Esquive pour ses attaques télégraphiées.',
      renforcezVosPierresDePouvoirOu: 'Renforcez vos Galets ou ouvrez un Cube Scellé à l’Atelier.',
      temps: 'Temps',
      vagues: 'Vagues',
      degats: 'Dégâts',
      xpUnite: 'XP / Unité',
      pvBoss: 'PV Boss',
      eclats: 'Éclats ',
      trios: 'Trios ',
      dechainements: 'Déchaînements ',
      esquivesParfaites: 'Esquives parfaites ',
      nouveauBiomeDecouvert: 'Nouveau biome découvert',
      pierre: 'Galet ',
      atq: 'ATQ',
      pv: 'PV',
      monteeDeNiveau: 'Montée de niveau : ',
      nouveauNiveauOuvert: 'Nouveau niveau ouvert : ',
      retourAuCamp: 'Retour au Camp',
      niveauSuivant: 'Niveau suivant',
      rejouerLeNiveau: 'Rejouer le niveau',
      reessayer: 'Réessayer',
      suivant: 'Suivant',
      palierRune: (a: string | number, b: string | number) => `★ ${a} étoiles : ${b} reçue !`,
      palierFinal: (a: string | number) => `★ ${a} étoiles : titre de Gardien des étoiles et cadre doré !`,
      premiereVictoire: (a: string | number) => `Première victoire × ${a}`,
      xpCamp: (a: string | number) => `+${a} % au camp`,
      rejouer: 'Rejouer',
      camp: 'Camp',
      etatDuDefi: (a: string | number, b: string | number) => `Défi : ${a} — ${b}`,
      defiDejaAcquis: 'déjà réussi',
      defiAReussir: 'à réussir',
    },
    /** Journal de test (S07.4). */
    journal: {
      titre: 'Journal de test',
      explication:
        'Une ligne par combat : niveau, escouade, mode, résultat, durée, gestes, leçons. Il reste sur cet appareil : rien n’est envoyé, sauf si tu envoies toi-même le fichier.',
      lignes: (a: string | number) => `${a} combat(s) enregistré(s) (500 au plus).`,
      exporter: 'Exporter mon journal',
      effacer: 'Effacer',
      confirmerEffacer: 'Confirmer l’effacement',
      lecons: 'Leçons du début',
      revoirLecons: 'Revoir les leçons (elles reviennent dans la Prairie)',
    },
    /** Le Carnet (A3.2) : remplace le Codex et l'écran des quêtes. */
    carnet: {
      titre: 'Le Carnet',
      sousTitre: 'Créatures, collection, exploits et sauvegarde.',
      fermer: 'Fermer le Carnet',
      onglets: 'Onglets du Carnet',
      tabs: {
        creatures: (a: string | number, b: string | number) => `Créatures ${a}/${b}`,
        collection: 'Collection',
        exploits: 'Exploits',
        elements: 'Éléments',
        sauvegarde: 'Sauvegarde et journal',
        professeur: 'Professeur',
      },
      // en-tête : niveau de collection, toujours visible
      niveauCollection: (a: string | number) => `Niveau de collection ${a}`,
      points: (a: string | number) => `${a} points`,
      prochainPalier: (a: string | number, b: string | number) => `Prochain palier : ${a} points (encore ${b})`,
      tousPaliers: 'Tous les paliers sont atteints !',
      aReclamer: (a: string | number) => `${a} à réclamer`,
      titreActuel: (a: string | number) => `Titre : ${a}`,
      // créatures
      inconnu: '???',
      lignee: (a: string | number) => `Lignée ${a}`,
      possede: 'Possédée',
      vue: 'Vue au combat',
      jamaisVue: 'Jamais vue',
      variante: 'Variante',
      lien: (a: string | number) => `Lien ★${a}/5`,
      lienAria: (a: string | number) => `Lien : ${a} étoile(s) sur 5`,
      ouvrirFiche: (a: string | number) => `Ouvrir la fiche de ${a}`,
      aideCreatures: 'Une ombre noire : jamais vue. Une ombre avec un nom : vue au combat. En couleur : dans ton équipe.',
      retour: 'Retour au Carnet',
      element: 'Élément',
      role: 'Rôle',
      roles: { melee: 'Mêlée', ranged: 'Distance', tank: 'Tank' },
      sort: 'Sort',
      description: 'Description',
      ouRencontrer: 'Où la rencontrer',
      nulPart: 'Nulle part dans les expéditions : par évolution, ou dans un Cube Prisme.',
      bossDe: (a: string | number) => `${a} (boss)`,
      cubeScelle: (a: string | number) => `Cube Scellé : ${a}`,
      evolueEn: (a: string | number, b: string | number) => `Évolue en ${a} au niveau ${b}`,
      // collection
      detailPoints: 'D’où viennent les points',
      categories: {
        ownedForms: 'Formes possédées',
        evolutionsSeen: 'Évolutions vues',
        bondStars: 'Étoiles de Lien',
        variants: 'Variantes débloquées',
        runes: 'Runes obtenues',
        achievements: 'Exploits réussis',
      },
      calcul: (a: string | number, b: string | number, c: string | number) => `${a} × ${b} = ${c}`,
      paliers: 'Paliers de récompenses',
      palier: (a: string | number) => `${a} points`,
      reclamer: 'Réclamer',
      obtenu: 'Obtenu',
      verrouille: (a: string | number) => `Encore ${a} points`,
      titresEtCadres: 'Titres et cadres',
      aucunTitre: 'Aucun titre pour l’instant : les paliers en donnent.',
      titres: {
        titre_pisteur: 'Pisteur',
        cadre_bois: 'Cadre de bois',
        titre_naturaliste: 'Naturaliste',
        cadre_pierre: 'Cadre de pierre',
        titre_erudit: 'Érudit de l’île',
        cadre_cristal: 'Cadre de cristal',
        titre_archiviste: 'Grand Archiviste',
        cadre_prisme: 'Cadre prisme',
      } as Record<string, string>,
      recompenseTitre: (a: string | number) => `Titre « ${a} »`,
      // récompenses (exploits et paliers)
      or: 'Or',
      argent: 'Argent',
      bronze: 'Bronze',
      aleatoire: 'Aléatoire',
      pierre: (a: string | number) => `Galet (${a})`,
      appat: (a: string | number, b: string | number) => `+${a} Appât (${b})`,
      cube: (a: string | number) => `+1 Cube Scellé (${a})`,
      matieres: { wood: 'Bois', stone: 'Pierre', crystal: 'Cristal', prism: 'Prisme' },
      rune: (a: string | number) => `+1 ${a}`,
      pointsCollection: (a: string | number) => `+${a} points de collection`,
      // exploits
      themes: { combat: 'Combat', collection: 'Collection', exploration: 'Exploration' },
      aideExploits: `Les exploits de ton aventure sur ${WORLD_NAME} : chacun se réclame une fois.`,
      // éléments
      aideElements: 'Un sort fort contre l’élément visé fait ×1,5 ; un sort faible, ×0,7.',
      superEfficace: 'Fort contre (×1,5)',
      peuEfficace: 'Faible contre (×0,7)',
      // sauvegarde (reprise de l'ancien écran des quêtes)
      fichierDeSauvegardeTelechargeJson: 'Fichier de sauvegarde téléchargé (.json).',
      sauvegardeCopieeDansLePressePapiers: 'Sauvegarde copiée dans le presse-papiers.',
      impossibleDAccederAuPressePapiers: 'Impossible d’accéder au presse-papiers. Utilisez le bouton Télécharger (.json).',
      sauvegardeRestaureeCreaturesNiveaux: (a: string | number, b: string | number, c: string | number) => `Sauvegarde restaurée (${a} ${CREATURE_NOUN.plural}, ${b}/${c} niveaux).`,
      erreurLorsDeLaLectureDu: 'Erreur lors de la lecture du fichier JSON.',
      expeditions: 'Expéditions',
      eclats: 'Éclats',
      trios: 'Trios',
      creatures: CREATURE_NOUN.plural,
      exporterVotreSauvegarde: (a: string | number) => `Exporter votre sauvegarde locale (v${a})`,
      conservezUneCopieDeVotreEquipe: 'Conservez une copie de votre équipe, vos galets, vos Appâts, vos Cubes Scellés et vos exploits au format JSON.',
      telechargerJson: 'Télécharger (.json)',
      copie: 'Copié !',
      copierLeJson: 'Copier le JSON',
      importerUneSauvegardeJson: 'Importer une sauvegarde (.json)',
      choisirUnFichierJson: 'Choisir un fichier .json',
      ouCollezIciLeContenuJson: `Ou collez ici le contenu JSON d’une sauvegarde ${GAME_TITLE}...`,
      collerJsonAria: 'Contenu JSON d’une sauvegarde',
      validerImporter: 'Valider & Importer',
      reinitialiserLaSauvegarde: 'Réinitialiser la sauvegarde',
      repartDeZeroSurLIle: `Repart de zéro sur ${WORLD_NAME} (pensez à exporter votre JSON avant).`,
      reinitialiser: 'Réinitialiser',
      annuler: 'Annuler',
      confirmerLaRemiseAZero: 'Confirmer la remise à zéro',
      // Professeur (seulement avec VITE_AI_CODEX=1)
      professeur: {
        questionsRapides: [
          'Quelle équipe de départ choisir pour bien démarrer ?',
          'Comment tirer parti des Runes de Partage et de Vigueur en combat ?',
          'Quels conseils pour éviter les attaques de Boss avec Esquive ?',
          'Quelles synergies de types élémentaires fonctionnent le mieux pour une équipe de 3 ?',
        ],
        questionTropCourte: 'Veuillez saisir une question d’au moins 2 caractères.',
        erreurProfesseur: 'Erreur lors de la consultation du Professeur Cubix.',
        serveurInjoignable: 'Impossible de joindre le serveur du Codex. Vérifiez la connexion et réessayez.',
        etiquette: 'Poser une question stratégique au Professeur Cubix',
        exemple: 'Ex. : Équipe pour débuter, astuces Boss, synergies de runes...',
        rechercher: 'Rechercher',
        reessayer: 'Réessayer',
        enCours: 'Le Professeur Cubix consulte les archives Google Search en direct...',
        vide: 'Posez une question ci-dessus ou cliquez sur un thème rapide pour obtenir des stratégies documentées et adaptées à votre escouade actuelle.',
        sources: 'Sources vérifiées (Google Search)',
        resume: (a: string | number, b: string | number, c: string | number) => `${a} (${b}, Niv.${c})`,
      },
    },
    starterModal: {
      choisisTonTrio: 'Choisis ton trio',
      troisElements: 'Trois compagnons, trois éléments : chacun fait éclater les cubes à sa façon.',
      nomsTrios: { braise: 'Trio Braise', maree: 'Trio Marée' },
      /** Une ligne par Éclat (carte du trio de départ). */
      eclatCourt: {
        deflagration: 'explosion qui brûle autour',
        arc: 'éclair qui rebondit et étourdit',
        rempart: 'bouclier pour toute l’escouade',
        deferlante: 'gros coup qui repousse',
        seve: 'soigne toute l’escouade',
        echo: 'recopie le cube sur les voisins',
      },
      choisissezVotrePremiereCreature: `Choisissez votre premier ${CREATURE_NOUN.singular}`,
      deuxEclaireursVousRejoindrontAussitotPour: 'Deux éclaireurs vous rejoindront aussitôt pour former votre escouade de 3 au Camp.',
      tank: 'Tank',
      distance: 'Distance',
      melee: 'Mêlée',
      pv: 'PV ',
      atq: 'ATQ ',
      sort: 'Sort : ',
    },
    statusModals: {
      victoireAcquise: 'Victoire acquise : vos récompenses sont déjà enregistrées.',
      expeditionEnPause: 'Expédition en pause',
      appuyezSurEchapOuPPour: 'Appuyez sur Échap ou P pour reprendre le combat.',
      reprendre: 'Reprendre',
      recommencerLeNiveau: 'Recommencer le niveau',
      retourAuCamp: 'Retour au Camp',
      tremblementDeCameraLorsDesImpacts: 'Tremblement de caméra lors des impacts',
    },
    teamDrawer: {
      critique: 'Critique',
      vampirisme: 'Vol de vie',
      vitesse: 'Vitesse',
      resist: 'Résist.',
      fermerLaGestionDEquipe: 'Fermer la gestion d\'équipe',
      n: 'N.',
      meneur: 'Meneur',
      dechainementDuMeneur: (a: string | number) => `Déchaînement du meneur : ${a}.`,
      niv: 'Niv. ',
      xp: ' · XP',
      lEscouadeCompteDeja3Creatures: `L’escouade compte déjà 3 ${CREATURE_NOUN.plural} : retirez-en un d’abord.`,
      lEscouadeDoitGarderAuMoins: `L’escouade doit garder au moins un ${CREATURE_NOUN.singular}.`,
      dernierMembre: 'Dernier membre',
      retirerEscouade: 'Retirer escouade',
      escouadeComplete: 'Escouade complète',
      mettreEnEscouade: 'Mettre en escouade',
      pv: 'PV',
      atq: 'ATQ',
      crit: 'Crit',
      vamp: 'Vol de vie',
      evolution: 'Évolution : ',
      niv2: ' (Niv. ',
      faireEvoluer: 'Faire évoluer',
      nivRequis: (a: string | number) => `Niv. ${a} requis`,
      rune: 'Rune ',
      retirer: 'Retirer',
      aucuneEnSac: 'Aucune en sac',
      grilleDePierresDePouvoir3: 'Grille de Galets (3×3)',
      retirerLaPierre: 'Retirer le galet',
      emplacementPierre: (a: string | number, b: string | number) => `Emplacement de galet ${a} (${b})`,
      niv3: 'Niv.',
      mixte: 'Mixte',
      sacDePierres: 'Sac de Galets (',
      tout: 'Tout',
      lEmplacementSelectionneNAcceptePas: 'L’emplacement sélectionné n’accepte pas ce type de galet (ou il est encore verrouillé).',
      pierreStandard: 'Galet standard',
      equipee: 'Équipé',
      equiper: 'Équiper',
      mauvaisType: 'Pour un autre emplacement',
      // A3.3 : écran d'équipe (trio, portrait, réserve)
      titre: 'Équipe',
      puissance: (a: string | number) => `Puissance du trio : ${a}`,
      trio: 'Trio',
      reserve: 'Réserve',
      reserveVide: `Aucun ${CREATURE_NOUN.singular} en réserve : ouvre des Cubes Scellés à l’Atelier.`,
      aideEchange: (a: string | number) => `Touche un ${CREATURE_NOUN.singular} de la réserve pour l’échanger avec ${a}.`,
      aideAjout: `Touche un ${CREATURE_NOUN.singular} de la réserve pour l’ajouter au trio.`,
      aideChoisir: `Choisis d’abord un membre du trio à remplacer.`,
      echangerAvec: (a: string | number, b: string | number) => `Échanger ${a} avec ${b}`,
      ajouterAuTrio: (a: string | number) => `Ajouter ${a} au trio`,
      memeLignee: 'Sa lignée est déjà dans le trio.',
      choisir: (a: string | number) => `Choisir ${a}`,
      elements: 'Éléments :',
      trioPossible: 'Trio possible',
      trioImpossible: 'Trio impossible : deux éléments identiques',
      trioIncomplet: 'Trio impossible : il faut trois membres',
      role: 'Rôle',
      sort: 'Sort',
      recharge: (a: string | number) => `Recharge ${a} s`,
      etoiles: (a: number) => `${'★'.repeat(a)}${'☆'.repeat(Math.max(0, 5 - a))}`,
      lienAria: (a: string | number) => `Lien : ${a} étoile(s) sur 5`,
      details: 'Détails',
      masquerDetails: 'Masquer les détails',
      statistiques: 'Statistiques',
      runes: 'Runes',
      galets: 'Galets',
      variante: 'Variante de couleur',
    },
    titleOverlay: {
      continuerLAventure: 'Continuer l’aventure',
      commencerLAventure: 'Commencer l’aventure',
      nouvelleIle: 'Nouvelle île',
      versionEnTest: (a: string | number) => `version en test · ${a}`,
      t123SortsEspaceEsquive: '1 / 2 / 3 Sorts · Espace Esquive · R Déchaînement · ZQSD Déplacer · E Auto · P Pause',
    },
  },
  engine: {
    /** Phrases des leçons (S07.2), 60 caractères au plus. */
    lecons: {
      cast: '1 : ton compagnon lance son sort.',
      burst: 'Le cube s’allume : 2 le fait éclater.',
      dodge: 'Espace : esquive maintenant.',
      trio: 'Un troisième élément : TRIO !',
      ultimate: 'R : Déchaînement.',
    },
    alerteBossPreparezLEsquive: 'ALERTE BOSS ! Préparez l\'Esquive !',
    contrecoupEloignezVous: 'Contrecoup — éloignez-vous !',
    boucl: (a: string | number) => `+${a} BOUCL.`,
    bloque: 'BLOQUÉ',
    phase3DernierSursaut: 'PHASE 3 : DERNIER SURSAUT !',
    phase2Fureur: 'PHASE 2 : FUREUR !',
    vague: (a: string | number, b: string | number) => `Vague ${a} / ${b}`,
    boss: (a: string | number) => `Boss ${a}`,
    souverain: (a: string | number) => `Souverain — ${a}`,
    gardien: (a: string | number) => `Gardien — ${a}`,
    escouadeKORepliAuCamp: 'Escouade K.O. ! Repli au camp...',
    victoireExpeditionReussie: 'VICTOIRE ! Expédition réussie !',
    esquiveParfaite: 'ESQUIVE PARFAITE !',
    dechainement: 'DÉCHAÎNEMENT !',
    dechainementDe: (a: string | number) => `DÉCHAÎNEMENT · ${a}`,
    tropTot: 'Trop tôt !',
    parfait: 'PARFAIT !',
    eclatNomme: (a: string | number) => `ÉCLAT · ${a}`,
    trio: 'TRIO !',
    pv: (a: string | number) => `+${a} PV`,
  },
  rules: {
    /** Titres des leçons (options : « Revoir les leçons »). */
    titresLecons: { cast: 'Lancer un sort', burst: 'Faire éclater un cube', dodge: 'Esquive parfaite', trio: 'Trio', ultimate: 'Déchaînement' },
    /** Défis des niveaux (S06). */
    defi: {
      esquives: (a: string | number) => (Number(a) > 1 ? `${a} esquives parfaites` : '1 esquive parfaite'),
      chrono: (a: string | number) => `Gagner en moins de ${a} s`,
      aucuneAttaque: 'Aucune attaque annoncée subie',
      sansDechainement: 'Sans Déchaînement',
      et: ' et ',
    },
    /** Conseils de l'écran de défaite (S06.2). */
    conseils: {
      noDodge: 'Les attaques annoncées ont fait mal : appuie sur Espace juste avant l’impact.',
      underLevel: 'L’escouade est moins forte que les ennemis : rejoue un niveau précédent pour gagner de l’expérience.',
      weakElement: 'Le boss frappe fort sur tes éléments : essaie un autre trio dans l’écran d’équipe.',
      earlyKo: 'Un compagnon est tombé très tôt : garde l’escouade groupée et esquive les charges.',
      noBurst: 'Aucun Éclat : pose un cube, attends qu’il s’allume, puis frappe avec un autre élément.',
      manyWeak: 'Beaucoup d’Éclats trop tôt : attends que le cube s’allume avant de frapper.',
      noUltimate: 'Le Déchaînement n’a jamais été lancé : appuie sur R quand la jauge est pleine.',
      longFight: 'Le combat a traîné : concentre les sorts sur le boss dès qu’il arrive.',
    },
    etoileVictoire: 'Victoire',
    etoileSansKo: 'Aucun K.O.',
    niv: (a: string | number, b: string | number) => `${a} Niv.${b}`,
    creature: CREATURE_NOUN.singular,
    leContenuJsonEstVide: 'Le contenu JSON est vide.',
    formatJsonInvalideVerifiezQueLe: 'Format JSON invalide. Vérifiez que le fichier n’est pas tronqué.',
    sauvegardeNonReconnueOuIncomplete: `Sauvegarde ${GAME_TITLE} non reconnue ou incomplète (version ou escouade manquante).`,
  },
  balance: {
    anneauDeGivreCollezVousAu: 'Anneau de Givre — collez-vous au boss !',
    foudreEnRafaleSortezDeLa: 'Foudre en Rafale — sortez de la ligne !',
    ilDuCycloneEsquivePourFuir: 'Œil du Cyclone — Esquive pour fuir le centre !',
    anneauDAmbreCollezVousAu: 'Anneau d’Ambre — collez-vous au boss !',
    lamesDEauSortezDeLaLigne: 'Lames d’eau — sortez de la ligne !',
    tourbillonDeSableEsquivePourFuir: 'Tourbillon de Sable — Esquive pour fuir le centre !',
  },
  catalog: {
    ELEMENT_META: {
      fire: {
        label: 'Feu',
      },
      water: {
        label: 'Eau',
      },
      grass: {
        label: 'Plante',
      },
      electric: {
        label: 'Foudre',
      },
      rock: {
        label: 'Roche',
      },
      psychic: {
        label: 'Psy',
      },
    },
    MOVES: {
      ember_burst: {
        name: 'Flammèche Cube',
        description: 'Projette une salve de braises cubiques explosives.',
      },
      flame_nova: {
        name: 'Nova Magma',
        description: 'Déchaîne une onde de flammes tout autour du lanceur.',
      },
      ember_claw: {
        name: 'Griffe Braise',
        description: 'Lacère en arc avec des griffes chauffées au rouge.',
      },
      cinder_wave: {
        name: 'Vague de Cendres',
        description: 'Frappe le sol de sa queue et soulève un anneau de cendres brûlantes.',
      },
      aqua_jet: {
        name: 'Aqua-Ruée',
        description: 'Fonce à travers les ennemis dans un torrent d’écume.',
      },
      hydro_cannon: {
        name: 'Hydro-Rafale',
        description: 'Libère un jet aquatique puissant qui repousse les cibles.',
      },
      claw_snap: {
        name: 'Pince Marée',
        description: 'Referme ses deux pinces en ciseaux sur les ennemis à portée.',
      },
      tide_crush: {
        name: 'Ressac Broyeur',
        description: 'Martèle le sol de sa grande pince et soulève une vague circulaire.',
      },
      vine_whip: {
        name: 'Fouet Lianes',
        description: 'Frappe sèche en arc de cercle qui balaie les ennemis proches.',
      },
      petal_storm: {
        name: 'Tempête Florale',
        description: 'Tourbillon de pétales cubiques lacérant toute la zone.',
      },
      spore_shot: {
        name: 'Tir Sporique',
        description: 'Projette une capsule de spores qui éclate en nuage collant.',
      },
      fungal_bloom: {
        name: 'Éclosion Fongique',
        description: 'Fait jaillir un cercle de champignons sous les pieds des ennemis.',
      },
      spark_dash: {
        name: 'Éclair Vif',
        description: 'Charge fulgurante qui électrise les ennemis sur sa trajectoire.',
      },
      thunder_bolt: {
        name: 'Tonnerre Prismatique',
        description: 'Fait tomber un pilier de foudre à fort potentiel critique.',
      },
      rock_slam: {
        name: 'Roc Bélier',
        description: 'Coup de masse minéral qui projette violemment les adversaires.',
      },
      quake_stomp: {
        name: 'Séisme Tectonique',
        description: 'Fissure le sol en ondes sismiques dévastatrices.',
      },
      iron_guard: {
        name: 'Égide de Fer',
        description: 'Renforce la défense et soigne légèrement. Idéal avec la Rune de Partage !',
      },
      horn_charge: {
        name: 'Charge Cornue',
        description: 'Baisse la tête et enfonce les rangs ennemis d’un coup de cornes.',
      },
      amber_quake: {
        name: 'Éboulis d’Ambre',
        description: 'Frappe la falaise du front : une pluie de blocs d’ambre s’abat alentour.',
      },
      psy_beam: {
        name: 'Rayon Astral',
        description: 'Ondes psychiques perçantes qui traversent les défenses.',
      },
      star_nova: {
        name: 'Supernova Cube',
        description: 'Déflagration stellaire réservée aux créatures astrales.',
      },
      frost_charge: {
        name: 'Ruée Givrée',
        description: 'Charge bois en avant en laissant une traînée de givre qui glace les ennemis.',
      },
      aurora_blizzard: {
        name: 'Blizzard Boréal',
        description: 'Fait tomber un tourbillon de neige irisée sur la zone ciblée.',
      },
      glacier_crash: {
        name: 'Fracas Glaciaire',
        description: 'Abat deux poings de glace vive qui brisent l’armure des cibles proches.',
      },
      avalanche: {
        name: 'Avalanche Cubique',
        description: 'Déclenche une coulée de blocs gelés tout autour du lanceur.',
      },
      chain_spark: {
        name: 'Arc en Chaîne',
        description: 'Crache un arc électrique qui éclate en gerbe au premier contact.',
      },
      tempest_coil: {
        name: 'Spirale Tempête',
        description: 'Enroule la foudre en spirale autour de la cible avant de la relâcher.',
      },
      dream_mist: {
        name: 'Brume Onirique',
        description: 'Enveloppe le lanceur d’une brume apaisante : soin et défense. Parfaite avec la Rune de Partage.',
      },
      mirage_storm: {
        name: 'Orage Mirage',
        description: 'Un nuage d’illusions éclate au-dessus des ennemis et sème la confusion.',
      },
    },
    RUNES: {
      rune_ampleur: {
        name: 'Rune d’Ampleur',
        shortLabel: 'Zone +35%',
        description: 'Augmente le rayon et la portée de la compétence de 35 %.',
      },
      rune_cadence: {
        name: 'Rune de Cadence',
        shortLabel: 'Recharge -18%',
        description: 'Réduit le temps de recharge de la compétence de 18 %.',
      },
      rune_force: {
        name: 'Rune de Force',
        shortLabel: 'Dégâts +40%',
        description: 'Double l’impact (+40 % dégâts) pour +15 % de temps de recharge.',
      },
      rune_partage: {
        name: 'Rune de Partage',
        shortLabel: 'Partage Équipe',
        description: 'Partage 50 % des bonus défensifs et soins avec toute l’escouade.',
      },
      rune_precision: {
        name: 'Rune de Précision',
        shortLabel: 'Critique +15',
        description: 'Ajoute 15 points de chance de coup critique à la compétence.',
      },
      rune_vigueur: {
        name: 'Rune de Vigueur',
        shortLabel: 'Drain 10 %',
        description: 'La compétence rend au lanceur 10 % des dégâts qu’elle inflige.',
      },
    },
    SPECIES: {
      pyrocube: {
        name: 'Pyrocube',
        dexNote: 'Un cube de braise têtu : il souffle sur ses propres étincelles pour les faire durer jusqu’au soir.',
      },
      flambrix: {
        name: 'Flambrix',
        dexNote: 'Il accumule la chaleur dans sa crête dorsale pour lancer des volées incandescentes.',
      },
      ignisaur: {
        name: 'Ignisaur',
        dexNote: 'Ses plaques de lave se soulèvent comme des volets quand il s’échauffe ; on sent la chaleur à vingt pas.',
      },
      braizard: {
        name: 'Braizard',
        dexNote: 'Il se chauffe le ventre sur les pierres du foyer et rapporte au camp des braises encore tièdes.',
      },
      cendrox: {
        name: 'Cendrox',
        dexNote: 'Sa crête s’embrase quand il court : on suit sa trace aux herbes roussies sur les pentes de la Crête.',
      },
      aquabloc: {
        name: 'Aquabloc',
        dexNote: 'Ce bloc d’eau tiède garde la forme d’un cube même au fond des courants les plus vifs.',
      },
      corallix: {
        name: 'Corallix',
        dexNote: 'Ses nageoires-oreilles fendent les courants les plus violents de la Rive Azur.',
      },
      abyssocube: {
        name: 'Abyssocube',
        dexNote: 'Ses parois translucides compriment la marée : quand il se relâche, la vague part d’un seul bloc.',
      },
      crabloc: {
        name: 'Crabloc',
        dexNote: 'Il marche en crabe même quand il est pressé et claque des pinces en rythme pour saluer la marée.',
      },
      crabastion: {
        name: 'Crabastion',
        dexNote: 'Forteresse des récifs : les petits Aquabloc s’abritent sous ses créneaux quand la houle se lève.',
      },
      bourgeon: {
        name: 'Bourgéon',
        dexNote: 'Une pousse obstinée qui grandit d’une feuille chaque fois qu’un allié se relève à côté de lui.',
      },
      feuilloc: {
        name: 'Feuilloc',
        dexNote: 'Ses feuilles carrées se replient en bouclier, puis se rouvrent d’un coup pour fouetter l’adversaire.',
      },
      bourgeoliath: {
        name: 'Bourgéoliath',
        dexNote: 'Gardien ancestral de la Prairie Émeraude : ses racines tiennent la colline entière en place.',
      },
      mycelin: {
        name: 'Mycélin',
        dexNote: 'Il s’installe à l’ombre des tentes tièdes et saupoudre le camp de spores qui sentent la noisette.',
      },
      amanitox: {
        name: 'Amanitox',
        dexNote: 'Vénérable champignon des sous-bois : là où son chapeau fait de l’ombre, une clairière entière repousse.',
      },
      voltik: {
        name: 'Ampoulin',
        dexNote: 'Une petite pile sur pattes : il se recharge en dormant contre les rochers chauffés par l’orage.',
      },
      sparkube: {
        name: 'Bobinard',
        dexNote: 'Le câble cuivré qu’il traîne derrière lui bourdonne quand sa batterie déborde.',
      },
      raicube: {
        name: 'Voltacier',
        dexNote: `Ses ailettes de bobine tournent comme une dynamo : tout ${WORLD_NAME} s’éclaire quand il décolle.`,
      },
      cailloc: {
        name: 'Cailloc',
        dexNote: 'Indestructible petit bloc de basalte, il adore protéger son escouade avec Égide de Fer.',
      },
      granitox: {
        name: 'Granitox',
        dexNote: 'Une forteresse vivante qui écrase les lignes adverses par sa simple inertie.',
      },
      magmadrake: {
        name: 'Magmadrake',
        dexNote: 'Seigneur volcanique parcouru de veines de lave, ses pas fissurent l’obsidienne.',
      },
      chevrok: {
        name: 'Chevrok',
        dexNote: 'Il grimpe aux mesas par les chemins les plus raides, juste pour le plaisir de redescendre en glissant.',
      },
      mouflambre: {
        name: 'Mouflambre',
        dexNote: 'Ses cornes d’ambre gardent la chaleur du jour : la harde se serre contre lui quand la nuit tombe.',
      },
      belithan: {
        name: 'Bélithan',
        dexNote: 'Quand deux Bélithan se saluent du front, tout le canyon croit entendre le tonnerre de la Cime.',
      },
      psycube: {
        name: 'Psycube',
        dexNote: 'Flotte silencieusement au-dessus du sol en réorganisant de petits cailloux par télékinésie.',
      },
      lunabloc: {
        name: 'Lunabloc',
        dexNote: 'Ses satellites cubiques orbitent autour de lui pour amplifier chaque Rayon Astral.',
      },
      aetherion: {
        name: 'Aetherion',
        dexNote: 'Entité légendaire du Sanctuaire Cristallin, née de la mémoire géométrique de l’île.',
      },
      givrelin: {
        name: 'Givrelin',
        dexNote: 'Ce faon de givre laisse des empreintes carrées qui ne fondent jamais avant l’aube.',
      },
      ramurgel: {
        name: 'Ramurgel',
        dexNote: 'Ses bois de glace poussent d’un étage à chaque hiver passé à veiller sur la harde.',
      },
      auroramure: {
        name: 'Auroramure',
        dexNote: 'On dit que les aurores de la Toundra ne sont que le reflet de sa ramure prismatique.',
      },
      givrock: {
        name: 'Givrock',
        dexNote: 'Un galet qui a gelé trop longtemps : il frappe ses poings l’un contre l’autre pour se réchauffer.',
      },
      cryolithe: {
        name: 'Cryolithe',
        dexNote: 'Les stalactites de son dos tintent comme un carillon quand un intrus approche de sa grotte.',
      },
      glaciatitan: {
        name: 'Glaciatitan',
        dexNote: 'Colosse de la banquise : chacun de ses pas redessine la carte des crevasses.',
      },
      crepitil: {
        name: 'Crépitil',
        dexNote: 'Il se love autour des paratonnerres pour faire la sieste et se réveille chargé à bloc.',
      },
      serpeclair: {
        name: 'Serpéclair',
        dexNote: 'Ses écailles dorsales s’illuminent une à une, comme un compte à rebours avant la décharge.',
      },
      tempestrix: {
        name: 'Tempestrix',
        dexNote: 'Dragon-serpent qui nage dans les cumulonimbus : là où il s’enroule naît l’œil du cyclone.',
      },
      nimbulle: {
        name: 'Nimbulle',
        dexNote: 'Petit nuage distrait : la bruine qu’il laisse tomber donne de beaux rêves à son escouade.',
      },
      cumulord: {
        name: 'Cumulord',
        dexNote: 'Souverain de la mer de nuages, il façonne des mirages si réels qu’on peut s’y abriter.',
      },
    },
    BIOMES: {
      meadow: {
        name: 'Prairie Émeraude',
        subtitle: 'Clairières ensoleillées et bosquets cubiques',
      },
      shore: {
        name: 'Rive Azur',
        subtitle: 'Lagons turquoise et récifs géométriques',
      },
      volcano: {
        name: 'Crête Volcanique',
        subtitle: 'Basalte incandescent et failles de magma',
      },
      sanctuary: {
        name: 'Sanctuaire Cristallin',
        subtitle: 'Ruines antiques suspendues dans la brume astrale',
      },
      tundra: {
        name: 'Toundra Boréale',
        subtitle: 'Banquise scintillante sous les aurores',
      },
      stormpeak: {
        name: 'Cime des Orages',
        subtitle: 'Plateaux foudroyés au-dessus de la mer de nuages',
      },
      canyon: {
        name: 'Canyon d’Ambre',
        subtitle: 'Mesas ocre et arches fossiles balayées par le sable',
      },
    },
    RAW_STAGES: {
      'meadow-1': {
        name: 'Sentier des Bourgeons',
      },
      'meadow-2': {
        name: 'Bosquet Foudroyé',
      },
      'meadow-3': {
        name: 'Clairière du Colosse',
      },
      'shore-1': {
        name: 'Criques Écumeuses',
      },
      'shore-2': {
        name: 'Atoll de Foudre',
      },
      'shore-3': {
        name: 'Trône des Marées',
      },
      'volcano-1': {
        name: 'Pentes de Basalte',
      },
      'volcano-2': {
        name: 'Cratère Ardent',
      },
      'volcano-3': {
        name: 'Forge de Magmadrake',
      },
      'sanctuary-1': {
        name: 'Allée des Monolithes',
      },
      'sanctuary-2': {
        name: 'Cercle des Titans',
      },
      'sanctuary-3': {
        name: 'Cœur d’Aetherion',
      },
      'tundra-1': {
        name: 'Lisière Givrée',
      },
      'tundra-2': {
        name: 'Grotte aux Stalactites',
      },
      'tundra-3': {
        name: 'Trône de la Banquise',
      },
      'stormpeak-1': {
        name: 'Sentier des Paratonnerres',
      },
      'stormpeak-2': {
        name: 'Mer de Nuages',
      },
      'stormpeak-3': {
        name: 'Œil du Cyclone',
      },
      'canyon-1': {
        name: 'Piste des Mesas',
      },
      'canyon-2': {
        name: 'Arche des Fossiles',
      },
      'canyon-3': {
        name: 'Trône d’Ambre',
      },
    },
    STATUS_META: {
      burn: {
        label: 'Brûlure',
        shortTag: 'BRÛL',
        description: 'Inflige des dégâts de feu continus chaque seconde.',
      },
      soaked: {
        label: 'Mouillé',
        shortTag: 'EAU',
        description: 'Ralentit les déplacements et attaques de 25 %.',
      },
      rooted: {
        label: 'Enraciné',
        shortTag: 'LIEN',
        description: 'Entrave fortement les déplacements (-55 % vitesse).',
      },
      shocked: {
        label: 'Électrifié',
        shortTag: 'FOUDRE',
        description: 'Étourdit brièvement la cible.',
      },
      sunder: {
        label: 'Brise-Armure',
        shortTag: 'BRIS',
        description: 'Réduit la défense de la cible (+25 % dégâts subis).',
      },
      confused: {
        label: 'Confusion',
        shortTag: 'PSY',
        description: 'Perturbe les attaques et amplifie la résonance élémentaire.',
      },
    },
    BURSTS: {
      deflagration: { name: 'Déflagration', description: 'Le Feu fait éclater un cube : explosion de zone qui brûle les ennemis voisins.' },
      deferlante: { name: 'Déferlante', description: 'L’Eau fait éclater un cube : le plus gros coup sur une cible, qui est repoussée.' },
      seve: { name: 'Sève', description: 'La Plante fait éclater un cube : chaque allié récupère 6 % de ses PV max.' },
      arc: { name: 'Arc', description: 'La Foudre fait éclater un cube : l’éclair rebondit sur 2 ennemis proches et les étourdit.' },
      rempart: { name: 'Rempart', description: 'La Roche fait éclater un cube : bouclier d’escouade de 15 % des PV max.' },
      echo: { name: 'Écho', description: 'Le Psy fait éclater un cube : recharge du lanceur −1,5 s, le cube est recopié sur les voisins.' },
    },
    ACHIEVEMENTS: {
      ach_first_win: {
        title: 'Premier Pas sur l’Île',
        description: 'Remportez votre toute première expédition.',
        reward: {
          label: '1× Appât (Feu) · 1× Appât (Foudre)',
        },
      },
      ach_veteran_5: {
        title: 'Escouade Aguerrie',
        description: 'Remportez 5 expéditions victorieuses.',
        reward: {
          label: 'Galet Argent (+85–130)',
        },
      },
      ach_first_burst: {
        title: 'Étincelle Tactique',
        description: 'Déclenchez votre premier Éclat.',
        reward: {
          label: '1× Appât (Eau) · 1× Appât (Feu)',
        },
      },
      ach_burst_master: {
        title: 'Architecte des Éclats',
        description: 'Déclenchez 15 Éclats au total.',
        reward: {
          label: '1× Rune de Force · 1× Cube Scellé (Cristal)',
        },
      },
      ach_trios_5: {
        title: 'Cadence Infernale',
        description: 'Réussissez 5 Trios au total.',
        reward: {
          label: '1× Rune de Cadence · 1× Appât (Foudre)',
        },
      },
      ach_ult_3: {
        title: 'Déchaînement !',
        description: 'Déclenchez 3 Déchaînements.',
        reward: {
          label: 'Galet Or (+110–170)',
        },
      },
      ach_dodge_3: {
        title: 'Intouchables',
        description: 'Réussissez 3 Esquives Parfaites face aux attaques télégraphiées.',
        reward: {
          label: '1× Rune de Partage · 1× Appât (Eau)',
        },
      },
      ach_evolve_1: {
        title: 'Métamorphose',
        description: `Faites évoluer votre premier ${CREATURE_NOUN.singular}.`,
        reward: {
          label: '1× Rune d’Ampleur · 1× Appât (Feu)',
        },
      },
      ach_dex_8: {
        title: 'Naturaliste de l’Île',
        description: 'Découvrez 8 espèces différentes dans le Bestiaire.',
        reward: {
          label: '1× Appât (Eau) · 1× Cube Scellé (Cristal)',
        },
      },
      ach_stages_6: {
        title: 'Conquérant des Biomes',
        description: 'Terminez 6 niveaux distincts sur la carte des expéditions.',
        reward: {
          label: 'Galet Or (+160–240)',
        },
      },
      ach_stages_12: {
        title: `Légende de ${WORLD_NAME}`,
        description: 'Triomphez des 12 niveaux jusqu’au Cœur d’Aetherion.',
        reward: {
          label: 'Galet Or (+380–520) · 1× Cube Scellé (Cristal)',
        },
      },
      ach_tundra_clear: {
        title: 'Brise-Glace',
        description: 'Terminez les 3 niveaux de la Toundra Boréale.',
        reward: {
          label: '1× Rune de Précision · 1× Appât (Eau)',
        },
      },
      ach_storm_clear: {
        title: 'Chevaucheur d’Orage',
        description: 'Terminez les 3 niveaux de la Cime des Orages.',
        reward: {
          label: '1× Rune de Vigueur · Galet Or (+950–1250)',
        },
      },
      ach_stages_18: {
        title: 'Maître des Six Biomes',
        description: 'Triomphez des 18 niveaux jusqu’à l’Œil du Cyclone.',
        reward: {
          label: 'Galet Or (+1100–1400) · 1× Cube Scellé (Cristal)',
        },
      },
      ach_dex_20: {
        title: 'Grand Naturaliste',
        description: 'Découvrez 20 espèces différentes dans le Bestiaire.',
        reward: {
          label: '1× Appât (Eau) · 1× Appât (Foudre)',
        },
      },
      ach_dex_all: {
        title: 'Bestiaire Complet',
        description: (a: string | number) => `Découvrez les ${a} espèces de ${WORLD_NAME} et de ses confins.`,
        reward: {
          label: 'Galet Or (+1000–1300) · 1× Cube Scellé (Cristal)',
        },
      },
      ach_evolve_5: {
        title: 'Éleveur Émérite',
        description: `Faites évoluer 5 ${CREATURE_NOUN.plural}.`,
        reward: {
          label: '1× Rune de Force · 1× Appât (Foudre)',
        },
      },
    },
  },
};
