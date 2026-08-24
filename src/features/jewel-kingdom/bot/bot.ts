import type { Board, Position } from '../engine/types';
import { COLOR_COUNT } from '../engine/types';
import { cloneBoard, createBoard, fillBoard } from '../engine/board';
import { hasAnyMove, listMoves, resolveTurn, type TurnResult } from '../engine/resolve';
import type { Rng } from '../engine/rng';

/**
 * 헤드리스 플레이어.
 *
 * 이게 검증의 절반을 담당한다:
 *  - 레벨 난이도 (수천 판 돌려 승률 분포를 본다)
 *  - 소프트락 (수가 없는데 리셔플도 안 되는 상태)
 *  - 연쇄 무한루프
 *  - 규칙을 바꿨을 때의 밸런스 회귀 ("TNT 반경을 2로 올렸더니 승률이 40%->71%")
 *
 * 사람이 판정해야 하는 건 손맛이지 난이도가 아니다. 난이도는 숫자다.
 */
export type Strategy = 'random' | 'greedy';

export interface PlayOptions {
  maxMoves: number;
  strategy?: Strategy;
  colors?: number;
  /** 수가 없을 때 보드를 다시 섞는 최대 횟수 */
  maxReshuffles?: number;
  /** 한 수마다 호출 - 목표 달성 여부 판정 등에 쓴다 */
  onTurn?: (result: TurnResult, board: Board) => void;
}

export interface PlayResult {
  movesUsed: number;
  clearedTotal: number;
  maxCombo: number;
  reshuffles: number;
  /** moves: 수를 다 씀 / stuck: 리셔플로도 수를 못 만듦 */
  endedBy: 'moves' | 'stuck';
  board: Board;
}

/** 한 수를 고른다. greedy는 1수 앞만 보고 가장 많이 터뜨리는 수를 고른다. */
function pickMove(
  board: Board,
  moves: { a: Position; b: Position }[],
  rng: Rng,
  strategy: Strategy,
  colors: number,
): { a: Position; b: Position } {
  if (strategy === 'random' || moves.length === 1) {
    return moves[rng.int(moves.length)];
  }
  // 평가용으로는 rng를 분기시켜 쓴다. 본 게임의 난수열을 흐트러뜨리면
  // 시드 재현성이 깨져서 회귀 측정을 못 하게 된다.
  let best = moves[0];
  let bestScore = -1;
  moves.forEach(move => {
    const probe = resolveTurn(cloneBoard(board), move.a, move.b, rng.fork(), { colors });
    if (probe.clearedCount > bestScore) {
      bestScore = probe.clearedCount;
      best = move;
    }
  });
  return best;
}

export function playGame(startBoard: Board, rng: Rng, options: PlayOptions): PlayResult {
  const colors = options.colors ?? COLOR_COUNT;
  const strategy = options.strategy ?? 'greedy';
  const maxReshuffles = options.maxReshuffles ?? 20;

  let board = cloneBoard(startBoard);
  let movesUsed = 0;
  let clearedTotal = 0;
  let maxCombo = 0;
  let reshuffles = 0;

  while (movesUsed < options.maxMoves) {
    if (!hasAnyMove(board)) {
      if (reshuffles >= maxReshuffles) {
        return { movesUsed, clearedTotal, maxCombo, reshuffles, endedBy: 'stuck', board };
      }
      board = reshuffle(board, rng, colors);
      reshuffles++;
      continue;
    }

    const moves = listMoves(board);
    if (moves.length === 0) {
      // hasAnyMove가 true인데 listMoves가 비었다면 둘의 규칙이 어긋난 것이다.
      return { movesUsed, clearedTotal, maxCombo, reshuffles, endedBy: 'stuck', board };
    }

    const move = pickMove(board, moves, rng, strategy, colors);
    const result = resolveTurn(board, move.a, move.b, rng, { colors });
    if (!result.valid) {
      // listMoves가 유효하다고 한 수가 무효로 판정됐다 - 규칙 불일치.
      throw new Error(`listMoves와 resolveTurn이 어긋난다: ${JSON.stringify(move)}`);
    }

    board = result.board;
    movesUsed++;
    clearedTotal += result.clearedCount;
    maxCombo = Math.max(maxCombo, result.maxCombo);
    options.onTurn?.(result, board);
  }

  return { movesUsed, clearedTotal, maxCombo, reshuffles, endedBy: 'moves', board };
}

/** 수가 없을 때 보석을 다시 뿌린다. 장애물과 아이템은 그대로 둔다. */
export function reshuffle(board: Board, rng: Rng, colors = COLOR_COUNT): Board {
  const next = cloneBoard(board);
  next.cells.forEach(cell => {
    if (cell.gem && !cell.gem.special) cell.gem = null;
  });
  return fillBoard(next, rng, colors);
}

export function newBoard(width: number, height: number, rng: Rng, colors = COLOR_COUNT): Board {
  return fillBoard(createBoard(width, height), rng, colors);
}
