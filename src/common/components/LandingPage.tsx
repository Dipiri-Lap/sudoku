import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation, Trans } from 'react-i18next';
import { isKo, currentLang, isGameAvailable, localeHref, localeAbsoluteUrl, paidCoinsEnabled } from '../../i18n/locale';
import LanguageSwitcher from './LanguageSwitcher';
import { Play, Download, LogIn, LogOut, Share2, ShoppingBag, BookOpen } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { useCrossumProgress } from '../../features/cross-math/stage/progress';
import { useArrowProgress } from '../../features/arrow-puzzle/hooks/useArrowProgress';
import { useJigsawProgress } from '../../features/jigsaw/hooks/useJigsawProgress';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth } from '../../firebase';
import { signOut } from '../../services/authService';
import LoginModal from './LoginModal';
import CoinDisplay from './CoinDisplay';
import CoinShopModal from './CoinShopModal';
import ProfileModal, { getAvatarUrl } from './ProfileModal';
import TermsModal, { type TermsType } from './TermsModal';
import { db } from '../../firebase';
import { doc, writeBatch, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { CHALLENGE_MAP, ALL_CHALLENGES } from '../../data/challenges';
import { useDailyPuzzle } from '../../context/DailyPuzzleContext';
import { todayKey, toDateKey, loadMonth, type DailyPuzzle } from '../../features/daily/data/loader';
import { useChallenges } from '../../context/ChallengeContext';
import { useSudokuProgress } from '../../context/SudokuProgressContext';
import { useWordSortProgress } from '../../context/WordSortProgressContext';
import { useWordSortHardProgress } from '../../context/WordSortHardProgressContext';
import { useSnapSpotProgress } from '../../context/SnapSpotProgressContext';
import { frameStyle, frameClass } from '../data/avatarFrames';

// SEO 섹션 게임 키 → 라우트 id (영어판 노출 여부 판단용)
const SEO_GAME_ROUTE = { sudoku: 'sudoku', wordSort: 'word-sort', queens: 'queens', crossMath: 'cross-math' } as const;

const PROFILE_CACHE_KEY = (uid: string) => `profile_cache_${uid}`;

// 난이도 원문(데일리 데이터의 영문 값) → common.difficulty.* 키
const DIFFICULTY_KEY = {
    'Very Easy': 'veryEasy', Easy: 'easy', Beginner: 'beginner', Medium: 'medium',
    Hard: 'hard', Expert: 'expert', Master: 'master',
} as const;

// 게임 카드 공통 스타일·호버. 카드는 기존처럼 전체 이동(<a>)이고, localeHref 로 영어판에서는 /en 아래에 머문다.
const CARD_STYLE: React.CSSProperties = { textDecoration: 'none', display: 'block', position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' };
const cardHoverIn = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)'; };
const cardHoverOut = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; };

const LandingPage: React.FC = () => {
    const { t } = useTranslation('landing');
    const { t: tc } = useTranslation('common');
    useEffect(() => {
        document.body.classList.add('landing-bg');
        return () => { document.body.classList.remove('landing-bg'); };
    }, []);

    const { isInstalled, promptToInstall } = usePWAInstall();
    const challenges = useChallenges();
    const { stageProgress, beginnerProgress } = useSudokuProgress();
    const { wordSortProgress } = useWordSortProgress();
    const { wordSortHardProgress } = useWordSortHardProgress();
    const { snapSpotProgress } = useSnapSpotProgress();
    const { stageProgress: crossumProgress } = useCrossumProgress();
    const { progress: arrowProgress } = useArrowProgress();
    const { progress: jigsawProgress, stars: jigsawStars } = useJigsawProgress();
    const { clearedDates: dailyClearedDates } = useDailyPuzzle();
    const hasUnclaimed = Object.values(ALL_CHALLENGES).flat().some(c => {
        if (challenges.isChallengeCompleted(c.id)) return false;
        const { source, target } = c.progressConfig;
        if (source === 'time_attack') return challenges.isChallengeCleared(c.id);
        if (source === 'regular_stage') return Math.min(stageProgress - 1, target) >= target;
        if (source === 'beginner_stage') return Math.min(beginnerProgress, target) >= target;
        if (source === 'word_sort_stage') return Math.min(wordSortProgress, target) >= target;
        if (source === 'word_sort_hard_stage') return Math.min(wordSortHardProgress, target) >= target;
        if (source === 'snapspot_stage') return Math.min(snapSpotProgress, target) >= target;
        if (source === 'crossum_stage') return Math.min(crossumProgress - 1, target) >= target;
        if (source === 'arrow_stage') return Math.min(arrowProgress, target) >= target;
        if (source === 'jigsaw_stage') return Math.min(jigsawProgress, target) >= target;
        if (source === 'jigsaw_stars') return Math.min(jigsawStars, target) >= target;
        if (source === 'daily_month') {
            const month = c.progressConfig.month ?? '';
            return [...dailyClearedDates].filter(d => d.startsWith(month)).length >= target;
        }
        return false;
    });
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showKakaoGuide, setShowKakaoGuide] = useState(false);
    const [kakaoLinkCopied, setKakaoLinkCopied] = useState(false);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [nickname, setNickname] = useState<string>('');
    const [puzzlePower, setPuzzlePower] = useState<number>(0);
    const { clearedDates, isCleared: isDailyCleared } = useDailyPuzzle();
    const dailyToday = todayKey();
    const dailyDone = isDailyCleared(dailyToday);

    // 이번 달 문제 목록 - 도장판 진행도를 랜딩에서 바로 보여 주려고 읽는다.
    const [dailyMonth, setDailyMonth] = useState<DailyPuzzle[]>([]);
    useEffect(() => {
        let cancelled = false;
        loadMonth(dailyToday.slice(0, 7)).then(list => { if (!cancelled) setDailyMonth(list); });
        return () => { cancelled = true; };
    }, [dailyToday]);

    const dailyPuzzleDates = useMemo(() => new Set(dailyMonth.map(p => p.date)), [dailyMonth]);
    const dailyTotalThisMonth = dailyMonth.length;
    const dailyClearedThisMonth = useMemo(
        () => [...clearedDates].filter(d => d.startsWith(dailyToday.slice(0, 7))).length,
        [clearedDates, dailyToday]
    );

    const dailyTodayLabel = useMemo(() => {
        const date = t('daily.dateLabel', { month: Number(dailyToday.slice(5, 7)), day: Number(dailyToday.slice(8)) });
        const puzzle = dailyMonth.find(p => p.date === dailyToday);
        if (!puzzle) return date;
        const key = DIFFICULTY_KEY[puzzle.difficulty as keyof typeof DIFFICULTY_KEY];
        return `${date} · ${key ? tc(`difficulty.${key}`) : puzzle.difficulty}`;
    }, [dailyToday, dailyMonth, t, tc]);

    // 오늘을 오른쪽 끝에 두고 최근 7일을 훑는다.
    const dailyLast7 = useMemo(() => {
        const base = new Date();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(base);
            d.setDate(base.getDate() - (6 - i));
            const date = toDateKey(d);
            const state = clearedDates.has(date) ? 'cleared'
                : !dailyPuzzleDates.has(date) ? 'empty'
                    : date === dailyToday ? 'today'
                        : 'missed';
            return { date, state };
        });
    }, [clearedDates, dailyPuzzleDates, dailyToday]);
    const [userRank, setUserRank] = useState<string>('');
    const [toast, setToast] = useState<string | null>(null);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [showCoinShop, setShowCoinShop] = useState(false);
    const [activeTitle, setActiveTitle] = useState<string | null>(null);
    const [avatarFrame, setAvatarFrame] = useState<string | null>(null);
    const [termsModal, setTermsModal] = useState<TermsType | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                // Load cache immediately to prevent flicker
                const cached = localStorage.getItem(PROFILE_CACHE_KEY(user.uid));
                if (cached) {
                    const c = JSON.parse(cached);
                    setNickname(c.nickname || '');
                    setUserPhoto(c.photoURL || null);
                    setPuzzlePower(c.puzzlePower || 0);
                    setActiveTitle(c.activeTitle ?? null);
                    setAvatarFrame(c.avatarFrame ?? null);
                }

                const { getUserProfile, getUserRank } = await import('../../services/rankingService');
                try {
                    const profile = await getUserProfile(user.uid);
                    setNickname(profile.nickname);
                    setUserPhoto(profile.photoURL || null);
                    setPuzzlePower(profile.puzzlePower || 0);
                    setActiveTitle(profile.activeTitle ?? null);
                    setAvatarFrame(profile.avatarFrame ?? null);
                    localStorage.setItem(PROFILE_CACHE_KEY(user.uid), JSON.stringify({
                        nickname: profile.nickname,
                        photoURL: profile.photoURL || null,
                        puzzlePower: profile.puzzlePower || 0,
                        activeTitle: profile.activeTitle ?? null,
                        avatarFrame: profile.avatarFrame ?? null,
                    }));

                    const rank = await getUserRank(profile.puzzlePower || 0);
                    setUserRank(rank);
                } catch (e) {
                    console.error('Failed to fetch profile:', e);
                }
            } else {
                setNickname('');
                setUserPhoto(null);
            }
        });
        return unsubscribe;
    }, []);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleLoginSuccess = () => {
        setShowLoginModal(false);
        // Nickname will be updated by onAuthStateChanged
        showToast(t('toast.welcome'));
    };

    const handleSignOut = async () => {
        await signOut();
        showToast(t('toast.signedOut'));
    };

    const isGuest = currentUser?.isAnonymous;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isKakaoIOS = /KAKAOTALK/i.test(navigator.userAgent) && /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleLoginClick = () => {
        if (isKakaoIOS) {
            setShowKakaoGuide(true);
        } else {
            setShowLoginModal(true);
        }
    };

    const handleKakaoCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setKakaoLinkCopied(true);
            setTimeout(() => setKakaoLinkCopied(false), 2500);
        } catch {
            prompt(t('kakao.copyPrompt'), window.location.href);
        }
    };

    const handleShare = async () => {
        // 한국어는 기존과 같은 origin, 해외판은 origin/en/ · origin/ja/
        const url = !isKo ? localeAbsoluteUrl('/') : window.location.origin;
        const text = currentUser && !isGuest && puzzlePower > 0
            ? t('share.textWithPower', { power: puzzlePower })
            : t('share.text');

        if (navigator.share) {
            try {
                await navigator.share({ title: tc('brand'), text, url });
            } catch {
                // 사용자가 취소한 경우 무시
            }
        } else {
            await navigator.clipboard.writeText(`${text} ${url}`);
            showToast(t('toast.linkCopied'));
        }
    };

    const seedFakeUsers = async () => {
        if (!confirm('500명의 가짜 유저 데이터를 생성하시겠습니까?')) return;
        
        console.log("Starting to seed 500 fake users...");
        showToast("데이터 생성 중... (콘솔 확인)");
        
        const generateRandomNickname = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            return Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        };
        
        try {
            const batch = writeBatch(db);
            const count = 500;
            
            for (let j = 0; j < count; j++) {
                const fakeUid = `fake_user_${j + 1}`;
                const userRef = doc(db, 'users', fakeUid);
                const puzzlePower = Math.floor(Math.random() * 500) + 1;
                
                batch.set(userRef, {
                    uid: fakeUid,
                    nickname: generateRandomNickname(),
                    photoURL: String(Math.floor(Math.random() * 40) + 1),
                    puzzlePower: puzzlePower,
                    unlockedAvatars: ['1', '2', '3', '4', '5', '6', '7', '8'],
                    coins: 0,
                    createdAt: new Date().toISOString()
                });
            }
            
            await batch.commit();
            alert("500명의 가짜 유저 데이터 생성이 완료되었습니다!");
            window.location.reload();
        } catch (e) {
            console.error("Seeding failed:", e);
            alert("데이터 생성 중 오류가 발생했습니다. 권한을 확인하세요.");
        }
    };

    const deleteFakeUsers = async () => {
        if (!confirm('생성된 모든 가짜 유저 데이터를 삭제하시겠습니까?')) return;
        
        console.log("Starting to delete fake users...");
        showToast("데이터 삭제 중... (콘솔 확인)");
        
        try {
            let deletedCount = 0;
            const usersRef = collection(db, 'users');
            
            // Delete in chunks because firestore doesn't have a broad delete-by-pattern
            // We'll search for 'fake_user_' prefix
            const q = query(usersRef, where('uid', '>=', 'fake_user_'), where('uid', '<=', 'fake_user_\uf8ff'), limit(500));
            
            while (true) {
                const snapshot = await getDocs(q);
                if (snapshot.empty) break;
                
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                deletedCount += snapshot.size;
                console.log(`Deleted ${deletedCount} users...`);
            }
            
            alert(`${deletedCount}명의 가짜 유저 데이터가 삭제되었습니다!`);
            window.location.reload();
        } catch (e) {
            console.error("Deletion failed:", e);
            alert("데이터 삭제 중 오류가 발생했습니다. 권한을 확인하세요.");
        }
    };

    return (
        <>
        <Helmet>
            <title>{t('meta.title')}</title>
            <meta name="description" content={t('meta.description')} />
            <link rel="canonical" href={!isKo ? `https://puzzles.tmhub.co.kr/${currentLang}/` : 'https://puzzles.tmhub.co.kr/'} />
        </Helmet>
        <div className="landing-page">
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '1.25rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#222',
                    color: '#fff',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '2rem',
                    fontSize: '0.9rem',
                    zIndex: 2000,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}>
                    {toast}
                </div>
            )}

            <header className="landing-header" style={{ width: '100%', marginBottom: '0.25rem' }}>
                {/* 프로필 다크 바 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: '0.35rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#334155',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                    {/* Left: Avatar & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {currentUser && (
                            <div
                                onClick={() => setShowProfileModal(true)}
                                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                            >
                            <div className={frameClass(avatarFrame)} style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    ...frameStyle(avatarFrame, 3, '#cbd5e1', '0 2px 8px rgba(0,0,0,0.2)', 16),
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'transform 0.1s',
                                }}>
                                <img
                                    src={getAvatarUrl(userPhoto || nickname || '1')}
                                    alt={t('profile.avatarAlt')}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            {hasUnclaimed && (
                                <div style={{
                                    position: 'absolute', top: '-4px', left: '-4px',
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: '#ef4444', border: '2px solid #1e293b',
                                    color: 'white', fontSize: '0.65rem', fontWeight: '900',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    pointerEvents: 'none'
                                }}>!</div>
                            )}
                            </div>
                        )}

                        {/* 닉네임 + 퍼즐력 영역 */}
                        {currentUser && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                                        {nickname || currentUser.uid.slice(0, 8)}
                                    </span>
                                    {activeTitle && CHALLENGE_MAP[activeTitle] && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            color: '#fde047',
                                            background: 'rgba(251,191,36,0.12)',
                                            border: '1px solid rgba(251,191,36,0.3)',
                                            borderRadius: '4px',
                                            padding: '1px 5px',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {CHALLENGE_MAP[activeTitle].title}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>{t('profile.puzzlePower')}</span>
                                    <span style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        {puzzlePower}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>{t('profile.rank')}</span>
                                    <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 800 }}>
                                        {userRank}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 언어 토글 — 프로필 바 오른쪽 위, 아래 버튼 줄은 이미 꽉 차 있다 */}
                    <LanguageSwitcher style={{ marginLeft: 'auto', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', boxShadow: 'none' }} />
                </div>

                {/* 코인 & 로그인/로그아웃 — 프로필 바 아래 오른쪽 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '0.4rem',
                    width: '100%',
                    marginBottom: '0.75rem',
                    padding: '0 0.25rem',
                }}>
                    <CoinDisplay onClick={() => setShowCoinShop(true)} />
                    <button
                        onClick={() => setShowCoinShop(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.7rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(245,158,11,0.3)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <ShoppingBag size={14} />
                        {t('header.shop')}
                    </button>
                    {/* 게임 설명은 아직 한국어 전용이라 해외판에서는 숨긴다 */}
                    {isKo && <a
                        href="/guide"
                        title={t('header.guide')}
                        aria-label={t('header.guide')}
                        style={{
                            padding: '0.5rem', borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <BookOpen size={16} />
                    </a>}
                    {/* 공유/설치는 상점·로그아웃과 같은 성격(계정·설정)이라 한 줄로 모은다 */}
                    <button
                        onClick={handleShare}
                        title={t('header.invite')}
                        style={{
                            padding: '0.5rem', borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Share2 size={16} />
                    </button>
                    {/* 설치가 끝난 버튼은 할 일이 없다 - 자리를 비운다 */}
                    {!isInstalled && (
                        <button
                            onClick={promptToInstall}
                            title={isMobile ? t('header.installMobile') : t('header.installDesktop')}
                            style={{
                                padding: '0.5rem', borderRadius: '50%',
                                border: 'none',
                                backgroundColor: '#4a90e2',
                                color: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(74,144,226,0.3)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Download size={16} />
                        </button>
                    )}
                    {currentUser && !isGuest ? (
                        <button
                            onClick={handleSignOut}
                            title={t('header.logout')}
                            style={{
                                padding: '0.5rem',
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <LogOut size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleLoginClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.8rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#4a90e2',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(74,144,226,0.3)',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <LogIn size={15} />
                            {t('header.login')}
                        </button>
                    )}
                </div>

                {/* 오늘의 퍼즐 - 랜딩에서 바로 도장판이 보여야 빈칸이 눈에 밟힌다 (영어판 미제공) */}
                {isGameAvailable('daily') && <a
                    href="/daily"
                    className="animate-fade-in"
                    style={{
                        '--delay': '0.05s',
                        marginTop: '0.9rem', width: '100%',
                        display: 'flex', gap: '0.75rem', alignItems: 'stretch',
                        textDecoration: 'none',
                    } as React.CSSProperties}
                >
                    <div style={{
                        position: 'relative', flexShrink: 0, width: '36%', maxWidth: 150,
                        aspectRatio: '1 / 1', borderRadius: '16px', overflow: 'hidden',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                    }}>
                        <div style={{
                            position: 'absolute', top: '6px', right: '6px',
                            backgroundColor: dailyDone ? '#16a34a' : '#ef4444', color: 'white',
                            fontSize: '0.6rem', fontWeight: 'bold', letterSpacing: '0.05em',
                            padding: '2px 6px', borderRadius: '999px',
                            boxShadow: dailyDone ? '0 2px 6px rgba(22,163,74,0.5)' : '0 2px 6px rgba(239,68,68,0.5)',
                            zIndex: 1,
                        }}>{dailyDone ? t('daily.badgeDone') : t('daily.badgeToday')}</div>
                        <img
                            src="/images/daily/title.webp"
                            alt={tc('games.daily.name')}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    </div>

                    <div style={{
                        flex: 1, minWidth: 0,
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        gap: '0.45rem',
                        background: 'white', border: '1px solid #e1e8ed',
                        borderRadius: '16px', padding: '0.75rem 0.9rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.06)',
                        // .landing-header 가 가운데 정렬이라 여기서 되돌린다.
                        textAlign: 'left',
                    }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                            {dailyTodayLabel}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                            {dailyDone ? t('daily.done') : t('daily.play')}
                        </div>

                        {/* 최근 7일 도장 - 빈칸이 보여야 돌아올 이유가 생긴다 */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {dailyLast7.map(d => (
                                <span
                                    key={d.date}
                                    title={d.date}
                                    style={{
                                        flex: 1, height: 8, borderRadius: 4,
                                        background: d.state === 'cleared' ? '#22c55e'
                                            : d.state === 'today' ? '#8b5cf6'
                                                : d.state === 'missed' ? '#cbd5e1'
                                                    : '#eef2f6',
                                        boxShadow: d.state === 'today' ? '0 0 0 2px rgba(139,92,246,0.3)' : 'none',
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                            <Trans
                                t={t}
                                i18nKey="daily.monthProgress"
                                values={{ cleared: dailyClearedThisMonth, total: dailyTotalThisMonth }}
                                components={{ green: <span style={{ color: '#16a34a', fontWeight: 800 }} /> }}
                            />
                        </div>
                    </div>
                </a>}
            </header>

            <div className="game-grid">
                {isGameAvailable('snapspot') && (
                <a href={localeHref("/snapspot")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.1s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: '#f97316', color: 'white',
                        fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(249,115,22,0.5)',
                        zIndex: 1,
                    }}>HOT</div>
                    <img src="/images/snapspot/title.webp" alt={tc('games.snapspot.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {isGameAvailable('jigsaw') && (
                <a href={localeHref("/jigsaw")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.2s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: '#ef4444', color: 'white',
                        fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
                        zIndex: 1,
                    }}>NEW</div>
                    <img src="/images/tinypieces/title.webp" alt={tc('games.jigsaw.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {isGameAvailable('word-sort') && (
                <a href={localeHref("/word-sort")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.3s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: '#f97316', color: 'white',
                        fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(249,115,22,0.5)',
                        zIndex: 1,
                    }}>HOT</div>
                    <img src="/images/wordstack/title.webp" alt={tc('games.wordSort.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {isGameAvailable('queens') && (
                <a href={localeHref("/queens")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.4s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: '#7b6cf0', color: 'white',
                        fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(123,108,240,0.5)',
                        zIndex: 1,
                    }}>UPDATE</div>
                    <img src="/images/crownquest/title.webp" alt={tc('games.queens.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {isGameAvailable('sudoku') && (
                <a href={localeHref("/sudoku")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.5s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <img src="/images/sudoku/title.webp" alt={tc('games.sudoku.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {isGameAvailable('arrow-puzzle') && (
                <a href={localeHref("/arrow-puzzle")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.38s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        backgroundColor: '#ef4444', color: 'white',
                        fontSize: '0.65rem', fontWeight: 'bold', letterSpacing: '0.05em',
                        padding: '2px 7px', borderRadius: '999px',
                        boxShadow: '0 2px 6px rgba(239,68,68,0.5)',
                        zIndex: 1,
                    }}>NEW</div>
                    <img src="/images/arrow-puzzle/title.webp" alt={tc('games.arrowPuzzle.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

                {/* localhost 전용 개발 카드 — 한국어 전용 */}
                {isKo && window.location.hostname === 'localhost' && (
                    <a href="/tile-match" className="game-card animate-fade-in" style={{ '--delay': '0.4s', textDecoration: 'none', color: 'inherit' } as any}>
                        <div className="game-card-icon" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
                            🧩
                        </div>
                        <div className="game-card-content">
                            <h3>타일 매치</h3>
                            <p>3개의 같은 타일을 맞춰 보드를 비우는 퍼즐 게임</p>
                            <div className="game-card-footer">
                                <span className="play-now">
                                    <Play size={16} fill="currentColor" /> 플레이하기
                                </span>
                            </div>
                        </div>
                    </a>
                )}

                {isKo && window.location.hostname === 'localhost' && (
                    <a href="/royal-match" className="game-card animate-fade-in" style={{ '--delay': '0.45s', textDecoration: 'none', color: 'inherit' } as any}>
                        <div className="game-card-icon" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
                            👑
                        </div>
                        <div className="game-card-content">
                            <h3>로얄 매치</h3>
                            <p>인접한 젬을 교환해 3개 이상 맞추는 클래식 매치-3 퍼즐</p>
                            <div className="game-card-footer">
                                <span className="play-now">
                                    <Play size={16} fill="currentColor" /> 플레이하기
                                </span>
                            </div>
                        </div>
                    </a>
                )}

                {isKo && window.location.hostname === 'localhost' && (
                    <a href="/nonogram" className="game-card animate-fade-in" style={{ '--delay': '0.48s', textDecoration: 'none', color: 'inherit' } as any}>
                        <div className="game-card-icon" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
                            🔲
                        </div>
                        <div className="game-card-content">
                            <h3>노노그램</h3>
                            <p>숫자 힌트를 보고 칸을 채워 숨은 그림을 완성하는 퍼즐</p>
                            <div className="game-card-footer">
                                <span className="play-now">
                                    <Play size={16} fill="currentColor" /> 플레이하기
                                </span>
                            </div>
                        </div>
                    </a>
                )}

                {isGameAvailable('cross-math') && (
                <a href={localeHref("/cross-math")} className="animate-fade-in" style={{ ...CARD_STYLE, '--delay': '0.6s' } as React.CSSProperties}
                    onMouseEnter={cardHoverIn}
                    onMouseLeave={cardHoverOut}
                >
                    <img src="/images/crossum/title.webp" alt={tc('games.crossMath.name')} style={{ width: '100%', display: 'block' }} />
                </a>
                )}

            </div>



            {termsModal && (
                <TermsModal
                    type={termsModal}
                    onClose={() => setTermsModal(null)}
                />
            )}

            {showCoinShop && (
                <CoinShopModal
                    onClose={() => setShowCoinShop(false)}
                    showToast={showToast}
                />
            )}

            {showLoginModal && (
                <LoginModal
                    onClose={() => setShowLoginModal(false)}
                    onSuccess={handleLoginSuccess}
                />
            )}

            {showKakaoGuide && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 3000, padding: '1.5rem',
                }} onClick={() => setShowKakaoGuide(false)}>
                    <div style={{
                        background: '#fff', borderRadius: '20px', padding: '2rem 1.5rem',
                        maxWidth: '340px', width: '100%', textAlign: 'center',
                        display: 'flex', flexDirection: 'column', gap: '1rem',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '2.5rem' }}>🌐</div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                            {t('kakao.title')}
                        </h2>
                        <p style={{ margin: 0, color: '#555', fontSize: '0.88rem', lineHeight: 1.65 }}>
                            <Trans t={t} i18nKey="kakao.body" />
                        </p>
                        <div style={{
                            background: '#f5f5f5', borderRadius: '8px',
                            padding: '0.65rem 0.9rem', fontSize: '0.75rem',
                            color: '#333', wordBreak: 'break-all', textAlign: 'left',
                        }}>
                            {window.location.href}
                        </div>
                        <button
                            onClick={handleKakaoCopy}
                            style={{
                                background: '#FEE500', border: 'none', borderRadius: '12px',
                                padding: '0.8rem', fontSize: '1rem', fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            {kakaoLinkCopied ? t('kakao.copied') : t('kakao.copy')}
                        </button>
                        <button
                            onClick={() => setShowKakaoGuide(false)}
                            style={{
                                background: 'none', border: 'none', color: '#999',
                                fontSize: '0.85rem', cursor: 'pointer',
                            }}
                        >
                            {t('kakao.close')}
                        </button>
                    </div>
                </div>
            )}

            {showProfileModal && currentUser && (
                <ProfileModal
                    uid={currentUser.uid}
                    currentNickname={nickname}
                    currentPhotoURL={userPhoto}
                    onClose={() => setShowProfileModal(false)}
                    onSaveSuccess={(newNickname, newPhotoURL) => {
                        setNickname(newNickname);
                        setUserPhoto(newPhotoURL);
                        localStorage.setItem(PROFILE_CACHE_KEY(currentUser.uid), JSON.stringify({
                            nickname: newNickname,
                            photoURL: newPhotoURL,
                            puzzlePower,
                            activeTitle,
                            avatarFrame,
                        }));
                        showToast(t('toast.profileUpdated'));
                    }}
                    onActiveTitleChange={(titleId) => {
                        setActiveTitle(titleId);
                        localStorage.setItem(PROFILE_CACHE_KEY(currentUser.uid), JSON.stringify({
                            nickname,
                            photoURL: userPhoto,
                            puzzlePower,
                            activeTitle: titleId,
                            avatarFrame,
                        }));
                    }}
                    onAvatarFrameChange={(frameId) => {
                        setAvatarFrame(frameId);
                        localStorage.setItem(PROFILE_CACHE_KEY(currentUser.uid), JSON.stringify({
                            nickname,
                            photoURL: userPhoto,
                            puzzlePower,
                            activeTitle,
                            avatarFrame: frameId,
                        }));
                    }}
                />
            )}

            {/* SEO 콘텐츠 섹션 */}
            <details style={{ padding: '2rem 1.5rem 3rem', maxWidth: '720px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}>
                <summary style={{
                    fontSize: '1.1rem', fontWeight: 700, color: '#444',
                    cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>▶</span>
                    {t('seo.summary')}
                </summary>
                <div style={{ marginTop: '1rem' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        <Trans t={t} i18nKey="seo.intro" />
                    </p>

                    {(['sudoku', 'wordSort', 'queens', 'crossMath'] as const)
                        .filter(id => isGameAvailable(SEO_GAME_ROUTE[id]))
                        .map(id => (
                            <React.Fragment key={id}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>{t(`seo.${id}.title`)}</h3>
                                <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                                    <Trans t={t} i18nKey={`seo.${id}.body`} />
                                </p>
                            </React.Fragment>
                        ))}

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#444', marginBottom: '0.5rem' }}>{t('seo.benefits.title')}</h3>
                    <p style={{ fontSize: '0.9rem' }}>
                        <Trans t={t} i18nKey="seo.benefits.body" />
                    </p>
                </div>
            </details>

            <footer className="landing-footer" style={{ 
                width: '100%', 
                backgroundColor: '#f9fafb', 
                padding: '2.5rem 1.5rem', 
                borderTop: '1px solid #f1f5f9',
                textAlign: 'left',
                marginTop: '3rem'
            }}>
                <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        {t('footer.copyright')}
                    </div>
                    <div style={{ 
                        color: '#64748b', 
                        fontSize: '0.7rem', 
                        lineHeight: '1.6', 
                        marginBottom: '1.5rem',
                        wordBreak: 'keep-all',
                        letterSpacing: '-0.2px'
                    }}>
                        <span style={{ whiteSpace: 'nowrap', marginRight: '4px' }}>{t('footer.bizNumber')} <span style={{color:'#cbd5e1', margin:'0 2px'}}>|</span></span>
                        <span style={{ whiteSpace: 'nowrap', marginRight: '4px' }}>{t('footer.mailOrder')} <span style={{color:'#cbd5e1', margin:'0 2px'}}>|</span></span>
                        <span style={{ whiteSpace: 'nowrap' }}>{t('footer.ceo')}</span>
                        <br/>
                        <span style={{ wordBreak: 'keep-all', marginRight: '4px' }}>{t('footer.address')} <span style={{color:'#cbd5e1', margin:'0 2px'}}>|</span></span>
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {t('footer.supportLabel')} <a href="https://open.kakao.com/o/sd3A2bCi" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>{t('footer.supportLink')}</a> (070-8984-4679)
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#475569', fontWeight: 600, fontSize: '0.8rem', margin: '1rem 0', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.6rem' }}>▲</span> 
                        {t('footer.termsHeading')}
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 500, flexWrap: 'wrap' }}>
                        <span style={{ cursor: 'pointer' }} onClick={() => setTermsModal('service')}>{t('footer.termsService')}</span>
                        <span style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }} onClick={() => setTermsModal('privacy')}>{t('footer.termsPrivacy')}</span>
                        {/* 전자금융거래 약관은 유료 결제가 있을 때만 의미가 있다 */}
                        {paidCoinsEnabled && <span style={{ cursor: 'pointer' }} onClick={() => setTermsModal('finance')}>{t('footer.termsFinance')}</span>}
                    </div>

                    {import.meta.env.DEV && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <button 
                                onClick={seedFakeUsers}
                                style={{ 
                                    fontSize: '10px', 
                                    opacity: 0.5, 
                                    background: 'none', 
                                    border: '1px solid #64748b', 
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}
                            >
                                [DEV] Seed
                            </button>
                            <button 
                                onClick={deleteFakeUsers}
                                style={{ 
                                    fontSize: '10px', 
                                    opacity: 0.5, 
                                    background: 'none', 
                                    border: '1px solid #ef4444', 
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}
                            >
                                [DEV] Delete Fake
                            </button>
                        </div>
                    )}
                </div>
            </footer>

        </div>
        </>
    );
};

export default LandingPage;
