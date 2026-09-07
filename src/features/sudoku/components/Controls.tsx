import React, { useState, useCallback } from 'react';
import { useGame } from '../context/SudokuContext';
import { useCoins } from '../../../context/CoinContext';
import { Undo2, Eraser, Pencil, Lightbulb, X } from 'lucide-react';

/** 다른 게임(스냅스팟·크로썸·퀸즈)과 같은 값으로 맞춘다. */
export const HINT_COST = 50;

const Controls: React.FC = () => {
    const { state, dispatch } = useGame();
    const { coins } = useCoins();
    // null=닫힘 / confirm=코인으로 사용 / ad=코인 부족, 광고 제안 / insufficient=광고도 이미 봄
    const [hintPrompt, setHintPrompt] = useState<'confirm' | 'ad' | 'insufficient' | null>(null);
    const [adWatching, setAdWatching] = useState(false);
    const [pendingShowAd, setPendingShowAd] = useState<(() => void) | null>(null);
    const [adUsedThisGame, setAdUsedThisGame] = useState(false);

    const handleNumberClick = (num: number) => {
        if (!state.selectedCell) return;
        const { row, col } = state.selectedCell;

        if (state.isNoteMode) {
            dispatch({ type: 'TOGGLE_NOTE', row, col, value: num });
        } else {
            dispatch({ type: 'SET_CELL', row, col, value: num });
        }
    };

    const handleUndo = () => dispatch({ type: 'UNDO' });

    const handleErase = () => {
        if (!state.selectedCell) return;
        const { row, col } = state.selectedCell;
        dispatch({ type: 'SET_CELL', row, col, value: null });
    };
    const handleNoteToggle = () => dispatch({ type: 'TOGGLE_NOTE_MODE' });

    // 광고 무료 힌트는 판당 1회 - 새 판이 깔리면 다시 열어 준다.
    // effect 로 맞추면 렌더가 한 번 더 도는 데다 그 사이 옛 값이 화면에 보인다.
    // 렌더 중에 맞추는 게 React 가 권장하는 방식이다.
    const boardKey = state.initialBoard.flat().join(',');
    const [lastBoardKey, setLastBoardKey] = useState(boardKey);
    if (lastBoardKey !== boardKey) {
        setLastBoardKey(boardKey);
        setAdUsedThisGame(false);
        setHintPrompt(null);
    }

    /** 크로썸과 같은 흐름: 코인이 있으면 확인 후 사용, 없으면 광고 시청(판당 1회) */
    const handleWatchAd = useCallback(() => {
        if (adWatching) return;

        const proceed = () => {
            setAdUsedThisGame(true);
            setHintPrompt(null);
            dispatch({ type: 'GRANT_HINT_CREDIT' });
            dispatch({ type: 'SET_HINT_MODE', on: true });
        };

        if (import.meta.env.DEV || !window.adBreak) {
            setAdWatching(true);
            setTimeout(() => { proceed(); setAdWatching(false); }, 1000);
            return;
        }

        window.adBreak({
            type: 'reward',
            name: 'sudoku-hint',
            beforeReward: (showAdFn: () => void) => { setPendingShowAd(() => showAdFn); },
            beforeAd: () => { setAdWatching(true); setPendingShowAd(null); },
            afterAd: () => { setAdWatching(false); },
            adViewed: proceed,
            adDismissed: () => { alert('광고를 끝까지 시청해야 힌트를 쓸 수 있어요.'); },
            adBreakDone: (info: { status: string }) => {
                setAdWatching(false);
                setPendingShowAd(null);
                if (info.status === 'noAdPreloaded') alert('현재 준비된 광고가 없습니다. 잠시 후 시도해주세요.');
            },
        });
    }, [adWatching, dispatch]);

    const handleHintClick = () => {
        if (state.hintMode) { dispatch({ type: 'SET_HINT_MODE', on: false }); return; }  // 다시 누르면 취소
        if (state.hintCredit) { dispatch({ type: 'SET_HINT_MODE', on: true }); return; } // 광고로 받아둔 무료 1회
        if (coins < HINT_COST) {
            setHintPrompt(adUsedThisGame ? 'insufficient' : 'ad');
            return;
        }
        setHintPrompt('confirm');
    };

    return (
        <>
        {hintPrompt && (
            <div className="hint-modal-backdrop" onClick={() => !adWatching && setHintPrompt(null)}>
                <div className="hint-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '100%', boxSizing: 'border-box' }}>
                        <div className="hint-modal-icon">
                            <Lightbulb size={32} strokeWidth={1.5} color="#f4c430" />
                        </div>
                        <h3 className="hint-modal-title">
                            {hintPrompt === 'confirm' ? '힌트 사용' : '코인이 부족해요'}
                        </h3>
                        <p className="hint-modal-desc">
                            {hintPrompt === 'confirm'
                                ? '원하는 칸을 골라 채웁니다'
                                : hintPrompt === 'ad'
                                    ? '광고를 시청하면 힌트를 한 번 쓸 수 있어요'
                                    : '이번 판에서는 광고를 이미 시청했습니다'}
                        </p>
                    </div>
                    {/* Body */}
                    <div style={{ background: '#1e2d3d', margin: '0.75rem', borderRadius: '12px', width: 'calc(100% - 1.5rem)', boxSizing: 'border-box' }}>
                        <div className="hint-modal-coin-row" style={{ borderRadius: '12px 12px 0 0' }}>
                            <span>보유</span>
                            <span className="hint-modal-coin-value">🪙 {coins}</span>
                        </div>
                        <div className="hint-modal-coin-row" style={{ borderRadius: '0 0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span>비용</span>
                            <span className="hint-modal-coin-value" style={{ color: coins >= HINT_COST ? '#f4c430' : 'rgba(255,255,255,0.3)' }}>🪙 {HINT_COST}</span>
                        </div>
                    </div>
                    <div className="hint-modal-btns">
                        {hintPrompt === 'confirm' && (
                            <>
                                <button className="hint-modal-btn-cancel" onClick={() => setHintPrompt(null)}>취소</button>
                                <button
                                    className="hint-modal-btn-confirm"
                                    onClick={() => { setHintPrompt(null); dispatch({ type: 'SET_HINT_MODE', on: true }); }}
                                >
                                    칸 고르기
                                </button>
                            </>
                        )}
                        {hintPrompt === 'ad' && (
                            <>
                                <button className="hint-modal-btn-cancel" onClick={() => setHintPrompt(null)} disabled={adWatching}>취소</button>
                                <button
                                    className="hint-modal-btn-confirm"
                                    disabled={adWatching}
                                    onClick={() => (pendingShowAd ? pendingShowAd() : handleWatchAd())}
                                >
                                    {adWatching ? '로딩…' : '광고 시청'}
                                </button>
                            </>
                        )}
                        {hintPrompt === 'insufficient' && (
                            <button className="hint-modal-btn-confirm" onClick={() => setHintPrompt(null)}>확인</button>
                        )}
                    </div>
                </div>
            </div>
        )}
        <div className="game-controls">
            {/* Action Icons Bar */}
            <div className="action-bar animate-fade-in" style={{ '--delay': '0.1s' } as any}>
                <button className="icon-btn" onClick={handleUndo} disabled={state.history.length === 0}>
                    <Undo2 size={32} strokeWidth={1.5} />
                </button>
                <button
                    className="icon-btn"
                    onClick={handleErase}
                    disabled={!state.selectedCell || state.initialBoard[state.selectedCell.row][state.selectedCell.col] !== null}
                >
                    <Eraser size={32} strokeWidth={1.5} />
                </button>
                <button className="icon-btn" onClick={handleNoteToggle}>
                    <div style={{ position: 'relative' }}>
                        <Pencil size={32} strokeWidth={1.5} />
                        <span className={`note-toggle-badge ${state.isNoteMode ? 'on' : ''}`}>
                            {state.isNoteMode ? 'ON' : 'OFF'}
                        </span>
                    </div>
                </button>
                {/* 오늘의 퍼즐은 전 유저가 같은 문제를 같은 조건에서 푼다 - 힌트를 열어 두지 않는다 */}
                {state.gameMode !== 'Daily' && (
                    <button
                        className="icon-btn"
                        onClick={handleHintClick}
                        disabled={state.isGameOver || state.isWinner}
                    >
                        <div style={{ position: 'relative' }}>
                            {state.hintMode
                                ? <X size={32} strokeWidth={1.5} color="var(--brand-primary)" />
                                : <Lightbulb size={32} strokeWidth={1.5} color={coins >= HINT_COST || state.hintCredit ? 'var(--brand-primary)' : '#bdc3c7'} />}
                            {!state.hintMode && (
                                <span className="coin-badge">{state.hintCredit ? '무료' : `🪙${HINT_COST}`}</span>
                            )}
                        </div>
                    </button>
                )}
            </div>

            {state.hintMode && (
                <div className="hint-guide">채울 칸을 고르세요</div>
            )}

            {/* Number Row(s) */}
            {state.boardSize === 16 ? (
                <div className="number-grid-16 animate-fade-in" style={{ '--delay': '0.2s' } as any}>
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            className="number-btn number-btn-16"
                            onClick={() => handleNumberClick(num)}
                            disabled={
                                !state.selectedCell ||
                                state.initialBoard[state.selectedCell.row][state.selectedCell.col] !== null ||
                                state.isGameOver ||
                                state.isWinner
                            }
                        >
                            {num}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="number-row animate-fade-in" style={{ '--delay': '0.2s' } as any}>
                    {Array.from({ length: state.boardSize }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            className="number-btn"
                            onClick={() => handleNumberClick(num)}
                            disabled={
                                !state.selectedCell ||
                                state.initialBoard[state.selectedCell.row][state.selectedCell.col] !== null ||
                                state.isGameOver ||
                                state.isWinner
                            }
                        >
                            {num}
                        </button>
                    ))}
                </div>
            )}
        </div>
        </>
    );
};

export default Controls;
