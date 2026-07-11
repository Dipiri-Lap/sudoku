export type CellCoord = [number, number]; // [col, row]

export interface HoleData {
  id: string;
  color: string;
  cell: CellCoord;
}

export interface WormData {
  id: string;
  color: string;
  // Cells the worm currently occupies, ordered tail(index 0) -> head(last).
  // Consecutive entries must be grid-adjacent.
  cells: CellCoord[];
}

export interface LevelData {
  id: string;
  name: string;
  gridCols: number;
  gridRows: number;
  // Optional mask of valid board cells (for irregular boards / walls). When
  // omitted, every cell in the gridCols x gridRows rectangle is valid.
  boardCells?: CellCoord[];
  // Seconds on the clock. The countdown only starts after the player's
  // first valid drag (see WormEscapeGame's `hasMovedRef`).
  timeLimit: number;
  holes: HoleData[];
  worms: WormData[];
}

export const levels: LevelData[] = [
  {
    id: 'tutorial',
    name: '튜토리얼',
    gridCols: 3,
    gridRows: 4,
    timeLimit: 60,
    holes: [
      { id: 'clay', color: '#C1694F', cell: [0, 0] },
      { id: 'moss', color: '#7C9B5A', cell: [1, 0] },
      { id: 'coral', color: '#E08A6B', cell: [2, 0] },
    ],
    worms: [
      { id: 'clay', color: '#C1694F', cells: [[0, 3], [0, 2]] },
      { id: 'moss', color: '#7C9B5A', cells: [[1, 3], [1, 2]] },
      { id: 'coral', color: '#E08A6B', cells: [[2, 3], [2, 2]] },
    ],
  },
  {
    id: 'crossing',
    name: '교차로',
    gridCols: 4,
    gridRows: 5,
    timeLimit: 90,
    holes: [
      { id: 'mint', color: '#5FAE8C', cell: [0, 0] },
      { id: 'clay', color: '#C1694F', cell: [1, 0] },
      { id: 'plum', color: '#9B6BA0', cell: [2, 0] },
      { id: 'sand', color: '#D2A65A', cell: [3, 0] },
    ],
    worms: [
      { id: 'clay', color: '#C1694F', cells: [[1, 3], [1, 2]] },
      { id: 'plum', color: '#9B6BA0', cells: [[2, 3], [2, 2]] },
      // starts at col1, must cross the row-1 corridor to reach the hole at col3.
      { id: 'sand', color: '#D2A65A', cells: [[1, 4], [0, 4], [0, 3], [0, 2]] },
      // starts at col2, must cross the row-1 corridor to reach the hole at col0 -
      // the two worms share the corridor, so one must back its tail out of the
      // way (reverse drag) before the other can pass through.
      { id: 'mint', color: '#5FAE8C', cells: [[2, 4], [3, 4], [3, 3], [3, 2]] },
    ],
  },
  {
    id: 'burrow',
    name: '땅굴',
    gridCols: 5,
    gridRows: 5,
    timeLimit: 120,
    holes: [
      { id: 'clay', color: '#C1694F', cell: [0, 0] },
      { id: 'moss', color: '#7C9B5A', cell: [4, 0] },
      { id: 'plum', color: '#9B6BA0', cell: [0, 4] },
      { id: 'sand', color: '#D2A65A', cell: [4, 4] },
    ],
    worms: [
      { id: 'clay', color: '#C1694F', cells: [[1, 1], [2, 1]] },
      { id: 'moss', color: '#7C9B5A', cells: [[3, 1], [4, 1]] },
      { id: 'plum', color: '#9B6BA0', cells: [[1, 3], [2, 3]] },
      { id: 'sand', color: '#D2A65A', cells: [[3, 3], [4, 3]] },
    ],
  },
];
