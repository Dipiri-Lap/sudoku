import { describe, it, expect } from 'vitest';
import { isValid, isBoardValid } from '../engine/validator';
import { solve } from '../engine/solver';
import type { Difficulty } from '../engine/generator';
import { generatePuzzles } from '../engine/generator';

describe('Sudoku Engine', () => {
    it('should validate a correct move', () => {
        const grid = Array(9).fill(null).map(() => Array(9).fill(null));
        expect(isValid(grid, 0, 0, 5)).toBe(true);
    });

    it('should solve a puzzle', () => {
        const grid = Array(9).fill(null).map(() => Array(9).fill(null));
        // Simple solvable partial grid
        grid[0][0] = 5;
        grid[0][1] = 3;
        grid[1][0] = 6;
        grid[2][1] = 9;
        grid[2][2] = 8;

        const solvable = solve(grid);
        expect(solvable).toBe(true);
        expect(isBoardValid(grid)).toBe(true);
    });

    it('should generate a valid puzzle with unique solution', () => {
        const { puzzle, solution } = generatePuzzles('Easy' as Difficulty);
        expect(isBoardValid(solution)).toBe(true);
        // Puzzle should be a subset of solution
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (puzzle[r][c] !== null) {
                    expect(puzzle[r][c]).toBe(solution[r][c]);
                }
            }
        }
    });
});
