/**
 * 원본 이미지를 배포용 크기로 줄여 굽는다.
 *
 * 배포 저장소(Deployment Storage)는 **배포 개수 × 배포 하나 크기**로 찬다.
 * `vercel-prune.mjs` 가 앞쪽을 줄이고, 이 스크립트가 뒤쪽을 줄인다.
 *
 *   npm run optimize-assets          변환한다
 *   npm run optimize-assets -- --dry 무엇이 얼마나 줄어드는지만 본다
 *
 * 원본은 `source-assets/` 에 두고 결과만 `public/` 에 넣는다.
 * public 은 통째로 빌드 결과에 복사되므로, 원본을 거기 두면 화면에서 쓰지도
 * 않는 큰 파일이 배포마다 함께 실린다. 실제로 카드 뒷면 원본 25MB가 그랬다.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DRY = process.argv.includes('--dry');

/**
 * 무엇을 어느 크기로 구울까.
 *
 * `width`는 **화면에서 쓰이는 폭 × 3** 정도로 잡는다. 3배는 고DPI 화면까지
 * 감안한 값이다. 그 이상은 눈에 보이지 않는 데이터일 뿐이다.
 */
const JOBS = [
  {
    name: '카드 뒷면',
    from: 'source-assets/word-sort',
    to: 'public/assets/word-sort',
    match: /^\d+\.png$/,
    // 화면에서 카드는 최대 110px, 상점 미리보기는 60px (WordSortGame.tsx의 finalCardWidth)
    width: 360,
    height: 504,
    quality: 82,
  },
  {
    name: '워드스택 스테이지 버튼',
    from: 'source-assets/wordstack',
    to: 'public/images/wordstack',
    match: /^stageBtn\.png$/,
    // snapspot·sudoku의 stageBtn.webp와 같은 결로 맞춘다(각각 222KB, 188KB)
    width: 887,
    height: 444,
    quality: 80,
  },
  {
    name: '오늘의 퍼즐 타이틀 카드',
    from: 'source-assets/daily',
    to: 'public/images/daily',
    match: /^title\.png$/,
    // 랜딩 그리드에서 카드 한 장은 최대 180px. 다른 게임 title.webp 와 같은 결로 맞춘다.
    width: 540,
    height: 540,
    quality: 82,
  },
  {
    name: '스타터 팩 배너',
    from: 'source-assets/shop',
    to: 'public/images/shop',
    match: /^starterPack\.png$/,
    // 상점 모달 안쪽 폭은 340px 정도. 3배로 잡아 1020이면 넉넉하다.
    width: 1020,
    height: 510,
    quality: 82,
  },
  {
    name: '코인 아이콘',
    from: 'source-assets/icons',
    to: 'public',
    match: /\.png$/,
    // 화면에서 40px (CoinDisplay.tsx). 3배로 잡아도 120이면 넉넉하다.
    width: 120,
    height: 120,
    // 참조가 12곳이라 형식을 안 바꾼다 - 줄이는 값에 비해 손댈 곳이 많다.
    keepPng: true,
  },
];

function mb(n) {
  return (n / 1048576).toFixed(2) + 'MB';
}

let beforeAll = 0;
let afterAll = 0;

for (const job of JOBS) {
  if (!fs.existsSync(job.from)) {
    console.error(`  ! 원본 폴더가 없다: ${job.from}`);
    continue;
  }
  const files = fs.readdirSync(job.from).filter(f => job.match.test(f));
  if (files.length === 0) continue;

  fs.mkdirSync(job.to, { recursive: true });
  console.log(`\n[${job.name}] ${files.length}장 → ${job.width}x${job.height} webp`);

  let before = 0;
  let after = 0;

  for (const file of files) {
    const src = path.join(job.from, file);
    const out = path.join(job.to, job.keepPng ? file : file.replace(/\.png$/i, '.webp'));
    const srcSize = fs.statSync(src).size;
    before += srcSize;

    if (DRY) continue;

    const pipeline = sharp(src).resize(job.width, job.height, {
      // 아이콘은 비율을 지켜야 한다. 카드처럼 비율이 이미 맞는 것만 늘려 채운다.
      fit: job.keepPng ? 'inside' : 'fill',
    });
    await (job.keepPng
      ? pipeline.png({ compressionLevel: 9, palette: true })
      : pipeline.webp({ quality: job.quality })
    ).toFile(out);

    after += fs.statSync(out).size;
  }

  beforeAll += before;
  afterAll += after;

  if (DRY) {
    console.log(`  원본 ${mb(before)} (변환은 --dry 없이)`);
  } else {
    const pct = ((1 - after / before) * 100).toFixed(0);
    console.log(`  ${mb(before)} → ${mb(after)}  (${pct}% 감소)`);
  }
}

if (!DRY && beforeAll > 0) {
  console.log(`\n합계 ${mb(beforeAll)} → ${mb(afterAll)}`);
}
