import React, { useState, useEffect } from 'react';
import { Play, Download, LogIn, LogOut } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth } from '../../firebase';
import { signOut } from '../../services/authService';
import LoginModal from './LoginModal';
import CoinDisplay from './CoinDisplay';
import ProfileModal from './ProfileModal';

const LandingPage: React.FC = () => {
    const { isInstallable, promptToInstall } = usePWAInstall();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [nickname, setNickname] = useState<string>('');
    const [puzzlePower, setPuzzlePower] = useState<number>(0);
    const [toast, setToast] = useState<string | null>(null);
    const [userPhoto, setUserPhoto] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user) {
                const { getUserProfile } = await import('../../services/rankingService');
                try {
                    const profile = await getUserProfile(user.uid);
                    setNickname(profile.nickname);
                    setUserPhoto(profile.photoURL || null);
                    setPuzzlePower(profile.puzzlePower || 0);
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
                        {currentUser && !isGuest && (
                            <div
                                onClick={() => setShowProfileModal(true)}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    border: '3px solid #fde047', // bright yellow border
                                    backgroundColor: '#0f172a', // very dark inner background to contrast with bar
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                }}>
                                <img
                                    src={userPhoto || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${nickname || 'guest'}&backgroundColor=transparent`}
                                    alt="프로필"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        )}

                        {/* 닉네임 + 퍼즐력 영역 */}
                        {currentUser && !isGuest && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                                    {nickname}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
                                        퍼즐력
                                    </span>
                                    <span style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 900, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        {puzzlePower}
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
                                    gap: '0.4rem',
                                    padding: '0.45rem 1.1rem',
                                    borderRadius: '2rem',
                                    border: 'none',
                                    backgroundColor: '#4a90e2',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
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

                <img src="/puzzle_garden_logo.png" alt="퍼즐 가든" style={{ maxWidth: '400px', width: '90%', height: 'auto', marginBottom: '1rem' }} />
                <p>두뇌를 깨우는 즐거운 퍼즐의 세계</p>
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
                    <a href="/word-sort" className="game-card animate-fade-in" style={{ '--delay': '0.2s', textDecoration: 'none', color: 'inherit' } as any}>
                        <div className="game-card-icon">
                            <img src="/logo.png" alt="Word Sort Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'hue-rotate(90deg)' }} />
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
            </footer>

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
                        showToast('프로필이 업데이트되었습니다.');
                    }}
                />
            )}
        </div>
    );
};

export default LandingPage;
