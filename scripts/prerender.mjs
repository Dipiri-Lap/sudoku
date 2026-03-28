/**
 * 빌드 후 각 라우트별 정적 HTML 생성
 * - Naver/Google 봇이 JS 없이도 메타태그 + SEO 콘텐츠를 읽을 수 있게 함
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const BASE_URL = 'https://puzzles.tmhub.co.kr';

const routes = [
  {
    path: 'sudoku',
    title: '스도쿠 무료 온라인 게임 - 퍼즐 가든',
    description: '9×9 격자에 1~9 숫자를 채우는 클래식 두뇌 퍼즐! 쉬움부터 어려움까지 다양한 난이도의 스도쿠를 무료로 즐기세요.',
    canonical: `${BASE_URL}/sudoku`,
    seoContent: `
      <section style="padding:2.5rem 1.5rem 3rem;max-width:680px;margin:0 auto;color:#555;line-height:1.8">
        <h2 style="font-size:1.3rem;font-weight:700;color:#333;margin-bottom:.75rem">스도쿠란? — 무료 온라인 스도쿠 게임</h2>
        <p style="margin-bottom:1.5rem;font-size:.95rem"><strong>스도쿠(Sudoku)</strong>는 9×9 격자를 숫자로 채우는 논리 퍼즐 게임입니다. 각 가로줄, 세로줄, 3×3 박스 안에 1부터 9까지 숫자가 한 번씩만 들어가야 합니다. 수학 실력이 필요 없고 순수한 논리력과 집중력으로 풀 수 있어 전 세계적으로 사랑받는 <strong>두뇌 퍼즐 게임</strong>입니다.</p>
        <h3 style="font-size:1.05rem;font-weight:700;color:#444;margin-bottom:.5rem">스도쿠 하는 법</h3>
        <p style="margin-bottom:1.25rem;font-size:.9rem">빈 칸을 클릭하고 1~9 숫자 중 조건에 맞는 숫자를 입력합니다. 같은 행·열·박스에 이미 있는 숫자는 다시 쓸 수 없습니다. 처음이라면 <strong>초보 스도쿠</strong> 또는 <strong>쉬운 난이도</strong>부터 시작해보세요.</p>
        <h3 style="font-size:1.05rem;font-weight:700;color:#444;margin-bottom:.5rem">스도쿠의 두뇌 훈련 효과</h3>
        <p style="font-size:.9rem">스도쿠는 <strong>집중력, 논리적 사고, 단기 기억력</strong> 향상에 효과적입니다. 하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 됩니다.</p>
      </section>`,
  },
  {
    path: 'word-sort',
    title: '단어 정렬 카드 게임 - 퍼즐 가든',
    description: '카드를 드래그해서 같은 주제의 단어끼리 분류하는 단어 카드 게임. 다양한 주제의 레벨을 무료로 즐기세요.',
    canonical: `${BASE_URL}/word-sort`,
    seoContent: `
      <section style="padding:2.5rem 1.5rem 3rem;max-width:680px;margin:0 auto;color:#555;line-height:1.8">
        <h2 style="font-size:1.3rem;font-weight:700;color:#333;margin-bottom:.75rem">단어 정렬 게임이란?</h2>
        <p style="margin-bottom:1.5rem;font-size:.95rem"><strong>단어 정렬</strong>은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 분류하는 <strong>카드 게임</strong>입니다. 직관적인 조작과 다양한 주제로 남녀노소 누구나 쉽게 즐길 수 있습니다.</p>
        <h3 style="font-size:1.05rem;font-weight:700;color:#444;margin-bottom:.5rem">게임 방법</h3>
        <p style="margin-bottom:1.25rem;font-size:.9rem">덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯에 드래그합니다. 모든 카드를 올바른 슬롯에 넣으면 레벨 클리어!</p>
        <h3 style="font-size:1.05rem;font-weight:700;color:#444;margin-bottom:.5rem">단어 정렬 게임의 효과</h3>
        <p style="font-size:.9rem">단어 카드 게임은 <strong>어휘력, 연상 능력, 범주화 사고</strong>를 동시에 훈련합니다. 한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다.</p>
      </section>`,
  },
  {
    path: 'snapspot',
    title: '스냅스팟 틀린그림찾기 - 퍼즐 가든',
    description: '두 사진을 비교해서 다른 부분을 찾는 틀린그림찾기 게임. 눈썰미를 테스트해보세요!',
    canonical: `${BASE_URL}/snapspot`,
    seoContent: '',
  },
];

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

for (const route of routes) {
  let html = indexHtml;

  // title 교체
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${route.title}</title>`
  );

  // meta description 교체
  html = html.replace(
    /<meta name="description" content=".*?"\s*\/>/,
    `<meta name="description" content="${route.description}" />`
  );

  // canonical 교체
  html = html.replace(
    /<link rel="canonical" href=".*?"\s*\/>/,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // og:url 교체
  html = html.replace(
    /<meta property="og:url" content=".*?"\s*\/>/,
    `<meta property="og:url" content="${route.canonical}" />`
  );

  // og:title 교체
  html = html.replace(
    /<meta property="og:title" content=".*?"\s*\/>/,
    `<meta property="og:title" content="${route.title}" />`
  );

  // og:description 교체
  html = html.replace(
    /<meta property="og:description" content=".*?"\s*\/>/,
    `<meta property="og:description" content="${route.description}" />`
  );

  // SEO 콘텐츠를 <div id="root"> 앞에 noscript로 삽입 (봇 전용)
  if (route.seoContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div><noscript>${route.seoContent}</noscript>`
    );
  }

  // dist/{route}/index.html 생성
  const dir = join(distDir, route.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf-8');

  console.log(`✅ Generated: dist/${route.path}/index.html`);
}

console.log('🎉 Prerender complete!');
