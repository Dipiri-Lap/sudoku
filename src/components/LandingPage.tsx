import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Trophy, Play } from 'lucide-react';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="landing-page">
            <header className="landing-header">
                <LayoutGrid size={48} color="var(--brand-primary)" />
                <h1>퍼즐 가든</h1>
                <p>두뇌를 깨우는 즐거운 퍼즐의 세계</p>
            </header>

            <div className="game-grid">
                <div className="game-card" onClick={() => navigate('/sudoku')}>
                    <div className="game-card-icon">
                        <LayoutGrid size={40} />
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

                {/* Coming Soon Cards */}
                <div className="game-card coming-soon">
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
