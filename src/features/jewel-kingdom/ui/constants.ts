import { fallDistance, type FallMove } from '../engine/gravity';

// 연출 타이밍(ms). SPEC 8장에 대응한다.
//
// 여기 값들은 규칙이 아니라 감각이다. 기계가 판정할 수 없으므로 레퍼런스를 보고
// 사람이 숫자로 옮겨 적어야 한다. 일단 기존 royal-match에서 얻은 값으로 채워뒀다.
// 레퍼런스를 확인하면 이 파일만 고치면 된다.

export const SWAP_MS = 220;
/** 아이템 합체: 끈 아이템이 상대 칸으로 빨려 들어가 둘이 감기며 사라진다 */
export const MERGE_MS = 340;
export const CLEAR_MS = 240;
/** 터진 뒤 빈칸을 보여주는 정지 구간. 없으면 "터지자마자 이미 내려와 있는" 느낌이 난다. */
export const CLEAR_HOLD_MS = 120;
export const EFFECT_MS = 260;
/** 버섯이 다시 자라는 단계: 채소가 톡 터지고(~250ms) 버섯이 띠옹 솟는다 */
export const REGROW_MS = 820;
/** 버섯에 밀려 채소가 쩍 갈라지는 순간(CSS jk-regrow-split 시작과 같다) */
export const REGROW_CRACK_MS = 220;
/** 수집물이 그릇으로 빨려 들어가는 시간 */
export const COLLECT_MS = 300;

// 낙하: 시간이 거리의 제곱근에 비례하고 이징이 이차 ease-in이면
// d·(t/T)² 가 상수가 되어 모든 보석이 같은 가속도로 떨어진다.
// 그래서 한 열에서 낙하 거리가 달라도 서로 추월하거나 겹치지 않는다.
// 이 조합을 깨면 곧바로 겹쳐 보인다(royal-match에서 겪은 것).
//
// 값: 다른 3매치(캔디크러시·로얄매치 등)보다 빠르다는 지적으로 늦췄다.
// 1칸 0.19초, 4칸 0.28초, 7칸 0.37초, 9칸 0.42초(예전 0.15/0.21/0.28/0.32초).
export const FALL_BASE_MS = 140;
export const FALL_MIN_MS = 190;
export const FALL_MAX_MS = 560;
/**
 * 줄줄이 내려오기: 한 열에서 위에 있는 보석일수록 이만큼씩 늦게 출발한다.
 * 덩어리째 같이 떨어지면 "휙" 하고 끝나 보인다 - 다른 게임은 사이가 살짝 벌어지며 내려온다.
 * 가속도가 같으므로 늦게 출발한 위 보석은 아래 보석을 따라잡지 못한다(겹침 없음).
 */
export const FALL_STAGGER_MS = 28;
/** 한 열에서 늦출 최대 순번 - 긴 열이 너무 오래 기다리지 않게 */
const FALL_STAGGER_MAX = 7;
export const GRAVITY_EASE = 'cubic-bezier(0.11, 0, 0.5, 0)';
export const SWAP_EASE = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
/** 착지: 납작해졌다가 작게 통 튀고 자리 잡기 */
export const LAND_MS = 240;

export function fallDurationMs(rows: number): number {
  return Math.min(FALL_MAX_MS, Math.max(FALL_MIN_MS, FALL_BASE_MS * Math.sqrt(rows)));
}

/**
 * 낙하 이동마다 출발 지연. **출발한 열**에서 아래에 있던 것부터 0, 그 위로 한 칸씩 늦춘다.
 * 키는 이동 순번(moves 배열 인덱스) - id가 없는 장애물 이동도 같이 센다.
 *
 * 도착 열로 묶으면 안 된다: 대각선으로 옆 열에 빠져나가는 보석이 그 열 순번 때문에
 * 늦게 출발하면, 원래 열에서 바로 위에 있던 보석이 먼저 출발해 따라잡아 겹친다.
 */
export function fallDelays(moves: FallMove[]): number[] {
  const byCol = new Map<number, number[]>();
  moves.forEach((m, i) => byCol.set(m.fromCol, [...(byCol.get(m.fromCol) ?? []), i]));
  const out = new Array<number>(moves.length).fill(0);
  byCol.forEach(list => {
    list
      .sort((a, b) => moves[b].fromRow - moves[a].fromRow)
      .forEach((i, n) => (out[i] = Math.min(n, FALL_STAGGER_MAX) * FALL_STAGGER_MS));
  });
  return out;
}

/**
 * 경로를 따라 떨어지는 키프레임. 같은 가속도로 떨어지게 지나간 거리 s에서의 시각을
 * t/T = sqrt(s/L)로 둔다(s = L·(t/T)²). 칸마다 4토막씩 점을 찍어 직선 구간도 가속이 보인다.
 * 위치는 도착 칸 기준 이동량(칸 단위)이다.
 */
export function fallKeyframes(move: FallMove): { dx: number; dy: number; offset: number }[] {
  const path = move.path ?? [
    { row: move.fromRow, col: move.fromCol },
    { row: move.toRow, col: move.col },
  ];
  const end = path[path.length - 1];
  const steps = path.length - 1;
  // 경로가 없는 옛 기록(출발·도착만)은 거리만큼 곧게 나눈다
  const total = move.path ? steps : Math.max(1, move.toRow - move.fromRow);
  const SUB = 4;
  const out: { dx: number; dy: number; offset: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const a = path[i];
    const b = path[i + 1];
    const len = move.path ? 1 : total;
    for (let k = 0; k < SUB; k++) {
      const u = k / SUB;
      const s = (move.path ? i : 0) + u * len;
      out.push({
        dx: a.col + (b.col - a.col) * u - end.col,
        dy: a.row + (b.row - a.row) * u - end.row,
        offset: Math.sqrt(s / total),
      });
    }
  }
  out.push({ dx: 0, dy: 0, offset: 1 });
  return out;
}

/** 낙하 단계 전체 길이: 가장 늦게 닿는 보석 기준 */
export function fallStepMs(moves: FallMove[]): number {
  if (moves.length === 0) return 0;
  const delays = fallDelays(moves);
  return Math.max(...moves.map((m, i) => delays[i] + fallDurationMs(fallDistance(m))));
}
