import type { Board, Position } from './types';
import { COLOR_COUNT } from './types';
import { at, isAdjacent, isCellSwappable, key, parseKey, swap, wallBetween } from './board';
import { findMatchGroups } from './match';
import {
  applyCombo,
  expandSpecials,
  findCombo,
  markSpecials,
  planSpecials,
  type Blast,
  type SpecialSpawn,
  type TargetScorer,
} from './specials';
import {
  applyGravity,
  consumeCollects,
  pendingCollects,
  type CollectEvent,
  type ExitEvent,
  type FallMove,
} from './gravity';
import { applyDamage, damageAt, type DamageEvent } from './damage';
import { canUseAt, plantBooster, type BoosterKind } from './boosters';
import type { Rng } from './rng';

/**
 * 한 턴은 "단계의 목록"으로 표현한다. 최종 보드 하나만 돌려주지 않는 이유:
 *  - 화면은 이 목록을 순서대로 재생하기만 하면 된다(타이머와 상태 머신이 UI에서 사라진다)
 *  - 테스트는 각 단계를 그대로 단언할 수 있다("1콤보에서 몇 칸이 터졌나")
 *  - 봇은 단계를 무시하고 최종 보드만 보면 된다
 * 규칙과 연출이 이 경계에서 분리된다.
 */
/**
 * 모든 단계는 "그 단계가 끝난 직후의 보드"를 함께 들고 다닌다.
 * 화면은 단계를 순서대로 훑으며 board를 그대로 그리기만 하면 되고,
 * 규칙을 한 줄도 알 필요가 없다. 이게 없으면 UI가 스스로 보드를 재구성해야 하고,
 * 그 순간 규칙이 두 군데에 존재하게 된다.
 */
export type TurnStep =
  | { kind: 'swap'; board: Board; a: Position; b: Position }
  | { kind: 'revert'; board: Board; a: Position; b: Position }
  | {
      kind: 'clear';
      board: Board;
      combo: number;
      /** 실제로 없어지는 칸 */
      cells: string[];
      spawned: SpecialSpawn[];
      blasts: Blast[];
      /** 이번에 겹이 깎인 장애물·덮개 */
      damage: DamageEvent[];
    }
  | { kind: 'fall'; board: Board; moves: FallMove[]; exits: ExitEvent[] }
  /**
   * 수집물이 그릇에 담기는 순간.
   * board에는 아직 수집물이 남아 있다 - clear 단계와 같은 약속이다.
   * 그래야 화면이 "빨려 들어가는" 연출을 그릴 대상이 있다.
   */
  | { kind: 'collect'; board: Board; collects: CollectEvent[] }
  /** 턴이 끝난 뒤 보드가 스스로 바뀐 것(골렘 이동, 우편함 생성 등) */
  | { kind: 'board-effect'; board: Board; effects: BoardEffect[] };

export interface BoardEffect {
  kind: string;
  cells: string[];
}

/**
 * 턴이 끝난 뒤 보드를 스스로 바꾸는 훅.
 * "이동"·"생성" 축의 장애물이 여기서 동작한다. 규칙 엔진이 아니라 레벨이
 * 제공하는 것이므로 주입받는다.
 */
/**
 * 훅이 볼 수 있는 "이번 턴에 무슨 일이 있었나".
 *
 * 보드만으로는 알 수 없는 게 있다. 버섯은 **아무것도 못 없앤 턴에만** 다시
 * 자라는데, 훅에 넘어오는 건 턴이 끝난 뒤의 보드 하나뿐이라 "이번에 버섯이
 * 깎였는지"를 볼 방법이 없다. 그래서 피해 기록을 함께 넘긴다.
 */
export interface TurnContext {
  /** 이번 턴 연쇄 전체에서 깎인 것들 */
  damage: DamageEvent[];
}

export type TurnEndHook = (
  board: Board,
  rng: Rng,
  /** 대부분의 훅은 안 본다. 안 넘기면 "이번 턴엔 아무 일도 없었다"로 친다. */
  ctx?: TurnContext,
) => { board: Board; effects: BoardEffect[] } | null;

export interface TurnResult {
  /** 유효한 수였는가(아니면 되돌아간다 - 이동 횟수를 소모하지 않는다) */
  valid: boolean;
  steps: TurnStep[];
  board: Board;
  clearedCount: number;
  maxCombo: number;
}

export interface ResolveOptions {
  colors?: number;
  /** 연쇄가 이 횟수를 넘으면 규칙에 문제가 있다고 보고 멈춘다(무한루프 방지) */
  maxCascades?: number;
  /** 턴 종료 시 보드가 스스로 바뀌는 자리(골렘 등) */
  onTurnEnd?: TurnEndHook;
  /** 프로펠러가 노릴 칸의 점수 함수. 레벨 목표에서 만들어 넣는다. */
  targetScorer?: TargetScorer;
}

/**
 * 스왑 한 번을 끝까지 처리한다. 순수 함수 - 같은 (board, move, rng seed)면 항상 같은 결과.
 */
export function resolveTurn(
  board: Board,
  a: Position,
  b: Position,
  rng: Rng,
  options: ResolveOptions = {},
): TurnResult {
  const steps: TurnStep[] = [];

  if (!isAdjacent(a, b)) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }
  // 두 칸 사이에 벽이 있으면 아예 못 바꾼다.
  if (wallBetween(board, a, b)) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }

  const cellA = at(board, a.row, a.col);
  const cellB = at(board, b.row, b.col);
  const gemA = cellA.gem;
  const gemB = cellB.gem;
  // 수집물은 짐이라 집어 옮길 수 없고, 사슬·꿀에 붙잡힌 보석도 못 옮긴다.
  if (!isCellSwappable(cellA) || !isCellSwappable(cellB)) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }
  if (!gemA || !gemB) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }

  const current = swap(board, a, b);
  steps.push({ kind: 'swap', board: current, a, b });

  // 아이템 둘을 서로 스왑하면 개별 발동이 아니라 합체다(SPEC 5장).
  // 합체는 개별 효과의 합이 아니라 별도의 효과이므로 여기서 먼저 가른다.
  if (gemA.special && gemB.special) {
    const combo = findCombo(gemA.special, gemB.special);
    if (combo) {
      const outcome = applyCombo(current, b, a, combo, {
        rng,
        targetScorer: options.targetScorer,
      });
      return cascade(board, outcome.board, outcome.cells, null, [a, b], steps, options, rng, {
        a,
        b,
        comboBlasts: outcome.blasts,
      });
    }
  }

  // 아이템 하나만 움직였으면 그 아이템이 그 자리에서 발동한다.
  const seed = new Set<string>();
  let lightballTarget: number | null = null;
  if (gemA.special) {
    seed.add(key(b.row, b.col));
    if (gemA.special === 'lightball') lightballTarget = gemB.color;
  }
  if (gemB.special) {
    seed.add(key(a.row, a.col));
    if (gemB.special === 'lightball') lightballTarget = gemA.color;
  }

  return cascade(board, current, seed, lightballTarget, [a, b], steps, options, rng, { a, b });
}

/**
 * 그릇 위에 닿은 수집물을 담고, 담긴 만큼 다시 가라앉힌다.
 *
 * 담김을 낙하와 **다른 단계로** 남기는 게 요점이다. 한 덩어리로 처리하면
 * 아래가 비는 순간 수집물이 그냥 사라져서, 떨어져 들어가는 장면이 안 보인다.
 */
function settleCollects(
  board: Board,
  steps: TurnStep[],
  rng: Rng,
  colors: number,
): Board {
  let current = board;
  for (let guard = 0; guard < 20; guard++) {
    const ready = pendingCollects(current);
    if (ready.length === 0) break;

    // 이 단계의 board에는 수집물이 아직 있다 - 화면이 빨려 들어가는 연출을 그린다.
    steps.push({ kind: 'collect', board: current, collects: ready });
    current = consumeCollects(current, ready);

    const settle = applyGravity(current, new Set(), rng, colors);
    current = settle.board;
    steps.push({ kind: 'fall', board: current, moves: settle.moves, exits: settle.exits });
  }
  return current;
}

/**
 * 매치 -> 터짐 -> 낙하 -> 재매치를 끝까지 돌린다.
 * 스왑으로 시작하든 탭으로 시작하든 그 다음은 완전히 같으므로 한 곳에 둔다.
 *
 * @param origin  되돌릴 때 돌아갈 보드
 * @param revert  아무것도 안 터졌을 때 되돌리기 단계를 남길 두 칸(탭이면 없다)
 */
function cascade(
  origin: Board,
  start: Board,
  seed: Set<string>,
  lightballTargetInit: number | null,
  preferredInit: Position[],
  steps: TurnStep[],
  options: ResolveOptions,
  rng: Rng,
  revert?: { a: Position; b: Position; comboBlasts?: Blast[] },
): TurnResult {
  const colors = options.colors ?? COLOR_COUNT;
  const maxCascades = options.maxCascades ?? 50;

  let current = start;
  let clearedCount = 0;
  let maxCombo = 0;
  let combo = 0;
  let pending = seed;
  let preferred = preferredInit;
  let lightballTarget = lightballTargetInit;

  let hookRan = false;
  /** 훅에 넘길 이번 턴의 피해 기록 */
  const turnDamage: DamageEvent[] = [];

  // 연쇄를 끝까지 돌린 뒤, 턴 종료 훅이 보드를 바꿨다면 그 결과도 가라앉혀야 한다.
  // 훅은 칸을 비울 수 있고(골렘이 터지면 자기 자리가 빈다) 그대로 두면 화면에
  // 구멍이 남는다. 훅은 한 턴에 한 번만 돈다 - 매 번 매치를 만들어내는 훅이 있으면
  // 끝나지 않기 때문이다.
  while (true) {
    for (let i = 0; i < maxCascades; i++) {
      const groups = findMatchGroups(current);
      const base = new Set(pending);
      groups.forEach(g => g.cells.forEach(k => base.add(k)));

      if (base.size === 0) {
        if (combo === 0) {
          // 매치도 없고 아이템 발동도 없었다 - 되돌린다.
          if (revert) steps.push({ kind: 'revert', board: origin, a: revert.a, b: revert.b });
          return { valid: false, steps, board: origin, clearedCount: 0, maxCombo: 0 };
        }
        break;
      }

      combo++;
      maxCombo = combo;

      // 아이템 생성 판정은 "터지기 전" 매치 모양으로만 한다.
      // 왜: 아이템 폭발로 딸려 들어온 칸까지 세면 폭발 한 번에 아이템이 줄줄이 생긴다.
      const spawned = planSpecials(groups, preferred);

      // 이번에 새로 생기는 아이템은 이번 판에 같이 터지지 않는다.
      // markSpecials를 뒤에 하므로 expandSpecials 시점엔 아직 아이템이 아니다.
      const expanded = expandSpecials(current, base, {
        lightballTarget,
        rng,
        targetScorer: options.targetScorer,
      });
      const { cells, blastCells } = expanded;
      // 합체 연출은 첫 번째 clear 단계에 얹는다 - 그 폭발은 개별 아이템 발동이
      // 아니라 합체 자체의 것이므로 expandSpecials가 만들어내지 못한다.
      const blasts =
        combo === 1 && revert?.comboBlasts
          ? [...revert.comboBlasts, ...expanded.blasts]
          : expanded.blasts;
      spawned.forEach(s => cells.delete(s.key));

      current = markSpecials(current, spawned);

      // 장애물·덮개 피해. 덮개가 막아준 칸은 보석이 살아남으므로 삭제 대상에서 뺀다.
      const damage = applyDamage(current, cells, blastCells);
      current = damage.board;
      damage.shielded.forEach(k => cells.delete(k));
      turnDamage.push(...damage.events);

      clearedCount += cells.size;
      steps.push({
        kind: 'clear',
        board: current,
        combo,
        cells: [...cells].sort(),
        spawned,
        blasts,
        damage: damage.events,
      });

      const gravity = applyGravity(current, cells, rng, colors);
      current = gravity.board;
      steps.push({ kind: 'fall', board: current, moves: gravity.moves, exits: gravity.exits });
      current = settleCollects(current, steps, rng, colors);

      // 부서지면서 터진 장애물(통·폭죽탑)은 다음 연쇄의 씨앗이 된다.
      // 이번 단계에 끼워 넣지 않는 이유: 폭발이 또 폭발을 부르면 몇 겹이든
      // 한 화면에 뭉쳐 나와서 무엇 때문에 터졌는지 볼 수 없다.
      pending = new Set([...damage.chain].filter(k => {
        const { row, col } = parseKey(k);
        const c = at(current, row, col);
        return c.exists && (c.gem !== null || c.blocker !== null);
      }));
      preferred = [];
      lightballTarget = null;
    }

    if (hookRan || !options.onTurnEnd) break;
    hookRan = true;

    const effect = options.onTurnEnd(current, rng, { damage: turnDamage });
    if (!effect) break;
    current = effect.board;
    steps.push({ kind: 'board-effect', board: current, effects: effect.effects });

    // 훅이 남긴 빈칸을 메운다. 그 결과 매치가 생기면 위 연쇄가 다시 처리한다.
    const settle = applyGravity(current, new Set(), rng, colors);
    if (settle.moves.length > 0 || settle.exits.length > 0) {
      current = settle.board;
      steps.push({ kind: 'fall', board: current, moves: settle.moves, exits: settle.exits });
    }
    current = settleCollects(current, steps, rng, colors);
    pending = new Set();
    preferred = [];
  }

  return { valid: true, steps, board: current, clearedCount, maxCombo };
}

/**
 * 부스터를 지목한 칸에 쓴다(SPEC 11장).
 *
 * 아이템을 심는 부스터는 심어놓고 그 칸을 씨앗으로 연쇄를 돌린다 -
 * 매치로 만든 아이템과 발동 규칙이 완전히 같아야 하므로 경로를 공유한다.
 */
// 이름이 use로 시작하면 린트가 React 훅으로 오해한다. activateAt과 짝을 맞춰 둔다.
export function activateBooster(
  board: Board,
  pos: Position,
  kind: BoosterKind,
  rng: Rng,
  options: ResolveOptions = {},
): TurnResult {
  if (!canUseAt(board, pos, kind)) {
    return { valid: false, steps: [], board, clearedCount: 0, maxCombo: 0 };
  }

  const k = key(pos.row, pos.col);

  // 망치가 장애물·덮개를 직접 때린 경우는 터질 보석이 없다.
  const cell = at(board, pos.row, pos.col);
  if (kind === 'hammer' && (cell.blocker || cell.cover)) {
    const hit = damageAt(board, k);
    const steps: TurnStep[] = [
      {
        kind: 'clear',
        board: hit.board,
        combo: 1,
        cells: [],
        spawned: [],
        blasts: [],
        damage: hit.events,
      },
    ];
    const gravity = applyGravity(hit.board, new Set(), rng, options.colors ?? COLOR_COUNT);
    steps.push({
      kind: 'fall',
      board: gravity.board,
      moves: gravity.moves,
      exits: gravity.exits,
    });
    return { valid: true, steps, board: gravity.board, clearedCount: 0, maxCombo: 1 };
  }

  const planted = plantBooster(board, pos, kind);
  return cascade(board, planted, new Set([k]), null, [pos], [], options, rng);
}

/**
 * 아이템을 탭해서 그 자리에서 발동시킨다(SPEC 4.6).
 * 스왑과 달리 상대가 없으므로 라이트볼은 지목할 색이 없다.
 */
export function activateAt(
  board: Board,
  pos: Position,
  rng: Rng,
  options: ResolveOptions = {},
): TurnResult {
  const gem = at(board, pos.row, pos.col).gem;
  if (!gem?.special) {
    return { valid: false, steps: [], board, clearedCount: 0, maxCombo: 0 };
  }
  return cascade(board, board, new Set([key(pos.row, pos.col)]), null, [], [], options, rng);
}

/** 수를 둘 수 있는 자리가 하나라도 있는가. 아이템이 있으면 항상 둘 수 있다. */
export function hasAnyMove(board: Board): boolean {
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      if (at(board, r, c).gem?.special) return true;
    }
  }
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= board.height || c2 >= board.width) continue;
        if (wallBetween(board, { row: r, col: c }, { row: r2, col: c2 })) continue;
        const trial = swap(board, { row: r, col: c }, { row: r2, col: c2 });
        if (findMatchGroups(trial).length > 0) return true;
      }
    }
  }
  return false;
}

/** 지금 둘 수 있는 모든 수 */
export function listMoves(board: Board): { a: Position; b: Position }[] {
  const out: { a: Position; b: Position }[] = [];
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= board.height || c2 >= board.width) continue;
        const a = { row: r, col: c }, b = { row: r2, col: c2 };
        if (!isCellSwappable(at(board, r, c)) || !isCellSwappable(at(board, r2, c2))) continue;
        if (wallBetween(board, a, b)) continue;
        const trial = swap(board, a, b);
        const hasSpecial = at(board, r, c).gem?.special || at(board, r2, c2).gem?.special;
        if (hasSpecial || findMatchGroups(trial).length > 0) out.push({ a, b });
      }
    }
  }
  return out;
}
