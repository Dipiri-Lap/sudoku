import React from 'react';
import { useTranslation } from 'react-i18next';
import { currentLang, switchLanguageUrl, saveLangPref, type Lang } from '../../i18n/locale';

// KO / EN / JA 세그먼트 토글. 언어는 URL 로 정해지므로 전체 페이지 이동(<a href>)으로 바꾸고, 고른 언어를 기억한다.
const LANGS: { lang: Lang; label: string }[] = [
    { lang: 'ko', label: 'KO' },
    { lang: 'en', label: 'EN' },
    { lang: 'ja', label: 'JA' },
];

const LanguageSwitcher: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    const { t } = useTranslation();
    return (
        <div
            role="group"
            aria-label={t('language.switchLabel')}
            style={{
                display: 'flex', alignItems: 'center',
                padding: '2px', borderRadius: '999px',
                backgroundColor: '#334155',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                ...style,
            }}
        >
            {LANGS.map(({ lang, label }) => {
                const active = lang === currentLang;
                return (
                    <a
                        key={lang}
                        href={active ? undefined : switchLanguageUrl(lang)}
                        hrefLang={lang}
                        onClick={() => saveLangPref(lang)}
                        lang={lang}
                        aria-current={active ? 'true' : undefined}
                        title={t(`language.${lang}`)}
                        style={{
                            padding: '0.2rem 0.55rem', borderRadius: '999px',
                            fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em',
                            textDecoration: 'none',
                            color: active ? '#334155' : '#cbd5e1',
                            backgroundColor: active ? '#fff' : 'transparent',
                            cursor: active ? 'default' : 'pointer',
                        }}
                    >
                        {label}
                    </a>
                );
            })}
        </div>
    );
};

export default LanguageSwitcher;
