/**
 * 공유(OG) 이미지 생성 — 1200×630 JPG. 카카오톡·SNS 미리보기용.
 * 게임 타이틀 이미지(정사각형)를 가운데 두고, 같은 이미지를 흐리게 키워 배경으로 깐다.
 * 홈은 여섯 게임 타이틀을 3×2로 모은 콜라주.
 *
 * 실행: node scripts/generate-og-images.mjs  (결과는 public/images/og/ 에 저장해 커밋한다)
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const W = 1200, H = 630;
const OUT = 'public/images/og';
mkdirSync(OUT, { recursive: true });

// [og 파일명, 타이틀 이미지 폴더]
const GAMES = [
  ['sudoku', 'sudoku'],
  ['word-sort', 'wordstack'],
  ['snapspot', 'snapspot'],
  ['cross-math', 'crossum'],
  ['queens', 'crownquest'],
  ['arrow-puzzle', 'arrow-puzzle'],
  ['daily', 'daily'],
];

const src = (dir) => `public/images/${dir}/title.webp`;

const blurredBg = (file) =>
  sharp(file).resize(W, H, { fit: 'cover' }).blur(40).modulate({ brightness: 0.8 }).toBuffer();

for (const [name, dir] of GAMES) {
  const bg = await blurredBg(src(dir));
  const fg = await sharp(src(dir)).resize(H, H).toBuffer();
  await sharp(bg)
    .composite([{ input: fg, left: (W - H) / 2, top: 0 }])
    .jpeg({ quality: 82 })
    .toFile(`${OUT}/${name}.jpg`);
  console.log(`✅ ${OUT}/${name}.jpg`);
}

// 홈: 3×2 콜라주
const CELL = 315;
const home = GAMES.filter(([n]) => n !== 'daily');
const bg = await blurredBg(src('snapspot'));
const tiles = await Promise.all(home.map(async ([, dir], i) => ({
  input: await sharp(src(dir)).resize(CELL, CELL).toBuffer(),
  left: Math.round((W - CELL * 3) / 2) + (i % 3) * CELL,
  top: Math.floor(i / 3) * CELL,
})));
await sharp(bg).composite(tiles).jpeg({ quality: 82 }).toFile(`${OUT}/home.jpg`);
console.log(`✅ ${OUT}/home.jpg`);
