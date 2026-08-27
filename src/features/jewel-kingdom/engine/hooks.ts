import type { Blocker, Board, GemColor } from './types';
import { at, blocksFalling, cloneBoard, inBounds, key, parseKey } from './board';
import { applySpread } from './damage';
import type { BoardEffect, TurnContext, TurnEndHook } from './resolve';
import type { Rng } from './rng';

/**
 * 턴이 끝난 뒤 보드가 스스로 바뀌는 것들.
 *
 * 매치 규칙과 성격이 다르다. 매치는 "플레이어가 무엇을 했는가"의 결과지만,
 * 이것들은 플레이어와 무관하게 매 턴 일어난다. 그래서 규칙 엔진 안이 아니라
 * 레벨이 주입하는 훅으로 둔다(resolveTurn의 onTurnEnd).
 */

/**
 * 골렘(SPEC 9.1): 매 턴 한 칸씩 아래로 내려온다.
 * 바닥에 닿으면 주변에 장애물을 쏟아낸다.
 *
 * 아래 보석과 **자리를 맞바꾸며** 내려간다. "빈 칸일 때만 내려간다"로 두면
 * 영영 못 움직인다 - 이 훅은 턴이 끝난 뒤, 그러니까 중력이 판을 이미 다
 * 채워놓은 뒤에 돌기 때문이다. 빈 칸은 존재하지 않는다.
 *
 * 맞바꾸기라 판이 흔들리는 양은 보석 하나로 끝난다. 아래로 밀어붙여
 * 줄줄이 올리는 방식보다 판을 읽기 쉽다.
 */
export function golemHook(options: { spawnKind?: string; spawnCount?: number } = {}): TurnEndHook {
  const spawnKind = options.spawnKind ?? 'rubble';
  const spawnCount = options.spawnCount ?? 3;

  return (board: Board, rng: Rng) => {
    const golems: { row: number; col: number }[] = [];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        if (at(board, r, c).blocker?.moving) golems.push({ row: r, col: c });
      }
    }
    if (golems.length === 0) return null;

    const next = cloneBoard(board);
    const effects: BoardEffect[] = [];

    // 아래쪽부터 처리해야 골렘 둘이 세로로 붙어 있을 때 서로를 밟지 않는다.
    golems.sort((a, b) => b.row - a.row);

    golems.forEach(({ row, col }) => {
      const cell = at(next, row, col);
      const golem = cell.blocker;
      if (!golem) return;

      // 아래로 내려오지 않는 것들은 목적지를 따로 고른다.
      if (golem.move && golem.move !== 'down') {
        const dest = destinationOf(next, row, col, golem, rng);
        if (!dest) return;
        const moved = { ...golem, ...dest.next };
        if (dest.row === row && dest.col === col) {
          // 벽에 닿아 방향만 바꿨다. 자리는 그대로지만 보드는 바뀌었으므로
          // 효과를 남겨야 한다 - 안 그러면 훅이 null을 돌려주고 바뀐 방향이 버려진다.
          cell.blocker = moved;
          effects.push({ kind: 'golem-turn', cells: [key(row, col)] });
          return;
        }
        const target = at(next, dest.row, dest.col);
        const displaced = target.gem;
        cell.blocker = null;
        cell.gem = displaced;
        target.gem = null;
        target.blocker = moved;
        effects.push({ kind: 'golem-move', cells: [key(row, col), key(dest.row, dest.col)] });
        return;
      }

      const belowRow = row + 1;
      const reachedBottom = belowRow >= next.height;
      const below = reachedBottom ? null : at(next, belowRow, col);

      if (!reachedBottom && below && !blocksFalling(below)) {
        // 아래 보석과 자리를 바꾼다.
        const displaced = below.gem;
        cell.blocker = null;
        cell.gem = displaced;
        below.gem = null;
        below.blocker = golem;
        effects.push({ kind: 'golem-move', cells: [key(row, col), key(belowRow, col)] });
        return;
      }

      if (!reachedBottom) {
        // 고정 장애물이나 구멍에 막혔다. 이번 턴은 그대로 머문다.
        return;
      }

      // 바닥에 닿았다 - 쏟아내고 사라진다.
      //
      // 무엇을 어떻게 쏟는지는 장애물이 정한다(spreads). 거북은 제 열에 잎을
      // 깔고 골렘은 판 여기저기에 잔해를 흩뿌린다 - 같은 "도착하면 쏟는다"
      // 축인데 퍼지는 모양만 다르다.
      cell.blocker = null;
      const spawned = golem.spreads
        ? applySpread(next, { row, col }, golem.spreads)
        : scatter(next, rng, spawnKind, spawnCount);
      effects.push({ kind: 'golem-burst', cells: [key(row, col), ...spawned] });
    });

    return effects.length > 0 ? { board: next, effects } : null;
  };
}

/** 판 위 아무 데나 골라 장애물을 흩뿌린다(골렘의 잔해) */
function scatter(board: Board, rng: Rng, kind: string, count: number): string[] {
  const candidates: { row: number; col: number }[] = [];
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      if (at(board, r, c).gem && !at(board, r, c).blocker) candidates.push({ row: r, col: c });
    }
  }
  const spawned: string[] = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const pick = candidates.splice(rng.int(candidates.length), 1)[0];
    const target = at(board, pick.row, pick.col);
    target.gem = null;
    target.blocker = { kind, layers: 1 };
    spawned.push(key(pick.row, pick.col));
  }
  return spawned;
}

/**
 * 아래로 내려오지 않는 이동들 - 순간이동(거대 드릴)·왕복(물탑)·경로(돌뱀·눈사람).
 *
 * 내려오는 것과 한 훅에 묶는다. 셋 다 "매 턴 자리를 옮긴다"이고, 옮긴 자리의
 * 보석과 맞바꾼다는 처리가 같다. 다른 건 목적지를 고르는 방법뿐이다.
 */
function destinationOf(
  board: Board,
  row: number,
  col: number,
  blocker: Blocker,
  rng: Rng,
): { row: number; col: number; next: Partial<Blocker> } | null {
  switch (blocker.move) {
    case 'teleport': {
      const spots: { row: number; col: number }[] = [];
      for (let r = 0; r < board.height; r++) {
        for (let c = 0; c < board.width; c++) {
          const cell = at(board, r, c);
          if (cell.exists && cell.gem && !cell.blocker) spots.push({ row: r, col: c });
        }
      }
      if (spots.length === 0) return null;
      const pick = spots[rng.int(spots.length)];
      return { ...pick, next: {} };
    }
    case 'sweep': {
      const dir = blocker.dir ?? 1;
      const c = col + dir;
      const free = inBounds(board, row, c) && !blocksFalling(at(board, row, c));
      // 벽에 닿으면 이번 턴은 방향만 바꾸고 제자리에 있는다.
      if (!free) return { row, col, next: { dir: (dir === 1 ? -1 : 1) as 1 | -1 } };
      return { row, col: c, next: { dir } };
    }
    case 'path': {
      const path = blocker.path;
      // 경로를 안 준 채로 놓였으면 제 행을 왕복한다. 움직이는 게 이 축의 핵심이라
      // 경로가 없다고 가만히 서 있으면 다른 장애물과 구분이 안 된다.
      if (!path || path.length === 0) {
        return destinationOf(board, row, col, { ...blocker, move: 'sweep' }, rng);
      }
      const step = ((blocker.step ?? 0) + 1) % path.length;
      const { row: r, col: c } = parseKey(path[step]);
      if (!inBounds(board, r, c) || blocksFalling(at(board, r, c))) return null;
      return { row: r, col: c, next: { step } };
    }
    default:
      return null;
  }
}

/**
 * 생성 장애물(우편함 등): 매 턴 인접한 빈 자리에 무언가를 내놓는다.
 * 여기서는 "특정 색 보석을 뱉는" 형태로 구현한다.
 */
export function producerHook(color: GemColor): TurnEndHook {
  return (board: Board, rng: Rng) => {
    const sources: { row: number; col: number }[] = [];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        if (at(board, r, c).blocker?.produces) sources.push({ row: r, col: c });
      }
    }
    if (sources.length === 0) return null;

    const next = cloneBoard(board);
    const effects: BoardEffect[] = [];
    // 이번 턴에 아무것도 안 뱉었어도 충전은 깎였을 수 있다. 그것까지 보드에
    // 남겨야 주기가 이어진다 - 효과만 보고 null을 돌려주면 충전이 매 턴 되감긴다.
    let charged = false;

    sources.forEach(({ row, col }) => {
      const source = at(next, row, col).blocker;
      if (!source) return;
      // 몇 턴에 한 번만 뱉는 것들(허수아비). 남은 턴 수는 보드가 들고 있다.
      if (source.everyN && source.everyN > 1) {
        const charge = source.charge ?? source.everyN;
        charged = true;
        if (charge > 1) {
          at(next, row, col).blocker = { ...source, charge: charge - 1 };
          return;
        }
        at(next, row, col).blocker = { ...source, charge: source.everyN };
      }

      const around = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ].filter(p => {
        if (p.row < 0 || p.col < 0 || p.row >= next.height || p.col >= next.width) return false;
        const cell = at(next, p.row, p.col);
        return cell.exists && !cell.blocker && cell.gem !== null;
      });
      if (around.length === 0) return;

      const spot = around[rng.int(around.length)];
      const cell = at(next, spot.row, spot.col);
      if (!cell.gem) return;
      // 색만 바꾼다. id를 유지해야 화면에서 "새로 생긴 것"이 아니라
      // "그 자리 보석이 바뀐 것"으로 보인다.
      cell.gem = { ...cell.gem, color, special: undefined };
      effects.push({ kind: 'produced', cells: [key(spot.row, spot.col)] });
    });

    return effects.length > 0 || charged ? { board: next, effects } : null;
  };
}

/**
 * 다시 자라는 장애물(버섯).
 *
 * 이번 턴에 **하나도 못 없앴으면** 바닥 위에 하나가 되살아난다. 겹이 두꺼운
 * 장애물과는 압박의 성격이 다르다 - 겹은 때린 만큼 남고, 이건 **때리지 않으면
 * 되돌아간다.** 그래서 "이번 수로 진행이 있었나"가 매 턴 걸린다.
 *
 * 출처: 레퍼런스 도움말 - 한 수 뒤에 버섯이 하나도 부서지지 않았으면
 * 바닥 칸 중 하나에 버섯이 다시 나타난다.
 */
export function regrowHook(blockerKind: string, groundKind: string): TurnEndHook {
  return (board: Board, rng: Rng, ctx: TurnContext = { damage: [] }) => {
    const cleared = ctx.damage.some(
      e => e.target === 'blocker' && e.kind === blockerKind && e.destroyed,
    );
    if (cleared) return null;

    // 판에 그 장애물이 아예 없으면 다 치운 것이다 - 되살리지 않는다.
    // 안 그러면 목표를 채운 순간 다시 생겨서 영영 못 끝낸다.
    const stillThere = board.cells.some(c => c.blocker?.kind === blockerKind);
    if (!stillThere) return null;

    const spots: { row: number; col: number }[] = [];
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        const cell = at(board, r, c);
        if (cell.exists && cell.ground?.kind === groundKind && !cell.blocker) {
          spots.push({ row: r, col: c });
        }
      }
    }
    if (spots.length === 0) return null;

    const next = cloneBoard(board);
    const pick = spots[rng.int(spots.length)];
    const cell = at(next, pick.row, pick.col);
    cell.gem = null;
    cell.blocker = { kind: blockerKind, layers: 1 };
    return { board: next, effects: [{ kind: 'regrow', cells: [key(pick.row, pick.col)] }] };
  };
}

/** 훅 여러 개를 순서대로 적용한다. */
export function combineHooks(...hooks: TurnEndHook[]): TurnEndHook {
  return (board, rng, ctx) => {
    let current = board;
    const effects: BoardEffect[] = [];
    hooks.forEach(hook => {
      const result = hook(current, rng, ctx);
      if (!result) return;
      current = result.board;
      effects.push(...result.effects);
    });
    return effects.length > 0 ? { board: current, effects } : null;
  };
}

/**
 * 컨베이어 벨트(레퍼런스 Container Element).
 * 정해진 경로를 따라 매 턴 보석이 한 칸씩 밀려간다. 경로의 마지막 칸에 있던
 * 보석은 맨 앞으로 돌아간다 - 순환이라 보석이 사라지거나 생기지 않는다.
 *
 * 경로를 레벨이 정해준다. 엔진이 "어디가 벨트인지"를 알 필요는 없다.
 */
export function conveyorHook(path: string[]): TurnEndHook {
  return (board: Board) => {
    if (path.length < 2) return null;
    const spots = path.map(k => {
      const [row, col] = k.split(',').map(Number);
      return { row, col };
    });
    if (spots.some(p => p.row < 0 || p.col < 0 || p.row >= board.height || p.col >= board.width)) {
      return null;
    }

    const next = cloneBoard(board);
    const gems = spots.map(p => at(next, p.row, p.col).gem);
    // 한 칸씩 밀고, 마지막 것은 처음으로 돌린다.
    spots.forEach((p, i) => {
      at(next, p.row, p.col).gem = gems[(i - 1 + gems.length) % gems.length];
    });

    return { board: next, effects: [{ kind: 'conveyor', cells: [...path] }] };
  };
}

/**
 * 매 턴 정해진 칸을 때리는 요소(테슬라코일·레이저·폭죽 계열).
 * 무엇을 때릴지는 레벨이 정한다.
 */
export function zapHook(cells: string[]): TurnEndHook {
  return (board: Board) => {
    if (cells.length === 0) return null;
    const next = cloneBoard(board);
    let hit = false;
    cells.forEach(k => {
      const [row, col] = k.split(',').map(Number);
      if (row < 0 || col < 0 || row >= next.height || col >= next.width) return;
      const cell = at(next, row, col);
      if (!cell.gem) return;
      cell.gem = null;
      hit = true;
    });
    return hit ? { board: next, effects: [{ kind: 'zap', cells: [...cells] }] } : null;
  };
}
