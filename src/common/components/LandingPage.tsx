import React, { useState, useEffect } from 'react';
import { Play, Download, LogIn, LogOut, User } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth } from '../../firebase';
import { signOut } from '../../services/authService';
import LoginModal from './LoginModal';
import CoinDisplay from './CoinDisplay';

const LandingPage: React.FC = () => {
    const { isInstallable, promptToInstall } = usePWAInstall();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return unsubscribe;
    }, []);

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const handleLoginSuccess = (user: FirebaseUser) => {
        setShowLoginModal(false);
        const name = user.displayName?.split(' ')[0] ?? '회원';
        showToast(`${name}님, 환영합니다!`);
    };

    const handleSignOut = async () => {
        await signOut();
        showToast('로그아웃 되었습니다.');
    };

    const isLoggedIn = currentUser && !currentUser.isAnonymous;

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

            <header className="landing-header">
                {/* 로그인/로그아웃 영역 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', width: '100%', marginBottom: '0.5rem' }}>
                    <CoinDisplay />
                    {isLoggedIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {currentUser.photoURL && (
                                <img
                                    src={currentUser.photoURL}
                                    alt="프로필"
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            )}
                            {!currentUser.photoURL && <User size={18} color="#555" />}
                            <span style={{ fontSize: '0.85rem', color: '#555' }}>
                                {currentUser.displayName?.split(' ')[0] ?? ''}
                            </span>
                            <button
                                onClick={handleSignOut}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '2rem',
                                    border: '1px solid #ddd',
                                    backgroundColor: 'transparent',
                                    color: '#666',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <LogOut size={14} />
                                로그아웃
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLoginModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.4rem 1rem',
                                borderRadius: '2rem',
                                border: '1.5px solid #4a90e2',
                                backgroundColor: 'transparent',
                                color: '#4a90e2',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            <LogIn size={15} />
                            로그인
                        </button>
                    )}
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
                        앱 설치하기
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
        </div>
    );
};

export default LandingPage;
