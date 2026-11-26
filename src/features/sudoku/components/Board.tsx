import React, { useState, useEffect } from 'react';
import Cell from './Cell';
import { useGame } from '../context/SudokuContext';

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

    const boardSize = state.board.length;

    // 풀이 진행도(0~1) — 전설 테마 '새벽'이 배경 하늘색을 여기에 맞춰 바꾼다. 다른 테마는 쓰지 않는다.
    const total = boardSize * boardSize;
    let givens = 0, correct = 0;
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (state.initialBoard[r]?.[c] !== null) givens++;
            else if (state.board[r][c] !== null && state.board[r][c] === state.solution[r]?.[c]) correct++;
        }
    }
    const progress = total > givens ? correct / (total - givens) : 0;
    useEffect(() => {
        document.documentElement.style.setProperty('--sd-progress', progress.toFixed(3));
    }, [progress]);
    useEffect(() => () => { document.documentElement.style.removeProperty('--sd-progress'); }, []);

    return (
        <div className={`sudoku-board ${boardSize === 6 ? 'sudoku-board-6' : boardSize === 16 ? 'sudoku-board-16' : ''} ${isEntering ? 'is-entering' : ''}`} key={boardKey}>
            {Array(boardSize).fill(0).map((_, r) =>
                Array(boardSize).fill(0).map((_, c) => (
                    <Cell key={`${r}-${c}`} row={r} col={c} />
                ))
            )}
        </div>
    );
};

export default Board;
