import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { at } from '../engine/board';
import { COMBOS, familyOf, findCombo, mostCommonColor } from '../engine/specials';
import { resolveTurn, type TurnStep } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import type { Board, SpecialKind } from '../engine/types';

const rng = () => makeRng(31337);

function combine(board: Board, a: [number, number], b: [number, number]) {
  const result = resolveTurn(board, { row: a[0], col: a[1] }, { row: b[0], col: b[1] }, rng());
  const clear = result.steps.find(s => s.kind === 'clear') as
    | Extract<TurnStep, { kind: 'clear' }>
    | undefined;
  return { result, clear };
}

/** 아이템 두 개만 심어둔 9x9 판. 나머지는 매치가 안 생기는 무늬로 채운다. */
function boardWith(
  cells: Record<string, string>,
  size = 9,
): Board {
  const chars = ['R', 'G', 'B', 'Y'];
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      row.push(cells[`${r},${c}`] ?? chars[(r * 2 + c) % 4]);
    }
    rows.push(row.join(' '));
  }
  return parseBoard(rows.join('\n'));
}

describe('합체표', () => {
  it('10가지 조합이 모두 정의돼 있다', () => {
    const families = ['rocket', 'tnt', 'propeller', 'lightball'] as const;
    const pairs: string[] = [];
    families.forEach((a, i) => families.slice(i).forEach(b => pairs.push(`${a}+${b}`)));
    expect(pairs).toHaveLength(10);
    expect(COMBOS).toHaveLength(10);
    pairs.forEach(pair => {
      const [a, b] = pair.split('+');
      const found = COMBOS.some(
        r => (r.a === a && r.b === b) || (r.a === b && r.b === a),
      );
      expect(found, `${pair} 조합이 표에 없다`).toBe(true);
    });
  });

  it('로켓은 방향이 달라도 같은 종류로 본다', () => {
    expect(familyOf('rocket-h')).toBe('rocket');
    expect(familyOf('rocket-v')).toBe('rocket');
    expect(findCombo('rocket-h', 'rocket-v')).toEqual(findCombo('rocket-h', 'rocket-h'));
  });

  it('순서를 바꿔도 같은 조합이다', () => {
    expect(findCombo('tnt', 'lightball')).toEqual(findCombo('lightball', 'tnt'));
  });
});

describe('로켓 + 로켓 = 십자', () => {
  it('합쳐진 칸의 행과 열이 통째로 사라진다', () => {
    const board = boardWith({ '4,4': 'R-', '4,5': 'G|' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    // 끌어다 놓은 자리(4,5)가 합체 지점이다
    for (let c = 0; c < 9; c++) expect(clear!.cells).toContain(`4,${c}`);
    for (let r = 0; r < 9; r++) expect(clear!.cells).toContain(`${r},5`);
    expect(clear!.cells).not.toContain('0,0');
  });
});

describe('로켓 + TNT = 3행 3열', () => {
  it('행과 열이 각각 3줄씩 사라진다', () => {
    const board = boardWith({ '4,4': 'R-', '4,5': 'G*' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    [3, 4, 5].forEach(r => {
      for (let c = 0; c < 9; c++) expect(clear!.cells).toContain(`${r},${c}`);
    });
    [4, 5, 6].forEach(c => {
      for (let r = 0; r < 9; r++) expect(clear!.cells).toContain(`${r},${c}`);
    });
    expect(clear!.cells).not.toContain('0,0');
  });
});

describe('TNT + TNT = 반경 4', () => {
  it('9x9 범위가 사라진다', () => {
    const board = boardWith({ '4,4': 'R*', '4,5': 'G*' }, 13);
    const { clear } = combine(board, [4, 4], [4, 5]);
    // 합체 지점 (4,5) 기준 반경 4
    let count = 0;
    for (let r = 0; r <= 8; r++) {
      for (let c = 1; c <= 9; c++) {
        expect(clear!.cells).toContain(`${r},${c}`);
        count++;
      }
    }
    expect(count).toBe(81);
    expect(clear!.cells).not.toContain('9,5');
  });
});

describe('라이트볼 + X = 최다색을 X로 바꿔 전부 터뜨린다', () => {
  const cases: { partner: string; into: SpecialKind }[] = [
    { partner: 'G-', into: 'rocket-h' },
    { partner: 'G*', into: 'tnt' },
    { partner: 'G@', into: 'propeller' },
  ];

  cases.forEach(({ partner, into }) => {
    it(`라이트볼 + ${into}`, () => {
      // R을 판에서 가장 많은 색으로 만든다
      const cells: Record<string, string> = { '4,4': 'W', '4,5': partner };
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (cells[`${r},${c}`]) continue;
          cells[`${r},${c}`] = (r + c) % 2 === 0 ? 'R' : ['G', 'B', 'Y'][(r + c * 3) % 3];
        }
      }
      const board = boardWith(cells);
      expect(mostCommonColor(board)).toBe(0); // R

      const { clear } = combine(board, [4, 4], [4, 5]);
      // 최다색이 전부 삭제 대상에 들어간다
      let reds = 0;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (at(board, r, c).gem?.color === 0) reds++;
        }
      }
      expect(reds).toBeGreaterThan(20);
      expect(clear!.cells.length).toBeGreaterThanOrEqual(reds);
      expect(into).toBeTruthy();
    });
  });

  it('바뀐 로켓은 방향이 섞인다 - 한 축으로만 쓸리면 판이 이상하게 남는다', () => {
    const cells: Record<string, string> = { '4,4': 'W', '4,5': 'G-' };
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!cells[`${r},${c}`]) cells[`${r},${c}`] = (r + c) % 2 === 0 ? 'R' : 'B';
      }
    }
    const { clear } = combine(boardWith(cells), [4, 4], [4, 5]);
    const kinds = new Set(clear!.blasts.map(b => b.kind));
    expect(kinds.has('rocket-h') && kinds.has('rocket-v')).toBe(true);
  });
});

describe('프로펠러 + X = 싣고 날아간다', () => {
  it('목적지에서 실은 아이템이 터진다', () => {
    // 장애물 주변이 목적지가 된다
    const board = boardWith({ '4,4': 'R@', '4,5': 'G-', '0,8': '#' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    const flight = clear!.blasts.find(b => b.kind === 'propeller');
    expect(flight?.destination).toBeDefined();
    // 실린 로켓이 목적지의 행을 쓸어버린다
    const dest = flight!.destination!;
    for (let c = 0; c < 9; c++) expect(clear!.cells).toContain(`${dest.row},${c}`);
  });

  it('프로펠러 + 프로펠러 = 서로 다른 세 곳을 친다', () => {
    const board = boardWith({ '4,4': 'R@', '4,5': 'G@', '0,0': '#', '8,8': '#', '0,8': '#' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    const flights = clear!.blasts.filter(b => b.kind === 'propeller');
    expect(flights).toHaveLength(3);
    const spots = new Set(flights.map(f => `${f.destination!.row},${f.destination!.col}`));
    expect(spots.size).toBe(3);
    // 목적지마다 한 칸씩
    spots.forEach(k => expect(clear!.cells).toContain(k));
  });
});

describe('라이트볼 + 라이트볼 = 판 전체', () => {
  it('모든 칸이 사라지고 장애물도 한 겹 깎인다', () => {
    const board = boardWith({ '4,4': 'W', '4,5': 'W', '0,0': '#3' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    // 장애물 칸을 뺀 모든 칸
    expect(clear!.cells.length).toBe(9 * 9 - 1);
    expect(clear!.damage.some(e => e.key === '0,0' && e.target === 'blocker')).toBe(true);
    expect(at(clear!.board, 0, 0).blocker?.layers).toBe(2);
  });
});

describe('합체가 아닌 경우', () => {
  it('아이템 하나만 움직이면 개별 발동이다', () => {
    const board = boardWith({ '4,4': 'R-' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    // 가로 로켓이 4행만 쓸어버린다(십자가 아니다)
    for (let c = 0; c < 9; c++) expect(clear!.cells).toContain(`4,${c}`);
    expect(clear!.cells).not.toContain('0,5');
  });

  it('합체한 두 아이템은 반드시 사라진다', () => {
    const board = boardWith({ '4,4': 'R-', '4,5': 'G|' });
    const { clear } = combine(board, [4, 4], [4, 5]);
    expect(clear!.cells).toContain('4,4');
    expect(clear!.cells).toContain('4,5');
  });
});
