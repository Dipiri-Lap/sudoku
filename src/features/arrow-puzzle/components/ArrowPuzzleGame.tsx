import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, RefreshCw } from 'lucide-react';
import { levels, type PieceData, type LevelData, type Direction } from '../data/levels';
import { type Difficulty, DIFFICULTY_CONFIGS, generateLevelForDifficulty } from '../utils/levelGenerator';
import '../styles/ArrowPuzzle.css';

const CELL_SIZE = 64;
const PADDING = 32;
const STROKE_W = 4;
const ESCAPE_SPEED = 9;
const NECK = CELL_SIZE * 0.32;
const CORNER_R = CELL_SIZE * 0.42;

interface EscapingPiece extends PieceData {
  frac: number;
}

const DIFFICULTIES: Difficulty[] = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'];

function piecesLabel(min: number, max: number) {
  return min === max ? `${min} 피스` : `${min}–${max} 피스`;
}

function cellCenter(col: number, row: number): [number, number] {
  return [PADDING + col * CELL_SIZE + CELL_SIZE / 2, PADDING + row * CELL_SIZE + CELL_SIZE / 2];
}

function advance(cell: [number, number], dir: Direction): [number, number] {
  const [c, r] = cell;
  switch (dir) {
    case 'right': return [c + 1, r];
    case 'left':  return [c - 1, r];
    case 'up':    return [c, r - 1];
    case 'down':  return [c, r + 1];
  }
}

function dirOffset(dir: Direction, amount: number): [number, number] {
  switch (dir) {
    case 'right': return [amount, 0];
    case 'left':  return [-amount, 0];
    case 'up':    return [0, -amount];
    case 'down':  return [0, amount];
  }
}

function toPathFromPts(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const next = pts[i + 1];
    if (!next) { d += ` L${cx} ${cy}`; continue; }
    const dx1 = cx - px, dy1 = cy - py;
    const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dx2 = next[0] - cx, dy2 = next[1] - cy;
    const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (l1 === 0 || l2 === 0) { d += ` L${cx} ${cy}`; continue; }
    const r = Math.min(CORNER_R, l1 * 0.5, l2 * 0.5);
    const ax = cx - (dx1 / l1) * r, ay = cy - (dy1 / l1) * r;
    const bx = cx + (dx2 / l2) * r, by = cy + (dy2 / l2) * r;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  return d;
}

function toPath(cells: [number, number][], dir: Direction): string {
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, NECK);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(pts);
}

function toPathAnimated(cells: [number, number][], dir: Direction, frac: number): string {
  if (cells.length === 0) return '';
  const pts: [number, number][] = [];
  if (cells.length >= 2) {
    const [tx0, ty0] = cellCenter(cells[0][0], cells[0][1]);
    const [tx1, ty1] = cellCenter(cells[1][0], cells[1][1]);
    pts.push([tx0 + (tx1 - tx0) * frac, ty0 + (ty1 - ty0) * frac]);
    for (let i = 1; i < cells.length; i++) pts.push(cellCenter(cells[i][0], cells[i][1]));
  } else {
    pts.push(cellCenter(cells[0][0], cells[0][1]));
  }
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + NECK);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(pts);
}

function neckTipStatic(head: [number, number], dir: Direction): [number, number] {
  const [x, y] = cellCenter(head[0], head[1]);
  const [dx, dy] = dirOffset(dir, NECK);
  return [x + dx, y + dy];
}

function neckTipAnimated(cells: [number, number][], dir: Direction, frac: number): [number, number] {
  const [hx, hy] = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + NECK);
  return [hx + dx, hy + dy];
}

function arrowPointsFromTip(tip: [number, number], dir: Direction): string {
  const [nx, ny] = tip;
  const fwd = CELL_SIZE * 0.28;
  const spread = CELL_SIZE * 0.18;
  switch (dir) {
    case 'right': return `${nx},${ny - spread} ${nx + fwd},${ny} ${nx},${ny + spread}`;
    case 'left':  return `${nx},${ny - spread} ${nx - fwd},${ny} ${nx},${ny + spread}`;
    case 'up':    return `${nx - spread},${ny} ${nx},${ny - fwd} ${nx + spread},${ny}`;
    case 'down':  return `${nx - spread},${ny} ${nx},${ny + fwd} ${nx + spread},${ny}`;
  }
}

function isSelfBlocked(piece: PieceData): boolean {
  const n = piece.cells.length;
  const [hc, hr] = piece.cells[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const [bc, br] = piece.cells[i];
    let dist = 0;
    switch (piece.exitDir) {
      case 'right': if (br === hr && bc > hc) dist = bc - hc; break;
      case 'left':  if (br === hr && bc < hc) dist = hc - bc; break;
      case 'up':    if (bc === hc && br < hr) dist = hr - br; break;
      case 'down':  if (bc === hc && br > hr) dist = br - hr; break;
    }
    if (dist > 0 && i >= dist) return true;
  }
  return false;
}

function canEscape(piece: PieceData, others: PieceData[], cols: number, rows: number): boolean {
  if (isSelfBlocked(piece)) return false;
  const occupied = new Set(others.flatMap(p => p.cells).map(([c, r]) => `${c},${r}`));
  const [hc, hr] = piece.cells[piece.cells.length - 1];
  switch (piece.exitDir) {
    case 'right': for (let c = hc + 1; c < cols; c++) { if (occupied.has(`${c},${hr}`)) return false; } return true;
    case 'left':  for (let c = hc - 1; c >= 0; c--)  { if (occupied.has(`${c},${hr}`)) return false; } return true;
    case 'up':    for (let r = hr - 1; r >= 0; r--)   { if (occupied.has(`${hc},${r}`)) return false; } return true;
    case 'down':  for (let r = hr + 1; r < rows; r++) { if (occupied.has(`${hc},${r}`)) return false; } return true;
  }
}

function onBoard(c: number, r: number, cols: number, rows: number) {
  return c >= 0 && c < cols && r >= 0 && r < rows;
}

const ArrowPuzzleGame: React.FC = () => {
  const navigate = useNavigate();

  const [testLevel] = useState<LevelData | null>(() => {
    const stored = sessionStorage.getItem('arrowTestLevel');
    if (stored) {
      sessionStorage.removeItem('arrowTestLevel');
      return JSON.parse(stored) as LevelData;
    }
    return null;
  });

  type Screen = 'select' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>(testLevel ? 'playing' : 'select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [levelData, setLevelData] = useState<LevelData>(testLevel ?? levels[0]);

  const { gridCols, gridRows } = levelData;

  const [activePieces, setActivePieces] = useState<PieceData[]>(() =>
    levelData.pieces.map(p => ({ ...p, cells: [...p.cells] }))
  );
  const [escapingPieces, setEscapingPieces] = useState<EscapingPiece[]>([]);
  const [wiggle, setWiggle] = useState<{ id: string; dir: Direction } | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const started = useRef(false);
  const escapingRef = useRef<EscapingPiece[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafCallbackRef = useRef<((time: number) => void) | undefined>(undefined);

  const svgW = PADDING * 2 + gridCols * CELL_SIZE;
  const svgH = PADDING * 2 + gridRows * CELL_SIZE;

  rafCallbackRef.current = (time: number) => {
    const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;
    const updated: EscapingPiece[] = [];
    for (const ep of escapingRef.current) {
      let { cells, frac } = ep;
      frac += ESCAPE_SPEED * delta;
      while (frac >= 1) {
        const newHead = advance(cells[cells.length - 1], ep.exitDir);
        cells = [...cells.slice(1), newHead];
        frac -= 1;
      }
      if (cells.some(([c, r]) => onBoard(c, r, gridCols, gridRows))) {
        updated.push({ ...ep, cells, frac });
      }
    }
    escapingRef.current = updated;
    setEscapingPieces([...updated]);
    if (updated.length > 0) {
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    } else {
      rafRef.current = null;
    }
  };

  useEffect(() => {
    if (!started.current) return;
    if (activePieces.length === 0 && escapingPieces.length === 0) {
      const t = setTimeout(() => setIsCleared(true), 200);
      return () => clearTimeout(t);
    }
  }, [activePieces.length, escapingPieces.length]);

  useEffect(() => {
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  const loadLevel = useCallback((newLevel: LevelData) => {
    started.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    escapingRef.current = [];
    setLevelData(newLevel);
    setActivePieces(newLevel.pieces.map(p => ({ ...p, cells: [...p.cells] })));
    setEscapingPieces([]);
    setWiggle(null);
    setIsCleared(false);
    setMoveCount(0);
  }, []);

  const handleSelectDifficulty = useCallback(async (d: Difficulty) => {
    setDifficulty(d);
    setScreen('generating');
    await new Promise(r => setTimeout(r, 30));
    const result = generateLevelForDifficulty(d);
    if (result) {
      loadLevel(result);
      setScreen('playing');
    } else {
      setScreen('select');
    }
  }, [loadLevel]);

  const handleNewPuzzle = useCallback(async () => {
    if (!difficulty) return;
    setScreen('generating');
    await new Promise(r => setTimeout(r, 30));
    const result = generateLevelForDifficulty(difficulty);
    if (result) {
      loadLevel(result);
      setScreen('playing');
    }
  }, [difficulty, loadLevel]);

  const handleReset = useCallback(() => {
    loadLevel(levelData);
  }, [levelData, loadLevel]);

  const startEscape = useCallback((piece: PieceData) => {
    started.current = true;
    setMoveCount(n => n + 1);
    const ep: EscapingPiece = { ...piece, cells: [...piece.cells], frac: 0 };
    escapingRef.current = [...escapingRef.current, ep];
    setEscapingPieces([...escapingRef.current]);
    if (rafRef.current === null) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    }
  }, []);

  const handlePieceClick = useCallback((piece: PieceData) => {
    const others = activePieces.filter(p => p.id !== piece.id);
    if (canEscape(piece, others, gridCols, gridRows)) {
      setActivePieces(others);
      startEscape(piece);
    } else {
      setWiggle({ id: piece.id, dir: piece.exitDir });
      setTimeout(() => setWiggle(null), 420);
    }
  }, [activePieces, gridCols, gridRows, startEscape]);

  const renderPiece = (piece: PieceData | EscapingPiece, clickable: boolean) => {
    const isEscaping = 'frac' in piece;
    const frac = isEscaping ? (piece as EscapingPiece).frac : 0;
    const head = piece.cells[piece.cells.length - 1];
    const wiggling = !isEscaping && wiggle?.id === piece.id;
    const wiggleClass = wiggling ? `wiggle-${wiggle!.dir}` : '';
    const pathD = isEscaping
      ? toPathAnimated(piece.cells, piece.exitDir, frac)
      : toPath(piece.cells, piece.exitDir);
    const arrowTip = isEscaping
      ? neckTipAnimated(piece.cells, piece.exitDir, frac)
      : neckTipStatic(head, piece.exitDir);
    const showArrow = isEscaping || onBoard(head[0], head[1], gridCols, gridRows);
    return (
      <g key={piece.id} className={`ap-piece ${wiggleClass}`}
        onClick={clickable ? () => handlePieceClick(piece as PieceData) : undefined}
        style={{ cursor: clickable ? 'pointer' : 'default' }}>
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W + 4} fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W} fill="none"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
        {showArrow && (
          <polygon points={arrowPointsFromTip(arrowTip, piece.exitDir)}
            fill={piece.color} filter="url(#glow)" />
        )}
      </g>
    );
  };

  // ── Difficulty selection screen ──────────────────────────────────────────────

  if (screen === 'select') {
    return (
      <div className="ap-page">
        <header className="ap-header">
          <button className="ap-icon-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <span className="ap-level-badge">화살 퍼즐</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-select-screen">
          <div className="ap-select-title">
            <h1>난이도 선택</h1>
            <p>퍼즐이 매번 다르게 자동 생성됩니다</p>
          </div>
          <div className="ap-diff-grid">
            {DIFFICULTIES.map(d => {
              const cfg = DIFFICULTY_CONFIGS[d];
              return (
                <button
                  key={d}
                  className="ap-diff-card"
                  onClick={() => handleSelectDifficulty(d)}
                  style={{ '--diff-color': cfg.color } as React.CSSProperties}
                >
                  <span className="ap-diff-name">{cfg.label}</span>
                  <span className="ap-diff-grid-size">{cfg.cols}×{cfg.rows} · {piecesLabel(cfg.minPieces, cfg.maxPieces)}</span>
                  <span className="ap-diff-desc">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Generating screen ────────────────────────────────────────────────────────

  if (screen === 'generating') {
    const cfg = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;
    return (
      <div className="ap-page">
        <div className="ap-generating">
          <div className="ap-spinner" style={cfg ? { borderTopColor: cfg.color } as React.CSSProperties : undefined} />
          <p>{cfg ? `${cfg.label} 퍼즐 생성 중…` : '퍼즐 생성 중…'}</p>
        </div>
      </div>
    );
  }

  // ── Playing screen ───────────────────────────────────────────────────────────

  const diffMeta = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;

  return (
    <div className="ap-page">
      <header className="ap-header">
        <button className="ap-icon-btn" onClick={() => setScreen('select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="ap-level-badge" style={diffMeta ? { color: diffMeta.color } as React.CSSProperties : undefined}>
          {diffMeta ? diffMeta.label : 'Level 1'}
        </span>
        <div className="ap-header-btns">
          {difficulty && (
            <button className="ap-icon-btn" title="새 퍼즐 생성" onClick={handleNewPuzzle}>
              <RefreshCw size={16} />
            </button>
          )}
          <button className="ap-icon-btn" title="다시 시작" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="ap-board-wrap">
        <svg className="ap-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
          <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {Array.from({ length: gridRows }, (_, r) =>
            Array.from({ length: gridCols }, (_, c) => {
              const [x, y] = cellCenter(c, r);
              return <circle key={`d${c}${r}`} cx={x} cy={y} r={2.5} fill="rgba(255,255,255,0.12)" />;
            })
          )}
          {activePieces.map(p => renderPiece(p, true))}
          {escapingPieces.map(p => renderPiece(p, false))}
        </svg>

        {isCleared && (
          <div className="ap-clear-overlay">
            <div className="ap-clear-card">
              <div className="ap-clear-emoji">🎉</div>
              <h2>클리어!</h2>
              <p>{moveCount}번 만에 클리어</p>
              <div className="ap-clear-btns">
                <button className="ap-btn-primary" onClick={handleReset}>
                  다시 시도
                </button>
                {difficulty && (
                  <button className="ap-btn-secondary" onClick={handleNewPuzzle}>
                    새 퍼즐
                  </button>
                )}
              </div>
              {difficulty && (
                <button className="ap-btn-text" onClick={() => setScreen('select')}>
                  난이도 변경
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrowPuzzleGame;
