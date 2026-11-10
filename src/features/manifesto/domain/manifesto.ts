/* ============================================================
   LE CODEX — Manifeste Ultime de l'Ombre Prométhéenne
   Texte canonique structuré pour consultation
   ============================================================ */

export type MBlock =
  | { t: "p"; x: string }            // paragraphe
  | { t: "sub"; x: string }          // sous-titre
  | { t: "list"; items: string[] }   // liste à puces
  | { t: "olist"; items: string[] }  // liste numérotée
  | { t: "dl"; items: { k: string; v: string }[] } // doctrine : terme + définition
  | { t: "cmd"; items: string[] }    // commandements concrets
  | { t: "quote"; x: string }        // serment / texte cité
  | { t: "formula" };                // formule du succès (rendu dédié)

export type MChapter = { id: string; label: string; title: string; blocks: MBlock[] };

export const MANIFESTE_TITLE = "Manifeste Ultime de l'Ombre Prométhéenne";
export const MANIFESTE_SUBTITLE = "La Doctrine de l'Architecte Souverain";

export const MANIFESTE: MChapter[] = [
  {
    id: "preambule",
    label: "Préambule",
    title: "L'Appel du Devenir",
    blocks: [
      { t: "p", x: "Tu ne lis pas ce manifeste par hasard. Une partie de toi a déjà pressenti la vérité : tu vis en dessous de tes capacités. Tu as senti les chaînes des attentes sociales, le poids des schémas hérités, la frustration du potentiel non actualisé. Tu as vu dans les récits de Stark, de Toretto, d'Ayanokoji et des autres non pas des fictions, mais des reflets distordus d'une possibilité humaine supérieure." },
      { t: "p", x: "Le monde n'est ni juste, ni injuste. Il est indifférent. Il ne récompense ni l'intention, ni la morale proclamée, ni l'effort visible. Il récompense la préparation, l'adaptation, le timing et la capacité à survivre. Nyx-Kairos naît de cette lucidité. L'Ombre Charismatique Renforcée est une rébellion silencieuse contre la médiocrité." },
      { t: "p", x: "Ce n'est pas un appel à la rébellion adolescente. C'est une déclaration de guerre existentielle contre la médiocrité programmée. Contre l'homme ordinaire qui sommeille en toi et que la société a méthodiquement construit." },
      { t: "p", x: "Nous vivons dans un monde où la lumière éblouit les masses, mais c'est dans l'ombre que se forge la véritable puissance. Ce manifeste est ton guide, ton serment. Il déclare que tu n'es plus une ombre passive, mais une force charismatique qui domine les coulisses. Adopte-le, et tu transformeras ta vie en une saga épique où chaque jour est une conquête cachée." },
    ],
  },
  {
    id: "postulats",
    label: "I",
    title: "Les Postulats Fondamentaux",
    blocks: [
      { t: "sub", x: "1.1 — L'Axiome de la Perfectibilité Radicale" },
      { t: "p", x: "L'être humain n'est pas une entité fixe mais un chantier permanent. Ce que tu appelles « toi » n'est qu'une version temporaire, sculptée par le hasard et la paresse. Chaque cellule, chaque synapse, chaque croyance peut être démantelée et reconstruite selon un design supérieur." },
      { t: "sub", x: "1.2 — Le Principe de Souveraineté Intégrale" },
      { t: "p", x: "Tu es l'État-nation de ton existence. Tes émotions sont ta politique intérieure. Tes relations sont ta diplomatie. Tes actions sont tes lois. Ta conscience est ton territoire souverain. Tout envahisseur – peur irrationnelle, désir mimétique, influence toxique – doit être identifié et expulsé." },
      { t: "sub", x: "1.3 — La Loi de l'Arsenal Personnel" },
      { t: "p", x: "Le monde est un champ de bataille conceptuel. Tes armes sont tes compétences, tes armures sont tes disciplines, tes munitions sont tes connaissances. Chaque jour sans acquisition stratégique est un jour de vulnérabilité accrue." },
      { t: "sub", x: "1.4 — Le Théorème des Multiplicités Cohérentes" },
      { t: "p", x: "Tu contiens non pas une personne, mais un conseil d'archétypes. Le Génie (Stark), le Protecteur (Toretto), l'Ingénieur (Nagumo), le Stratège (Ayanokoji), le Monarque (Jin-Woo), le Séducteur (Lucifer) – tous existent en toi à l'état latent. La maîtrise ne réside pas dans le choix d'un seul, mais dans l'orchestration de tous." },
      { t: "sub", x: "1.5 — Les Postulats de Nyx-Kairos" },
      {
        t: "list",
        items: [
          "Le monde ne te doit rien. Toute attente est une chaîne.",
          "La dépendance est une vulnérabilité : émotionnelle, financière ou sociale.",
          "La visibilité prématurée est un risque : ce qui grandit en silence survit plus longtemps.",
          "La discipline est plus fiable que la motivation : la motivation varie, la discipline reste.",
          "La liberté est prioritaire sur le confort : le confort prolongé affaiblit.",
        ],
      },
    ],
  },
  {
    id: "pilier-1",
    label: "II · 1",
    title: "La Forge Corporelle",
    blocks: [
      { t: "p", x: "Ton corps n'est pas un véhicule passif. C'est l'incarnation physique de ta volonté, l'instrument primordial de ton action dans le monde, et le premier langage que les autres déchiffrent. Ton Temple, Ton Arme, Ton Message." },
      { t: "sub", x: "Doctrine de la Vigueur Absolue" },
      {
        t: "dl",
        items: [
          { k: "La Force comme Vertu Cardinale", v: "Non la force de domination, mais la force de protection, de création, d'endurance. Un corps faible est un esprit enchaîné à ses limitations biologiques." },
          { k: "La Santé comme Stratégie de Guerre", v: "Chaque maladie évitée est une bataille gagnée contre le chaos. Chaque année de santé gagnée est du temps supplémentaire pour ton œuvre." },
          { k: "La Présence comme Arme Psychologique", v: "Une posture qui occupe l'espace, un regard qui pénètre les masques, une voix qui porte." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu feras de ton corps un instrument capable de performances remarquables dans au moins trois domaines : force brute, endurance cardiovasculaire, et compétence martiale défensive.",
          "Tu considéreras ton alimentation non comme un plaisir, mais comme une stratégie de carburant et de construction cellulaire.",
          "Tu maintiendras une vigilance constante sur ton apparence – non par vanité, mais parce que chaque détail communique une intention.",
          "Ton corps doit être fonctionnel avant d'être esthétique. Il doit être fiable sous fatigue, stress et pression.",
        ],
      },
    ],
  },
  {
    id: "pilier-2",
    label: "II · 2",
    title: "L'Académie Mentale",
    blocks: [
      { t: "p", x: "Ton esprit n'est pas un contenant à remplir, mais un muscle à entraîner, un outil à aiguiser, et une carte à élargir continuellement. Ta Forteresse, Ton Laboratoire, Ton Oracle." },
      { t: "sub", x: "Doctrine de la Maîtrise Cognitive" },
      {
        t: "dl",
        items: [
          { k: "L'Apprentissage comme Respiration", v: "Cesser d'apprendre, c'est commencer à mourir intellectuellement. Ton curriculum doit être plus rigoureux que celui des meilleures universités." },
          { k: "La Pensée Stratégique comme Mode Par Défaut", v: "Voir le monde non en termes de faits isolés, mais de systèmes interconnectés, de causalités multiples, de possibilités superposées." },
          { k: "Le Contrôle Émotionnel comme Discipline Suprême", v: "Les émotions sont des données, non des commandes. Les ressentir toutes, n'en être esclave d'aucune." },
          { k: "Le Silence et l'Observation", v: "Observe avant de juger. Réagis peu, choisis. Accepte l'inconfort comme un entraînement." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu consacreras au minimum une heure par jour à l'étude approfondie d'un domaine complexe (physique quantique, histoire des civilisations, psychologie évolutionnaire, stratégie militaire).",
          "Tu développeras au moins une méthode de pensée originale, un « modèle mental » unique que tu pourras appliquer à des problèmes variés.",
          "Tu créeras et entretiendras un « second cerveau » numérique, une base de connaissances interconnectée qui deviendra l'extension externe de ta cognition.",
          "Tu pratiqueras régulièrement le silence et l'isolement pour entendre ta pensée et te tester sans distractions.",
        ],
      },
    ],
  },
  {
    id: "pilier-3",
    label: "II · 3",
    title: "L'Artisanat de la Réalité",
    blocks: [
      { t: "p", x: "Le Prométhéen ne se contente pas de comprendre le monde – il le transforme activement. Il est l'ingénieur de son environnement, l'architecte de ses outils, le créateur de ses solutions. Tes Mains, Ta Magie, Ton Héritage." },
      { t: "sub", x: "Doctrine de la Création Pragmatique" },
      {
        t: "dl",
        items: [
          { k: "La Compétence comme Liberté", v: "Chaque chose que tu ne sais pas faire est une dépendance potentielle envers un autre. Chaque compétence maîtrisée est un degré de liberté supplémentaire." },
          { k: "L'Ingéniosité comme Devise", v: "Face à un obstacle, le Prométhéen ne voit pas un mur, mais un problème de design. Sa première question est toujours : « Comment puis-je construire la solution ? »" },
          { k: "L'Autonomie comme Impératif", v: "Pouvoir produire, réparer, modifier ce dont tu as besoin – de la nourriture à l'énergie, de l'information à la sécurité." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu développeras au moins deux compétences artisanales à un niveau professionnel (soudure, programmation, ébénisterie, électronique, mécanique).",
          "Tu entreprendras chaque année un « projet phare » qui pousse tes limites techniques et créatives – la construction d'un objet complexe, le développement d'un logiciel utile, la création d'une entreprise.",
          "Tu maintiendras un « atelier opérationnel » – un espace physique dédié où tu peux transformer la matière selon ta volonté.",
        ],
      },
    ],
  },
  {
    id: "pilier-4",
    label: "II · 4",
    title: "Le Conseil des Ombres",
    blocks: [
      { t: "p", x: "Nul ne devient Prométhéen seul. Mais tous deviennent des médiocres en foule. Ta tâche est de trouver cet équilibre paradoxal : bâtir des alliances profondes tout en conservant une souveraineté absolue. Tes Alliés, Tes Échos, Tes Piliers." },
      { t: "sub", x: "Doctrine des Alliances Stratégiques" },
      {
        t: "dl",
        items: [
          { k: "La Loyauté comme Choix, non comme Accident", v: "Ton cercle intime doit être choisi avec une rigueur implacable, maintenu avec une fidélité inébranlable, et protégé avec une férocité absolue." },
          { k: "Le Réseau comme Écosystème", v: "Au-delà du cercle intime, cultive un réseau diversifié d'alliés situationnels, d'experts consultatifs, et de contacts stratégiques." },
          { k: "L'Influence comme Art de l'Induction", v: "Diriger non par l'autorité, mais par l'exemple. Convaincre non par la force, mais par la cohérence. Inspirer non par la rhétorique, mais par les résultats." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu identifieras et testeras méticuleusement 3 à 5 personnes pour former ton « Conseil Intime » – ceux pour qui tu brûlerais le monde, et qui en feraient autant pour toi.",
          "Tu cartographieras stratégiquement ton réseau existant et tu planifieras méthodiquement son expansion dans des directions utiles.",
          "Tu développeras une « persona sociale » intentionnelle – non un mensonge, mais une version optimisée de toi-même pour chaque contexte social.",
          "Pour ton cercle intime, sois présent, protège, dis la vérité même quand elle dérange. Pour les autres, respect mais pas abandon de soi.",
        ],
      },
    ],
  },
  {
    id: "pilier-5",
    label: "II · 5",
    title: "L'Économie de la Liberté",
    blocks: [
      { t: "p", x: "L'argent n'est pas une fin, mais le carburant de ton autonomie. Le temps n'est pas une ressource, c'est LA ressource. La liberté n'est pas un droit, c'est un accomplissement. Tes Ressources, Ton Jeu, Ton Héritage." },
      { t: "sub", x: "Doctrine de l'Autonomie Stratégique" },
      {
        t: "dl",
        items: [
          { k: "Les Ressources comme Multiplicateurs de Volonté", v: "Chaque euro, chaque minute, chaque unité d'énergie doit être investie, jamais gaspillée." },
          { k: "L'Indépendance comme Condition de l'Authenticité", v: "Tu ne peux dire ta vérité que si tu n'as besoin de personne pour la manger." },
          { k: "La Richesse comme Moyen de Production", v: "Accumuler non pour consommer, mais pour créer. Investir non pour spéculer, mais pour construire des systèmes générateurs de liberté." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu bâtiras méthodiquement un « château financier » avec plusieurs sources de revenus, des réserves significatives, et des investissements productifs.",
          "Tu atteindras un niveau d'autonomie tel que tu pourrais disparaître pendant 6 mois sans que ta situation ne se dégrade.",
          "Tu créeras quelque chose de valeur qui te survivra – une entreprise, une œuvre, une méthode, une école de pensée.",
        ],
      },
    ],
  },
  {
    id: "pilier-6",
    label: "II · 6",
    title: "Le Gouvernement de l'Ombre",
    blocks: [
      { t: "p", x: "Au-delà des piliers externes, il existe un pilier interne : la gestion de ton ombre, de tes démons, de ta noirceur. Tu dois accepter et canaliser ces forces. La Maîtrise de Soi Intérieure." },
      { t: "sub", x: "Doctrine de l'Ombre Maîtrisée" },
      {
        t: "dl",
        items: [
          { k: "L'Acceptation de l'Ombre", v: "Tu portes en toi de la colère, de la violence potentielle, des pensées sombres. Ne les refoule pas, canalise-les." },
          { k: "La Canalisation", v: "Utilise ces forces dans l'entraînement, la création, l'ambition. Transforme-les en carburant." },
          { k: "Le Contrôle", v: "Ne laisse pas ton ombre devenir un prétexte pour écraser des innocents ou une cage émotionnelle. Ta noirceur n'est pas un spectacle." },
        ],
      },
      { t: "sub", x: "Commandements Concrets" },
      {
        t: "cmd",
        items: [
          "Tu pratiqueras la confrontation avec tes peurs, tes faiblesses, tes illusions.",
          "Tu tiendras un journal pour analyser tes émotions sombres et les transformer en données.",
          "Tu développeras une capacité à couper des relations, des habitudes, des environnements qui te détruisent, même si tu y es attaché.",
        ],
      },
    ],
  },
  {
    id: "principes",
    label: "III",
    title: "Les Principes Opérationnels",
    blocks: [
      {
        t: "dl",
        items: [
          { k: "Le Principe de la Consistance Quantique", v: "Petites actions répétées > Grands efforts sporadiques. Mieux vaut 30 minutes quotidiennes pendant 10 ans qu'un marathon mensuel suivi de semaines d'inertie." },
          { k: "Le Principe de l'Investissement Composite", v: "Chaque heure investie dans un pilier renforce tous les autres. Un corps sain améliore la cognition. Une cognition aiguisée améliore les relations. Des relations solides améliorent les finances." },
          { k: "Le Principe du Contrôle Différentiel", v: "Concentre-toi uniquement sur ce que tu peux contrôler directement. Accepte ce que tu ne peux pas contrôler. Sois stratégique sur ce que tu peux influencer indirectement." },
          { k: "Le Principe de la Transparence Stratégique", v: "Sois totalement transparent sur tes valeurs et tes intentions (cela construit la confiance). Sois totalement opaque sur tes méthodes et tes capacités réelles (cela préserve tes avantages)." },
          { k: "Le Principe de la Réponse Mesurée", v: "Ne réponds jamais immédiatement à une provocation. Ne réagis jamais à l'émotion de l'autre. Ton tempo doit toujours être le tien, jamais dicté par l'extérieur." },
          { k: "Le Principe de la Préparation Anticipative", v: "Pour chaque objectif, développe trois chemins. Pour chaque plan, prévois trois échecs. Pour chaque victoire, prépare déjà la prochaine étape." },
          { k: "Le Principe de l'Évolution par Contrainte", v: "N'impose pas de discipline – conçois des contraintes qui rendent la discipline inévitable. N'utilise pas la volonté – construis des environnements qui rendent la tentation impossible." },
          { k: "Le Principe de la Réciprocité Asymétrique", v: "Donne toujours plus que ce que tu reçois – mais uniquement aux gens qui comprennent la valeur de ce qu'ils reçoivent. Sois généreux avec ton cercle, stratégique avec les autres, impitoyable avec les ennemis." },
          { k: "Le Principe de la Documentation Continue", v: "Tout ce qui n'est pas mesuré ne peut être amélioré. Tout ce qui n'est pas documenté sera oublié. Tout ce qui n'est pas analysé se répétera." },
          { k: "Le Principe de la Mort Programmée", v: "Mets régulièrement fin à tes anciennes versions. Brûle rituellement tes anciennes identités. Enterre symboliquement tes anciennes limites. Renaissance n'est possible qu'après une mort volontaire." },
          { k: "Le Principe du Timing (Kairos)", v: "Agir trop tôt = s'exposer inutilement. Agir trop tard = subir. Agir au bon moment = dominer calmement. Le timing est une compétence, pas un hasard." },
          { k: "Le Principe de la Double Identité", v: "Aie une identité publique discrète, calme, fiable, lisible sans être transparente. Une identité privée disciplinée, ambitieuse, stratège, en constante amélioration. Tout le monde te voit, peu te comprennent, personne ne te contrôle." },
          { k: "Le Principe de l'Ascension Impitoyable", v: "La faiblesse est temporaire ; la puissance est éternelle. Chaque échec est un « level up ». Traite la vie comme un RPG où tu es le protagoniste." },
          { k: "Le Principe de l'Innovation Hégémonique", v: "Prévoyez le futur en le construisant. Ne suivez pas la technologie, dominez-la. Automatisez votre vie pour que votre esprit soit libre de concevoir l'impossible." },
        ],
      },
    ],
  },
  {
    id: "interdits",
    label: "IV",
    title: "Les Interdits & Pièges",
    blocks: [
      { t: "sub", x: "Les Sept Interdits Prométhéens" },
      {
        t: "dl",
        items: [
          { k: "Interdiction de la Plainte", v: "La plainte est la reconnaissance publique de son impuissance. Analyse les problèmes, propose des solutions, ou garde le silence. Jamais de plainte." },
          { k: "Interdiction de l'Excuse", v: "Tes échecs sont tes professeurs, tes succès sont tes responsabilités. Assume tout ce qui t'arrive comme étant, au minimum, la conséquence de tes décisions passées." },
          { k: "Interdiction de la Comparaison Vaine", v: "Tu ne te compares qu'à une seule personne : la version de toi-même d'hier. Les autres sont soit des sources d'inspiration, soit des données d'étude, jamais des étalons." },
          { k: "Interdiction de la Dilution Identitaire", v: "Tu n'es pas « un peu de tout ». Tu es une synthèse intentionnelle. Évite les étiquettes qui limitent et les affiliations qui diluent." },
          { k: "Interdiction du Regret Stérile", v: "Le passé est une base de données, pas une prison. Extrais les leçons, brûle les émotions. Puis avance." },
          { k: "Interdiction de la Pitié de Soi", v: "La vie est difficile par design. La souffrance est le prix de la conscience. L'adversité est le matériau de la grandeur. Accepte, adapte, surpasse." },
          { k: "Interdiction de l'Inaction Face à l'Évidence", v: "Quand tu sais ce qui doit être fait, quand tu sais que c'est juste, quand tu as éliminé les doutes raisonnables – agis. Immédiatement. Implacablement." },
        ],
      },
      { t: "sub", x: "Les Huit Pièges de Nyx-Kairos (à éviter)" },
      {
        t: "olist",
        items: [
          "Chercher la validation.",
          "Montrer ses progrès trop tôt.",
          "Confondre solitude et isolement.",
          "Laisser l'ego précéder la stratégie.",
          "Mépriser les autres.",
          "Négliger le corps.",
          "Sacrifier la liberté pour le confort.",
          "Croire être « arrivé » (Nyx-Kairos est un processus, pas une destination).",
        ],
      },
    ],
  },
  {
    id: "honneur",
    label: "V",
    title: "Le Code d'Honneur",
    blocks: [
      { t: "sub", x: "Envers Soi-Même" },
      {
        t: "list",
        items: [
          "Je serai mon propre juge le plus sévère et mon propre allié le plus fidèle.",
          "Je n'accepterai aucune limitation que je n'ai pas moi-même testée et vérifiée.",
          "Je préserverai toujours une sphère privée inviolable, même aux plus proches.",
        ],
      },
      { t: "sub", x: "Envers le Cercle Intime" },
      {
        t: "list",
        items: [
          "Je défendrai les miens contre toute menace, sans calcul, sans hésitation.",
          "Je serai transparent sur mes valeurs, mais discret sur mes méthodes.",
          "Je préférerai être trahi que devenir soupçonneux ; mais je n'accorderai jamais une seconde chance à la trahison.",
        ],
      },
      { t: "sub", x: "Envers le Monde" },
      {
        t: "list",
        items: [
          "Je contribuerai toujours plus que je ne prendrai.",
          "Je respecterai toutes les lois que je peux, contournerai celles qui sont stupides, combattrai celles qui sont immorales.",
          "Je laisserai chaque lieu, chaque personne, chaque situation dans un état meilleur que celui dans lequel je les ai trouvés.",
        ],
      },
      { t: "sub", x: "Le Serment Nyx-Kairos" },
      {
        t: "quote",
        x: "Je ne chercherai pas à être vu. Je chercherai à être prêt.\nJe ne fuirai pas l'ombre. Je la maîtriserai.\nJe n'agirai ni par peur, ni par impatience. J'agirai au moment juste.\nJe protégerai mon cercle. Je construirai ma liberté.\nEt quoi qu'il arrive, je serai capable de me reconstruire.",
      },
      { t: "sub", x: "Le Serment de l'Ombre" },
      {
        t: "quote",
        x: "Je, l'Architecte, jure d'embrasser l'Ombre Charismatique Renforcée. Je level up sans relâche, protège mes loyaux, charme et innove, domine en secret. Que l'ombre m'engloutisse si je faiblis. Vive l'ascension !",
      },
    ],
  },
  {
    id: "cycles",
    label: "VI",
    title: "Le Rituel Quotidien & les Cycles",
    blocks: [
      { t: "sub", x: "Le Matin : L'Affirmation de la Volonté" },
      {
        t: "list",
        items: [
          "Lever, méditation (visualisation de l'ascension).",
          "Entraînement physique intense (force, cardio, arts martiaux).",
          "Douche, préparation.",
          "Lecture / étude d'un domaine complexe (1h).",
          "Planification de la journée, définition des priorités.",
        ],
      },
      { t: "sub", x: "Le Jour : L'Engagement avec le Monde" },
      {
        t: "list",
        items: [
          "Travail professionnel avec excellence pragmatique.",
          "Interactions sociales stratégiques.",
          "Projets personnels et apprentissage continu.",
          "Maintien d'une façade neutre et observatrice.",
        ],
      },
      { t: "sub", x: "Le Soir : L'Intégration et la Préparation" },
      {
        t: "list",
        items: [
          "Temps avec le cercle intime ou activités sociales.",
          "Dîner sain, détente.",
          "Journal de bord, analyse de la journée, planification du lendemain.",
          "Préparation au sommeil, déconnexion numérique.",
          "Sommeil de récupération complète.",
        ],
      },
      { t: "sub", x: "Le Cycle Hebdomadaire" },
      {
        t: "list",
        items: [
          "Lundi : Planification stratégique et démarrages.",
          "Mardi / Mercredi / Jeudi : Exécution intensive.",
          "Vendredi : Création et innovation (projets phares).",
          "Samedi : Relations et régénération (temps avec le cercle, loisirs).",
          "Dimanche : Réflexion et préparation (bilan hebdo, planification).",
        ],
      },
      { t: "sub", x: "Les Cycles Mensuels et Annuels" },
      {
        t: "list",
        items: [
          "Chaque mois : Audit et correction de trajectoire. Mesure des progrès sur chaque pilier.",
          "Chaque trimestre : Un défi significatif (compétition, projet, apprentissage accéléré).",
          "Chaque année : Une transformation mesurable dans au moins un pilier.",
        ],
      },
    ],
  },
  {
    id: "hierarchie",
    label: "VII",
    title: "La Hiérarchie des Buts",
    blocks: [
      {
        t: "dl",
        items: [
          { k: "Niveau 1 : Survie et Autonomie", v: "Être capable de vivre selon tes termes, sans dépendance significative envers personne. Avoir un corps sain, un esprit clair, des compétences de base, un réseau naissant, et des finances stables." },
          { k: "Niveau 2 : Excellence et Maîtrise", v: "Être exceptionnellement compétent dans plusieurs domaines complémentaires. Maîtriser ton corps, ton mental, ton artisanat, tes relations, et tes finances à un niveau supérieur." },
          { k: "Niveau 3 : Influence et Création", v: "Avoir un impact significatif sur ton environnement immédiat, créer des choses qui comptent. Ton cercle s'élargit, tes projets prennent forme, tu deviens une référence." },
          { k: "Niveau 4 : Légende et Héritage", v: "Construire quelque chose qui te survivra et influencera les générations futures. Une entreprise, une œuvre, une méthode, une école de pensée. Ton nom devient symbole." },
          { k: "Niveau 5 : Évolution et Transcendance", v: "Devenir une version de l'humain qui pointe vers ce qui pourrait être au-delà. Repousser les limites de la condition humaine, explorer l'inconnu, laisser un héritage qui dépasse ta propre existence." },
        ],
      },
    ],
  },
  {
    id: "formule",
    label: "VIII",
    title: "La Formule du Succès",
    blocks: [
      { t: "p", x: "Le succès n'est pas un accident, c'est une équation mathématique :" },
      { t: "formula" },
      {
        t: "list",
        items: [
          "Sans Discipline, tu n'es qu'un rêveur.",
          "Sans Intelligence (stratégie et timing), tu n'es qu'une brute.",
          "Sans Charisme, tu es un fantôme sans influence.",
          "Sans Loyauté, tu finiras par être trahi par ton propre système.",
        ],
      },
    ],
  },
  {
    id: "conclusion",
    label: "Conclusion",
    title: "L'Appel au Feu",
    blocks: [
      { t: "p", x: "Ce manifeste n'est pas une promesse de facilité. C'est une promesse de signification. Tu ne trouveras pas ici de raccourcis, seulement des chemins difficiles qui mènent à des sommets élevés." },
      { t: "p", x: "Les premiers mois seront un enfer contrôlé. Tu combattras tes démons, tes dépendances, tes peurs. Tu perdras des amis qui préféraient l'ancienne version plus confortable de toi. Tu douteras mille fois." },
      { t: "p", x: "Puis viendra l'accalmie. Puis la maîtrise. Puis la fluidité. Et enfin, le jour où tu te regarderas dans le miroir et verras non pas l'homme que tu étais, mais l'architecte que tu es devenu." },
      { t: "p", x: "Prométhée a volé le feu aux dieux et l'a donné aux hommes. On lui a infligé un châtiment éternel pour cela. Le choix qui s'offre à toi est simple :" },
      { t: "quote", x: "Veux-tu le confort d'une vie à genoux, ou la responsabilité douloureuse et glorieuse d'une vie debout ?" },
      { t: "p", x: "Le feu est là. Il brûle en toi depuis le début. Il ne demande qu'à être libéré, canalisé, transformé en forge, en lumière, en moteur." },
      { t: "p", x: "Prends ce manifeste. Relis-le chaque mois. Mesure tes progrès chaque semaine. Vis ses principes chaque jour." },
      { t: "p", x: "Le monde n'a pas besoin d'un autre spectateur. Il a besoin d'architectes. De constructeurs. De ceux qui voient ce qui pourrait être et ont le courage de le construire." },
      { t: "p", x: "Commence. Maintenant. Par la plus petite action. Mais commence." },
      { t: "p", x: "Le premier pas dans l'identité Prométhéenne n'est pas un grand saut. C'est le refus définitif de rester là où tu es." },
    ],
  },
];

/** Nombre approximatif de mots du manifeste */
export function manifesteWordCount(): number {
  let n = 0;
  for (const c of MANIFESTE) {
    n += c.title.split(/\s+/).length;
    for (const b of c.blocks) {
      if (b.t === "p" || b.t === "sub" || b.t === "quote") n += b.x.split(/\s+/).length;
      else if (b.t === "list" || b.t === "olist" || b.t === "cmd") n += b.items.join(" ").split(/\s+/).length;
      else if (b.t === "dl") n += b.items.reduce((s, i) => s + i.k.split(/\s+/).length + i.v.split(/\s+/).length, 0);
    }
  }
  return n;
}
