export type GemType = 0 | 1 | 2 | 3 | 4 | 5;

export interface Position {
  row: number;
  col: number;
}

// id는 애니메이션(같은 타일이 자연스럽게 이동)을 위한 안정적인 React key로 쓰인다.
export interface Tile {
  id: number;
  type: GemType;
}

export type Board = Tile[][];

export type GameStatus = 'playing' | 'won' | 'lost';

export type SwapStatus = 'none' | 'swapping' | 'reverting';

export interface PendingSwap {
  a: Position;
  b: Position;
}

export interface RoyalMatchState {
  board: Board;
  score: number;
  moves: number;
  movesLimit: number;
  targetScore: number;
  pendingSwap: PendingSwap | null;
  swapStatus: SwapStatus;
  lastCombo: number;
  status: GameStatus;
}
