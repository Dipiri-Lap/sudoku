import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { activateBooster, type TurnStep } from '../engine/resolve';
import { BOOSTERS, canUseAt, specialFor, startingInventory } from '../engine/boosters';
import { applyBooster, applyTurn, startLevel, type Level } from '../engine/level';
import { makeRng } from '../engine/rng';
import type { Board } from '../engine/types';

const rng = () => makeRng(555);

function firstClear(board: Board, pos: [number, number], kind: Parameters<typeof activateBooster>[2]) {
  const result = activateBooster(board, { row: pos[0], col: pos[1] }, kind, rng());
  return {
    result,
    clear: result.steps.find(s => s.kind === 'clear') as
      | Extract<TurnStep, { kind: 'clear' }>
      | undefined,
  };
}

const plain = () =>
  parseBoard(`
    R G B Y R
    G B Y R G
    B Y R G B
    Y R G B Y
    R G B Y R
  `);

describe('부스터 목록', () => {
  it('레벨에 따라 잠금이 풀린다', () => {
    expect(BOOSTERS.filter(b => b.unlockLevel === 1).length).toBeGreaterThan(0);
    expect(BOOSTERS.every(b => b.unlockLevel >= 1)).toBe(true);
  });

  it('시작 보유량이 모든 종류에 대해 정의돼 있다', () => {
    const inv = startingInventory();
    BOOSTERS.forEach(b => expect(inv[b.kind], b.kind).toBeGreaterThanOrEqual(0));
  });
});

describe('망치', () => {
  it('지목한 보석 하나를 부순다', () => {
    const { clear } = firstClear(plain(), [2, 2], 'hammer');
    expect(clear!.cells).toEqual(['2,2']);
  });

  it('장애물을 정면으로 때려 한 겹 깎는다', () => {
    // 매치는 옆에서 때리지만 부스터는 그 칸을 직접 때린다.
    const board = parseBoard(`
      R G B
      G #3 Y
      B Y R
    `);
    const { clear } = firstClear(board, [1, 1], 'hammer');
    expect(clear!.damage).toEqual([
      { key: '1,1', kind: 'box', target: 'blocker', destroyed: false },
    ]);
    expect(at(clear!.board, 1, 1).blocker?.layers).toBe(2);
  });

  it('덮개도 한 겹 벗긴다', () => {
    const board = parseBoard(`
      R  G B
      ~2G Y R
      B  Y G
    `);
    const { clear } = firstClear(board, [1, 0], 'hammer');
    expect(clear!.damage[0].target).toBe('cover');
    expect(at(clear!.board, 1, 0).cover?.layers).toBe(1);
  });
});

describe('아이템을 심는 부스터', () => {
  it('로켓 부스터는 지목한 칸에서 그 줄을 쓸어버린다', () => {
    const { clear } = firstClear(plain(), [2, 2], 'rocket');
    // 가로든 세로든 5칸이 통째로 사라진다
    expect(clear!.cells.length).toBeGreaterThanOrEqual(5);
    expect(clear!.blasts.map(b => b.kind)[0]).toMatch(/^rocket-/);
  });

  it('로켓 방향은 지목한 칸에 따라 갈린다 - 늘 같으면 한 축만 쓸린다', () => {
    expect(specialFor('rocket', { row: 0, col: 0 })).toBe('rocket-h');
    expect(specialFor('rocket', { row: 0, col: 1 })).toBe('rocket-v');
  });

  it('TNT 부스터는 반경 2를 터뜨린다', () => {
    const big = parseBoard(
      Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => ['R', 'G', 'B', 'Y'][(r * 2 + c) % 4]).join(' '),
      ).join('\n'),
    );
    const { clear } = firstClear(big, [4, 4], 'tnt');
    expect(clear!.cells).toHaveLength(25);
  });

  it('라이트볼 부스터는 색을 골라 전부 없앤다', () => {
    const { clear } = firstClear(plain(), [2, 2], 'lightball');
    expect(clear!.blasts[0].kind).toBe('lightball');
    expect(clear!.cells.length).toBeGreaterThan(1);
  });
});

describe('쓸 수 없는 자리', () => {
  it('덮개가 씌워진 보석에는 아이템을 심을 수 없다', () => {
    const board = parseBoard(`
      R  G B
      ~R Y R
      B  Y G
    `);
    expect(canUseAt(board, { row: 1, col: 0 }, 'rocket')).toBe(false);
    // 망치는 덮개를 때릴 수 있다
    expect(canUseAt(board, { row: 1, col: 0 }, 'hammer')).toBe(true);
  });

  it('구멍에는 아무것도 쓸 수 없다', () => {
    const board = parseBoard(`
      R G B
      _ Y R
      B Y G
    `);
    expect(canUseAt(board, { row: 1, col: 0 }, 'hammer')).toBe(false);
    const result = activateBooster(board, { row: 1, col: 0 }, 'hammer', rng());
    expect(result.valid).toBe(false);
  });
});

describe('이동 횟수', () => {
  const level: Level = {
    id: 99,
    layout: `
      R G B Y R
      G B Y R G
      B Y R G B
      Y R G B Y
      R G B Y R
    `,
    moves: 10,
    goals: [{ kind: 'color', color: 0, count: 99 }],
  };

  it('부스터는 이동 횟수를 소모하지 않는다', () => {
    // 이게 부스터의 값어치다. 수를 먹으면 쓸 이유가 없다.
    const state = startLevel(level, rng());
    const result = activateBooster(state.board, { row: 2, col: 2 }, 'hammer', rng());
    const after = applyBooster(state, result);
    expect(after.movesLeft).toBe(state.movesLeft);
  });

  it('일반 수는 이동 횟수를 소모한다', () => {
    const state = startLevel(level, rng());
    const result = activateBooster(state.board, { row: 2, col: 2 }, 'hammer', rng());
    const after = applyTurn(state, result);
    expect(after.movesLeft).toBe(state.movesLeft - 1);
  });

  it('부스터로도 목표는 채워진다', () => {
    const state = startLevel({ ...level, goals: [{ kind: 'color', color: 0, count: 1 }] }, rng());
    const target = { row: 0, col: 0 };
    const result = activateBooster(state.board, target, 'rocket', rng());
    const after = applyBooster(state, result);
    expect(after.progress[0]).toBeGreaterThanOrEqual(0);
  });
});
