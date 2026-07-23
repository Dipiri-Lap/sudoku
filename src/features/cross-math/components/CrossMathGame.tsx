import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, RefreshCw, Lightbulb } from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_CONFIGS,
  generateLevelForDifficulty,
  type Difficulty,
  type CrossMathLevel,
  type GridCell,
} from '../utils/generator';
import '../styles/CrossMath.css';

interface Tile {
  id: number;
  value: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BOARD_MAX = 440;

const CrossMathGame: React.FC = () => {
  const navigate = useNavigate();

  type Screen = 'select' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>('select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [level, setLevel] = useState<CrossMathLevel | null>(null);
  const [pool, setPool] = useState<Tile[]>([]);
  const [placements, setPlacements] = useState<Record<string, Tile>>({});
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cellMap = useMemo(() => {
    const m = new Map<string, GridCell>();
    if (level) for (const c of level.cells) m.set(`${c.row},${c.col}`, c);
    return m;
  }, [level]);

  const blankCells = useMemo(
    () => (level ? level.cells.filter(c => c.type === 'num' && c.isBlank) : []),
    [level]
  );

  const isWinner = useMemo(() => {
    if (blankCells.length === 0) return false;
    return blankCells.every(c => placements[`${c.row},${c.col}`]?.value === c.value);
  }, [blankCells, placements]);

  const loadLevel = useCallback((lvl: CrossMathLevel) => {
    setLevel(lvl);
    const blanks = lvl.cells.filter(c => c.type === 'num' && c.isBlank);
    setPool(shuffle(blanks.map((c, i) => ({ id: i, value: c.value! }))));
    setPlacements({});
    setSelectedTileId(null);
  }, []);

  const runGenerate = useCallback(async (d: Difficulty) => {
    setDifficulty(d);
    setScreen('generating');
    setError(null);
    await new Promise(r => setTimeout(r, 30));
    const result = generateLevelForDifficulty(d);
    if (result) {
      loadLevel(result);
      setScreen('playing');
    } else {
      setError('퍼즐 생성에 실패했습니다. 다시 시도해주세요.');
      setScreen('select');
    }
  }, [loadLevel]);

  const handleReset = useCallback(() => {
    if (level) loadLevel(level);
  }, [level, loadLevel]);

  const handleNewPuzzle = useCallback(() => {
    if (difficulty) runGenerate(difficulty);
  }, [difficulty, runGenerate]);

  const handleTileClick = useCallback((tile: Tile) => {
    setSelectedTileId(prev => (prev === tile.id ? null : tile.id));
  }, []);

  const handleCellClick = useCallback((key: string) => {
    const existing = placements[key];
    if (existing) {
      setPlacements(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setPool(prev => shuffle([...prev, existing]));
      return;
    }
    if (selectedTileId !== null) {
      const tile = pool.find(t => t.id === selectedTileId);
      if (!tile) return;
      setPlacements(prev => ({ ...prev, [key]: tile }));
      setPool(prev => prev.filter(t => t.id !== selectedTileId));
      setSelectedTileId(null);
    }
  }, [placements, pool, selectedTileId]);

  const handleHint = useCallback(() => {
    if (!level) return;
    const unfilled = blankCells.filter(c => !placements[`${c.row},${c.col}`]);
    if (unfilled.length === 0) return;
    const target = unfilled[Math.floor(Math.random() * unfilled.length)];
    const key = `${target.row},${target.col}`;
    const idx = pool.findIndex(t => t.value === target.value);
    if (idx === -1) return;
    const tile = pool[idx];
    setPool(prev => prev.filter(t => t.id !== tile.id));
    setPlacements(prev => ({ ...prev, [key]: tile }));
  }, [level, blankCells, placements, pool]);

  // ── 난이도 선택 화면 ──────────────────────────────────────────────────────

  if (screen === 'select') {
    return (
      <div className="cm-page">
        <header className="cm-header">
          <button className="cm-icon-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <span className="cm-level-badge">크로스매쓰</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="cm-select-screen">
          <div className="cm-select-title">
            <h1>난이도 선택</h1>
            <p>퍼즐이 매번 다르게 자동 생성됩니다</p>
          </div>
          {error && <div className="cm-error">{error}</div>}
          <div className="cm-diff-grid">
            {DIFFICULTIES.map(d => {
              const cfg = DIFFICULTY_CONFIGS[d];
              return (
                <button
                  key={d}
                  className="cm-diff-card"
                  onClick={() => runGenerate(d)}
                  style={{ '--diff-color': cfg.color } as React.CSSProperties}
                >
                  <span className="cm-diff-name">Lv.{cfg.level} {cfg.label}</span>
                  <span className="cm-diff-meta">방정식 {cfg.equationCount}개 · {cfg.operators.join('')}</span>
                  <span className="cm-diff-desc">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 생성 중 화면 ──────────────────────────────────────────────────────────

  if (screen === 'generating' || !level) {
    const cfg = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;
    return (
      <div className="cm-page">
        <div className="cm-generating">
          <div className="cm-spinner" style={cfg ? ({ borderTopColor: cfg.color } as React.CSSProperties) : undefined} />
          <p>{cfg ? `Lv.${cfg.level} ${cfg.label} 퍼즐 생성 중…` : '퍼즐 생성 중…'}</p>
        </div>
      </div>
    );
  }

  // ── 플레이 화면 ───────────────────────────────────────────────────────────

  const cfg = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;
  // 셀 크기와 보드 프레임(정사각형) 크기는 선택한 난이도의 gridSize 기준으로 한 번만 계산한다.
  // 난이도가 오르면 gridSize 자체가 커지므로(7×7 → 12×12), 프레임도 그만큼 커진다.
  const gridSize = cfg?.gridSize ?? Math.max(level.rows, level.cols);
  const WRAP_PADDING = 12 * 2;   // .cm-board-wrap padding (0.75rem 양쪽)
  const CARD_BORDER = 3 * 2;     // .cm-board-card border
  const CARD_PADDING = 14 * 2;   // .cm-board-card padding
  const SAFETY_MARGIN = 10;      // 라운딩/스크롤바 여유분
  const CHROME = WRAP_PADDING + CARD_BORDER + CARD_PADDING + SAFETY_MARGIN;
  const HEADER_H = 74;
  const POOL_H = 165; // 난이도가 높아 타일이 3줄까지 늘어날 때도 보드가 그만큼 안전하게 줄어들도록 여유 있게 예약
  const VERTICAL_SLACK = 24; // 브라우저마다 다른 100dvh 오차 등에 대비한 여유분
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 420;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const availableW = Math.min(BOARD_MAX, viewportW - CHROME);
  const availableH = viewportH - HEADER_H - POOL_H - CHROME - VERTICAL_SLACK;
  const cellPxByWidth = Math.floor(availableW / gridSize);
  const cellPxByHeight = Math.floor(availableH / gridSize);
  const cellPx = Math.max(18, Math.min(56, cellPxByWidth, cellPxByHeight));
  const fontPx = Math.max(12, Math.floor(cellPx * 0.5));
  const frameSide = gridSize * cellPx + (gridSize - 1) * 1 + CARD_BORDER + CARD_PADDING;

  return (
    <div className="cm-page">
      <header className="cm-header">
        <button className="cm-icon-btn" onClick={() => setScreen('select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="cm-level-badge" style={cfg ? ({ color: cfg.color } as React.CSSProperties) : undefined}>
          {cfg ? `Lv.${cfg.level} ${cfg.label}` : '크로스매쓰'}
        </span>
        <div className="cm-header-btns">
          <button className="cm-icon-btn" title="힌트" onClick={handleHint}>
            <Lightbulb size={16} />
          </button>
          {difficulty && (
            <button className="cm-icon-btn" title="새 퍼즐 생성" onClick={handleNewPuzzle}>
              <RefreshCw size={16} />
            </button>
          )}
          <button className="cm-icon-btn" title="다시 시작" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="cm-board-wrap">
        <div className="cm-board-card" style={{ width: frameSide, height: frameSide }}>
          <div
            className="cm-board"
            style={{
              gridTemplateColumns: `repeat(${level.cols}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${level.rows}, ${cellPx}px)`,
              fontSize: `${fontPx}px`,
            }}
          >
            {Array.from({ length: level.rows * level.cols }, (_, idx) => {
              const r = Math.floor(idx / level.cols);
              const c = idx % level.cols;
              const key = `${r},${c}`;
              const cell = cellMap.get(key);
              if (!cell) return <div key={idx} className="cm-cell cm-cell-empty" />;

              if (cell.type === 'op') {
                return <div key={idx} className="cm-cell cm-cell-op">{cell.operator}</div>;
              }
              if (cell.type === 'eq') {
                return <div key={idx} className="cm-cell cm-cell-eq">=</div>;
              }
              if (!cell.isBlank) {
                return <div key={idx} className="cm-cell cm-cell-given">{cell.value}</div>;
              }
              const placed = placements[key];
              const filled = placed !== undefined;
              const correct = filled && placed.value === cell.value;
              const cls = filled ? (correct ? 'cm-cell-correct' : 'cm-cell-wrong') : 'cm-cell-slot';
              return (
                <div key={idx} className={`cm-cell cm-cell-blank ${cls}`} onClick={() => handleCellClick(key)}>
                  {filled ? placed.value : ''}
                </div>
              );
            })}
          </div>
        </div>

        {isWinner && (
          <div className="cm-clear-overlay">
            <div className="cm-clear-card">
              <div className="cm-clear-emoji">🎉</div>
              <h2>클리어!</h2>
              <p>{cfg ? `Lv.${cfg.level} ${cfg.label}` : ''} 퍼즐을 풀었습니다</p>
              <div className="cm-clear-btns">
                <button className="cm-btn-primary" onClick={handleReset}>
                  다시 시도
                </button>
                {difficulty && (
                  <button className="cm-btn-secondary" onClick={handleNewPuzzle}>
                    새 퍼즐
                  </button>
                )}
              </div>
              <button className="cm-btn-text" onClick={() => setScreen('select')}>
                난이도 변경
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="cm-pool">
        {pool.map(tile => (
          <button
            key={tile.id}
            className={`cm-tile ${selectedTileId === tile.id ? 'cm-tile-selected' : ''}`}
            onClick={() => handleTileClick(tile)}
          >
            {tile.value}
          </button>
        ))}
        {pool.length === 0 && !isWinner && <span className="cm-pool-empty">칸을 눌러 되돌릴 수 있어요</span>}
      </div>
    </div>
  );
};

export default CrossMathGame;
