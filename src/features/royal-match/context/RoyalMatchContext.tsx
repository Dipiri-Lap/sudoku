import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Position, RoyalMatchState } from '../types';
import {
  applyGravity,
  cellKey,
  createPlayableBoard,
  expandSpecials,
  findMatchGroups,
  hasAnyValidMove,
  isAdjacent,
  markSpecials,
  planSpecials,
  scoreForMatch,
  swapCells,
  withSpawnFromAbove,
} from '../utils/boardEngine';

const MOVES_LIMIT = 20;
const TARGET_SCORE = 1500;

function createInitialState(): RoyalMatchState {
  return {
    board: withSpawnFromAbove(createPlayableBoard()),
    score: 0,
    moves: MOVES_LIMIT,
    movesLimit: MOVES_LIMIT,
    targetScore: TARGET_SCORE,
    pendingSwap: null,
    phase: 'falling',
    clearing: new Set(),
    spawnedSpecials: new Set(),
    blasts: [],
    clearId: 0,
    combo: 0,
    lastCombo: 0,
    status: 'playing',
  };
}

type Action =
  | { type: 'NEW_GAME' }
  | { type: 'SWAP_ADJACENT'; a: Position; b: Position }
  | { type: 'RESOLVE_SWAP' }
  | { type: 'CLEAR_REVERT' }
  | { type: 'APPLY_GRAVITY' }
  | { type: 'SETTLE' };

// 매치가 사라진 뒤의 마무리: 승패 판정과 (수가 없으면) 리셔플.
function finish(state: RoyalMatchState): RoyalMatchState {
  let status: RoyalMatchState['status'] = 'playing';
  if (state.score >= state.targetScore) status = 'won';
  else if (state.moves <= 0) status = 'lost';

  let board = state.board;
  let phase: RoyalMatchState['phase'] = 'idle';
  if (status === 'playing' && !hasAnyValidMove(board)) {
    board = withSpawnFromAbove(createPlayableBoard());
    phase = 'falling';
  }

  return {
    ...state,
    board,
    phase,
    clearing: new Set(),
    spawnedSpecials: new Set(),
    blasts: [],
    pendingSwap: null,
    lastCombo: state.combo,
    combo: 0,
    status,
  };
}

// 지금 보드에 매치가 있으면(또는 seed로 강제 발동된 칸이 있으면)
// "터지는 중(clearing)" 단계로 들어간다.
// 실제 제거/낙하는 터지는 애니메이션이 끝난 뒤 APPLY_GRAVITY에서 처리한다.
//
// seed      - 매치와 무관하게 무조건 터뜨릴 칸(로켓을 스왑해서 직접 발사한 경우).
// preferred - 아이템이 생길 자리 후보(플레이어가 직접 움직인 칸).
function enterClearing(
  state: RoyalMatchState,
  seed: Set<string> = new Set(),
  preferred: Position[] = [],
): RoyalMatchState | null {
  const groups = findMatchGroups(state.board);
  const base = new Set<string>(seed);
  groups.forEach(g => g.cells.forEach(key => base.add(key)));
  if (base.size === 0) return null;

  // 아이템 생성 판정은 "터지기 전" 매치 모양으로만 한다. 로켓 폭발로 딸려 들어온
  // 칸까지 세면 폭발 한 번에 로켓이 줄줄이 생겨버린다.
  const spawns = planSpecials(groups, preferred);

  // 이번에 새로 생기는 로켓은 이번 턴에 같이 터지지 않는다.
  // (markSpecials를 뒤에 하므로 expandSpecials 시점엔 아직 로켓이 아니다)
  const { cells: cleared, blasts } = expandSpecials(state.board, base);
  spawns.forEach(s => cleared.delete(s.key));

  const combo = state.combo + 1;
  return {
    ...state,
    board: markSpecials(state.board, spawns),
    phase: 'clearing',
    clearing: cleared,
    spawnedSpecials: new Set(spawns.map(s => s.key)),
    blasts,
    clearId: state.clearId + 1,
    combo,
    score: state.score + scoreForMatch(cleared.size, combo),
    pendingSwap: null,
  };
}

function reducer(state: RoyalMatchState, action: Action): RoyalMatchState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();

    case 'CLEAR_REVERT':
      return { ...state, pendingSwap: null, phase: 'idle' };

    case 'SWAP_ADJACENT': {
      if (state.status !== 'playing' || state.phase !== 'idle') return state;
      const { a, b } = action;
      if (!isAdjacent(a, b)) return state;

      // 드래그 방향으로 먼저 시각적으로만 스왑한다 - 매치 판정은
      // 슬라이드 애니메이션이 끝난 뒤(RESOLVE_SWAP) 처리한다.
      return {
        ...state,
        board: swapCells(state.board, a, b),
        pendingSwap: { a, b },
        phase: 'swapping',
      };
    }

    case 'RESOLVE_SWAP': {
      if (!state.pendingSwap || state.phase !== 'swapping') return state;
      const { a, b } = state.pendingSwap;

      // 로켓이 걸린 칸을 아무 데로나 스왑하면 매치가 없어도 그 자리에서 발사된다.
      const seed = new Set<string>();
      [a, b].forEach(p => {
        if (state.board[p.row][p.col].special) seed.add(cellKey(p.row, p.col));
      });

      const cleared = enterClearing(state, seed, [a, b]);
      if (!cleared) {
        // 매치가 없으면 원래 자리로 되돌린다 (횟수 소모 없음).
        return { ...state, board: swapCells(state.board, a, b), phase: 'reverting' };
      }
      // 유효한 수였으므로 이때 한 번만 횟수를 소모한다.
      return { ...cleared, moves: state.moves - 1 };
    }

    // 터지는 애니메이션이 끝난 시점: 실제로 칸을 비우고 중력/리필을 적용한다.
    case 'APPLY_GRAVITY': {
      if (state.phase !== 'clearing') return state;
      return {
        ...state,
        board: applyGravity(state.board, state.clearing),
        clearing: new Set(),
        spawnedSpecials: new Set(),
        blasts: [],
        phase: 'falling',
      };
    }

    // 낙하가 끝난 시점: 연쇄 매치가 생겼으면 다시 터뜨리고, 아니면 마무리한다.
    case 'SETTLE': {
      if (state.phase !== 'falling') return state;
      return enterClearing(state) ?? finish(state);
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
