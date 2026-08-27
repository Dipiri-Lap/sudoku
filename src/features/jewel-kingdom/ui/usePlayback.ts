import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board } from '../engine/types';
import type { TurnStep } from '../engine/resolve';
import type { FallMove } from '../engine/gravity';
import { key } from '../engine/board';
import { CLEAR_HOLD_MS, CLEAR_MS, COLLECT_MS, EFFECT_MS, SWAP_MS, fallDurationMs } from './constants';

/**
 * 단계 목록 재생기.
 *
 * 이 훅에는 게임 규칙이 한 줄도 없다. 엔진이 준 단계를 순서대로 꺼내
 * 보드를 갈아끼우고, 그 단계에 맞는 시간만큼 기다릴 뿐이다.
 * 상태 머신도 없다 - 순서는 이미 배열이 정해놨고, 지금 어디인지는 index 하나다.
 *
 * royal-match에서는 reducer가 페이즈를 들고 타이머가 다음 페이즈를 밀어붙였고,
 * 그래서 규칙과 연출이 한 덩어리로 엉켰다. 여기서는 그 둘이 분리된다.
 */
export interface PlaybackView {
  board: Board;
  /** 지금 터지는 중인 칸 */
  clearing: Set<string>;
  /** 이번에 새로 생긴 아이템 칸 */
  spawned: Set<string>;
  /** 겹이 깎인 장애물·덮개 칸 */
  damaged: Set<string>;
  /** 이번 낙하의 이동 정보 - FLIP 애니메이션이 그대로 쓴다 */
  falling: FallMove[];
  /** 매치가 안 돼서 되돌아가는 중인 두 칸 */
  invalid: Set<string>;
  /** 지금 그릇으로 빨려 들어가는 수집물 칸 -> 목적지 그릇 칸 */
  collecting: Map<string, string>;
  /** 재생 위치. 같은 칸이 연속으로 터져도 애니메이션이 다시 시작되게 하는 key */
  tick: number;
  playing: boolean;
}

const NONE = {
  clearing: new Set<string>(),
  spawned: new Set<string>(),
  damaged: new Set<string>(),
  falling: [] as FallMove[],
  invalid: new Set<string>(),
  collecting: new Map<string, string>(),
};

/** 그 단계를 보여주는 데 필요한 시간 */
export function stepDurationMs(step: TurnStep): number {
  switch (step.kind) {
    case 'swap':
    case 'revert':
      return SWAP_MS;
    case 'clear':
      return CLEAR_MS + CLEAR_HOLD_MS;
    case 'fall': {
      if (step.moves.length === 0) return 0;
      const longest = Math.max(...step.moves.map(m => fallDurationMs(m.toRow - m.fromRow)));
      return longest + 40;
    }
    case 'collect':
      return COLLECT_MS;
    case 'board-effect':
      return EFFECT_MS;
  }
}

function viewOf(step: TurnStep, tick: number): PlaybackView {
  return {
    board: step.board,
    clearing: step.kind === 'clear' ? new Set(step.cells) : NONE.clearing,
    spawned: step.kind === 'clear' ? new Set(step.spawned.map(s => s.key)) : NONE.spawned,
    damaged: step.kind === 'clear' ? new Set(step.damage.map(e => e.key)) : NONE.damaged,
    falling: step.kind === 'fall' ? step.moves : NONE.falling,
    invalid:
      step.kind === 'revert'
        ? new Set([key(step.a.row, step.a.col), key(step.b.row, step.b.col)])
        : NONE.invalid,
    collecting:
      step.kind === 'collect'
        ? new Map(step.collects.map(e => [e.from, e.key]))
        : NONE.collecting,
    tick,
    playing: true,
  };
}

export function usePlayback(initialBoard: Board) {
  /** 재생이 끝난 뒤 머무는 보드 */
  const [restBoard, setRestBoard] = useState(initialBoard);
  const [queue, setQueue] = useState<TurnStep[]>([]);
  const [index, setIndex] = useState(0);
  /** 재생 회차. tick을 상태로 따로 두면 effect에서 setState를 부르게 되므로 파생시킨다. */
  const [playId, setPlayId] = useState(0);
  const onDoneRef = useRef<(() => void) | null>(null);

  const tick = playId * 4096 + index;

  const step: TurnStep | null = index < queue.length ? queue[index] : null;

  // 재생 중이면 다음 단계로 넘어갈 타이머를 건다. 재귀 호출이 아니라
  // "지금 index에 대한 효과"라서 중간에 끊기거나 겹칠 여지가 없다.
  // 마무리도 이 타이머 안에서 한다 - effect 본문에서 곧바로 setState를 부르면
  // 렌더가 연쇄로 한 번 더 돌기 때문이다.
  useEffect(() => {
    if (!step) return;
    const isLast = index === queue.length - 1;
    const timer = setTimeout(() => {
      if (!isLast) {
        setIndex(i => i + 1);
        return;
      }
      setRestBoard(step.board);
      setQueue([]);
      setIndex(0);
      const done = onDoneRef.current;
      onDoneRef.current = null;
      done?.();
    }, stepDurationMs(step));
    return () => clearTimeout(timer);
  }, [step, index, queue.length]);

  const play = useCallback((steps: TurnStep[], onDone?: () => void) => {
    if (steps.length === 0) {
      onDone?.();
      return;
    }
    onDoneRef.current = onDone ?? null;
    setQueue(steps);
    setIndex(0);
    setPlayId(id => id + 1);
  }, []);

  /** 재생과 무관하게 보드를 통째로 갈아끼운다(새 게임, 리셔플) */
  const reset = useCallback((board: Board) => {
    onDoneRef.current = null;
    setQueue([]);
    setIndex(0);
    setPlayId(id => id + 1);
    setRestBoard(board);
  }, []);

  const view: PlaybackView = step
    ? viewOf(step, tick)
    : { board: restBoard, ...NONE, tick, playing: false };

  return { view, play, reset };
}
