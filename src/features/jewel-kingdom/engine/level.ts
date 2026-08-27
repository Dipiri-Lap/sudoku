import type { Board, GemColor } from './types';
import { COLOR_COUNT } from './types';
import { at, fillBoard } from './board';
import { parseBoard } from './notation';
import { hasAnyMove, type TurnResult } from './resolve';
import { countProgress, goalTargetScorer, type Goal } from './goals';
import type { ResolveOptions } from './resolve';
import {
  combineHooks,
  conveyorHook,
  golemHook,
  producerHook,
  regrowHook,
  zapHook,
} from './hooks';
import type { Rng } from './rng';

/**
 * 레벨 정의. 보드 배치는 테스트 픽스처와 같은 표기를 쓴다 -
 * 레벨을 그대로 테스트에 붙여넣을 수 있어야 "레벨에서만 재현되는 버그"가 안 생긴다.
 *
 * 배치에서 `.`은 "평범한 칸"이고, 시작할 때 무작위 보석으로 채워진다.
 * `_`는 구멍, `#`은 장애물, `~`는 덮개.
 */
export interface Level {
  id: number;
  /** 목록에 보일 이름. 없으면 번호로 보인다. */
  label?: string;
  /** 보드 배치 (notation.ts 표기) */
  layout: string;
  moves: number;
  goals: Goal[];
  /** 사용할 색 수. 적을수록 쉽다 - 난이도를 가장 크게 좌우한다. */
  colors?: number;
  /** 턴이 끝날 때마다 보드를 스스로 바꾸는 요소 */
  turnEnd?: TurnEndEffect[];
  /**
   * 칸 경계의 벽. "행,열|top" 또는 "행,열|left" 형식.
   * 배치 문자열에 그리지 않는 이유: 벽은 칸이 아니라 칸 **사이**에 있어서
   * 격자 한 칸에 담기지 않는다. 억지로 그리면 표기가 읽을 수 없게 된다.
   */
  walls?: string[];
}

export type TurnEndEffect =
  | { kind: 'golem'; spawnKind?: string; spawnCount?: number }
  | { kind: 'producer'; color: GemColor }
  /** 정해진 경로를 따라 매 턴 한 칸씩 민다 */
  | { kind: 'conveyor'; path: string[] }
  /** 매 턴 정해진 칸을 때린다 */
  | { kind: 'zap'; cells: string[] }
  /** 이번 턴에 하나도 못 없앴으면 바닥 위에 하나가 되살아난다(버섯) */
  | { kind: 'regrow'; blockerKind: string; groundKind: string };

export type LevelStatus = 'playing' | 'won' | 'lost';

export interface LevelState {
  level: Level;
  board: Board;
  movesLeft: number;
  /** goals와 같은 순서의 진행도 */
  progress: number[];
  status: LevelStatus;
}

export function startLevel(level: Level, rng: Rng): LevelState {
  const colors = level.colors ?? COLOR_COUNT;
  const withWalls = () => {
    const b = parseBoard(level.layout);
    (level.walls ?? []).forEach(spec => {
      const [pos, side] = spec.split('|');
      const [row, col] = pos.split(',').map(Number);
      const cell = at(b, row, col);
      cell.walls = { ...(cell.walls ?? {}), [side]: true };
    });
    return b;
  };

  let board = fillBoard(withWalls(), rng, colors);

  // 시작하자마자 둘 수가 없으면 판을 다시 채운다.
  for (let i = 0; i < 20 && !hasAnyMove(board); i++) {
    board = fillBoard(withWalls(), rng, colors);
  }

  return {
    level,
    board,
    movesLeft: level.moves,
    progress: level.goals.map(() => 0),
    status: 'playing',
  };
}

export function isComplete(state: LevelState): boolean {
  return state.level.goals.every((g, i) => state.progress[i] >= g.count);
}

/**
 * 턴 결과를 레벨 상태에 반영한다.
 *
 * 목표를 채우는 순간 이기고, 수가 남아 있어도 끝난다.
 * 지는 건 "수를 다 썼는데 목표가 안 찼을 때"뿐이다 - 순서가 반대면
 * 마지막 수로 목표를 채운 판이 패배로 처리된다.
 */
export function applyTurn(state: LevelState, result: TurnResult): LevelState {
  if (state.status !== 'playing') return state;
  if (!result.valid) return { ...state, board: result.board };

  const gained = countProgress(state.level.goals, result);
  const progress = state.progress.map((p, i) => p + gained[i]);
  const movesLeft = state.movesLeft - 1;

  const next: LevelState = { ...state, board: result.board, movesLeft, progress };
  if (isComplete(next)) return { ...next, status: 'won' };
  if (movesLeft <= 0) return { ...next, status: 'lost' };
  return next;
}

/**
 * 부스터로 만든 결과를 반영한다.
 *
 * applyTurn과 다른 점은 **이동 횟수를 소모하지 않는다**는 것뿐이다.
 * 그게 부스터의 값어치다 - 수를 아끼려고 쓰는 것이므로 수를 먹으면 의미가 없다.
 */
export function applyBooster(state: LevelState, result: TurnResult): LevelState {
  if (state.status !== 'playing' || !result.valid) return state;

  const gained = countProgress(state.level.goals, result);
  const progress = state.progress.map((p, i) => p + gained[i]);
  const next: LevelState = { ...state, board: result.board, progress };
  return isComplete(next) ? { ...next, status: 'won' } : next;
}

/**
 * 이 레벨로 턴을 처리할 때 쓸 옵션.
 * 프로펠러가 이 레벨의 목표물을 노리도록 점수 함수를 실어 보낸다.
 */
export function resolveOptionsFor(level: Level): ResolveOptions {
  const hooks = (level.turnEnd ?? []).map(e => {
    switch (e.kind) {
      case 'golem':
        return golemHook({ spawnKind: e.spawnKind, spawnCount: e.spawnCount });
      case 'producer':
        return producerHook(e.color);
      case 'conveyor':
        return conveyorHook(e.path);
      case 'zap':
        return zapHook(e.cells);
      case 'regrow':
        return regrowHook(e.blockerKind, e.groundKind);
    }
  });
  return {
    colors: level.colors ?? COLOR_COUNT,
    targetScorer: goalTargetScorer(level.goals),
    ...(hooks.length > 0 ? { onTurnEnd: combineHooks(...hooks) } : {}),
  };
}

/** 남은 목표량 (화면 표시용) */
export function remaining(state: LevelState): number[] {
  return state.level.goals.map((g, i) => Math.max(0, g.count - state.progress[i]));
}
