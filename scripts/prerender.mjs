/**
 * 빌드 후 각 라우트별 정적 HTML 생성
 * - Naver/Google 봇이 JS 없이도 메타태그 + SEO 콘텐츠를 읽을 수 있게 함
 *
 * 라우트 정의는 scripts/seo-routes.mjs 에 있다 (sitemap 생성기와 공유).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { routes, relatedLinks, alternates } from './seo-routes.mjs';

const distDir = 'dist';

const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf-8');

for (const route of routes) {
  let html = indexHtml;
  const isEn = route.lang === 'en';
  const isJa = route.lang === 'ja';

  // index.html 에 박혀 있는 홈용 hreflang 은 제거하고, 짝이 있는 페이지에만 아래에서 다시 넣는다
  html = html.replace(/\n[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/>/g, '');

  if (isEn || isJa) {
    html = html.replace('<html lang="ko">', `<html lang="${route.lang}">`);
    html = html.replace(/<meta property="og:locale" content=".*?"\s*\/>/, `<meta property="og:locale" content="${isJa ? 'ja_JP' : 'en_US'}" />`);
    html = html.replace(/<meta property="og:site_name" content=".*?"\s*\/>/, `<meta property="og:site_name" content="${isJa ? 'パズルガーデン' : 'Puzzle Garden'}" />`);
    if (route.keywords) {
      html = html.replace(/<meta name="keywords" content=".*?"\s*\/>/, `<meta name="keywords" content="${route.keywords}" />`);
    }
    // index.html 의 한국어 WebSite/ItemList JSON-LD 는 영어/일본어 페이지에서 제거
    html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  }

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

  // hreflang (ko/en/ja 쌍이 있는 페이지만; x-default 는 영어판)
  const alts = alternates(route);
  if (alts) {
    const tags = alts.map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`).join('\n  ');
    html = html.replace(
      `<link rel="canonical" href="${route.canonical}" />`,
      `<link rel="canonical" href="${route.canonical}" />\n  ${tags}`
    );
  }

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

  // 공유 이미지 + 트위터 카드 (카카오톡·SNS 미리보기)
  html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${route.ogImage}" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />`);
  html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${route.ogImage}" />`);
  html = html.replace(/<meta name="twitter:url" content=".*?"\s*\/>/, `<meta name="twitter:url" content="${route.canonical}" />`);
  html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/>/, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/>/, `<meta name="twitter:description" content="${route.description}" />`);
  html = html.replace(/<meta name="title" content=".*?"\s*\/>/, `<meta name="title" content="${route.title}" />`);

  // BreadcrumbList Schema 삽입
  if (route.breadcrumbSchema) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${route.breadcrumbSchema}</script>\n</head>`
    );
  }

  // SoftwareApplication Schema 삽입
  if (route.softwareSchema) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${route.softwareSchema}</script>\n</head>`
    );
  }

  // FAQ Schema 삽입
  if (route.faqSchema) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${route.faqSchema}</script>\n</head>`
    );
  }

  // 추가 스키마 (영어 홈의 WebSite/ItemList)
  for (const schema of route.extraSchemas ?? []) {
    html = html.replace(
      '</head>',
      `<script type="application/ld+json">${schema}</script>\n</head>`
    );
  }

  // SEO 콘텐츠를 <div id="root"> 앞에 noscript로 삽입 (봇 전용)
  if (route.seoContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div><noscript>${route.seoContent}${relatedLinks(route.path)}</noscript>`
    );
  }

  // dist/{route}/index.html 생성
  const dir = join(distDir, route.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf-8');

  console.log(`✅ Generated: dist/${route.path}/index.html`);
}

console.log('🎉 Prerender complete!');
