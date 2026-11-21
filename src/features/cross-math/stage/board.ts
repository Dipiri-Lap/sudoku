import type { CrossMathLevel, GridCell, Operator } from '../utils/generator';

export interface BoardEquation {
  /** 식을 이루는 칸 좌표 키 (연산자·등호 포함) */
  cellKeys: string[];
  /** 숫자 칸 좌표 키 — 앞에서부터 피연산자, 마지막이 결과 */
  numKeys: string[];
  /** 연산자 칸 좌표 키 — 기호 관문에서는 이 칸이 비어 있을 수 있다 */
  opKeys: string[];
  /** 정답 연산자. 비어 있는 칸이면 플레이어가 놓은 타일로 판정해야 한다 */
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
      opKeys: keys.filter((_, i) => i % 2 === 1 && i !== equalsAt),
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


// ── 안개 관문 ────────────────────────────────────────────────────────────────
//
// 규칙: 안개 칸은 처음에 가려져 있다. 식이 "완성"되면 그 식과 칸을 공유하는(교차하는)
// 식들의 칸이 모두 드러난다. 완성 = 식의 칸이 모두 보이고, 빈칸이 다 채워져 계산이 맞는 상태.
// 빈칸이 없는 식(주어진 숫자뿐인 식)은 보이는 순간 완성으로 친다.
// 게임 화면·생성기·테스트가 모두 이 함수를 써서 규칙이 어긋나지 않게 한다.

/** 식마다 칸을 공유하는 다른 식의 번호 */
export function crossingEquations(eqs: BoardEquation[]): number[][] {
  const byCell = new Map<string, number[]>();
  eqs.forEach((eq, i) => {
    for (const k of eq.cellKeys) {
      const list = byCell.get(k);
      if (list) list.push(i); else byCell.set(k, [i]);
    }
  });
  return eqs.map((eq, i) => {
    const out = new Set<number>();
    for (const k of eq.cellKeys) for (const j of byCell.get(k)!) if (j !== i) out.add(j);
    return [...out];
  });
}

/**
 * 완성된 식에서 이어진 식으로 안개를 걷어 낸다. 더 걷힐 것이 없을 때까지 반복한다.
 * revealed 는 바꾸지 않고 새 집합을 돌려준다.
 */
export function cascadeFog(
  eqs: BoardEquation[],
  crossing: number[][],
  revealed: Set<string>,
  isComplete: (eq: BoardEquation) => boolean
): Set<string> {
  const out = new Set(revealed);
  const fired = new Set<number>();
  let changed = true;
  while (changed) {
    changed = false;
    eqs.forEach((eq, i) => {
      if (fired.has(i)) return;
      if (!eq.cellKeys.every(k => out.has(k)) || !isComplete(eq)) return;
      fired.add(i);
      for (const j of crossing[i]) {
        for (const k of eqs[j].cellKeys) {
          if (!out.has(k)) { out.add(k); changed = true; }
        }
      }
    });
  }
  return out;
}

/**
 * 안개가 있는 판을 "보이는 칸만으로" 풀 수 있는지 시뮬레이션한다.
 * 보이는 식 중 모르는 칸(숫자·기호 빈칸)이 하나뿐인 식부터 채우고, 완성된 식이 안개를 걷는다.
 *   hiddenAtStart — 판을 열었을 때(빈칸 없는 식으로 걷히는 것까지 반영) 가려진 칸 수
 */
export function simulateFog(level: CrossMathLevel): { solvable: boolean; hiddenAtStart: number; hiddenBlanksAtStart: number } {
  const eqs = extractEquations(level);
  const crossing = crossingEquations(eqs);
  const blank = new Set(level.cells.filter(c => c.isBlank).map(c => `${c.row},${c.col}`));
  const known = new Set<string>();
  const complete = (eq: BoardEquation) => eq.cellKeys.every(k => !blank.has(k) || known.has(k));
  const unknownIn = (eq: BoardEquation) => eq.cellKeys.filter(k => blank.has(k) && !known.has(k));

  let revealed = new Set(level.cells.filter(c => !c.fog).map(c => `${c.row},${c.col}`));
  revealed = cascadeFog(eqs, crossing, revealed, complete);
  const hiddenAtStart = level.cells.length - revealed.size;
  const hiddenBlanksAtStart = [...blank].filter(k => !revealed.has(k)).length;

  let progress = true;
  while (progress) {
    progress = false;
    for (const eq of eqs) {
      if (!eq.cellKeys.every(k => revealed.has(k))) continue;
      const u = unknownIn(eq);
      if (u.length === 1) { known.add(u[0]); progress = true; }
    }
    if (progress) revealed = cascadeFog(eqs, crossing, revealed, complete);
  }
  return { solvable: known.size === blank.size, hiddenAtStart, hiddenBlanksAtStart };
}
