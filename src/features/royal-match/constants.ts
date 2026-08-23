// 애니메이션 타이밍(ms). 상태 머신(reducer)의 단계 전환 타이머와
// CSS 트랜지션/키프레임 길이가 서로 어긋나지 않도록 한곳에서 관리한다.
export const SWAP_ANIM_MS = 260;
export const CLEAR_ANIM_MS = 260;
// 터진 뒤 빈칸을 잠깐 그대로 보여준다. "확실히 비었다"가 눈에 들어온 다음에
// 기존 타일과 새 타일이 다 같이 떨어지기 시작해야 인과관계가 읽힌다.
export const CLEAR_HOLD_MS = 150;

// 낙하: 자유낙하처럼 거리에 따라 시간이 늘어나되(√거리) 너무 늘어지지 않게 상한을 둔다.
export const FALL_BASE_MS = 210;
export const FALL_MIN_MS = 300;
export const FALL_MAX_MS = 920;
// 착지 후 스쿼시(찌그러짐) 애니메이션 길이.
export const LAND_ANIM_MS = 180;

export function fallDurationMs(rows: number): number {
  return Math.min(FALL_MAX_MS, Math.max(FALL_MIN_MS, FALL_BASE_MS * Math.sqrt(rows)));
}
