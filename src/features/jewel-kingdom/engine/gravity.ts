import type { Board, GemColor, Position } from './types';
import { COLOR_COUNT } from './types';
import { at, cloneBoard, isPlayable, makeGem, parseKey } from './board';
import type { Rng } from './rng';

export interface FallMove {
  id: number;
  col: number;
  fromRow: number;
  toRow: number;
  /** 보드 밖(위)에서 새로 들어온 보석인가 */
  spawned: boolean;
}

/**
 * 칸을 비우고 중력을 적용한 뒤 위쪽 빈자리를 새 보석으로 채운다.
 *
 * 칸을 막는 장애물은 그 열을 위아래로 끊는다. 끊긴 아래 구간은 자기들끼리만
 * 내려앉고 위에서 새 보석을 받지 못한다 - 장애물이 뚜껑 역할을 하기 때문이다.
 * 새 보석은 맨 위 구간에만 들어온다.
 *
 * 새 보석의 fromRow는 보드 위쪽 가상 행(음수)이다. 화면에서 천장 위에서
 * 떨어져 들어오는 시작점으로 쓰고, 낙하 거리 계산도 이걸 쓴다.
 */
export function applyGravity(
  board: Board,
  cleared: Set<string>,
  rng: Rng,
  colors = COLOR_COUNT,
): { board: Board; moves: FallMove[] } {
  const next = cloneBoard(board);
  cleared.forEach(k => {
    const { row, col } = parseKey(k);
    const cell = at(next, row, col);
    cell.gem = null;
  });

  const moves: FallMove[] = [];

  for (let col = 0; col < next.width; col++) {
    // 열을 장애물 기준으로 구간으로 쪼갠다.
    let segEnd = next.height - 1;
    for (let row = next.height - 1; row >= -1; row--) {
      const blocked = row < 0 || !isPlayable(at(next, row, col));
      if (!blocked) continue;
      const segStart = row + 1;
      if (segStart <= segEnd) {
        // 맨 위 구간(위쪽이 보드 밖)만 새 보석을 받는다.
        const canRefill = row < 0;
        compactSegment(next, col, segStart, segEnd, canRefill, rng, colors, moves);
      }
      segEnd = row - 1;
    }
  }

  return { board: next, moves };
}

function compactSegment(
  board: Board,
  col: number,
  top: number,
  bottom: number,
  canRefill: boolean,
  rng: Rng,
  colors: number,
  moves: FallMove[],
): void {
  // 아래에서 위로 훑으며 살아남은 보석을 순서대로 모은다.
  const survivors: { gem: NonNullable<ReturnType<typeof at>['gem']>; fromRow: number }[] = [];
  for (let row = bottom; row >= top; row--) {
    const cell = at(board, row, col);
    if (cell.gem) survivors.push({ gem: cell.gem, fromRow: row });
    cell.gem = null;
  }

  let writeRow = bottom;
  survivors.forEach(({ gem, fromRow }) => {
    at(board, writeRow, col).gem = gem;
    if (fromRow !== writeRow) {
      moves.push({ id: gem.id, col, fromRow, toRow: writeRow, spawned: false });
    }
    writeRow--;
  });

  if (!canRefill) return;

  // 남은 윗자리를 새 보석으로. 위쪽 가상 행에서 한 줄로 늘어선 채 내려온다.
  let spawnRow = -1;
  for (let row = writeRow; row >= top; row--) {
    const gem = makeGem(board, rng.int(colors) as GemColor);
    at(board, row, col).gem = gem;
    moves.push({ id: gem.id, col, fromRow: spawnRow, toRow: row, spawned: true });
    spawnRow--;
  }
}

/** 낙하 거리(칸). 새 보석은 음수 행에서 출발하므로 그만큼 더 멀리 떨어진다. */
export function fallDistance(move: FallMove): number {
  return move.toRow - move.fromRow;
}

export function positionsOf(moves: FallMove[]): Position[] {
  return moves.map(m => ({ row: m.toRow, col: m.col }));
}
