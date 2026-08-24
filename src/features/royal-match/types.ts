export type GemType = 0 | 1 | 2 | 3 | 4 | 5;

export interface Position {
  row: number;
  col: number;
}

// id는 애니메이션(같은 타일이 자연스럽게 이동)을 위한 안정적인 React key로 쓰인다.
// spawnRow는 새로 생성된 타일이 "보드 위 어디에서" 떨어져 들어왔는지를 나타내는
// 가상 행(음수)이다. 낙하 애니메이션의 시작점으로만 쓰이고, 한 번 착지하면 의미가 없다.
// 로켓: 가로(rocket-h)는 그 행 전체를, 세로(rocket-v)는 그 열 전체를 날린다.
export type SpecialKind = 'rocket-h' | 'rocket-v';

export interface Tile {
  id: number;
  type: GemType;
  spawnRow?: number;
  special?: SpecialKind;
}

export type Board = Tile[][];

export type GameStatus = 'playing' | 'won' | 'lost';

// idle      - 입력 대기
// swapping  - 두 타일이 자리를 바꾸는 슬라이드 중
// reverting - 매치 실패로 되돌아가는 중
// clearing  - 매치된 타일이 터지는 중(아직 보드에 남아 있다)
// falling   - 중력 낙하 + 상단 리필 낙하 중
export type Phase = 'idle' | 'swapping' | 'reverting' | 'clearing' | 'falling';

// 실제로 발사된 로켓 - 궤적 이펙트를 어디에 어떤 방향으로 그릴지의 근거.
export interface Blast {
  row: number;
  col: number;
  kind: SpecialKind;
}

export interface PendingSwap {
  a: Position;
  b: Position;
}

export interface RoyalMatchState {
  board: Board;
  score: number;
  moves: number;
  movesLimit: number;
  targetScore: number;
  pendingSwap: PendingSwap | null;
  phase: Phase;
  /** 현재 터지는 중인 칸 키("r,c") - clearing 단계에서만 채워진다. */
  clearing: Set<string>;
  /** 이번 clearing에서 새로 생겨난 아이템 칸 키 - 등장 연출용. */
  spawnedSpecials: Set<string>;
  /** 이번 clearing에서 발사된 로켓들 - 궤적 연출용. */
  blasts: Blast[];
  /** clearing이 일어날 때마다 증가. 이펙트 엘리먼트의 React key를 갈아끼워
      같은 칸에서 연속으로 터져도 애니메이션이 처음부터 다시 재생되게 한다. */
  clearId: number;
  combo: number;
  lastCombo: number;
  status: GameStatus;
}
