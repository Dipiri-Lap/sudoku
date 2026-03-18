import React, { useState } from 'react';
import { useGame } from '../context/SudokuContext';
import { useCoins } from '../../../context/CoinContext';
import { Undo2, Eraser, Pencil, Lightbulb } from 'lucide-react';

const HINT_COST = 10;

const Controls: React.FC = () => {
    const { state, dispatch } = useGame();
    const { coins, spendCoins } = useCoins();
    const [showHintModal, setShowHintModal] = useState(false);

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

    const handleHintConfirm = async () => {
        const success = await spendCoins(HINT_COST);
        if (success) dispatch({ type: 'HINT' });
        setShowHintModal(false);
    };

    return (
        <>
        {showHintModal && (
            <div className="hint-modal-backdrop" onClick={() => setShowHintModal(false)}>
                <div className="hint-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '100%', boxSizing: 'border-box' }}>
                        <div className="hint-modal-icon">
                            <Lightbulb size={32} strokeWidth={1.5} color="#f4c430" />
                        </div>
                        <h3 className="hint-modal-title">힌트 사용</h3>
                        <p className="hint-modal-desc">랜덤으로 빈 칸 하나를 채워드립니다</p>
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
                    {coins < HINT_COST && (
                        <p className="hint-modal-error">코인이 부족합니다</p>
                    )}
                    <div className="hint-modal-btns">
                        <button className="hint-modal-btn-cancel" onClick={() => setShowHintModal(false)}>취소</button>
                        <button className="hint-modal-btn-confirm" onClick={handleHintConfirm} disabled={coins < HINT_COST}>사용하기</button>
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
                <button
                    className="icon-btn"
                    onClick={() => setShowHintModal(true)}
                    disabled={state.isGameOver || state.isWinner}
                >
                    <div style={{ position: 'relative' }}>
                        <Lightbulb size={32} strokeWidth={1.5} color={coins >= HINT_COST ? 'var(--brand-primary)' : '#bdc3c7'} />
                        <span className="coin-badge">🪙{HINT_COST}</span>
                    </div>
                </button>
            </div>

            {/* Number Row */}
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
        </div>
        </>
    );
};

export default Controls;
