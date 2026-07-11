import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Timer } from 'lucide-react';
import { levels, type CellCoord, type LevelData } from '../data/levels';
import '../styles/WormEscape.css';

const CELL = 80;
const PADDING = 40;
const STROKE_W = 34;
const BLOCKED_OFFSET = 0.85; // how far a blocked segment is allowed to "press" toward the obstacle
const VISUAL_EASE = 0.05; // how quickly the rendered body catches up to its target each frame
const SNAP_THRESHOLD = 0.5; // just past the cell boundary is enough to commit a step

// Like Math.round, but the flip point is `threshold` (0.5-1) instead of 0.5.
// Strict `>` (not `>=`) matters at threshold=0.5: committing a step exactly at
// the halfway point would leave the new leader exactly -0.5 away too, which
// reads as an instant undo of the step just taken within a single pointermove.
function roundWithThreshold(value: number, threshold: number): number {
  const base = Math.trunc(value);
  const frac = value - base;
  return Math.abs(frac) > threshold ? base + Math.sign(frac) : base;
}

type Direction = [number, number]; // [dcol, drow]
type LeadEnd = 'head' | 'tail';

interface RuntimeWorm {
  id: string;
  color: string;
  cells: CellCoord[]; // tail(0) -> head(last)
  escaped: boolean;
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

// One conveyor-style step: the grabbed end leads into an adjacent cell, the
// rest of the body shifts along with it, and the opposite end drops off -
// unless the leading end is entering its own matching hole, in which case it
// simply vanishes into the burrow (net shrink, one segment at a time).
function tryMove(
  worm: RuntimeWorm,
  end: LeadEnd,
  dir: Direction,
  level: LevelData,
  all: RuntimeWorm[]
): CellCoord[] | null {
  const cells = worm.cells;
  const leader = end === 'head' ? cells[cells.length - 1] : cells[0];
  const target: CellCoord = [leader[0] + dir[0], leader[1] + dir[1]];
  if (!isValidBoardCell(target[0], target[1], level)) return null;

  const hole = level.holes.find(h => h.cell[0] === target[0] && h.cell[1] === target[1]);
  if (hole && hole.id !== worm.id) return null; // wrong-color hole acts like a wall
  if (all.some(o => o.id !== worm.id && !o.escaped && o.cells.some(c => cellKey(c) === cellKey(target)))) {
    return null; // occupied by another worm
  }

  const enteringOwnHole = !!hole && hole.id === worm.id;
  if (enteringOwnHole) {
    const remaining = end === 'head' ? cells.slice(1) : cells.slice(0, -1);
    // A single leftover segment is just a dot - its head and tail render at
    // the same cell, which reads as a rendering glitch rather than "one more
    // segment to pull in". Once only one is left, fold it into the hole too
    // instead of leaving that stray cell sitting on the board.
    return remaining.length <= 1 ? [] : remaining;
  }
  if (cells.some(c => cellKey(c) === cellKey(target))) return null; // no self-overlap
  return end === 'head' ? [...cells.slice(1), target] : [target, ...cells.slice(0, -1)];
}

// True only when the target is the immediately adjacent body segment (the
// "neck") - i.e. the drag reads as "back up along the path you just came
// from", not a genuine collision elsewhere on the body.
function isBlockedByOwnNeck(worm: RuntimeWorm, end: LeadEnd, dir: Direction): boolean {
  const cells = worm.cells;
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

function directionsEqual(a: Direction, b: Direction): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// When the grabbed end can't move because it's blocked by the worm's own
// neck, the drag reads as "push this end backward" - so the OTHER end
// extends instead. It tries the direction the player is actually dragging
// in FIRST (so a straight pull-through continues straight), then falls back
// to the opposite end's own current straight-line direction, and finally a
// perpendicular turn if neither open cell is available. Prioritizing the
// drag direction over the tail's own local heading matters once the body
// already has a bend near that end - otherwise the tail would keep
// following its own bent trajectory and the worm would appear to rotate
// instead of tracking the drag.
function tryExtendOppositeEnd(
  worm: RuntimeWorm,
  blockedEnd: LeadEnd,
  dragDir: Direction,
  level: LevelData,
  all: RuntimeWorm[]
): CellCoord[] | null {
  const cells = worm.cells;
  if (cells.length < 2) return null;
  const oppositeEnd: LeadEnd = blockedEnd === 'head' ? 'tail' : 'head';
  const naturalDir: Direction = oppositeEnd === 'tail'
    ? [cells[0][0] - cells[1][0], cells[0][1] - cells[1][1]]
    : [cells[cells.length - 1][0] - cells[cells.length - 2][0], cells[cells.length - 1][1] - cells[cells.length - 2][1]];
  const candidates = [dragDir, naturalDir, ...perpendiculars(naturalDir)]
    .filter((dir, i, arr) => arr.findIndex(d => directionsEqual(d, dir)) === i);
  for (const dir of candidates) {
    const result = tryMove(worm, oppositeEnd, dir, level, all);
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

// The "logical" (unsmoothed) render points for a worm mid-drag. The bulk of
// the body (everything except whichever single cell is growing/shrinking at
// each end) is rendered at its exact, unmoving cell center, so a bend in the
// middle of the body stays a rigid corner instead of sliding as it moves.
function computeTargetPts(
  worm: RuntimeWorm,
  all: RuntimeWorm[],
  drag: DragState | null,
  dragOffset: { id: string; x: number; y: number } | null,
  level: LevelData
): [number, number][] {
  const staticPts = worm.cells.map(([c, r]) => cellCenter(c, r));
  if (!(drag && drag.id === worm.id && dragOffset && dragOffset.id === worm.id)) return staticPts;

  const preferX = Math.abs(dragOffset.x) >= Math.abs(dragOffset.y);
  const off = preferX ? dragOffset.x : dragOffset.y;
  const frac = Math.max(-1, Math.min(1, off / CELL));
  if (Math.abs(frac) <= 0.001) return staticPts;

  const axis: 'x' | 'y' = preferX ? 'x' : 'y';
  const sign = (frac > 0 ? 1 : -1) as 1 | -1;
  const next = tryStepEnd(worm, drag.end, axis, sign, level, all);
  if (!next || next.length !== worm.cells.length) return staticPts;

  const t = Math.abs(frac);
  const cur = worm.cells;

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
  // opposite-end auto-extend, which can turn a corner) - a plain per-segment
  // lerp is an acceptable stand-in since this case is rare.
  const nextPts = next.map(([c, r]) => cellCenter(c, r));
  return staticPts.map(([x, y], i) => [x + (nextPts[i][0] - x) * t, y + (nextPts[i][1] - y) * t]);
}

function buildRuntimeWorms(level: LevelData): RuntimeWorm[] {
  return level.worms.map(w => ({ ...w, cells: w.cells.map(c => [...c] as CellCoord), escaped: false }));
}

interface DragState {
  id: string;
  end: LeadEnd;
  originX: number; // svg rect.left (CSS px) captured at pointerdown
  originY: number; // svg rect.top (CSS px) captured at pointerdown
  scale: number; // viewBox units per CSS pixel
  // Mismatch (in cell units) between the grab point and the leading end's
  // cell at pointerdown, so mouse movement is measured relative to where the
  // leader actually is, not the exact pixel first touched.
  grabDx: number;
  grabDy: number;
}

// Converts a client-space local position (already PADDING-relative) into
// continuous grid coordinates where an integer value N means "aligned with
// the center of column/row N".
function toGridCoord(local: number): number {
  return (local - PADDING) / CELL - 0.5;
}

// Attempts one single-cell step for the grabbed end, including backing up:
// dragging an end back the way it came always collides with its own neck
// (the cell right behind it), so that case falls straight into the
// blocked-by-own-neck branch below rather than needing any separate
// "undo history" bookkeeping - the opposite end simply extends, trying the
// current drag direction first so a straight pull-through stays straight.
function tryStepEnd(
  worm: RuntimeWorm,
  end: LeadEnd,
  axis: 'x' | 'y',
  sign: 1 | -1,
  level: LevelData,
  all: RuntimeWorm[]
): CellCoord[] | null {
  const dir: Direction = axis === 'x' ? [sign, 0] : [0, sign];
  const newCells = tryMove(worm, end, dir, level, all);
  if (newCells) return newCells;
  if (isBlockedByOwnNeck(worm, end, dir)) {
    return tryExtendOppositeEnd(worm, end, dir, level, all);
  }
  return null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const WormEscapeGame: React.FC = () => {
  const navigate = useNavigate();

  type Screen = 'select' | 'playing';
  const [screen, setScreen] = useState<Screen>('select');
  const [levelIndex, setLevelIndex] = useState(0);
  const levelData = levels[levelIndex];

  const [worms, setWorms] = useState<RuntimeWorm[]>(() => buildRuntimeWorms(levelData));
  const [moveCount, setMoveCount] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ id: string; x: number; y: number } | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  // Mirrors `worms` so pointer-move math (which mutates draggingRef and must
  // run exactly once per event) never has to go through a React state
  // updater function - those get double-invoked under StrictMode, which
  // would double-consume the drag offset.
  const wormsRef = useRef<RuntimeWorm[]>(worms);
  const dragOffsetRef = useRef(dragOffset);
  // Rendered (smoothed) position per worm: eases toward computeTargetPts's
  // logical position every frame instead of snapping straight to it.
  const easedPtsRef = useRef<Map<string, [number, number][]>>(new Map());
  const [, forceTick] = useState(0);

  // Timer: per spec, the countdown only starts once the player's first valid
  // (movement-producing) drag happens, so planning time before that is free.
  const [timeLeft, setTimeLeft] = useState(levelData.timeLimit);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const hasMovedRef = useRef(false);

  const isCleared = worms.length > 0 && worms.every(w => w.escaped);
  const isLost = timedOut && !isCleared;

  const svgW = PADDING * 2 + levelData.gridCols * CELL;
  const svgH = PADDING * 2 + levelData.gridRows * CELL;

  const updateDragOffset = useCallback((v: { id: string; x: number; y: number } | null) => {
    dragOffsetRef.current = v;
    setDragOffset(v);
  }, []);

  const loadLevel = useCallback((idx: number) => {
    setLevelIndex(idx);
    const fresh = buildRuntimeWorms(levels[idx]);
    wormsRef.current = fresh;
    setWorms(fresh);
    setMoveCount(0);
    updateDragOffset(null);
    easedPtsRef.current.clear();
    draggingRef.current = null;
    setTimeLeft(levels[idx].timeLimit);
    setTimerRunning(false);
    setTimedOut(false);
    hasMovedRef.current = false;
  }, [updateDragOffset]);

  const handleReset = useCallback(() => {
    loadLevel(levelIndex);
  }, [levelIndex, loadLevel]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, wormId: string) => {
    if (isCleared || isLost) return;
    const worm = wormsRef.current.find(w => w.id === wormId);
    if (!worm || worm.escaped) return;
    (e.target as Element).setPointerCapture(e.pointerId);

    // grabbed cell -> whichever end (head/tail) is closer along the chain leads
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const viewBoxScale = svgW / rect.width;
    const localX = (e.clientX - rect.left) * viewBoxScale;
    const localY = (e.clientY - rect.top) * viewBoxScale;
    let nearestIdx = 0, nearestDist = Infinity;
    worm.cells.forEach(([c, r], i) => {
      const [cx, cy] = cellCenter(c, r);
      const dist = Math.hypot(cx - localX, cy - localY);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });
    const distToHead = worm.cells.length - 1 - nearestIdx;
    const distToTail = nearestIdx;
    const end: LeadEnd = distToHead <= distToTail ? 'head' : 'tail';

    const leader = end === 'head' ? worm.cells[worm.cells.length - 1] : worm.cells[0];
    const gx0 = toGridCoord(localX);
    const gy0 = toGridCoord(localY);

    draggingRef.current = {
      id: wormId, end, originX: rect.left, originY: rect.top, scale: viewBoxScale,
      grabDx: gx0 - leader[0], grabDy: gy0 - leader[1],
    };
    updateDragOffset({ id: wormId, x: 0, y: 0 });
  }, [svgW, updateDragOffset, isCleared, isLost]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const d = draggingRef.current;
    if (!d) return;

    const localX = (e.clientX - d.originX) * d.scale;
    const localY = (e.clientY - d.originY) * d.scale;
    // Mouse position in grid units, re-based so it started at 0 relative to
    // the leader's cell at grab time (see grabDx/grabDy).
    const mx = toGridCoord(localX) - d.grabDx;
    const my = toGridCoord(localY) - d.grabDy;

    let list = wormsRef.current;
    const idx = list.findIndex(w => w.id === d.id);
    let worm = idx !== -1 ? list[idx] : null;

    if (worm && !worm.escaped) {
      // Every iteration re-reads the leader's CURRENT cell and re-compares it
      // against the mouse's grid position fresh, so a drag that's purely
      // along one axis and then purely along another always re-derives the
      // axis choice from where the worm actually is right now.
      // Hard cap as a safety net against an unforeseen oscillation.
      for (let guard = 0; guard < 50; guard++) {
        const leader = d.end === 'head' ? worm.cells[worm.cells.length - 1] : worm.cells[0];
        const dx = mx - leader[0];
        const dy = my - leader[1];
        const axis: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        const step = roundWithThreshold(axis === 'x' ? dx : dy, SNAP_THRESHOLD);
        if (step === 0) break;
        const sign = (step > 0 ? 1 : -1) as 1 | -1;
        const nextCells = tryStepEnd(worm, d.end, axis, sign, levelData, list);
        if (!nextCells) break;
        if (!hasMovedRef.current) {
          hasMovedRef.current = true;
          setTimerRunning(true);
        }
        setMoveCount(n => n + 1);
        worm = { ...worm, cells: nextCells, escaped: nextCells.length === 0 };
        list = list.map(w => (w.id === worm!.id ? worm! : w));
        if (worm.escaped) break;
      }
      wormsRef.current = list;
      setWorms(list);
    }

    if (!worm || worm.escaped) {
      updateDragOffset(null);
      return;
    }

    // Visual sub-cell offset: how far past the leader's current cell the
    // mouse still is, clamped so a persistently blocked drag just presses
    // toward the obstacle instead of running away indefinitely.
    const leader = d.end === 'head' ? worm.cells[worm.cells.length - 1] : worm.cells[0];
    const clamp = (v: number) => Math.max(-CELL * BLOCKED_OFFSET, Math.min(CELL * BLOCKED_OFFSET, v));
    updateDragOffset({
      id: d.id,
      x: clamp((mx - leader[0]) * CELL),
      y: clamp((my - leader[1]) * CELL),
    });
  }, [levelData, updateDragOffset]);

  const finishDrag = useCallback(() => {
    // Movement is already fully resolved (up to whatever was valid) inside
    // handlePointerMove - release just needs to drop the sub-cell visual
    // offset and clear the drag session.
    draggingRef.current = null;
    updateDragOffset(null);
  }, [updateDragOffset]);

  // Every frame, ease each active worm's rendered position toward its logical
  // target instead of snapping straight to it, giving the body a smooth
  // "catching up" trail rather than moving in rigid lockstep with the pointer.
  useEffect(() => {
    if (screen !== 'playing') return;
    let raf = 0;
    const loop = () => {
      let changed = false;
      for (const worm of wormsRef.current) {
        if (worm.escaped) {
          if (easedPtsRef.current.delete(worm.id)) changed = true;
          continue;
        }
        const target = computeTargetPts(worm, wormsRef.current, draggingRef.current, dragOffsetRef.current, levelData);
        const prev = easedPtsRef.current.get(worm.id);
        if (!prev || prev.length !== target.length) {
          easedPtsRef.current.set(worm.id, target);
          changed = true;
        } else {
          const next = prev.map(([x, y], i): [number, number] => {
            const [tx, ty] = target[i];
            const nx = x + (tx - x) * VISUAL_EASE;
            const ny = y + (ty - y) * VISUAL_EASE;
            if (Math.abs(tx - nx) > 0.05 || Math.abs(ty - ny) > 0.05) changed = true;
            return [nx, ny];
          });
          easedPtsRef.current.set(worm.id, next);
        }
      }
      if (changed) forceTick(t => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, levelData]);

  // Countdown: only ticks once timerRunning flips true (first valid drag),
  // and stops as soon as the board clears or the clock hits zero.
  useEffect(() => {
    if (screen !== 'playing' || !timerRunning || isCleared || timedOut) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timerRunning, timeLeft, isCleared, timedOut]);

  const renderWorm = (worm: RuntimeWorm) => {
    if (worm.escaped) return null;
    const pts = easedPtsRef.current.get(worm.id)
      ?? computeTargetPts(worm, worms, draggingRef.current, dragOffset, levelData);

    const pathD = toRoundedPath(pts, CELL * 0.4);
    const [headX, headY] = pts[pts.length - 1];

    return (
      <g
        key={worm.id}
        className="we-worm"
        style={{ touchAction: 'none' }}
        onPointerDown={e => handlePointerDown(e, worm.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <path d={pathD} stroke={worm.color} strokeWidth={STROKE_W + 8} fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
        <path d={pathD} stroke={worm.color} strokeWidth={STROKE_W} fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* faint segment rings along the body to read as an earthworm rather than a flat tube */}
        {pts.slice(0, -1).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={STROKE_W * 0.06} fill="#00000022" />
        ))}
        <circle cx={headX} cy={headY} r={STROKE_W * 0.6} fill={worm.color} stroke="#fdf6ec" strokeWidth={3} />
        <circle cx={headX - 7} cy={headY - 5} r={3.5} fill="#2b1c12" />
        <circle cx={headX + 7} cy={headY - 5} r={3.5} fill="#2b1c12" />
      </g>
    );
  };

  if (screen === 'select') {
    return (
      <div className="we-page">
        <header className="we-header">
          <button className="we-icon-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <span className="we-title-badge">웜 이스케이프</span>
          <div style={{ width: 42 }} />
        </header>
        <div className="we-select-screen">
          <h1>레벨 선택</h1>
          <div className="we-level-grid">
            {levels.map((lvl, idx) => (
              <button key={lvl.id} className="we-level-card" onClick={() => { loadLevel(idx); setScreen('playing'); }}>
                <span className="we-level-name">{lvl.name}</span>
                <span className="we-level-meta">{lvl.gridCols}×{lvl.gridRows} · {lvl.worms.length}마리 · {formatTime(lvl.timeLimit)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="we-page">
      <header className="we-header">
        <button className="we-icon-btn" onClick={() => setScreen('select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="we-title-badge">{levelData.name}</span>
        <span className={`we-timer-badge${timeLeft <= 10 ? ' we-timer-badge--warn' : ''}`}>
          <Timer size={16} />
          {formatTime(timeLeft)}
        </span>
        <button className="we-icon-btn" title="다시 시작" onClick={handleReset}>
          <RotateCcw size={18} />
        </button>
      </header>

      <div className="we-board-wrap">
        <svg className="we-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
          {Array.from({ length: levelData.gridRows }, (_, r) =>
            Array.from({ length: levelData.gridCols }, (_, c) => {
              if (!isValidBoardCell(c, r, levelData)) return null;
              const [x, y] = cellCenter(c, r);
              return (
                <rect key={`bg${c}${r}`} x={x - CELL / 2 + 2} y={y - CELL / 2 + 2}
                  width={CELL - 4} height={CELL - 4} rx={12} className="we-cell-bg" />
              );
            })
          )}
          {levelData.holes.map(hole => {
            const [x, y] = cellCenter(hole.cell[0], hole.cell[1]);
            const filled = worms.find(w => w.id === hole.id)?.escaped;
            return (
              <g key={hole.id}>
                <circle cx={x} cy={y} r={CELL * 0.42} fill={filled ? hole.color : '#3a2b1e'}
                  stroke={hole.color} strokeWidth={6} />
                <circle cx={x} cy={y} r={CELL * 0.24} fill={filled ? '#ffffff55' : '#00000066'} />
              </g>
            );
          })}
          {worms.map(renderWorm)}
        </svg>

        {isCleared && (
          <div className="we-overlay">
            <div className="we-overlay-card">
              <div className="we-overlay-emoji">🪱</div>
              <h2>탈출 성공!</h2>
              <p>{moveCount}번 드래그 · {formatTime(levelData.timeLimit - timeLeft)} 소요</p>
              <div className="we-overlay-btns">
                <button className="we-btn-primary" onClick={handleReset}>다시 시도</button>
                {levelIndex + 1 < levels.length && (
                  <button className="we-btn-secondary" onClick={() => loadLevel(levelIndex + 1)}>
                    다음 레벨
                  </button>
                )}
              </div>
              <button className="we-btn-text" onClick={() => setScreen('select')}>레벨 선택</button>
            </div>
          </div>
        )}

        {isLost && (
          <div className="we-overlay we-overlay--lost">
            <div className="we-overlay-card">
              <div className="we-overlay-emoji">⏱️</div>
              <h2>시간 초과</h2>
              <p>아직 굴로 돌아가지 못한 지렁이가 있어요</p>
              <div className="we-overlay-btns">
                <button className="we-btn-primary" onClick={handleReset}>다시 시도</button>
              </div>
              <button className="we-btn-text" onClick={() => setScreen('select')}>레벨 선택</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WormEscapeGame;
