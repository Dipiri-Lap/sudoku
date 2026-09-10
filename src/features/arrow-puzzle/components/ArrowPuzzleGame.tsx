import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, RefreshCw } from 'lucide-react';
import { levels, stages, type PieceData, type LevelData, type Direction } from '../data/levels';
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

/** 기관차 앞머리. 화살촉 대신 뭉툭한 사다리꼴이라 방향은 그대로 읽힌다. */
function locoNose(tip: [number, number], dir: Direction): string {
  const [tx, ty] = tip;
  const fwd = CELL_SIZE * 0.26;
  const wide = CELL_SIZE * 0.19;
  const narrow = CELL_SIZE * 0.12;
  const pts: [number, number][] = dir === 'right' || dir === 'left'
    ? (() => { const sx = dir === 'right' ? 1 : -1; return [
        [tx, ty - wide], [tx + sx * fwd, ty - narrow],
        [tx + sx * fwd, ty + narrow], [tx, ty + wide],
      ] as [number, number][]; })()
    : (() => { const sy = dir === 'down' ? 1 : -1; return [
        [tx - wide, ty], [tx - narrow, ty + sy * fwd],
        [tx + narrow, ty + sy * fwd], [tx + wide, ty],
      ] as [number, number][]; })();
  return pts.map(pt => pt.join(',')).join(' ');
}

/** 전조등 — 앞머리 끝에 찍어 진행 방향을 한 번 더 알려준다. */
function headlight(tip: [number, number], dir: Direction): [number, number] {
  const [dx, dy] = dirOffset(dir, CELL_SIZE * 0.17);
  return [tip[0] + dx, tip[1] + dy];
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

/**
 * 왜 못 나가는지 찾아낸다.
 * 머리 앞 직선을 훑어 처음 만나는 칸을 돌려준다 — 자기 몸통일 수도 있다.
 * 막는 게 없으면 null (탈출 가능).
 */
function findBlocker(
  piece: PieceData,
  others: PieceData[],
  cols: number,
  rows: number
): { cell: [number, number]; blockerId: string } | null {
  const [hc, hr] = piece.cells[piece.cells.length - 1];
  const [dc, dr] = advance([0, 0], piece.exitDir);

  const owner = new Map<string, string>();
  for (const o of others) for (const [c, r] of o.cells) owner.set(`${c},${r}`, o.id);

  // 자기 몸통이 제때 비켜주지 못하는 경우
  if (isSelfBlocked(piece)) {
    const n = piece.cells.length;
    for (let i = 0; i < n - 1; i++) {
      const [bc, br] = piece.cells[i];
      let dist = 0;
      switch (piece.exitDir) {
        case 'right': if (br === hr && bc > hc) dist = bc - hc; break;
        case 'left':  if (br === hr && bc < hc) dist = hc - bc; break;
        case 'up':    if (bc === hc && br < hr) dist = hr - br; break;
        case 'down':  if (bc === hc && br > hr) dist = br - hr; break;
      }
      if (dist > 0 && i >= dist) return { cell: [bc, br], blockerId: piece.id };
    }
  }

  for (let c = hc + dc, r = hr + dr; onBoard(c, r, cols, rows); c += dc, r += dr) {
    const id = owner.get(`${c},${r}`);
    if (id) return { cell: [c, r], blockerId: id };
  }
  return null;
}

function onBoard(c: number, r: number, cols: number, rows: number) {
  return c >= 0 && c < cols && r >= 0 && r < rows;
}

const PROGRESS_KEY = 'arrowPuzzleProgress';

/** 클리어한 최고 스테이지 번호. 다음 한 판까지 열어준다. */
function loadProgress(): number {
  try {
    return Number(localStorage.getItem(PROGRESS_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveProgress(level: number) {
  try {
    if (level > loadProgress()) localStorage.setItem(PROGRESS_KEY, String(level));
  } catch { /* 저장 실패는 무시 — 진행도는 편의 기능이다 */ }
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

  type Screen = 'select' | 'stages' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>(testLevel ? 'playing' : 'select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [stageNo, setStageNo] = useState<number | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [levelData, setLevelData] = useState<LevelData>(testLevel ?? levels[0]);

  const { gridCols, gridRows } = levelData;

  const [activePieces, setActivePieces] = useState<PieceData[]>(() =>
    levelData.pieces.map(p => ({ ...p, cells: [...p.cells] }))
  );
  const [escapingPieces, setEscapingPieces] = useState<EscapingPiece[]>([]);
  const [wiggle, setWiggle] = useState<{ id: string; dir: Direction } | null>(null);
  // 막혔을 때 "무엇이 막는지"를 보여주기 위한 정보
  const [blockHint, setBlockHint] = useState<{
    pieceId: string;
    blockerId: string;
    from: [number, number];
    to: [number, number];
  } | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const started = useRef(false);
  const escapingRef = useRef<EscapingPiece[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafCallbackRef = useRef<((time: number) => void) | undefined>(undefined);

  const svgW = PADDING * 2 + gridCols * CELL_SIZE;
  const svgH = PADDING * 2 + gridRows * CELL_SIZE;

  // 모양 레벨은 마스크 안쪽에만 배경 점을 찍는다. 마스크가 없으면 격자 전체.
  const dotCells = useMemo<[number, number][]>(() => {
    if (levelData.mask) return levelData.mask;
    const all: [number, number][] = [];
    for (let r = 0; r < gridRows; r++) for (let c = 0; c < gridCols; c++) all.push([c, r]);
    return all;
  }, [levelData.mask, gridCols, gridRows]);

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
      const t = setTimeout(() => {
        setIsCleared(true);
        if (stageNo !== null) {
          saveProgress(stageNo);
          setProgress(p => Math.max(p, stageNo));
        }
      }, 200);
      return () => clearTimeout(t);
    }
  }, [activePieces.length, escapingPieces.length, stageNo]);

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

  const handleSelectStage = useCallback((level: number) => {
    const stage = stages[level - 1];
    if (!stage) return;
    setDifficulty(null);
    setStageNo(level);
    loadLevel(stage);
    setScreen('playing');
  }, [loadLevel]);

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
      setBlockHint(null);
    } else {
      setWiggle({ id: piece.id, dir: piece.exitDir });
      setTimeout(() => setWiggle(null), 420);

      // 선로를 그려 막는 열차를 짚어준다 — 직선을 눈으로 훑지 않아도 되게
      const blocker = findBlocker(piece, others, gridCols, gridRows);
      if (blocker) {
        const head = piece.cells[piece.cells.length - 1];
        setBlockHint({
          pieceId: piece.id,
          blockerId: blocker.blockerId,
          from: neckTipStatic(head, piece.exitDir),
          to: cellCenter(blocker.cell[0], blocker.cell[1]),
        });
        setTimeout(() => setBlockHint(null), 1100);
      }
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
    const showLoco = isEscaping || onBoard(head[0], head[1], gridCols, gridRows);
    const isBlocker = blockHint?.blockerId === piece.id;
    const [lightX, lightY] = headlight(arrowTip, piece.exitDir);
    return (
      <g key={piece.id} className={`ap-piece ${wiggleClass}${isBlocker ? ' ap-blocker' : ''}`}
        onClick={clickable ? () => handlePieceClick(piece as PieceData) : undefined}
        style={{ cursor: clickable ? 'pointer' : 'default' }}>
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W + 4} fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
        <path d={pathD} stroke={piece.color} strokeWidth={STROKE_W} fill="none"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
        {/* 객차 이음매 — 같은 길을 배경색으로 끊어 그려 칸마다 마디를 만든다 */}
        <path d={pathD} stroke="#0d1526" strokeWidth={STROKE_W + 0.5} fill="none"
          strokeLinecap="butt" opacity={0.55}
          strokeDasharray={`1.5 ${CELL_SIZE - 1.5}`} strokeDashoffset={CELL_SIZE * 0.5} />
        {showLoco && (
          <>
            <polygon points={locoNose(arrowTip, piece.exitDir)}
              fill={piece.color} filter="url(#glow)" />
            <circle cx={lightX} cy={lightY} r={2.6} fill="#fffbe6" opacity={0.95} />
          </>
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
          <span className="ap-level-badge">열차 출발</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-select-screen">
          <button className="ap-campaign-card" onClick={() => setScreen('stages')}>
            <div className="ap-campaign-main">
              <span className="ap-campaign-title">스테이지</span>
              <span className="ap-campaign-sub">1 → {stages.length} · 갈수록 복잡해집니다</span>
            </div>
            <span className="ap-campaign-progress">{Math.min(progress, stages.length)}/{stages.length}</span>
          </button>

          <div className="ap-select-title">
            <h1>랜덤 퍼즐</h1>
            <p>노선이 매번 다르게 자동 생성됩니다</p>
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

  // ── Stage list screen ────────────────────────────────────────────────────────

  if (screen === 'stages') {
    // 클리어한 다음 한 판까지 열어둔다
    const unlocked = Math.min(progress + 1, stages.length);
    return (
      <div className="ap-page">
        <header className="ap-header">
          <button className="ap-icon-btn" onClick={() => setScreen('select')}>
            <ChevronLeft size={20} />
          </button>
          <span className="ap-level-badge">스테이지</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-stage-screen">
          <div className="ap-stage-grid">
            {stages.map(st => {
              const cleared = st.level <= progress;
              const locked = st.level > unlocked;
              return (
                <button
                  key={st.level}
                  className={`ap-stage-btn${cleared ? ' cleared' : ''}${locked ? ' locked' : ''}`}
                  disabled={locked}
                  onClick={() => handleSelectStage(st.level)}
                  title={`${st.gridCols}×${st.gridRows} · ${st.pieces.length}피스`}
                >
                  <span className="ap-stage-no">{st.level}</span>
                  <span className="ap-stage-meta">{st.pieces.length}</span>
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
        <button className="ap-icon-btn" onClick={() => setScreen(stageNo !== null ? 'stages' : 'select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="ap-level-badge" style={diffMeta ? { color: diffMeta.color } as React.CSSProperties : undefined}>
          {diffMeta ? diffMeta.label : stageNo !== null ? `Level ${stageNo}` : 'Level 1'}
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
          {dotCells.map(([c, r]) => {
            const [x, y] = cellCenter(c, r);
            return <circle key={`d${c},${r}`} cx={x} cy={y} r={2.5} fill="rgba(255,255,255,0.12)" />;
          })}
          {activePieces.map(p => renderPiece(p, true))}
          {escapingPieces.map(p => renderPiece(p, false))}
          {blockHint && (
            <g className="ap-block-hint" pointerEvents="none">
              <line x1={blockHint.from[0]} y1={blockHint.from[1]}
                x2={blockHint.to[0]} y2={blockHint.to[1]}
                stroke="#ff6b6b" strokeWidth={2.5} strokeDasharray="6 5" opacity={0.9} />
              <circle cx={blockHint.to[0]} cy={blockHint.to[1]} r={CELL_SIZE * 0.32}
                fill="none" stroke="#ff6b6b" strokeWidth={2.5} />
            </g>
          )}
        </svg>

        {isCleared && (
          <div className="ap-clear-overlay">
            <div className="ap-clear-card">
              <div className="ap-clear-emoji">🚆</div>
              <h2>전 편성 출발!</h2>
              <p>열차 {moveCount}대를 모두 내보냈습니다</p>
              <div className="ap-clear-btns">
                {stageNo !== null && stageNo < stages.length ? (
                  <button className="ap-btn-primary" onClick={() => handleSelectStage(stageNo + 1)}>
                    다음 레벨
                  </button>
                ) : (
                  <button className="ap-btn-primary" onClick={handleReset}>
                    다시 시도
                  </button>
                )}
                {difficulty && (
                  <button className="ap-btn-secondary" onClick={handleNewPuzzle}>
                    새 퍼즐
                  </button>
                )}
                {stageNo !== null && (
                  <button className="ap-btn-secondary" onClick={handleReset}>
                    다시 시도
                  </button>
                )}
              </div>
              {difficulty && (
                <button className="ap-btn-text" onClick={() => setScreen('select')}>
                  난이도 변경
                </button>
              )}
              {stageNo !== null && (
                <button className="ap-btn-text" onClick={() => setScreen('stages')}>
                  스테이지 목록
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
