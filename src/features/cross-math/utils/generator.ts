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
  | 'lv7' | 'lv8' | 'lv9' | 'lv10' | 'lv11' | 'lv12' | 'lv13';

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
  /**
   * 채워야 할 빈칸(정답 타일) 개수. 난이도 1단계마다 1개씩 늘어난다 (lv1=10 … lv12=21).
   * 비율이 아니라 절대 개수인 이유: 격자 밀도에 따라 비율의 결과가 크게 흔들려
   * 같은 난이도인데 빈칸이 3개였다 10개였다 했다.
   */
  blankCount: number;
  /**
   * 3항 식(`a○b○c=d`, 7칸)을 섞는 비율 (0~1). 없으면 0 — 기존 2항 식(5칸)만 생성한다.
   * 3항 식의 연산자 두 개는 항상 같은 우선순위 그룹({+,-} 또는 {×,÷})에서만 고른다.
   * 그래야 왼쪽부터 계산한 값이 곧 수학적 정답이 되어 우선순위 해석의 여지가 없다.
   */
  tripleRatio?: number;
  /**
   * 켜면 빈칸을 "식 단위로 묶어서" 고른다 → 숫자 없이 부호만 남은 식이 많아진다.
   * 정답 개수는 그대로이고 겉모습(빈칸이 어디에 몰리는지)만 달라진다.
   * 25의 배수(관문) 스테이지에 쓴다.
   */
  fullLineBias?: boolean;
}

export const DIFFICULTIES: Difficulty[] = [
  'lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8', 'lv9', 'lv10', 'lv11', 'lv12', 'lv13',
];

// 실제로 만들어지는 격자는 홀수 크기(9×9 / 11×11 / 13×13)뿐이다.
// 식이 항상 짝수 칸씩 뻗어나가 경계 상자의 한 변이 홀수로 고정되기 때문에,
// gridSize 에 10·11 을 줘도 결과는 9×9 가 된다. 그래서 9 / 12 / 13 만 쓴다.
// 각 크기가 담을 수 있는 정답 개수(실측): 9×9 → 10개, 11×11 → 20개, 13×13 → 21개 이상.
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  lv1:  { level: 1,  label: '입문',       color: '#4ade80', desc: '9×9 · 덧셈·뺄셈 기초',   gridSize: 9,  equationCount: 14, numberRange: { min: 1, max: 9 },  factorRange: { min: 2, max: 6 },  maxResult: 18,  operators: ['+', '-'],               blankCount: 10 },
  lv2:  { level: 2,  label: '쉬움',       color: '#34d399', desc: '11×11 · 조금 더 큰 수',    gridSize: 12,  equationCount: 24, numberRange: { min: 1, max: 12 }, factorRange: { min: 2, max: 6 },  maxResult: 24,  operators: ['+', '-'],               blankCount: 11 },
  lv3:  { level: 3,  label: '초급',       color: '#38bdf8', desc: '11×11 · 곱셈 등장',        gridSize: 12,  equationCount: 24, numberRange: { min: 1, max: 15 }, factorRange: { min: 2, max: 9 },  maxResult: 60,  operators: ['+', '-', '×'],          blankCount: 12 },
  lv4:  { level: 4,  label: '초중급',     color: '#60a5fa', desc: '11×11 · 더 큰 수',         gridSize: 12,  equationCount: 24, numberRange: { min: 1, max: 20 }, factorRange: { min: 2, max: 9 },  maxResult: 90,  operators: ['+', '-', '×'],          blankCount: 13 },
  lv5:  { level: 5,  label: '중급',       color: '#818cf8', desc: '11×11 · 나눗셈 등장',      gridSize: 12,  equationCount: 24, numberRange: { min: 1, max: 20 }, factorRange: { min: 2, max: 9 },  maxResult: 100, operators: ['+', '-', '×', '÷'],     blankCount: 14 },
  lv6:  { level: 6,  label: '중상급',     color: '#a78bfa', desc: '11×11 · 연산 종류 확대',   gridSize: 12,  equationCount: 24, numberRange: { min: 1, max: 30 }, factorRange: { min: 2, max: 9 },  maxResult: 130, operators: ['+', '-', '×', '÷'],     blankCount: 15 },
  lv7:  { level: 7,  label: '상급',       color: '#fb923c', desc: '11×11 · 큰 숫자',        gridSize: 12, equationCount: 24, numberRange: { min: 1, max: 40 }, factorRange: { min: 2, max: 12 }, maxResult: 170, operators: ['+', '-', '×', '÷'],     blankCount: 16 },
  lv8:  { level: 8,  label: '고급',       color: '#f87171', desc: '13×13 · 넓은 격자',      gridSize: 13, equationCount: 30, numberRange: { min: 1, max: 50 }, factorRange: { min: 2, max: 12 }, maxResult: 220, operators: ['+', '-', '×', '÷'],     blankCount: 17 },
  lv9:  { level: 9,  label: '전문가',     color: '#e879f9', desc: '13×13 · 고난도 조합',    gridSize: 13, equationCount: 30, numberRange: { min: 1, max: 60 }, factorRange: { min: 2, max: 12 }, maxResult: 270, operators: ['+', '-', '×', '÷'],     blankCount: 18 },
  lv10: { level: 10, label: '마스터',     color: '#f43f5e', desc: '13×13 · 최고 난이도',    gridSize: 13, equationCount: 30, numberRange: { min: 1, max: 80 }, factorRange: { min: 3, max: 12 }, maxResult: 320, operators: ['+', '-', '×', '÷'],     blankCount: 19 },
  lv11: { level: 11, label: '달인',       color: '#c084fc', desc: '13×13 · 초고난도',       gridSize: 13, equationCount: 30, numberRange: { min: 1, max: 99 }, factorRange: { min: 3, max: 12 }, maxResult: 380, operators: ['+', '-', '×', '÷'],     blankCount: 20 },
  lv12: { level: 12, label: '그랜드마스터', color: '#fb7185', desc: '13×13 · 극한 난이도',   gridSize: 13, equationCount: 30, numberRange: { min: 1, max: 99 }, factorRange: { min: 3, max: 12 }, maxResult: 450, operators: ['+', '-', '×', '÷'],     blankCount: 21 },
  lv13: { level: 13, label: '레전드',      color: '#38bdf8', desc: '13×13 · 관문 전용', gridSize: 13, equationCount: 34, numberRange: { min: 1, max: 99 }, factorRange: { min: 3, max: 12 }, maxResult: 520, operators: ['+', '-', '×', '÷'],     blankCount: 22 },
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

/** 2항 식 `a○b=c` 는 5칸, 3항 식 `a○b○c=d` 는 7칸을 차지한다. */
const LEN_PAIR = 5;
const LEN_TRIPLE = 7;

/** 숫자가 놓이는 칸 인덱스 — 항상 짝수 자리 */
function numSlots(len: number): number[] {
  return len === LEN_TRIPLE ? [0, 2, 4, 6] : [0, 2, 4];
}
/** 등호가 놓이는 칸 인덱스 — 항상 끝에서 두 번째 */
function eqSlot(len: number): number {
  return len - 2;
}

const ADDITIVE: Operator[] = ['+', '-'];
const MULTIPLICATIVE: Operator[] = ['×', '÷'];

function isMul(op: Operator): boolean {
  return op === '×' || op === '÷';
}

/**
 * 3항 식에 쓸 연산자 쌍 목록.
 * 같은 우선순위 그룹 안에서만 짝을 짓는다 — `2+3×4` 같은 해석이 갈리는 식은 만들지 않는다.
 */
function operatorPairs(cfg: DifficultyConfig): [Operator, Operator][] {
  const pairs: [Operator, Operator][] = [];
  for (const group of [ADDITIVE, MULTIPLICATIVE]) {
    const usable = group.filter(o => cfg.operators.includes(o));
    for (const a of usable) for (const b of usable) pairs.push([a, b]);
  }
  return pairs;
}

/** `m op x = t` 를 만족하는 x */
function solveRight(op: Operator, m: number, t: number): number | null {
  if (op === '+') return t - m;
  if (op === '-') return m - t;
  if (op === '×') return m !== 0 && t % m === 0 ? t / m : null;
  return t !== 0 && m % t === 0 ? m / t : null; // m ÷ x = t → x = m/t
}

/** `m op x = t` 를 만족하는 m */
function solveLeft(op: Operator, x: number, t: number): number | null {
  if (op === '+') return t - x;
  if (op === '-') return t + x;
  if (op === '×') return x !== 0 && t % x === 0 ? t / x : null;
  return x !== 0 ? t * x : null; // m ÷ x = t → m = t·x
}

/**
 * 3항 식 `((a op1 b) op2 c) = d` 의 네 값을 구한다.
 * fixed 는 교차점 때문에 값이 이미 정해진 자리(0=a, 1=b, 2=c, 3=d).
 */
function solveTriple(
  ops: [Operator, Operator],
  fixed: Map<number, number>,
  cfg: DifficultyConfig
): [number, number, number, number] | null {
  const mul = isMul(ops[0]);
  const lo = mul ? cfg.factorRange.min : cfg.numberRange.min;
  // 곱셈·나눗셈 3항은 값이 금방 커진다. 표본 상한을 좁혀 maxResult 안에 들 확률을 높인다.
  const hi = mul
    ? Math.max(cfg.factorRange.min, Math.min(cfg.factorRange.max, Math.floor(Math.cbrt(cfg.maxResult))))
    : cfg.numberRange.max;

  const free = [0, 1, 2, 3].filter(r => !fixed.has(r));

  for (let attempt = 0; attempt < 40; attempt++) {
    const v: (number | undefined)[] = [fixed.get(0), fixed.get(1), fixed.get(2), fixed.get(3)];

    if (free.length > 0) {
      // 마지막 자유 자리를 역산으로 맞추고, 나머지 자유 자리는 표본에서 뽑는다.
      const solveFor = free[free.length - 1];
      for (const r of free) if (r !== solveFor) v[r] = randInt(lo, hi);

      if (solveFor === 3) {
        const m = evalOp(v[0]!, ops[0], v[1]!);
        v[3] = Number.isInteger(m) ? evalOp(m, ops[1], v[2]!) : NaN;
      } else if (solveFor === 2) {
        const m = evalOp(v[0]!, ops[0], v[1]!);
        if (!Number.isInteger(m)) continue;
        const x = solveRight(ops[1], m, v[3]!);
        if (x === null) continue;
        v[2] = x;
      } else if (solveFor === 1) {
        const m = solveLeft(ops[1], v[2]!, v[3]!);
        if (m === null) continue;
        const x = solveRight(ops[0], v[0]!, m);
        if (x === null) continue;
        v[1] = x;
      } else {
        const m = solveLeft(ops[1], v[2]!, v[3]!);
        if (m === null) continue;
        const x = solveLeft(ops[0], v[1]!, m);
        if (x === null) continue;
        v[0] = x;
      }
    }

    const [a, b, c, d] = v as number[];
    const m = evalOp(a, ops[0], b);
    const ok =
      [a, b, c, d, m].every(n => Number.isInteger(n) && n >= 0 && n <= cfg.maxResult) &&
      !(ops[0] === '÷' && b === 0) &&
      !(ops[1] === '÷' && c === 0) &&
      evalOp(m, ops[1], c) === d;
    if (ok) return [a, b, c, d];
  }
  return null;
}

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
  /** 2항 식은 1개, 3항 식은 2개 */
  operators: Operator[];
  /** 숫자 칸 값들 — 마지막 원소가 결과 */
  values: number[];
  /** 차지하는 칸 수 (5 또는 7) */
  len: number;
  bonusCount: number;
}

function cellsForEquation(dir: 'row' | 'col', startR: number, startC: number, len: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < len; i++) {
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
    for (const i of numSlots(cells.length)) {
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
    pivot: { localIdx: number; value: number } | null,
    len: number
  ): PlacedEquation | null {
    const cells = cellsForEquation(dir, startR, startC, len);
    for (const [r, c] of cells) {
      if (r < MIN_COORD || r > MAX_COORD || c < MIN_COORD || c > MAX_COORD) return null;
    }
    // 방정식 앞뒤로 최소 한 칸은 비워야 한다. 그렇지 않으면 서로 다른 두 방정식이 같은
    // 직선상에서 바로 이어 붙어, 우연히 유효해 보이지만 실제로는 성립하지 않는
    // "num op num = num" 패턴이 생길 수 있다.
    const [beforeR, beforeC] = dir === 'row' ? [startR, startC - 1] : [startR - 1, startC];
    const [afterR, afterC] = dir === 'row' ? [startR, startC + len] : [startR + len, startC];
    if (occ.has(key(beforeR, beforeC)) || occ.has(key(afterR, afterC))) return null;
    const bonusPivots = findBonusPivots(cells, dir, pivot?.localIdx ?? null);
    for (let i = 0; i < len; i++) {
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
    for (let i = 0; i < len; i++) {
      if (fixed.has(i)) continue;
      const [r, c] = cells[i];
      const [p1r, p1c] = dir === 'row' ? [r - 1, c] : [r, c - 1];
      const [p2r, p2c] = dir === 'row' ? [r + 1, c] : [r, c + 1];
      if (occ.get(key(p1r, p1c))?.type === 'num' || occ.get(key(p2r, p2c))?.type === 'num') return null;
    }

    // 3항 식: 같은 우선순위 그룹의 연산자 쌍으로만 시도한다.
    if (len === LEN_TRIPLE) {
      const slots = numSlots(len);
      const roleFixed = new Map<number, number>();
      for (const [idx, value] of fixed) roleFixed.set(slots.indexOf(idx), value);
      for (const ops of shuffle(operatorPairs(cfg))) {
        const vals = solveTriple(ops, roleFixed, cfg);
        if (vals) {
          return { dir, cells, operators: ops, values: vals, len, bonusCount: bonusPivots.length };
        }
      }
      return null;
    }

    for (const operator of shuffle(cfg.operators)) {
      let vals: [number, number, number] | null = null;
      const fixedCount = fixed.size;
      if (fixedCount === 0) {
        vals = randomTriple(operator, cfg);
      } else if (fixedCount === 1) {
        const [idx, value] = [...fixed.entries()][0];
        const slotRole = numSlots(len).indexOf(idx);
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
        if (valid) return { dir, cells, operators: [operator], values: vals, len, bonusCount: bonusPivots.length };
      }
    }
    return null;
  }

  function commit(eq: PlacedEquation, idx: number) {
    const equalsAt = eqSlot(eq.len);
    let ni = 0;
    for (let i = 0; i < eq.len; i++) {
      const [r, c] = eq.cells[i];
      const k = key(r, c);
      const isNum = i % 2 === 0;
      let info = occ.get(k);
      if (!info) {
        info = { type: isNum ? 'num' : i === equalsAt ? 'eq' : 'op' };
        occ.set(k, info);
      }
      if (isNum) {
        info.value = eq.values[ni++];
        if (eq.dir === 'row') info.hEq = idx; else info.vEq = idx;
      } else if (i === equalsAt) {
        info.type = 'eq';
      } else {
        info.type = 'op';
        // 홀수 자리 1, 3 이 각각 첫째·둘째 연산자
        info.operator = eq.operators[(i - 1) / 2];
      }
    }
  }

  // 첫 방정식을 원점 중심으로 배치해야, 작은 gridSize(MAXDIM=2)에서도 여유 없이 바로 들어맞는다.
  const first = tryPlace('row', 0, -2, null, LEN_PAIR);
  if (!first) return null;
  commit(first, 0);
  equations.push(first);
  boundMinR = first.cells[0][0]; boundMaxR = first.cells[0][0];
  boundMinC = first.cells[0][1]; boundMaxC = first.cells[first.len - 1][1];

  let attempts = 0;
  const tripleRatio = cfg.tripleRatio ?? 0;
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
      // 3항 식은 7칸이라 격자가 그만큼 커야 한다. 여유가 없으면 2항으로 떨어뜨린다.
      const wantTriple = Math.random() < tripleRatio && cfg.gridSize >= LEN_TRIPLE;
      const len = wantTriple ? LEN_TRIPLE : LEN_PAIR;
      const slots = numSlots(len);
      const slotLocalIdx = slots[randInt(0, slots.length - 1)];
      const startR = newDir === 'row' ? pr : pr - slotLocalIdx;
      const startC = newDir === 'row' ? pc - slotLocalIdx : pc;
      const placed = tryPlace(newDir, startR, startC, { localIdx: slotLocalIdx, value: pinfo.value! }, len);
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
  const target = Math.min(cfg.blankCount, numKeys.length);

  const eqKeySets = equations.map(eq =>
    numSlots(eq.len).map(i => eq.cells[i]).map(([r, c]) => `${r},${c}`)
  );

  /**
   * 탐욕 선택은 "훑는 순서"가 결과 모양을 정한다.
   *  - 기본: 칸 단위 무작위 → 빈칸이 골고루 흩어진다
   *  - fullLineBias: 식 단위로 묶어서 훑음 → 한 식의 칸이 연달아 선택되어
   *    숫자가 하나도 없는 식(부호만 남은 줄)이 잘 만들어진다
   */
  function makeOrder(): string[] {
    if (!cfg.fullLineBias) return shuffle(numKeys);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const keys of shuffle(eqKeySets)) {
      for (const k of keys) if (!seen.has(k)) { seen.add(k); out.push(k); }
    }
    for (const k of shuffle(numKeys)) if (!seen.has(k)) { seen.add(k); out.push(k); }
    return out;
  }

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

  // 한 번의 탐욕 선택으로는 목표에 못 미치는 경우가 잦다(고른 순서에 따라 막힘).
  // 순서를 바꿔 여러 번 시도하고 가장 많이 채운 결과를 쓴다.
  let best = new Set<string>();
  for (let round = 0; round < 12 && best.size < target; round++) {
    let cur = new Set<string>();
    for (const k of makeOrder()) {
      if (cur.size >= target) break;
      const trial = new Set(cur);
      trial.add(k);
      if (isSolvable(trial)) cur = trial;
    }
    if (cur.size > best.size) best = cur;
  }
  return best;
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
// "그럴듯하지만 실제로는 성립하지 않는" 패턴을 만들지 않았는지 검증한다.
// (앞뒤 버퍼 규칙으로 대부분 막지만, 나중에 배치된 방정식이 그 틈을 메우는 드문 경우가 남는다)
//
// 단, 실제 방정식 안에 들어있는 구간은 검사하지 않는다.
// 3항 식 `a○b○c=d` 는 그 자체로 뒤쪽에 `b○c=d` 모양을 품고 있는데, 이건 잘못된 배치가
// 아니라 3항 식의 정상적인 생김새다. 이걸 걸러내면 3항 식을 하나도 만들 수 없다.
function hasPhantomEquation(occ: Map<string, OccInfo>, equations: PlacedEquation[]): boolean {
  const cellAt = (r: number, c: number) => occ.get(`${r},${c}`);

  // 실제 방정식이 차지한 구간 — `dir:line` → [시작, 끝] 목록
  const realSpans = new Map<string, [number, number][]>();
  for (const eq of equations) {
    const [r0, c0] = eq.cells[0];
    const line = eq.dir === 'row' ? r0 : c0;
    const from = eq.dir === 'row' ? c0 : r0;
    const k = `${eq.dir}:${line}`;
    const list = realSpans.get(k);
    const span: [number, number] = [from, from + eq.len - 1];
    if (list) list.push(span); else realSpans.set(k, [span]);
  }
  const insideRealEquation = (dir: 'row' | 'col', line: number, from: number, to: number) =>
    (realSpans.get(`${dir}:${line}`) ?? []).some(([a, b]) => from >= a && to <= b);

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const k of occ.keys()) {
    const [r, c] = k.split(',').map(Number);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }

  /** 창이 `숫자 연산자 숫자 (연산자 숫자)* 등호 숫자` 모양이면 계산해 보고, 안 맞으면 true */
  function windowIsBroken(cells: (OccInfo | undefined)[]): boolean {
    const len = cells.length;
    if (cells.some(c => !c)) return false;
    const equalsAt = eqSlot(len);
    for (let i = 0; i < len; i++) {
      const want = i % 2 === 0 ? 'num' : i === equalsAt ? 'eq' : 'op';
      if (cells[i]!.type !== want) return false;
    }
    let acc = cells[0]!.value!;
    for (let i = 1; i < equalsAt; i += 2) {
      acc = evalOp(acc, cells[i]!.operator!, cells[i + 1]!.value!);
    }
    return acc !== cells[equalsAt + 1]!.value;
  }

  for (const len of [LEN_PAIR, LEN_TRIPLE]) {
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC - len + 1; c++) {
        if (insideRealEquation('row', r, c, c + len - 1)) continue;
        if (windowIsBroken(Array.from({ length: len }, (_, i) => cellAt(r, c + i)))) return true;
      }
    }
    for (let c = minC; c <= maxC; c++) {
      for (let r = minR; r <= maxR - len + 1; r++) {
        if (insideRealEquation('col', c, r, r + len - 1)) continue;
        if (windowIsBroken(Array.from({ length: len }, (_, i) => cellAt(r + i, c)))) return true;
      }
    }
  }
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
  return generateLevelFromConfig(DIFFICULTY_CONFIGS[difficulty]);
}

/** 난이도 표에 없는 설정(예: 3항 비중을 올린 스테이지용)으로 직접 생성한다. */
export function generateLevelFromConfig(cfg: DifficultyConfig): CrossMathLevel | null {
  for (let attempt = 0; attempt < 80; attempt++) {
    const structure = buildStructure(cfg);
    if (!structure) continue;
    const { equations, occ } = structure;
    if (!isFullyConnected(equations)) continue;
    // 3항 식을 쓰는 난이도라면 최소 한 개는 반드시 들어가야 한다.
    // 배치가 확률이라 그냥 두면 3항이 하나도 없는 판이 드물게 섞인다.
    if ((cfg.tripleRatio ?? 0) > 0 && !equations.some(e => e.len === LEN_TRIPLE)) continue;
    const blanks = selectBlanks(equations, occ, cfg);
    // 난이도별 정답 개수는 고정이다. 못 채우면 이 배치는 버리고 다시 만든다.
    if (blanks.size < cfg.blankCount) continue;
    for (const k of blanks) {
      occ.get(k)!.isBlank = true;
    }
    if (hasPhantomEquation(occ, equations)) continue;
    return occToLevel(occ);
  }
  return null;
}
