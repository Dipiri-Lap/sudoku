/**
 * 흑백 선화(1비트 픽셀아트/라인아트) → 노노그램 레벨.
 *
 * 선화를 그대로 격자에 옮기면 그림은 알아보기 쉬운데 퍼즐로는 못 쓴다.
 * 선이 한 칸 두께라 한 줄이 `1 1 1 3 1 1` 처럼 잘게 쪼개지고, 배치 자유도가 커서
 * 힌트가 정보를 거의 주지 못하기 때문이다(줄 논리로 그림의 3~17%만 확정되는 경우도 있었다).
 *
 * 그래서 그림은 건드리지 않고 선만 한 칸 굵힌다. 그러면 같은 줄이 `2 4 2` 처럼 되어
 * 겹침 규칙만으로 대부분 확정된다. 굵히기는 위·왼쪽으로만 하는 half 가 기본이다.
 * 사방으로 굵히면(full) 획이 두 칸씩 불어나 그림이 뭉개지고 채움이 70% 가까이 올라간다.
 *
 * 굵힌 뒤에도 답이 둘이면, 칸 하나(안 되면 두 칸)를 뒤집어 유일해가 되는 조합을 찾는다.
 * 이때 "이웃이 같은 값인 칸"을 먼저 고른다 — 삐죽 나온 곳을 다듬거나 파인 곳을 메우는 수정이라
 * 원래 그림과 차이가 눈에 띄지 않는다.
 *
 * 이미지 대신 텍스트 도안(.txt, # 또는 █ = 채움)을 넘겨도 된다. 직접 도트를 찍어 만든 그림을
 * 같은 보정·검증 절차에 태울 때 쓴다. 이때 N 과 굵히기는 무시하고 도안을 그대로 쓴다.
 *
 *   npx tsx scripts/nonogram-from-lineart.ts <image.png | art.txt> [N]
 * 환경 변수:
 *   TILE=cols,rows,index   여러 칸으로 나뉜 시트에서 한 칸만 쓸 때
 *   MODE=half|full|none    선 굵히기 방식 (기본 half)
 *   ID=, NAME=, IMAGE=     주면 levels.ts 에 붙일 TS 조각까지 출력
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { lineClues } from '../src/features/nonogram/data/levels';
import { propagate, solveNonogram } from '../src/features/nonogram/utils/solver';

const [srcPath, nArg] = process.argv.slice(2);
const isArt = /\.txt$/i.test(srcPath ?? '');
if (!srcPath || (!isArt && !nArg)) {
  console.error('usage: nonogram-from-lineart.ts <image.png|art.txt> [N]  [TILE=c,r,i MODE=half|full|none ID= NAME= IMAGE=]');
  process.exit(1);
}
const N = Number(nArg ?? 30);
const MODE = process.env.MODE ?? 'half';

let grid: number[][];
if (isArt) {
  grid = fs.readFileSync(srcPath, 'utf-8').split(/\r?\n/).filter(Boolean)
    .map(row => [...row].map(ch => (ch === '.' || ch === '·' || ch === ' ' ? 0 : 1)));
  const widths = new Set(grid.map(r => r.length));
  if (widths.size !== 1) { console.error(`행 길이가 다릅니다: ${[...widths].join(', ')}`); process.exit(1); }
} else {
  grid = fromImage();
}

function fromImage(): number[][] {

const png = PNG.sync.read(fs.readFileSync(srcPath));
const W = png.width, H = png.height;
/** 잉크 = 불투명하면서 어두운 픽셀 */
const ink = (x: number, y: number) => {
  const i = (y * W + x) * 4;
  if (png.data[i + 3] < 128) return false;
  return (0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) < 128;
};

// 쓸 영역 (시트의 한 칸이면 그 사분면)
let [rx0, ry0, rx1, ry1] = [0, 0, W, H];
if (process.env.TILE) {
  const [tc, tr, idx] = process.env.TILE.split(',').map(Number);
  const cx = idx % tc, cy = Math.floor(idx / tc);
  rx0 = Math.floor((cx * W) / tc); rx1 = Math.floor(((cx + 1) * W) / tc);
  ry0 = Math.floor((cy * H) / tr); ry1 = Math.floor(((cy + 1) * H) / tr);
}
// 잉크 경계 상자
let l = rx1, t = ry1, r = rx0, b = ry0;
for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
  if (!ink(x, y)) continue;
  if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
}
if (r < l) { console.error('잉크 픽셀이 없습니다'); process.exit(1); }

const bw = r - l + 1, bh = b - t + 1;
const NX = bw >= bh ? N : Math.max(5, Math.round((N * bw) / bh));
const NY = bh >= bw ? N : Math.max(5, Math.round((N * bh) / bw));

// 칸 단위로 축소: 칸 안의 잉크가 절반을 넘으면 채움
const g0: number[][] = [];
for (let gy = 0; gy < NY; gy++) {
  const row: number[] = [];
  for (let gx = 0; gx < NX; gx++) {
    const x0 = l + Math.round((gx * bw) / NX), x1 = l + Math.round(((gx + 1) * bw) / NX);
    const y0 = t + Math.round((gy * bh) / NY), y1 = t + Math.round(((gy + 1) * bh) / NY);
    let n = 0, hit = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; if (ink(x, y)) hit++; }
    row.push(n > 0 && hit * 2 >= n ? 1 : 0);
  }
  g0.push(row);
}

/** 선 굵히기: half 는 위·왼쪽으로만, full 은 사방으로 */
function dilate(g: number[][], mode: string): number[][] {
  if (mode === 'none') return g.map(r => [...r]);
  const dirs = mode === 'full'
    ? [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
    : [[0, 0], [-1, 0], [0, -1]];
  return g.map((row, y) => row.map((_, x) =>
    dirs.some(([dy, dx]) => g[y + dy]?.[x + dx] === 1) ? 1 : 0));
}
  return dilate(g0, MODE);
}

/** 바깥의 빈 행/열 제거 — 힌트가 0 으로만 찬 줄이 생기지 않도록 */
function crop(g: number[][]): number[][] {
  const has = (row: number[]) => row.some(v => v === 1);
  const top = g.findIndex(has);
  const bot = g.length - 1 - [...g].reverse().findIndex(has);
  const rows = g.slice(top, bot + 1);
  const wid = rows[0].length;
  let left = 0, right = wid - 1;
  while (left < wid && rows.every(row => row[left] === 0)) left++;
  while (right > left && rows.every(row => row[right] === 0)) right--;
  return rows.map(row => row.slice(left, right + 1));
}
grid = crop(grid);

const cluesOf = (g: number[][]) => ({
  rows: g.map(lineClues),
  cols: g[0].map((_, c) => lineClues(g.map(rw => rw[c]))),
});
/** 줄 전파만으로 정답이 전부 확정되는가 = 유일해이면서 사람이 논리로 풀 수 있음 */
function lineSolvable(g: number[][]): boolean {
  const { rows, cols } = cluesOf(g);
  const work = g.map(row => row.map(() => -1));
  if (!propagate(rows, cols, work)) return false;
  return work.every((row, y) => row.every((v, x) => v === g[y][x]));
}
/** 이웃이 바꾸려는 값과 같을수록 높은 점수 — 그림을 덜 해치는 수정을 먼저 고른다 */
function naturalness(g: number[][], y: number, x: number): number {
  const want = g[y][x] ? 0 : 1;
  let same = 0;
  for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const v = g[y + dy]?.[x + dx];
    if (v === want) same++;
  }
  return same;
}

const before = grid.map(row => [...row]);
const fixes: string[] = [];
if (!lineSolvable(grid)) {
  const all: [number, number][] = [];
  grid.forEach((row, y) => row.forEach((_, x) => all.push([y, x])));
  const ranked = all.sort((a, b) => naturalness(grid, ...b) - naturalness(grid, ...a));
  let done = false;
  for (const [y, x] of ranked) {
    const g = grid.map(row => [...row]);
    g[y][x] ^= 1;
    if (lineSolvable(g)) { grid = g; fixes.push(`(${y},${x}) ${before[y][x] ? '지움' : '채움'}`); done = true; break; }
  }
  if (!done) {
    // 애매한 곳이 두 군데면 한 칸으로는 못 고친다. 자연스러운 후보 위주로 두 칸 조합을 훑는다.
    const top = ranked.slice(0, 220);
    outer: for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
      const g = grid.map(row => [...row]);
      g[top[i][0]][top[i][1]] ^= 1;
      g[top[j][0]][top[j][1]] ^= 1;
      if (lineSolvable(g)) {
        grid = g;
        fixes.push(`(${top[i][0]},${top[i][1]}) ${before[top[i][0]][top[i][1]] ? '지움' : '채움'}`);
        fixes.push(`(${top[j][0]},${top[j][1]}) ${before[top[j][0]][top[j][1]] ? '지움' : '채움'}`);
        done = true;
        break outer;
      }
    }
  }
}

const { rows, cols } = cluesOf(grid);
const res = solveNonogram(rows, cols, 200000);
const fill = grid.flat().reduce((s, v) => s + v, 0) / (grid.length * grid[0].length);
const status = res.exhausted ? '판정불가(탐색한도 초과)'
  : res.solutions === 1 ? (res.logicOnly ? '유일해·논리풀이' : `유일해·추측필요(가정 ${res.branches}회)`)
  : `복수해(${res.solutions})`;
console.log(`${grid[0].length}×${grid.length}  채움 ${(fill * 100).toFixed(0)}%  굵히기 ${MODE}  ${status}`);
if (fixes.length) console.log(`자동 보정 ${fixes.length}칸: ${fixes.join(', ')}`);
console.log(grid.map(row => row.map(v => (v ? '█' : '·')).join('')).join('\n'));

if (process.env.ID) {
  const art = grid.map(row => row.map(v => (v ? 'a' : '.')).join(''));
  const L = ['SNIPPET', '  {', `    id: '${process.env.ID}',`, `    name: '${process.env.NAME ?? process.env.ID}',`,
    "    background: '#f5f9ff',", "    palette: { a: '#111111' },"];
  if (process.env.IMAGE) L.push(`    image: '${process.env.IMAGE}',`);
  L.push('    art: [', ...art.map(row => `      '${row}',`), '    ],', '  },');
  console.log(L.join('\n'));
}
