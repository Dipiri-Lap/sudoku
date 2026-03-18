import React from 'react';
import { useGame } from '../context/SudokuContext';

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

    const boardSize = state.board.length;
    const boxRows = boardSize === 6 ? 2 : 3;
    const sectorIdx = Math.floor(row / boxRows) * (boardSize / 3) + Math.floor(col / 3);
    const isAnimatingRow = state.animatingRows.includes(row);
    const isAnimatingCol = state.animatingCols.includes(col);
    const isAnimatingSector = state.animatingSectors.includes(sectorIdx);

    const handleClick = () => {
        dispatch({ type: 'SELECT_CELL', row, col });
    };

    const isHintCell = state.hintCell?.row === row && state.hintCell?.col === col;

    return (
        <div
            className={`sudoku-cell ${isInitial ? 'initial' : 'user'} animate-entrance ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlight' : ''
                } ${isError ? 'error' : ''} ${state.mistakeCell?.row === row && state.mistakeCell?.col === col ? 'animate-mistake' : ''
                } ${isAnimatingRow ? 'animate-sweep-row' : ''} ${isAnimatingCol ? 'animate-sweep-col' : ''
                } ${isAnimatingSector ? 'animate-sweep-sector' : ''
                } ${isHintCell ? 'animate-hint' : ''}`}
            onClick={handleClick}
            onAnimationEnd={isHintCell ? () => dispatch({ type: 'CLEAR_HINT' }) : undefined}
            style={{
                '--row': row,
                '--col': col,
                '--row-idx': row,
                '--col-idx': col,
                '--inner-row': row % 3,
                '--inner-col': col % 3,
            } as React.CSSProperties}
        >
            {value !== null ? (
                value
            ) : (
                <div className="notes-grid">
                    {Array.from({ length: boardSize }, (_, i) => i + 1).map((n) => (
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
