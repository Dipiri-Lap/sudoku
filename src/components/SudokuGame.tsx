import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Board from './Board';
import Controls from './Controls';
import type { Difficulty } from '../engine/generator';
import { Play, Pause, ChevronLeft, ArrowRight } from 'lucide-react';

const SudokuGame: React.FC = () => {
    const { state, dispatch } = useGame();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mode = params.get('mode');
        const levelStr = params.get('level');
        const level = levelStr ? parseInt(levelStr) : null;

        // Fallback initialization: only run if the board is completely empty (e.g., direct URL access or refresh)
        const isGameEmpty = state.solution[0][0] === null;

        if (isGameEmpty) {
            if (mode === 'stage' && level !== null) {
                dispatch({ type: 'START_STAGE', level });
            } else {
                const diffParam = params.get('difficulty') as Difficulty || 'Easy';
                dispatch({ type: 'START_GAME', difficulty: diffParam });
            }
        }
    }, [dispatch, location.search, state.solution]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDifficulty = e.target.value as Difficulty;
        navigate(`/sudoku/time-attack/play?difficulty=${newDifficulty}`);
    };

    const handleNextLevel = () => {
        if (state.currentLevel) {
            navigate(`/sudoku/stage?mode=stage&level=${state.currentLevel + 1}`);
        }
    };

    const handleBack = () => {
        if (state.gameMode === 'TimeAttack') {
            navigate('/sudoku/time-attack');
        } else {
            navigate('/sudoku');
        }
    };

    const getBestTime = (diff: Difficulty) => {
        const time = localStorage.getItem(`sudoku_best_time_${diff}`);
        if (!time) return null;
        return formatTime(parseInt(time));
    };

    return (
        <div className="sudoku-container">
            <header className="game-header">
                <div className="header-item" style={{ alignItems: 'flex-start' }}>
                    <button className="back-btn" onClick={handleBack}>
                        <ChevronLeft size={24} />
                    </button>
                    {state.gameMode === 'Stage' ? (
                        <div className="level-badge">Level {state.currentLevel}</div>
                    ) : (
                        <>
                            <span className="header-label">난이도</span>
                            <select className="difficulty-select" value={state.difficulty} onChange={handleDifficultyChange}>
                                <option value="Easy">쉬움</option>
                                <option value="Medium">보통</option>
                                <option value="Hard">어려움</option>
                                <option value="Expert">전문가</option>
                                <option value="Master">마스터</option>
                            </select>
                        </>
                    )}
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
                    {state.gameMode === 'TimeAttack' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                            최고: {getBestTime(state.difficulty) || '--:--'}
                        </div>
                    )}
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
                    <div className="modal-content animate-fade-in">
                        <h2 style={{ color: 'var(--error-color)' }}>게임 오버</h2>
                        <p>실수를 3번 하셨습니다.</p>
                        <button className="primary-btn" onClick={() => {
                            if (state.gameMode === 'Stage') {
                                dispatch({ type: 'START_STAGE', level: state.currentLevel! });
                            } else {
                                dispatch({ type: 'START_GAME', difficulty: state.difficulty });
                            }
                        }}>
                            다시 시도
                        </button>
                    </div>
                </div>
            )}

            {state.isWinner && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in">
                        <h2>🎉 축하합니다! 🎉</h2>
                        <p>{state.gameMode === 'Stage' ? `레벨 ${state.currentLevel} 클리어!` : '퍼즐을 모두 풀었습니다!'}</p>
                        <p>소요 시간: {formatTime(state.timer)}</p>
                        {state.gameMode === 'Stage' ? (
                            <button className="primary-btn bonus-btn" onClick={handleNextLevel}>
                                다음 레벨로 <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button className="primary-btn" onClick={() => dispatch({ type: 'START_GAME', difficulty: state.difficulty })}>
                                새 게임 시작
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SudokuGame;
