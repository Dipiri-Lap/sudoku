import type { Grid } from './validator';
import { isValid } from './validator';
export function solve(grid: Grid): boolean {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === null) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (solve(grid)) {
                            return true;
                        }
                        grid[row][col] = null;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

export function countSolutions(grid: Grid, count: { value: number }): void {
    if (count.value > 1) return;

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === null) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        countSolutions(grid, count);
                        grid[row][col] = null;
                        if (count.value > 1) return;
                    }
                }
                return;
            }
        }
    }
    count.value++;
}
