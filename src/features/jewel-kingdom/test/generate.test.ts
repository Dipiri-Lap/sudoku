import { describe, it, expect } from 'vitest';
import { generateLevel, fitMoves, DEFAULT_FIT, type Recipe } from '../engine/generate';
import { recipeFor, targetWinRate, LAST_SCHEDULED } from '../data/schedule';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { isComplete, startLevel } from '../engine/level';
import { GENERATED_LEVELS } from '../data/generated';
import { LEVELS } from '../data/levels';
import { measureDifficulty } from '../bot/bot';
import { makeRng } from '../engine/rng';
import { elementById } from '../data/elements';

/**
 * 생성기는 봇을 수백 번 돌린다. 테스트에서 그대로 하면 한 판에 몇 초씩 걸리므로
 * 재는 판 수와 이동 수 범위를 줄여 쓴다. **여기서 보려는 건 승률의 정확도가
 * 아니라 "구조가 성립하는가"**다 - 목표가 배치에서 나오는지, 같은 시드가 같은
 * 판을 주는지, 맞춘 이동 수가 정말 최소인지.
 */
const FAST = { ...DEFAULT_FIT, runs: 8, minMoves: 3, maxMoves: 20 };

const plain: Recipe = {
  width: 6,
  height: 6,
  colors: 4,
  shape: 'full',
  elements: [],
  colorGoal: 12,
};

describe('배치', () => {
  it('판 모양 밖은 구멍이 된다', () => {
    const g = generateLevel(1, { ...plain, shape: 'diamond' }, makeRng(1), FAST);
    const board = parseBoard(g!.level.layout);

    expect(at(board, 0, 0).exists).toBe(false);
    expect(at(board, 3, 3).exists).toBe(true);
  });

  it('그릇은 맨 아랫줄에 놓이고 같은 열 맨 위에 관이 붙는다', () => {
    // 관이 없으면 흘러들 게 없어서 영영 못 채운다 - 시작부터 못 깨는 판이 된다.
    const g = generateLevel(
      1,
      { ...plain, height: 7, elements: [{ id: 'shelf', count: 2, layers: 1 }] },
      makeRng(3),
      FAST,
    );
    const board = parseBoard(g!.level.layout);

    for (let c = 0; c < board.width; c++) {
      if (!at(board, board.height - 1, c).collector) continue;
      expect(at(board, 0, c).spawner, `${c}열`).not.toBeNull();
    }
  });

  it('내려오는 것은 위쪽에서 출발한다', () => {
    const g = generateLevel(
      1,
      { ...plain, height: 7, elements: [{ id: 'golem', count: 1, layers: 3 }] },
      makeRng(5),
      { ...FAST, target: 0.1, tolerance: 1 },
    );
    const board = parseBoard(g!.level.layout);

    const row = board.cells.findIndex(c => c.blocker?.kind === 'golem');
    expect(Math.floor(row / board.width)).toBeLessThan(3);
  });
});

describe('목표', () => {
  it('심은 것에서 나온다 - 판에 없는 걸 목표로 걸지 않는다', () => {
    const g = generateLevel(
      1,
      { ...plain, elements: [{ id: 'box', count: 3 }] },
      makeRng(7),
      FAST,
    );

    expect(g!.level.goals).toEqual([{ kind: 'blocker', blockerKind: 'box', count: 3 }]);
  });

  it('심을 게 없으면 색 목표가 된다', () => {
    const g = generateLevel(1, plain, makeRng(9), FAST);
    expect(g!.level.goals[0].kind).toBe('color');
  });

  it('젤리는 덮는 목표가 된다 - 없애는 목표가 아니다', () => {
    const g = generateLevel(
      1,
      { ...plain, elements: [{ id: 'jelly', count: 1 }] },
      makeRng(11),
      { ...FAST, target: 0.1, tolerance: 1 },
    );
    expect(g!.level.goals[0].kind).toBe('spread');
  });

  it('요소가 요구하는 훅이 함께 걸린다', () => {
    const g = generateLevel(
      1,
      { ...plain, height: 7, elements: [{ id: 'mushroom', count: 3 }] },
      makeRng(13),
      { ...FAST, target: 0.1, tolerance: 1 },
    );
    // 훅이 빠지면 버섯이 다시 자라지 않아 다른 장애물이 되어 버린다.
    expect(g!.level.turnEnd).toContainEqual({
      kind: 'regrow',
      blockerKind: 'mushroom',
      groundKind: 'soil',
    });
  });
});

describe('이동 횟수 맞추기', () => {
  const base = {
    id: 1,
    layout: `
      . . . . . .
      . . . . . .
      . . . . . .
      . . . . . .
      . . . . . .
      . . . . . .
    `,
    colors: 4,
    moves: 10,
    goals: [{ kind: 'color' as const, color: 0 as const, count: 14 }],
  };

  it('목표 승률에 닿는 가장 적은 수를 고른다', () => {
    const fit = fitMoves(base, { ...FAST, target: 0.6, tolerance: 1 });
    expect(fit).not.toBeNull();

    // 한 수 적으면 목표에 못 닿아야 "가장 적은 수"다.
    const below = measureDifficulty({ ...base, moves: fit!.moves - 1 }, FAST.runs).winRate;
    expect(below).toBeLessThan(0.6);
  });

  it('수를 더 줘도 목표에 못 닿으면 포기한다', () => {
    // 6수로 색 60개는 불가능하다. 배치를 바꿔야지 이동 수로 될 일이 아니다.
    const impossible = { ...base, goals: [{ kind: 'color' as const, color: 0 as const, count: 60 }] };
    expect(fitMoves(impossible, { ...FAST, maxMoves: 6 })).toBeNull();
  });

  it('목표보다 너무 쉬우면 버린다', () => {
    // 최소 수에서 이미 100%면 이동 수로는 더 조일 수 없다.
    const trivial = { ...base, goals: [{ kind: 'color' as const, color: 0 as const, count: 1 }] };
    expect(fitMoves(trivial, { ...FAST, target: 0.3, tolerance: 0.2 })).toBeNull();
  });
});

describe('생성', () => {
  it('같은 시드는 같은 판을 준다', () => {
    const a = generateLevel(5, recipeFor(6), makeRng(42), FAST);
    const b = generateLevel(5, recipeFor(6), makeRng(42), FAST);
    expect(a?.level).toEqual(b?.level);
  });

  it('만들어진 레벨은 그대로 시작된다', () => {
    const g = generateLevel(1, { ...plain, elements: [{ id: 'box', count: 3 }] }, makeRng(17), FAST);
    const state = startLevel(g!.level, makeRng(1));

    expect(state.status).toBe('playing');
    expect(state.movesLeft).toBe(g!.level.moves);
  });
});

describe('진행표', () => {
  it('한 판에 새 요소는 하나만 나온다', () => {
    // 둘이 같이 처음 나오면 무엇이 무엇을 하는지 구분할 수 없다.
    const firstSeen = new Map<string, number>();
    for (let n = 1; n <= LAST_SCHEDULED; n++) {
      const fresh = recipeFor(n)
        .elements.map(e => e.id)
        .filter(id => !firstSeen.has(id));
      expect(new Set(fresh).size, `레벨 ${n}`).toBeLessThanOrEqual(1);
      fresh.forEach(id => firstSeen.set(id, n));
    }
  });

  it('확인된 요소만 쓴다', () => {
    // 추측 위에 난이도를 쌓으면, 그 요소가 고쳐질 때 레벨이 통째로 어긋난다.
    for (let n = 1; n <= LAST_SCHEDULED; n++) {
      recipeFor(n).elements.forEach(e => {
        expect(elementById(e.id)?.verified, `레벨 ${n}의 ${e.id}`).toBe(true);
      });
    }
  });

  it('목표 승률은 내려가되 바닥이 있다', () => {
    expect(targetWinRate(1)).toBeGreaterThan(targetWinRate(30));
    for (let n = 1; n <= LAST_SCHEDULED; n++) {
      expect(targetWinRate(n)).toBeGreaterThanOrEqual(0.3);
      expect(targetWinRate(n)).toBeLessThanOrEqual(0.9);
    }
  });

  it('다섯 판마다 쉬어가는 판이 있다', () => {
    // 계속 어렵기만 하면 그만두게 된다.
    for (let n = 10; n <= 40; n += 5) {
      expect(targetWinRate(n), `레벨 ${n}`).toBeGreaterThan(targetWinRate(n - 1));
    }
  });
});

describe('구워둔 레벨', () => {
  it('진행표가 다루는 번호가 빠짐없이 있다', () => {
    const nums = new Set(GENERATED_LEVELS.map(l => Number(l.label)));
    for (let n = 1; n <= LAST_SCHEDULED; n++) {
      expect(nums.has(n), `레벨 ${n}`).toBe(true);
    }
  });

  it('손으로 만든 레벨과 번호가 안 겹친다', () => {
    const hand = new Set(LEVELS.map(l => l.id));
    GENERATED_LEVELS.forEach(l => expect(hand.has(l.id), `id ${l.id}`).toBe(false));
  });

  it('전부 그대로 시작된다', () => {
    // 구운 뒤에 표기법이나 요소가 바뀌면 여기서 걸린다.
    GENERATED_LEVELS.forEach(l => {
      const state = startLevel(l, makeRng(1));
      expect(state.status, `레벨 ${l.label}`).toBe('playing');
      expect(state.board.cells.some(c => c.gem), `레벨 ${l.label}`).toBe(true);
    });
  });

  it('시작부터 달성돼 있는 목표가 없다', () => {
    GENERATED_LEVELS.forEach(l => {
      const state = startLevel(l, makeRng(1));
      expect(isComplete(state), `레벨 ${l.label}`).toBe(false);
    });
  });

  it('적어둔 승률이 목표 근처다', () => {
    // 크게 벗어난 게 섞여 있으면 진행표를 손봐야 한다는 신호다.
    const off = GENERATED_LEVELS.filter(l => l.winRate < l.target || l.winRate > l.target + 0.2);
    expect(off.map(l => l.label)).toEqual([]);
  });

  it('난이도가 대체로 내려간다', () => {
    // 판마다 오르내리는 건 정상이고(쉬어가는 판이 있다), 앞 열 판과 뒤 열 판을
    // 견주면 뒤가 어려워야 한다.
    const avg = (ls: typeof GENERATED_LEVELS) =>
      ls.reduce((a, l) => a + l.winRate, 0) / ls.length;
    expect(avg(GENERATED_LEVELS.slice(0, 10))).toBeGreaterThan(avg(GENERATED_LEVELS.slice(-10)));
  });
});
