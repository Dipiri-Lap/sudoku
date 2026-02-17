import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Play } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="landing-page">
            <header className="landing-header">
                <img src="/puzzle_garden_logo.png" alt="퍼즐 가든" style={{ maxWidth: '400px', width: '90%', height: 'auto', marginBottom: '1rem' }} />
                <p>두뇌를 깨우는 즐거운 퍼즐의 세계</p>
            </header>

            <div className="game-grid">
                <div className="game-card animate-fade-in" style={{ '--delay': '0.1s' } as any} onClick={() => navigate('/sudoku')}>
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
                </div>

                <div className="game-card coming-soon animate-fade-in" style={{ '--delay': '0.2s' } as any}>
                    <div className="game-card-icon">
                        <Trophy size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>준비 중...</h3>
                        <p>더 많은 퍼즐이 곧 추가됩니다.</p>
                    </div>
                </div>
            </div>

            <footer className="landing-footer">
                <p>© 2026 퍼즐 가든. 모든 권리 보유.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
