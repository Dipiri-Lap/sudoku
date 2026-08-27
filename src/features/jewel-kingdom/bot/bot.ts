import type { Board, Position } from '../engine/types';
import { COLOR_COUNT } from '../engine/types';
import { at, cloneBoard, createBoard, fillBoard, key, parseKey, swap } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import { expandSpecials } from '../engine/specials';
import { hasAnyMove, listMoves, resolveTurn, type TurnResult } from '../engine/resolve';
import { applyTurn, resolveOptionsFor, startLevel, type Level } from '../engine/level';
import { makeRng, type Rng } from '../engine/rng';

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

/**
 * 한 수를 고른다. greedy는 "그 수로 당장 몇 칸이 터지는가"만 본다.
 *
 * 연쇄까지 끝까지 시뮬레이션하지 않는 이유가 둘이다:
 *  - 비용. 후보 수가 수십 개인데 각각 전체 연쇄를 돌리면 수 하나 고르는 데
 *    턴 하나를 통째로 계산하는 셈이 된다. 2x2 매치를 넣자 후보 수와 연쇄 길이가
 *    같이 늘어 테스트가 타임아웃 났다.
 *  - 충실도. 사람은 연쇄를 예측하지 못한다. 연쇄까지 읽는 봇은 사람보다
 *    지나치게 잘 둬서 난이도 측정을 더 왜곡한다.
 */
function pickMove(
  board: Board,
  moves: { a: Position; b: Position }[],
  rng: Rng,
  strategy: Strategy,
): { a: Position; b: Position } {
  if (strategy === 'random' || moves.length === 1) {
    return moves[rng.int(moves.length)];
  }

  let best = moves[0];
  let bestScore = -1;
  moves.forEach(move => {
    const trial = swap(board, move.a, move.b);
    const seed = new Set<string>();
    findMatchGroups(trial).forEach(g => g.cells.forEach(k => seed.add(k)));
    // 아이템을 직접 스왑해서 발동시키는 수도 후보에 있으므로 발동 범위까지 센다.
    [move.a, move.b].forEach(p => {
      if (at(board, p.row, p.col).gem?.special) seed.add(key(p.row, p.col));
    });
    if (seed.size === 0) return;
    const cells = expandSpecials(trial, seed).cells;

    // 수집물 아래를 비우는 수에 가산점을 준다.
    //
    // 수집물은 매치가 안 되므로 스스로 못 내려온다. 아래 보석을 치워줘야
    // 그릇까지 흘러간다. 이걸 모르는 봇은 그릇 레벨을 거의 못 깨고,
    // 그러면 난이도 측정이 "레벨이 어렵다"가 아니라 "봇이 못 한다"를 재게 된다.
    let score = cells.size;
    cells.forEach(k => {
      const { row, col } = parseKey(k);
      for (let r = row - 1; r >= 0; r--) {
        if (at(board, r, col).gem?.inert) {
          score += 3;
          break;
        }
      }
    });

    if (score > bestScore) {
      bestScore = score;
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

    const move = pickMove(board, moves, rng, strategy);
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

// ─────────────────────────────────────────────────────────────
// 레벨 플레이 - 난이도 자동 검증의 근거
// ─────────────────────────────────────────────────────────────

export interface LevelAttempt {
  won: boolean;
  movesUsed: number;
  /** goals와 같은 순서의 최종 진행도 */
  progress: number[];
  reshuffles: number;
}

/** 레벨 한 판을 끝까지 플레이한다. */
export function playLevel(level: Level, rng: Rng, options: Partial<PlayOptions> = {}): LevelAttempt {
  const colors = level.colors ?? COLOR_COUNT;
  const strategy = options.strategy ?? 'greedy';
  const maxReshuffles = options.maxReshuffles ?? 20;

  let state = startLevel(level, rng);
  let reshuffles = 0;

  while (state.status === 'playing') {
    if (!hasAnyMove(state.board)) {
      if (reshuffles >= maxReshuffles) break;
      state = { ...state, board: reshuffle(state.board, rng, colors) };
      reshuffles++;
      continue;
    }

    const moves = listMoves(state.board);
    if (moves.length === 0) break;

    const move = pickMove(state.board, moves, rng, strategy);
    const result = resolveTurn(state.board, move.a, move.b, rng, resolveOptionsFor(level));
    if (!result.valid) break;
    state = applyTurn(state, result);
  }

  return {
    won: state.status === 'won',
    movesUsed: level.moves - state.movesLeft,
    progress: state.progress,
    reshuffles,
  };
}

export interface DifficultyReport {
  /** 이긴 판의 비율 */
  winRate: number;
  /** 이긴 판의 평균 사용 수 */
  avgMovesWhenWon: number;
  /** 한 번 깨는 데 걸리는 평균 시도 횟수 (SPEC 7.7의 난이도 지표) */
  attemptsPerClear: number;
  runs: number;
}

/**
 * 레벨을 여러 판 돌려 난이도를 숫자로 낸다.
 *
 * 사람은 목표 난이도를 정하고, 그 안에 들었는지는 기계가 판정한다.
 * 이게 레벨 밸런싱을 자동화하는 지점이다.
 */
export function measureDifficulty(level: Level, runs = 200, strategy: Strategy = 'greedy'): DifficultyReport {
  let wins = 0;
  let movesWhenWon = 0;

  for (let seed = 0; seed < runs; seed++) {
    const attempt = playLevel(level, makeRng(seed), { strategy });
    if (attempt.won) {
      wins++;
      movesWhenWon += attempt.movesUsed;
    }
  }

  const winRate = wins / runs;
  return {
    winRate,
    avgMovesWhenWon: wins > 0 ? movesWhenWon / wins : 0,
    attemptsPerClear: winRate > 0 ? 1 / winRate : Infinity,
    runs,
  };
}
