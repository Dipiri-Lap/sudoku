// 복수해 레벨의 "어느 칸이 애매한지" 표시.
// 줄 전파만으로 확정되지 않는 칸마다 정답과 반대로 강제해 보고, 그래도 해가 있으면 '?'로 찍는다.
//   npx tsx scripts/nonogram-ambiguity.ts <levelId>
import { levels, solutionGrid, buildClues } from '../src/features/nonogram/data/levels';
import { solveNonogram, propagate } from '../src/features/nonogram/utils/solver';
const id = process.argv[2];
const level = levels.find(l => l.id === id);
if (!level) { console.error('no level', id); process.exit(1); }
const grid = solutionGrid(level);
const { rows, cols } = buildClues(grid);
const R = grid.length, C = grid[0].length;
const start = grid.map(r => r.map(() => -1));
propagate(rows, cols, start);
const amb = grid.map(r => r.map(() => false));
let n = 0;
for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
  if (start[r][c] !== -1) continue;
  const g = start.map(row => [...row]);
  g[r][c] = grid[r][c] ? 0 : 1;
  if (solveNonogram(rows, cols, 3000, g).solutions >= 1) { amb[r][c] = true; n++; }
}
console.log(`${id} ${C}×${R}: ambiguous cells = ${n}  (? = 반대로 둬도 해가 있음, ░ = 전파로 미확정이지만 결국 유일)`);
console.log('    ' + [...Array(C)].map((_, c) => c % 10).join(''));
grid.forEach((row, r) => console.log(String(r).padStart(3) + ' ' + row.map((v, c) => (amb[r][c] ? '?' : start[r][c] === -1 ? (v ? '▓' : '░') : v ? '█' : '·')).join('')));
