// 노노그램 솔버 — 줄 단위 전파(line solving) + 필요 시 백트래킹으로 해의 개수를 센다.
// 레벨 데이터가 "힌트만으로 유일하게 풀리는지" 검증하는 용도.

export type SolveResult = {
  /** 발견된 해의 개수 (최대 2까지만 셈: 0 = 불가능, 1 = 유일, 2 = 복수해) */
  solutions: number;
  /** 백트래킹 없이 줄 전파만으로 풀렸는지 (true면 사람이 논리만으로 풀 수 있는 쉬운 퍼즐) */
  logicOnly: boolean;
  grid: number[][] | null;
};

const UNKNOWN = -1;

/** 한 줄에서 힌트를 만족하는 모든 배치를 열거 (현재 확정된 칸과 충돌하지 않는 것만) */
function lineArrangements(clue: number[], line: number[]): number[][] {
  const n = line.length;
  const blocks = clue[0] === 0 ? [] : clue;
  const out: number[][] = [];
  const cur = new Array<number>(n).fill(0);

  const place = (bi: number, pos: number) => {
    if (bi === blocks.length) {
      for (let i = pos; i < n; i++) { if (line[i] === 1) return; cur[i] = 0; }
      out.push([...cur]);
      return;
    }
    const len = blocks[bi];
    const rest = blocks.slice(bi + 1).reduce((s, b) => s + b + 1, 0);
    for (let start = pos; start + len + rest <= n; start++) {
      let ok = true;
      for (let i = pos; i < start; i++) if (line[i] === 1) { ok = false; break; }
      if (!ok) break; // 확정 채움 칸을 건너뛸 수 없음
      for (let i = start; i < start + len; i++) if (line[i] === 0) { ok = false; break; }
      if (ok && start + len < n && line[start + len] === 1) ok = false;
      if (ok) {
        for (let i = pos; i < start; i++) cur[i] = 0;
        for (let i = start; i < start + len; i++) cur[i] = 1;
        if (start + len < n) cur[start + len] = 0;
        place(bi + 1, Math.min(n, start + len + 1));
      }
    }
  };
  place(0, 0);
  return out;
}

/** 모든 배치에서 공통인 칸을 확정. 변경 여부 반환, 모순이면 null */
function propagateLine(clue: number[], line: number[]): number[] | null {
  const arrs = lineArrangements(clue, line);
  if (arrs.length === 0) return null;
  const next = [...line];
  let changed = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== UNKNOWN) continue;
    const v = arrs[0][i];
    if (arrs.every(a => a[i] === v)) { next[i] = v; changed = true; }
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

  const search = (grid: number[][]) => {
    if (count >= 2) return;
    if (branches > budget) { count = 2; return; }
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
  return { solutions: count, logicOnly, grid: found };
}
