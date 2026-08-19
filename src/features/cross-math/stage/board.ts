import type { CrossMathLevel, GridCell, Operator } from '../utils/generator';

export interface BoardEquation {
  /** 식을 이루는 칸 좌표 키 (연산자·등호 포함) */
  cellKeys: string[];
  /** 숫자 칸 좌표 키 — 앞에서부터 피연산자, 마지막이 결과 */
  numKeys: string[];
  operators: Operator[];
}

/**
 * 격자에서 실제 식을 뽑는다. 앞뒤가 빈 "최대 연속 구간"만 식으로 본다.
 * 3항 식 `a○b○c=d` 는 그 자체로 뒤쪽에 `b○c=d` 모양을 품고 있어서,
 * 부분 구간까지 식으로 세면 정상 퍼즐이 늘 틀린 것으로 나온다.
 */
export function extractEquations(level: CrossMathLevel): BoardEquation[] {
  const at = new Map<string, GridCell>();
  for (const c of level.cells) at.set(`${c.row},${c.col}`, c);
  const out: BoardEquation[] = [];

  const takeRun = (keys: string[]) => {
    const len = keys.length;
    if (len !== 5 && len !== 7) return;
    const equalsAt = len - 2;
    const cells = keys.map(k => at.get(k)!);
    for (let i = 0; i < len; i++) {
      const want = i % 2 === 0 ? 'num' : i === equalsAt ? 'eq' : 'op';
      if (cells[i].type !== want) return;
    }
    out.push({
      cellKeys: keys,
      numKeys: keys.filter((_, i) => i % 2 === 0),
      operators: cells.filter((_, i) => i % 2 === 1 && i !== equalsAt).map(c => c.operator!),
    });
  };

  for (const dir of ['row', 'col'] as const) {
    const lines = dir === 'row' ? level.rows : level.cols;
    const span = dir === 'row' ? level.cols : level.rows;
    for (let line = 0; line < lines; line++) {
      let run: string[] = [];
      for (let i = 0; i <= span; i++) {
        const key = dir === 'row' ? `${line},${i}` : `${i},${line}`;
        if (i < span && at.has(key)) {
          run.push(key);
        } else {
          if (run.length > 0) takeRun(run);
          run = [];
        }
      }
    }
  }
  return out;
}

/** 왼쪽부터 차례로 계산한다. 3항 식의 연산자 두 개는 늘 같은 우선순위 그룹이라 이게 곧 정답이다. */
export function evaluate(values: number[], operators: Operator[]): number | null {
  let acc = values[0];
  for (let i = 0; i < operators.length; i++) {
    const b = values[i + 1];
    const op = operators[i];
    if (op === '+') acc = acc + b;
    else if (op === '-') acc = acc - b;
    else if (op === '×') acc = acc * b;
    else {
      if (b === 0 || acc % b !== 0) return null;
      acc = acc / b;
    }
  }
  return acc;
}

