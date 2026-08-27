import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import { hasAnyMove, resolveTurn } from '../engine/resolve';
import { applyTurn, isComplete, startLevel, type Level } from '../engine/level';
import { countOnBoard, countProgress } from '../engine/goals';
import { makeRng } from '../engine/rng';
import { measureDifficulty, playLevel } from '../bot/bot';
import { LEVELS } from '../data/levels';

const level = (over: Partial<Level> = {}): Level => ({
  id: 99,
  layout: `
    . . . . .
    . . . . .
    . . . . .
    . . . . .
    . . . . .
  `,
  moves: 10,
  colors: 4,
  goals: [{ kind: 'color', color: 0, count: 5 }],
  ...over,
});

describe('레벨 시작', () => {
  it('빈 칸이 무작위 보석으로 채워지고 매치는 없다', () => {
    for (let seed = 0; seed < 30; seed++) {
      const state = startLevel(level(), makeRng(seed));
      expect(findMatchGroups(state.board), `시드 ${seed}`).toHaveLength(0);
      expect(hasAnyMove(state.board), `시드 ${seed}`).toBe(true);
    }
  });

  it('배치에 적은 장애물과 구멍은 그대로 남는다', () => {
    const state = startLevel(
      level({
        layout: `
          _ . . . _
          . # . # .
          . . . . .
          . # . # .
          _ . . . _
        `,
      }),
      makeRng(1),
    );
    expect(at(state.board, 0, 0).exists).toBe(false);
    expect(at(state.board, 1, 1).blocker?.kind).toBe('box');
    expect(at(state.board, 2, 2).gem).not.toBeNull();
  });

  it('사용할 색 수를 지키다', () => {
    const state = startLevel(level({ colors: 3 }), makeRng(2));
    const colors = new Set<number>();
    state.board.cells.forEach(c => {
      if (c.gem?.color !== null && c.gem !== null) colors.add(c.gem.color as number);
    });
    expect(Math.max(...colors)).toBeLessThan(3);
  });
});

describe('목표 세기', () => {
  it('없어진 보석의 색을 센다', () => {
    const board = parseBoard(`
      G R R R
      B Y G B
      Y G B Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, makeRng(1));
    // R(0)이 4개 이어져 터진다. 그중 하나는 로켓이 되어 살아남는다.
    const gained = countProgress([{ kind: 'color', color: 0, count: 99 }], result);
    expect(gained[0]).toBe(3);
  });

  it('완전히 부서진 장애물만 센다', () => {
    const board = parseBoard(`
      #2 G G Y B
      R  B R G Y
      B  Y B R G
    `);
    const result = resolveTurn(board, { row: 0, col: 3 }, { row: 1, col: 3 }, makeRng(1));
    // 2겹짜리가 한 겹만 깎였으므로 아직 0
    expect(countProgress([{ kind: 'blocker', blockerKind: 'box', count: 9 }], result)[0]).toBe(0);
  });

  it('벗겨낸 덮개는 겹 단위로 센다', () => {
    const board = parseBoard(`
      G  Y G B
      ~R R Y R
      B  R R G
    `);
    const result = resolveTurn(board, { row: 1, col: 2 }, { row: 2, col: 2 }, makeRng(1));
    expect(countProgress([{ kind: 'cover', coverKind: 'roof', count: 9 }], result)[0]).toBe(1);
  });

  it('보드에 남은 목표 대상 수를 셀 수 있다', () => {
    const board = parseBoard(`
      # . #
      . ~2R .
      # . #
    `);
    expect(countOnBoard(board, { kind: 'blocker', blockerKind: 'box', count: 1 })).toBe(4);
    expect(countOnBoard(board, { kind: 'cover', coverKind: 'roof', count: 1 })).toBe(2);
  });
});

describe('승패 판정', () => {
  it('목표를 다 채우면 수가 남아도 이긴다', () => {
    const lv = level({ moves: 10, goals: [{ kind: 'color', color: 0, count: 1 }] });
    const attempt = playLevel(lv, makeRng(3));
    expect(attempt.won).toBe(true);
    // 한 수만 둬도 채워지는 목표라 수가 남은 채로 끝나야 한다
    expect(attempt.movesUsed).toBeLessThan(lv.moves);
  });

  it('수를 다 썼는데 목표가 안 차면 진다', () => {
    const attempt = playLevel(
      level({ moves: 3, goals: [{ kind: 'color', color: 0, count: 999 }] }),
      makeRng(4),
    );
    expect(attempt.won).toBe(false);
    expect(attempt.movesUsed).toBe(3);
  });

  it('마지막 수로 목표를 채우면 진 게 아니라 이긴 것이다', () => {
    // 승패 판정 순서가 뒤바뀌면 여기서 걸린다.
    const state = startLevel(level({ moves: 1 }), makeRng(5));
    const s2 = applyTurn(
      { ...state, progress: [4] },
      { valid: true, steps: [], board: state.board, clearedCount: 0, maxCombo: 0 },
    );
    // 진행도가 목표에 못 미치면 패배
    expect(s2.status).toBe('lost');

    const s3 = applyTurn(
      { ...state, progress: [5] },
      { valid: true, steps: [], board: state.board, clearedCount: 0, maxCombo: 0 },
    );
    expect(s3.status).toBe('won');
  });

  it('무효한 수는 이동 횟수를 소모하지 않는다', () => {
    const state = startLevel(level(), makeRng(6));
    const next = applyTurn(state, {
      valid: false,
      steps: [],
      board: state.board,
      clearedCount: 0,
      maxCombo: 0,
    });
    expect(next.movesLeft).toBe(state.movesLeft);
    expect(next.status).toBe('playing');
  });

  it('진행도가 목표를 넘어도 완료로 친다', () => {
    const state = startLevel(level(), makeRng(7));
    expect(isComplete({ ...state, progress: [99] })).toBe(true);
  });
});

describe('실제 레벨 - 달성 가능성', () => {
  LEVELS.forEach(lv => {
    it(`레벨 ${lv.id}: 목표가 보드에 실재한다`, () => {
      const state = startLevel(lv, makeRng(1));
      lv.goals.forEach(goal => {
        if (goal.kind === 'color') return; // 색은 리필로 계속 공급된다
        const onBoard = countOnBoard(state.board, goal);
        expect(onBoard, `${goal.kind} 목표치가 판에 있는 양보다 많다`).toBeGreaterThanOrEqual(
          goal.count,
        );
      });
    });
  });
});

/**
 * 난이도 자동 검증 (SPEC 7.7).
 *
 * 레퍼런스 지표는 "클리어까지 걸린 시도 횟수"다 - 쉬움 1~3회, 어려움 20~35회.
 * 봇은 사람보다 잘 두므로 절대값을 그대로 비교할 수는 없지만,
 * **레벨끼리의 상대적 난이도와 회귀**는 이걸로 잡힌다.
 */
describe('난이도 (봇 측정)', () => {
  it('모든 레벨이 봇으로 클리어 가능하다', () => {
    LEVELS.forEach(lv => {
      const report = measureDifficulty(lv, 25);
      expect(report.winRate, `레벨 ${lv.id}이 한 번도 안 깨진다`).toBeGreaterThan(0);
    });
  }, 120_000);

  it('레벨 1은 튜토리얼답게 쉽다', () => {
    const report = measureDifficulty(LEVELS[0], 30);
    expect(report.winRate).toBeGreaterThan(0.7);
  }, 60_000);

  it('수를 줄이면 반드시 어려워진다', () => {
    // 난이도 지표가 실제로 난이도에 반응하는지 확인한다.
    // 여기가 깨지면 측정값 자체를 믿을 수 없다.
    const easy = measureDifficulty({ ...LEVELS[0], moves: 30 }, 30);
    const hard = measureDifficulty({ ...LEVELS[0], moves: 6 }, 30);
    expect(hard.winRate).toBeLessThan(easy.winRate);
  }, 60_000);
});
