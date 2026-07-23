// Cross Math (숫자 크로스워드) 퍼즐 생성기.
// 격자에 가로/세로 방정식(num op num = num)을 서로 교차시켜 배치하고,
// 교차 구조를 이용해 일부 숫자 칸을 빈칸(플레이어가 채워야 하는 칸)으로 지정한다.

export type Operator = '+' | '-' | '×' | '÷';
export type CellType = 'num' | 'op' | 'eq';

export interface GridCell {
  row: number;
  col: number;
  type: CellType;
  value?: number;
  operator?: Operator;
  isBlank?: boolean;
}

export interface CrossMathLevel {
  rows: number;
  cols: number;
  cells: GridCell[];
}

export type Difficulty =
  | 'lv1' | 'lv2' | 'lv3' | 'lv4' | 'lv5' | 'lv6'
  | 'lv7' | 'lv8' | 'lv9' | 'lv10' | 'lv11' | 'lv12';

export interface DifficultyConfig {
  level: number;
  label: string;
  color: string;
  desc: string;
  gridSize: number; // 목표 격자 크기 (N×N) — 난이도가 오를수록 격자 자체가 커진다
  equationCount: number;
  numberRange: { min: number; max: number };
  factorRange: { min: number; max: number };
  maxResult: number;
  operators: Operator[];
  blankRatio: number;
}

export const DIFFICULTIES: Difficulty[] = [
  'lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8', 'lv9', 'lv10', 'lv11', 'lv12',
];

// 7x7 ~ 12x12, 크기별로 두 단계씩 — 난이도가 오를수록 격자 자체가 한 단계씩 커진다.
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  lv1:  { level: 1,  label: '입문',       color: '#4ade80', desc: '7×7 · 덧셈·뺄셈 기초',   gridSize: 7,  equationCount: 13, numberRange: { min: 1, max: 9 },  factorRange: { min: 2, max: 6 },  maxResult: 18,  operators: ['+', '-'],               blankRatio: 0.35 },
  lv2:  { level: 2,  label: '쉬움',       color: '#34d399', desc: '7×7 · 조금 더 큰 수',    gridSize: 7,  equationCount: 14, numberRange: { min: 1, max: 12 }, factorRange: { min: 2, max: 6 },  maxResult: 24,  operators: ['+', '-'],               blankRatio: 0.38 },
  lv3:  { level: 3,  label: '초급',       color: '#38bdf8', desc: '8×8 · 곱셈 등장',        gridSize: 8,  equationCount: 17, numberRange: { min: 1, max: 15 }, factorRange: { min: 2, max: 9 },  maxResult: 60,  operators: ['+', '-', '×'],          blankRatio: 0.40 },
  lv4:  { level: 4,  label: '초중급',     color: '#60a5fa', desc: '8×8 · 더 큰 수',         gridSize: 8,  equationCount: 18, numberRange: { min: 1, max: 20 }, factorRange: { min: 2, max: 9 },  maxResult: 90,  operators: ['+', '-', '×'],          blankRatio: 0.42 },
  lv5:  { level: 5,  label: '중급',       color: '#818cf8', desc: '9×9 · 나눗셈 등장',      gridSize: 9,  equationCount: 20, numberRange: { min: 1, max: 20 }, factorRange: { min: 2, max: 9 },  maxResult: 100, operators: ['+', '-', '×', '÷'],     blankRatio: 0.45 },
  lv6:  { level: 6,  label: '중상급',     color: '#a78bfa', desc: '9×9 · 연산 종류 확대',   gridSize: 9,  equationCount: 21, numberRange: { min: 1, max: 30 }, factorRange: { min: 2, max: 9 },  maxResult: 130, operators: ['+', '-', '×', '÷'],     blankRatio: 0.47 },
  lv7:  { level: 7,  label: '상급',       color: '#fb923c', desc: '10×10 · 큰 숫자',        gridSize: 10, equationCount: 25, numberRange: { min: 1, max: 40 }, factorRange: { min: 2, max: 12 }, maxResult: 170, operators: ['+', '-', '×', '÷'],     blankRatio: 0.50 },
  lv8:  { level: 8,  label: '고급',       color: '#f87171', desc: '10×10 · 넓은 격자',      gridSize: 10, equationCount: 26, numberRange: { min: 1, max: 50 }, factorRange: { min: 2, max: 12 }, maxResult: 220, operators: ['+', '-', '×', '÷'],     blankRatio: 0.52 },
  lv9:  { level: 9,  label: '전문가',     color: '#e879f9', desc: '11×11 · 고난도 조합',    gridSize: 11, equationCount: 30, numberRange: { min: 1, max: 60 }, factorRange: { min: 2, max: 12 }, maxResult: 270, operators: ['+', '-', '×', '÷'],     blankRatio: 0.55 },
  lv10: { level: 10, label: '마스터',     color: '#f43f5e', desc: '11×11 · 최고 난이도',    gridSize: 11, equationCount: 31, numberRange: { min: 1, max: 80 }, factorRange: { min: 3, max: 12 }, maxResult: 320, operators: ['+', '-', '×', '÷'],     blankRatio: 0.57 },
  lv11: { level: 11, label: '달인',       color: '#c084fc', desc: '12×12 · 초고난도',       gridSize: 12, equationCount: 35, numberRange: { min: 1, max: 99 }, factorRange: { min: 3, max: 12 }, maxResult: 380, operators: ['+', '-', '×', '÷'],     blankRatio: 0.60 },
  lv12: { level: 12, label: '그랜드마스터', color: '#fb7185', desc: '12×12 · 극한 난이도',   gridSize: 12, equationCount: 36, numberRange: { min: 1, max: 99 }, factorRange: { min: 3, max: 12 }, maxResult: 450, operators: ['+', '-', '×', '÷'],     blankRatio: 0.62 },
};

// ── 난수 유틸 ────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 방정식 채우기: a op b = c 를 구성/역산 ────────────────────────────────────
// randomTriple: 셋 다 자유
// solveGivenLeft/Right/Result: 하나(a, b, c)가 이미 정해져 있을 때 나머지 둘을 구함

function randomTriple(op: Operator, cfg: DifficultyConfig): [number, number, number] | null {
  const { numberRange: nr, factorRange: fr, maxResult } = cfg;
  for (let t = 0; t < 30; t++) {
    if (op === '+') {
      const a = randInt(nr.min, nr.max), b = randInt(nr.min, nr.max);
      const c = a + b;
      if (c <= maxResult) return [a, b, c];
    } else if (op === '-') {
      const a = randInt(nr.min, nr.max);
      const b = randInt(0, a);
      return [a, b, a - b];
    } else if (op === '×') {
      const a = randInt(fr.min, fr.max), b = randInt(fr.min, fr.max);
      const c = a * b;
      if (c <= maxResult) return [a, b, c];
    } else {
      const b = randInt(fr.min, fr.max), c = randInt(fr.min, fr.max);
      const a = b * c;
      if (a <= maxResult) return [a, b, c];
    }
  }
  return null;
}

function solveGivenLeft(op: Operator, a: number, cfg: DifficultyConfig): [number, number] | null {
  const { numberRange: nr, factorRange: fr, maxResult } = cfg;
  for (let t = 0; t < 30; t++) {
    if (op === '+') {
      const b = randInt(nr.min, nr.max);
      const c = a + b;
      if (c <= maxResult) return [b, c];
    } else if (op === '-') {
      if (a < 0) return null;
      const b = randInt(0, a);
      return [b, a - b];
    } else if (op === '×') {
      const b = randInt(fr.min, fr.max);
      const c = a * b;
      if (c <= maxResult) return [b, c];
    } else {
      const divisors: number[] = [];
      for (let d = fr.min; d <= Math.min(fr.max, a); d++) if (d > 0 && a % d === 0) divisors.push(d);
      if (divisors.length === 0) return null;
      const b = divisors[randInt(0, divisors.length - 1)];
      return [b, a / b];
    }
  }
  return null;
}

function solveGivenRight(op: Operator, b: number, cfg: DifficultyConfig): [number, number] | null {
  const { numberRange: nr, factorRange: fr, maxResult } = cfg;
  for (let t = 0; t < 30; t++) {
    if (op === '+') {
      const a = randInt(nr.min, nr.max);
      const c = a + b;
      if (c <= maxResult) return [a, c];
    } else if (op === '-') {
      const a = b + randInt(0, Math.max(1, nr.max - nr.min));
      const c = a - b;
      if (a <= maxResult) return [a, c];
    } else if (op === '×') {
      const a = randInt(fr.min, fr.max);
      const c = a * b;
      if (c <= maxResult) return [a, c];
    } else {
      if (b === 0) return null;
      const c = randInt(fr.min, fr.max);
      const a = b * c;
      if (a <= maxResult) return [a, c];
    }
  }
  return null;
}

function solveGivenResult(op: Operator, c: number, cfg: DifficultyConfig): [number, number] | null {
  const { numberRange: nr, factorRange: fr, maxResult } = cfg;
  if (op === '+') {
    if (c < 0) return null;
    const a = randInt(Math.max(nr.min, 0), c);
    return [a, c - a];
  } else if (op === '-') {
    for (let t = 0; t < 30; t++) {
      const b = randInt(nr.min, nr.max);
      const a = c + b;
      if (a <= maxResult) return [a, b];
    }
    return null;
  } else if (op === '×') {
    const divisors: number[] = [];
    for (let d = fr.min; d <= fr.max; d++) {
      if (c % d === 0) {
        const other = c / d;
        if (other >= fr.min && other <= fr.max) divisors.push(d);
      }
    }
    if (divisors.length === 0) return null;
    const a = divisors[randInt(0, divisors.length - 1)];
    return [a, c / a];
  } else {
    if (c <= 0) return null;
    for (let t = 0; t < 30; t++) {
      const b = randInt(fr.min, fr.max);
      const a = b * c;
      if (a <= maxResult) return [a, b];
    }
    return null;
  }
}

function evalOp(a: number, op: Operator, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : NaN;
  }
}

// a op x = c 를 만족하는 x를 역산 (두 값이 이미 고정된 경우, 자유도 없음)
// '÷'일 때 x는 나눗셈의 분모(제수) 위치이므로 0이 되면 안 된다.
function solveGivenLeftForResult(op: Operator, a: number, c: number, cfg: DifficultyConfig): number | null {
  let x: number | null;
  switch (op) {
    case '+': x = c - a; break;
    case '-': x = a - c; break;
    case '×': x = a !== 0 && c % a === 0 ? c / a : null; break;
    case '÷': x = c !== 0 && a % c === 0 ? a / c : null; break;
  }
  if (x === null || !Number.isInteger(x) || x < 0 || x > cfg.maxResult) return null;
  if (op === '÷' && x === 0) return null;
  return x;
}

// x op b = c 를 만족하는 x를 역산
// '÷'일 때 b는 이미 고정된 분모(제수)이므로 0이면 애초에 성립할 수 없다.
function solveGivenRightForResult(op: Operator, b: number, c: number, cfg: DifficultyConfig): number | null {
  if (op === '÷' && b === 0) return null;
  let x: number | null;
  switch (op) {
    case '+': x = c - b; break;
    case '-': x = c + b; break;
    case '×': x = b !== 0 && c % b === 0 ? c / b : null; break;
    case '÷': x = b * c; break;
  }
  if (x === null || !Number.isInteger(x) || x < 0 || x > cfg.maxResult) return null;
  return x;
}

// ── 격자 구조 생성 ────────────────────────────────────────────────────────────
// 5칸짜리 방정식(num,op,num,eq,num)을 첫 칸에 배치한 뒤, 이미 배치된 숫자 칸을
// 교차점(pivot)으로 삼아 반대 방향(가로↔세로) 방정식을 계속 이어 붙인다.

const NUM_SLOTS = [0, 2, 4];

interface OccInfo {
  type: CellType;
  operator?: Operator;
  value?: number;
  isBlank?: boolean;
  hEq?: number;
  vEq?: number;
}

interface PlacedEquation {
  dir: 'row' | 'col';
  cells: [number, number][];
  operator: Operator;
  values: [number, number, number];
  bonusCount: number;
}

function cellsForEquation(dir: 'row' | 'col', startR: number, startC: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    cells.push(dir === 'row' ? [startR, startC + i] : [startR + i, startC]);
  }
  return cells;
}

function buildStructure(cfg: DifficultyConfig): { equations: PlacedEquation[]; occ: Map<string, OccInfo> } | null {
  const occ = new Map<string, OccInfo>();
  const equations: PlacedEquation[] = [];
  const key = (r: number, c: number) => `${r},${c}`;
  // 목표 격자 크기(gridSize)만큼만 딱 들어가도록 좌표 범위를 잡는다. gridSize가 짝수면
  // 대칭 범위로는 정확히 N을 만들 수 없어(2M+1은 항상 홀수) 좌우를 비대칭으로 잡는다.
  const MIN_COORD = -Math.floor((cfg.gridSize - 1) / 2);
  const MAX_COORD = Math.floor(cfg.gridSize / 2);

  let boundMinR = 0, boundMaxR = 0, boundMinC = 0, boundMaxC = 0;

  // growth: 배치 후 경계 상자가 얼마나 넓어지는지(작을수록 촘촘함).
  // deficitAfter: 배치 후에도 목표 gridSize에 얼마나 못 미치는지(0이면 해당 축은 이미 목표 도달).
  function evaluatePlacement(cells: [number, number][]): { growth: number; deficitAfter: number } {
    let minR = boundMinR, maxR = boundMaxR, minC = boundMinC, maxC = boundMaxC;
    for (const [r, c] of cells) {
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
    }
    const before = (boundMaxR - boundMinR) * (boundMaxC - boundMinC);
    const after = (maxR - minR) * (maxC - minC);
    const rowsAfter = maxR - minR + 1;
    const colsAfter = maxC - minC + 1;
    const deficitAfter = Math.max(0, cfg.gridSize - rowsAfter) + Math.max(0, cfg.gridSize - colsAfter);
    return { growth: after - before, deficitAfter };
  }

  // pivot 슬롯 외의 다른 숫자 칸이 우연히 기존의 "빈 방향"이 있는 num 칸과 겹치면
  // 그 칸도 추가 교차점(값이 고정된 제약)으로 활용해 격자를 더 촘촘하게 만든다.
  function findBonusPivots(cells: [number, number][], dir: 'row' | 'col', mainPivotIdx: number | null) {
    const bonuses: { idx: number; value: number }[] = [];
    for (const i of NUM_SLOTS) {
      if (i === mainPivotIdx) continue;
      const [r, c] = cells[i];
      const existing = occ.get(key(r, c));
      if (existing && existing.type === 'num' && existing.value !== undefined) {
        const free = dir === 'row' ? existing.hEq === undefined : existing.vEq === undefined;
        if (free) bonuses.push({ idx: i, value: existing.value });
      }
    }
    return bonuses;
  }

  function tryPlace(
    dir: 'row' | 'col',
    startR: number,
    startC: number,
    pivot: { localIdx: number; value: number } | null
  ): PlacedEquation | null {
    const cells = cellsForEquation(dir, startR, startC);
    for (const [r, c] of cells) {
      if (r < MIN_COORD || r > MAX_COORD || c < MIN_COORD || c > MAX_COORD) return null;
    }
    // 방정식 앞뒤로 최소 한 칸은 비워야 한다. 그렇지 않으면 서로 다른 두 방정식이 같은
    // 직선상에서 바로 이어 붙어, 우연히 유효해 보이지만 실제로는 성립하지 않는
    // "num op num = num" 패턴이 생길 수 있다.
    const [beforeR, beforeC] = dir === 'row' ? [startR, startC - 1] : [startR - 1, startC];
    const [afterR, afterC] = dir === 'row' ? [startR, startC + 5] : [startR + 5, startC];
    if (occ.has(key(beforeR, beforeC)) || occ.has(key(afterR, afterC))) return null;
    const bonusPivots = findBonusPivots(cells, dir, pivot?.localIdx ?? null);
    for (let i = 0; i < 5; i++) {
      const [r, c] = cells[i];
      const existing = occ.get(key(r, c));
      const isPivotSlot = (pivot !== null && i === pivot.localIdx) || bonusPivots.some(b => b.idx === i);
      if (isPivotSlot) {
        if (!existing || existing.type !== 'num') return null;
        if (dir === 'row' && existing.hEq !== undefined) return null;
        if (dir === 'col' && existing.vEq !== undefined) return null;
      } else if (existing) {
        return null;
      }
    }

    const fixed = new Map<number, number>();
    if (pivot) fixed.set(pivot.localIdx, pivot.value);
    for (const b of bonusPivots) fixed.set(b.idx, b.value);

    // 교차점(pivot)이 아닌 칸은 옆 라인(직각 방향)에서 숫자(num) 칸과 맞닿으면 안 된다.
    // 숫자가 관련되면 "연산자가 실제로는 관계없는 옆 숫자와 계산되는 것처럼" 또는
    // "숫자끼리 바로 붙어있는 것처럼" 보여 혼동을 준다. 연산자·등호 칸끼리 맞닿는 건
    // 계산 관계를 암시하지 않으므로 허용한다.
    for (let i = 0; i < 5; i++) {
      if (fixed.has(i)) continue;
      const [r, c] = cells[i];
      const [p1r, p1c] = dir === 'row' ? [r - 1, c] : [r, c - 1];
      const [p2r, p2c] = dir === 'row' ? [r + 1, c] : [r, c + 1];
      if (occ.get(key(p1r, p1c))?.type === 'num' || occ.get(key(p2r, p2c))?.type === 'num') return null;
    }

    for (const operator of shuffle(cfg.operators)) {
      let vals: [number, number, number] | null = null;
      const fixedCount = fixed.size;
      if (fixedCount === 0) {
        vals = randomTriple(operator, cfg);
      } else if (fixedCount === 1) {
        const [idx, value] = [...fixed.entries()][0];
        const slotRole = NUM_SLOTS.indexOf(idx);
        if (slotRole === 0) {
          const r = solveGivenLeft(operator, value, cfg);
          if (r) vals = [value, r[0], r[1]];
        } else if (slotRole === 1) {
          const r = solveGivenRight(operator, value, cfg);
          if (r) vals = [r[0], value, r[1]];
        } else {
          const r = solveGivenResult(operator, value, cfg);
          if (r) vals = [r[0], r[1], value];
        }
      } else {
        // 두 개(또는 세 개) 이미 고정 → 나머지는 계산으로만 결정, 자유도 없음
        const a = fixed.get(0), b = fixed.get(2), c = fixed.get(4);
        if (a !== undefined && b !== undefined) {
          const result = evalOp(a, operator, b);
          if (Number.isInteger(result) && result >= 0 && result <= cfg.maxResult && (c === undefined || c === result)) {
            vals = [a, b, result];
          }
        } else if (a !== undefined && c !== undefined) {
          // a op ? = c
          const inv = solveGivenLeftForResult(operator, a, c, cfg);
          if (inv !== null) vals = [a, inv, c];
        } else if (b !== undefined && c !== undefined) {
          const inv = solveGivenRightForResult(operator, b, c, cfg);
          if (inv !== null) vals = [inv, b, c];
        }
      }
      if (vals) {
        const [va, vb, vc] = vals;
        const valid =
          Number.isInteger(va) && Number.isInteger(vb) && Number.isInteger(vc) &&
          va >= 0 && vb >= 0 && vc >= 0 &&
          va <= cfg.maxResult && vb <= cfg.maxResult && vc <= cfg.maxResult &&
          !(operator === '÷' && vb === 0) &&
          evalOp(va, operator, vb) === vc;
        if (valid) return { dir, cells, operator, values: vals, bonusCount: bonusPivots.length };
      }
    }
    return null;
  }

  function commit(eq: PlacedEquation, idx: number) {
    let ni = 0;
    for (let i = 0; i < 5; i++) {
      const [r, c] = eq.cells[i];
      const k = key(r, c);
      const isNum = i % 2 === 0;
      let info = occ.get(k);
      if (!info) {
        info = { type: isNum ? 'num' : i === 3 ? 'eq' : 'op' };
        occ.set(k, info);
      }
      if (isNum) {
        info.value = eq.values[ni++];
        if (eq.dir === 'row') info.hEq = idx; else info.vEq = idx;
      } else if (i === 3) {
        info.type = 'eq';
      } else {
        info.type = 'op';
        info.operator = eq.operator;
      }
    }
  }

  // 첫 방정식을 원점 중심으로 배치해야, 작은 gridSize(MAXDIM=2)에서도 여유 없이 바로 들어맞는다.
  const first = tryPlace('row', 0, -2, null);
  if (!first) return null;
  commit(first, 0);
  equations.push(first);
  boundMinR = first.cells[0][0]; boundMaxR = first.cells[0][0];
  boundMinC = first.cells[0][1]; boundMaxC = first.cells[4][1];

  let attempts = 0;
  const maxAttempts = cfg.equationCount * 60;
  const CANDIDATES_PER_ATTEMPT = 24;
  // 1순위: 목표 gridSize에 아직 못 미치는 축을 채우는 배치(deficit 감소)를 최우선으로 고른다.
  // 2순위: 보너스 교차(우연한 겹침)가 있는 배치 → 촘촘하게 맞물리게 한다.
  // 3순위: 경계 상자를 가장 적게 넓히는 배치(타이브레이커).
  // gridSize에 도달하기 전까지는 계속 바깥으로 확장하도록 유도하고, 도달한 뒤에는
  // 보너스/밀도 위주로 내부를 채운다.
  const DEFICIT_WEIGHT = 100000;
  const BONUS_WEIGHT = 1000;
  while (equations.length < cfg.equationCount && attempts < maxAttempts) {
    attempts++;
    const allPivots = [...occ.entries()].filter(
      ([, v]) => v.type === 'num' && (v.hEq === undefined || v.vEq === undefined)
    );
    if (allPivots.length === 0) break;

    // 'row' 방향 배치는 열(col)을 확장하고, 'col' 방향 배치는 행(row)을 확장한다.
    // 아직 못 미친 축이 있으면, 그 축을 넓힐 수 있는 방향이 비어있는 pivot만 우선 사용한다.
    const rowDeficit = Math.max(0, cfg.gridSize - (boundMaxR - boundMinR + 1));
    const colDeficit = Math.max(0, cfg.gridSize - (boundMaxC - boundMinC + 1));
    let pivotCandidates = allPivots;
    if (rowDeficit > 0 || colDeficit > 0) {
      const preferred = allPivots.filter(([, v]) =>
        (rowDeficit > 0 && v.vEq === undefined) || (colDeficit > 0 && v.hEq === undefined)
      );
      if (preferred.length > 0) pivotCandidates = preferred;
    }

    let best: { eq: PlacedEquation; score: number } | null = null;
    for (let k = 0; k < CANDIDATES_PER_ATTEMPT; k++) {
      const [pk, pinfo] = pivotCandidates[randInt(0, pivotCandidates.length - 1)];
      const [pr, pc] = pk.split(',').map(Number);
      const newDir: 'row' | 'col' = pinfo.hEq === undefined ? 'row' : 'col';
      const slotLocalIdx = NUM_SLOTS[randInt(0, 2)];
      const startR = newDir === 'row' ? pr : pr - slotLocalIdx;
      const startC = newDir === 'row' ? pc - slotLocalIdx : pc;
      const placed = tryPlace(newDir, startR, startC, { localIdx: slotLocalIdx, value: pinfo.value! });
      if (placed) {
        const { growth, deficitAfter } = evaluatePlacement(placed.cells);
        const score = deficitAfter * DEFICIT_WEIGHT - placed.bonusCount * BONUS_WEIGHT + growth;
        if (!best || score < best.score) best = { eq: placed, score };
      }
    }

    if (best) {
      commit(best.eq, equations.length);
      equations.push(best.eq);
      for (const [r, c] of best.eq.cells) {
        boundMinR = Math.min(boundMinR, r); boundMaxR = Math.max(boundMaxR, r);
        boundMinC = Math.min(boundMinC, c); boundMaxC = Math.max(boundMaxC, c);
      }
    }
  }

  // 방정식 개수가 아니라 실제 도달한 크기로 성공을 판단한다 — equationCount는 상한 예산일
  // 뿐, 촘촘한 배치 규칙 때문에 항상 그 개수를 다 채울 수 있는 건 아니다.
  // 목표 gridSize에 근접(최대 1칸 부족까지 허용)했는지, 그리고 절대 초과하지 않았는지만 확인한다.
  const finalRows = boundMaxR - boundMinR + 1;
  const finalCols = boundMaxC - boundMinC + 1;
  // 작은 격자일수록 촘촘한 안전 규칙(인접 검사) 때문에 목표 크기까지 도달하기 어려우므로
  // 허용 오차를 조금 더 넉넉히 둔다.
  const tolerance = 3;
  if (finalRows < cfg.gridSize - tolerance || finalCols < cfg.gridSize - tolerance) return null;
  if (finalRows > cfg.gridSize || finalCols > cfg.gridSize) return null;

  return { equations, occ };
}

// ── 빈칸 선택: 순전파(propagation)로 유도 가능한 만큼만 빈칸으로 지정 ─────────

function selectBlanks(equations: PlacedEquation[], occ: Map<string, OccInfo>, cfg: DifficultyConfig): Set<string> {
  const numKeys = [...occ.entries()].filter(([, v]) => v.type === 'num').map(([k]) => k);
  const target = Math.max(1, Math.round(numKeys.length * cfg.blankRatio));
  const order = shuffle(numKeys);
  let blanks = new Set<string>();

  const eqKeySets = equations.map(eq => [eq.cells[0], eq.cells[2], eq.cells[4]].map(([r, c]) => `${r},${c}`));

  function isSolvable(candidate: Set<string>): boolean {
    const unknown = new Set(candidate);
    let progress = true;
    while (progress && unknown.size > 0) {
      progress = false;
      for (const keys of eqKeySets) {
        const unknownInEq = keys.filter(k => unknown.has(k));
        if (unknownInEq.length === 1) {
          unknown.delete(unknownInEq[0]);
          progress = true;
        }
      }
    }
    return unknown.size === 0;
  }

  for (const k of order) {
    if (blanks.size >= target) break;
    const trial = new Set(blanks);
    trial.add(k);
    if (isSolvable(trial)) blanks = trial;
  }
  return blanks;
}

// ── 조립 ──────────────────────────────────────────────────────────────────

function occToLevel(occ: Map<string, OccInfo>): CrossMathLevel {
  const coords = [...occ.keys()].map(k => k.split(',').map(Number) as [number, number]);
  const minR = Math.min(...coords.map(c => c[0]));
  const minC = Math.min(...coords.map(c => c[1]));
  const maxR = Math.max(...coords.map(c => c[0]));
  const maxC = Math.max(...coords.map(c => c[1]));
  const cells: GridCell[] = [];
  for (const [k, info] of occ) {
    const [r, c] = k.split(',').map(Number);
    cells.push({
      row: r - minR,
      col: c - minC,
      type: info.type,
      value: info.value,
      operator: info.operator,
      isBlank: info.isBlank,
    });
  }
  return { rows: maxR - minR + 1, cols: maxC - minC + 1, cells };
}

// 완성된 격자를 가로/세로로 스캔해서, 서로 다른 방정식이 우연히 이어 붙어
// "그럴듯하지만 실제로는 성립하지 않는" num-op-num-eq-num 패턴을 만들지 않았는지 검증한다.
// (앞뒤 버퍼 규칙으로 대부분 막지만, 나중에 배치된 방정식이 그 틈을 메우는 드문 경우가 남는다)
function hasPhantomEquation(level: CrossMathLevel): boolean {
  const grid = new Map<string, GridCell>();
  for (const c of level.cells) grid.set(`${c.row},${c.col}`, c);

  function scanLine(getCell: (i: number) => GridCell | undefined, len: number): boolean {
    for (let start = 0; start <= len - 5; start++) {
      const a = getCell(start), op = getCell(start + 1), b = getCell(start + 2);
      const eq = getCell(start + 3), c = getCell(start + 4);
      if (a?.type === 'num' && op?.type === 'op' && b?.type === 'num' && eq?.type === 'eq' && c?.type === 'num') {
        if (evalOp(a.value!, op.operator!, b.value!) !== c.value) return true;
      }
    }
    return false;
  }

  for (let r = 0; r < level.rows; r++) if (scanLine(i => grid.get(`${r},${i}`), level.cols)) return true;
  for (let c = 0; c < level.cols; c++) if (scanLine(i => grid.get(`${i},${c}`), level.rows)) return true;
  return false;
}

// 모든 방정식이 서로 교차(공유 칸)를 통해 하나로 이어져 있는지 검사한다.
// 경계까지 도달하려고 심은 독립적인 '섬' 방정식이 끝까지 아무와도 교차하지 못하고
// 동떨어진 채로 남아있으면 안 된다 — 레퍼런스처럼 전체가 한 덩어리로 맞물려야 한다.
function isFullyConnected(equations: PlacedEquation[]): boolean {
  if (equations.length <= 1) return true;
  const parent = Array.from({ length: equations.length }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  const cellToEqs = new Map<string, number[]>();
  equations.forEach((eq, idx) => {
    for (const [r, c] of eq.cells) {
      const k = `${r},${c}`;
      const list = cellToEqs.get(k);
      if (list) list.push(idx); else cellToEqs.set(k, [idx]);
    }
  });
  for (const idxs of cellToEqs.values()) {
    for (let i = 1; i < idxs.length; i++) union(idxs[0], idxs[i]);
  }
  const root = find(0);
  return equations.every((_, i) => find(i) === root);
}

export function generateLevelForDifficulty(difficulty: Difficulty): CrossMathLevel | null {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  for (let attempt = 0; attempt < 80; attempt++) {
    const structure = buildStructure(cfg);
    if (!structure) continue;
    const { equations, occ } = structure;
    if (!isFullyConnected(equations)) continue;
    const blanks = selectBlanks(equations, occ, cfg);
    if (blanks.size === 0) continue;
    for (const k of blanks) {
      occ.get(k)!.isBlank = true;
    }
    const level = occToLevel(occ);
    if (hasPhantomEquation(level)) continue;
    return level;
  }
  return null;
}
