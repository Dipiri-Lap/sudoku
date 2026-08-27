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
  return {
    exists: true,
    gem: null,
    blocker: null,
    cover: null,
    ground: null,
    walls: null,
    collector: null,
    spawner: null,
  };
}

/** 판의 일부가 아닌 칸(구멍). */
export function voidCell(): Cell {
  return {
    exists: false,
    gem: null,
    blocker: null,
    cover: null,
    ground: null,
    walls: null,
    collector: null,
    spawner: null,
  };
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
      ground: c.ground ? { ...c.ground } : null,
      walls: c.walls ? { ...c.walls } : null,
      collector: c.collector ? { ...c.collector } : null,
      spawner: c.spawner ? { ...c.spawner } : null,
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

/**
 * 두 칸 사이에 벽이 있는가. 벽은 칸이 아니라 경계에 있으므로
 * "어느 쪽 칸이 그 경계를 들고 있는지"를 따져야 한다.
 */
export function wallBetween(board: Board, a: Position, b: Position): boolean {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  if (dr === 1) return at(board, b.row, b.col).walls?.top === true;
  if (dr === -1) return at(board, a.row, a.col).walls?.top === true;
  if (dc === 1) return at(board, b.row, b.col).walls?.left === true;
  if (dc === -1) return at(board, a.row, a.col).walls?.left === true;
  return false;
}

/** 보석이 들어갈 수 있는 칸인가 (판의 일부이고, 장애물이 차지하고 있지 않은가) */
export function isPlayable(cell: Cell): boolean {
  return cell.exists && cell.blocker === null;
}

/**
 * 중력에 대해 이 칸이 열을 끊는가.
 *
 * 고정 장애물은 뚜껑이 되어 열을 끊지만, "바닥으로 빼내는" 장애물은 스스로
 * 아래로 떨어지므로 보석과 똑같이 움직이는 짐이다. 둘을 같이 취급하면
 * 떨어뜨려야 할 장애물이 제자리에 붙박이고 레벨을 깰 수 없게 된다.
 */
export function blocksFalling(cell: Cell): boolean {
  if (!cell.exists) return true;
  // 붙잡힌 보석은 골렘도 밀어낼 수 없다. 밀어내면 사슬만 남아
  // 다음에 들어온 보석을 대신 붙잡는다.
  if (cell.cover?.locks) return true;
  return cell.blocker !== null && !cell.blocker.fallsOut;
}

/**
 * 그 자리에 이 색을 놓으면 곧바로 매치가 되는가.
 *
 * 위쪽은 아직 비어 있을 수 있으므로 아래·좌우만 본다.
 * 투입구처럼 색을 강제하는 자리에서만 쓴다 - 일반 리필은 우연히 연쇄가
 * 터지는 게 정상이라 막지 않는다.
 */
export function wouldMatchAt(board: Board, row: number, col: number, color: GemColor): boolean {
  const colorOf = (r: number, c: number): number | null => {
    if (!inBounds(board, r, c)) return null;
    const cell = at(board, r, c);
    if (!isPlayable(cell) || !cell.gem || cell.gem.special) return null;
    return cell.gem.color;
  };

  // 세로 3 (아래로)
  if (colorOf(row + 1, col) === color && colorOf(row + 2, col) === color) return true;
  // 가로 3 (좌우 조합)
  if (colorOf(row, col - 1) === color && colorOf(row, col - 2) === color) return true;
  if (colorOf(row, col - 1) === color && colorOf(row, col + 1) === color) return true;
  if (colorOf(row, col + 1) === color && colorOf(row, col + 2) === color) return true;
  // 2x2 (아래쪽 두 칸과 함께)
  for (const dc of [-1, 1]) {
    if (
      colorOf(row, col + dc) === color &&
      colorOf(row + 1, col) === color &&
      colorOf(row + 1, col + dc) === color
    ) {
      return true;
    }
  }
  return false;
}

export function makeGem(board: Board, color: GemColor): Gem {
  return { id: allocGemId(board), color };
}

/**
 * 매치 판정에 쓰는 색. 아이템이 된 보석은 색 역할을 잃는다 - 보라 로켓은
 * 보라 보석 둘과 나란히 서도 3매치가 되지 않는다.
 *
 * gem.color를 직접 지우지 않는 이유: 그림에는 색이 남아야 한다.
 * 보라 보석으로 만든 로켓은 보라색으로 그려져야 어디서 왔는지 읽힌다.
 * 그래서 "표시용 색(gem.color)"과 "매치용 색(이 함수)"을 나눈다.
 */
export function matchColorOf(gem: Gem | null): number | null {
  if (!gem || gem.special || gem.inert) return null;
  return gem.color;
}

/** 플레이어가 집어 옮길 수 있는가. 수집물은 짐이라 못 옮긴다. */
export function isSwappable(gem: Gem | null): boolean {
  return gem !== null && !gem.inert;
}

/**
 * 그 칸의 보석을 옮길 수 있는가.
 *
 * 보석만 봐서는 모자란다 - 사슬·꿀은 **보석을 붙잡아** 못 움직이게 한다.
 * 얼음처럼 겹만 두꺼운 덮개는 안 붙잡으므로 덮개가 있다고 다 막으면 안 된다.
 */
export function isCellSwappable(cell: Cell): boolean {
  if (!cell.exists || cell.blocker) return false;
  if (cell.cover?.locks) return false;
  return isSwappable(cell.gem);
}

/**
 * 매치가 없는 상태로 빈 칸을 채운다.
 * 리필과 달리 "처음부터 터져 있는" 보드가 나오면 안 되므로
 * 3연속이나 2x2 정사각형이 생기는 색을 후보에서 빼고 고른다.
 */
export function fillBoard(board: Board, rng: Rng, colors = COLOR_COUNT): Board {
  const next = cloneBoard(board);
  for (let r = 0; r < next.height; r++) {
    for (let c = 0; c < next.width; c++) {
      const cell = at(next, r, c);
      // 그릇 칸은 담는 칸이 아니라 받아 삼키는 구멍이다. 시작할 때 채워두면
      // 중력의 규칙(canHold)과 어긋나 수집물이 들어갈 자리가 없어진다.
      if (!isPlayable(cell) || cell.gem || cell.collector) continue;
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
      // 2x2 정사각형도 매치이므로 시작 보드에서는 만들지 않는다.
      if (r >= 1 && c >= 1) {
        const left = at(next, r, c - 1).gem?.color;
        const up = at(next, r - 1, c).gem?.color;
        const diag = at(next, r - 1, c - 1).gem?.color;
        if (left != null && left === up && left === diag) banned.add(left);
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
