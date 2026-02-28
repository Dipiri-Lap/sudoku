const puzzle = [
    [null, null, null, null, null, null, null, null, null],
    [8, 4, 3, 6, null, null, 1, null, null],
    [1, null, 9, null, null, 5, null, 3, null],
    [null, null, null, null, 3, 1, null, 7, null],
    [null, null, null, 2, 9, 8, 6, 5, null],
    [null, 1, 5, 4, null, 7, 3, null, 2],
    [null, null, null, null, null, null, 8, 4, 7],
    [null, 2, null, 7, null, null, 5, null, 9],
    [null, 5, 8, 9, null, null, null, 6, 3]
];

function solve(board) {
    let solutions = 0;

    function isValid(grid, r, c, k) {
        for (let i = 0; i < 9; i++) {
            if (grid[r][i] === k) return false;
            if (grid[i][c] === k) return false;
            if (grid[3 * Math.floor(r / 3) + Math.floor(i / 3)][3 * Math.floor(c / 3) + i % 3] === k) return false;
        }
        return true;
    }

    function backtrack(grid) {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (grid[i][j] === null) {
                    for (let k = 1; k <= 9; k++) {
                        if (isValid(grid, i, j, k)) {
                            grid[i][j] = k;
                            if (backtrack(grid)) {
                                // continue to find multiple solutions
                            }
                            grid[i][j] = null;
                        }
                    }
                    return false;
                }
            }
        }
        solutions++;
        return solutions > 1 ? true : false; // Stop if more than 1 solution found
    }

    let gridCopy = JSON.parse(JSON.stringify(board));
    backtrack(gridCopy);
    return solutions;
}

const numSolutions = solve(puzzle);
console.log('Number of solutions:', numSolutions);
