import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Grid } from '../engine/validator';
import type { Difficulty } from '../engine/generator';
import { generatePuzzles } from '../engine/generator';

interface GameState {
    board: Grid;
    initialBoard: Grid;
    solution: Grid;
    notes: number[][][]; // [row][col][numbers]
    history: Grid[];
    redoStack: Grid[];
    selectedCell: { row: number; col: number } | null;
    isNoteMode: boolean;
    difficulty: Difficulty;
    isWinner: boolean;
    mistakes: number;
    timer: number;
    isPaused: boolean;
    isGameOver: boolean;
}

type GameAction =
    | { type: 'START_GAME'; difficulty: Difficulty }
    | { type: 'SET_CELL'; row: number; col: number; value: number | null }
    | { type: 'TOGGLE_NOTE'; row: number; col: number; value: number }
    | { type: 'SELECT_CELL'; row: number; col: number | null }
    | { type: 'TOGGLE_NOTE_MODE' }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'HINT' }
    | { type: 'TICK_TIMER' }
    | { type: 'TOGGLE_PAUSE' };

const initialState: GameState = {
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    initialBoard: Array(9).fill(null).map(() => Array(9).fill(null)),
    solution: Array(9).fill(null).map(() => Array(9).fill(null)),
    notes: Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])),
    history: [],
    redoStack: [],
    selectedCell: null,
    isNoteMode: false,
    difficulty: 'Easy',
    isWinner: false,
    mistakes: 0,
    timer: 0,
    isPaused: false,
    isGameOver: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME': {
            const { puzzle, solution } = generatePuzzles(action.difficulty);
            return {
                ...initialState,
                board: puzzle.map(r => [...r]),
                initialBoard: puzzle.map(r => [...r]),
                solution,
                difficulty: action.difficulty,
            };
        }

        case 'SELECT_CELL':
            return { ...state, selectedCell: action.col !== null ? { row: action.row, col: action.col } : null };

        case 'SET_CELL': {
            const { row, col, value } = action;
            if (state.initialBoard[row][col] !== null || state.isGameOver || state.isWinner) return state;

            // If erasing
            if (value === null) {
                const newBoard = state.board.map((r, ri) =>
                    ri === row ? r.map((c, ci) => (ci === col ? null : c)) : [...r]
                );
                return {
                    ...state,
                    board: newBoard,
                    history: [...state.history, state.board.map(r => [...r])],
                    redoStack: [],
                };
            }

            // Check if correct
            const isCorrect = state.solution[row][col] === value;
            const newMistakes = isCorrect ? state.mistakes : state.mistakes + 1;
            const isGameOver = newMistakes >= 3;

            const newBoard = state.board.map((r, ri) =>
                ri === row ? r.map((c, ci) => (ci === col ? (isCorrect ? value : c) : c)) : [...r]
            );

            // Check win condition
            const isWinner = !isGameOver && newBoard.every((r, ri) => r.every((c, ci) => c === state.solution[ri][ci]));

            return {
                ...state,
                board: newBoard,
                mistakes: newMistakes,
                isGameOver,
                isWinner,
                history: [...state.history, state.board.map(r => [...r])],
                redoStack: [],
            };
        }

        case 'TOGGLE_NOTE_MODE':
            return { ...state, isNoteMode: !state.isNoteMode };

        case 'TOGGLE_NOTE': {
            const { row, col, value } = action;
            if (state.board[row][col] !== null || state.isGameOver) return state;

            const newNotes = state.notes.map((r, ri) =>
                ri === row
                    ? r.map((c, ci) => {
                        if (ci === col) {
                            return c.includes(value) ? c.filter(n => n !== value) : [...c, value].sort();
                        }
                        return c;
                    })
                    : r
            );

            return { ...state, notes: newNotes };
        }

        case 'UNDO': {
            if (state.history.length === 0 || state.isGameOver) return state;
            const prevBoard = state.history[state.history.length - 1];
            return {
                ...state,
                board: prevBoard,
                history: state.history.slice(0, -1),
                redoStack: [...state.redoStack, state.board.map(r => [...r])],
            };
        }

        case 'REDO': {
            if (state.redoStack.length === 0 || state.isGameOver) return state;
            const nextBoard = state.redoStack[state.redoStack.length - 1];
            return {
                ...state,
                board: nextBoard,
                redoStack: state.redoStack.slice(0, -1),
                history: [...state.history, state.board.map(r => [...r])],
            };
        }

        case 'HINT': {
            if (!state.selectedCell || state.isGameOver) return state;
            const { row, col } = state.selectedCell;
            if (state.board[row][col] !== null) return state;

            const value = state.solution[row][col];
            return gameReducer(state, { type: 'SET_CELL', row, col, value });
        }

        case 'TICK_TIMER':
            if (state.isPaused || state.isGameOver || state.isWinner) return state;
            return { ...state, timer: state.timer + 1 };

        case 'TOGGLE_PAUSE':
            return { ...state, isPaused: !state.isPaused };

        default:
            return state;
    }
}

const GameContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
} | null>(null);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    useEffect(() => {
        const interval = setInterval(() => {
            dispatch({ type: 'TICK_TIMER' });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within GameProvider');
    return context;
};
