import React from 'react';
import { ARROW_MAX_STAGE } from '../data/limits';

/**
 * 모드 선택 화면 아래의 "게임 설명" — 접었다 펼 수 있고, 규칙마다 게임 화면을 본뜬 작은 그림을 곁들인다.
 * 그림은 이미지 파일이 아니라 인라인 SVG 라서 따로 내려받을 것이 없고 해상도와 무관하게 선명하다.
 */

const W = 76;

/** 76x76 미니 판 — 실제 게임처럼 둥근 선(젤리) + 화살촉으로 그린다. */
const MiniBoard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} className="ap-about-mini" aria-hidden="true">
    <rect x="1" y="1" width={W - 2} height={W - 2} rx="12" fill="#f4efe3" stroke="#e2d8c0" strokeWidth="2" />
    {children}
  </svg>
);

/** 화살 한 줄 — 꼬리 → 머리 순서의 점 목록과 진행 방향(머리 쪽 삼각형) */
const Arrow: React.FC<{ pts: [number, number][]; dir: 'up' | 'down' | 'left' | 'right'; color: string }> = ({ pts, dir, color }) => {
  const [hx, hy] = pts[pts.length - 1];
  const head = {
    up: `${hx - 6},${hy + 3} ${hx},${hy - 8} ${hx + 6},${hy + 3}`,
    down: `${hx - 6},${hy - 3} ${hx},${hy + 8} ${hx + 6},${hy - 3}`,
    left: `${hx + 3},${hy - 6} ${hx - 8},${hy} ${hx + 3},${hy + 6}`,
    right: `${hx - 3},${hy - 6} ${hx + 8},${hy} ${hx - 3},${hy + 6}`,
  }[dir];
  return (
    <g>
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={head} fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
};

const Badge: React.FC<{ x: number; y: number; n: number }> = ({ x, y, n }) => (
  <g>
    <circle cx={x} cy={y} r="8" fill="#fff" stroke="#8a5a1e" strokeWidth="1.5" />
    <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#8a5a1e">{n}</text>
  </g>
);

// 탭 — 길이 열려 있는 화살을 누르면 그대로 날아간다
const MiniTap = () => (
  <MiniBoard>
    <Arrow pts={[[14, 56], [14, 30], [44, 30]]} dir="right" color="#f97316" />
    <Arrow pts={[[16, 14], [60, 14]]} dir="right" color="#3b82f6" />
    <text x="52" y="66" fontSize="20" transform="rotate(-20 52 60)">👆</text>
  </MiniBoard>
);

// 막힘 — 앞에 다른 화살이 있으면 못 나가고 밀렸다 돌아온다
const MiniBlocked = () => (
  <MiniBoard>
    <Arrow pts={[[10, 38], [40, 38]]} dir="right" color="#22c55e" />
    <Arrow pts={[[58, 62], [58, 18]]} dir="up" color="#a855f7" />
    <g stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round">
      <line x1="47" y1="32" x2="55" y2="44" />
      <line x1="55" y1="32" x2="47" y2="44" />
    </g>
  </MiniBoard>
);

// 순서 — 막는 것이 없는 화살부터 하나씩 빼내면 길이 열린다
const MiniOrder = () => (
  <MiniBoard>
    <Arrow pts={[[12, 60], [12, 18]]} dir="up" color="#3b82f6" />
    <Arrow pts={[[26, 22], [26, 52], [60, 52]]} dir="right" color="#f97316" />
    <Arrow pts={[[40, 12], [64, 12]]} dir="right" color="#22c55e" />
    <Badge x={12} y={66} n={2} />
    <Badge x={30} y={64} n={3} />
    <Badge x={48} y={24} n={1} />
  </MiniBoard>
);

// 별 — 빨리 깰수록 별이 늘어난다
const MiniStars = () => (
  <MiniBoard>
    <text x="38" y="34" textAnchor="middle" fontSize="20">⭐⭐⭐</text>
    <text x="38" y="58" textAnchor="middle" fontSize="13" fontWeight="800" fill="#8a5a1e">00:42</text>
  </MiniBoard>
);

const TIPS = [
  {
    label: '기본',
    title: '화살을 눌러 빼내기',
    desc: '화살을 누르면 머리가 향한 방향으로 쭉 날아가 판 밖으로 나갑니다. 판 위의 화살을 모두 빼내면 클리어예요.',
    visual: <MiniTap />,
  },
  {
    label: '막힘',
    title: '앞이 막히면 못 나가요',
    desc: '가는 길에 다른 화살이 있으면 살짝 밀렸다가 제자리로 돌아옵니다. 어떤 화살이 막고 있는지 보여 주는 신호예요.',
    visual: <MiniBlocked />,
  },
  {
    label: '요령',
    title: '열린 길부터 순서대로',
    desc: '앞이 비어 있는 화살부터 하나씩 빼내면 다른 화살의 길이 열립니다. 어디부터 풀 수 있는지 찾는 게 핵심이에요.',
    visual: <MiniOrder />,
  },
  {
    label: '스테이지',
    title: '빠를수록 별이 늘어요',
    desc: '클리어하면 별 1개, 목표 시간 안에 끝내면 별 2개·3개를 받아요. 스테이지가 올라갈수록 판이 커지고 화살이 늘어납니다.',
    visual: <MiniStars />,
  },
];

const ArrowAbout: React.FC = () => (
  <details className="ap-about">
    <summary>
      <span className="ap-about-arrow">▶</span>
      애로우웨이란?
    </summary>
    <div className="ap-about-body">
      <p className="ap-about-lead">
        애로우웨이는 서로 얽혀 있는 <strong>화살 모양의 젤리</strong>를 하나씩 눌러 판 밖으로 빼내는 퍼즐이에요.
        규칙은 단순하지만, <strong>어떤 화살이 어떤 화살의 길을 막고 있는지</strong> 찾아내는 재미가 있습니다.
        {ARROW_MAX_STAGE}개의 스테이지로 관찰력과 순서 찾기 실력을 마음껏 키워보세요!
      </p>
      {TIPS.map(tip => (
        <div key={tip.label} className="ap-about-card">
          <div className="ap-about-visual">{tip.visual}</div>
          <div>
            <div className="ap-about-label">{tip.label}</div>
            <div className="ap-about-title">{tip.title}</div>
            <div className="ap-about-desc">{tip.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </details>
);

export default ArrowAbout;
