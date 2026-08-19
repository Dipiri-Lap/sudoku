# 단어 정렬 게임 제작 - 단계별 프롬프트 모음

이 문서는 "단어 정렬(Word Sort)" 카드 게임을 처음부터 만들 때, AI 코딩 에이전트에게 순서대로 던질 프롬프트를 정리한 것입니다.
각 STEP의 회색 블록을 **그대로 복사해서** 
붙여넣으면 됩니다.
한 STEP이 끝나면 반드시 **동작 확인 → 커밋** 후 다음 STEP으로 넘어가세요.

---

## 게임 개요 (먼저 읽어두기)

| 항목 | 내용 |
|---|---|
| 장르 | 카드 정렬 퍼즐 (솔리테어 계열) |
| 목표 | 흩어진 단어 카드를 같은 카테고리끼리 슬롯에 모으기 |
| 핵심 조작 | 드래그 앤 드롭 |
| 구성 요소 | 덱(Deck) · 스택(Stack) · 슬롯(Slot) |
| 승리 조건 | 모든 슬롯이 카테고리별로 완성됨 |
| 플랫폼 | 웹 (PWA), 모바일 우선 |

**용어 정리**
- **카드(Card)**: 단어 하나. `{ id, word, category }`
- **덱(Deck)**: 아직 뽑지 않은 카드 더미
- **스택(Stack)**: 플레이어가 임시로 카드를 쌓아두는 작업 공간
- **슬롯(Slot)**: 같은 카테고리 카드를 모아 완성시키는 목표 칸
- **레벨(Level)**: 카테고리 조합 + 난이도 설정 묶음

---

## STEP 0. 프로젝트 초기 세팅

```
React + TypeScript + Vite로 "단어 정렬" 퍼즐 게임 프로젝트를 초기화해줘.

요구사항:
- Vite + React 18 + TypeScript (strict 모드)
- 라우팅: react-router-dom
- 스타일: CSS Modules 또는 Tailwind (권장안을 골라서 이유와 함께 적용)
- 테스트: vitest + @testing-library/react
- 린트: eslint + typescript-eslint
- PWA 지원: vite-plugin-pwa (오프라인 플레이 목표)

폴더 구조는 feature 기반으로 잡아줘:
  src/
    features/word-sort/
      components/   # UI 컴포넌트
      context/      # 상태 관리
      hooks/        # 커스텀 훅
      data/         # 레벨 JSON
      types/        # 타입 정의
    shared/         # 공통 유틸/컴포넌트
    pages/          # 라우트 진입점

작업 후 `npm run dev`가 정상 실행되는지 확인하고 결과를 보고해줘.
```

**완료 기준**: `npm run dev` 실행 → 빈 페이지가 뜬다.

---

## STEP 1. 데이터 모델과 타입 정의

```
단어 정렬 게임의 핵심 타입을 `src/features/word-sort/types/index.ts`에 정의해줘.

정의할 타입:
- Card: { id: string; word: string; category: string }
- Category: { id: string; name: string; words: string[] }
- Level: { id: number; name: string; categories: Category[]; slotCount: number; stackCount: number; deckSize: number }
- GameState: 덱/스택/슬롯/선택 상태/승리 여부/이동 횟수를 모두 포함
- SlotState: { id: string; category: string | null; cards: Card[]; isComplete: boolean }

주의사항:
- 카테고리별 단어 개수는 고정값을 하드코딩하지 말고 `category.words.length`로 계산할 것
- 모든 타입은 union/literal을 적극 사용해서 잘못된 상태를 컴파일 타임에 막을 것
- 타입만 만들고 로직은 아직 만들지 마
```

**완료 기준**: `npx tsc --noEmit` 통과.

---

## STEP 2. 레벨 데이터 만들기

```
`src/features/word-sort/data/levels.json`에 레벨 데이터를 만들어줘.

요구사항:
- 레벨 5개 (난이도 점진적 상승)
- 레벨 1: 카테고리 3개 × 단어 4개 (쉬움)
- 레벨 5: 카테고리 6개 × 단어 6개 (어려움)
- 카테고리 예시: 과일, 동물, 색깔, 나라, 직업, 스포츠, 악기, 날씨
- 각 카테고리의 단어는 서로 헷갈리지 않게 명확히 구분되는 것으로
- STEP 1에서 만든 Level 타입과 정확히 일치해야 함

추가로 `src/features/word-sort/data/levels.ts`를 만들어서
JSON을 import하고 Level[] 타입으로 캐스팅 + 런타임 검증(카테고리 중복,
단어 중복, 개수 불일치 체크)하는 로더 함수를 제공해줘.
```

**완료 기준**: 로더가 잘못된 데이터에 대해 명확한 에러를 던진다.

---

## STEP 3. 게임 로직 (순수 함수)

```
UI 없이 게임 규칙만 담은 순수 함수 모듈을 만들어줘.
파일: `src/features/word-sort/logic/gameLogic.ts`

구현할 함수:
- createInitialState(level: Level, seed?: number): GameState
  - 카드 셔플 (seed를 주면 결정적으로 동작 = 테스트 가능)
  - 덱/스택 초기 분배
- drawFromDeck(state): GameState — 덱에서 스택으로 카드 뽑기
- moveCardToSlot(state, cardId, slotId): GameState
- moveCardToStack(state, cardId, stackId): GameState
- canDropOnSlot(state, cardId, slotId): boolean
- checkSlotComplete(slot, level): boolean
- checkWin(state): boolean
- isDeadlock(state): boolean — 더 이상 수가 없는 상태 감지

규칙:
- 모든 함수는 순수 함수. state를 절대 변형(mutate)하지 말고 새 객체 반환
- 부수효과, DOM 접근, 랜덤(seed 없는) 사용 금지
- 각 함수에 JSDoc으로 규칙을 한 줄 설명

그리고 `gameLogic.test.ts`에 vitest 테스트를 작성해줘:
정상 이동, 불가능한 이동 거부, 슬롯 완성, 승리 판정, 데드락 감지 케이스 포함.
```

**완료 기준**: `npm test` 전부 통과. 이 단계가 게임의 심장이므로 테스트를 절대 건너뛰지 마세요.

---

## STEP 4. 상태 관리 (Context + useReducer)

```
`src/features/word-sort/context/WordSortContext.tsx`를 만들어줘.

요구사항:
- useReducer 기반. 리듀서는 STEP 3의 순수 함수를 호출만 하고 로직을 중복 구현하지 말 것
- 액션: START_LEVEL, DRAW_CARD, MOVE_TO_SLOT, MOVE_TO_STACK, UNDO, RESET, HINT
- UNDO를 위해 최근 N개(예: 20) 상태 히스토리를 유지
- 커스텀 훅 `useWordSort()` 제공. Provider 밖에서 쓰면 명확한 에러를 던질 것
- 슬롯 완성 감지를 위해 `lastCompletedSlot` 필드를 상태에 포함 (애니메이션 트리거용)
- 렌더 최적화: 상태와 dispatch를 별도 Context로 분리
```

**완료 기준**: Provider로 감싼 임시 컴포넌트에서 액션 dispatch 시 상태가 바뀐다.

---

## STEP 5. 기본 UI 렌더링 (드래그 없이)

```
게임 보드 UI를 만들어줘. 아직 드래그는 붙이지 말고, 클릭으로만 동작하게 해.

컴포넌트:
- WordSortGame.tsx  — 전체 레이아웃 컨테이너
- DeckArea.tsx      — 덱 더미 + 남은 장수 표시
- StackArea.tsx     — 스택 여러 개를 나란히 표시
- SlotArea.tsx      — 목표 슬롯들
- Card.tsx          — 카드 하나 (단어 표시)

레이아웃:
- 모바일 세로 화면 우선 (최소 360px 대응)
- 위: 슬롯 / 중간: 스택 / 아래: 덱 + 버튼
- 카드는 CSS로 깔끔하게. 카테고리별 색상 구분

동작:
- 카드 클릭 → 선택, 슬롯 클릭 → 이동 시도
- 이동 불가 시 흔들림(shake) 애니메이션
- 남은 이동 수, 경과 시간 표시

접근성: 카드는 button 요소로, aria-label에 "단어(카테고리)" 형식으로.
```

**완료 기준**: 클릭만으로 한 레벨을 끝까지 클리어할 수 있다.

---

## STEP 6. 드래그 앤 드롭

```
STEP 5의 클릭 조작은 유지한 채, 드래그 앤 드롭을 추가해줘.
파일: `src/features/word-sort/hooks/useWordSortDrag.ts`

요구사항:
- 마우스 + 터치 모두 지원 (Pointer Events 사용 권장)
- 드래그 중 원본 카드는 반투명, 커서를 따라다니는 고스트 카드 표시 (DragGhost.tsx)
- 드롭 가능한 슬롯은 하이라이트, 불가능한 곳은 표시 안 함
- 드롭 실패 시 원위치로 되돌아가는 애니메이션
- 드래그 가능 여부는 카드별 `canDrag` 플래그로 제어
- 모바일에서 스크롤과 충돌하지 않게 touch-action 처리

주의:
- 드래그 가드는 dragStart에서, 드롭 가드는 drop 핸들러에서 조기 return으로 처리
- 게임 규칙 판정은 STEP 3의 canDropOnSlot을 재사용할 것 (중복 구현 금지)
```

**완료 기준**: PC와 모바일 브라우저 양쪽에서 드래그가 자연스럽다.

---

## STEP 7. 애니메이션과 피드백

```
게임의 손맛을 위한 연출을 추가해줘.

- 카드 뽑기: 덱에서 스택으로 날아가는 모션
- 슬롯 완성: 카드가 모이는(gather) 연출 + 반짝임 + 완성 사운드
- 승리: 전체 화면 오버레이 + 색종이(confetti) + 통계(이동 수/시간)
- 실패/데드락: 재시작 유도 모달
- 버튼/카드 hover, active 상태

기술:
- CSS 애니메이션 우선, 복잡한 것만 JS
- `prefers-reduced-motion` 존중 (설정 시 애니메이션 최소화)
- 애니메이션 중 조작 잠금 처리 (중복 입력 방지)
- 사운드는 on/off 설정 제공, 기본은 on
```

**완료 기준**: 슬롯 완성/승리 시 연출이 끊김 없이 재생된다.

---

## STEP 8. 튜토리얼

```
첫 플레이 사용자를 위한 인터랙티브 튜토리얼을 만들어줘.

- `data/tutorial-level.json`: 셔플 없는 고정 카드 배치 (카드 id는 t0~t7처럼 고정)
- `components/TutorialOverlay.tsx`: 단계별 안내 오버레이
- `hooks/useTutorialStep.ts`: 현재 단계 관리

단계 예시:
1. "카드를 드래그해서 슬롯에 놓아보세요"
2. "같은 카테고리 카드를 모으면 슬롯이 완성됩니다"
3. "덱을 눌러 새 카드를 뽑으세요"
4. "스택은 임시 보관 공간입니다"
5. "모든 슬롯을 완성하면 승리!"

요구사항:
- 각 단계마다 해당 UI만 하이라이트(딤 처리 + 구멍 뚫기), 나머지 조작은 잠금
- 하이라이트 대상은 카드/슬롯/덱 집합으로 각각 관리
- 승리 오버레이는 튜토리얼 진행 중에는 뜨지 않게 (충돌 방지)
- 완료 여부를 localStorage에 저장, 설정에서 다시 보기 가능
```

**완료 기준**: 처음 접속한 사용자가 안내만 따라가면 규칙을 이해한다.

---

## STEP 9. 진행 저장과 레벨 선택

```
플레이 진행 상황을 저장하고 레벨을 고를 수 있게 해줘.

- `LevelSelect.tsx`: 레벨 목록, 클리어 표시(별점 등), 잠금 상태
- localStorage에 저장: 클리어한 레벨, 최고 기록(이동 수/시간), 설정값
- 진행 중이던 게임 이어하기 (앱을 껐다 켜도 복원)
- 저장 데이터에 schemaVersion을 넣고, 버전 불일치 시 안전하게 마이그레이션 또는 초기화
- 저장/불러오기 로직은 `shared/storage.ts`로 분리하고 테스트 작성
```

**완료 기준**: 새로고침해도 진행 상황이 유지된다.

---

## STEP 10. 설정과 편의 기능

```
게임 설정 모달과 편의 기능을 추가해줘.

설정 항목:
- 사운드 on/off, 진동(햅틱) on/off
- 다크 모드
- 애니메이션 속도 (보통/빠름/끄기)
- 튜토리얼 다시 보기, 진행 데이터 초기화(확인 다이얼로그 필수)

편의 기능:
- 되돌리기(Undo) 버튼 — STEP 4의 히스토리 사용
- 힌트 버튼 — 가능한 수 하나를 찾아 잠깐 하이라이트 (횟수 제한)
- 다시 시작 버튼
- 일시정지 (타이머 정지)
```

**완료 기준**: 설정 변경이 즉시 반영되고 새로고침 후에도 유지된다.

---

## STEP 11. 다국어 지원

```
한국어/영어 다국어를 지원하게 해줘.

- `data/i18n.ts`에 UI 문자열 사전
- 레벨 데이터도 언어별로 분리: levels.json / levels_en.json
- 브라우저 언어를 감지해 기본값 설정, 설정에서 수동 변경 가능
- 하드코딩된 한글 문자열이 코드에 남아있지 않은지 전체 점검하고 목록으로 보고해줘
```

**완료 기준**: 언어 전환 시 UI와 단어 데이터가 모두 바뀐다.

---

## STEP 12. 품질 점검과 마무리

```
릴리스 전 최종 점검을 해줘.

1. 테스트: 게임 로직 커버리지 확인, 부족한 케이스 보강
2. 성능:
   - 불필요한 리렌더 찾아서 memo/useCallback 적용 (측정 후 근거와 함께)
   - 번들 크기 확인, 큰 의존성 있으면 대안 제안
3. 접근성: 키보드만으로 플레이 가능한지, 스크린리더 레이블, 색상 대비
4. 반응형: 360px ~ 1920px, 가로/세로 모드
5. PWA: 오프라인 동작, 홈 화면 추가, 아이콘/스플래시
6. 에러 처리: ErrorBoundary, 손상된 저장 데이터 복구
7. `npm run build` 성공 + 프로덕션 빌드 실기 확인

발견한 문제를 심각도 순으로 목록화하고, 수정한 것과 남긴 것을 구분해서 보고해줘.
```

**완료 기준**: 빌드 통과 + 실기기에서 정상 플레이.

---

## 부록 A. 프롬프트 작성 요령

에이전트에게 지시할 때 결과 품질을 높이는 패턴입니다.

| 패턴 | 나쁜 예 | 좋은 예 |
|---|---|---|
| 범위 한정 | "게임 만들어줘" | "STEP 3의 순수 함수만. UI는 만들지 마" |
| 검증 기준 명시 | "잘 작동하게" | "`npm test` 통과하고 결과를 붙여줘" |
| 중복 방지 | (언급 없음) | "규칙 판정은 gameLogic.ts를 재사용, 중복 구현 금지" |
| 파일 지정 | "어딘가에 만들어줘" | "`src/features/word-sort/logic/gameLogic.ts`에" |
| 근거 요구 | "최적화해줘" | "측정 후 근거와 함께 최적화해줘" |

**자주 쓰는 보조 프롬프트**

```
방금 만든 코드를 리뷰해줘. 버그, 중복, 불필요한 복잡도 위주로.
수정은 하지 말고 문제점만 심각도 순으로 알려줘.
```

```
이 기능이 실제로 동작하는지 앱을 실행해서 확인해줘.
동작하지 않으면 원인을 찾아 고치고, 무엇이 문제였는지 설명해줘.
```

```
방금 변경한 내용을 커밋해줘. 커밋 메시지는 conventional commits 형식으로.
```

---

## 부록 B. 진행 체크리스트

- [ ] STEP 0 — 프로젝트 세팅 (`npm run dev` 동작)
- [ ] STEP 1 — 타입 정의 (`tsc --noEmit` 통과)
- [ ] STEP 2 — 레벨 데이터 + 검증 로더
- [ ] STEP 3 — 게임 로직 순수 함수 + 테스트 통과
- [ ] STEP 4 — Context + useReducer 상태 관리
- [ ] STEP 5 — 기본 UI (클릭으로 클리어 가능)
- [ ] STEP 6 — 드래그 앤 드롭 (PC + 모바일)
- [ ] STEP 7 — 애니메이션과 피드백
- [ ] STEP 8 — 튜토리얼
- [ ] STEP 9 — 진행 저장 + 레벨 선택
- [ ] STEP 10 — 설정 + Undo/힌트
- [ ] STEP 11 — 다국어
- [ ] STEP 12 — 품질 점검 + 빌드

---

## 부록 C. 흔한 함정

1. **게임 로직을 UI 안에 섞기** — 컴포넌트가 비대해지고 테스트가 불가능해집니다. STEP 3을 반드시 먼저.
2. **랜덤을 테스트 불가능하게 쓰기** — 셔플에 seed를 넣으세요.
3. **카드 개수 하드코딩** — `category.words.length`로 계산하세요. 레벨 확장 시 전부 깨집니다.
4. **오버레이 충돌** — 튜토리얼/승리/일시정지 오버레이가 동시에 뜨지 않도록 우선순위를 정하세요.
5. **드래그 가드 누락** — 애니메이션 중이거나 튜토리얼 잠금 상태일 때의 드래그를 막지 않으면 상태가 깨집니다.
6. **상태 직접 변형** — 리듀서에서 `state.cards.push(...)` 같은 코드는 리렌더 실패의 원인입니다.
7. **모바일 미확인** — 드래그는 PC에서만 테스트하면 반드시 문제가 납니다.
