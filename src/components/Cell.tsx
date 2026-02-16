import React from 'react';
import { useGame } from '../context/GameContext';

interface CellProps {
    row: number;
    col: number;
}

const Cell: React.FC<CellProps> = ({ row, col }) => {
    const { state, dispatch } = useGame();
    const value = state.board[row][col];
    const isInitial = state.initialBoard[row][col] !== null;
    const isSelected = state.selectedCell?.row === row && state.selectedCell?.col === col;
    const isHighlighted = state.selectedCell?.row === row || state.selectedCell?.col === col;
    const isCorrectSolution = state.solution[row][col] === value;
    const isError = value !== null && !isInitial && !isCorrectSolution;
    const notes = state.notes[row][col];

    const handleClick = () => {
        dispatch({ type: 'SELECT_CELL', row, col });
    };

    return (
        <div
            className={`sudoku-cell ${isInitial ? 'initial' : 'user'} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlight' : ''
                } ${isError ? 'error' : ''}`}
            onClick={handleClick}
        >
            {value !== null ? (
                value
            ) : (
                <div className="notes-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <div key={n} className="note-item">
                            {notes.includes(n) ? n : ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Cell;
