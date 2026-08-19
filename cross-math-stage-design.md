# 크로스매쓰 스테이지 모드 — 구조 제안

난이도가 단조 상승이 아니라 **오르락내리락하면서 전체적으로는 올라가는** 스테이지 모드 설계안입니다.

---

## 0. 지금 코드에서 유리한 점

먼저 확인한 사실 두 가지가 설계를 크게 단순하게 만듭니다.

1. **생성기는 이미 `DifficultyConfig` 객체를 받는다.**
   `buildStructure(cfg)` / `selectBlanks(..., cfg)` 모두 config를 인자로 받습니다.
   `DIFFICULTY_CONFIGS`의 12개 중 하나를 고르는 건 `generateLevelForDifficulty()`의 첫 줄뿐입니다.
   → **생성기 내부를 건드리지 않고**, config를 만들어 넣는 함수만 추가하면 스테이지 모드가 됩니다.

2. **`Math.random()` 사용처가 단 2곳**(`randInt`, `shuffle`)이다.
   → 시드 고정이 매우 저렴합니다.

---

## 1. 핵심 아이디어: 난이도를 두 축으로 분리한다

가장 중요한 결정입니다. **"오르락내리락"을 모든 요소에 적용하면 안 됩니다.**

| 축 | 해당 파라미터 | 움직임 | 이유 |
|---|---|---|---|
| **진도 축 (단조 증가)** | `gridSize`, `operators`, `factorRange` | 절대 안 내려감 | 나눗셈을 배웠는데 다음 판에서 사라지면 *퇴보*로 느껴짐. 격자 크기가 왔다갔다 하면 화면이 튐 |
| **체감 축 (진동)** | `blankRatio`, `equationCount`, `numberRange`, `maxResult` | 오르락내리락 | 같은 도구로 쉬웠다 어려웠다 → *리듬*으로 느껴짐 |

이걸 섞으면 "난이도가 들쭉날쭉하다"는 불평이 나오고, 분리하면 "완급 조절이 좋다"가 됩니다.

```
                     ┌─ 진도 축(base) ──→ gridSize, operators      ▁▂▃▄▅▆▇  단조
stage ──→ base(n) ──┤
          wave(n) ──┴─ 체감 축(score) ─→ blankRatio, maxResult …  ▃▁▄▂▅▃▆▄  진동
```

---

## 2. 난이도 곡선

### 2-1. 연속 난이도 점수 도입

12개 이산 레벨은 스테이지 모드엔 너무 거칩니다(lv4→lv5는 나눗셈 추가 + 격자 8→9 동시 변화).
**실수 점수 `1.0 ~ 12.0`** 를 도입하고, 이걸 config로 보간합니다.

```
stage → score(실수) → DifficultyConfig → (시드) 생성기 → CrossMathLevel
```

### 2-2. 곡선 공식

```ts
const SET_SIZE = 10;          // 10스테이지 = 1챕터
const SLOPE    = 0.085;       // 스테이지당 상승폭 → 약 130스테이지에 12.0 도달

// 챕터 안에서의 완급. 마지막 칸(보스)이 가장 높고, 평균은 0 근처로 둔다.
const WAVE = [0, +0.5, -0.4, +0.8, -0.6, +1.0, -0.3, +1.2, +0.2, +1.8];

function baseScore(stage: number): number {
  return 1 + (stage - 1) * SLOPE;                       // 단조 증가
}

function stageScore(stage: number): number {
  const wave = WAVE[(stage - 1) % SET_SIZE];
  return clamp(1, 12, baseScore(stage) + wave);         // 진동 포함
}
```

**`WAVE`를 하드코딩 테이블로 두는 이유**: `sin()` 공식보다 튜닝이 쉽고, 플레이어가 "8번째가 어렵고 9번째는 숨 돌린다"는 리듬을 학습할 수 있습니다. 값만 바꾸면 곡선 전체가 바뀌므로 밸런싱 비용이 거의 없습니다.

> `sin`을 쓰고 싶다면 주기가 다른 두 개를 합치세요(예: 주기 7 + 주기 3). 하나만 쓰면 패턴이 너무 뻔합니다.

### 2-3. 진도 축은 별도로

```ts
function progressLevel(stage: number): number {
  // wave를 빼고 base만 사용 → 절대 안 내려감
  return clamp(1, 12, Math.floor(baseScore(stage)));
}
```

---

## 3. 점수 → config 보간

```ts
// src/features/cross-math/stage/curve.ts

export function configForStage(stage: number): DifficultyConfig {
  const score = stageScore(stage);      // 진동 O
  const prog  = progressLevel(stage);   // 진동 X

  const lo = DIFFICULTY_CONFIGS[`lv${Math.floor(score)}` as Difficulty];
  const hi = DIFFICULTY_CONFIGS[`lv${Math.min(12, Math.ceil(score))}` as Difficulty];
  const t  = score - Math.floor(score);
  const p  = DIFFICULTY_CONFIGS[`lv${prog}` as Difficulty];

  return {
    level: prog,
    label: `스테이지 ${stage}`,
    color: p.color,
    desc:  '',

    // ── 진도 축: 진도 레벨에서 그대로 (되돌아가지 않음) ──
    gridSize:    p.gridSize,
    operators:   p.operators,
    factorRange: p.factorRange,

    // ── 체감 축: 점수로 보간 (오르락내리락) ──
    equationCount: Math.round(lerp(lo.equationCount, hi.equationCount, t)),
    numberRange:   { min: 1, max: Math.round(lerp(lo.numberRange.max, hi.numberRange.max, t)) },
    maxResult:     Math.round(lerp(lo.maxResult, hi.maxResult, t)),
    blankRatio:    lerp(lo.blankRatio, hi.blankRatio, t),
  };
}
```

`equationCount`는 `gridSize`에 물려 있으니, 진도 축 격자에 맞는 상·하한으로 한 번 더 clamp 하는 걸 권합니다.

---

## 4. 시드 고정 (스테이지 모드의 필수 조건)

스테이지 모드는 **같은 스테이지가 항상 같은 문제**여야 합니다.
- 다시 시도해도 같은 문제 → "풀다 만 문제"라는 감각이 생김
- 기기가 바뀌어도 동일 → 기록/공유가 의미를 가짐
- 밸런싱 재현 가능 → 37스테이지가 어렵다는 제보를 검증할 수 있음

`Math.random()`이 2곳뿐이라 아래 정도면 끝납니다.

```ts
// generator.ts
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = Math.random;               // 자유 모드는 기존 그대로
export function withSeed<T>(seed: number, fn: () => T): T {
  const prev = rng;
  rng = mulberry32(seed);
  try { return fn(); } finally { rng = prev; }
}

// randInt, shuffle 안의 Math.random() → rng() 로 교체
```

```ts
export function generateStage(stage: number): CrossMathLevel | null {
  return withSeed(hash(stage), () => generateFromConfig(configForStage(stage)));
}
```

> **주의**: `generateLevelForDifficulty`는 최대 80회 재시도 후 `null`을 반환합니다.
> 자유 모드는 "다시 시도"로 넘어가지만 **스테이지 모드에서 `null`은 치명적**입니다(그 스테이지에 영원히 진입 불가).
> 시드를 `hash(stage, salt)`로 두고 `salt`를 0,1,2… 올리며 재시도하는 폴백이 필요합니다. 그리고 아래 5번 테스트로 미리 잡으세요.

---

## 5. 반드시 넣어야 할 테스트

스테이지 모드는 "생성 실패 = 진행 불가"라서, 여기만은 테스트가 필수입니다.

```ts
// curve.test.ts
it('진도 축은 절대 내려가지 않는다', ...)          // gridSize, operators.length 비감소
it('체감 점수는 1~12 범위를 벗어나지 않는다', ...)
it('보스 스테이지는 직전 스테이지보다 어렵다', ...)  // stage % 10 === 0
it('챕터 평균 난이도는 챕터가 갈수록 오른다', ...)

// generator.stage.test.ts
it('1~200 스테이지가 모두 생성된다', ...)          // null 0건 — 가장 중요
it('같은 스테이지는 항상 같은 퍼즐이다', ...)       // 시드 고정 검증
```

---

## 6. 진행 저장

```ts
// src/features/cross-math/stage/progress.ts
interface StageProgress {
  schemaVersion: 1;                 // 마이그레이션용 — 처음부터 넣어두세요
  highest: number;                  // 해금된 최고 스테이지
  records: Record<number, {
    stars: 1 | 2 | 3;
    bestMs: number;
    hintsUsed: number;
  }>;
}
```

별 기준 예시 — **시간보다 힌트/오답 기준을 권합니다.** 시간 기준은 퍼즐 게임에서 스트레스를 주고, 어려운 스테이지에서 3별이 구조적으로 불가능해집니다.

| 별 | 조건 |
|---|---|
| ★★★ | 힌트 0회, 오답 배치 0회 |
| ★★ | 힌트 1회 이하 |
| ★ | 클리어 |

---

## 7. 파일 구조

```
src/features/cross-math/
  stage/
    curve.ts        # stageScore, progressLevel, configForStage
    curve.test.ts
    progress.ts     # localStorage 저장/불러오기 + schemaVersion
  utils/
    generator.ts    # withSeed 추가, rng 주입 (그 외 무변경)
  components/
    CrossMathModeSelect.tsx    # 자유 모드 / 스테이지 모드
    CrossMathStageSelect.tsx   # 챕터별 스테이지 그리드
    CrossMathGame.tsx          # mode: 'free' | 'stage' 분기
```

`CrossMathGame`은 지금 `screen: 'select' | 'generating' | 'playing'` 상태를 갖고 있습니다.
스테이지 모드를 넣으면 이 컴포넌트가 더 커지므로, **레벨을 어떻게 얻는지**를 prop으로 주입하는 형태를 권합니다.

```tsx
<CrossMathBoard
  level={level}
  title="스테이지 37"
  onNext={() => goStage(38)}      // 스테이지 모드
  onNext={undefined}              // 자유 모드는 '새 퍼즐'
/>
```

---

## 8. 스테이지 선택 화면에서 곡선을 보여주기

**오르락내리락은 눈에 보여야 재미가 됩니다.** 안 보이면 그냥 "난이도가 들쭉날쭉한 게임"입니다.

- 10개 = 1챕터, 챕터 카드 그리드
- 각 스테이지 칸의 **높이나 색 농도를 `stageScore`에 비례**시켜 파도 모양이 드러나게
- 보스 스테이지(10의 배수)는 테두리 강조

---

## 9. 구현 순서 제안

1. `curve.ts` + `curve.test.ts` — UI 없이 곡선만. 숫자를 표로 뽑아 눈으로 확인
2. `withSeed` 도입 + 1~200 스테이지 생성 스모크 테스트 → **여기서 밸런싱이 결정됨**
3. `progress.ts` + 테스트
4. `CrossMathStageSelect` UI
5. `CrossMathGame`에 `mode` 분기 + 다음 스테이지 이동

1~2번에서 곡선이 확정되지 않으면 UI를 만들어도 계속 갈아엎게 됩니다.

---

## 결정이 필요한 것

| 항목 | 선택지 | 제안 |
|---|---|---|
| 스테이지 총 개수 | 유한(120) / 무한 | **무한** — 공식 기반이라 비용 0, `score`는 12에서 clamp |
| 해금 방식 | 순차 / 챕터 단위 | **순차** + 3회 실패 시 건너뛰기 허용 |
| 자유 모드 | 유지 / 스테이지로 흡수 | **유지** — 난이도 직접 고르는 수요는 따로 있음 |
