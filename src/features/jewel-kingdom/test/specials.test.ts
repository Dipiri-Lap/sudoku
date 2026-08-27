import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at, matchColorOf } from '../engine/board';
import { findMatchGroups } from '../engine/match';
import {
  defaultTargetScorer,
  planSpecials,
  propellerDestination,
  expandSpecials,
} from '../engine/specials';
import { activateAt, resolveTurn, type TurnStep } from '../engine/resolve';
import { goalTargetScorer } from '../engine/goals';
import { makeRng } from '../engine/rng';
import type { Board } from '../engine/types';

const rng = () => makeRng(777);

function firstClear(board: Board, a: [number, number], b: [number, number]) {
  const result = resolveTurn(board, { row: a[0], col: a[1] }, { row: b[0], col: b[1] }, rng());
  return result.steps.find(s => s.kind === 'clear') as
    | Extract<TurnStep, { kind: 'clear' }>
    | undefined;
}

describe('2x2 정사각형 매치 (SPEC 2.5)', () => {
  it('네 칸이 정사각형으로 모이면 매치다', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R R G
        R R Y
        B Y G
      `),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].shape).toBe('square');
    expect(groups[0].cells).toEqual(['0,0', '0,1', '1,0', '1,1']);
  });

  it('어긋난 네 칸은 매치가 아니다', () => {
    expect(
      findMatchGroups(
        parseBoard(`
          R R G
          G R R
          B Y G
        `),
      ),
    ).toHaveLength(0);
  });

  it('구멍이나 장애물이 끼면 정사각형이 성립하지 않는다', () => {
    expect(findMatchGroups(parseBoard('R R\n# R'))).toHaveLength(0);
    expect(findMatchGroups(parseBoard('R R\n_ R'))).toHaveLength(0);
  });
});

describe('프로펠러 생성 (SPEC 3.4)', () => {
  it('2x2 정사각형에서 프로펠러가 나온다', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R R G
        R R Y
        B Y G
      `),
    );
    expect(planSpecials(groups).map(s => s.kind)).toEqual(['propeller']);
  });

  it('정사각형은 교차 판정에 끼지 않는다 - TNT가 생기면 안 된다', () => {
    // 2x2가 옆 줄과 겹칠 때마다 TNT가 생기면 아이템이 남발된다.
    const groups = findMatchGroups(
      parseBoard(`
        R R R G
        R R Y B
        B Y G Y
      `),
    );
    const kinds = planSpecials(groups).map(s => s.kind);
    expect(kinds).not.toContain('tnt');
  });

  it('L자는 여전히 TNT다', () => {
    const groups = findMatchGroups(
      parseBoard(`
        R R R
        R G B
        R B G
      `),
    );
    expect(planSpecials(groups).map(s => s.kind)).toEqual(['tnt']);
  });
});

describe('프로펠러 발동 (SPEC 4.4)', () => {
  it('장애물이 많은 칸으로 날아간다', () => {
    const board = parseBoard(`
      . . . . .
      . . . . .
      . . . . .
      . . . # .
      . . . . .
    `);
    // 빈 칸을 보석으로 채우지 않아도 목적지 계산은 gem이 있는 칸만 본다
    const filled = parseBoard(`
      G Y B G Y
      Y B G Y B
      B G Y B G
      G Y B # Y
      Y B G Y B
    `);
    const dest = propellerDestination(filled, { row: 0, col: 0 }, defaultTargetScorer);
    // 장애물 (3,3) 주변이 가장 높은 점수
    expect(Math.abs(dest.row - 3)).toBeLessThanOrEqual(1);
    expect(Math.abs(dest.col - 3)).toBeLessThanOrEqual(1);
    expect(board.width).toBe(5);
  });

  it('목표에 따라 노리는 칸이 달라진다', () => {
    const board = parseBoard(`
      G Y B G Y
      Y B G Y B
      B G Y B G
      G Y B ~R Y
      Y B G Y B
    `);
    // 얼음을 목표로 하면 얼음 쪽, 색을 목표로 하면 그 색이 많은 쪽
    const iceDest = propellerDestination(
      board,
      { row: 0, col: 0 },
      goalTargetScorer([{ kind: 'cover', coverKind: 'roof', count: 1 }]),
    );
    expect(Math.abs(iceDest.row - 3)).toBeLessThanOrEqual(1);
    expect(Math.abs(iceDest.col - 3)).toBeLessThanOrEqual(1);
  });

  it('있던 자리는 십자로, 목적지는 한 칸만 사라진다', () => {
    const board = parseBoard(`
      G Y B  G Y
      Y B G  Y B
      B G R@ B G
      G Y B  G Y
      Y B G  Y B
    `);
    const { cells, blasts } = expandSpecials(board, new Set(['2,2']), {
      targetScorer: () => 0, // 전부 동점 -> 결정적으로 첫 칸
    });
    expect(blasts).toHaveLength(1);
    expect(blasts[0].kind).toBe('propeller');

    // 출발 자리 (2,2)의 십자
    ['2,2', '1,2', '3,2', '2,1', '2,3'].forEach(k => expect(cells.has(k)).toBe(true));
    // 대각선은 안 터진다
    ['1,1', '1,3', '3,1', '3,3'].forEach(k => expect(cells.has(k)).toBe(false));

    // 목적지는 한 칸뿐
    const dest = blasts[0].destination!;
    expect(cells.has(`${dest.row},${dest.col}`)).toBe(true);
    const around = [
      `${dest.row - 1},${dest.col}`,
      `${dest.row + 1},${dest.col}`,
      `${dest.row},${dest.col - 1}`,
      `${dest.row},${dest.col + 1}`,
    ].filter(k => !['2,2', '1,2', '3,2', '2,1', '2,3'].includes(k));
    around.forEach(k => expect(cells.has(k), `목적지 주변 ${k}이 터졌다`).toBe(false));
  });

  it('목표 칸이 없으면 아무 칸으로나 날아간다', () => {
    // 장애물도 목표도 없는 판에서는 모든 칸이 동점이라 무작위로 고른다.
    const board = parseBoard(`
      G Y B  G Y
      Y B G  Y B
      B G R@ B G
      G Y B  G Y
      Y B G  Y B
    `);
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const { blasts } = expandSpecials(board, new Set(['2,2']), { rng: makeRng(seed) });
      const d = blasts[0].destination!;
      seen.add(`${d.row},${d.col}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('아이템은 색 역할을 잃는다 (SPEC 3.11)', () => {
  it('아이템이 된 보석은 색 매치에 참여하지 않는다', () => {
    // P@ = 보라 프로펠러. 옆에 보라 보석 둘이 있어도 3매치가 아니다.
    expect(
      findMatchGroups(
        parseBoard(`
          G  Y B G
          P@ P P Y
          B  G Y B
        `),
      ),
    ).toHaveLength(0);
  });

  it('아이템은 줄을 끊는다', () => {
    // 보라가 다섯이지만 가운데가 아이템이라 양쪽 둘씩으로 갈린다.
    expect(findMatchGroups(parseBoard('P P P@ P P'))).toHaveLength(0);
  });

  it('종류가 달라도 마찬가지다', () => {
    ['P-', 'P|', 'P*', 'P@'].forEach(token => {
      expect(findMatchGroups(parseBoard(`P P ${token}`)), token).toHaveLength(0);
    });
    // 아이템이 아니면 당연히 매치된다
    expect(findMatchGroups(parseBoard('P P P'))).toHaveLength(1);
  });

  it('라이트볼이 노리는 색에도 아이템은 포함되지 않는다', () => {
    const board = parseBoard(`
      W P- P
      P P  P
    `);
    // (0,0)의 라이트볼이 보라(4)를 지목한다
    const { cells } = expandSpecials(board, new Set(['0,0']), { lightballTarget: 4 });
    // (0,1)은 보라 로켓이지만 색 역할이 없으므로 대상이 아니다
    expect(cells.has('0,1')).toBe(false);
    ['0,2', '1,0', '1,1', '1,2'].forEach(k => expect(cells.has(k), k).toBe(true));
  });

  it('그림에는 색이 남는다 - 어느 보석에서 왔는지 읽혀야 한다', () => {
    const board = parseBoard('P@ G B');
    expect(at(board, 0, 0).gem?.color).toBe(4); // 표시용 색은 보라 그대로
    expect(matchColorOf(at(board, 0, 0).gem)).toBeNull(); // 매치용 색은 없다
  });
});

describe('탭으로 발동 (SPEC 4.6)', () => {
  it('아이템을 탭하면 스왑 없이 발동한다', () => {
    const board = parseBoard(`
      G  B Y G B
      B  Y G B Y
      R- G B Y G
      Y  B G Y B
    `);
    const result = activateAt(board, { row: 2, col: 0 }, rng());
    expect(result.valid).toBe(true);
    expect(result.steps.map(s => s.kind)).not.toContain('swap');
    const clear = result.steps.find(s => s.kind === 'clear') as Extract<
      TurnStep,
      { kind: 'clear' }
    >;
    // 가로 로켓이 그 자리에서 2행을 쓸어버린다
    expect(clear.cells).toEqual(['2,0', '2,1', '2,2', '2,3', '2,4']);
  });

  it('평범한 보석을 탭하면 아무 일도 없다', () => {
    const board = parseBoard(`
      G B Y G B
      B Y G B Y
      R G B Y G
    `);
    const result = activateAt(board, { row: 2, col: 0 }, rng());
    expect(result.valid).toBe(false);
    expect(result.steps).toHaveLength(0);
  });

  it('탭한 라이트볼은 색을 무작위로 골라 그 색을 전부 없앤다', () => {
    // 스왑과 달리 지목할 상대가 없다. 아무 색도 안 고르면 자기만 사라지고 마는데,
    // 그러면 라이트볼을 탭한 플레이어 입장에서는 아무 일도 안 일어난 것처럼 보인다.
    const board = parseBoard(`
      G B Y G B
      B Y G B Y
      W G B Y G
    `);
    const result = activateAt(board, { row: 2, col: 0 }, rng());
    const clear = result.steps.find(s => s.kind === 'clear') as Extract<
      TurnStep,
      { kind: 'clear' }
    >;
    expect(clear.cells.length).toBeGreaterThan(1);
    expect(clear.cells).toContain('2,0');
    expect(clear.blasts[0].targetColor).not.toBeNull();
  });

  it('탭할 때마다 고르는 색이 달라질 수 있다', () => {
    const layout = `
      G B Y G B
      B Y G B Y
      W G B Y G
    `;
    const picked = new Set<number | null | undefined>();
    for (let seed = 0; seed < 20; seed++) {
      const result = activateAt(parseBoard(layout), { row: 2, col: 0 }, makeRng(seed));
      const clear = result.steps.find(s => s.kind === 'clear') as Extract<
        TurnStep,
        { kind: 'clear' }
      >;
      picked.add(clear.blasts[0].targetColor);
    }
    expect(picked.size).toBeGreaterThan(1);
  });
});

describe('아이템이 서로 섞여도 규칙이 유지된다', () => {
  it('정사각형과 줄이 겹쳐도 아이템은 겹쳐 생기지 않는다', () => {
    const clear = firstClear(
      parseBoard(`
        Y R R G B
        B R R Y G
        G R Y B Y
        Y B G Y B
      `),
      [2, 1],
      [2, 2],
    );
    if (clear) {
      const keys = clear.spawned.map(s => s.key);
      expect(new Set(keys).size).toBe(keys.length);
      clear.spawned.forEach(s => expect(clear.cells).not.toContain(s.key));
    }
  });
});
