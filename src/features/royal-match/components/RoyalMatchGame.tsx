import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crown, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RoyalMatchProvider, useRoyalMatch } from '../context/RoyalMatchContext';
import { BOARD_SIZE, GEM_ICONS } from '../utils/boardEngine';
import {
  CLEAR_ANIM_MS,
  CLEAR_HOLD_MS,
  SWAP_ANIM_MS,
  fallDurationMs,
} from '../constants';
import type { Position } from '../types';
import '../styles/RoyalMatchGame.css';

const CELL_PCT = 100 / BOARD_SIZE;
const SWAP_EASE = 'cubic-bezier(0.34, 1.4, 0.64, 1)';
// y = x^2 에 가까운 ease-in 곡선. 낙하 시간이 거리의 제곱근에 비례하므로(fallDurationMs)
// 이 곡선과 조합하면 모든 타일이 "같은 중력가속도"로 떨어진다 - 그래서 한 컬럼 안에서
// 낙하 거리가 서로 달라도 타일끼리 서로를 추월하거나 겹치지 않는다.
const GRAVITY_EASE = 'cubic-bezier(0.11, 0, 0.5, 0)';
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
  const landCleanupRef = useRef<(() => void)[]>([]);
  const fallDurationRef = useRef(0);

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

  // 각 단계의 애니메이션이 끝나는 시점에 다음 단계로 넘긴다.
  // 스왑 -> (매치 판정) -> 터짐 -> 중력 낙하 -> 연쇄 판정 -> ... -> 종료.
  useEffect(() => {
    let delay: number;
    let next: 'RESOLVE_SWAP' | 'CLEAR_REVERT' | 'APPLY_GRAVITY' | 'SETTLE';

    switch (state.phase) {
      case 'swapping':
        delay = SWAP_ANIM_MS;
        next = 'RESOLVE_SWAP';
        break;
      case 'reverting':
        delay = SWAP_ANIM_MS;
        next = 'CLEAR_REVERT';
        break;
      case 'clearing':
        // 터지는 애니메이션 + 빈칸을 보여주는 정지 구간이 모두 끝난 뒤에 낙하를 시작한다.
        delay = CLEAR_ANIM_MS + CLEAR_HOLD_MS;
        next = 'APPLY_GRAVITY';
        break;
      case 'falling':
        // 실제로 가장 멀리 떨어지는 타일의 낙하 시간(FLIP 단계에서 계산)만큼 기다린다.
        delay = fallDurationRef.current + 40;
        next = 'SETTLE';
        break;
      default:
        return;
    }

    const timer = setTimeout(() => dispatch({ type: next }), delay);
    return () => clearTimeout(timer);
  }, [state.phase, state.board, dispatch]);

  // FLIP 기법: 타일의 그리드 좌표(row/col)가 바뀌면, 바뀌기 직전 화면 위치와의
  // 차이만큼 즉시 transform으로 되돌려놓은 뒤(트랜지션 없이) 강제로 리플로우시키고,
  // transform을 0으로 되돌려 트랜지션이 그 차이만큼 자연스럽게 슬라이드하게 만든다.
  // 새로 생성된 타일은 이전 위치가 없으므로 tile.spawnRow(보드 위쪽 가상 행)를
  // 출발점으로 삼아 천장 위에서 떨어져 들어오게 한다.
  useLayoutEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const cellSize = boardEl.clientWidth / BOARD_SIZE;
    const isFalling = state.phase === 'falling';

    landCleanupRef.current.forEach(fn => fn());
    landCleanupRef.current = [];

    const nextPositions = new Map<number, Position>();
    state.board.forEach((row, r) => {
      row.forEach((tile, c) => {
        nextPositions.set(tile.id, { row: r, col: c });
      });
    });

    let longestFall = 0;

    state.board.forEach(row => {
      row.forEach(tile => {
        const pos = nextPositions.get(tile.id) as Position;
        const el = tileElsRef.current.get(tile.id);
        if (!el) return;

        const prev =
          prevPosRef.current.get(tile.id) ??
          (tile.spawnRow !== undefined ? { row: tile.spawnRow, col: pos.col } : undefined);
        if (!prev || (prev.row === pos.row && prev.col === pos.col)) return;

        const dx = (prev.col - pos.col) * cellSize;
        const dy = (prev.row - pos.row) * cellSize;

        const falling = isFalling && dy < 0;
        const duration = falling ? fallDurationMs(pos.row - prev.row) : SWAP_ANIM_MS;
        if (falling) longestFall = Math.max(longestFall, duration);

        // CSS 애니메이션은 인라인 transform보다 우선한다. 이전 착지 스쿼시가 남아 있으면
        // 아래 FLIP transform이 통째로 무시되어 타일이 슬라이드 없이 순간이동해버린다.
        el.classList.remove('landed');
        el.style.transition = 'none';
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        el.offsetWidth; // 강제 리플로우 - 위 transform이 실제로 반영된 뒤에 트랜지션을 켠다.
        el.style.transition = `transform ${duration}ms ${falling ? GRAVITY_EASE : SWAP_EASE}`;
        el.style.transform = '';

        if (!falling) return;
        // 착지하는 순간(= transform 트랜지션이 실제로 끝나는 순간) 살짝 찌그러졌다
        // 펴지게 해서 무게감을 준다. 타이머가 아니라 트랜지션 종료 이벤트에 걸어야
        // 애니메이션이 중간에 바뀌어도 어긋나지 않는다.
        const onLand = (ev: TransitionEvent) => {
          if (ev.propertyName !== 'transform') return;
          el.removeEventListener('transitionend', onLand);
          el.classList.add('landed');
        };
        el.addEventListener('transitionend', onLand);
        landCleanupRef.current.push(() => el.removeEventListener('transitionend', onLand));
      });
    });

    fallDurationRef.current = longestFall;
    prevPosRef.current = nextPositions;
  }, [state.board, state.phase]);

  // 스쿼시가 끝나면 클래스를 걷어낸다(이벤트 위임). 클래스가 남아 있으면 다음 낙하 때
  // 같은 애니메이션이 다시 재생되지 않고, transform 충돌도 생긴다.
  useEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const onAnimEnd = (ev: AnimationEvent) => {
      if (ev.animationName === 'royal-match-land') {
        (ev.target as HTMLElement).classList.remove('landed');
      }
    };
    boardEl.addEventListener('animationend', onAnimEnd);
    return () => {
      boardEl.removeEventListener('animationend', onAnimEnd);
      landCleanupRef.current.forEach(fn => fn());
    };
  }, []);

  const handleNewGame = () => dispatch({ type: 'NEW_GAME' });

  const handlePointerDown = (pos: Position) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state.phase !== 'idle' || state.status !== 'playing') return;
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
              const isReverting = state.phase === 'reverting' && isPendingPos({ row: r, col: c });
              const key = `${r},${c}`;
              const isClearing = state.clearing.has(key);
              const special = tile.special ? ` ${tile.special}` : '';
              const isSpawning = state.spawnedSpecials.has(key) ? ' spawning' : '';
              return (
                <button
                  key={tile.id}
                  data-tile-id={tile.id}
                  ref={(el) => {
                    if (el) tileElsRef.current.set(tile.id, el);
                    else tileElsRef.current.delete(tile.id);
                  }}
                  className={`royal-match-tile${isGrabbed ? ' selected' : ''}${isReverting ? ' invalid' : ''}${isClearing ? ' clearing' : ''}${special}${isSpawning}`}
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
