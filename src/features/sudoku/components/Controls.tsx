import React from 'react';
import { useGame } from '../context/SudokuContext';
import { Undo2, Eraser, Pencil, Lightbulb } from 'lucide-react';

const Controls: React.FC = () => {
    const { state, dispatch } = useGame();

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
    const handleHint = () => dispatch({ type: 'HINT' });

    return (
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
                {state.gameMode === 'Stage' && (
                    <button
                        className="icon-btn"
                        onClick={handleHint}
                        disabled={state.isGameOver || state.isWinner || state.hintsRemaining <= 0}
                    >
                        <div style={{ position: 'relative' }}>
                            <Lightbulb
                                size={32}
                                strokeWidth={1.5}
                                color={state.hintsRemaining > 0 ? 'var(--brand-primary)' : '#bdc3c7'}
                            />
                            <span className="icon-badge">{state.hintsRemaining}</span>
                        </div>
                    </button>
                )}
            </div>

            {/* Number Row */}
            <div className="number-row animate-fade-in" style={{ '--delay': '0.2s' } as any}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
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
    );
};

export default Controls;
