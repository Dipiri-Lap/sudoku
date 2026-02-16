import React from 'react';
import Cell from './Cell';

const Board: React.FC = () => {
    return (
        <div className="sudoku-board">
            {Array(9).fill(0).map((_, r) =>
                Array(9).fill(0).map((_, c) => (
                    <Cell key={`${r}-${c}`} row={r} col={c} />
                ))
            )}
        </div>
    );
};

export default Board;
