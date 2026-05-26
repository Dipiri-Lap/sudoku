export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PieceData {
  id: string;
  cells: [number, number][]; // [col, row], 순서: tail → head
  exitDir: Direction;
  color: string;
}

export interface LevelData {
  gridCols: number;
  gridRows: number;
  pieces: PieceData[];
}

// Level 1 (5x5): 25칸 전부 채움, 정답 순서 2→1→(3,4 순서 자유)→5
//
//  Col:  0  1  2  3  4
//  Row0: 1  1  1  1  2↓   (2 exitDown: 즉시 탈출 가능)
//  Row1: 4↑ 4  4  1  2    (1 exitRight: [4,1]=2에 막힘)
//  Row2: 5  5  4  3  2    (3 exitUp:   [3,1]=1에 막힘)
//  Row3: 5  5↓ 4  3  2    (4 exitUp:   [0,0]=1에 막힘)
//  Row4: 5  3  3  3  2    (5 exitDown: [1,4]=3에 막힘)
//
// 2 탈출 → 1 탈출 → 3,4 탈출(순서 자유) → 5 탈출

export const levels: LevelData[] = [
  {
    gridCols: 5,
    gridRows: 5,
    pieces: [
      {
        id: '1',
        cells: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
        exitDir: 'right',
        color: '#FFD600',
      },
      {
        id: '2',
        cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
        exitDir: 'down',
        color: '#EC407A',
      },
      {
        id: '3',
        cells: [[1, 4], [2, 4], [3, 4], [3, 3], [3, 2]],
        exitDir: 'up',
        color: '#66BB6A',
      },
      {
        id: '4',
        cells: [[2, 3], [2, 2], [2, 1], [1, 1], [0, 1]],
        exitDir: 'up',
        color: '#29B6F6',
      },
      {
        id: '5',
        cells: [[0, 4], [0, 3], [0, 2], [1, 2], [1, 3]],
        exitDir: 'down',
        color: '#FF7043',
      },
    ],
  },
];
