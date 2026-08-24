import type { Board, Cell, Gem, GemColor, Position } from './types';
import { COLOR_COUNT } from './types';
import type { Rng } from './rng';

/** 보드가 들고 있는 카운터에서 id를 발급한다(전역 상태 없음). */
export function allocGemId(board: Board): number {
  board.nextId += 1;
  return board.nextId;
}

export function idx(board: Board, row: number, col: number): number {
  return row * board.width + col;
}

export function at(board: Board, row: number, col: number): Cell {
  return board.cells[row * board.width + col];
}

export function inBounds(board: Board, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < board.height && col < board.width;
}

export function key(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseKey(k: string): Position {
  const [row, col] = k.split(',').map(Number);
  return { row, col };
}

export function emptyCell(): Cell {
  return { exists: true, gem: null, blocker: null, cover: null };
}

/** 판의 일부가 아닌 칸(구멍). */
export function voidCell(): Cell {
  return { exists: false, gem: null, blocker: null, cover: null };
}

export function cloneBoard(board: Board): Board {
  return {
    width: board.width,
    height: board.height,
    nextId: board.nextId,
    cells: board.cells.map(c => ({
      exists: c.exists,
      gem: c.gem ? { ...c.gem } : null,
      blocker: c.blocker ? { ...c.blocker } : null,
      cover: c.cover ? { ...c.cover } : null,
    })),
  };
}

export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/** 보석 객체를 통째로 맞바꾼다. id가 위치를 따라가야 화면에서 같은 타일이 이동한다. */
export function swap(board: Board, a: Position, b: Position): Board {
  const next = cloneBoard(board);
  const ia = idx(next, a.row, a.col);
  const ib = idx(next, b.row, b.col);
  const tmp = next.cells[ia].gem;
  next.cells[ia].gem = next.cells[ib].gem;
  next.cells[ib].gem = tmp;
  return next;
}

/** 보석이 들어갈 수 있는 칸인가 (판의 일부이고, 장애물이 차지하고 있지 않은가) */
export function isPlayable(cell: Cell): boolean {
  return cell.exists && cell.blocker === null;
}

export function makeGem(board: Board, color: GemColor): Gem {
  return { id: allocGemId(board), color };
}

/**
 * 매치가 없는 상태로 빈 칸을 채운다.
 * 리필과 달리 "처음부터 터져 있는" 보드가 나오면 안 되므로
 * 3연속이 생기는 색을 후보에서 빼고 고른다.
 */
export function fillBoard(board: Board, rng: Rng, colors = COLOR_COUNT): Board {
  const next = cloneBoard(board);
  for (let r = 0; r < next.height; r++) {
    for (let c = 0; c < next.width; c++) {
      const cell = at(next, r, c);
      if (!isPlayable(cell) || cell.gem) continue;
      const banned = new Set<number>();
      if (c >= 2) {
        const a = at(next, r, c - 1).gem?.color;
        const b = at(next, r, c - 2).gem?.color;
        if (a != null && a === b) banned.add(a);
      }
      if (r >= 2) {
        const a = at(next, r - 1, c).gem?.color;
        const b = at(next, r - 2, c).gem?.color;
        if (a != null && a === b) banned.add(a);
      }
      const choices: GemColor[] = [];
      for (let i = 0; i < colors; i++) if (!banned.has(i)) choices.push(i as GemColor);
      cell.gem = makeGem(next, choices[rng.int(choices.length)]);
    }
  }
  return next;
}

export function createBoard(width: number, height: number): Board {
  return {
    width,
    height,
    nextId: 0,
    cells: Array.from({ length: width * height }, emptyCell),
  };
}
