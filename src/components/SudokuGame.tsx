import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Board from './Board';
import Controls from './Controls';
import type { Difficulty } from '../engine/generator';
import { Play, Pause, ChevronLeft, ArrowRight, Trophy } from 'lucide-react';
import { auth } from '../firebase';
import { getUserProfile, saveRecord, updateNickname } from '../services/rankingService';

const SudokuGame: React.FC = () => {
    const { state, dispatch } = useGame();
    const navigate = useNavigate();
    const location = useLocation();

    // Ranking State
    const [inputNickname, setInputNickname] = useState('');
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [bestTime, setBestTime] = useState<number | null>(null);
    const hasSavedRecord = useRef(false);

    useEffect(() => {
        // Reset saved record flag when game starts/restarts
        if (!state.isWinner) {
            hasSavedRecord.current = false;
            setIsNewRecord(false);
        }
    }, [state.isWinner]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    setInputNickname(profile.nickname);
                    if (state.gameMode === 'TimeAttack') {
                        setBestTime(profile.bestTimes[state.difficulty] ?? null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                }
            }
        });
        return () => unsubscribe();
    }, [state.gameMode, state.difficulty]);

    useEffect(() => {
        const handleWin = async () => {
            if (state.isWinner && state.gameMode === 'TimeAttack' && auth.currentUser && !hasSavedRecord.current) {
                hasSavedRecord.current = true;
                const result = await saveRecord(auth.currentUser.uid, state.difficulty, state.timer);
                setIsNewRecord(result.isNewRecord);
                if (result.isNewRecord) {
                    setBestTime(state.timer);
                }
            }
        };
        handleWin();
    }, [state.isWinner, state.gameMode, state.difficulty, state.timer]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const mode = params.get('mode');
        const levelStr = params.get('level');
        const level = levelStr ? parseInt(levelStr) : null;

        // Fallback initialization: only run if the board is completely empty (e.g., direct URL access or refresh)
        const isGameEmpty = state.solution[0][0] === null;

        if (mode === 'stage' && level !== null && level !== state.currentLevel) {
            dispatch({ type: 'START_STAGE', level });
            return;
        }

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



    const handleBack = () => {
        if (state.gameMode === 'TimeAttack') {
            navigate('/sudoku/time-attack');
        } else {
            navigate('/sudoku');
        }
    };

    const getBestTime = () => {
        if (bestTime === null) return null;
        return formatTime(bestTime);
    };

    const handleNicknameUpdate = async () => {
        if (auth.currentUser && inputNickname.trim()) {
            await updateNickname(auth.currentUser.uid, inputNickname);
            alert('닉네임이 변경되었습니다.');
        }
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
                            최고: {getBestTime() || '--:--'}
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

            {state.isWinner && state.animatingRows.length === 0 && state.animatingCols.length === 0 && state.animatingSectors.length === 0 && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in">
                        {isNewRecord && (
                            <>
                                <div style={{ color: '#fbbf24', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Trophy size={48} fill="currentColor" />
                                    <h3 style={{ margin: '0.5rem 0' }}>새로운 기록 달성!</h3>
                                </div>
                            </>
                        )}
                        <h2>🎉 축하합니다! 🎉</h2>
                        <p>{state.gameMode === 'Stage' ? `레벨 ${state.currentLevel} 클리어!` : '퍼즐을 모두 풀었습니다!'}</p>
                        <p>소요 시간: {formatTime(state.timer)}</p>

                        {state.gameMode === 'TimeAttack' && isNewRecord && (
                            <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>닉네임</span>
                                    <span style={{ fontSize: '0.8rem', color: inputNickname.length > 10 ? 'var(--error-color)' : 'inherit' }}>
                                        {inputNickname.length}/10
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        value={inputNickname}
                                        onChange={(e) => setInputNickname(e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                    <button
                                        onClick={handleNicknameUpdate}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        변경
                                    </button>
                                </div>
                            </div>
                        )}

                        {state.gameMode === 'Stage' ? (
                            <button className="primary-btn bonus-btn" onClick={() => {
                                if (state.currentLevel !== null) {
                                    const nextLevel = state.currentLevel + 1;
                                    localStorage.setItem('sudoku_stage_progress', nextLevel.toString());
                                    window.location.reload();
                                }
                            }}>
                                다음 레벨로 <ArrowRight size={20} />
                            </button>
                        ) : (
                            <button className="primary-btn" onClick={() => window.location.href = '/sudoku/time-attack'}>
                                확인
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SudokuGame;

