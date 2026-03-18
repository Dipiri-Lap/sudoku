export interface BeginnerStage {
    id: number;       // 1-5 (1-2: 6x6, 3-5: 9x9)
    boardSize: 6 | 9;
    board: (number | null)[][];
    solution: number[][];
}

// 6x6 puzzles: 2x3 boxes (2 rows × 3 cols), numbers 1-6
export const beginnerStages: BeginnerStage[] = [
    {
        id: 1,
        boardSize: 6,
        solution: [
            [1, 2, 3, 4, 5, 6],
            [4, 5, 6, 1, 2, 3],
            [2, 1, 4, 3, 6, 5],
            [3, 6, 5, 2, 1, 4],
            [5, 4, 1, 6, 3, 2],
            [6, 3, 2, 5, 4, 1],
        ],
        board: [
            [1, null, 3, 4, null, null],
            [null, 5, null, null, 2, 3],
            [2, 1, null, null, 6, 5],
            [3, null, null, 2, null, 4],
            [null, 4, 1, null, 3, null],
            [6, null, 2, 5, null, 1],
        ],
    },
    {
        id: 2,
        boardSize: 6,
        solution: [
            [3, 1, 2, 5, 4, 6],
            [5, 4, 6, 3, 1, 2],
            [1, 3, 4, 2, 6, 5],
            [2, 6, 5, 1, 3, 4],
            [4, 5, 3, 6, 2, 1],
            [6, 2, 1, 4, 5, 3],
        ],
        board: [
            [null, 1, null, 5, null, 6],
            [5, null, 6, null, 1, null],
            [1, null, 4, null, 6, 5],
            [null, 6, null, 1, null, 4],
            [4, 5, null, 6, null, 1],
            [6, null, 1, null, 5, null],
        ],
    },
];
