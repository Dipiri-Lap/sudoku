import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play } from 'lucide-react';
import { useQueensProgress } from '../../../context/QueensProgressContext';
import { useCoins } from '../../../context/CoinContext';
import { useQueensIcon, getIconUrl } from '../context/QueensIconContext';
import levels from '../data/levels.json';
import '../styles/QueensGame.css';
import '../styles/QueensHome.css';

type LevelData = { id: number; size: number; grid: number[][]; colors: string[]; queensPerColor?: number };
const LEVELS = levels as LevelData[];
const MAX_LEVEL = LEVELS.length - 1; // id 0 is the tutorial, not a playable stage

// ── Mini grid (rule illustrations) ─────────────────────────────────────────────

const PALETTE = ['#F97316', '#60A5FA', '#4ADE80', '#A855F7'];

type GridCell = { color: number; queen?: boolean; conflict?: boolean; dimmed?: boolean };

function MiniGrid({ cells, n }: { cells: GridCell[][]; n: number }) {
  return (
    <div className="qh-mini" style={{ gridTemplateColumns: `repeat(${n}, 32px)`, gridTemplateRows: `repeat(${n}, 32px)` }}>
      {cells.map((row, r) => row.map((cell, c) => (
        <div
          key={`${r},${c}`}
          className={`qh-mini-cell${cell.conflict ? ' conflict' : ''}`}
          style={{ background: PALETTE[cell.color], opacity: cell.dimmed ? 0.35 : 1 }}
        >
          {cell.queen && <span>👑</span>}
        </div>
      )))}
    </div>
  );
}

// Rule 1: 색상당 퀸 하나 — each color has exactly one queen
const rule1Cells: GridCell[][] = [
  [{ color: 0, queen: true }, { color: 0 }, { color: 1 }, { color: 1 }],
  [{ color: 0 }, { color: 0 }, { color: 1 }, { color: 1, queen: true }],
  [{ color: 2 }, { color: 2, queen: true }, { color: 3 }, { color: 3 }],
  [{ color: 2 }, { color: 2 }, { color: 3, queen: true }, { color: 3 }],
];

// Rule 2: 행·열에 퀸 하나 — one per row, one per column
const rule2Cells: GridCell[][] = [
  [{ color: 0, queen: true }, { color: 0, dimmed: true }, { color: 1, dimmed: true }, { color: 1, dimmed: true }],
  [{ color: 0, dimmed: true }, { color: 0, dimmed: true }, { color: 1, dimmed: true }, { color: 1, queen: true }],
  [{ color: 2, dimmed: true }, { color: 2, queen: true }, { color: 3, dimmed: true }, { color: 3, dimmed: true }],
  [{ color: 2, dimmed: true }, { color: 2, dimmed: true }, { color: 3, queen: true }, { color: 3, dimmed: true }],
];

// Rule 3: 인접 불가 — diagonal adjacent = conflict
const rule3Cells: GridCell[][] = [
  [{ color: 0 }, { color: 0, queen: true, conflict: true }, { color: 1 }],
  [{ color: 0 }, { color: 1 }, { color: 1, queen: true, conflict: true }],
  [{ color: 2 }, { color: 2 }, { color: 2 }],
];

const RULES = [
  { label: '규칙 1', title: '색상당 퀸 하나', desc: '각 색상 영역에 퀸을 딱 하나씩만 배치해야 합니다.', visual: <MiniGrid cells={rule1Cells} n={4} /> },
  { label: '규칙 2', title: '행 & 열에 퀸 하나', desc: '같은 가로줄(행)과 세로줄(열)에도 퀸이 하나씩만 있어야 해요.', visual: <MiniGrid cells={rule2Cells} n={4} /> },
  { label: '규칙 3', title: '퀸끼리 인접 불가', desc: '퀸끼리는 서로 닿을 수 없어요. 가로·세로·대각선 모두 해당됩니다.', visual: <MiniGrid cells={rule3Cells} n={3} /> },
];

// ── Next-stage preview ────────────────────────────────────────────────────────

function BoardPreview({ level }: { level: LevelData }) {
  const n = level.size;
  return (
    <div className="qh-preview" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)`, gap: n >= 10 ? 1 : 2 }}>
      {level.grid.flatMap((row, r) => row.map((ci, c) => (
        <i key={`${r},${c}`} style={{ background: level.colors[ci] }} />
      )))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const QueensModeSelect: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { queensProgress, isSynced } = useQueensProgress();
  const { coins } = useCoins();
  const { selectedIcon } = useQueensIcon();

  const cleared = Math.max(0, Math.min(queensProgress, MAX_LEVEL));
  const isFresh = queensProgress <= 0;
  const allDone = cleared >= MAX_LEVEL;
  const next = LEVELS[isFresh ? 0 : Math.min(cleared + 1, MAX_LEVEL)];
  const isDouble = next.queensPerColor === 2;

  return (
    <>
    <Helmet>
      <title>크라운 퀘스트 - 퀸즈 퍼즐 무료 게임 | 퍼즐 가든</title>
      <meta name="description" content={`색깔 영역마다 퀸을 하나씩, 행·열이 겹치지 않게 배치하는 논리 퍼즐. ${MAX_LEVEL}개 스테이지를 무료로 즐기세요.`} />
      <link rel="canonical" href="https://puzzles.tmhub.co.kr/queens" />
      <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"퍼즐 가든","item":"https://puzzles.tmhub.co.kr/"},{"@type":"ListItem","position":2,"name":"크라운 퀘스트","item":"https://puzzles.tmhub.co.kr/queens"}]}`}</script>
    </Helmet>
    <div className="qh-root qq-home">
      <div className="qq-pattern" aria-hidden />
      <div className="qh-screen">
        <header className="qh-top">
          <button className="qq-ghost-btn" onClick={() => navigate('/')} aria-label="퍼즐 가든 홈">
            <ChevronLeft size={32} strokeWidth={3.2} />
          </button>
          <div className="qh-coins">
            <img src="/coin_Icon.png" alt="" />
            <span>{coins.toLocaleString()}</span>
          </div>
        </header>

        <div className="qh-logo">
          <span className="l1">Crown</span>
          <span className="l2">Quest</span>
          <h1>크라운 퀘스트</h1>
        </div>

        <button className="qh-card" onClick={() => { if (isSynced) navigate('/queens/play'); }} disabled={!isSynced} aria-label="다음 스테이지 시작">
          <BoardPreview level={next} />
          <img className="qh-card-crown" src={getIconUrl(selectedIcon.id)} alt="" />
          {isDouble && <span className="qh-card-tag">더블</span>}
        </button>

        <div className="qh-meta">
          <span className="qh-big-no">{isFresh ? '튜토리얼' : allDone ? '완료!' : next.id}</span>
          <span className="qh-sub">
            {isFresh ? '규칙부터 차근차근' : allDone ? '모든 스테이지를 깼어요' : `${next.size}×${next.size}${isDouble ? ' · 왕관 2개씩' : ''}`}
          </span>
        </div>

        <button className="qq-play-btn" onClick={() => navigate('/queens/play')} disabled={!isSynced}>
          {!isSynced ? '불러오는 중...' : <><Play size={26} strokeWidth={0} fill="currentColor" />{isFresh ? '시작하기' : '플레이'}</>}
        </button>

        <div className="qh-progress">
          <b>{cleared}</b> / {MAX_LEVEL}
          <span className="sep" />
          클리어
        </div>
      </div>

      {/* 게임 규칙 안내 */}
      <details className="qh-rules" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className={`qh-caret${open ? ' open' : ''}`}>▶</span>
          크라운 퀘스트 게임이란?
        </summary>
        <div className="qh-rules-body">
          <p className="qh-rules-intro">
            크라운 퀘스트는 보드의 각 <strong>색상 영역·행·열</strong>에 왕관을 정확히 하나씩 배치하는 논리 퍼즐이에요.
            왕관끼리는 대각선을 포함해 인접할 수 없으며, 모든 조건을 동시에 만족시켜야 합니다.
            레벨이 올라갈수록 보드 크기가 커지고 배치 난이도가 높아져요!
          </p>
          {RULES.map(rule => (
            <div key={rule.label} className="qh-rule">
              <div className="qh-rule-visual">{rule.visual}</div>
              <div>
                <div className="qh-rule-label">{rule.label}</div>
                <div className="qh-rule-title">{rule.title}</div>
                <div className="qh-rule-desc">{rule.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
    </>
  );
};

export default QueensModeSelect;
