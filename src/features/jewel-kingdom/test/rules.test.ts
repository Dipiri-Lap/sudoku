import { describe, it, expect } from 'vitest';
import { parseBoard, renderBoard } from '../engine/notation';
import { at } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import { planSpecials } from '../engine/specials';
import { resolveTurn, listMoves, hasAnyMove, type TurnStep } from '../engine/resolve';
import { applyGravity } from '../engine/gravity';
import { makeRng } from '../engine/rng';

const rng = () => makeRng(12345);

/** 한 턴을 돌려 첫 clear 단계만 꺼낸다 - 규칙 검증은 대부분 여기서 끝난다. */
function firstClear(text: string, a: [number, number], b: [number, number]) {
  const board = parseBoard(text);
  const result = resolveTurn(board, { row: a[0], col: a[1] }, { row: b[0], col: b[1] }, rng());
  const clear = result.steps.find(s => s.kind === 'clear') as
    | Extract<TurnStep, { kind: 'clear' }>
    | undefined;
  return { result, clear, board };
}

describe('보드 표기(픽스처)', () => {
  it('적은 대로 읽고 그대로 다시 쓴다', () => {
    const text = 'R  G  B\nR- W  #\nY* B| .';
    expect(renderBoard(parseBoard(text))).toBe(text);
  });

  it('행마다 칸 수가 다르면 에러를 낸다', () => {
    expect(() => parseBoard('R G B\nR G')).toThrow(/칸 수/);
  });
});

describe('매치 판정', () => {
  it('가로 3개를 찾는다', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R R R G
        B G B Y
        Y B Y B
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].shape).toBe('row');
    expect(groups[0].cells).toEqual(['0,0', '0,1', '0,2']);
  });

  it('세로 3개를 찾는다', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R G B
        R Y B
        R B Y
      `),
    );
    expect(groups.map(g => g.shape)).toEqual(['col']);
    expect(groups[0].cells).toEqual(['0,0', '1,0', '2,0']);
  });

  it('2개는 매치가 아니다', () => {
    expect(findMatchGroups(parseBoard('R R G Y'))).toHaveLength(0);
  });

  it('라이트볼은 색이 없으므로 어떤 줄에도 끼지 않는다', () => {
    expect(findMatchGroups(parseBoard('W W W'))).toHaveLength(0);
  });

  it('장애물은 줄을 끊는다', () => {
    expect(findMatchGroups(parseBoard('R R # R R'))).toHaveLength(0);
  });
});

describe('아이템 생성 규칙', () => {
  // SPEC 3.1~3.2: 로켓 방향은 매치 방향과 수직이다.
  // 가로로 맞췄으면 세로 로켓이 나온다. 직관과 반대이므로 주의.
  it('가로 4매치 -> 세로 로켓', () => {
    const groups = findMatchGroups(parseBoard('R R R R G'));
    expect(planSpecials(groups)).toEqual([{ key: '0,2', kind: 'rocket-v' }]);
  });

  it('세로 4매치 -> 가로 로켓', () => {
    const groups = findMatchGroups(parseBoard('R\nR\nR\nR\nG'));
    expect(planSpecials(groups).map(s => s.kind)).toEqual(['rocket-h']);
  });

  it('일자 5매치 -> 라이트볼', () => {
    const groups = findMatchGroups(parseBoard('R R R R R'));
    expect(planSpecials(groups).map(s => s.kind)).toEqual(['lightball']);
  });

  it('L자(가로x세로 교차) -> TNT', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R R R
        R G B
        R B G
      `),
    );
    expect(planSpecials(groups)).toEqual([{ key: '0,0', kind: 'tnt' }]);
  });

  it('3매치는 아이템이 생기지 않는다', () => {
    expect(planSpecials(findMatchGroups(parseBoard('R R R G')))).toEqual([]);
  });

  it('플레이어가 움직인 칸이 매치에 포함되면 거기에 생긴다', () => {
    const groups = findMatchGroups(parseBoard('R R R R G'));
    expect(planSpecials(groups, [{ row: 0, col: 0 }])[0].key).toBe('0,0');
  });
});

describe('아이템 발동', () => {
  it('가로 로켓은 그 행 전체를 터뜨린다', () => {
    const { clear } = firstClear(
      `
        G  B Y G B
        B  Y G B Y
        R- G B Y G
        Y  B G Y B
      `,
      [2, 0],
      [2, 1],
    );
    expect(clear!.cells).toEqual(['2,0', '2,1', '2,2', '2,3', '2,4']);
    expect(clear!.blasts.map(b => b.kind)).toEqual(['rocket-h']);
  });

  // SPEC 4.2: TNT는 반경 2 = 5x5 = 25칸.
  // 7x7 판을 쓰는 이유: 작은 판에서는 반경 2가 판 전체를 덮어버려서
  // "반경이 맞는가"를 확인할 수 없다.
  it('TNT는 반경 2(5x5)를 터뜨린다', () => {
    const { clear } = firstClear(
      `
        R G  B Y  R G B
        B Y  R G  B Y R
        R G  B Y  R G B
        B Y  R G* B Y R
        R G  B Y  R G B
        B Y  R G  B Y R
        R G  B Y  R G B
      `,
      [3, 3],
      [3, 4],
    );
    const expected: string[] = [];
    for (let r = 1; r <= 5; r++) for (let c = 2; c <= 6; c++) expected.push(`${r},${c}`);
    expect(clear!.cells).toEqual(expected.sort());
    expect(clear!.cells).toHaveLength(25);
  });

  it('폭발 범위는 판 가장자리에서 잘린다', () => {
    const { clear } = firstClear(
      `
        R* G B Y R
        B  Y R G B
        R  G B Y R
        B  Y R G B
      `,
      [0, 0],
      [0, 1],
    );
    // TNT가 (0,1)로 옮겨간 뒤 반경 2 -> 행 0~2, 열 0~3 (판 밖은 버린다)
    const expected: string[] = [];
    for (let r = 0; r <= 2; r++) for (let c = 0; c <= 3; c++) expected.push(`${r},${c}`);
    expect(clear!.cells).toEqual(expected.sort());
  });

  it('로켓이 다른 로켓을 물면 연쇄로 발동한다', () => {
    const { clear } = firstClear(
      `
        G  B Y  G B
        B  Y G  B Y
        R- G B| Y G
        Y  B G  Y B
      `,
      [2, 0],
      [2, 1],
    );
    expect(clear!.blasts.map(b => b.kind).sort()).toEqual(['rocket-h', 'rocket-v']);
    expect(clear!.cells).toContain('0,2');
    expect(clear!.cells).toContain('3,2');
  });

  it('라이트볼은 스왑한 상대 색을 전부 터뜨린다', () => {
    const { clear } = firstClear(
      `
        G B Y G B
        B Y G B Y
        W G B Y G
        Y B G Y B
      `,
      [2, 0],
      [2, 1],
    );
    const cleared = new Set(clear!.cells);
    expect(cleared.has('0,0')).toBe(true);
    expect(cleared.has('0,3')).toBe(true);
    expect(cleared.has('1,2')).toBe(true);
    expect(clear!.blasts.map(b => b.kind)).toEqual(['lightball']);
  });

  it('이번 판에 새로 생긴 아이템은 이번 판에 터지지 않는다', () => {
    const { clear } = firstClear(
      `
        G R R R R
        B Y G B Y
        Y G B Y G
      `,
      [0, 0],
      [1, 0],
    );
    expect(clear!.spawned).toHaveLength(1);
    expect(clear!.cells).not.toContain(clear!.spawned[0].key);
  });
});

describe('중력', () => {
  it('위 보석이 빈 칸으로 내려앉고 새 보석이 위에서 들어온다', () => {
    const board = parseBoard(`
      R G B
      Y B G
      G Y R
    `);
    const { moves } = applyGravity(board, new Set(['2,0']), rng());
    expect(moves.filter(m => m.col === 0 && !m.spawned)).toHaveLength(2);
    expect(moves.filter(m => m.col === 0 && m.spawned)).toHaveLength(1);
  });

  it('새 보석은 보드 위(음수 행)에서 출발한다', () => {
    const board = parseBoard(`
      R G B
      Y B G
      G Y R
    `);
    const { moves } = applyGravity(board, new Set(['0,0', '1,0', '2,0']), rng());
    const spawns = moves.filter(m => m.spawned).sort((x, y) => x.toRow - y.toRow);
    expect(spawns.map(m => m.fromRow)).toEqual([-3, -2, -1]);
  });

  it('장애물 아래 칸도 대각선으로 흘러들어와 채워진다', () => {
    // 장애물은 위에서 내려오는 길만 막는다. 옆에서 돌아 들어오는 길까지
    // 막으면 그 칸이 영영 비어 있게 되고, 실제로 화면에 구멍으로 보였다.
    const board = parseBoard(`
      R G B
      # B G
      G Y R
    `);
    const { moves, board: after } = applyGravity(board, new Set(['2,0']), rng());
    expect(at(after, 1, 0).blocker).not.toBeNull(); // 장애물은 제자리
    expect(at(after, 2, 0).gem, '장애물 아래가 빈 채로 남았다').not.toBeNull();

    const filler = moves.find(m => m.col === 0 && m.toRow === 2);
    expect(filler!.fromCol).not.toBe(0);
  });

  it('새 보석은 맨 윗줄로만 들어온다 - 장애물 아래에서 솟아나지 않는다', () => {
    const board = parseBoard(`
      R G B
      # B G
      G Y R
    `);
    const { moves } = applyGravity(board, new Set(['2,0']), rng());
    moves.filter(m => m.spawned).forEach(m => {
      expect(at(board, 0, m.col).exists).toBe(true);
    });
  });
});

describe('턴 처리', () => {
  it('매치가 없는 스왑은 되돌아가고 무효 처리된다', () => {
    const board = parseBoard(`
      R G B Y
      G B Y R
      B Y R G
    `);
    const result = resolveTurn(board, { row: 0, col: 0 }, { row: 0, col: 1 }, rng());
    expect(result.valid).toBe(false);
    expect(result.steps.map(s => s.kind)).toEqual(['swap', 'revert']);
    expect(renderBoard(result.board)).toBe(renderBoard(board));
  });

  it('연쇄는 clear와 fall이 번갈아 쌓인다', () => {
    const { result } = firstClear(
      `
        G R R R R
        B Y G B Y
        Y G B Y G
      `,
      [0, 0],
      [1, 0],
    );
    const kinds = result.steps.map(s => s.kind);
    expect(kinds[0]).toBe('swap');
    expect(kinds[1]).toBe('clear');
    expect(kinds[2]).toBe('fall');
    expect(result.valid).toBe(true);
  });

  it('같은 시드는 같은 결과를 낸다', () => {
    const text = `
      G R R R R
      B Y G B Y
      Y G B Y G
    `;
    const a = resolveTurn(parseBoard(text), { row: 0, col: 0 }, { row: 1, col: 0 }, makeRng(7));
    const b = resolveTurn(parseBoard(text), { row: 0, col: 0 }, { row: 1, col: 0 }, makeRng(7));
    expect(renderBoard(a.board)).toBe(renderBoard(b.board));
  });
});

describe('수 찾기', () => {
  it('둘 수 있는 수를 찾는다', () => {
    const board = parseBoard(`
      R R G
      B G B
      Y G Y
    `);
    expect(listMoves(board).length).toBeGreaterThan(0);
    expect(hasAnyMove(board)).toBe(true);
  });

  it('아이템이 있으면 항상 둘 수 있다', () => {
    expect(
      hasAnyMove(
        parseBoard(`
          R G  B
          G R- G
          B G  R
        `),
      ),
    ).toBe(true);
  });
});
