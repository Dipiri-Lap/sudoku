import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board } from '../engine/types';
import type { TurnStep } from '../engine/resolve';
import type { FallMove } from '../engine/gravity';
import { key } from '../engine/board';
import { CLEAR_HOLD_MS, CLEAR_MS, COLLECT_MS, EFFECT_MS, MERGE_MS, SWAP_MS, fallStepMs } from './constants';
import { arrivalMs, clearStepMs, flightTargets, scheduleClear } from './fx/schedule';

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
  /** 칸이 사라지기 시작하는 시각(ms). 아이템 이펙트가 물결처럼 지나가게 한다 */
  delays: Map<string, number>;
  /** 지금 재생 중인 단계(이펙트 층이 본다) */
  step: TurnStep | null;
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
  /** 합체해서 이미 사라진 두 칸 - 이펙트 층의 합체 아이템이 이어받는다 */
  merged: Set<string>;
  /**
   * 이번 단계 직전의 판(터짐 단계에서만). 장애물은 피해 직전 모습으로 두었다가
   * 맞는 시각(hitAt)에 깎이거나 깨져야 한다 - 안 그러면 도토리가 날아가기도 전에 돌이 사라진다.
   */
  before: Board | null;
  /** 장애물 칸이 (마지막으로) 맞는 시각(ms). 도토리 떼가 한 돌에 몰리면 마지막 도착 시각 */
  hitAt: Map<string, number>;
  /** 무지개꽃 변신 합체: 채소가 아이템으로 바뀌는 시각(꽃잎이 닿는 순간) */
  morphAt: Map<string, number>;
  /** 재생 위치. 같은 칸이 연속으로 터져도 애니메이션이 다시 시작되게 하는 key */
  tick: number;
  playing: boolean;
}

const NONE = {
  clearing: new Set<string>(),
  delays: new Map<string, number>(),
  step: null as TurnStep | null,
  spawned: new Set<string>(),
  damaged: new Set<string>(),
  falling: [] as FallMove[],
  invalid: new Set<string>(),
  collecting: new Map<string, string>(),
  merged: new Set<string>(),
  before: null as Board | null,
  hitAt: new Map<string, number>(),
  morphAt: new Map<string, number>(),
};

/** 그 단계를 보여주는 데 필요한 시간 */
export function stepDurationMs(step: TurnStep): number {
  switch (step.kind) {
    case 'swap':
      return step.merge ? MERGE_MS : SWAP_MS;
    case 'revert':
      return SWAP_MS;
    case 'clear':
      // 이펙트가 있으면 물결이 마지막 칸에 닿아 사라질 때까지, 없으면 기존 길이
      return clearStepMs(step, CLEAR_MS) || CLEAR_MS + CLEAR_HOLD_MS;
    case 'fall': {
      if (step.moves.length === 0) return 0;
      return fallStepMs(step.moves) + 40;
    }
    case 'collect':
      return COLLECT_MS;
    case 'board-effect':
      return EFFECT_MS;
  }
}

/** 장애물 칸마다 마지막으로 맞는 시각: 기본은 그 칸의 시각, 여러 마리가 날아오면 가장 늦은 도착 */
function hitTimes(step: TurnStep): Map<string, number> {
  const out = new Map<string, number>();
  if (step.kind !== 'clear') return out;
  const sched = scheduleClear(step);
  step.damage.forEach(d => out.set(d.key, sched.delays.get(d.key) ?? 0));
  sched.blasts.forEach(sb => {
    flightTargets(sb.blast).forEach(t => {
      const k = key(t.row, t.col);
      if (!out.has(k)) return;
      out.set(k, Math.max(out.get(k)!, sb.start + arrivalMs(sb.blast, t)));
    });
  });
  return out;
}

function viewOf(step: TurnStep, tick: number, before: Board | null): PlaybackView {
  return {
    board: step.board,
    clearing: step.kind === 'clear' ? new Set(step.cells) : NONE.clearing,
    delays: step.kind === 'clear' ? scheduleClear(step).delays : NONE.delays,
    step,
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
    merged:
      step.kind === 'clear' && step.merged
        ? new Set(step.merged.map(p => key(p.row, p.col)))
        : NONE.merged,
    before: step.kind === 'clear' ? before : null,
    hitAt: step.kind === 'clear' ? hitTimes(step) : NONE.hitAt,
    morphAt: step.kind === 'clear' ? scheduleClear(step).morphAt : NONE.morphAt,
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

  const before = index > 0 ? queue[index - 1].board : restBoard;
  const view: PlaybackView = step
    ? viewOf(step, tick, before)
    : { board: restBoard, ...NONE, tick, playing: false };

  return { view, play, reset };
}
