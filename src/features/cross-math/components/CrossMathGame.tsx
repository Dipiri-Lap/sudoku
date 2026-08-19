import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Lightbulb,
} from 'lucide-react';
import {
  DIFFICULTY_CONFIGS,
  type Difficulty,
  type CrossMathLevel,
  type GridCell,
} from '../utils/generator';
import { loadStage, prefetchStage } from '../stage/loader';
import { stageLevel, TOTAL_STAGES } from '../stage/schedule';
import { useCrossumProgress } from '../stage/progress';
import { extractEquations, evaluate } from '../stage/board';
import { useCoins } from '../../../context/CoinContext';
import '../styles/CrossMath.css';

interface Tile {
  id: number;
  value: number;
}

/** 타일 크기는 고정하고 자릿수가 많을 때 글자 크기만 줄인다. */
function digitClass(value: number): string {
  const len = String(value).length;
  if (len >= 4) return 'cm-d4';
  if (len === 3) return 'cm-d3';
  return '';
}

/** 다른 게임의 모드 선택 버튼과 같은 스타일/호버 동작 */
const modeBtnStyle = (delay: string): React.CSSProperties => ({
  '--delay': delay,
  width: '100%',
  borderRadius: 16,
  objectFit: 'cover',
  cursor: 'pointer',
  display: 'block',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
} as React.CSSProperties);

const hoverOn = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
};
const hoverOff = (e: React.MouseEvent<HTMLElement>) => {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
};

/** 힌트 1회 비용 */
const HINT_COST = 50;

/** 규칙 설명용 미니 수식 — 'B' 는 빈칸 */
function MiniRow({ cells }: { cells: string[] }) {
  const isOp = (v: string) => ['+', '-', '×', '÷', '='].includes(v);
  return (
    <div className="cm-rule-row">
      {cells.map((v, i) => (
        <span key={i} className={`cm-rule-cell ${v === 'B' ? 'cm-rule-blank' : isOp(v) ? 'cm-rule-op' : ''}`}>
          {v === 'B' ? '' : v}
        </span>
      ))}
    </div>
  );
}

const RULES = [
  {
    label: '규칙 1',
    title: '빈칸을 채워 식을 완성',
    desc: '아래 숫자 타일을 골라 빈칸에 넣습니다. 탭해서 놓거나 끌어다 놓아도 됩니다.',
    visual: <MiniRow cells={['12', '+', 'B', '=', '19']} />,
  },
  {
    label: '규칙 2',
    title: '가로와 세로가 함께 맞아야 함',
    desc: '한 숫자가 가로 식과 세로 식에 동시에 쓰입니다. 한 칸을 정하면 이어진 칸이 연쇄적으로 풀려요.',
    visual: <MiniRow cells={['B', '×', '3', '=', '24']} />,
  },
  {
    label: '규칙 3',
    title: '숫자가 넷인 식도 등장',
    desc: '501스테이지부터는 세 수를 계산하는 긴 식이 섞여 나옵니다. 왼쪽부터 차례로 계산해요.',
    visual: <MiniRow cells={['7', '+', 'B', '-', '4', '=', '11']} />,
  },
];

const POOL_COLS = 8;
const MIN_CELL_PX = 16;
const MAX_CELL_PX = 54;
const ZOOM_FACTOR = 1.6;

const CrossMathGame: React.FC = () => {
  const navigate = useNavigate();

  type Screen = 'mode' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>('mode');
  /** 스테이지 모드로 플레이 중일 때의 번호. 자유 모드면 null */
  const [stage, setStage] = useState<number | null>(null);
  const { stageProgress, clearStage } = useCrossumProgress();
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const [testStage, setTestStage] = useState('1');
  const [aboutOpen, setAboutOpen] = useState(false);

  const { coins, spendCoins } = useCoins();
  /** 힌트 안내 창 — confirm(코인 사용) / ad(광고 시청) / insufficient(코인 부족) */
  const [hintPrompt, setHintPrompt] = useState<'confirm' | 'ad' | 'insufficient' | null>(null);
  const [adWatching, setAdWatching] = useState(false);
  const [pendingShowAd, setPendingShowAd] = useState<(() => void) | null>(null);
  /** 광고는 한 판에 한 번만 — 워드스택과 같은 규칙 */
  const [adUsedThisStage, setAdUsedThisStage] = useState(false);
  /** 힌트 대기 상태 — 빈칸이 하이라이트되고, 고른 칸이 정답으로 채워진다 */
  const [hintMode, setHintMode] = useState(false);
  /** 광고로 얻어둔 무료 힌트 1회 (아직 안 쓴 것) */
  const [adHintCredit, setAdHintCredit] = useState(false);

  /**
   * 풀 타일 드래그. Pointer Events 하나로 마우스·터치를 함께 처리한다.
   * 살짝 눌렀다 뗀 경우는 드래그가 아니라 기존의 '탭해서 선택'으로 넘긴다.
   */
  const [drag, setDrag] = useState<{ tile: Tile; x: number; y: number; overKey: string | null } | null>(null);
  const dragStartRef = useRef<{ tile: Tile; x: number; y: number; moved: boolean } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [level, setLevel] = useState<CrossMathLevel | null>(null);
  // 풀의 표시 순서는 레벨을 불러올 때 한 번만 정하고 바꾸지 않는다.
  // 타일을 뺐다 넣어도 자리가 튀지 않도록, 보이는 목록은 여기서 파생시킨다.
  const [poolOrder, setPoolOrder] = useState<Tile[]>([]);
  const [placements, setPlacements] = useState<Record<string, Tile>>({});
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  /** 먼저 고른 빈칸. 숫자 → 칸, 칸 → 숫자 두 순서 모두 지원하기 위한 것 */
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  // 모드 선택 화면에서만 공통 배경(퍼즐 타일)을 쓴다 — 다른 게임의 모드 선택과 동일
  useEffect(() => {
    if (screen !== 'mode') return;
    document.body.classList.add('landing-bg');
    return () => { document.body.classList.remove('landing-bg'); };
  }, [screen]);

  // 보드가 실제로 쓸 수 있는 영역을 직접 측정한다.
  // 상단바/액션바 높이를 상수로 추측하지 않으므로 창 크기·회전·글꼴 변화에 그대로 따라간다.
  const boardViewportRef = useRef<HTMLDivElement>(null);
  const [boardBox, setBoardBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setBoardBox(prev =>
        Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
          ? prev
          : { w: width, h: height }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen]);

  const cellMap = useMemo(() => {
    const m = new Map<string, GridCell>();
    if (level) for (const c of level.cells) m.set(`${c.row},${c.col}`, c);
    return m;
  }, [level]);

  const blankCells = useMemo(
    () => (level ? level.cells.filter(c => c.type === 'num' && c.isBlank) : []),
    [level]
  );

  /** 아직 안 채운 빈칸 수 — 훅 안에서도 써야 해서 여기서 계산한다 */
  const remainingBlanks = useMemo(
    () => blankCells.filter(c => !placements[`${c.row},${c.col}`]).length,
    [blankCells, placements]
  );

  const placedIds = useMemo(
    () => new Set(Object.values(placements).map(t => t.id)),
    [placements]
  );

  const pool = useMemo(() => poolOrder.filter(t => !placedIds.has(t.id)), [poolOrder, placedIds]);

  const equations = useMemo(() => (level ? extractEquations(level) : []), [level]);

  /**
   * 칸별 표시 상태.
   *  solved — 식이 다 채워졌고 계산도 맞음 → 줄 전체를 녹색
   *  broken — 식이 다 채워졌는데 계산이 틀림 → 빨강
   *  (그 외 놓인 타일은 판정 보류 상태로, 풀 타일과 같은 녹색 계열)
   *
   * 판정 기준은 "원래 정답과 같은지"가 아니라 "식이 실제로 성립하는지"다.
   * 원래 정답이 아니어도 식만 맞으면 맞는 것으로 본다.
   */
  const cellState = useMemo(() => {
    const valueAt = (k: string): number | undefined => {
      const cell = cellMap.get(k);
      if (!cell) return undefined;
      return cell.isBlank ? placements[k]?.value : cell.value;
    };

    const solved = new Set<string>();
    const broken = new Set<string>();
    let allValid = equations.length > 0;

    for (const eq of equations) {
      const values = eq.numKeys.map(valueAt);
      if (values.some(v => v === undefined)) { allValid = false; continue; }
      const nums = values as number[];
      const ok = evaluate(nums.slice(0, -1), eq.operators) === nums[nums.length - 1];
      if (!ok) allValid = false;

      // 빈칸이 하나도 없는 식은 처음부터 완성 상태다. 색을 입히면 아무것도 안 했는데
      // 녹색이 떠 있어서 오해를 준다. 플레이어가 채워야 하는 식만 표시한다.
      const ownBlanks = eq.numKeys.filter(k => cellMap.get(k)?.isBlank);
      if (ownBlanks.length === 0) continue;

      // 맞으면 줄 전체를 녹색으로, 틀리면 플레이어가 놓은 칸만 빨갛게.
      // 주어진 숫자나 연산자까지 빨개지면 마치 문제가 잘못된 것처럼 보인다.
      if (ok) for (const k of eq.cellKeys) solved.add(k);
      else for (const k of ownBlanks) broken.add(k);
    }
    return { solved, broken, allValid };
  }, [equations, cellMap, placements]);

  const isWinner = useMemo(
    // 빈칸을 모두 채웠고 모든 식이 성립하면 승리.
    // 정답표와 대조하지 않으므로, 같은 타일로 만든 다른 정답도 인정된다.
    () => blankCells.length > 0 && blankCells.every(c => placements[`${c.row},${c.col}`]) && cellState.allValid,
    [blankCells, placements, cellState]
  );

  const loadLevel = useCallback((lvl: CrossMathLevel) => {
    setLevel(lvl);
    const blanks = lvl.cells.filter(c => c.type === 'num' && c.isBlank);
    setPoolOrder(
      blanks
        .map((c, i) => ({ id: i, value: c.value! }))
        .sort((a, b) => b.value - a.value) // 내림차순 정렬 — 정답 위치가 드러나지 않으면서 순서가 고정된다
    );
    setPlacements({});
    setSelectedTileId(null);
    setSelectedCellKey(null);
    setZoomed(false);
    setAdUsedThisStage(false);
    setHintPrompt(null);
    setHintMode(false);
    setAdHintCredit(false);
  }, []);

  // 스테이지를 깨면 진행도를 한 칸 올린다. 렌더 중 상태를 바꾸지 않도록 effect에서 처리한다.
  useEffect(() => {
    if (isWinner && stage !== null) clearStage(stage);
  }, [isWinner, stage, clearStage]);

  const runStage = useCallback(async (n: number) => {
    setStage(n);
    setDifficulty(`lv${stageLevel(n)}` as Difficulty);
    setScreen('generating');
    setError(null);
    try {
      loadLevel(await loadStage(n));
      setScreen('playing');
      prefetchStage(n + 1); // 다음 묶음을 미리 받아 둔다
    } catch (e) {
      setError(e instanceof Error ? e.message : '스테이지를 불러오지 못했습니다.');
      setScreen('mode');
    }
  }, [loadLevel]);

  const handleReset = useCallback(() => {
    if (level) loadLevel(level);
  }, [level, loadLevel]);

  /** 빈칸에 타일을 놓고 선택 상태를 모두 푼다 */
  const place = useCallback((key: string, tile: Tile) => {
    setPlacements(prev => ({ ...prev, [key]: tile }));
    setSelectedTileId(null);
    setSelectedCellKey(null);
  }, []);

  const handleTileClick = useCallback((tile: Tile) => {
    // 빈칸을 먼저 골라 둔 상태면 바로 놓는다 (칸 → 숫자 순서)
    if (selectedCellKey !== null) {
      place(selectedCellKey, tile);
      return;
    }
    setSelectedTileId(prev => (prev === tile.id ? null : tile.id));
  }, [selectedCellKey, place]);

  /** 셀에서 타일을 빼낸다. 풀은 placements에서 파생되므로 따로 되돌릴 필요가 없다. */
  const takeBack = useCallback((key: string) => {
    setPlacements(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /**
   * 고른 빈칸을 정답으로 채운다.
   * 정답 값의 타일이 풀에 없으면(다른 칸에 잘못 놓아둔 경우) 그 칸에서 회수해 온다.
   */
  const revealCell = useCallback((key: string) => {
    const answer = cellMap.get(key)?.value;
    if (answer === undefined) return false;

    const fromPool = pool.find(t => t.value === answer);
    if (fromPool) {
      place(key, fromPool);
      return true;
    }
    const misplaced = Object.entries(placements).find(([k, t]) => k !== key && t.value === answer);
    if (!misplaced) return false;
    setPlacements(prev => {
      const next = { ...prev };
      delete next[misplaced[0]];
      next[key] = misplaced[1];
      return next;
    });
    setSelectedTileId(null);
    setSelectedCellKey(null);
    return true;
  }, [cellMap, pool, placements, place]);

  /** 힌트 대기 상태에서 빈칸을 골랐을 때 */
  const applyHintTo = useCallback(async (key: string) => {
    if (adHintCredit) {
      if (revealCell(key)) { setAdHintCredit(false); setHintMode(false); }
      return;
    }
    if (!(await spendCoins(HINT_COST))) {
      setHintMode(false);
      setHintPrompt('insufficient');
      return;
    }
    revealCell(key);
    setHintMode(false);
  }, [adHintCredit, revealCell, spendCoins]);

  const DRAG_THRESHOLD = 6;

  /** 화면 좌표 아래에 있는 '비어 있는 빈칸'의 키를 찾는다 */
  const dropTargetAt = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-cell]') as HTMLElement | null;
    const key = el?.dataset.cell;
    return key && !placements[key] ? key : null;
  }, [placements]);

  const handleTilePointerDown = useCallback((e: React.PointerEvent, tile: Tile) => {
    if (hintMode) return;
    dragStartRef.current = { tile, x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [hintMode]);

  const handleTilePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    if (!start.moved) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
      start.moved = true;
      setSelectedTileId(null);
      setSelectedCellKey(null);
    }
    setDrag({ tile: start.tile, x: e.clientX, y: e.clientY, overKey: dropTargetAt(e.clientX, e.clientY) });
  }, [dropTargetAt]);

  const handleTilePointerUp = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDrag(null);
    if (!start) return;

    // 움직이지 않았으면 탭으로 본다. click 이벤트에 맡기면 드래그 직후의
    // 합성 click 과 구분이 안 돼서, 여기서 직접 처리한다.
    if (!start.moved) { handleTileClick(start.tile); return; }

    const key = dropTargetAt(e.clientX, e.clientY);
    if (key) place(key, start.tile);
  }, [dropTargetAt, place, handleTileClick]);

  const handleCellClick = useCallback((key: string) => {
    // 힌트 대기 중에는 빈칸만 반응한다
    if (hintMode) {
      if (!placements[key]) void applyHintTo(key);
      return;
    }
    if (placements[key]) {
      takeBack(key);
      setSelectedCellKey(null);
      return;
    }
    // 숫자를 먼저 골라 둔 상태면 바로 놓는다 (숫자 → 칸 순서)
    if (selectedTileId !== null) {
      const tile = pool.find(t => t.id === selectedTileId);
      if (tile) place(key, tile);
      return;
    }
    // 아무것도 고르지 않았으면 이 칸을 골라 둔다
    setSelectedCellKey(prev => (prev === key ? null : key));
  }, [hintMode, applyHintTo, placements, pool, selectedTileId, takeBack, place]);

  /** 워드스택과 동일: 코인이 있으면 확인 후 차감, 없으면 광고 시청(판당 1회) */
  const handleWatchAd = useCallback((onSuccess: () => void) => {
    if (adWatching) return;

    const proceed = () => {
      setAdUsedThisStage(true);
      setHintPrompt(null);
      onSuccess();
    };

    if (import.meta.env.DEV || !window.adBreak) {
      setAdWatching(true);
      setTimeout(() => { proceed(); setAdWatching(false); }, 1000);
      return;
    }

    window.adBreak({
      type: 'reward',
      name: 'crossum-hint',
      beforeReward: (showAdFn: () => void) => { setPendingShowAd(() => showAdFn); },
      beforeAd: () => { setAdWatching(true); setPendingShowAd(null); },
      afterAd: () => { setAdWatching(false); },
      adViewed: proceed,
      adDismissed: () => { alert('광고를 끝까지 시청해야 힌트를 쓸 수 있어요.'); },
      adBreakDone: (info: { status: string }) => {
        setAdWatching(false);
        setPendingShowAd(null);
        if (info.status === 'noAdPreloaded') alert('현재 준비된 광고가 없습니다. 잠시 후 시도해주세요.');
      },
    });
  }, [adWatching]);

  const handleHint = useCallback(() => {
    if (hintMode) { setHintMode(false); return; }   // 다시 누르면 취소
    if (remainingBlanks === 0) return;
    if (adHintCredit) { setHintMode(true); return; } // 광고로 받아둔 무료 1회
    if (coins < HINT_COST) {
      setHintPrompt(adUsedThisStage ? 'insufficient' : 'ad');
      return;
    }
    setHintPrompt('confirm');
  }, [hintMode, adHintCredit, coins, adUsedThisStage, remainingBlanks]);

  // 코인은 실제로 칸을 고르는 순간에 빠져나간다 — 켜두고 취소해도 손해가 없다.
  const confirmHintWithCoins = useCallback(() => {
    setHintPrompt(null);
    setHintMode(true);
  }, []);

  // ── 모드 선택 화면 ────────────────────────────────────────────────────────
  // 다른 게임(스도쿠 등)의 모드 선택과 같은 공통 껍데기를 쓴다.
  // landing-bg + .mode-select-page / .mode-header / .mode-grid

  if (screen === 'mode') {
    return (
      <div className="mode-select-page">
        <header className="mode-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={24} />
          </button>
          <h1>크로썸</h1>
        </header>

        {error && <div className="cm-error">{error}</div>}

        <div className="mode-grid">
          {/* 스테이지 모드 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <img
              src="/images/crossum/stage.webp"
              alt="스테이지 모드"
              className="animate-fade-in"
              style={modeBtnStyle('0.1s')}
              onClick={() => runStage(stageProgress)}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            />
            <span style={{ fontSize: '0.88rem', color: '#fda085', fontWeight: 700 }}>
              {stageProgress > 1
                ? `Level ${stageProgress}/${TOTAL_STAGES} 이어하기`
                : `Level 1/${TOTAL_STAGES} 시작하기`}
            </span>
          </div>

        </div>

        <details className="cm-about" onToggle={e => setAboutOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <span className={`cm-about-arrow ${aboutOpen ? 'cm-about-arrow-open' : ''}`}>▶</span>
            크로썸 게임이란?
          </summary>
          <div className="cm-about-body">
            <p className="cm-about-lead">
              크로썸은 십자말풀이처럼 <strong>가로·세로로 얽힌 수식</strong>의 빈칸을 숫자 타일로 채우는 계산 퍼즐이에요.
              어려운 암산이 필요한 게임이 아니라, <strong>어느 칸부터 풀 수 있는지 찾아내는 것</strong>이 핵심입니다.
              스테이지가 올라갈수록 격자가 넓어지고 곱셈·나눗셈이 차례로 등장해요.
            </p>
            {RULES.map(rule => (
              <div key={rule.label} className="cm-rule-card">
                <div className="cm-rule-visual">{rule.visual}</div>
                <div>
                  <div className="cm-rule-label">{rule.label}</div>
                  <div className="cm-rule-title">{rule.title}</div>
                  <div className="cm-rule-desc">{rule.desc}</div>
                </div>
              </div>
            ))}
            <p className="cm-about-tip">
              💡 25스테이지마다 <strong>부호만 주어지는 관문 문제</strong>가 나옵니다. 숫자가 하나도 없는 줄은
              교차하는 다른 식으로 풀어야 해요.
            </p>
          </div>
        </details>

        {isDev && (
          <div className="cm-devbox">
            <h4>테스트용 스테이지 바로가기</h4>
            <div className="cm-devbox-row">
              <input
                type="number"
                value={testStage}
                onChange={e => setTestStage(e.target.value)}
                placeholder="번호"
                min={1}
                max={TOTAL_STAGES}
              />
              <button
                onClick={() => {
                  const n = parseInt(testStage, 10);
                  if (n >= 1 && n <= TOTAL_STAGES) runStage(n);
                }}
              >
                플레이
              </button>
            </div>
          </div>
        )}
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
          <p>{stage !== null ? `스테이지 ${stage} 불러오는 중…` : '불러오는 중…'}</p>
        </div>
      </div>
    );
  }

  // ── 플레이 화면 ───────────────────────────────────────────────────────────

  const cfg = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;

  // 측정한 영역의 가로·세로 중 더 빡빡한 쪽에 맞춰 한 칸 크기를 정한다 → 항상 통째로 들어간다.
  const measured = boardBox.w > 0 && boardBox.h > 0;
  const fitCellPx = measured
    ? Math.max(
        MIN_CELL_PX,
        Math.min(
          MAX_CELL_PX,
          Math.floor((boardBox.w - (level.cols - 1)) / level.cols),
          Math.floor((boardBox.h - (level.rows - 1)) / level.rows)
        )
      )
    : 0;
  const cellPx = zoomed ? Math.round(fitCellPx * ZOOM_FACTOR) : fitCellPx;
  const fontPx = Math.max(11, Math.floor(cellPx * 0.46));

  return (
    <div className="cm-page">
      <header className="cm-topbar">
        <div className="cm-topbar-side">
          <button
            className="cm-icon-btn"
            onClick={() => setScreen('mode')}
            aria-label="모드 선택으로"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <span className="cm-topbar-title">{stage !== null ? `스테이지 ${stage}` : 'Crossum'}</span>

        <div className="cm-topbar-side cm-topbar-side-right">
          <span className="cm-coin" title="보유 코인">
            <img src="/coin_Icon.png" alt="" />
            {coins}
          </span>
        </div>
      </header>

      <section className="cm-board-panel">
        <div className="cm-board-viewport" ref={boardViewportRef}>
          <div className="cm-board-scroll">
          {measured && (
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

              // 완성된 줄은 빨강(틀림)이 녹색(맞음)보다 우선한다 — 가로·세로에 동시에 속할 수 있다
              const lineCls = cellState.broken.has(key)
                ? 'cm-cell-broken'
                : cellState.solved.has(key)
                  ? 'cm-cell-solved'
                  : '';

              if (cell.type === 'op') {
                return <div key={idx} className={`cm-cell cm-cell-op ${lineCls}`}>{cell.operator}</div>;
              }
              if (cell.type === 'eq') {
                return <div key={idx} className={`cm-cell cm-cell-eq ${lineCls}`}>=</div>;
              }
              if (!cell.isBlank) {
                return (
                  <div key={idx} className={`cm-cell cm-cell-given ${lineCls} ${digitClass(cell.value!)}`}>
                    {cell.value}
                  </div>
                );
              }
              const placed = placements[key];
              const filled = placed !== undefined;
              // 아직 줄이 완성되지 않았으면 맞고 틀림을 판정하지 않고 '놓인 상태'로만 보여준다
              const cls = filled
                ? lineCls || 'cm-cell-placed'
                : `cm-cell-slot ${hintMode ? 'cm-cell-hintable' : ''} ${selectedCellKey === key ? 'cm-cell-picked' : ''} ${drag?.overKey === key ? 'cm-cell-dropover' : ''}`;
              return (
                <div
                  key={idx}
                  data-cell={key}
                  className={`cm-cell cm-cell-blank ${cls} ${filled ? digitClass(placed.value) : ''}`}
                  onClick={() => handleCellClick(key)}
                >
                  {filled ? placed.value : ''}
                </div>
              );
            })}
          </div>
          )}
          </div>
        </div>

        {isWinner && (
          <div className="cm-clear-overlay">
            <div className="cm-clear-card">
              <div className="cm-clear-emoji">🎉</div>
              <h2>클리어!</h2>
              <p>스테이지 {stage} · Lv.{cfg?.level} {cfg?.label} 완료</p>
              <div className="cm-clear-btns">
                <button
                  className="cm-btn-primary"
                  onClick={() => stage !== null && runStage(stage + 1)}
                  disabled={stage === null || stage >= TOTAL_STAGES}
                >
                  다음 스테이지
                </button>
                <button className="cm-btn-secondary" onClick={handleReset}>
                  다시 시도
                </button>
              </div>
              <button className="cm-btn-text" onClick={() => setScreen('mode')}>
                모드 선택
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="cm-pool-panel">
        {/* 보드에 놓인 타일도 빈 자리로 남겨둔다 — 풀 높이가 변하지 않으므로 보드 크기가 흔들리지 않는다 */}
        <div className="cm-pool" style={{ gridTemplateColumns: `repeat(${POOL_COLS}, minmax(0, 1fr))` }}>
          {poolOrder.map(tile => {
            if (placedIds.has(tile.id)) return <span key={tile.id} className="cm-tile-hole" aria-hidden="true" />;
            return (
              <button
                key={tile.id}
                className={`cm-tile ${digitClass(tile.value)} ${selectedTileId === tile.id ? 'cm-tile-selected' : ''} ${drag?.tile.id === tile.id ? 'cm-tile-dragging' : ''}`}
                onPointerDown={e => handleTilePointerDown(e, tile)}
                onPointerMove={handleTilePointerMove}
                onPointerUp={handleTilePointerUp}
                onPointerCancel={() => { dragStartRef.current = null; setDrag(null); }}
                onClick={e => { if (e.detail === 0) handleTileClick(tile); }}
              >
                {tile.value}
              </button>
            );
          })}
        </div>
      </section>

      <nav className="cm-actionbar">
        <button
          className={`cm-action-btn cm-action-btn-accent ${hintMode ? 'cm-action-btn-on' : ''}`}
          onClick={handleHint}
          disabled={remainingBlanks === 0}
        >
          <Lightbulb size={22} />
          <span>{hintMode ? '취소' : '힌트'}</span>
        </button>
        {hintMode && <span className="cm-hint-guide">채울 칸을 고르세요</span>}
      </nav>

      {drag && (
        <div className={`cm-drag-ghost ${digitClass(drag.tile.value)}`} style={{ left: drag.x, top: drag.y }}>
          {drag.tile.value}
        </div>
      )}

      {hintPrompt && (
        <div className="cm-modal-backdrop" onClick={() => !adWatching && setHintPrompt(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            {hintPrompt === 'confirm' && (
              <>
                <h3>힌트 사용</h3>
                <p>코인 {HINT_COST}개를 사용해 빈칸 하나를 채웁니다.</p>
                <p className="cm-modal-sub">보유 코인 {coins}개</p>
                <div className="cm-modal-btns">
                  <button className="cm-btn-secondary" onClick={() => setHintPrompt(null)}>취소</button>
                  <button className="cm-btn-primary" onClick={confirmHintWithCoins}>사용</button>
                </div>
              </>
            )}

            {hintPrompt === 'ad' && (
              <>
                <h3>코인 부족</h3>
                <p>광고를 시청하고 코인 {HINT_COST}개를 획득해 바로 사용하시겠습니까?</p>
                <p className="cm-modal-sub">보유 코인 {coins}개 · 필요 {HINT_COST}개</p>
                <div className="cm-modal-btns">
                  <button className="cm-btn-secondary" onClick={() => setHintPrompt(null)} disabled={adWatching}>
                    취소
                  </button>
                  <button
                    className="cm-btn-primary"
                    disabled={adWatching}
                    onClick={() =>
                      pendingShowAd
                        ? pendingShowAd()
                        : handleWatchAd(() => { setAdHintCredit(true); setHintMode(true); })
                    }
                  >
                    {adWatching ? '로딩…' : '광고 시청'}
                  </button>
                </div>
              </>
            )}

            {hintPrompt === 'insufficient' && (
              <>
                <h3>코인이 부족해요</h3>
                <p>이번 판에서는 광고를 이미 시청했습니다.</p>
                <p className="cm-modal-sub">보유 코인 {coins}개 · 필요 {HINT_COST}개</p>
                <div className="cm-modal-btns">
                  <button className="cm-btn-primary" onClick={() => setHintPrompt(null)}>확인</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CrossMathGame;
