import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crown, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RoyalMatchProvider, useRoyalMatch } from '../context/RoyalMatchContext';
import { BOARD_SIZE, GEM_ICONS } from '../utils/boardEngine';
import type { Position } from '../types';
import '../styles/RoyalMatchGame.css';

const SWAP_ANIM_MS = 320;
const CELL_PCT = 100 / BOARD_SIZE;
const COMMIT_RATIO = 0.6; // 셀 크기의 60% 이상 끌어야 방향이 확정되어 스왑이 트리거된다.

interface DragState {
  pos: Position;
  x: number;
  y: number;
  cellSize: number;
}

const RoyalMatchContent: React.FC = () => {
  const { state, dispatch } = useRoyalMatch();
  const dragRef = useRef<DragState | null>(null);
  const [grabbedPos, setGrabbedPos] = useState<Position | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const tileElsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const prevPosRef = useRef<Map<number, Position>>(new Map());

  useEffect(() => {
    if (state.status === 'won') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#48DBFB'],
      });
    }
  }, [state.status]);

  // 타일이 서로 자리를 바꾸는 슬라이드 애니메이션이 끝난 뒤에 매치 판정을 하고,
  // 매치가 없으면 되돌리는 애니메이션까지 마친 뒤 상태를 정리한다.
  useEffect(() => {
    if (state.swapStatus === 'swapping') {
      const timer = setTimeout(() => dispatch({ type: 'RESOLVE_SWAP' }), SWAP_ANIM_MS);
      return () => clearTimeout(timer);
    }
    if (state.swapStatus === 'reverting') {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_REVERT' }), SWAP_ANIM_MS);
      return () => clearTimeout(timer);
    }
  }, [state.swapStatus, dispatch]);

  // FLIP 기법: 타일의 그리드 좌표(row/col)가 바뀌면, 바뀌기 직전 화면 위치와의
  // 차이만큼 즉시 transform으로 되돌려놓은 뒤(트랜지션 없이) 강제로 리플로우시키고,
  // transform을 0으로 되돌려 트랜지션이 그 차이만큼 자연스럽게 슬라이드하게 만든다.
  // React 상태 변경만으로 left/top 트랜지션에 의존하면 이벤트 우선순위/배치 타이밍에
  // 따라 애니메이션이 씹히는 경우가 있어, 항상 확실히 재생되도록 직접 제어한다.
  useLayoutEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const cellSize = boardEl.clientWidth / BOARD_SIZE;

    const nextPositions = new Map<number, Position>();
    state.board.forEach((row, r) => {
      row.forEach((tile, c) => {
        nextPositions.set(tile.id, { row: r, col: c });
      });
    });

    nextPositions.forEach((pos, id) => {
      const prev = prevPosRef.current.get(id);
      const el = tileElsRef.current.get(id);
      if (!prev || !el || (prev.row === pos.row && prev.col === pos.col)) return;

      const dx = (prev.col - pos.col) * cellSize;
      const dy = (prev.row - pos.row) * cellSize;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetWidth; // 강제 리플로우 - 위 transform이 실제로 반영된 뒤에 트랜지션을 켠다.
      el.style.transition = '';
      el.style.transform = '';
    });

    prevPosRef.current = nextPositions;
  }, [state.board]);

  const handleNewGame = () => dispatch({ type: 'NEW_GAME' });

  const handlePointerDown = (pos: Position) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state.swapStatus !== 'none' || state.status !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { pos, x: e.clientX, y: e.clientY, cellSize: rect.width };
    setGrabbedPos(pos);
  };

  // 드래그 중에는 과일이 따라 움직이지 않다가, 한 셀의 일정 비율 이상 끌린
  // 방향이 확정되는 순간 실제 상태를 스왑한다. 실제 슬라이드 애니메이션은
  // 위 useLayoutEffect의 FLIP 처리가 담당한다.
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const threshold = drag.cellSize * COMMIT_RATIO;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    dragRef.current = null;
    setGrabbedPos(null);

    const target: Position =
      Math.abs(dx) > Math.abs(dy)
        ? { row: drag.pos.row, col: drag.pos.col + (dx > 0 ? 1 : -1) }
        : { row: drag.pos.row + (dy > 0 ? 1 : -1), col: drag.pos.col };

    if (target.row < 0 || target.row >= BOARD_SIZE || target.col < 0 || target.col >= BOARD_SIZE) return;
    dispatch({ type: 'SWAP_ADJACENT', a: drag.pos, b: target });
  };

  const handlePointerEnd = () => {
    dragRef.current = null;
    setGrabbedPos(null);
  };

  const progressPct = Math.min(100, Math.round((state.score / state.targetScore) * 100));
  const isPendingPos = (pos: Position) =>
    !!state.pendingSwap &&
    ((state.pendingSwap.a.row === pos.row && state.pendingSwap.a.col === pos.col) ||
      (state.pendingSwap.b.row === pos.row && state.pendingSwap.b.col === pos.col));

  return (
    <div className="royal-match-page">
      <header className="royal-match-header">
        <div className="royal-match-title">
          <Crown size={24} color="#FFD700" />
          <h1>ROYAL MATCH</h1>
        </div>
        <button className="royal-match-icon-btn" onClick={handleNewGame} title="새 게임">
          <RotateCcw size={20} />
        </button>
      </header>

      <div className="royal-match-stats">
        <div className="royal-match-stat">
          <span className="label">남은 횟수</span>
          <span className="value">{state.moves}</span>
        </div>
        <div className="royal-match-progress">
          <div className="royal-match-progress-track">
            <div className="royal-match-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="royal-match-progress-text">{state.score} / {state.targetScore}</span>
        </div>
      </div>

      <div className="royal-match-board-outer">
        <div
          ref={boardRef}
          className="royal-match-board"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {/* 행 단위로 중첩된 배열이 아니라 하나의 평평한 리스트로 렌더링해야
              React가 tile.id 키를 보드 전체(행이 바뀌는 경우 포함)에서 매칭해
              같은 DOM 노드를 재사용한다 - 그래야 상하 이동/낙하도 같은 노드로 처리된다. */}
          {state.board.flatMap((row, r) =>
            row.map((tile, c) => {
              const isGrabbed = grabbedPos?.row === r && grabbedPos?.col === c;
              const isReverting = state.swapStatus === 'reverting' && isPendingPos({ row: r, col: c });
              return (
                <button
                  key={tile.id}
                  data-tile-id={tile.id}
                  ref={(el) => {
                    if (el) tileElsRef.current.set(tile.id, el);
                    else tileElsRef.current.delete(tile.id);
                  }}
                  className={`royal-match-tile${isGrabbed ? ' selected' : ''}${isReverting ? ' invalid' : ''}`}
                  style={{
                    left: `calc(${c * CELL_PCT}% + 2px)`,
                    top: `calc(${r * CELL_PCT}% + 2px)`,
                    width: `calc(${CELL_PCT}% - 4px)`,
                    height: `calc(${CELL_PCT}% - 4px)`,
                  }}
                  onPointerDown={handlePointerDown({ row: r, col: c })}
                >
                  {GEM_ICONS[tile.type]}
                </button>
              );
            })
          )}
        </div>
      </div>

      {state.status === 'won' && (
        <div className="royal-match-overlay">
          <Sparkles size={60} color="#FFD700" />
          <h2>CLEAR!</h2>
          <p>{state.score}점 달성</p>
          <button className="royal-match-btn" onClick={handleNewGame}>다시 하기</button>
        </div>
      )}

      {state.status === 'lost' && (
        <div className="royal-match-overlay">
          <XCircle size={60} color="#FF6B6B" />
          <h2>GAME OVER</h2>
          <p>{state.score} / {state.targetScore}점</p>
          <button className="royal-match-btn" onClick={handleNewGame}>다시 하기</button>
        </div>
      )}
    </div>
  );
};

const RoyalMatchGame: React.FC = () => (
  <RoyalMatchProvider>
    <RoyalMatchContent />
  </RoyalMatchProvider>
);

export default RoyalMatchGame;
