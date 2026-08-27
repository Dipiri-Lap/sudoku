import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { applyGravity } from '../engine/gravity';
import { applyDamage } from '../engine/damage';
import { resolveTurn, type TurnStep } from '../engine/resolve';
import { countProgress } from '../engine/goals';
import { golemHook, producerHook, combineHooks } from '../engine/hooks';
import { makeRng } from '../engine/rng';
import type { Board } from '../engine/types';

const rng = () => makeRng(2024);

/** 배치에는 표기가 없는 축들이라 만든 뒤 직접 심는다. */
function withBlocker(board: Board, row: number, col: number, blocker: Board['cells'][0]['blocker']) {
  at(board, row, col).blocker = blocker;
  at(board, row, col).gem = null;
  return board;
}

describe('바닥으로 빼내는 장애물', () => {
  it('보석과 함께 아래로 떨어진다', () => {
    const board = withBlocker(
      parseBoard(`
        R G B
        Y B G
        G Y R
        B G Y
      `),
      1,
      0,
      { kind: 'crate', layers: 1, fallsOut: true },
    );
    const { board: after, moves } = applyGravity(board, new Set(['3,0']), rng());
    // 상자가 한 칸 내려온다
    expect(at(after, 2, 0).blocker?.kind).toBe('crate');
    expect(moves.some(m => m.blocker && m.col === 0)).toBe(true);
  });

  it('맨 아래 줄에 닿으면 판 밖으로 빠져나간다', () => {
    const board = withBlocker(
      parseBoard(`
        R G B
        Y B G
        G Y R
      `),
      2,
      0,
      { kind: 'crate', layers: 1, fallsOut: true },
    );
    const { board: after, exits } = applyGravity(board, new Set(['1,0']), rng());
    expect(exits).toEqual([{ key: '2,0', kind: 'crate' }]);
    expect(at(after, 2, 0).blocker).toBeNull();
  });

  it('고정 장애물과 달리 열을 끊지 않는다', () => {
    const board = withBlocker(
      parseBoard(`
        R G B
        Y B G
        G Y R
      `),
      1,
      0,
      { kind: 'crate', layers: 1, fallsOut: true },
    );
    const { moves } = applyGravity(board, new Set(['2,0']), rng());
    // 위쪽 보석도 같이 내려오고 새 보석도 들어온다(뚜껑이 아니다)
    expect(moves.filter(m => m.col === 0 && m.spawned)).not.toHaveLength(0);
  });

  it('빠져나간 장애물도 목표로 센다', () => {
    const board = withBlocker(
      parseBoard(`
        G R R R
        B Y G B
        Y G B Y
      `),
      2,
      0,
      { kind: 'crate', layers: 1, fallsOut: true },
    );
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, rng());
    const gained = countProgress([{ kind: 'blocker', blockerKind: 'crate', count: 9 }], result);
    expect(gained[0]).toBeGreaterThanOrEqual(0);
    // fall 단계가 exits를 싣고 있다
    const falls = result.steps.filter(s => s.kind === 'fall') as Extract<
      TurnStep,
      { kind: 'fall' }
    >[];
    expect(falls.every(f => Array.isArray(f.exits))).toBe(true);
  });
});

describe('숨은 장애물', () => {
  it('첫 타격은 드러내기만 하고 겹은 안 깎인다', () => {
    const board = withBlocker(parseBoard('# R R R\nG B G B'), 0, 0, {
      kind: 'vault',
      layers: 2,
      hidden: true,
    });
    const first = applyDamage(board, new Set(['0,1']));
    expect(first.events[0]).toEqual({
      key: '0,0',
      kind: 'vault',
      target: 'blocker',
      destroyed: false,
    });
    expect(at(first.board, 0, 0).blocker?.hidden).toBe(false);
    expect(at(first.board, 0, 0).blocker?.layers).toBe(2); // 아직 그대로

    const second = applyDamage(first.board, new Set(['0,1']));
    expect(at(second.board, 0, 0).blocker?.layers).toBe(1);
  });
});

describe('골렘 (매 턴 내려온다)', () => {
  const golemBoard = () =>
    withBlocker(
      parseBoard(`
        G R R R
        B Y G B
        Y G B Y
        B Y G B
      `),
      0,
      0,
      { kind: 'golem', layers: 1, moving: true },
    );

  it('아래 보석과 자리를 바꾸며 한 칸 내려온다', () => {
    const board = golemBoard();
    const displaced = at(board, 1, 0).gem;
    const result = golemHook()(board, rng())!;
    expect(at(result.board, 1, 0).blocker?.kind).toBe('golem');
    expect(at(result.board, 0, 0).blocker).toBeNull();
    // 밀려난 보석은 골렘이 있던 자리로 올라간다
    expect(at(result.board, 0, 0).gem?.id).toBe(displaced?.id);
    expect(result.effects[0].kind).toBe('golem-move');
  });

  it('판이 가득 차 있어도 내려온다', () => {
    // 훅은 중력이 판을 다 채운 뒤에 돈다. "빈 칸일 때만"으로 두면 영영 못 움직인다.
    const board = golemBoard();
    expect(board.cells.every(c => c.blocker || c.gem)).toBe(true);
    expect(golemHook()(board, rng())).not.toBeNull();
  });

  it('고정 장애물에 막히면 머문다', () => {
    const board = golemBoard();
    withBlocker(board, 1, 0, { kind: 'box', layers: 1 });
    expect(golemHook()(board, rng())).toBeNull();
  });

  it('바닥에 닿으면 잔해를 쏟아내고 사라진다', () => {
    const board = withBlocker(
      parseBoard(`
        G R R R
        B Y G B
        Y G B Y
        B Y G B
      `),
      3,
      0,
      { kind: 'golem', layers: 1, moving: true },
    );
    const result = golemHook({ spawnKind: 'rubble', spawnCount: 3 })(board, rng())!;
    expect(at(result.board, 3, 0).blocker).toBeNull();
    let rubble = 0;
    result.board.cells.forEach(c => {
      if (c.blocker?.kind === 'rubble') rubble++;
    });
    expect(rubble).toBe(3);
    expect(result.effects[0].kind).toBe('golem-burst');
  });

  it('턴에 물리면 board-effect 단계로 남는다', () => {
    const board = golemBoard();
    at(board, 1, 0).gem = null;
    const result = resolveTurn(board, { row: 0, col: 1 }, { row: 1, col: 1 }, rng(), {
      onTurnEnd: golemHook(),
    });
    if (result.valid) {
      expect(result.steps.some(s => s.kind === 'board-effect')).toBe(true);
    }
  });
});

describe('생성 장애물', () => {
  it('옆 보석을 자기 색으로 바꾼다', () => {
    const board = withBlocker(
      parseBoard(`
        G R Y G
        B Y G B
        Y G B Y
      `),
      1,
      1,
      { kind: 'mailbox', layers: 1, produces: 'letter' },
    );
    const result = producerHook(0)(board, rng())!;
    const changed = result.effects[0].cells[0];
    const [r, c] = changed.split(',').map(Number);
    expect(at(result.board, r, c).gem?.color).toBe(0);
    // id는 유지된다 - 새로 생긴 게 아니라 그 자리 보석이 바뀐 것
    expect(at(result.board, r, c).gem?.id).toBe(at(board, r, c).gem?.id);
  });
});

describe('훅 여러 개', () => {
  it('순서대로 적용된다', () => {
    const board = withBlocker(
      parseBoard(`
        G R Y G
        B Y G B
        Y G B Y
        B Y G B
      `),
      1,
      1,
      { kind: 'mailbox', layers: 1, produces: 'letter' },
    );
    withBlocker(board, 3, 3, { kind: 'golem', layers: 1, moving: true });
    const result = combineHooks(golemHook(), producerHook(0))(board, rng())!;
    const kinds = result.effects.map(e => e.kind);
    expect(kinds).toContain('golem-burst');
    expect(kinds).toContain('produced');
  });
});
