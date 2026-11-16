import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft, ChevronRight, Check, Lock, X } from 'lucide-react';
import { useDailyPuzzle, isUnlockableDate, DAILY_UNLOCK_COST, DAILY_REWARD_COIN, DAILY_REWARD_PUZZLE_POWER } from '../../../context/DailyPuzzleContext';
import { loadMonth, hasMonth, getDailyPuzzle, todayKey, toDateKey, dailyGameOf, type DailyPuzzle } from '../data/loader';
import { isDailyGameAvailable, localeHref } from '../../../i18n/locale';
import { challengeTitle, challengeCondition } from '../../../common/utils/localizedData';
import CoinDisplay from '../../../common/components/CoinDisplay';
import { useCoins } from '../../../context/CoinContext';
import { frameStyle, frameClass } from '../../../common/data/avatarFrames';
import { useChallenges } from '../../../context/ChallengeContext';
import { DAILY_CHALLENGES } from '../../../data/challenges';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const SITE = 'https://puzzles.tmhub.co.kr';

/** 데일리 게임 id → common.games.<key>.name */
const GAME_NAME_KEY = { sudoku: 'sudoku', 'word-sort': 'wordSort', snapspot: 'snapspot', queens: 'queens', jigsaw: 'jigsaw' } as const;
/** 데이터의 영문 난이도 → common.difficulty.<key> (워드스택 달은 한국어 난이도를 그대로 쓴다: 한국어판 전용) */
const DIFFICULTY_KEY = {
    'Very Easy': 'veryEasy', Easy: 'easy', Beginner: 'beginner', Medium: 'medium',
    Hard: 'hard', Expert: 'expert', Master: 'master',
} as const;

/** 이 달로 이동할 수 있는지: 문제가 있고, 그 달 게임이 현재 언어에서 열려 있어야 한다(한국어는 문제만 있으면). */
const canShowMonth = (key: string): boolean => hasMonth(key) && isDailyGameAvailable(dailyGameOf(key) ?? undefined);
const IS_DEV = import.meta.env.DEV;

/** 하루 칸의 상태 */
type DayState =
    | 'cleared'   // 클리어함 - 도장
    | 'today'     // 오늘, 아직 안 풂 - 강조
    | 'missed'    // 지나갔는데 안 풂 - 해제 대상이면 코인으로 열 수 있음
    | 'upcoming'  // 아직 오지 않은 날
    | 'empty';    // 문제가 없는 날 (기능 시작 이전)

const DailyPuzzleCalendar: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('daily');
    const { t: tc } = useTranslation('common');
    const { clearedDates, unlockedDates, unlockDaily } = useDailyPuzzle();
    const { coins } = useCoins();
    const { isChallengeCompleted } = useChallenges();
    const [unlockTarget, setUnlockTarget] = useState<string | null>(null);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [showReward, setShowReward] = useState(false);

    // 다른 게임 화면과 같은 셸을 쓴다 - 퍼즐 타일 배경 위에 밝은 패널.
    useEffect(() => {
        document.body.classList.add('landing-bg');
        return () => { document.body.classList.remove('landing-bg'); };
    }, []);

    const today = todayKey();
    const [monthKey, setMonthKey] = useState<string>(today.slice(0, 7));
    const [puzzles, setPuzzles] = useState<DailyPuzzle[]>([]);
    const [todayPuzzle, setTodayPuzzle] = useState<DailyPuzzle | null>(null);
    useEffect(() => {
        let cancelled = false;
        getDailyPuzzle(today).then(p => { if (!cancelled) setTodayPuzzle(p); });
        return () => { cancelled = true; };
    }, [today]);

    useEffect(() => {
        let cancelled = false;
        loadMonth(monthKey).then(list => { if (!cancelled) setPuzzles(list); });
        return () => { cancelled = true; };
    }, [monthKey]);

    const puzzleDates = useMemo(() => new Set(puzzles.map(p => p.date)), [puzzles]);
    const [year, month] = monthKey.split('-').map(Number);

    // 날짜 표기는 언어마다 달라서 월 이름(영어)도 같이 넘긴다. ko/ja 는 숫자만 쓴다.
    const monthNameOf = (y: number, m: number, style: 'long' | 'short'): string => {
        try {
            return new Intl.DateTimeFormat(i18n.language, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
        } catch {
            return String(m);
        }
    };
    const dateLabel = (date: string): string => {
        const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)), d = Number(date.slice(8));
        return t('dateLabel', { month: m, day: d, monthShort: monthNameOf(y, m, 'short') });
    };
    const monthName = monthNameOf(year, month, 'long');

    // 달력 격자: 1일이 시작되는 요일만큼 앞을 비운다.
    const cells = useMemo(() => {
        const firstWeekday = new Date(year, month - 1, 1).getDay();
        const total = new Date(year, month, 0).getDate();
        const out: (string | null)[] = Array(firstWeekday).fill(null);
        for (let d = 1; d <= total; d++) out.push(toDateKey(new Date(year, month - 1, d)));
        return out;
    }, [year, month]);

    const dayState = (date: string): DayState => {
        if (clearedDates.has(date)) return 'cleared';
        if (!puzzleDates.has(date)) return 'empty';
        if (date === today) return 'today';
        return date < today ? 'missed' : 'upcoming';
    };

    // 이미 지나간 날(10월부터)은 풀지 않았다면 코인으로 열어야 풀 수 있다.
    // 개발 중에는 앞으로 올 날짜를 열어 볼 수 있게 두되, 지난 날짜는 개발 중에도 해제 흐름을 그대로 태운다.
    // 달이 지나면 지난달의 남은 문제는 해제할 수 없어 잠긴 채로 남는다.
    const isUnlockTarget = (date: string): boolean =>
        puzzleDates.has(date) && isUnlockableDate(date, today)
        && !clearedDates.has(date) && !unlockedDates.has(date);

    const isPlayable = (date: string): boolean => {
        if (!puzzleDates.has(date)) return false;
        if (isUnlockTarget(date)) return false;
        if (IS_DEV && date >= today) return true;
        return date === today || clearedDates.has(date) || unlockedDates.has(date);
    };

    const confirmUnlock = async () => {
        if (!unlockTarget || unlocking) return;
        setUnlocking(true);
        const ok = await unlockDaily(unlockTarget, today);
        setUnlocking(false);
        if (ok) {
            const date = unlockTarget;
            setUnlockTarget(null);
            navigate(`/daily/play?date=${date}`);
        } else {
            setUnlockError(t('unlock.notEnough'));
        }
    };

    // 이 달을 전부 클리어하면 받는 보상 (월간 도전과제)
    const monthChallenge = DAILY_CHALLENGES.find(c => c.progressConfig.month === monthKey);
    const monthRewardDone = monthChallenge ? isChallengeCompleted(monthChallenge.id) : false;

    const clearedThisMonth = [...clearedDates].filter(d => d.startsWith(monthKey)).length;
    const totalThisMonth = puzzles.length;

    const monthKeyShifted = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const prevKey = monthKeyShifted(-1);
    const nextKey = monthKeyShifted(1);

    // 달력이 다른 달을 보고 있어도 오늘 카드는 오늘 문제 기준이어야 해서 따로 읽는다
    // 달마다 게임이 바뀐다: 스도쿠 달은 game 필드가 없다
    // (불러오기 전에는 예전처럼 스도쿠 · 보통)
    const todayGame = todayPuzzle?.game ?? 'sudoku';
    const todayDifficultyKey = todayPuzzle ? DIFFICULTY_KEY[todayPuzzle.difficulty as keyof typeof DIFFICULTY_KEY] : 'medium';
    const todayLabel = `${tc(`games.${GAME_NAME_KEY[todayGame]}.name`)} · ${todayDifficultyKey ? tc(`difficulty.${todayDifficultyKey}`) : todayPuzzle?.difficulty ?? ''}`;
    // 문제 파일이 아직 없는 달(로컬 날짜가 한국보다 앞선 사용자가 월말에 다음 달로 넘어간 경우 등)은 날짜만 보여 준다.
    const todayMonthReady = hasMonth(today.slice(0, 7));
    const todayDone = clearedDates.has(today);
    const todayHasPuzzle = puzzleDates.has(today);

    return (
        <div className="mode-select-page" style={{ maxWidth: 520 }}>
            <Helmet>
                <title>{t('seo.title')}</title>
                <meta name="description" content={t('seo.description')} />
                <link rel="canonical" href={`${SITE}${localeHref('/daily')}`} />
                <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"${tc('brand')}","item":"${SITE}${localeHref('/')}"},{"@type":"ListItem","position":2,"name":"${tc('games.daily.name')}","item":"${SITE}${localeHref('/daily')}"}]}`}</script>
            </Helmet>

            <header className="mode-header" style={{ marginBottom: '1.5rem' }}>
                <button className="back-btn" onClick={() => navigate('/')} aria-label={t('back')}>
                    <ChevronLeft size={28} />
                </button>
                <h1>{tc('games.daily.name')}</h1>
                <div style={{ marginLeft: 'auto' }}>
                    <CoinDisplay />
                </div>
            </header>

            {/* 한 달 전체 클리어 보상 */}
            {monthChallenge && (
                <div className="animate-fade-in" onClick={() => setShowReward(true)} role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowReward(true); }}
                    style={{
                    '--delay': '0.02s', cursor: 'pointer',
                    marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem',
                    background: monthRewardDone ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                    border: `1px solid ${monthRewardDone ? '#6ee7b7' : '#fcd34d'}`,
                    borderRadius: 16, padding: '0.7rem 0.9rem',
                } as React.CSSProperties}>
                    {monthChallenge.reward.avatar && (
                        // 보상 아바타에 보상 테두리를 입혀서 보여 준다(테두리가 없으면 아바타만)
                        <div
                            className={frameClass(monthChallenge.reward.frame)}
                            style={{
                                width: 56, height: 56, boxSizing: 'border-box', borderRadius: 12,
                                overflow: 'hidden', flexShrink: 0,
                                ...(monthChallenge.reward.frame ? frameStyle(monthChallenge.reward.frame, 3, '#cbd5e1', undefined, 12) : {}),
                                filter: monthRewardDone ? 'none' : 'saturate(0.9)',
                            }}
                        >
                            <img
                                src={`/assets/profiles/${monthChallenge.reward.avatar}.png`}
                                alt={t('reward.avatarAlt')}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: monthRewardDone ? '#047857' : '#b45309' }}>
                            {t('reward.header', { month, monthName })}{monthRewardDone ? t('reward.claimed') : ''}
                        </div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b', margin: '1px 0' }}>{challengeTitle(monthChallenge)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                            🪙 {monthChallenge.reward.coin}{monthChallenge.reward.avatar ? t('reward.plusAvatar') : ''}{monthChallenge.reward.frame ? t('reward.plusFrame') : ''}{monthChallenge.reward.cardBack ? t('reward.plusCardBack') : ''}{t('reward.plusTitle')}
                        </div>
                    </div>
                    <ChevronRight size={18} color={monthRewardDone ? '#047857' : '#b45309'} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </div>
            )}

            {/* 오늘 카드 */}
            <button
                onClick={() => navigate(`/daily/play?date=${today}`)}
                disabled={!todayHasPuzzle}
                className="animate-fade-in"
                style={{
                    '--delay': '0.05s',
                    width: '100%', textAlign: 'left', cursor: todayHasPuzzle ? 'pointer' : 'not-allowed',
                    border: 'none', borderRadius: 18, padding: '1.1rem 1.2rem', marginBottom: '1.2rem',
                    background: todayDone
                        ? 'linear-gradient(135deg, #64748b, #475569)'
                        : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: todayDone ? '0 4px 6px rgba(0,0,0,0.12)' : '0 8px 20px rgba(99,102,241,0.35)',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                } as React.CSSProperties}
            >
                <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 600 }}>
                        {dateLabel(today)}{todayMonthReady ? ` · ${todayLabel}` : ''}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>
                        {todayDone ? t('today.done') : t('today.play')}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                        {todayDone
                            ? t('today.nextTomorrow')
                            : t('today.rewardHint', { coin: DAILY_REWARD_COIN, pp: DAILY_REWARD_PUZZLE_POWER })}
                    </div>
                </div>
                <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', fontWeight: 800,
                }}>
                    {todayDone ? <Check size={28} strokeWidth={3} /> : Number(today.slice(8))}
                </div>
            </button>

            {/* 달력 - 다른 화면의 카드와 같은 흰 패널 */}
            <div className="animate-fade-in" style={{
                '--delay': '0.1s',
                background: 'white',
                border: '1px solid #e1e8ed',
                borderRadius: 16,
                padding: '0.9rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.08)',
            } as React.CSSProperties}>
                {/* 월 이동 + 진행도 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
                    <button
                        onClick={() => setMonthKey(prevKey)}
                        disabled={!canShowMonth(prevKey)}
                        style={{
                            background: 'none', border: 'none', padding: 6, display: 'flex',
                            color: canShowMonth(prevKey) ? '#334155' : '#cbd5e1',
                            cursor: canShowMonth(prevKey) ? 'pointer' : 'default',
                        }}
                        aria-label={t('nav.prevMonth')}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{t('monthTitle', { year, month, monthName })}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                            <Trans t={t} i18nKey="progress" values={{ cleared: clearedThisMonth, total: totalThisMonth }} components={{ green: <span style={{ color: '#16a34a', fontWeight: 800 }} /> }} />
                        </div>
                    </div>
                    <button
                        onClick={() => setMonthKey(nextKey)}
                        disabled={!canShowMonth(nextKey)}
                        style={{
                            background: 'none', border: 'none', padding: 6, display: 'flex',
                            color: canShowMonth(nextKey) ? '#334155' : '#cbd5e1',
                            cursor: canShowMonth(nextKey) ? 'pointer' : 'default',
                        }}
                        aria-label={t('nav.nextMonth')}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.4rem' }}>
                    {WEEKDAYS.map((w, i) => (
                        <div key={w} style={{
                            textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0',
                            color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#64748b',
                        }}>{t(`weekdays.${w}`)}</div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {cells.map((date, i) => {
                        if (!date) return <div key={`pad-${i}`} />;
                        const st = dayState(date);
                        const day = Number(date.slice(8));
                        const playable = isPlayable(date);
                        const unlockable = isUnlockTarget(date);

                        const bg =
                            st === 'cleared' ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : st === 'today' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                    : st === 'missed' ? '#eef2f6'
                                        : st === 'upcoming' ? '#f8fafc'
                                            : 'transparent';
                        const color =
                            st === 'cleared' || st === 'today' ? 'white'
                                : st === 'missed' ? '#94a3b8'
                                    : st === 'upcoming' ? '#475569'
                                        : '#cbd5e1';

                        return (
                            <button
                                key={date}
                                onClick={() => {
                                    if (playable) navigate(`/daily/play?date=${date}`);
                                    else if (unlockable) { setUnlockError(null); setUnlockTarget(date); }
                                }}
                                disabled={!playable && !unlockable}
                                title={unlockable ? t('day.unlockHint', { cost: DAILY_UNLOCK_COST }) : st === 'missed' ? t('day.missedHint') : undefined}
                                style={{
                                    aspectRatio: '1 / 1',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: 1,
                                    border: st === 'cleared' || st === 'today' ? 'none' : '1px solid #e8edf2',
                                    borderRadius: 10,
                                    background: bg,
                                    color,
                                    fontSize: '0.8rem',
                                    fontWeight: st === 'cleared' || st === 'today' ? 800 : 600,
                                    cursor: playable || unlockable ? 'pointer' : 'default',
                                    padding: 0,
                                    boxShadow: st === 'today' ? '0 0 0 2px rgba(139,92,246,0.35)' : 'none',
                                }}
                            >
                                <span>{day}</span>
                                {st === 'cleared' && <Check size={11} strokeWidth={3} />}
                                {st === 'missed' && !unlockedDates.has(date) && <Lock size={9} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 범례 */}
            <div style={{
                display: 'flex', justifyContent: 'center', gap: '0.9rem',
                marginTop: '0.9rem', fontSize: '0.72rem', color: '#475569', fontWeight: 600, flexWrap: 'wrap',
            }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#22c55e', marginRight: 4 }} />{t('legend.cleared')}</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#8b5cf6', marginRight: 4 }} />{t('legend.today')}</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#cbd5e1', marginRight: 4 }} />{t('legend.missed')}</span>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '0.9rem', lineHeight: 1.6 }}>
                <Trans t={t} i18nKey="footnote" values={{ cost: DAILY_UNLOCK_COST }} />
            </p>

            {showReward && monthChallenge && (
                <div
                    onClick={() => setShowReward(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: 20, padding: '1.4rem 1.2rem 1.2rem',
                            width: '100%', maxWidth: 340, textAlign: 'center', position: 'relative',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.3)', margin: 'auto',
                        }}
                    >
                        <button
                            onClick={() => setShowReward(false)}
                            aria-label={t('close')}
                            style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', padding: 6, display: 'flex', color: '#64748b', cursor: 'pointer' }}
                        ><X size={20} /></button>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: monthRewardDone ? '#047857' : '#b45309' }}>
                            {t('reward.header', { month, monthName })}{monthRewardDone ? t('reward.claimed') : ''}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', margin: '2px 0 4px' }}>{challengeTitle(monthChallenge)}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{challengeCondition(monthChallenge)}</div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', margin: '0.7rem 0 0.2rem' }}>
                            <div style={{ width: `${totalThisMonth ? Math.min(100, (clearedThisMonth / totalThisMonth) * 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                            <Trans t={t} i18nKey="progress" values={{ cleared: clearedThisMonth, total: totalThisMonth }} components={{ green: <span style={{ color: '#16a34a', fontWeight: 800 }} /> }} />
                        </div>

                        {/* 아바타 + 테두리, 카드 뒷면을 크게 (테두리 장식이 상자 밖으로 나오므로 여백을 둔다) */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.8rem', margin: '1.5rem 0 1rem', flexWrap: 'wrap' }}>
                            {monthChallenge.reward.avatar && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <div
                                        className={frameClass(monthChallenge.reward.frame)}
                                        style={{
                                            width: 132, height: 132, boxSizing: 'border-box', borderRadius: 26,
                                            overflow: 'hidden', flexShrink: 0,
                                            ...(monthChallenge.reward.frame ? frameStyle(monthChallenge.reward.frame, 6, '#cbd5e1', undefined, 26) : {}),
                                        }}
                                    >
                                        <img
                                            src={`/assets/profiles/${monthChallenge.reward.avatar}.png`}
                                            alt={t('reward.exclusiveAvatar')}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>{t('reward.exclusiveAvatar')}{monthChallenge.reward.frame ? t('reward.plusFrameShort') : ''}</div>
                                </div>
                            )}
                            {monthChallenge.reward.cardBack && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                    <img
                                        src={`/assets/word-sort/${monthChallenge.reward.cardBack}.webp`}
                                        alt={t('reward.exclusiveCardBack')}
                                        style={{ width: 94, height: 132, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                                    />
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>{t('reward.exclusiveCardBack')}</div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{ background: '#fef9e7', border: '1px solid #f4c430', borderRadius: 20, padding: '0.35rem 0.85rem', fontWeight: 800, color: '#b8860b', fontSize: '0.88rem' }}>🪙 {monthChallenge.reward.coin}</div>
                            <div style={{ background: '#eef2ff', border: '1px solid #6366f1', borderRadius: 20, padding: '0.35rem 0.85rem', fontWeight: 800, color: '#4338ca', fontSize: '0.88rem' }}>{t('reward.titleChip', { title: challengeTitle(monthChallenge) })}</div>
                        </div>
                    </div>
                </div>
            )}

            {unlockTarget && (
                <div
                    onClick={() => { if (!unlocking) setUnlockTarget(null); }}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: 18, padding: '1.4rem 1.3rem',
                            width: '100%', maxWidth: 320, textAlign: 'center',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                        }}
                    >
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                            {t('unlock.title', { date: dateLabel(unlockTarget) })}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, marginBottom: '0.3rem' }}>
                            <Trans t={t} i18nKey="unlock.body" values={{ cost: DAILY_UNLOCK_COST }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.6rem' }}>{t('unlock.owned', { coins })}</div>
                        {unlockError && (
                            <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.6rem' }}>{unlockError}</div>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setUnlockTarget(null)}
                                disabled={unlocking}
                                style={{ flex: 1, padding: '0.7rem', borderRadius: 12, border: '1px solid #e1e8ed', background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                            >{t('unlock.cancel')}</button>
                            <button
                                onClick={confirmUnlock}
                                disabled={unlocking || coins < DAILY_UNLOCK_COST}
                                style={{
                                    flex: 1, padding: '0.7rem', borderRadius: 12, border: 'none', fontWeight: 800, color: 'white',
                                    background: coins < DAILY_UNLOCK_COST ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    cursor: coins < DAILY_UNLOCK_COST ? 'not-allowed' : 'pointer',
                                }}
                            >{t('unlock.confirm', { cost: DAILY_UNLOCK_COST })}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPuzzleCalendar;
