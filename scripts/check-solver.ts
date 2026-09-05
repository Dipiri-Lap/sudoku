// 줄 풀이 DP 교차 검증: "모든 배치를 열거해 공통 칸을 확정"하는 순진한 구현과 결과가 같아야 한다.
// solver.ts 의 propagateLine 은 O(n·k) DP 라 큰 격자에서도 빠르지만, 그만큼 직접 검증이 필요하다.
//   npx tsx scripts/check-solver.ts
import { propagateLine } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';

/** 모든 배치를 열거해 공통 칸을 확정 (느리지만 정의 그대로) */
function brute(clue: number[], line: number[]): number[] | null {
  const n = line.length;
  const blocks = clue[0] === 0 ? [] : clue;
  const arrs: number[][] = [];
  const cur = new Array<number>(n).fill(0);
  const place = (bi: number, pos: number) => {
    if (bi === blocks.length) {
      for (let i = pos; i < n; i++) { if (line[i] === 1) return; cur[i] = 0; }
      arrs.push([...cur]);
      return;
    }
    const len = blocks[bi];
    const rest = blocks.slice(bi + 1).reduce((s, b) => s + b + 1, 0);
    for (let start = pos; start + len + rest <= n; start++) {
      let ok = true;
      for (let i = pos; i < start; i++) if (line[i] === 1) { ok = false; break; }
      if (!ok) break;
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
  if (arrs.length === 0) return null;
  const out = [...line];
  for (let i = 0; i < n; i++) {
    if (line[i] !== -1) continue;
    const v = arrs[0][i];
    if (arrs.every(a => a[i] === v)) out[i] = v;
  }
  return out;
}

const same = (a: number[] | null, b: number[] | null) =>
  (a === null && b === null) || (a !== null && b !== null && a.length === b.length && a.every((v, i) => v === b[i]));

let checked = 0, bad = 0;
for (let t = 0; t < 20000; t++) {
  const n = 3 + Math.floor(Math.random() * 16);
  const sol = Array.from({ length: n }, () => (Math.random() < 0.45 ? 1 : 0));
  const clue = lineClues(sol);
  // 부분 정보(일부는 정답과 어긋나게도) — 모순 판정까지 함께 확인
  const line = sol.map(v => {
    const r = Math.random();
    if (r < 0.7) return -1;
    if (r < 0.95) return v;
    return v ? 0 : 1;
  });
  const want = brute(clue, line);
  const got = propagateLine(clue, line);
  checked++;
  if (!same(want, got === line ? [...line] : got)) {
    bad++;
    if (bad <= 5) console.log('MISMATCH', JSON.stringify({ clue, line, want, got }));
  }
}
console.log(bad === 0 ? `✓ ${checked}개 무작위 줄에서 DP = 완전 열거 일치` : `✗ ${bad}/${checked} 불일치`);
process.exit(bad === 0 ? 0 : 1);
