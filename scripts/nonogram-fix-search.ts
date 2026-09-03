// 복수해 레벨에서 지정 영역의 칸을 하나씩 뒤집어 보고, 유일해가 되는 단일 칸 수정 후보를 출력
//   npx tsx scripts/nonogram-fix-search.ts <levelId> <y0,x0,y1,x1>
import { levels, solutionGrid, buildClues } from '../src/features/nonogram/data/levels';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
const [id, box] = process.argv.slice(2);
const level = levels.find(l => l.id === id)!;
const [y0, x0, y1, x1] = box.split(',').map(Number);
const grid = solutionGrid(level);
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  const g = grid.map(r => [...r]); g[y][x] = g[y][x] ? 0 : 1;
  const { rows, cols } = buildClues(g);
  const res = solveNonogram(rows, cols, 2000);
  if (res.solutions === 1) console.log(`(${y},${x}) '${level.art[y][x]}' ${grid[y][x] ? 'fill->empty' : 'empty->fill'} ${res.logicOnly ? 'logic' : 'guess'}`);
}
