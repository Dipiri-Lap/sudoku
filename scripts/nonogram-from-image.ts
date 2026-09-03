// 컬러 픽셀아트 이미지(격자 정렬이 안 된 AI 생성물 포함) → N×N 노노그램 레벨 변환
//   npx tsx scripts/nonogram-from-image.ts <image.png> <cols>x<rows>(타일 배치) <N> [names,comma] [outFile]
//   예) npx tsx scripts/nonogram-from-image.ts public/images/nonogram/animals.png 3x3 20 시바견,고양이,판다,사자,펭귄,토끼,코끼리,기린,여우
//
// 방식:
//  1. 이미지를 타일 배치(cols×rows)로 등분하고, 각 타일 안에서 흰 여백을 잘라낸다.
//  2. 잘라낸 영역을 N×N 격자로 보고 각 칸의 "중앙 근처" 픽셀을 평균내 색을 정한다.
//     (격자가 살짝 어긋난 AI 이미지도 중앙 샘플링이면 경계 번짐을 피할 수 있다)
//  3. 색을 팔레트로 양자화(최대 8색)하고, 어두운 색(휘도 < 임계)은 채움, 밝은 색은 빈칸(emptyChars)으로 둔다.
//     → 퍼즐은 윤곽·눈·코 위주로 풀리고, 완성 시 전체 컬러가 칠해진다.
//  4. 솔버로 유일해/논리 풀이 여부를 판정하고 levels.ts 에 붙일 수 있는 TS 조각을 출력한다.
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';

const [imgPath, layoutArg, nArg, namesArg, outFile] = process.argv.slice(2);
if (!imgPath || !layoutArg || !nArg) {
  console.error('usage: nonogram-from-image.ts <image.png> <cols>x<rows> <N> [names,comma] [outFile]');
  process.exit(1);
}
const [TC, TR] = layoutArg.split('x').map(Number);
const N = Number(nArg);
const names = (namesArg ?? '').split(',').filter(Boolean);
// MODE=dark: 어두운 색만 채움(윤곽 퍼즐) / MODE=silhouette(기본): 배경이 아니면 전부 채움(실루엣 퍼즐)
const MODE = process.env.MODE ?? 'silhouette';
const DARK_LUMA = MODE === 'dark' ? 0.45 : 2; // luma는 0~1이므로 2면 아무 색도 빈칸이 되지 않음
const BG_WHITE = 235;        // 이보다 밝으면 타일 바깥 여백(흰색)으로 간주
const PALETTE_MAX = Number(process.env.PALETTE ?? 6); // 색이 많을수록 혼합색(안티앨리어싱)이 팔레트에 끼어든다
const RARE_SHARE = 0.015;                               // 이 비율 미만으로 쓰인 색은 가까운 색으로 병합

const png = PNG.sync.read(fs.readFileSync(imgPath));
const W = png.width, H = png.height;
const px = (x: number, y: number) => {
  const i = (y * W + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]] as const;
};
const isWhite = (x: number, y: number) => {
  const [r, g, b, a] = px(x, y);
  return a < 20 || (r > BG_WHITE && g > BG_WHITE && b > BG_WHITE);
};

type RGB = [number, number, number];
const luma = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hex = ([r, g, b]: RGB) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const dist2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** 간단 k-means 팔레트 양자화 */
function quantize(colors: RGB[], k: number): RGB[] {
  const uniq = new Map<string, { c: RGB; n: number }>();
  for (const c of colors) {
    const key = c.map(v => Math.round(v / 8)).join(',');
    const e = uniq.get(key);
    if (e) e.n++; else uniq.set(key, { c, n: 1 });
  }
  const pts = [...uniq.values()].sort((a, b) => b.n - a.n);
  const total = pts.reduce((s, p) => s + p.n, 0);
  // 초기 중심: 가장 흔한 색에서 시작해, 기존 중심들과 가장 멀리 떨어진 색을 하나씩 추가 (farthest-point).
  // 빈도순으로만 고르면 면적이 작은 원색(귀 안쪽 분홍)이 흰색 변주 등에 밀려 팔레트에서 빠진다.
  const candidates = pts.filter(p => p.n / total >= 0.004);
  let centers: RGB[] = [pts[0].c];
  while (centers.length < k && candidates.length > centers.length) {
    let best: RGB | null = null, bestD = -1;
    for (const p of candidates) {
      const d = Math.min(...centers.map(c => dist2(c, p.c)));
      if (d > bestD) { bestD = d; best = p.c; }
    }
    if (!best || bestD < 20 ** 2) break; // 더 이상 뚜렷이 다른 색이 없음
    centers.push(best);
  }
  for (let iter = 0; iter < 12; iter++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      centers.forEach((c, i) => { const d = dist2(c, p.c); if (d < bd) { bd = d; bi = i; } });
      sums[bi][0] += p.c[0] * p.n; sums[bi][1] += p.c[1] * p.n; sums[bi][2] += p.c[2] * p.n; sums[bi][3] += p.n;
    }
    centers = sums.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] as RGB : centers[i]));
  }
  return centers;
}

const CHARS = 'abcdefghijklmnop';
const out: string[] = [];
let idx = 0;
for (let tr = 0; tr < TR; tr++) for (let tc = 0; tc < TC; tc++, idx++) {
  const x0 = Math.floor((tc * W) / TC), x1 = Math.floor(((tc + 1) * W) / TC);
  const y0 = Math.floor((tr * H) / TR), y1 = Math.floor(((tr + 1) * H) / TR);
  // 여백 크롭
  let l = x1, r = x0, t = y1, b = y0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!isWhite(x, y)) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  if (r <= l || b <= t) { console.log(`tile ${idx}: empty`); continue; }
  /** 픽셀 영역 [l..r]×[t..b] 를 NX×NY 로 샘플링해 문자 그리드/팔레트를 만든다 */
  const analyze = (l: number, t: number, r: number, b: number, NX: number, NY: number) => {
    const cw = (r - l + 1) / NX, ch = (b - t + 1) / NY;
    // 각 칸의 중앙 50% 영역 픽셀들을 모아 둔다 (평균은 흰색 판정용, 픽셀 목록은 다수결 색 판정용)
    const cells: RGB[][] = [];
    const cellPixels: RGB[][][] = [];
    for (let gy = 0; gy < NY; gy++) {
      const row: RGB[] = [];
      const rowPx: RGB[][] = [];
      for (let gx = 0; gx < NX; gx++) {
        const sx0 = Math.round(l + gx * cw + cw * 0.25), sx1 = Math.round(l + gx * cw + cw * 0.75);
        const sy0 = Math.round(t + gy * ch + ch * 0.25), sy1 = Math.round(t + gy * ch + ch * 0.75);
        let sr = 0, sg = 0, sb = 0, n = 0;
        const list: RGB[] = [];
        for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) {
          // 완전 투명 픽셀은 흰 배경으로 취급 — 그렇지 않으면 저장된 RGB(흔히 0,0,0)가 검정으로 잘못 읽힌다
          let [pr, pg, pb, pa] = px(x, y);
          if (pa < 20) { pr = 255; pg = 255; pb = 255; }
          sr += pr; sg += pg; sb += pb; n++; list.push([pr, pg, pb]);
        }
        row.push([sr / n, sg / n, sb / n]);
        rowPx.push(list);
      }
      cells.push(row);
      cellPixels.push(rowPx);
    }

    // 타일 바깥 흰색(둥근 모서리, 상하 여백) = 테두리에서 흰 칸으로만 이어지는 영역 (flood fill)
    // 그림 안쪽의 흰색(판다 얼굴, 고양이 가슴)은 진짜 색으로 남긴다
    const isWhiteCell = (c: RGB) => c[0] > BG_WHITE && c[1] > BG_WHITE && c[2] > BG_WHITE;
    const outside = cells.map(row => row.map(() => false));
    const stack: [number, number][] = [];
    for (let i = 0; i < Math.max(NX, NY); i++) for (const [y, x] of [[0, i], [NY - 1, i], [i, 0], [i, NX - 1]] as [number, number][]) {
      if (y >= NY || x >= NX) continue;
      if (isWhiteCell(cells[y][x]) && !outside[y][x]) { outside[y][x] = true; stack.push([y, x]); }
    }
    while (stack.length) {
      const [y, x] = stack.pop()!;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || nx < 0 || ny >= NY || nx >= NX || outside[ny][nx] || !isWhiteCell(cells[ny][nx])) continue;
        outside[ny][nx] = true; stack.push([ny, nx]);
      }
    }
    // 팔레트는 "칸 평균"이 아니라 타일 안쪽의 실제 픽셀들로 만든다 → 혼합색이 아닌 원색 위주로 잡힘
    const inside: RGB[] = [];
    cellPixels.forEach((row, y) => row.forEach((list, x) => { if (!outside[y][x]) list.forEach((p, i) => { if (i % 3 === 0) inside.push(p); }); }));
    const palette = quantize(inside, PALETTE_MAX);
    const nearest = (c: RGB) => { let bi = 0, bd = Infinity; palette.forEach((p, i) => { const d = dist2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi; };
    // 칸 색 = 칸 안 픽셀들을 팔레트에 매핑한 뒤 다수결 → 경계에 걸친 칸도 어느 한쪽의 원색이 된다
    const modeOf = (list: RGB[]) => { const cnt = new Map<number, number>(); for (const p of list) { const i = nearest(p); cnt.set(i, (cnt.get(i) ?? 0) + 1); } return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0]; };
    const map = cellPixels.map((row, y) => row.map((list, x) => (outside[y][x] ? -1 : modeOf(list))));
    // 희귀색 병합: 거의 안 쓰인 팔레트 색(안티앨리어싱 잔재)은 가장 가까운 다른 색으로.
    // 단, 가장 어두운 색은 병합하지 않는다 — 눈·코 같은 디테일은 원래 면적이 작아서
    // 희귀색 기준에 걸리기 쉬운데, 그걸 지우면 표정이 통째로 사라진다.
    {
      const darkestIdx = palette.reduce((bi, p, i) => (luma(p) < luma(palette[bi]) ? i : bi), 0);
      const total = map.flat().filter(i => i >= 0).length;
      const counts = new Array(palette.length).fill(0);
      map.flat().forEach(i => { if (i >= 0) counts[i]++; });
      const redirect = palette.map((_, i) => i);
      palette.forEach((p, i) => {
        if (i === darkestIdx || counts[i] / total >= RARE_SHARE) return;
        let bi = -1, bd = Infinity;
        palette.forEach((q, j) => { if (j !== i && counts[j] / total >= RARE_SHARE) { const d = dist2(p, q); if (d < bd) { bd = d; bi = j; } } });
        if (bi >= 0) redirect[i] = bi;
      });
      map.forEach(row => row.forEach((i, x) => { if (i >= 0) row[x] = redirect[i]; }));
    }
    // 고립 셀 정리(despeckle): 상하좌우에 같은 색이 하나도 없는 칸은 주변 8칸의 다수 색으로.
    // 단, 가장 어두운 색(눈·코 같은 점 디테일)은 보호한다.
    {
      const darkest = palette.reduce((bi, p, i) => (luma(p) < luma(palette[bi]) ? i : bi), 0);
      const snapshot = map.map(row => [...row]);
      snapshot.forEach((row, y) => row.forEach((i, x) => {
        if (i < 0 || i === darkest) return;
        const four = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dy, dx]) => snapshot[y + dy]?.[x + dx]).filter(v => v !== undefined);
        if (four.some(v => v === i)) return;
        const cnt = new Map<number, number>();
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const v = snapshot[y + dy]?.[x + dx]; if (v !== undefined && v >= 0) cnt.set(v, (cnt.get(v) ?? 0) + 1);
        }
        const best = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best) map[y][x] = best[0];
      }));
    }
    // 배경 = 타일 안쪽 테두리 링에서 가장 흔한 색 (몸통이 커도 배경으로 오인하지 않도록)
    const ringCounts = new Array(palette.length).fill(0);
    map.forEach((row, y) => row.forEach((i, x) => { if (i >= 0 && (y === 0 || y === NY - 1 || x === 0 || x === NX - 1)) ringCounts[i]++; }));
    const bgIdx = ringCounts.indexOf(Math.max(...ringCounts));
    // 배경과 비슷한 색(그라데이션·안티앨리어싱으로 쪼개진 것)은 배경으로 합침
    const BG_MERGE = 30 ** 2; // 너무 크면 귀 안쪽 분홍처럼 배경과 비슷한 원색까지 배경으로 먹힌다
    const isBg = palette.map((p, i) => i === bgIdx || dist2(p, palette[bgIdx]) < BG_MERGE);
    const charOf = new Map<number, string>();
    let ci = 0;
    palette.forEach((_, i) => { if (!isBg[i]) charOf.set(i, CHARS[ci++]); });
    const artCells = map.map(row => row.map(i => (i < 0 || isBg[i] ? '.' : charOf.get(i)!)));
    // 둥근 모서리 잔여물: 테두리 링에서 상하좌우 이웃이 모두 빈 칸인 고립 셀은 지움
    artCells.forEach((row, y) => row.forEach((ch, x) => {
      if (ch === '.' || (y > 0 && y < NY - 1 && x > 0 && x < NX - 1)) return;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dy, dx]) => artCells[y + dy]?.[x + dx] && artCells[y + dy][x + dx] !== '.');
      if (!nb) row[x] = '.';
    }));
    return { artCells, palette, bgIdx, charOf, cw, ch, NX, NY };
  };

  // 크롭 상자는 격자 단위로만 알 수 있어 한 번에 딱 맞지 않으므로, 네 변에 모두 채움이 닿을 때까지 몇 번 조여 간다.
  // 실루엣이 정사각형이 아니면 긴 변을 N 으로 두고 짧은 변은 비율대로 줄인다 (예: 20×18) — 억지로 정사각형을
  // 만들면 짧은 변 쪽에 배경만 있는 줄이 생긴다.
  let cl = l, ct = t, cr = r, cb = b;
  let pass = analyze(cl, ct, cr, cb, N, N);
  for (let iter = 0; iter < 5; iter++) {
    const { NX, NY } = pass;
    let minX = NX, maxX = -1, minY = NY, maxY = -1;
    pass.artCells.forEach((row, y) => row.forEach((ch, x) => { if (ch !== '.') { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }));
    if (maxX < 0 || (minX === 0 && minY === 0 && maxX === NX - 1 && maxY === NY - 1)) break;
    const nl = Math.max(l, Math.round(cl + minX * pass.cw)), nr = Math.min(r, Math.round(cl + (maxX + 1) * pass.cw) - 1);
    const nt = Math.max(t, Math.round(ct + minY * pass.ch)), nb = Math.min(b, Math.round(ct + (maxY + 1) * pass.ch) - 1);
    if (nl === cl && nt === ct && nr === cr && nb === cb) break; // 더 조여지지 않음
    [cl, ct, cr, cb] = [nl, nt, nr, nb];
    const w = cr - cl + 1, h = cb - ct + 1;
    const nx = w >= h ? N : Math.max(5, Math.round((N * w) / h));
    const ny = h >= w ? N : Math.max(5, Math.round((N * h) / w));
    pass = analyze(cl, ct, cr, cb, nx, ny);
  }
  const { artCells, palette, bgIdx, charOf } = pass;
  const art = artCells.map(row => row.join(''));
  const emptyChars = [...charOf.entries()].filter(([i]) => luma(palette[i]) >= DARK_LUMA).map(([, c]) => c).join('');
  const grid = art.map(row => [...row].map(c => (c !== '.' && !emptyChars.includes(c) ? 1 : 0)));
  const fill = grid.flat().reduce((s, v) => s + v, 0) / (grid.length * grid[0].length);
  const res = solveNonogram(grid.map(lineClues), grid[0].map((_, c) => lineClues(grid.map(rw => rw[c]))));
  const status = res.solutions === 1 ? (res.logicOnly ? '✓ 유일해·논리풀이' : '△ 유일해·추측필요') : '✗ 복수해';
  const name = names[idx] ?? `tile${idx}`;
  console.log(`tile ${idx} ${name}: ${status} · ${grid[0].length}×${grid.length} · 채움 ${(fill * 100).toFixed(0)}% · 팔레트 ${palette.length}색`);
  console.log(grid.map(rw => rw.map(v => (v ? '█' : '·')).join('')).join('\n'));

  const pal = [...charOf.entries()].map(([i, c]) => `${c}: '${hex(palette[i])}'`).join(', ');
  out.push(`  {\n    id: '${name.replace(/[^a-z0-9]/gi, '') || 'tile' + idx}',\n    name: '${name}',\n    background: '${hex(palette[bgIdx])}',\n    palette: { ${pal} },\n${emptyChars ? `    emptyChars: '${emptyChars}',\n` : ''}    art: [\n${art.map(rw => `      '${rw}',`).join('\n')}\n    ],\n  }, // ${status}`);
}
if (outFile) { fs.writeFileSync(outFile, out.join('\n')); console.log('written', outFile); }
