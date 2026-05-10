import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import levelsData from '../data/levels.json';
import { useQueensProgress } from '../../../context/QueensProgressContext';
import { solveLevel } from '../utils/solver';
import '../styles/QueensGame.css';

type LevelData = {
  id: number;
  name: string;
  size: number;
  grid: number[][];
  colors: string[];
};

type Queen = { row: number; col: number };

type HL =
  | { type: 'none' }
  | { type: 'cell'; row: number; col: number }
  | { type: 'row'; row: number }
  | { type: 'col'; col: number }
  | { type: 'color'; colorIdx: number }
  | { type: 'adjacent'; row: number; col: number };

type TutStep = {
  highlight: HL;
  label?: string;
  title: string;
  desc: string;
  interactive: boolean;
  ghostQueen?: { row: number; col: number };
};

const LEVELS = levelsData as LevelData[];
const MAX_HEARTS = 1;
const DOUBLE_CLICK_MS = 300;
const DRAG_THRESHOLD = 8;

// 4×4 tutorial grid (id=0):
//  col  0       1       2       3
// row0 [orange  orange  orange  blue  ]
// row1 [green   purple  orange  blue  ]
// row2 [green   purple  purple  blue  ]
// row3 [green   green   purple  blue  ]
//
// Solution: orange(0,1) · blue(1,3) · green(2,0) · purple(3,2)

const TUTORIAL_STEPS: TutStep[] = [
  // ── 0: Intro ──────────────────────────────────────────────────
  {
    highlight: { type: 'none' },
    title: '퀸즈에 오신 것을 환영합니다!',
    desc: '4×4 보드에 퀸 4개를 올바르게 배치하는 퍼즐이에요.\n지금부터 규칙을 하나씩 알아볼게요.',
    interactive: false,
  },
  // ── 1–4: Rule explanations ─────────────────────────────────────
  {
    highlight: { type: 'color', colorIdx: 0 },
    label: '규칙 1 / 4',
    title: '각 색상에 퀸 하나',
    desc: '보드는 4가지 색상 영역으로 나뉘어 있어요.\n각 색상 영역에 퀸을 딱 하나씩만 배치해야 합니다.',
    interactive: false,
  },
  {
    highlight: { type: 'row', row: 1 },
    label: '규칙 2 / 4',
    title: '한 행에 퀸 하나',
    desc: '같은 가로줄(행)에는 퀸이 하나만 있어야 해요.\n같은 행에 퀸이 2개 이상이면 규칙 위반!',
    interactive: false,
  },
  {
    highlight: { type: 'col', col: 1 },
    label: '규칙 3 / 4',
    title: '한 열에 퀸 하나',
    desc: '같은 세로줄(열)에도 퀸이 하나만 있어야 해요.',
    interactive: false,
  },
  {
    highlight: { type: 'adjacent', row: 1, col: 2 },
    label: '규칙 4 / 4',
    title: '퀸끼리 인접 불가',
    desc: '퀸끼리는 서로 닿을 수 없어요!\n가로·세로는 물론 대각선도 포함이에요.',
    interactive: false,
    ghostQueen: { row: 1, col: 2 },
  },
  // ── 5: Practice — X mark ──────────────────────────────────────
  {
    highlight: { type: 'cell', row: 0, col: 0 },
    title: '✕ 메모하기 연습',
    desc: '탭하면 ✕를 표시해서 퀸이 올 수 없는 칸을 메모해요.\n빛나는 칸을 탭해보세요!',
    interactive: true,
  },
  // ── 6: Practice — place orange queen ──────────────────────────
  {
    highlight: { type: 'cell', row: 0, col: 1 },
    title: '퀸 배치하기 연습',
    desc: '빠르게 두 번 탭하면 퀸을 놓을 수 있어요.\n빛나는 칸에 주황색 퀸을 놓아보세요!',
    interactive: true,
  },
  // ── 7: Analyze — mark blue cell (row elimination) ─────────────
  {
    highlight: { type: 'cell', row: 0, col: 3 },
    title: '행(row) 제거',
    desc: '주황 퀸이 0행에 놓였어요.\n같은 행에는 퀸을 놓을 수 없으니\n파란 칸 (0,3)에 ✕ 표시해보세요!',
    interactive: true,
  },
  // ── 8: Analyze — place blue queen ─────────────────────────────
  {
    highlight: { type: 'cell', row: 1, col: 3 },
    title: '파란색 퀸 배치',
    desc: '0행 제거 후 파란 영역을 분석하면\n(1,3)만 가능해요!\n두 번 탭해서 파란색 퀸을 놓아보세요.',
    interactive: true,
  },
  // ── 9: Analyze — mark purple cell (adjacency elimination) ─────
  {
    highlight: { type: 'cell', row: 2, col: 2 },
    title: '인접 제거',
    desc: '(2,2)는 파란 퀸 (1,3)과\n대각선으로 인접해서 불가능해요.\n✕ 표시해보세요!',
    interactive: true,
  },
  // ── 10: Analyze — place purple queen ──────────────────────────
  {
    highlight: { type: 'cell', row: 3, col: 2 },
    title: '보라색 퀸 배치',
    desc: '1열·인접 칸을 제외하면\n보라 영역엔 (3,2)만 남아요!\n두 번 탭해서 보라색 퀸을 놓아보세요.',
    interactive: true,
  },
  // ── 11: Last queen — green ─────────────────────────────────────
  {
    highlight: { type: 'cell', row: 2, col: 0 },
    title: '마지막 퀸!',
    desc: '세 퀸이 배치되면 초록 영역에서\n(2,0)만 남아요. 두 번 탭해서\n퍼즐을 완성해보세요! 🎉',
    interactive: true,
  },
];

// Interactive step advance conditions
// step → next step trigger
const ADVANCE_ON_MARK: Record<number, string> = { 5: '0,0', 7: '0,3', 9: '2,2' };
// [step, nextStep, row, col] — advance when queen placed at (row,col)
const ADVANCE_ON_QUEEN: [number, number, number, number][] = [
  [6, 7, 0, 1],
  [8, 9, 1, 3],
  [10, 11, 3, 2],
];

function rotate90CW(grid: number[][]): number[][] {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r])
  );
}

function rotateGrid(grid: number[][], times: number): number[][] {
  let result = grid;
  for (let i = 0; i < times % 4; i++) result = rotate90CW(result);
  return result;
}

function getConflicts(queens: (Queen | null)[]): Set<string> {
  const placed = queens.filter((q): q is Queen => q !== null);
  const conflicted = new Set<string>();
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      if (
        a.row === b.row ||
        a.col === b.col ||
        (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1)
      ) {
        conflicted.add(`${a.row},${a.col}`);
        conflicted.add(`${b.row},${b.col}`);
      }
    }
  }
  return conflicted;
}

function getCellTutClass(r: number, c: number, colorIdx: number, step: TutStep | null): string {
  if (!step) return '';
  const hl = step.highlight;
  switch (hl.type) {
    case 'none': return '';
    case 'cell':
      return r === hl.row && c === hl.col ? 'tut-guide' : 'tut-guidedim';
    case 'row':
      return r === hl.row ? 'tut-hl' : 'tut-dim';
    case 'col':
      return c === hl.col ? 'tut-hl' : 'tut-dim';
    case 'color':
      return colorIdx === hl.colorIdx ? 'tut-hl' : 'tut-dim';
    case 'adjacent': {
      const dr = Math.abs(r - hl.row);
      const dc = Math.abs(c - hl.col);
      if (dr === 0 && dc === 0) return 'tut-center';
      if (dr <= 1 && dc <= 1) return 'tut-forbidden';
      return 'tut-dim';
    }
  }
}

const QueensGame: React.FC = () => {
  const navigate = useNavigate();
  const { queensProgress, saveQueensProgress } = useQueensProgress();

  const [levelIdx, setLevelIdx] = useState(() => {
    // Start from next uncleared level; skip tutorial if already cleared
    if (queensProgress <= 0) return 0; // show tutorial
    const nextId = queensProgress + 1;
    const idx = LEVELS.findIndex(l => l.id === nextId);
    return idx >= 0 ? idx : LEVELS.length - 1;
  });
  const level = LEVELS[levelIdx];
  const { size, colors } = level;
  const isTutorial = level.id === 0;
  const n = colors.length;

  const [tutorialStep, setTutorialStep] = useState<number | null>(isTutorial ? 0 : null);

  const [rotationTimes, setRotationTimes] = useState(0);
  const rotationTimesRef = useRef(0);

  const currentGrid = useMemo(
    () => rotateGrid(level.grid, rotationTimes),
    [level.grid, rotationTimes]
  );

  // Correct answer for the current (possibly rotated) grid
  const solution = useMemo(() => solveLevel(currentGrid, n), [currentGrid, n]);

  const [queens, setQueens] = useState<(Queen | null)[]>(Array(n).fill(null));
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [animPhase, setAnimPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [isRippling, setIsRippling] = useState(true);
  const rippleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentlyPlaced, setRecentlyPlaced] = useState<Set<string>>(new Set());

  const queensRef = useRef(queens);
  const marksRef = useRef(marks);
  useEffect(() => { queensRef.current = queens; }, [queens]);
  useEffect(() => { marksRef.current = marks; }, [marks]);

  const lastClickRef = useRef<{ row: number; col: number; time: number } | null>(null);
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerDownRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'add' | 'remove'>('add');
  const dragCellsRef = useRef<Set<string>>(new Set());
  const wasDragRef = useRef(false);

  const placed = queens.filter((q): q is Queen => q !== null);
  const conflicts = getConflicts(queens);

  // Tutorial auto-advance on mark
  useEffect(() => {
    if (tutorialStep === null) return;
    const key = ADVANCE_ON_MARK[tutorialStep];
    if (key && marks.has(key)) {
      setTimeout(() => setTutorialStep(ts => ts !== null ? ts + 1 : ts), 350);
    }
  }, [marks, tutorialStep]);

  // Tutorial auto-advance on queen placement
  useEffect(() => {
    if (tutorialStep === null) return;
    for (const [step, next, r, c] of ADVANCE_ON_QUEEN) {
      if (tutorialStep !== step) continue;
      const ci = currentGrid[r]?.[c];
      if (queens[ci]?.row === r && queens[ci]?.col === c) {
        setTimeout(() => setTutorialStep(next), 350);
      }
    }
  }, [queens, tutorialStep, currentGrid]);

  // Win detection
  useEffect(() => {
    if (placed.length === n && conflicts.size === 0 && !gameOver) {
      const t = setTimeout(() => {
        setWon(true);
        if (!isTutorial) {
          saveQueensProgress(level.id).catch(console.error);
        }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [queens]);

  // Game over detection
  useEffect(() => {
    if (hearts === 0 && !won) {
      const t = setTimeout(() => setGameOver(true), 600);
      return () => clearTimeout(t);
    }
  }, [hearts, won]);

  // Board ripple entrance animation — triggers on mount and level change
  useEffect(() => {
    setIsRippling(true);
    const maxDist = Math.sqrt(2) * (size - 1) / 2;
    const totalMs = Math.round(maxDist * 55) + 450;
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => setIsRippling(false), totalMs);
    return () => { if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current); };
  }, [levelIdx]);

  const doReset = (newRot: number, newN: number, newIsTutorial: boolean) => {
    rotationTimesRef.current = newRot;
    setRotationTimes(newRot);
    setQueens(Array(newN).fill(null));
    setMarks(new Set());
    setHearts(MAX_HEARTS);
    setWon(false);
    setGameOver(false);
    setTutorialStep(newIsTutorial ? 0 : null);
    lastClickRef.current = null;
    pointerDownRef.current = null;
    isDraggingRef.current = false;
    wasDragRef.current = false;
  };

  const handleReset = useCallback(() => {
    if (animPhase !== 'idle') return;
    setAnimPhase('out');
    setTimeout(() => {
      const newRot = isTutorial ? 0 : (rotationTimesRef.current + Math.floor(Math.random() * 3) + 1) % 4;
      doReset(newRot, n, isTutorial);
      setAnimPhase('in');
      setTimeout(() => setAnimPhase('idle'), 280);
    }, 220);
  }, [animPhase, isTutorial, n]);

  const handleNextLevel = useCallback(() => {
    const nextIdx = levelIdx + 1;
    if (nextIdx >= LEVELS.length) return;
    const nextLevel = LEVELS[nextIdx];
    setLevelIdx(nextIdx);
    doReset(0, nextLevel.colors.length, nextLevel.id === 0);
  }, [levelIdx]);

  const spawnParticles = useCallback((row: number, col: number) => {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement | null;
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const palette = ['#fbbf24', '#f59e0b', '#fde68a', '#fff', '#fcd34d', '#facc15'];
    const total = 14;
    for (let i = 0; i < total; i++) {
      const isStar = i % 2 === 0;
      const angle = (i / total) * 360 + Math.random() * 15;
      const dist = 38 + Math.random() * 32;
      const size = isStar ? 10 + Math.random() * 6 : 5 + Math.random() * 4;
      const color = palette[Math.floor(Math.random() * palette.length)];
      const dx = Math.cos((angle * Math.PI) / 180) * dist;
      const dy = Math.sin((angle * Math.PI) / 180) * dist;
      const el = document.createElement('span');
      el.textContent = isStar ? '★' : '●';
      el.style.cssText = `
        position:fixed; left:${cx}px; top:${cy}px;
        font-size:${size}px; color:${color};
        pointer-events:none; z-index:9999;
        transform:translate(-50%,-50%);
        animation:particle-fly 0.62s ease-out forwards;
        --dx:${dx}px; --dy:${dy}px;
        text-shadow: 0 0 4px ${color};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 680);
    }
  }, []);

  const applyMarkToCell = useCallback((row: number, col: number) => {
    const key = `${row},${col}`;
    if (dragCellsRef.current.has(key)) return;
    const colorIdx = currentGrid[row][col];
    const q = queensRef.current[colorIdx];
    if (q?.row === row && q?.col === col) return;
    dragCellsRef.current.add(key);
    setMarks(prev => {
      const s = new Set(prev);
      if (dragModeRef.current === 'add') s.add(key); else s.delete(key);
      return s;
    });
  }, [currentGrid]);

  const getCellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest('[data-row]') as HTMLElement | null;
    if (!cell) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  };

  // Block board interaction during intro and rule explanation steps
  const isBlocked = tutorialStep !== null && tutorialStep <= 4;

  const handleBoardPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (won || gameOver || isBlocked) return;
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    pointerDownRef.current = { ...cell, x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    wasDragRef.current = false;
  }, [won, gameOver, isBlocked]);

  const handleBoardPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerDownRef.current;
    if (!start) return;
    if (!isDraggingRef.current) {
      if (Math.abs(e.clientX - start.x) < DRAG_THRESHOLD && Math.abs(e.clientY - start.y) < DRAG_THRESHOLD) return;
      isDraggingRef.current = true;
      dragCellsRef.current = new Set();
      const startKey = `${start.row},${start.col}`;
      dragModeRef.current = marksRef.current.has(startKey) ? 'remove' : 'add';
      applyMarkToCell(start.row, start.col);
    }
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell) applyMarkToCell(cell.row, cell.col);
  }, [applyMarkToCell]);

  const handleBoardPointerUp = useCallback(() => {
    if (isDraggingRef.current) wasDragRef.current = true;
    pointerDownRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (wasDragRef.current) { wasDragRef.current = false; return; }
    if (won || gameOver || isBlocked) return;

    const now = Date.now();
    const last = lastClickRef.current;
    const isDoubleClick = last && last.row === row && last.col === col && now - last.time < DOUBLE_CLICK_MS;

    if (isDoubleClick) {
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }
      lastClickRef.current = null;
      const key = `${row},${col}`;
      const colorIdx = currentGrid[row][col];

      const correct = solution?.[colorIdx];
      const isWrong = !correct || correct[0] !== row || correct[1] !== col;

      if (isWrong) {
        setHearts(h => Math.max(0, h - 1));
      } else {
        setMarks(prev => { const s = new Set(prev); s.delete(key); return s; });
        const newQ = [...queensRef.current];
        newQ[colorIdx] = { row, col };
        setQueens(newQ);
        setRecentlyPlaced(prev => new Set([...prev, key]));
        setTimeout(() => setRecentlyPlaced(prev => { const n = new Set(prev); n.delete(key); return n; }), 550);
        setTimeout(() => spawnParticles(row, col), 20);
      }
    } else {
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }
      lastClickRef.current = { row, col, time: now };
      const key = `${row},${col}`;
      const colorIdx = currentGrid[row][col];
      const q = queens[colorIdx];
      if (q?.row === row && q?.col === col) {
        setQueens(prev => { const next = [...prev]; next[colorIdx] = null; return next; });
      } else {
        singleClickTimerRef.current = setTimeout(() => {
          singleClickTimerRef.current = null;
          setMarks(prev => {
            const s = new Set(prev);
            if (s.has(key)) s.delete(key); else s.add(key);
            return s;
          });
        }, DOUBLE_CLICK_MS);
      }
    }
  }, [won, gameOver, isBlocked, currentGrid, queens]);

  const currentTutStep = tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null;
  const isInteractiveStep = tutorialStep !== null && tutorialStep >= 5;
  const boardClass = ['queens-board-container', animPhase !== 'idle' ? `board-${animPhase}` : ''].filter(Boolean).join(' ');

  // Label shown in interactive banner (e.g. "3 / 7")
  const interactiveIndex = tutorialStep !== null ? tutorialStep - 4 : 0; // 5→1, 6→2, ... 11→7

  return (
    <div className="queens-game">
      <div className="queens-header">
        <button className="queens-back-btn" onClick={() => navigate('/queens')}>←</button>
        <span className="queens-level-name">{level.name}</span>
        <button className="queens-reset-btn" onClick={handleReset}>초기화</button>
      </div>

      <div className="queens-status-row">
        <div className="queens-hearts">
          {Array.from({ length: MAX_HEARTS }, (_, i) => (
            <span key={i} className={`queens-heart ${i < hearts ? 'alive' : 'dead'}`}>♥</span>
          ))}
        </div>
        <div className="queens-progress">
          <span className="queens-crown-icon">👑</span>
          <div className="queens-progress-bar">
            <div className="queens-progress-fill" style={{ width: `${(placed.length / n) * 100}%` }} />
          </div>
          <span className="queens-progress-text">{placed.length}/{n}</span>
        </div>
      </div>

      <div
        className={boardClass}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
        onPointerCancel={handleBoardPointerUp}
      >
        <div
          className="queens-board"
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
          }}
        >
          {currentGrid.map((row, r) =>
            row.map((colorIdx, c) => {
              const key = `${r},${c}`;
              const q = queens[colorIdx];
              const hasQueenHere = q?.row === r && q?.col === c;
              const isConflict = conflicts.has(key);
              const isMarked = marks.has(key);
              const tutClass = getCellTutClass(r, c, colorIdx, currentTutStep);
              const showGhost = currentTutStep?.ghostQueen?.row === r && currentTutStep?.ghostQueen?.col === c;
              const showForbidden = currentTutStep?.highlight.type === 'adjacent' && tutClass === 'tut-forbidden';
              return (
                <div
                  key={key}
                  data-row={r}
                  data-col={c}
                  className={`queens-cell${isConflict ? ' conflict' : ''}${tutClass ? ` ${tutClass}` : ''}${isRippling ? ' rippling' : ''}${recentlyPlaced.has(key) ? ' cell-flipping' : ''}`}
                  style={{
                    backgroundColor: colors[colorIdx],
                    ...(isRippling && { '--ripple-delay': `${(r + c) * 45}ms` }),
                  } as React.CSSProperties}
                  onClick={() => handleCellClick(r, c)}
                >
                  {hasQueenHere && <span className={`cell-queen${isConflict ? ' conflict' : ''}`}>👑</span>}
                  {isMarked && !hasQueenHere && <span className="cell-mark">✕</span>}
                  {showGhost && !hasQueenHere && <span className="cell-ghost-queen">👑</span>}
                  {showForbidden && !hasQueenHere && <span className="cell-forbidden-mark">✕</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {!isTutorial && (
        <div className="queens-hint">
          탭: ✕ 표시 &nbsp;|&nbsp; 빠르게 두 번 탭: 👑 배치 &nbsp;|&nbsp; 드래그: 연속 표시
        </div>
      )}

      {/* ── Step 0: Full intro overlay ── */}
      {tutorialStep === 0 && (
        <div className="tut-intro-overlay">
          <div className="tut-intro-card">
            <div className="tut-intro-crown">👑</div>
            <h1 className="tut-intro-title">퀸즈</h1>
            <p className="tut-intro-sub">4×4 보드에 퀸 4개를 올바르게 배치하는 퍼즐이에요.</p>
            <button className="tut-start-btn" onClick={() => setTutorialStep(1)}>
              규칙 알아보기 →
            </button>
            <button className="tut-skip-link" onClick={() => setTutorialStep(null)}>
              건너뛰기
            </button>
          </div>
        </div>
      )}

      {/* ── Steps 1–4: Rule explanation card ── */}
      {tutorialStep !== null && tutorialStep >= 1 && tutorialStep <= 4 && (
        <div className="tut-rule-card">
          <div className="tut-rule-header">
            <span className="tut-rule-label">{TUTORIAL_STEPS[tutorialStep].label}</span>
            <div className="tut-rule-dots">
              {[1, 2, 3, 4].map(i => (
                <span key={i} className={`tut-dot${i === tutorialStep ? ' active' : ''}`} />
              ))}
            </div>
          </div>
          <div className="tut-rule-title">{TUTORIAL_STEPS[tutorialStep].title}</div>
          <div className="tut-rule-desc">
            {TUTORIAL_STEPS[tutorialStep].desc.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
          <div className="tut-rule-nav">
            <button
              className="tut-nav-btn tut-prev"
              onClick={() => setTutorialStep(ts => Math.max(0, (ts ?? 1) - 1))}
            >
              ← 이전
            </button>
            <button
              className="tut-nav-btn tut-next"
              onClick={() => setTutorialStep(ts => (ts ?? 4) + 1)}
            >
              {tutorialStep === 4 ? '직접 해보기 →' : '다음 →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Steps 5–11: Interactive guided banner ── */}
      {isInteractiveStep && currentTutStep && (
        <div className="tut-interact-banner">
          <div className="tut-interact-progress">
            <div className="tut-interact-dots">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  className={`tut-idot${i < interactiveIndex ? ' done' : ''}${i === interactiveIndex - 1 ? ' current' : ''}`}
                />
              ))}
            </div>
            <span className="tut-interact-count">{interactiveIndex} / 7</span>
          </div>
          <div className="tut-interact-title">{currentTutStep.title}</div>
          <div className="tut-interact-desc">
            {currentTutStep.desc.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
        </div>
      )}

      {won && (
        <div className="queens-win-overlay">
          <div className="queens-win-modal">
            <div style={{ fontSize: '4rem', lineHeight: 1 }}>👑</div>
            <h2>정답!</h2>
            <p>모든 퀸을 올바르게 배치했습니다!</p>
            {levelIdx < LEVELS.length - 1 && (
              <button className="queens-win-btn" onClick={handleNextLevel}>
                다음 스테이지 →
              </button>
            )}
            <button
              className={levelIdx < LEVELS.length - 1 ? 'queens-home-btn' : 'queens-win-btn'}
              onClick={handleReset}
            >
              다시 시도
            </button>
            <button className="queens-home-btn" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="queens-win-overlay">
          <div className="queens-win-modal">
            <div style={{ fontSize: '4rem', lineHeight: 1 }}>💔</div>
            <h2 style={{ color: '#ef4444' }}>실패!</h2>
            <p>하트를 모두 잃었습니다.</p>
            <button className="queens-win-btn" onClick={handleReset}>다시 시도</button>
            <button className="queens-home-btn" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueensGame;
