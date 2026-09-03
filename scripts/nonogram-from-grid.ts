// 실제로 격자선이 그려진 픽셀아트 참고 이미지 전용 변환기.
// nonogram-from-image.ts 는 격자가 없는 "부드러운 픽셀아트 스타일" 이미지에 맞춰
// 임의 크기로 리샘플링하는데, 이 이미지처럼 진짜 격자선이 있으면 그 선(회색)이
// 손잡이 같은 실제 색과 혼동돼 결과가 깨진다. 대신 격자선 위치를 직접 감지해
// 셀 중앙 픽셀만 그대로 읽는다.
//   npx tsx scripts/nonogram-from-grid.ts <image.png> <name> [outFile]
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';

const [imgPath, name, outFile] = process.argv.slice(2);
if (!imgPath || !name) {
  console.error('usage: nonogram-from-grid.ts <image.png> <name> [outFile]');
  process.exit(1);
}

const png = PNG.sync.read(fs.readFileSync(imgPath));
const W = png.width, H = png.height;
const px = (x: number, y: number): [number, number, number, number] => {
  const i = (y * W + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
};

type RGB = [number, number, number];
const dist2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const luma = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** 여러 줄에서 밝기 급변 위치를 누적 투표해 격자선 좌표를 찾는다 */
function detectLines(size: number, otherSize: number, isRow: boolean): number[] {
  const hist = new Array(size).fill(0);
  for (let o = 10; o < otherSize - 10; o += 7) {
    for (let i = 1; i < size - 1; i++) {
      const c = isRow ? px(o, i) : px(i, o);
      const c0 = isRow ? px(o, i - 1) : px(i - 1, o);
      if (c[3] < 10) continue;
      const d = Math.abs(c[0] - c0[0]) + Math.abs(c[1] - c0[1]) + Math.abs(c[2] - c0[2]);
      if (d > 15) hist[i]++;
    }
  }
  const peaks: number[] = [];
  for (let i = 1; i < size - 1; i++) if (hist[i] >= 6 && hist[i] >= hist[i - 1] && hist[i] >= hist[i + 1]) peaks.push(i);
  const merged: number[] = [];
  for (const p of peaks) { if (merged.length && p - merged[merged.length - 1] < 10) continue; merged.push(p); }
  return merged;
}

const xLines = detectLines(W, H, false);
const yLines = detectLines(H, W, true);
const NX = xLines.length - 1, NY = yLines.length - 1;
console.log(`grid detected: ${NX}×${NY}`);

// 각 셀 중앙 30% 영역 평균색
const cells: RGB[][] = [];
for (let gy = 0; gy < NY; gy++) {
  const row: RGB[] = [];
  const y0 = yLines[gy], y1 = yLines[gy + 1];
  for (let gx = 0; gx < NX; gx++) {
    const x0 = xLines[gx], x1 = xLines[gx + 1];
    const sx0 = Math.round(x0 + (x1 - x0) * 0.35), sx1 = Math.round(x0 + (x1 - x0) * 0.65);
    const sy0 = Math.round(y0 + (y1 - y0) * 0.35), sy1 = Math.round(y0 + (y1 - y0) * 0.65);
    let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) { const [r, g, b, a] = px(x, y); sr += r; sg += g; sb += b; sa += a; n++; }
    row.push([sr / n, sg / n, sb / n]);
    row[row.length - 1] = sa / n < 200 ? [255, 255, 255] : row[row.length - 1]; // 투명은 흰 배경 취급
  }
  cells.push(row);
}

// 팔레트: farthest-point 방식으로 원색 위주로 뽑기
function quantize(colors: RGB[], k: number): RGB[] {
  const uniq = new Map<string, { c: RGB; n: number }>();
  for (const c of colors) { const key = c.map(v => Math.round(v / 8)).join(','); const e = uniq.get(key); if (e) e.n++; else uniq.set(key, { c, n: 1 }); }
  const pts = [...uniq.values()].sort((a, b) => b.n - a.n);
  const total = pts.reduce((s, p) => s + p.n, 0);
  const candidates = pts.filter(p => p.n / total >= 0.004);
  const centers: RGB[] = [pts[0].c];
  while (centers.length < k && candidates.length > centers.length) {
    let best: RGB | null = null, bestD = -1;
    for (const p of candidates) { const d = Math.min(...centers.map(c => dist2(c, p.c))); if (d > bestD) { bestD = d; best = p.c; } }
    if (!best || bestD < 20 ** 2) break;
    centers.push(best);
  }
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of pts) { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const d = dist2(c, p.c); if (d < bd) { bd = d; bi = i; } }); sums[bi][0] += p.c[0] * p.n; sums[bi][1] += p.c[1] * p.n; sums[bi][2] += p.c[2] * p.n; sums[bi][3] += p.n; }
    centers.forEach((c, i) => { if (sums[i][3]) centers[i] = [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]]; });
  }
  return centers;
}

const palette = quantize(cells.flat(), 8);
const nearest = (c: RGB) => { let bi = 0, bd = Infinity; palette.forEach((p, i) => { const d = dist2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi; };
const map = cells.map(row => row.map(nearest));

// 배경 = 가장 흔한 색 (흰 배경이 압도적으로 많음)
const counts = new Array(palette.length).fill(0);
map.flat().forEach(i => counts[i]++);
const bgIdx = counts.indexOf(Math.max(...counts));

const CHARS = 'abcdefghijklmnop';
const charOf = new Map<number, string>();
let ci = 0;
palette.forEach((_, i) => { if (i !== bgIdx) charOf.set(i, CHARS[ci++]); });
const art = map.map(row => row.map(i => (i === bgIdx ? '.' : charOf.get(i)!)).join(''));

const grid = art.map(row => [...row].map(c => (c === '.' ? 0 : 1)));
const fill = grid.flat().reduce((s, v) => s + v, 0) / (NX * NY);
const res = solveNonogram(grid.map(lineClues), grid[0].map((_, c) => lineClues(grid.map(r => r[c]))));
const status = res.solutions === 1 ? (res.logicOnly ? '✓ 유일해·논리풀이' : '△ 유일해·추측필요') : '✗ 복수해';
console.log(`${name}: ${status} · ${NX}×${NY} · 채움 ${(fill * 100).toFixed(0)}% · 팔레트 ${palette.length}색`);
console.log(art.map(r => r.replace(/[^.]/g, '█').replace(/\./g, '·')).join('\n'));

if (outFile) {
  const pal = [...charOf.entries()].map(([i, c]) => `${c}: '${hex(palette[i])}'`).join(', ');
  const idSafe = name.replace(/[^a-z0-9]/gi, '') || 'tile';
  const block = `  {\n    id: '${idSafe}',\n    name: '${name}',\n    background: '${hex(palette[bgIdx])}',\n    palette: { ${pal} },\n    art: [\n${art.map(r => `      '${r}',`).join('\n')}\n    ],\n  }, // ${status}\n`;
  fs.writeFileSync(outFile, block);
  console.log('written', outFile);
}
