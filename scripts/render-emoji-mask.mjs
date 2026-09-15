// 일회성 스크립트: 이모지를 헤드리스 브라우저 canvas 로 래스터라이즈해
// src/features/arrow-puzzle/data/emoji-masks.json 에 기준 해상도 마스크로 저장한다.
// (shapes.ts 의 수학 predicate 대신, 자동차/고래처럼 복잡한 실루엣에 쓴다.)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const REF = 140; // 기준 해상도 — 쉐이프 스테이지 판 크기(최대 22칸 안팎)의 4~5배는 유지해 계단현상을 피한다
const SHAPES = [
  { key: 'car', name: '자동차', emoji: '🚙' },
  { key: 'whale', name: '고래', emoji: '🐋' },
  { key: 'cat', name: '고양이', emoji: '🐱' },
  { key: 'tree', name: '나무', emoji: '🌳' },
  { key: 'rocket', name: '로켓', emoji: '🚀' },
  { key: 'fish', name: '물고기', emoji: '🐟' },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const result = {};
for (const s of SHAPES) {
  const cells = await page.evaluate(({ emoji, ref }) => {
    const SS = 6;
    const W = ref * SS, H = ref * SS;
    const canvas = document.getElementById('c');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.font = `${Math.floor(H * 0.82)}px "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, W / 2, H / 2 + H * 0.02);

    const { data } = ctx.getImageData(0, 0, W, H);
    const cellsOut = [];
    for (let r = 0; r < ref; r++) {
      for (let c = 0; c < ref; c++) {
        let sum = 0;
        for (let y = 0; y < SS; y++) {
          const base = ((r * SS + y) * W + c * SS) * 4;
          for (let x = 0; x < SS; x++) sum += data[base + x * 4 + 3];
        }
        if (sum / (SS * SS * 255) >= 0.35) cellsOut.push([c, r]);
      }
    }
    return cellsOut;
  }, { emoji: s.emoji, ref: REF });

  result[s.key] = { name: s.name, refCols: REF, refRows: REF, cells };
  console.log(`${s.name}: ${cells.length}칸`);
}

await browser.close();
writeFileSync(
  'src/features/arrow-puzzle/data/emoji-masks.json',
  JSON.stringify(result) + '\n'
);
console.log('저장 → src/features/arrow-puzzle/data/emoji-masks.json');
