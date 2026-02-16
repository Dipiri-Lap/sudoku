import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { ChevronLeft, Trophy, Zap, Flame, Crown, Smile, Gauge } from 'lucide-react';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    Easy: '쉬움',
    Medium: '보통',
    Hard: '어려움',
    Expert: '전문가',
    Master: '마스터',
};

const DIFFICULTY_ICONS: Record<Difficulty, React.ReactNode> = {
    Easy: <Smile size={40} />,
    Medium: <Gauge size={40} />,
    Hard: <Zap size={40} />,
    Expert: <Flame size={40} />,
    Master: <Crown size={40} />,
};

const DifficultySelect: React.FC = () => {
    const navigate = useNavigate();
    const { dispatch } = useGame();

    const getBestTime = (diff: Difficulty) => {
        const time = localStorage.getItem(`sudoku_best_time_${diff}`);
        if (!time) return null;

        const seconds = parseInt(time);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/sudoku')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>난이도 선택</h1>
            </header>

            <div className="game-grid">
                {DIFFICULTIES.map((diff, index) => (
                    <div
                        key={diff}
                        className="game-card animate-fade-in"
                        data-difficulty={diff}
                        style={{ '--delay': `${index * 0.05 + 0.1}s` } as any}
                        onClick={() => {
                            dispatch({ type: 'START_GAME', difficulty: diff });
                            navigate(`/sudoku/time-attack/play?difficulty=${diff}`);
                        }}
                    >
                        <div className="game-card-icon">
                            {DIFFICULTY_ICONS[diff]}
                        </div>
                        <div className="game-card-content">
                            <h3 className="difficulty-name">{DIFFICULTY_LABELS[diff]}</h3>
                            <div className="game-card-footer">
                                <span className="play-now">
                                    <Trophy size={16} style={{ color: '#f1c40f' }} />
                                    최고 기록: {getBestTime(diff) || '--:--'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DifficultySelect;
