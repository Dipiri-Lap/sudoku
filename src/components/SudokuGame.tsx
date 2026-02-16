import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Board from './Board';
import Controls from './Controls';
import type { Difficulty } from '../engine/generator';
import { Play, Pause, ChevronLeft } from 'lucide-react';

const SudokuGame: React.FC = () => {
    const { state, dispatch } = useGame();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch({ type: 'START_GAME', difficulty: 'Easy' });
    }, [dispatch]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'START_GAME', difficulty: e.target.value as Difficulty });
    };

    return (
        <div className="sudoku-container">
            <header className="game-header">
                <div className="header-item" style={{ alignItems: 'flex-start' }}>
                    <button className="back-btn" onClick={() => navigate('/')}>
                        <ChevronLeft size={24} />
                    </button>
                    <span className="header-label">난이도</span>
                    <select className="difficulty-select" value={state.difficulty} onChange={handleDifficultyChange}>
                        <option value="Easy">쉬움</option>
                        <option value="Medium">보통</option>
                        <option value="Hard">어려움</option>
                        <option value="Expert">전문가</option>
                    </select>
                </div>
                <div className="header-item">
                    <span className="header-label">실수</span>
                    <span className="header-value">{state.mistakes}/3</span>
                </div>
                <div className="header-item" style={{ alignItems: 'flex-end' }}>
                    <span className="header-label">시간</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="header-value">{formatTime(state.timer)}</span>
                        <button className="pause-btn" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
                            {state.isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ position: 'relative' }}>
                <Board />
                {state.isPaused && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>일시정지됨</h2>
                            <button className="primary-btn" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
                                계속하기
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer>
                <Controls />
            </footer>

            {state.isGameOver && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ color: 'var(--error-color)' }}>게임 오버</h2>
                        <p>실수를 3번 하셨습니다.</p>
                        <button className="primary-btn" onClick={() => dispatch({ type: 'START_GAME', difficulty: state.difficulty })}>
                            다시 시도
                        </button>
                    </div>
                </div>
            )}

            {state.isWinner && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>🎉 축하합니다! 🎉</h2>
                        <p>퍼즐을 모두 풀었습니다!</p>
                        <p>소요 시간: {formatTime(state.timer)}</p>
                        <button className="primary-btn" onClick={() => dispatch({ type: 'START_GAME', difficulty: state.difficulty })}>
                            새 게임 시작
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SudokuGame;
