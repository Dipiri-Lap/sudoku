// 색은 인덱스로만 다룬다. 어떤 보석 그림을 쓰는지는 렌더링 문제이고
// 규칙에는 영향을 주지 않는다(컨셉을 바꿔도 엔진은 그대로다).
export type GemColor = 0 | 1 | 2 | 3 | 4 | 5;

export const COLOR_COUNT = 6;

/** 특수 타일. 발동 범위는 specials.ts가 정의한다. */
export type SpecialKind =
  | 'rocket-h' // 가로 로켓: 그 행 전체
  | 'rocket-v' // 세로 로켓: 그 열 전체
  | 'tnt' // TNT: 주변 사각 범위
  | 'propeller' // 프로펠러: 목표물이 많은 칸으로 날아간다
  | 'lightball'; // 라이트볼: 색이 없다. 지목된 색 전체

export interface Gem {
  /** 애니메이션에서 같은 타일을 추적하기 위한 안정적인 식별자 */
  id: number;
  /** lightball은 색이 없다 - 색 매치에 참여하지 않는다 */
  color: GemColor | null;
  special?: SpecialKind;
}

/**
 * 칸을 통째로 막는 장애물. 보석이 들어올 수 없다.
 *
 * 레퍼런스에는 33종 이상이 있지만 대부분 리스킨이고 동작은 몇 개의 축으로
 * 나뉜다(SPEC 6장). 종류를 나열하는 대신 축을 조합해서 표현한다 -
 * 그래야 새 장애물이 나올 때마다 코드를 늘리지 않는다.
 */
export interface Blocker {
  /** 겉모습 이름. 규칙에는 영향을 주지 않는다(리스킨 축) */
  kind: string;
  /** 남은 겹. 0이 되면 사라진다. 레퍼런스는 8겹 이상도 있다 */
  layers: number;
  /** 일반 매치로는 안 부서지고 아이템 폭발만 통한다 */
  powerUpOnly?: boolean;
  /** 이 색 매치로만 처리된다 */
  color?: GemColor;

  // ↓ 아직 미구현. 축만 잡아둔다 (SPEC 6장)
  /** 아래로 떨어뜨려 판 밖으로 빼내야 한다 */
  fallsOut?: boolean;
  /** 매 턴 스스로 움직인다(골렘 등). resolveTurn의 onTurnEnd 훅이 처리한다 */
  moving?: boolean;
  /** 매 턴 무언가를 뱉어낸다(우편함→편지 등) */
  produces?: string;
  /** 다른 걸 치워야 드러난다 */
  hidden?: boolean;
}

/** 보석 위에 덮인 것(얼음·사슬 등). 매치는 되지만 먼저 벗겨야 한다. */
export interface Cover {
  kind: string;
  layers: number;
}

export interface Cell {
  /**
   * 이 칸이 판의 일부인가. false면 "칸 자체가 없다"(구멍).
   *
   * 장애물과 구분해야 하는 이유: 레퍼런스의 판은 사각형이 아니다(다이아몬드형,
   * H자형 등). 구멍은 영원히 비어 있고 아무것도 놓이지 않으며 제거할 수도 없다.
   * 장애물은 치우면 그 자리에 보석이 들어온다. 둘을 한 필드로 뭉치면
   * "치울 수 없는 장애물"이라는 이상한 개념이 생긴다.
   */
  exists: boolean;
  gem: Gem | null;
  blocker: Blocker | null;
  cover: Cover | null;
}

export interface Board {
  width: number;
  height: number;
  /** row-major. cells[row * width + col] */
  cells: Cell[];
  /**
   * 다음에 발급할 보석 id. 모듈 전역 카운터가 아니라 보드가 들고 있다.
   * 왜: 전역이면 같은 시드로 두 번 돌려도 id가 달라져서 "같은 입력 -> 같은 출력"이
   * 깨진다. 골든 테스트도 봇 회귀 비교도 id를 포함한 결과를 비교하므로,
   * 재현성이 규칙 자체만큼 중요하다.
   */
  nextId: number;
}

export interface Position {
  row: number;
  col: number;
}
