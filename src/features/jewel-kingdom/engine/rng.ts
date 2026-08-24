// 시드 고정 난수. 3매치 엔진에서 난수는 리필(새 보석)에만 쓰이는데,
// Math.random을 직접 부르면 같은 입력이 같은 결과를 내지 않아
// 골든 테스트도 봇 회귀 측정도 성립하지 않는다. 난수는 반드시 주입받는다.
export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [0, maxExclusive) 정수 */
  int(maxExclusive: number): number;
  /** 현재 상태를 그대로 복제한다(같은 지점에서 분기해 실험할 때 쓴다) */
  fork(): Rng;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  const rng: Rng = {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(maxExclusive) {
      return Math.floor(rng.next() * maxExclusive);
    },
    fork() {
      return makeRng(state);
    },
  };
  return rng;
}
