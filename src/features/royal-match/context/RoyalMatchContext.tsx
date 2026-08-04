import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Position, RoyalMatchState } from '../types';
import {
  createPlayableBoard,
  findMatches,
  hasAnyValidMove,
  isAdjacent,
  resolveBoard,
  swapCells,
} from '../utils/boardEngine';

const MOVES_LIMIT = 20;
const TARGET_SCORE = 1500;

function createInitialState(): RoyalMatchState {
  return {
    board: createPlayableBoard(),
    score: 0,
    moves: MOVES_LIMIT,
    movesLimit: MOVES_LIMIT,
    targetScore: TARGET_SCORE,
    pendingSwap: null,
    swapStatus: 'none',
    lastCombo: 0,
    status: 'playing',
  };
}

type Action =
  | { type: 'NEW_GAME' }
  | { type: 'SWAP_ADJACENT'; a: Position; b: Position }
  | { type: 'RESOLVE_SWAP' }
  | { type: 'CLEAR_REVERT' };

function reducer(state: RoyalMatchState, action: Action): RoyalMatchState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();

    case 'CLEAR_REVERT':
      return { ...state, pendingSwap: null, swapStatus: 'none' };

    case 'SWAP_ADJACENT': {
      if (state.status !== 'playing' || state.swapStatus !== 'none') return state;
      const { a, b } = action;
      if (!isAdjacent(a, b)) return state;

      // 드래그 방향으로 먼저 시각적으로만 스왑한다 - 매치 판정은
      // 슬라이드 애니메이션이 끝난 뒤(RESOLVE_SWAP) 처리한다.
      const swappedBoard = swapCells(state.board, a, b);
      return {
        ...state,
        board: swappedBoard,
        pendingSwap: { a, b },
        swapStatus: 'swapping',
      };
    }

    case 'RESOLVE_SWAP': {
      if (!state.pendingSwap || state.swapStatus !== 'swapping') return state;
      const { a, b } = state.pendingSwap;
      const matched = findMatches(state.board);

      if (matched.size === 0) {
        // 매치가 없으면 원래 자리로 되돌린다 (횟수 소모 없음).
        const revertedBoard = swapCells(state.board, a, b);
        return { ...state, board: revertedBoard, swapStatus: 'reverting' };
      }

      const { board: resolvedBoard, scoreGained, combo } = resolveBoard(state.board);
      const moves = state.moves - 1;
      const score = state.score + scoreGained;

      let status: RoyalMatchState['status'] = 'playing';
      if (score >= state.targetScore) status = 'won';
      else if (moves <= 0) status = 'lost';

      let finalBoard = resolvedBoard;
      if (status === 'playing' && !hasAnyValidMove(finalBoard)) {
        finalBoard = createPlayableBoard();
      }

      return {
        ...state,
        board: finalBoard,
        score,
        moves,
        pendingSwap: null,
        swapStatus: 'none',
        lastCombo: combo,
        status,
      };
    }

    default:
      return state;
  }
}

interface RoyalMatchContextValue {
  state: RoyalMatchState;
  dispatch: React.Dispatch<Action>;
}

const RoyalMatchContext = createContext<RoyalMatchContextValue | null>(null);

export const RoyalMatchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  return (
    <RoyalMatchContext.Provider value={{ state, dispatch }}>
      {children}
    </RoyalMatchContext.Provider>
  );
};

export function useRoyalMatch(): RoyalMatchContextValue {
  const ctx = useContext(RoyalMatchContext);
  if (!ctx) throw new Error('useRoyalMatch must be used within RoyalMatchProvider');
  return ctx;
}
