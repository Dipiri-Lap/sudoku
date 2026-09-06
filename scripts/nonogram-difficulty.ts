/**
 * 스테이지의 "시작 난이도"를 잰다.
 *
 * check-nonogram 은 유일해인지, 줄 논리로 풀리는지만 본다. 그런데 실제로 막히는 지점은 따로 있다.
 * 첫 수다. 한 줄만 보고 확정할 수 있는 칸은 블록이 줄 길이의 절반을 넘을 때만 생기는데(겹침 규칙),
 * 얇고 긴 그림은 그런 줄이 하나도 없어서 아무 데도 못 찍고 시작부터 멈춘다.
 *
 * 그래서 두 가지를 함께 본다.
 *   첫 수  = 아무 정보 없이 각 줄을 한 번씩 훑었을 때 확정되는 칸 수 (많을수록 시작이 쉽다)
 *   단계   = 더 이상 확정되지 않을 때까지 필요한 전체 훑기 횟수 (많을수록 길게 이어 풀어야 한다)
 *
 *   npx tsx scripts/nonogram-difficulty.ts
 */
import { levels, solutionGrid, buildClues } from '../src/features/nonogram/data/levels';
import { propagateLine } from '../src/features/nonogram/utils/solver';

type Stat = { id: string; name: string; size: string; cells: number; first: number; sweeps: number; fill: number };

/** 한 번 훑기: 모든 행, 이어서 모든 열에 줄 풀이를 한 번씩 적용. 확정된 칸이 늘면 true */
function sweep(rowClues: number[][], colClues: number[][], g: number[][]): boolean {
  let changed = false;
  for (let r = 0; r < g.length; r++) {
    const res = propagateLine(rowClues[r], g[r]);
    if (res && res !== g[r]) { g[r] = res; changed = true; }
  }
  for (let c = 0; c < g[0].length; c++) {
    const col = g.map(row => row[c]);
    const res = propagateLine(colClues[c], col);
    if (res && res !== col) { res.forEach((v, r) => { g[r][c] = v; }); changed = true; }
  }
  return changed;
}

const stats: Stat[] = levels.map(level => {
  const sol = solutionGrid(level);
  const { rows, cols } = buildClues(sol);
  const cells = sol.length * sol[0].length;
  const g = sol.map(row => row.map(() => -1));
  sweep(rows, cols, g);
  const first = g.flat().filter(v => v !== -1).length;
  let sweeps = 1;
  while (sweep(rows, cols, g)) sweeps++;
  return {
    id: level.id,
    name: level.name,
    size: `${sol[0].length}×${sol.length}`,
    cells,
    first,
    sweeps,
    fill: sol.flat().reduce((s, v) => s + v, 0) / cells,
  };
});

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;
console.log('첫 수 = 아무 정보 없이 한 번 훑어 확정되는 칸 (낮을수록 시작이 막힌다)');
console.log('단계 = 끝까지 확정하는 데 필요한 훑기 횟수\n');
console.log('  이름            크기      채움   첫 수   단계');
for (const s of [...stats].sort((a, b) => a.first / a.cells - b.first / b.cells)) {
  const flag = s.first / s.cells < 0.05 ? '  ← 시작이 어려움' : '';
  console.log(
    `  ${s.name.padEnd(12)}  ${s.size.padStart(7)}  ${pct(s.fill * s.cells, s.cells).padStart(4)}  ` +
    `${String(s.first).padStart(4)}칸 ${pct(s.first, s.cells).padStart(5)}  ${String(s.sweeps).padStart(3)}${flag}`
  );
}
