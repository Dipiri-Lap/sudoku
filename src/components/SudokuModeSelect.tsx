import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Trophy, ChevronLeft } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { showPersistentModal } from '../utils/adTrigger';

const SudokuModeSelect: React.FC = () => {
    const navigate = useNavigate();
    const { dispatch } = useGame();

    useEffect(() => {
        // Show persistent modal for ad trigger testing
        showPersistentModal();
    }, []);

    return (
        <div className="mode-select-page">
            <header className="mode-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                </button>
                <h1>스도쿠 모드 선택</h1>
            </header>

            <div className="mode-grid">
                <div className="game-card animate-fade-in" style={{ '--delay': '0.1s' } as any} onClick={() => navigate('/sudoku/time-attack')}>
                    <div className="game-card-icon">
                        <Timer size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>타임어택 모드</h3>
                        <p>최대한 빨리 퍼즐을 완성하고 다른 플레이어와 기록을 겨루세요.</p>
                        <div className="game-card-footer">
                            <span className="play-now">플레이</span>
                        </div>
                    </div>
                </div>

                <div className="game-card animate-fade-in" style={{ '--delay': '0.2s' } as any} onClick={() => {
                    const savedLevel = localStorage.getItem('sudoku_stage_progress');
                    const level = savedLevel ? parseInt(savedLevel) : 1;
                    dispatch({ type: 'START_STAGE', level });
                    navigate(`/sudoku/stage?mode=stage&level=${level}`);
                }}>
                    <div className="game-card-icon">
                        <Trophy size={40} />
                    </div>
                    <div className="game-card-content">
                        <h3>스테이지 모드</h3>
                        <p>점점 어려워지는 스테이지를 클리어하며 실력을 쌓으세요.</p>
                        {(() => {
                            const savedLevel = localStorage.getItem('sudoku_stage_progress');
                            const level = savedLevel ? parseInt(savedLevel) : 1;
                            return (
                                <div className="game-card-footer">
                                    <span className="play-now">
                                        {savedLevel ? `Level ${level} 이어하기` : `Level 1 시작하기`}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SudokuModeSelect;
