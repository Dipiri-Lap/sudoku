import type { Level } from '../engine/level';

/**
 * 레벨 데이터.
 *
 * 배치는 notation.ts 표기를 그대로 쓴다:
 *   .   평범한 칸 (시작할 때 무작위 보석으로 채워진다)
 *   _   구멍 (판의 일부가 아님)
 *   #   장애물, #3 이면 3겹
 *   ~R  덮개가 씌워진 보석, ~2R 이면 2겹
 *
 * 난이도는 봇이 판정한다(levels.test.ts). 사람은 목표 구간만 정하고,
 * 그 안에 드는지는 기계가 확인한다 - 레벨 밸런싱에서 사람 손이 가장 많이
 * 가는 부분이 바로 이 반복 플레이다.
 */
export const LEVELS: Level[] = [
  {
    id: 1,
    // 첫 레벨: 장애물 없이 색만 모은다. 조작을 익히는 판.
    layout: `
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
    `,
    moves: 20,
    colors: 5,
    goals: [{ kind: 'color', color: 0, count: 25 }],
  },
  {
    id: 2,
    // 상자를 처음 만나는 판. 목표가 하나라 "옆에서 터뜨린다"만 배우면 된다.
    layout: `
      . . . . . . .
      . . # # # . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . # # # . .
      . . . . . . .
    `,
    moves: 15,
    colors: 5,
    goals: [{ kind: 'blocker', blockerKind: 'box', count: 6 }],
  },
  {
    id: 3,
    // 목표 두 개를 동시에. 색을 모으면서 얼음도 벗겨야 한다.
    layout: `
      .   .   .  .  .   .   .
      .  ~R  ~G  .  ~B  ~Y   .
      .   .   .  .  .   .   .
      .   .   .  .  .   .   .
      .   .   .  .  .   .   .
      .  ~G  ~B  .  ~R  ~Y   .
      .   .   .  .  .   .   .
    `,
    moves: 26,
    colors: 5,
    goals: [
      { kind: 'cover', coverKind: 'roof', count: 8 },
      { kind: 'color', color: 2, count: 20 },
    ],
  },
  {
    id: 4,
    // 판 모양이 사각형이 아닌 첫 레벨. 구멍이 열을 끊어서
    // 어느 열에 새 보석이 들어오는지가 달라진다.
    layout: `
      _ _ . . . _ _
      _ . . . . . _
      . . . . . . .
      . . . #2 . . .
      . . . . . . .
      _ . . . . . _
      _ _ . . . _ _
    `,
    moves: 6,
    colors: 5,
    goals: [{ kind: 'blocker', blockerKind: 'box', count: 1 }],
  },
  {
    id: 5,
    // 골렘: 매 턴 한 칸씩 내려온다. 바닥에 닿으면 잔해를 쏟아낸다.
    // 아래를 비워주면 내려오고, 보석으로 막으면 그 자리에 머문다.
    layout: `
      . . . %5 . . .
      . . . .  . . .
      . . . .  . . .
      . . . .  . . .
      . . . .  . . .
      . . ~R . ~R . .
      . . . .  . . .
    `,
    moves: 24,
    colors: 5,
    goals: [{ kind: 'cover', coverKind: 'roof', count: 2 }],
    turnEnd: [{ kind: 'golem', spawnCount: 2 }],
  },
  {
    id: 6,
    // 하단 레이어(잔디): 그 칸에서 보석이 터져야 벗겨진다.
    // 옆에서 터뜨리는 걸로 되는 상자와 감각이 다르다.
    layout: `
      .   .   .   .   .   .   .
      . R^  G^  B^  Y^  R^   .
      . G^  B^2 Y^2 R^2 G^   .
      . B^  Y^2 R^3 G^2 B^   .
      . Y^  R^2 G^2 B^2 Y^   .
      . R^  G^  B^  Y^  R^   .
      .   .   .   .   .   .   .
    `,
    moves: 26,
    colors: 5,
    goals: [{ kind: 'ground', groundKind: 'grass', count: 34 }],
  },
  {
    id: 7,
    // 벽으로 판이 방으로 나뉜다. 방 사이로는 보석이 오가지 못한다.
    layout: `
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . # . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
    `,
    walls: [
      '0,3|left', '1,3|left', '2,3|left',
      '0,4|left', '1,4|left', '2,4|left',
      '4,2|top', '4,3|top', '4,4|top',
    ],
    moves: 18,
    colors: 5,
    goals: [
      { kind: 'blocker', blockerKind: 'box', count: 1 },
      { kind: 'color', color: 1, count: 30 },
    ],
  },
  {
    id: 8,
    // 그릇: 맨 아랫줄 선반에 빨강을 떨어뜨려 담는다.
    // 장애물과 정반대다 - 막는 게 아니라 받아서 없앤다.
    //
    // 관이 수집물을 흘려보내고 선반이 받는다. 수집물은 매치가 안 되므로
    // 스스로 못 내려온다 - 아래 보석을 치워서 길을 내주는 게 이 레벨의 퍼즐이다.
    // 관이 선반 열 위에 붙어 있는 이유이기도 하다.
    layout: `
      [tube:R]   . [tube:R]   . [tube:R]   . [tube:R]
      .          . .          . .          . .
      .          . .          . .          . .
      .          . .          . .          . .
      .          . .          . .          . .
      .          . .          . .          . .
      [shelf:R3] . [shelf:R3] . [shelf:R3] . [shelf:R3]
    `,
    moves: 20,
    colors: 5,
    goals: [{ kind: 'collect', collectKind: 'shelf', count: 4 }],
  },
  {
    id: 9,
    // 투입구: 가운데 두 열은 정해진 색만 나온다. 색 분포가 판마다 달라진다.
    layout: `
      .  .  >R >B .  .  .
      .  .  .  .  .  .  .
      .  .  .  .  .  .  .
      .  .  .  .  .  .  .
      .  .  .  .  .  .  .
      .  .  .  .  .  .  .
      .  .  .  .  .  .  .
    `,
    moves: 16,
    colors: 5,
    goals: [
      { kind: 'color', color: 0, count: 28 },
      { kind: 'color', color: 2, count: 22 },
    ],
  },
  {
    id: 10,
    // 컨베이어 벨트: 맨 아랫줄이 매 턴 한 칸씩 옆으로 밀린다.
    layout: `
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
      . . . . . . .
    `,
    moves: 24,
    colors: 5,
    goals: [{ kind: 'color', color: 2, count: 32 }],
    turnEnd: [
      {
        kind: 'conveyor',
        path: ['6,0', '6,1', '6,2', '6,3', '6,4', '6,5', '6,6'],
      },
    ],
  },
  {
    id: 11,
    // 카탈로그 전시장. 축 조합이 실제로 판에 올라오는지 눈으로 확인하는 판이다.
    // 대괄호 표기로 카탈로그의 아무 요소나 놓을 수 있다.
    layout: `
      [box]     .          [crate]  .        [log]      .        [barrel]
      .         [steel]    .        [vault]  .          [bastion] .
      [golem]   .          [mailbox] .       [magic-hat] .       [jar]
      .         [chain]R   .        [honey]G .          [ice]     .
      [grass]R  .          [jelly]G .        [marble]B  .        [mushroom]Y
      .         [red-lock] .        [rubble] .          [cauldron] .
      [shelf:R2] .         [cupboard:G2] .   [bird-house:B2] .   [bowling-box:Y2]
    `,
    moves: 40,
    colors: 5,
    goals: [{ kind: 'blocker', blockerKind: 'box', count: 1 }],
  },
];

/**
 * 샌드박스 — 장애물을 직접 찍어 시험하는 판.
 *
 * 레벨 11(전시장)은 미리 심어둔 걸 "보는" 판이고, 이건 아무 조합이나
 * 그 자리에서 "만들어 보는" 판이다. 골렘·우편함 훅을 미리 걸어둬서
 * 찍자마자 매 턴 동작한다.
 */
export const SANDBOX_LEVEL: Level = {
  id: 0,
  layout: `
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
    . . . . . . . .
  `,
  moves: 999,
  colors: 5,
  goals: [{ kind: 'color', color: 0, count: 99999 }],
  turnEnd: [{ kind: 'golem', spawnCount: 2 }, { kind: 'producer', color: 0 }],
};

export function levelById(id: number): Level | undefined {
  return LEVELS.find(l => l.id === id);
}
