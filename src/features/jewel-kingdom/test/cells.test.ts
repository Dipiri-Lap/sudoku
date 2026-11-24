import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { at } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import { applyGravity } from '../engine/gravity';
import { applyDamage } from '../engine/damage';
import { resolveTurn, listMoves, type TurnStep } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import type { Board } from '../engine/types';

const rng = () => makeRng(4242);

function clearStep(board: Board, a: [number, number], b: [number, number]) {
  const result = resolveTurn(board, { row: a[0], col: a[1] }, { row: b[0], col: b[1] }, rng());
  return {
    result,
    clear: result.steps.find(s => s.kind === 'clear') as
      | Extract<TurnStep, { kind: 'clear' }>
      | undefined,
  };
}

describe('구멍(판의 일부가 아닌 칸)', () => {
  it('읽고 다시 쓴 결과를 또 읽어도 같다', () => {
    // 공백까지 정확히 단언하면 정렬 규칙을 조금만 손봐도 테스트가 깨진다.
    // 여기서 확인할 건 "표기 -> 보드 -> 표기"가 정보를 잃지 않는가다.
    const once = renderBoard(parseBoard('_ R G\n#3 ~B Y\n~2R . _'));
    expect(renderBoard(parseBoard(once))).toBe(once);

    const board = parseBoard(once);
    expect(at(board, 0, 0).exists).toBe(false);
    expect(at(board, 1, 0).blocker?.layers).toBe(3);
    expect(at(board, 1, 1).cover?.layers).toBe(1);
    expect(at(board, 2, 0).cover?.layers).toBe(2);
    expect(at(board, 2, 0).gem?.color).toBe(0);
  });

  it('구멍은 줄을 끊는다', () => {
    expect(findMatchGroups(parseBoard('R R _ R R'))).toHaveLength(0);
  });

  it('구멍 아래 칸은 옆에서 대각선으로 흘러들어와 채워진다', () => {
    // 구멍이 위를 막고 있어도 그 아래가 비어 있으면 안 된다.
    // 위에서 못 내려오면 대각선으로 돌아 들어온다.
    const board = parseBoard(`
      R G B
      _ B G
      G Y R
    `);
    const { board: after, moves } = applyGravity(board, new Set(['2,0']), rng());
    expect(at(after, 1, 0).exists).toBe(false); // 구멍은 그대로 비어 있고
    expect(at(after, 2, 0).gem, '구멍 아래가 빈 채로 남았다').not.toBeNull();

    // 그 자리를 채운 보석은 옆 열에서 왔다
    const filler = moves.find(m => m.col === 0 && m.toRow === 2);
    expect(filler).toBeDefined();
    expect(filler!.fromCol).not.toBe(0);
  });

  it('구멍이 있는 칸으로는 수를 둘 수 없다', () => {
    const board = parseBoard(`
      R _ G
      B G B
      Y G Y
    `);
    const moves = listMoves(board);
    expect(moves.every(m => at(board, m.a.row, m.a.col).exists)).toBe(true);
    expect(moves.every(m => at(board, m.b.row, m.b.col).exists)).toBe(true);
  });
});

describe('장애물 피해', () => {
  it('인접한 매치가 장애물을 한 겹 깎는다', () => {
    const board = parseBoard(`
      #2 R R R
      G  B G B
      B  G B G
    `);
    const { clear } = clearStep(board, [1, 0], [0, 0] as [number, number]);
    // 위 스왑은 불가능하므로 직접 applyDamage로 확인한다
    expect(clear).toBeUndefined();

    const result = applyDamage(board, new Set(['0,1', '0,2', '0,3']));
    expect(result.events).toEqual([
      { key: '0,0', kind: 'box', target: 'blocker', destroyed: false },
    ]);
    expect(at(result.board, 0, 0).blocker?.layers).toBe(1);
  });

  it('마지막 겹이 깎이면 장애물이 사라진다', () => {
    const board = parseBoard(`
      #  R R R
      G  B G B
    `);
    const result = applyDamage(board, new Set(['0,1']));
    expect(result.events).toEqual([
      { key: '0,0', kind: 'box', target: 'blocker', destroyed: true },
    ]);
    expect(at(result.board, 0, 0).blocker).toBeNull();
  });

  it('한 번의 폭발에서 같은 장애물은 한 겹만 깎인다', () => {
    // 장애물이 터지는 칸 3개에 둘러싸여도 한 겹이다.
    // 이걸 칸마다 세면 로켓 한 방에 8겹짜리가 사라진다.
    const board = parseBoard(`
      G  R  G
      R  #3 R
      G  R  G
    `);
    const result = applyDamage(board, new Set(['0,1', '1,0', '1,2', '2,1']));
    expect(result.events.map(e => e.key)).toEqual(['1,1']);
    expect(at(result.board, 1, 1).blocker?.layers).toBe(2);
  });

  it('대각선으로만 닿은 매치는 장애물을 깎지 못한다', () => {
    const board = parseBoard(`
      R G
      G #
    `);
    const result = applyDamage(board, new Set(['0,0']));
    expect(result.events).toEqual([]);
  });

  it('아이템 전용 장애물은 일반 매치로는 안 깎이고 폭발로만 깎인다', () => {
    const board = parseBoard(`
      #  R R
      G  B G
    `);
    at(board, 0, 0).blocker = { kind: 'steel', layers: 2, powerUpOnly: true };

    const byMatch = applyDamage(board, new Set(['0,1']), new Set());
    expect(byMatch.events).toEqual([]);

    const byBlast = applyDamage(board, new Set(['0,1']), new Set(['0,1']));
    expect(byBlast.events.map(e => e.key)).toEqual(['0,0']);
  });

  it('색 지정 장애물은 그 색 매치로만 깎인다', () => {
    const board = parseBoard(`
      #  R G
      G  B G
    `);
    at(board, 0, 0).blocker = { kind: 'redlock', layers: 1, color: 1 }; // 1 = G

    expect(applyDamage(board, new Set(['0,1'])).events).toEqual([]); // 옆은 R
    expect(applyDamage(board, new Set(['1,0'])).events.map(e => e.key)).toEqual(['0,0']); // 아래는 G
  });
});

describe('덮개', () => {
  it('덮인 보석이 터지면 보석 대신 덮개가 한 겹 벗겨진다', () => {
    const board = parseBoard(`
      ~R R R
      G  B G
    `);
    const result = applyDamage(board, new Set(['0,0', '0,1', '0,2']));
    // (0,0)은 덮개가 막아줘서 삭제 대상에서 빠진다
    expect([...result.shielded]).toEqual(['0,0']);
    expect(at(result.board, 0, 0).cover).toBeNull();
    expect(at(result.board, 0, 0).gem).not.toBeNull();
  });

  it('여러 겹이면 한 겹씩 벗겨진다', () => {
    const board = parseBoard('~3R R R');
    const once = applyDamage(board, new Set(['0,0']));
    expect(at(once.board, 0, 0).cover?.layers).toBe(2);
    const twice = applyDamage(once.board, new Set(['0,0']));
    expect(at(twice.board, 0, 0).cover?.layers).toBe(1);
  });

  it('덮개를 다 벗기면 그 다음부터는 보석이 없어진다', () => {
    const board = parseBoard(`
      ~R R R G
      G  B G B
      B  G B G
    `);
    const first = applyDamage(board, new Set(['0,0', '0,1', '0,2']));
    expect(first.shielded.has('0,0')).toBe(true);

    const second = applyDamage(first.board, new Set(['0,0', '0,1', '0,2']));
    expect(second.shielded.has('0,0')).toBe(false);
  });
});

describe('턴 안에서의 피해 처리', () => {
  it('매치로 옆 장애물이 깎이고 clear 단계에 기록된다', () => {
    const board = parseBoard(`
      #2 G G Y B
      R  B R G Y
      B  Y B R G
    `);
    // (0,3)Y 와 (1,3)G 를 바꾸면 0행에 G 3개가 이어지고,
    // 그 줄이 (0,0) 장애물에 인접한다.
    const { clear } = clearStep(board, [0, 3], [1, 3]);
    expect(clear).toBeDefined();
    expect(clear!.cells).toEqual(['0,1', '0,2', '0,3']);
    expect(clear!.damage.map(e => e.key)).toContain('0,0');
    expect(clear!.damage.every(e => !e.destroyed)).toBe(true);
  });

  it('덮개가 막아준 칸은 clear 단계의 삭제 목록에 들어가지 않는다', () => {
    const board = parseBoard(`
      G  Y G B
      ~R R Y R
      B  R R G
    `);
    // (1,2)Y 와 (2,2)R 을 바꾸면 1행이 R 4개가 되어 덮인 보석 (1,0)까지 포함한다.
    const { clear } = clearStep(board, [1, 2], [2, 2]);
    expect(clear).toBeDefined();
    // 덮개가 막아준 (1,0)은 삭제 목록에 없고, 대신 damaged에 잡힌다
    expect(clear!.cells).not.toContain('1,0');
    expect(clear!.damage.map(e => e.key)).toContain('1,0');
    expect(clear!.damage.find(e => e.key === '1,0')?.target).toBe('cover');
  });
});

describe('턴 종료 훅', () => {
  it('훅이 보드를 바꾸면 board-effect 단계가 남는다', () => {
    const board = parseBoard(`
      G R R R
      B Y G B
      Y G B Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, rng(), {
      onTurnEnd: b => {
        // 골렘이 한 칸 내려오는 식의 효과를 흉내낸다
        const next = { ...b, cells: b.cells.map(c => ({ ...c })) };
        next.cells[0].blocker = { kind: 'golem', layers: 1 };
        next.cells[0].gem = null;
        return { board: next, effects: [{ kind: 'golem-move', cells: ['0,0'] }] };
      },
    });
    const last = result.steps[result.steps.length - 1];
    expect(last.kind).toBe('board-effect');
    expect(at(result.board, 0, 0).blocker?.kind).toBe('golem');
  });

  it('훅이 없으면 board-effect 단계도 없다', () => {
    const board = parseBoard(`
      G R R R
      B Y G B
      Y G B Y
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 1, col: 0 }, rng());
    expect(result.steps.some(s => s.kind === 'board-effect')).toBe(false);
  });

  it('무효한 수에는 훅이 돌지 않는다', () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
    `);
    let called = false;
    resolveTurn(board, { row: 0, col: 0 }, { row: 0, col: 1 }, rng(), {
      onTurnEnd: b => {
        called = true;
        return { board: b, effects: [] };
      },
    });
    expect(called).toBe(false);
  });
});

describe('낙하 경로', () => {
  // 화면은 이 경로를 그대로 따라간다 - 출발·도착만 이으면 대각선이 처음부터 일어난 것처럼 보인다
  it('막힌 칸은 아래로 내려온 뒤 마지막에 대각선으로 비켜 들어온다', () => {
    const board = parseBoard(`
      R G B
      Y [box] P
      G B Y
    `);
    const { moves } = applyGravity(board, new Set(['2,1']), makeRng(1), 5);
    const diag = moves.find(m => m.col === 1 && m.toRow === 2)!;
    expect(diag.path).toBeDefined();
    const p = diag.path!;
    // 한 걸음씩: 매 걸음 한 줄 내려가고 열은 많아야 한 칸 바뀐다
    for (let i = 1; i < p.length; i++) {
      expect(p[i].row - p[i - 1].row).toBe(1);
      expect(Math.abs(p[i].col - p[i - 1].col)).toBeLessThanOrEqual(1);
    }
    expect(p[p.length - 1]).toEqual({ row: 2, col: 1 });
  });

  it('새 보석은 판 위에서 한 칸씩 줄지어 들어온다(앞 보석을 추월하지 않게)', () => {
    const board = parseBoard(`
      R G B
      Y P B
      G B Y
    `);
    const { moves } = applyGravity(board, new Set(['0,1', '1,1', '2,1']), makeRng(1), 5);
    const spawned = moves.filter(m => m.spawned).sort((a, b) => b.toRow - a.toRow);
    expect(spawned).toHaveLength(3);
    spawned.forEach((m, i) => {
      // 아래에 놓일 것이 판에 가장 가깝게 선다: -1, -2, -3
      expect(m.fromRow).toBe(-1 - i);
      // 출발부터 도착까지 끊김 없이 한 줄씩
      expect(m.path!.length - 1).toBe(m.toRow - m.fromRow);
    });
  });
});

describe('그릇이 다 차면 그 열 투입구는 짐을 그만 내보낸다', () => {
  it('다 찬 그릇 열의 투입구에서는 평범한 보석만 나온다', () => {
    // 그릇(2,0)이 이미 2/2. 맨 윗칸을 비우면 투입구가 새 보석을 넣는데 짐이면 안 된다
    const board = parseBoard(`
      [tube:R] G B
      Y R G
      [shelf:R2] B Y
    `);
    const shelf = at(board, 2, 0).collector!;
    at(board, 2, 0).collector = { ...shelf, got: shelf.need };
    for (let seed = 1; seed <= 10; seed++) {
      const { board: after } = applyGravity(board, new Set(['0,0']), makeRng(seed), 4);
      expect(at(after, 0, 0).gem?.inert ?? false, `seed ${seed}`).toBe(false);
    }
  });
});
