import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import levelsRaw from '../data/levels.json';
import '../styles/CrosswordGame.css';

interface WordDef {
  id: number;
  dir: 'h' | 'v';
  row: number;
  col: number;
  syllables: string[];
  label: string;
}

interface LevelDef {
  id: number;
  gridRows: number;
  gridCols: number;
  words: WordDef[];
  fixedCells: { row: number; col: number; letter: string }[];
  tilePool: string[];
}

interface CellInfo {
  answer: string;
  isFixed: boolean;
  wordIds: number[];
}

interface CellState {
  placed: string | null;
  isCorrect: boolean;
  shaking: boolean;
}

interface Tile {
  id: string;
  syllable: string;
  used: boolean;
}

const levels = levelsRaw as LevelDef[];

// 힌트 셀만으로 이뤄진 단어(유저 입력 불필요)의 id 목록
function getAutoCompleteIds(lv: LevelDef): number[] {
  const fixedSet = new Set(lv.fixedCells.map(f => `${f.row},${f.col}`));
  return lv.words
    .filter(w => w.syllables.every((_, i) => {
      const r = w.dir === 'h' ? w.row : w.row + i;
      const c = w.dir === 'h' ? w.col + i : w.col;
      return fixedSet.has(`${r},${c}`);
    }))
    .map(w => w.id);
}

const LS_KEY = 'crossword_level';

export default function CrosswordGame() {
  const navigate = useNavigate();
  const [levelIdx, setLevelIdx] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem(LS_KEY) ?? '0', 10);
    return isNaN(saved) || saved >= levels.length ? 0 : saved;
  });
  const level = levels[levelIdx];

  // Build "r,c" → CellInfo map from word definitions
  const cellInfoMap = useMemo<Record<string, CellInfo>>(() => {
    const map: Record<string, CellInfo> = {};
    for (const word of level.words) {
      for (let i = 0; i < word.syllables.length; i++) {
        const r = word.dir === 'h' ? word.row : word.row + i;
        const c = word.dir === 'h' ? word.col + i : word.col;
        const key = `${r},${c}`;
        if (!map[key]) map[key] = { answer: word.syllables[i], isFixed: false, wordIds: [] };
        if (!map[key].wordIds.includes(word.id)) map[key].wordIds.push(word.id);
      }
    }
    for (const fc of level.fixedCells) {
      const key = `${fc.row},${fc.col}`;
      if (map[key]) map[key].isFixed = true;
    }
    return map;
  }, [level]);

  const [tiles, setTiles] = useState<Tile[]>(
    () => level.tilePool.map((s, i) => ({ id: `t${i}`, syllable: s, used: false }))
  );
  const [cellStates, setCellStates] = useState<Record<string, CellState>>({});
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
  const [completedWordIds, setCompletedWordIds] = useState<Set<number>>(
    () => new Set(getAutoCompleteIds(level))
  );
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    if (completedWordIds.size === level.words.length && level.words.length > 0) {
      const t = setTimeout(() => setIsWon(true), 450);
      return () => clearTimeout(t);
    }
  }, [completedWordIds.size, level.words.length]);

  // Cells belonging to the currently selected word
  const selectedWordCells = useMemo<Set<string>>(() => {
    if (selectedWordId === null) return new Set();
    const word = level.words.find(w => w.id === selectedWordId);
    if (!word) return new Set();
    const set = new Set<string>();
    for (let i = 0; i < word.syllables.length; i++) {
      const r = word.dir === 'h' ? word.row : word.row + i;
      const c = word.dir === 'h' ? word.col + i : word.col;
      set.add(`${r},${c}`);
    }
    return set;
  }, [selectedWordId, level.words]);

  const getNextEmptyCell = useCallback(
    (word: WordDef, states: Record<string, CellState>) => {
      for (let i = 0; i < word.syllables.length; i++) {
        const r = word.dir === 'h' ? word.row : word.row + i;
        const c = word.dir === 'h' ? word.col + i : word.col;
        const key = `${r},${c}`;
        if (!cellInfoMap[key]?.isFixed && !states[key]?.placed) return { r, c, key };
      }
      return null;
    },
    [cellInfoMap]
  );

  // Cell click: remove placed tile (if already selected) OR select word (방안 3)
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      const key = `${r},${c}`;
      const info = cellInfoMap[key];
      if (!info || info.isFixed) return;

      const state = cellStates[key];

      // Clicking a selected, removable tile → remove it back to pool
      if (selectedWordCells.has(key) && state?.placed && !state.isCorrect) {
        const syl = state.placed;
        setCellStates(prev => ({ ...prev, [key]: { placed: null, isCorrect: false, shaking: false } }));
        setTiles(prev => {
          const idx = prev.findIndex(t => t.syllable === syl && t.used);
          return idx === -1 ? prev : prev.map((t, i) => i === idx ? { ...t, used: false } : t);
        });
        return;
      }

      // Toggle between words at an intersection; otherwise select first non-completed word
      if (info.wordIds.length > 1 && selectedWordId !== null && info.wordIds.includes(selectedWordId)) {
        const other = info.wordIds.find(id => id !== selectedWordId && !completedWordIds.has(id));
        if (other !== undefined) setSelectedWordId(other);
      } else {
        const first = info.wordIds.find(id => !completedWordIds.has(id));
        if (first !== undefined) setSelectedWordId(first);
      }
    },
    [cellInfoMap, cellStates, selectedWordCells, selectedWordId, completedWordIds]
  );

  // Tile click: place tile into next empty cell of selected word (방안 1), then validate
  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (tile.used || selectedWordId === null) return;
      const word = level.words.find(w => w.id === selectedWordId);
      if (!word || completedWordIds.has(word.id)) return;
      const nextCell = getNextEmptyCell(word, cellStates);
      if (!nextCell) return;

      const newCellStates: Record<string, CellState> = {
        ...cellStates,
        [nextCell.key]: { placed: tile.syllable, isCorrect: false, shaking: false },
      };

      // Validate every word that includes the just-placed cell
      const affectedWordIds = cellInfoMap[nextCell.key]?.wordIds ?? [];
      let finalStates = { ...newCellStates };
      const newlyCompleted: number[] = [];
      const wrongCellsMap: Record<string, string> = {};

      for (const wid of affectedWordIds) {
        if (completedWordIds.has(wid)) continue;
        const w = level.words.find(x => x.id === wid)!;

        const cells = w.syllables.map((syl, i) => {
          const r = w.dir === 'h' ? w.row : w.row + i;
          const c = w.dir === 'h' ? w.col + i : w.col;
          const k = `${r},${c}`;
          const info = cellInfoMap[k];
          const letter = info?.isFixed ? syl : (finalStates[k]?.placed ?? null);
          return { k, expected: syl, letter };
        });

        if (cells.some(cell => cell.letter === null)) continue; // not fully filled

        if (cells.every(cell => cell.letter === cell.expected)) {
          // Correct — lock cells
          cells.forEach(cell => {
            if (!cellInfoMap[cell.k]?.isFixed) {
              finalStates[cell.k] = { placed: cell.letter!, isCorrect: true, shaking: false };
            }
          });
          newlyCompleted.push(wid);
        } else {
          // Wrong — mark for shake & return
          cells.forEach(cell => {
            if (!cellInfoMap[cell.k]?.isFixed && cell.letter !== null && cell.letter !== cell.expected) {
              finalStates[cell.k] = { placed: cell.letter!, isCorrect: false, shaking: true };
              if (!wrongCellsMap[cell.k]) wrongCellsMap[cell.k] = cell.letter!;
            }
          });
        }
      }

      setCellStates(finalStates);
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, used: true } : t));

      if (newlyCompleted.length > 0) {
        setCompletedWordIds(prev => {
          const next = new Set(prev);
          newlyCompleted.forEach(id => next.add(id));
          return next;
        });
        setSelectedWordId(null);
      }

      // After shake animation, return wrong tiles to pool
      const wrongEntries = Object.entries(wrongCellsMap);
      if (wrongEntries.length > 0) {
        setTimeout(() => {
          const clearStates: Record<string, CellState> = {};
          wrongEntries.forEach(([k]) => {
            clearStates[k] = { placed: null, isCorrect: false, shaking: false };
          });
          setCellStates(prev => ({ ...prev, ...clearStates }));
          setTiles(prev => {
            const next = [...prev];
            wrongEntries.forEach(([, syl]) => {
              const idx = next.findIndex(t => t.syllable === syl && t.used);
              if (idx !== -1) next[idx] = { ...next[idx], used: false };
            });
            return next;
          });
        }, 650);
      }
    },
    [selectedWordId, level.words, completedWordIds, getNextEmptyCell, cellStates, cellInfoMap]
  );

  const reset = useCallback(() => {
    setCellStates({});
    setTiles(level.tilePool.map((s, i) => ({ id: `t${i}`, syllable: s, used: false })));
    setSelectedWordId(null);
    setCompletedWordIds(new Set(getAutoCompleteIds(level)));
    setIsWon(false);
  }, [level]);

  const goNextLevel = useCallback(() => {
    const next = Math.min(levelIdx + 1, levels.length - 1);
    localStorage.setItem(LS_KEY, String(next));
    setLevelIdx(next);
    setCellStates({});
    setSelectedWordId(null);
    setCompletedWordIds(new Set());
    setIsWon(false);
  }, [levelIdx]);

  // 레벨 변경 시 전체 상태 초기화
  useEffect(() => {
    setTiles(level.tilePool.map((s, i) => ({ id: `t${i}`, syllable: s, used: false })));
    setCellStates({});
    setSelectedWordId(null);
    setCompletedWordIds(new Set(getAutoCompleteIds(level)));
    setIsWon(false);
  }, [level]);

  // 실제 컨테이너 너비 측정 → 셀 크기 계산
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  useEffect(() => {
    const el = gridWrapperRef.current;
    if (!el) return;
    const update = () => setWrapperWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    const avail = (wrapperWidth || window.innerWidth) - 24;
    const gap = (level.gridCols - 1) * 4;
    return Math.min(52, Math.floor((avail - gap) / level.gridCols));
  }, [level.gridCols, wrapperWidth]);

  const fontSize = cellSize >= 48 ? '1.3rem' : cellSize >= 38 ? '1.05rem' : '0.9rem';

  return (
    <div className="crossword-outer">
    <div className="crossword-container">
      {/* Header */}
      <div className="crossword-header">
        <button className="crossword-back-btn" onClick={() => navigate('/')}>←</button>
        <span className="crossword-title">레벨 {level.id}</span>
        <button
          className="crossword-reset-btn"
          onClick={() => {
            if (!window.confirm('처음부터 다시 시작할까요?')) return;
            localStorage.removeItem(LS_KEY);
            setLevelIdx(0);
          }}
        >초기화</button>
      </div>

      {/* Grid */}
      <div className="crossword-grid-wrapper" ref={gridWrapperRef}>
        <div
          className="crossword-grid"
          style={{
            gridTemplateColumns: `repeat(${level.gridCols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${level.gridRows}, ${cellSize}px)`,
            fontSize,
          }}
        >
          {Array.from({ length: level.gridRows }, (_, r) =>
            Array.from({ length: level.gridCols }, (_, c) => {
              const key = `${r},${c}`;
              const info = cellInfoMap[key];
              const state = cellStates[key];
              const isHighlighted = selectedWordCells.has(key);
              const display = info?.isFixed ? info.answer : (state?.placed ?? null);

              if (!info) return <div key={key} className="crossword-cell blocked" />;

              const classes = ['crossword-cell', 'active'];
              if (info.isFixed) classes.push('fixed');
              else if (isHighlighted) classes.push('highlighted');
              if (state?.isCorrect) classes.push('correct');
              if (state?.shaking) classes.push('shaking');

              return (
                <div
                  key={key}
                  className={classes.join(' ')}
                  onClick={() => handleCellClick(r, c)}
                >
                  {display}
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* Tile pool — tap a tile to place it (방안 1) */}
      <div className="crossword-tile-pool">
        <div className="crossword-tiles">
          {tiles.map(tile => (
            <button
              key={tile.id}
              className={`crossword-tile${tile.used ? ' used' : ''}`}
              onClick={() => handleTileClick(tile)}
              disabled={tile.used}
            >
              {tile.syllable}
            </button>
          ))}
        </div>
      </div>

      {/* Win overlay */}
      {isWon && (
        <div className="crossword-win-overlay" onClick={() => setIsWon(false)}>
          <div className="crossword-win-card" onClick={e => e.stopPropagation()}>
            <div className="crossword-win-emoji">🎉</div>
            <h2>완성!</h2>
            <p>레벨 {level.id} 클리어!</p>
            <div className="crossword-win-actions">
              <button className="crossword-win-btn secondary" onClick={reset}>다시 풀기</button>
              {levelIdx < levels.length - 1
                ? <button className="crossword-win-btn" onClick={goNextLevel}>다음 레벨 →</button>
                : <button className="crossword-win-btn" onClick={() => navigate('/')}>처음으로</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
