import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { at, isAdjacent, key } from '../engine/board';
import { hasAnyMove, listMoves, resolveTurn } from '../engine/resolve';
import { makeRng } from '../engine/rng';
import { newBoard, reshuffle } from '../bot/bot';
import type { Position } from '../engine/types';
import { usePlayback } from './usePlayback';
import { GRAVITY_EASE, SWAP_EASE, SWAP_MS, fallDurationMs } from './constants';
import './JewelKingdomGame.css';

const SIZE = 9;
const CELL_PCT = 100 / SIZE;
const COMMIT_RATIO = 0.6; // 셀 크기의 60% 이상 끌어야 방향이 확정된다(royal-match와 동일)
const GEM_SRC = [0, 1, 2, 3, 4, 5].map(i => `/assets/3match/gems/gem-${i}.png`);

interface DragState {
  pos: Position;
  x: number;
  y: number;
  cellSize: number;
}

const JewelKingdomGame: React.FC = () => {
  // 난수원과 첫 보드를 한 번에 만든다. useState의 지연 초기화라 렌더마다
  // 다시 실행되지 않는다 - 렌더 중에 Date.now()를 부르면 리렌더할 때마다
  // 다른 값이 나와 화면이 예측 불가능해진다.
  const [game, setGame] = useState(() => {
    const rng = makeRng(Date.now() >>> 0);
    return { rng, board: newBoard(SIZE, SIZE, rng) };
  });
  const { view, play, reset } = usePlayback(game.board);
  const [moves, setMoves] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const cellElsRef = useRef<Map<number, HTMLElement>>(new Map());
  const prevPosRef = useRef<Map<number, Position>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const [grabbed, setGrabbed] = useState<Position | null>(null);

  const newGame = useCallback(() => {
    const rng = makeRng(Date.now() >>> 0);
    const board = newBoard(SIZE, SIZE, rng);
    setGame({ rng, board });
    setMoves(0);
    reset(board);
  }, [reset]);

  // FLIP: 보석의 그리드 좌표가 바뀌면, 바뀌기 직전 화면 위치와의 차이만큼
  // 즉시 transform으로 되돌려놓고(트랜지션 없이) 강제 리플로우한 뒤 transform을
  // 0으로 되돌려 그 차이만큼 자연스럽게 미끄러지게 만든다.
  //
  // left/top 트랜지션에 의존하지 않는 이유: 좌표가 %라 값이 바뀌는 순간
  // 레이아웃이 즉시 반영되고, 이벤트 우선순위나 배치 타이밍에 따라 트랜지션이
  // 통째로 씹히는 경우가 있다. transform은 그런 영향을 받지 않는다.
  //
  // 낙하는 엔진이 fromRow를 주므로 그걸 쓰고(새로 생긴 보석은 이전 위치가 아예
  // 없으니 판 위쪽 음수 행에서 출발한다), 스왑·되돌리기는 직전 렌더의 위치와
  // 비교해서 구한다.
  useLayoutEffect(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const cellSize = boardEl.clientWidth / SIZE;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const nextPos = new Map<number, Position>();
    for (let r = 0; r < view.board.height; r++) {
      for (let c = 0; c < view.board.width; c++) {
        const gem = at(view.board, r, c).gem;
        if (gem) nextPos.set(gem.id, { row: r, col: c });
      }
    }
    const fallById = new Map(view.falling.map(m => [m.id, m]));

    nextPos.forEach((pos, id) => {
      const el = cellElsRef.current.get(id);
      if (!el) return;

      const fall = fallById.get(id);
      const prev = fall ? { row: fall.fromRow, col: pos.col } : prevPosRef.current.get(id);
      if (!prev || (prev.row === pos.row && prev.col === pos.col)) return;

      const dx = (prev.col - pos.col) * cellSize;
      const dy = (prev.row - pos.row) * cellSize;
      const dropping = !!fall && dy < 0;
      const duration = dropping ? fallDurationMs(pos.row - prev.row) : SWAP_MS;

      // CSS 애니메이션의 transform은 인라인보다 우선한다. 이전 착지 스쿼시가
      // 남아 있으면 아래 transform이 통째로 무시되어 순간이동해버린다.
      el.classList.remove('landed');
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth; // 강제 리플로우 - 위 transform이 반영된 뒤에 트랜지션을 켠다
      el.style.transition = `transform ${duration}ms ${dropping ? GRAVITY_EASE : SWAP_EASE}`;
      el.style.transform = '';

      if (dropping) timers.push(setTimeout(() => el.classList.add('landed'), duration));
    });

    prevPosRef.current = nextPos;
    return () => timers.forEach(clearTimeout);
  }, [view.tick, view.board, view.falling]);

  const applyMove = (a: Position, b: Position) => {
    if (view.playing) return;
    const result = resolveTurn(view.board, a, b, game.rng);
    if (result.valid) setMoves(m => m + 1);
    play(result.steps, () => {
      // 수가 없으면 다시 섞는다. 규칙이 아니라 진행 편의라 UI에 둔다.
      if (!hasAnyMove(result.board)) reset(reshuffle(result.board, game.rng));
    });
  };

  const onPointerDown = (pos: Position) => (e: React.PointerEvent) => {
    if (view.playing) return;
    const cell = at(view.board, pos.row, pos.col);
    if (!cell.exists || !cell.gem || cell.cover) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pos,
      x: e.clientX,
      y: e.clientY,
      cellSize: (e.currentTarget as HTMLElement).getBoundingClientRect().width,
    };
    setGrabbed(pos);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < drag.cellSize * COMMIT_RATIO) return;

    dragRef.current = null;
    setGrabbed(null);
    const target: Position =
      Math.abs(dx) > Math.abs(dy)
        ? { row: drag.pos.row, col: drag.pos.col + (dx > 0 ? 1 : -1) }
        : { row: drag.pos.row + (dy > 0 ? 1 : -1), col: drag.pos.col };
    if (target.row < 0 || target.col < 0 || target.row >= SIZE || target.col >= SIZE) return;
    if (!isAdjacent(drag.pos, target)) return;
    if (!at(view.board, target.row, target.col).gem) return;
    applyMove(drag.pos, target);
  };

  const endDrag = () => {
    dragRef.current = null;
    setGrabbed(null);
  };

  const hint = () => {
    const options = listMoves(view.board);
    if (options.length > 0) applyMove(options[0].a, options[0].b);
  };

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < view.board.height; r++) {
    for (let c = 0; c < view.board.width; c++) {
      const cell = at(view.board, r, c);
      const k = key(r, c);
      const style: React.CSSProperties = {
        left: `${c * CELL_PCT}%`,
        top: `${r * CELL_PCT}%`,
        width: `${CELL_PCT}%`,
        height: `${CELL_PCT}%`,
      };

      if (!cell.exists) {
        cells.push(<div key={`v-${k}`} className="jk-cell jk-void" style={style} />);
        continue;
      }

      cells.push(<div key={`p-${k}`} className="jk-cell jk-plate" style={style} />);

      if (cell.blocker) {
        cells.push(
          <div
            key={`b-${k}`}
            className={`jk-cell jk-blocker${view.damaged.has(k) ? ' damaged' : ''}`}
            style={style}
          >
            {cell.blocker.layers > 1 ? cell.blocker.layers : ''}
          </div>,
        );
        continue;
      }

      if (!cell.gem) continue;
      const gem = cell.gem;
      const classes = [
        'jk-cell',
        'jk-gem',
        gem.special ? `sp-${gem.special}` : '',
        grabbed?.row === r && grabbed?.col === c ? 'grabbed' : '',
        view.clearing.has(k) ? 'clearing' : '',
        view.spawned.has(k) ? 'spawning' : '',
        view.invalid.has(k) ? 'invalid' : '',
      ]
        .filter(Boolean)
        .join(' ');

      cells.push(
        <div
          key={gem.id}
          ref={el => {
            if (el) cellElsRef.current.set(gem.id, el);
            else cellElsRef.current.delete(gem.id);
          }}
          className={classes}
          style={{ ...style, transition: `transform ${SWAP_MS}ms ${SWAP_EASE}` }}
          onPointerDown={onPointerDown({ row: r, col: c })}
        >
          {gem.color !== null && <img src={GEM_SRC[gem.color]} alt="" draggable={false} />}
          {gem.special === 'rocket-h' && <span className="jk-mark">↔</span>}
          {gem.special === 'rocket-v' && <span className="jk-mark">↕</span>}
          {gem.special === 'lightball' && <span className="jk-mark">✦</span>}
          {gem.special === 'tnt' && <span className="jk-mark">✸</span>}
          {cell.cover && <span className="jk-cover">{cell.cover.layers}</span>}
        </div>,
      );
    }
  }

  return (
    <div className="jk-page">
      <header className="jk-header">
        <h1>보석 왕국</h1>
        <div className="jk-actions">
          <span className="jk-moves">{moves} 수</span>
          <button onClick={hint} disabled={view.playing} title="한 수 두기">
            힌트
          </button>
          <button onClick={newGame} title="새 게임">
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="jk-board-outer">
        <div
          ref={boardRef}
          className="jk-board"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {cells}
        </div>
      </div>

      <p className="jk-note">
        엔진이 만든 단계 목록을 그대로 재생합니다. 이 화면에는 게임 규칙이 없습니다.
      </p>
    </div>
  );
};

export default JewelKingdomGame;
