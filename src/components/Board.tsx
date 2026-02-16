import React, { useState, useEffect } from 'react';
import Cell from './Cell';
import { useGame } from '../context/GameContext';

const Board: React.FC = () => {
    const { state } = useGame();
    const [isEntering, setIsEntering] = useState(true);

    // Use the first few cells of the solution as a key to re-trigger the entrance animation
    // whenever a new board is generated.
    const boardKey = state.solution.flat().slice(0, 10).join('');

    useEffect(() => {
        setIsEntering(true);
        const timer = setTimeout(() => {
            setIsEntering(false);
        }, 2000); // 2 seconds should be enough for the diagonal animation to finish
        return () => clearTimeout(timer);
    }, [boardKey]);

    return (
        <div className={`sudoku-board ${isEntering ? 'is-entering' : ''}`} key={boardKey}>
            {Array(9).fill(0).map((_, r) =>
                Array(9).fill(0).map((_, c) => (
                    <Cell key={`${r}-${c}`} row={r} col={c} />
                ))
            )}
        </div>
    );
};

export default Board;
