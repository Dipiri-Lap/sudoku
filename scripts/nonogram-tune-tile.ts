// 단일 타일 튜닝: 팔레트 문자별 밝기를 보여주고 emptyChars 를 지정해 풀이 가능성 확인
//   npx tsx scripts/nonogram-tune-tile.ts <img> <x0,y0,x1,y1> <N> [emptyChars] [paletteK] [id] [name] [imagePath]
//   id/name 을 주면 levels.ts 에 붙일 TS 조각을 마지막에 출력한다
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';
const [imgPath, box, nArg, emptyArg, kArg, idArg, nameArg, imageArg] = process.argv.slice(2);
const [tx0, ty0, tx1, ty1] = box.split(',').map(Number);
const N = Number(nArg); const K = Number(kArg ?? 8);
const png = PNG.sync.read(fs.readFileSync(imgPath));
const W = png.width;
const px = (x: number, y: number): [number, number, number, number] => { const i = (y * W + x) * 4; return [png.data[i], png.data[i+1], png.data[i+2], png.data[i+3]]; };
type RGB = [number, number, number];
const dist2 = (a: RGB, b: RGB) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
const hex = ([r,g,b]: RGB) => '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
const luma = ([r,g,b]: RGB) => (0.2126*r + 0.7152*g + 0.0722*b)/255;
function quantize(colors: RGB[], k: number): RGB[] {
  const uniq = new Map<string, { c: RGB; n: number }>();
  for (const c of colors) { const key = c.map(v => Math.round(v/8)).join(','); const e = uniq.get(key); if (e) e.n++; else uniq.set(key, { c, n: 1 }); }
  const pts = [...uniq.values()].sort((a,b) => b.n - a.n);
  const total = pts.reduce((s,p) => s+p.n, 0);
  const candidates = pts.filter(p => p.n/total >= 0.004);
  const centers: RGB[] = [pts[0].c];
  while (centers.length < k && candidates.length > centers.length) {
    let best: RGB|null = null, bestD = -1;
    for (const p of candidates) { const d = Math.min(...centers.map(c => dist2(c,p.c))); if (d > bestD) { bestD = d; best = p.c; } }
    if (!best || bestD < 20**2) break; centers.push(best);
  }
  for (let it = 0; it < 8; it++) {
    const sums = centers.map(() => [0,0,0,0]);
    for (const p of pts) { let bi=0, bd=Infinity; centers.forEach((c,i) => { const d = dist2(c,p.c); if (d<bd) { bd=d; bi=i; } }); sums[bi][0]+=p.c[0]*p.n; sums[bi][1]+=p.c[1]*p.n; sums[bi][2]+=p.c[2]*p.n; sums[bi][3]+=p.n; }
    centers.forEach((c,i) => { if (sums[i][3]) centers[i] = [sums[i][0]/sums[i][3], sums[i][1]/sums[i][3], sums[i][2]/sums[i][3]]; });
  }
  return centers;
}
let l = tx1, r = tx0, t = ty1, b = ty0;
for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) if (px(x,y)[3] >= 128) { if (x<l) l=x; if (x>r) r=x; if (y<t) t=y; if (y>b) b=y; }
const bw = r-l+1, bh = b-t+1;
const NX = bw >= bh ? N : Math.max(5, Math.round(N*bw/bh));
const NY = bh >= bw ? N : Math.max(5, Math.round(N*bh/bw));
const cw = bw/NX, ch = bh/NY;
const cellPixels: (RGB[]|null)[][] = [];
for (let gy=0; gy<NY; gy++) { const row: (RGB[]|null)[] = []; for (let gx=0; gx<NX; gx++) {
  const x0 = Math.round(l+gx*cw), x1 = Math.round(l+(gx+1)*cw)-1, y0 = Math.round(t+gy*ch), y1 = Math.round(t+(gy+1)*ch)-1;
  const list: RGB[] = []; let op=0, tot=0;
  for (let y=y0; y<=y1; y++) for (let x=x0; x<=x1; x++) { tot++; const [pr,pg,pb,pa] = px(x,y); if (pa>=128) { op++; list.push([pr,pg,pb]); } }
  row.push(op/tot >= 0.4 ? list : null); } cellPixels.push(row); }
const all = cellPixels.flat().filter((v): v is RGB[] => v!==null).flat();
const palette = quantize(all, K);
const order = palette.map((p,i) => i).sort((a,b) => luma(palette[a]) - luma(palette[b])); // 어두운 순 a,b,c...
const CH = 'abcdefghijklmnop';
const charOf = new Map<number,string>(); order.forEach((pi, k) => charOf.set(pi, CH[k]));
const nearest = (c: RGB) => { let bi=0, bd=Infinity; palette.forEach((p,i) => { const d = dist2(p,c); if (d<bd) { bd=d; bi=i; } }); return bi; };
const modeOf = (list: RGB[]) => { const cnt = new Map<number,number>(); for (const p of list) { const i = nearest(p); cnt.set(i,(cnt.get(i)??0)+1); } return [...cnt.entries()].sort((a,b) => b[1]-a[1])[0][0]; };
const art = cellPixels.map(row => row.map(list => list ? charOf.get(modeOf(list))! : '.').join(''));
const empty = emptyArg ?? '';
const grid = art.map(row => [...row].map(c => c==='.' || empty.includes(c) ? 0 : 1));
// NOSOLVE=1 이면 솔버를 건너뛴다 (큰 격자에서 복수해 탐색이 오래 걸릴 때 미리보기용)
const res = process.env.NOSOLVE ? { solutions: 0, logicOnly: false, grid: null } : solveNonogram(grid.map(lineClues), grid[0].map((_,c) => lineClues(grid.map(rw => rw[c]))), 5000);
const status = process.env.NOSOLVE ? 'NOSOLVE' : res.solutions === 1 ? (res.logicOnly ? 'UNIQUE+LOGIC' : 'UNIQUE(guess)') : `MULTI(${res.solutions})`;
const fill = grid.flat().reduce((s,v)=>s+v,0)/(NX*NY);
console.log(`${NX}x${NY} ${status} fill ${(fill*100).toFixed(0)}%`);
order.forEach((pi,k) => { const cnt = art.join('').split(CH[k]).length-1; console.log(`  ${CH[k]} ${hex(palette[pi])} luma ${luma(palette[pi]).toFixed(2)} n=${cnt}`); });
console.log(art.join('\n'));
console.log(grid.map(rw => rw.map(v => v?'█':'·').join('')).join('\n'));
if (res.solutions >= 2 && res.grid) console.log('alt:\n' + res.grid.map((row,r) => row.map((v,c) => v===grid[r][c] ? (v?'#':'.') : v?'+':'-').join('')).join('\n'));
console.log('PALETTE ' + order.map((pi,k) => `${CH[k]}: '${hex(palette[pi])}'`).join(', '));
if (idArg) {
  const pal = order.map((pi, k) => `${CH[k]}: '${hex(palette[pi])}'`).join(', ');
  const lines = [
    'SNIPPET', '  {', `    id: '${idArg}',`, `    name: '${nameArg ?? idArg}',`, "    background: '#f5f9ff',",
    `    palette: { ${pal} },`,
  ];
  if (empty) lines.push(`    emptyChars: '${empty}',`);
  if (imageArg) lines.push(`    image: '${imageArg}',`);
  lines.push('    art: [', ...art.map(row => `      '${row}',`), '    ],', `  }, // ${status}`);
  console.log(lines.join('\n'));
}
