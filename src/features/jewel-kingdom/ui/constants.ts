// 연출 타이밍(ms). SPEC 8장에 대응한다.
//
// 여기 값들은 규칙이 아니라 감각이다. 기계가 판정할 수 없으므로 레퍼런스를 보고
// 사람이 숫자로 옮겨 적어야 한다. 일단 기존 royal-match에서 얻은 값으로 채워뒀다.
// 레퍼런스를 확인하면 이 파일만 고치면 된다.

export const SWAP_MS = 220;
export const CLEAR_MS = 240;
/** 터진 뒤 빈칸을 보여주는 정지 구간. 없으면 "터지자마자 이미 내려와 있는" 느낌이 난다. */
export const CLEAR_HOLD_MS = 120;
export const EFFECT_MS = 260;

// 낙하: 시간이 거리의 제곱근에 비례하고 이징이 이차 ease-in이면
// d·(t/T)² 가 상수가 되어 모든 보석이 같은 가속도로 떨어진다.
// 그래서 한 열에서 낙하 거리가 달라도 서로 추월하거나 겹치지 않는다.
// 이 조합을 깨면 곧바로 겹쳐 보인다(royal-match에서 겪은 것).
export const FALL_BASE_MS = 105;
export const FALL_MIN_MS = 150;
export const FALL_MAX_MS = 460;
export const GRAVITY_EASE = 'cubic-bezier(0.11, 0, 0.5, 0)';
export const SWAP_EASE = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
/** 착지 스쿼시 */
export const LAND_MS = 170;

export function fallDurationMs(rows: number): number {
  return Math.min(FALL_MAX_MS, Math.max(FALL_MIN_MS, FALL_BASE_MS * Math.sqrt(rows)));
}
