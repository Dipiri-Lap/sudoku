import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { currentLang, currentLangMeta } from './locale';

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

import deCommon from '../locales/de/common.json';
import deLanding from '../locales/de/landing.json';
import deSudoku from '../locales/de/sudoku.json';
import deQueens from '../locales/de/queens.json';
import deJigsaw from '../locales/de/jigsaw.json';
import deSnapspot from '../locales/de/snapspot.json';
import deModals from '../locales/de/modals.json';
import deDaily from '../locales/de/daily.json';

import esCommon from '../locales/es/common.json';
import esLanding from '../locales/es/landing.json';
import esSudoku from '../locales/es/sudoku.json';
import esQueens from '../locales/es/queens.json';
import esJigsaw from '../locales/es/jigsaw.json';
import esSnapspot from '../locales/es/snapspot.json';
import esModals from '../locales/es/modals.json';
import esDaily from '../locales/es/daily.json';

import frCommon from '../locales/fr/common.json';
import frLanding from '../locales/fr/landing.json';
import frSudoku from '../locales/fr/sudoku.json';
import frQueens from '../locales/fr/queens.json';
import frJigsaw from '../locales/fr/jigsaw.json';
import frSnapspot from '../locales/fr/snapspot.json';
import frModals from '../locales/fr/modals.json';
import frDaily from '../locales/fr/daily.json';

import ptCommon from '../locales/pt/common.json';
import ptLanding from '../locales/pt/landing.json';
import ptSudoku from '../locales/pt/sudoku.json';
import ptQueens from '../locales/pt/queens.json';
import ptJigsaw from '../locales/pt/jigsaw.json';
import ptSnapspot from '../locales/pt/snapspot.json';
import ptModals from '../locales/pt/modals.json';
import ptDaily from '../locales/pt/daily.json';

import zhCommon from '../locales/zh/common.json';
import zhLanding from '../locales/zh/landing.json';
import zhSudoku from '../locales/zh/sudoku.json';
import zhQueens from '../locales/zh/queens.json';
import zhJigsaw from '../locales/zh/jigsaw.json';
import zhSnapspot from '../locales/zh/snapspot.json';
import zhModals from '../locales/zh/modals.json';
import zhDaily from '../locales/zh/daily.json';

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
    de: {
        common: deCommon,
        landing: deLanding,
        sudoku: deSudoku,
        queens: deQueens,
        jigsaw: deJigsaw,
        snapspot: deSnapspot,
        modals: deModals,
        daily: deDaily,
    },
    es: {
        common: esCommon,
        landing: esLanding,
        sudoku: esSudoku,
        queens: esQueens,
        jigsaw: esJigsaw,
        snapspot: esSnapspot,
        modals: esModals,
        daily: esDaily,
    },
    fr: {
        common: frCommon,
        landing: frLanding,
        sudoku: frSudoku,
        queens: frQueens,
        jigsaw: frJigsaw,
        snapspot: frSnapspot,
        modals: frModals,
        daily: frDaily,
    },
    pt: {
        common: ptCommon,
        landing: ptLanding,
        sudoku: ptSudoku,
        queens: ptQueens,
        jigsaw: ptJigsaw,
        snapspot: ptSnapspot,
        modals: ptModals,
        daily: ptDaily,
    },
    zh: {
        common: zhCommon,
        landing: zhLanding,
        sudoku: zhSudoku,
        queens: zhQueens,
        jigsaw: zhJigsaw,
        snapspot: zhSnapspot,
        modals: zhModals,
        daily: zhDaily,
    },
} as const;

export const NAMESPACES = Object.keys(resources.ko) as (keyof typeof resources.ko)[];

void i18n.use(initReactI18next).init({
    resources,
    lng: currentLang,
    // 영어 외 해외판(ja, de, es, fr, pt, zh)에 아직 없는 키는 영어로(한국어가 섞이지 않게), 영어에도 없으면 한국어.
    // 영어에 없는 키는 한국어. 새 언어는 반드시 여기에 ['en', 'ko'] 로 넣을 것(default 는 한국어로 바로 떨어진다).
    fallbackLng: {
        ja: ['en', 'ko'],
        de: ['en', 'ko'],
        es: ['en', 'ko'],
        fr: ['en', 'ko'],
        pt: ['en', 'ko'],
        zh: ['en', 'ko'],
        default: ['ko'],
    },
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React 가 이미 이스케이프한다
    returnNull: false,
    initAsync: false, // 리소스가 번들에 들어 있으니 동기 초기화 → 첫 렌더부터 번역됨
    react: { useSuspense: false },
});

if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLangMeta.htmlLang;

    // 일본어판 전용 제목 글꼴. 게임 제목용 굵은 글꼴(Black Han Sans·Lilita One)에 가나·한자가 없어
    // 가는 시스템 글꼴로 떨어지는 걸 막는다. 800 한 가지만 받으므로 font-weight 와 상관없이 굵게 나온다.
    // Google Fonts 가 unicode-range 로 쪼개 주므로 화면에 쓰인 글자 조각만 내려받는다. 한국어·영어판은 불러오지 않는다.
    if (currentLang === 'ja') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@800&display=swap';
        document.head.appendChild(link);
    }

    // 번체 중국어판 전용 제목 글꼴(같은 이유: 제목용 굵은 글꼴에 한자가 없다). 일본어판의 둥근 글꼴과 어울리는
    // Chiron GoRound TC 800 한 가지만 받는다. unicode-range 로 100여 조각으로 나뉘어 있어 화면에 쓰인 글자 조각만
    // 내려받는다. 다른 언어판은 불러오지 않는다. CSS 의 글꼴 목록에서 "M PLUS Rounded 1c" 바로 뒤에 있다.
    if (currentLang === 'zh') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC:wght@800&display=swap';
        document.head.appendChild(link);
    }
}

export default i18n;
export * from './locale';
