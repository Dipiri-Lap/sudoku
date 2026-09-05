// 노노그램 솔버 — 줄 단위 전파(line solving) + 필요 시 백트래킹으로 해의 개수를 센다.
// 레벨 데이터가 "힌트만으로 유일하게 풀리는지" 검증하는 용도.

export type SolveResult = {
  /** 발견된 해의 개수 (최대 2까지만 셈: 0 = 불가능, 1 = 유일, 2 = 복수해) */
  solutions: number;
  /** 백트래킹 없이 줄 전파만으로 풀렸는지 (true면 사람이 논리만으로 풀 수 있는 쉬운 퍼즐) */
  logicOnly: boolean;
  /**
   * 분기 예산을 다 써서 탐색을 중단했는지. true 면 solutions 값은 "복수해"가 아니라 "판정 못 함"이다.
   * (예산 초과 시 안전하게 solutions=2 로 두지만, 실제로는 유일해일 수도 있다)
   */
  exhausted: boolean;
  /** 백트래킹으로 가정을 시도한 횟수. 난이도 지표 — 0 이면 논리만으로 풀림, 클수록 추측이 많이 필요 */
  branches: number;
  grid: number[][] | null;
};

const UNKNOWN = -1;

/**
 * 한 줄 풀이: 힌트를 만족하는 배치들에서 공통인 칸을 확정한다.
 * 배치를 전부 열거하면 칸이 많고 블록이 잘게 쪼개진 줄에서 경우의 수가 폭발하므로(35칸 · 10블록이면 수십만 개)
 * 상태 (위치 i, 놓은 블록 수 j, 직전 칸이 블록의 끝인지 b) 위에서 앞/뒤 도달 가능성을 DP 로 구한다. O(n·k).
 *   reach[i][j][b] = 줄 시작부터 이 상태까지 올 수 있는가
 *   comp [i][j][b] = 이 상태에서 줄 끝까지 힌트를 마저 채울 수 있는가
 * 어떤 칸이 "빈 칸일 수 있는가 / 채움일 수 있는가"는 두 배열이 모두 참인 전이가 있는지로 판정한다.
 * 반환: 확정된 칸이 생기면 새 배열, 변화가 없으면 받은 배열 그대로, 모순이면 null.
 */
export function propagateLine(clue: number[], line: number[]): number[] | null {
  const n = line.length;
  const blocks = clue[0] === 0 ? [] : clue;
  const k = blocks.length;

  // 빈 칸(0) 누적합 — 블록을 s 에서 시작할 수 있는지 O(1) 판정용
  const emptyPrefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) emptyPrefix[i + 1] = emptyPrefix[i] + (line[i] === 0 ? 1 : 0);
  const canPlace = (s: number, len: number) => s + len <= n && emptyPrefix[s + len] - emptyPrefix[s] === 0;

  const idx = (i: number, j: number, b: number) => (i * (k + 1) + j) * 2 + b;
  const comp = new Uint8Array((n + 1) * (k + 1) * 2);
  for (let j = 0; j <= k; j++) {
    const done = j === k ? 1 : 0;
    comp[idx(n, j, 0)] = done;
    comp[idx(n, j, 1)] = done;
  }
  for (let i = n - 1; i >= 0; i--) for (let j = k; j >= 0; j--) {
    // 다음 칸을 빈 칸으로 두기 (블록 직후 b=1 이면 이것만 가능)
    const skip = line[i] !== 1 && comp[idx(i + 1, j, 0)] ? 1 : 0;
    comp[idx(i, j, 1)] = skip;
    const place = j < k && canPlace(i, blocks[j]) && comp[idx(i + blocks[j], j + 1, 1)] ? 1 : 0;
    comp[idx(i, j, 0)] = skip || place ? 1 : 0;
  }
  if (!comp[idx(0, 0, 0)]) return null; // 이 줄을 만족하는 배치가 없음

  const reach = new Uint8Array((n + 1) * (k + 1) * 2);
  reach[idx(0, 0, 0)] = 1;
  const canBeEmpty = new Uint8Array(n);
  const canBeFilled = new Uint8Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= k; j++) for (let b = 0; b < 2; b++) {
    if (!reach[idx(i, j, b)]) continue;
    if (line[i] !== 1 && comp[idx(i + 1, j, 0)]) { reach[idx(i + 1, j, 0)] = 1; canBeEmpty[i] = 1; }
    if (b === 0 && j < k && canPlace(i, blocks[j]) && comp[idx(i + blocks[j], j + 1, 1)]) {
      reach[idx(i + blocks[j], j + 1, 1)] = 1;
      for (let t = i; t < i + blocks[j]; t++) canBeFilled[t] = 1;
    }
  }

  const next = [...line];
  let changed = false;
  for (let i = 0; i < n; i++) {
    if (!canBeEmpty[i] && !canBeFilled[i]) return null;
    if (line[i] !== UNKNOWN) continue;
    if (!canBeEmpty[i]) { next[i] = 1; changed = true; }
    else if (!canBeFilled[i]) { next[i] = 0; changed = true; }
  }
  return changed ? next : line;
}

export function propagate(rowClues: number[][], colClues: number[][], grid: number[][]): boolean {
  const R = grid.length, C = grid[0].length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < R; r++) {
      const res = propagateLine(rowClues[r], grid[r]);
      if (!res) return false;
      if (res !== grid[r]) { grid[r] = res; changed = true; }
    }
    for (let c = 0; c < C; c++) {
      const col = grid.map(row => row[c]);
      const res = propagateLine(colClues[c], col);
      if (!res) return false;
      if (res !== col) { res.forEach((v, r) => { grid[r][c] = v; }); changed = true; }
    }
  }
  return true;
}

/**
 * @param budget 백트래킹 분기 허용 횟수. 초과하면 탐색을 멈추고 solutions=2(복수해 취급)로 반환.
 *   복수해가 아주 많은 그림(지형 타일 등)에서 탐색이 폭발하는 것을 막기 위한 안전장치.
 */
export function solveNonogram(rowClues: number[][], colClues: number[][], budget = 5000, initial?: number[][]): SolveResult {
  const R = rowClues.length, C = colClues.length;
  const start = initial ? initial.map(row => [...row]) : Array.from({ length: R }, () => new Array<number>(C).fill(UNKNOWN));
  let logicOnly = true;
  let count = 0;
  let found: number[][] | null = null;
  let branches = 0;
  let exhausted = false;

  const search = (grid: number[][]) => {
    if (count >= 2) return;
    if (branches > budget) { exhausted = true; count = 2; return; }
    if (!propagate(rowClues, colClues, grid)) return;
    let ur = -1, uc = -1;
    outer: for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (grid[r][c] === UNKNOWN) { ur = r; uc = c; break outer; }
    }
    // 마지막에 찾은 해를 보관 — 복수해일 때 정답과 "다른" 해가 남아 diff 로 애매한 칸을 볼 수 있다
    if (ur === -1) { count++; found = grid; return; }
    logicOnly = false;
    branches++;
    for (const v of [1, 0]) {
      const g = grid.map(row => [...row]);
      g[ur][uc] = v;
      search(g);
    }
  };
  search(start);
  return { solutions: count, logicOnly, exhausted, branches, grid: found };
}
