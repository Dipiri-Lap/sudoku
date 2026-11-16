import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { localeHref } from '../../../i18n/locale';
import { useGame } from '../context/SudokuContext';
import { useSudokuProgress } from '../../../context/SudokuProgressContext';
import { logEvent } from '../../../firebase';
import stagesData from '../../../data/stages.json';
import bigStagesData from '../../../data/big-stages.json';

const MAX_BEGINNER_LEVEL = 5;
const MAX_STAGE_LEVEL = stagesData.length;
const MAX_BIG_LEVEL = bigStagesData.length;

const btnStyle = (delay: string): React.CSSProperties => ({
    '--delay': delay,
    width: '100%',
    borderRadius: 16,
    objectFit: 'cover' as const,
    cursor: 'pointer',
    display: 'block',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
} as React.CSSProperties);

const hoverOn = (e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
};
const hoverOff = (e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
};

const SudokuModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation('sudoku');
    const { t: tc } = useTranslation('common');

    useEffect(() => {
        document.body.classList.add('landing-bg');
        return () => { document.body.classList.remove('landing-bg'); };
    }, []);
    const { dispatch } = useGame();
    const { stageProgress, bigProgress } = useSudokuProgress();
    const [testLevel, setTestLevel] = useState<string>('40');
    const beginnerProgress = parseInt(localStorage.getItem('beginner_progress') || '1', 10);
    const beginnerAllCleared = !!localStorage.getItem('beginner_all_cleared');

    const handleTestPlay = () => {
        const level = parseInt(testLevel, 10);
        if (!isNaN(level) && level > 0) {
            dispatch({ type: 'START_STAGE', level });
            navigate(`/sudoku/stage?mode=stage&level=${level}`);
        }
    };

    return (
        <>
        <Helmet>
            <title>{t('modeSelect.seo.title')}</title>
            <meta name="description" content={t('modeSelect.seo.description')} />
            <link rel="canonical" href={`https://puzzles.tmhub.co.kr${localeHref('/sudoku')}`} />
            <script type="application/ld+json">{JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: tc('brand'), item: `https://puzzles.tmhub.co.kr${localeHref('/')}` },
                    { '@type': 'ListItem', position: 2, name: tc('games.sudoku.name'), item: `https://puzzles.tmhub.co.kr${localeHref('/sudoku')}` },
                ],
            })}</script>
            <script type="application/ld+json">{JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: t('modeSelect.seo.appName'),
                applicationCategory: 'GameApplication',
                operatingSystem: 'Web Browser',
                offers: { '@type': 'Offer', price: '0', priceCurrency: t('modeSelect.seo.currency') },
            })}</script>
            <script type="application/ld+json">{JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: (['q1', 'q2', 'q3', 'q4'] as const).map(k => ({
                    '@type': 'Question',
                    name: t(`modeSelect.seo.faq.${k}.q`),
                    acceptedAnswer: { '@type': 'Answer', text: t(`modeSelect.seo.faq.${k}.a`) },
                })),
            })}</script>
        </Helmet>
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>{tc('games.sudoku.name')}</h1>
            </header>

            <div className="mode-grid">
                {/* 입문자 모드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <img
                        src="/images/sudoku/beginnerBtn.webp"
                        alt={t('modeSelect.altBeginner')}
                        className="animate-fade-in"
                        style={btnStyle('0.1s')}
                        onClick={() => {
                            const startLevel = beginnerAllCleared ? 1 : Math.min(beginnerProgress + 1, 5);
                            dispatch({ type: 'START_BEGINNER', level: startLevel });
                            logEvent('game_play', { game: 'sudoku', mode: 'beginner' });
                            navigate(`/sudoku/beginner?level=${startLevel}`);
                        }}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    />
                    <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>
                        {beginnerAllCleared ? t('modeSelect.restart') : beginnerProgress > 0 ? t('modeSelect.start', { level: beginnerProgress + 1, max: MAX_BEGINNER_LEVEL }) : t('modeSelect.start', { level: 1, max: MAX_BEGINNER_LEVEL })}
                    </span>
                </div>

                {/* 스테이지 모드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <img
                        src="/images/sudoku/stageBtn.webp"
                        alt={t('modeSelect.altStage')}
                        className="animate-fade-in"
                        style={btnStyle('0.2s')}
                        onClick={() => {
                            dispatch({ type: 'START_STAGE', level: stageProgress });
                            logEvent('game_play', { game: 'sudoku', mode: 'stage' });
                            navigate(`/sudoku/stage?mode=stage&level=${stageProgress}`);
                        }}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    />
                    <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>
                        {stageProgress > 1 ? t('modeSelect.continue', { level: stageProgress, max: MAX_STAGE_LEVEL }) : t('modeSelect.start', { level: 1, max: MAX_STAGE_LEVEL })}
                    </span>
                </div>

                {/* 빅 사이즈 모드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <img
                        src="/images/sudoku/hardBtn.webp"
                        alt={t('modeSelect.altBig')}
                        className="animate-fade-in"
                        style={btnStyle('0.3s')}
                        onClick={() => {
                            const level = Math.min(bigProgress, 200);
                            dispatch({ type: 'START_BIG', level });
                            logEvent('game_play', { game: 'sudoku', mode: 'big_size' });
                            navigate(`/sudoku/big?level=${level}`);
                        }}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    />
                    <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>
                        {bigProgress > 1 ? t('modeSelect.continue', { level: bigProgress, max: MAX_BIG_LEVEL }) : t('modeSelect.start', { level: 1, max: MAX_BIG_LEVEL })}
                    </span>
                </div>

                {/* 타임어택 모드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <img
                        src="/images/sudoku/timeattackBtn.webp"
                        alt={t('modeSelect.altTimeAttack')}
                        className="animate-fade-in"
                        style={btnStyle('0.4s')}
                        onClick={() => {
                            logEvent('game_play', { game: 'sudoku', mode: 'time_attack' });
                            navigate('/sudoku/time-attack');
                        }}
                        onMouseEnter={hoverOn}
                        onMouseLeave={hoverOff}
                    />
                    <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>{t('modeSelect.play')}</span>
                </div>
            </div>

            {window.location.hostname === 'localhost' && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ margin: 0 }}>테스트용 레벨 바로가기</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="number"
                            value={testLevel}
                            onChange={(e) => setTestLevel(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '80px', textAlign: 'center' }}
                            placeholder="레벨 번호"
                        />
                        <button
                            onClick={handleTestPlay}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            플레이
                        </button>
                    </div>
                </div>
            )}

            {/* SEO 콘텐츠 섹션 */}
            <details style={{ padding: '2rem 1.5rem 3rem', maxWidth: '680px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}>
                <summary style={{
                    fontSize: '1.1rem', fontWeight: 700, color: '#444',
                    cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>▶</span>
                    {t('modeSelect.seo.summary')}
                </summary>
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        <Trans t={t} i18nKey="modeSelect.seo.p1" />
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>{t('modeSelect.seo.h2')}</h3>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        <Trans t={t} i18nKey="modeSelect.seo.p2" />
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>{t('modeSelect.seo.h3')}</h3>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                        <Trans t={t} i18nKey="modeSelect.seo.p3" />
                    </p>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>{t('modeSelect.seo.h4')}</h3>
                    <p style={{ fontSize: '0.9rem' }}>
                        <Trans t={t} i18nKey="modeSelect.seo.p4" />
                    </p>
                </div>
            </details>

        </div>
        </>
    );
};

export default SudokuModeSelect;
