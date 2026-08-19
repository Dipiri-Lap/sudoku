import { describe, it, expect } from 'vitest';
import { extractEquations, evaluate } from './board';
import { decodeLevel } from './codec';
import type { CrossMathLevel, Operator } from '../utils/generator';
import c1 from '../data/stages/stages-001-100.json';
import c10 from '../data/stages/stages-901-1000.json';

describe('식 계산', () => {
  it('왼쪽부터 순서대로 계산한다', () => {
    expect(evaluate([2, 3], ['+'] as Operator[])).toBe(5);
    expect(evaluate([1, 1, 1], ['+', '+'] as Operator[])).toBe(3);
    expect(evaluate([20, 7, 5], ['+', '-'] as Operator[])).toBe(22);
    expect(evaluate([48, 4, 2], ['÷', '×'] as Operator[])).toBe(24);
  });

  it('나누어떨어지지 않거나 0으로 나누면 null', () => {
    expect(evaluate([7, 2], ['÷'] as Operator[])).toBeNull();
    expect(evaluate([7, 0], ['÷'] as Operator[])).toBeNull();
  });
});

/** 정답표대로 채웠을 때 모든 식이 성립하는지 */
function solvesWithAnswers(level: CrossMathLevel): boolean {
  const at = new Map(level.cells.map(c => [`${c.row},${c.col}`, c]));
  return extractEquations(level).every(eq => {
    const v = eq.numKeys.map(k => at.get(k)!.value!);
    return evaluate(v.slice(0, -1), eq.operators) === v[v.length - 1];
  });
}

describe('격자에서 식 추출', () => {
  it('3항 식의 부분 구간을 별개 식으로 세지 않는다', () => {
    // 40 × 5 × 1 = 200 — 뒤쪽 "5 × 1 = 200" 을 식으로 세면 틀린 것으로 잡힌다
    const level: CrossMathLevel = {
      rows: 1, cols: 7,
      cells: [
        { row: 0, col: 0, type: 'num', value: 40 },
        { row: 0, col: 1, type: 'op', operator: '×' },
        { row: 0, col: 2, type: 'num', value: 5 },
        { row: 0, col: 3, type: 'op', operator: '×' },
        { row: 0, col: 4, type: 'num', value: 1 },
        { row: 0, col: 5, type: 'eq' },
        { row: 0, col: 6, type: 'num', value: 200 },
      ],
    };
    const eqs = extractEquations(level);
    expect(eqs).toHaveLength(1);
    expect(eqs[0].numKeys).toHaveLength(4);
    expect(solvesWithAnswers(level)).toBe(true);
  });

  it('사전 생성 스테이지는 정답표대로 채우면 모든 식이 성립한다', () => {
    for (const chunk of [c1, c10]) {
      const bad = chunk.levels
        .map((enc, i) => ({ stage: chunk.from + i, ok: solvesWithAnswers(decodeLevel(enc)) }))
        .filter(r => !r.ok)
        .map(r => r.stage);
      expect(bad).toEqual([]);
    }
  });

  it('추출한 식 개수가 빈칸 개수 이상이다 (풀 수 있는 구조)', () => {
    // 빈칸 하나는 식 하나가 풀어준다. 식이 빈칸보다 적으면 절대 못 푼다.
    for (const chunk of [c1, c10]) {
      const bad = chunk.levels
        .map((enc, i) => {
          const lv = decodeLevel(enc);
          return {
            stage: chunk.from + i,
            eqs: extractEquations(lv).length,
            blanks: lv.cells.filter(c => c.isBlank).length,
          };
        })
        .filter(r => r.eqs < r.blanks);
      expect(bad).toEqual([]);
    }
  });
});
