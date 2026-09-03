// 픽셀아트 타일시트(투명 배경 PNG) → 노노그램 후보 추출 + 유일해 판정
//   npx tsx scripts/nonogram-from-tilesheet.ts <sheet.png> <tile> [gap] [outDir]
// 각 타일을 alpha 기준으로 채움/빈칸 그리드로 만들고, 빈 여백을 잘라낸 뒤
// 솔버로 "유일해 + 줄 논리만으로 풀림" 여부를 판정해 통계와 JSON을 출력한다.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { solveNonogram } from '../src/features/nonogram/utils/solver';
import { lineClues } from '../src/features/nonogram/data/levels';

const [sheetPath, tileArg, gapArg, outDir] = process.argv.slice(2);
if (!sheetPath || !tileArg) {
  console.error('usage: nonogram-from-tilesheet.ts <sheet.png> <tile> [gap=0] [outDir]');
  process.exit(1);
}
const TILE = Number(tileArg);
const GAP = Number(gapArg ?? 0);

const png = PNG.sync.read(fs.readFileSync(sheetPath));
const cols = Math.floor((png.width + GAP) / (TILE + GAP));
const rows = Math.floor((png.height + GAP) / (TILE + GAP));

type Candidate = {
  index: number; col: number; row: number;
  w: number; h: number; fill: number;
  art: string[]; unique: boolean; logicOnly: boolean;
};

function tileGrid(tc: number, tr: number): number[][] {
  const g: number[][] = [];
  for (let y = 0; y < TILE; y++) {
    const line: number[] = [];
    for (let x = 0; x < TILE; x++) {
      const px = tc * (TILE + GAP) + x;
      const py = tr * (TILE + GAP) + y;
      const i = (py * png.width + px) * 4;
      line.push(png.data[i + 3] > 127 ? 1 : 0);
    }
    g.push(line);
  }
  return g;
}

/** 채움이 있는 최소 사각형으로 잘라냄 */
function crop(g: number[][]): number[][] | null {
  let top = -1, bottom = -1, left = TILE, right = -1;
  g.forEach((row, r) => row.forEach((v, c) => {
    if (!v) return;
    if (top < 0) top = r;
    bottom = r;
    if (c < left) left = c;
    if (c > right) right = c;
  }));
  if (top < 0) return null;
  return g.slice(top, bottom + 1).map(row => row.slice(left, right + 1));
}

const results: Candidate[] = [];
for (let tr = 0; tr < rows; tr++) {
  for (let tc = 0; tc < cols; tc++) {
    const index = tr * cols + tc;
    const cropped = crop(tileGrid(tc, tr));
    if (!cropped) continue;
    const h = cropped.length, w = cropped[0].length;
    const cells = w * h;
    const filled = cropped.flat().reduce((s, v) => s + v, 0);
    const fill = filled / cells;
    // 너무 작거나, 거의 꽉 찼거나(지형 타일), 너무 성긴 것은 그림으로 부적합
    if (w < 5 || h < 5 || fill > 0.85 || fill < 0.15) continue;
    const rowClues = cropped.map(lineClues);
    const colClues = cropped[0].map((_, c) => lineClues(cropped.map(r => r[c])));
    const res = solveNonogram(rowClues, colClues);
    results.push({
      index, col: tc, row: tr, w, h, fill: Math.round(fill * 100) / 100,
      art: cropped.map(r => r.map(v => (v ? 'b' : '.')).join('')),
      unique: res.solutions === 1, logicOnly: res.solutions === 1 && res.logicOnly,
    });
  }
}

const total = rows * cols;
const unique = results.filter(r => r.unique);
const logic = results.filter(r => r.logicOnly);
console.log(`sheet: ${cols}×${rows} = ${total} tiles`);
console.log(`candidates (5~${TILE}px, 15~85% filled): ${results.length}`);
console.log(`  unique solution: ${unique.length}`);
console.log(`  unique & line-logic only (사람이 풀 수 있는 난이도): ${logic.length}`);
const bySize: Record<string, number> = {};
for (const r of logic) { const k = `${r.w}×${r.h}`; bySize[k] = (bySize[k] ?? 0) + 1; }
console.log('  logic-only by size:', Object.entries(bySize).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}:${v}`).join(' '));

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify(results, null, 1));
  // 미리보기: 논리만으로 풀리는 것들을 텍스트로
  const preview = logic.map(r => `#${r.index} (${r.w}×${r.h}, fill ${r.fill})\n${r.art.map(l => l.replace(/b/g, '█').replace(/\./g, '·')).join('\n')}`).join('\n\n');
  fs.writeFileSync(path.join(outDir, 'preview.txt'), preview);
  console.log(`written: ${outDir}/candidates.json, preview.txt`);
}
