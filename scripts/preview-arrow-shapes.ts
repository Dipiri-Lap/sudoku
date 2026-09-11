/**
 * 모양 마스크를 터미널에서 눈으로 확인한다.
 *
 *   npx tsx scripts/preview-arrow-shapes.ts          # 전부
 *   npx tsx scripts/preview-arrow-shapes.ts 하트     # 이름으로 걸러서
 *
 * 새 모양을 shapes.ts 에 추가한 뒤 이걸로 먼저 확인하면
 * 레벨을 50개 뽑아 보고 나서야 실루엣이 이상한 걸 발견하는 일을 피할 수 있다.
 */
import { SHAPES, buildMask, fitMask, componentCount } from '../src/features/arrow-puzzle/utils/shapes';

const filter = process.argv[2];
const SIZES = [10, 14, 18];

for (const shape of SHAPES) {
  if (filter && !shape.name.includes(filter)) continue;

  console.log(`\n═══ ${shape.name}${shape.minSide ? `  (최소 ${shape.minSide}×${shape.minSide})` : ''} ═══`);

  for (const side of SIZES) {
    const raw = buildMask(shape, side, side);
    if (raw.length === 0) { console.log(`  ${side}×${side}: 빈 마스크`); continue; }

    const { mask, cols, rows } = fitMask(raw);
    const set = new Set(mask.map(([c, r]) => `${c},${r}`));
    const parts = componentCount(mask);
    const tooSmall = shape.minSide !== undefined && side < shape.minSide;

    const flags = [
      `${mask.length}칸`,
      `${cols}×${rows}`,
      parts > 1 ? `⚠ 조각 ${parts}개` : null,
      mask.length < 20 ? '⚠ 너무 작음' : null,
      tooSmall ? '(minSide 미만 — 실제로는 안 쓰임)' : null,
    ].filter(Boolean).join(' · ');

    console.log(`\n  ${side}×${side}  ${flags}`);
    for (let r = 0; r < rows; r++) {
      let line = '  ';
      for (let c = 0; c < cols; c++) line += set.has(`${c},${r}`) ? '██' : '  ';
      console.log(line);
    }
  }
}

console.log('\n모양을 추가하려면 src/features/arrow-puzzle/utils/shapes.ts 의 SHAPES 에 한 줄 넣으면 된다.');
