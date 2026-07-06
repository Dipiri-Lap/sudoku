export type CellCoord = [number, number]; // [col, row]

export interface HoleData {
  id: string;
  color: string;
  cell: CellCoord;
}

export interface PieceData {
  id: string;
  color: string;
  // Cells the snake currently occupies, ordered along its body chain
  // (consecutive entries must be grid-adjacent). Purely cosmetic: the last
  // entry is drawn with the face.
  cells: CellCoord[];
}

export interface LevelData {
  id: string;
  name: string;
  gridCols: number;
  gridRows: number;
  // Optional mask of valid board cells (for irregular boards). When omitted,
  // every cell in the gridCols x gridRows rectangle is valid.
  boardCells?: CellCoord[];
  holes: HoleData[];
  pieces: PieceData[];
}

export const levels: LevelData[] = [
  {
    id: 'test-move',
    name: '이동 테스트',
    gridCols: 3,
    gridRows: 3,
    holes: [],
    pieces: [
      { id: 'red', color: '#EF5350', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    ],
  },
  {
    id: 'level-1',
    name: 'Level 1',
    gridCols: 3,
    gridRows: 4,
    holes: [
      { id: 'red', color: '#EF5350', cell: [0, 0] },
      { id: 'yellow', color: '#FFCA28', cell: [1, 0] },
      { id: 'teal', color: '#26C6DA', cell: [2, 0] },
    ],
    pieces: [
      { id: 'red', color: '#EF5350', cells: [[0, 3], [0, 2]] },
      { id: 'yellow', color: '#FFCA28', cells: [[1, 3], [1, 2]] },
      { id: 'teal', color: '#26C6DA', cells: [[2, 3], [2, 2]] },
    ],
  },
  {
    id: 'level-2',
    name: 'Level 2',
    gridCols: 4,
    gridRows: 5,
    holes: [
      { id: 'green', color: '#66BB6A', cell: [0, 0] },
      { id: 'orange', color: '#FFA726', cell: [1, 0] },
      { id: 'purple', color: '#AB47BC', cell: [2, 0] },
      { id: 'blue', color: '#29B6F6', cell: [3, 0] },
    ],
    pieces: [
      { id: 'orange', color: '#FFA726', cells: [[1, 3], [1, 2]] },
      { id: 'purple', color: '#AB47BC', cells: [[2, 3], [2, 2]] },
      // starts at col0, has to cross the row-1 corridor to reach the hole at col3
      { id: 'blue', color: '#29B6F6', cells: [[1, 4], [0, 4], [0, 3], [0, 2]] },
      // starts at col3, has to cross the row-1 corridor to reach the hole at col0
      { id: 'green', color: '#66BB6A', cells: [[2, 4], [3, 4], [3, 3], [3, 2]] },
    ],
  },
];
