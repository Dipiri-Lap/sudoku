import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Check, Lock } from 'lucide-react';
import { useDailyPuzzle, DAILY_REWARD_COIN, DAILY_REWARD_PUZZLE_POWER } from '../../../context/DailyPuzzleContext';
import { loadMonth, hasMonth, todayKey, toDateKey, type DailyPuzzle } from '../data/loader';
import CoinDisplay from '../../../common/components/CoinDisplay';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const IS_DEV = import.meta.env.DEV;

/** 하루 칸의 상태 */
type DayState =
    | 'cleared'   // 클리어함 - 도장
    | 'today'     // 오늘, 아직 안 풂 - 강조
    | 'missed'    // 지나갔는데 안 풂 - 다시 못 품
    | 'upcoming'  // 아직 오지 않은 날
    | 'empty';    // 문제가 없는 날 (기능 시작 이전)

const DailyPuzzleCalendar: React.FC = () => {
    const navigate = useNavigate();
    const { clearedDates } = useDailyPuzzle();

    // 다른 게임 화면과 같은 셸을 쓴다 - 퍼즐 타일 배경 위에 밝은 패널.
    useEffect(() => {
        document.body.classList.add('landing-bg');
        return () => { document.body.classList.remove('landing-bg'); };
    }, []);

    const today = todayKey();
    const [monthKey, setMonthKey] = useState<string>(today.slice(0, 7));
    const [puzzles, setPuzzles] = useState<DailyPuzzle[]>([]);

    useEffect(() => {
        let cancelled = false;
        loadMonth(monthKey).then(list => { if (!cancelled) setPuzzles(list); });
        return () => { cancelled = true; };
    }, [monthKey]);

    const puzzleDates = useMemo(() => new Set(puzzles.map(p => p.date)), [puzzles]);
    const [year, month] = monthKey.split('-').map(Number);

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

    // 지나간 날은 다시 풀 수 없다 - 그래야 "오늘 들어올 이유"가 생긴다.
    // 개발 중에는 아무 날짜나 열어 볼 수 있게 둔다.
    const isPlayable = (date: string): boolean => {
        if (!puzzleDates.has(date)) return false;
        if (IS_DEV) return true;
        return date === today || clearedDates.has(date);
    };

    const clearedThisMonth = [...clearedDates].filter(d => d.startsWith(monthKey)).length;
    const totalThisMonth = puzzles.length;

    const monthKeyShifted = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const prevKey = monthKeyShifted(-1);
    const nextKey = monthKeyShifted(1);

    const todayDone = clearedDates.has(today);
    const todayHasPuzzle = puzzleDates.has(today);

    return (
        <div className="mode-select-page" style={{ maxWidth: 520 }}>
            <Helmet>
                <title>오늘의 퍼즐 - 매일 새로운 데일리 스도쿠 | 퍼즐 가든</title>
                <meta name="description" content="매일 새로운 스도쿠 한 문제. 클리어하면 코인 100과 퍼즐력 30을 받습니다." />
                <link rel="canonical" href="https://puzzles.tmhub.co.kr/daily" />
                <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"오늘의 퍼즐","item":"https://puzzles.tmhub.co.kr/daily"}]}`}</script>
            </Helmet>

            <header className="mode-header" style={{ marginBottom: '1.5rem' }}>
                <button className="back-btn" onClick={() => navigate('/')} aria-label="뒤로">
                    <ChevronLeft size={28} />
                </button>
                <h1>오늘의 퍼즐</h1>
                <div style={{ marginLeft: 'auto' }}>
                    <CoinDisplay />
                </div>
            </header>

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
                        {Number(today.slice(5, 7))}월 {Number(today.slice(8))}일 · 보통
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0' }}>
                        {todayDone ? '오늘 퍼즐 완료!' : '오늘의 퍼즐 풀기'}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.95 }}>
                        {todayDone
                            ? '내일 새 문제가 열려요'
                            : `클리어 시 🪙 ${DAILY_REWARD_COIN} + ⚡ 퍼즐력 ${DAILY_REWARD_PUZZLE_POWER}`}
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
                        disabled={!hasMonth(prevKey)}
                        style={{
                            background: 'none', border: 'none', padding: 6, display: 'flex',
                            color: hasMonth(prevKey) ? '#334155' : '#cbd5e1',
                            cursor: hasMonth(prevKey) ? 'pointer' : 'default',
                        }}
                        aria-label="이전 달"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{year}년 {month}월</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                            <span style={{ color: '#16a34a', fontWeight: 800 }}>{clearedThisMonth}</span> / {totalThisMonth} 완료
                        </div>
                    </div>
                    <button
                        onClick={() => setMonthKey(nextKey)}
                        disabled={!hasMonth(nextKey)}
                        style={{
                            background: 'none', border: 'none', padding: 6, display: 'flex',
                            color: hasMonth(nextKey) ? '#334155' : '#cbd5e1',
                            cursor: hasMonth(nextKey) ? 'pointer' : 'default',
                        }}
                        aria-label="다음 달"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.4rem' }}>
                    {WEEKDAYS.map((w, i) => (
                        <div key={w} style={{
                            textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0',
                            color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#64748b',
                        }}>{w}</div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {cells.map((date, i) => {
                        if (!date) return <div key={`pad-${i}`} />;
                        const st = dayState(date);
                        const day = Number(date.slice(8));
                        const playable = isPlayable(date);

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
                                onClick={() => { if (playable) navigate(`/daily/play?date=${date}`); }}
                                disabled={!playable}
                                title={st === 'missed' ? '지나간 날은 다시 풀 수 없어요' : undefined}
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
                                    cursor: playable ? 'pointer' : 'default',
                                    padding: 0,
                                    boxShadow: st === 'today' ? '0 0 0 2px rgba(139,92,246,0.35)' : 'none',
                                }}
                            >
                                <span>{day}</span>
                                {st === 'cleared' && <Check size={11} strokeWidth={3} />}
                                {st === 'missed' && <Lock size={9} />}
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
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#22c55e', marginRight: 4 }} />완료</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#8b5cf6', marginRight: 4 }} />오늘</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: '#cbd5e1', marginRight: 4 }} />놓친 날</span>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '0.9rem', lineHeight: 1.6 }}>
                매일 자정에 새 문제가 열립니다.<br />
                지나간 날의 문제는 다시 풀 수 없어요.
            </p>
        </div>
    );
};

export default DailyPuzzleCalendar;
