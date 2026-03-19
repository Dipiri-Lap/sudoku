import React, { useState, useEffect } from 'react';
import { Play, Download, LogIn, LogOut, Share2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth } from '../../firebase';
import { signOut } from '../../services/authService';
import LoginModal from './LoginModal';
import CoinDisplay from './CoinDisplay';
import CoinShopModal from './CoinShopModal';
import ProfileModal, { getAvatarUrl } from './ProfileModal';
import { db } from '../../firebase';
import { doc, writeBatch, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { CHALLENGE_MAP, ALL_CHALLENGES } from '../../data/challenges';
import { useChallenges } from '../../context/ChallengeContext';
import { useSudokuProgress } from '../../context/SudokuProgressContext';

const PROFILE_CACHE_KEY = (uid: string) => `profile_cache_${uid}`;

const LandingPage: React.FC = () => {
    const { isInstallable, promptToInstall } = usePWAInstall();
    const challenges = useChallenges();
    const { stageProgress, beginnerProgress } = useSudokuProgress();
    const hasUnclaimed = Object.values(ALL_CHALLENGES).flat().some(c => {
        if (challenges.isChallengeCompleted(c.id)) return false;
        const { source, target } = c.progressConfig;
        if (source === 'time_attack') return challenges.isChallengeCleared(c.id);
        if (source === 'regular_stage') return Math.min(stageProgress - 1, target) >= target;
        if (source === 'beginner_stage') return Math.min(beginnerProgress, target) >= target;
        return false;
    });
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [nickname, setNickname] = useState<string>('');
    const [puzzlePower, setPuzzlePower] = useState<number>(0);
    const [userRank, setUserRank] = useState<string>('');
    const [toast, setToast] = useState<string | null>(null);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [showCoinShop, setShowCoinShop] = useState(false);
    const [activeTitle, setActiveTitle] = useState<string | null>(null);

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
                }

                const { getUserProfile, getUserRank } = await import('../../services/rankingService');
                try {
                    const profile = await getUserProfile(user.uid);
                    setNickname(profile.nickname);
                    setUserPhoto(profile.photoURL || null);
                    setPuzzlePower(profile.puzzlePower || 0);
                    setActiveTitle(profile.activeTitle ?? null);
                    localStorage.setItem(PROFILE_CACHE_KEY(user.uid), JSON.stringify({
                        nickname: profile.nickname,
                        photoURL: profile.photoURL || null,
                        puzzlePower: profile.puzzlePower || 0,
                        activeTitle: profile.activeTitle ?? null,
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
        showToast('환영합니다!');
    };

    const handleSignOut = async () => {
        await signOut();
        showToast('로그아웃 되었습니다.');
    };

    const isGuest = currentUser?.isAnonymous;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    const handleShare = async () => {
        const url = window.location.origin;
        const text = currentUser && !isGuest && puzzlePower > 0
            ? `나는 퍼즐력 ${puzzlePower}! 퍼즐 가든에서 같이 두뇌 트레이닝 해요 🧩`
            : '두뇌를 깨우는 즐거운 퍼즐의 세계, 퍼즐 가든 🧩';

        if (navigator.share) {
            try {
                await navigator.share({ title: '퍼즐 가든', text, url });
            } catch {
                // 사용자가 취소한 경우 무시
            }
        } else {
            await navigator.clipboard.writeText(`${text} ${url}`);
            showToast('링크가 복사되었습니다.');
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

            <header className="landing-header" style={{ width: '100%' }}>
                {/* 상단 프로필/코인 다크 바 영역 */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: '1rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#334155', // slightly lighter dark bar
                    borderRadius: '16px', // Rounded square shape instead of pill
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                    {/* Left: Avatar & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {currentUser && (
                            <div
                                onClick={() => setShowProfileModal(true)}
                                style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                            >
                            <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    border: '3px solid #fde047',
                                    backgroundColor: '#cbd5e1',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.1s',
                                }}>
                                <img
                                    src={getAvatarUrl(userPhoto || nickname || '1')}
                                    alt="프로필"
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
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>퍼즐력 :</span>
                                    <span style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        {puzzlePower}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>랭크 :</span>
                                    <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 800 }}>
                                        {userRank}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Coins and Logout/Login */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <CoinDisplay />

                        <div style={{ marginLeft: '0.2rem', height: '24px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

                        {currentUser && !isGuest ? (
                            <button
                                onClick={handleSignOut}
                                title="로그아웃"
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
                                onClick={() => setShowLoginModal(true)}
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
                                    transition: 'all 0.2s'
                                }}
                            >
                                <LogIn size={15} />
                                로그인
                            </button>
                        )}
                    </div>
                </div>

                {/* <img src="/puzzle_garden_logo.png" alt="퍼즐 가든" style={{ maxWidth: '400px', width: '90%', height: 'auto', marginBottom: '1rem' }} /> */}
                <p>두뇌를 깨우는 즐거운 퍼즐의 세계</p>

                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '0.02em' }}>
                            친구에게 퍼즐력 자랑하기 💪
                        </p>
                        <button
                            onClick={handleShare}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1.4rem',
                                borderRadius: '2rem',
                                border: '1.5px solid #3b6b91',
                                backgroundColor: 'transparent',
                                color: '#3b6b91',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Share2 size={15} />
                            친구 초대하고 함께 즐기기
                        </button>
                    </div>

                {isInstallable && (
                    <button
                        onClick={promptToInstall}
                        className="install-button animate-fade-in"
                        style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '2rem',
                            border: 'none',
                            backgroundColor: '#4a90e2',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            margin: '1rem auto 0 auto',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Download size={18} />
                        {isMobile ? '홈화면에 바로가기 만들기' : '바탕화면에 바로가기 만들기'}
                    </button>
                )}
            </header>

            <div className="game-grid">
                <a href="/sudoku" className="game-card animate-fade-in" style={{ '--delay': '0.1s', textDecoration: 'none', color: 'inherit' } as any}>
                    <div className="game-card-icon">
                        <img src="/logo.jpg" alt="Sudoku Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div className="game-card-content">
                        <h3>스도쿠</h3>
                        <p>숫자의 논리적 배치를 통한 두뇌 트레이닝</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                <Play size={16} fill="currentColor" /> 플레이하기
                            </span>
                        </div>
                    </div>
                </a>

                {window.location.hostname === 'localhost' && (
                    <a href="/tile-match" className="game-card animate-fade-in" style={{ '--delay': '0.2s', textDecoration: 'none', color: 'inherit' } as any}>
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

                {window.location.hostname === 'localhost' && (
                    <a href="/word-sort" className="game-card animate-fade-in" style={{ '--delay': '0.3s', textDecoration: 'none', color: 'inherit' } as any}>
                        <div className="game-card-icon">
                            <img src="/wordstackLogo.png" alt="Word Sort Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="game-card-content">
                            <h3>단어 분류 퍼즐</h3>
                            <p>단어를 알맞은 카테고리로 정리하는 분류 게임</p>
                            <div className="game-card-footer">
                                <span className="play-now">
                                    <Play size={16} fill="currentColor" /> 플레이하기
                                </span>
                            </div>
                        </div>
                    </a>
                )}
            </div>

            <footer className="landing-footer">
                <p>© 2026 퍼즐 가든. 모든 권리 보유.</p>
                {import.meta.env.DEV && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '1rem' }}>
                        <button 
                            onClick={seedFakeUsers}
                            style={{ 
                                fontSize: '10px', 
                                opacity: 0.3, 
                                background: 'none', 
                                border: '1px solid #666', 
                                color: '#666',
                                cursor: 'pointer',
                                padding: '2px 5px'
                            }}
                        >
                            [DEV] Seed
                        </button>
                        <button 
                            onClick={deleteFakeUsers}
                            style={{ 
                                fontSize: '10px', 
                                opacity: 0.3, 
                                background: 'none', 
                                border: '1px solid #ff6b6b', 
                                color: '#ff6b6b',
                                cursor: 'pointer',
                                padding: '2px 5px'
                            }}
                        >
                            [DEV] Delete Fake
                        </button>
                    </div>
                )}
            </footer>

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
                        }));
                        showToast('프로필이 업데이트되었습니다.');
                    }}
                    onActiveTitleChange={(titleId) => {
                        setActiveTitle(titleId);
                        localStorage.setItem(PROFILE_CACHE_KEY(currentUser.uid), JSON.stringify({
                            nickname,
                            photoURL: userPhoto,
                            puzzlePower,
                            activeTitle: titleId,
                        }));
                    }}
                />
            )}
        </div>
    );
};

export default LandingPage;
