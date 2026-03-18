import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Layers, ChevronLeft, BookOpen } from 'lucide-react';
import { useGame } from '../context/SudokuContext';
import { useSudokuProgress } from '../../../context/SudokuProgressContext';

const SudokuModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { dispatch } = useGame();
    const { stageProgress } = useSudokuProgress();
    const [testLevel, setTestLevel] = useState<string>('40');
    const beginnerProgress = parseInt(localStorage.getItem('beginner_progress') || '1', 10);
    const beginnerAllCleared = !!localStorage.getItem('beginner_all_cleared');

    const handleTestPlay = () => {
        const level = parseInt(testLevel, 10);
        if (!isNaN(level) && level > 0) {
            dispatch({ type: 'START_STAGE', level });
            navigate(`/sudoku/stage?mode=stage&level=${level}`);
        }
    };

    return (
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>스도쿠 모드 선택</h1>
            </header>

            <div className="mode-grid">
                <div className="game-card animate-fade-in" style={{ '--delay': '0.1s', position: 'relative' } as any} onClick={() => {
                    const startLevel = beginnerAllCleared ? 1 : Math.min(beginnerProgress + 1, 5);
                    dispatch({ type: 'START_BEGINNER', level: startLevel });
                    navigate(`/sudoku/beginner?level=${startLevel}`);
                }}>
                    <div className="game-card-icon">
                        <BookOpen size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            입문자 모드
                            {beginnerAllCleared && (
                                <img src="/clearBadge.png" alt="클리어" style={{ width: '36px', height: '36px' }} />
                            )}
                        </h3>
                        <p>6×6 스도쿠로 시작해 9×9로 단계별 입문하세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {beginnerAllCleared ? '처음부터 하기' : beginnerProgress > 0 ? `Level ${beginnerProgress + 1} 시작하기` : 'Level 1 시작하기'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="game-card animate-fade-in" style={{ '--delay': '0.3s' } as any} onClick={() => {
                    dispatch({ type: 'START_STAGE', level: stageProgress });
                    navigate(`/sudoku/stage?mode=stage&level=${stageProgress}`);
                }}>
                    <div className="game-card-icon">
                        <Layers size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>스테이지 모드</h3>
                        <p>점점 어려워지는 스테이지를 클리어하며 실력을 쌓으세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">
                                {stageProgress > 1 ? `Level ${stageProgress} 이어하기` : `Level 1 시작하기`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="game-card animate-fade-in" style={{ '--delay': '0.4s' } as any} onClick={() => navigate('/sudoku/time-attack')}>
                    <div className="game-card-icon">
                        <Timer size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>타임어택 모드</h3>
                        <p>최대한 빨리 퍼즐을 완성하고 다른 플레이어와 기록을 경루세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">플레이</span>
                        </div>
                    </div>
                </div>
            </div>

            {window.location.hostname === 'localhost' && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px' }}>
                    <h4 style={{ margin: 0 }}>테스트용 레벨 바로가기</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="number"
                            value={testLevel}
                            onChange={(e) => setTestLevel(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', width: '80px', textAlign: 'center' }}
                            placeholder="레벨 번호"
                        />
                        <button
                            onClick={handleTestPlay}
                            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            플레이
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SudokuModeSelect;
