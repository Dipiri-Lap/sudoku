import { describe, it, expect } from 'vitest';
import { parseBoard } from '../engine/notation';
import { findHint } from '../engine/hint';

describe('힌트', () => {
  it('둘 수 있는 수와 함께 맞춰질 칸을 알려준다', () => {
    // (0,2)의 R을 아래로 내리면 1행 R R R
    const board = parseBoard(`
      G B R Y
      R R G B
      Y G B Y
    `);
    const hint = findHint(board)!;
    expect(hint).not.toBeNull();
    expect(new Set(hint.cells)).toEqual(new Set(['1,0', '1,1', '0,2']));
    expect(hint.movers).toEqual([{ pos: { row: 0, col: 2 }, dr: 1, dc: 0 }]);
  });

  it('둘 수가 없으면 null', () => {
    const board = parseBoard(`
      R G B
      G B R
      B R G
    `);
    expect(findHint(board)).toBeNull();
  });
});
