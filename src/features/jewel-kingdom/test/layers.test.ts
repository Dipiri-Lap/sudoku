import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { at, wallBetween } from '../engine/board';
import { applyDamage, damageAt } from '../engine/damage';
import { applyGravity } from '../engine/gravity';
import { hasAnyMove, listMoves, resolveTurn, type TurnStep } from '../engine/resolve';
import { findMatchGroups } from '../engine/match';
import { expandSpecials } from '../engine/specials';
import { canUseAt } from '../engine/boosters';
import { startLevel } from '../engine/level';
import type { Board } from '../engine/types';
import { makeRng } from '../engine/rng';

const rng = () => makeRng(8888);

describe('하단 레이어 (잔디·젤리)', () => {
  it('표기를 읽고 다시 써도 정보가 남는다', () => {
    const once = renderBoard(parseBoard('R^ G^2 B\n~Y .^ R'));
    expect(renderBoard(parseBoard(once))).toBe(once);
    const board = parseBoard(once);
    expect(at(board, 0, 0).ground?.layers).toBe(1);
    expect(at(board, 0, 1).ground?.layers).toBe(2);
    expect(at(board, 0, 2).ground).toBeNull();
    expect(at(board, 1, 1).ground?.layers).toBe(1);
    expect(at(board, 1, 1).gem).toBeNull();
  });

  it('그 칸에서 보석이 터져야 한 겹 벗겨진다', () => {
    const board = parseBoard(`
      R^ R^ R^ G
      B  Y  G  B
    `);
    const result = applyDamage(board, new Set(['0,0', '0,1', '0,2']));
    expect(result.events.filter(e => e.target === 'ground')).toHaveLength(3);
    expect(at(result.board, 0, 0).ground).toBeNull();
  });

  it('옆에서 터뜨리는 걸로는 안 벗겨진다 - 장애물과 다른 점', () => {
    const board = parseBoard(`
      R^ R R R
      B  Y G B
    `);
    // (0,1)~(0,3)만 터진다. (0,0)의 바닥은 그대로여야 한다.
    const result = applyDamage(board, new Set(['0,1', '0,2', '0,3']));
    expect(result.events.some(e => e.key === '0,0')).toBe(false);
    expect(at(result.board, 0, 0).ground?.layers).toBe(1);
  });

  it('덮개가 막아준 칸은 바닥도 안 벗겨진다', () => {
    // 보석이 안 터졌으므로 그 아래도 그대로다.
    const board = parseBoard(`
      ~R^ R R
      B   Y G
    `);
    const result = applyDamage(board, new Set(['0,0', '0,1', '0,2']));
    expect(result.shielded.has('0,0')).toBe(true);
    expect(at(result.board, 0, 0).ground?.layers).toBe(1);
    expect(at(result.board, 0, 0).cover).toBeNull(); // 덮개만 벗겨졌다
  });

  it('여러 겹이면 한 겹씩 벗겨진다', () => {
    const board = parseBoard('R^3 G B');
    const once = applyDamage(board, new Set(['0,0']));
    expect(at(once.board, 0, 0).ground?.layers).toBe(2);
    const twice = applyDamage(once.board, new Set(['0,0']));
    expect(at(twice.board, 0, 0).ground?.layers).toBe(1);
  });

  it('망치는 보석이 없는 바닥도 직접 때린다', () => {
    const board = parseBoard('.^2 G B');
    const hit = damageAt(board, '0,0');
    expect(hit.events[0].target).toBe('ground');
    expect(at(hit.board, 0, 0).ground?.layers).toBe(1);
  });

  it('턴 안에서 clear 단계에 기록된다', () => {
    const board = parseBoard(`
      G  R^ R^ R^
      B  Y  G  B
      Y  G  B  Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, rng());
    const clear = result.steps.find(s => s.kind === 'clear') as Extract<
      TurnStep,
      { kind: 'clear' }
    >;
    expect(clear.damage.filter(e => e.target === 'ground').length).toBeGreaterThan(0);
  });
});

describe('벽 (칸 경계)', () => {
  const walled = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
    `);
    at(board, 1, 2).walls = { left: true }; // (1,1)과 (1,2) 사이
    at(board, 2, 1).walls = { top: true }; // (1,1)과 (2,1) 사이
    return board;
  };

  it('경계를 어느 칸이 들고 있든 양쪽에서 똑같이 보인다', () => {
    const board = walled();
    expect(wallBetween(board, { row: 1, col: 1 }, { row: 1, col: 2 })).toBe(true);
    expect(wallBetween(board, { row: 1, col: 2 }, { row: 1, col: 1 })).toBe(true);
    expect(wallBetween(board, { row: 1, col: 1 }, { row: 2, col: 1 })).toBe(true);
    expect(wallBetween(board, { row: 2, col: 1 }, { row: 1, col: 1 })).toBe(true);
    // 벽이 없는 경계
    expect(wallBetween(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('벽을 사이에 둔 두 칸은 바꿀 수 없다', () => {
    const result = resolveTurn(walled(), { row: 1, col: 1 }, { row: 1, col: 2 }, rng());
    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0); // 스왑 시도조차 안 한다
  });

  it('둘 수 있는 수 목록에도 안 나온다', () => {
    const board = walled();
    const blocked = listMoves(board).some(
      m =>
        (m.a.row === 1 && m.a.col === 1 && m.b.row === 1 && m.b.col === 2) ||
        (m.a.row === 1 && m.a.col === 2 && m.b.row === 1 && m.b.col === 1),
    );
    expect(blocked).toBe(false);
    expect(typeof hasAnyMove(board)).toBe('boolean');
  });

  it('보석이 벽을 통과해 떨어지지 않는다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 2, 0).walls = { top: true }; // (1,0)과 (2,0) 사이
    const { board: after } = applyGravity(board, new Set(['2,0']), rng());
    // 위에서 못 내려오므로 옆에서 대각선으로 흘러온다
    expect(at(after, 2, 0).gem).not.toBeNull();
    expect(at(after, 1, 0).gem).not.toBeNull();
  });

  it('벽 아래 방도 자기 천장에서 새 보석을 받는다', () => {
    // 안 그러면 그 방은 보석을 잃기만 하고 영영 못 채워진다.
    // 장애물은 대각선으로 돌아 들어올 길이 있지만 벽은 그 길까지 막는다.
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    // (2,1)을 위·좌·우로 완전히 가둔다. 아래는 판 끝이다.
    at(board, 2, 1).walls = { top: true, left: true }; // 위쪽과 (2,0)쪽
    at(board, 2, 2).walls = { left: true }; // (2,2)쪽

    const { board: after, moves } = applyGravity(board, new Set(['2,1']), rng());
    expect(at(after, 2, 1).gem, '벽 아래 방이 빈 채로 남았다').not.toBeNull();
    expect(moves.some(m => m.spawned && m.col === 1 && m.toRow === 2)).toBe(true);
  });

  it('장애물 아래에서는 보석이 솟아나지 않는다 - 대각선으로 돌아 들어온다', () => {
    const board = parseBoard(`
      R G B
      # B Y
      B Y R
    `);
    const { moves } = applyGravity(board, new Set(['2,0']), rng());
    const filler = moves.find(m => m.col === 0 && m.toRow === 2);
    expect(filler?.spawned, '상자 밑에서 새 보석이 솟았다').toBe(false);
  });

  it('벽으로 막힌 방을 여러 턴 굴려도 구멍이 안 생긴다', () => {
    const holes = (b: Board) => b.cells.filter(c => c.exists && !c.gem && !c.blocker).length;
    for (let seed = 0; seed < 15; seed++) {
      const rng2 = makeRng(seed);
      let state = startLevel(
        {
          id: 1,
          layout: `
            . . . . . . .
            . . . . . . .
            . . . . . . .
            . . . . . . .
            . . . . . . .
            . . . . . . .
            . . . . . . .
          `,
          moves: 12,
          goals: [{ kind: 'color', color: 0, count: 999 }],
          walls: [
            '0,3|left', '1,3|left', '2,3|left',
            '0,4|left', '1,4|left', '2,4|left',
            '4,2|top', '4,3|top', '4,4|top',
          ],
        },
        rng2,
      );
      for (let i = 0; i < 12; i++) {
        const options = listMoves(state.board);
        if (!options.length) break;
        const result = resolveTurn(state.board, options[0].a, options[0].b, rng2);
        state = { ...state, board: result.board };
        expect(holes(state.board), `시드 ${seed}, ${i + 1}수`).toBe(0);
      }
    }
  });

  it('레벨 정의에서 벽을 지정할 수 있다', () => {
    const state = startLevel(
      {
        id: 1,
        layout: `
          . . . .
          . . . .
          . . . .
          . . . .
        `,
        moves: 10,
        goals: [{ kind: 'color', color: 0, count: 1 }],
        walls: ['1,2|left', '2,1|top'],
      },
      rng(),
    );
    expect(at(state.board, 1, 2).walls?.left).toBe(true);
    expect(at(state.board, 2, 1).walls?.top).toBe(true);
  });
});

describe('방패 (폭발로만 벗겨진다)', () => {
  const shielded = () => {
    const board = parseBoard(`
      #  R R R
      G  B G B
    `);
    at(board, 0, 0).blocker = { kind: 'bastion', layers: 2, shield: 1 };
    return board;
  };

  it('방패가 남아 있으면 일반 매치는 통하지 않는다', () => {
    const result = applyDamage(shielded(), new Set(['0,1']), new Set());
    expect(result.events).toEqual([]);
    expect(at(result.board, 0, 0).blocker?.shield).toBe(1);
  });

  it('폭발은 방패를 한 겹 벗긴다 - 겹은 아직 안 깎인다', () => {
    const result = applyDamage(shielded(), new Set(['0,1']), new Set(['0,1']));
    expect(at(result.board, 0, 0).blocker?.shield).toBe(0);
    expect(at(result.board, 0, 0).blocker?.layers).toBe(2);
  });

  it('방패를 다 벗기면 그때부터 일반 매치가 통한다', () => {
    const first = applyDamage(shielded(), new Set(['0,1']), new Set(['0,1']));
    const second = applyDamage(first.board, new Set(['0,1']), new Set());
    expect(at(second.board, 0, 0).blocker?.layers).toBe(1);
  });
});

describe('분열 (거대 골렘)', () => {
  const giant = () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
    `);
    at(board, 1, 1).gem = null;
    at(board, 1, 1).blocker = {
      kind: 'giant-golem',
      layers: 1,
      moving: true,
      splitsInto: { kind: 'golem', layers: 1, count: 2, moving: true },
    };
    return board;
  };

  it('부서지면 작은 것들로 쪼개진다', () => {
    const result = applyDamage(giant(), new Set(['0,1']));
    let golems = 0;
    result.board.cells.forEach(c => {
      if (c.blocker?.kind === 'golem') golems++;
    });
    expect(golems).toBe(2);
    expect(at(result.board, 1, 1).blocker?.kind).toBe('golem');
  });

  it('쪼개진 것들도 움직이는 성질을 물려받는다', () => {
    const result = applyDamage(giant(), new Set(['0,1']));
    result.board.cells.forEach(c => {
      if (c.blocker?.kind === 'golem') expect(c.blocker.moving).toBe(true);
    });
  });

  it('쪼개진 것들도 피해 기록에 남는다 - 화면이 연출할 수 있어야 한다', () => {
    const result = applyDamage(giant(), new Set(['0,1']));
    expect(result.events.filter(e => e.kind === 'golem').length).toBe(2);
  });
});

describe('수집물 (그릇에 담는 짐)', () => {
  const tubeShelf = () =>
    startLevel(
      {
        id: 1,
        layout: `
          [tube:R]   . [tube:R]
          .          . .
          .          . .
          [shelf:R3] . [shelf:R3]
        `,
        moves: 30,
        colors: 5,
        goals: [{ kind: 'collect', collectKind: 'shelf', count: 3 }],
      },
      makeRng(4),
    );

  it('수집물은 매치에 참여하지 않는다', () => {
    // 같은 색 셋이 세로로 서도 매치가 아니다. 매치가 되면 관이 한 색만
    // 내보내는 순간 무한 연쇄가 된다.
    const board = parseBoard('R R R');
    [0, 1, 2].forEach(c => {
      at(board, 0, c).gem = { ...at(board, 0, c).gem!, inert: true };
    });
    expect(findMatchGroups(board)).toHaveLength(0);
  });

  it('수집물은 집어 옮길 수 없다', () => {
    const board = parseBoard(`
      R G B
      G B Y
      B Y R
    `);
    at(board, 0, 0).gem = { ...at(board, 0, 0).gem!, inert: true };
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 0, col: 1 }, rng());
    expect(result.valid).toBe(false);
    expect(listMoves(board).some(m => m.a.row === 0 && m.a.col === 0)).toBe(false);
  });

  it('그릇 칸에는 평범한 보석이 앉지 않는다', () => {
    // 그릇은 담는 칸이 아니라 받아 삼키는 구멍이다. 보석이 자리를 차지하면
    // 수집물이 영영 못 들어간다.
    const state = tubeShelf();
    expect(at(state.board, 3, 0).gem).toBeNull();
    expect(at(state.board, 3, 0).collector).not.toBeNull();
  });

  it('한 열에 수집물은 하나씩만 흘러든다', () => {
    // 수집물은 스스로 못 없어지므로 계속 쏟으면 열이 짐으로 막힌다.
    let state = tubeShelf();
    const rng2 = makeRng(9);
    for (let i = 0; i < 20; i++) {
      const moves = listMoves(state.board);
      if (!moves.length) break;
      const result = resolveTurn(state.board, moves[0].a, moves[0].b, rng2);
      state = { ...state, board: result.board };
      for (let c = 0; c < state.board.width; c++) {
        let n = 0;
        for (let r = 0; r < state.board.height; r++) if (at(state.board, r, c).gem?.inert) n++;
        expect(n, `${c}열에 수집물이 ${n}개`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('연쇄가 상한에 걸리지 않는다', () => {
    // 관이 한 색만 내보내면 그 열이 계속 매치돼 연쇄가 끝나지 않았다.
    let state = tubeShelf();
    const rng2 = makeRng(11);
    for (let i = 0; i < 20; i++) {
      const moves = listMoves(state.board);
      if (!moves.length) break;
      const result = resolveTurn(state.board, moves[0].a, moves[0].b, rng2);
      const rounds = result.steps.filter(s => s.kind === 'clear').length;
      expect(rounds, `${i + 1}수에서 ${rounds}연쇄`).toBeLessThan(20);
      state = { ...state, board: result.board };
    }
  });
});

describe('수집물은 폭발에 면역이다 (SPEC 6.24)', () => {
  const withCargo = (row: number, col: number) => {
    const board = parseBoard(`
      G  B Y G B
      B  Y G B Y
      R- G B Y G
      Y  B G Y B
    `);
    const cell = at(board, row, col);
    cell.gem = { ...cell.gem!, inert: true };
    return board;
  };

  it('로켓이 지나가도 수집물은 남는다', () => {
    // 없애버리면 그릇까지 보낼 것이 사라져 진행이 날아간다.
    const board = withCargo(2, 3);
    const { cells } = expandSpecials(board, new Set(['2,0']), { rng: makeRng(1) });
    expect(cells.has('2,3'), '수집물이 로켓에 삭제됐다').toBe(false);
    // 같은 줄의 평범한 보석은 정상적으로 터진다 - 길을 내준다
    expect(cells.has('2,1')).toBe(true);
    expect(cells.has('2,4')).toBe(true);
  });

  it('아래 보석은 치워지므로 오히려 길이 열린다', () => {
    const board = withCargo(1, 0);
    const { cells } = expandSpecials(board, new Set(['2,0']), { rng: makeRng(1) });
    expect(cells.has('1,0')).toBe(false); // 수집물은 그대로
    expect(cells.has('2,0')).toBe(true); // 그 아래는 치워진다
  });

  it('부스터로도 못 없앤다', () => {
    const board = withCargo(0, 0);
    expect(canUseAt(board, { row: 0, col: 0 }, 'hammer')).toBe(false);
    expect(canUseAt(board, { row: 0, col: 0 }, 'tnt')).toBe(false);
  });
});
