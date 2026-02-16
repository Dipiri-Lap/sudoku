export type Grid = (number | null)[][];

export function isValid(grid: Grid, row: number, col: number, num: number): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
        if (grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[i + startRow][j + startCol] === num) return false;
        }
    }

    return true;
}

export function isBoardValid(grid: Grid): boolean {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const num = grid[r][c];
            if (num !== null) {
                grid[r][c] = null;
                if (!isValid(grid, r, c, num)) {
                    grid[r][c] = num;
                    return false;
                }
                grid[r][c] = num;
            }
        }
    }
    return true;
}
