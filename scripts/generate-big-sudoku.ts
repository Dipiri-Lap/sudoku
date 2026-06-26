/**
 * 16×16 Sudoku ("Big Size") level generator
 *
 * Usage:
 *   npm run generate-big-sudoku               # continue from where left off
 *   npm run generate-big-sudoku -- --reset    # clear and start fresh
 *
 * Difficulty curve (100 levels, 16×16 grid = 256 cells):
 *   1–5   : ~196 givens  (Very Easy)
 *   6–15  : 192 givens
 *   16–25 : 185 givens
 *   26–35 : 178 givens
 *   36–45 : 170 givens
 *   46–55 : 162 givens
 *   56–65 : 152 givens
 *   66–75 : 142 givens
 *   76–85 : 132 givens
 *   86–95 : 120 givens   (Expert)
 *   96–100: 110 givens   (Hard+)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '../src/data/big-stages.json');
const TOTAL = 200;
const SIZE = 16;
const BOX = 4;  // 4×4 sub-boxes

// ─── helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── grid construction ───────────────────────────────────────────────────────

/**
 * Canonical valid 16×16 Sudoku grid.
 * Formula: cell(r, c) = ((r * BOX + floor(r / BOX) + c) % SIZE) + 1
 * Verified: every row, column, and 4×4 box contains 1-16 exactly once.
 */
function createBaseGrid(): number[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) =>
      ((r * BOX + Math.floor(r / BOX) + c) % SIZE) + 1
    )
  );
}

/**
 * Apply random-but-validity-preserving transformations to produce variety.
 * Transformations: number permutation, row swaps within bands, band swaps, same for cols.
 */
function randomizeGrid(base: number[][]): number[][] {
  let g = base.map(r => [...r]);

  // 1. Permute the numbers 1-16
  const numMap = shuffle([...Array(SIZE)].map((_, i) => i + 1));
  g = g.map(row => row.map(v => numMap[v - 1]));

  // 2. Shuffle rows within each band of BOX rows
  let tmp = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let b = 0; b < BOX; b++) {
    const perm = shuffle([0, 1, 2, 3]);
    for (let i = 0; i < BOX; i++) {
      tmp[b * BOX + i] = g[b * BOX + perm[i]];
    }
  }
  g = tmp;

  // 3. Shuffle the bands of rows
  const bandRowPerm = shuffle([0, 1, 2, 3]);
  tmp = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let b = 0; b < BOX; b++) {
    for (let i = 0; i < BOX; i++) {
      tmp[b * BOX + i] = g[bandRowPerm[b] * BOX + i];
    }
  }
  g = tmp;

  // 4. Shuffle columns within each band of BOX cols
  const colBandPerms = Array.from({ length: BOX }, () => shuffle([0, 1, 2, 3]));
  tmp = g.map(row => {
    const newRow = [...row];
    for (let b = 0; b < BOX; b++) {
      const perm = colBandPerms[b];
      for (let i = 0; i < BOX; i++) {
        newRow[b * BOX + i] = row[b * BOX + perm[i]];
      }
    }
    return newRow;
  });
  g = tmp;

  // 5. Shuffle the bands of columns
  const bandColPerm = shuffle([0, 1, 2, 3]);
  g = g.map(row => {
    const newRow = Array(SIZE).fill(0);
    for (let b = 0; b < BOX; b++) {
      for (let i = 0; i < BOX; i++) {
        newRow[b * BOX + i] = row[bandColPerm[b] * BOX + i];
      }
    }
    return newRow;
  });

  return g;
}

// ─── difficulty ──────────────────────────────────────────────────────────────
// Mirrors the stage mode cycle exactly:
//   1        : Very Easy
//   2–5      : Easy, Beginner, Medium, Hard
//   6+       : 5-cycle (Easy, Beginner, Medium, Medium, Hard)
//   %25 == 0 : Expert   %100 == 0 : Master

type Difficulty = 'Very Easy' | 'Easy' | 'Beginner' | 'Medium' | 'Hard' | 'Expert' | 'Master';

function getLevelDifficulty(level: number): Difficulty {
  if (level === 1) return 'Very Easy';
  if (level <= 5) {
    const map: Difficulty[] = ['Easy', 'Beginner', 'Medium', 'Hard'];
    return map[level - 2];
  }
  const pos = (level - 6) % 5;
  if (pos === 4) {
    if (level % 100 === 0) return 'Master';
    if (level % 25 === 0)  return 'Expert';
    return 'Hard';
  }
  const cycle: Difficulty[] = ['Easy', 'Beginner', 'Medium', 'Medium'];
  return cycle[pos];
}

// Givens counts for 16×16 (256 cells) per difficulty.
// Scaled to keep the same relative "empty cell" ratio as 9×9 stage mode.
const GIVENS: Record<Difficulty, number> = {
  'Very Easy': 195,
  'Easy':      185,
  'Beginner':  175,
  'Medium':    165,
  'Hard':      150,
  'Expert':    130,
  'Master':    110,
};

function givensForLevel(level: number): number {
  return GIVENS[getLevelDifficulty(level)];
}

function difficultyLabel(level: number): string {
  return getLevelDifficulty(level);
}

// ─── puzzle generation ───────────────────────────────────────────────────────

interface Level {
  id: number;
  difficulty: string;
  board: (number | null)[][];
  solution: number[][];
}

function generateLevel(levelNum: number): Level {
  const base = createBaseGrid();
  const solution = randomizeGrid(base);
  const givens = givensForLevel(levelNum);
  const toRemove = SIZE * SIZE - givens;

  const board: (number | null)[][] = solution.map(r => [...r] as (number | null)[]);

  // Symmetric removal: remove cells in mirrored pairs where possible
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      cells.push({ r, c });
    }
  }
  const shuffled = shuffle(cells);
  let removed = 0;
  for (const { r, c } of shuffled) {
    if (removed >= toRemove) break;
    board[r][c] = null;
    removed++;
    // Also remove mirror cell if we still need to remove more
    if (removed < toRemove) {
      const mr = SIZE - 1 - r;
      const mc = SIZE - 1 - c;
      if (board[mr][mc] !== null) {
        board[mr][mc] = null;
        removed++;
      }
    }
  }

  return {
    id: levelNum,
    difficulty: difficultyLabel(levelNum),
    board,
    solution,
  };
}

// ─── main ────────────────────────────────────────────────────────────────────

function main() {
  const reset = process.argv.includes('--reset');

  let existing: Level[] = [];
  if (fs.existsSync(OUT_PATH) && !reset) {
    existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  }

  if (reset) console.log('Reset mode: clearing all levels.\n');

  const startSlot = existing.length;
  const remaining = TOTAL - startSlot;

  if (remaining <= 0) {
    console.log(`All ${TOTAL} levels already generated.`);
    return;
  }

  console.log(`Plan: ${TOTAL} levels of 16×16 Sudoku`);
  console.log(`Already done: ${startSlot}  Remaining: ${remaining}\n`);

  const startTime = Date.now();
  const levels = [...existing];

  for (let slot = startSlot; slot < TOTAL; slot++) {
    const levelNum = slot + 1;
    const level = generateLevel(levelNum);
    levels.push(level);

    const givens = givensForLevel(levelNum);
    const done = slot - startSlot + 1;
    process.stdout.write(
      `  [${done}/${remaining}] Level ${levelNum} (${givens} givens, ${level.difficulty})... OK\n`
    );

    if (levels.length % 10 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(levels, null, 2));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(levels, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
  console.log(`Total levels: ${levels.length}`);

  const dist: Record<string, number> = {};
  levels.forEach(l => { dist[l.difficulty] = (dist[l.difficulty] || 0) + 1; });
  console.log('\nDifficulty distribution:');
  Object.entries(dist).forEach(([d, c]) => console.log(`  ${d}: ${c} levels`));
}

main();
