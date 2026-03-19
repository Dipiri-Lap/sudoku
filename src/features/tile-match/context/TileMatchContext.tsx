import React, { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Tile Match (Triple Tile) Context
 * Handles the state for tiles on the board and in the tray.
 */

export interface TileData {
    id: string;
    type: string; // Emoji or Icon name
    x: number;    // Board position X
    y: number;    // Board position Y
    z: number;    // Layer depth
    isBlocked: boolean; // True if another tile overlaps this one
    status: 'board' | 'tray' | 'cleared';
}

interface GameState {
    tiles: TileData[];
    tray: TileData[];
    status: 'ready' | 'playing' | 'won' | 'gameover';
    level: number;
}

type GameAction =
    | { type: 'START_GAME'; tiles: TileData[] }
    | { type: 'SELECT_TILE'; tileId: string }
    | { type: 'CLEAR_MATCH'; typeName: string }
    | { type: 'CHECK_GAME_OVER' };

const initialState: GameState = {
    tiles: [],
    tray: [],
    status: 'ready',
    level: 1
};

const TRAY_SIZE = 7;

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'START_GAME':
            return {
                ...state,
                tiles: action.tiles,
                tray: [],
                status: 'playing'
            };

        case 'SELECT_TILE': {
            if (state.status !== 'playing') return state;
            if (state.tray.length >= TRAY_SIZE) return state;

            const selectedTile = state.tiles.find(t => t.id === action.tileId);
            if (!selectedTile || selectedTile.isBlocked || selectedTile.status !== 'board') return state;

            const newTiles = state.tiles.map(t =>
                t.id === action.tileId ? { ...t, status: 'tray' as const } : t
            );

            // Update blocked status for remaining tiles
            const updatedTiles = updateBlockedStatus(newTiles);
            const newTray = [...state.tray, { ...selectedTile, status: 'tray' as const }];

            return {
                ...state,
                tiles: updatedTiles,
                tray: newTray
            };
        }

        case 'CLEAR_MATCH': {
            const trayAfterMatch = state.tray.filter(t => t.type !== action.typeName);
            const clearedIds = state.tray.filter(t => t.type === action.typeName).map(t => t.id);
            
            const newTiles = state.tiles.map(t =>
                clearedIds.includes(t.id) ? { ...t, status: 'cleared' as const } : t
            );

            const isWin = newTiles.every(t => t.status === 'cleared');

            return {
                ...state,
                tiles: newTiles,
                tray: trayAfterMatch,
                status: isWin ? 'won' : state.status
            };
        }

        case 'CHECK_GAME_OVER':
            if (state.tray.length >= TRAY_SIZE && state.status === 'playing') {
                return { ...state, status: 'gameover' };
            }
            return state;

        default:
            return state;
    }
}

// Logic to check if a tile is covered by tiles on higher layers (z)
function updateBlockedStatus(tiles: TileData[]): TileData[] {
    return tiles.map(t => {
        if (t.status !== 'board') return t;
        
        const isBlocked = tiles.some(other => {
            if (other.status !== 'board' || other.z <= t.z) return false;
            // Overlap check (Assuming tiles are roughly 1x1 size unit)
            // If the center of 'other' is within certain distance of 't'
            return Math.abs(other.x - t.x) < 0.6 && Math.abs(other.y - t.y) < 0.6;
        });

        return { ...t, isBlocked };
    });
}

const TileMatchContext = createContext<{
    state: GameState;
    dispatch: React.Dispatch<GameAction>;
} | undefined>(undefined);

export const TileMatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    // Auto-check for matches in the tray
    useEffect(() => {
        if (state.tray.length > 0) {
            const counts: Record<string, number> = {};
            state.tray.forEach(t => {
                counts[t.type] = (counts[t.type] || 0) + 1;
            });

            for (const typeName in counts) {
                if (counts[typeName] >= 3) {
                    // Match found! Clear after a short delay for animation
                    const timer = setTimeout(() => {
                        dispatch({ type: 'CLEAR_MATCH', typeName });
                    }, 400);
                    return () => clearTimeout(timer);
                }
            }
            
            // If tray is full and no matches were processed
            if (state.tray.length >= TRAY_SIZE) {
                dispatch({ type: 'CHECK_GAME_OVER' });
            }
        }
    }, [state.tray]);

    return (
        <TileMatchContext.Provider value={{ state, dispatch }}>
            {children}
        </TileMatchContext.Provider>
    );
};

export const useTileMatch = () => {
    const context = useContext(TileMatchContext);
    if (!context) throw new Error('useTileMatch must be used within TileMatchProvider');
    return context;
};
