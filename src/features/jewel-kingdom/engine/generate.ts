import { elementById, elementLayer, type ElementDef } from '../data/elements';
import type { Goal } from './goals';
import type { Level, TurnEndEffect } from './level';
import { measureDifficulty } from '../bot/bot';
import type { Rng } from './rng';

/**
 * 레벨 생성기.
 *
 * 핵심 구조: **내용은 고르고, 난이도는 잰다.**
 *
 * 무엇을 놓을지(판 모양·장애물·목표)는 레시피가 정하고, 그게 얼마나 어려운지는
 * 아무도 계산하지 않는다 - 봇에게 수백 판 시켜서 승률로 확인한다. 그 다음
 * **이동 횟수만 조절해** 목표 승률에 맞춘다.
 *
 * 왜 이 구조인가: 3매치 난이도는 계산으로 안 나온다. 장애물 하나가 늘 때
 * 얼마나 어려워지는지는 배치·색 수·목표와 전부 얽혀 있다. 손으로 만들 때도
 * 결국 "돌려보고 이동 수를 고치는" 반복이었다(레벨 1을 75%→35%→78%로
 * 세 번 고쳤다). 그 반복이 사람이 하기엔 제일 지겨운 일이라 기계에 넘긴다.
 */

export type ShapeKind = 'full' | 'diamond' | 'cross' | 'hourglass';

export interface Recipe {
  width: number;
  height: number;
  /** 쓸 색 수. 적을수록 쉽다 - 난이도를 가장 크게 좌우한다 */
  colors: number;
  shape: ShapeKind;
  /** 심을 요소들. 카탈로그 id를 쓴다 */
  elements: { id: string; count: number; layers?: number }[];
  /** 장애물이 없을 때 쓸 색 목표의 수량 */
  colorGoal?: number;
}

export interface FitOptions {
  /** 맞추려는 봇 승률 */
  target: number;
  /** 이보다 쉬우면 버린다 (목표보다 위로 얼마까지 봐줄까) */
  tolerance: number;
  /** 승률을 잴 때 돌릴 판 수 */
  runs: number;
  minMoves: number;
  maxMoves: number;
}

export const DEFAULT_FIT: FitOptions = {
  target: 0.45,
  tolerance: 0.2,
  runs: 30,
  minMoves: 4,
  maxMoves: 45,
};

// ── 판 모양 ────────────────────────────────────────────────────────────

/** 그 칸이 판의 일부인가 */
function inShape(shape: ShapeKind, r: number, c: number, w: number, h: number): boolean {
  const cr = (h - 1) / 2;
  const cc = (w - 1) / 2;
  switch (shape) {
    case 'diamond':
      return Math.abs(r - cr) + Math.abs(c - cc) <= Math.max(cr, cc);
    case 'cross':
      return Math.abs(r - cr) <= cr / 2 + 0.5 || Math.abs(c - cc) <= cc / 2 + 0.5;
    case 'hourglass':
      // 가운데가 잘록하다 - 위아래 방이 좁은 목으로 이어져서 보석이 몰린다.
      return Math.abs(c - cc) <= cc - Math.max(0, cc - 1 - Math.abs(r - cr));
    default:
      return true;
  }
}

// ── 배치 ──────────────────────────────────────────────────────────────

/**
 * 요소를 어느 줄에 놓을 수 있는가.
 *
 * 아무 데나 놓으면 안 되는 것들이 있다. 그릇은 받으려면 아래에 있어야 하고,
 * 투입구는 맨 윗줄에만 뜻이 있으며, 내려오는 것은 위에서 출발해야 볼 만하다.
 */
function zoneOf(def: ElementDef, h: number): { from: number; to: number } {
  const { layer } = elementLayer(def);
  if (layer === 'spawner') return { from: 0, to: 0 };
  if (layer === 'collector') return { from: h - 1, to: h - 1 };
  if (def.hook === 'golem') return { from: 0, to: Math.max(0, Math.floor(h / 3) - 1) };
  return { from: 1, to: h - 2 };
}

interface Placement {
  def: ElementDef;
  layers: number;
  cells: [number, number][];
}

/** 판을 흔들어 요소를 심는다. 같은 시드면 같은 판이 나온다. */
function place(recipe: Recipe, rng: Rng): { grid: string[][]; placed: Placement[] } | null {
  const { width: w, height: h } = recipe;
  const grid: string[][] = [];
  for (let r = 0; r < h; r++) {
    grid.push([]);
    for (let c = 0; c < w; c++) {
      grid[r].push(inShape(recipe.shape, r, c, w, h) ? '.' : '_');
    }
  }

  const placed: Placement[] = [];
  /** 이미 무언가 심은 칸 */
  const taken = new Set<string>();

  for (const spec of recipe.elements) {
    const def = elementById(spec.id);
    if (!def) return null;
    const layers = spec.layers ?? def.layers ?? 1;
    const zone = zoneOf(def, h);
    const { layer } = elementLayer(def);

    const free: [number, number][] = [];
    for (let r = zone.from; r <= zone.to; r++) {
      for (let c = 0; c < w; c++) {
        if (grid[r]?.[c] !== '.' || taken.has(`${r},${c}`)) continue;
        free.push([r, c]);
      }
    }
    if (free.length < spec.count) return null;

    const cells: [number, number][] = [];
    for (let i = 0; i < spec.count; i++) {
      const [r, c] = free.splice(rng.int(free.length), 1)[0];
      grid[r][c] = layers > 1 ? `[${def.id}:${layers}]` : `[${def.id}]`;
      taken.add(`${r},${c}`);
      cells.push([r, c]);

      // 그릇은 흘려보낼 관이 없으면 영영 못 채운다. 같은 열 맨 위에 붙여준다.
      if (layer === 'collector') {
        grid[r][c] = `[${def.id}:R${layers}]`;
        grid[0][c] = '[tube:R]';
        taken.add(`0,${c}`);
      }
    }
    placed.push({ def, layers, cells });
  }

  return { grid, placed };
}

// ── 목표 ──────────────────────────────────────────────────────────────

/**
 * 심은 것에서 목표를 뽑는다.
 *
 * 목표를 따로 정하지 않는 이유: 판에 없는 걸 목표로 걸면 시작부터 달성
 * 불가능하고, 판에 있는 걸 안 걸면 치울 이유가 없는 장식이 된다. 배치와 목표는
 * 같은 곳에서 나와야 어긋나지 않는다.
 */
function goalsFrom(placed: Placement[], recipe: Recipe): Goal[] {
  const goals: Goal[] = [];

  for (const p of placed) {
    const { layer, kind } = elementLayer(p.def);
    const n = p.cells.length;

    // 움직이는 것은 목표로 걸지 않는다.
    //
    // 골렘은 바닥에 닿으면 스스로 사라지는데 그건 **부순 게 아니라 당한 것**이라
    // 목표 진행으로 세지 않는다. 그래서 "골렘 1개 제거"를 걸면 제때 못 부순
    // 판이 영영 못 깨는 판이 된다 - 실제로 생성기가 16·21·26레벨에서 그렇게
    // 막혔다. 골렘이 내려오는 동안 색을 모으는 판이 되게 둔다.
    if (p.def.hook === 'golem') continue;

    if (layer === 'blocker') goals.push({ kind: 'blocker', blockerKind: kind, count: n });
    else if (layer === 'cover') goals.push({ kind: 'cover', coverKind: kind, count: n * p.layers });
    else if (layer === 'ground') {
      // 젤리처럼 번지는 바닥은 없애는 게 아니라 덮는 게 목표다 - 부호가 반대다.
      const spreads = p.def.id === 'jelly';
      goals.push(
        spreads
          ? { kind: 'spread', groundKind: kind, count: Math.round(recipe.width * recipe.height * 0.4) }
          : { kind: 'ground', groundKind: kind, count: n * p.layers },
      );
    } else if (layer === 'collector') goals.push({ kind: 'collect', collectKind: kind, count: n });
  }

  // 목표가 셋 넘으면 무엇을 하는 판인지 읽히지 않는다. 레퍼런스도 보통 한둘이다.
  const trimmed = goals.slice(0, 2);
  if (trimmed.length === 0) {
    trimmed.push({ kind: 'color', color: 0, count: recipe.colorGoal ?? 25 });
  }
  return trimmed;
}

/** 심은 요소가 요구하는 턴 종료 훅 */
function hooksFrom(placed: Placement[]): TurnEndEffect[] {
  const out: TurnEndEffect[] = [];
  const seen = new Set<string>();
  for (const p of placed) {
    if (!p.def.hook || seen.has(p.def.hook)) continue;
    seen.add(p.def.hook);
    if (p.def.hook === 'golem') out.push({ kind: 'golem', spawnCount: 2 });
    if (p.def.hook === 'producer') out.push({ kind: 'producer', color: 0 });
    if (p.def.hook === 'regrow') out.push({ kind: 'regrow', blockerKind: p.def.id, groundKind: 'soil' });
  }
  return out;
}

// ── 이동 횟수 맞추기 ───────────────────────────────────────────────────

export interface Fitted {
  moves: number;
  winRate: number;
  /** 승률을 재느라 돌린 판 수 - 생성 비용을 볼 때 쓴다 */
  measured: number;
}

/**
 * 목표 승률에 닿는 **가장 적은** 이동 수를 찾는다.
 *
 * 이동 수가 늘면 승률은 (거의) 단조 증가한다 - 수가 많아서 손해 볼 일은 없다.
 * 그래서 이분 탐색이 성립한다. "거의"인 이유는 봇이 탐욕적이라 수가 많을 때
 * 오히려 판을 망치는 경우가 드물게 있어서인데, 그 흔들림은 목표 승률의
 * 허용 범위 안에 묻힌다.
 *
 * 목표 이상 중 **가장 적은** 수를 고르는 이유: 넉넉한 수는 언제나 승률을
 * 올리므로, 그냥 두면 늘 최대치가 답이 되어 버린다.
 */
export function fitMoves(base: Level, opts: FitOptions): Fitted | null {
  let lo = opts.minMoves;
  let hi = opts.maxMoves;
  let best: Fitted | null = null;
  let measured = 0;

  const rateAt = (moves: number) => {
    measured += opts.runs;
    return measureDifficulty({ ...base, moves }, opts.runs).winRate;
  };

  // 최대치로도 목표에 못 닿으면 이 배치로는 만들 수 없는 난이도다.
  if (rateAt(hi) < opts.target) return null;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const rate = rateAt(mid);
    if (rate >= opts.target) {
      best = { moves: mid, winRate: rate, measured };
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  if (!best) return null;
  // 목표보다 너무 쉬우면 버린다. 한 수 줄이면 확 어려워지는 판이라
  // 이동 수로는 더 조절할 수 없다 - 배치를 바꿔야 한다.
  if (best.winRate > opts.target + opts.tolerance) return null;
  return { ...best, measured };
}

// ── 생성 ──────────────────────────────────────────────────────────────

export interface Generated {
  level: Level;
  winRate: number;
  /** 몇 번째 시도에서 나왔나 */
  attempt: number;
  measured: number;
}

/**
 * 레시피 하나로 레벨을 만든다. 목표 승률에 못 맞추면 배치를 새로 흔들어 다시 시도한다.
 *
 * 실패를 재시도로 푸는 이유: 어떤 배치는 이동 수를 아무리 줘도 목표 승률이 안
 * 나온다(막혀서 못 깨거나, 반대로 너무 쉬워서 한 수만 줄여도 0%가 되거나).
 * 그런 배치를 미리 걸러낼 방법이 없으므로 만들어 보고 재본 뒤 버린다.
 */
export function generateLevel(
  id: number,
  recipe: Recipe,
  rng: Rng,
  opts: FitOptions = DEFAULT_FIT,
  attempts = 12,
): Generated | null {
  let measured = 0;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const built = place(recipe, rng);
    if (!built) return null;

    const turnEnd = hooksFrom(built.placed);
    const base: Level = {
      id,
      layout: built.grid.map(row => row.join(' ')).join('\n'),
      moves: opts.maxMoves,
      colors: recipe.colors,
      goals: goalsFrom(built.placed, recipe),
      ...(turnEnd.length > 0 ? { turnEnd } : {}),
    };

    const fit = fitMoves(base, opts);
    measured += fit?.measured ?? opts.runs;
    if (!fit) continue;

    return {
      level: { ...base, moves: fit.moves },
      winRate: fit.winRate,
      attempt,
      measured,
    };
  }

  return null;
}
