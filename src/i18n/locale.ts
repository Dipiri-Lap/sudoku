// 언어는 URL 로 정한다: /en/... → 영어, /ja/... → 일본어, 그 외 → 한국어. 한국어 URL 은 지금 그대로 유지된다.
// 예외 하나: 홈(/) 첫 화면에서는 index.html 의 인라인 스크립트가 저장된 선택(LANG_PREF_KEY) 또는
// 브라우저 언어를 보고 /en/ · /ja/ 로 보낸다(검색 봇 제외). 게임 주소로 직접 온 경우는 자동 이동하지 않는다.

/** 지원 언어. 첫 번째(ko)가 원본이자 접두사 없는 기본 언어. */
export const LANGS = ['ko', 'en', 'ja'] as const;
export type Lang = (typeof LANGS)[number];

/** URL 접두사가 붙는 언어(한국어 제외). */
const PREFIXED_LANGS: readonly Lang[] = LANGS.filter(l => l !== 'ko');

const basenameOf = (lang: Lang): string => `/${lang}`;

/** @deprecated basenameOf('en') 와 같다. 기존 import 호환용. */
export const EN_BASENAME = '/en';

/** 경로의 언어 접두사(/en, /ja). 없으면 null(=한국어). */
function prefixLangOf(pathname: string): Lang | null {
    for (const lang of PREFIXED_LANGS) {
        const base = basenameOf(lang);
        if (pathname === base || pathname.startsWith(`${base}/`)) return lang;
    }
    return null;
}

/** 언어 접두사를 뗀 경로. 항상 '/' 로 시작한다. */
function stripLangPrefix(pathname: string): string {
    const lang = prefixLangOf(pathname);
    if (!lang) return pathname;
    return pathname.slice(basenameOf(lang).length) || '/';
}

/** 접두사 없는 경로에 해당 언어 접두사를 붙인다. 한국어는 그대로. */
function addLangPrefix(lang: Lang, path: string): string {
    if (lang === 'ko') return path;
    return path === '/' ? `${basenameOf(lang)}/` : `${basenameOf(lang)}${path}`;
}

export const currentLang: Lang =
    (typeof window !== 'undefined' && prefixLangOf(window.location.pathname)) || 'ko';

export const isKo = currentLang === 'ko';
/** 영어 전용 동작에만 쓴다. "해외판(한국어 아님)" 판단은 !isKo 로. */
export const isEn = currentLang === 'en';
/** 일본어 전용 동작에만 쓴다. "해외판(한국어 아님)" 판단은 !isKo 로. */
export const isJa = currentLang === 'ja';

/** BrowserRouter basename. 한국어는 basename 없음. */
export const routerBasename: string | undefined = isKo ? undefined : basenameOf(currentLang);

/**
 * 라우터를 거치지 않는 경로(raw <a href>, window.location 대입, 공유 URL)에 쓴다.
 * 한국어가 아닐 때만 현재 언어 접두사(/en, /ja)를 붙인다. 외부 URL(https://...)·해시·이미 언어 접두사가 있는 경로는 그대로 둔다.
 * <Link to> / navigate() 에는 쓰지 말 것 — basename 이 이미 붙여 준다.
 */
export function localeHref(path: string): string {
    if (isKo) return path;
    if (!path.startsWith('/') || path.startsWith('//')) return path;
    if (prefixLangOf(path.split(/[?#]/)[0])) return path;
    return addLangPrefix(currentLang, path);
}

/** 공유 URL 등 절대 주소가 필요할 때. */
export function localeAbsoluteUrl(path = '/'): string {
    return `${window.location.origin}${localeHref(path)}`;
}

// 해외판(영어·일본어 등 한국어 외 모든 언어) 공개 범위. 이 목록이 유일한 기준(single source of truth)이다.
export const INTL_AVAILABLE_GAMES = ['sudoku', 'queens', 'jigsaw', 'snapspot'] as const;
export type IntlGameId = (typeof INTL_AVAILABLE_GAMES)[number];
/** @deprecated INTL_AVAILABLE_GAMES 를 쓸 것. */
export const EN_AVAILABLE_GAMES = INTL_AVAILABLE_GAMES;
/** @deprecated IntlGameId 를 쓸 것. */
export type EnGameId = IntlGameId;

function isGameAvailableIn(lang: Lang, gameId: string): boolean {
    return lang === 'ko' || (INTL_AVAILABLE_GAMES as readonly string[]).includes(gameId);
}

/** 게임 id(=라우트 첫 세그먼트)가 현재 언어에서 열려 있는지. 한국어는 항상 true. */
export function isGameAvailable(gameId: string): boolean {
    return isGameAvailableIn(currentLang, gameId);
}

/** 유료 코인 팩(PortOne, 원화 결제). 한국어판에서만 연다. */
export const paidCoinsEnabled = isKo;

/** 사용자가 고른 언어. index.html 의 홈 자동 전환 스크립트가 같은 키를 읽는다. */
export const LANG_PREF_KEY = 'lang_pref';

/** 언어 버튼·언어판 배너에서 고른 언어를 기억한다. 이후 홈 자동 전환은 이 값을 따른다. */
export function saveLangPref(lang: Lang): void {
    try { localStorage.setItem(LANG_PREF_KEY, lang); } catch { /* 저장소 차단: 무시 */ }
}

/** 현재 URL 을 다른 언어의 같은 페이지 URL 로 바꾼다(경로+쿼리+해시 유지). 그 언어에 없는 게임이면 그 언어 홈. */
export function switchLanguageUrl(lang: Lang): string {
    const { pathname, search, hash } = window.location;
    const path = stripLangPrefix(pathname);
    const first = path.split('/')[1] ?? '';
    if (first && !isGameAvailableIn(lang, first)) return addLangPrefix(lang, '/');
    return `${addLangPrefix(lang, path)}${search}${hash}`;
}
