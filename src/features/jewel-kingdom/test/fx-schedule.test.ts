import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { resolveTurn } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { parseKey } from '../engine/board';
import { arrivalMs, FX_TIMING, scheduleClear } from '../ui/fx/schedule';

// 첫 줄 두 칸에 아이템 둘을 두고 스왑한다. 나머지는 매치가 없는 배치.
const board = (a: string, b: string) =>
  parseBoard(`
  ${a} ${b} B Y P O R
  G B Y P O R G
  B Y P O R G B
  Y P O R G B Y
  P O R G B Y P
  O R G B Y P O
  R G B Y P O R`);

function firstClear(a: string, b: string) {
  const result = resolveTurn(board(a, b), { row: 0, col: 0 }, { row: 0, col: 1 }, makeRng(7));
  expect(result.valid).toBe(true);
  const step = result.steps.find(s => s.kind === 'clear');
  if (!step || step.kind !== 'clear') throw new Error('터짐 단계가 없다');
  return step;
}

describe('합체 연출 시각표', () => {
  it('참새가 실어 온 거름포대는 참새가 도착한 뒤에 터지고, 그 전에는 목적지 주변이 사라지지 않는다', () => {
    const step = firstClear('R@', 'G*');
    const s = scheduleClear(step);
    const bird = s.blasts.find(b => b.blast.kind === 'propeller' && b.blast.combo)!;
    const bag = s.blasts.find(b => b.carried)!;
    expect(bird.payload).toBe('tnt');
    expect(bag.blast.kind).toBe('tnt');
    const arrive = bird.start + arrivalMs(bird.blast, bird.blast.destination!);
    expect(bag.start).toBe(arrive);
    // 목적지 바로 옆 칸은 도착 + 예비 동작 뒤에 사라진다
    const d = bird.blast.destination!;
    const nearKey = step.cells.find(k => {
      const { row: r, col: c } = parseKey(k);
      // 출발 자리(0,0)·(0,1) 근처는 참새가 뜨면서 날리는 칸이라 뺀다
      return Math.max(Math.abs(r - d.row), Math.abs(c - d.col)) === 1 && r + c > 2;
    });
    if (nearKey) expect(s.delays.get(nearKey)!).toBeGreaterThanOrEqual(arrive);
  });

  it('참새 떼는 한 마리씩 시차를 두고 떠난다', () => {
    const s = scheduleClear(firstClear('R@', 'G@'));
    const starts = s.blasts.filter(b => b.blast.kind === 'propeller' && b.blast.combo).map(b => b.start);
    expect(starts).toEqual([0, FX_TIMING.swarmGap, FX_TIMING.swarmGap * 2]);
  });
});

describe('합체 폭발 범위의 아이템', () => {
  it('큰 거름포대(포대+포대) 범위의 도토리·삽은 포대가 터진 뒤에 발동한다', () => {
    const board = parseBoard(`
      R G B Y R G B
      G B Y R G B Y
      B Y R@ G B Y R
      Y R G B* Y* R G
      R G B Y| R G B
      G B Y R G B Y
      B Y R G B Y R
    `);
    const res = resolveTurn(board, { row: 3, col: 3 }, { row: 3, col: 4 }, makeRng(1));
    const clear = res.steps.find(s => s.kind === 'clear')!;
    const boom = FX_TIMING.tntCharge + FX_TIMING.tntHitstop;
    scheduleClear(clear)
      .blasts.filter(sb => !sb.blast.combo)
      .forEach(sb => expect(sb.start, `${sb.blast.kind}@${sb.blast.row},${sb.blast.col}`).toBeGreaterThanOrEqual(boom));
  });
});

describe('무지개꽃 변신 합체', () => {
  it('바뀌기 전에는 아무것도 터지거나 사라지지 않는다(판의 다른 아이템 포함)', () => {
    const chars = ['R', 'G', 'B', 'Y', 'P'];
    const g: string[][] = [];
    for (let r = 0; r < 7; r++) {
      const row: string[] = [];
      for (let c = 0; c < 7; c++) row.push(chars[(r * 2 + c) % 5]);
      g.push(row);
    }
    g[3][3] = 'W';
    g[3][4] = 'R@';
    g[0][3] = 'G-';
    g[6][2] = 'B*';
    g[1][1] = 'Y|';
    const board = parseBoard(g.map(r => r.join(' ')).join('\n'));
    const res = resolveTurn(board, { row: 3, col: 3 }, { row: 3, col: 4 }, makeRng(1));
    const clear = res.steps.find(s => s.kind === 'clear')!;
    const sch = scheduleClear(clear);
    const placed = Math.max(...sch.morphAt.values());
    expect(sch.morphAt.size).toBeGreaterThan(0);
    sch.blasts
      .filter(sb => !sb.blast.combo)
      .forEach(sb => expect(sb.start, `${sb.blast.kind}@${sb.blast.row},${sb.blast.col}`).toBeGreaterThan(placed));
    [...sch.delays]
      .filter(([k]) => !sch.morphAt.has(k))
      .forEach(([k, t]) => expect(t, k).toBeGreaterThanOrEqual(placed));
  });
});
