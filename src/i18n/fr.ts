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
    campHud: {
      platPret: 'Plat prêt !',
      cuisson: (a: string | number) => `Cuisson (${a})`,
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
      marmite: 'Marmite',
      equipePierres: 'Équipe & Galets',
      quetes: 'Quêtes',
      codexWeb: 'Codex Web',
      codex: 'Codex',
    },
    cookingDrawer: {
      marmiteDuCampement: 'Marmite du Campement',
      placez5IngredientsPourCuisinerUn: `Placez 5 ingrédients pour cuisiner un plat et attirer un nouveau ${CREATURE_NOUN.singular}.`,
      chaudron: 'Chaudron',
      recettes: 'Recettes (',
      fermerLaMarmite: 'Fermer la marmite',
      nouvelleRecrueAttireeAuCamp: 'Nouvelle recrue attirée au camp !',
      niv: ' · Niv.',
      ajouteAVotreReserveEquipezLe: 'Ajouté à votre réserve — équipez-le depuis l’onglet Équipe & Galets.',
      super: 'Super !',
      exp: ' exp.',
      astuce: 'Astuce : ',
      decouverte: '· Découverte',
      typeDeChaudron: 'Type de chaudron (',
      parIngredient: '× par ingrédient)',
      niv2: 'Niv.',
      emplacements5Requis: 'Emplacements (5 requis)',
      remplirAuto: 'Remplir auto',
      vider: 'Vider',
      retirerDeLEmplacement: (a: string | number, b: string | number) => `Retirer ${a} de l'emplacement ${b}`,
      emplacementVide: (a: string | number) => `Emplacement ${a} vide`,
      cuisson: 'Cuisson :',
      expedition: 'expédition',
      type: (a: string | number) => ` · Type ${a}`,
      chaqueEmplacementCouteIngredientAvecCe: (a: string | number, b: string | number) => `Chaque emplacement coûte ${a} ingrédient${b} avec ce chaudron.`,
      lancerLaCuisson: 'Lancer la cuisson',
      stockInsuffisant: 'Stock insuffisant',
      cliquezSurVosIngredientsADroite: 'Cliquez sur vos ingrédients à droite pour remplir les 5 emplacements de la marmite.',
      cuissonEnCours: 'Cuisson en cours : ',
      encore: 'Encore',
      avantDegustation: ' avant dégustation.',
      terminerMaintenant: 'Terminer maintenant',
      estPret: ' est prêt !',
      uneCreatureAttireeParLOdeur: `Un ${CREATURE_NOUN.singular} attiré par l’odeur attend près du feu de camp.`,
      accueillirLaRecrue: 'Accueillir la recrue',
      reserveDIngredients: 'Réserve d’ingrédients',
      mystique: 'Mystique',
      rare: 'Rare',
      commun: 'Commun',
      cout: '· coût ',
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
      butinIngredients: 'Butin & Ingrédients',
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
      declencherLUltimeDEscouade: 'Déclencher l\'Ultime d\'escouade',
      ultime: 'Ultime',
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
      ultimeOuEsquiveParfaite: 'Ultime ou esquive parfaite',
      etoileSur3: (a: string | number, b: string | number) => `${a} étoile${b} sur 3`,
      expeditionReussie: 'Expédition réussie !',
      escouadeVaincue: 'Escouade vaincue',
      siPresDuButGardezLEsquive: 'Si près du but ! Gardez l\'Esquive pour ses attaques télégraphiées.',
      renforcezVosPierresDePouvoirOu: 'Renforcez vos Galets ou tentez une recrue à la Marmite.',
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
      ingredientsRecoltes: 'Ingrédients récoltés',
      pierre: 'Galet ',
      atq: 'ATQ',
      pv: 'PV',
      monteeDeNiveau: 'Montée de niveau : ',
      votrePlatDansLaMarmiteEst: 'Votre plat dans la Marmite est prêt ! Rentrez au Camp pour accueillir la recrue.',
      nouveauChaudronDebloque: 'Nouveau chaudron débloqué : ',
      nouveauNiveauOuvert: 'Nouveau niveau ouvert : ',
      retourAuCamp: 'Retour au Camp',
      niveauSuivant: 'Niveau suivant',
      rejouerLeNiveau: 'Rejouer le niveau',
      reessayer: 'Réessayer',
    },
    questsDrawer: {
      or: 'Or',
      argent: 'Argent',
      bronze: 'Bronze',
      aleatoire: 'Aléatoire',
      pierre: (a: string | number) => `Galet (${a})`,
      fichierDeSauvegardeTelechargeJson: 'Fichier de sauvegarde téléchargé (.json).',
      sauvegardeCopieeDansLePressePapiers: 'Sauvegarde copiée dans le presse-papiers.',
      impossibleDAccederAuPressePapiers: 'Impossible d’accéder au presse-papiers. Utilisez le bouton Télécharger (.json).',
      sauvegardeRestaureeCreaturesNiveaux: (a: string | number, b: string | number, c: string | number) => `Sauvegarde restaurée (${a} ${CREATURE_NOUN.plural}, ${b}/${c} niveaux).`,
      erreurLorsDeLaLectureDu: 'Erreur lors de la lecture du fichier JSON.',
      journalDuCampV02: 'Journal du Camp · V0.2',
      quetesSuccesSauvegarde: 'Quêtes, Succès & Sauvegarde',
      fermerLeJournal: 'Fermer le journal',
      missions: 'Missions (',
      succes: 'Succès (',
      sauvegarde: 'Sauvegarde',
      completezDesObjectifsEnExpeditionOu: 'Complétez des objectifs en expédition ou à la marmite pour gagner des ressources. Chaque mission réclamée est remplacée par un nouveau défi.',
      recompense: 'Récompense : ',
      reclamer: 'Réclamer',
      enCours: 'En cours',
      paliersPermanentsDeVotreAventureSur: `Paliers permanents de votre aventure sur ${WORLD_NAME}.`,
      tous: 'Tous',
      aReclamer: (a: string | number) => `À réclamer (${a})`,
      termines: 'Terminés',
      aucunSuccesDansCeFiltrePour: 'Aucun succès dans ce filtre pour le moment.',
      obtenu: ' Obtenu',
      verrouille: 'Verrouillé',
      expeditions: 'Expéditions',
      eclats: 'Éclats',
      trios: 'Trios',
      creatures: CREATURE_NOUN.plural,
      exporterVotreSauvegardeLocaleV: 'Exporter votre sauvegarde locale (v',
      conservezUneCopieDeVotreEquipe: 'Conservez une copie de votre équipe, vos galets, vos ingrédients et vos succès au format JSON.',
      telechargerJson: 'Télécharger (.json)',
      copie: 'Copié !',
      copierLeJson: 'Copier le JSON',
      importerUneSauvegardeJson: 'Importer une sauvegarde (.json)',
      choisirUnFichierJson: 'Choisir un fichier .json',
      ouCollezIciLeContenuJson: `Ou collez ici le contenu JSON d’une sauvegarde ${GAME_TITLE}...`,
      validerImporter: 'Valider & Importer',
      reinitialiserLaSauvegarde: 'Réinitialiser la sauvegarde',
      repartDeZeroSurLIle: `Repart de zéro sur ${WORLD_NAME} (pensez à exporter votre JSON avant).`,
      reinitialiser: 'Réinitialiser',
      annuler: 'Annuler',
      confirmerLaRemiseAZero: 'Confirmer la remise à zéro',
    },
    starterModal: {
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
      vampirisme: 'Vampirisme',
      vitesse: 'Vitesse',
      resist: 'Résist.',
      escouadeGrilleDePierresDePouvoir: 'Escouade & Grille de Galets',
      puissanceTotaleDEscouade: 'Puissance totale d’escouade :',
      t3Actifs: '/3 actifs · ',
      compagnonsAuCamp: ' compagnons au camp',
      fermerLaGestionDEquipe: 'Fermer la gestion d\'équipe',
      compagnons: 'Compagnons (',
      n: 'N.',
      escouade: 'Escouade',
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
      vamp: 'Vamp.',
      evolution: 'Évolution : ',
      niv2: ' (Niv. ',
      faireEvoluer: 'Faire évoluer',
      nivRequis: (a: string | number) => `Niv. ${a} requis`,
      competenceSpeciale: 'Compétence Spéciale',
      s: 's',
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
      mauvaisType: 'Mauvais type',
    },
    titleOverlay: {
      continuerLAventure: 'Continuer l’aventure',
      commencerLAventure: 'Commencer l’aventure',
      nouvelleIle: 'Nouvelle île',
      versionEnTest: (a: string | number) => `version en test · ${a}`,
      t123SortsEspaceEsquive: '1 / 2 / 3 Sorts · Espace Esquive · R Ultime · ZQSD Déplacer · E Auto · P Pause',
    },
  },
  engine: {
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
        dexNote: 'Sa queue cubique crépite plus fort lorsqu’une bonne marmite mijote au camp.',
      },
      flambrix: {
        name: 'Flambrix',
        dexNote: 'Il accumule la chaleur dans sa crête dorsale pour lancer des volées incandescentes.',
      },
      ignisaur: {
        name: 'Ignisaur',
        dexNote: 'Souverain ailé des cimes ardentes, son souffle embrase des clairières entières.',
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
        dexNote: 'Sa carapace géométrique glisse sur les vagues comme un ricochet parfait.',
      },
      corallix: {
        name: 'Corallix',
        dexNote: 'Ses nageoires-oreilles fendent les courants les plus violents de la Rive Azur.',
      },
      abyssocube: {
        name: 'Abyssocube',
        dexNote: 'Deux canons d’acier cubiques jaillissent de sa carapace pour déclencher Hydro-Rafale.',
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
        dexNote: 'Le bulbe cubique sur son dos capte la lumière du soleil pour fortifier ses alliés.',
      },
      feuilloc: {
        name: 'Feuilloc',
        dexNote: 'Un bourgeon rose éclos sur son dos libère une odeur apaisante avant l’assaut.',
      },
      bourgeoliath: {
        name: 'Bourgéoliath',
        dexNote: 'Gardien ancestral de la Prairie Émeraude, sa fleur monumentale déclenche des tempêtes.',
      },
      mycelin: {
        name: 'Mycélin',
        dexNote: 'Il s’installe à l’ombre des marmites tièdes et saupoudre le camp de spores qui sentent la noisette.',
      },
      amanitox: {
        name: 'Amanitox',
        dexNote: 'Vénérable champignon des sous-bois : là où son chapeau fait de l’ombre, une clairière entière repousse.',
      },
      voltik: {
        name: 'Voltik',
        dexNote: 'Ses joues carmin stockent des étincelles qu’il libère en rebondissant joyeusement.',
      },
      sparkube: {
        name: 'Sparkube',
        dexNote: 'Il plante sa queue en éclair dans le sol pour canaliser la foudre sur ses cibles.',
      },
      raicube: {
        name: 'Raicube',
        dexNote: `L’oiseau-éclair de ${WORLD_NAME} : un battement d’ailes suffit à charger l’air d’éclairs.`,
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
    INGREDIENTS: {
      ruby_berry: {
        name: 'Baie Rubis',
        description: 'Petit fruit rouge croquant apprécié des créatures Feu et Plante.',
      },
      crimson_root: {
        name: 'Racine Ardente',
        description: 'Racine épicée rare qui relève les soupes de type Feu.',
      },
      azure_drop: {
        name: 'Baie Azur',
        description: 'Baie juteuse bleue adorée des espèces aquatiques.',
      },
      frost_crystal: {
        name: 'Cristal Glacé',
        description: 'Éclat minéral bleu profond prisé des créatures Eau et Psy.',
      },
      sun_pollen: {
        name: 'Pollen Solaire',
        description: 'Poudre dorée sucrée qui attire les créatures Foudre et Plante.',
      },
      amber_honey: {
        name: 'Miel Ambré',
        description: 'Nectar épais et rare qui attire des recrues d’élite.',
      },
      pebble_gray: {
        name: 'Galet Fossile',
        description: 'Caillou aromatique prisé des créatures Roche et défensives.',
      },
      mystic_shard: {
        name: 'Fragment Mystique',
        description: `Relique prismatique rare capable d’attirer les ${CREATURE_NOUN.plural} légendaires.`,
      },
      snow_lichen: {
        name: 'Lichen des Neiges',
        description: 'Mousse croquante cueillie sous la glace, friandise des créatures de la Toundra.',
      },
      aurora_petal: {
        name: 'Pétale d’Aurore',
        description: 'Pétale lumineux qui ne s’ouvre que sous les aurores boréales.',
      },
      storm_pepper: {
        name: 'Poivre d’Orage',
        description: 'Grain qui crépite sur la langue, ramassé au pied des paratonnerres.',
      },
      cloud_fluff: {
        name: 'Flocon de Nuage',
        description: 'Mousse de nuage sucrée, légère comme l’air, prélevée sur la mer de nuages.',
      },
      mesa_fig: {
        name: 'Figue des Mesas',
        description: 'Fruit confit par le soleil du canyon, que les béliers des mesas se disputent.',
      },
      amber_resin: {
        name: 'Résine d’Ambre',
        description: 'Goutte dorée qui perle des arches fossiles et parfume toute la marmite.',
      },
    },
    POT_TIER_META: {
      iron: {
        label: 'Marmite en Fer',
        unlockHint: 'Disponible dès le départ',
      },
      bronze: {
        label: 'Marmite en Bronze',
        unlockHint: 'Débloquée après la Prairie Émeraude',
      },
      silver: {
        label: 'Marmite en Argent',
        unlockHint: 'Débloquée après la Rive Azur',
      },
      gold: {
        label: 'Marmite en Or',
        unlockHint: 'Débloquée après la Crête Volcanique',
      },
    },
    RECIPES: {
      summit_feast: {
        name: 'Festin des Cimes',
        description: 'Un festin irisé, servi tout en haut, qui attire les formes rares et mystiques.',
        hint: 'Utilisez au moins 2 Fragments Mystiques.',
      },
      fiery_soup: {
        name: 'Soupe Ardente',
        description: 'Un potage épicé fumant qui attire les créatures de type Feu.',
        hint: 'Au moins 3 ingrédients rouges (Baie Rubis, Racine Ardente).',
      },
      ocean_nectar: {
        name: 'Nectar des Océans',
        description: 'Un velouté bleu azur irrésistible pour les créatures de type Eau.',
        hint: 'Au moins 3 ingrédients bleus (Baie Azur, Cristal Glacé).',
      },
      spark_curry: {
        name: 'Curry Foudroyant Doré',
        description: 'Un plat pétillant aux arômes dorés qui attire les créatures Foudre.',
        hint: 'Au moins 3 ingrédients jaunes (Pollen Solaire, Miel Ambré).',
      },
      mineral_stew: {
        name: 'Mijoté Minéral',
        description: 'Un ragoût roboratif qui fait sortir les créatures de type Roche.',
        hint: 'Au moins 3 ingrédients gris (Galet Fossile).',
      },
      botanical_broth: {
        name: 'Bouillon Végétal',
        description: 'Mélange parfumé de baies et de pollen adoré des créatures Plante.',
        hint: 'Combinez au moins 2 jaunes et 2 rouges (ou 2 bleus).',
      },
      astral_veloute: {
        name: 'Velouté Astral',
        description: 'Recette délicate aux cristaux et miel attirant les créatures Psy.',
        hint: 'Mélangez au moins 3 ingrédients rares (Cristal, Miel, Racine) ou 1 Fragment Mystique.',
      },
      sweet_crepe: {
        name: 'Crêpe Douceur Cubique',
        description: 'Recette rapide et gourmande appréciée des jeunes compagnons vifs.',
        hint: 'Au moins 2 Pollen Solaire et 2 Baie Azur.',
      },
      royal_feast: {
        name: 'Festin d’Élite',
        description: 'Un mets raffiné composé de 5 ingrédients rares pour attirer des formes évoluées.',
        hint: '5 ingrédients de rareté Rare ou Mystique.',
      },
      aurora_banquet: {
        name: 'Banquet Boréal',
        description: 'Un festin phosphorescent qui attire les formes évoluées et rares des confins.',
        hint: 'Au moins 2 Pétales d’Aurore et 1 Fragment Mystique.',
      },
      glacier_sorbet: {
        name: 'Sorbet du Glacier',
        description: 'Une glace pilée au lichen dont raffolent les cerfs de givre.',
        hint: 'Au moins 3 Lichens des Neiges.',
      },
      permafrost_fondue: {
        name: 'Fondue Permafrost',
        description: 'Des galets brûlants plongés dans la neige fondue : irrésistible pour les golems de glace.',
        hint: 'Au moins 2 Lichens des Neiges et 2 Galets Fossiles.',
      },
      thunder_tajine: {
        name: 'Tajine Tonnerre',
        description: 'Un plat qui crépite dans la marmite et fait accourir les serpents-éclairs.',
        hint: 'Au moins 2 Poivres d’Orage.',
      },
      cloud_meringue: {
        name: 'Meringue Céleste',
        description: 'Une mousse si légère qu’elle flotte hors de la marmite jusqu’aux nuages rêveurs.',
        hint: 'Au moins 3 Flocons de Nuage.',
      },
      frontier_hotpot: {
        name: 'Potée des Confins',
        description: 'La soupe du voyageur : attire les jeunes créatures de la Toundra et de la Cime.',
        hint: 'Au moins 1 Lichen des Neiges et 1 Flocon de Nuage.',
      },
      mesa_roast: {
        name: 'Rôti des Mesas',
        description: 'Des figues rôties sur pierre chaude qui font dévaler les béliers des mesas.',
        hint: 'Au moins 3 Figues des Mesas.',
      },
      camp_stew: {
        name: 'Ragoût du Camp',
        description: `La recette classique de ${WORLD_NAME} : attire toutes les espèces de base.`,
        hint: 'N’importe quel mélange varié de 5 ingrédients.',
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
        shortTag: 'ÉLEC',
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
    QUEST_POOL: {
      q_win_1: {
        title: 'Patrouille de l’Île',
        description: 'Remportez 1 expédition dans n’importe quel biome.',
        reward: {
          label: '3× Baie Rubis · 3× Baie Azur',
        },
      },
      q_bursts_3: {
        title: 'Alchimiste Élémentaire',
        description: 'Déclenchez 3 Éclats en combat.',
        reward: {
          label: 'Galet (Argent) · 2× Miel Ambré',
        },
      },
      q_ult_1: {
        title: 'Force Unie',
        description: 'Déclenchez 1 Déchaînement (touche R) en expédition.',
        reward: {
          label: '1× Rune de Cadence · 2× Cristal Glacé',
        },
      },
      q_cook_1: {
        title: 'Chef du Camp',
        description: 'Lancez 1 cuisson dans la Marmite du Camp.',
        reward: {
          label: '4× Pollen Solaire · 2× Racine Ardente',
        },
      },
      q_dodge_2: {
        title: 'Réflexes de Cube',
        description: 'Réussissez 2 Esquives Parfaites pendant un télégraphe.',
        reward: {
          label: '1× Rune de Partage · 3× Galet Fossile',
        },
      },
      q_boss_2: {
        title: 'Chasseur de Boss',
        description: 'Vainquez 2 Boss de fin de niveau.',
        reward: {
          label: 'Galet (Or) · 1× Fragment Mystique',
        },
      },
      q_bursts_6: {
        title: 'Maître des Synergies',
        description: 'Déclenchez 6 Éclats au total.',
        reward: {
          label: '1× Rune de Force · 2× Racine Ardente',
        },
      },
      q_win_3: {
        title: 'Explorateur Infatigable',
        description: 'Terminez 3 expéditions victorieuses.',
        reward: {
          label: '1× Rune d’Ampleur · 2× Fragment Mystique',
        },
      },
      q_frontier_win_2: {
        title: 'Éclaireur des Confins',
        description: 'Remportez 2 expéditions dans la Toundra Boréale ou la Cime des Orages.',
        reward: {
          label: '1× Rune de Précision · 3× Lichen des Neiges',
        },
      },
      q_frontier_dish_1: {
        title: 'Cuisine des Confins',
        description: 'Lancez 1 recette des nouveaux biomes dans la Marmite.',
        reward: {
          label: '2× Pétale d’Aurore · 2× Flocon de Nuage',
        },
      },
      q_frontier_boss_3: {
        title: 'Dompteur de Tempêtes',
        description: 'Vainquez 3 boss de la Toundra Boréale ou de la Cime des Orages.',
        reward: {
          label: '1× Rune de Vigueur · Galet Or (+700–950)',
        },
      },
      q_evolve_frontier: {
        title: 'Nouvelle Forme',
        description: `Faites évoluer 1 ${CREATURE_NOUN.singular} au Camp.`,
        reward: {
          label: '2× Poivre d’Orage · 2× Miel Ambré',
        },
      },
    },
    ACHIEVEMENTS: {
      ach_first_win: {
        title: 'Premier Pas sur l’Île',
        description: 'Remportez votre toute première expédition.',
        reward: {
          label: '4× Baie Rubis · 4× Pollen Solaire',
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
          label: '2× Cristal Glacé · 2× Racine Ardente',
        },
      },
      ach_burst_master: {
        title: 'Architecte des Éclats',
        description: 'Déclenchez 15 Éclats au total.',
        reward: {
          label: '1× Rune de Force · 2× Fragment Mystique',
        },
      },
      ach_trios_5: {
        title: 'Cadence Infernale',
        description: 'Réussissez 5 Trios au total.',
        reward: {
          label: '1× Rune de Cadence · 3× Miel Ambré',
        },
      },
      ach_ult_3: {
        title: 'Déchaînement !',
        description: 'Déclenchez 3 attaques Ultimes d’escouade.',
        reward: {
          label: 'Galet Or (+110–170)',
        },
      },
      ach_dodge_3: {
        title: 'Intouchables',
        description: 'Réussissez 3 Esquives Parfaites face aux attaques télégraphiées.',
        reward: {
          label: '1× Rune de Partage · 3× Baie Azur',
        },
      },
      ach_cook_3: {
        title: 'Toque Cubique',
        description: 'Préparez 3 plats dans la Marmite du Camp.',
        reward: {
          label: '3× Miel Ambré · 1× Fragment Mystique',
        },
      },
      ach_evolve_1: {
        title: 'Métamorphose',
        description: `Faites évoluer votre premier ${CREATURE_NOUN.singular}.`,
        reward: {
          label: '1× Rune d’Ampleur · 3× Racine Ardente',
        },
      },
      ach_dex_8: {
        title: 'Naturaliste de l’Île',
        description: 'Découvrez 8 espèces différentes dans le Bestiaire.',
        reward: {
          label: '2× Fragment Mystique · 3× Cristal Glacé',
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
          label: '5× Fragment Mystique · Galet Or (+380–520)',
        },
      },
      ach_tundra_clear: {
        title: 'Brise-Glace',
        description: 'Terminez les 3 niveaux de la Toundra Boréale.',
        reward: {
          label: '1× Rune de Précision · 3× Pétale d’Aurore',
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
          label: '5× Fragment Mystique · Galet Or (+1100–1400)',
        },
      },
      ach_dex_20: {
        title: 'Grand Naturaliste',
        description: 'Découvrez 20 espèces différentes dans le Bestiaire.',
        reward: {
          label: '3× Pétale d’Aurore · 3× Poivre d’Orage',
        },
      },
      ach_dex_all: {
        title: 'Bestiaire Complet',
        description: (a: string | number) => `Découvrez les ${a} espèces de ${WORLD_NAME} et de ses confins.`,
        reward: {
          label: '3× Fragment Mystique · Galet Or (+1000–1300)',
        },
      },
      ach_frontier_dish_3: {
        title: 'Chef des Confins',
        description: 'Préparez 3 recettes des nouveaux biomes.',
        reward: {
          label: '4× Lichen des Neiges · 4× Flocon de Nuage · 2× Fragment Mystique',
        },
      },
      ach_evolve_5: {
        title: 'Éleveur Émérite',
        description: `Faites évoluer 5 ${CREATURE_NOUN.plural}.`,
        reward: {
          label: '1× Rune de Force · 3× Poivre d’Orage',
        },
      },
    },
  },
};
