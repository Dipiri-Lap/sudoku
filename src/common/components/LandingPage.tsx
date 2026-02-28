import React from 'react';
import { Play, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const LandingPage: React.FC = () => {
    const { isInstallable, promptToInstall } = usePWAInstall();

    return (
        <div className="landing-page">
            <header className="landing-header">
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
                        <img src="/logo.png" alt="Sudoku Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

                {/* 워드 소트 임시 숨김 처리
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
                */}
            </div>

            <footer className="landing-footer">
                <p>© 2026 퍼즐 가든. 모든 권리 보유.</p>
            </footer>
        </div >
    );
};

export default LandingPage;
