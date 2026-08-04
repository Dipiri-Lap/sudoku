import type { Board, GemType, Position, Tile } from '../types';

export const BOARD_SIZE = 8;
export const GEM_TYPE_COUNT = 6;
export const GEM_ICONS = ['🍎', '🍇', '🍋', '🍊', '🍉', '🍓'];

let tileIdCounter = 0;
function nextTileId(): number {
  tileIdCounter += 1;
  return tileIdCounter;
}

function randomGemType(): GemType {
  return Math.floor(Math.random() * GEM_TYPE_COUNT) as GemType;
}

function makeTile(type: GemType): Tile {
  return { id: nextTileId(), type };
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(tile => ({ ...tile })));
}

export function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr + dc === 1;
}

export function isSamePosition(a: Position | null, b: Position | null): boolean {
  if (!a || !b) return a === b;
  return a.row === b.row && a.col === b.col;
}

// 같은 타일 객체(id 포함)를 통째로 맞바꾼다 - id가 위치를 따라가야
// 화면에서 같은 DOM 요소가 자연스럽게 이동하는 애니메이션이 만들어진다.
export function swapCells(board: Board, a: Position, b: Position): Board {
  const next = cloneBoard(board);
  const tmp = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = tmp;
  return next;
}

// 초기 보드는 3연속(매치) 없이 생성한다.
export function createBoard(): Board {
  const types: GemType[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: GemType[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let gem: GemType;
      let attempts = 0;
      do {
        gem = randomGemType();
        attempts++;
      } while (
        attempts < 20 &&
        ((c >= 2 && row[c - 1] === gem && row[c - 2] === gem) ||
          (r >= 2 && types[r - 1][c] === gem && types[r - 2][c] === gem))
      );
      row.push(gem);
    }
    types.push(row);
  }
  return types.map(row => row.map(makeTile));
}

export function findMatches(board: Board): Set<string> {
  const matched = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= BOARD_SIZE; c++) {
      const prev = board[r][c - 1].type;
      const cur = c < BOARD_SIZE ? board[r][c].type : undefined;
      if (cur === undefined || cur !== prev) {
        if (c - runStart >= 3) {
          for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
        }
        runStart = c;
      }
    }
  }

  for (let c = 0; c < BOARD_SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= BOARD_SIZE; r++) {
      const prev = board[r - 1][c].type;
      const cur = r < BOARD_SIZE ? board[r][c].type : undefined;
      if (cur === undefined || cur !== prev) {
        if (r - runStart >= 3) {
          for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
        }
        runStart = r;
      }
    }
  }

  return matched;
}

// 매치된 칸을 비우고, 남은 타일은 그대로(같은 id) 아래로 내려앉힌 뒤
// 빈 윗자리만 새 타일로 채운다. 살아남은 타일의 id가 유지되므로
// 화면에서는 자연스럽게 떨어지는 것처럼 보인다.
function removeAndRefill(board: Board, matched: Set<string>): Board {
  const next: (Tile | null)[][] = board.map(row => row.map(tile => ({ ...tile })));
  matched.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    next[r][c] = null;
  });

  for (let c = 0; c < BOARD_SIZE; c++) {
    const remaining: Tile[] = [];
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (next[r][c] !== null) remaining.push(next[r][c] as Tile);
    }
    while (remaining.length < BOARD_SIZE) remaining.push(makeTile(randomGemType()));
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      next[r][c] = remaining[BOARD_SIZE - 1 - r];
    }
  }

  return next as Board;
}

export interface ResolveResult {
  board: Board;
  scoreGained: number;
  combo: number;
}

// 매치가 사라질 때까지 제거 -> 중력 낙하 -> 리필을 반복해 연쇄(콤보)를 처리한다.
export function resolveBoard(board: Board): ResolveResult {
  let current = board;
  let scoreGained = 0;
  let combo = 0;

  while (true) {
    const matched = findMatches(current);
    if (matched.size === 0) break;
    combo++;
    scoreGained += matched.size * 10 * combo;
    current = removeAndRefill(current, matched);
  }

  return { board: current, scoreGained, combo };
}

export function hasAnyValidMove(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c < BOARD_SIZE - 1) {
        const swapped = swapCells(board, { row: r, col: c }, { row: r, col: c + 1 });
        if (findMatches(swapped).size > 0) return true;
      }
      if (r < BOARD_SIZE - 1) {
        const swapped = swapCells(board, { row: r, col: c }, { row: r + 1, col: c });
        if (findMatches(swapped).size > 0) return true;
      }
    }
  }
  return false;
}

export function createPlayableBoard(): Board {
  let board = createBoard();
  let attempts = 0;
  while (!hasAnyValidMove(board) && attempts < 50) {
    board = createBoard();
    attempts++;
  }
  return board;
}
