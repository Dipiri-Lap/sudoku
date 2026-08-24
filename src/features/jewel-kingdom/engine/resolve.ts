import type { Board, Position } from './types';
import { COLOR_COUNT } from './types';
import { at, isAdjacent, key, swap } from './board';
import { findMatchGroups } from './match';
import { expandSpecials, markSpecials, planSpecials, type Blast, type SpecialSpawn } from './specials';
import { applyGravity, type FallMove } from './gravity';
import { applyDamage } from './damage';
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
      /** 겹이 하나 깎인 장애물·덮개 칸 */
      damaged: string[];
      /** 완전히 없어진 장애물 칸 */
      destroyed: string[];
    }
  | { kind: 'fall'; board: Board; moves: FallMove[] }
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
export type TurnEndHook = (
  board: Board,
  rng: Rng,
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
  const colors = options.colors ?? COLOR_COUNT;
  const maxCascades = options.maxCascades ?? 50;
  const steps: TurnStep[] = [];

  if (!isAdjacent(a, b)) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }

  const gemA = at(board, a.row, a.col).gem;
  const gemB = at(board, b.row, b.col).gem;
  if (!gemA || !gemB) {
    return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
  }

  let current = swap(board, a, b);
  steps.push({ kind: 'swap', board: current, a, b });

  // 아이템을 스왑하면 매치가 없어도 발동한다.
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

  let clearedCount = 0;
  let maxCombo = 0;
  let combo = 0;
  let pending = seed;
  let preferred: Position[] = [a, b];

  for (let i = 0; i < maxCascades; i++) {
    const groups = findMatchGroups(current);
    const base = new Set(pending);
    groups.forEach(g => g.cells.forEach(k => base.add(k)));

    if (base.size === 0) {
      if (combo === 0) {
        // 매치도 없고 아이템 발동도 없었다 - 되돌린다.
        steps.push({ kind: 'revert', board, a, b });
        return { valid: false, steps, board, clearedCount: 0, maxCombo: 0 };
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
    const { cells, blasts, blastCells } = expandSpecials(current, base, lightballTarget);
    spawned.forEach(s => cells.delete(s.key));

    current = markSpecials(current, spawned);

    // 장애물·덮개 피해. 덮개가 막아준 칸은 보석이 살아남으므로 삭제 대상에서 뺀다.
    const damage = applyDamage(current, cells, blastCells);
    current = damage.board;
    damage.shielded.forEach(k => cells.delete(k));

    clearedCount += cells.size;
    steps.push({
      kind: 'clear',
      board: current,
      combo,
      cells: [...cells].sort(),
      spawned,
      blasts,
      damaged: damage.damaged,
      destroyed: damage.destroyed,
    });

    const gravity = applyGravity(current, cells, rng, colors);
    current = gravity.board;
    steps.push({ kind: 'fall', board: current, moves: gravity.moves });

    pending = new Set();
    preferred = [];
    lightballTarget = null;
  }

  // 턴이 끝난 뒤 보드가 스스로 바뀐다면 여기서 한 번 돌린다.
  // 그 결과로 매치가 생기면 다시 연쇄를 처리해야 하지만, 훅이 매 턴 매치를
  // 만들어내면 끝나지 않으므로 한 번만 이어서 처리한다.
  if (options.onTurnEnd) {
    const effect = options.onTurnEnd(current, rng);
    if (effect) {
      current = effect.board;
      steps.push({ kind: 'board-effect', board: current, effects: effect.effects });
    }
  }

  return { valid: true, steps, board: current, clearedCount, maxCombo };
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
        if (!at(board, r, c).gem || !at(board, r2, c2).gem) continue;
        const trial = swap(board, a, b);
        const hasSpecial = at(board, r, c).gem?.special || at(board, r2, c2).gem?.special;
        if (hasSpecial || findMatchGroups(trial).length > 0) out.push({ a, b });
      }
    }
  }
  return out;
}
