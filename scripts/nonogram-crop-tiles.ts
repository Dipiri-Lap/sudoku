// 타일시트 이미지를 격자로 나눠 타일별 PNG 로 잘라 저장한다 (완성 일러스트용).
//   npx tsx scripts/nonogram-crop-tiles.ts <sheet.png> <cols>x<rows> <outDir> <name1,name2,...>
// 각 타일 안의 흰 여백은 잘라내고 몇 픽셀만 남긴다.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [sheetPath, layout, outDir, namesArg] = process.argv.slice(2);
if (!sheetPath || !layout || !outDir || !namesArg) {
  console.error('usage: nonogram-crop-tiles.ts <sheet.png> <cols>x<rows> <outDir> <names,comma>');
  process.exit(1);
}
const [TC, TR] = layout.split('x').map(Number);
const names = namesArg.split(',');
const PAD = Number(process.env.PAD ?? 0);
const INSET = Number(process.env.INSET ?? 0);
const BG_WHITE = 235;

const png = PNG.sync.read(fs.readFileSync(sheetPath));
const W = png.width, H = png.height;
const isWhite = (x: number, y: number) => {
  const i = (y * W + x) * 4;
  return png.data[i + 3] < 20 || (png.data[i] > BG_WHITE && png.data[i + 1] > BG_WHITE && png.data[i + 2] > BG_WHITE);
};

fs.mkdirSync(outDir, { recursive: true });
for (let ty = 0; ty < TR; ty++) for (let tx = 0; tx < TC; tx++) {
  const idx = ty * TC + tx;
  const name = names[idx];
  if (!name) continue;
  // INSET 은 nonogram-from-image.ts 와 같은 의미 — 옆 아이콘이 물려 들어온 가장자리를 잘라내 두 결과의 크롭을 맞춘다
  const insetX = Math.round((W / TC) * INSET), insetY = Math.round((H / TR) * INSET);
  const x0 = Math.floor((tx * W) / TC) + insetX, x1 = Math.floor(((tx + 1) * W) / TC) - 1 - insetX;
  const y0 = Math.floor((ty * H) / TR) + insetY, y1 = Math.floor(((ty + 1) * H) / TR) - 1 - insetY;
  let l = x1, r = x0, t = y1, b = y0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (isWhite(x, y)) continue;
    if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y;
  }
  if (r < l) { console.log(`${name}: 빈 타일 — 건너뜀`); continue; }
  l = Math.max(x0, l - PAD); r = Math.min(x1, r + PAD);
  t = Math.max(y0, t - PAD); b = Math.min(y1, b + PAD);
  const w = r - l + 1, h = b - t + 1;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = ((t + y) * W + (l + x)) * 4, di = (y * w + x) * 4;
    // 배경은 흰색으로 평탄화 — 완성 연출은 이 이미지를 그리드 위에 그대로 덮으므로 알파가 없어야 한다
    const a = png.data[si + 3];
    out.data[di] = a < 20 ? 255 : png.data[si];
    out.data[di + 1] = a < 20 ? 255 : png.data[si + 1];
    out.data[di + 2] = a < 20 ? 255 : png.data[si + 2];
    out.data[di + 3] = 255;
  }
  const file = path.join(outDir, `${name}.png`);
  fs.writeFileSync(file, PNG.sync.write(out));
  console.log(`${file} ${w}×${h}`);
}
