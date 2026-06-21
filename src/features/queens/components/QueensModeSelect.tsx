import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Mini grid ─────────────────────────────────────────────────────────────────

const PALETTE = ['#F97316', '#60A5FA', '#4ADE80', '#A855F7'];
const CELL = 38;
const GAP = 2;

type GridCell = { color: number; queen?: boolean; conflict?: boolean; dimmed?: boolean };

function MiniGrid({ cells, n }: { cells: GridCell[][]; n: number }) {
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
          opacity: cell.dimmed ? 0.35 : 1,
          outline: cell.conflict ? '2.5px solid #ef4444' : undefined,
          outlineOffset: -2,
        }}>
          {cell.queen && <span style={{ fontSize: 18 }}>👑</span>}
        </div>
      )))}
    </div>
  );
}

// ── Rule visuals ──────────────────────────────────────────────────────────────

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
  {
    label: '규칙 1',
    title: '색상당 퀸 하나',
    desc: '각 색상 영역에 퀸을 딱 하나씩만 배치해야 합니다.',
    visual: <MiniGrid cells={rule1Cells} n={4} />,
  },
  {
    label: '규칙 2',
    title: '행 & 열에 퀸 하나',
    desc: '같은 가로줄(행)과 세로줄(열)에도 퀸이 하나씩만 있어야 해요.',
    visual: <MiniGrid cells={rule2Cells} n={4} />,
  },
  {
    label: '규칙 3',
    title: '퀸끼리 인접 불가',
    desc: '퀸끼리는 서로 닿을 수 없어요. 가로·세로·대각선 모두 해당됩니다.',
    visual: <MiniGrid cells={rule3Cells} n={3} />,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const QueensModeSelect: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('landing-bg');
    return () => { document.body.classList.remove('landing-bg'); };
  }, []);

  return (
    <div className="mode-select-page">
      <header className="mode-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </button>
        <h1>크라운 퀘스트</h1>
      </header>

      <div className="mode-grid">
        <div className="game-card" onClick={() => navigate('/queens/play')}>
          <div className="game-card-icon" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
            <img src="/crownquest_logo.png" alt="크라운 퀘스트" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </div>
          <div className="game-card-content">
            <h3>노말</h3>
            <p>스테이지를 순서대로 클리어하세요.</p>
          </div>
          <ChevronRight size={20} style={{ marginLeft: 'auto', color: '#94a3b8', flexShrink: 0 }} />
        </div>
      </div>

      {/* 게임 규칙 안내 */}
      <details
        style={{ padding: '0.5rem 1.5rem 3rem', maxWidth: '480px', margin: '0 auto', color: '#555', lineHeight: '1.8' }}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary style={{
          fontSize: '1.1rem', fontWeight: 700, color: '#444',
          cursor: 'pointer', listStyle: 'none',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          userSelect: 'none',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#888', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
          크라운 퀘스트 게임이란?
        </summary>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '12px', borderLeft: '3px solid #94a3b8' }}>
            크라운 퀘스트는 보드의 각 <strong>색상 영역·행·열</strong>에 왕관을 정확히 하나씩 배치하는 논리 퍼즐이에요.
            왕관끼리는 대각선을 포함해 인접할 수 없으며, 모든 조건을 동시에 만족시켜야 합니다.
            레벨이 올라갈수록 보드 크기가 커지고 배치 난이도가 높아져요!
          </p>
          {RULES.map(rule => (
            <div key={rule.label} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
            }}>
              <div style={{ flexShrink: 0 }}>{rule.visual}</div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  {rule.label}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>
                  {rule.title}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                  {rule.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default QueensModeSelect;
