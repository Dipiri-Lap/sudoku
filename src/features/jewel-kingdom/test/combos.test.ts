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
    // 목표물(장애물)을 직접 하나씩 친다. 장애물 칸은 보석 칸이 아니라 피해 목록에 든다.
    expect([...spots].sort()).toEqual(['0,0', '0,8', '8,8']);
    spots.forEach(k => expect(clear!.damage.some(e => e.key === k)).toBe(true));
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

describe('아이템이 생기는 칸의 바닥', () => {
  it('매치로 아이템이 생긴 칸의 잔디도 벗겨진다', () => {
    // 가운데 R을 내려 5개 매치 - 그 자리엔 아이템이 생기지만 잔디는 남으면 안 된다
    // (남으면 아이템 그림에 가려 "목표는 남았는데 판에 잔디가 없는" 상태가 된다)
    const board = parseBoard(`
      G B Y G B
      B Y R B Y
      R^ R^ B^ R^ R^
      Y G Y G B
      G B G Y G
    `);
    const { result } = combine(board, [1, 2], [2, 2]);
    expect(result.valid).toBe(true);
    for (let c = 0; c < 5; c++) expect(at(result.board, 2, c).ground).toBeNull();
  });
});

describe('합체 표시(화면 연출용)', () => {
  it('아이템 둘을 겹치면 스왑 단계는 합체로, 첫 터짐 단계는 합친 두 칸을 알린다', () => {
    const board = boardWith({ '4,3': 'R@', '4,4': 'G-' });
    const { result } = combine(board, [4, 3], [4, 4]);
    const swap = result.steps[0];
    expect(swap.kind).toBe('swap');
    expect(swap.kind === 'swap' && swap.merge).toBe(true);
    const clear = result.steps.find(s => s.kind === 'clear') as Extract<TurnStep, { kind: 'clear' }>;
    expect(clear.merged).toEqual([
      { row: 4, col: 3 },
      { row: 4, col: 4 },
    ]);
  });

  it('보통 스왑은 합체로 표시하지 않는다', () => {
    const board = parseBoard(`
      R G B
      G R G
      B B R
    `);
    const result = resolveTurn(board, { row: 0, col: 1 }, { row: 1, col: 1 }, rng());
    const swap = result.steps[0];
    expect(swap.kind === 'swap' && swap.merge).toBeFalsy();
  });
});

describe('합체한 두 칸은 매치에 끼지 않는다', () => {
  it('도토리+삽을 합쳐도 그 칸 위아래 같은 색 채소가 매치로 지워지지 않는다', () => {
    // 끌어서 바꾸면 G 삽은 (4,3)으로 온다. 그 위아래(3,3)(5,3)도 G로 두면, 아이템을 떼어낸
    // 자리에 색이 남을 경우 세로 G 3매치가 되어 위아래가 같이 지워졌다(그 줄의 아이템까지 터짐)
    const board = boardWith({ '4,3': 'R@', '4,4': 'G-', '3,3': 'G', '5,3': 'G', '3,4': 'B', '5,4': 'Y' });
    const { clear } = combine(board, [4, 3], [4, 4]);
    expect(clear!.cells).not.toContain('3,3');
    expect(clear!.cells).not.toContain('5,3');
  });
});

describe('도토리 합체도 출발 자리 십자를 지운다', () => {
  it('도토리+삽: 합체 아이템이 나오는 칸(놓은 칸)의 상하좌우가 지워진다', () => {
    const board = boardWith({ '4,3': 'R@', '4,4': 'G-' });
    const { clear } = combine(board, [4, 3], [4, 4]);
    ['3,4', '5,4', '4,3', '4,5'].forEach(k => expect(clear!.cells).toContain(k));
  });
});

describe('도토리 합체 도착지', () => {
  it('목표가 없으면 자기 십자·같은 줄을 피해 날아가 그 줄의 다른 아이템을 터뜨리지 않는다', () => {
    // [도토리2 . 도토리1 삽] - 예전엔 도착지가 같은 줄이면 삽이 그 줄을 지우며 도토리2까지 터졌다
    for (let seed = 1; seed <= 30; seed++) {
      const board = boardWith({ '6,2': 'B@', '6,4': 'R@', '6,5': 'G-' });
      const result = resolveTurn(board, { row: 6, col: 4 }, { row: 6, col: 5 }, makeRng(seed));
      const first = result.steps.find(s => s.kind === 'clear') as Extract<TurnStep, { kind: 'clear' }>;
      const fly = first.blasts.find(b => b.kind === 'propeller' && b.destination)!;
      expect(fly.destination!.row, `seed ${seed}`).not.toBe(6);
      expect(first.cells, `seed ${seed}`).not.toContain('6,2');
    }
  });
});

describe('도토리 떼: 겹 많은 장애물 하나뿐이면 몰려가서 깨뜨린다', () => {
  it('세 겹 돌 하나만 있으면 세 마리가 모두 그 돌로 가서 깬다', () => {
    const board = boardWith({ '4,3': 'R@', '4,4': 'G@', '0,0': '[ice:3]' });
    const { result, clear } = combine(board, [4, 3], [4, 4]);
    const dests = clear!.blasts.filter(b => b.kind === 'propeller' && b.destination).map(b => key(b.destination!));
    expect(dests).toEqual(['0,0', '0,0', '0,0']);
    expect(at(result.board, 0, 0).blocker).toBeNull();
  });

  it('두 겹 돌이면 두 마리만 돌로 가고 한 마리는 다른 곳으로', () => {
    const board = boardWith({ '4,3': 'R@', '4,4': 'G@', '0,0': '[ice:2]' });
    const { result, clear } = combine(board, [4, 3], [4, 4]);
    const dests = clear!.blasts.filter(b => b.kind === 'propeller' && b.destination).map(b => key(b.destination!));
    expect(dests.filter(k => k === '0,0')).toHaveLength(2);
    expect(at(result.board, 0, 0).blocker).toBeNull();
  });
});

function key(p: { row: number; col: number }) {
  return `${p.row},${p.col}`;
}

describe('연쇄로 터진 도토리는 이미 지워지는 칸을 노리지 않는다', () => {
  it('도토리+삽이 목표 줄을 지울 때 그 줄의 도토리는 다른 곳으로 날아간다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      // 목표 짚단(0,6) 하나. 합체 도토리가 그쪽으로 가 0번 줄을 삽으로 지우면 (0,2) 도토리가 연쇄로 터진다
      const board = boardWith({ '6,3': 'R@', '6,4': 'G-', '0,6': '[box]', '0,2': 'B@' });
      const result = resolveTurn(board, { row: 6, col: 3 }, { row: 6, col: 4 }, makeRng(seed));
      const clear = result.steps.find(s => s.kind === 'clear') as Extract<TurnStep, { kind: 'clear' }>;
      const chained = clear.blasts.find(b => b.kind === 'propeller' && !b.combo);
      if (!chained) continue; // 이 시드에선 0번 줄로 안 갔다
      const d = chained.destination!;
      // 합체가 지운 칸(0번 줄 등)이나 깨진 짚단을 노리면 안 된다
      const comboCells = new Set(clear.cells);
      const box = result.steps[0].board; // 스왑 직후 판
      expect(d.row, `seed ${seed}`).not.toBe(0);
      expect(at(box, d.row, d.col).blocker?.kind === 'box' && d.row === 0, `seed ${seed}`).toBe(false);
      expect(comboCells.size).toBeGreaterThan(0);
    }
  });
});
