import React from 'react';

type Props = {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

const TOTAL_STEPS = 4;

// ── Mini grid helpers ──────────────────────────────────────────────────────────

const PALETTE = ['#F97316', '#60A5FA', '#4ADE80', '#A855F7'];
const CELL = 40;
const GAP = 2;

type GridCell = { color: number; queen?: boolean; conflict?: boolean; dimmed?: boolean; hlRow?: boolean; hlCol?: boolean };

function MiniGrid({ cells, n, hlRow, hlCol }: {
  cells: GridCell[][];
  n: number;
  hlRow?: number;
  hlCol?: number;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${n}, ${CELL}px)`,
      gridTemplateRows: `repeat(${n}, ${CELL}px)`,
      gap: GAP,
      background: '#475569',
      padding: 3,
      borderRadius: 10,
    }}>
      {cells.map((row, r) => row.map((cell, c) => (
        <div key={`${r},${c}`} style={{
          background: PALETTE[cell.color],
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          opacity: cell.dimmed ? 0.35 : 1,
          outline: cell.conflict ? '2.5px solid #ef4444' : (r === hlRow || c === hlCol) ? '2px solid white' : undefined,
          outlineOffset: -2,
          position: 'relative',
          transition: 'opacity 0.15s',
        }}>
          {cell.queen && <span style={{ fontSize: 20, filter: cell.conflict ? 'none' : undefined }}>👑</span>}
        </div>
      )))}
    </div>
  );
}

// ── Step visuals ──────────────────────────────────────────────────────────────

// Step 1: 색상당 퀸 2개 — orange region (top-left) with 2 queens
const step1Cells: GridCell[][] = [
  [{ color: 0 }, { color: 0, queen: true }, { color: 1 }, { color: 1 }],
  [{ color: 0, queen: true }, { color: 0 }, { color: 1 }, { color: 1 }],
  [{ color: 2 }, { color: 2 }, { color: 3 }, { color: 3 }],
  [{ color: 2 }, { color: 2 }, { color: 3 }, { color: 3 }],
];

// Step 2: 행 & 열당 퀸 2개 — row 1 highlighted with queens, col 0 also has queen
const step2Cells: GridCell[][] = [
  [{ color: 0, dimmed: true }, { color: 0, dimmed: true }, { color: 1, dimmed: true }, { color: 1, dimmed: true }],
  [{ color: 0, queen: true }, { color: 0 }, { color: 1 }, { color: 1, queen: true }],
  [{ color: 2, dimmed: true }, { color: 2, dimmed: true }, { color: 3, dimmed: true }, { color: 3, dimmed: true }],
  [{ color: 2, queen: true }, { color: 2, dimmed: true }, { color: 3, dimmed: true }, { color: 3, queen: true }],
];

// Step 3: 인접 불가 — 3×3, queens diagonally adjacent → conflict
const step3Cells: GridCell[][] = [
  [{ color: 0 }, { color: 0, queen: true, conflict: true }, { color: 1 }],
  [{ color: 0 }, { color: 1 }, { color: 1, queen: true, conflict: true }],
  [{ color: 2 }, { color: 2 }, { color: 2 }],
];

// ── Step config ────────────────────────────────────────────────────────────────

type StepConfig = {
  label?: string;
  title: string;
  desc: string;
  visual: React.ReactNode;
};

const STEPS: StepConfig[] = [
  {
    title: '더블 모드에 오신 것을 환영합니다!',
    desc: '이번 레벨은 퀸이 2배!\n규칙을 하나씩 알아볼게요.',
    visual: <div style={{ fontSize: '4rem', lineHeight: 1 }}>👑👑</div>,
  },
  {
    label: '규칙 1 / 3',
    title: '색상당 퀸 2개',
    desc: '각 색상 영역에 퀸을 정확히\n2개씩 배치해야 합니다.',
    visual: <MiniGrid cells={step1Cells} n={4} />,
  },
  {
    label: '규칙 2 / 3',
    title: '행 & 열당 퀸 2개',
    desc: '같은 가로줄(행)과 세로줄(열)에도\n퀸이 정확히 2개씩 있어야 해요.',
    visual: <MiniGrid cells={step2Cells} n={4} hlRow={1} />,
  },
  {
    label: '규칙 3 / 3',
    title: '퀸끼리 인접 불가',
    desc: '퀸끼리는 서로 닿을 수 없어요.\n가로·세로·대각선 모두 포함이에요.',
    visual: <MiniGrid cells={step3Cells} n={3} />,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const DoubleIntroOverlay: React.FC<Props> = ({ step, onNext, onPrev, onClose }) => {
  const s = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div className="tut-intro-overlay" style={{ zIndex: 200 }}>
      <div className="dbl-intro-card">
        {/* Dots */}
        <div className="tut-rule-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`tut-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>

        {/* Label */}
        {s.label && <div className="tut-rule-label">{s.label}</div>}

        {/* Visual */}
        <div className="dbl-intro-visual">{s.visual}</div>

        {/* Title */}
        <h2 className="dbl-intro-title">{s.title}</h2>

        {/* Desc */}
        <p className="dbl-intro-desc">{s.desc.split('\n').map((line, i) => (
          <span key={i}>{line}{i === 0 && s.desc.includes('\n') && <br />}</span>
        ))}</p>

        {/* Navigation */}
        <div className="tut-rule-nav">
          {!isFirst && (
            <button className="tut-nav-btn tut-prev" onClick={onPrev}>이전</button>
          )}
          {isLast ? (
            <button className="tut-nav-btn tut-next" style={{ flex: 1 }} onClick={onClose}>시작하기 →</button>
          ) : (
            <button className="tut-nav-btn tut-next" style={{ flex: isFirst ? 1 : undefined }} onClick={onNext}>다음 →</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoubleIntroOverlay;
