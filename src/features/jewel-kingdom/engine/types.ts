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
  /** 색. 아이템·수집물은 색 매치에 참여하지 않는다(matchColorOf 참고) */
  color: GemColor | null;
  special?: SpecialKind;
  /**
   * 수집물(트로피·편지 등). 떨어지기는 하지만 **매치되지 않고 스왑도 안 된다.**
   * 그릇까지 흘려보내는 게 목적인 짐이다.
   *
   * 색 보석을 그릇에 담게 하면 규칙이 서로 부딪힌다 - 같은 색 셋이 세로로
   * 서는 순간 그게 곧 매치라서, 한 색만 내보내는 투입구가 무한 연쇄를 만든다.
   * 레퍼런스에서 선반에 담기는 게 보석이 아니라 별도의 물건인 이유다.
   */
  inert?: boolean;
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

  /**
   * 방패. 겹보다 먼저 벗겨야 하고 **아이템 폭발로만** 벗겨진다.
   * 겹과 따로 두는 이유: 겹은 일반 매치로도 깎이지만 방패는 아니다.
   * (로얄킹덤 15레벨의 방패 구조물)
   */
  shield?: number;
  /**
   * 부서질 때 이것들로 쪼개진다(로얄킹덤 거대 골렘).
   * 한 방에 없어지지 않고 문제가 잘게 남는다.
   */
  splitsInto?: { kind: string; layers: number; count: number; moving?: boolean };

  /** 아래로 떨어뜨려 판 밖으로 빼내야 한다 */
  fallsOut?: boolean;
  /** 매 턴 스스로 움직인다. resolveTurn의 onTurnEnd 훅이 처리한다 */
  moving?: boolean;
  /** 움직이는 방식. 없으면 아래로 내려온다 */
  move?: MoveKind;
  /** 왕복 이동의 현재 방향(물탑) */
  dir?: 1 | -1;
  /** 정해진 경로와 지금 위치(돌뱀·눈사람) */
  path?: string[];
  step?: number;
  /** 매 턴 무언가를 뱉어낸다(우편함→편지 등) */
  produces?: string;
  /**
   * 몇 턴에 한 번 뱉는가. 없으면 매 턴 (허수아비는 네 턴에 한 번).
   * 남은 턴 수(charge)는 보드가 들고 있는다 - 훅의 클로저에 두면 같은 시드로
   * 다시 돌렸을 때 값이 달라져서 재현성이 깨진다.
   */
  everyN?: number;
  charge?: number;
  /** 다른 걸 치워야 드러난다 */
  hidden?: boolean;

  /**
   * 부서질 때 주변에 이걸 퍼뜨린다.
   *
   * 레퍼런스에서 꿀단지·화분·거북·눈사람이 전부 이 모양이다 - 치우면
   * 사라지는 게 아니라 **문제가 넓게 번진다.** 골렘이 바닥에서 잔해를
   * 쏟는 것도 같은 축이라 그 특수 처리를 여기로 합쳤다.
   */
  spreads?: Spread;

  /**
   * 판에 이 종류가 하나라도 남아 있으면 무적이다.
   *
   * 한 축으로 두 가지를 덮는다:
   *  - 앞을 치워야 뒤가 열린다 (묘비←유령, 색섞개←물감통, 성←금속탑)
   *  - 누가 지켜주고 있다 (크리스탈·호위병이 지키는 대상)
   * 둘은 방향만 다를 뿐 "다른 칸의 생사가 이 칸의 무적을 결정한다"로 같다.
   */
  requires?: string;

  /**
   * 여러 칸에 걸친 하나의 장애물(마법의 벽·돌뱀·성). 같은 이름끼리 한 덩어리다.
   * weak인 칸이 하나라도 있으면 그 칸으로만 타격이 들어가고,
   * 그 칸이 부서지면 덩어리 전체가 무너진다(돌뱀의 머리).
   */
  group?: string;
  /** 덩어리에서 타격이 통하는 칸 */
  weak?: boolean;

  /** 부서질 때 그 자리에 아이템을 남긴다(상자→전기공) */
  drops?: SpecialKind;
  /** 부서질 때 이 반경을 함께 터뜨린다(통, 폭죽탑) */
  explodes?: number;
}

/**
 * 스스로 움직이는 방식.
 *  down     아래로 한 칸 (골렘·거북)
 *  teleport 판 위 아무 데로 (거대 드릴)
 *  sweep    좌우로 한 칸씩 왕복 (물탑)
 *  path     정해진 경로를 따라 (돌뱀·눈사람)
 */
export type MoveKind = 'down' | 'teleport' | 'sweep' | 'path';

/** 무언가가 번지는 방식 */
export interface Spread {
  kind: string;
  /** 어느 층에 놓이는가 */
  layer: 'cover' | 'ground' | 'blocker';
  layers?: number;
  /** 반경. 1이면 3x3 */
  radius?: number;
  /** area = 반경 사각형, column = 제 열 전체 */
  shape?: 'area' | 'column';
  /** 놓인 바닥이 다시 번지는가(젤리폭탄이 쏟는 젤리) */
  grows?: boolean;
}

/**
 * 보석 **위**에 덮인 것(사슬·꿀 등). 보석을 붙잡아 두어서, 그 보석이 매치에
 * 휩쓸려도 대신 맞고 보석은 살아남는다. 다 벗겨야 보석이 없어진다.
 * 레퍼런스 분류: Layered Element - Upper Layer
 */
export interface Cover {
  kind: string;
  layers: number;
  /**
   * 아래를 가린다(구름). 무엇이 깔려 있는지 벗기기 전에는 알 수 없다.
   * 규칙에는 영향을 주지 않고 화면만 가린다 - 그래서 "안 보이는 채로 매치가
   * 터지는" 일이 생기는데, 레퍼런스도 그렇다.
   */
  hides?: boolean;
  /**
   * 보석을 붙잡아 못 움직이게 한다(사슬·꿀).
   *
   * 스왑만이 아니라 **중력도 안 통한다.** 아래가 비어도 그 자리에 남는다.
   * 겹만 두꺼운 덮개(얼음)와 갈리는 지점이다 - 얼음 낀 보석은 옮길 수 있다.
   */
  locks?: boolean;
  /**
   * 일반 매치로는 안 벗겨지고 아이템 폭발만 통한다(사슬).
   * 옆에서 터뜨려 깎이는 얼음과 다르다 - 사슬은 부술 방법이 아이템뿐이다.
   */
  powerUpOnly?: boolean;
}

/**
 * 보석 **아래** 깔린 것(잔디·젤리·대리석 등).
 *
 * 덮개와 정반대다. 덮개는 보석을 지켜주지만 바닥은 **그 칸에서 보석이 터져야**
 * 벗겨진다. 옆에서 터뜨리는 걸로는 안 되고 그 자리에서 터져야 한다는 점이
 * 장애물(인접 타격)과도 다르다.
 * 레퍼런스 분류: Layered Element - Lower Layer
 */
export interface Ground {
  kind: string;
  layers: number;
  /**
   * 벗기는 게 아니라 **넓히는** 바닥(젤리).
   *
   * 잔디와 목적이 정반대다. 잔디는 그 칸에서 보석이 터지면 벗겨지지만,
   * 젤리는 옆 칸이 터지면 그리로 **번진다.** 목표도 "다 없애기"가 아니라
   * "판 전체를 덮기"다.
   */
  spreads?: boolean;
}

/**
 * 그릇 — 떨어져 들어온 보석을 받아 담는 칸(선반·찬장 등).
 * 레퍼런스 분류: Container Element
 *
 * 장애물과 정반대다. 장애물은 보석을 못 들어오게 막지만 그릇은 **받아서 없앤다**.
 * 다 차면 더 받지 않고 보통 칸처럼 보석이 지나간다.
 */
export interface Collector {
  kind: string;
  /** 표시용 색(무엇을 받는 그릇인지 알리는 용도) */
  color: GemColor | null;
  need: number;
  got: number;
}

/**
 * 투입구 — 그 열로 들어오는 새 보석의 색을 고정한다(레퍼런스의 관·튜브).
 * 맨 윗줄에만 의미가 있다.
 */
export interface Spawner {
  color: GemColor;
  /** 몇 번에 한 번 수집물을 내보내는가. 나머지는 평범한 보석이다. */
  everyN?: number;
}

/**
 * 칸 경계의 벽. 보석이 지나갈 수 없다.
 *
 * 벽은 칸이 아니라 **칸과 칸 사이**에 있다. 그래서 다른 장애물처럼 Cell 하나에
 * 담기지 않는다. 각 칸의 "위쪽 경계"와 "왼쪽 경계"만 들고 있으면 판 전체의
 * 모든 경계를 중복 없이 표현할 수 있다.
 */
export interface Walls {
  top?: boolean;
  left?: boolean;
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
  ground: Ground | null;
  walls: Walls | null;
  collector: Collector | null;
  spawner: Spawner | null;
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
