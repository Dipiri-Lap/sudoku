import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { levels, type CellCoord, type LevelData } from '../data/levels';
import '../styles/SnakeEscape.css';

const CELL = 80;
const PADDING = 40;
const STROKE_W = 34;
const BLOCKED_OFFSET = 0.85; // how far a blocked piece is allowed to "press" toward the obstacle
const VISUAL_EASE = 0.05; // how quickly the rendered body catches up to its target each frame
const SNAP_THRESHOLD = 0.5; // just past the cell boundary is enough to commit - no extra resistance mid-drag

// Like Math.round, but the flip point is `threshold` (0.5-1) instead of 0.5 -
// lets the flip point be pushed later than halfway if ever wanted again, but
// at 0.5 this is just standard nearest-cell rounding. Strict `>` (not `>=`)
// matters at threshold=0.5: committing a step at exactly the halfway point
// would leave the new leader exactly -0.5 away too, which reads as an
// instant undo of the step just taken - an infinite commit/undo loop within
// a single pointermove. Strict `>` means forward-commit and reverse-undo can
// never both be satisfied by the same displacement.
function roundWithThreshold(value: number, threshold: number): number {
  const base = Math.trunc(value);
  const frac = value - base;
  return Math.abs(frac) > threshold ? base + Math.sign(frac) : base;
}

type Direction = [number, number]; // [dcol, drow]
type LeadEnd = 'head' | 'tail';

interface MoveRecord {
  end: LeadEnd; // which end made this move - undo only applies when dragging that SAME end
  axis: 'x' | 'y';
  sign: 1 | -1;
  prevCells: CellCoord[];
}

interface RuntimePiece {
  id: string;
  color: string;
  cells: CellCoord[];
  solved: boolean;
  // Every step ever committed for this piece (across separate drag
  // gestures, not just the current one). Dragging "backward" pops this to
  // restore the exact prior shape instead of re-deriving a reverse move,
  // which would collide with the piece's own neck.
  history: MoveRecord[];
}

function cellKey(c: CellCoord): string {
  return `${c[0]},${c[1]}`;
}

function isValidBoardCell(col: number, row: number, level: LevelData): boolean {
  if (level.boardCells) {
    return level.boardCells.some(c => c[0] === col && c[1] === row);
  }
  return col >= 0 && col < level.gridCols && row >= 0 && row < level.gridRows;
}

// Classic "snake" conveyor move: the grabbed end leads into an adjacent cell,
// the rest of the body follows (each segment takes the position ahead of
// it), and the opposite end drops off - UNLESS the leading end is entering
// its own matching hole, in which case it simply vanishes (net shrink).
function tryMove(
  piece: RuntimePiece,
  end: LeadEnd,
  dir: Direction,
  level: LevelData,
  all: RuntimePiece[]
): CellCoord[] | null {
  const cells = piece.cells;
  const leader = end === 'head' ? cells[cells.length - 1] : cells[0];
  const target: CellCoord = [leader[0] + dir[0], leader[1] + dir[1]];
  if (!isValidBoardCell(target[0], target[1], level)) return null;

  const hole = level.holes.find(h => h.cell[0] === target[0] && h.cell[1] === target[1]);
  if (hole && hole.id !== piece.id) return null;
  if (all.some(o => o.id !== piece.id && !o.solved && o.cells.some(c => cellKey(c) === cellKey(target)))) {
    return null;
  }

  const enteringOwnHole = !!hole && hole.id === piece.id;
  if (enteringOwnHole) {
    return end === 'head' ? cells.slice(1) : cells.slice(0, -1);
  }
  if (cells.some(c => cellKey(c) === cellKey(target))) return null; // no self-reversal
  return end === 'head' ? [...cells.slice(1), target] : [target, ...cells.slice(0, -1)];
}

// True only when the target is the immediately adjacent body segment (the
// "neck") - i.e. the drag reads as "back up along the path you just came
// from". A block against some OTHER part of the body (e.g. the head running
// into the tail across a loop) is a genuine collision, not a backing-up
// gesture, and should just stay blocked.
function isBlockedByOwnNeck(piece: RuntimePiece, end: LeadEnd, dir: Direction): boolean {
  const cells = piece.cells;
  if (cells.length < 2) return false;
  const neck = end === 'head' ? cells[cells.length - 2] : cells[1];
  const leader = end === 'head' ? cells[cells.length - 1] : cells[0];
  const target: CellCoord = [leader[0] + dir[0], leader[1] + dir[1]];
  return cellKey(target) === cellKey(neck);
}

function perpendiculars(dir: Direction): [Direction, Direction] {
  const [dc, dr] = dir;
  return [[-dr, dc], [dr, -dc]];
}

// When the grabbed end can't move because it's blocked by the piece's own
// neck, the drag reads as "push this end backward" - so instead the OTHER
// end extends: first by continuing its own current straight-line direction,
// falling back to a perpendicular turn if that cell isn't open.
function tryExtendOppositeEnd(
  piece: RuntimePiece,
  blockedEnd: LeadEnd,
  level: LevelData,
  all: RuntimePiece[]
): CellCoord[] | null {
  const cells = piece.cells;
  if (cells.length < 2) return null;
  const oppositeEnd: LeadEnd = blockedEnd === 'head' ? 'tail' : 'head';
  const naturalDir: Direction = oppositeEnd === 'tail'
    ? [cells[0][0] - cells[1][0], cells[0][1] - cells[1][1]]
    : [cells[cells.length - 1][0] - cells[cells.length - 2][0], cells[cells.length - 1][1] - cells[cells.length - 2][1]];
  for (const dir of [naturalDir, ...perpendiculars(naturalDir)]) {
    const result = tryMove(piece, oppositeEnd, dir, level, all);
    if (result) return result;
  }
  return null;
}

function cellCenter(col: number, row: number): [number, number] {
  return [PADDING + col * CELL + CELL / 2, PADDING + row * CELL + CELL / 2];
}

function toRoundedPath(pts: [number, number][], radius: number): string {
  if (pts.length < 2) {
    const [x, y] = pts[0];
    return `M${x} ${y} L${x} ${y}`;
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const next = pts[i + 1];
    if (!next) {
      d += ` L${cx} ${cy}`;
      continue;
    }
    const dx1 = cx - px, dy1 = cy - py;
    const l1 = Math.hypot(dx1, dy1);
    const dx2 = next[0] - cx, dy2 = next[1] - cy;
    const l2 = Math.hypot(dx2, dy2);
    if (l1 === 0 || l2 === 0) {
      d += ` L${cx} ${cy}`;
      continue;
    }
    const r = Math.min(radius, l1 * 0.5, l2 * 0.5);
    const ax = cx - (dx1 / l1) * r, ay = cy - (dy1 / l1) * r;
    const bx = cx + (dx2 / l2) * r, by = cy + (dy2 / l2) * r;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  return d;
}

function lerpCellCenter(a: CellCoord, b: CellCoord, t: number): [number, number] {
  const [ax, ay] = cellCenter(a[0], a[1]);
  const [bx, by] = cellCenter(b[0], b[1]);
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

function cellsEqual(a: CellCoord, b: CellCoord): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// The "logical" (unsmoothed) render points for a piece mid-drag. The bulk of
// the body (everything except whichever single cell is growing/shrinking at
// each end) is rendered at its exact, unmoving cell center - only the head's
// leading edge and the tail's trailing edge animate, so a bend in the middle
// of the body stays a rigid, fixed corner instead of visibly sliding/warping
// as the piece moves.
function computeTargetPts(
  piece: RuntimePiece,
  all: RuntimePiece[],
  drag: DragState | null,
  dragOffset: { id: string; x: number; y: number } | null,
  level: LevelData
): [number, number][] {
  const staticPts = piece.cells.map(([c, r]) => cellCenter(c, r));
  if (!(drag && drag.id === piece.id && dragOffset && dragOffset.id === piece.id)) return staticPts;

  const preferX = Math.abs(dragOffset.x) >= Math.abs(dragOffset.y);
  const off = preferX ? dragOffset.x : dragOffset.y;
  const frac = Math.max(-1, Math.min(1, off / CELL));
  if (Math.abs(frac) <= 0.001) return staticPts;

  const axis: 'x' | 'y' = preferX ? 'x' : 'y';
  const sign = (frac > 0 ? 1 : -1) as 1 | -1;
  const result = tryUndoOrMove(piece, drag.end, axis, sign, level, all);
  if (!result || result.cells.length !== piece.cells.length) return staticPts;

  const t = Math.abs(frac);
  const cur = piece.cells;
  const next = result.cells;

  const headGrew = cur.length >= 2 && cur.slice(1).every((c, i) => cellsEqual(c, next[i]));
  if (headGrew) {
    const shrinkingTail = lerpCellCenter(cur[0], cur[1], t);
    const staticMid = cur.slice(1).map(([c, r]) => cellCenter(c, r));
    const growingHead = lerpCellCenter(cur[cur.length - 1], next[next.length - 1], t);
    return [shrinkingTail, ...staticMid, growingHead];
  }

  const tailGrew = cur.length >= 2 && cur.slice(0, -1).every((c, i) => cellsEqual(c, next[i + 1]));
  if (tailGrew) {
    const growingTail = lerpCellCenter(cur[0], next[0], t);
    const staticMid = cur.slice(0, -1).map(([c, r]) => cellCenter(c, r));
    const shrinkingHead = lerpCellCenter(cur[cur.length - 1], cur[cur.length - 2], t);
    return [growingTail, ...staticMid, shrinkingHead];
  }

  // Fallback for moves that don't fit the simple grow/shrink pattern (the
  // opposite-end auto-extend, which can turn a corner) - less perfect, but
  // rare enough that a plain per-segment lerp is an acceptable stand-in.
  const nextPts = next.map(([c, r]) => cellCenter(c, r));
  return staticPts.map(([x, y], i) => [x + (nextPts[i][0] - x) * t, y + (nextPts[i][1] - y) * t]);
}

function buildRuntimePieces(level: LevelData): RuntimePiece[] {
  return level.pieces.map(p => ({ ...p, cells: p.cells.map(c => [...c] as CellCoord), solved: false, history: [] }));
}

interface DragState {
  id: string;
  end: LeadEnd;
  originX: number; // svg rect.left (CSS px) captured at pointerdown
  originY: number; // svg rect.top (CSS px) captured at pointerdown
  scale: number; // viewBox units per CSS pixel
  // Mismatch (in cell units) between the grab point and the leading end's
  // cell at pointerdown - e.g. grabbing a body segment 2 cells behind the
  // head starts this at -2, so mouse movement is measured relative to where
  // the leader actually is, not relative to the exact pixel first touched.
  grabDx: number;
  grabDy: number;
}

// Converts a client-space local position (in viewBox units, already
// PADDING-relative) into continuous grid coordinates where an integer value
// N means "aligned with the center of column/row N".
function toGridCoord(local: number): number {
  return (local - PADDING) / CELL - 0.5;
}

// Attempts one single-cell step for the grabbed end in (axis, sign). If this
// exactly reverses the piece's most recent committed step, it's treated as
// backing up (restoring the exact previous shape) rather than a fresh move -
// a fresh "reverse" move would fail anyway, since the target cell is still
// occupied by the piece's own neck for one more step.
function tryUndoOrMove(
  piece: RuntimePiece,
  end: LeadEnd,
  axis: 'x' | 'y',
  sign: 1 | -1,
  level: LevelData,
  all: RuntimePiece[]
): { cells: CellCoord[]; history: MoveRecord[] } | null {
  const top = piece.history[piece.history.length - 1];
  if (top && top.end === end && top.axis === axis && top.sign === -sign) {
    return { cells: top.prevCells, history: piece.history.slice(0, -1) };
  }
  const dir: Direction = axis === 'x' ? [sign, 0] : [0, sign];
  const newCells = tryMove(piece, end, dir, level, all);
  if (newCells) {
    return { cells: newCells, history: [...piece.history, { end, axis, sign, prevCells: piece.cells }] };
  }
  if (isBlockedByOwnNeck(piece, end, dir)) {
    const altCells = tryExtendOppositeEnd(piece, end, level, all);
    if (altCells) {
      return { cells: altCells, history: [...piece.history, { end, axis, sign, prevCells: piece.cells }] };
    }
  }
  return null;
}

const SnakeEscapeGame: React.FC = () => {
  const navigate = useNavigate();

  type Screen = 'select' | 'playing';
  const [screen, setScreen] = useState<Screen>('select');
  const [levelIndex, setLevelIndex] = useState(0);
  const levelData = levels[levelIndex];

  const [pieces, setPieces] = useState<RuntimePiece[]>(() => buildRuntimePieces(levelData));
  const [moveCount, setMoveCount] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ id: string; x: number; y: number } | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  // Mirrors `pieces` so pointer-move math (which mutates draggingRef and must
  // run exactly once per event) never has to go through a React state
  // updater function - those get double-invoked under StrictMode, which
  // would double-consume the drag offset.
  const piecesRef = useRef<RuntimePiece[]>(pieces);
  const dragOffsetRef = useRef(dragOffset);
  // Rendered (smoothed) position per piece: eases toward computeTargetPts's
  // logical position every animation frame instead of snapping straight to
  // it, so the body visibly "catches up" rather than teleporting in lockstep
  // with the raw pointer input.
  const easedPtsRef = useRef<Map<string, [number, number][]>>(new Map());
  const [, forceTick] = useState(0);

  const isCleared = pieces.length > 0 && pieces.every(p => p.solved);

  const svgW = PADDING * 2 + levelData.gridCols * CELL;
  const svgH = PADDING * 2 + levelData.gridRows * CELL;

  const updateDragOffset = useCallback((v: { id: string; x: number; y: number } | null) => {
    dragOffsetRef.current = v;
    setDragOffset(v);
  }, []);

  const loadLevel = useCallback((idx: number) => {
    setLevelIndex(idx);
    const fresh = buildRuntimePieces(levels[idx]);
    piecesRef.current = fresh;
    setPieces(fresh);
    setMoveCount(0);
    updateDragOffset(null);
    easedPtsRef.current.clear();
    draggingRef.current = null;
  }, [updateDragOffset]);

  const handleReset = useCallback(() => {
    loadLevel(levelIndex);
  }, [levelIndex, loadLevel]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, pieceId: string) => {
    const piece = piecesRef.current.find(p => p.id === pieceId);
    if (!piece || piece.solved) return;
    (e.target as Element).setPointerCapture(e.pointerId);

    // grabbed cell -> whichever end (head/tail) is closer along the chain leads
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const viewBoxScale = svgW / rect.width;
    const localX = (e.clientX - rect.left) * viewBoxScale;
    const localY = (e.clientY - rect.top) * viewBoxScale;
    let nearestIdx = 0, nearestDist = Infinity;
    piece.cells.forEach(([c, r], i) => {
      const [cx, cy] = cellCenter(c, r);
      const dist = Math.hypot(cx - localX, cy - localY);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });
    const distToHead = piece.cells.length - 1 - nearestIdx;
    const distToTail = nearestIdx;
    const end: LeadEnd = distToHead <= distToTail ? 'head' : 'tail';

    const leader = end === 'head' ? piece.cells[piece.cells.length - 1] : piece.cells[0];
    const gx0 = toGridCoord(localX);
    const gy0 = toGridCoord(localY);

    draggingRef.current = {
      id: pieceId, end, originX: rect.left, originY: rect.top, scale: viewBoxScale,
      grabDx: gx0 - leader[0], grabDy: gy0 - leader[1],
    };
    updateDragOffset({ id: pieceId, x: 0, y: 0 });
    setMoveCount(n => n + 1);
  }, [svgW, updateDragOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const d = draggingRef.current;
    if (!d) return;

    const localX = (e.clientX - d.originX) * d.scale;
    const localY = (e.clientY - d.originY) * d.scale;
    // Mouse position in grid units, re-based so it started at 0 relative to
    // the leader's cell at grab time (see grabDx/grabDy).
    const mx = toGridCoord(localX) - d.grabDx;
    const my = toGridCoord(localY) - d.grabDy;

    let list = piecesRef.current;
    const idx = list.findIndex(p => p.id === d.id);
    let piece = idx !== -1 ? list[idx] : null;

    if (piece && !piece.solved) {
      // Every iteration re-reads the leader's CURRENT cell and re-compares it
      // against the mouse's grid position fresh - there's no accumulated
      // "steps consumed since drag start" state to go stale, so a drag that's
      // purely along one axis and then purely along another always re-derives
      // the axis choice from where the piece actually is right now.
      // Hard cap as a safety net: a single pointermove should never need more
      // steps than the board has cells, so this only guards against an
      // unforeseen commit/undo oscillation hard-freezing the tab.
      for (let guard = 0; guard < 50; guard++) {
        const leader = d.end === 'head' ? piece.cells[piece.cells.length - 1] : piece.cells[0];
        const dx = mx - leader[0];
        const dy = my - leader[1];
        const axis: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        const step = roundWithThreshold(axis === 'x' ? dx : dy, SNAP_THRESHOLD);
        if (step === 0) break;
        const sign = (step > 0 ? 1 : -1) as 1 | -1;
        const result = tryUndoOrMove(piece, d.end, axis, sign, levelData, list);
        if (!result) break;
        piece = { ...piece, cells: result.cells, history: result.history, solved: result.cells.length === 0 };
        list = list.map(p => (p.id === piece!.id ? piece! : p));
        if (piece.solved) break;
      }
      piecesRef.current = list;
      setPieces(list);
    }

    if (!piece || piece.solved) {
      updateDragOffset(null);
      return;
    }

    // Visual sub-cell offset: how far past the leader's current cell the
    // mouse still is, clamped so a persistently blocked drag just presses
    // toward the obstacle instead of running away indefinitely.
    const leader = d.end === 'head' ? piece.cells[piece.cells.length - 1] : piece.cells[0];
    const clamp = (v: number) => Math.max(-CELL * BLOCKED_OFFSET, Math.min(CELL * BLOCKED_OFFSET, v));
    updateDragOffset({
      id: d.id,
      x: clamp((mx - leader[0]) * CELL),
      y: clamp((my - leader[1]) * CELL),
    });
  }, [levelData, updateDragOffset]);

  const finishDrag = useCallback(() => {
    // Movement is already fully resolved (up to whatever was valid) inside
    // handlePointerMove - with SNAP_THRESHOLD at the cell boundary (0.5),
    // the logical index always matches whichever cell the cursor is
    // currently over, so release just needs to drop the sub-cell visual
    // offset and clear the drag session.
    draggingRef.current = null;
    updateDragOffset(null);
  }, [updateDragOffset]);

  // Every frame, ease each active piece's rendered position toward its
  // logical target instead of snapping straight to it - this is what gives
  // the body a smooth "catching up" trail rather than moving in rigid
  // lockstep with the raw pointer input.
  useEffect(() => {
    if (screen !== 'playing') return;
    let raf = 0;
    const loop = () => {
      let changed = false;
      for (const piece of piecesRef.current) {
        if (piece.solved) {
          if (easedPtsRef.current.delete(piece.id)) changed = true;
          continue;
        }
        const target = computeTargetPts(piece, piecesRef.current, draggingRef.current, dragOffsetRef.current, levelData);
        const prev = easedPtsRef.current.get(piece.id);
        if (!prev || prev.length !== target.length) {
          easedPtsRef.current.set(piece.id, target);
          changed = true;
        } else {
          const next = prev.map(([x, y], i): [number, number] => {
            const [tx, ty] = target[i];
            const nx = x + (tx - x) * VISUAL_EASE;
            const ny = y + (ty - y) * VISUAL_EASE;
            if (Math.abs(tx - nx) > 0.05 || Math.abs(ty - ny) > 0.05) changed = true;
            return [nx, ny];
          });
          easedPtsRef.current.set(piece.id, next);
        }
      }
      if (changed) forceTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, levelData]);

  const renderPiece = (piece: RuntimePiece) => {
    if (piece.solved) return null;
    const pts = easedPtsRef.current.get(piece.id)
      ?? computeTargetPts(piece, pieces, draggingRef.current, dragOffset, levelData);

    const pathD = toRoundedPath(pts, CELL * 0.4);
    const [headX, headY] = pts[pts.length - 1];

    return (
      <g
        key={piece.id}
        className="se-piece"
        style={{ touchAction: 'none' }}
        onPointerDown={e => handlePointerDown(e, piece.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W + 8} fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W} fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={headX} cy={headY} r={STROKE_W * 0.62} fill={piece.color} stroke="#ffffff" strokeWidth={3} />
        <circle cx={headX - 8} cy={headY - 6} r={4} fill="#1b1b1b" />
        <circle cx={headX + 8} cy={headY - 6} r={4} fill="#1b1b1b" />
      </g>
    );
  };

  if (screen === 'select') {
    return (
      <div className="se-page">
        <header className="se-header">
          <button className="se-icon-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <span className="se-title-badge">스네이크 이스케이프</span>
          <div style={{ width: 42 }} />
        </header>
        <div className="se-select-screen">
          <h1>레벨 선택</h1>
          <div className="se-level-grid">
            {levels.map((lvl, idx) => (
              <button key={lvl.id} className="se-level-card" onClick={() => { loadLevel(idx); setScreen('playing'); }}>
                <span className="se-level-name">{lvl.name}</span>
                <span className="se-level-meta">{lvl.gridCols}×{lvl.gridRows} · {lvl.pieces.length}마리</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="se-page">
      <header className="se-header">
        <button className="se-icon-btn" onClick={() => setScreen('select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="se-title-badge">{levelData.name}</span>
        <button className="se-icon-btn" title="다시 시작" onClick={handleReset}>
          <RotateCcw size={18} />
        </button>
      </header>

      <div className="se-board-wrap">
        <svg className="se-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
          {Array.from({ length: levelData.gridRows }, (_, r) =>
            Array.from({ length: levelData.gridCols }, (_, c) => {
              if (!isValidBoardCell(c, r, levelData)) return null;
              const [x, y] = cellCenter(c, r);
              return (
                <rect key={`bg${c}${r}`} x={x - CELL / 2 + 2} y={y - CELL / 2 + 2}
                  width={CELL - 4} height={CELL - 4} rx={12} className="se-cell-bg" />
              );
            })
          )}
          {levelData.holes.map(hole => {
            const [x, y] = cellCenter(hole.cell[0], hole.cell[1]);
            const filled = pieces.find(p => p.id === hole.id)?.solved;
            return (
              <g key={hole.id}>
                <circle cx={x} cy={y} r={CELL * 0.4} fill={filled ? hole.color : '#0000001a'}
                  stroke={hole.color} strokeWidth={6} />
                <circle cx={x} cy={y} r={CELL * 0.22} fill={filled ? '#ffffff55' : '#00000055'} />
              </g>
            );
          })}
          {pieces.map(renderPiece)}
        </svg>

        {isCleared && (
          <div className="se-clear-overlay">
            <div className="se-clear-card">
              <div className="se-clear-emoji">🎉</div>
              <h2>클리어!</h2>
              <p>{moveCount}번 드래그로 클리어</p>
              <div className="se-clear-btns">
                <button className="se-btn-primary" onClick={handleReset}>다시 시도</button>
                {levelIndex + 1 < levels.length && (
                  <button className="se-btn-secondary" onClick={() => loadLevel(levelIndex + 1)}>
                    다음 레벨
                  </button>
                )}
              </div>
              <button className="se-btn-text" onClick={() => setScreen('select')}>레벨 선택</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnakeEscapeGame;
