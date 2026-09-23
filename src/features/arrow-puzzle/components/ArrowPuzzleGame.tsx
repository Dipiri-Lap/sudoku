import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, RefreshCw, Store, ArrowRight, Heart, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { levels, stages, shapeStages, type PieceData, type LevelData, type Direction } from '../data/levels';
import { type Difficulty, DIFFICULTY_CONFIGS, generateLevelForDifficulty } from '../utils/levelGenerator';
import { useArrowConcept } from '../hooks/useArrowConcept';
import ArrowConceptShopModal from './ArrowConceptShopModal';
import { useCoins } from '../../../context/CoinContext';
import { auth } from '../../../firebase';
import '../styles/ArrowPuzzle.css';

const CLEAR_COIN_REWARD = 10; // 다른 게임과 동일한 클리어 보상 액수

const MAX_HEARTS = 3; // Mono 컨셉 전용: 막힌 조각을 누르면 하트가 줄어든다

const CELL_SIZE = 64;
const PADDING = 36;
const BOARD_INSET = 36;      // 판 배경이 격자보다 조금 더 넓게 깔리는 여유 — 화살촉이 빠져나가는 목(NECK) 길이까지 덮도록
const STROKE_W = 21;          // 칸(64)의 약 1/3 — 젤리는 가늘면 젤리로 안 보인다
const BULGE_MAX = CELL_SIZE * 0.24;  // 부딪힌 접점이 국소적으로 볼록해지는 최대 거리
const BOARD_RADIUS = 20; // 판 모서리 둥글기
// 판 외곽을 살짝 파인 듯 보이게 하는 겹겹의 테 — 바깥은 조금 진하고 안쪽으로 갈수록 옅어진다
const BOARD_BEVEL_RINGS: { inset: number; sw: number; color: string }[] = [
  { inset: 0, sw: 2, color: 'rgba(0,0,0,0.2)' },
  { inset: 2, sw: 2, color: 'rgba(0,0,0,0.05)' },
];
const BOARD_BEVEL_DEPTH = 3; // 벽 테가 차지하는 폭 — 바닥 하이라이트가 이 지점부터 시작된다
// ── 타일 판 ──
// 칸마다 높이가 있는 타일을 깔고, 화살표는 타일 윗면에만 그려진다(clipPath).
// 그래서 타일 사이 틈에서는 화살표가 끊겨 "타일에 그려진 그림"처럼 보인다.
const TILE_GAP = 5;           // 타일 사이 틈 — 여기엔 화살표가 그려지지 않는다
const TILE_RADIUS = 11;
const TILE_DEPTH = 7;         // 타일 아래로 깔리는 두께 — 높이감을 만든다
const GLOSS_RATIO = 0.26;    // 윗면 광택 (본체 두께 대비)
const SHADE_RATIO = 0.44;    // 아랫면 그늘
const ESCAPE_SPEED = 17;
// 탈출 시작 직전 — 활시위를 당기듯 천천히 뒤로 모았다가, 그 자리에서 바로 튕겨 나가는 예비 동작.
// 원위치로 먼저 돌아온 뒤에 출발하는 게 아니라, 당겨진 채로 있다가 발사 순간 그대로 전진이 붙는다
// — 당겨진 만큼(ANTICIPATION_PULL)을 빠른 ESCAPE_SPEED 가 순식간에 통과하면서 "쑝" 하고 튀어나간다.
const ANTICIPATION_TIME = 0.3;   // 초 — 뒤로 당기는 데 걸리는 시간
const ANTICIPATION_PULL = 0.16;  // 칸 단위 — 얼마나 뒤로 당겨지는지
const ANTICIPATION_SQUASH = 0.35; // 뒤로 당겨질수록 눌려서 옆으로 퍼지는 정도 — 높이는 줄고 너비는 는다

/** 뒤로 당기는 예비 동작의 frac — 처음엔 빠르게 당겨지다가 끝으로 갈수록 천천히 늦춰진다(ease-out). */
function anticipationFrac(t: number): number {
  const p = Math.min(1, t / ANTICIPATION_TIME);
  return -ANTICIPATION_PULL * (1 - (1 - p) ** 2);
}
const BUMP_OUT = 0.11;       // 막힐 때까지 밀고 나가는 시간(초)
const BUMP_BACK = 0.17;      // 물러나는 시간 — 나갈 때보다 느려야 "막혔다"로 읽힌다
const WOBBLE_TIME = 0.42;    // 부딪힌 뒤 출렁임이 잦아드는 시간(초)
// 덩어리 하나가 머리에서 꼬리까지 훑고 지나간 뒤 잠깐 쉬었다 반복한다.
const LUMP_LEN = 18;         // 덩어리 길이(사용자 단위) — 둥근 캡이 더해져 실제로는 더 길어 보인다
const LUMP_SPEED = 115;      // 이동 속도(단위/초). 길이와 무관하게 일정해야 자연스럽다
// 쉬는 구간은 거리로 적어두고 속도로 나눠 시간이 된다.
// 속도를 절반으로 낮췄으니 거리도 절반으로 줄여야 쉬는 '시간'이 그대로 유지된다.
const REST_MIN = 170;
const REST_MAX = 575;
const PULSE_MIN = 0.62;      // 지나가는 동안 덩어리가 커졌다 작아지는 주기(초)
const PULSE_MAX = 0.95;

/** 피스 id 로 만드는 고정 난수 (0~1). 리렌더마다 값이 흔들리면 애니메이션이 튄다. */
function idNoise(id: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  return ((h >>> 0) % 10007) / 10007;
}
// 화살촉 끝(= NECK + 촉 길이 0.3칸)이 타일 윗면 안에 들어와야 clip 에 잘리지 않는다.
// 타일 반폭이 (64-5)/2 ≈ 29.5 이므로 타일 컨셉에서는 목을 짧게 잡는다.
const NECK_TILE = CELL_SIZE * 0.13;
// 타일 없는 컨셉은 그런 제약이 없다 — 목을 넉넉히 잡아야 머리에서 바로 꺾이는 조각도
// 화살촉 앞에 눈에 보이는 직선 구간이 남아서 이쁘게 보인다(목이 파이프 두께보다 짧으면
// 곡선이 화살촉 코앞까지 이어져 확 꺾인 것처럼 보인다).
const NECK_OPEN = CELL_SIZE * 0.22;
const CORNER_R = CELL_SIZE * 0.42;

interface EscapingPiece extends PieceData {
  frac: number;
  /** 출발 후 경과 시간(초) — 튀어나갈 때의 출렁임 계산용 */
  t: number;
  /**
   * 판 가장자리를 실제로 넘어서는 지점 — 타격감 연출을 여기서 터뜨린다.
   * 완전히 사라진 시점의 위치를 쓰면 안 된다: 피스가 길면(여러 칸) 머리가
   * 가장자리를 넘고도 꼬리까지 다 빠지려면 몇 칸을 더 가야 하는데,
   * 그동안 몸 전체가 판 밖으로 계속 밀려나가 있다가(트림 없이 그대로 슬라이드)
   * 사라지는 순간엔 이미 가장자리에서 한참 벗어난 자리라 안 보이게 된다.
   */
  exitPoint: [number, number];
}

// 지금 스타일과 안 어울린다는 피드백으로 일단 보류 — 코드는 남겨두고 트리거만 끈다.
const BURST_FX = false;

/** 피스가 판을 완전히 빠져나가는 순간 터지는 타격감 연출 — 위치 하나만 있으면 되고 CSS 애니메이션이 끝나면 스스로 사라진다. */
interface BurstInfo {
  id: string;
  x: number;
  y: number;
  color: string;
  particles: { tx: number; ty: number }[];
}

const DIFFICULTIES: Difficulty[] = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'];

const modeBtnStyle = (delay: string): React.CSSProperties => ({
  '--delay': delay,
  width: '100%',
  borderRadius: 16,
  objectFit: 'cover' as const,
  cursor: 'pointer',
  display: 'block',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease',
} as React.CSSProperties);

const modeHoverOn = (e: React.MouseEvent<HTMLImageElement>) => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.2)';
};
const modeHoverOff = (e: React.MouseEvent<HTMLImageElement>) => {
  e.currentTarget.style.transform = '';
  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
};

function piecesLabel(min: number, max: number) {
  return min === max ? `${min} 피스` : `${min}–${max} 피스`;
}

function formatPlayTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 스테이지 버튼 아래 별점 — earned 개수만큼 채워서 보여준다. */
const StageStars: React.FC<{ earned?: number; size?: number }> = ({ earned = 0, size = 11 }) => (
  <span className="ap-stage-stars">
    {Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={`ap-stage-star${i < earned ? ' earned' : ''}`}
        fill={i < earned ? '#facc15' : 'none'}
      />
    ))}
  </span>
);

/**
 * 감쇠 진동. t=0 에서 +1(가장 두꺼움)로 시작해 흔들리며 0으로 잦아든다.
 * 젤리가 부딪히거나 튀어나갈 때의 물컹거림을 이 값 하나로 만든다.
 */
function wobble(t: number, tau: number, freq: number): number {
  if (t < 0) return 0;
  return Math.exp(-t / tau) * Math.cos(2 * Math.PI * freq * t);
}

function cellCenter(col: number, row: number): [number, number] {
  return [PADDING + col * CELL_SIZE + CELL_SIZE / 2, PADDING + row * CELL_SIZE + CELL_SIZE / 2];
}

/** 둥근 사각형 한 조각. 여러 칸을 이어 붙여 path 하나로 판 전체를 그린다(노드 수 절약). */
function roundedRectSubpath(x: number, y: number, size: number, r: number): string {
  const rr = Math.min(r, size / 2);
  return (
    `M${x + rr} ${y}` +
    `H${x + size - rr}A${rr} ${rr} 0 0 1 ${x + size} ${y + rr}` +
    `V${y + size - rr}A${rr} ${rr} 0 0 1 ${x + size - rr} ${y + size}` +
    `H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + size - rr}` +
    `V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`
  );
}

function advance(cell: [number, number], dir: Direction): [number, number] {
  const [c, r] = cell;
  switch (dir) {
    case 'right': return [c + 1, r];
    case 'left':  return [c - 1, r];
    case 'up':    return [c, r - 1];
    case 'down':  return [c, r + 1];
  }
}

function dirOffset(dir: Direction, amount: number): [number, number] {
  switch (dir) {
    case 'right': return [amount, 0];
    case 'left':  return [-amount, 0];
    case 'up':    return [0, -amount];
    case 'down':  return [0, amount];
  }
}

/** 피스가 지나갈 직선 위에서 실제로 판 가장자리를 넘는 지점(터짐 연출용 고정 좌표). */
function exitEdgePoint(head: [number, number], dir: Direction, cols: number, rows: number): [number, number] {
  const edgeCell: [number, number] =
    dir === 'right' ? [cols - 1, head[1]]
    : dir === 'left' ? [0, head[1]]
    : dir === 'up' ? [head[0], 0]
    : [head[0], rows - 1];
  const [cx, cy] = cellCenter(edgeCell[0], edgeCell[1]);
  const [dx, dy] = dirOffset(dir, CELL_SIZE / 2);
  return [cx + dx, cy + dy];
}

function toPathFromPts(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const next = pts[i + 1];
    if (!next) { d += ` L${cx} ${cy}`; continue; }
    const dx1 = cx - px, dy1 = cy - py;
    const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dx2 = next[0] - cx, dy2 = next[1] - cy;
    const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (l1 === 0 || l2 === 0) { d += ` L${cx} ${cy}`; continue; }
    const r = Math.min(CORNER_R, l1 * 0.5, l2 * 0.5);
    const ax = cx - (dx1 / l1) * r, ay = cy - (dy1 / l1) * r;
    const bx = cx + (dx2 / l2) * r, by = cy + (dy2 / l2) * r;
    d += ` L${ax} ${ay} Q${cx} ${cy} ${bx} ${by}`;
  }
  return d;
}

function toPath(cells: [number, number][], dir: Direction, neck: number): string {
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, neck);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(pts);
}

/** 폴리라인 앞쪽에서 길이 amount 만큼 잘라낸다 — 꼬리가 제 길을 따라 줄어들게. */
function trimFromStart(pts: [number, number][], amount: number): [number, number][] {
  if (amount <= 0) return pts;
  const out = [...pts];
  let left = amount;
  while (out.length >= 2) {
    const [ax, ay] = out[0];
    const [bx, by] = out[1];
    const seg = Math.hypot(bx - ax, by - ay);
    if (seg > left) {
      const t = left / seg;
      out[0] = [ax + (bx - ax) * t, ay + (by - ay) * t];
      return out;
    }
    left -= seg;
    out.shift();
  }
  return out;
}

/**
 * 피스를 제 길을 따라 frac 칸만큼 전진시킨 경로.
 * 머리는 진행 방향으로 뻗고 꼬리는 같은 길이만큼 뒤에서 줄어든다 — 몸통이 머리를 따라간다.
 * 탈출할 때만 쓴다 — 몸 전체가 슬라이드해서 빠져나가야 자연스럽다.
 */
function toPathAnimated(cells: [number, number][], dir: Direction, frac: number, neck: number): string {
  if (cells.length === 0) return '';
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + neck);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(trimFromStart(pts, frac * CELL_SIZE));
}

/**
 * 막혀서 밀렸다 물러나는 연출 전용 — 꼬리는 제자리에 그대로 두고 머리 쪽 목만
 * 국소적으로 늘어났다 줄어든다. toPathAnimated 와 달리 trimFromStart 를 하지
 * 않아서 몸통 전체가 밀리는 게 아니라 머리 부위만 볼록 나왔다 들어간 것처럼 보인다.
 */
function toPathBump(cells: [number, number][], dir: Direction, frac: number, neck: number): string {
  if (cells.length === 0) return '';
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + neck);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(pts);
}

/**
 * 부딪힌 쪽(블로커) 전용 — 접점이 된 칸 하나만 poke 방향으로 살짝 밀어 넣고
 * 나머지 점들 사이 라운드 코너 로직(toPathFromPts)에 맡기면 그 지점만
 * 국소적으로 볼록해진 자연스러운 곡선이 저절로 나온다.
 */
function toPathWithBulge(
  cells: [number, number][],
  dir: Direction,
  bulgeIdx: number,
  offset: [number, number],
  neck: number
): string {
  if (cells.length === 0) return '';
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  if (bulgeIdx >= 0 && bulgeIdx < pts.length) {
    pts[bulgeIdx] = [pts[bulgeIdx][0] + offset[0], pts[bulgeIdx][1] + offset[1]];
  }
  const [hx, hy] = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  const [dx, dy] = dirOffset(dir, neck);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(pts);
}

function neckTipStatic(head: [number, number], dir: Direction, neck: number): [number, number] {
  const [x, y] = cellCenter(head[0], head[1]);
  const [dx, dy] = dirOffset(dir, neck);
  return [x + dx, y + dy];
}

function neckTipAnimated(cells: [number, number][], dir: Direction, frac: number, neck: number): [number, number] {
  const [hx, hy] = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + neck);
  return [hx + dx, hy + dy];
}

/**
 * 젤리 화살촉. 꼭짓점은 strokeLinejoin=round 로 뭉개서 말랑하게 보이게 한다.
 * fat 은 몸통의 물컹거림과 같은 값 — 몸통이 부풀면 화살촉도 옆으로 퍼지고 짧아진다.
 * 화살촉만 크기가 고정이면 몸통과 따로 놀아서 변형이 어색해 보인다.
 */
function arrowPointsFromTip(tip: [number, number], dir: Direction, fat = 1): string {
  const [nx, ny] = tip;
  const fwd = (CELL_SIZE * 0.3) / fat;
  const spread = CELL_SIZE * 0.19 * fat;
  switch (dir) {
    case 'right': return `${nx},${ny - spread} ${nx + fwd},${ny} ${nx},${ny + spread}`;
    case 'left':  return `${nx},${ny - spread} ${nx - fwd},${ny} ${nx},${ny + spread}`;
    case 'up':    return `${nx - spread},${ny} ${nx},${ny - fwd} ${nx + spread},${ny}`;
    case 'down':  return `${nx - spread},${ny} ${nx},${ny + fwd} ${nx + spread},${ny}`;
  }
}

/**
 * 젤리 표면을 훑고 지나가는 꿀렁임을 켠다.
 *
 * 지금은 꺼 둔 상태다. 나중에 테마 옵션으로 뺄 자리 —
 * 이 값만 테마 설정에서 받아오게 바꾸면 되고, 렌더 쪽은 손댈 필요가 없다.
 * (주석으로 묻어두지 않은 이유: 주석 처리한 코드는 타입 검사도 린트도 지나가지 않아
 *  다시 켤 때쯤이면 주변 코드와 어긋나 있기 마련이다.)
 */
const JELLY_FLOW = false;

/**
 * 덩어리 하나가 머리에서 꼬리로 지나가는 레이어.
 *
 * 넓고 낮은 것 위에 좁고 높은 것을 겹쳐 봉우리가 완만해지게 한다.
 * 이동(jelly-ripple)과 변형(jelly-pulse)은 서로 다른 속성이라 두 애니메이션으로 겹쳐도
 * 타이밍이 간섭하지 않는다 — 이동은 피스 길이에, 변형은 제 주기에 따른다.
 */
const JellyFlow: React.FC<{
  d: string;
  color: string;
  sw: number;
  id: string;
  cellCount: number;
}> = ({ d, color, sw, id, cellCount }) => {
  // 덩어리가 지나갈 거리 = 머리 바깥에서 들어와 꼬리 바깥으로 빠질 때까지.
  // dash 가 경로 밖에 있으면 아무것도 그려지지 않으므로, 쉬는 구간은 따로 숨길 필요 없이
  // "경로 밖을 지나가는 시간"으로 저절로 만들어진다.
  const travel = (cellCount - 1) * CELL_SIZE + NECK_OPEN + LUMP_LEN * 2;
  // 쉬는 시간과 맥동 주기를 피스마다 흩어 놓아야 다 같은 박자로 꿀렁이지 않는다
  const rest = REST_MIN + idNoise(id, 1) * (REST_MAX - REST_MIN);
  const rippleDur = (travel + rest) / LUMP_SPEED;
  const pulseDur = PULSE_MIN + idNoise(id, 3) * (PULSE_MAX - PULSE_MIN);

  const style = (lumpW: number): React.CSSProperties => ({
    ['--lump-from' as string]: `${-travel}px`,
    ['--lump-to' as string]: `${rest}px`,
    ['--lump-w' as string]: `${lumpW}px`,
    animationDuration: `${rippleDur}s, ${pulseDur}s`,
    animationDelay: `${-idNoise(id, 2) * rippleDur}s, ${-idNoise(id, 4) * pulseDur}s`,
  });

  return (
    <>
      <path d={d} stroke={color} fill="none" strokeLinecap="round"
        className="ap-flow ap-flow-a" style={style(sw * 1.14)} />
      <path d={d} stroke={color} fill="none" strokeLinecap="round"
        className="ap-flow ap-flow-b" style={style(sw * 1.32)} />
    </>
  );
};

function isSelfBlocked(piece: PieceData): boolean {
  const n = piece.cells.length;
  const [hc, hr] = piece.cells[n - 1];
  for (let i = 0; i < n - 1; i++) {
    const [bc, br] = piece.cells[i];
    let dist = 0;
    switch (piece.exitDir) {
      case 'right': if (br === hr && bc > hc) dist = bc - hc; break;
      case 'left':  if (br === hr && bc < hc) dist = hc - bc; break;
      case 'up':    if (bc === hc && br < hr) dist = hr - br; break;
      case 'down':  if (bc === hc && br > hr) dist = br - hr; break;
    }
    if (dist > 0 && i >= dist) return true;
  }
  return false;
}

function canEscape(piece: PieceData, others: PieceData[], cols: number, rows: number): boolean {
  if (isSelfBlocked(piece)) return false;
  const occupied = new Set(others.flatMap(p => p.cells).map(([c, r]) => `${c},${r}`));
  const [hc, hr] = piece.cells[piece.cells.length - 1];
  switch (piece.exitDir) {
    case 'right': for (let c = hc + 1; c < cols; c++) { if (occupied.has(`${c},${hr}`)) return false; } return true;
    case 'left':  for (let c = hc - 1; c >= 0; c--)  { if (occupied.has(`${c},${hr}`)) return false; } return true;
    case 'up':    for (let r = hr - 1; r >= 0; r--)   { if (occupied.has(`${hc},${r}`)) return false; } return true;
    case 'down':  for (let r = hr + 1; r < rows; r++) { if (occupied.has(`${hc},${r}`)) return false; } return true;
  }
}

/**
 * 왜 못 나가는지 찾아낸다.
 * 머리 앞 직선을 훑어 처음 만나는 칸을 돌려준다 — 자기 몸통일 수도 있다.
 * 막는 게 없으면 null (탈출 가능).
 */
function findBlocker(
  piece: PieceData,
  others: PieceData[],
  cols: number,
  rows: number
): { cell: [number, number]; blockerId: string } | null {
  const [hc, hr] = piece.cells[piece.cells.length - 1];
  const [dc, dr] = advance([0, 0], piece.exitDir);

  const owner = new Map<string, string>();
  for (const o of others) for (const [c, r] of o.cells) owner.set(`${c},${r}`, o.id);

  // 자기 몸통이 제때 비켜주지 못하는 경우
  if (isSelfBlocked(piece)) {
    const n = piece.cells.length;
    for (let i = 0; i < n - 1; i++) {
      const [bc, br] = piece.cells[i];
      let dist = 0;
      switch (piece.exitDir) {
        case 'right': if (br === hr && bc > hc) dist = bc - hc; break;
        case 'left':  if (br === hr && bc < hc) dist = hc - bc; break;
        case 'up':    if (bc === hc && br < hr) dist = hr - br; break;
        case 'down':  if (bc === hc && br > hr) dist = br - hr; break;
      }
      if (dist > 0 && i >= dist) return { cell: [bc, br], blockerId: piece.id };
    }
  }

  for (let c = hc + dc, r = hr + dr; onBoard(c, r, cols, rows); c += dc, r += dr) {
    const id = owner.get(`${c},${r}`);
    if (id) return { cell: [c, r], blockerId: id };
  }
  return null;
}

function onBoard(c: number, r: number, cols: number, rows: number) {
  return c >= 0 && c < cols && r >= 0 && r < rows;
}

const PROGRESS_KEY = 'arrowPuzzleProgress';
const SHAPE_CLEARED_KEY = 'arrowPuzzleShapeCleared';

/** 클리어한 최고 스테이지 번호. 다음 한 판까지 열어준다. */
function loadProgress(): number {
  try {
    return Number(localStorage.getItem(PROGRESS_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveProgress(level: number) {
  try {
    if (level > loadProgress()) localStorage.setItem(PROGRESS_KEY, String(level));
  } catch { /* 저장 실패는 무시 — 진행도는 편의 기능이다 */ }
}

/** 쉐이프 스테이지는 메인 캠페인과 독립적으로 클리어 여부만 기록한다 — 순서 제한 없이 자유롭게 플레이. */
function loadShapeCleared(): Set<number> {
  try {
    const raw = localStorage.getItem(SHAPE_CLEARED_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveShapeCleared(level: number) {
  try {
    const cleared = loadShapeCleared();
    cleared.add(level);
    localStorage.setItem(SHAPE_CLEARED_KEY, JSON.stringify([...cleared]));
  } catch { /* 저장 실패는 무시 — 진행도는 편의 기능이다 */ }
}

const STAGE_STARS_KEY = 'arrowPuzzleStageStars';

/** 화살 개수에 비례해 3개/2개 별 목표 시간을 정한다 — 많을수록 넉넉하게 준다. */
function starTargets(pieceCount: number): { three: number; two: number } {
  const three = Math.max(6, Math.round(pieceCount * 2.5));
  const two = Math.max(12, Math.round(pieceCount * 4.5));
  return { three, two };
}

/** 클리어만 하면 별 1개, 목표 시간 안에 들어오면 2개·3개. */
function computeStars(pieceCount: number, seconds: number): number {
  const { three, two } = starTargets(pieceCount);
  if (seconds <= three) return 3;
  if (seconds <= two) return 2;
  return 1;
}

function loadStageStars(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STAGE_STARS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

/** 이전 기록보다 별이 많을 때만 갱신한다 — 나중에 못한 판이 기록을 깎지 않는다. */
function saveStageStars(level: number, stars: number): Record<number, number> {
  const all = loadStageStars();
  if (!all[level] || stars > all[level]) {
    all[level] = stars;
    try {
      localStorage.setItem(STAGE_STARS_KEY, JSON.stringify(all));
    } catch { /* 저장 실패는 무시 — 진행도는 편의 기능이다 */ }
  }
  return all;
}

const ArrowPuzzleGame: React.FC = () => {
  const navigate = useNavigate();
  const { addCoins } = useCoins();
  const hasAwardedRef = useRef(false);

  const [testLevel] = useState<LevelData | null>(() => {
    const stored = sessionStorage.getItem('arrowTestLevel');
    if (stored) {
      sessionStorage.removeItem('arrowTestLevel');
      return JSON.parse(stored) as LevelData;
    }
    return null;
  });

  type Screen = 'select' | 'stages' | 'shapes' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>(testLevel ? 'playing' : 'select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [stageNo, setStageNo] = useState<number | null>(null);
  const [isShapeMode, setIsShapeMode] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [shapeCleared, setShapeCleared] = useState(loadShapeCleared);
  const [stageStars, setStageStars] = useState(loadStageStars);
  // 이번 판에서 받은 별 — 클리어 카드에 보여준다
  const [lastStars, setLastStars] = useState(0);
  const [levelData, setLevelData] = useState<LevelData>(testLevel ?? levels[0]);

  const { gridCols, gridRows } = levelData;

  const [activePieces, setActivePieces] = useState<PieceData[]>(() =>
    levelData.pieces.map(p => ({ ...p, cells: [...p.cells] }))
  );
  const [escapingPieces, setEscapingPieces] = useState<EscapingPiece[]>([]);
  // 막힌 피스가 머리 쪽만 국소적으로 앞으로 밀렸다 되돌아오는 중인 상태
  const [bump, setBump] = useState<{ id: string; frac: number; dist: number; t: number; phase: 'out' | 'back' | 'wobble' } | null>(null);
  // 부딪힌 순간 상대 쪽도 부딪힌 지점만 국소적으로 볼록해졌다 들어간다 — 충돌 시점에 세팅된다
  const [blockerInfo, setBlockerInfo] = useState<{ id: string; cell: [number, number]; pokeDir: Direction } | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [isFailed, setIsFailed] = useState(false);
  // 레벨 시작부터 흐른 시간(초) — 클리어/실패하면 멈춘다
  const [playSeconds, setPlaySeconds] = useState(0);
  // 피스가 판을 완전히 빠져나가는 순간의 타격감 연출
  const [bursts, setBursts] = useState<BurstInfo[]>([]);
  const hitstopUntilRef = useRef(0);
  const { concept, setConcept } = useArrowConcept();
  const isMono = concept === 'mono';
  const hasTiles = concept === 'way-tile';
  const [showShop, setShowShop] = useState(false);

  const started = useRef(false);
  const escapingRef = useRef<EscapingPiece[]>([]);
  const bumpRef = useRef<{ piece: PieceData; frac: number; dist: number; phase: 'out' | 'back' | 'wobble'; t: number } | null>(null);
  const blockerTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafCallbackRef = useRef<((time: number) => void) | undefined>(undefined);

  const svgW = PADDING * 2 + gridCols * CELL_SIZE;
  const svgH = PADDING * 2 + gridRows * CELL_SIZE;

  // 모양 레벨은 마스크 안쪽에만 타일을 깐다. 마스크가 없으면 격자 전체.
  const dotCells = useMemo<[number, number][]>(() => {
    if (levelData.mask) return levelData.mask;
    const all: [number, number][] = [];
    for (let r = 0; r < gridRows; r++) for (let c = 0; c < gridCols; c++) all.push([c, r]);
    return all;
  }, [levelData.mask, gridCols, gridRows]);

  // 타일 윗면 전체를 path 하나로 만든다 — 배경으로도 쓰고, 화살표를 잘라내는 clip 으로도 쓴다.
  const tilesPathD = useMemo(() => {
    const size = CELL_SIZE - TILE_GAP;
    return dotCells
      .map(([c, r]) => roundedRectSubpath(
        PADDING + c * CELL_SIZE + TILE_GAP / 2,
        PADDING + r * CELL_SIZE + TILE_GAP / 2,
        size,
        TILE_RADIUS,
      ))
      .join('');
  }, [dotCells]);

  const findBlockerInfo = (piece: PieceData): { id: string; cell: [number, number]; pokeDir: Direction } | null => {
    const others = activePieces.filter(p => p.id !== piece.id);
    const b = findBlocker(piece, others, gridCols, gridRows);
    return b ? { id: b.blockerId, cell: b.cell, pokeDir: piece.exitDir } : null;
  };

  rafCallbackRef.current = (time: number) => {
    let delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;
    // 히트스톱: 막 빠져나간 순간 아주 짧게 전체를 멈춰서 타격을 "느끼게" 한다.
    // 너무 길면 끊긴 것처럼 보이므로 한 프레임 예산(70ms) 정도로 짧게 잡는다.
    if (time < hitstopUntilRef.current) delta = 0;

    const updated: EscapingPiece[] = [];
    const newBursts: BurstInfo[] = [];
    for (const ep of escapingRef.current) {
      let { cells, frac } = ep;
      const t = ep.t + delta;
      if (t < ANTICIPATION_TIME) {
        // 힘을 모으는 구간 — 활시위를 당기듯 천천히 뒤로 모은다
        frac = anticipationFrac(t);
      } else {
        // 당겨진 자리(음수) 그대로 발사 — 원위치로 돌아오는 구간 없이 빠른 속도가
        // 그 간격을 순식간에 통과하면서 "쑝" 하고 튀어나가는 느낌을 만든다
        frac += ESCAPE_SPEED * delta;
      }
      while (frac >= 1) {
        const newHead = advance(cells[cells.length - 1], ep.exitDir);
        cells = [...cells.slice(1), newHead];
        frac -= 1;
      }
      if (cells.some(([c, r]) => onBoard(c, r, gridCols, gridRows))) {
        updated.push({ ...ep, cells, frac, t });
      } else {
        // 판을 완전히 벗어난 프레임 — 몸이 길면 이 시점엔 이미 가장자리에서 한참
        // 벗어나 있으므로, 출발할 때 계산해 둔 "가장자리를 넘는 고정 지점"에서 터뜨린다.
        const [ex, ey] = ep.exitPoint;
        const [bdx, bdy] = dirOffset(ep.exitDir, 1);
        const baseAngle = Math.atan2(bdy, bdx);
        const particles = Array.from({ length: 9 }, () => {
          const ang = baseAngle + (Math.random() - 0.5) * (Math.PI * 0.6);
          const dist = 22 + Math.random() * 22;
          return { tx: Math.cos(ang) * dist, ty: Math.sin(ang) * dist };
        });
        newBursts.push({ id: `${ep.id}-${time}`, x: ex, y: ey, color: ep.color, particles });
        hitstopUntilRef.current = time + 90;
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      }
    }
    escapingRef.current = updated;
    setEscapingPieces([...updated]);
    if (BURST_FX && newBursts.length > 0) setBursts(prev => [...prev, ...newBursts]);

    // 막힌 피스: 앞으로 밀고 나가다 부딪히면 되돌아온다.
    // 돌아올 때를 조금 느리게 해서 "튕겨 나왔다"가 아니라 "밀렸다 물러난다"로 읽히게.
    const bp = bumpRef.current;
    if (bp) {
      // 속도를 거리로 나눠 정해서, 멀리서 막히든 코앞에서 막히든 왕복 시간이 같다.
      // 그러지 않으면 멀리 막힌 피스는 반응이 1초 넘게 늘어진다.
      if (bp.phase === 'out') {
        bp.frac += (bp.dist / BUMP_OUT) * delta;
        if (bp.frac >= bp.dist) {
          bp.frac = bp.dist;
          bp.phase = 'back';
          bp.t = 0;                                    // 여기서부터 출렁임 시작
          setBlockerInfo(findBlockerInfo(bp.piece));   // 부딪힌 순간 상대 쪽 접점이 볼록해지기 시작
        }
      } else {
        bp.t += delta;
        if (bp.phase === 'back') {
          bp.frac -= (bp.dist / BUMP_BACK) * delta;
          if (bp.frac <= 0) {
            bp.frac = 0;
            bp.phase = 'wobble';   // 되돌아왔으니 볼록함도 다 들어갔다 — 몸통 흔들림만 잠깐 남는다
            if (blockerTimerRef.current !== null) clearTimeout(blockerTimerRef.current);
            blockerTimerRef.current = window.setTimeout(() => setBlockerInfo(null), 340);
          }
        } else if (bp.t > WOBBLE_TIME) {
          bumpRef.current = null;
          setBump(null);
        }
      }
      if (bumpRef.current) setBump({ id: bp.piece.id, frac: bp.frac, dist: bp.dist, t: bp.t, phase: bp.phase });
    }

    if (updated.length > 0 || bumpRef.current) {
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    } else {
      rafRef.current = null;
    }
  };

  useEffect(() => {
    if (!started.current) return;
    if (activePieces.length === 0 && escapingPieces.length === 0) {
      const t = setTimeout(() => {
        setIsCleared(true);
        if (stageNo !== null) {
          if (isShapeMode) {
            saveShapeCleared(stageNo);
            setShapeCleared(prev => new Set(prev).add(stageNo));
          } else {
            saveProgress(stageNo);
            setProgress(p => Math.max(p, stageNo));
            const stars = computeStars(levelData.pieces.length, playSeconds);
            setLastStars(stars);
            setStageStars(saveStageStars(stageNo, stars));
          }
          // 코인·퍼즐력 보상 — 메인 스테이지 클리어에만 준다.
          // "랜덤 퍼즐"은 새 퍼즐을 무한히 다시 뽑을 수 있어서 포함하면
          // 제일 쉬운 난이도만 반복 클리어해 코인을 무한히 파밍할 수 있고,
          // "쉐이프 스테이지"는 테스트용이라 보상이 필요 없다.
          if (!isShapeMode && !hasAwardedRef.current) {
            hasAwardedRef.current = true;
            void addCoins(CLEAR_COIN_REWARD);
            if (auth.currentUser) {
              import('../../../services/rankingService')
                .then(m => m.incrementPuzzlePower(auth.currentUser!.uid))
                .catch(console.error);
            }
          }
        }
        // 화면 위쪽에서 한 번 터졌다가 중력에 떨어지는 단발성 연출
        confetti({
          particleCount: 90,
          spread: 100,
          startVelocity: 40,
          angle: 270,
          origin: { x: 0.5, y: 0 },
          gravity: 1,
          ticks: 130,
          zIndex: 300,
        });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [activePieces.length, escapingPieces.length, stageNo, isShapeMode, addCoins]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (blockerTimerRef.current !== null) clearTimeout(blockerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'select') return;
    document.body.classList.add('landing-bg');
    return () => { document.body.classList.remove('landing-bg'); };
  }, [screen]);

  // 플레이 시간 — 플레이 화면에서 클리어/실패 전까지 1초마다 증가한다
  useEffect(() => {
    if (screen !== 'playing' || isCleared || isFailed) return;
    const id = setInterval(() => setPlaySeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [screen, isCleared, isFailed]);

  const loadLevel = useCallback((newLevel: LevelData) => {
    started.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    escapingRef.current = [];
    bumpRef.current = null;
    setLevelData(newLevel);
    setActivePieces(newLevel.pieces.map(p => ({ ...p, cells: [...p.cells] })));
    setEscapingPieces([]);
    setBump(null);
    setBlockerInfo(null);
    setBursts([]);
    hitstopUntilRef.current = 0;
    setIsCleared(false);
    setMoveCount(0);
    setHearts(MAX_HEARTS);
    setIsFailed(false);
    setPlaySeconds(0);
    setLastStars(0);
    hasAwardedRef.current = false;
  }, []);

  const handleSelectDifficulty = useCallback(async (d: Difficulty) => {
    setDifficulty(d);
    setScreen('generating');
    await new Promise(r => setTimeout(r, 30));
    const result = generateLevelForDifficulty(d);
    if (result) {
      loadLevel(result);
      setScreen('playing');
    } else {
      setScreen('select');
    }
  }, [loadLevel]);

  const handleNewPuzzle = useCallback(async () => {
    if (!difficulty) return;
    setScreen('generating');
    await new Promise(r => setTimeout(r, 30));
    const result = generateLevelForDifficulty(difficulty);
    if (result) {
      loadLevel(result);
      setScreen('playing');
    }
  }, [difficulty, loadLevel]);

  const handleReset = useCallback(() => {
    loadLevel(levelData);
  }, [levelData, loadLevel]);

  const handleSelectStage = useCallback((level: number) => {
    const stage = stages[level - 1];
    if (!stage) return;
    setDifficulty(null);
    setStageNo(level);
    setIsShapeMode(false);
    loadLevel(stage);
    setScreen('playing');
  }, [loadLevel]);

  const handleSelectShapeStage = useCallback((level: number) => {
    const stage = shapeStages[level - 1];
    if (!stage) return;
    setDifficulty(null);
    setStageNo(level);
    setIsShapeMode(true);
    loadLevel(stage);
    setScreen('playing');
  }, [loadLevel]);

  const startEscape = useCallback((piece: PieceData) => {
    started.current = true;
    setMoveCount(n => n + 1);
    const exitPoint = exitEdgePoint(piece.cells[piece.cells.length - 1], piece.exitDir, gridCols, gridRows);
    const ep: EscapingPiece = { ...piece, cells: [...piece.cells], frac: 0, t: 0, exitPoint };
    escapingRef.current = [...escapingRef.current, ep];
    setEscapingPieces([...escapingRef.current]);
    if (rafRef.current === null) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    }
  }, [gridCols, gridRows]);

  const handlePieceClick = useCallback((piece: PieceData) => {
    if (isFailed) return;
    const others = activePieces.filter(p => p.id !== piece.id);
    if (canEscape(piece, others, gridCols, gridRows)) {
      setActivePieces(others);
      startEscape(piece);
      return;
    }

    // 못 나가는 피스도 일단 원래대로 움직인다 — 막는 것에 닿을 때까지만.
    // 어디서 멈추는지가 곧 "무엇이 막고 있는지"를 말해준다.
    const blocker = findBlocker(piece, others, gridCols, gridRows);
    if (!blocker) return;

    // Mono 컨셉에서는 막힌 조각을 누른 게 "잘못 짚은 수" — 하트를 하나 깎는다.
    if (isMono) {
      setHearts(h => {
        const next = h - 1;
        if (next <= 0) setIsFailed(true);
        return Math.max(0, next);
      });
    }

    // 연출 중에 다른 피스를 눌러도 반응이 씹히면 안 된다.
    // 진행 중이던 것은 즉시 제자리로 돌리고 새로 누른 쪽을 보여준다.
    if (blockerTimerRef.current !== null) {
      clearTimeout(blockerTimerRef.current);
      blockerTimerRef.current = null;
    }
    setBlockerInfo(null);

    const [hc, hr] = piece.cells[piece.cells.length - 1];
    const gap = Math.abs(blocker.cell[0] - hc) + Math.abs(blocker.cell[1] - hr) - 1;
    // 빈 칸이 있으면 그만큼 전진해 상대 바로 앞에 멈춘다(화살촉 끝이 딱 닿는다).
    // 바로 앞이 막혀 있으면(대부분의 경우) 갈 곳이 없으니 상대를 살짝 눌렀다 물러난다 —
    // 젤리니까 조금 파고드는 게 오히려 자연스럽다.
    const dist = gap >= 1 ? gap : 0.34;

    bumpRef.current = { piece, frac: 0, dist, phase: 'out', t: -1 };
    setBump({ id: piece.id, frac: 0, dist, t: -1, phase: 'out' });
    if (rafRef.current === null) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    }
  }, [activePieces, gridCols, gridRows, startEscape, isFailed, isMono]);

  const renderPiece = (piece: PieceData | EscapingPiece, clickable: boolean) => {
    const isEscaping = 'frac' in piece;
    // 탈출 중이거나, 막혀서 밀고 나갔다 돌아오는 중이면 같은 방식으로 전진 경로를 그린다
    const frac = isEscaping
      ? (piece as EscapingPiece).frac
      : bump?.id === piece.id ? bump.frac : 0;
    const isBumping = !isEscaping && bump?.id === piece.id;
    const moving = isEscaping || frac > 0;
    const head = piece.cells[piece.cells.length - 1];

    // 물컹거림: 두께를 흔든다. 부피가 일정한 젤리라 두꺼워지면 짧아 보이고
    // 얇아지면 늘어난 것처럼 보인다 — 스쿼시&스트레치. 몸통에는 적용하지 않는다.
    let squish = 0;
    if (isEscaping) {
      const ep = piece as EscapingPiece;
      if (ep.frac >= 0) {
        // 튀어나가는 순간 한 번 뭉쳤다가 얇게 늘어난 채로 빠져나간다
        squish = 0.34 * wobble(ep.t, 0.13, 7.5) - 0.1;
      }
    } else if (isBumping) {
      squish = bump!.phase === 'out'
        ? -0.12                              // 밀고 나갈 땐 얇게 늘어남
        : 0.42 * wobble(bump!.t, 0.14, 8.5);  // 부딪힌 뒤 출렁임
    }
    const sw = STROKE_W * (1 + squish);
    // Mono 컨셉은 젤리보다 가는 흰 선 하나로만 그린다 — 두께 비율만 줄인다.
    const dsw = isMono ? sw * (13 / STROKE_W) : sw;

    // 힘을 모으는 구간 — 화살촉만 뒤로 당겨진 만큼 눌려서 옆으로 퍼진다(높이↓ 너비↑). 몸통 굵기는 그대로 둔다.
    const anticipationSquash = isEscaping && (piece as EscapingPiece).frac < 0
      ? (-(piece as EscapingPiece).frac / ANTICIPATION_PULL) * ANTICIPATION_SQUASH
      : 0;

    // 타일 컨셉은 화살촉이 타일 clip 안에 들어와야 하므로 목을 짧게, 그 외는 넉넉하게 잡는다.
    const neck = hasTiles ? NECK_TILE : NECK_OPEN;

    const isBlocker = blockerInfo?.id === piece.id;
    // 부딪힌 접점만 poke 방향으로 국소적으로 볼록해졌다 들어간다 — 몸 전체는 그대로 둔다.
    let bulgePathD: string | null = null;
    if (isBlocker && blockerInfo && bump && bump.dist > 0 && bump.phase !== 'wobble') {
      const bulgeIdx = piece.cells.findIndex(([c, r]) => c === blockerInfo.cell[0] && r === blockerInfo.cell[1]);
      if (bulgeIdx >= 0) {
        const progress = Math.min(1, bump.frac / bump.dist);
        const [ox, oy] = dirOffset(blockerInfo.pokeDir, BULGE_MAX * progress);
        bulgePathD = toPathWithBulge(piece.cells, piece.exitDir, bulgeIdx, [ox, oy], neck);
      }
    }

    const pathD = isEscaping
      ? toPathAnimated(piece.cells, piece.exitDir, frac, neck)
      : isBumping
        ? toPathBump(piece.cells, piece.exitDir, frac, neck)
        : bulgePathD ?? toPath(piece.cells, piece.exitDir, neck);
    const arrowTip = moving
      ? neckTipAnimated(piece.cells, piece.exitDir, frac, neck)
      : neckTipStatic(head, piece.exitDir, neck);
    const showArrow = isEscaping || onBoard(head[0], head[1], gridCols, gridRows);
    const arrowPts = arrowPointsFromTip(arrowTip, piece.exitDir, 1 + squish + anticipationSquash);
    return (
      <g key={piece.id} className="ap-piece"
        onClick={clickable ? () => handlePieceClick(piece as PieceData) : undefined}
        style={{ cursor: clickable ? 'pointer' : 'default' }}>
        {isMono ? (
          <g filter="url(#ap-piece-shadow)">
            {/* 미니멀 라인아트: 색 채우기·광택 없이 흰 선 하나로만 그린다 */}
            <path d={pathD} stroke="#fff" strokeWidth={dsw} fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
            {showArrow && (
              <polygon points={arrowPts} fill="#fff" stroke="#fff" strokeWidth={dsw * 0.24} strokeLinejoin="round" />
            )}
          </g>
        ) : (
          <>
            {/* 바닥에 깔리는 번짐 — 젤리가 판 위에 떠 있는 느낌 */}
            <path d={pathD} stroke={piece.color} strokeWidth={sw + 7} fill="none"
              strokeLinecap="round" strokeLinejoin="round" opacity={0.16} />

            {/* 젤리 본체 */}
            <path d={pathD} stroke={piece.color} strokeWidth={sw} fill="none"
              strokeLinecap="round" strokeLinejoin="round" />

            {JELLY_FLOW && !isEscaping && (
              <JellyFlow d={pathD} color={piece.color} sw={sw} id={piece.id} cellCount={piece.cells.length} />
            )}
            {showArrow && (
              <polygon points={arrowPts} fill={piece.color}
                stroke={piece.color} strokeWidth={sw * 0.24} strokeLinejoin="round" />
            )}

            {/* 아랫면 그늘과 윗면 광택. 본체보다 좁고 덜 밀어내서 밖으로 새지 않는다 */}
            <g opacity={0.5}>
              <path d={pathD} stroke="#000" strokeWidth={sw * SHADE_RATIO} fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.22} transform={`translate(1.2 ${sw * 0.19})`} />
              <path d={pathD} stroke="#fff" strokeWidth={sw * GLOSS_RATIO} fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.55} transform={`translate(-1.4 -${sw * 0.24})`} />
            </g>
          </>
        )}
      </g>
    );
  };

  // ── Difficulty selection screen ──────────────────────────────────────────────

  if (screen === 'select') {
    return (
      <div className="ap-page ap-page--select">
        <header className="ap-header ap-header--title">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={24} />
          </button>
          <h1>ArrowWay</h1>
        </header>

        <div className="ap-select-screen">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: 420 }}>
            <img
              src="/images/arrow-puzzle/stageBtn.webp"
              alt="스테이지 모드"
              className="animate-fade-in"
              style={modeBtnStyle('0.1s')}
              onClick={() => handleSelectStage(Math.min(progress + 1, stages.length))}
              onMouseEnter={modeHoverOn}
              onMouseLeave={modeHoverOff}
            />
            <span style={{ fontSize: '0.88rem', color: '#7c3aed', fontWeight: 700 }}>
              {Math.min(progress, stages.length)}/{stages.length} 클리어 · {progress > 0 ? '이어하기' : '시작하기'}
            </span>
          </div>

          {window.location.hostname === 'localhost' && (
            <>
              <button className="ap-campaign-card" onClick={() => setScreen('shapes')}>
                <div className="ap-campaign-main">
                  <span className="ap-campaign-title">쉐이프 스테이지</span>
                  <span className="ap-campaign-sub">모양대로 채워진 퍼즐만 모아서 자유롭게 플레이</span>
                </div>
                <span className="ap-campaign-progress">{shapeCleared.size}/{shapeStages.length}</span>
              </button>

              <div className="ap-select-title">
                <h1>랜덤 퍼즐</h1>
                <p>퍼즐이 매번 다르게 자동 생성됩니다</p>
              </div>
              <div className="ap-diff-grid">
                {DIFFICULTIES.map(d => {
                  const cfg = DIFFICULTY_CONFIGS[d];
                  return (
                    <button
                      key={d}
                      className="ap-diff-card"
                      onClick={() => handleSelectDifficulty(d)}
                      style={{ '--diff-color': cfg.color } as React.CSSProperties}
                    >
                      <span className="ap-diff-name">{cfg.label}</span>
                      <span className="ap-diff-grid-size">{cfg.cols}×{cfg.rows} · {piecesLabel(cfg.minPieces, cfg.maxPieces)}</span>
                      <span className="ap-diff-desc">{cfg.desc}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Stage list screen ────────────────────────────────────────────────────────

  if (screen === 'stages') {
    // 클리어한 다음 한 판까지 열어둔다
    const unlocked = Math.min(progress + 1, stages.length);
    return (
      <div className="ap-page">
        <header className="ap-header">
          <button className="ap-icon-btn" onClick={() => setScreen('select')}>
            <ChevronLeft size={20} />
          </button>
          <span className="ap-level-badge">스테이지</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-stage-screen">
          <div className="ap-stage-grid">
            {stages.map(st => {
              const cleared = st.level <= progress;
              const locked = st.level > unlocked;
              return (
                <button
                  key={st.level}
                  className={`ap-stage-btn${cleared ? ' cleared' : ''}${locked ? ' locked' : ''}`}
                  disabled={locked}
                  onClick={() => handleSelectStage(st.level)}
                  title={`${st.gridCols}×${st.gridRows} · ${st.pieces.length}피스`}
                >
                  <span className="ap-stage-no">{st.level}</span>
                  <StageStars earned={stageStars[st.level] ?? 0} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Shape stage list screen (쉐이프 스테이지 — 순서 제한 없이 자유 플레이) ──────────────

  if (screen === 'shapes') {
    return (
      <div className="ap-page">
        <header className="ap-header">
          <button className="ap-icon-btn" onClick={() => setScreen('select')}>
            <ChevronLeft size={20} />
          </button>
          <span className="ap-level-badge">쉐이프 스테이지</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-stage-screen">
          <div className="ap-stage-grid">
            {shapeStages.map(st => {
              const cleared = shapeCleared.has(st.level);
              return (
                <button
                  key={st.level}
                  className={`ap-stage-btn${cleared ? ' cleared' : ''}`}
                  onClick={() => handleSelectShapeStage(st.level)}
                  title={`${st.shape} · ${st.gridCols}×${st.gridRows} · ${st.pieces.length}피스`}
                >
                  <span className="ap-stage-no ap-stage-no-shape">{st.shape}</span>
                  <span className="ap-stage-meta">{st.pieces.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Generating screen ────────────────────────────────────────────────────────

  if (screen === 'generating') {
    const cfg = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;
    return (
      <div className="ap-page">
        <div className="ap-generating">
          <div className="ap-spinner" style={cfg ? { borderTopColor: cfg.color } as React.CSSProperties : undefined} />
          <p>{cfg ? `${cfg.label} 퍼즐 생성 중…` : '퍼즐 생성 중…'}</p>
        </div>
      </div>
    );
  }

  // ── Playing screen ───────────────────────────────────────────────────────────

  const diffMeta = difficulty ? DIFFICULTY_CONFIGS[difficulty] : null;
  const levelLabel = diffMeta
    ? diffMeta.label
    : stageNo !== null
      ? (isShapeMode ? shapeStages[stageNo - 1]?.shape ?? `STAGE ${stageNo}` : `STAGE ${stageNo}`)
      : 'STAGE 1';

  return (
    <div className={`ap-page${isMono ? ' ap-mono' : ''}`}>
      <header className="ap-header">
        <button className="ap-icon-btn" onClick={() => setScreen(stageNo !== null ? (isShapeMode ? 'shapes' : 'stages') : 'select')}>
          <ChevronLeft size={20} />
        </button>
        {!isMono && (
          <span className="ap-level-badge" style={diffMeta ? { color: diffMeta.color } as React.CSSProperties : undefined}>
            {levelLabel}
          </span>
        )}
        {isMono && (
          <div className="ap-mono-info">
            <span className="ap-mono-info-level">{levelLabel}</span>
            <div className="ap-mono-info-row">
              <span className="ap-mono-info-time">{formatPlayTime(playSeconds)}</span>
              <StageStars earned={computeStars(levelData.pieces.length, playSeconds)} size={10} />
            </div>
          </div>
        )}
        <div className="ap-header-btns">
          <button className="ap-icon-btn" title="컨셉 상점" onClick={() => setShowShop(true)}>
            <Store size={16} />
          </button>
          {difficulty && (
            <button className="ap-icon-btn" title="새 퍼즐 생성" onClick={handleNewPuzzle}>
              <RefreshCw size={16} />
            </button>
          )}
          <button className="ap-icon-btn" title="다시 시작" onClick={handleReset}>
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {showShop && (
        <ArrowConceptShopModal concept={concept} onSelect={setConcept} onClose={() => setShowShop(false)} />
      )}

      <div className="ap-board-wrap">
        <div className="ap-board-col">
        <svg className="ap-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
          <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 화살표가 판 위에 살짝 떠 있는 느낌을 주는 그림자 */}
            <filter id="ap-piece-shadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="3" floodColor="#000" floodOpacity="0.7" />
            </filter>
            {/* 판 영역을 파인 홈처럼 — 안쪽에 그림자를 깔아 음각 느낌을 낸다 */}
            <filter id="ap-board-inset" x="-30%" y="-30%" width="160%" height="160%">
              <feComponentTransfer in="SourceAlpha">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feGaussianBlur stdDeviation="5" />
              <feOffset dx="0" dy="0" result="ap-board-inset-blur" />
              <feFlood floodColor="#000" floodOpacity="0.28" />
              <feComposite in2="ap-board-inset-blur" operator="in" />
              <feComposite in2="SourceAlpha" operator="in" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode />
              </feMerge>
            </filter>
            {hasTiles && (
              <>
                {/* 화살표는 타일 윗면 안쪽에만 그려진다 — 틈을 지나는 구간은 잘려서 안 보인다 */}
                <clipPath id="ap-tile-clip">
                  <path d={tilesPathD} />
                </clipPath>
                <linearGradient id="ap-tile-face" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22375c" />
                  <stop offset="100%" stopColor="#1a2b4a" />
                </linearGradient>
              </>
            )}
          </defs>
          {/* 판 영역 — 배경보다 살짝 밝게 깔아 "어디까지가 판인지" 눈에 들어오게 한다.
              화살촉이 목 길이만큼 튀어나와도 칸 절반 안쪽이라 판 밖으로 새지 않는다. */}
          <rect
            x={PADDING - BOARD_INSET} y={PADDING - BOARD_INSET}
            width={gridCols * CELL_SIZE + BOARD_INSET * 2}
            height={gridRows * CELL_SIZE + BOARD_INSET * 2}
            rx={BOARD_RADIUS}
            fill="rgba(0,0,0,0.1)"
            filter="url(#ap-board-inset)"
            pointerEvents="none"
          />
          {/* 외곽 테두리를 안쪽으로 갈수록 옅어지는 여러 겹의 어두운 테로 감싸 깊게 파인 벽처럼 보이게 한다 */}
          {BOARD_BEVEL_RINGS.map((ring, i) => (
            <rect
              key={i}
              x={PADDING - BOARD_INSET + ring.inset} y={PADDING - BOARD_INSET + ring.inset}
              width={gridCols * CELL_SIZE + BOARD_INSET * 2 - ring.inset * 2}
              height={gridRows * CELL_SIZE + BOARD_INSET * 2 - ring.inset * 2}
              rx={Math.max(2, BOARD_RADIUS - ring.inset)}
              fill="none"
              stroke={ring.color} strokeWidth={ring.sw}
              pointerEvents="none"
            />
          ))}
          {/* 벽이 끝나고 바닥이 시작되는 안쪽 경계에 얇은 하이라이트를 둘러 턱을 강조한다 */}
          <rect
            x={PADDING - BOARD_INSET + BOARD_BEVEL_DEPTH} y={PADDING - BOARD_INSET + BOARD_BEVEL_DEPTH}
            width={gridCols * CELL_SIZE + BOARD_INSET * 2 - BOARD_BEVEL_DEPTH * 2}
            height={gridRows * CELL_SIZE + BOARD_INSET * 2 - BOARD_BEVEL_DEPTH * 2}
            rx={Math.max(2, BOARD_RADIUS - BOARD_BEVEL_DEPTH)}
            fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            pointerEvents="none"
          />
          {hasTiles ? (
            <>
              {/* 타일 옆면(두께) — 윗면을 살짝 아래로 복사해 깔면 높이가 있는 것처럼 보인다 */}
              <path
                d={tilesPathD}
                transform={`translate(0 ${TILE_DEPTH})`}
                fill="#0a1526"
                pointerEvents="none"
              />
              {/* 타일 윗면 */}
              <path
                d={tilesPathD}
                fill="url(#ap-tile-face)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                pointerEvents="none"
              />
            </>
          ) : null}
          {hasTiles ? (
            <g clipPath="url(#ap-tile-clip)">
              {activePieces.map(p => renderPiece(p, true))}
              {escapingPieces.map(p => renderPiece(p, false))}
            </g>
          ) : (
            <>
              {activePieces.map(p => renderPiece(p, true))}
              {escapingPieces.map(p => renderPiece(p, false))}
            </>
          )}
          {bursts.map(b => (
            <g key={b.id} transform={`translate(${b.x} ${b.y})`} pointerEvents="none">
              <circle
                className="ap-burst-ring"
                r={4}
                fill="none"
                stroke={isMono ? '#fff' : b.color}
                onAnimationEnd={() => setBursts(prev => prev.filter(x => x.id !== b.id))}
              />
              {b.particles.map((p, i) => (
                <circle
                  key={i}
                  className="ap-burst-dot"
                  r={4}
                  fill={isMono ? '#fff' : b.color}
                  style={{ '--tx': p.tx, '--ty': p.ty } as React.CSSProperties}
                />
              ))}
            </g>
          ))}
        </svg>

        {isMono && (
          <div className="ap-mono-hearts-bar">
            <Heart size={20} fill="#e11d48" stroke="#e11d48" strokeWidth={2} />
            <span>× {hearts}</span>
          </div>
        )}
        </div>

        {isCleared && (
          <div className="ap-clear-overlay">
            <div className="ap-clear-card">
              <div className="ap-clear-emoji">{isMono ? '➜' : '🍬'}</div>
              <h2>클리어!</h2>
              <p>{isMono ? '화살표' : '젤리'} {moveCount}개를 모두 빼냈습니다</p>
              {stageNo !== null && !isShapeMode && (
                <>
                  <StageStars earned={lastStars} size={26} />
                  <p className="ap-clear-time">{formatPlayTime(playSeconds)}</p>
                  <div className="ap-reward-row">
                    <div className="ap-reward-coin">🪙 +{CLEAR_COIN_REWARD}</div>
                    <div className="ap-reward-power">⚡ 퍼즐력 +1</div>
                  </div>
                </>
              )}
              <div className="ap-clear-btns">
                {stageNo !== null && isShapeMode ? (
                  (() => {
                    const idx = shapeStages.findIndex(s => s.level === stageNo);
                    const next = idx >= 0 ? shapeStages[idx + 1] : undefined;
                    return next ? (
                      <button className="ap-btn-primary" onClick={() => handleSelectShapeStage(next.level)}>
                        다음 레벨 <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button className="ap-btn-primary" onClick={handleReset}>
                        다시 시도
                      </button>
                    );
                  })()
                ) : stageNo !== null && stageNo < stages.length ? (
                  <button className="ap-btn-primary" onClick={() => handleSelectStage(stageNo + 1)}>
                    다음 레벨 <ArrowRight size={18} />
                  </button>
                ) : (
                  <button className="ap-btn-primary" onClick={handleReset}>
                    다시 시도
                  </button>
                )}
                {difficulty && (
                  <button className="ap-btn-secondary" onClick={handleNewPuzzle}>
                    새 퍼즐
                  </button>
                )}
                {stageNo !== null && (
                  <button className="ap-btn-secondary" onClick={handleReset}>
                    다시 시도
                  </button>
                )}
              </div>
              {difficulty && (
                <button className="ap-btn-text" onClick={() => setScreen('select')}>
                  난이도 변경
                </button>
              )}
              {stageNo !== null && (
                <button className="ap-btn-text" onClick={() => setScreen(isShapeMode ? 'shapes' : 'stages')}>
                  {isShapeMode ? '쉐이프 스테이지 목록' : '스테이지 목록'}
                </button>
              )}
            </div>
          </div>
        )}

        {isFailed && (
          <div className="ap-clear-overlay">
            <div className="ap-clear-card">
              <div className="ap-clear-emoji">✕</div>
              <h2>실패</h2>
              <p>하트를 모두 잃었습니다</p>
              <div className="ap-clear-btns">
                <button className="ap-btn-primary" onClick={handleReset}>
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrowPuzzleGame;
