import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    isKo, switchLanguageUrl, saveLangPref, browserLangToSupported, LANG_BANNER_TEXT, LANG_META, LANG_PREF_KEY, type Lang,
} from '../../i18n/locale';

// 기존 영어판 배너와 같은 키를 써서, 이미 닫은 사람에게 다시 뜨지 않게 한다.
const DISMISS_KEY = 'en_banner_dismissed';

// 한국어 페이지에서, 브라우저 언어가 한국어가 아닌 방문자에게만 그 사람 언어판을 알려 준다.
// 대상 언어는 browserLangToSupported(navigator.language): ja/de/es/fr/pt 는 그 언어, 번체 중국어권은 zh,
// 그 밖(간체 중국어·지원하지 않는 언어)은 영어. 문구는 번역 JSON 이 아니라 LANG_BANNER_TEXT(locale.ts)에서 그 언어로.
// 게임 페이지에서는 자동 이동 대신 이 배너만 띄운다(홈 자동 전환은 index.html). 닫으면 기억한다.
function bannerTarget(): Exclude<Lang, 'ko'> | null {
    if (!isKo || typeof navigator === 'undefined') return null;
    const language = (navigator.language || '').toLowerCase();
    if (!language || language.startsWith('ko')) return null;
    // 검색 봇(헤드리스 렌더링)에는 띄우지 않는다 — 한국어 SEO 스냅샷에 섞이지 않게.
    if (/bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent || '')) return null;
    try {
        if (localStorage.getItem(DISMISS_KEY) === '1') return null;
        if (localStorage.getItem(LANG_PREF_KEY)) return null; // 이미 언어를 고른 사람
    } catch { /* 저장소 차단: 그냥 보여 준다 */ }
    const target = browserLangToSupported(language);
    return target === 'ko' ? null : target;
}

const LanguageVersionBanner: React.FC = () => {
    const [target, setTarget] = useState(bannerTarget);
    useLocation(); // 경로가 바뀌면 다시 렌더해 링크가 현재 페이지를 가리키게 한다

    if (!target) return null;

    const dismiss = () => {
        setTarget(null);
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
        saveLangPref('ko'); // 닫기 = 한국어로 계속 보겠다는 선택
    };

    return (
        <div
            lang={LANG_META[target].htmlLang}
            style={{
                position: 'fixed', left: '50%', bottom: '0.75rem', transform: 'translateX(-50%)',
                zIndex: 2500, maxWidth: 'calc(100% - 2rem)',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                backgroundColor: '#334155', color: '#fff',
                borderRadius: '999px', padding: '0.3rem 0.35rem 0.3rem 0.9rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
            }}
        >
            <a href={switchLanguageUrl(target)} hrefLang={LANG_META[target].htmlLang} onClick={() => saveLangPref(target)} style={{ color: '#fff', textDecoration: 'none' }}>
                {LANG_BANNER_TEXT[target].text}
            </a>
            <button
                onClick={dismiss}
                aria-label={LANG_BANNER_TEXT[target].dismiss}
                style={{
                    border: 'none', background: 'rgba(255,255,255,0.12)', color: '#cbd5e1',
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                    cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default LanguageVersionBanner;
