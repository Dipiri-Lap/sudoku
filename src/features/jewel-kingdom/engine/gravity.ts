import type { Blocker, Board, Cell, GemColor, Position } from './types';
import { COLOR_COUNT } from './types';
import { at, cloneBoard, key, makeGem, parseKey, wallBetween } from './board';
import type { Rng } from './rng';

export interface FallMove {
  id: number;
  /** 도착 열 */
  col: number;
  fromRow: number;
  /** 출발 열. 대각선으로 흘러들어오면 col과 다르다. */
  fromCol: number;
  toRow: number;
  /** 보드 밖(위)에서 새로 들어온 보석인가 */
  spawned: boolean;
  /** 보석이 아니라 굴러떨어지는 장애물인가 */
  blocker?: boolean;
}

/** 판 아래로 빠져나가 사라진 장애물 */
export interface ExitEvent {
  key: string;
  kind: string;
}

/** 그릇에 담긴 수집물 */
export interface CollectEvent {
  /** 담긴 그릇의 칸 */
  key: string;
  /** 수집물이 있던 칸 */
  from: string;
  /** 그릇 종류(선반·찬장…) */
  kind: string;
  color: number | null;
}

/**
 * 지금 담길 수 있는 수집물들. 그릇 바로 위 칸에 앉은 것들이다.
 *
 * 담는 일을 중력에서 떼어낸 이유: 한 덩어리로 처리하면 "떨어져서 그릇에
 * 들어가는" 장면을 화면이 그릴 수가 없다. 아래가 비는 순간 곧바로 사라져서
 * 수집물이 순간이동한 것처럼 보인다. 떨어짐과 담김은 다른 박자다.
 */
export function pendingCollects(board: Board): CollectEvent[] {
  const out: CollectEvent[] = [];
  for (let r = 1; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const box = at(board, r, c).collector;
      if (!box || box.got >= box.need) continue;
      const above = at(board, r - 1, c);
      if (!above.gem?.inert) continue;
      if (wallBetween(board, { row: r - 1, col: c }, { row: r, col: c })) continue;
      out.push({ key: key(r, c), from: key(r - 1, c), kind: box.kind, color: above.gem.color });
    }
  }
  return out;
}

/** 담기는 수집물을 실제로 치우고 그릇을 채운다. */
export function consumeCollects(board: Board, events: CollectEvent[]): Board {
  if (events.length === 0) return board;
  const next = cloneBoard(board);
  events.forEach(e => {
    const from = parseKey(e.from);
    const box = parseKey(e.key);
    at(next, from.row, from.col).gem = null;
    const cell = at(next, box.row, box.col);
    if (cell.collector) cell.collector = { ...cell.collector, got: cell.collector.got + 1 };
  });
  return next;
}

/**
 * 움직이는 것이 들어갈 수 있는 칸인가 (판의 일부이고 고정 장애물이 없다).
 *
 * 그릇 칸은 아무것도 "담고 있지" 않는다. 받아서 삼키는 구멍이라
 * 평범한 보석은 그 위에 쌓이고, 수집물만 빨려 들어간다(아래 흡입 단계).
 * 그릇을 보통 칸으로 두면 평범한 보석이 자리를 차지해 수집물이 영영 못 들어간다.
 */
function canHold(cell: Cell): boolean {
  if (!cell.exists) return false;
  if (cell.collector) return false;
  return cell.blocker === null || cell.blocker.fallsOut === true;
}

/** 지금 무언가가 들어 있는가 */
function occupied(cell: Cell): boolean {
  return cell.gem !== null || cell.blocker !== null;
}

function isEmpty(cell: Cell): boolean {
  return canHold(cell) && !occupied(cell);
}

/**
 * 아래로 움직일 수 있는 내용물이 들어 있는가.
 * 고정 장애물은 "들어 있는 것"이지만 움직이지는 않는다 - 둘을 구분하지 않으면
 * 상자가 보석처럼 굴러떨어진다.
 */
function isMovable(cell: Cell): boolean {
  // 사슬·꿀에 붙잡힌 보석은 중력으로도 안 움직인다.
  //
  // "옮길 수 없다"와 "떨어지지 않는다"를 따로 두면 아래가 비는 순간 보석만
  // 빠져나가고 **사슬은 그 자리에 남아 다음에 들어온 보석을 붙잡는다.**
  // 실제로 그렇게 동작하고 있었다 - 붙잡는다는 말의 뜻이 아니다.
  if (cell.cover?.locks) return false;
  return cell.gem !== null || cell.blocker?.fallsOut === true;
}

/** 칸의 내용물을 통째로 옮긴다 */
function moveContents(from: Cell, to: Cell): void {
  to.gem = from.gem;
  to.blocker = from.blocker;
  from.gem = null;
  from.blocker = null;
}

/**
 * 칸을 비우고 중력을 적용한 뒤 위쪽 빈자리를 새 보석으로 채운다.
 *
 * **보석은 장애물을 대각선으로 돌아 흘러든다.** 이게 없으면 고정 장애물 아래
 * 칸이 영영 비어 있게 된다 - 위에서 내려올 길이 막혔는데 그 자리에서 새로
 * 만들어주지도 않기 때문이다. 실제로 그 구멍이 화면에 보였다.
 *
 * 그래서 한 번에 계산하지 않고 "더 이상 움직일 게 없을 때까지" 반복한다:
 *   1) 바로 위에 뭔가 있으면 아래로 내린다
 *   2) 바로 위가 막혀 있으면(장애물·구멍·판 밖) 대각선 위에서 끌어온다
 *   3) 맨 윗줄이 비어 있으면 새 보석을 만든다
 *
 * 화면에 넘길 이동 정보는 각 보석의 "처음 자리 → 끝난 자리"로 만든다.
 * 중간 단계를 그대로 넘기면 한 턴에 같은 보석이 여러 번 움직이는 것으로 보인다.
 */
export function applyGravity(
  board: Board,
  cleared: Set<string>,
  rng: Rng,
  colors = COLOR_COUNT,
): { board: Board; moves: FallMove[]; exits: ExitEvent[] } {
  const next = cloneBoard(board);
  cleared.forEach(k => {
    const { row, col } = parseKey(k);
    at(next, row, col).gem = null;
  });

  // 시작 위치를 기억해 둔다. 대각선 이동이 섞이면 열도 바뀌므로 열까지 기록한다.
  const gemOrigin = new Map<number, Position>();
  const blockerOrigin = new Map<Blocker, Position>();
  for (let r = 0; r < next.height; r++) {
    for (let c = 0; c < next.width; c++) {
      const cell = at(next, r, c);
      if (cell.gem) gemOrigin.set(cell.gem.id, { row: r, col: c });
      if (cell.blocker?.fallsOut) blockerOrigin.set(cell.blocker, { row: r, col: c });
    }
  }

  const exits: ExitEvent[] = [];
  const spawnedIds = new Set<number>();

  const limit = next.width * next.height * 2;
  for (let pass = 0; pass < limit; pass++) {
    let changed = false;

    // 맨 아래 줄에 닿은 "빼내는 장애물"은 판 밖으로 나간다.
    for (let c = 0; c < next.width; c++) {
      const cell = at(next, next.height - 1, c);
      if (cell.blocker?.fallsOut) {
        exits.push({ key: key(next.height - 1, c), kind: cell.blocker.kind });
        blockerOrigin.delete(cell.blocker);
        cell.blocker = null;
        changed = true;
      }
    }

    for (let r = next.height - 1; r >= 0; r--) {
      for (let c = 0; c < next.width; c++) {
        const cell = at(next, r, c);
        if (!isEmpty(cell)) continue;

        // 벽은 칸이 아니라 경계에 있다. 위쪽 경계가 막혀 있으면 위에서 못 내려온다.
        const blockedAbove = r > 0 && wallBetween(next, { row: r - 1, col: c }, { row: r, col: c });
        const above = r > 0 && !blockedAbove ? at(next, r - 1, c) : null;

        // 1) 바로 위에서 내려온다
        if (above && isMovable(above)) {
          moveContents(above, cell);
          changed = true;
          continue;
        }
        // 위가 **비어 있을 뿐이면** 기다린다 - 곧 위에서 내려올 것이다.
        //
        // "받을 수 있는 칸인가(canHold)"로 보면 안 된다. 사슬에 붙잡힌 보석이
        // 든 칸은 받을 수는 있지만 그 보석이 내려오지 않는다 - 기다리면
        // 아래가 영영 빈 채로 남는다. 그건 아래 대각선 흐름으로 메워야 한다.
        if (above && isEmpty(above)) continue;

        // 2) 위가 막혔다. 대각선 위에서 끌어온다.
        //    장애물을 돌아 흘러드는 경로가 이것뿐이다.
        if (r > 0) {
          let pulled = false;
          for (const dc of [-1, 1]) {
            const dcol = c + dc;
            if (dcol < 0 || dcol >= next.width) continue;
            // 대각선으로 흘러오려면 옆으로도 아래로도 벽이 없어야 한다.
            if (wallBetween(next, { row: r, col: dcol }, { row: r, col: c })) continue;
            if (wallBetween(next, { row: r - 1, col: dcol }, { row: r, col: dcol })) continue;
            const diag = at(next, r - 1, dcol);
            // 대각선 위의 보석은 자기 아래가 막혀 있을 때만 옆으로 흘러온다.
            const belowDiag = at(next, r, dcol);
            if (!diag.gem || (isEmpty(belowDiag) && canHold(belowDiag))) continue;
            moveContents(diag, cell);
            changed = true;
            pulled = true;
            break;
          }
          if (pulled) continue;
        }

        // 3) 위에서 받을 길이 아예 없는 칸에 새 보석이 들어온다.
        //    맨 윗줄이거나, **위쪽 경계가 벽인 칸**이다.
        //
        //    벽 아래 방도 자기 천장에서 보석을 받아야 한다. 안 그러면 그 방은
        //    보석을 잃기만 하고 영영 못 채워져 판에 구멍이 남는다.
        //    장애물은 대각선으로 돌아 들어올 길이 있지만 벽은 그 길까지 막는다.
        //
        //    장애물·구멍 아래에는 생기지 않는다. 상자 밑에서 보석이 솟아나면
        //    "어디서 왔는지" 읽히지 않기 때문이다. 그쪽은 대각선으로 흘러든다.
        //    투입구가 있는 열은 그 색만 나온다.
        if (r === 0 || blockedAbove) {
          // 투입구가 색을 강제하면 그대로 쓰되, 그 색이 곧바로 매치가 되는
          // 자리면 다른 색으로 바꾼다.
          //
          // 안 그러면 그 열이 한 색으로 채워지면서 세로 3매치가 되고, 터지면
          // 또 같은 색이 내려와 **연쇄가 끝나지 않는다**. 실제로 한 턴에
          // 50연쇄(상한)까지 돌면서 보석이 무한히 떨어졌다.
          // 투입구는 정해진 간격으로 수집물을 내보낸다. 나머지는 평범한 보석이다.
          // 매번 수집물을 쏟으면 판이 짐으로 가득 차 둘 수가 없어진다.
          const spawner = at(next, 0, c).spawner;
          const gem = makeGem(next, rng.int(colors) as GemColor);
          if (spawner) {
            // 그 열에 이미 수집물이 떠 있으면 새로 내보내지 않는다.
            //
            // 수집물은 매치가 안 되므로 스스로는 절대 못 없어진다. 계속 쏟아내면
            // 열이 짐으로 막혀 아무것도 못 하게 된다. 실제로 그렇게 막혀서
            // 레벨이 한 번도 안 깨졌다. 한 열에 하나씩만 흘려보낸다.
            let inFlight = false;
            for (let rr = 0; rr < next.height; rr++) {
              if (at(next, rr, c).gem?.inert) {
                inFlight = true;
                break;
              }
            }
            if (!inFlight) {
              gem.color = spawner.color;
              gem.inert = true;
            }
          }
          cell.gem = gem;
          spawnedIds.add(gem.id);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // 시작 자리와 끝난 자리를 비교해 이동 목록을 만든다.
  const moves: FallMove[] = [];
  const spawnedByCol = new Map<number, { id: number; toRow: number }[]>();
  for (let r = 0; r < next.height; r++) {
    for (let c = 0; c < next.width; c++) {
      const cell = at(next, r, c);
      if (cell.gem) {
        const origin = gemOrigin.get(cell.gem.id);
        if (origin) {
          if (origin.row !== r || origin.col !== c) {
            moves.push({
              id: cell.gem.id,
              col: c,
              fromRow: origin.row,
              fromCol: origin.col,
              toRow: r,
              spawned: false,
            });
          }
        } else if (spawnedIds.has(cell.gem.id)) {
          const list = spawnedByCol.get(c) ?? [];
          list.push({ id: cell.gem.id, toRow: r });
          spawnedByCol.set(c, list);
        }
      }
      if (cell.blocker?.fallsOut) {
        const origin = blockerOrigin.get(cell.blocker);
        if (origin && (origin.row !== r || origin.col !== c)) {
          moves.push({
            id: -1,
            col: c,
            fromRow: origin.row,
            fromCol: origin.col,
            toRow: r,
            spawned: false,
            blocker: true,
          });
        }
      }
    }
  }

  // 새 보석은 판 위쪽 가상 행에서 출발한다. 같은 열에 여러 개가 들어오면
  // 아래에 놓일 것이 판에 가장 가깝게(-1) 서야 한 줄로 늘어선 채 내려온다.
  // 위에 놓일 것에 -1을 주면 서로를 통과하는 것처럼 보인다.
  spawnedByCol.forEach((list, col) => {
    list.sort((a, b) => b.toRow - a.toRow);
    list.forEach((entry, i) => {
      moves.push({
        id: entry.id,
        col,
        fromRow: -1 - i,
        fromCol: col,
        toRow: entry.toRow,
        spawned: true,
      });
    });
  });

  moves.sort((a, b) => a.col - b.col || a.toRow - b.toRow);
  return { board: next, moves, exits };
}

/** 낙하 거리(칸). 새 보석은 음수 행에서 출발하므로 그만큼 더 멀리 떨어진다. */
export function fallDistance(move: FallMove): number {
  return move.toRow - move.fromRow;
}

export function positionsOf(moves: FallMove[]): Position[] {
  return moves.map(m => ({ row: m.toRow, col: m.col }));
}
