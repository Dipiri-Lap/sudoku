# SEO 언어 모듈 (de / es / fr / pt / zh)

새 언어의 정적 SEO 페이지(`/de/`, `/de/sudoku` …)는 **데이터 파일 하나**로 만든다.
`scripts/seo-routes.mjs` 가 `scripts/seo-lang/<lang>.mjs` 를 자동으로 찾아(없으면 조용히 건너뜀)
`scripts/prerender.mjs`(dist/<lang>/**/index.html)와 `scripts/generate-sitemap.mjs`(sitemap.xml + hreflang)에 반영한다.
공유 파일(seo-routes / prerender / sitemap / index.html)은 **수정하지 않는다.**

## 작업 순서

1. `cp scripts/seo-lang/_template.mjs scripts/seo-lang/<lang>.mjs` (`<lang>` = de | es | fr | pt | zh)
2. `lang` 을 파일명과 같은 코드로 바꾸고, `// TRANSLATE` 가 붙은 모든 문자열을 그 언어로 **새로 쓴다** (직역 금지).
3. `node scripts/check-seo-lang.mjs <lang>` — 에러 0 이 될 때까지 수정.
4. (선택) `npx vite build && node scripts/prerender.mjs && node scripts/generate-sitemap.mjs` 후 `dist/<lang>/` 확인.

`_` 로 시작하는 파일(`_template.mjs`)은 발견 대상이 아니다.

## 데이터 형식 (default export)

```js
export default {
  lang: 'de',                 // 파일명과 동일 (필수 검사)
  brand: 'Puzzle Garden',     // de/es/fr/pt: 'Puzzle Garden' 고정, zh: '益智花園' 고정
  ui: { moreGames: '…', homeLink: '…' },   // noscript 하단 "다른 게임 / 홈" 링크 블록 문구

  home: {
    title, description, keywords,          // <title> / meta description / meta keywords (+og/twitter)
    siteDescription, itemListName,         // JSON-LD WebSite.description / ItemList.name
    games: { sudoku, queens, jigsaw, snapspot },   // JSON-LD ItemList 각 게임 한 줄 설명
    h2, lead,                              // noscript 본문 (봇용)
    blocks: [{ h3, p }, …],                // 2개 이상. p 안에 [[sudoku|텍스트]] 로 게임 링크
  },

  pages: {                                  // 4개 모두 필수
    sudoku | queens | jigsaw | snapspot: {
      name,                                 // 현지 게임명 (브레드크럼, SoftwareApplication, 내부 링크)
      title, description, keywords,
      faq: [[질문, 답변], …],               // 4~6쌍 → FAQPage JSON-LD
      sections: [{ h2, lead, blocks: [{ h3, p }, …] }],   // noscript 본문, 블록 2~3개
    },
  },
}
```

선택 필드: `lastmod: 'YYYY-MM-DD'` (게임 페이지의 sitemap lastmod, 기본 2026-11-16).

### 모든 값은 "평문"

- 따옴표(`"` `'`), `&` 를 그대로 쓴다. `&amp;` `&quot;` 같은 엔티티를 직접 쓰면 이중 이스케이프되므로 검증기가 에러로 막는다. 빌더가 속성/본문/JSON-LD 에 맞게 이스케이프한다.
- HTML 은 본문 필드(`lead`, `p`)의 `<strong>…</strong>` 만 가능. 그 외 `<`/`>` 금지, `<script` 는 에러.
- `[[sudoku|Sudoku]]` → `<a href="/<lang>/sudoku"><strong>Sudoku</strong></a>` (홈 `blocks[].p` 에서 사용; slug 는 sudoku|queens|jigsaw|snapspot).
- `title`/`description` 은 플레이스홀더 없이 완성 문장. 브랜드는 title 끝에 ` | Puzzle Garden`(zh 는 ` | 益智花園`) 형태 권장.

## 빌더가 자동으로 하는 일 (손대지 말 것)

| 항목 | 값 |
| --- | --- |
| URL | `/<lang>/` , `/<lang>/<slug>` |
| `<html lang>` / hreflang | de, es, fr, pt-BR, zh-Hant |
| og:locale | de_DE, es_ES, fr_FR, pt_BR, zh_TW |
| og:site_name | `brand` 값 (zh 는 益智花園) |
| JSON-LD priceCurrency | EUR, EUR, EUR, BRL, TWD (+ `inLanguage` = html lang) |
| 공유 이미지 | `/images/og/<slug>.jpg`, 홈 `home.jpg` (영어와 동일) |
| hreflang | 해당 페이지가 있는 모든 언어 + `x-default`(영어). 루트 `/` 와 sitemap 에도 반영 |
| 한국어 WebSite/ItemList JSON-LD | 제거하고 이 언어 홈 전용 WebSite/ItemList 로 대체 |

## 길이 가이드 (문자 수; 하드 한계를 넘으면 검증기 에러, 권장 범위 밖이면 경고)

| 필드 | 라틴 문자권 (de/es/fr/pt) | 중국어 번체 (zh) |
| --- | --- | --- |
| title | 권장 55–65 (허용 35–75) | 권장 30–35 전각 (허용 15–40) |
| description | 권장 120–160 (허용 100–180) | 권장 60–90 (허용 45–100) |
| keywords | 쉼표 구분, 6~10개 | 동일 |
| FAQ | 게임당 4~6쌍 | 동일 |
| 본문 | 게임당 h3 블록 2~3개 (홈은 2개 이상) | 동일 |

## 카피 가이드

- **직역이 아니라 그 언어 검색 의도에 맞춘 새 카피.** 각 게임의 현지 핵심 검색어를 title 앞쪽과 description 에 넣는다 (예: de "Sudoku kostenlos online spielen", es "sudoku gratis", fr "sudoku gratuit en ligne", pt "sudoku grátis online", zh 「數獨 免費 線上」). 목표 키워드 선정은 작성자 몫.
- 사실관계는 템플릿 그대로: 퀸즈 1000스테이지, 스냅스팟 750+ 스테이지와 3모드(노말/타임어택/아케이드), 스도쿠 6×6~16×16 + 타임어택 + 메모/힌트, Tiny Pieces 10스테이지마다 명화 스테이지. 없는 기능을 지어내지 말 것.
- 한글/일본어 가나를 남기지 말 것 (검증기가 에러). 영어 원문 문장이 40% 이상 그대로 남아도 에러.
- 명화 이름은 해당 언어의 통용 표기로 (예: 神奈川沖浪裏 → de "Die große Welle vor Kanagawa", fr "La Grande Vague de Kanagawa", zh 「神奈川沖浪裏」).

## 검증

```
node scripts/check-seo-lang.mjs          # 존재하는 모든 언어
node scripts/check-seo-lang.mjs de fr    # 지정한 언어 (파일이 없으면 에러)
```

검사 항목: 필수 필드·5페이지(홈+4게임), FAQ ≥ 4쌍, title/description 길이, 한글/가나 없음,
영어 템플릿 문자열 40% 초과 잔존, `<script`·이벤트 핸들러 주입, 이미 이스케이프된 엔티티,
허용되지 않는 태그, `<strong>` 짝, 빌드된 title/description/keywords 속성의 따옴표 이스케이프, JSON-LD 유효성.
에러가 있으면 exit code 1.
