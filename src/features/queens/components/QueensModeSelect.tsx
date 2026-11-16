import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation, Trans } from 'react-i18next';
import i18n from '../../../i18n';
import { localeHref } from '../../../i18n/locale';
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
  { label: i18n.t('queens:home.rule1.label'), title: i18n.t('queens:home.rule1.title'), desc: i18n.t('queens:home.rule1.desc'), visual: <MiniGrid cells={rule1Cells} n={4} /> },
  { label: i18n.t('queens:home.rule2.label'), title: i18n.t('queens:home.rule2.title'), desc: i18n.t('queens:home.rule2.desc'), visual: <MiniGrid cells={rule2Cells} n={4} /> },
  { label: i18n.t('queens:home.rule3.label'), title: i18n.t('queens:home.rule3.title'), desc: i18n.t('queens:home.rule3.desc'), visual: <MiniGrid cells={rule3Cells} n={3} /> },
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

const VISUALLY_HIDDEN: React.CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

const QueensModeSelect: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { queensProgress, isSynced } = useQueensProgress();
  const { coins } = useCoins();
  const { selectedIcon } = useQueensIcon();
  const { t } = useTranslation('queens');
  const { t: tc } = useTranslation('common');

  const cleared = Math.max(0, Math.min(queensProgress, MAX_LEVEL));
  const isFresh = queensProgress <= 0;
  const allDone = cleared >= MAX_LEVEL;
  const next = LEVELS[isFresh ? 0 : Math.min(cleared + 1, MAX_LEVEL)];
  const isDouble = next.queensPerColor === 2;

  return (
    <>
    <Helmet>
      <title>{t('home.metaTitle')}</title>
      <meta name="description" content={t('home.metaDesc', { max: MAX_LEVEL })} />
      <link rel="canonical" href={`https://puzzles.tmhub.co.kr${localeHref('/queens')}`} />
      <script type="application/ld+json">{JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: tc('brand'), item: `https://puzzles.tmhub.co.kr${localeHref('/')}` }, { '@type': 'ListItem', position: 2, name: tc('games.queens.name'), item: `https://puzzles.tmhub.co.kr${localeHref('/queens')}` }] })}</script>
    </Helmet>
    <div className="qh-root qq-home">
      <div className="qq-pattern" aria-hidden />
      <div className="qh-screen">
        <header className="qh-top">
          <button className="qq-ghost-btn" onClick={() => navigate('/')} aria-label={t('home.homeAria')}>
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
          {/* 게임 이름이 로고 글자(Crown Quest)와 똑같은 언어(영어, 브랜드명을 그대로 쓰는 언어)에선 h1을 화면에서만 숨긴다(SEO용 유지).
              일본어(クラウンクエスト)처럼 다르게 쓰는 언어는 한국어처럼 보여 준다. */}
          <h1 style={tc('games.queens.name') === 'Crown Quest' ? VISUALLY_HIDDEN : undefined}>{tc('games.queens.name')}</h1>
        </div>

        <button className="qh-card" onClick={() => { if (isSynced) navigate('/queens/play'); }} disabled={!isSynced} aria-label={t('home.startNextAria')}>
          <BoardPreview level={next} />
          <img className="qh-card-crown" src={getIconUrl(selectedIcon.id)} alt="" />
          {isDouble && <span className="qh-card-tag">{t('home.double')}</span>}
        </button>

        <div className="qh-meta">
          <span className="qh-big-no">{isFresh ? t('home.tutorial') : allDone ? t('home.allDone') : next.id}</span>
          <span className="qh-sub">
            {isFresh ? t('home.freshSub') : allDone ? t('home.allDoneSub') : `${next.size}×${next.size}${isDouble ? t('home.twoCrowns') : ''}`}
          </span>
        </div>

        <button className="qq-play-btn" onClick={() => navigate('/queens/play')} disabled={!isSynced}>
          {!isSynced ? t('home.loading') : <><Play size={26} strokeWidth={0} fill="currentColor" />{isFresh ? t('home.start') : t('home.play')}</>}
        </button>

        <div className="qh-progress">
          <b>{cleared}</b> / {MAX_LEVEL}
          <span className="sep" />
          {t('home.cleared')}
        </div>
      </div>

      {/* 게임 규칙 안내 */}
      <details className="qh-rules" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className={`qh-caret${open ? ' open' : ''}`}>▶</span>
          {t('home.whatIs')}
        </summary>
        <div className="qh-rules-body">
          <p className="qh-rules-intro">
            <Trans t={t} i18nKey="home.intro" />
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
