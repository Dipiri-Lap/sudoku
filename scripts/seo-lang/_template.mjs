/**
 * SEO 언어 모듈 템플릿 (영어 원본). 복사해서 쓴다:
 *
 *   cp scripts/seo-lang/_template.mjs scripts/seo-lang/<lang>.mjs     // de | es | fr | pt | zh
 *
 * 그 다음 아래 `// TRANSLATE` 표시가 있는 모든 문자열을 해당 언어의 "검색 의도에 맞춘 카피"로 바꾼다.
 * 직역이 아니라 그 언어 사용자가 실제로 검색하는 키워드(README 참고)로 새로 쓴다.
 * `_` 로 시작하는 이 파일은 빌드가 무시한다. 형식·길이 규칙은 scripts/seo-lang/README.md.
 *
 * 평문으로 쓸 것: 따옴표(" ')·& 를 그대로 쓰면 된다(빌더가 이스케이프). HTML 태그는
 * 본문(lead / p)에서 <strong>…</strong> 만 허용. 홈 본문의 [[sudoku|텍스트]] 는 게임 링크로 바뀐다.
 * 사실관계(스테이지 수 1000 / 750+, 모드, 6×6~16×16 등)는 바꾸지 말 것.
 */

export default {
  // 고정값 — 바꾸지 말 것 (de | es | fr | pt | zh 중 파일명과 같은 코드)
  lang: 'en', // CHANGE to your language code, e.g. 'de'

  // TRANSLATE: 브랜드명. de/es/fr/pt 는 'Puzzle Garden' 유지, zh 는 '益智花園'
  brand: 'Puzzle Garden',

  // TRANSLATE: noscript 하단 내부 링크 블록의 문구 ("More puzzle games" / "Puzzle Garden home")
  ui: {
    moreGames: 'More puzzle games',
    homeLink: 'Puzzle Garden home',
  },

  // 홈 (/<lang>/)
  home: {
    title: 'Puzzle Garden - Free Online Puzzle Games: Sudoku, Jigsaw & More', // TRANSLATE
    description: 'Play free online puzzle games in your browser: Sudoku, jigsaw puzzles, Queens logic puzzles and spot the difference. No download, no sign-up.', // TRANSLATE
    keywords: 'free online puzzle games, online sudoku, free sudoku, jigsaw puzzle online, queens puzzle, spot the difference game, logic puzzles, brain games', // TRANSLATE (쉼표 구분)
    // JSON-LD WebSite.description / ItemList.name
    siteDescription: 'Free online puzzle games in your browser: Sudoku, jigsaw puzzles, Queens logic puzzles and spot the difference.', // TRANSLATE
    itemListName: 'Puzzle Garden games', // TRANSLATE
    // JSON-LD ItemList 항목 설명 (이름은 pages.<slug>.name 을 씀)
    games: {
      sudoku: 'Classic 9×9 Sudoku with several difficulty levels and a time attack mode. Free to play.', // TRANSLATE
      queens: 'Place one queen in every colored region so that no two queens touch. A pure logic puzzle with 1000 stages.', // TRANSLATE
      jigsaw: 'Drag and swap scattered pieces to rebuild cute pictures and tiny takes on famous paintings.', // TRANSLATE
      snapspot: 'Compare two photos and tap every difference. Normal, time attack and arcade modes.', // TRANSLATE
    },
    // noscript 본문 (봇이 읽음). 마지막 block 이 자동으로 마지막 문단 스타일
    h2: 'Puzzle Garden — free online puzzle games', // TRANSLATE
    lead: '<strong>Puzzle Garden</strong> is a collection of free <strong>online puzzle games</strong> that run right in your browser. There is nothing to install and no account to create, so you can open a puzzle and start playing in seconds on your phone, tablet or computer.', // TRANSLATE
    blocks: [
      {
        h3: 'Games you can play', // TRANSLATE
        // [[slug|text]] → <a href="/<lang>/slug"><strong>text</strong></a>. slug 는 sudoku|queens|jigsaw|snapspot 고정
        p: '[[sudoku|Sudoku]] is the classic 9×9 number-placement puzzle, with several difficulty levels and a time attack mode. [[queens|Crown Quest]] is a Queens-style logic puzzle where you place one queen in every colored region. [[jigsaw|Tiny Pieces]] is a relaxing jigsaw puzzle with cute pictures. [[snapspot|SnapSpot]] is a spot the difference game with more than 750 stages.', // TRANSLATE
      },
      {
        h3: 'Free, simple, and quick to pick up', // TRANSLATE
        p: 'Every game is free to play and works without sign-up. Short rounds make Puzzle Garden easy to fit into a coffee break, and each game starts gently and gets harder as you improve.', // TRANSLATE
      },
    ],
  },

  // 게임 페이지 4개 (/<lang>/sudoku, /queens, /jigsaw, /snapspot)
  pages: {
    sudoku: {
      name: 'Sudoku', // TRANSLATE: 현지 검색어에 맞는 게임 이름 (브레드크럼·JSON-LD·내부링크에 사용)
      title: 'Free Online Sudoku - Play Classic Sudoku Puzzles | Puzzle Garden', // TRANSLATE
      description: 'Play free online Sudoku in your browser: classic 9×9 puzzles from beginner to hard, with notes, hints and a time attack mode. No download or sign-up.', // TRANSLATE
      keywords: 'free online sudoku, sudoku online, play sudoku, sudoku puzzles, easy sudoku, hard sudoku, how to play sudoku, sudoku rules', // TRANSLATE
      // [질문, 답변] 4~6쌍 → FAQPage JSON-LD (평문)
      faq: [
        ['What is Sudoku?', 'Sudoku is a logic puzzle played on a 9×9 grid. Fill every cell with a digit from 1 to 9 so that each row, each column and each 3×3 box contains every digit exactly once. No math is involved; it is solved purely by logic.'], // TRANSLATE
        ['Can I play Sudoku online for free?', 'Yes. Sudoku on Puzzle Garden is completely free. You can play right in your browser with no download and no sign-up, from beginner puzzles up to hard ones.'], // TRANSLATE
        ['Which difficulty should a beginner start with?', 'Start with the beginner or easy level. Difficulty rises step by step, so you can build skill gradually. Once you feel comfortable, try the time attack mode for an extra challenge.'], // TRANSLATE
        ['What are the rules of Sudoku and how do I solve it?', 'Place digits 1 to 9 in the empty cells without repeating a digit in any row, column or bold-outlined 3×3 box. Begin with cells that have only one possible digit. Each digit you place removes candidates from neighboring cells, which makes the next cell easier.'], // TRANSLATE
        ['Are there Sudoku grids other than 9×9?', 'Yes. Besides the classic 9×9 grid there are smaller beginner grids starting at 6×6 and bigger grids up to 16×16, plus a time attack mode. Notes and hints are available while you play.'], // TRANSLATE
        ['Is Sudoku good for your brain?', 'Sudoku exercises focus, logical thinking and short-term memory. Many people enjoy it as a short daily mental workout.'], // TRANSLATE
      ],
      // noscript 본문 2~3 블록. 섹션마다 h2 + lead + blocks[{h3,p}] (마지막 block 이 마지막 문단 스타일)
      sections: [
        {
          h2: 'Free online Sudoku — classic puzzles in your browser', // TRANSLATE
          lead: "<strong>Sudoku</strong> is a logic puzzle played on a 9×9 grid. Every row, every column and every 3×3 box must contain the digits 1 to 9 exactly once. You do not need any math; patience and careful logic are all it takes, which is why it is one of the world's most popular <strong>brain games</strong>.", // TRANSLATE
          blocks: [
            { h3: 'How to play Sudoku', p: 'Tap an empty cell and enter a digit from 1 to 9. A digit cannot repeat in the same row, column or box. If you are new to the game, begin with the <strong>beginner</strong> or <strong>easy</strong> level and use notes to keep track of candidates. Look for cells where only one digit fits, fill them in, and keep going: each new digit narrows down the rest of the grid.' }, // TRANSLATE
            { h3: 'Difficulty levels and modes', p: 'Choose from beginner, easy, normal and hard puzzles. Smaller grids starting at 6×6 make a gentle introduction, bigger grids up to 16×16 offer a long challenge, and the time attack mode lets you race the clock.' }, // TRANSLATE
            { h3: 'A quick mental workout', p: 'Sudoku trains <strong>concentration, logical thinking and short-term memory</strong>. A puzzle or two a day is an easy habit, and it is free to play with no download or sign-up.' }, // TRANSLATE
          ],
        },
      ],
    },

    queens: {
      name: 'Crown Quest (Queens Puzzle)', // TRANSLATE (고유명 "Crown Quest" 는 유지 가능, 장르명만 현지어)
      title: 'Queens Puzzle - Free Online Crown Quest Logic Game | Puzzle Garden', // TRANSLATE
      description: 'Play the Queens puzzle free online. Place one queen in every colored region with none in the same row or column or touching. Crown Quest has 1000 free stages, no download needed.', // TRANSLATE
      keywords: 'queens puzzle, queens game, queens puzzle online, free queens puzzle, crown quest, logic puzzle online, queens logic puzzle', // TRANSLATE
      faq: [
        ['What is Crown Quest (the Queens puzzle)?', 'Crown Quest is a Queens-style logic puzzle played on a grid divided into colored regions. Place exactly one queen in each colored region and exactly one in every row and every column. No two queens may touch, including diagonally.'], // TRANSLATE
        ['How do you solve a Queens puzzle?', 'Work by elimination. Cross out cells where a queen cannot go; when a colored region has only one candidate cell left, that cell must hold its queen. Every queen you place rules out the rest of its row and column and all its neighbors, which reveals the next clue.'], // TRANSLATE
        ['Is Crown Quest free to play?', 'Yes, it is completely free. You can play in your browser with no download and no sign-up, there are 1000 stages, and your progress is saved automatically.'], // TRANSLATE
        ['Is this different from the chess N-Queens puzzle?', 'It is a close relative. The classic N-Queens problem only asks for queens that do not attack each other, while here each colored region must also hold exactly one queen, which leads to a single correct solution. Queens only need to avoid touching their neighbors, so you do not have to track long chess diagonals.'], // TRANSLATE
        ['Do I need to be good at math?', 'No. There is no arithmetic at all. It is a pure logic puzzle with just three rules, and the first stages start on small grids before growing larger.'], // TRANSLATE
      ],
      sections: [
        {
          h2: 'Crown Quest — a free Queens logic puzzle', // TRANSLATE
          lead: '<strong>Crown Quest</strong> is a <strong>Queens puzzle</strong>: a logic game where you place one queen (👑) in every colored region of a grid. There is no arithmetic, and just three rules are enough to play, so it offers a different flavor of deduction from Sudoku.', // TRANSLATE
          blocks: [
            { h3: 'The three rules', p: '<strong>1.</strong> Each colored region contains exactly one queen. <strong>2.</strong> Each row and each column contains exactly one queen. <strong>3.</strong> No two queens may touch, and that includes <strong>diagonally</strong>.' }, // TRANSLATE
            { h3: 'How to solve it', p: 'Start by crossing out cells where a queen <strong>cannot</strong> go. When a colored region is down to a single candidate cell, that is where its queen belongs. Each confirmed queen eliminates its whole row, column and surrounding cells, and the next clue appears.' }, // TRANSLATE
            { h3: '1000 free stages', p: 'Stages begin on small grids and grow larger, and your progress saves automatically. Crown Quest is a good way to practice <strong>spatial reasoning and process-of-elimination thinking</strong>, with no download or sign-up.' }, // TRANSLATE
          ],
        },
      ],
    },

    jigsaw: {
      name: 'Tiny Pieces (Jigsaw Puzzle)', // TRANSLATE
      title: 'Jigsaw Puzzle Online Free - Tiny Pieces | Puzzle Garden', // TRANSLATE
      description: 'Play jigsaw puzzles online for free. Swap scattered pieces to rebuild cute pictures and tiny takes on famous paintings. Tiny Pieces runs in your browser.', // TRANSLATE
      keywords: 'jigsaw puzzle online free, online jigsaw puzzles, free jigsaw puzzles, picture puzzle game, tiny pieces, relaxing puzzle game', // TRANSLATE
      faq: [
        ['What is Tiny Pieces?', 'Tiny Pieces is a jigsaw puzzle game where you drag shuffled picture pieces and swap them to rebuild the original image. When matching pieces end up side by side, they snap together and move as one group.'], // TRANSLATE
        ['How do I play the jigsaw puzzle?', 'Study the preview picture shown at the start, then drag a piece onto the spot where you want it. It swaps places with the piece already there. Joined groups move together, so begin with the edges or distinctive parts of the picture.'], // TRANSLATE
        ['Is Tiny Pieces free?', 'Yes, it is completely free. You can play online in your browser with no download and no sign-up, and your progress is saved automatically.'], // TRANSLATE
        ['What pictures will I see?', 'You will find cute animals, towns and food, and every 10 stages there is a special stage with a cute re-imagining of a famous painting such as the Mona Lisa, The Great Wave or Girl with a Pearl Earring.'], // TRANSLATE
      ],
      sections: [
        {
          h2: 'Tiny Pieces — free online jigsaw puzzle', // TRANSLATE
          lead: '<strong>Tiny Pieces</strong> is a relaxing <strong>jigsaw puzzle</strong> you can play online for free. Move scattered <strong>picture pieces</strong> into place to rebuild a cute, colorful image, no download needed.', // TRANSLATE
          blocks: [
            { h3: 'How to play', p: 'Drag a piece to another spot and the two pieces trade places. When the right pieces end up next to each other they <strong>snap together automatically</strong> and move as one. Finish with fewer moves to earn more stars.' }, // TRANSLATE
            { h3: 'Famous paintings, reimagined', p: 'Every 10 stages brings a special puzzle based on a famous painting, such as the <strong>Mona Lisa, The Great Wave and Starry Night</strong>, redrawn in a cute style. You can also collect board frames and characters to decorate your game.' }, // TRANSLATE
          ],
        },
      ],
    },

    snapspot: {
      name: 'SnapSpot (Spot the Difference)', // TRANSLATE
      title: 'Spot the Difference Game - Free Online SnapSpot | Puzzle Garden', // TRANSLATE
      description: 'Play a free spot the difference game online. Compare two photos and tap every difference in Normal, Time Attack and Arcade modes, with 750+ stages to play.', // TRANSLATE
      keywords: 'spot the difference game, spot the difference online, find the differences, free spot the difference, picture difference game, snapspot', // TRANSLATE
      faq: [
        ['What is SnapSpot?', 'SnapSpot is a spot the difference game. Two photos sit side by side, and you tap the spots where they differ.'], // TRANSLATE
        ['Can I play spot the difference for free?', 'Yes, SnapSpot is completely free. You can play it in your browser with no download and no sign-up.'], // TRANSLATE
        ['What game modes are there?', 'There is a Normal mode where you work through stages one by one, a Time Attack mode where you race a time limit, and an Arcade mode that keeps the stages coming. More than 750 stages are available.'], // TRANSLATE
        ['Any tips for finding the differences?', 'Split each photo into four quadrants and compare them one at a time so you miss fewer spots. Look beyond changes in color and size: small objects that disappear or appear are common differences.'], // TRANSLATE
        ['Is spot the difference good for your brain?', 'It exercises visual attention, attention to detail and visual memory as you compare two images. It is a quick way to sharpen your focus.'], // TRANSLATE
      ],
      sections: [
        {
          h2: 'SnapSpot — free spot the difference game', // TRANSLATE
          lead: '<strong>SnapSpot</strong> is a <strong>spot the difference</strong> game: two photos look nearly identical, and your job is to find what has changed. The rules are simple enough to start right away, and the differences get sneakier as you move up through the stages.', // TRANSLATE
          blocks: [
            { h3: 'How to play', p: 'Look back and forth between the two photos, and when you notice a difference, tap or click that spot. Find them all to clear the stage.' }, // TRANSLATE
            { h3: 'Three game modes', p: '<strong>Normal</strong> takes you through the stages one at a time, <strong>Time Attack</strong> challenges you to find differences before the clock runs out, and <strong>Arcade</strong> keeps the stages flowing without a break. More than 750 stages are ready to play.' }, // TRANSLATE
            { h3: 'Train your eye', p: 'Spot the difference builds <strong>visual attention and eye for detail</strong>. Comparing two images in your head also works your visual memory, making it a good way to sharpen your focus in a few minutes.' }, // TRANSLATE
          ],
        },
      ],
    },
  },
};
