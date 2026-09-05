import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Timer, PenLine, X, Eye, EyeOff, SkipForward, CheckCircle2, Pencil, Save } from 'lucide-react';
import { levels, buildClues, solutionGrid, artColors, lineClues } from '../data/levels';
import { solveNonogram } from '../utils/solver';
import '../styles/Nonogram.css';

// 0 = 미정, 1 = 채움, 2 = X(비움 표시)
type CellState = 0 | 1 | 2;
type Tool = 'fill' | 'cross';

// 완성 연출: 대각선(r+c) 순서로 셀이 색을 입음
const REVEAL_STEP_MS = 40;
const REVEAL_CELL_MS = 250;

function emptyBoard(rows: number, cols: number): CellState[][] {
  return Array.from({ length: rows }, () => Array<CellState>(cols).fill(0));
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const LEVEL_KEY = 'nonogram.levelIndex';

const NonogramGame: React.FC = () => {
  const navigate = useNavigate();
  // 편집 저장 시 levels.ts 가 바뀌어 HMR 로 모듈이 다시 로드되므로, 보던 스테이지를 세션에 기억해 복원
  const [levelIndex, setLevelIndex] = useState(() => {
    const saved = Number(sessionStorage.getItem(LEVEL_KEY));
    return Number.isInteger(saved) && saved >= 0 && saved < levels.length ? saved : 0;
  });
  const baseLevel = levels[levelIndex];
  // 편집 모드: null 이면 일반 플레이, 배열이면 편집 중인 art (저장 전까지 원본은 유지)
  const [editArt, setEditArt] = useState<string[] | null>(null);
  const editMode = editArt !== null;
  const level = useMemo(() => (editArt ? { ...baseLevel, art: editArt } : baseLevel), [baseLevel, editArt]);
  const solution = useMemo(() => solutionGrid(level), [level]);
  const colors = useMemo(() => artColors(level), [level]);
  const rows = solution.length;
  const cols = solution[0].length;
  const clues = useMemo(() => buildClues(solution), [solution]);

  const [board, setBoard] = useState<CellState[][]>(() => emptyBoard(rows, cols));
  const [tool, setTool] = useState<Tool>('fill');
  const [elapsed, setElapsed] = useState(0);
  // 색 입히기 연출이 끝난 뒤 결과 패널 표시
  const [showResult, setShowResult] = useState(false);
  // 정답 보기: 켜면 정답 그리드를 겹쳐 보여주고 입력을 막음. 다시 끄면 원래 보드로 복귀
  const [showSolution, setShowSolution] = useState(false);
  // 클리어 카드 연출: 레이아웃을 건드리지 않고 transform 만으로 그리드를 화면 중앙에 모으기 위한 측정값
  //   dx/dy = 그리드 중심 - 보드 중심 (힌트 영역만큼 그리드가 우하단으로 치우쳐 있음), wrapH = 보드 높이
  const wrapRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [clearGeom, setClearGeom] = useState({ dx: 0, dy: 0, wrapH: 0 });

  // 승리 판정: 채움(1) 여부가 정답과 정확히 일치 (X 표시 여부는 무관). 편집 중에는 판정하지 않음
  const isWinner = useMemo(
    () => !editMode && solution.every((row, r) => row.every((v, c) => (board[r][c] === 1) === (v === 1))),
    [board, solution, editMode]
  );

  useEffect(() => { sessionStorage.setItem(LEVEL_KEY, String(levelIndex)); }, [levelIndex]);

  // ── 편집 모드 ──
  // 채움으로 바꿀 때 쓰는 문자: emptyChars 에 없는 가장 어두운 팔레트 색 (보통 윤곽선 'a')
  const fillChar = useMemo(() => {
    const luma = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
    const cands = Object.entries(baseLevel.palette).filter(([ch]) => !(baseLevel.emptyChars ?? '').includes(ch));
    return cands.sort((x, y) => luma(x[1]) - luma(y[1]))[0]?.[0] ?? 'a';
  }, [baseLevel]);
  const setEditCell = useCallback((r: number, c: number, filled: boolean) => {
    setEditArt(prev => {
      if (!prev) return prev;
      const row = [...prev[r]];
      if (filled) row[c] = fillChar;
      else {
        // 비울 때: 실루엣 바깥(이웃에 배경이 있음)이면 배경, 안쪽이면 첫 번째 빈칸 색으로 (완성 색 유지)
        const nb = [prev[r - 1]?.[c], prev[r + 1]?.[c], prev[r][c - 1], prev[r][c + 1]];
        const outside = nb.some(v => v === undefined || v === '.');
        const emptyCh = baseLevel.emptyChars?.[0];
        row[c] = outside || !emptyCh ? '.' : emptyCh;
      }
      const next = [...prev];
      next[r] = row.join('');
      return next;
    });
  }, [fillChar, baseLevel.emptyChars]);
  // 편집 중인 그림이 힌트만으로 유일하게 풀리는지 실시간 판정
  const editStatus = useMemo(() => {
    if (!editMode) return null;
    const res = solveNonogram(solution.map(lineClues), solution[0].map((_, c) => lineClues(solution.map(rw => rw[c]))), 1500);
    return res.solutions === 1 ? (res.logicOnly ? '유일해 · 논리 풀이 가능' : '유일해 · 추측 필요') : '복수해 (수정 필요)';
  }, [editMode, solution]);
  const [saving, setSaving] = useState(false);
  const saveEdit = async () => {
    if (!editArt) return;
    setSaving(true);
    try {
      const r = await fetch('/__nonogram/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: baseLevel.id, art: editArt }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      baseLevel.art = editArt; // HMR 전에도 즉시 반영
      setEditArt(null);
      setBoard(emptyBoard(rows, cols));
    } catch (e) {
      alert(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // 드래그 페인팅: 처음 누른 칸에 적용된 값을 드래그 경로 전체에 동일하게 적용
  const paintValue = useRef<CellState | null>(null);

  const reset = useCallback(() => {
    setBoard(emptyBoard(rows, cols));
    setElapsed(0);
    setShowResult(false);
  }, [rows, cols]);

  const goToLevel = (index: number) => {
    if (index < 0 || index >= levels.length) return;
    const next = solutionGrid(levels[index]);
    setLevelIndex(index);
    setBoard(emptyBoard(next.length, next[0].length));
    setElapsed(0);
    setShowResult(false);
    setShowSolution(false);
  };

  useEffect(() => {
    if (isWinner) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [isWinner]);

  useEffect(() => {
    if (!isWinner) return;
    const total = (rows + cols - 2) * REVEAL_STEP_MS + REVEAL_CELL_MS + 300;
    const t = setTimeout(() => {
      const w = wrapRef.current?.getBoundingClientRect();
      const g = gridRef.current?.getBoundingClientRect();
      if (w && g) {
        setClearGeom({
          dx: (g.left + g.width / 2) - (w.left + w.width / 2),
          dy: (g.top + g.height / 2) - (w.top + w.height / 2),
          wrapH: w.height,
        });
      }
      setShowResult(true);
    }, total);
    return () => clearTimeout(t);
  }, [isWinner, rows, cols]);

  const applyCell = useCallback((r: number, c: number, value: CellState) => {
    setBoard(prev => {
      if (prev[r][c] === value) return prev;
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      return next;
    });
  }, []);

  const cellFromPoint = (x: number, y: number): [number, number] | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest('[data-cell]') as HTMLElement | null;
    if (!cell) return null;
    const [r, c] = cell.dataset.cell!.split(',').map(Number);
    return [r, c];
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (isWinner || showSolution) return;
    e.preventDefault();
    if (editMode) {
      // 편집: 정답 칸을 토글하고 드래그로 같은 값을 이어 칠함
      const value: CellState = solution[r][c] ? 0 : 1;
      paintValue.current = value;
      setEditCell(r, c, value === 1);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    const current = board[r][c];
    const target: CellState = tool === 'fill' ? 1 : 2;
    // 같은 값을 다시 누르면 지움(토글)
    const value: CellState = current === target ? 0 : target;
    paintValue.current = value;
    applyCell(r, c, value);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (paintValue.current === null) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    if (editMode) setEditCell(hit[0], hit[1], paintValue.current === 1);
    else applyCell(hit[0], hit[1], paintValue.current);
  };

  const handlePointerUp = () => { paintValue.current = null; };

  // 테스트용: 정답을 그대로 보드에 채워 즉시 클리어 처리
  const completeNow = useCallback(() => {
    setShowSolution(false);
    setBoard(solution.map(row => row.map((v): CellState => (v ? 1 : 0))));
  }, [solution]);

  const maxRowClue = Math.max(...clues.rows.map(c => c.length));
  const maxColClue = Math.max(...clues.cols.map(c => c.length));

  return (
    <div className={`ng-page${isWinner ? ' ng-page--won' : ''}${showResult ? ' ng-page--clear' : ''}`}>
      {showResult && (
        // 클리어 배경 색종이: 위치/색/지연은 인덱스로 고정 (렌더마다 흔들리지 않게)
        <div className="ng-confetti" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              style={{
                '--x': `${(i * 37) % 100}%`,
                '--d': `${(i % 5) * 0.25}s`,
                '--r': `${(i * 53) % 360}deg`,
                '--c': ['#ffd23f', '#ff6b6b', '#4ecdc4', '#fff', '#a06cd5'][i % 5],
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
      <div className="ng-header">
        <button className="ng-icon-btn" onClick={() => navigate('/')} aria-label="뒤로가기">
          <ChevronLeft size={24} />
        </button>
        <div className="ng-title-badge">
          <span className="ng-stage-no">{levelIndex + 1}/{levels.length}</span> {level.name}
          {level.difficulty === 'hard' && <span className="ng-diff">어려움</span>}
        </div>
        <div className="ng-timer-badge"><Timer size={16} /> {formatTime(elapsed)}</div>
        <button
          className="ng-icon-btn"
          onClick={() => goToLevel(levelIndex + 1)}
          disabled={levelIndex >= levels.length - 1}
          aria-label="다음 스테이지"
          title="다음 스테이지"
        >
          <SkipForward size={22} />
        </button>
      </div>

      <div
        ref={wrapRef}
        className={`ng-board-wrap${showResult ? ' ng-board-wrap--clear' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ '--rows': rows, '--cols': cols, '--row-clue': maxRowClue, '--col-clue': maxColClue,
          '--clear-dx': `${clearGeom.dx}px`, '--clear-dy': `${clearGeom.dy}px`, '--wrap-h': `${clearGeom.wrapH}px` } as React.CSSProperties}
      >
        <div className="ng-corner" />
        <div className="ng-col-clues">
          {clues.cols.map((clue, c) => (
            <div key={c} className="ng-col-clue">
              {clue.map((n, i) => <span key={i}>{n}</span>)}
            </div>
          ))}
        </div>
        <div className="ng-row-clues">
          {clues.rows.map((clue, r) => (
            <div key={r} className="ng-row-clue">
              {clue.map((n, i) => <span key={i}>{n}</span>)}
            </div>
          ))}
        </div>
        <div ref={gridRef} className={`ng-grid${isWinner ? ' ng-grid--won' : ''}${showSolution ? ' ng-grid--solution' : ''}${editMode ? ' ng-grid--edit' : ''}`}>
          {board.map((row, r) => row.map((v, c) => (
            <div
              key={`${r},${c}`}
              data-cell={`${r},${c}`}
              className={`ng-cell ng-cell--${showSolution || editMode ? solution[r][c] : v}${c % 5 === 4 && c !== cols - 1 ? ' ng-cell--vsep' : ''}${r % 5 === 4 && r !== rows - 1 ? ' ng-cell--hsep' : ''}`}
              style={{
                '--art': colors[r][c],
                '--reveal-delay': `${(r + c) * REVEAL_STEP_MS}ms`,
                '--reveal-dur': `${REVEAL_CELL_MS}ms`,
              } as React.CSSProperties}
              onPointerDown={e => handlePointerDown(e, r, c)}
            >
              {v === 2 && !showSolution && !editMode && <X size={16} strokeWidth={3} className="ng-cell-x" />}
            </div>
          )))}
          {editMode && level.image && (
            // 편집 가이드: 원본 이미지를 반투명하게 겹쳐 보여줌
            <img className="ng-edit-image" src={level.image} alt="" draggable={false} />
          )}
          {isWinner && level.image && (
            // 셀 색 입히기와 같은 속도로 좌상단→우하단 대각선 와이프로 원본 이미지가 드러남
            <img
              className="ng-art-image"
              src={level.image}
              alt={level.name}
              draggable={false}
              style={{ '--reveal-total': `${(rows + cols) * REVEAL_STEP_MS}ms` } as React.CSSProperties}
            />
          )}
          {isWinner && (
            <div className={`ng-art-name${showResult ? ' show' : ''}`}>{level.name}</div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="ng-tools ng-tools--edit">
          <span className={`ng-edit-status${editStatus?.startsWith('복수해') ? ' bad' : ''}`}>{editStatus}</span>
          <button className="ng-tool-btn ng-tool-btn--save" onClick={saveEdit} disabled={saving}>
            <Save size={18} /> {saving ? '저장 중...' : '저장'}
          </button>
          <button className="ng-tool-btn" onClick={() => setEditArt(null)}>
            <X size={18} /> 취소
          </button>
        </div>
      )}

      {!isWinner && !editMode && (
        <div className="ng-tools">
          <button className={`ng-tool-btn${tool === 'fill' ? ' active' : ''}`} onClick={() => setTool('fill')}>
            <PenLine size={18} /> 채우기
          </button>
          <button className={`ng-tool-btn${tool === 'cross' ? ' active' : ''}`} onClick={() => setTool('cross')}>
            <X size={18} /> 비움 표시
          </button>
          <button className="ng-tool-btn" onClick={reset} aria-label="다시 시작">
            <RotateCcw size={18} /> 다시
          </button>
          <button
            className={`ng-tool-btn ng-tool-btn--solution${showSolution ? ' active' : ''}`}
            onClick={() => setShowSolution(s => !s)}
          >
            {showSolution ? <EyeOff size={18} /> : <Eye size={18} />} {showSolution ? '정답 숨기기' : '정답 보기'}
          </button>
          <button className="ng-tool-btn" onClick={completeNow}>
            <CheckCircle2 size={18} /> 완료
          </button>
          {import.meta.env.DEV && (
            <button className="ng-tool-btn" onClick={() => { setShowSolution(false); setEditArt([...baseLevel.art]); }}>
              <Pencil size={18} /> 에디트
            </button>
          )}
        </div>
      )}

      {showResult && (
        <div className="ng-result">
          <h2>완성! 🎉</h2>
          <p>{formatTime(elapsed)}</p>
          <div className="ng-result-actions">
            <button className="ng-btn" onClick={reset}>다시 하기</button>
            {levelIndex < levels.length - 1 && (
              <button className="ng-btn ng-btn--primary" onClick={() => goToLevel(levelIndex + 1)}>다음</button>
            )}
            <button className="ng-btn" onClick={() => navigate('/')}>나가기</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NonogramGame;
