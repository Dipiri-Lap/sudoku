import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { LANGS, LANG_META, currentLang, switchLanguageUrl, saveLangPref, type Lang } from '../../i18n/locale';

// 언어 선택 드롭다운. 작은 알약 버튼(지구본 + 현재 언어 이름)을 누르면 8개 언어 목록이 열린다.
// 언어 이름은 번역 JSON 이 아니라 locale.ts 의 LANG_META.nativeName(각 언어 자기 이름)을 쓴다.
// 언어는 URL 로 정해지므로 고르면 전체 페이지 이동(switchLanguageUrl)하고, 고른 언어를 기억한다(saveLangPref).
// 목록은 body 에 포털 + position: fixed 로 띄워 overflow: hidden 부모에 잘리지 않게 한다.

const LIST_WIDTH = 168;
const GUTTER = 8;

function choose(lang: Lang): void {
    saveLangPref(lang);
    if (lang === currentLang) return;
    window.location.href = switchLanguageUrl(lang);
}

const LanguageSwitcher: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(() => LANGS.indexOf(currentLang));
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const listId = useId();
    const optionId = (i: number) => `${listId}-opt-${i}`;

    const close = useCallback((refocus: boolean) => {
        setOpen(false);
        if (refocus) buttonRef.current?.focus();
    }, []);

    const openList = (index = LANGS.indexOf(currentLang)) => {
        setActive(index);
        setOpen(true);
    };

    // 버튼 오른쪽 끝에 맞춰 버튼 바로 아래에 띄운다(화면 밖으로 나가면 안쪽으로 당긴다).
    const place = useCallback(() => {
        if (!buttonRef.current) return;
        const r = buttonRef.current.getBoundingClientRect();
        const left = Math.min(r.right - LIST_WIDTH, window.innerWidth - LIST_WIDTH - GUTTER);
        setPos({ top: r.bottom + 6, left: Math.max(GUTTER, left) });
    }, []);

    useLayoutEffect(() => {
        if (open) place();
    }, [open, place]);

    // 목록은 위치(pos)가 정해진 다음 렌더에서 생기므로 그때 포커스를 옮긴다.
    const listShown = open && pos !== null;
    useEffect(() => {
        if (listShown) listRef.current?.focus();
    }, [listShown]);

    // 바깥 클릭이면 닫고, 스크롤·크기 변경이면 버튼을 따라간다(모바일 주소창이 접힐 때도 열린 채로).
    useEffect(() => {
        if (!open) return;
        const onPointer = (e: PointerEvent) => {
            const target = e.target as Node;
            if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
            close(false);
        };
        const onViewport = () => place();
        document.addEventListener('pointerdown', onPointer, true);
        window.addEventListener('resize', onViewport);
        window.addEventListener('scroll', onViewport, true);
        return () => {
            document.removeEventListener('pointerdown', onPointer, true);
            window.removeEventListener('resize', onViewport);
            window.removeEventListener('scroll', onViewport, true);
        };
    }, [open, close, place]);

    const onButtonKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
        } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            close(true);
        }
    };

    const onListKeyDown = (e: React.KeyboardEvent) => {
        const last = LANGS.length - 1;
        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); setActive(i => (i >= last ? 0 : i + 1)); break;
            case 'ArrowUp': e.preventDefault(); setActive(i => (i <= 0 ? last : i - 1)); break;
            case 'Home': e.preventDefault(); setActive(0); break;
            case 'End': e.preventDefault(); setActive(last); break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                choose(LANGS[active]);
                close(true);
                break;
            case 'Escape': e.preventDefault(); close(true); break;
            case 'Tab': close(false); break;
        }
    };

    const current = LANG_META[currentLang];

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={`${t('language.switchLabel')}: ${current.nativeName}`}
                onClick={() => (open ? close(false) : openList())}
                onKeyDown={onButtonKeyDown}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    flexShrink: 0, whiteSpace: 'nowrap',
                    padding: '0.25rem 0.5rem 0.25rem 0.45rem', borderRadius: '999px',
                    border: 'none', cursor: 'pointer',
                    backgroundColor: '#334155', color: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    fontSize: '0.7rem', fontWeight: 800, lineHeight: 1.2, fontFamily: 'inherit',
                    ...style,
                }}
            >
                <Globe size={13} strokeWidth={2.4} aria-hidden="true" color="#cbd5e1" />
                <span lang={current.htmlLang}>{current.nativeName}</span>
                <ChevronDown
                    size={12} strokeWidth={2.8} aria-hidden="true" color="#cbd5e1"
                    style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : undefined }}
                />
            </button>
            {listShown && pos && createPortal(
                <ul
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    aria-label={t('language.switchLabel')}
                    aria-activedescendant={optionId(active)}
                    onKeyDown={onListKeyDown}
                    style={{
                        position: 'fixed', top: pos.top, left: pos.left, width: LIST_WIDTH, zIndex: 3000,
                        margin: 0, padding: '0.3rem', listStyle: 'none',
                        backgroundColor: '#334155', borderRadius: '14px',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.35)', outline: 'none',
                    }}
                >
                    {LANGS.map((lang, i) => {
                        const selected = lang === currentLang;
                        const highlighted = i === active;
                        return (
                            <li
                                key={lang}
                                id={optionId(i)}
                                role="option"
                                aria-selected={selected}
                                lang={LANG_META[lang].htmlLang}
                                onPointerEnter={() => setActive(i)}
                                onClick={() => { choose(lang); close(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                                    padding: '0.45rem 0.6rem', borderRadius: '10px', cursor: 'pointer',
                                    fontSize: '0.82rem', fontWeight: selected ? 800 : 600,
                                    color: selected ? '#fff' : '#cbd5e1',
                                    backgroundColor: highlighted ? 'rgba(255,255,255,0.14)' : 'transparent',
                                }}
                            >
                                <span>{LANG_META[lang].nativeName}</span>
                                {selected && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ul>,
                document.body,
            )}
        </>
    );
};

export default LanguageSwitcher;
