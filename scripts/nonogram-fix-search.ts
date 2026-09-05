// 복수해 레벨에서 "한 칸만 바꾸면 줄 논리만으로 풀리는" 후보를 찾는다.
// 판정은 백트래킹 없이 줄 전파만 돌린다 — 전파로 전부 확정되면 그 자체로 유일해 + 논리 풀이이므로
// 큰 격자(35×35 등)에서도 후보 하나당 수 ms 면 끝난다. (solveNonogram 은 복수해일 때 수 분이 걸림)
//   npx tsx scripts/nonogram-fix-search.ts <levelId | art.txt> [y0,x0,y1,x1]
import fs from 'node:fs';
import { levels, solutionGrid, buildClues } from '../src/features/nonogram/data/levels';
import { propagate } from '../src/features/nonogram/utils/solver';

const [id, box] = process.argv.slice(2);
const level = levels.find(l => l.id === id);
// 레벨 id 또는 텍스트 아트 파일(# = 채움) 둘 다 받는다 — 아직 levels.ts 에 넣기 전 후보를 다듬을 때 유용
const grid = level
  ? solutionGrid(level)
  : fs.readFileSync(id, 'utf-8').split(/\r?\n/).filter(Boolean).map(r => [...r].map(c => (c === '#' ? 1 : 0)));
const R = grid.length, C = grid[0].length;
const [y0, x0, y1, x1] = box ? box.split(',').map(Number) : [0, 0, R - 1, C - 1];

/** 줄 전파만으로 정답이 전부 확정되는가 */
function lineSolvable(g: number[][]): boolean {
  const { rows, cols } = buildClues(g);
  const work = g.map(r => r.map(() => -1));
  if (!propagate(rows, cols, work)) return false;
  return work.every((row, r) => row.every((v, c) => v === g[r][c]));
}

if (lineSolvable(grid)) { console.log(`${id}: 이미 줄 논리만으로 풀림 (수정 불필요)`); process.exit(0); }

// 전파 후에도 미확정인 칸 = 애매한 곳. 어디를 고쳐야 하는지 먼저 보여준다.
{
  const { rows, cols } = buildClues(grid);
  const work = grid.map(r => r.map(() => -1));
  propagate(rows, cols, work);
  const und: string[] = [];
  work.forEach((row, r) => row.forEach((v, c) => { if (v === -1) und.push(`${r},${c}`); }));
  console.log(`미확정 칸 ${und.length}개: ${und.join(' ')}`);
}
const t0 = Date.now();
const cells: [number, number][] = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push([y, x]);
const label = (y: number, x: number) => `(${y},${x}) ${grid[y][x] ? '지움' : '채움'}`;
let n = 0;
for (const [y, x] of cells) {
  const g = grid.map(r => [...r]);
  g[y][x] ^= 1;
  if (lineSolvable(g)) { console.log(label(y, x)); n++; }
}
// 애매한 곳이 여러 군데면 한 칸으로는 못 고친다. PAIR=1 이면 두 칸 조합까지 훑는다.
if (n === 0 && process.env.PAIR) {
  for (let i = 0; i < cells.length && n < 20; i++) for (let j = i + 1; j < cells.length && n < 20; j++) {
    const g = grid.map(r => [...r]);
    g[cells[i][0]][cells[i][1]] ^= 1;
    g[cells[j][0]][cells[j][1]] ^= 1;
    if (lineSolvable(g)) { console.log(`${label(...cells[i])} + ${label(...cells[j])}`); n++; }
  }
}
console.log(`후보 ${n}개 · ${Date.now() - t0}ms${n === 0 && !process.env.PAIR ? ' (PAIR=1 로 두 칸 조합까지 탐색 가능)' : ''}`);
