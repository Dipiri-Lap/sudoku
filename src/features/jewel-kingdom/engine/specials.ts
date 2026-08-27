import type { Board, Position, SpecialKind } from './types';
import { at, isPlayable, key, matchColorOf, parseKey } from './board';
import type { MatchGroup } from './match';
import type { Rng } from './rng';

// ─────────────────────────────────────────────────────────────
// ※ SPEC 대상 구역 ※
// 아래 두 표가 "레퍼런스와 같은가"를 결정하는 전부다.
// 규칙을 바꾸려면 표만 고친다. 로직은 표를 읽을 뿐이다.
// docs/SPEC.md 의 항목 번호와 1:1로 대응시킬 것.
// ─────────────────────────────────────────────────────────────

export interface SpawnRule {
  /** 이 길이 이상이면 */
  minLength: number;
  /** 이 모양의 매치에서 */
  shape: 'row' | 'col' | 'square' | 'any';
  /** 이 아이템이 생긴다 */
  kind: SpecialKind;
}

/**
 * 위에서부터 먼저 맞는 규칙이 이긴다(긴 매치 우선).
 *
 * 로켓 방향은 매치 방향과 **수직**이다 - 가로로 4개를 맞추면 세로 로켓이 나온다.
 * 직관과 반대라서 확인 없이 구현하면 반드시 틀린다(실제로 처음엔 반대로 짰다).
 * 출처: Royal Match Wiki - Rocket / SPEC.md 3.1~3.2
 */
export const SPAWN_RULES: SpawnRule[] = [
  { minLength: 5, shape: 'any', kind: 'lightball' },
  { minLength: 4, shape: 'square', kind: 'propeller' },
  { minLength: 4, shape: 'row', kind: 'rocket-v' },
  { minLength: 4, shape: 'col', kind: 'rocket-h' },
];

/** 두 줄이 교차(L/T자)하면 생기는 아이템. null이면 교차 규칙 없음. */
export const INTERSECTION_KIND: SpecialKind | null = 'tnt';

/**
 * TNT 반경. 1이면 3x3, 2면 5x5.
 * 레퍼런스는 "two-tile radius"(5x5 = 25칸)다. TNT+TNT 합체가 반경 4(9x9 = 81칸,
 * 문서상 "약 80칸")인 것과도 앞뒤가 맞는다. SPEC.md 4.2 / 5장
 */
export const TNT_RADIUS = 2;

// ─────────────────────────────────────────────────────────────

export interface SpecialSpawn {
  key: string;
  kind: SpecialKind;
}

export interface Blast {
  row: number;
  col: number;
  kind: SpecialKind;
  /** 라이트볼이 지목한 색(라이트볼일 때만) */
  targetColor?: number | null;
  /** 프로펠러가 날아간 목적지(프로펠러일 때만) */
  destination?: Position;
}

/**
 * 프로펠러가 어디로 날아갈지 정하는 점수 함수.
 * "목표물이 가장 많은 칸"이 어디인지는 레벨 목표에 달렸으므로 주입받는다 -
 * 엔진이 레벨을 알아서는 안 된다.
 */
export type TargetScorer = (board: Board, row: number, col: number) => number;

/** 목표를 모를 때의 기본값: 주변에 장애물·덮개가 많은 칸을 노린다. */
export function defaultTargetScorer(board: Board, row: number, col: number): number {
  let score = 0;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r < 0 || c < 0 || r >= board.height || c >= board.width) continue;
      const cell = at(board, r, c);
      if (cell.blocker) score += 2;
      if (cell.cover) score += 1;
    }
  }
  return score;
}

/**
 * 프로펠러의 목적지. 점수가 가장 높은 칸들 중 하나를 고른다.
 * rng를 주면 동점인 칸 중 무작위로, 안 주면 첫 번째로 고정한다
 * (봇이 수를 평가할 때 난수열을 건드리면 시드 재현성이 깨진다).
 */
export function propellerDestination(
  board: Board,
  origin: Position,
  scorer: TargetScorer = defaultTargetScorer,
  rng?: Rng,
): Position {
  let best: Position[] = [];
  let bestScore = -Infinity;

  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const cell = at(board, r, c);
      if (!isPlayable(cell) || !cell.gem) continue;
      if (r === origin.row && c === origin.col) continue;
      const score = scorer(board, r, c);
      if (score > bestScore) {
        bestScore = score;
        best = [{ row: r, col: c }];
      } else if (score === bestScore) {
        best.push({ row: r, col: c });
      }
    }
  }

  if (best.length === 0) return origin;
  return best[rng ? rng.int(best.length) : 0];
}

/**
 * 이번 매치들로 어떤 아이템이 어디에 생기는지 결정한다.
 * preferred(플레이어가 직접 움직인 칸)가 그 매치에 포함되면 거기에 생긴다.
 * 왜: 손가락이 있던 자리에 생겨야 "내가 만들었다"가 읽힌다. 연쇄로 생긴
 * 경우엔 그런 기준점이 없으므로 줄의 중앙에 둔다.
 */
export function planSpecials(groups: MatchGroup[], preferred: Position[] = []): SpecialSpawn[] {
  const preferredKeys = new Set(preferred.map(p => key(p.row, p.col)));
  const spawns: SpecialSpawn[] = [];
  const used = new Set<string>();

  // 교차점 먼저 - 가로줄과 세로줄이 같은 칸을 공유하면 그게 L/T자다.
  // 정사각형 매치는 줄 매치와 겹치기 쉬우므로 교차 판정에서 제외한다.
  // (안 그러면 2x2 하나가 옆 줄과 겹칠 때마다 TNT가 생긴다)
  if (INTERSECTION_KIND) {
    const lines = groups.filter(g => g.shape !== 'square');
    const seen = new Map<string, MatchGroup>();
    lines.forEach(g => {
      g.cells.forEach(c => {
        const other = seen.get(c);
        if (other && other.shape !== g.shape && !used.has(c)) {
          used.add(c);
          spawns.push({ key: c, kind: INTERSECTION_KIND });
        } else if (!other) {
          seen.set(c, g);
        }
      });
    });
  }

  groups.forEach(group => {
    // 이미 교차점 아이템이 나온 줄은 건너뛴다(한 매치에 아이템 하나).
    if (group.cells.some(c => used.has(c))) return;
    const rule = SPAWN_RULES.find(
      r => group.cells.length >= r.minLength && (r.shape === 'any' || r.shape === group.shape),
    );
    if (!rule) return;
    const spot =
      group.cells.find(c => preferredKeys.has(c)) ??
      group.cells[Math.floor(group.cells.length / 2)];
    if (used.has(spot)) return;
    used.add(spot);
    spawns.push({ key: spot, kind: rule.kind });
  });

  return spawns;
}

/** 아이템 하나가 터뜨리는 범위. 표를 읽어 좌표만 계산한다. */
export function blastArea(
  board: Board,
  row: number,
  col: number,
  kind: SpecialKind,
  targetColor: number | null,
  destination: Position | null = null,
): string[] {
  const out: string[] = [];
  const push = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= board.height || c >= board.width) return;
    out.push(key(r, c));
  };

  switch (kind) {
    case 'rocket-h':
      for (let c = 0; c < board.width; c++) push(row, c);
      break;
    case 'rocket-v':
      for (let r = 0; r < board.height; r++) push(r, col);
      break;
    case 'tnt':
      for (let r = row - TNT_RADIUS; r <= row + TNT_RADIUS; r++) {
        for (let c = col - TNT_RADIUS; c <= col + TNT_RADIUS; c++) push(r, c);
      }
      break;
    case 'lightball':
      // 지목된 색 전부.
      if (targetColor === null) break;
      for (let r = 0; r < board.height; r++) {
        for (let c = 0; c < board.width; c++) {
          if (matchColorOf(at(board, r, c).gem) === targetColor) push(r, c);
        }
      }
      break;
    case 'propeller': {
      // 있던 자리에서 주변을 십자로 날리고, 목표 칸으로 날아가 그 한 칸을 없앤다.
      // 십자는 출발 자리에, 단일 삭제는 목적지에 일어난다 - 방향을 바꿔 적으면
      // "멀리서 크게 터지는" 완전히 다른 아이템이 된다.
      push(row, col);
      push(row - 1, col);
      push(row + 1, col);
      push(row, col - 1);
      push(row, col + 1);
      if (destination && (destination.row !== row || destination.col !== col)) {
        push(destination.row, destination.col);
      }
      break;
    }
  }
  return out;
}

/**
 * 삭제 대상에 아이템이 포함돼 있으면 그 발동 범위를 삭제 대상에 더한다.
 * 새로 딸려 들어온 칸에 또 아이템이 있으면 그것도 터진다(연쇄 발동).
 * 발동된 아이템 목록도 같이 돌려준다 - 연출은 이걸 보고 그린다.
 */
export interface ExpandOptions {
  /** 라이트볼이 지목한 색 */
  lightballTarget?: number | null;
  /** 프로펠러 목적지의 동점 처리에 쓴다. 없으면 결정적으로 첫 칸을 고른다. */
  rng?: Rng;
  /** 프로펠러가 노릴 칸의 점수 함수 (레벨 목표에서 만들어 넣는다) */
  targetScorer?: TargetScorer;
}

export function expandSpecials(
  board: Board,
  seed: Set<string>,
  options: ExpandOptions = {},
): { cells: Set<string>; blasts: Blast[]; blastCells: Set<string> } {
  const lightballTarget = options.lightballTarget ?? null;
  const cells = new Set(seed);
  // 폭발로 딸려 들어온 칸만 따로 센다 - "아이템으로만 부서지는" 장애물 판정에 쓴다.
  const blastCells = new Set<string>();
  const blasts: Blast[] = [];
  const queue = [...seed];

  while (queue.length > 0) {
    const k = queue.pop() as string;
    const { row, col } = parseKey(k);
    const cell = at(board, row, col);
    const kind = cell.gem?.special;
    if (!kind) continue;
    if (blasts.some(b => b.row === row && b.col === col)) continue;

    const targetColor =
      kind === 'lightball' ? lightballTarget ?? pickLightballColor(board, options.rng) : null;
    const destination =
      kind === 'propeller'
        ? propellerDestination(board, { row, col }, options.targetScorer, options.rng)
        : undefined;
    blasts.push({ row, col, kind, targetColor, destination });

    blastArea(board, row, col, kind, targetColor, destination ?? null).forEach(nk => {
      const p = parseKey(nk);
      const target = at(board, p.row, p.col);
      if (!isPlayable(target)) return;
      // 수집물은 폭발에 면역이다. 없애버리면 그릇까지 보낼 것이 사라져
      // 진행이 날아가고, 수가 한정된 레벨은 아예 못 깨게 된다.
      // 폭발은 그 위를 지나가고 아래 보석만 치운다 - 오히려 길을 내준다.
      if (target.gem?.inert) return;
      blastCells.add(nk);
      if (cells.has(nk)) return;
      cells.add(nk);
      queue.push(nk);
    });
  }

  return { cells, blasts, blastCells };
}

/** 아이템이 생길 칸의 보석을 그 자리에서 변신시킨다. id는 유지한다. */
export function markSpecials(board: Board, spawns: SpecialSpawn[]): Board {
  if (spawns.length === 0) return board;
  const next: Board = { ...board, cells: board.cells.map(c => ({ ...c })) };
  spawns.forEach(({ key: k, kind }) => {
    const { row, col } = parseKey(k);
    const cell = next.cells[row * next.width + col];
    if (!cell.gem) return;
    cell.gem = { ...cell.gem, special: kind, color: kind === 'lightball' ? null : cell.gem.color };
  });
  return next;
}

// ─────────────────────────────────────────────────────────────
// ※ SPEC 5장 대상 구역 - 아이템 합체 ※
// 두 아이템을 서로 스왑했을 때. 조합이 유한하므로 표 하나로 명세된다.
// ─────────────────────────────────────────────────────────────

/** 로켓은 방향이 둘이지만 합체 판정에서는 하나로 본다. */
export type SpecialFamily = 'rocket' | 'tnt' | 'propeller' | 'lightball';

export function familyOf(kind: SpecialKind): SpecialFamily {
  return kind === 'rocket-h' || kind === 'rocket-v' ? 'rocket' : kind;
}

export type ComboEffect =
  /** 합쳐진 칸의 행과 열 전체 */
  | { effect: 'cross'; band: number }
  /** 합쳐진 칸을 중심으로 반경 N */
  | { effect: 'radius'; radius: number }
  /** 보드에서 가장 많은 색을 전부 이 아이템으로 바꾸고 모두 터뜨린다 */
  | { effect: 'transform'; into: SpecialKind }
  /** 프로펠러가 이 아이템을 싣고 목적지로 날아가 그 자리에서 터뜨린다 */
  | { effect: 'carry'; payload: SpecialKind }
  /** 프로펠러 N개가 각각 다른 목적지를 친다 */
  | { effect: 'swarm'; count: number }
  /** 보드 전체 + 모든 장애물 한 겹 */
  | { effect: 'clear-board' };

export interface ComboRule {
  a: SpecialFamily;
  b: SpecialFamily;
  combo: ComboEffect;
}

/**
 * 합체표. 순서는 상관없다(a+b와 b+a는 같다).
 * 출처: Royal Match Help Center / Wiki - Power-up Combinations
 */
export const COMBOS: ComboRule[] = [
  { a: 'rocket', b: 'rocket', combo: { effect: 'cross', band: 1 } },
  { a: 'rocket', b: 'tnt', combo: { effect: 'cross', band: 3 } },
  { a: 'tnt', b: 'tnt', combo: { effect: 'radius', radius: 4 } },
  { a: 'lightball', b: 'rocket', combo: { effect: 'transform', into: 'rocket-h' } },
  { a: 'lightball', b: 'tnt', combo: { effect: 'transform', into: 'tnt' } },
  { a: 'lightball', b: 'propeller', combo: { effect: 'transform', into: 'propeller' } },
  { a: 'lightball', b: 'lightball', combo: { effect: 'clear-board' } },
  { a: 'propeller', b: 'rocket', combo: { effect: 'carry', payload: 'rocket-h' } },
  { a: 'propeller', b: 'tnt', combo: { effect: 'carry', payload: 'tnt' } },
  { a: 'propeller', b: 'propeller', combo: { effect: 'swarm', count: 3 } },
];

export function findCombo(a: SpecialKind, b: SpecialKind): ComboEffect | null {
  const fa = familyOf(a);
  const fb = familyOf(b);
  const rule = COMBOS.find(r => (r.a === fa && r.b === fb) || (r.a === fb && r.b === fa));
  return rule ? rule.combo : null;
}

/** 보드에 실제로 존재하는 색들 */
export function colorsOnBoard(board: Board): number[] {
  const set = new Set<number>();
  board.cells.forEach(cell => {
    const color = matchColorOf(cell.gem);
    if (color !== null) set.add(color);
  });
  return [...set].sort((a, b) => a - b);
}

/**
 * 라이트볼이 지목할 색을 정하지 못했을 때(탭해서 발동했거나 연쇄에 휘말렸을 때)
 * 고를 색. 스왑으로 발동하면 상대 보석의 색이 정해지지만, 상대가 없으면
 * 아무 색이나 하나 골라야 한다 - 안 그러면 라이트볼이 자기만 사라지고 만다.
 *
 * rng가 없으면(봇이 수를 평가할 때) 결정적으로 첫 색을 고른다.
 */
export function pickLightballColor(board: Board, rng?: Rng): number | null {
  const colors = colorsOnBoard(board);
  if (colors.length === 0) return null;
  return colors[rng ? rng.int(colors.length) : 0];
}

/** 보드에서 가장 많은 색. 라이트볼 합체가 노리는 대상이다(SPEC 5장). */
export function mostCommonColor(board: Board): number | null {
  const counts = new Map<number, number>();
  board.cells.forEach(cell => {
    const color = matchColorOf(cell.gem);
    if (color === null) return;
    counts.set(color, (counts.get(color) ?? 0) + 1);
  });
  let best: number | null = null;
  let bestCount = 0;
  counts.forEach((n, color) => {
    if (n > bestCount) {
      bestCount = n;
      best = color;
    }
  });
  return best;
}

export interface ComboOutcome {
  /** 합체로 바뀐 보드(변신이 일어난 경우) */
  board: Board;
  /** 즉시 삭제 대상 */
  cells: Set<string>;
  blasts: Blast[];
}

/**
 * 두 아이템을 합친다.
 *
 * 합체는 개별 발동의 조합이 아니라 **별도의 효과**다. 그래서 expandSpecials의
 * 연쇄 경로가 아니라 여기서 한 번에 계산하고, 결과 칸들을 연쇄의 씨앗으로 넘긴다.
 *
 * @param origin 두 아이템이 합쳐진 칸(플레이어가 끌어다 놓은 자리)
 * @param other  상대 아이템이 있던 칸
 */
export function applyCombo(
  board: Board,
  origin: Position,
  other: Position,
  combo: ComboEffect,
  options: ExpandOptions = {},
): ComboOutcome {
  // 합체에 쓰인 두 아이템은 여기서 소비된다. special을 떼어내지 않으면
  // 이어지는 연쇄에서 각자 한 번 더 발동해버린다(십자 합체가 로켓 두 발을
  // 덤으로 쏘는 식). 겉보기 결과가 같은 조합도 있어서 눈에 잘 안 띈다.
  const consumed: Board = { ...board, cells: board.cells.map(c => ({ ...c })) };
  [origin, other].forEach(p => {
    const cell = consumed.cells[p.row * consumed.width + p.col];
    if (cell.gem?.special) cell.gem = { ...cell.gem, special: undefined };
  });
  board = consumed;

  const cells = new Set<string>();
  const blasts: Blast[] = [];
  const push = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= board.height || c >= board.width) return;
    const target = at(board, r, c);
    if (!isPlayable(target)) return;
    if (target.gem?.inert) return; // 수집물은 폭발에 면역(SPEC 6.24)
    cells.add(key(r, c));
  };

  // 합쳐진 두 칸은 언제나 사라진다.
  push(origin.row, origin.col);
  push(other.row, other.col);

  switch (combo.effect) {
    case 'cross': {
      const half = Math.floor(combo.band / 2);
      for (let d = -half; d <= half; d++) {
        for (let c = 0; c < board.width; c++) push(origin.row + d, c);
        for (let r = 0; r < board.height; r++) push(r, origin.col + d);
      }
      blasts.push({ row: origin.row, col: origin.col, kind: 'rocket-h' });
      blasts.push({ row: origin.row, col: origin.col, kind: 'rocket-v' });
      return { board, cells, blasts };
    }

    case 'radius': {
      for (let r = origin.row - combo.radius; r <= origin.row + combo.radius; r++) {
        for (let c = origin.col - combo.radius; c <= origin.col + combo.radius; c++) push(r, c);
      }
      blasts.push({ row: origin.row, col: origin.col, kind: 'tnt' });
      return { board, cells, blasts };
    }

    case 'transform': {
      // 가장 많은 색을 전부 아이템으로 바꾼 뒤 그것들이 모두 터진다.
      // 단독 발동(라이트볼 + 평범한 보석)이 "스왑한 상대 색"을 노리는 것과 달리
      // 합체는 "보드에서 가장 많은 색"을 노린다 - 헷갈리기 쉬운 지점이다.
      const target = mostCommonColor(board);
      if (target === null) return { board, cells, blasts };

      const next: Board = { ...board, cells: board.cells.map(c => ({ ...c })) };
      let turned = 0;
      for (let r = 0; r < next.height; r++) {
        for (let c = 0; c < next.width; c++) {
          const cell = next.cells[r * next.width + c];
          if (!cell.gem || cell.gem.color !== target || cell.gem.special) continue;
          // 로켓으로 바꿀 때는 방향을 번갈아 준다 - 전부 같은 방향이면
          // 한 축으로만 쓸려서 판이 이상하게 남는다.
          // 좌표 패리티로 나누면 안 된다: 색 배치가 패리티와 맞아떨어지는 판에서는
          // 전부 한 방향이 되어버린다. 바꾼 순서로 세는 게 안전하다.
          const kind: SpecialKind =
            combo.into === 'rocket-h' && turned % 2 === 1 ? 'rocket-v' : combo.into;
          cell.gem = { ...cell.gem, special: kind };
          cells.add(key(r, c));
          turned++;
        }
      }
      return { board: next, cells, blasts };
    }

    case 'carry': {
      const dest = propellerDestination(board, origin, options.targetScorer, options.rng);
      blastArea(board, dest.row, dest.col, combo.payload, null).forEach(k => {
        const p = parseKey(k);
        push(p.row, p.col);
      });
      blasts.push({ row: origin.row, col: origin.col, kind: 'propeller', destination: dest });
      blasts.push({ row: dest.row, col: dest.col, kind: combo.payload });
      return { board, cells, blasts };
    }

    case 'swarm': {
      // 합쳐진 자리의 십자
      push(origin.row - 1, origin.col);
      push(origin.row + 1, origin.col);
      push(origin.row, origin.col - 1);
      push(origin.row, origin.col + 1);
      // 목적지가 겹치지 않도록 이미 고른 칸은 후보에서 뺀다.
      const taken = new Set<string>();
      for (let i = 0; i < combo.count; i++) {
        const scorer: TargetScorer = (b, r, c) =>
          taken.has(key(r, c))
            ? -Infinity
            : (options.targetScorer ?? defaultTargetScorer)(b, r, c);
        const dest = propellerDestination(board, origin, scorer, options.rng);
        taken.add(key(dest.row, dest.col));
        // 프로펠러 하나당 목표 한 칸. 십자는 출발 자리에서 한 번만 일어난다.
        push(dest.row, dest.col);
        blasts.push({ row: origin.row, col: origin.col, kind: 'propeller', destination: dest });
      }
      return { board, cells, blasts };
    }

    case 'clear-board': {
      for (let r = 0; r < board.height; r++) {
        for (let c = 0; c < board.width; c++) push(r, c);
      }
      blasts.push({ row: origin.row, col: origin.col, kind: 'lightball' });
      return { board, cells, blasts };
    }
  }
}
