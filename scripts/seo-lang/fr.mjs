/** SEO français (fr) — voir scripts/seo-lang/README.md */

export default {
  lang: 'fr',
  brand: 'Puzzle Garden',

  ui: {
    moreGames: 'Autres jeux de réflexion',
    homeLink: 'Accueil Puzzle Garden',
  },

  home: {
    title: 'Puzzle Garden - Jeux de puzzle gratuits en ligne : sudoku et plus',
    description: 'Jouez gratuitement en ligne à des jeux de puzzle : sudoku, puzzle d\'images, casse-tête Queens et jeu des différences. Sans téléchargement ni inscription.',
    keywords: 'jeux de puzzle gratuits, jeux de réflexion en ligne, sudoku gratuit en ligne, puzzle en ligne gratuit, jeu des différences, jeu de logique, casse-tête, jeux de cerveau',
    siteDescription: 'Jeux de puzzle gratuits dans votre navigateur : sudoku, puzzle d\'images, casse-tête Queens et jeu des différences.',
    itemListName: 'Les jeux de Puzzle Garden',
    games: {
      sudoku: 'Sudoku gratuit en ligne : grilles classiques 9×9 de plusieurs niveaux, avec un mode contre-la-montre, des notes et des indices.',
      queens: 'Placez une reine dans chaque région colorée sans qu\'elles se touchent. Un casse-tête de logique de 1000 niveaux.',
      jigsaw: 'Échangez les pièces mélangées pour reconstituer de jolies images et des versions miniatures de tableaux célèbres.',
      snapspot: 'Comparez deux photos et touchez chaque différence. Modes Normal, Contre-la-montre et Arcade.',
    },
    h2: 'Puzzle Garden : jeux de puzzle gratuits en ligne',
    lead: '<strong>Puzzle Garden</strong> réunit des <strong>jeux de puzzle gratuits en ligne</strong> qui se lancent directement dans votre navigateur. Rien à installer, aucun compte à créer : ouvrez un jeu et jouez en quelques secondes sur votre téléphone, votre tablette ou votre ordinateur.',
    blocks: [
      {
        h3: 'Les jeux disponibles',
        p: '[[sudoku|Sudoku]] est le grand classique des chiffres, avec plusieurs niveaux de difficulté et un mode contre-la-montre. [[queens|Crown Quest]] est un jeu de logique dans le style de Queens : une reine par région colorée. [[jigsaw|Tiny Pieces]] est un puzzle d\'images apaisant aux illustrations mignonnes. [[snapspot|SnapSpot]] est un jeu des différences de plus de 750 niveaux.',
      },
      {
        h3: 'Gratuit, simple et rapide à prendre en main',
        p: 'Tous les jeux sont gratuits et ne demandent aucune inscription. Les parties courtes se glissent facilement dans une pause café, et chaque jeu démarre en douceur avant de se corser à mesure que vous progressez.',
      },
    ],
  },

  pages: {
    sudoku: {
      name: 'Sudoku',
      title: 'Sudoku gratuit en ligne - Jouer au sudoku | Puzzle Garden',
      description: 'Jouez au sudoku gratuit en ligne : grilles classiques 9×9 du niveau débutant à difficile, notes, indices et mode contre-la-montre. Sans téléchargement.',
      keywords: 'sudoku gratuit en ligne, jouer au sudoku, sudoku en ligne, sudoku facile, sudoku difficile, règles du sudoku, grilles de sudoku, sudoku débutant',
      faq: [
        ['Qu\'est-ce que le sudoku ?', 'Le sudoku est un jeu de logique qui se joue sur une grille de 9×9 cases. Il faut remplir chaque case avec un chiffre de 1 à 9, de sorte que chaque ligne, chaque colonne et chaque bloc de 3×3 contienne tous les chiffres une seule fois. Aucun calcul n\'est nécessaire : tout repose sur le raisonnement.'],
        ['Peut-on jouer au sudoku gratuitement en ligne ?', 'Oui. Le sudoku de Puzzle Garden est entièrement gratuit. Vous jouez directement dans votre navigateur, sans téléchargement ni inscription, des grilles pour débutants jusqu\'aux grilles difficiles.'],
        ['Par quel niveau commencer quand on débute ?', 'Commencez par le niveau débutant ou facile. La difficulté augmente progressivement, ce qui permet de prendre confiance. Quand vous vous sentez à l\'aise, essayez le mode contre-la-montre pour relever un nouveau défi.'],
        ['Quelles sont les règles du sudoku et comment le résoudre ?', 'Placez les chiffres de 1 à 9 dans les cases vides sans répéter un chiffre dans une même ligne, une même colonne ou un même bloc de 3×3 délimité par un trait épais. Repérez d\'abord les cases où un seul chiffre est possible : chaque chiffre posé élimine des candidats dans les cases voisines et facilite la suite.'],
        ['Existe-t-il d\'autres tailles de grille que 9×9 ?', 'Oui. En plus de la grille classique 9×9, vous trouverez de petites grilles pour débutants à partir de 6×6 et de grandes grilles jusqu\'à 16×16, ainsi qu\'un mode contre-la-montre. Les notes et les indices sont disponibles pendant la partie.'],
        ['Le sudoku est-il bon pour le cerveau ?', 'Le sudoku sollicite la concentration, le raisonnement logique et la mémoire à court terme. Beaucoup de joueurs en font une petite gymnastique mentale quotidienne.'],
      ],
      sections: [
        {
          h2: 'Sudoku gratuit en ligne : des grilles classiques dans votre navigateur',
          lead: 'Le <strong>sudoku</strong> se joue sur une grille de 9×9 cases : chaque ligne, chaque colonne et chaque bloc de 3×3 doit contenir les chiffres de 1 à 9, une seule fois. Pas besoin de calcul, seulement de la patience et de la logique, ce qui en fait l\'un des <strong>jeux de réflexion</strong> les plus populaires au monde.',
          blocks: [
            { h3: 'Comment jouer au sudoku', p: 'Touchez une case vide et saisissez un chiffre de 1 à 9. Un chiffre ne peut pas se répéter dans la même ligne, la même colonne ou le même bloc. Si vous débutez, choisissez le niveau <strong>débutant</strong> ou <strong>facile</strong> et servez-vous des notes pour garder en tête les candidats possibles. Cherchez les cases où un seul chiffre convient, remplissez-les, et poursuivez : chaque nouveau chiffre réduit les possibilités du reste de la grille.' },
            { h3: 'Niveaux de difficulté et modes de jeu', p: 'Choisissez entre des grilles débutant, facile, normal et difficile. Les petites grilles à partir de 6×6 offrent une initiation en douceur, les grandes grilles jusqu\'à 16×16 proposent un long défi, et le mode contre-la-montre vous fait jouer contre la montre.' },
            { h3: 'Une petite gymnastique mentale', p: 'Le sudoku entraîne la <strong>concentration, le raisonnement logique et la mémoire à court terme</strong>. Une grille ou deux par jour deviennent vite une habitude agréable, et le jeu est gratuit, sans téléchargement ni inscription.' },
          ],
        },
      ],
    },

    queens: {
      name: 'Crown Quest (casse-tête des reines)',
      title: 'Casse-tête Queens gratuit - Crown Quest | Puzzle Garden',
      description: 'Jouez gratuitement au casse-tête des reines (Queens) : une reine par région colorée, sans qu\'elles se touchent. Crown Quest propose 1000 niveaux en ligne.',
      keywords: 'jeu queens, casse-tête des reines, queens puzzle, jeu de logique en ligne, jeu de logique gratuit, crown quest, queens en ligne, casse-tête logique',
      faq: [
        ['Qu\'est-ce que Crown Quest (le casse-tête Queens) ?', 'Crown Quest est un jeu de logique dans le style de Queens, qui se joue sur une grille découpée en régions colorées. Il faut placer exactement une reine dans chaque région colorée, ainsi qu\'une seule par ligne et par colonne. Deux reines ne doivent jamais se toucher, même en diagonale.'],
        ['Comment résoudre un casse-tête Queens ?', 'Procédez par élimination. Barrez les cases où une reine ne peut pas aller : quand il ne reste qu\'une case possible dans une région colorée, la reine s\'y trouve forcément. Chaque reine posée exclut le reste de sa ligne, de sa colonne et toutes les cases voisines, ce qui révèle l\'indice suivant.'],
        ['Crown Quest est-il gratuit ?', 'Oui, il est entièrement gratuit. Vous jouez dans votre navigateur, sans téléchargement ni inscription. Le jeu compte 1000 niveaux et votre progression est enregistrée automatiquement.'],
        ['Est-ce différent du problème des huit reines aux échecs ?', 'C\'est un proche cousin. Le problème classique des N reines demande seulement que les reines ne s\'attaquent pas, alors qu\'ici chaque région colorée doit aussi contenir exactement une reine, ce qui garantit une solution unique. Les reines doivent seulement éviter de se toucher, donc inutile de suivre les longues diagonales des échecs.'],
        ['Faut-il être fort en maths ?', 'Non. Il n\'y a aucun calcul : c\'est un pur jeu de logique avec seulement trois règles. Les premiers niveaux se jouent sur de petites grilles, qui grandissent ensuite.'],
      ],
      sections: [
        {
          h2: 'Crown Quest : un casse-tête de logique Queens gratuit',
          lead: '<strong>Crown Quest</strong> est un <strong>casse-tête des reines</strong> (Queens) : un jeu de logique où l\'on place une reine (👑) dans chaque région colorée d\'une grille. Aucun calcul, trois règles suffisent pour jouer, et la déduction y a une saveur différente de celle du sudoku.',
          blocks: [
            { h3: 'Les trois règles', p: '<strong>1.</strong> Chaque région colorée contient exactement une reine. <strong>2.</strong> Chaque ligne et chaque colonne contient exactement une reine. <strong>3.</strong> Deux reines ne peuvent pas se toucher, y compris en <strong>diagonale</strong>.' },
            { h3: 'Comment le résoudre', p: 'Commencez par barrer les cases où une reine <strong>ne peut pas</strong> se trouver. Quand une région colorée n\'a plus qu\'une seule case possible, c\'est là que va sa reine. Chaque reine confirmée élimine toute sa ligne, sa colonne et les cases autour d\'elle : l\'indice suivant apparaît.' },
            { h3: '1000 niveaux gratuits', p: 'Les niveaux commencent sur de petites grilles puis s\'agrandissent, et votre progression est sauvegardée automatiquement. Crown Quest est un excellent moyen de travailler la <strong>logique spatiale et le raisonnement par élimination</strong>, sans téléchargement ni inscription.' },
          ],
        },
      ],
    },

    jigsaw: {
      name: 'Tiny Pieces (puzzle d\'images)',
      title: 'Puzzle en ligne gratuit - Jeu Tiny Pieces | Puzzle Garden',
      description: 'Jouez gratuitement à un jeu de puzzle en ligne : échangez les pièces pour reconstituer de jolies images et des tableaux célèbres version mignonne. Tiny Pieces.',
      keywords: 'puzzle en ligne gratuit, jeu de puzzle, puzzle en ligne, jeu de puzzle gratuit, puzzle d\'images, tiny pieces, jeu de puzzle relaxant, jouer au puzzle',
      faq: [
        ['Qu\'est-ce que Tiny Pieces ?', 'Tiny Pieces est un jeu de puzzle où vous faites glisser des pièces d\'image mélangées et les échangez pour reconstituer l\'image d\'origine. Quand deux pièces voisines se correspondent, elles s\'assemblent et se déplacent ensuite en un seul groupe.'],
        ['Comment jouer à ce puzzle ?', 'Observez l\'aperçu de l\'image au début, puis faites glisser une pièce vers l\'emplacement voulu : elle échange sa place avec la pièce qui s\'y trouve. Les groupes assemblés se déplacent ensemble, alors commencez par les bords ou les éléments les plus reconnaissables.'],
        ['Tiny Pieces est-il gratuit ?', 'Oui, il est entièrement gratuit. Vous jouez en ligne dans votre navigateur, sans téléchargement ni inscription, et votre progression est enregistrée automatiquement.'],
        ['Quelles images vais-je découvrir ?', 'Vous trouverez de mignons animaux, des villes et des plats. Tous les 10 niveaux, un niveau spécial propose une version mignonne d\'un tableau célèbre, comme la Joconde, La Grande Vague de Kanagawa ou La Jeune Fille à la perle.'],
      ],
      sections: [
        {
          h2: 'Tiny Pieces : un puzzle en ligne gratuit',
          lead: '<strong>Tiny Pieces</strong> est un <strong>jeu de puzzle</strong> relaxant, gratuit et jouable en ligne. Remettez en place des <strong>pièces d\'image</strong> mélangées pour reconstituer une illustration mignonne et colorée, sans rien télécharger.',
          blocks: [
            { h3: 'Comment jouer', p: 'Faites glisser une pièce vers un autre emplacement : les deux pièces échangent leur place. Quand les bonnes pièces se retrouvent côte à côte, elles <strong>s\'assemblent automatiquement</strong> et se déplacent ensemble. Terminez en moins de coups pour gagner plus d\'étoiles.' },
            { h3: 'Des tableaux célèbres revisités', p: 'Tous les 10 niveaux, un puzzle spécial s\'inspire d\'un tableau célèbre, comme <strong>la Joconde, La Grande Vague de Kanagawa ou La Nuit étoilée</strong>, redessiné dans un style mignon. Vous pouvez aussi collectionner des cadres de plateau et des personnages pour personnaliser votre jeu.' },
          ],
        },
      ],
    },

    snapspot: {
      name: 'SnapSpot (jeu des différences)',
      title: 'Jeu des différences gratuit en ligne - SnapSpot | Puzzle Garden',
      description: 'Jouez gratuitement au jeu des différences : comparez deux photos et trouvez chaque différence en modes Normal, Contre-la-montre et Arcade. 750+ niveaux.',
      keywords: 'jeu des différences, trouver les différences, jeu des 7 erreurs, jeu des différences gratuit, jeu des différences en ligne, jeu d\'observation, snapspot',
      faq: [
        ['Qu\'est-ce que SnapSpot ?', 'SnapSpot est un jeu des différences. Deux photos sont affichées côte à côte et vous touchez les endroits où elles ne sont pas identiques.'],
        ['Peut-on jouer gratuitement au jeu des différences ?', 'Oui, SnapSpot est entièrement gratuit. Vous jouez dans votre navigateur, sans téléchargement ni inscription.'],
        ['Quels sont les modes de jeu ?', 'Le mode Normal vous fait avancer niveau après niveau, le mode Contre-la-montre vous impose un temps limité, et le mode Arcade enchaîne les niveaux sans interruption. Plus de 750 niveaux sont disponibles.'],
        ['Des astuces pour trouver les différences ?', 'Divisez chaque photo en quatre quarts et comparez-les un à un pour en rater moins. Ne vous limitez pas aux changements de couleur ou de taille : un petit objet qui apparaît ou disparaît est une différence très courante.'],
        ['Le jeu des différences est-il bon pour le cerveau ?', 'Il sollicite l\'attention visuelle, le sens du détail et la mémoire visuelle, puisqu\'il faut comparer deux images. C\'est un moyen rapide d\'aiguiser sa concentration.'],
      ],
      sections: [
        {
          h2: 'SnapSpot : le jeu des différences gratuit',
          lead: '<strong>SnapSpot</strong> est un <strong>jeu des différences</strong> : deux photos semblent identiques et il faut repérer ce qui a changé. Les règles sont si simples qu\'on joue tout de suite, et les différences se font de plus en plus sournoises au fil des niveaux.',
          blocks: [
            { h3: 'Comment jouer', p: 'Passez d\'une photo à l\'autre et, dès que vous repérez une différence, touchez ou cliquez à cet endroit. Trouvez-les toutes pour réussir le niveau.' },
            { h3: 'Trois modes de jeu', p: 'Le mode <strong>Normal</strong> vous fait avancer niveau par niveau, le mode <strong>Contre-la-montre</strong> vous demande de trouver les différences avant la fin du temps imparti, et le mode <strong>Arcade</strong> enchaîne les niveaux sans pause.' },
            { h3: 'Entraînez votre regard', p: 'Le jeu des différences développe l\'<strong>attention visuelle et le sens du détail</strong>. Comparer deux images mobilise aussi votre mémoire visuelle : une bonne façon d\'aiguiser votre concentration en quelques minutes.' },
          ],
        },
      ],
    },
  },
};
