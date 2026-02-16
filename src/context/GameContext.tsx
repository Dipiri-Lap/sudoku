import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Grid } from '../engine/validator';
import type { Difficulty } from '../engine/generator';
import { generatePuzzles } from '../engine/generator';
import stagesData from '../data/stages.json';

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
    isGameOver: boolean;
    isPaused: boolean;
    timer: number;
    animatingRows: number[];
    animatingCols: number[];
    animatingSectors: number[];
    mistakeCell: { row: number; col: number } | null;
    gameMode: 'TimeAttack' | 'Stage';
    currentLevel: number | null;
    hintsRemaining: number;
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
    | { type: 'TOGGLE_PAUSE' }
    | { type: 'CLEAR_ANIMATIONS' }
    | { type: 'CLEAR_MISTAKE' }
    | { type: 'START_STAGE'; level: number };

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
    animatingRows: [],
    animatingCols: [],
    animatingSectors: [],
    mistakeCell: null,
    gameMode: 'TimeAttack',
    currentLevel: null,
    hintsRemaining: 1,
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
                gameMode: 'TimeAttack',
                currentLevel: null,
                hintsRemaining: 0,
            };
        }

        case 'START_STAGE': {
            const stage = stagesData.find(s => s.id === action.level);
            if (!stage) return state;

            return {
                ...initialState,
                board: stage.board.map(r => r.map(c => c as number | null)) as Grid,
                initialBoard: stage.board.map(r => r.map(c => c as number | null)) as Grid,
                solution: stage.solution.map(r => r.map(c => c as number)) as Grid,
                difficulty: stage.difficulty as Difficulty,
                gameMode: 'Stage',
                currentLevel: action.level,
                hintsRemaining: 1,
            };
        }

        case 'SELECT_CELL':
            return { ...state, selectedCell: action.col !== null ? { row: action.row, col: action.col } : null };

        case 'SET_CELL': {
            let { row, col, value } = action;
            if (state.initialBoard[row][col] !== null || state.isGameOver || state.isWinner) return state;

            // Toggle logic: If entering the same number, treat it as an erasure
            if (value !== null && state.board[row][col] === value) {
                value = null;
            }

            // Save state for undo before modification
            const historyItem = {
                board: state.board.map(r => [...r]),
                notes: state.notes.map(r => r.map(c => [...c])),
            };

            // If erasing (either explicitly or via toggle)
            if (value === null) {
                const newBoard = state.board.map((r, ri) =>
                    ri === row ? r.map((c, ci) => (ci === col ? null : c)) : [...r]
                );
                return {
                    ...state,
                    board: newBoard,
                    history: [...state.history, historyItem as any],
                    redoStack: [],
                };
            }

            // Check if correct
            const isCorrect = state.solution[row][col] === value;
            const alreadyCorrect = state.board[row][col] === state.solution[row][col];

            // Only increment mistakes if it's a new wrong answer on a non-correct cell
            const newMistakes = isCorrect || alreadyCorrect ? state.mistakes : state.mistakes + 1;
            const isGameOver = newMistakes >= 3;

            // In persistent mode, we always write the user's value to the board
            const newBoard = state.board.map((r, ri) =>
                ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r]
            );

            // Check win condition
            const isWinner = !isGameOver && newBoard.every((r, ri) => r.every((c, ci) => c === state.solution[ri][ci]));

            if (isWinner && state.gameMode === 'Stage' && state.currentLevel !== null) {
                const nextLevel = state.currentLevel + 1;
                localStorage.setItem('sudoku_stage_progress', nextLevel.toString());
            }

            if (isWinner && state.gameMode === 'TimeAttack') {
                const bestTimeKey = `sudoku_best_time_${state.difficulty}`;
                const savedBest = localStorage.getItem(bestTimeKey);
                if (!savedBest || state.timer < parseInt(savedBest)) {
                    localStorage.setItem(bestTimeKey, state.timer.toString());
                }
            }

            const newState = {
                ...state,
                board: newBoard,
                mistakes: newMistakes,
                isGameOver,
                isWinner,
                history: [...state.history, historyItem as any],
                redoStack: [],
                mistakeCell: !isCorrect && !alreadyCorrect ? { row, col } : state.mistakeCell,
            };

            // Check if this move completed any rows, columns, or sectors
            if (isCorrect) {
                const animatingRows: number[] = [];
                const animatingCols: number[] = [];
                const animatingSectors: number[] = [];

                // Check row
                if (newBoard[row].every((cell, ci) => cell === state.solution[row][ci])) {
                    animatingRows.push(row);
                }

                // Check col
                if (newBoard.every((r, ri) => r[col] === state.solution[ri][col])) {
                    animatingCols.push(col);
                }

                // Check sector
                const startRow = Math.floor(row / 3) * 3;
                const startCol = Math.floor(col / 3) * 3;
                const sectorIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
                let sectorCompleted = true;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        if (newBoard[startRow + r][startCol + c] !== state.solution[startRow + r][startCol + c]) {
                            sectorCompleted = false;
                            break;
                        }
                    }
                    if (!sectorCompleted) break;
                }
                if (sectorCompleted) {
                    animatingSectors.push(sectorIdx);
                }

                return {
                    ...newState,
                    animatingRows,
                    animatingCols,
                    animatingSectors,
                };
            }

            return newState;
        }

        case 'CLEAR_ANIMATIONS':
            return {
                ...state,
                animatingRows: [],
                animatingCols: [],
                animatingSectors: [],
            };

        case 'CLEAR_MISTAKE':
            return {
                ...state,
                mistakeCell: null,
            };

        case 'TOGGLE_NOTE_MODE':
            return { ...state, isNoteMode: !state.isNoteMode };

        case 'TOGGLE_NOTE': {
            const { row, col, value } = action;
            if (state.board[row][col] !== null || state.isGameOver) return state;

            // Save state for undo
            const historyItem = {
                board: state.board.map(r => [...r]),
                notes: state.notes.map(r => r.map(c => [...c])),
            };

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

            return {
                ...state,
                notes: newNotes,
                history: [...state.history, historyItem as any],
                redoStack: [],
            };
        }

        case 'UNDO': {
            if (state.history.length === 0 || state.isGameOver) return state;
            const prevState = state.history[state.history.length - 1] as any;

            const currentStateItem = {
                board: state.board.map(r => [...r]),
                notes: state.notes.map(r => r.map(c => [...c])),
            };

            return {
                ...state,
                board: prevState.board,
                notes: prevState.notes,
                history: state.history.slice(0, -1),
                redoStack: [...state.redoStack, currentStateItem as any],
            };
        }

        case 'REDO': {
            if (state.redoStack.length === 0 || state.isGameOver) return state;
            const nextState = state.redoStack[state.redoStack.length - 1] as any;

            const currentStateItem = {
                board: state.board.map(r => [...r]),
                notes: state.notes.map(r => r.map(c => [...c])),
            };

            return {
                ...state,
                board: nextState.board,
                notes: nextState.notes,
                redoStack: state.redoStack.slice(0, -1),
                history: [...state.history, currentStateItem as any],
            };
        }

        case 'HINT': {
            if (!state.selectedCell || state.isGameOver || state.hintsRemaining <= 0) return state;
            const { row, col } = state.selectedCell;
            if (state.board[row][col] !== null) return state;

            const value = state.solution[row][col];
            const nextState = gameReducer(state, { type: 'SET_CELL', row, col, value });
            return {
                ...nextState,
                hintsRemaining: state.hintsRemaining - 1,
            };
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

    useEffect(() => {
        if (state.animatingRows.length > 0 || state.animatingCols.length > 0 || state.animatingSectors.length > 0) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_ANIMATIONS' });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [state.animatingRows, state.animatingCols, state.animatingSectors]);

    useEffect(() => {
        if (state.mistakeCell) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_MISTAKE' });
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [state.mistakeCell]);

    return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within GameProvider');
    return context;
};
