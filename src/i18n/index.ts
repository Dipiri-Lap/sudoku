import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { currentLang } from './locale';

import koCommon from '../locales/ko/common.json';
import koLanding from '../locales/ko/landing.json';
import koSudoku from '../locales/ko/sudoku.json';
import koQueens from '../locales/ko/queens.json';
import koJigsaw from '../locales/ko/jigsaw.json';
import koSnapspot from '../locales/ko/snapspot.json';
import koModals from '../locales/ko/modals.json';
import koDaily from '../locales/ko/daily.json';

import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enSudoku from '../locales/en/sudoku.json';
import enQueens from '../locales/en/queens.json';
import enJigsaw from '../locales/en/jigsaw.json';
import enSnapspot from '../locales/en/snapspot.json';
import enModals from '../locales/en/modals.json';
import enDaily from '../locales/en/daily.json';

import jaCommon from '../locales/ja/common.json';
import jaLanding from '../locales/ja/landing.json';
import jaSudoku from '../locales/ja/sudoku.json';
import jaQueens from '../locales/ja/queens.json';
import jaJigsaw from '../locales/ja/jigsaw.json';
import jaSnapspot from '../locales/ja/snapspot.json';
import jaModals from '../locales/ja/modals.json';
import jaDaily from '../locales/ja/daily.json';

// 한국어가 원본. 키 타입은 ko json 에서 나온다(./types.d.ts).
export const resources = {
    ko: {
        common: koCommon,
        landing: koLanding,
        sudoku: koSudoku,
        queens: koQueens,
        jigsaw: koJigsaw,
        snapspot: koSnapspot,
        modals: koModals,
        daily: koDaily,
    },
    en: {
        common: enCommon,
        landing: enLanding,
        sudoku: enSudoku,
        queens: enQueens,
        jigsaw: enJigsaw,
        snapspot: enSnapspot,
        modals: enModals,
        daily: enDaily,
    },
    ja: {
        common: jaCommon,
        landing: jaLanding,
        sudoku: jaSudoku,
        queens: jaQueens,
        jigsaw: jaJigsaw,
        snapspot: jaSnapspot,
        modals: jaModals,
        daily: jaDaily,
    },
} as const;

export const NAMESPACES = Object.keys(resources.ko) as (keyof typeof resources.ko)[];

void i18n.use(initReactI18next).init({
    resources,
    lng: currentLang,
    // 일본어에 아직 없는 키는 영어로(한국어가 섞이지 않게), 영어에도 없으면 한국어. 그 외 언어는 한국어로.
    fallbackLng: { ja: ['en', 'ko'], default: ['ko'] },
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React 가 이미 이스케이프한다
    returnNull: false,
    initAsync: false, // 리소스가 번들에 들어 있으니 동기 초기화 → 첫 렌더부터 번역됨
    react: { useSuspense: false },
});

if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLang;

    // 일본어판 전용 제목 글꼴. 게임 제목용 굵은 글꼴(Black Han Sans·Lilita One)에 가나·한자가 없어
    // 가는 시스템 글꼴로 떨어지는 걸 막는다. 800 한 가지만 받으므로 font-weight 와 상관없이 굵게 나온다.
    // Google Fonts 가 unicode-range 로 쪼개 주므로 화면에 쓰인 글자 조각만 내려받는다. 한국어·영어판은 불러오지 않는다.
    if (currentLang === 'ja') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=swap';
        document.head.appendChild(link);
    }
}

export default i18n;
export * from './locale';
