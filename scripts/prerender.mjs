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
    breadcrumbSchema: JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"스도쿠","item":"https://puzzles.tmhub.co.kr/sudoku"}]}),
    faqSchema: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "스도쿠란 무엇인가요?",
          "acceptedAnswer": { "@type": "Answer", "text": "스도쿠(Sudoku)는 9×9 격자에 1부터 9까지의 숫자를 채우는 논리 퍼즐입니다. 각 가로줄, 세로줄, 3×3 박스 안에 같은 숫자가 두 번 들어갈 수 없습니다. 수학 실력이 아닌 순수한 논리력으로 푸는 두뇌 게임입니다." }
        },
        {
          "@type": "Question",
          "name": "스도쿠는 무료로 즐길 수 있나요?",
          "acceptedAnswer": { "@type": "Answer", "text": "네, 퍼즐 가든의 스도쿠는 완전 무료입니다. 회원가입 없이 바로 플레이할 수 있으며 초보부터 어려움까지 다양한 난이도를 제공합니다." }
        },
        {
          "@type": "Question",
          "name": "스도쿠 초보자는 어떤 난이도부터 시작해야 하나요?",
          "acceptedAnswer": { "@type": "Answer", "text": "처음이라면 '초보 스도쿠' 모드를 추천합니다. 단계별로 난이도가 올라가며 차근차근 실력을 쌓을 수 있습니다. 어느 정도 익숙해지면 타임어택 모드로 도전해보세요." }
        },
        {
          "@type": "Question",
          "name": "스도쿠가 두뇌에 좋은가요?",
          "acceptedAnswer": { "@type": "Answer", "text": "네. 스도쿠는 집중력, 논리적 사고력, 단기 기억력 향상에 효과적입니다. 하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 된다고 알려져 있습니다." }
        }
      ]
    }),
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
    breadcrumbSchema: JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"단어 정렬","item":"https://puzzles.tmhub.co.kr/word-sort"}]}),
    faqSchema: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "단어 정렬 게임이란 무엇인가요?",
          "acceptedAnswer": { "@type": "Answer", "text": "단어 정렬은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 올바른 슬롯에 분류하는 카드 게임입니다. 직관적인 조작과 다양한 주제로 남녀노소 누구나 즐길 수 있습니다." }
        },
        {
          "@type": "Question",
          "name": "단어 정렬 게임은 어떻게 하나요?",
          "acceptedAnswer": { "@type": "Answer", "text": "덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯으로 드래그합니다. 모든 카드를 올바른 슬롯에 넣으면 레벨 클리어입니다. 틀린 카드는 다시 덱으로 돌아갑니다." }
        },
        {
          "@type": "Question",
          "name": "단어 정렬 게임은 무료인가요?",
          "acceptedAnswer": { "@type": "Answer", "text": "네, 퍼즐 가든의 단어 정렬 게임은 완전 무료입니다. 로그인 없이 바로 시작할 수 있으며 다양한 주제의 레벨을 제공합니다." }
        },
        {
          "@type": "Question",
          "name": "단어 정렬 게임이 학습에 도움이 되나요?",
          "acceptedAnswer": { "@type": "Answer", "text": "네. 단어 카드를 주제별로 분류하면서 어휘력, 연상 능력, 범주화 사고를 동시에 훈련할 수 있습니다. 한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다." }
        }
      ]
    }),
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
    breadcrumbSchema: JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"스냅스팟","item":"https://puzzles.tmhub.co.kr/snapspot"}]}),
    faqSchema: null,
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

  // BreadcrumbList Schema 삽입
  if (route.breadcrumbSchema) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${route.breadcrumbSchema}</script>\n</head>`
    );
  }

  // FAQ Schema 삽입
  if (route.faqSchema) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${route.faqSchema}</script>\n</head>`
    );
  }

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
