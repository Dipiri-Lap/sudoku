import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/SudokuContext';
import Board from './Board';
import Controls from './Controls';
import BeginnerTutorialModal from './BeginnerTutorialModal';
import type { Difficulty } from '../../../engine/generator';
import { Play, Pause, ChevronLeft, ArrowRight, Trophy, Heart, House } from 'lucide-react';
import { auth } from '../../../firebase';
import { getUserProfile, saveRecord, updateProfileInfo } from '../../../services/rankingService';
import { useCoins } from '../../../context/CoinContext';
import { useSudokuProgress } from '../../../context/SudokuProgressContext';

const SudokuGame: React.FC = () => {
    const { state, dispatch } = useGame();
    const navigate = useNavigate();
    const location = useLocation();
    const { addCoins } = useCoins();
    const { stageProgress, saveBeginnerProgress } = useSudokuProgress();
    const hasAwardedCoins = useRef(false);
    const [showBeginnerTutorial, setShowBeginnerTutorial] = useState(false);
    const [tutorialBoardSize, setTutorialBoardSize] = useState<6 | 9>(6);

    useEffect(() => {
        if (!location.pathname.includes('/beginner')) return;
        const level = parseInt(new URLSearchParams(location.search).get('level') || '0', 10);
        if (level === 1 && (import.meta.env.DEV || !localStorage.getItem('beginner_tutorial_6x6_shown'))) {
            setTutorialBoardSize(6);
            setShowBeginnerTutorial(true);
        } else if (level === 3 && (import.meta.env.DEV || !localStorage.getItem('beginner_tutorial_9x9_shown'))) {
            setTutorialBoardSize(9);
            setShowBeginnerTutorial(true);
        }
    }, [location.pathname, location.search]);

    // Ranking State
    const [inputNickname, setInputNickname] = useState('');
    const [isNewRecord, setIsNewRecord] = useState(false);
    const hasSavedRecord = useRef(false);
    const hasPlayedConfetti = useRef(false);

    useEffect(() => {
        // Reset saved record flag when game starts/restarts
        if (!state.isWinner) {
            hasSavedRecord.current = false;
            hasAwardedCoins.current = false;
            hasPlayedConfetti.current = false;
            setIsNewRecord(false);
        }
    }, [state.isWinner]);

    useEffect(() => {
        const modalVisible = state.isWinner
            && state.animatingRows.length === 0
            && state.animatingCols.length === 0
            && state.animatingSectors.length === 0;
        if (!modalVisible || hasPlayedConfetti.current) return;
        hasPlayedConfetti.current = true;

        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#f9a825', '#ab47bc'];
        confetti({ particleCount: 220, spread: 100, origin: { x: 0.5, y: 0.05 }, colors, gravity: 2.0, scalar: 1.1, startVelocity: 45 });
    }, [state.isWinner, state.animatingRows.length, state.animatingCols.length, state.animatingSectors.length]);

    useEffect(() => {
        if (state.isWinner && !hasAwardedCoins.current) {
            hasAwardedCoins.current = true;
            if (state.gameMode !== 'TimeAttack') {
                addCoins(10);
                if (auth.currentUser) {
                    import('../../../services/rankingService').then(m => m.incrementPuzzlePower(auth.currentUser!.uid)).catch(console.error);
                }
            }
            if (state.gameMode === 'Beginner' && state.currentLevel !== null) {
                saveBeginnerProgress(state.currentLevel);
                if (state.currentLevel === 5) {
                    localStorage.setItem('beginner_all_cleared', '1');
                }
            }
        }
    }, [state.isWinner, addCoins, state.gameMode]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const profile = await getUserProfile(user.uid);
                    setInputNickname(profile.nickname);
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                }
            }
        });
        return () => unsubscribe();
    }, [state.gameMode, state.difficulty]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is an input (like nickname field)
            if (document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement) {
                return;
            }

            if (state.isPaused || state.isGameOver || state.isWinner) return;

            const { selectedCell } = state;

            // Number keys (1-9)
            if (e.key >= '1' && e.key <= '9' && selectedCell) {
                const num = parseInt(e.key);
                if (state.isNoteMode) {
                    dispatch({ type: 'TOGGLE_NOTE', row: selectedCell.row, col: selectedCell.col, value: num });
                } else {
                    dispatch({ type: 'SET_CELL', row: selectedCell.row, col: selectedCell.col, value: num });
                }
                return;
            }

            // Erasure (Backspace or Delete)
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCell) {
                dispatch({ type: 'SET_CELL', row: selectedCell.row, col: selectedCell.col, value: null });
                return;
            }

            // Navigation (Arrow Keys)
            if (e.key.startsWith('Arrow')) {
                e.preventDefault(); // Prevent scrolling
                let { row, col } = selectedCell || { row: 0, col: 0 };

                if (!selectedCell) {
                    dispatch({ type: 'SELECT_CELL', row: 0, col: 0 });
                    return;
                }

                switch (e.key) {
                    case 'ArrowUp': row = Math.max(0, row - 1); break;
                    case 'ArrowDown': row = Math.min(8, row + 1); break;
                    case 'ArrowLeft': col = Math.max(0, col - 1); break;
                    case 'ArrowRight': col = Math.min(8, col + 1); break;
                }
                dispatch({ type: 'SELECT_CELL', row, col });
                return;
            }

            // Specialized Shortcuts
            const key = e.key.toLowerCase();
            if (key === 'n') {
                dispatch({ type: 'TOGGLE_NOTE_MODE' });
            } else if (key === 'u') {
                dispatch({ type: 'UNDO' });
            } else if (key === 'h' && state.gameMode === 'Stage') {
                dispatch({ type: 'HINT' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.selectedCell, state.isNoteMode, state.isPaused, state.isGameOver, state.isWinner, state.gameMode, dispatch]);

    useEffect(() => {
        const handleWin = async () => {
            if (state.isWinner && state.gameMode === 'TimeAttack' && auth.currentUser && !hasSavedRecord.current) {
                hasSavedRecord.current = true;
                const result = await saveRecord(auth.currentUser.uid, state.difficulty, state.timer);
                setIsNewRecord(result.isNewRecord);
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

        // Beginner mode (from /sudoku/beginner?level=N)
        if (location.pathname.includes('/beginner') && level !== null) {
            if (level !== state.currentLevel || state.gameMode !== 'Beginner') {
                dispatch({ type: 'START_BEGINNER', level });
            }
            return;
        }

        if (mode === 'stage' && level !== null && level !== state.currentLevel) {
            // Progression Guard: Prevent skipping levels via URL
            if (level > stageProgress) {
                alert(`아직 도달하지 못한 레벨입니다! (현재 도전 중: Level ${stageProgress})`);
                navigate('/sudoku/stage?mode=stage&level=' + stageProgress, { replace: true });
                return;
            }

            dispatch({ type: 'START_STAGE', level });
            return;
        }

        if (isGameEmpty) {
            if (mode === 'stage' && level !== null) {
                // Progression Guard for initial load as well
                if (level > stageProgress) {
                    alert(`아직 도달하지 못한 레벨입니다! (현재 도전 중: Level ${stageProgress})`);
                    navigate('/sudoku/stage?mode=stage&level=' + stageProgress, { replace: true });
                    return;
                }
                dispatch({ type: 'START_STAGE', level });
            } else if (!location.pathname.includes('/beginner')) {
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


    const handleNicknameUpdate = async () => {
        if (auth.currentUser && inputNickname.trim()) {
            await updateProfileInfo(auth.currentUser.uid, { nickname: inputNickname });
            alert('닉네임이 변경되었습니다.');
        }
    };

    return (
        <div className="sudoku-container">
            <header className="game-header">
                {/* Nav bar */}
                <div className="game-nav">
                    <div className="game-nav-left">
                        <button className="nav-icon-btn" onClick={handleBack}>
                            <ChevronLeft size={22} />
                        </button>
                        {/* <div className="nav-icon-btn" style={{ color: '#f4c430' }}>
                            <Trophy size={20} />
                        </div> */}
                    </div>
                    {/* <div className="game-nav-right">
                        <button className="nav-icon-btn">
                            <Palette size={20} />
                        </button>
                        <button className="nav-icon-btn">
                            <Settings size={20} />
                        </button>
                    </div> */}
                </div>
                {/* Info bar */}
                <div className="game-info-bar">
                    <div className="info-left">
                        {(state.gameMode === 'Stage' || state.gameMode === 'Beginner') ? (
                            <div className="level-badge">
                                {state.gameMode === 'Beginner' ? `입문 ${state.currentLevel}` : `Level ${state.currentLevel}`}
                                {state.gameMode === 'Beginner' && state.boardSize === 6 && (
                                    <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.8 }}>6×6</span>
                                )}
                            </div>
                        ) : (
                            <select className="difficulty-select" value={state.difficulty} onChange={handleDifficultyChange}>
                                <option value="Easy">쉬움</option>
                                <option value="Medium">보통</option>
                                <option value="Hard">어려움</option>
                                <option value="Expert">전문가</option>
                                <option value="Master">마스터</option>
                            </select>
                        )}
                    </div>
                    <div className="info-center">
                        <div className="mistake-icons">
                            {[0, 1, 2].map(i => (
                                <Heart key={i} size={18} className={i < state.mistakes ? 'mistake-icon used' : 'mistake-icon'} fill={i < state.mistakes ? 'none' : 'currentColor'} />
                            ))}
                        </div>
                    </div>
                    <div className="info-right">
                        <span className="header-value">{formatTime(state.timer)}</span>
                        <button className="pause-btn" onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}>
                            {state.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                        </button>
                    </div>
                </div>
            </header>

            {showBeginnerTutorial && (
                <BeginnerTutorialModal
                    boardSize={tutorialBoardSize}
                    onClose={() => {
                        localStorage.setItem(tutorialBoardSize === 6 ? 'beginner_tutorial_6x6_shown' : 'beginner_tutorial_9x9_shown', '1');
                        setShowBeginnerTutorial(false);
                    }}
                />
            )}

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
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', width: '100%' }}>
                            <a
                                href={state.gameMode === 'Stage' ? '/sudoku' : '/sudoku/time-attack'}
                                className="primary-btn"
                                style={{ textDecoration: 'none', flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                            >
                                뒤로
                            </a>
                            <a
                                href={state.gameMode === 'Stage'
                                    ? `/sudoku/stage?mode=stage&level=${state.currentLevel}`
                                    : `/sudoku/time-attack/play?difficulty=${state.difficulty}`}
                                className="primary-btn"
                                style={{ textDecoration: 'none', flex: 1 }}
                            >
                                다시 시도
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {state.isWinner && state.animatingRows.length === 0 && state.animatingCols.length === 0 && state.animatingSectors.length === 0 && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in">
                        {/* Header */}
                        <div className="modal-header">
                            <h2>🎉 축하합니다!</h2>
                        </div>
                        {/* Body */}
                        <div className="modal-body">
                            {isNewRecord && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fbbf24' }}>
                                    <Trophy size={40} fill="currentColor" />
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.3rem', color: '#fbbf24' }}>새로운 기록 달성!</span>
                                </div>
                            )}
                            <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600 }}>
                                소요 시간: <span style={{ color: '#e2e8f0' }}>{formatTime(state.timer)}</span>
                            </div>
                            {state.gameMode !== 'TimeAttack' && (
                                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef9e7', border: '1px solid #f4c430', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#b8860b', fontSize: '0.95rem' }}>
                                        🪙 +10
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#eef2ff', border: '1px solid #6366f1', borderRadius: '20px', padding: '0.4rem 0.9rem', fontWeight: 700, color: '#4338ca', fontSize: '0.95rem' }}>
                                        ⚡ 퍼즐력 +1
                                    </div>
                                </div>
                            )}
                            {state.gameMode === 'TimeAttack' && isNewRecord && (
                                <div style={{ width: '100%' }}>
                                    <div style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                                        <span>닉네임</span>
                                        <span style={{ color: inputNickname.length > 10 ? '#ef4444' : '#94a3b8' }}>{inputNickname.length}/10</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            maxLength={10}
                                            value={inputNickname}
                                            onChange={(e) => setInputNickname(e.target.value)}
                                            style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#1e293b' }}
                                        />
                                        <button onClick={handleNicknameUpdate} style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none', background: '#64748b', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                                            변경
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Footer */}
                        <div className="modal-footer" style={{ flexDirection: 'row', gap: '0.5rem' }}>
                            <a href="/sudoku" className="modal-home-btn" style={{ textDecoration: 'none' }}>
                                <House size={22} />
                            </a>
                            {state.gameMode === 'Stage' ? (
                                <a
                                    href={state.currentLevel ? `/sudoku/stage?mode=stage&level=${state.currentLevel + 1}` : '/sudoku'}
                                    className="primary-btn bonus-btn"
                                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1 }}
                                >
                                    다음 레벨로 <ArrowRight size={20} />
                                </a>
                            ) : state.gameMode === 'Beginner' ? (
                                state.currentLevel !== null && state.currentLevel < 5 ? (
                                    <a
                                        href={`/sudoku/beginner?level=${state.currentLevel + 1}`}
                                        className="primary-btn bonus-btn"
                                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1 }}
                                    >
                                        다음 스테이지 <ArrowRight size={20} />
                                    </a>
                                ) : (
                                    <a href="/sudoku" className="primary-btn" style={{ textDecoration: 'none', textAlign: 'center', flex: 1 }}>
                                        완료! 홈으로
                                    </a>
                                )
                            ) : (
                                <a href="/sudoku/time-attack" className="primary-btn" style={{ textDecoration: 'none', textAlign: 'center', flex: 1 }}>
                                    확인
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SudokuGame;

