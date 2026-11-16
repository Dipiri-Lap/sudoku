/**
 * 게임별 SEO 라우트 정의 — prerender.mjs 와 generate-sitemap.mjs 가 공유한다.
 *
 * 여기에 항목을 추가하면 정적 HTML(dist/{path}/index.html)과 sitemap.xml 이
 * 함께 갱신된다. 랜딩에 노출되는 실서비스 게임만 등록한다(개발 중인 게임 제외).
 */

import { existsSync } from 'fs';

export const BASE_URL = 'https://puzzles.tmhub.co.kr';

/** BreadcrumbList 스키마 — 홈 > 게임 2단계 고정 */
const breadcrumb = (name, path) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '퍼즐 가든', item: `${BASE_URL}/` },
    { '@type': 'ListItem', position: 2, name, item: `${BASE_URL}/${path}` },
  ],
});

/** SoftwareApplication 스키마 — 전부 무료 웹 게임 */
const software = (name) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: `${name} - 퍼즐 가든`,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
});

/** FAQPage 스키마 — [질문, 답변] 쌍 배열을 받는다 */
const faq = (pairs) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pairs.map(([name, text]) => ({
    '@type': 'Question',
    name,
    acceptedAnswer: { '@type': 'Answer', text },
  })),
});

// noscript 블록은 봇이 읽는 용도라 인라인 스타일로만 꾸민다.
const S = {
  section: 'padding:2.5rem 1.5rem 3rem;max-width:680px;margin:0 auto;color:#555;line-height:1.8',
  h2: 'font-size:1.3rem;font-weight:700;color:#333;margin-bottom:.75rem',
  h3: 'font-size:1.05rem;font-weight:700;color:#444;margin-bottom:.5rem',
  lead: 'margin-bottom:1.5rem;font-size:.95rem',
  p: 'margin-bottom:1.25rem;font-size:.9rem',
  pLast: 'font-size:.9rem',
};

export const routes = [
  {
    path: 'sudoku',
    name: '스도쿠',
    title: '스도쿠 무료 온라인 게임 - 초보부터 고수까지 | 퍼즐 가든',
    description: '스도쿠 무료 온라인 게임. 9×9 격자에 1~9 숫자를 채우는 클래식 두뇌 퍼즐을 초보·쉬움·보통·어려움 난이도별로, 설치 없이 바로 즐기세요. 스도쿠 하는 법과 규칙 설명 포함.',
    priority: '0.9',
    changefreq: 'monthly',
    faqPairs: [
      ['스도쿠란 무엇인가요?', '스도쿠(Sudoku)는 9×9 격자에 1부터 9까지의 숫자를 채우는 논리 퍼즐입니다. 각 가로줄, 세로줄, 3×3 박스 안에 같은 숫자가 두 번 들어갈 수 없습니다. 수학 실력이 아닌 순수한 논리력으로 푸는 두뇌 게임입니다.'],
      ['스도쿠는 무료로 즐길 수 있나요?', '네, 퍼즐 가든의 스도쿠는 완전 무료입니다. 회원가입 없이 바로 플레이할 수 있으며 초보부터 어려움까지 다양한 난이도를 제공합니다.'],
      ['스도쿠 초보자는 어떤 난이도부터 시작해야 하나요?', "처음이라면 '초보 스도쿠' 모드를 추천합니다. 단계별로 난이도가 올라가며 차근차근 실력을 쌓을 수 있습니다. 어느 정도 익숙해지면 타임어택 모드로 도전해보세요."],
      ['스도쿠 규칙과 푸는 방법은?', '빈 칸에 1~9를 넣되 같은 가로줄, 세로줄, 굵은 선으로 나뉜 3×3 박스 안에 같은 숫자가 겹치면 안 됩니다. 후보 숫자가 하나뿐인 칸부터 채우고, 채운 숫자가 늘수록 다음 칸의 후보가 줄어드는 방식으로 풉니다.'],
      ['스도쿠가 두뇌에 좋은가요?', '네. 스도쿠는 집중력, 논리적 사고력, 단기 기억력 향상에 효과적입니다. 하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 된다고 알려져 있습니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">스도쿠란? — 무료 온라인 스도쿠 게임</h2>
        <p style="${S.lead}"><strong>스도쿠(Sudoku)</strong>는 9×9 격자를 숫자로 채우는 논리 퍼즐 게임입니다. 각 가로줄, 세로줄, 3×3 박스 안에 1부터 9까지 숫자가 한 번씩만 들어가야 합니다. 수학 실력이 필요 없고 순수한 논리력과 집중력으로 풀 수 있어 전 세계적으로 사랑받는 <strong>두뇌 퍼즐 게임</strong>입니다.</p>
        <h3 style="${S.h3}">스도쿠 하는 법</h3>
        <p style="${S.p}">빈 칸을 클릭하고 1~9 숫자 중 조건에 맞는 숫자를 입력합니다. 같은 행·열·박스에 이미 있는 숫자는 다시 쓸 수 없습니다. 처음이라면 <strong>초보 스도쿠</strong> 또는 <strong>쉬운 난이도</strong>부터 시작해보세요.</p>
        <h3 style="${S.h3}">스도쿠의 두뇌 훈련 효과</h3>
        <p style="${S.pLast}">스도쿠는 <strong>집중력, 논리적 사고, 단기 기억력</strong> 향상에 효과적입니다. 하루 10~15분씩 꾸준히 풀면 인지 능력 유지와 치매 예방에도 도움이 됩니다.</p>
      </section>`,
  },
  {
    path: 'word-sort',
    name: '워드스택',
    title: '워드스택 - 단어 맞추기 카드 퍼즐 게임 | 퍼즐 가든',
    description: '단어 카드를 같은 주제끼리 분류하는 단어 맞추기 퍼즐 게임. 카테고리 분류로 어휘력을 키우는 무료 단어 게임, 다양한 주제의 레벨을 바로 플레이하세요.',
    priority: '0.9',
    changefreq: 'monthly',
    faqPairs: [
      ['워드스택(단어 정렬) 게임이란 무엇인가요?', '워드스택은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 올바른 슬롯에 분류하는 카드 게임입니다. 직관적인 조작과 다양한 주제로 남녀노소 누구나 즐길 수 있습니다.'],
      ['단어 정렬 게임은 어떻게 하나요?', '덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯으로 드래그합니다. 모든 카드를 올바른 슬롯에 넣으면 레벨 클리어입니다. 틀린 카드는 다시 덱으로 돌아갑니다.'],
      ['워드스택은 무료인가요?', '네, 퍼즐 가든의 워드스택은 완전 무료입니다. 로그인 없이 바로 시작할 수 있으며 다양한 주제의 레벨을 제공합니다.'],
      ['단어 맞추기 퍼즐은 어떤 주제가 나오나요?', '음식, 동물, 직업, 장소처럼 일상적인 주제부터 역사·문화·과학까지 다양한 카테고리가 나옵니다. 레벨이 오를수록 슬롯과 카드 수가 늘어나 생각할 거리가 많아집니다.'],
      ['단어 정렬 게임이 학습에 도움이 되나요?', '네. 단어 카드를 주제별로 분류하면서 어휘력, 연상 능력, 범주화 사고를 동시에 훈련할 수 있습니다. 한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">워드스택 — 단어 정렬 카드 게임</h2>
        <p style="${S.lead}"><strong>워드스택(단어 정렬)</strong>은 여러 장의 단어 카드를 드래그해서 같은 주제끼리 분류하는 <strong>카드 게임</strong>입니다. 직관적인 조작과 다양한 주제로 남녀노소 누구나 쉽게 즐길 수 있습니다.</p>
        <h3 style="${S.h3}">게임 방법</h3>
        <p style="${S.p}">덱에서 카드를 뽑아 해당 카드가 속한 주제의 슬롯에 드래그합니다. 모든 카드를 올바른 슬롯에 넣으면 레벨 클리어!</p>
        <h3 style="${S.h3}">단어 정렬 게임의 효과</h3>
        <p style="${S.pLast}">단어 카드 게임은 <strong>어휘력, 연상 능력, 범주화 사고</strong>를 동시에 훈련합니다. 한국어 어휘와 개념을 재미있게 익힐 수 있어 아이들의 학습에도 효과적입니다.</p>
      </section>`,
  },
  {
    path: 'snapspot',
    name: '스냅스팟',
    title: '틀린그림찾기 무료 게임 - 스냅스팟 | 퍼즐 가든',
    description: '틀린그림찾기(다른그림찾기) 무료 온라인 게임. 두 사진을 비교해 다른 부분을 찾아보세요. 노말·타임어택·아케이드 모드와 750개 이상 스테이지를 설치 없이 즐길 수 있습니다.',
    priority: '0.9',
    changefreq: 'weekly',
    faqPairs: [
      ['스냅스팟은 어떤 게임인가요?', '스냅스팟은 나란히 놓인 두 장의 사진을 비교해 서로 다른 부분을 찾아내는 틀린그림찾기 게임입니다. 다른 곳을 발견하면 해당 위치를 탭해서 표시합니다.'],
      ['틀린그림찾기를 무료로 할 수 있나요?', '네, 퍼즐 가든의 스냅스팟은 완전 무료입니다. 설치나 회원가입 없이 브라우저에서 바로 플레이할 수 있습니다.'],
      ['어떤 모드가 있나요?', '차분히 스테이지를 밟아가는 노말 모드, 제한 시간 안에 최대한 많이 찾는 타임어택 모드, 계속 이어지는 아케이드 모드가 있습니다. 750개가 넘는 스테이지를 제공합니다.'],
      ['틀린그림찾기를 잘하는 요령이 있나요?', '사진을 네 구역으로 나눠 구역별로 비교하면 놓치는 곳이 줄어듭니다. 색이나 크기의 변화뿐 아니라 사라지거나 생긴 작은 물건도 살펴보세요.'],
      ['틀린그림찾기가 두뇌에 도움이 되나요?', '네. 두 이미지를 비교하는 과정에서 시각적 주의력, 세부 관찰력, 시각 기억력을 함께 사용합니다. 짧은 시간에 집중력을 끌어올리기 좋은 두뇌 훈련 게임입니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">스냅스팟 — 무료 틀린그림찾기 게임</h2>
        <p style="${S.lead}"><strong>스냅스팟</strong>은 거의 똑같아 보이는 두 장의 사진에서 다른 곳을 찾아내는 <strong>틀린그림찾기</strong> 게임입니다. 규칙이 단순해 처음 하는 사람도 바로 시작할 수 있고, 스테이지가 올라갈수록 차이가 점점 교묘해집니다.</p>
        <h3 style="${S.h3}">게임 방법</h3>
        <p style="${S.p}">나란히 놓인 두 사진을 번갈아 살펴보다가 다른 부분을 발견하면 그 위치를 탭하거나 클릭합니다. 정해진 개수를 모두 찾으면 스테이지 클리어입니다.</p>
        <h3 style="${S.h3}">세 가지 모드</h3>
        <p style="${S.p}"><strong>노말</strong>은 스테이지를 하나씩 밟아가는 기본 모드, <strong>타임어택</strong>은 제한 시간 안에 얼마나 빨리 찾는지 겨루는 모드, <strong>아케이드</strong>는 쉬지 않고 이어서 즐기는 모드입니다. 750개가 넘는 스테이지가 준비되어 있습니다.</p>
        <h3 style="${S.h3}">눈썰미 훈련 효과</h3>
        <p style="${S.pLast}">틀린그림찾기는 <strong>시각적 주의력과 세부 관찰력</strong>을 훈련합니다. 두 이미지를 머릿속에서 비교하는 과정이 시각 기억력도 함께 자극해, 짧은 시간에 집중력을 끌어올리기 좋습니다.</p>
      </section>`,
  },
  {
    path: 'cross-math',
    name: '크로썸',
    title: '크로썸 - 숫자 수식 퍼즐 무료 게임 | 퍼즐 가든',
    description: '십자 수식 퍼즐 크로썸. 가로·세로로 얽힌 수식의 빈칸을 숫자로 채우는 계산 퍼즐로, 사칙연산 두뇌 트레이닝을 1200 스테이지 무료로 즐기세요.',
    priority: '0.9',
    changefreq: 'monthly',
    faqPairs: [
      ['크로썸은 어떤 게임인가요?', '크로썸(Crossum)은 십자말풀이처럼 가로·세로로 얽힌 수식의 빈칸을 숫자 타일로 채우는 계산 퍼즐입니다. 한 숫자가 가로 식과 세로 식에 동시에 쓰이기 때문에 한 칸을 정하면 다른 칸이 연쇄적으로 정해집니다.'],
      ['크로썸은 무료인가요?', '네, 퍼즐 가든의 크로썸은 완전 무료입니다. 회원가입 없이 바로 플레이할 수 있으며 1200개의 스테이지를 제공합니다.'],
      ['어떤 연산이 나오나요?', '덧셈과 뺄셈으로 시작해 곱셈, 나눗셈이 차례로 등장합니다. 501스테이지부터는 1+1+1=3 처럼 숫자 네 개짜리 3항 식도 섞여 나옵니다.'],
      ['십자 수식 퍼즐은 어떻게 푸나요?', '식 하나에서 빈칸이 한 개뿐인 곳을 먼저 찾아 채웁니다. 그 숫자는 교차하는 다른 식의 실마리가 되어 연쇄적으로 풀립니다. 타일 숫자의 합이나 곱으로 가능한 조합을 줄이는 것도 좋은 방법입니다.'],
      ['암산 실력이 없어도 할 수 있나요?', '네. 초반 스테이지는 한 자리 덧셈·뺄셈으로 시작하고 난이도가 아주 천천히 올라갑니다. 계산보다 어느 칸부터 풀지 찾아내는 추리가 더 중요한 게임입니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">크로썸 - 십자말풀이 수식 퍼즐</h2>
        <p style="${S.lead}">크로썸은 십자말풀이처럼 가로·세로로 얽힌 수식의 빈칸을 숫자 타일로 채우는 <strong>계산 퍼즐</strong>입니다. 한 숫자가 가로 식과 세로 식에 동시에 쓰이므로, 한 칸을 정하면 이어진 칸들이 연쇄적으로 풀립니다.</p>
        <h3 style="${S.h3}">천천히 올라가는 난이도</h3>
        <p style="${S.p}">한 자리 덧셈·뺄셈으로 시작해 곱셈과 나눗셈이 차례로 등장합니다. 501스테이지부터는 <strong>1+1+1=3</strong> 처럼 숫자 네 개가 들어가는 3항 식이 섞여 나옵니다. 숫자 없이 <strong>부호만 있는 줄</strong>은 어느 스테이지에서나 등장하며, 25스테이지마다 오는 관문에서는 그런 줄이 특히 많아집니다.</p>
        <h3 style="${S.h3}">계산보다 추리</h3>
        <p style="${S.p}">어려운 암산이 필요한 게임이 아닙니다. <strong>어느 칸부터 풀 수 있는지 찾아내는 것</strong>이 핵심입니다. 확정할 수 있는 칸 하나를 찾으면 그 숫자가 다른 식의 실마리가 되어 도미노처럼 이어집니다.</p>
        <h3 style="${S.h3}">1200 스테이지 무료</h3>
        <p style="${S.pLast}">회원가입 없이 바로 시작할 수 있고 진행 상황은 자동 저장됩니다. 사칙연산 감각과 논리적 추론을 함께 훈련할 수 있어 어린이 학습용으로도 좋습니다.</p>
      </section>`,
  },
  {
    path: 'queens',
    name: '크라운 퀘스트',
    title: '퀸즈 퍼즐 - 크라운 퀘스트 무료 게임 | 퍼즐 가든',
    description: '퀸즈 퍼즐(퀸 배치 논리 퍼즐) 무료 게임. 색깔 영역마다 퀸을 하나씩, 행·열이 겹치지 않게 배치하세요. 크라운 퀘스트 1000개 스테이지를 설치 없이 즐길 수 있습니다.',
    priority: '0.9',
    changefreq: 'monthly',
    faqPairs: [
      ['크라운 퀘스트(퀸즈)는 어떤 게임인가요?', '크라운 퀘스트는 색깔로 나뉜 격자에 퀸(👑)을 배치하는 논리 퍼즐입니다. 각 색상 영역에 퀸이 정확히 하나, 각 가로줄과 세로줄에도 퀸이 하나씩만 들어가야 하며, 퀸끼리는 대각선을 포함해 서로 맞닿을 수 없습니다.'],
      ['퀸즈 퍼즐은 어떻게 푸나요?', '퀸을 놓을 수 없는 칸부터 지워 나가는 것이 기본입니다. 어떤 색상 영역에 남은 후보 칸이 하나뿐이면 그곳이 퀸의 자리입니다. 퀸을 하나 확정하면 같은 행·열과 인접 칸이 모두 제외되어 다음 단서가 이어집니다.'],
      ['크라운 퀘스트는 무료인가요?', '네, 완전 무료입니다. 설치나 회원가입 없이 브라우저에서 바로 플레이할 수 있고 1000개의 스테이지를 제공합니다.'],
      ['퀸즈 퍼즐은 체스의 퀸 퍼즐과 다른가요?', '체스의 N-퀸 문제와 비슷하지만, 색깔 영역마다 퀸이 하나씩 들어가야 한다는 규칙이 더해져 정답이 하나로 정해집니다. 대각선으로 닿지만 않으면 되므로 체스 퀸의 긴 대각선 이동 규칙은 신경 쓰지 않아도 됩니다.'],
      ['수학을 못해도 할 수 있나요?', '네. 숫자 계산이 전혀 없는 순수 논리 퍼즐입니다. 규칙 세 가지만 알면 되고, 첫 스테이지는 작은 격자로 시작해 차근차근 커집니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">크라운 퀘스트 — 퀸즈 논리 퍼즐</h2>
        <p style="${S.lead}"><strong>크라운 퀘스트</strong>는 색깔로 나뉜 격자에 퀸(👑)을 하나씩 놓는 <strong>논리 퍼즐</strong>입니다. 숫자 계산이 전혀 없고 규칙 세 가지만으로 풀 수 있어, 스도쿠와는 또 다른 추리의 재미가 있습니다.</p>
        <h3 style="${S.h3}">세 가지 규칙</h3>
        <p style="${S.p}"><strong>①</strong> 각 색상 영역에 퀸은 정확히 하나. <strong>②</strong> 같은 가로줄(행)과 세로줄(열)에도 퀸은 하나씩만. <strong>③</strong> 퀸끼리는 서로 닿을 수 없으며 가로·세로는 물론 <strong>대각선으로도 인접할 수 없습니다</strong>.</p>
        <h3 style="${S.h3}">푸는 요령</h3>
        <p style="${S.p}">퀸을 놓을 <strong>수 없는</strong> 칸부터 지워 나가는 것이 정석입니다. 어떤 색상 영역에 후보 칸이 하나만 남으면 그 자리가 퀸입니다. 퀸을 하나 확정할 때마다 같은 행·열과 주변 칸이 무더기로 제외되면서 다음 단서가 드러납니다.</p>
        <h3 style="${S.h3}">1000 스테이지 무료</h3>
        <p style="${S.pLast}">작은 격자로 시작해 점점 넓어지며, 진행 상황은 자동 저장됩니다. <strong>공간 추론과 소거법 사고</strong>를 훈련하기 좋은 두뇌 퍼즐입니다.</p>
      </section>`,
  },
  {
    path: 'arrow-puzzle',
    name: '애로우웨이',
    title: '화살표 퍼즐 - 애로우웨이 무료 게임 | 퍼즐 가든',
    description: '화살표 퍼즐 애로우웨이. 서로 얽힌 화살을 하나씩 눌러 판 밖으로 빼내는 무료 논리 퍼즐, 귀여운 모양 스테이지 300개를 설치 없이 즐기세요.',
    priority: '0.9',
    changefreq: 'weekly',
    faqPairs: [
      ['애로우웨이는 어떤 게임인가요?', '애로우웨이는 서로 얽혀 있는 화살을 하나씩 눌러 판 밖으로 빼내는 퍼즐 게임입니다. 화살이 향한 방향으로 나가는 길이 비어 있어야 빠져나갈 수 있어서, 어떤 화살이 어떤 화살을 막고 있는지 찾아내는 재미가 있습니다.'],
      ['화살표 퍼즐은 어떻게 푸나요?', '화살이 가리키는 방향 앞에 다른 화살이 없는 것부터 눌러 빼냅니다. 하나를 빼면 그 뒤에 막혀 있던 화살의 길이 열립니다. 막힌 화살을 눌러도 나갈 수 없으니 순서를 먼저 생각해 보세요.'],
      ['애로우웨이는 무료인가요?', '네, 완전 무료입니다. 설치나 회원가입 없이 브라우저에서 바로 플레이할 수 있고 300개의 스테이지를 제공합니다.'],
      ['어떤 스테이지가 있나요?', '기본 격자 스테이지와 함께 별, 하트, 고래, 기타처럼 판의 모양 자체가 그림이 되는 이미지 스테이지가 섞여 있습니다. 모든 화살을 빼내면 모양이 완성됩니다. 스테이지를 깰수록 난이도가 천천히 올라갑니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">애로우웨이 — 화살표 퍼즐 게임</h2>
        <p style="${S.lead}"><strong>애로우웨이</strong>는 서로 얽혀 있는 <strong>화살</strong>을 하나씩 눌러 판 밖으로 빼내는 <strong>화살표 퍼즐</strong>입니다. 규칙은 단순하지만 어떤 화살이 어떤 화살의 길을 막고 있는지 찾아내는 추리의 재미가 있습니다.</p>
        <h3 style="${S.h3}">게임 방법</h3>
        <p style="${S.p}">화살이 가리키는 방향 앞이 비어 있는 화살을 눌러 빼냅니다. 하나를 빼내면 그 뒤에 막혀 있던 화살이 풀려납니다. <strong>막힌 화살을 누르면 나가지 못하니</strong> 빼내는 순서를 먼저 생각해 보세요. 모든 화살을 빼내면 스테이지 클리어입니다.</p>
        <h3 style="${S.h3}">모양이 되는 스테이지</h3>
        <p style="${S.p}">일반 격자 스테이지 사이사이에 별, 하트, 고래, 기타 같은 <strong>그림 모양 스테이지</strong>가 나옵니다. 판의 모양 자체가 그림이라 화살을 모두 빼내는 과정이 곧 그림을 완성하는 과정입니다.</p>
        <h3 style="${S.h3}">300 스테이지 무료</h3>
        <p style="${S.pLast}">회원가입 없이 바로 시작할 수 있고 진행 상황은 자동 저장됩니다. <strong>관찰력과 순서 추론</strong>을 훈련하기 좋은 두뇌 퍼즐입니다.</p>
      </section>`,
  },
  {
    path: 'jigsaw',
    name: 'Tiny Pieces',
    title: '직소 퍼즐 - Tiny Pieces 무료 그림 맞추기 게임 | 퍼즐 가든',
    description: '직소 퍼즐 Tiny Pieces. 흩어진 조각을 옮겨 귀여운 그림과 명화를 완성하는 무료 그림 맞추기 퍼즐, 설치 없이 브라우저에서 바로 즐기세요.',
    priority: '0.9',
    changefreq: 'weekly',
    faqPairs: [
      ['Tiny Pieces는 어떤 게임인가요?', 'Tiny Pieces는 섞여 있는 그림 조각을 드래그해 서로 바꾸며 원래 그림을 완성하는 직소 퍼즐 게임입니다. 맞는 조각끼리 나란히 놓이면 자동으로 붙어 한 덩어리로 움직입니다.'],
      ['직소 퍼즐은 어떻게 푸나요?', '시작할 때 잠깐 보여주는 원본 그림을 기억한 뒤, 조각을 끌어 원하는 자리에 놓으면 그 자리의 조각과 위치가 바뀝니다. 붙은 조각 덩어리는 함께 옮겨지니 가장자리나 눈에 띄는 그림부터 맞춰 보세요.'],
      ['Tiny Pieces는 무료인가요?', '네, 완전 무료입니다. 설치나 회원가입 없이 바로 플레이할 수 있고 진행 상황은 자동 저장됩니다.'],
      ['어떤 그림이 나오나요?', '귀여운 동물, 마을, 음식 같은 그림과 함께 10스테이지마다 모나리자, 큰 파도, 진주 귀걸이 소녀 같은 명화를 귀엽게 재해석한 그림이 나옵니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">Tiny Pieces — 무료 직소 퍼즐 게임</h2>
        <p style="${S.lead}"><strong>Tiny Pieces</strong>는 흩어진 <strong>그림 조각</strong>을 옮겨 원래 그림을 완성하는 <strong>직소 퍼즐</strong>입니다. 귀엽고 아기자기한 그림을 맞추며 쉬어 가는 힐링 퍼즐입니다.</p>
        <h3 style="${S.h3}">게임 방법</h3>
        <p style="${S.p}">조각을 끌어 다른 자리에 놓으면 두 조각의 위치가 바뀝니다. 서로 맞는 조각끼리 나란히 놓이면 <strong>자동으로 붙어</strong> 함께 움직입니다. 적은 이동으로 완성할수록 별을 더 많이 받습니다.</p>
        <h3 style="${S.h3}">명화 스테이지</h3>
        <p style="${S.pLast}">10스테이지마다 <strong>모나리자, 큰 파도, 별이 빛나는 밤</strong> 같은 명화를 귀엽게 그린 특별 스테이지가 나옵니다. 보드 테두리와 캐릭터를 모아 꾸미는 재미도 있습니다.</p>
      </section>`,
  },
  {
    path: 'daily',
    name: '오늘의 퍼즐',
    title: '오늘의 퍼즐 - 매일 새 문제 데일리 퍼즐 | 퍼즐 가든',
    description: '오늘의 퍼즐, 매일 새로 열리는 데일리 퍼즐 한 문제(스도쿠·워드스택). 클리어하면 코인과 퍼즐력을 받고 월간 도장판을 채워보세요. 무료, 설치 불필요.',
    priority: '0.8',
    changefreq: 'daily',
    faqPairs: [
      ['오늘의 퍼즐은 무엇인가요?', '매일 하루에 한 문제씩 새로 열리는 데일리 스도쿠입니다. 모든 사용자가 같은 날 같은 문제를 풀며, 날짜마다 난이도가 다르게 배정됩니다.'],
      ['오늘의 퍼즐을 풀면 무엇을 받나요?', '클리어하면 코인 100과 퍼즐력 10을 받습니다. 퍼즐력은 랭킹과 칭호에 반영됩니다.'],
      ['오늘의 스도쿠는 몇 시에 바뀌나요?', '한국 시간 기준으로 자정에 다음 날 문제가 열립니다. 하루가 지나면 그날의 문제는 지난 날짜 칸에서 확인할 수 있습니다.'],
      ['지난 날짜의 퍼즐도 볼 수 있나요?', '달력에서 이번 달 문제를 확인할 수 있고, 클리어한 날은 도장으로 표시됩니다. 한 달 도장판을 채우는 것이 목표입니다.'],
      ['오늘의 퍼즐은 무료인가요?', '네, 무료입니다. 설치 없이 브라우저에서 바로 풀 수 있으며, 홈 화면에 추가하면 앱처럼 사용할 수 있습니다.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">오늘의 퍼즐 — 매일 한 문제 데일리 스도쿠</h2>
        <p style="${S.lead}"><strong>오늘의 퍼즐</strong>은 매일 하루에 한 문제씩 새로 열리는 <strong>데일리 스도쿠</strong>입니다. 같은 날에는 모두가 같은 문제를 풀고, 날짜마다 난이도가 다르게 배정되어 매일 다른 감각으로 도전할 수 있습니다.</p>
        <h3 style="${S.h3}">한 달 도장판</h3>
        <p style="${S.p}">문제를 클리어한 날에는 달력에 <strong>도장</strong>이 찍힙니다. 하루하루 채워 나가는 재미가 있어, 매일 10분씩 두뇌를 쓰는 습관을 만들기 좋습니다.</p>
        <h3 style="${S.h3}">클리어 보상</h3>
        <p style="${S.p}">오늘의 퍼즐을 풀면 <strong>코인 100</strong>과 <strong>퍼즐력 10</strong>을 받습니다. 퍼즐력이 쌓이면 랭킹이 오르고 새로운 칭호를 얻을 수 있습니다.</p>
        <h3 style="${S.h3}">설치 없이 바로</h3>
        <p style="${S.pLast}">회원가입 없이 브라우저에서 바로 시작할 수 있습니다. 홈 화면에 추가하면 앱처럼 실행되고 진행 상황도 그대로 이어집니다.</p>
      </section>`,
  },
].map(r => ({
  ...r,
  ogImage: `${BASE_URL}/images/og/${r.path}.jpg`,
  lastmod: r.path === 'daily' ? undefined : '2026-10-01',
  canonical: `${BASE_URL}/${r.path}`,
  lang: 'ko',
  breadcrumbSchema: breadcrumb(r.name, r.path),
  softwareSchema: software(r.name),
  faqSchema: r.faqPairs ? faq(r.faqPairs) : null,
}));

/**
 * 게임 설명(/guide) 페이지 — 내용은 src/features/guide/data/games.ts 가 원본이다.
 * 여기서는 메타태그·sitemap 용 정보만 둔다 (본문은 클라이언트에서 렌더).
 */
const GUIDE_PAGES = [
  ['', '게임 설명', '게임 설명 - 퍼즐 가든 모든 게임 하는 법 | 퍼즐 가든', '워드스택, 스냅스팟, Tiny Pieces, 크라운 퀘스트, 스도쿠, 애로우웨이, 크로썸까지 퍼즐 가든 모든 게임의 규칙과 공략을 자세히 알려드려요.'],
  ['word-sort', '워드스택', '워드스택 하는 법 - 규칙·공략 총정리 | 퍼즐 가든', '워드스택: 카테고리 카드를 슬롯에 열고 같은 종류의 단어를 모으는 카드 분류 퍼즐. 규칙, 남은 횟수, 하드 모드, 순서 레벨, 공략 팁을 자세히 설명합니다.'],
  ['snapspot', '스냅스팟', '스냅스팟 하는 법 - 틀린그림찾기 규칙·공략 | 퍼즐 가든', '스냅스팟: 두 사진 속 달라진 곳을 찾는 틀린그림찾기. 하트, 확대, 힌트 사용법과 공략 팁을 자세히 설명합니다.'],
  ['jigsaw', 'Tiny Pieces', 'Tiny Pieces 하는 법 - 직소 퍼즐 규칙·공략 | 퍼즐 가든', 'Tiny Pieces: 조각을 끌어 맞추는 직소 퍼즐. 그룹 이동, 별 평가, 아이템 사용법과 공략 팁을 자세히 설명합니다.'],
  ['queens', '크라운 퀘스트', '크라운 퀘스트 하는 법 - 규칙·공략 총정리 | 퍼즐 가든', '크라운 퀘스트: 색 구역마다 왕관 하나를 서로 닿지 않게 배치하는 논리 퍼즐. 규칙, 조작법, 더블 레벨, 공략 팁을 설명합니다.'],
  ['sudoku', '스도쿠', '스도쿠 하는 법 - 모드·규칙·공략 총정리 | 퍼즐 가든', '스도쿠: 입문자 6×6부터 빅 사이즈 16×16, 타임어택까지. 규칙, 모드별 특징, 메모·힌트 사용법과 공략 팁을 설명합니다.'],
  ['arrow-puzzle', '애로우웨이', '애로우웨이 하는 법 - 규칙·공략 총정리 | 퍼즐 가든', '애로우웨이: 얽힌 화살을 길이 열린 순서대로 빼내는 퍼즐. 하트, 별 평가, 순서 찾는 요령을 자세히 설명합니다.'],
  ['cross-math', '크로썸', '크로썸 하는 법 - 수식 퍼즐 규칙·공략 | 퍼즐 가든', '크로썸: 가로세로 수식의 빈칸을 숫자 타일로 채우는 계산 퍼즐. 규칙, 조작법, 난이도 구간, 공략 팁을 설명합니다.'],
].map(([id, name, title, description]) => {
  const path = id ? `guide/${id}` : 'guide';
  return {
    path,
    name,
    title,
    description,
    priority: id ? '0.7' : '0.8',
    changefreq: 'monthly',
    lastmod: '2026-11-05',
    ogImage: `${BASE_URL}/images/og/${id || 'home'}.jpg`,
    canonical: `${BASE_URL}/${path}`,
    lang: 'ko',
    breadcrumbSchema: breadcrumb(name, path),
    softwareSchema: null,
    faqSchema: null,
  };
});
routes.push(...GUIDE_PAGES);

/** 홈 공유 이미지 */
export const HOME_OG_IMAGE = `${BASE_URL}/images/og/home.jpg`;

/* ------------------------------------------------------------------ *
 * English (phase 1): /en/ 접두 경로. 홈 + 스도쿠·퀸즈·직소·스냅스팟만.
 * 한국어 문구의 직역이 아니라 영어 검색 의도(free online sudoku, queens
 * puzzle, jigsaw puzzle online free, spot the difference game)에 맞춘 카피.
 * 사실관계(스테이지 수, 모드 등)는 한국어 항목에서 확인된 것만 쓴다.
 * ------------------------------------------------------------------ */

/** 영어 BreadcrumbList — 루트는 /en/ */
const breadcrumbEn = (name, slug) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Puzzle Garden', item: `${BASE_URL}/en/` },
    { '@type': 'ListItem', position: 2, name, item: `${BASE_URL}/en/${slug}` },
  ],
});

/** 영어 SoftwareApplication — 무료 웹 게임. 영어권 기준 USD, price 0 */
const softwareEn = (name) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: `${name} - Puzzle Garden`,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  inLanguage: 'en',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
});

/** 영어 홈의 WebSite + ItemList (index.html 의 한국어 JSON-LD 를 대체) */
const homeSchemasEn = () => [
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Puzzle Garden',
    url: `${BASE_URL}/en/`,
    description: 'Free online puzzle games in your browser: Sudoku, jigsaw puzzles, Queens logic puzzles and spot the difference.',
    inLanguage: 'en',
  }),
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Puzzle Garden games',
    itemListElement: [
      ['Sudoku', 'Classic 9×9 Sudoku with several difficulty levels and a time attack mode. Free to play.', 'sudoku'],
      ['Crown Quest (Queens Puzzle)', 'Place one queen in every colored region so that no two queens touch. A pure logic puzzle with 1000 stages.', 'queens'],
      ['Tiny Pieces (Jigsaw Puzzle)', 'Drag and swap scattered pieces to rebuild cute pictures and tiny takes on famous paintings.', 'jigsaw'],
      ['SnapSpot (Spot the Difference)', 'Compare two photos and tap every difference. Normal, time attack and arcade modes.', 'snapspot'],
    ].map(([name, description, slug], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'VideoGame',
        name,
        description,
        url: `${BASE_URL}/en/${slug}`,
        genre: 'Puzzle',
        gamePlatform: 'Browser',
        inLanguage: 'en',
        isAccessibleForFree: true,
      },
    })),
  }),
];

const enRoutes = [
  {
    path: 'en',
    slug: '',
    name: 'Puzzle Garden',
    title: 'Puzzle Garden - Free Online Puzzle Games: Sudoku, Jigsaw & More',
    description: 'Play free online puzzle games in your browser: Sudoku, jigsaw puzzles, Queens logic puzzles and spot the difference. No download, no sign-up.',
    keywords: 'free online puzzle games, online sudoku, free sudoku, jigsaw puzzle online, queens puzzle, spot the difference game, logic puzzles, brain games',
    priority: '1.0',
    changefreq: 'daily',
    ogImage: `${BASE_URL}/images/og/home.jpg`,
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">Puzzle Garden — free online puzzle games</h2>
        <p style="${S.lead}"><strong>Puzzle Garden</strong> is a collection of free <strong>online puzzle games</strong> that run right in your browser. There is nothing to install and no account to create, so you can open a puzzle and start playing in seconds on your phone, tablet or computer.</p>
        <h3 style="${S.h3}">Games you can play</h3>
        <p style="${S.p}"><a href="${BASE_URL}/en/sudoku"><strong>Sudoku</strong></a> is the classic 9×9 number-placement puzzle, with several difficulty levels and a time attack mode. <a href="${BASE_URL}/en/queens"><strong>Crown Quest</strong></a> is a Queens-style logic puzzle where you place one queen in every colored region. <a href="${BASE_URL}/en/jigsaw"><strong>Tiny Pieces</strong></a> is a relaxing jigsaw puzzle with cute pictures. <a href="${BASE_URL}/en/snapspot"><strong>SnapSpot</strong></a> is a spot the difference game with more than 750 stages.</p>
        <h3 style="${S.h3}">Free, simple, and quick to pick up</h3>
        <p style="${S.pLast}">Every game is free to play and works without sign-up. Short rounds make Puzzle Garden easy to fit into a coffee break, and each game starts gently and gets harder as you improve.</p>
      </section>`,
  },
  {
    path: 'en/sudoku',
    slug: 'sudoku',
    name: 'Sudoku',
    title: 'Free Online Sudoku - Play Classic Sudoku Puzzles | Puzzle Garden',
    description: 'Play free online Sudoku in your browser: classic 9×9 puzzles from beginner to hard, with notes, hints and a time attack mode. No download or sign-up.',
    keywords: 'free online sudoku, sudoku online, play sudoku, sudoku puzzles, easy sudoku, hard sudoku, how to play sudoku, sudoku rules',
    priority: '0.9',
    changefreq: 'monthly',
    ogImage: `${BASE_URL}/images/og/sudoku.jpg`,
    faqPairs: [
      ['What is Sudoku?', 'Sudoku is a logic puzzle played on a 9×9 grid. Fill every cell with a digit from 1 to 9 so that each row, each column and each 3×3 box contains every digit exactly once. No math is involved; it is solved purely by logic.'],
      ['Can I play Sudoku online for free?', 'Yes. Sudoku on Puzzle Garden is completely free. You can play right in your browser with no download and no sign-up, from beginner puzzles up to hard ones.'],
      ['Which difficulty should a beginner start with?', 'Start with the beginner or easy level. Difficulty rises step by step, so you can build skill gradually. Once you feel comfortable, try the time attack mode for an extra challenge.'],
      ['What are the rules of Sudoku and how do I solve it?', 'Place digits 1 to 9 in the empty cells without repeating a digit in any row, column or bold-outlined 3×3 box. Begin with cells that have only one possible digit. Each digit you place removes candidates from neighboring cells, which makes the next cell easier.'],
      ['Are there Sudoku grids other than 9×9?', 'Yes. Besides the classic 9×9 grid there are smaller beginner grids starting at 6×6 and bigger grids up to 16×16, plus a time attack mode. Notes and hints are available while you play.'],
      ['Is Sudoku good for your brain?', 'Sudoku exercises focus, logical thinking and short-term memory. Many people enjoy it as a short daily mental workout.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">Free online Sudoku — classic puzzles in your browser</h2>
        <p style="${S.lead}"><strong>Sudoku</strong> is a logic puzzle played on a 9×9 grid. Every row, every column and every 3×3 box must contain the digits 1 to 9 exactly once. You do not need any math; patience and careful logic are all it takes, which is why it is one of the world's most popular <strong>brain games</strong>.</p>
        <h3 style="${S.h3}">How to play Sudoku</h3>
        <p style="${S.p}">Tap an empty cell and enter a digit from 1 to 9. A digit cannot repeat in the same row, column or box. If you are new to the game, begin with the <strong>beginner</strong> or <strong>easy</strong> level and use notes to keep track of candidates. Look for cells where only one digit fits, fill them in, and keep going: each new digit narrows down the rest of the grid.</p>
        <h3 style="${S.h3}">Difficulty levels and modes</h3>
        <p style="${S.p}">Choose from beginner, easy, normal and hard puzzles. Smaller grids starting at 6×6 make a gentle introduction, bigger grids up to 16×16 offer a long challenge, and the time attack mode lets you race the clock.</p>
        <h3 style="${S.h3}">A quick mental workout</h3>
        <p style="${S.pLast}">Sudoku trains <strong>concentration, logical thinking and short-term memory</strong>. A puzzle or two a day is an easy habit, and it is free to play with no download or sign-up.</p>
      </section>`,
  },
  {
    path: 'en/queens',
    slug: 'queens',
    name: 'Crown Quest (Queens Puzzle)',
    title: 'Queens Puzzle - Free Online Crown Quest Logic Game | Puzzle Garden',
    description: 'Play the Queens puzzle free online. Place one queen in every colored region with none in the same row or column or touching. Crown Quest has 1000 free stages, no download needed.',
    keywords: 'queens puzzle, queens game, queens puzzle online, free queens puzzle, crown quest, logic puzzle online, queens logic puzzle',
    priority: '0.9',
    changefreq: 'monthly',
    ogImage: `${BASE_URL}/images/og/queens.jpg`,
    faqPairs: [
      ['What is Crown Quest (the Queens puzzle)?', 'Crown Quest is a Queens-style logic puzzle played on a grid divided into colored regions. Place exactly one queen in each colored region and exactly one in every row and every column. No two queens may touch, including diagonally.'],
      ['How do you solve a Queens puzzle?', 'Work by elimination. Cross out cells where a queen cannot go; when a colored region has only one candidate cell left, that cell must hold its queen. Every queen you place rules out the rest of its row and column and all its neighbors, which reveals the next clue.'],
      ['Is Crown Quest free to play?', 'Yes, it is completely free. You can play in your browser with no download and no sign-up, there are 1000 stages, and your progress is saved automatically.'],
      ['Is this different from the chess N-Queens puzzle?', 'It is a close relative. The classic N-Queens problem only asks for queens that do not attack each other, while here each colored region must also hold exactly one queen, which leads to a single correct solution. Queens only need to avoid touching their neighbors, so you do not have to track long chess diagonals.'],
      ['Do I need to be good at math?', 'No. There is no arithmetic at all. It is a pure logic puzzle with just three rules, and the first stages start on small grids before growing larger.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">Crown Quest — a free Queens logic puzzle</h2>
        <p style="${S.lead}"><strong>Crown Quest</strong> is a <strong>Queens puzzle</strong>: a logic game where you place one queen (👑) in every colored region of a grid. There is no arithmetic, and just three rules are enough to play, so it offers a different flavor of deduction from Sudoku.</p>
        <h3 style="${S.h3}">The three rules</h3>
        <p style="${S.p}"><strong>1.</strong> Each colored region contains exactly one queen. <strong>2.</strong> Each row and each column contains exactly one queen. <strong>3.</strong> No two queens may touch, and that includes <strong>diagonally</strong>.</p>
        <h3 style="${S.h3}">How to solve it</h3>
        <p style="${S.p}">Start by crossing out cells where a queen <strong>cannot</strong> go. When a colored region is down to a single candidate cell, that is where its queen belongs. Each confirmed queen eliminates its whole row, column and surrounding cells, and the next clue appears.</p>
        <h3 style="${S.h3}">1000 free stages</h3>
        <p style="${S.pLast}">Stages begin on small grids and grow larger, and your progress saves automatically. Crown Quest is a good way to practice <strong>spatial reasoning and process-of-elimination thinking</strong>, with no download or sign-up.</p>
      </section>`,
  },
  {
    path: 'en/jigsaw',
    slug: 'jigsaw',
    name: 'Tiny Pieces (Jigsaw Puzzle)',
    title: 'Jigsaw Puzzle Online Free - Tiny Pieces | Puzzle Garden',
    description: 'Play jigsaw puzzles online for free. Swap scattered pieces to rebuild cute pictures and tiny takes on famous paintings. Tiny Pieces runs in your browser.',
    keywords: 'jigsaw puzzle online free, online jigsaw puzzles, free jigsaw puzzles, picture puzzle game, tiny pieces, relaxing puzzle game',
    priority: '0.9',
    changefreq: 'weekly',
    ogImage: `${BASE_URL}/images/og/jigsaw.jpg`,
    faqPairs: [
      ['What is Tiny Pieces?', 'Tiny Pieces is a jigsaw puzzle game where you drag shuffled picture pieces and swap them to rebuild the original image. When matching pieces end up side by side, they snap together and move as one group.'],
      ['How do I play the jigsaw puzzle?', 'Study the preview picture shown at the start, then drag a piece onto the spot where you want it. It swaps places with the piece already there. Joined groups move together, so begin with the edges or distinctive parts of the picture.'],
      ['Is Tiny Pieces free?', 'Yes, it is completely free. You can play online in your browser with no download and no sign-up, and your progress is saved automatically.'],
      ['What pictures will I see?', 'You will find cute animals, towns and food, and every 10 stages there is a special stage with a cute re-imagining of a famous painting such as the Mona Lisa, The Great Wave or Girl with a Pearl Earring.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">Tiny Pieces — free online jigsaw puzzle</h2>
        <p style="${S.lead}"><strong>Tiny Pieces</strong> is a relaxing <strong>jigsaw puzzle</strong> you can play online for free. Move scattered <strong>picture pieces</strong> into place to rebuild a cute, colorful image, no download needed.</p>
        <h3 style="${S.h3}">How to play</h3>
        <p style="${S.p}">Drag a piece to another spot and the two pieces trade places. When the right pieces end up next to each other they <strong>snap together automatically</strong> and move as one. Finish with fewer moves to earn more stars.</p>
        <h3 style="${S.h3}">Famous paintings, reimagined</h3>
        <p style="${S.pLast}">Every 10 stages brings a special puzzle based on a famous painting, such as the <strong>Mona Lisa, The Great Wave and Starry Night</strong>, redrawn in a cute style. You can also collect board frames and characters to decorate your game.</p>
      </section>`,
  },
  {
    path: 'en/snapspot',
    slug: 'snapspot',
    name: 'SnapSpot (Spot the Difference)',
    title: 'Spot the Difference Game - Free Online SnapSpot | Puzzle Garden',
    description: 'Play a free spot the difference game online. Compare two photos and tap every difference in Normal, Time Attack and Arcade modes, with 750+ stages to play.',
    keywords: 'spot the difference game, spot the difference online, find the differences, free spot the difference, picture difference game, snapspot',
    priority: '0.9',
    changefreq: 'weekly',
    ogImage: `${BASE_URL}/images/og/snapspot.jpg`,
    faqPairs: [
      ['What is SnapSpot?', 'SnapSpot is a spot the difference game. Two photos sit side by side, and you tap the spots where they differ.'],
      ['Can I play spot the difference for free?', 'Yes, SnapSpot is completely free. You can play it in your browser with no download and no sign-up.'],
      ['What game modes are there?', 'There is a Normal mode where you work through stages one by one, a Time Attack mode where you race a time limit, and an Arcade mode that keeps the stages coming. More than 750 stages are available.'],
      ['Any tips for finding the differences?', 'Split each photo into four quadrants and compare them one at a time so you miss fewer spots. Look beyond changes in color and size: small objects that disappear or appear are common differences.'],
      ['Is spot the difference good for your brain?', 'It exercises visual attention, attention to detail and visual memory as you compare two images. It is a quick way to sharpen your focus.'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">SnapSpot — free spot the difference game</h2>
        <p style="${S.lead}"><strong>SnapSpot</strong> is a <strong>spot the difference</strong> game: two photos look nearly identical, and your job is to find what has changed. The rules are simple enough to start right away, and the differences get sneakier as you move up through the stages.</p>
        <h3 style="${S.h3}">How to play</h3>
        <p style="${S.p}">Look back and forth between the two photos, and when you notice a difference, tap or click that spot. Find them all to clear the stage.</p>
        <h3 style="${S.h3}">Three game modes</h3>
        <p style="${S.p}"><strong>Normal</strong> takes you through the stages one at a time, <strong>Time Attack</strong> challenges you to find differences before the clock runs out, and <strong>Arcade</strong> keeps the stages flowing without a break. More than 750 stages are ready to play.</p>
        <h3 style="${S.h3}">Train your eye</h3>
        <p style="${S.pLast}">Spot the difference builds <strong>visual attention and eye for detail</strong>. Comparing two images in your head also works your visual memory, making it a good way to sharpen your focus in a few minutes.</p>
      </section>`,
  },
].map(r => ({
  ...r,
  lang: 'en',
  lastmod: r.path === 'en' ? undefined : '2026-11-16',
  canonical: r.path === 'en' ? `${BASE_URL}/en/` : `${BASE_URL}/${r.path}`,
  breadcrumbSchema: r.path === 'en' ? null : breadcrumbEn(r.name, r.slug),
  softwareSchema: r.path === 'en' ? null : softwareEn(r.name),
  faqSchema: r.faqPairs ? faq(r.faqPairs) : null,
  extraSchemas: r.path === 'en' ? homeSchemasEn() : [],
}));
routes.push(...enRoutes);

/* ------------------------------------------------------------------ *
 * 日本語: /ja/ 接頭パス。ホーム + 数独・クイーンズ・ジグソー・スナップスポット。
 * 韓国語の直訳ではなく日本語の検索意図(数独 ナンプレ 無料, クイーンズパズル,
 * ジグソーパズル 無料 オンライン, 間違い探し 無料)に合わせたコピー。
 * 事実関係(ステージ数・モード等)は韓国語/英語項目で確認できたものだけ使う。
 * ------------------------------------------------------------------ */

const breadcrumbJa = (name, slug) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'パズルガーデン', item: `${BASE_URL}/ja/` },
    { '@type': 'ListItem', position: 2, name, item: `${BASE_URL}/ja/${slug}` },
  ],
});

const softwareJa = (name) => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: `${name} - パズルガーデン`,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web Browser',
  inLanguage: 'ja',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
});

const homeSchemasJa = () => [
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'パズルガーデン',
    url: `${BASE_URL}/ja/`,
    description: '数独（ナンプレ）、ジグソーパズル、クイーンズパズル、間違い探しをブラウザで無料で遊べるオンラインパズルゲーム集。',
    inLanguage: 'ja',
  }),
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'パズルガーデンのゲーム一覧',
    itemListElement: [
      ['数独（ナンプレ）', '定番の9×9数独を、複数の難易度とタイムアタックモードで楽しめます。無料で遊べます。', 'sudoku'],
      ['クラウンクエスト（クイーンズパズル）', '色分けされた各エリアに女王を1つずつ配置し、どの女王も隣り合わないようにする論理パズル。全1000ステージ。', 'queens'],
      ['タイニーピース（ジグソーパズル）', 'バラバラのピースをドラッグして入れ替え、かわいい絵や名画のミニチュア版を完成させるパズルです。', 'jigsaw'],
      ['スナップスポット（間違い探し）', '2枚の写真を見比べて違いをタップ。ノーマル、タイムアタック、アーケードの3モードで遊べます。', 'snapspot'],
    ].map(([name, description, slug], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'VideoGame',
        name,
        description,
        url: `${BASE_URL}/ja/${slug}`,
        genre: 'Puzzle',
        gamePlatform: 'Browser',
        inLanguage: 'ja',
        isAccessibleForFree: true,
      },
    })),
  }),
];

const jaRoutes = [
  {
    path: 'ja',
    slug: '',
    name: 'パズルガーデン',
    title: 'パズルガーデン - 無料パズルゲーム｜数独・ジグソー・間違い探し',
    description: '数独（ナンプレ）、ジグソーパズル、クイーンズパズル、間違い探しをブラウザで無料プレイ。ダウンロードも会員登録も不要で、スマホでもパソコンでもすぐに遊べます。',
    keywords: 'パズルゲーム 無料, オンライン パズル, 数独 無料, ナンプレ 無料, ジグソーパズル 無料, 間違い探し 無料, クイーンズパズル, 脳トレ ゲーム',
    priority: '1.0',
    changefreq: 'daily',
    ogImage: `${BASE_URL}/images/og/home.jpg`,
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">パズルガーデン - 無料で遊べるオンラインパズルゲーム</h2>
        <p style="${S.lead}"><strong>パズルガーデン</strong>は、ブラウザで遊べる無料の<strong>オンラインパズルゲーム</strong>集です。アプリのインストールや会員登録は不要。スマホ、タブレット、パソコンから、思い立ったらすぐに遊べます。</p>
        <h3 style="${S.h3}">遊べるゲーム</h3>
        <p style="${S.p}"><a href="${BASE_URL}/ja/sudoku"><strong>数独（ナンプレ）</strong></a>は定番の9×9ナンバープレースで、複数の難易度とタイムアタックモードを用意。<a href="${BASE_URL}/ja/queens"><strong>クラウンクエスト</strong></a>は、色分けされたエリアに女王を1つずつ置くクイーンズパズルです。<a href="${BASE_URL}/ja/jigsaw"><strong>タイニーピース</strong></a>はかわいい絵柄のジグソーパズル。<a href="${BASE_URL}/ja/snapspot"><strong>スナップスポット</strong></a>は750以上のステージがある間違い探しゲームです。</p>
        <h3 style="${S.h3}">無料で、手軽に、気軽に</h3>
        <p style="${S.pLast}">すべてのゲームが無料で、登録なしで遊べます。1回のプレイが短いので、休憩時間や通勤の合間の脳トレにもぴったり。最初はやさしく、上達するほど歯ごたえのある問題に挑戦できます。</p>
      </section>`,
  },
  {
    path: 'ja/sudoku',
    slug: 'sudoku',
    name: '数独（ナンプレ）',
    title: '数独（ナンプレ）無料オンライン - ブラウザで遊べる数独｜パズルガーデン',
    description: '数独（ナンプレ）を無料でオンラインプレイ。初級から上級までの9×9問題、メモ・ヒント機能、タイムアタックモードも。ダウンロード・登録不要でそのまま遊べます。',
    keywords: '数独 無料, ナンプレ 無料, 数独 オンライン, ナンバープレース, 数独 初級, 数独 上級, 数独 解き方, 数独 ルール, 脳トレ',
    priority: '0.9',
    changefreq: 'monthly',
    ogImage: `${BASE_URL}/images/og/sudoku.jpg`,
    faqPairs: [
      ['数独（ナンプレ）とは何ですか？', '数独は9×9のマスに1から9までの数字を入れる論理パズルです。縦の列、横の行、太線で囲まれた3×3のブロックのそれぞれに、1〜9の数字が1つずつ入るようにします。計算は不要で、論理的な推理だけで解けます。ナンプレ（ナンバープレース）とも呼ばれます。'],
      ['数独は無料でオンラインプレイできますか？', 'はい、パズルガーデンの数独は完全無料です。ダウンロードや会員登録は不要で、ブラウザからそのまま初級から上級までの問題に挑戦できます。'],
      ['初心者はどの難易度から始めればいいですか？', 'まずは初級かやさしいレベルがおすすめです。難易度は段階的に上がるので、少しずつ慣れていけます。慣れてきたらタイムアタックモードで、スピードにも挑戦してみてください。'],
      ['数独のルールと解き方のコツを教えてください。', '空きマスに1〜9の数字を入れ、同じ数字が行・列・3×3ブロックで重複しないようにします。まずは入る数字が1つしかないマスから埋めましょう。数字を入れるたびに周りのマスの候補が減り、次のマスが見つけやすくなります。'],
      ['9×9以外の盤面もありますか？', 'はい。定番の9×9のほか、6×6から始まる初心者向けの小さな盤面や、最大16×16の大きな盤面、タイムアタックモードがあります。プレイ中はメモとヒントも使えます。'],
      ['数独は脳トレになりますか？', '数独は集中力、論理的思考力、短期記憶を使うパズルです。毎日の短い脳トレとして楽しんでいる人も多くいます。'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">数独（ナンプレ）を無料でオンラインプレイ</h2>
        <p style="${S.lead}"><strong>数独</strong>（<strong>ナンプレ</strong>／ナンバープレース）は、9×9のマスに数字を入れていく論理パズルです。どの行・列・3×3ブロックにも、1〜9の数字が1つずつ入るようにします。計算は必要なく、根気と推理力だけで解けるため、世界中で愛されている<strong>脳トレ</strong>パズルです。</p>
        <h3 style="${S.h3}">数独の遊び方</h3>
        <p style="${S.p}">空きマスをタップして、1〜9の数字を入力します。同じ行・列・ブロックに同じ数字は入れられません。初めての方は<strong>初級</strong>や<strong>やさしい</strong>レベルから始め、メモ機能で候補の数字を書き込みながら進めましょう。入る数字が1つに絞られるマスを見つけて埋めていくと、盤面全体が少しずつ解けていきます。</p>
        <h3 style="${S.h3}">難易度とモード</h3>
        <p style="${S.p}">初級、やさしい、ふつう、むずかしいの難易度から選べます。6×6の小さな盤面から始められるので入門にぴったり。最大16×16の大きな盤面でじっくり挑戦することも、タイムアタックモードでタイムを競うこともできます。</p>
        <h3 style="${S.h3}">すきま時間の脳トレに</h3>
        <p style="${S.pLast}">数独は<strong>集中力・論理的思考力・短期記憶</strong>を鍛えてくれます。1日1問でも続けやすく、ダウンロードも登録も不要の無料ゲームです。</p>
      </section>`,
  },
  {
    path: 'ja/queens',
    slug: 'queens',
    name: 'クラウンクエスト（クイーンズパズル）',
    title: 'クイーンズパズル無料オンライン - クラウンクエスト｜パズルガーデン',
    description: 'クイーンズパズルを無料でオンラインプレイ。色分けされた各エリアに女王を1つずつ置き、縦横斜めで隣り合わないようにする論理パズル。クラウンクエストは全1000ステージ。',
    keywords: 'クイーンズ パズル, クイーンズパズル 無料, クイーンズ ゲーム, クラウンクエスト, 論理パズル 無料, 女王 パズル, 脳トレ ゲーム',
    priority: '0.9',
    changefreq: 'monthly',
    ogImage: `${BASE_URL}/images/og/queens.jpg`,
    faqPairs: [
      ['クラウンクエスト（クイーンズパズル）とは何ですか？', 'クラウンクエストは、色分けされた盤面に女王（クイーン）を置いていく論理パズルです。各色のエリアに1つ、各行・各列にも1つずつ女王を置きます。女王同士は斜めを含め、隣り合ってはいけません。'],
      ['クイーンズパズルの解き方のコツは？', '消去法で進めるのが基本です。女王を置けないマスにバツ印をつけ、あるエリアの候補が1マスだけになったら、そこが女王の位置になります。女王を置くとその行・列・周囲のマスが埋まるので、次のヒントが見えてきます。'],
      ['クラウンクエストは無料で遊べますか？', 'はい、完全無料です。ブラウザからダウンロードや登録なしで遊べます。全1000ステージで、進行状況は自動で保存されます。'],
      ['チェスのNクイーン問題とは違いますか？', '近い仲間ですが、少し違います。Nクイーン問題は女王同士が攻撃し合わない配置を求めますが、このパズルでは色分けされた各エリアにも女王を1つずつ置くため、正解が1つに定まります。また、女王は隣のマスに接しなければよく、遠くの斜め線を気にする必要はありません。'],
      ['計算が苦手でも遊べますか？', 'はい。計算は一切ありません。ルールは3つだけの純粋な論理パズルです。最初のステージは小さな盤面から始まり、少しずつ大きくなっていきます。'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">クラウンクエスト - 無料のクイーンズパズル</h2>
        <p style="${S.lead}"><strong>クラウンクエスト</strong>は、色分けされた盤面の各エリアに女王（👑）を1つずつ置く<strong>クイーンズパズル</strong>です。計算は不要で、ルールは3つだけ。数独とはひと味違う推理の面白さが楽しめます。</p>
        <h3 style="${S.h3}">3つのルール</h3>
        <p style="${S.p}"><strong>1.</strong> 色分けされた各エリアに、女王をちょうど1つ置く。<strong>2.</strong> 各行・各列にも、女王をちょうど1つ置く。<strong>3.</strong> 女王同士は、<strong>斜めを含めて</strong>隣り合ってはいけない。</p>
        <h3 style="${S.h3}">解き方のヒント</h3>
        <p style="${S.p}">まず、女王を<strong>置けない</strong>マスにバツ印をつけていきましょう。あるエリアの候補が1マスだけになったら、そこが女王の場所です。女王が決まるたびにその行・列・周囲のマスが消え、次の手がかりが現れます。</p>
        <h3 style="${S.h3}">全1000ステージを無料で</h3>
        <p style="${S.pLast}">小さな盤面から始まり、少しずつ大きくなっていきます。進行状況は自動保存。<strong>空間認識力と消去法の思考力</strong>を鍛えるのにぴったりで、ダウンロードも登録も不要です。</p>
      </section>`,
  },
  {
    path: 'ja/jigsaw',
    slug: 'jigsaw',
    name: 'タイニーピース（ジグソーパズル）',
    title: 'ジグソーパズル無料オンライン - タイニーピース｜パズルガーデン',
    description: 'ジグソーパズルを無料でオンラインプレイ。バラバラのピースを入れ替えて、かわいい絵や名画のミニチュア版を完成させよう。タイニーピースはブラウザですぐ遊べます。',
    keywords: 'ジグソーパズル 無料, ジグソーパズル オンライン, ジグソーパズル ゲーム, 絵合わせ パズル, タイニーピース, 癒し パズル',
    priority: '0.9',
    changefreq: 'weekly',
    ogImage: `${BASE_URL}/images/og/jigsaw.jpg`,
    faqPairs: [
      ['タイニーピースとは何ですか？', 'タイニーピースは、バラバラになった絵のピースをドラッグして入れ替え、元の絵を完成させるジグソーパズルゲームです。正しいピース同士が隣り合うとくっついて、ひとまとまりで動かせるようになります。'],
      ['ジグソーパズルの遊び方を教えてください。', '最初に表示される完成見本を確認して、ピースを置きたい場所にドラッグします。その場所にあったピースと入れ替わります。くっついたグループは一緒に動くので、端のピースや特徴的な部分から始めるのがおすすめです。'],
      ['タイニーピースは無料ですか？', 'はい、完全無料です。ダウンロードや会員登録は不要で、ブラウザでそのまま遊べます。進行状況は自動で保存されます。'],
      ['どんな絵柄がありますか？', 'かわいい動物、街並み、食べ物などの絵柄があります。10ステージごとに、モナ・リザ、神奈川沖浪裏、真珠の耳飾りの少女などの名画をかわいくアレンジした特別ステージが登場します。'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">タイニーピース - 無料のオンラインジグソーパズル</h2>
        <p style="${S.lead}"><strong>タイニーピース</strong>は、オンラインで無料で遊べる癒し系の<strong>ジグソーパズル</strong>です。バラバラになった<strong>絵のピース</strong>を動かして、かわいくてカラフルな絵を完成させましょう。ダウンロードは不要です。</p>
        <h3 style="${S.h3}">遊び方</h3>
        <p style="${S.p}">ピースをほかの場所にドラッグすると、2つのピースが入れ替わります。正しいピース同士が隣り合うと<strong>自動でくっつき</strong>、ひとまとまりで動かせます。少ない手数でクリアするほど、たくさんの星がもらえます。</p>
        <h3 style="${S.h3}">名画をかわいく再現</h3>
        <p style="${S.pLast}">10ステージごとに、<strong>モナ・リザ、神奈川沖浪裏、星月夜</strong>などの名画をかわいいタッチで描き直した特別なパズルが登場します。ボードのフレームやキャラクターを集めて、自分好みに飾ることもできます。</p>
      </section>`,
  },
  {
    path: 'ja/snapspot',
    slug: 'snapspot',
    name: 'スナップスポット（間違い探し）',
    title: '間違い探しゲーム無料オンライン - スナップスポット｜パズルガーデン',
    description: '間違い探しゲームを無料でオンラインプレイ。2枚の写真を見比べて違いをタップ。ノーマル・タイムアタック・アーケードの3モードで、750以上のステージが遊べます。',
    keywords: '間違い探し 無料, 間違い探し ゲーム, 間違い探し オンライン, 間違い探し 写真, 脳トレ 間違い探し, スナップスポット',
    priority: '0.9',
    changefreq: 'weekly',
    ogImage: `${BASE_URL}/images/og/snapspot.jpg`,
    faqPairs: [
      ['スナップスポットとは何ですか？', 'スナップスポットは間違い探しゲームです。2枚の写真が並んで表示されるので、違っている場所をタップして見つけます。'],
      ['間違い探しは無料で遊べますか？', 'はい、スナップスポットは完全無料です。ダウンロードや会員登録は不要で、ブラウザからそのまま遊べます。'],
      ['どんなゲームモードがありますか？', 'ステージを1つずつ進めるノーマルモード、制限時間内に挑戦するタイムアタックモード、ステージが途切れず続くアーケードモードがあります。ステージ数は750以上です。'],
      ['間違いを見つけるコツはありますか？', '写真を4つの領域に分けて、1つずつ見比べると見落としが減ります。色や大きさの変化だけでなく、小さな物が消えていたり増えていたりするパターンもよくあります。'],
      ['間違い探しは脳トレになりますか？', '2枚の画像を見比べることで、視覚的な注意力、観察力、視覚記憶を使います。短時間で集中力を鍛えるのにおすすめです。'],
    ],
    seoContent: `
      <section style="${S.section}">
        <h2 style="${S.h2}">スナップスポット - 無料の間違い探しゲーム</h2>
        <p style="${S.lead}"><strong>スナップスポット</strong>は、ほぼ同じに見える2枚の写真から違いを見つける<strong>間違い探しゲーム</strong>です。ルールは簡単ですぐに始められ、ステージが進むほど違いは見つけにくくなっていきます。</p>
        <h3 style="${S.h3}">遊び方</h3>
        <p style="${S.p}">2枚の写真を見比べて、違いを見つけたらその場所をタップします。すべての違いを見つければステージクリアです。</p>
        <h3 style="${S.h3}">3つのゲームモード</h3>
        <p style="${S.p}"><strong>ノーマル</strong>はステージを1つずつ進むモード、<strong>タイムアタック</strong>は制限時間内に違いを見つけるモード、<strong>アーケード</strong>はステージが途切れず続くモードです。750以上のステージが遊べます。</p>
        <h3 style="${S.h3}">観察力を鍛えよう</h3>
        <p style="${S.pLast}">間違い探しは<strong>視覚的な注意力と観察力</strong>を鍛えます。2枚の画像を頭の中で見比べるので視覚記憶も使い、数分で集中力を高めたいときにぴったりです。</p>
      </section>`,
  },
].map(r => ({
  ...r,
  lang: 'ja',
  lastmod: r.path === 'ja' ? undefined : '2026-11-16',
  canonical: r.path === 'ja' ? `${BASE_URL}/ja/` : `${BASE_URL}/${r.path}`,
  breadcrumbSchema: r.path === 'ja' ? null : breadcrumbJa(r.name, r.slug),
  softwareSchema: r.path === 'ja' ? null : softwareJa(r.name),
  faqSchema: r.faqPairs ? faq(r.faqPairs) : null,
  extraSchemas: r.path === 'ja' ? homeSchemasJa() : [],
}));
routes.push(...jaRoutes);


/* ------------------------------------------------------------------ *
 * 언어 레지스트리 + 신규 언어(de/es/fr/pt/zh) 자동 등록
 *
 * scripts/seo-lang/<lang>.mjs (데이터 전용, 형식은 scripts/seo-lang/README.md)가
 * 있으면 아래 빌더가 en 과 같은 구조의 라우트를 만들어 routes 에 추가한다.
 * 파일이 없으면 조용히 건너뛴다 (0~5개 모두 빌드 통과). `_` 로 시작하는 파일은 무시.
 * ------------------------------------------------------------------ */

/** 언어 레지스트리. prefix '' 는 루트(한국어). */
export const LANGS = {
  ko: { prefix: '', htmlLang: 'ko', hreflang: 'ko', ogLocale: 'ko_KR', siteName: '퍼즐 가든', currency: 'KRW' },
  en: { prefix: 'en', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US', siteName: 'Puzzle Garden', currency: 'USD' },
  ja: { prefix: 'ja', htmlLang: 'ja', hreflang: 'ja', ogLocale: 'ja_JP', siteName: 'パズルガーデン', currency: 'JPY' },
  de: { prefix: 'de', htmlLang: 'de', hreflang: 'de', ogLocale: 'de_DE', siteName: 'Puzzle Garden', currency: 'EUR' },
  es: { prefix: 'es', htmlLang: 'es', hreflang: 'es', ogLocale: 'es_ES', siteName: 'Puzzle Garden', currency: 'EUR' },
  fr: { prefix: 'fr', htmlLang: 'fr', hreflang: 'fr', ogLocale: 'fr_FR', siteName: 'Puzzle Garden', currency: 'EUR' },
  pt: { prefix: 'pt', htmlLang: 'pt-BR', hreflang: 'pt-BR', ogLocale: 'pt_BR', siteName: 'Puzzle Garden', currency: 'BRL' },
  zh: { prefix: 'zh', htmlLang: 'zh-Hant', hreflang: 'zh-Hant', ogLocale: 'zh_TW', siteName: '益智花園', currency: 'TWD' },
};

/** 신규 언어 데이터 모듈이 채워야 하는 게임 페이지 (순서 = 홈 ItemList·내부 링크 순서) */
export const PAGE_SLUGS = ['sudoku', 'queens', 'jigsaw', 'snapspot'];
export const NEW_LANGS = ['de', 'es', 'fr', 'pt', 'zh'];

/** 신규 언어 모듈 로더 — validator 에서도 재사용한다. 없는 언어는 생략 */
export const loadLangModules = async (only) => {
  const dir = new URL('./seo-lang/', import.meta.url);
  const out = {};
  for (const lang of only ?? NEW_LANGS) {
    const file = new URL(`${lang}.mjs`, dir);
    if (!existsSync(file)) continue;
    out[lang] = (await import(file.href)).default;
  }
  return out;
};

/** 속성값(title/description/keywords)용: 평문을 받아 & " < > 를 이스케이프 */
export const escAttr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 본문용: 평문 + <strong>..</strong> 만 허용, [[slug|텍스트]] 는 게임 링크 */
const fmt = (text, lang) => escText(text)
  .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>')
  .replace(/\[\[([a-z]+)\|([^\]]+)\]\]/g, (_, slug, t) => `<a href="${BASE_URL}/${LANGS[lang].prefix}/${slug}"><strong>${t}</strong></a>`);

/** JSON-LD 직렬화: </script> 주입 방지를 위해 '<' 이스케이프 */
const ld = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

const buildSections = (sections, lang) => sections.map((sec) => {
  const blocks = sec.blocks ?? [];
  return `
      <section style="${S.section}">
        <h2 style="${S.h2}">${fmt(sec.h2, lang)}</h2>
        <p style="${S.lead}">${fmt(sec.lead, lang)}</p>${blocks.map((b, i) => `
        <h3 style="${S.h3}">${fmt(b.h3, lang)}</h3>
        <p style="${i === blocks.length - 1 ? S.pLast : S.p}">${fmt(b.p, lang)}</p>`).join('')}
      </section>`;
}).join('');

/** 데이터 모듈 하나 → en 과 동일한 구조의 라우트 5개(홈 + 게임 4) */
const buildLangRoutes = (m) => {
  const { lang } = m;
  const L = LANGS[lang];
  const prefix = L.prefix;
  const brand = m.brand;
  const pageRoutes = PAGE_SLUGS.map((slug) => {
    const p = m.pages[slug];
    return {
      path: `${prefix}/${slug}`,
      slug,
      name: p.name,
      title: escAttr(p.title),
      description: escAttr(p.description),
      keywords: escAttr(p.keywords),
      priority: '0.9',
      changefreq: slug === 'jigsaw' || slug === 'snapspot' ? 'weekly' : 'monthly',
      ogImage: `${BASE_URL}/images/og/${slug}.jpg`,
      faqPairs: p.faq,
      seoContent: buildSections(p.sections, lang),
      lang,
      lastmod: m.lastmod ?? '2026-11-16',
      canonical: `${BASE_URL}/${prefix}/${slug}`,
      breadcrumbSchema: ld({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: brand, item: `${BASE_URL}/${prefix}/` },
          { '@type': 'ListItem', position: 2, name: p.name, item: `${BASE_URL}/${prefix}/${slug}` },
        ],
      }),
      softwareSchema: ld({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: `${p.name} - ${brand}`,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web Browser',
        inLanguage: L.htmlLang,
        offers: { '@type': 'Offer', price: '0', priceCurrency: L.currency },
      }),
      faqSchema: ld({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: p.faq.map(([name, text]) => ({
          '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text },
        })),
      }),
      extraSchemas: [],
    };
  });

  const h = m.home;
  const homeRoute = {
    path: prefix,
    slug: '',
    name: brand,
    title: escAttr(h.title),
    description: escAttr(h.description),
    keywords: escAttr(h.keywords),
    priority: '1.0',
    changefreq: 'daily',
    ogImage: `${BASE_URL}/images/og/home.jpg`,
    seoContent: buildSections([{ h2: h.h2, lead: h.lead, blocks: h.blocks }], lang),
    lang,
    lastmod: undefined,
    canonical: `${BASE_URL}/${prefix}/`,
    breadcrumbSchema: null,
    softwareSchema: null,
    faqSchema: null,
    extraSchemas: [
      ld({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: brand,
        url: `${BASE_URL}/${prefix}/`,
        description: h.siteDescription,
        inLanguage: L.htmlLang,
      }),
      ld({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: h.itemListName,
        itemListElement: PAGE_SLUGS.map((slug, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'VideoGame',
            name: m.pages[slug].name,
            description: h.games[slug],
            url: `${BASE_URL}/${prefix}/${slug}`,
            genre: 'Puzzle',
            gamePlatform: 'Browser',
            inLanguage: L.htmlLang,
            isAccessibleForFree: true,
          },
        })),
      }),
    ],
  };
  return [homeRoute, ...pageRoutes];
};

/** 언어별 "다른 게임" 문구 (신규 언어는 모듈의 ui 에서) */
const uiStrings = {};
{
  const mods = await loadLangModules();
  for (const lang of NEW_LANGS) {
    const m = mods[lang];
    if (!m) continue;
    if (m.lang !== lang) throw new Error(`seo-lang/${lang}.mjs: lang 필드가 '${lang}' 가 아닙니다 (${m.lang})`);
    uiStrings[lang] = { more: m.ui.moreGames, home: m.ui.homeLink };
    routes.push(...buildLangRoutes(m));
  }
}

/** 이 슬러그(''=홈)를 가진 언어 목록 — 레지스트리 순서 */
const langsWithPage = (slug) => Object.keys(LANGS).filter((lang) => {
  const prefix = LANGS[lang].prefix;
  if (lang === 'ko') return slug === '' || routes.some(r => r.lang === 'ko' && r.path === slug);
  return routes.some(r => r.lang === lang && r.path === (slug ? `${prefix}/${slug}` : prefix));
});

/** hreflang 쌍: 해당 페이지가 있는 모든 언어 + x-default(영어). ko·en 이 없으면 null */
export const alternates = (route) => {
  const slug = route.lang === 'ko' ? route.path : route.slug;
  const present = langsWithPage(slug);
  if (!present.includes('ko') || !present.includes('en')) return null;
  const href = (lang) => {
    const prefix = LANGS[lang].prefix;
    if (!prefix) return slug ? `${BASE_URL}/${slug}` : `${BASE_URL}/`;
    return slug ? `${BASE_URL}/${prefix}/${slug}` : `${BASE_URL}/${prefix}/`;
  };
  return [
    ...present.map((lang) => ({ hreflang: LANGS[lang].hreflang, href: href(lang) })),
    { hreflang: 'x-default', href: href('en') },
  ];
};

/** noscript 본문 끝에 붙는 "다른 게임" 내부 링크 — 크롤러가 게임 사이를 오가게 한다 */
export const relatedLinks = (currentPath) => {
  if (currentPath === 'ja' || currentPath.startsWith('ja/')) {
    const others = routes.filter(r => r.lang === 'ja' && r.path !== 'ja' && r.path !== currentPath);
    return `
      <nav style="${S.section}">
        <h3 style="${S.h3}">ほかのパズルゲーム</h3>
        <p style="${S.pLast}">${others.map(r => `<a href="${BASE_URL}/${r.path}">${r.name}</a>`).join(' · ')}${others.length ? ' · ' : ''}<a href="${BASE_URL}/ja/">パズルガーデン トップ</a></p>
      </nav>`;
  }
  if (currentPath === 'en' || currentPath.startsWith('en/')) {
    const others = routes.filter(r => r.lang === 'en' && r.path !== 'en' && r.path !== currentPath);
    return `
      <nav style="${S.section}">
        <h3 style="${S.h3}">More puzzle games</h3>
        <p style="${S.pLast}">${others.map(r => `<a href="${BASE_URL}/${r.path}">${r.name}</a>`).join(' · ')}${others.length ? ' · ' : ''}<a href="${BASE_URL}/en/">Puzzle Garden home</a></p>
      </nav>`;
  }
  const newLang = NEW_LANGS.find(l => currentPath === LANGS[l].prefix || currentPath.startsWith(`${LANGS[l].prefix}/`));
  if (newLang && uiStrings[newLang]) {
    const prefix = LANGS[newLang].prefix;
    const others = routes.filter(r => r.lang === newLang && r.path !== prefix && r.path !== currentPath);
    return `
      <nav style="${S.section}">
        <h3 style="${S.h3}">${escText(uiStrings[newLang].more)}</h3>
        <p style="${S.pLast}">${others.map(r => `<a href="${BASE_URL}/${r.path}">${escText(r.name)}</a>`).join(' · ')}${others.length ? ' · ' : ''}<a href="${BASE_URL}/${prefix}/">${escText(uiStrings[newLang].home)}</a></p>
      </nav>`;
  }
  return `
      <nav style="${S.section}">
        <h3 style="${S.h3}">다른 퍼즐 게임</h3>
        <p style="${S.pLast}">${routes.filter(r => r.lang === 'ko' && r.path !== currentPath).map(r => `<a href="${BASE_URL}/${r.path}">${r.name}</a>`).join(' · ')} · <a href="${BASE_URL}/">퍼즐 가든 홈</a></p>
      </nav>`;
};
