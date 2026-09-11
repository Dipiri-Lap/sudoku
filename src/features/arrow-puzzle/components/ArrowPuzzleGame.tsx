import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw, RefreshCw } from 'lucide-react';
import { levels, stages, type PieceData, type LevelData, type Direction } from '../data/levels';
import { type Difficulty, DIFFICULTY_CONFIGS, generateLevelForDifficulty } from '../utils/levelGenerator';
import '../styles/ArrowPuzzle.css';

const CELL_SIZE = 64;
const PADDING = 32;
const STROKE_W = 21;          // 칸(64)의 약 1/3 — 젤리는 가늘면 젤리로 안 보인다
const GLOSS_RATIO = 0.26;    // 윗면 광택 (본체 두께 대비)
const SHADE_RATIO = 0.44;    // 아랫면 그늘
const ESCAPE_SPEED = 9;
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
const NECK = CELL_SIZE * 0.32;
const CORNER_R = CELL_SIZE * 0.42;

interface EscapingPiece extends PieceData {
  frac: number;
  /** 출발 후 경과 시간(초) — 튀어나갈 때의 출렁임 계산용 */
  t: number;
}

const DIFFICULTIES: Difficulty[] = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'];

function piecesLabel(min: number, max: number) {
  return min === max ? `${min} 피스` : `${min}–${max} 피스`;
}

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

function toPath(cells: [number, number][], dir: Direction): string {
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, NECK);
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
 * 탈출 애니메이션과 "막혀서 되돌아오는" 연출이 같은 함수를 쓴다.
 */
function toPathAnimated(cells: [number, number][], dir: Direction, frac: number): string {
  if (cells.length === 0) return '';
  const pts: [number, number][] = cells.map(([c, r]) => cellCenter(c, r));
  const [hx, hy] = pts[pts.length - 1];
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + NECK);
  pts.push([hx + dx, hy + dy]);
  return toPathFromPts(trimFromStart(pts, frac * CELL_SIZE));
}

function neckTipStatic(head: [number, number], dir: Direction): [number, number] {
  const [x, y] = cellCenter(head[0], head[1]);
  const [dx, dy] = dirOffset(dir, NECK);
  return [x + dx, y + dy];
}

function neckTipAnimated(cells: [number, number][], dir: Direction, frac: number): [number, number] {
  const [hx, hy] = cellCenter(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  const [dx, dy] = dirOffset(dir, frac * CELL_SIZE + NECK);
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
  const travel = (cellCount - 1) * CELL_SIZE + NECK + LUMP_LEN * 2;
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

const ArrowPuzzleGame: React.FC = () => {
  const navigate = useNavigate();

  const [testLevel] = useState<LevelData | null>(() => {
    const stored = sessionStorage.getItem('arrowTestLevel');
    if (stored) {
      sessionStorage.removeItem('arrowTestLevel');
      return JSON.parse(stored) as LevelData;
    }
    return null;
  });

  type Screen = 'select' | 'stages' | 'generating' | 'playing';
  const [screen, setScreen] = useState<Screen>(testLevel ? 'playing' : 'select');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [stageNo, setStageNo] = useState<number | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  const [levelData, setLevelData] = useState<LevelData>(testLevel ?? levels[0]);

  const { gridCols, gridRows } = levelData;

  const [activePieces, setActivePieces] = useState<PieceData[]>(() =>
    levelData.pieces.map(p => ({ ...p, cells: [...p.cells] }))
  );
  const [escapingPieces, setEscapingPieces] = useState<EscapingPiece[]>([]);
  // 막힌 피스가 앞으로 밀고 나갔다가 되돌아오는 중인 상태
  const [bump, setBump] = useState<{ id: string; frac: number; t: number; phase: 'out' | 'back' | 'wobble' } | null>(null);
  // 부딪힌 순간 상대도 반응하게 — 충돌 시점에 세팅된다
  const [blockerId, setBlockerId] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const started = useRef(false);
  const escapingRef = useRef<EscapingPiece[]>([]);
  const bumpRef = useRef<{ piece: PieceData; frac: number; dist: number; phase: 'out' | 'back' | 'wobble'; t: number } | null>(null);
  const blockerTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rafCallbackRef = useRef<((time: number) => void) | undefined>(undefined);

  const svgW = PADDING * 2 + gridCols * CELL_SIZE;
  const svgH = PADDING * 2 + gridRows * CELL_SIZE;

  // 모양 레벨은 마스크 안쪽에만 배경 점을 찍는다. 마스크가 없으면 격자 전체.
  const dotCells = useMemo<[number, number][]>(() => {
    if (levelData.mask) return levelData.mask;
    const all: [number, number][] = [];
    for (let r = 0; r < gridRows; r++) for (let c = 0; c < gridCols; c++) all.push([c, r]);
    return all;
  }, [levelData.mask, gridCols, gridRows]);

  const findBlockerId = (piece: PieceData): string | null => {
    const others = activePieces.filter(p => p.id !== piece.id);
    return findBlocker(piece, others, gridCols, gridRows)?.blockerId ?? null;
  };

  rafCallbackRef.current = (time: number) => {
    const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;
    const updated: EscapingPiece[] = [];
    for (const ep of escapingRef.current) {
      let { cells, frac } = ep;
      const t = ep.t + delta;
      frac += ESCAPE_SPEED * delta;
      while (frac >= 1) {
        const newHead = advance(cells[cells.length - 1], ep.exitDir);
        cells = [...cells.slice(1), newHead];
        frac -= 1;
      }
      if (cells.some(([c, r]) => onBoard(c, r, gridCols, gridRows))) {
        updated.push({ ...ep, cells, frac, t });
      }
    }
    escapingRef.current = updated;
    setEscapingPieces([...updated]);

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
          bp.t = 0;                                // 여기서부터 출렁임 시작
          setBlockerId(findBlockerId(bp.piece));   // 부딪힌 순간 상대가 반응
        }
      } else {
        bp.t += delta;
        if (bp.phase === 'back') {
          bp.frac -= (bp.dist / BUMP_BACK) * delta;
          if (bp.frac <= 0) {
            bp.frac = 0;
            bp.phase = 'wobble';   // 제자리로 왔어도 몸은 아직 출렁인다
            if (blockerTimerRef.current !== null) clearTimeout(blockerTimerRef.current);
            blockerTimerRef.current = window.setTimeout(() => setBlockerId(null), 340);
          }
        } else if (bp.t > WOBBLE_TIME) {
          bumpRef.current = null;
          setBump(null);
        }
      }
      if (bumpRef.current) setBump({ id: bp.piece.id, frac: bp.frac, t: bp.t, phase: bp.phase });
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
          saveProgress(stageNo);
          setProgress(p => Math.max(p, stageNo));
        }
      }, 200);
      return () => clearTimeout(t);
    }
  }, [activePieces.length, escapingPieces.length, stageNo]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (blockerTimerRef.current !== null) clearTimeout(blockerTimerRef.current);
    };
  }, []);

  const loadLevel = useCallback((newLevel: LevelData) => {
    started.current = false;
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    escapingRef.current = [];
    bumpRef.current = null;
    setLevelData(newLevel);
    setActivePieces(newLevel.pieces.map(p => ({ ...p, cells: [...p.cells] })));
    setEscapingPieces([]);
    setBump(null);
    setBlockerId(null);
    setIsCleared(false);
    setMoveCount(0);
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
    loadLevel(stage);
    setScreen('playing');
  }, [loadLevel]);

  const startEscape = useCallback((piece: PieceData) => {
    started.current = true;
    setMoveCount(n => n + 1);
    const ep: EscapingPiece = { ...piece, cells: [...piece.cells], frac: 0, t: 0 };
    escapingRef.current = [...escapingRef.current, ep];
    setEscapingPieces([...escapingRef.current]);
    if (rafRef.current === null) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    }
  }, []);

  const handlePieceClick = useCallback((piece: PieceData) => {
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

    // 연출 중에 다른 피스를 눌러도 반응이 씹히면 안 된다.
    // 진행 중이던 것은 즉시 제자리로 돌리고 새로 누른 쪽을 보여준다.
    if (blockerTimerRef.current !== null) {
      clearTimeout(blockerTimerRef.current);
      blockerTimerRef.current = null;
    }
    setBlockerId(null);

    const [hc, hr] = piece.cells[piece.cells.length - 1];
    const gap = Math.abs(blocker.cell[0] - hc) + Math.abs(blocker.cell[1] - hr) - 1;
    // 빈 칸이 있으면 그만큼 전진해 상대 바로 앞에 멈춘다(화살촉 끝이 딱 닿는다).
    // 바로 앞이 막혀 있으면(대부분의 경우) 갈 곳이 없으니 상대를 살짝 눌렀다 물러난다 —
    // 젤리니까 조금 파고드는 게 오히려 자연스럽다.
    const dist = gap >= 1 ? gap : 0.34;

    bumpRef.current = { piece, frac: 0, dist, phase: 'out', t: -1 };
    setBump({ id: piece.id, frac: 0, t: -1, phase: 'out' });
    if (rafRef.current === null) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(t => rafCallbackRef.current!(t));
    }
  }, [activePieces, gridCols, gridRows, startEscape]);

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
    // 얇아지면 늘어난 것처럼 보인다 — 스쿼시&스트레치.
    let squish = 0;
    if (isEscaping) {
      // 튀어나가는 순간 한 번 뭉쳤다가 얇게 늘어난 채로 빠져나간다
      const et = (piece as EscapingPiece).t;
      squish = 0.34 * wobble(et, 0.13, 7.5) - 0.1;
    } else if (isBumping) {
      squish = bump!.phase === 'out'
        ? -0.12                              // 밀고 나갈 땐 얇게 늘어남
        : 0.42 * wobble(bump!.t, 0.14, 8.5);  // 부딪힌 뒤 출렁임
    }
    const sw = STROKE_W * (1 + squish);
    const pathD = moving
      ? toPathAnimated(piece.cells, piece.exitDir, frac)
      : toPath(piece.cells, piece.exitDir);
    const arrowTip = moving
      ? neckTipAnimated(piece.cells, piece.exitDir, frac)
      : neckTipStatic(head, piece.exitDir);
    const showArrow = isEscaping || onBoard(head[0], head[1], gridCols, gridRows);
    const isBlocker = blockerId === piece.id;
    const arrowPts = arrowPointsFromTip(arrowTip, piece.exitDir, 1 + squish * 0.7);
    return (
      <g key={piece.id} className={`ap-piece${isBlocker ? ' ap-blocker' : ''}`}
        onClick={clickable ? () => handlePieceClick(piece as PieceData) : undefined}
        style={{ cursor: clickable ? 'pointer' : 'default' }}>
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
      </g>
    );
  };

  // ── Difficulty selection screen ──────────────────────────────────────────────

  if (screen === 'select') {
    return (
      <div className="ap-page">
        <header className="ap-header">
          <button className="ap-icon-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </button>
          <span className="ap-level-badge">젤리 퍼즐</span>
          <div style={{ width: 42 }} />
        </header>

        <div className="ap-select-screen">
          <button className="ap-campaign-card" onClick={() => setScreen('stages')}>
            <div className="ap-campaign-main">
              <span className="ap-campaign-title">스테이지</span>
              <span className="ap-campaign-sub">1 → {stages.length} · 갈수록 어려워집니다</span>
            </div>
            <span className="ap-campaign-progress">{Math.min(progress, stages.length)}/{stages.length}</span>
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

  return (
    <div className="ap-page">
      <header className="ap-header">
        <button className="ap-icon-btn" onClick={() => setScreen(stageNo !== null ? 'stages' : 'select')}>
          <ChevronLeft size={20} />
        </button>
        <span className="ap-level-badge" style={diffMeta ? { color: diffMeta.color } as React.CSSProperties : undefined}>
          {diffMeta ? diffMeta.label : stageNo !== null ? `Level ${stageNo}` : 'Level 1'}
        </span>
        <div className="ap-header-btns">
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

      <div className="ap-board-wrap">
        <svg className="ap-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
          <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {dotCells.map(([c, r]) => {
            const [x, y] = cellCenter(c, r);
            return <circle key={`d${c},${r}`} cx={x} cy={y} r={2.5} fill="rgba(255,255,255,0.12)" />;
          })}
          {activePieces.map(p => renderPiece(p, true))}
          {escapingPieces.map(p => renderPiece(p, false))}
        </svg>

        {isCleared && (
          <div className="ap-clear-overlay">
            <div className="ap-clear-card">
              <div className="ap-clear-emoji">🍬</div>
              <h2>클리어!</h2>
              <p>젤리 {moveCount}개를 모두 빼냈습니다</p>
              <div className="ap-clear-btns">
                {stageNo !== null && stageNo < stages.length ? (
                  <button className="ap-btn-primary" onClick={() => handleSelectStage(stageNo + 1)}>
                    다음 레벨
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
                <button className="ap-btn-text" onClick={() => setScreen('stages')}>
                  스테이지 목록
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrowPuzzleGame;
