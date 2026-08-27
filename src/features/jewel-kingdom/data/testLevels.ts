import { ELEMENTS, elementLayer, type ElementDef } from './elements';
import type { Goal } from '../engine/goals';
import type { Level, TurnEndEffect } from '../engine/level';

/**
 * 요소별 시험 레벨.
 *
 * 샌드박스는 아무 조합이나 찍어볼 수 있는 대신, 무엇을 봐야 하는지는 사람이
 * 정해야 한다. 여기는 반대다 - **한 판에 한 요소만** 놓고 그 요소를 치우는
 * 것을 목표로 준다. 순서대로 눌러가며 하나씩 확인하면 카탈로그 전체를 훑게 된다.
 *
 * 레벨을 손으로 적지 않고 카탈로그에서 만들어 내는 이유: 표에 한 줄 추가하면
 * 시험 레벨도 저절로 하나 생긴다. 손으로 적으면 새 요소를 넣을 때마다
 * 시험 판을 빼먹게 되고, 빼먹은 건 영영 확인되지 않는다.
 */

const W = 7;
const H = 7;

/** 시험 레벨은 난이도가 목적이 아니라 관찰이 목적이라 이동 수를 넉넉히 준다. */
const MOVES = 40;

type Grid = string[][];

function blank(): Grid {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}

function put(grid: Grid, spots: [number, number][], token: string) {
  spots.forEach(([r, c]) => {
    grid[r][c] = token;
  });
}

function render(grid: Grid): string {
  return grid.map(row => row.join(' ')).join('\n');
}

/** 요소를 배치에 적는 토큰. 겹 수를 기본값과 다르게 주고 싶으면 layers를 넘긴다. */
function token(def: ElementDef, arg?: string): string {
  return arg ? `[${def.id}:${arg}]` : `[${def.id}]`;
}

interface Plan {
  grid: Grid;
  goals: Goal[];
  turnEnd?: TurnEndEffect[];
  walls?: string[];
  note: string;
}

/** 카탈로그에 담기지 않는 동작(훅·벽)을 쓰는 요소들. id로 먼저 걸러낸다. */
const OVERRIDES: Record<string, () => Plan> = {
  golem: () => {
    const grid = blank();
    put(grid, [[0, 2], [0, 4]], '[golem]');
    return {
      grid,
      goals: [{ kind: 'blocker', blockerKind: 'golem', count: 2 }],
      turnEnd: [{ kind: 'golem', spawnCount: 3 }],
      note: '매 턴 한 칸 내려온다. 바닥에 닿으면 잔해를 쏟는다',
    };
  },
  'giant-golem': () => {
    const grid = blank();
    put(grid, [[0, 3]], '[giant-golem]');
    return {
      grid,
      goals: [{ kind: 'blocker', blockerKind: 'giant-golem', count: 1 }],
      turnEnd: [{ kind: 'golem', spawnCount: 3 }],
      note: '부수면 작은 골렘 둘로 쪼개진다',
    };
  },
  tube: () => {
    const grid = blank();
    grid[0][2] = '[tube:R]';
    grid[0][4] = '[tube:B]';
    return {
      grid,
      goals: [{ kind: 'color', color: 0, count: 30 }],
      note: '가운데 두 열은 정해진 색만 내려온다',
    };
  },
  wall: () => ({
    grid: blank(),
    goals: [{ kind: 'color', color: 1, count: 30 }],
    walls: [
      '0,3|left', '1,3|left', '2,3|left', '3,3|left',
      '4,2|top', '4,3|top', '4,4|top',
    ],
    note: '벽 너머로는 보석이 오가지 못한다. 방마다 따로 채워진다',
  }),
  // 지키는 것과 지켜지는 것은 **함께** 놓아야 축이 보인다.
  // 묘비만 덩그러니 놓으면 그냥 두 겹짜리 장애물과 구분되지 않는다.
  tombstone: () => guarded('[tombstone]', '[ghost]', 'tombstone', '유령을 다 없애야 묘비가 열린다'),
  'color-mixer': () =>
    guarded('[color-mixer]', '[paint-bucket]', 'color-mixer', '물감통을 다 부숴야 색섞개가 열린다'),
  castle: () => guarded('[castle]', '[metal-tower]', 'castle', '금속탑을 다 없애야 성이 열린다'),

  // 돌뱀은 머리와 몸통이 한 덩어리다. 따로 놓으면 "머리만 통한다"가 안 보인다.
  'serpent-head': () => serpent(),
  'serpent-body': () => serpent(),

  'magic-wall': () => {
    const grid = blank();
    put(grid, [[2, 1], [2, 2], [2, 3], [2, 4], [2, 5]], '[magic-wall]');
    return {
      grid,
      goals: [{ kind: 'blocker', blockerKind: 'magic-wall', count: 5 }],
      note: '한 줄이 통째로 하나다. 칸마다 다섯 겹씩 깎아야 한다',
    };
  },

  // 젤리는 없애는 게 아니라 넓히는 것이라 다른 하단 레이어와 목표가 반대다.
  // 씨앗 몇 칸에서 시작해 판을 덮어 나간다.
  jelly: () => {
    const grid = blank();
    put(grid, [[3, 3]], '[jelly]');
    return {
      grid,
      // 판 전체(49칸)를 덮는 건 40수로 무리다. 절반쯤을 목표로 둔다.
      goals: [{ kind: 'spread', groundKind: 'jelly', count: 24 }],
      note: '옆 칸이 터지면 젤리가 번진다. 판을 덮어 나가는 게 목표다',
    };
  },
  'jelly-bomb': () => {
    const grid = blank();
    put(grid, [[3, 2], [3, 4]], '[jelly-bomb]');
    return {
      grid,
      goals: [{ kind: 'blocker', blockerKind: 'jelly-bomb', count: 2 }],
      note: '아이템으로만 깨진다. 깨지면 젤리가 쏟아지고 거기서부터 번진다',
    };
  },

  // 보물지도 = 병을 다 깨는 것. 지도 자체는 판에 놓이는 물건이 아니라
  // 목표의 겉모습이라, 여기서는 병만 놓고 목표를 병 수로 준다.
  bottle: () => {
    const grid = blank();
    put(grid, [[1, 1], [1, 5], [3, 3], [5, 1], [5, 5]], '[bottle]');
    return {
      grid,
      goals: [{ kind: 'blocker', blockerKind: 'bottle', count: 5 }],
      note: '병을 다 깨면 보물지도가 완성된다',
    };
  },

  conveyor: () => ({
    grid: blank(),
    goals: [{ kind: 'color', color: 2, count: 30 }],
    turnEnd: [{ kind: 'conveyor', path: ['6,0', '6,1', '6,2', '6,3', '6,4', '6,5', '6,6'] }],
    note: '맨 아랫줄이 매 턴 한 칸씩 옆으로 밀린다',
  }),
};

/**
 * 지켜지는 것 + 지키는 것을 한 판에 놓는다.
 *
 * 목표는 지켜지는 쪽으로 준다 - 그래야 "먼저 앞을 치워야 한다"를 플레이어가
 * 스스로 발견하게 된다. 목표가 지키는 쪽이면 그냥 평범한 장애물 판이다.
 */
function guarded(target: string, keeper: string, goalKind: string, note: string): Plan {
  const grid = blank();
  put(grid, [[3, 2], [3, 4]], target);
  put(grid, [[1, 1], [1, 5], [5, 1], [5, 5]], keeper);
  return {
    grid,
    goals: [{ kind: 'blocker', blockerKind: goalKind, count: 2 }],
    note,
  };
}

/** 머리 하나에 몸통 셋. 머리를 부수면 전부 무너진다. */
function serpent(): Plan {
  const grid = blank();
  put(grid, [[3, 1]], '[serpent-head]');
  put(grid, [[3, 2], [3, 3], [3, 4]], '[serpent-body]');
  return {
    grid,
    goals: [{ kind: 'blocker', blockerKind: 'serpent-head', count: 1 }],
    note: '몸통은 때려도 안 통한다. 머리를 노려야 한다',
  };
}

/** 매 턴 정해진 칸을 때리는 것들 - 때리는 자리만 다르게 준다. */
const ZAP_CELLS: Record<string, string[]> = {
  tesla: ['3,3'],
  laser: ['3,0', '3,1', '3,2', '3,3', '3,4', '3,5', '3,6'],
  fireworks: ['1,1', '1,5', '5,1', '5,5'],
};

function zapPlan(def: ElementDef): Plan {
  return {
    grid: blank(),
    goals: [{ kind: 'color', color: 3, count: 30 }],
    turnEnd: [{ kind: 'zap', cells: ZAP_CELLS[def.id] ?? ['3,3'] }],
    note: def.note,
  };
}

const LOWER_SPOTS: [number, number][] = [];
for (let r = 2; r <= 4; r++) for (let c = 1; c <= 5; c++) LOWER_SPOTS.push([r, c]);

const UPPER_SPOTS: [number, number][] = [
  [1, 1], [1, 3], [1, 5],
  [3, 1], [3, 3], [3, 5],
  [5, 1], [5, 3], [5, 5],
];

const BLOCKER_SPOTS: [number, number][] = [[2, 2], [2, 4], [4, 2], [4, 4]];

const CONTAINER_COLS = [0, 2, 4, 6];

function planFor(def: ElementDef): Plan {
  const override = OVERRIDES[def.id];
  if (override) return override();
  if (def.hook === 'zap') return zapPlan(def);

  const { layer, kind } = elementLayer(def);
  const layers = def.layers ?? 1;
  const grid = blank();

  switch (layer) {
    case 'ground': {
      // 하단 레이어는 그 칸에서 보석이 터져야 벗겨진다 - 넓게 깔아야 감이 온다.
      put(grid, LOWER_SPOTS, token(def));
      return {
        grid,
        goals: [{ kind: 'ground', groundKind: kind, count: LOWER_SPOTS.length * layers }],
        note: def.note,
      };
    }
    case 'cover': {
      put(grid, UPPER_SPOTS, token(def));
      return {
        grid,
        goals: [{ kind: 'cover', coverKind: kind, count: UPPER_SPOTS.length * layers }],
        note: def.note,
      };
    }
    case 'collector': {
      // 관이 수집물을 흘려보내고 그릇이 받는다. 그릇만 놓으면 담을 게 안 내려온다.
      CONTAINER_COLS.forEach(c => {
        grid[0][c] = '[tube:R]';
        grid[H - 1][c] = token(def, 'R2');
      });
      return {
        grid,
        goals: [{ kind: 'collect', collectKind: kind, count: CONTAINER_COLS.length }],
        note: def.note,
      };
    }
    case 'blocker': {
      const spots = def.category === 'generator' ? BLOCKER_SPOTS.slice(0, 2) : BLOCKER_SPOTS;
      put(grid, spots, token(def));
      return {
        grid,
        goals: [{ kind: 'blocker', blockerKind: kind, count: spots.length }],
        turnEnd: hookFor(def),
        note: def.note,
      };
    }
    default:
      return { grid, goals: [{ kind: 'color', color: 0, count: 25 }], note: def.note };
  }
}

/** 막는 장애물이 함께 걸어야 하는 턴 종료 훅 */
function hookFor(def: ElementDef): TurnEndEffect[] | undefined {
  if (def.hook === 'producer') return [{ kind: 'producer', color: 0 }];
  if (def.hook === 'regrow') return [{ kind: 'regrow', blockerKind: def.id, groundKind: 'soil' }];
  return undefined;
}

/** 시험 레벨 번호는 100번대를 쓴다 - 본 레벨 번호와 섞이지 않게. */
export const TEST_LEVEL_BASE = 101;

export const TEST_LEVELS: Level[] = ELEMENTS.map((def, i) => {
  const plan = planFor(def);
  return {
    id: TEST_LEVEL_BASE + i,
    label: def.label,
    layout: render(plan.grid),
    moves: MOVES,
    colors: 5,
    goals: plan.goals,
    ...(plan.turnEnd ? { turnEnd: plan.turnEnd } : {}),
    ...(plan.walls ? { walls: plan.walls } : {}),
  };
});

/** 그 시험 레벨이 무슨 요소를 보는 판인지 - 화면에 설명으로 띄운다. */
export function testLevelElement(id: number): ElementDef | undefined {
  return ELEMENTS[id - TEST_LEVEL_BASE];
}
