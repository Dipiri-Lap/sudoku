import React from 'react';
import { ART } from './theme';
import { elementById } from '../data/elements';

/**
 * 장애물 그림.
 *
 * 이모지로 두면 기기·브라우저마다 그림이 달라지고 크기도 제각각이라
 * 칸에 맞지 않는다. 인라인 SVG로 그리면 어디서나 같고, 색·겹 수에 반응시킬 수도
 * 있다. ART.blockers에 그림 경로를 넣으면 그쪽이 우선한다.
 */

interface Props {
  kind: string;
  layers: number;
  hidden?: boolean;
}

const VIEW = '0 0 100 100';

/** 보석 색 인덱스에 대응하는 색. 스프라이트 PNG와 눈으로 맞춘 값. */
const GEM_HEX = ['#ef4444', '#22c55e', '#3b82f6', '#facc15', '#a855f7', '#f97316'];

/** 겹이 남을수록 진하게 - 상태가 색으로도 읽혀야 한다 */
function wear(layers: number): number {
  return Math.min(1, 0.55 + layers * 0.15);
}

const Box: React.FC<{ layers: number }> = ({ layers }) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <defs>
      <linearGradient id="jk-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c2803c" />
        <stop offset="1" stopColor="#7c4a17" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="88" height="88" rx="10" fill="url(#jk-wood)" opacity={wear(layers)} />
    <rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="#5b3410" strokeWidth="5" />
    <path d="M12 30h76M12 70h76" stroke="#5b3410" strokeWidth="6" strokeLinecap="round" />
    <path d="M12 22h76" stroke="#e8b877" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const Crate: React.FC<{ layers: number }> = ({ layers }) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <rect x="8" y="14" width="84" height="72" rx="8" fill="#a16207" opacity={wear(layers)} />
    <rect x="8" y="14" width="84" height="72" rx="8" fill="none" stroke="#713f12" strokeWidth="5" />
    <path d="M8 50h84M50 14v72" stroke="#713f12" strokeWidth="5" />
    {/* 아래로 빠져나간다는 걸 화살표로 알린다 */}
    <path d="M50 62v14m0 0-8-8m8 8 8-8" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" fill="none" />
  </svg>
);

const Ice: React.FC<{ layers: number }> = ({ layers }) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <rect
      x="4"
      y="4"
      width="92"
      height="92"
      rx="12"
      fill="rgba(186,230,253,0.5)"
      stroke="rgba(224,242,254,0.95)"
      strokeWidth="5"
    />
    <path
      d="M20 30 46 14M80 34 58 18M18 66l24 18M82 62 60 82"
      stroke="rgba(255,255,255,0.85)"
      strokeWidth="4"
      strokeLinecap="round"
    />
    {layers > 1 && (
      <rect x="20" y="20" width="60" height="60" rx="8" fill="rgba(255,255,255,0.3)" />
    )}
  </svg>
);

const Golem: React.FC<{ layers: number }> = ({ layers }) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <defs>
      <linearGradient id="jk-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#78716c" />
        <stop offset="1" stopColor="#44403c" />
      </linearGradient>
    </defs>
    <path
      d="M22 26c0-9 7-14 14-14h28c7 0 14 5 14 14v42c0 10-8 18-18 18H40c-10 0-18-8-18-18z"
      fill="url(#jk-stone)"
      stroke="#292524"
      strokeWidth="5"
      opacity={wear(layers)}
    />
    <circle cx="38" cy="44" r="7" fill="#fb923c" />
    <circle cx="62" cy="44" r="7" fill="#fb923c" />
    <path d="M36 68h28" stroke="#292524" strokeWidth="5" strokeLinecap="round" />
    {/* 아래로 내려온다는 표시 */}
    <path d="M50 86v8" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const Mailbox: React.FC = () => (
  <svg viewBox={VIEW} className="jk-sprite">
    <rect x="18" y="30" width="64" height="46" rx="10" fill="#1d4ed8" stroke="#172554" strokeWidth="5" />
    <path d="M18 44h64" stroke="#bfdbfe" strokeWidth="5" />
    <rect x="42" y="12" width="16" height="22" rx="4" fill="#dc2626" stroke="#7f1d1d" strokeWidth="4" />
  </svg>
);

const Vault: React.FC = () => (
  <svg viewBox={VIEW} className="jk-sprite">
    <rect x="8" y="8" width="84" height="84" rx="12" fill="#334155" stroke="#0f172a" strokeWidth="5" />
    <text
      x="50"
      y="50"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="52"
      fontWeight="900"
      fill="#94a3b8"
    >
      ?
    </text>
  </svg>
);

const Rubble: React.FC = () => (
  <svg viewBox={VIEW} className="jk-sprite">
    <path d="M14 76l18-30 16 18 12-22 26 34z" fill="#57534e" stroke="#292524" strokeWidth="5" strokeLinejoin="round" />
    <circle cx="30" cy="34" r="9" fill="#78716c" stroke="#292524" strokeWidth="4" />
  </svg>
);

const BUILTIN: Record<string, React.FC<{ layers: number }>> = {
  box: Box,
  'crate-heavy': Crate,
  crate: Crate,
  ice: Ice,
  golem: Golem,
  'giant-golem': Golem,
  mailbox: () => <Mailbox />,
  vault: () => <Vault />,
  rubble: () => <Rubble />,
};

/**
 * 카탈로그에 있지만 전용 그림이 없는 요소들.
 * 색과 글자만으로 구분되게 만든다 - 40종에 각각 그림을 그리는 건
 * 아트 작업이고, 그때까지 "무엇인지 읽히기만" 하면 된다.
 */
const GENERIC_TINT: Record<string, string> = {
  generator: '#1d4ed8',
  container: '#3f2d16',
  blocker: '#7c4a17',
  special: '#4c1d95',
  upper: '#0ea5e9',
  lower: '#16a34a',
};

const Generic: React.FC<{ kind: string; layers: number }> = ({ kind, layers }) => {
  const def = elementById(kind);
  const tint = GENERIC_TINT[def?.category ?? 'blocker'] ?? '#7c4a17';
  const initial = (def?.label ?? kind).slice(0, 1);
  return (
    <svg viewBox={VIEW} className="jk-sprite">
      <rect x="8" y="8" width="84" height="84" rx="12" fill={tint} stroke="rgba(0,0,0,0.55)" strokeWidth="5" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="42"
        fontWeight="900"
        fill="rgba(255,255,255,0.92)"
      >
        {initial}
      </text>
      {layers > 1 && (
        <text x="78" y="82" textAnchor="middle" fontSize="26" fontWeight="900" fill="#fde68a">
          {layers}
        </text>
      )}
    </svg>
  );
};

export const BlockerSprite: React.FC<Props> = ({ kind, layers, hidden }) => {
  if (hidden) return <Vault />;
  const custom = ART.blockers[kind];
  if (custom) return <img className="jk-sprite" src={custom} alt="" draggable={false} />;
  const Drawn = BUILTIN[kind];
  return Drawn ? <Drawn layers={layers} /> : <Generic kind={kind} layers={layers} />;
};

/**
 * 상단 레이어.
 *
 * 모양이 셋으로 갈리는데 그냥 리스킨이 아니다 - 보는 순간 규칙이 달라야 한다.
 * 붙잡는 것(사슬·꿀)은 자물쇠를 달아 "이 보석은 못 옮긴다"를 알리고,
 * 가리는 것(구름)은 실제로 안이 안 보이게 불투명하게 덮는다.
 */
export const CoverSprite: React.FC<{
  kind?: string;
  layers: number;
  hides?: boolean;
  locks?: boolean;
}> = ({ kind, layers, hides, locks }) => {
  if (hides) return <Cloud layers={layers} />;

  const body =
    kind === 'honey' || kind === 'dark-honey' ? (
      <Honey layers={layers} dark={kind === 'dark-honey'} />
    ) : kind === 'chain' ? (
      <Chain />
    ) : kind && kind !== 'roof' ? (
      <Generic kind={kind} layers={layers} />
    ) : (
      <Ice layers={layers} />
    );

  if (!locks) return body;
  return (
    <>
      {body}
      <span className="jk-lock" aria-hidden>
        ⛓
      </span>
    </>
  );
};

/** 구름 - 아래가 안 보여야 하므로 불투명하게 덮는다 */
const Cloud: React.FC<{ layers: number }> = ({ layers }) => (
  <svg viewBox={VIEW} className="jk-cover-sprite">
    <rect x="0" y="0" width="100" height="100" rx="12" fill="#5b6480" />
    <circle cx="34" cy="58" r="22" fill="#aab4cc" />
    <circle cx="60" cy="52" r="26" fill="#c3cbe0" />
    <circle cx="76" cy="64" r="18" fill="#aab4cc" />
    <rect x="14" y="64" width="72" height="20" rx="10" fill="#c3cbe0" />
    {layers > 1 && (
      <text x="50" y="46" textAnchor="middle" fontSize="26" fontWeight="700" fill="#3a4159">
        {layers}
      </text>
    )}
  </svg>
);

/** 꿀 - 붙잡는 덮개. 얼음과 달리 보석을 못 옮긴다 */
const Honey: React.FC<{ layers: number; dark: boolean }> = ({ layers, dark }) => (
  <svg viewBox={VIEW} className="jk-cover-sprite">
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="12"
      fill={dark ? 'rgba(120, 72, 16, 0.82)' : 'rgba(245, 176, 32, 0.7)'}
    />
    <path
      d="M0 24 q12 14 24 0 q12 -14 24 0 q12 14 24 0 q12 -14 24 0 L100 0 L0 0 Z"
      fill={dark ? 'rgba(90, 52, 8, 0.9)' : 'rgba(255, 205, 92, 0.9)'}
    />
    {layers > 1 && (
      <text x="50" y="70" textAnchor="middle" fontSize="30" fontWeight="800" fill="#fff">
        {layers}
      </text>
    )}
  </svg>
);

/** 사슬 - 격자로 묶여 있어 못 움직인다 */
const Chain: React.FC = () => (
  <svg viewBox={VIEW} className="jk-cover-sprite">
    <rect x="0" y="42" width="100" height="16" rx="8" fill="#8d93a6" />
    <rect x="42" y="0" width="16" height="100" rx="8" fill="#8d93a6" />
    <circle cx="50" cy="50" r="13" fill="#c8cdda" />
  </svg>
);

/** 하단 레이어(잔디·젤리). 보석 **아래** 깔리므로 칸 전체를 채운다. */
export const GroundSprite: React.FC<{ kind: string; layers: number }> = ({ kind, layers }) => (
  <svg viewBox={VIEW} className="jk-ground-sprite" preserveAspectRatio="none">
    <rect
      x="0"
      y="0"
      width="100"
      height="100"
      rx="10"
      fill={kind === 'jelly' ? '#c084fc' : '#4ade80'}
      opacity={layers > 1 ? 0.85 : 0.55}
    />
    {layers > 1 && (
      <rect x="14" y="14" width="72" height="72" rx="8" fill="rgba(255,255,255,0.25)" />
    )}
  </svg>
);

/** 그릇(선반). 받을 색과 남은 개수가 보여야 한다. */
export const CollectorSprite: React.FC<{ color: number | null; left: number }> = ({
  color,
  left,
}) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <path
      d="M8 40h84v46a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z"
      fill="#3f2d16"
      stroke="#a98029"
      strokeWidth="5"
    />
    <path d="M4 34h92v10H4z" fill="#a98029" />
    {color !== null && (
      <circle cx="50" cy="66" r="13" fill={GEM_HEX[color]} stroke="rgba(0,0,0,0.4)" strokeWidth="3" />
    )}
    {left > 0 && (
      <text x="50" y="68" textAnchor="middle" dominantBaseline="central" fontSize="26" fontWeight="900" fill="#fff">
        {left}
      </text>
    )}
  </svg>
);

/**
 * 투입구(관). 그 열에 수집물이 내려온다는 걸 알린다.
 *
 * 칸 **위쪽 가장자리에만** 그린다. 칸 전체를 덮으면 그 자리 보석이 안 보여서
 * 플레이어가 "여기는 못 두는 칸"으로 읽는다. 투입구 칸도 보통 칸이라
 * 보석이 앉고 매치도 스왑도 된다 - 그게 보여야 한다.
 */
export const SpawnerSprite: React.FC<{ color: number }> = ({ color }) => (
  <svg viewBox="0 0 100 34" className="jk-spawner-sprite" preserveAspectRatio="none">
    <path d="M14 0h72v18a10 10 0 0 1-10 10H24a10 10 0 0 1-10-10z" fill="#64748b" stroke="#334155" strokeWidth="4" />
    <path d="M14 10h72" stroke="#94a3b8" strokeWidth="4" />
    <circle cx="50" cy="20" r="7" fill={GEM_HEX[color]} stroke="rgba(0,0,0,0.4)" strokeWidth="2.5" />
  </svg>
);

/** 수집물(트로피). 매치되지 않는 짐이라 보석과 확실히 달라 보여야 한다. */
export const CargoSprite: React.FC<{ color: number | null }> = ({ color }) => (
  <svg viewBox={VIEW} className="jk-sprite">
    <path
      d="M30 16h40v22a20 20 0 0 1-40 0z"
      fill={color !== null ? GEM_HEX[color] : '#fbbf24'}
      stroke="rgba(0,0,0,0.5)"
      strokeWidth="5"
    />
    <path d="M30 22H18a10 10 0 0 0 12 14M70 22h12a10 10 0 0 1-12 14" stroke="rgba(0,0,0,0.5)" strokeWidth="5" fill="none" />
    <path d="M44 58h12v14H44z" fill="rgba(0,0,0,0.35)" />
    <path d="M30 72h40v10H30z" fill="rgba(0,0,0,0.45)" rx="4" />
  </svg>
);

/** 부스터 아이콘. 판 위의 아이템과 모양을 맞춰 무엇이 나올지 읽히게 한다. */
export const BoosterSprite: React.FC<{ kind: string }> = ({ kind }) => {
  switch (kind) {
    case 'hammer':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <path d="M22 30h44v20H22z" fill="#94a3b8" stroke="#334155" strokeWidth="5" />
          <path d="M40 50h12v34H40z" fill="#a16207" stroke="#5b3410" strokeWidth="5" />
        </svg>
      );
    case 'rocket':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <path d="M50 10 68 42 50 58 32 42z" fill="#60a5fa" stroke="#1e3a8a" strokeWidth="5" strokeLinejoin="round" />
          <path d="M50 58v28m0 0-9-10m9 10 9-10" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'tnt':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <circle cx="50" cy="58" r="30" fill="#dc2626" stroke="#7f1d1d" strokeWidth="5" />
          <path d="M50 28c6-8 14-8 18-16" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'propeller':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <path d="M50 14 62 38 88 42 68 60 74 86 50 72 26 86 32 60 12 42 38 38z" fill="#fbbf24" stroke="#a16207" strokeWidth="5" strokeLinejoin="round" />
        </svg>
      );
    case 'lightball':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <circle cx="50" cy="50" r="30" fill="#f8fafc" stroke="#a78bfa" strokeWidth="5" />
          <path d="M50 22v56M22 50h56" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'shuffle':
      return (
        <svg viewBox={VIEW} className="jk-sprite">
          <path d="M18 32h20l28 36h16M18 68h20l28-36h16" stroke="#34d399" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M74 22l12 10-12 10M74 58l12 10-12 10" stroke="#34d399" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
};
