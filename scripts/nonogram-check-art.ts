// 텍스트 아트 파일(# = 채움, . = 빈 칸)의 유일해·논리풀이 여부를 판정한다.
//   npx tsx scripts/nonogram-check-art.ts <file.txt>
import fs from 'node:fs';
import path from 'node:path';
import { lineClues } from '../src/features/nonogram/data/levels';
import { solveNonogram, propagate } from '../src/features/nonogram/utils/solver';

const art = fs.readFileSync(process.argv[2], 'utf-8').split(/\r?\n/).filter(Boolean);
const grid = art.map(r => [...r].map(c => (c === '#' ? 1 : 0)));
const rows = grid.map(lineClues);
const cols = grid[0].map((_, c) => lineClues(grid.map(rw => rw[c])));
// 줄 전파만으로 몇 칸이 확정되는지 = 사람이 논리로 풀 수 있는 정도
const work = grid.map(r => r.map(() => -1));
propagate(rows, cols, work);
const determined = work.flat().filter(v => v !== -1).length;
// FAST=1 이면 전파 확정률만 보고 유일해 판정(느릴 수 있음)은 건너뛴다
const t = Date.now();
const res = process.env.FAST ? { solutions: -1, logicOnly: false, exhausted: false, branches: 0 } : solveNonogram(rows, cols, Number(process.env.BUDGET ?? 20000));
const fill = grid.flat().reduce((s, v) => s + v, 0) / (grid.length * grid[0].length);
const status = res.solutions === -1 ? '(판정 생략)' : res.exhausted ? '판정불가(탐색한도 초과)' : res.solutions === 1 ? (res.logicOnly ? '유일해·논리풀이' : '유일해·추측필요') : `복수해(${res.solutions})`;
console.log(`${path.basename(process.argv[2])}  ${grid[0].length}×${grid.length}  채움 ${(fill * 100).toFixed(0)}%  전파확정 ${(determined / (grid.length * grid[0].length) * 100).toFixed(0)}%  ${status}  가정 ${res.branches}회  ${Date.now() - t}ms`);
