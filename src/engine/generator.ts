import type { Grid } from './validator';
import { solve, countSolutions } from './solver';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export const DifficultyLevels: Record<Difficulty, number> = {
    Easy: 45,
    Medium: 35,
    Hard: 28,
    Expert: 22,
};

export function generatePuzzles(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
    // 1. Create empty grid
    const grid: Grid = Array(9).fill(null).map(() => Array(9).fill(null));

    // 2. Fill the diagonal 3x3 boxes first (they are independent)
    for (let i = 0; i < 9; i += 3) {
        fillBox(grid, i, i);
    }

    // 3. Solve to get a full board
    solve(grid);
    const solution = grid.map(row => [...row]);

    // 4. Remove cells to create the puzzle
    const puzzle = solution.map(row => [...row]);
    const cellsToRemove = 81 - DifficultyLevels[difficulty];
    removeCells(puzzle, cellsToRemove);

    return { puzzle, solution };
}

function fillBox(grid: Grid, row: number, col: number) {
    let num: number;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            do {
                num = Math.floor(Math.random() * 9) + 1;
            } while (!isUsedInBox(grid, row, col, num));
            grid[row + i][col + j] = num;
        }
    }
}

function isUsedInBox(grid: Grid, rowStart: number, colStart: number, num: number): boolean {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[rowStart + i][colStart + j] === num) return false;
        }
    }
    return true;
}

function removeCells(grid: Grid, count: number) {
    // Get all coordinates and shuffle them
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            cells.push({ r, c });
        }
    }

    // Fisher-Yates shuffle
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let removedCount = 0;
    for (const cell of cells) {
        if (removedCount >= count) break;

        const { r, c } = cell;
        const backup = grid[r][c];
        grid[r][c] = null;

        // Check for unique solution
        const counter = { value: 0 };
        const tempGrid = grid.map(row => [...row]);
        countSolutions(tempGrid, counter);

        if (counter.value !== 1) {
            grid[r][c] = backup;
        } else {
            removedCount++;
        }
    }
}
