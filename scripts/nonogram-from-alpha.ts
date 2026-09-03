// 투명 배경 PNG(진짜 하드엣지 픽셀아트, 격자선 없음) 전용 변환기.
// 알파 채널로 각 타일(또는 전체 이미지)의 실루엣 경계 상자를 직접 구하고,
// 그 안을 N×N(비율 유지)으로 나눠 각 칸의 불투명 픽셀 다수결 색을 취한다.
// 배경 추정·반복 재크롭 같은 휴리스틱을 쓰지 않아 nonogram-from-image.ts보다 안정적이다.
//   npx tsx scripts/nonogram-from-alpha.ts <image.png> <cols>x<rows> <N> <name1,name2,...> [outFile]
//   단일 이미지면 레이아웃에 1x1
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';

const [imgPath, layoutArg, nArg, namesArg, outFile] = process.argv.slice(2);
if (!imgPath || !layoutArg || !nArg) {
  console.error('usage: nonogram-from-alpha.ts <image.png> <cols>x<rows> <N> <names,comma> [outFile]');
  process.exit(1);
}
const [TC, TR] = layoutArg.split('x').map(Number);
const N = Number(nArg);
const names = (namesArg ?? '').split(',').filter(Boolean);
const ALPHA_MIN = 128;
// MODE=dark: 명암 기준(원칙 1,2) — 배경(알파)뿐 아니라 "밝은 색"도 빈 칸(emptyChars) 처리.
// 실루엣 전체를 채우는 대신 어두운 부분(윤곽선·그림자)만 채워져서 그림이 자연스럽게 선화처럼 나온다.
const MODE = process.env.MODE ?? 'silhouette';
const LUMA_THRESHOLD = Number(process.env.LUMA ?? 0.55); // 이보다 밝으면(명도 0~1) 빈 칸

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

const CHARS = 'abcdefghijklmnop';
const out: string[] = [];
let idx = 0;
for (let tr = 0; tr < TR; tr++) for (let tc = 0; tc < TC; tc++, idx++) {
  const tx0 = Math.floor((tc * W) / TC), tx1 = Math.floor(((tc + 1) * W) / TC);
  const ty0 = Math.floor((tr * H) / TR), ty1 = Math.floor(((tr + 1) * H) / TR);
  const name = names[idx] ?? `tile${idx}`;

  // 이 타일 안에서 실루엣 경계 상자 (알파 기준)
  let l = tx1, r = tx0, t = ty1, b = ty0;
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) {
    if (px(x, y)[3] >= ALPHA_MIN) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  }
  if (r < l || b < t) { console.log(`tile ${idx} ${name}: empty`); continue; }

  const bw = r - l + 1, bh = b - t + 1;
  const NX = bw >= bh ? N : Math.max(5, Math.round((N * bw) / bh));
  const NY = bh >= bw ? N : Math.max(5, Math.round((N * bh) / bw));
  const cw = bw / NX, ch = bh / NY;

  const cellPixels: (RGB[] | null)[][] = [];
  for (let gy = 0; gy < NY; gy++) {
    const row: (RGB[] | null)[] = [];
    for (let gx = 0; gx < NX; gx++) {
      const x0 = Math.round(l + gx * cw), x1 = Math.round(l + (gx + 1) * cw) - 1;
      const y0 = Math.round(t + gy * ch), y1 = Math.round(t + (gy + 1) * ch) - 1;
      const list: RGB[] = [];
      let opaque = 0, total = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        total++;
        const [pr, pg, pb, pa] = px(x, y);
        if (pa >= ALPHA_MIN) { opaque++; list.push([pr, pg, pb]); }
      }
      row.push(opaque / total >= 0.4 ? list : null);
    }
    cellPixels.push(row);
  }

  const allOpaque = cellPixels.flat().filter((v): v is RGB[] => v !== null).flat();
  const palette = quantize(allOpaque, 8);
  const nearest = (c: RGB) => { let bi = 0, bd = Infinity; palette.forEach((p, i) => { const d = dist2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const modeOf = (list: RGB[]) => { const cnt = new Map<number, number>(); for (const p of list) { const i = nearest(p); cnt.set(i, (cnt.get(i) ?? 0) + 1); } return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0]; };
  const map = cellPixels.map(row => row.map(list => (list ? modeOf(list) : -1)));

  const charOf = new Map<number, string>();
  palette.forEach((_, i) => charOf.set(i, CHARS[i]));
  const art = map.map(row => row.map(i => (i < 0 ? '.' : charOf.get(i)!)).join(''));

  // MODE=dark: 밝은 팔레트 색은 emptyChars 처리 — 배경뿐 아니라 하이라이트도 빈 칸이 되어
  // 어두운 윤곽선·그림자만 채워지는 "명암 기반" 그림이 된다 (원칙: 배경 + 밝은 영역 = 빈 칸)
  const lightChars = MODE === 'dark'
    ? [...charOf.entries()].filter(([i]) => luma(palette[i]) >= LUMA_THRESHOLD).map(([, c]) => c).join('')
    : '';

  const isEmpty = (ch: string) => ch === '.' || lightChars.includes(ch);
  const grid = art.map(row => [...row].map(c => (isEmpty(c) ? 0 : 1)));
  const fill = grid.flat().reduce((s, v) => s + v, 0) / (NX * NY);
  const res = solveNonogram(grid.map(lineClues), grid[0].map((_, c) => lineClues(grid.map(rw => rw[c]))));
  const status = res.solutions === 1 ? (res.logicOnly ? '✓ 유일해·논리풀이' : '△ 유일해·추측필요') : '✗ 복수해';
  console.log(`tile ${idx} ${name}: ${status} · ${NX}×${NY} · 채움 ${(fill * 100).toFixed(0)}% · 팔레트 ${palette.length}색${MODE === 'dark' ? ` · 빈칸문자 '${lightChars}'` : ''}`);
  console.log(art.map(row => [...row].map(ch => (ch === '.' ? '·' : isEmpty(ch) ? '░' : '█')).join('')).join('\n'));

  const pal = [...charOf.entries()].map(([i, c]) => `${c}: '${hex(palette[i])}'`).join(', ');
  const idSafe = name.replace(/[^a-z0-9]/gi, '') || `tile${idx}`;
  const emptyLine = lightChars ? `\n    emptyChars: '${lightChars}',` : '';
  out.push(`  {\n    id: '${idSafe}',\n    name: '${name}',\n    background: '#f5f9ff',\n    palette: { ${pal} },${emptyLine}\n    art: [\n${art.map(row => `      '${row}',`).join('\n')}\n    ],\n  }, // ${status}`);
}
if (outFile) { fs.writeFileSync(outFile, out.join('\n')); console.log('written', outFile); }
